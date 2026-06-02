// Marketing Director — domain types. The Director is a synthesis layer over the
// analytics spine (PostPerformance) plus a few business-data slices (jobs,
// reviews, SEO). Phase 1 fills these from a sample source; Phase 2 fills them
// from live adapters (MSOS Jobs, GBP, Search Console, GA4, TikTok/IG/FB/YT) —
// see ./sources. The synthesis outputs (DirectorBrief, ContentIdea, …) are
// computed, never stored.
import type { PostPerformance, PostPlatform } from '../../types/analytics';

// --- data slices -----------------------------------------------------------

/** One completed job — the revenue spine. Phase 2: from MSOS Jobs (read-only). */
export interface JobRecord {
  id: string;
  service: string;
  city: string;
  vehicle: string;
  technician: string;
  ticketUsd: number;
  completedAt: number; // epoch ms
}

/** A customer review distilled for theme analysis. Phase 2: from GBP. */
export interface ReviewSignal {
  id: string;
  rating: number; // 1..5
  city: string;
  service: string;
  text: string;
  themes: string[]; // e.g. ['fast', 'price', 'professional']
  sentiment: 'pos' | 'neg' | 'neutral';
  at: number; // epoch ms
}

/** A local-SEO surface: one city×service query. Phase 2: from Search Console. */
export interface SeoMetric {
  city: string;
  service: string;
  impressions: number;
  clicks: number;
  position: number; // avg search position (lower is better)
  hasServicePage: boolean; // do we have a landing page for this city×service?
}

/** Which data sources are feeding the Director, and their state. */
export type SourceId =
  | 'sample'
  | 'msos_jobs'
  | 'gbp'
  | 'search_console'
  | 'ga4'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube';

export interface SourceStatus {
  id: SourceId;
  label: string;
  state: 'sample' | 'disconnected' | 'connected' | 'error';
  lastSync?: number;
}

/**
 * The full dataset the Director analyzes. Phase 1: produced wholly by the
 * sample source. Phase 2: each source contributes a Partial<DirectorDataset>
 * slice and mergeDataset() combines them — analyzers never change.
 */
export interface DirectorDataset {
  posts: PostPerformance[];
  jobs: JobRecord[];
  reviews: ReviewSignal[];
  seo: SeoMetric[];
  range: { start: number; end: number };
  sources: SourceStatus[];
}

// --- synthesis outputs (computed, never persisted) -------------------------

export type Impact = 'high' | 'med' | 'low';

export interface ActionItem {
  title: string;
  rationale: string; // why this, grounded in the data
  impact: Impact;
  roiNote?: string; // expected payoff, when estimable
  to?: string; // optional in-app deep link (e.g. '/new-job')
}

export interface Finding {
  label: string;
  value: string;
  delta?: number; // signed change vs prior period, when known (fraction, e.g. 0.12)
  tone: 'good' | 'bad' | 'neutral';
}

/** A recommended content idea, scored 1–10 on each axis (spec's CONTENT SCORING). */
export interface ContentIdea {
  hook: string;
  angle: string;
  platform: PostPlatform;
  city?: string;
  service?: string;
  scores: {
    hook: number;
    retention: number;
    engagement: number;
    seo: number;
    local: number;
    overall: number;
  };
}

/** A local-SEO recommendation surfaced by the SEO Director. */
export interface SeoRecommendation {
  kind: 'gbp_post' | 'service_page' | 'faq' | 'schema' | 'internal_link';
  title: string;
  detail: string;
  city?: string;
  service?: string;
}

/** A distilled review theme with frequency + sentiment. */
export interface ReviewTheme {
  theme: string;
  count: number;
  sentiment: 'pos' | 'neg' | 'neutral';
  contentAngle?: string; // how to turn this theme into content
}

/**
 * The written daily/period report. Every analysis answers the five questions:
 * what happened / why / what next / what to stop / highest ROI.
 */
export interface DirectorBrief {
  whatHappened: Finding[];
  whyItHappened: string[];
  doNext: ActionItem[];
  stopDoing: ActionItem[];
  highestRoi: ActionItem | null;
  biggestGrowth: ActionItem | null;
  mostUrgent: ActionItem | null;
  top3Today: ActionItem[];
  top3Week: ActionItem[];
}
