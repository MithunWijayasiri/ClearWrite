import type { VercelRequest, VercelResponse } from '@vercel/node';

type AIProvider = 'gemini' | 'longcat';
type AIAction = 'enhance' | 'summarize';

interface RequestBody {
  action: AIAction;
  text: string;
}

// Longcat API call (OpenAI-compatible format)
async function callLongcat(prompt: string): Promise<string> {
  const apiKey = process.env.LONGCAT_API_KEY;
  const model = process.env.LONGCAT_MODEL;
  const endpoint = process.env.LONGCAT_ENDPOINT || 'https://api.longcat.chat/openai';

  if (!apiKey || !model) {
    throw new Error('Longcat configuration missing');
  }

  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Longcat API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Gemini API call
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('Gemini configuration missing');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// Generate prompt based on action
function getPrompt(action: AIAction, text: string): string {
  if (action === 'enhance') {
    return `You are a professional editor. Rewrite the following text to improve vocabulary, 
clarity, and tone while STRICTLY maintaining the original meaning. 
Do not add conversational filler. Return ONLY the rewritten text.

Original Text:
"${text}"`;
  }

  return `You are a professional editor. Summarize the following text concisely 
while retaining the key points. Return ONLY the summary.

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-password');

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
    // Security: Check for App Password if configured
    const appPassword = process.env.APP_PASSWORD;
    if (appPassword) {
      const providedPassword = req.headers['x-app-password'];
      if (providedPassword !== appPassword) {
        return res.status(401).json({ error: 'Unauthorized: Invalid App Password' });
      }
    }

    const { action, text } = req.body as RequestBody;

    if (!action || !text) {
      return res.status(400).json({ error: 'Missing action or text' });
    }

    if (!['enhance', 'summarize'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const provider = (process.env.AI_PROVIDER || 'gemini') as AIProvider;
    const prompt = getPrompt(action, text);

    let result: string;

    if (provider === 'longcat') {
      result = await callLongcat(prompt);
    } else {
      result = await callGemini(prompt);
    }

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process request' 
    });
  }
}
