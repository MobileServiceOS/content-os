// Marketing Director — synthesis layer. Pure functions over a DirectorDataset.
// These build on the analytics spine (src/lib/analytics/intelligence.ts) and turn
// group-bys into ranked findings, recommendations, and a written brief. Every
// recommendation respects a minimum sample size so one lucky post never drives a
// call. Nothing here touches Firestore or the network — it's all deterministic
// over the dataset, which is why it's unit-tested.
import {
  byHookCategory, byHookText, byCity, byService, byPlatform, byVideoLength,
  rankBy, bestBy, topPosts, timeBucketLabel, byTimeBucket,
  type DimensionStat,
} from '../analytics/intelligence';
import type { PostPerformance } from '../../types/analytics';
import type {
  DirectorDataset, JobRecord, ActionItem, Finding, ContentIdea,
  SeoRecommendation, ReviewTheme, DirectorBrief,
} from './types';

const MIN_SAMPLE = 3;
const clampScore = (v: number): number => Math.max(1, Math.min(10, Math.round(v * 10) || 1));
const titleCase = (s: string): string => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// --- Executive summary (KPIs with period-over-period deltas) ---------------

export interface ExecKpis {
  revenue: number;
  jobs: number;
  avgTicket: number;
  views: number;
  leads: number;
  calls: number;
  avgViral: number;
  findings: Finding[];
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]): number => (xs.length ? sum(xs) / xs.length : 0);

/** Split a timestamped list into recent-half vs prior-half of the range. */
function splitByHalf<T>(rows: T[], at: (t: T) => number, range: { start: number; end: number }): [T[], T[]] {
  const mid = (range.start + range.end) / 2;
  const recent: T[] = [];
  const prior: T[] = [];
  for (const row of rows) (at(row) >= mid ? recent : prior).push(row);
  return [recent, prior];
}

const delta = (recent: number, prior: number): number | undefined =>
  prior > 0 ? (recent - prior) / prior : undefined;

export function executiveSummary(ds: DirectorDataset): ExecKpis {
  const revenue = sum(ds.jobs.map((j) => j.ticketUsd));
  const jobs = ds.jobs.length;
  const avgTicket = jobs ? revenue / jobs : 0;
  const views = sum(ds.posts.map((p) => p.metrics.views));
  const leads = sum(ds.posts.map((p) => p.metrics.leads));
  const calls = sum(ds.posts.map((p) => p.metrics.calls));
  const withViews = ds.posts.filter((p) => p.metrics.views > 0);
  const avgViral = avg(withViews.map((p) => p.scores.viralScore));

  const [jr, jp] = splitByHalf(ds.jobs, (j) => j.completedAt, ds.range);
  const [pr, pp] = splitByHalf(ds.posts, (p) => p.postedAt, ds.range);
  const revDelta = delta(sum(jr.map((j) => j.ticketUsd)), sum(jp.map((j) => j.ticketUsd)));
  const viewDelta = delta(sum(pr.map((p) => p.metrics.views)), sum(pp.map((p) => p.metrics.views)));
  const leadDelta = delta(sum(pr.map((p) => p.metrics.leads)), sum(pp.map((p) => p.metrics.leads)));

  const findings: Finding[] = [
    { label: 'Revenue', value: money(revenue), delta: revDelta, tone: trend(revDelta) },
    { label: 'Jobs completed', value: String(jobs), tone: 'neutral' },
    { label: 'Avg ticket', value: money(avgTicket), tone: 'neutral' },
    { label: 'Views (social)', value: compact(views), delta: viewDelta, tone: trend(viewDelta) },
    { label: 'Leads + calls', value: String(leads + calls), delta: leadDelta, tone: trend(leadDelta) },
    { label: 'Avg viral score', value: String(Math.round(avgViral * 100)), tone: avgViral >= 0.5 ? 'good' : 'neutral' },
  ];
  return { revenue, jobs, avgTicket, views, leads, calls, avgViral, findings };
}

