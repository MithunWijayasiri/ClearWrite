import { GrammarMatch } from '../types';

// Pointing to our own backend proxy to protect user privacy and handle secrets
const API_ENDPOINT = '/api/grammar';
const MAX_CHUNK_SIZE = 1000;

interface Chunk {
  text: string;
  startOffset: number;
}

/**
 * Splits text into chunks, respecting sentence boundaries where possible.
 */
export const splitTextIntoChunks = (text: string, maxChunkSize: number = MAX_CHUNK_SIZE): Chunk[] => {
  const chunks: Chunk[] = [];
  let currentOffset = 0;

  while (currentOffset < text.length) {
    const remainingText = text.slice(currentOffset);
    if (remainingText.length <= maxChunkSize) {
      chunks.push({ text: remainingText, startOffset: currentOffset });
      break;
    }

    // Attempt to find a sentence boundary near the limit
    let splitIndex = -1;
    // Search backwards from the limit to find a sentence end
    const searchLimit = Math.min(remainingText.length, maxChunkSize);

    // Look for sentence terminators followed by whitespace within the last 20% of the chunk
    // or just the last occurrence within the chunk limit if possible
    const lookBackStart = Math.max(0, searchLimit - 200);
    const textToCheck = remainingText.slice(lookBackStart, searchLimit);

    // Regex for sentence ending: period, question mark, exclamation mark followed by space or end of string
    // capturing the punctuation to include it in the current chunk
    const sentenceEndRegex = /([.?!])(\s+|$)/g;
    let match;
    let lastMatchIndex = -1;

    while ((match = sentenceEndRegex.exec(textToCheck)) !== null) {
      // match.index is relative to textToCheck start
      lastMatchIndex = lookBackStart + match.index + match[1].length;
    }

    if (lastMatchIndex !== -1) {
      splitIndex = lastMatchIndex;
    } else {
        // Fallback: look for any whitespace
        const lastSpace = remainingText.lastIndexOf(' ', searchLimit);
        // Ensure we don't split at 0 (start of chunk) which would cause infinite loop
        if (lastSpace > 0) {
            splitIndex = lastSpace;
        } else {
            // Hard split at limit if no space found or space is at 0
            splitIndex = searchLimit;
        }
    }

    chunks.push({
        text: remainingText.slice(0, splitIndex),
        startOffset: currentOffset
    });
    currentOffset += splitIndex;
  }

  return chunks;
};

export const checkGrammar = async (text: string): Promise<GrammarMatch[]> => {
  if (!text || text.trim() === '') return [];

  const chunks = splitTextIntoChunks(text);
  const allMatches: GrammarMatch[] = [];

  try {
    // Process chunks in parallel
    const promises = chunks.map(async (chunk) => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunk.text,
            language: 'en-US'
          }),
        });

        if (!response.ok) {
          console.warn(`Grammar Service Chunk Error: ${response.statusText}`);
          return [];
        }

        const data = await response.json();
        const matches: GrammarMatch[] = data.matches || [];

        // Adjust offsets
        return matches.map(match => ({
          ...match,
          offset: match.offset + chunk.startOffset,
          // We need to ensure IDs are unique if the backend returns ids (usually they don't or they are not unique across requests)
          // But usually we treat them as transient.
        }));
      } catch (error) {
        console.error("Grammar Check Chunk failed:", error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach(chunkMatches => allMatches.push(...chunkMatches));

    return allMatches;
  } catch (error) {
    console.error("Grammar Check failed:", error);
    // Return empty array to prevent app crash on network failure
    return [];
  }
};
