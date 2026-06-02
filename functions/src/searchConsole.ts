// Google Search Console integration — server side. READ-ONLY
// (webmasters.readonly). The OAuth code->token exchange and all API calls run
// only here; the client secret + refresh token never reach the browser. The
// refresh token is stored in a client-locked Firestore doc (rules deny all
// client access); synced metrics go to an owner-readable doc. Plain fetch (Node
// 20) — no extra deps. Read-only by scope; we never call a write endpoint.
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const SC_BASE = 'https://www.googleapis.com/webmasters/v3';
export const SC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const APP_RETURN = 'https://mobileserviceos.github.io/content-os/#/director';
const DAY = 86_400_000;

export interface SeoRow { key: string; clicks: number; impressions: number; ctr: number; position: number; }
export interface SeoData {
  byQuery: SeoRow[];
  byPage: SeoRow[];
  range: { start: string; end: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
}

// --- Firestore (Admin SDK bypasses rules; client access is denied by rules) ---
const tokenDoc = (bid: string) => getFirestore().doc(`businesses/${bid}/private/searchConsole`);
const dataDoc = (bid: string) => getFirestore().doc(`businesses/${bid}/searchConsole/latest`);

async function saveRefreshToken(bid: string, refreshToken: string): Promise<void> {
  await tokenDoc(bid).set({ refreshToken, updatedAt: Date.now() }, { merge: true });
}
async function loadRefreshToken(bid: string): Promise<string | null> {
  const snap = await tokenDoc(bid).get();
  return (snap.data()?.refreshToken as string) || null;
}
/** Status + synced data (owner-readable). Never contains the token. */
export async function setStatus(bid: string, patch: Record<string, unknown>): Promise<void> {
  await dataDoc(bid).set({ ...patch, updatedAt: Date.now() }, { merge: true });
}

// --- OAuth state (HMAC-signed businessId, 15-min TTL; prevents CSRF) ---
export function signState(businessId: string, secret: string): string {
  const payload = `${businessId}.${Date.now()}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}
export function verifyState(state: string, secret: string): string | null {
  try {
    const [businessId, ts, sig] = Buffer.from(state, 'base64url').toString().split('.');
    if (!businessId || !ts || !sig) return null;
    const expected = createHmac('sha256', secret).update(`${businessId}.${ts}`).digest('base64url');
    if (sig !== expected) return null;
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return null;
    return businessId;
  } catch { return null; }
}

// --- OAuth ---
export function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SC_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error_description as string) || (json.error as string) || `OAuth error ${res.status}`);
  return json;
}

export async function exchangeCode(clientId: string, secret: string, code: string, redirectUri: string): Promise<{ refreshToken?: string; accessToken: string }> {
  const j = await postForm(TOKEN_URL, { code, client_id: clientId, client_secret: secret, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  return { refreshToken: j.refresh_token as string | undefined, accessToken: j.access_token as string };
}
async function refreshAccessToken(clientId: string, secret: string, refreshToken: string): Promise<string> {
  const j = await postForm(TOKEN_URL, { client_id: clientId, client_secret: secret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  return j.access_token as string;
}
async function revoke(token: string): Promise<void> {
  try { await postForm(REVOKE_URL, { token }); } catch { /* best effort */ }
}

// --- Search Console API (read-only) ---
async function scGet(accessToken: string, path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${SC_BASE}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`SC API ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
async function listSites(accessToken: string): Promise<string[]> {
  const j = await scGet(accessToken, '/sites');
  const entries = (j.siteEntry as { siteUrl: string; permissionLevel: string }[]) || [];
  // Prefer owned/full-access properties; sc-domain first.
  return entries
    .filter((e) => e.permissionLevel !== 'siteUnverifiedUser')
    .map((e) => e.siteUrl)
    .sort((a, b) => (a.startsWith('sc-domain:') ? -1 : 1) - (b.startsWith('sc-domain:') ? -1 : 1));
}
interface ScApiRow { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number; }
async function scQuery(accessToken: string, siteUrl: string, dimension: string, start: string, end: string, rowLimit = 250): Promise<SeoRow[]> {
  const res = await fetch(`${SC_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: start, endDate: end, dimensions: [dimension], rowLimit }),
  });
  const json = (await res.json()) as { rows?: ScApiRow[]; error?: unknown };
  if (!res.ok) throw new Error(`SC query ${res.status}: ${JSON.stringify(json.error ?? json)}`);
  return (json.rows ?? []).map((r) => ({ key: r.keys?.[0] ?? '(none)', clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
}

const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// --- public orchestration (called by index.ts endpoints) ---

/** Exchange the OAuth code, store the refresh token, mark connected. */
export async function completeOAuth(bid: string, clientId: string, secret: string, code: string, redirectUri: string): Promise<void> {
  const { refreshToken } = await exchangeCode(clientId, secret, code, redirectUri);
  if (!refreshToken) throw new Error('No refresh token returned (re-consent with prompt=consent).');
  await saveRefreshToken(bid, refreshToken);
  await setStatus(bid, { status: 'connected', error: null, connectedAt: Date.now() });
}

/** Pull the last 90 days by query + page, store the snapshot. */
export async function syncSearchConsole(bid: string, clientId: string, secret: string): Promise<{ siteUrl: string; queries: number; pages: number }> {
  await setStatus(bid, { status: 'syncing', error: null });
  try {
    const refreshToken = await loadRefreshToken(bid);
    if (!refreshToken) throw new Error('Not connected.');
    const accessToken = await refreshAccessToken(clientId, secret, refreshToken);

    const existingSite = (await dataDoc(bid).get()).data()?.siteUrl as string | undefined;
    const siteUrl = existingSite || (await listSites(accessToken))[0];
    if (!siteUrl) throw new Error('No verified Search Console property on this account.');

    const end = ymd(Date.now() - 2 * DAY); // SC data lags ~2 days
    const start = ymd(Date.now() - 92 * DAY);
    const byQuery = await scQuery(accessToken, siteUrl, 'query', start, end);
    const byPage = await scQuery(accessToken, siteUrl, 'page', start, end);

    const clicks = byQuery.reduce((a, r) => a + r.clicks, 0);
    const impressions = byQuery.reduce((a, r) => a + r.impressions, 0);
    const data: SeoData = {
      byQuery, byPage, range: { start, end },
      totals: { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: avgPos(byQuery) },
    };
    await setStatus(bid, { status: 'connected', siteUrl, lastSync: Date.now(), error: null, data });
    return { siteUrl, queries: byQuery.length, pages: byPage.length };
  } catch (err) {
    await setStatus(bid, { status: 'error', error: err instanceof Error ? err.message : 'Sync failed.' });
    throw err;
  }
}

function avgPos(rows: SeoRow[]): number {
  const imp = rows.reduce((a, r) => a + r.impressions, 0);
  if (!imp) return 0;
  return rows.reduce((a, r) => a + r.position * r.impressions, 0) / imp; // impression-weighted
}

/** Revoke at Google + delete the token; mark disconnected. */
export async function disconnectSearchConsole(bid: string): Promise<void> {
  const refreshToken = await loadRefreshToken(bid);
  if (refreshToken) await revoke(refreshToken);
  await tokenDoc(bid).delete().catch(() => undefined);
  await dataDoc(bid).set({ status: 'disconnected', siteUrl: null, lastSync: null, error: null, data: null, updatedAt: Date.now() }, { merge: true });
}

export { APP_RETURN };
