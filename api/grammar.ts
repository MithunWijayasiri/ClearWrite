import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory rate limit (per container instance)
// Note: In a serverless environment, this state resets when the lambda is cold-started.
// For strict distributed rate limiting, use Redis (e.g., Upstash).
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute
const requestLog: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove timestamps older than the window
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limit Check
  if (!checkRateLimit()) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { text, language = 'en-US' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    // Call LanguageTool API
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language);
    params.append('enabledOnly', 'false');

    const response = await fetch('https://api.languagetoolplus.com/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LanguageTool API Error:', errorText);
      return res.status(response.status).json({ error: 'Grammar check failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Grammar API Proxy Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process grammar check' 
    });
  }
}
