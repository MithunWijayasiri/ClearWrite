// AI Service - Calls backend API to securely interact with AI providers

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}

const API_ENDPOINT = '/api/ai';
const TIMEOUT_MS = 15000; // 15 seconds
const MAX_CHUNK_SIZE = 1500; // Characters per chunk for enhance

interface Chunk {
  text: string;
  startOffset: number;
}

/**
 * Splits text into chunks at sentence boundaries for processing long text.
 */
function splitTextIntoChunks(text: string, maxChunkSize: number = MAX_CHUNK_SIZE): Chunk[] {
  const chunks: Chunk[] = [];
  let currentOffset = 0;

  while (currentOffset < text.length) {
    const remainingText = text.slice(currentOffset);
    if (remainingText.length <= maxChunkSize) {
      chunks.push({ text: remainingText, startOffset: currentOffset });
      break;
    }

    const searchLimit = Math.min(remainingText.length, maxChunkSize);
    const lookBackStart = Math.max(0, searchLimit - 200);
    const textToCheck = remainingText.slice(lookBackStart, searchLimit);

    const sentenceEndRegex = /([.?!])(\s+|$)/g;
    let match;
    let lastMatchIndex = -1;

    while ((match = sentenceEndRegex.exec(textToCheck)) !== null) {
      lastMatchIndex = lookBackStart + match.index + match[1].length;
    }

    let splitIndex: number;
    if (lastMatchIndex !== -1) {
      splitIndex = lastMatchIndex;
    } else {
      const lastSpace = remainingText.lastIndexOf(' ', searchLimit);
      splitIndex = lastSpace > 0 ? lastSpace : searchLimit;
    }

    chunks.push({
      text: remainingText.slice(0, splitIndex),
      startOffset: currentOffset,
    });
    currentOffset += splitIndex;
  }

  return chunks;
}

async function callAI(action: 'enhance' | 'summarize', text: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIProviderError(errorData.error || 'AI service unavailable');
    }

    const data = await response.json();
    return data.result;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIProviderError('Request timed out. Please try again.');
    }
    if (error instanceof AIProviderError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    throw new AIProviderError(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanResponse(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    if (trimmed.length > 1) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

export const enhanceText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  try {
    // Chunk long text to avoid serverless timeout
    const chunks = splitTextIntoChunks(text);

    if (chunks.length === 1) {
      const result = await callAI('enhance', chunks[0].text);
      return cleanResponse(result);
    }

    // Process chunks sequentially to maintain context flow
    const results: string[] = [];
    for (const chunk of chunks) {
      const result = await callAI('enhance', chunk.text);
      results.push(cleanResponse(result));
    }

    return results.join(' ');
  } catch (error) {
    console.error("AI Enhancement Error:", error);
    throw error;
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  try {
    const result = await callAI('summarize', text);
    return cleanResponse(result);
  } catch (error) {
    console.error("AI Summarization Error:", error);
    throw error;
  }
};
