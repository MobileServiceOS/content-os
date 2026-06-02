// Phase 3 — GBP Intelligence (pure). Operates on the Business Profile snapshot
// synced by the server. Metrics (calls/clicks/directions/search+maps views) and
// reviews are native; "top cities/services" are DERIVED from GBP search-keyword
// impressions matched against the business's own vocab (GBP gives no city/service
// breakdown for a single service-area location). Deterministic + unit-tested.

export interface GbpMetricPoint { date: string; value: number; }
export interface GbpReview { id: string; rating: number; comment: string; reviewer: string; replied: boolean; at: string; }
export interface GbpData {
  locationTitle: string;
  range: { start: string; end: string };
  totals: { calls: number; websiteClicks: number; directionRequests: number; searchViews: number; mapsViews: number };
  series: { calls: GbpMetricPoint[]; mapsViews: GbpMetricPoint[]; searchViews: GbpMetricPoint[] };
  searchKeywords: { keyword: string; impressions: number }[];
  reviews: { available: boolean; total: number; averageRating: number; unreplied: number; recent: GbpReview[] };
}
export interface GbpVocab { cities: string[]; services: string[] }
export interface KeywordGroup { key: string; impressions: number; matches: number }

const norm = (s: string): string => s.toLowerCase();

/** Aggregate keyword impressions for keywords mentioning each vocab term. */
export function groupKeywords(keywords: { keyword: string; impressions: number }[], names: string[]): KeywordGroup[] {
  return names
    .map((name) => {
      const needle = norm(name);
      const matched = keywords.filter((k) => norm(k.keyword).includes(needle));
      return { key: name, impressions: matched.reduce((a, k) => a + k.impressions, 0), matches: matched.length };
    })
    .filter((g) => g.impressions > 0 || g.matches > 0)
    .sort((a, b) => b.impressions - a.impressions);
}

export const topCities = (d: GbpData, v: GbpVocab): KeywordGroup[] => groupKeywords(d.searchKeywords, v.cities);
export const topServices = (d: GbpData, v: GbpVocab): KeywordGroup[] => groupKeywords(d.searchKeywords, v.services);

export const callsTrend = (d: GbpData): GbpMetricPoint[] => d.series.calls ?? [];
export const mapsTrend = (d: GbpData): GbpMetricPoint[] => d.series.mapsViews ?? [];

export interface GbpRecommendations {
  cityToTarget: string | null;
  serviceToPromote: string | null;
  posts: string[];
  reviewsNeedingResponse: GbpReview[];
}

export function gbpRecommendations(d: GbpData, v: GbpVocab): GbpRecommendations {
  const cities = topCities(d, v);
  const services = topServices(d, v);
  const cityToTarget = cities[0]?.key ?? null;
  const serviceToPromote = services[0]?.key ?? null;

  const posts: string[] = [];
  if (serviceToPromote && cityToTarget) posts.push(`Post: "${serviceToPromote} in ${cityToTarget}" — your top-searched combo on Google.`);
  if (d.totals.directionRequests > 0) posts.push(`Post a "We come to you" update — ${d.totals.directionRequests} direction requests show local intent.`);
  if (services[1]) posts.push(`Post highlighting ${services[1].key} — rising in your Google searches.`);
  if (d.reviews.available && d.reviews.averageRating >= 4.5 && d.reviews.total > 0) posts.push(`Post a review spotlight — ${d.reviews.averageRating.toFixed(1)}★ from ${d.reviews.total} reviews.`);

  return {
    cityToTarget,
    serviceToPromote,
    posts: posts.slice(0, 5),
    reviewsNeedingResponse: d.reviews.recent.filter((r) => !r.replied).slice(0, 10),
  };
}
