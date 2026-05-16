import type { VercelRequest, VercelResponse } from '@vercel/node';

type AIProvider = 'gemini' | 'longcat';
type AIAction = 'enhance' | 'summarize' | 'grammar';

interface RequestBody {
  action: AIAction;
  text: string;
}

const FETCH_TIMEOUT_MS = 8000; // 8 seconds - stay under Vercel's 10s function timeout

// Helper function to make HTTP requests with error handling
async function fetchWithErrorHandling(
  url: string,
  options: RequestInit,
  providerName: string
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`${providerName} request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Longcat API call (OpenAI-compatible format)
async function callLongcat(prompt: string, temperature: number = 0.7): Promise<string> {
  const apiKey = process.env.LONGCAT_API_KEY;
  const model = process.env.LONGCAT_MODEL;
  const endpoint = process.env.LONGCAT_ENDPOINT || 'https://api.longcat.chat/openai';

  if (!apiKey || !model) {
    throw new Error('Longcat configuration missing');
  }

  const data = await fetchWithErrorHandling(
    `${endpoint}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature,
      }),
    },
    'Longcat'
  );

  const choice = data.choices?.[0]?.message;
  return choice?.content?.trim() || choice?.reasoning_content?.trim() || '';
}

// Gemini API call
async function callGemini(prompt: string, temperature: number = 0.7): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

  if (!apiKey) {
    throw new Error('Gemini configuration missing');
  }

  const data = await fetchWithErrorHandling(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature },
      }),
    },
    'Gemini'
  );

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// Generate prompt based on action
function getPrompt(action: AIAction, text: string): string {
  if (action === 'grammar') {
    return `You are a precise grammar checker. Analyze the following text and identify ALL grammar, syntax, and usage errors.

RULES:
- Only report CLEAR errors. Do not flag stylistic preferences or correct usage.
- For each error, extract the EXACT erroneous text as it appears in the original — character for character, including spacing and punctuation.
- Focus on: tense inconsistency, subject-verb disagreement, adverb/adjective confusion, double/triple negatives, dangling modifiers, incorrect infinitive forms, pronoun errors, misused prepositions/conjunctions (e.g. "Despite" followed by a clause instead of a noun phrase), run-on sentences, and comma splices.
- Do NOT flag spelling errors (another system handles those).
- Return a JSON array. If no errors found, return an empty array [].

RESPONSE FORMAT (strict JSON only — no markdown, no code fences, no explanation outside the array):
[
  {
    "text": "<exact erroneous substring from the original>",
    "replacement": "<corrected text>",
    "message": "<brief explanation of the error>",
    "category": "grammar" | "syntax" | "style" | "tense" | "agreement"
  }
]

Text to check:
"""
${text}
"""`;
  }

  if (action === 'enhance') {
    return `You are a professional editor. Rewrite the following text to improve clarity, 
readability, and flow while STRICTLY preserving the original meaning and the author's voice. 
Fix grammar and punctuation. Do not add new information or conversational filler. 
Return ONLY the rewritten text.

Original Text:
"${text}"`;
  }

  return `You are a professional editor. Summarize the following text in a clear, concise paragraph. 
Capture the key points, main arguments, and conclusions. Preserve the original tone. 
Write in paragraph format only. Do not use bullet points, dashes, or lists. 
Return ONLY the summary as a single paragraph.

Original Text:
"${text}"`;
}

// Rate Limit Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute for AI
const requestLog: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW) {
    requestLog.shift();
  }
  if (requestLog.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  requestLog.push(now);
  return true;
}

export const config = {
  maxDuration: 10,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limit Check
  if (!checkRateLimit()) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  try {
    const { action, text } = req.body as RequestBody;

    if (!action || !text) {
      return res.status(400).json({ error: 'Missing action or text' });
    }

    if (!['enhance', 'summarize', 'grammar'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const provider = (process.env.AI_PROVIDER || 'gemini') as AIProvider;
    const prompt = getPrompt(action, text);
    const temperature = action === 'grammar' ? 0.1 : 0.7;

    let result: string;

    if (provider === 'longcat') {
      result = await callLongcat(prompt, temperature);
    } else {
      result = await callGemini(prompt, temperature);
    }

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process request' 
    });
  }
}
