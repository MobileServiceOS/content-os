// Home cockpit logic (pure). Wave 1 of the execution plan: the owner's first
// surface = money + the single prioritized "do these 3 today" feed + alerts,
// fused from every connected source (MSOS revenue, TikTok, Search Console,
// owner reviews). Consolidates what used to be split across the Owner Executive
// dashboard and Viral Intelligence into ONE ranked list. Deterministic +
// unit-tested; empty/disconnected inputs yield honest empty results, never mock.
import type { JobRecord } from './types';
import type { SocialData, SocialVocab } from './social/types';
import type { SeoData } from './seoIntel';
import type { ReviewAnalysis } from './reviewIntel';
import { ownerSummary, type OwnerSummary } from './ownerExecutive';
import { contentGaps, serviceIntelligence, rankServices } from './viralIntel';
import { topKeywords } from './seoIntel';
import { money } from './msosWidgets';

export type MoveSource = 'content' | 'reviews' | 'seo' | 'revenue';
export type Impact = 'high' | 'med' | 'low';

export interface CockpitMove {
  text: string;          // the action, imperative
  why: string;           // grounded reason, from the data
  impact: Impact;
  dollars: number | null; // quantified opportunity when estimable (drives ranking + display)
  to: string;            // in-app deep link
  source: MoveSource;
}

export type AlertTone = 'bad' | 'warn' | 'opportunity';
export interface CockpitAlert { text: string; tone: AlertTone; to?: string; }

export interface CockpitInput {
  jobs: JobRecord[];
  social: SocialData | null;
  sc: SeoData | null;
  reviews: ReviewAnalysis | null;
  vocab: SocialVocab;
  now: number;
}

const IMPACT_RANK: Record<Impact, number> = { high: 3, med: 2, low: 1 };
const lc = (s: string): string => s.toLowerCase();

/** All candidate moves from every source, before ranking. */
function candidates(input: CockpitInput, sum: OwnerSummary): CockpitMove[] {
  const { jobs, social, sc, reviews, vocab } = input;
  const out: CockpitMove[] = [];
  const topService = rankServices(serviceIntelligence(social, jobs, vocab), 'revenue')[0]?.service
    ?? vocab.services[0] ?? 'mobile service';

  // 1. Content gaps — revenue cities with zero content (the biggest lever).
  const gaps = contentGaps(social, jobs, vocab);
  for (const c of gaps.citiesNoContent.slice(0, 3)) {
    out.push({
      text: `Post a ${c.city} ${lc(topService)} video`,
      why: `${money(c.revenue)} of revenue from ${c.city} and zero content there.`,
      impact: c.revenue >= 1000 ? 'high' : 'med',
      dollars: c.revenue, to: '/director', source: 'content',
    });
  }

  // 2. Service conversion opportunity — high revenue, under-posted service.
  const svc = rankServices(serviceIntelligence(social, jobs, vocab), 'conversionOpportunity')[0];
  if (svc && svc.conversionOpportunity > 0 && svc.revenue > 0) {
    out.push({
      text: `Make ${lc(svc.service)} content`,
      why: `${money(svc.revenue)} revenue but under-posted (conversion opportunity ${svc.conversionOpportunity}/10).`,
      impact: svc.conversionOpportunity >= 3 ? 'high' : 'med',
      dollars: svc.revenue, to: '/director', source: 'content',
    });
  }

  // 3. Reviews — turn the loudest signal into an action.
  if (reviews && reviews.count > 0) {
    if (reviews.complaints[0]) {
      out.push({
        text: `Address the "${reviews.complaints[0].label}" complaints`,
        why: `Mentioned ${reviews.complaints[0].count}× in your reviews — respond publicly and fix the cause.`,
        impact: 'med', dollars: null, to: '/director', source: 'reviews',
      });
    } else if (reviews.praise[0]) {
      out.push({
        text: `Turn "${reviews.praise[0].label}" praise into a post`,
        why: `Your most common praise (${reviews.praise[0].count}×) — proof content converts.`,
        impact: 'med', dollars: null, to: '/director', source: 'reviews',
      });
    }
  }

  // 4. SEO — a high-demand keyword you don't rank for yet (off page 1).
  if (sc) {
    const offPage1 = topKeywords(sc, 50)
      .filter((r) => r.position > 10 && r.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions)[0];
    if (offPage1) {
      out.push({
        text: `Publish a page for "${offPage1.key}"`,
        why: `${offPage1.impressions.toLocaleString()} searches but you rank #${Math.round(offPage1.position)} — page 2, little traffic.`,
        impact: offPage1.impressions >= 500 ? 'high' : 'med', dollars: null, to: '/director', source: 'seo',
      });
    }
  }

  // 5. Revenue momentum — if down, the move is to defend the best driver.
  if (sum.growthPct != null && sum.growthPct < -0.05 && sum.bestCity) {
    out.push({
      text: `Double down on ${sum.bestCity}`,
      why: `Revenue is down ${Math.round(Math.abs(sum.growthPct) * 100)}% vs last month — protect your top market.`,
      impact: 'high', dollars: null, to: '/director', source: 'revenue',
    });
  }

  return out;
}

