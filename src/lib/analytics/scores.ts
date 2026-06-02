// Post-publication (actual) scores derived from metrics. These complement the
// pre-publication text scores in src/lib/quality/score.ts: those predict, these
// measure. Pure + deterministic so they're unit-tested and reproducible.
import type { PostMetrics, PostScores } from '../../types/analytics';

export interface ScoreInputs {
  metrics: PostMetrics;
  /** Trailing median views for this business+platform. 0/undefined => calibrating. */
  baselineViews?: number;
  videoLengthSec?: number;
  /** Retained text scores for SEO/GBP/local content (0..1), when applicable. */
  textScores?: { seo?: number; gbp?: number; local?: number };
}

export interface ScoreResult extends PostScores {
  /** True when there isn't enough history to normalize the viral score. */
  calibrating: boolean;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
/** Saturating rate score: hits 1.0 at `target`. */
const sat = (value: number, target: number): number => (target <= 0 ? 0 : clamp01(value / target));

export function computeScores(input: ScoreInputs): ScoreResult {
  const m = input.metrics;
  const views = m.views > 0 ? m.views : 0;
  const denom = views > 0 ? views : 1;
  const calibrating = !input.baselineViews || input.baselineViews <= 0;

  const engagementRate = (m.shares + m.saves + m.comments) / denom;
  const shareRate = (m.shares + m.saves) / denom;
  const completion = clamp01(m.completionRate);

  // Engagement: 10% (shares+saves+comments)/views is excellent.
  const engagementScore = sat(engagementRate, 0.1);

  // Hook strength: completion + (when we know length) 3-sec-retention proxy.
  const retention = input.videoLengthSec && input.videoLengthSec > 0
    ? clamp01(m.avgViewDurationSec / input.videoLengthSec)
    : undefined;
  const hookScore = retention === undefined ? completion : clamp01(0.6 * completion + 0.4 * retention);

  // Lead-gen: weighted local actions per view (jobs > leads > calls).
  const weightedActions = m.calls * 1 + m.leads * 1.5 + m.jobs * 3 + m.directionRequests * 0.5 + m.websiteClicks * 0.25;
  const leadGenScore = sat(weightedActions / denom, 0.03);

  // Viral: blend reach-vs-baseline (when known), completion, and share rate.
  const shareTerm = sat(shareRate, 0.05);
  const viralScore = calibrating
    ? clamp01(0.5 * completion + 0.5 * shareTerm)
    : clamp01(0.4 * sat(views, (input.baselineViews as number) * 2) + 0.3 * completion + 0.3 * shareTerm);

  return {
    viralScore,
    engagementScore,
    hookScore,
    leadGenScore,
    seoScore: clamp01(input.textScores?.seo ?? 0),
    gbpScore: clamp01(input.textScores?.gbp ?? 0),
    localRelevanceScore: clamp01(input.textScores?.local ?? 0),
    calibrating,
  };
}

/** Trailing median of a metric across rows (used as the viral-score baseline). */
export function median(values: number[]): number {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return 0;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
