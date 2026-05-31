// Content OS serverless backend. The `generate` callable verifies the caller's
// Firebase Auth + tenant membership, then routes to the selected LLM provider with
// the brand-aware prompt. Provider API keys live only here (Functions secrets) —
// never in the browser.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildPrompt } from './prompts';
import { callClaude } from './anthropic';
import { callOpenAI } from './openai';
import { callGemini } from './gemini';
import type { GenerateData, GenKind, LlmProvider, Usage } from './types';

initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const KINDS: GenKind[] = ['content', 'script', 'review', 'social', 'repurpose'];
const PROVIDERS: LlmProvider[] = ['claude', 'openai', 'gemini'];

type Caller = (key: string, prompt: { system: string; user: string }) => Promise<{ json: unknown; usage: Usage }>;

export const generate = onCall(
  { secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const data = request.data as GenerateData;
    if (!data?.businessId || !KINDS.includes(data.kind) || !data.brand) {
      throw new HttpsError('invalid-argument', 'businessId, a valid kind, and brand are required.');
    }
    const provider = data.provider;
    if (!PROVIDERS.includes(provider)) {
      throw new HttpsError('invalid-argument', `Unknown provider: ${provider}`);
    }

    // Tenant isolation + role check (owner/manager may generate).
    const memberSnap = await getFirestore()
      .doc(`businesses/${data.businessId}/members/${uid}`)
      .get();
    const role = memberSnap.data()?.role as string | undefined;
    if (!memberSnap.exists || (role !== 'owner' && role !== 'manager')) {
      throw new HttpsError('permission-denied', 'You are not allowed to generate for this business.');
    }

    const secrets = { claude: ANTHROPIC_API_KEY, openai: OPENAI_API_KEY, gemini: GEMINI_API_KEY };
    const calls: Record<LlmProvider, Caller> = { claude: callClaude, openai: callOpenAI, gemini: callGemini };

    const prompt = buildPrompt(data.kind, data.payload ?? {}, data.brand, data.avoid ?? []);
    try {
      const key = secrets[provider].value(); // only the chosen provider's key is read
      const { json, usage } = await calls[provider](key, prompt);
      return { result: json, usage };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed.';
      throw new HttpsError('internal', message);
    }
  },
);
