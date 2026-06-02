// Pure aggregation over PostPerformance rows. Powers Hook Analytics, the
// Leaderboard, and Performance Intelligence — all are group-bys over one
// collection with sample-size guards so we never recommend off a single post.
import type { PostPerformance } from '../../types/analytics';

export interface DimensionStat {
  key: string; // the dimension value (e.g. hook category, city)
  count: number; // posts in this group
  views: number; // total views
  avgViews: number;
  avgCompletion: number;
  shares: number;
  leads: number;
  calls: number;
  jobs: number;
  revenue: number;
  avgViral: number;
  avgLeadGen: number;
  avgEngagement: number;
}

const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Group rows by a key function (rows with empty/undefined key are dropped). */
export function aggregate(rows: PostPerformance[], keyOf: (r: PostPerformance) => string | undefined): DimensionStat[] {
  const groups = new Map<string, PostPerformance[]>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.entries()].map(([key, rs]) => ({
    key,
    count: rs.length,
    views: sum(rs.map((r) => r.metrics.views)),
    avgViews: avg(rs.map((r) => r.metrics.views)),
    avgCompletion: avg(rs.map((r) => r.metrics.completionRate)),
    shares: sum(rs.map((r) => r.metrics.shares + r.metrics.saves)),
    leads: sum(rs.map((r) => r.metrics.leads)),
    calls: sum(rs.map((r) => r.metrics.calls)),
    jobs: sum(rs.map((r) => r.metrics.jobs)),
    revenue: sum(rs.map((r) => r.metrics.revenueUsd)),
    avgViral: avg(rs.map((r) => r.scores.viralScore)),
    avgLeadGen: avg(rs.map((r) => r.scores.leadGenScore)),
    avgEngagement: avg(rs.map((r) => r.scores.engagementScore)),
  }));
}

export type StatMetric = keyof Pick<DimensionStat, 'avgViews' | 'views' | 'avgCompletion' | 'leads' | 'calls' | 'jobs' | 'revenue' | 'avgViral' | 'avgLeadGen' | 'avgEngagement'>;

/** Rank dimension stats by a metric, descending. */
export function rankBy(stats: DimensionStat[], metric: StatMetric): DimensionStat[] {
  return [...stats].sort((a, b) => b[metric] - a[metric]);
}

/**
 * Best group by a metric, requiring at least `minSample` posts. Returns null
 * (with the would-be leader) when there isn't enough data to trust the call.
 */
export function bestBy(
  stats: DimensionStat[],
  metric: StatMetric,
  minSample = 3,
): { leader: DimensionStat | null; confident: boolean; tentative: DimensionStat | null } {
  const ranked = rankBy(stats, metric);
  const confidentLeader = ranked.find((s) => s.count >= minSample) ?? null;
  return {
    leader: confidentLeader,
    confident: confidentLeader !== null,
    tentative: ranked[0] ?? null,
  };
}

// --- Dimension key extractors ---
export const byHookCategory = (rows: PostPerformance[]) => aggregate(rows, (r) => r.hookCategory);
export const byHookText = (rows: PostPerformance[]) => aggregate(rows, (r) => r.hookText);
export const byCaptionFramework = (rows: PostPerformance[]) => aggregate(rows, (r) => r.captionFramework);
export const byService = (rows: PostPerformance[]) => aggregate(rows, (r) => r.service);
export const byVehicle = (rows: PostPerformance[]) => aggregate(rows, (r) => r.vehicle);
export const byTireSize = (rows: PostPerformance[]) => aggregate(rows, (r) => r.tireSize);
export const byCity = (rows: PostPerformance[]) => aggregate(rows, (r) => r.city);
export const byPlatform = (rows: PostPerformance[]) => aggregate(rows, (r) => r.platform);
export const byTimeBucket = (rows: PostPerformance[]) => aggregate(rows, (r) => r.timeBucket);

/** Bucket video length into bands for "best length" analysis. */
export function videoLengthBucket(sec: number | undefined): string | undefined {
  if (sec === undefined || sec <= 0) return undefined;
  if (sec < 15) return '<15s';
  if (sec <= 30) return '15–30s';
  if (sec <= 60) return '30–60s';
  return '60s+';
}
export const byVideoLength = (rows: PostPerformance[]) => aggregate(rows, (r) => videoLengthBucket(r.videoLengthSec));

/** Explode hashtag arrays and aggregate per tag (a row counts toward each of its tags). */
export function hashtagStats(rows: PostPerformance[]): DimensionStat[] {
  const groups = new Map<string, PostPerformance[]>();
  for (const r of rows) {
    for (const raw of r.hashtags ?? []) {
      const tag = raw.trim().toLowerCase();
      if (!tag) continue;
      const g = groups.get(tag);
      if (g) g.push(r);
      else groups.set(tag, [r]);
    }
  }
  return [...groups.entries()].map(([key, rs]) => aggregate(rs, () => key)[0]).filter(Boolean);
}

/** Individual top posts (not grouped), ranked by a post-level metric. */
export function topPosts(
  rows: PostPerformance[],
  metric: 'views' | 'viralScore' | 'leadGenScore' | 'engagementScore' = 'viralScore',
): PostPerformance[] {
  const val = (r: PostPerformance): number =>
    metric === 'views' ? r.metrics.views : r.scores[metric];
  return [...rows].sort((a, b) => val(b) - val(a));
}

const PART_ORDER = ['morning', 'afternoon', 'evening', 'night'];
const DAY_LABEL: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
/** 'wed-evening' -> 'Wed evening'. */
export function timeBucketLabel(bucket: string): string {
  const [day, part] = bucket.split('-');
  return `${DAY_LABEL[day] ?? day} ${part ?? ''}`.trim();
}
export const partOrder = (bucket: string): number => PART_ORDER.indexOf(bucket.split('-')[1] ?? '');
