// Thin wrapper around the Anthropic Messages API. Returns parsed JSON + usage.
import Anthropic from '@anthropic-ai/sdk';
import type { Usage } from './types';

// Default model; override with the CONTENT_OS_MODEL env var.
const MODEL = process.env.CONTENT_OS_MODEL || 'claude-sonnet-4-6';

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON.');
  return JSON.parse(raw.slice(start, end + 1));
}

export async function callClaude(
  apiKey: string,
  prompt: { system: string; user: string },
): Promise<{ json: unknown; usage: Usage }> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return {
    json: extractJson(text),
    usage: { inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens },
  };
}
