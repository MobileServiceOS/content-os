// Reusable social-platform framework (server). One generic OAuth + token-storage
// + sync pipeline that any social platform plugs into via a PlatformConnector.
// TikTok is the first; Instagram/Facebook/YouTube add a connector + secrets only.
// READ-ONLY usage; tokens live in a client-locked Firestore doc, synced data in
// an owner-readable doc. Mirrors the Search Console / GBP security model.
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';

export const SOCIAL_APP_RETURN = 'https://mobileserviceos.github.io/content-os/#/director';
const CALLBACK = 'https://us-central1-content-os-wheelrush.cloudfunctions.net/socialOAuthCallback';

// --- normalized data shape (every platform fills this; UI/intel is shared) ---
export interface SocialVideo {
  id: string;
  caption: string;
  hashtags: string[];
  createdAt: number; // epoch ms
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
}
export interface SocialData {
  platform: string;
  account: { username: string; displayName: string; followers: number; totalLikes: number };
  totals: { views: number; likes: number; comments: number; shares: number; favorites: number };
  videos: SocialVideo[];
  range: { start: number; end: number };
  /** Metrics this platform's API does NOT provide (shown as "needs Business API"). */
  unavailable: string[];
}

/** What to publish. Generic across platforms; a connector uses what it needs. */
export interface PublishPayload {
  caption: string;
  /** TikTok: a publicly fetchable video URL (PULL_FROM_URL source). */
  videoUrl?: string;
  /** GBP/others: an optional image URL. */
  mediaUrl?: string;
  /** Optional call-to-action label + url (GBP). */
  ctaLabel?: string;
  ctaUrl?: string;
  privacy?: 'PUBLIC_TO_EVERYONE' | 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS';
}
export interface PublishResult { id: string; status: string }

/** A platform plugs in by implementing this. */
export interface PlatformConnector {
  id: string;
  label: string;
  /** Build the OAuth consent URL (redirect_uri is the shared callback). */
  authUrl(clientId: string, redirectUri: string, state: string): string;
  /** Exchange an auth code for tokens -> { refreshToken, accessToken }. */
  exchange(clientId: string, secret: string, code: string, redirectUri: string): Promise<{ refreshToken?: string; accessToken: string }>;
  /** Refresh an access token from a refresh token. */
  refresh(clientId: string, secret: string, refreshToken: string): Promise<string>;
  /** Pull READ-ONLY analytics and normalize to SocialData. */
  sync(accessToken: string): Promise<SocialData>;
  /** Optional token revoke. */
  revoke?(token: string): Promise<void>;
  /** Optional: publish content. Requires the platform's write scope + app
   *  review (e.g. TikTok Content Posting API). Absent = read-only connector. */
  publish?(accessToken: string, payload: PublishPayload): Promise<PublishResult>;
  /** Extra OAuth scope(s) publishing needs beyond the read scopes (for consent + docs). */
  publishScopes?: string;
}

export const REDIRECT_URI = CALLBACK;

// --- Firestore (token client-locked; data owner-readable) ---
const tokenDoc = (bid: string, platform: string) => getFirestore().doc(`businesses/${bid}/private/social_${platform}`);
const dataDoc = (bid: string, platform: string) => getFirestore().doc(`businesses/${bid}/social/${platform}`);

async function saveRefreshToken(bid: string, platform: string, refreshToken: string): Promise<void> {
  await tokenDoc(bid, platform).set({ refreshToken, updatedAt: Date.now() }, { merge: true });
}
async function loadRefreshToken(bid: string, platform: string): Promise<string | null> {
  return ((await tokenDoc(bid, platform).get()).data()?.refreshToken as string) || null;
}
export async function setStatus(bid: string, platform: string, patch: Record<string, unknown>): Promise<void> {
  await dataDoc(bid, platform).set({ ...patch, platform, updatedAt: Date.now() }, { merge: true });
}

// --- signed OAuth state: "{platform}.{businessId}.{ts}.{sig}" ---
export function signState(platform: string, businessId: string, secret: string): string {
  const payload = `${platform}.${businessId}.${Date.now()}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}
export function verifyState(state: string, secret: string): { platform: string; businessId: string } | null {
  try {
    const [platform, businessId, ts, sig] = Buffer.from(state, 'base64url').toString().split('.');
    if (!platform || !businessId || !ts || !sig) return null;
    if (createHmac('sha256', secret).update(`${platform}.${businessId}.${ts}`).digest('base64url') !== sig) return null;
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return null;
    return { platform, businessId };
  } catch { return null; }
}

// --- generic orchestration (used by the endpoints) ---
export async function completeOAuth(c: PlatformConnector, bid: string, clientId: string, secret: string, code: string): Promise<void> {
  const { refreshToken } = await c.exchange(clientId, secret, code, REDIRECT_URI);
  if (!refreshToken) throw new Error('No refresh token returned (re-consent).');
  await saveRefreshToken(bid, c.id, refreshToken);
  await setStatus(bid, c.id, { status: 'connected', error: null, connectedAt: Date.now() });
}

export async function syncPlatform(c: PlatformConnector, bid: string, clientId: string, secret: string): Promise<{ videos: number }> {
  await setStatus(bid, c.id, { status: 'syncing', error: null });
  try {
    const refreshToken = await loadRefreshToken(bid, c.id);
    if (!refreshToken) throw new Error('Not connected.');
    const accessToken = await c.refresh(clientId, secret, refreshToken);
    const data = await c.sync(accessToken);
    await setStatus(bid, c.id, { status: 'connected', lastSync: Date.now(), error: null, data });
    return { videos: data.videos.length };
  } catch (err) {
    await setStatus(bid, c.id, { status: 'error', error: err instanceof Error ? err.message : 'Sync failed.' });
    throw err;
  }
}

/** Publish content via the connector (gated: requires write scope + approval). */
export async function publishPlatform(c: PlatformConnector, bid: string, clientId: string, secret: string, payload: PublishPayload): Promise<PublishResult> {
  if (!c.publish) throw new Error(`${c.label} publishing is not available yet.`);
  const refreshToken = await loadRefreshToken(bid, c.id);
  if (!refreshToken) throw new Error('Not connected.');
  const accessToken = await c.refresh(clientId, secret, refreshToken);
  const result = await c.publish(accessToken, payload);
  // Record the publish on the owner-readable doc so the ROI loop can pick it up.
  await dataDoc(bid, c.id).set(
    { lastPublish: { id: result.id, status: result.status, caption: payload.caption, at: Date.now() } },
    { merge: true },
  );
  return result;
}

export async function disconnectPlatform(c: PlatformConnector, bid: string): Promise<void> {
  const refreshToken = await loadRefreshToken(bid, c.id);
  if (refreshToken && c.revoke) { try { await c.revoke(refreshToken); } catch { /* best effort */ } }
  await tokenDoc(bid, c.id).delete().catch(() => undefined);
  await dataDoc(bid, c.id).set({ status: 'disconnected', lastSync: null, error: null, data: null, updatedAt: Date.now() }, { merge: true });
}

// Shared OAuth HTTP helpers for connectors.
export async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error_description as string) || (json.error as string) || JSON.stringify(json));
  return json;
}

/** Authenticated JSON POST (Bearer) — used by publish endpoints. */
export async function postJsonAuth(url: string, accessToken: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const e = (json.error as Record<string, unknown>) || {};
    throw new Error((e.message as string) || (json.error_description as string) || JSON.stringify(json) || `HTTP ${res.status}`);
  }
  return json;
}
