// Phase 5 — SEO Intelligence (pure). Operates on the Search Console snapshot
// synced by the server. Keyword + page groupings are NATIVE SC dimensions; city
// + service groupings are DERIVED by matching the business's own vocab against
// query/page text (SC has no city/service dimension) — the UI labels them as
// derived. Deterministic + unit-tested.

export interface SeoRow { key: string; clicks: number; impressions: number; ctr: number; position: number; }
export interface SeoData {
  byQuery: SeoRow[];
  byPage: SeoRow[];
  range: { start: string; end: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
}
export interface SeoVocab { cities: string[]; services: string[]; }
export interface SeoRecommendation { kind: 'city_page' | 'keyword' | 'page_ctr'; title: string; detail: string; }

const norm = (s: string): string => s.toLowerCase();
const tokens = (s: string): string => norm(s).replace(/[^a-z0-9]+/g, ' ');

export const topKeywords = (d: SeoData, n = 15): SeoRow[] => [...d.byQuery].sort((a, b) => b.clicks - a.clicks).slice(0, n);
export const topPages = (d: SeoData, n = 15): SeoRow[] => [...d.byPage].sort((a, b) => b.clicks - a.clicks).slice(0, n);

/** Aggregate rows whose key mentions a vocab term. Impression-weighted position. */
export function groupByVocab(rows: SeoRow[], names: string[]): SeoRow[] {
  return names
    .map((name) => {
      const needle = norm(name);
      const matched = rows.filter((r) => tokens(r.key).includes(needle) || norm(r.key).includes(needle));
      if (!matched.length) return null;
      const clicks = matched.reduce((a, r) => a + r.clicks, 0);
      const impressions = matched.reduce((a, r) => a + r.impressions, 0);
      const posImp = matched.reduce((a, r) => a + r.position * r.impressions, 0);
      return { key: name, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? posImp / impressions : 0 };
    })
    .filter((g): g is SeoRow => g !== null)
    .sort((a, b) => b.impressions - a.impressions);
}

export const byCity = (d: SeoData, v: SeoVocab): SeoRow[] => groupByVocab(d.byQuery, v.cities);
export const byService = (d: SeoData, v: SeoVocab): SeoRow[] => groupByVocab(d.byQuery, v.services);

const pageHasCity = (city: string, pages: SeoRow[]): boolean => {
  const slug = norm(city).replace(/\s+/g, '');
  return pages.some((p) => norm(p.key).replace(/[^a-z0-9]/g, '').includes(slug));
};

/** AI recommendations: city pages to build, keywords to target, CTR fixes. */
export function seoRecommendations(d: SeoData, v: SeoVocab): SeoRecommendation[] {
  const out: SeoRecommendation[] = [];

  // City pages: real impressions for the city but no dedicated landing page.
  for (const c of byCity(d, v)) {
    if (c.impressions >= 50 && !pageHasCity(c.key, d.byPage)) {
      out.push({ kind: 'city_page', title: `Build a city page for ${c.key}`, detail: `${Math.round(c.impressions)} impressions, avg position ${c.position.toFixed(1)} — no dedicated ${c.key} page yet.` });
    }
  }
  // Keywords: high impressions but ranking off page 1.
  for (const k of [...d.byQuery].filter((r) => r.position > 10 && r.impressions >= 100).sort((a, b) => b.impressions - a.impressions).slice(0, 5)) {
    out.push({ kind: 'keyword', title: `Target "${k.key}"`, detail: `${Math.round(k.impressions)} impressions but ranking #${k.position.toFixed(0)} — content + internal links can move it onto page 1.` });
  }
  // CTR: pages with lots of impressions but weak click-through.
  for (const p of [...d.byPage].filter((r) => r.impressions >= 200 && r.ctr < 0.02).sort((a, b) => b.impressions - a.impressions).slice(0, 3)) {
    out.push({ kind: 'page_ctr', title: `Improve CTR on ${shortPage(p.key)}`, detail: `${Math.round(p.impressions)} impressions at ${(p.ctr * 100).toFixed(1)}% CTR — rewrite the title/meta description.` });
  }
  return out;
}

export function shortPage(url: string): string {
  try { const u = new URL(url); return u.pathname === '/' ? u.hostname : u.pathname; } catch { return url; }
}