/** The single prioritized "do these 3 today", ranked by impact then $, spanning sources. */
export function cockpitMoves(input: CockpitInput, limit = 3): CockpitMove[] {
  const sum = ownerSummary(input.jobs, input.now);
  const ranked = candidates(input, sum).sort((a, b) =>
    IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact] || (b.dollars ?? 0) - (a.dollars ?? 0));

  // Greedy pick with soft source diversity: at most 2 from one source until we
  // have to fall back, so the list isn't 3 near-identical content moves.
  const picked: CockpitMove[] = [];
  const perSource = new Map<MoveSource, number>();
  for (const m of ranked) {
    if (picked.length >= limit) break;
    if ((perSource.get(m.source) ?? 0) >= 2) continue;
    picked.push(m);
    perSource.set(m.source, (perSource.get(m.source) ?? 0) + 1);
  }
  if (picked.length < limit) {
    for (const m of ranked) {
      if (picked.length >= limit) break;
      if (!picked.includes(m)) picked.push(m);
    }
  }
  return picked;
}

/** Proactive alerts — drops to fix and opportunities to grab. Prioritized. */
export function cockpitAlerts(input: CockpitInput): CockpitAlert[] {
  const { jobs, social, sc, reviews, now } = input;
  const sum = ownerSummary(jobs, now);
  const out: CockpitAlert[] = [];

  if (sum.growthPct != null && sum.growthPct < -0.05) {
    out.push({ text: `Revenue down ${Math.round(Math.abs(sum.growthPct) * 100)}% vs last month.`, tone: 'bad', to: '/director' });
  }
  if (reviews && reviews.complaints[0]) {
    out.push({ text: `${reviews.complaints[0].count} recurring complaint(s) about "${reviews.complaints[0].label}".`, tone: 'warn', to: '/director' });
  }
  const gaps = contentGaps(social, jobs, input.vocab);
  if (gaps.citiesNoContent.length > 0) {
    const top = gaps.citiesNoContent.slice(0, 2).map((c) => c.city).join(', ');
    out.push({ text: `${gaps.citiesNoContent.length} revenue cit${gaps.citiesNoContent.length === 1 ? 'y has' : 'ies have'} zero content (${top}).`, tone: 'opportunity', to: '/director' });
  }
  if (!social && jobs.length > 0) {
    out.push({ text: 'Connect TikTok to unlock content scoring + viral intelligence.', tone: 'opportunity', to: '/director' });
  }
  if (!sc && jobs.length > 0) {
    out.push({ text: 'Connect Search Console to see what customers search for.', tone: 'opportunity', to: '/director' });
  }

  const order: Record<AlertTone, number> = { bad: 0, warn: 1, opportunity: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 4);
}
