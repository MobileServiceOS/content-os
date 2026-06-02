// Deterministic sample dataset for the Marketing Director (Phase 1). No live
// data exists yet, so this stands in for what the Phase-2 sources will provide.
// It is seeded (stable across runs/machines) and intentionally shaped so the
// synthesis layer has a real story to tell: some hooks, cities, and services
// clearly out-perform others. Anchored to a fixed "now" so the 30-day window
// never drifts empty and tests stay reproducible.
import { computeScores } from '../analytics/scores';
import { timeBucket, EMPTY_METRICS } from '../../types/analytics';
import type { PostPerformance, PostMetrics, PostPlatform } from '../../types/analytics';
import type { HookCategory, CaptionFramework } from '../../types/generation';
import type { DirectorDataset, JobRecord, ReviewSignal, SeoMetric, SourceStatus } from './types';

/** Fixed anchor — the sample reports "as of" this instant. */
export const SAMPLE_NOW = Date.UTC(2026, 5, 2, 16, 0, 0); // 2026-06-02
const DAY = 86_400_000;

// --- seeded RNG (mulberry32) — deterministic, no Math.random ---------------
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length) % xs.length];
const between = (r: () => number, lo: number, hi: number): number => Math.round(lo + r() * (hi - lo));

// --- domain vocab (Wheel Rush) ---------------------------------------------
export const CITIES = [
  'Miami', 'Hollywood', 'Aventura', 'Miramar', 'Pembroke Pines', 'Davie',
  'Sunrise', 'Fort Lauderdale', 'Miami Beach', 'North Miami', 'Hialeah', 'Kendall',
];
export const SERVICES = [
  'Mobile Tire Repair', 'Mobile Tire Replacement', 'Emergency Tire Service',
  'Roadside Tire Service', 'Battery Jump Starts', 'Wheel Lock Removal',
  'Spare Tire Installation', 'Tire Mounting', 'Tire Balancing',
];
const VEHICLES = ['Sedan', 'SUV', 'Pickup Truck', 'Luxury (BMW/Mercedes)', 'Van', 'Tesla'];
const TECHS = ['Marcus', 'Andre', 'Luis', 'Devon'];
const PLATFORMS: PostPlatform[] = ['tiktok', 'instagram', 'facebook', 'youtube_shorts', 'gbp'];
const HOOKS: HookCategory[] = [
  'curiosity', 'shock', 'mistake', 'myth', 'emergency',
  'customer_story', 'convenience', 'time_savings', 'cost_savings', 'educational',
];
const FRAMEWORKS: CaptionFramework[] = [
  'problem_solution', 'storytelling', 'timeline', 'customer_perspective', 'educational',
  'comparison', 'before_after', 'emergency', 'myth_busting', 'convenience',
];

// Hook text by category — so the Hook Leaderboard shows real lines, not enums.
const HOOK_TEXT: Record<HookCategory, string[]> = {
  emergency: ['Stuck on I-95 with a blowout? Watch this.', 'Flat tire at 2am — here’s who actually shows up.'],
  customer_story: ['She thought she’d miss her flight. We got her to MIA in 25 minutes.', 'This Tesla owner almost paid $900 at the dealer.'],
  shock: ['The dealer quoted him $1,200. We did it for a third.', 'Most "spare" tires are already dead. Here’s why.'],
  cost_savings: ['Stop overpaying for tire shops. Here’s the math.', 'How much a tow truck costs you vs. us coming to you.'],
  curiosity: ['The one thing tire shops never tell you about your sidewall.', 'Why your TPMS light is lying to you.'],
  mistake: ['The $40 mistake that ruins brand-new tires.', 'Never do THIS after getting a flat.'],
  myth: ['"You can’t patch a run-flat" — actually, you can.', 'Plugging a tire is NOT always safe. Here’s when.'],
  convenience: ['We come to your driveway. You never leave the couch.', 'Tire service while you’re at work in Brickell.'],
  time_savings: ['New tire mounted in your office parking lot in 20 minutes.', 'Skip the 3-hour shop wait. We come to you.'],
  educational: ['How to read the date code on your tire.', 'PSI in Miami heat: what you’re getting wrong.'],
};

