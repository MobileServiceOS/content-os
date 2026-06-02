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
import { generateVideoBroker } from './video';
import { readMsosJobs } from './msos';
import type { GenerateData, GenKind, LlmProvider, Usage } from './types';

initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const HIGGSFIELD_CREDENTIALS = defineSecret('HIGGSFIELD_CREDENTIALS');
// MSOS read-only bridge. MSOS_SERVICE_ACCOUNT = a Datastore-Viewer service-account
// key JSON for the `mobile-service-os` project. MSOS_BUSINESS_ID = the Wheel Rush
// business doc id in MSOS. Both set via `firebase functions:secrets:set ...`.
const MSOS_SERVICE_ACCOUNT = defineSecret('MSOS_SERVICE_ACCOUNT');
const MSOS_BUSINESS_ID = defineSecret('MSOS_BUSINESS_ID');

const KINDS: GenKind[] = ['content', 'script', 'review', 'social', 'repurpose', 'gbp', 'seo', 'photo', 'lead', 'missed_call', 'review_template', 'task'];
const PROVIDERS: LlmProvider[] = ['claude', 'openai', 'gemini'];

type Caller = (key: string, prompt: { system: string; user: string }) => Promise<{ json: unknown; usage: Usage }>;

// Bind only the provider secrets that are configured (exist in Secret Manager).
// Claude-first deploy: add OPENAI_API_KEY / GEMINI_API_KEY here once those secrets
// are set (`firebase functions:secrets:set ...`) and redeploy.
export const generate = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
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

// READ-ONLY Marketing Director bridge to MSOS jobs. Verifies the caller is an
// owner/manager of THIS (Content OS) business, then reads the configured MSOS
// business's jobs via a service account. Never writes to MSOS.
export const getMsosJobs = onCall({ secrets: [MSOS_SERVICE_ACCOUNT, MSOS_BUSINESS_ID] }, async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) {
    throw new HttpsError('invalid-argument', 'businessId is required.');
  }
  await assertMember(request, data.businessId); // gate on the Content OS tenant

  let serviceAccount: string;
  let msosBusinessId: string;
  try {
    serviceAccount = MSOS_SERVICE_ACCOUNT.value();
    msosBusinessId = MSOS_BUSINESS_ID.value();
  } catch {
    throw new HttpsError('failed-precondition', 'MSOS connection is not configured.');
  }
  if (!serviceAccount || !msosBusinessId) {
    throw new HttpsError('failed-precondition', 'MSOS connection is not configured.');
  }

  try {
    return await readMsosJobs(serviceAccount, msosBusinessId);
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to read MSOS jobs.');
  }
});

interface ImageData {
  businessId: string;
  prompt: string;
  aspectRatio?: string;
  style?: string;
}

// OpenAI image generation: bind OPENAI_API_KEY here once that secret is set.
export const generateImage = onCall({ secrets: [] }, async (request) => {
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

interface VideoData {
  businessId: string;
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  imageUrl?: string;
}

// Higgsfield video generation. Bind HIGGSFIELD_CREDENTIALS ("keyId:keySecret")
// once the account is set up — until then callers get a clear "not configured"
// error and can stay on the mock provider.
export const generateVideo = onCall({ secrets: [HIGGSFIELD_CREDENTIALS], timeoutSeconds: 300 }, async (request) => {
  const data = request.data as VideoData;
  if (!data?.businessId || !data?.prompt) {
    throw new HttpsError('invalid-argument', 'businessId and prompt are required.');
  }
  await assertMember(request, data.businessId);

  try {
    return await generateVideoBroker(
      HIGGSFIELD_CREDENTIALS.value(),
      data.prompt,
      data.durationSeconds ?? 15,
      data.aspectRatio ?? '9:16',
      data.imageUrl,
    );
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Video generation failed.');
  }
});
