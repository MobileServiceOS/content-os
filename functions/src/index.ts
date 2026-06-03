// Content OS serverless backend.
// - `generate`: text generation, routed to Claude/OpenAI/Gemini by provider.
// - `generateImage`: image generation via OpenAI Images.
// Both verify Firebase Auth + tenant membership. Provider keys live only here
// (Functions secrets) — never in the browser.
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { assertMember } from './auth';
import {
  buildAuthUrl, signState, verifyState, completeOAuth,
  syncSearchConsole, disconnectSearchConsole, setStatus, APP_RETURN,
} from './searchConsole';
import * as gbp from './gbp';
import * as social from './social';
import { runAutoSync } from './autoSync';
import { runWeeklyDigest } from './digest';
import { runDailyAlerts } from './alerts';

initializeApp();

// Google Search Console OAuth (read-only). Set via `firebase functions:secrets:set`.
const SC_OAUTH_CLIENT_ID = defineSecret('SC_OAUTH_CLIENT_ID');
const SC_OAUTH_CLIENT_SECRET = defineSecret('SC_OAUTH_CLIENT_SECRET');
const SC_REDIRECT_URI = defineSecret('SC_REDIRECT_URI');
const scSecrets = [SC_OAUTH_CLIENT_ID, SC_OAUTH_CLIENT_SECRET, SC_REDIRECT_URI];
// Social platforms (TikTok first; IG/FB/YT add their own secrets here).
const TIKTOK_CLIENT_KEY = defineSecret('TIKTOK_CLIENT_KEY');
const TIKTOK_CLIENT_SECRET = defineSecret('TIKTOK_CLIENT_SECRET');
const socialSecrets = [TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET];
// Weekly digest email (Resend). API key is a secret (set before deploy);
// the From address is a plain param (default = Resend's test sender, which
// works without domain verification — override once your domain is verified).
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const DIGEST_FROM = defineString('DIGEST_FROM', { default: 'Content OS <onboarding@resend.dev>' });
function socialCreds(platform: string): { clientId: string; secret: string } {
  if (platform === 'tiktok') return { clientId: TIKTOK_CLIENT_KEY.value(), secret: TIKTOK_CLIENT_SECRET.value() };
  throw new HttpsError('failed-precondition', `Platform ${platform} is not configured.`);
}

// Removed: generate / generateImage / generateVideo. The external LLM, image, and
// video providers were never configured (their secrets were placeholders), so the
// functions and their ANTHROPIC/OPENAI/GEMINI/HIGGSFIELD secrets are gone.
// Generation runs client-side on templates + the uniqueness engine.

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

// --- Wave 2: nightly auto-sync ---
// Refreshes Search Console + GBP + TikTok for every connected business once a
// day, so the cockpit is fresh without anyone pressing "Sync now". Runs as the
// Admin SDK (no user context); reuses the same sync cores as the onCall
// handlers. Per-business failures are isolated inside runAutoSync.
const autoSyncSecrets = [SC_OAUTH_CLIENT_ID, SC_OAUTH_CLIENT_SECRET, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET];
export const nightlySync = onSchedule(
  { schedule: 'every day 06:00', timeZone: 'America/New_York', secrets: autoSyncSecrets, timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const summary = await runAutoSync({
      scClientId: SC_OAUTH_CLIENT_ID.value(), scSecret: SC_OAUTH_CLIENT_SECRET.value(),
      tiktokKey: TIKTOK_CLIENT_KEY.value(), tiktokSecret: TIKTOK_CLIENT_SECRET.value(),
    });
    logger.info('nightlySync complete', summary);
  },
);

// Monday 08:00 ET: email each active owner their weekly brief from the cockpit
// snapshot. Skips owners with no email or a snapshot older than 2 weeks.
export const weeklyDigest = onSchedule(
  { schedule: 'every monday 08:00', timeZone: 'America/New_York', secrets: [RESEND_API_KEY], timeoutSeconds: 540 },
  async () => {
    const summary = await runWeeklyDigest(RESEND_API_KEY.value(), DIGEST_FROM.value(), Date.now());
    logger.info('weeklyDigest complete', summary);
  },
);

// Daily 07:00 ET (after the 06:00 sync): email owners only when something urgent
// is true (revenue drop / recurring complaint), deduped so it never re-nags.
export const dailyAlerts = onSchedule(
  { schedule: 'every day 07:00', timeZone: 'America/New_York', secrets: [RESEND_API_KEY], timeoutSeconds: 540 },
  async () => {
    const summary = await runDailyAlerts(RESEND_API_KEY.value(), DIGEST_FROM.value(), Date.now());
    logger.info('dailyAlerts complete', summary);
  },
);
