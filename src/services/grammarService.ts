import { GrammarMatch } from '../types';

const LT_API_ENDPOINT = '/api/grammar';
const AI_API_ENDPOINT = '/api/ai';
const MAX_CHUNK_SIZE = 1000;
const AI_TIMEOUT_MS = 15000;

interface Chunk {
  text: string;
  startOffset: number;
}

export interface AIRawMatch {
  text: string;
  replacement: string;
  message: string;
  category: string;
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

    let splitIndex = -1;
    const searchLimit = Math.min(remainingText.length, maxChunkSize);
    const lookBackStart = Math.max(0, searchLimit - 200);
    const textToCheck = remainingText.slice(lookBackStart, searchLimit);

    const sentenceEndRegex = /([.?!])(\s+|$)/g;
    let match;
    let lastMatchIndex = -1;

    while ((match = sentenceEndRegex.exec(textToCheck)) !== null) {
      lastMatchIndex = lookBackStart + match.index + match[1].length;
    }

    if (lastMatchIndex !== -1) {
      splitIndex = lastMatchIndex;
    } else {
        const lastSpace = remainingText.lastIndexOf(' ', searchLimit);
        if (lastSpace > 0) {
            splitIndex = lastSpace;
        } else {
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

async function checkLanguageTool(chunk: Chunk): Promise<GrammarMatch[]> {
  try {
    const response = await fetch(LT_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk.text, language: 'en-US' }),
    });

    if (!response.ok) {
      console.warn(`Grammar Service Chunk Error: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const matches: GrammarMatch[] = data.matches || [];

    return matches.map(match => ({
      ...match,
      offset: match.offset + chunk.startOffset,
    }));
  } catch (error) {
    console.error("Grammar Check Chunk failed:", error);
    return [];
  }
}

export function parseAIResponse(raw: string): AIRawMatch[] {
  try {
    let cleaned = raw.trim();

    // Strip markdown code fences
    const fenceMatch = cleaned.match(/^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    // Find the JSON array boundaries
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      return [];
    }

    const parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry: any) =>
        typeof entry.text === 'string' &&
        typeof entry.replacement === 'string' &&
        typeof entry.message === 'string' &&
        typeof entry.category === 'string'
    );
  } catch {
    return [];
  }
}

export function resolveAIMatchOffsets(originalText: string, aiMatches: AIRawMatch[]): GrammarMatch[] {
  const claimedPositions = new Set<number>();
  const results: GrammarMatch[] = [];

  for (const aiMatch of aiMatches) {
    let searchStart = 0;
    let found = false;

    while (!found) {
      const idx = originalText.indexOf(aiMatch.text, searchStart);
      if (idx === -1) break;

      if (!claimedPositions.has(idx)) {
        claimedPositions.add(idx);
        results.push({
          message: aiMatch.message,
          shortMessage: aiMatch.message,
          replacements: [{ value: aiMatch.replacement }],
          offset: idx,
          length: aiMatch.text.length,
          type: { typeName: 'Other' },
          rule: {
            id: `AI_${aiMatch.category.toUpperCase()}`,
            description: aiMatch.message,
            issueType: 'grammar',
            category: {
              id: `AI_${aiMatch.category.toUpperCase()}`,
              name: `AI: ${aiMatch.category.charAt(0).toUpperCase() + aiMatch.category.slice(1)}`
            }
          }
        });
        found = true;
      } else {
        searchStart = idx + 1;
      }
    }
  }

  return results;
}

export function mergeMatches(ltMatches: GrammarMatch[], aiMatches: GrammarMatch[]): GrammarMatch[] {
  const merged: GrammarMatch[] = [...ltMatches];

  for (const aiMatch of aiMatches) {
    const aiStart = aiMatch.offset;
    const aiEnd = aiMatch.offset + aiMatch.length;

    const overlappingIndex = merged.findIndex(existing => {
      const exStart = existing.offset;
      const exEnd = existing.offset + existing.length;
      return aiStart < exEnd && aiEnd > exStart;
    });

    if (overlappingIndex === -1) {
      merged.push(aiMatch);
    } else {
      const existing = merged[overlappingIndex];
      if (existing.rule.issueType !== 'misspelling') {
        merged[overlappingIndex] = aiMatch;
      }
    }
  }

  merged.sort((a, b) => a.offset - b.offset);
  return merged;
}

export async function checkGrammarAI(text: string): Promise<GrammarMatch[]> {
  if (!text || text.trim().length < 20) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(AI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grammar', text }),
      signal: controller.signal,
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rawMatches = parseAIResponse(data.result || '');
    return resolveAIMatchOffsets(text, rawMatches);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export const checkGrammar = async (text: string): Promise<GrammarMatch[]> => {
  if (!text || text.trim() === '') return [];

  const chunks = splitTextIntoChunks(text);

  try {
    const promises = chunks.map(chunk => checkLanguageTool(chunk));
    const results = await Promise.all(promises);
    return results.flat();
  } catch (error) {
    console.error("Grammar Check failed:", error);
    return [];
  }
};

export const deepScanGrammar = async (text: string): Promise<GrammarMatch[]> => {
  if (!text || text.trim() === '') return [];

  const chunks = splitTextIntoChunks(text);

  try {
    const [ltResults, aiMatches] = await Promise.all([
      Promise.all(chunks.map(chunk => checkLanguageTool(chunk))).then(r => r.flat()),
      checkGrammarAI(text),
    ]);

    return mergeMatches(ltResults, aiMatches);
  } catch (error) {
    console.error("Deep Scan failed:", error);
    return [];
  }
};
