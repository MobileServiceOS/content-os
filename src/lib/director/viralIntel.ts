// Phase 9 — Viral Intelligence Engine (pure). Fuses REAL connected data:
// TikTok performance (SocialData) + Search Console (SeoData) + MSOS revenue
// (JobRecord[]). Produces hook intelligence, city/service intelligence, the
// content-gap engine, multi-format daily recommendations, and a pre-publish
// content-score prediction. Deterministic + unit-tested. No mock data: callers
// pass live data; empty inputs yield honest empty results.
import type { JobRecord } from './types';
import type { SocialData, SocialVocab } from './social/types';
import { engagementRate, type SocialVideo } from './social/types';
import { topHooks, hookOf } from './social/socialIntel';
import { videoIdeas } from './social/contentEngine';
import { revenueByCity, revenueByService, money } from './msosWidgets';
import type { SeoData } from './seoIntel';
import { topKeywords } from './seoIntel';

const lc = (s: string): string => s.toLowerCase();
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]): number => (xs.length ? sum(xs) / xs.length : 0);
const median = (xs: number[]): number => {
  const s = [...xs].filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const videoMatches = (v: SocialVideo, name: string): boolean =>
  lc(v.caption).includes(lc(name)) || v.hashtags.some((h) => h.includes(lc(name).replace(/\s+/g, '')));

// === 1. Hook Intelligence ===
export type HookCategory = 'emergency' | 'cost' | 'curiosity' | 'story' | 'convenience' | 'educational' | 'shock' | 'comparison' | 'other';
const HOOK_PATTERNS: [HookCategory, RegExp][] = [
  ['emergency', /emergency|stranded|stuck|blowout|2 ?am|night|roadside|rescue|flat/i],
  ['cost', /price|dealer|cheaper|save|\$|cost|expensive|afford|quote/i],
  ['convenience', /come to you|driveway|at work|we come|no tow|never leave|on[- ]site/i],
  ['story', /\bshe\b|\bhe\b|this customer|thought|almost|real story|true story/i],
  ['curiosity', /the one|nobody tells|secret|why your|what.*don'?t|truth|the part/i],
  ['educational', /how to|tips|psi|tread|date code|sidewall|learn|guide/i],
  ['shock', /most people|never|warning|dead|won'?t believe|shocking/i],
  ['comparison', /\bvs\b|versus|instead of|compared|before.*after/i],
];
export function categorizeHook(hook: string): HookCategory {
  for (const [cat, re] of HOOK_PATTERNS) if (re.test(hook)) return cat;
  return 'other';
}

export interface HookRow { hook: string; category: HookCategory; views: number; engagement: number; }
export function top20Hooks(t: SocialData): HookRow[] {
  return topHooks(t, 20).map((h) => ({ hook: h.hook, category: categorizeHook(h.hook), views: h.views, engagement: h.engagement }));
}
export interface HookCatStat { category: HookCategory; videos: number; avgViews: number; totalViews: number; }
export function hookCategoryStats(t: SocialData): HookCatStat[] {
  const groups = new Map<HookCategory, SocialVideo[]>();
  for (const v of t.videos) {
    const c = categorizeHook(hookOf(v.caption));
    (groups.get(c) ?? groups.set(c, []).get(c)!).push(v);
  }
  return [...groups.entries()]
    .map(([category, vids]) => ({ category, videos: vids.length, avgViews: avg(vids.map((v) => v.views)), totalViews: sum(vids.map((v) => v.views)) }))
    .sort((a, b) => b.avgViews - a.avgViews);
}
export const bestOpeningLine = (t: SocialData): string => topHooks(t, 1)[0]?.hook ?? '';

// === 2. City Intelligence ===
export interface CityIntel { city: string; revenue: number; views: number; videos: number; revenuePer1kViews: number | null; }
export function cityIntelligence(t: SocialData | null, jobs: JobRecord[], v: SocialVocab): CityIntel[] {
  const rev = new Map(revenueByCity(jobs).map((g) => [g.key, g.revenue]));
  return v.cities
    .map((city) => {
      const vids = t ? t.videos.filter((x) => videoMatches(x, city)) : [];
      const views = sum(vids.map((x) => x.views));
      const revenue = rev.get(city) ?? 0;
      return { city, revenue, views, videos: vids.length, revenuePer1kViews: views > 0 ? (revenue / views) * 1000 : null };
    })
    .filter((c) => c.revenue > 0 || c.views > 0)
    .sort((a, b) => b.revenue - a.revenue);
}
/** High revenue + little content = target next. */
export function recommendedCities(intel: CityIntel[]): CityIntel[] {
  return [...intel].filter((c) => c.revenue > 0).sort((a, b) => (b.revenue / (b.views + 1)) - (a.revenue / (a.views + 1))).slice(0, 5);
}

// === 3. Service Intelligence ===
export interface ServiceIntel { service: string; revenue: number; views: number; videos: number; engagement: number; conversionOpportunity: number; }
export function serviceIntelligence(t: SocialData | null, jobs: JobRecord[], v: SocialVocab): ServiceIntel[] {
  const rev = new Map(revenueByService(jobs).map((g) => [g.key, g.revenue]));
  const totalRev = sum([...rev.values()]) || 1;
  const totalViews = t ? sum(t.videos.map((x) => x.views)) || 1 : 1;
  return v.services
    .map((service) => {
      const vids = t ? t.videos.filter((x) => videoMatches(x, service)) : [];
      const views = sum(vids.map((x) => x.views));
      const revenue = rev.get(service) ?? 0;
      const revShare = revenue / totalRev;
      const viewShare = views / totalViews;
      // High revenue share + low view share = big conversion opportunity (0..10).
      const conversionOpportunity = Math.round(Math.max(0, revShare - viewShare) * 10 * 10) / 10;
      return { service, revenue, views, videos: vids.length, engagement: avg(vids.map(engagementRate)), conversionOpportunity };
    })
    .filter((s) => s.revenue > 0 || s.views > 0);
}
export const rankServices = (s: ServiceIntel[], by: 'revenue' | 'views' | 'engagement' | 'conversionOpportunity'): ServiceIntel[] =>
  [...s].sort((a, b) => b[by] - a[by]);

// === 4. Content Gap Engine ===
export interface ContentGaps {
  citiesNoContent: { city: string; revenue: number }[];
  servicesNoContent: { service: string; revenue: number }[];
  highRevLowContent: string[];
}
export function contentGaps(t: SocialData | null, jobs: JobRecord[], v: SocialVocab): ContentGaps {
  const cities = cityIntelligence(t, jobs, v);
  const services = serviceIntelligence(t, jobs, v);
  const citiesNoContent = cities.filter((c) => c.revenue > 0 && c.views === 0).map((c) => ({ city: c.city, revenue: c.revenue }));
  const servicesNoContent = services.filter((s) => s.revenue > 0 && s.videos === 0).map((s) => ({ service: s.service, revenue: s.revenue }));
  const highRevLowContent = [...cities]
    .filter((c) => c.revenue > 0)
    .sort((a, b) => (b.revenue / (b.views + 1)) - (a.revenue / (a.views + 1)))
    .slice(0, 5)
    .map((c) => `${c.city}: ${money(c.revenue)} revenue from ${c.videos} video${c.videos === 1 ? '' : 's'} (${c.views.toLocaleString()} views) — under-served.`);
  return { citiesNoContent, servicesNoContent, highRevLowContent };
}

// === 5. Daily Recommendations (multi-format, real data) ===
export interface DailyRecs { tiktok: string[]; gbp: string[]; blog: string; short: string; }
export function dailyRecommendations(t: SocialData | null, sc: SeoData | null, jobs: JobRecord[], v: SocialVocab): DailyRecs {
  const cities = cityIntelligence(t, jobs, v);
  const services = rankServices(serviceIntelligence(t, jobs, v), 'revenue');
  const topCity = recommendedCities(cities)[0]?.city ?? cities[0]?.city ?? v.cities[0] ?? 'your city';
  const topService = services[0]?.service ?? v.services[0] ?? 'mobile service';
  const topKw = sc ? topKeywords(sc, 1)[0]?.key : undefined;

  const tiktok = t ? videoIdeas(t, v, 3).map((i) => i.hook) : [
    `Stuck needing ${lc(topService)} in ${topCity}? Watch this.`,
    `Why ${topCity} calls us first for ${lc(topService)}.`,
    `Real ${topCity} ${lc(topService)}, start to finish.`,
  ];
  const gbp = [
    `Mobile ${lc(topService)} in ${topCity} — we come to you, same day. Tap to call.`,
    `Serving ${topCity}: fast, fair ${lc(topService)} with no tow and no waiting room.`,
    services[1] ? `Now featuring ${lc(services[1].service)} across ${topCity} and nearby.` : `Book ${lc(topService)} in ${topCity} today.`,
  ];
  const blog = topKw
    ? `"${topKw}" — full guide (targets your top Search Console query, ${money(cities[0]?.revenue ?? 0)} revenue city ${topCity}).`
    : `${topService} in ${topCity}: the complete guide (what it costs, how fast, and when to call).`;
  const short = `YouTube Short: ${tiktok[0]} (repurpose your top TikTok angle vertically, 30–45s).`;
  return { tiktok: tiktok.slice(0, 3), gbp: gbp.slice(0, 3), blog, short };
}

// === 6. Content Score (predict before publishing) ===
export type ScoreBand = 'Low' | 'Medium' | 'High' | 'Viral';
export interface ScorePrediction { band: ScoreBand; predictedViews: number; confidence: 'low' | 'high'; rationale: string }

const CATEGORY_HEAT: Record<HookCategory, number> = {
  emergency: 0.95, story: 0.85, cost: 0.8, convenience: 0.7, shock: 0.72, comparison: 0.65, curiosity: 0.75, educational: 0.55, other: 0.5,
};

export function predictContentScore(draft: string, t: SocialData | null, v: SocialVocab): ScorePrediction {
  const cat = categorizeHook(draft);
  const cityHit = v.cities.some((c) => lc(draft).includes(lc(c)));
  const serviceHit = v.services.some((s) => lc(draft).includes(lc(s)));
  const bonus = (cityHit ? 1.15 : 1) * (serviceHit ? 1.1 : 1);

  if (t && t.videos.length >= 3) {
    const med = median(t.videos.map((x) => x.views)) || 1;
    const catStat = hookCategoryStats(t).find((c) => c.category === cat);
    const base = catStat && catStat.videos >= 1 ? catStat.avgViews : avg(t.videos.map((x) => x.views));
    const predicted = Math.round(base * bonus);
    const band: ScoreBand = predicted >= med * 2 ? 'Viral' : predicted >= med ? 'High' : predicted >= med * 0.5 ? 'Medium' : 'Low';
    return {
      band, predictedViews: predicted, confidence: 'high',
      rationale: `"${cat}" hooks average ${Math.round(base).toLocaleString()} views for you${cityHit ? ', + city mention' : ''}${serviceHit ? ', + service mention' : ''}. Your median is ${Math.round(med).toLocaleString()}.`,
    };
  }
  // No history yet — score by hook type + targeting (lower confidence).
  const heat = CATEGORY_HEAT[cat] * bonus;
  const band: ScoreBand = heat >= 1.05 ? 'Viral' : heat >= 0.85 ? 'High' : heat >= 0.65 ? 'Medium' : 'Low';
  return { band, predictedViews: 0, confidence: 'low', rationale: `Based on hook type ("${cat}")${cityHit ? ' + city' : ''}${serviceHit ? ' + service' : ''} — connect/sync TikTok for data-backed scoring.` };
}
