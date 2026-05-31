// Google Gemini caller. Returns parsed JSON + token usage.
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractJson } from './json';
import type { Usage } from './types';

const MODEL = process.env.CONTENT_OS_GEMINI_MODEL || 'gemini-1.5-flash';

export async function callGemini(
  apiKey: string,
  prompt: { system: string; user: string },
): Promise<{ json: unknown; usage: Usage }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: prompt.system,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const res = await model.generateContent(prompt.user);
  const text = res.response.text();
  const usage = res.response.usageMetadata;
  return {
    json: extractJson(text),
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}
