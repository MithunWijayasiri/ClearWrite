import { GrammarMatch } from '../types';

// Pointing to our own backend proxy to protect user privacy and handle secrets
const API_ENDPOINT = '/api/grammar';

export const checkGrammar = async (text: string): Promise<GrammarMatch[]> => {
  if (!text || text.trim() === '') return [];

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text,
        language: 'en-US'
      }),
    });

    if (!response.ok) {
      throw new Error(`Grammar Service Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("Grammar Check failed:", error);
    // Return empty array to prevent app crash on network failure
    return [];
  }
};
