// TikTok connector for the social framework. OAuth v2 + Display API (READ-ONLY).
// The Display API provides: views, likes, comments, shares per video, plus
// follower count, duration, caption, and post time. It does NOT provide reach,
// favorites, profile visits, average watch time, completion rate, or
// followers-gained-over-time — those require TikTok's Business/Research API and
// are reported as `unavailable` (never faked).
import { postForm, type PlatformConnector, type SocialData, type SocialVideo, type PublishResult } from './framework';

const AUTHORIZE = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';
const API = 'https://open.tiktokapis.com/v2';
const SCOPES = 'user.info.basic,user.info.stats,video.list';
// Publishing needs the Content Posting API product + this scope + app audit.
// PULL_FROM_URL also requires the video host domain to be URL-prefix-verified
// in the TikTok developer portal. See docs/PUBLISH-SETUP.md.
const PUBLISH_SCOPE = 'video.publish';

const UNAVAILABLE = ['reach', 'favorites', 'profileVisits', 'avgWatchTime', 'completionRate', 'followersGained'];

function hashtagsOf(caption: string): string[] {
  return (caption.match(/#[\p{L}0-9_]+/gu) ?? []).map((t) => t.toLowerCase());
}

async function apiGet(token: string, path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`TikTok ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
async function apiPost(token: string, path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`TikTok ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export const tiktok: PlatformConnector = {
  id: 'tiktok',
  label: 'TikTok',

  authUrl(clientKey, redirectUri, state) {
    const p = new URLSearchParams({ client_key: clientKey, scope: SCOPES, response_type: 'code', redirect_uri: redirectUri, state });
    return `${AUTHORIZE}?${p.toString()}`;
  },

  async exchange(clientKey, secret, code, redirectUri) {
    const j = await postForm(TOKEN, { client_key: clientKey, client_secret: secret, code, grant_type: 'authorization_code', redirect_uri: redirectUri });
    return { refreshToken: j.refresh_token as string | undefined, accessToken: j.access_token as string };
  },
  async refresh(clientKey, secret, refreshToken) {
    const j = await postForm(TOKEN, { client_key: clientKey, client_secret: secret, grant_type: 'refresh_token', refresh_token: refreshToken });
    return j.access_token as string;
  },
  async revoke(token) {
    // best-effort; needs client creds which the framework doesn't pass to revoke — skip.
    void token;
  },

  async sync(accessToken): Promise<SocialData> {
    // 1. account
    const info = (await apiGet(accessToken, '/user/info/?fields=open_id,display_name,follower_count,likes_count,video_count')).data as { user?: { display_name?: string; follower_count?: number; likes_count?: number } } | undefined;
    const user = info?.user ?? {};

    // 2. videos (+ stats) — paginate a couple pages
    const videos: SocialVideo[] = [];
    let cursor: number | undefined;
    for (let page = 0; page < 3; page++) {
      const body: Record<string, unknown> = { max_count: 20 };
      if (cursor) body.cursor = cursor;
      const resp = (await apiPost(accessToken, '/video/list/?fields=id,video_description,create_time,duration,view_count,like_count,comment_count,share_count', body)).data as { videos?: Record<string, unknown>[]; cursor?: number; has_more?: boolean } | undefined;
      for (const v of resp?.videos ?? []) {
        const caption = String(v.video_description ?? '');
        videos.push({
          id: String(v.id), caption, hashtags: hashtagsOf(caption),
          createdAt: Number(v.create_time ?? 0) * 1000, durationSec: Number(v.duration ?? 0),
          views: Number(v.view_count ?? 0), likes: Number(v.like_count ?? 0),
          comments: Number(v.comment_count ?? 0), shares: Number(v.share_count ?? 0), favorites: 0,
        });
      }
      if (!resp?.has_more || !resp.cursor) break;
      cursor = resp.cursor;
    }

    const sum = (k: keyof SocialVideo) => videos.reduce((a, v) => a + (v[k] as number), 0);
    const times = videos.map((v) => v.createdAt).filter(Boolean);
    return {
      platform: 'tiktok',
      account: { username: user.display_name ?? '', displayName: user.display_name ?? '', followers: Number(user.follower_count ?? 0), totalLikes: Number(user.likes_count ?? 0) },
      totals: { views: sum('views'), likes: sum('likes'), comments: sum('comments'), shares: sum('shares'), favorites: 0 },
      videos,
      range: { start: times.length ? Math.min(...times) : 0, end: times.length ? Math.max(...times) : 0 },
      unavailable: UNAVAILABLE,
    };
  },

  publishScopes: PUBLISH_SCOPE,
  async publish(accessToken, payload): Promise<PublishResult> {
    if (!payload.videoUrl) throw new Error('TikTok publishing needs a public video URL (PULL_FROM_URL source).');
    // Direct Post via the Content Posting API. Unaudited apps may only post as
    // SELF_ONLY (private); PUBLIC requires passing TikTok's app audit.
    const body = {
      post_info: {
        title: payload.caption.slice(0, 2200),
        privacy_level: payload.privacy ?? 'SELF_ONLY',
        disable_comment: false, disable_duet: false, disable_stitch: false,
      },
      source_info: { source: 'PULL_FROM_URL', video_url: payload.videoUrl },
    };
    const j = await apiPost(accessToken, '/post/publish/video/init/', body);
    const data = j.data as { publish_id?: string } | undefined;
    if (!data?.publish_id) throw new Error(`TikTok publish failed: ${JSON.stringify(j)}`);
    return { id: data.publish_id, status: 'PROCESSING' };
  },
};
