import { GrammarMatch } from '../types';

// Using the public API for demonstration. 
// In production, this should be proxied via backend or a paid plan to avoid rate limits/IP blocks.
const LT_API_URL = 'https://api.languagetool.org/v2/check';

export const checkGrammar = async (text: string): Promise<GrammarMatch[]> => {
  if (!text || text.trim() === '') return [];

  const params = new URLSearchParams();
  params.append('text', text);
  params.append('language', 'en-US');
  params.append('enabledOnly', 'false');

  try {
    const response = await fetch(LT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("Grammar Check failed:", error);
    // Return empty array to prevent app crash on network failure
    return [];
  }
};
