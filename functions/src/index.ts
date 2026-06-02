// Content OS serverless backend.
// - `generate`: text generation, routed to Claude/OpenAI/Gemini by provider.
// - `generateImage`: image generation via OpenAI Images.
// Both verify Firebase Auth + tenant membership. Provider keys live only here
// (Functions secrets) — never in the browser.
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { assertMember } from './auth';
import { buildPrompt } from './prompts';
import { callClaude } from './anthropic';
import { callOpenAI } from './openai';
import { callGemini } from './gemini';
import { generateImageOpenAI } from './openaiImage';
import { generateVideoBroker } from './video';
import {
  buildAuthUrl, signState, verifyState, completeOAuth,
  syncSearchConsole, disconnectSearchConsole, setStatus, APP_RETURN,
} from './searchConsole';
import * as gbp from './gbp';
import * as social from './social';
import type { GenerateData, GenKind, LlmProvider, Usage } from './types';

initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const HIGGSFIELD_CREDENTIALS = defineSecret('HIGGSFIELD_CREDENTIALS');
// Google Search Console OAuth (read-only). Set via `firebase functions:secrets:set`.
const SC_OAUTH_CLIENT_ID = defineSecret('SC_OAUTH_CLIENT_ID');
const SC_OAUTH_CLIENT_SECRET = defineSecret('SC_OAUTH_CLIENT_SECRET');
const SC_REDIRECT_URI = defineSecret('SC_REDIRECT_URI');
const scSecrets = [SC_OAUTH_CLIENT_ID, SC_OAUTH_CLIENT_SECRET, SC_REDIRECT_URI];
// Social platforms (TikTok first; IG/FB/YT add their own secrets here).
const TIKTOK_CLIENT_KEY = defineSecret('TIKTOK_CLIENT_KEY');
const TIKTOK_CLIENT_SECRET = defineSecret('TIKTOK_CLIENT_SECRET');
const socialSecrets = [TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET];
function socialCreds(platform: string): { clientId: string; secret: string } {
  if (platform === 'tiktok') return { clientId: TIKTOK_CLIENT_KEY.value(), secret: TIKTOK_CLIENT_SECRET.value() };
  throw new HttpsError('failed-precondition', `Platform ${platform} is not configured.`);
}

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

// --- Google Search Console (read-only OAuth) ---

/** Returns the Google OAuth consent URL (state = signed businessId). */
export const scAuthUrl = onCall({ secrets: scSecrets }, async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  await assertMember(request, data.businessId);
  const state = signState(data.businessId, SC_OAUTH_CLIENT_SECRET.value());
  return { url: buildAuthUrl(SC_OAUTH_CLIENT_ID.value(), SC_REDIRECT_URI.value(), state) };
});

/** OAuth redirect target: exchanges the code server-side, stores the token. */
export const scOAuthCallback = onRequest({ secrets: scSecrets }, async (req, res) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  const oauthErr = String(req.query.error ?? '');
  const back = (status: string) => res.redirect(`${APP_RETURN}?sc=${status}`);
  if (oauthErr) { back('error'); return; }
  const bid = verifyState(state, SC_OAUTH_CLIENT_SECRET.value());
  if (!bid || !code) { back('error'); return; }
  try {
    await completeOAuth(bid, SC_OAUTH_CLIENT_ID.value(), SC_OAUTH_CLIENT_SECRET.value(), code, SC_REDIRECT_URI.value());
    back('connected');
  } catch {
    await setStatus(bid, { status: 'error', error: 'OAuth exchange failed.' });
    back('error');
  }
});

/** Pull the latest Search Console metrics into the owner-readable doc. */
export const scSync = onCall({ secrets: scSecrets }, async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  await assertMember(request, data.businessId);
  try {
    return await syncSearchConsole(data.businessId, SC_OAUTH_CLIENT_ID.value(), SC_OAUTH_CLIENT_SECRET.value());
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Search Console sync failed.');
  }
});

/** Revoke the token at Google and clear the connection. */
export const scDisconnect = onCall(async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  await assertMember(request, data.businessId);
  await disconnectSearchConsole(data.businessId);
  return { ok: true };
});

// --- Google Business Profile (read-only; reuses the SC OAuth client) ---
const gbpSecrets = [SC_OAUTH_CLIENT_ID, SC_OAUTH_CLIENT_SECRET];

