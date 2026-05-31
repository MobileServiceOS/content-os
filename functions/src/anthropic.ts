// Anthropic Claude caller. Returns parsed JSON + token usage.
import Anthropic from '@anthropic-ai/sdk';
import { extractJson } from './json';
import type { Usage } from './types';

// Default model; override with the CONTENT_OS_CLAUDE_MODEL env var.
const MODEL = process.env.CONTENT_OS_CLAUDE_MODEL || 'claude-sonnet-4-6';

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
