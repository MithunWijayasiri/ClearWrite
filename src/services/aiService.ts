// AI Service - Calls backend API to securely interact with AI providers

// Returns a generic name since provider is determined server-side
export const getActiveProviderName = (): string => {
  return 'AI';
};

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}

const API_ENDPOINT = '/api/ai';

async function callAI(action: 'enhance' | 'summarize', text: string): Promise<string> {
  const appPassword = localStorage.getItem('app_password') || '';
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': appPassword,
    },
    body: JSON.stringify({ action, text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
       throw new AIProviderError('Unauthorized: Please check your App Password in settings.');
    }
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
