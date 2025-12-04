// AI Service - Calls backend API to securely interact with AI providers

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}

const API_ENDPOINT = '/api/ai';

async function callAI(action: 'enhance' | 'summarize', text: string): Promise<string> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AIProviderError(errorData.error || 'AI service unavailable');
  }

  const data = await response.json();
  return data.result;
}

export const enhanceText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  try {
    return await callAI('enhance', text);
  } catch (error) {
    console.error("AI Enhancement Error:", error);
    throw error;
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  try {
    return await callAI('summarize', text);
  } catch (error) {
    console.error("AI Summarization Error:", error);
    throw error;
  }
};
