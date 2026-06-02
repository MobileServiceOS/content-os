// Social Intelligence (pure, platform-agnostic). Top videos, hooks, services,
// cities, best posting times + lengths, and engagement trend — all derived from
// the normalized SocialData. Cities/services are matched against the business's
// vocab (captions + hashtags). Unit-tested.
import { engagementRate, type SocialData, type SocialVideo, type SocialVocab } from './types';

export interface VideoRow extends SocialVideo { engagement: number }
export interface HookRow { hook: string; views: number; engagement: number; videoId: string }
export interface KwGroup { key: string; views: number; videos: number }
export interface TimeSlot { label: string; videos: number; avgViews: number }
export interface LengthBand { band: string; videos: number; avgViews: number; avgEngagement: number }
export interface TrendPt { label: string; value: number }

const withEng = (v: SocialVideo): VideoRow => ({ ...v, engagement: engagementRate(v) });
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const topVideos = (d: SocialData, n = 10): VideoRow[] => d.videos.map(withEng).sort((a, b) => b.views - a.views).slice(0, n);

/** The "hook" is the opening line of the caption. */
export function hookOf(caption: string): string {
  const first = caption.split(/[\n.!?]/)[0].replace(/#[\p{L}0-9_]+/gu, '').trim();
  return first.slice(0, 90);
}
export function topHooks(d: SocialData, n = 10): HookRow[] {
  return d.videos
    .map((v) => ({ hook: hookOf(v.caption), views: v.views, engagement: engagementRate(v), videoId: v.id }))
    .filter((h) => h.hook.length >= 4)
    .sort((a, b) => b.views - a.views)
    .slice(0, n);
}

const matches = (v: SocialVideo, needle: string): boolean => {
  const n = needle.toLowerCase();
  return v.caption.toLowerCase().includes(n) || v.hashtags.some((h) => h.includes(n.replace(/\s+/g, '')));
};
export function groupByVocab(videos: SocialVideo[], names: string[]): KwGroup[] {
  return names
    .map((name) => {
      const vids = videos.filter((v) => matches(v, name));
      return { key: name, views: vids.reduce((a, v) => a + v.views, 0), videos: vids.length };
    })
    .filter((g) => g.videos > 0)
    .sort((a, b) => b.views - a.views);
}
export const topServices = (d: SocialData, v: SocialVocab): KwGroup[] => groupByVocab(d.videos, v.services);
export const topCities = (d: SocialData, v: SocialVocab): KwGroup[] => groupByVocab(d.videos, v.cities);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function slotOf(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const part = h < 6 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  return `${DAYS[d.getDay()]} ${part}`;
}
export function bestPostingTimes(d: SocialData): TimeSlot[] {
  const groups = new Map<string, number[]>();
  for (const v of d.videos) {
    if (!v.createdAt) continue;
    const k = slotOf(v.createdAt);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(v.views);
  }
  return [...groups.entries()]
    .map(([label, views]) => ({ label, videos: views.length, avgViews: avg(views) }))
    .sort((a, b) => b.avgViews - a.avgViews);
}

export function lengthBand(sec: number): string {
  if (sec <= 0) return 'unknown';
  if (sec < 15) return '<15s';
  if (sec <= 30) return '15–30s';
  if (sec <= 60) return '30–60s';
  return '60s+';
}
export function bestVideoLengths(d: SocialData): LengthBand[] {
  const groups = new Map<string, SocialVideo[]>();
  for (const v of d.videos) {
    const k = lengthBand(v.durationSec);
    if (k === 'unknown') continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(v);
  }
  return [...groups.entries()]
    .map(([band, vids]) => ({ band, videos: vids.length, avgViews: avg(vids.map((v) => v.views)), avgEngagement: avg(vids.map(engagementRate)) }))
    .sort((a, b) => b.avgViews - a.avgViews);
}

/** Engagement rate per video, oldest -> newest (the trend over time). */
export function engagementTrend(d: SocialData): TrendPt[] {
  return [...d.videos]
    .filter((v) => v.createdAt && v.views > 0)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((v) => ({ label: new Date(v.createdAt).toISOString().slice(5, 10), value: Math.round(engagementRate(v) * 1000) / 10 }));
}