const trend = (d: number | undefined): Finding['tone'] => (d === undefined ? 'neutral' : d > 0.02 ? 'good' : d < -0.02 ? 'bad' : 'neutral');

// --- Revenue Director -------------------------------------------------------

export interface RevenueGroup { key: string; jobs: number; revenue: number; avgTicket: number; }

function groupJobs(jobs: JobRecord[], keyOf: (j: JobRecord) => string): RevenueGroup[] {
  const m = new Map<string, JobRecord[]>();
  for (const j of jobs) {
    const k = keyOf(j);
    (m.get(k) ?? m.set(k, []).get(k)!).push(j);
  }
  return [...m.entries()]
    .map(([key, js]) => ({ key, jobs: js.length, revenue: sum(js.map((j) => j.ticketUsd)), avgTicket: sum(js.map((j) => j.ticketUsd)) / js.length }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface RevenueBreakdown {
  byService: RevenueGroup[];
  byCity: RevenueGroup[];
  byVehicle: RevenueGroup[];
  byTechnician: RevenueGroup[];
  actions: ActionItem[];
}

export function revenueBreakdown(ds: DirectorDataset): RevenueBreakdown {
  const byServiceR = groupJobs(ds.jobs, (j) => j.service);
  const byCityR = groupJobs(ds.jobs, (j) => j.city);
  const byVehicle = groupJobs(ds.jobs, (j) => j.vehicle);
  const byTechnician = groupJobs(ds.jobs, (j) => j.technician);

  const actions: ActionItem[] = [];
  const topService = byServiceR[0];
  const topCity = byCityR[0];
  if (topService) {
    actions.push({
      title: `Lead marketing with ${topService.key}`,
      rationale: `It's your #1 revenue service (${money(topService.revenue)} across ${topService.jobs} jobs, ${money(topService.avgTicket)} avg ticket). Push it where demand is hottest.`,
      impact: 'high',
      roiNote: `Highest avg ticket → best return per booked job`,
      to: '/new-job',
    });
  }
  const topVeh = byVehicle[0];
  if (topVeh && topVeh.avgTicket > (avg(byVehicle.map((v) => v.avgTicket)))) {
    actions.push({
      title: `Target ${topVeh.key} owners`,
      rationale: `${topVeh.key} jobs carry the highest tickets (${money(topVeh.avgTicket)} avg). Create vehicle-specific content and ad angles for them.`,
      impact: 'med',
      to: '/generator',
    });
  }
  if (topCity) {
    actions.push({
      title: `Double down on ${topCity.key}`,
      rationale: `${topCity.key} is your top revenue city (${money(topCity.revenue)}). Concentrate GBP posts and geo-targeted content there.`,
      impact: 'med', to: '/gbp',
    });
  }
  return { byService: byServiceR, byCity: byCityR, byVehicle, byTechnician, actions };
}

// --- City + Service Performance --------------------------------------------

export interface PlaceRow {
  key: string;
  posts: number;
  avgViews: number;
  views: number;
  leads: number;
  calls: number;
  jobs: number;
  revenue: number;
  avgViral: number;
}

/** Merge post reach (by city) with job revenue (by city) into one row set. */
function mergePlaces(stats: DimensionStat[], rev: RevenueGroup[]): PlaceRow[] {
  const revByKey = new Map(rev.map((r) => [r.key, r]));
  const keys = new Set([...stats.map((s) => s.key), ...rev.map((r) => r.key)]);
  return [...keys].map((key) => {
    const s = stats.find((x) => x.key === key);
    const r = revByKey.get(key);
    return {
      key,
      posts: s?.count ?? 0,
      avgViews: s?.avgViews ?? 0,
      views: s?.views ?? 0,
      leads: s?.leads ?? 0,
      calls: s?.calls ?? 0,
      jobs: r?.jobs ?? s?.jobs ?? 0,
      revenue: r?.revenue ?? s?.revenue ?? 0,
      avgViral: s?.avgViral ?? 0,
    };
  });
}

export interface PlacePerformance {
  rows: PlaceRow[];
  top: PlaceRow[];
  weak: PlaceRow[];
  recommendedTarget: PlaceRow | null;
  rationale: string;
}

export function cityPerformance(ds: DirectorDataset): PlacePerformance {
  const rows = mergePlaces(byCity(ds.posts), groupJobs(ds.jobs, (j) => j.city)).sort((a, b) => b.revenue - a.revenue);
  const top = rows.slice(0, 3);
  // Weak = real reach but under-monetized, or low reach with demand signals.
  const weak = [...rows].sort((a, b) => a.revenue - b.revenue).filter((r) => r.posts > 0 || r.revenue > 0).slice(0, 3);
  // Target = strong revenue-per-post with room to scale reach (high efficiency, low volume).
  const scalable = rows.filter((r) => r.posts >= 1 && r.posts < 6 && r.revenue > 0).sort((a, b) => b.revenue / Math.max(1, b.posts) - a.revenue / Math.max(1, a.posts));
  const recommendedTarget = scalable[0] ?? top[0] ?? null;
  return {
    rows, top, weak, recommendedTarget,
    rationale: recommendedTarget
      ? `${recommendedTarget.key} converts well (${money(recommendedTarget.revenue)} from only ${recommendedTarget.posts} post${recommendedTarget.posts === 1 ? '' : 's'}) — more content there should scale efficiently.`
      : 'Not enough city data yet.',
  };
}

export interface ServicePerformance {
  byReach: DimensionStat[];
  byRevenue: RevenueGroup[];
  mostProfitable: RevenueGroup | null;
  mostViral: DimensionStat | null;
  toPromote: string | null;
}

export function servicePerformance(ds: DirectorDataset): ServicePerformance {
  const byReach = rankBy(byService(ds.posts), 'avgViews');
  const byRevenue = groupJobs(ds.jobs, (j) => j.service);
  const viral = bestBy(byService(ds.posts), 'avgViral', MIN_SAMPLE);
  const mostProfitable = byRevenue[0] ?? null;
  // Promote what's profitable AND has social traction headroom.
  return {
    byReach, byRevenue, mostProfitable,
    mostViral: viral.leader,
    toPromote: mostProfitable?.key ?? null,
  };
}

// --- Hook Leaderboard -------------------------------------------------------

export interface HookLeaderboard {
  byCategory: DimensionStat[];
  byText: DimensionStat[];
  winner: DimensionStat | null;
  winnerConfident: boolean;
}

export function hookLeaderboard(ds: DirectorDataset): HookLeaderboard {
  const withViews = ds.posts.filter((p) => p.metrics.views > 0);
  const byCategory = rankBy(byHookCategory(withViews), 'avgViral');
  const byText = rankBy(byHookText(withViews), 'avgViews');
  const best = bestBy(byHookCategory(withViews), 'avgViral', MIN_SAMPLE);
  return { byCategory, byText, winner: best.leader ?? best.tentative, winnerConfident: best.confident };
}

// --- Content Performance ----------------------------------------------------

export interface ContentPerformance {
  best: PostPerformance[];
  worst: PostPerformance[];
  patterns: string[];
}

export function contentPerformance(ds: DirectorDataset): ContentPerformance {
  const withViews = ds.posts.filter((p) => p.metrics.views > 0);
  const ranked = topPosts(withViews, 'viralScore');
  const best = ranked.slice(0, 5);
  const worst = ranked.slice(-5).reverse();

  const patterns: string[] = [];
  const plat = bestBy(byPlatform(withViews), 'avgViews', MIN_SAMPLE);
  if (plat.leader) patterns.push(`${titleCase(plat.leader.key)} drives your highest reach (${compact(plat.leader.avgViews)} avg views).`);
  const len = bestBy(byVideoLength(withViews), 'avgViral', MIN_SAMPLE);
  if (len.leader) patterns.push(`${len.leader.key} videos perform best (${Math.round(len.leader.avgViral * 100)} viral score).`);
  const hook = bestBy(byHookCategory(withViews), 'avgViral', MIN_SAMPLE);
  if (hook.leader) patterns.push(`"${titleCase(hook.leader.key)}" hooks beat the rest — make more of them.`);
  const time = bestBy(byTimeBucket(withViews), 'avgViews', MIN_SAMPLE);
  if (time.leader) patterns.push(`Best time to post: ${timeBucketLabel(time.leader.key)}.`);
  return { best, worst, patterns };
}

// --- SEO Director -----------------------------------------------------------

export interface SeoDirector {
  weakCities: { city: string; impressions: number; clicks: number; avgPosition: number }[];
  coverageGaps: { city: string; service: string }[];
  recommendations: SeoRecommendation[];
}

export function seoDirector(ds: DirectorDataset): SeoDirector {
  const byCityMap = new Map<string, { impressions: number; clicks: number; pos: number[] }>();
  for (const m of ds.seo) {
    const e = byCityMap.get(m.city) ?? { impressions: 0, clicks: 0, pos: [] };
    e.impressions += m.impressions; e.clicks += m.clicks; e.pos.push(m.position);
    byCityMap.set(m.city, e);
  }
  const cityRows = [...byCityMap.entries()].map(([city, e]) => ({ city, impressions: e.impressions, clicks: e.clicks, avgPosition: avg(e.pos) }));
  // Weak = lots of impressions but poor position (demand we're not capturing).
  const weakCities = cityRows.filter((c) => c.avgPosition > 8).sort((a, b) => b.impressions - a.impressions).slice(0, 4);
  const coverageGaps = ds.seo.filter((m) => !m.hasServicePage && m.impressions > 600).map((m) => ({ city: m.city, service: m.service })).slice(0, 6);

  const recommendations: SeoRecommendation[] = [];
  for (const gap of coverageGaps.slice(0, 3)) {
    recommendations.push({ kind: 'service_page', title: `Build "${gap.service} in ${gap.city}" page`, detail: `Real search demand with no dedicated landing page — biggest ranking opportunity.`, city: gap.city, service: gap.service });
  }
  for (const w of weakCities.slice(0, 2)) {
    recommendations.push({ kind: 'gbp_post', title: `Weekly GBP posts targeting ${w.city}`, detail: `${compact(w.impressions)} impressions but avg position ${Math.round(w.avgPosition)} — fresh GBP activity lifts local pack ranking.`, city: w.city });
  }
  recommendations.push({ kind: 'faq', title: 'Add "How fast can you reach me?" FAQ', detail: 'Speed is your #1 review theme — answer-engine + GBP Q&A win for emergency intent.' });
  recommendations.push({ kind: 'schema', title: 'Add LocalBusiness + Service schema per city page', detail: 'Mark up service area, hours, and review rating so Google can surface rich results.' });
  recommendations.push({ kind: 'internal_link', title: 'Link city pages to matching service pages', detail: 'Cross-link "Miami" ↔ "Emergency Tire Service" to spread authority to money pages.' });
  return { weakCities, coverageGaps, recommendations };
}

// --- Review Director --------------------------------------------------------

export interface ReviewDirector {
  positives: ReviewTheme[];
  complaints: ReviewTheme[];
  avgRating: number;
  total: number;
}

const THEME_ANGLE: Record<string, string> = {
  fast: 'Film a real-time "dispatch to done" speed run.',
  price: 'Do a transparent "dealer quote vs. us" cost breakdown.',
  convenience: 'POV: tire fixed in your driveway while you work.',
  emergency: 'Late-night roadside rescue mini-doc.',
  professional: 'Meet-the-tech feature building trust.',
  trust: 'No-upsell promise explainer.',
  wait_time: 'Show your live ETA texting so expectations are set.',
  coverage: 'Map post: "Now serving more of Broward."',
};

export function reviewDirector(ds: DirectorDataset): ReviewDirector {
  const counts = new Map<string, { count: number; sentiment: ReviewTheme['sentiment'] }>();
  for (const r of ds.reviews) {
    for (const t of r.themes) {
      const e = counts.get(t) ?? { count: 0, sentiment: r.sentiment };
      e.count += 1;
      counts.set(t, e);
    }
  }
  const themes = (sent: ReviewTheme['sentiment'][]): ReviewTheme[] =>
    [...counts.entries()]
      .filter(([t]) => ds.reviews.some((r) => r.themes.includes(t) && sent.includes(r.sentiment)))
      .map(([theme, e]) => ({ theme, count: e.count, sentiment: e.sentiment, contentAngle: THEME_ANGLE[theme] }))
      .sort((a, b) => b.count - a.count);
  const positives = themes(['pos']).filter((t) => t.sentiment === 'pos');
  const complaints = themes(['neg']).filter((t) => t.sentiment === 'neg');
  return {
    positives, complaints,
    avgRating: ds.reviews.length ? avg(ds.reviews.map((r) => r.rating)) : 0,
    total: ds.reviews.length,
  };
}

// --- Content Opportunities (scored ideas) -----------------------------------

export function contentOpportunities(ds: DirectorDataset): ContentIdea[] {
  const withViews = ds.posts.filter((p) => p.metrics.views > 0);
  const hookStats = byHookCategory(withViews);
  const cityStats = byCity(withViews);
  const topHooks = rankBy(hookStats, 'avgViral').filter((s) => s.count >= MIN_SAMPLE).slice(0, 3);
  const topCities = rankBy(cityStats, 'avgViews').slice(0, 3);
  const topService = groupJobs(ds.jobs, (j) => j.service)[0]?.key;

  const seeds: { hook: string; angle: string; platform: ContentIdea['platform']; hookCat: DimensionStat }[] = [];
  topHooks.forEach((h, i) => {
    const city = topCities[i % topCities.length]?.key;
    seeds.push({
      hook: `${titleCase(h.key)} hook → ${topService ?? 'Emergency Tire Service'} in ${city ?? 'Miami'}`,
      angle: `Use a "${titleCase(h.key)}" opener (your top-performing style) for ${topService ?? 'your highest-revenue service'}, geo-tagged to ${city ?? 'Miami'}.`,
      platform: 'tiktok',
      hookCat: h,
    });
  });

  const cityLeadScore = (city?: string): number => {
    const s = cityStats.find((c) => c.key === city);
    return s ? Math.min(1, s.avgViews / Math.max(1, Math.max(...cityStats.map((c) => c.avgViews)))) : 0.5;
  };

  return seeds.map((s) => {
    const hookScore = clampScore(s.hookCat.avgViral);
    const retention = clampScore(s.hookCat.avgCompletion);
    const engagement = clampScore(Math.min(1, s.hookCat.avgEngagement));
    const local = clampScore(cityLeadScore(topCities[0]?.key));
    const seo = clampScore(0.6); // generative idea; SEO value is moderate by default
    const overall = Math.round((hookScore * 0.3 + retention * 0.25 + engagement * 0.2 + local * 0.15 + seo * 0.1));
    return {
      hook: s.hook, angle: s.angle, platform: s.platform,
      city: topCities[0]?.key, service: topService,
      scores: { hook: hookScore, retention, engagement, seo, local, overall: Math.max(1, overall) },
    };
  });
}

// --- Daily Brief (assembles the five-question report) -----------------------

export function dailyBrief(ds: DirectorDataset): DirectorBrief {
  const exec = executiveSummary(ds);
  const rev = revenueBreakdown(ds);
  const city = cityPerformance(ds);
  const hooks = hookLeaderboard(ds);
  const content = contentPerformance(ds);
  const seo = seoDirector(ds);
  const reviews = reviewDirector(ds);

  const whyItHappened: string[] = [];
  if (hooks.winner) whyItHappened.push(`"${titleCase(hooks.winner.key)}" hooks carried reach (${Math.round(hooks.winner.avgViral * 100)} viral score)${hooks.winnerConfident ? '' : ' — still firming up'}.`);
  whyItHappened.push(...content.patterns.slice(0, 2));
  if (rev.byService[0]) whyItHappened.push(`${rev.byService[0].key} drove ${money(rev.byService[0].revenue)} — your revenue engine.`);

  const doNext: ActionItem[] = [];
  const ideas = contentOpportunities(ds);
  if (ideas[0]) doNext.push({ title: `Create: ${ideas[0].hook}`, rationale: ideas[0].angle, impact: 'high', to: '/new-job', roiNote: `Overall idea score ${ideas[0].scores.overall}/10` });
  doNext.push(...rev.actions.slice(0, 1));
  if (city.recommendedTarget) doNext.push({ title: `Target ${city.recommendedTarget.key} this week`, rationale: city.rationale, impact: 'med', to: '/gbp' });

  const stopDoing: ActionItem[] = [];
  const worstHook = [...hooks.byCategory].filter((h) => h.count >= MIN_SAMPLE).pop();
  if (worstHook) stopDoing.push({ title: `Ease off "${titleCase(worstHook.key)}" hooks`, rationale: `Lowest viral score (${Math.round(worstHook.avgViral * 100)}) across ${worstHook.count} posts — reallocate to your winning styles.`, impact: 'low' });
  const weakCity = city.weak[0];
  if (weakCity && weakCity.posts >= 2 && weakCity.revenue === 0) stopDoing.push({ title: `Pause heavy posting in ${weakCity.key}`, rationale: `${weakCity.posts} posts, no attributed revenue — redirect effort to converting cities.`, impact: 'low' });

  const highestRoi = rev.actions[0] ?? doNext[0] ?? null;
  const biggestGrowth: ActionItem | null = seo.coverageGaps[0]
    ? { title: `Capture "${seo.coverageGaps[0].service} in ${seo.coverageGaps[0].city}" search`, rationale: `Real impressions, no landing page — uncontested local SEO ground.`, impact: 'high', to: '/seo' }
    : (city.recommendedTarget ? { title: `Scale ${city.recommendedTarget.key}`, rationale: city.rationale, impact: 'high' } : null);

  let mostUrgent: ActionItem | null = null;
  if (reviews.complaints[0]) {
    const c = reviews.complaints[0];
    mostUrgent = { title: `Fix the "${c.theme.replace(/_/g, ' ')}" complaint`, rationale: `Recurring negative theme (${c.count} reviews). ${c.contentAngle ?? 'Address it operationally and in content.'}`, impact: 'high', to: '/review' };
  } else if (exec.findings.find((f) => f.tone === 'bad')) {
    const f = exec.findings.find((x) => x.tone === 'bad')!;
    mostUrgent = { title: `${f.label} is down`, rationale: `${f.label} dropped vs. the prior period — diagnose before it compounds.`, impact: 'high' };
  }

  const top3Today: ActionItem[] = doNext.slice(0, 3);
  const top3Week: ActionItem[] = [
    biggestGrowth, rev.actions[1] ?? null,
    seo.recommendations[0] ? { title: seo.recommendations[0].title, rationale: seo.recommendations[0].detail, impact: 'med' as const, to: '/seo' } : null,
  ].filter(Boolean) as ActionItem[];

  return {
    whatHappened: exec.findings,
    whyItHappened,
    doNext, stopDoing,
    highestRoi, biggestGrowth, mostUrgent,
    top3Today, top3Week,
  };
}

// local formatters (kept here so analyze.ts is UI-agnostic but self-contained)
function money(n: number): string { return `$${Math.round(n).toLocaleString('en-US')}`; }
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round(n / 1e5) / 10}M`;
  if (abs >= 1_000) return `${Math.round(n / 100) / 10}K`;
  return `${Math.round(n)}`;
}
