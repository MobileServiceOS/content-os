// Google Business Profile integration — server side. READ-ONLY usage of the
// business.manage scope (Google offers no read-only GBP scope): we only call
// fetch/list/GET endpoints — never create posts or replies. Mirrors the Search
// Console pattern: OAuth code->token exchange + all API calls happen only here;
// the client secret + refresh token never reach the browser. Reuses the SAME
// OAuth client as Search Console (SC_OAUTH_CLIENT_*). Requires the Business
// Profile APIs to be enabled + the project allowlisted by Google.
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const APP_RETURN = 'https://mobileserviceos.github.io/content-os/#/director';
// Reuses the existing OAuth client; this callback must be added to its redirect URIs.
export const GBP_REDIRECT_URI = 'https://us-central1-content-os-wheelrush.cloudfunctions.net/gbpOAuthCallback';
const DAY = 86_400_000;

const PERF = 'https://businessprofileperformance.googleapis.com/v1';
const ACCOUNTS = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS = 'https://mybusiness.googleapis.com/v4';

export interface MetricPoint { date: string; value: number; }
export interface GbpReview { id: string; rating: number; comment: string; reviewer: string; replied: boolean; at: string; }
export interface GbpData {
  locationName: string;
  locationTitle: string;
  range: { start: string; end: string };
  totals: { calls: number; websiteClicks: number; directionRequests: number; searchViews: number; mapsViews: number };
  series: { calls: MetricPoint[]; mapsViews: MetricPoint[]; searchViews: MetricPoint[] };
  searchKeywords: { keyword: string; impressions: number }[];
  reviews: { available: boolean; total: number; averageRating: number; unreplied: number; recent: GbpReview[] };
}

// --- Firestore: token in a client-LOCKED doc; data owner-readable ---
const tokenDoc = (bid: string) => getFirestore().doc(`businesses/${bid}/private/gbp`);
const dataDoc = (bid: string) => getFirestore().doc(`businesses/${bid}/gbp/latest`);

async function saveRefreshToken(bid: string, refreshToken: string): Promise<void> {
  await tokenDoc(bid).set({ refreshToken, updatedAt: Date.now() }, { merge: true });
}
async function loadRefreshToken(bid: string): Promise<string | null> {
  return ((await tokenDoc(bid).get()).data()?.refreshToken as string) || null;
}
export async function setStatus(bid: string, patch: Record<string, unknown>): Promise<void> {
  await dataDoc(bid).set({ ...patch, updatedAt: Date.now() }, { merge: true });
}

