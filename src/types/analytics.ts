// Post-publication performance contracts. This is the analytics spine: one
// PostPerformance row per published post carries the metrics the owner enters
// (or imports) plus the "dimensions" copied at publish time, so every analytics
// view (dashboard, hook analytics, leaderboard, intelligence) is a single
// group-by over this collection with no joins.
import type { Audit } from './models';
import type { HookCategory, CaptionFramework } from './generation';

/** Platforms a post can live on. Superset of generation Platform (adds GBP). */
export type PostPlatform =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube_shorts'
  | 'gbp';

export const POST_PLATFORM_LABELS: Record<PostPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  facebook: 'Facebook Reels',
  youtube_shorts: 'YouTube Shorts',
  gbp: 'Google Business Profile',
};

/** Where a performance row's numbers came from. */
export type MetricsSource = 'manual' | 'csv' | 'api';

/** Latest cumulative metrics for a post. All counts, revenue in USD. */
export interface PostMetrics {
  views: number;
  watchTimeSec: number;
  avgViewDurationSec: number;
  completionRate: number; // 0..1
  shares: number;
  saves: number;
  comments: number;
  profileVisits: number;
  websiteClicks: number;
  calls: number;
  directionRequests: number;
  leads: number;
  jobs: number;
  revenueUsd: number;
}

/** Zeroed metrics — the baseline an import/manual entry patches onto. */
export const EMPTY_METRICS: PostMetrics = {
  views: 0,
  watchTimeSec: 0,
  avgViewDurationSec: 0,
  completionRate: 0,
  shares: 0,
  saves: 0,
  comments: 0,
  profileVisits: 0,
  websiteClicks: 0,
  calls: 0,
  directionRequests: 0,
  leads: 0,
  jobs: 0,
  revenueUsd: 0,
};

/** Actual (metrics-derived) scores, plus retained text scores. All 0..1. */
export interface PostScores {
  viralScore: number;
  engagementScore: number;
  hookScore: number;
  seoScore: number;
  gbpScore: number;
  localRelevanceScore: number;
  leadGenScore: number;
}

export const EMPTY_SCORES: PostScores = {
  viralScore: 0,
  engagementScore: 0,
  hookScore: 0,
  seoScore: 0,
  gbpScore: 0,
  localRelevanceScore: 0,
  leadGenScore: 0,
};

/**
 * One row per published post per platform. Dimensions are copied at publish
 * time and treated as immutable; metrics/scores are updated as new numbers
 * come in. Lives at businesses/{businessId}/postPerformance/{id}.
 */
export interface PostPerformance extends Audit {
  id: string;
  contentItemId: string | null; // source content item (nullable for ad-hoc imports)
  assetId?: string; // MasterContentAsset link when published from NewJob
  platform: PostPlatform;
  externalPostId?: string; // platform's own id, for CSV dedupe
  postUrl?: string;
  postedAt: number; // epoch ms
  timeBucket: string; // e.g. 'wed-evening' — derived from postedAt (best-time analysis)

  // --- denormalized dimensions (copied at publish; immutable thereafter) ---
  hookText?: string;
  hookCategory?: HookCategory;
  captionFramework?: CaptionFramework;
  service?: string;
  vehicle?: string;
  tireSize?: string;
  city?: string;
  hashtags?: string[];
  videoLengthSec?: number;

  // --- metrics + scores ---
  metrics: PostMetrics;
  scores: PostScores;
  predictedViralScore?: number; // from virality_predictor MCP, if available

  source: MetricsSource;
  lastMetricsAt?: number;
}

/** Append-only daily metric snapshot (time series). Optional per post. */
export interface PerformanceSnapshot {
  date: string; // 'yyyy-mm-dd'
  metrics: PostMetrics;
  createdAt: number;
}

/** The dimension fields that must not change once a perf row exists. */
export const PERFORMANCE_DIMENSIONS = [
  'platform',
  'hookCategory',
  'captionFramework',
  'service',
  'vehicle',
  'tireSize',
  'city',
  'videoLengthSec',
] as const;

/**
 * Learning Engine output: multiplicative weights (>1 favors, <1 suppresses)
 * for hook categories and caption frameworks, derived from top performers.
 * Consumed by the generators; a no-op when learning is disabled.
 */
export interface GenerationBias {
  hookCategoryWeights: Partial<Record<HookCategory, number>>;
  captionFrameworkWeights: Partial<Record<CaptionFramework, number>>;
}

export const NO_BIAS: GenerationBias = {
  hookCategoryWeights: {},
  captionFrameworkWeights: {},
};

/**
 * Derive the time bucket ('mon-morning' .. 'sun-night') from an epoch ms.
 * Used to surface the best time of day/week to post.
 */
export function timeBucket(epochMs: number): string {
  const d = new Date(epochMs);
  const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
  const h = d.getHours();
  const part = h < 6 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  return `${day}-${part}`;
}
