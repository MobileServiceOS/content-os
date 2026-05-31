// Content OS serverless backend.
// - `generate`: text generation, routed to Claude/OpenAI/Gemini by provider.
// - `generateImage`: image generation via OpenAI Images.
// Both verify Firebase Auth + tenant membership. Provider keys live only here
// (Functions secrets) — never in the browser.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { assertMember } from './auth';
import { buildPrompt } from './prompts';
import { callClaude } from './anthropic';
import { callOpenAI } from './openai';
import { callGemini } from './gemini';
import { generateImageOpenAI } from './openaiImage';
import type { GenerateData, GenKind, LlmProvider, Usage } from './types';

initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const KINDS: GenKind[] = ['content', 'script', 'review', 'social', 'repurpose', 'gbp', 'seo', 'photo'];
const PROVIDERS: LlmProvider[] = ['claude', 'openai', 'gemini'];

type Caller = (key: string, prompt: { system: string; user: string }) => Promise<{ json: unknown; usage: Usage }>;

export const generate = onCall(
  { secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY] },
  async (request) => {
    const data = request.data as GenerateData;
    if (!data?.businessId || !KINDS.includes(data.kind) || !data.brand) {
      throw new HttpsError('invalid-argument', 'businessId, a valid kind, and brand are required.');
    }
    if (!PROVIDERS.includes(data.provider)) {
      throw new HttpsError('invalid-argument', `Unknown provider: ${data.provider}`);
    }
    await assertMember(request, data.businessId);

    const secrets = { claude: ANTHROPIC_API_KEY, openai: OPENAI_API_KEY, gemini: GEMINI_API_KEY };
    const calls: Record<LlmProvider, Caller> = { claude: callClaude, openai: callOpenAI, gemini: callGemini };

    const prompt = buildPrompt(data.kind, data.payload ?? {}, data.brand, data.avoid ?? []);
    try {
      const key = secrets[data.provider].value(); // only the chosen provider's key is read
      const { json, usage } = await calls[data.provider](key, prompt);
      return { result: json, usage };
    } catch (err) {
      throw new HttpsError('internal', err instanceof Error ? err.message : 'Generation failed.');
    }
  },
);

interface ImageData {
  businessId: string;
  prompt: string;
  aspectRatio?: string;
  style?: string;
}

export const generateImage = onCall({ secrets: [OPENAI_API_KEY] }, async (request) => {
  const data = request.data as ImageData;
  if (!data?.businessId || !data?.prompt) {
    throw new HttpsError('invalid-argument', 'businessId and prompt are required.');
  }
  await assertMember(request, data.businessId);

  const fullPrompt = data.style ? `${data.prompt}. Style: ${data.style}` : data.prompt;
  try {
    return await generateImageOpenAI(OPENAI_API_KEY.value(), fullPrompt, data.aspectRatio ?? '1:1');
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Image generation failed.');
  }
});