// --- OAuth (state HMAC-signed; same shape as Search Console) ---
export function signState(businessId: string, secret: string): string {
  const payload = `${businessId}.${Date.now()}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}
export function verifyState(state: string, secret: string): string | null {
  try {
    const [businessId, ts, sig] = Buffer.from(state, 'base64url').toString().split('.');
    if (!businessId || !ts || !sig) return null;
    if (createHmac('sha256', secret).update(`${businessId}.${ts}`).digest('base64url') !== sig) return null;
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return null;
    return businessId;
  } catch { return null; }
}
export function buildAuthUrl(clientId: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId, redirect_uri: GBP_REDIRECT_URI, response_type: 'code',
    scope: GBP_SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}
async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error_description as string) || (json.error as string) || `OAuth error ${res.status}`);
  return json;
}
export async function completeOAuth(bid: string, clientId: string, secret: string, code: string): Promise<void> {
  const j = await postForm(TOKEN_URL, { code, client_id: clientId, client_secret: secret, redirect_uri: GBP_REDIRECT_URI, grant_type: 'authorization_code' });
  if (!j.refresh_token) throw new Error('No refresh token (re-consent).');
  await saveRefreshToken(bid, j.refresh_token as string);
  await setStatus(bid, { status: 'connected', error: null, connectedAt: Date.now() });
}
async function accessTokenFor(clientId: string, secret: string, refreshToken: string): Promise<string> {
  const j = await postForm(TOKEN_URL, { client_id: clientId, client_secret: secret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  return j.access_token as string;
}

// --- GBP API (all read-only GETs) ---
async function apiGet(token: string, url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw Object.assign(new Error(`${res.status}: ${JSON.stringify(json)}`), { status: res.status });
  return json;
}
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dateParts = (ms: number) => { const d = new Date(ms); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() }; };

async function firstLocation(token: string): Promise<{ account: string; location: string; title: string } | null> {
  const accs = (await apiGet(token, `${ACCOUNTS}/accounts`)).accounts as { name: string }[] | undefined;
  if (!accs?.length) return null;
  for (const a of accs) {
    const locs = (await apiGet(token, `${INFO}/${a.name}/locations?readMask=name,title&pageSize=10`)).locations as { name: string; title?: string }[] | undefined;
    if (locs?.length) {
      const loc = locs[0];
      const id = loc.name.includes('/') ? loc.name.split('/').pop()! : loc.name;
      return { account: a.name, location: `locations/${id}`, title: loc.title ?? id };
    }
  }
  return null;
}

const DAILY_METRICS = [
  'CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
];

async function fetchMetrics(token: string, location: string, startMs: number, endMs: number) {
  const s = dateParts(startMs); const e = dateParts(endMs);
  const p = new URLSearchParams();
  DAILY_METRICS.forEach((m) => p.append('dailyMetrics', m));
  p.set('dailyRange.start_date.year', String(s.y)); p.set('dailyRange.start_date.month', String(s.m)); p.set('dailyRange.start_date.day', String(s.day));
  p.set('dailyRange.end_date.year', String(e.y)); p.set('dailyRange.end_date.month', String(e.m)); p.set('dailyRange.end_date.day', String(e.day));
  const j = await apiGet(token, `${PERF}/${location}:fetchMultiDailyMetricsTimeSeries?${p.toString()}`);
  const byMetric = new Map<string, MetricPoint[]>();
  const series = (j.multiDailyMetricTimeSeries as { dailyMetricTimeSeries: { dailyMetric: string; timeSeries: { datedValues: { date: { year: number; month: number; day: number }; value?: string }[] } }[] }[]) ?? [];
  for (const group of series) {
    for (const ms of group.dailyMetricTimeSeries ?? []) {
      const pts = (ms.timeSeries?.datedValues ?? []).map((dv) => ({ date: `${dv.date.year}-${String(dv.date.month).padStart(2, '0')}-${String(dv.date.day).padStart(2, '0')}`, value: Number(dv.value ?? 0) }));
      byMetric.set(ms.dailyMetric, pts);
    }
  }
  const sum = (m: string) => (byMetric.get(m) ?? []).reduce((a, p) => a + p.value, 0);
  const merge = (a: MetricPoint[], b: MetricPoint[]): MetricPoint[] => a.map((p, i) => ({ date: p.date, value: p.value + (b[i]?.value ?? 0) }));
  const searchSeries = merge(byMetric.get('BUSINESS_IMPRESSIONS_DESKTOP_SEARCH') ?? [], byMetric.get('BUSINESS_IMPRESSIONS_MOBILE_SEARCH') ?? []);
  const mapsSeries = merge(byMetric.get('BUSINESS_IMPRESSIONS_DESKTOP_MAPS') ?? [], byMetric.get('BUSINESS_IMPRESSIONS_MOBILE_MAPS') ?? []);
  return {
    totals: {
      calls: sum('CALL_CLICKS'), websiteClicks: sum('WEBSITE_CLICKS'), directionRequests: sum('BUSINESS_DIRECTION_REQUESTS'),
      searchViews: searchSeries.reduce((a, p) => a + p.value, 0), mapsViews: mapsSeries.reduce((a, p) => a + p.value, 0),
    },
    series: { calls: byMetric.get('CALL_CLICKS') ?? [], searchViews: searchSeries, mapsViews: mapsSeries },
  };
}

async function fetchSearchKeywords(token: string, location: string, startMs: number, endMs: number) {
  const s = dateParts(startMs); const e = dateParts(endMs);
  const p = new URLSearchParams();
  p.set('monthlyRange.start_month.year', String(s.y)); p.set('monthlyRange.start_month.month', String(s.m));
  p.set('monthlyRange.end_month.year', String(e.y)); p.set('monthlyRange.end_month.month', String(e.m));
  try {
    const j = await apiGet(token, `${PERF}/${location}/searchkeywords/impressions/monthly?${p.toString()}`);
    const rows = (j.searchKeywordsCounts as { searchKeyword: string; insightsValue?: { value?: string; threshold?: string } }[]) ?? [];
    const agg = new Map<string, number>();
    for (const r of rows) {
      const v = Number(r.insightsValue?.value ?? r.insightsValue?.threshold ?? 0);
      agg.set(r.searchKeyword, (agg.get(r.searchKeyword) ?? 0) + v);
    }
    return [...agg.entries()].map(([keyword, impressions]) => ({ keyword, impressions })).sort((a, b) => b.impressions - a.impressions).slice(0, 50);
  } catch { return []; }
}

async function fetchReviews(token: string, account: string, location: string) {
  try {
    const id = location.split('/').pop();
    const j = await apiGet(token, `${REVIEWS}/${account}/locations/${id}/reviews?pageSize=50&orderBy=updateTime%20desc`);
    const STAR: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    const reviews = (j.reviews as { reviewId: string; starRating: string; comment?: string; reviewReply?: unknown; createTime: string; reviewer?: { displayName?: string } }[]) ?? [];
    const recent: GbpReview[] = reviews.slice(0, 20).map((r) => ({
      id: r.reviewId, rating: STAR[r.starRating] ?? 0, comment: r.comment ?? '', reviewer: r.reviewer?.displayName ?? 'Anonymous', replied: !!r.reviewReply, at: r.createTime,
    }));
    return {
      available: true,
      total: Number(j.totalReviewCount ?? reviews.length),
      averageRating: Number(j.averageRating ?? 0),
      unreplied: reviews.filter((r) => !r.reviewReply).length,
      recent,
    };
  } catch {
    return { available: false, total: 0, averageRating: 0, unreplied: 0, recent: [] as GbpReview[] };
  }
}

/** Read everything (read-only) and store the snapshot. */
export async function syncGbp(bid: string, clientId: string, secret: string): Promise<{ location: string; calls: number }> {
  await setStatus(bid, { status: 'syncing', error: null });
  try {
    const refreshToken = await loadRefreshToken(bid);
    if (!refreshToken) throw new Error('Not connected.');
    const token = await accessTokenFor(clientId, secret, refreshToken);
    const loc = await firstLocation(token);
    if (!loc) throw new Error('No Business Profile location found on this account.');

    const end = Date.now() - 3 * DAY; // GBP data lags a few days
    const start = end - 90 * DAY;
    const perf = await fetchMetrics(token, loc.location, start, end);
    const searchKeywords = await fetchSearchKeywords(token, loc.location, start, end);
    const reviews = await fetchReviews(token, loc.account, loc.location);

    const data: GbpData = {
      locationName: loc.location, locationTitle: loc.title,
      range: { start: ymd(start), end: ymd(end) },
      totals: perf.totals, series: perf.series, searchKeywords, reviews,
    };
    await setStatus(bid, { status: 'connected', locationTitle: loc.title, lastSync: Date.now(), error: null, data });
    return { location: loc.title, calls: perf.totals.calls };
  } catch (err) {
    await setStatus(bid, { status: 'error', error: err instanceof Error ? err.message : 'Sync failed.' });
    throw err;
  }
}

export async function disconnectGbp(bid: string): Promise<void> {
  const refreshToken = await loadRefreshToken(bid);
  if (refreshToken) { try { await postForm(REVOKE_URL, { token: refreshToken }); } catch { /* best effort */ } }
  await tokenDoc(bid).delete().catch(() => undefined);
  await dataDoc(bid).set({ status: 'disconnected', locationTitle: null, lastSync: null, error: null, data: null, updatedAt: Date.now() }, { merge: true });
}

export { APP_RETURN };