export const gbpAuthUrl = onCall({ secrets: gbpSecrets }, async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  await assertMember(request, data.businessId);
  const state = gbp.signState(data.businessId, SC_OAUTH_CLIENT_SECRET.value());
  return { url: gbp.buildAuthUrl(SC_OAUTH_CLIENT_ID.value(), state) };
});

export const gbpOAuthCallback = onRequest({ secrets: gbpSecrets }, async (req, res) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  const oauthErr = String(req.query.error ?? '');
  const back = (status: string) => res.redirect(`${gbp.APP_RETURN}?gbp=${status}`);
  if (oauthErr) { back('error'); return; }
  const bid = gbp.verifyState(state, SC_OAUTH_CLIENT_SECRET.value());
  if (!bid || !code) { back('error'); return; }
  try {
    await gbp.completeOAuth(bid, SC_OAUTH_CLIENT_ID.value(), SC_OAUTH_CLIENT_SECRET.value(), code);
    back('connected');
  } catch {
    await gbp.setStatus(bid, { status: 'error', error: 'OAuth exchange failed.' });
    back('error');
  }
});

export const gbpSync = onCall({ secrets: gbpSecrets }, async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  await assertMember(request, data.businessId);
  try {
    return await gbp.syncGbp(data.businessId, SC_OAUTH_CLIENT_ID.value(), SC_OAUTH_CLIENT_SECRET.value());
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'GBP sync failed.');
  }
});

export const gbpDisconnect = onCall(async (request) => {
  const data = request.data as { businessId?: string };
  if (!data?.businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  await assertMember(request, data.businessId);
  await gbp.disconnectGbp(data.businessId);
  return { ok: true };
});

// --- Social platforms (generic; one endpoint set serves TikTok/IG/FB/YT) ---
function connectorOr(platform: string): social.PlatformConnector {
  const c = social.connectorFor(platform);
  if (!c) throw new HttpsError('invalid-argument', `Unknown platform: ${platform}`);
  return c;
}

export const socialAuthUrl = onCall({ secrets: socialSecrets }, async (request) => {
  const data = request.data as { businessId?: string; platform?: string };
  if (!data?.businessId || !data?.platform) throw new HttpsError('invalid-argument', 'businessId and platform are required.');
  await assertMember(request, data.businessId);
  const c = connectorOr(data.platform);
  const { clientId, secret } = socialCreds(data.platform);
  const state = social.signState(data.platform, data.businessId, secret);
  return { url: c.authUrl(clientId, social.REDIRECT_URI, state) };
});

export const socialOAuthCallback = onRequest({ secrets: socialSecrets }, async (req, res) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  const oauthErr = String(req.query.error ?? '');
  // We must verify the state to know the platform; use TikTok secret (only one) for HMAC.
  const verified = social.verifyState(state, TIKTOK_CLIENT_SECRET.value());
  const platform = verified?.platform ?? 'tiktok';
  const back = (status: string) => res.redirect(`${social.SOCIAL_APP_RETURN}?social=${status}&platform=${platform}`);
  if (oauthErr || !verified || !code) { back('error'); return; }
  try {
    const c = connectorOr(verified.platform);
    const { clientId, secret } = socialCreds(verified.platform);
    await social.completeOAuth(c, verified.businessId, clientId, secret, code);
    back('connected');
  } catch {
    if (verified) await social.setStatus(verified.businessId, verified.platform, { status: 'error', error: 'OAuth exchange failed.' });
    back('error');
  }
});

export const socialSync = onCall({ secrets: socialSecrets }, async (request) => {
  const data = request.data as { businessId?: string; platform?: string };
  if (!data?.businessId || !data?.platform) throw new HttpsError('invalid-argument', 'businessId and platform are required.');
  await assertMember(request, data.businessId);
  const c = connectorOr(data.platform);
  const { clientId, secret } = socialCreds(data.platform);
  try {
    return await social.syncPlatform(c, data.businessId, clientId, secret);
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Sync failed.');
  }
});

export const socialDisconnect = onCall(async (request) => {
  const data = request.data as { businessId?: string; platform?: string };
  if (!data?.businessId || !data?.platform) throw new HttpsError('invalid-argument', 'businessId and platform are required.');
  await assertMember(request, data.businessId);
  await social.disconnectPlatform(connectorOr(data.platform), data.businessId);
  return { ok: true };
});
