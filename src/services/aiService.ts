import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ai = new GoogleGenAI({ apiKey });

export const enhanceText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  
  if (!apiKey) {
    console.warn("No API Key provided for Gemini.");
    return "API Key missing. Cannot enhance text.";
  }

  try {
    const prompt = `
      You are a professional editor. Rewrite the following text to improve vocabulary, 
      clarity, and tone while STRICTLY maintaining the original meaning. 
      Do not add conversational filler. Return ONLY the rewritten text.
      
      Original Text:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("AI Enhancement Error:", error);
    throw error;
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  if (!apiKey) {
    console.warn("No API Key provided for Gemini.");
    return "API Key missing. Cannot summarize text.";
  }

  try {
    const prompt = `
      You are a professional editor. Summarize the following text concisely 
      while retaining the key points. Return ONLY the summary.
      
      Original Text:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("AI Summarization Error:", error);
    throw error;
  }
};
