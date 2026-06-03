// Wave 3 (measurement) — Content ROI attribution. The renewal number: "what did
// this content earn?" Directional, not causal — we distribute each city's real
// MSOS revenue across the videos that mention that city, by their share of the
// city's views. Sums exactly to attributed revenue, so it never invents money.
// Pure + unit-tested; built entirely on already-connected data (TikTok + MSOS).
import type { JobRecord } from './types';
import type { SocialData, SocialVocab, SocialVideo } from './social/types';
import { revenueByCity } from './msosWidgets';
import { categorizeHook, type HookCategory } from './viralIntel';
import { hookOf } from './social/socialIntel';

const lc = (s: string): string => s.toLowerCase();
const matchName = (v: SocialVideo, names: string[]): string | null =>
  names.find((n) => lc(v.caption).includes(lc(n)) || v.hashtags.some((h) => h.includes(lc(n).replace(/\s+/g, '')))) ?? null;

export interface ContentRoiRow {
  id: string;
  caption: string;
  hookCategory: HookCategory;
  city: string | null;
  service: string | null;
  views: number;
  influencedRevenue: number; // directional: share of the city's revenue by view share
}

/** Per-video influenced revenue, ranked. Each city's revenue is split across the
 *  videos that mention it, weighted by views. Videos with no city match earn 0. */
export function contentRoi(t: SocialData | null, jobs: JobRecord[], vocab: SocialVocab): ContentRoiRow[] {
  if (!t || t.videos.length === 0) return [];
  const cityRev = new Map(revenueByCity(jobs).map((g) => [g.key, g.revenue]));

  const assigned = t.videos.map((v) => ({ v, city: matchName(v, vocab.cities), service: matchName(v, vocab.services) }));
  const cityViews = new Map<string, number>();
  for (const a of assigned) if (a.city) cityViews.set(a.city, (cityViews.get(a.city) ?? 0) + a.v.views);

  return assigned
    .map(({ v, city, service }) => {
      const cv = city ? cityViews.get(city) ?? 0 : 0;
      const rev = city ? cityRev.get(city) ?? 0 : 0;
      const influencedRevenue = city && cv > 0 ? (v.views / cv) * rev : 0;
      return { id: v.id, caption: v.caption, hookCategory: categorizeHook(hookOf(v.caption)), city, service, views: v.views, influencedRevenue };
    })
    .sort((a, b) => b.influencedRevenue - a.influencedRevenue);
}

export interface HookRoi { category: HookCategory; videos: number; influencedRevenue: number; views: number }

/** Which hook style earns the most — the creative lesson behind the revenue. */
export function roiByHookCategory(rows: ContentRoiRow[]): HookRoi[] {
  const m = new Map<HookCategory, HookRoi>();
  for (const r of rows) {
    const cur = m.get(r.hookCategory) ?? { category: r.hookCategory, videos: 0, influencedRevenue: 0, views: 0 };
    cur.videos += 1; cur.influencedRevenue += r.influencedRevenue; cur.views += r.views;
    m.set(r.hookCategory, cur);
  }
  return [...m.values()].sort((a, b) => b.influencedRevenue - a.influencedRevenue);
}

export const totalInfluenced = (rows: ContentRoiRow[]): number => rows.reduce((s, r) => s + r.influencedRevenue, 0);

/** Revenue per 1,000 views across all attributed content — the efficiency headline. */
export function revenuePerThousandViews(rows: ContentRoiRow[]): number {
  const views = rows.reduce((s, r) => s + r.views, 0);
  return views > 0 ? (totalInfluenced(rows) / views) * 1000 : 0;
}