// Performance skew: which dimension values out-perform (story for the Director).
const HOOK_LIFT: Partial<Record<HookCategory, number>> = { emergency: 1.7, customer_story: 1.5, shock: 1.35, cost_savings: 1.2, educational: 0.7, myth: 0.75 };
const CITY_LIFT: Partial<Record<string, number>> = { Miami: 1.5, Hialeah: 1.35, Kendall: 1.3, 'Miami Beach': 1.25, Davie: 0.6, Sunrise: 0.65, Miramar: 0.7 };
const SERVICE_REV: Partial<Record<string, number>> = { 'Emergency Tire Service': 1.8, 'Mobile Tire Replacement': 1.6, 'Roadside Tire Service': 1.3, 'Tire Balancing': 0.6, 'Spare Tire Installation': 0.7 };
const PLATFORM_REACH: Record<PostPlatform, number> = { tiktok: 1.5, instagram: 1.1, youtube_shorts: 0.9, facebook: 0.7, gbp: 0.5 };

function buildPost(i: number, r: () => number): PostPerformance {
  const platform = PLATFORMS[i % PLATFORMS.length];
  const hookCategory = pick(r, HOOKS);
  const captionFramework = pick(r, FRAMEWORKS);
  const city = pick(r, CITIES);
  const service = pick(r, SERVICES);
  const vehicle = pick(r, VEHICLES);
  const videoLengthSec = platform === 'gbp' ? undefined : pick(r, [12, 18, 24, 30, 45, 60]);
  const postedAt = SAMPLE_NOW - between(r, 0, 29) * DAY - between(r, 0, 23) * 3_600_000;

  const lift = (HOOK_LIFT[hookCategory] ?? 1) * (CITY_LIFT[city] ?? 1) * PLATFORM_REACH[platform];
  const baseViews = between(r, 1800, 14000);
  const views = Math.round(baseViews * lift);
  const completionRate = Math.min(0.95, 0.32 + r() * 0.4 + (HOOK_LIFT[hookCategory] ? 0.12 : 0));
  const shares = Math.round(views * (0.005 + r() * 0.03) * (HOOK_LIFT[hookCategory] ?? 1));
  const saves = Math.round(shares * (0.5 + r()));
  const comments = Math.round(views * (0.002 + r() * 0.01));
  const calls = Math.round(views * (0.001 + r() * 0.004) * (city in CITY_LIFT ? (CITY_LIFT[city] as number) : 1));
  const leads = Math.round(calls * (0.5 + r()));
  const jobs = Math.round(leads * (0.3 + r() * 0.4));
  const ticket = 140 + (SERVICE_REV[service] ?? 1) * between(r, 40, 260);
  const revenueUsd = Math.round(jobs * ticket);

  const metrics: PostMetrics = {
    ...EMPTY_METRICS,
    views,
    watchTimeSec: Math.round(views * (videoLengthSec ?? 20) * completionRate),
    avgViewDurationSec: Math.round((videoLengthSec ?? 20) * completionRate),
    completionRate,
    shares, saves, comments,
    profileVisits: Math.round(views * 0.02),
    websiteClicks: Math.round(views * 0.01),
    calls, directionRequests: Math.round(calls * 0.6), leads, jobs, revenueUsd,
  };

  const { calibrating, ...scores } = computeScores({ metrics, baselineViews: 9000, videoLengthSec });
  void calibrating;

  return {
    id: `sample-post-${i}`,
    businessId: 'sample', createdBy: 'sample', createdAt: postedAt, updatedAt: postedAt,
    contentItemId: null,
    platform,
    postedAt,
    timeBucket: timeBucket(postedAt),
    hookText: pick(r, HOOK_TEXT[hookCategory]),
    hookCategory,
    captionFramework,
    service, vehicle, city,
    videoLengthSec,
    hashtags: ['#wheelrush', `#${city.toLowerCase().replace(/\s+/g, '')}`, '#mobiletire', '#flattire'],
    metrics, scores,
    source: 'manual',
    lastMetricsAt: postedAt,
  };
}

function buildJob(i: number, r: () => number): JobRecord {
  const service = pick(r, SERVICES);
  const city = pick(r, CITIES);
  const ticket = 140 + (SERVICE_REV[service] ?? 1) * between(r, 40, 280);
  return {
    id: `sample-job-${i}`,
    service, city,
    vehicle: pick(r, VEHICLES),
    technician: pick(r, TECHS),
    ticketUsd: Math.round(ticket),
    completedAt: SAMPLE_NOW - between(r, 0, 29) * DAY,
  };
}

