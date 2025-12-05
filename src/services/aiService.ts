// AI Service - Calls backend API to securely interact with AI providers

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}

const API_ENDPOINT = '/api/ai';
const TIMEOUT_MS = 15000; // 15 seconds

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
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new AIProviderError('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanResponse(text: string): string {
  if (!text) return text;
  // Remove wrapping quotes if present (double or single)
  // Logic: If it starts and ends with the same quote, strip them.
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    // Check if the length is greater than 1 to avoid stripping a single quote
    if (trimmed.length > 1) {
       return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

export const enhanceText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  try {
    const result = await callAI('enhance', text);
    return cleanResponse(result);
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
