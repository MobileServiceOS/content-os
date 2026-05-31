// OpenAI caller. Returns parsed JSON + token usage.
import OpenAI from 'openai';
import { extractJson } from './json';
import type { Usage } from './types';

const MODEL = process.env.CONTENT_OS_OPENAI_MODEL || 'gpt-4o-mini';

export async function callOpenAI(
  apiKey: string,
  prompt: { system: string; user: string },
): Promise<{ json: unknown; usage: Usage }> {
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
  });
  const text = res.choices[0]?.message?.content ?? '';
  return {
    json: extractJson(text),
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    },
  };
}