const REVIEW_BANK: { text: string; themes: string[]; sentiment: ReviewSignal['sentiment']; rating: number }[] = [
  { text: 'Showed up in 20 minutes on the highway. Lifesaver.', themes: ['fast', 'emergency', 'professional'], sentiment: 'pos', rating: 5 },
  { text: 'Half the price of the dealer and came to my office.', themes: ['price', 'convenience'], sentiment: 'pos', rating: 5 },
  { text: 'Marcus was professional and explained everything.', themes: ['professional', 'technician', 'trust'], sentiment: 'pos', rating: 5 },
  { text: 'Fast, clean, and honest. Didn’t upsell me.', themes: ['fast', 'trust', 'honest'], sentiment: 'pos', rating: 5 },
  { text: 'Booking was easy and they texted an arrival time.', themes: ['booking', 'communication'], sentiment: 'pos', rating: 5 },
  { text: 'A bit pricey but worth it for coming to me at night.', themes: ['price', 'convenience', 'emergency'], sentiment: 'neutral', rating: 4 },
  { text: 'Took longer than the quoted window to arrive.', themes: ['wait_time', 'communication'], sentiment: 'neg', rating: 3 },
  { text: 'Wish they served further north in Broward.', themes: ['coverage', 'availability'], sentiment: 'neg', rating: 3 },
];

function buildReviews(r: () => number): ReviewSignal[] {
  return Array.from({ length: 26 }, (_, i) => {
    const b = REVIEW_BANK[i % REVIEW_BANK.length];
    return {
      id: `sample-review-${i}`,
      rating: b.rating,
      city: pick(r, CITIES),
      service: pick(r, SERVICES),
      text: b.text,
      themes: b.themes,
      sentiment: b.sentiment,
      at: SAMPLE_NOW - between(r, 0, 45) * DAY,
    };
  });
}

function buildSeo(r: () => number): SeoMetric[] {
  // A city×service grid for the top cities + key services (Search Console stand-in).
  const cities = CITIES.slice(0, 8);
  const services = ['Mobile Tire Repair', 'Emergency Tire Service', 'Mobile Tire Replacement', 'Roadside Tire Service'];
  const out: SeoMetric[] = [];
  for (const city of cities) {
    for (const service of services) {
      const lift = CITY_LIFT[city] ?? 1;
      const hasServicePage = r() < 0.55 && lift >= 1;
      const impressions = Math.round(between(r, 200, 4000) * lift);
      out.push({
        city, service,
        impressions,
        clicks: Math.round(impressions * (0.01 + r() * 0.06) * (hasServicePage ? 1.6 : 1)),
        position: Math.round((hasServicePage ? 6 : 16) - lift * 3 + r() * 6),
        hasServicePage,
      });
    }
  }
  return out;
}

const SOURCES: SourceStatus[] = [
  { id: 'sample', label: 'Sample data', state: 'sample' },
  { id: 'msos_jobs', label: 'MSOS Jobs', state: 'disconnected' },
  { id: 'gbp', label: 'Google Business Profile', state: 'disconnected' },
  { id: 'search_console', label: 'Search Console', state: 'disconnected' },
  { id: 'ga4', label: 'Google Analytics', state: 'disconnected' },
  { id: 'tiktok', label: 'TikTok', state: 'disconnected' },
  { id: 'instagram', label: 'Instagram', state: 'disconnected' },
  { id: 'facebook', label: 'Facebook', state: 'disconnected' },
  { id: 'youtube', label: 'YouTube', state: 'disconnected' },
];

/** Build the full deterministic sample dataset. */
export function buildSampleDataset(): DirectorDataset {
  const r = rng(20260602);
  const posts = Array.from({ length: 52 }, (_, i) => buildPost(i, r));
  const jobs = Array.from({ length: 84 }, (_, i) => buildJob(i, r));
  return {
    posts,
    jobs,
    reviews: buildReviews(r),
    seo: buildSeo(r),
    range: { start: SAMPLE_NOW - 30 * DAY, end: SAMPLE_NOW },
    sources: SOURCES,
  };
}

/** Memoized singleton — the dataset is pure, so build it once. */
let cached: DirectorDataset | null = null;
export function sampleDataset(): DirectorDataset {
  if (!cached) cached = buildSampleDataset();
  return cached;
}
