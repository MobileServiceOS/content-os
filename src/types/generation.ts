// Generation request/result contracts shared by the AI engine, generators, and UI.
import type { GenerationType } from './models';

export type Platform =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube_shorts'
  | 'x'
  | 'linkedin';

export type ContentType =
  | 'caption'
  | 'hook'
  | 'voiceover'
  | 'talking_head'
  | 'story'
  | 'educational'
  | 'promotional';

export type Tone = 'friendly' | 'professional' | 'direct' | 'educational' | 'humorous';

export type { GenerationType };

export interface GenerationRequest {
  businessType?: string;
  service?: string;
  city?: string;
  vehicle?: string;
  tireSize?: string;
  timeOfDay?: string;
  responseTime?: string;
  completionTime?: string;
  notes?: string;
  platform: Platform;
  contentType?: ContentType;
  tone?: Tone;
}

export interface GeneratedBlock {
  type: GenerationType;
  structureId: string;
  text: string;
  /** Pool category the structure came from (e.g. hook category, caption framework). */
  category?: string;
}

export interface QualityScore {
  uniqueness: number; // 0..1
  readability: number; // 0..1
  brandAlignment: number; // 0..1
  engagement: number; // 0..1
  localRelevance: number; // 0..1
  overall: number; // 0..1
}

/** Hook categories (HOOK VARIATION SYSTEM). */
export type HookCategory =
  | 'curiosity'
  | 'shock'
  | 'mistake'
  | 'myth'
  | 'emergency'
  | 'customer_story'
  | 'convenience'
  | 'time_savings'
  | 'cost_savings'
  | 'educational';

/** Caption frameworks (CAPTION VARIATION SYSTEM). */
export type CaptionFramework =
  | 'problem_solution'
  | 'storytelling'
  | 'timeline'
  | 'customer_perspective'
  | 'educational'
  | 'comparison'
  | 'before_after'
  | 'emergency'
  | 'myth_busting'
  | 'convenience';

/** Per-business uniqueness engine configuration. */
export interface UniquenessConfig {
  similarityThreshold: number; // 0..1 — regenerate when candidate >= this vs recent
  maxRegenerationAttempts: number; // attempts before accepting best candidate
  bannedOpenings: string[]; // extra per-business banned opener phrases
  recentWindow?: number; // fast gate: compare against the last N outputs (default 100)
  deepWindow?: number; // deep scan: compare against the last N outputs (default 500)
}

export const DEFAULT_UNIQUENESS: UniquenessConfig = {
  similarityThreshold: 0.6,
  maxRegenerationAttempts: 5,
  bannedOpenings: [],
  recentWindow: 100,
  deepWindow: 500,
};

export interface GenerationResult {
  hook?: GeneratedBlock;
  caption?: GeneratedBlock;
  cta?: GeneratedBlock;
  onScreenText?: string[];
  hashtags?: string[];
  localKeywords?: string[];
  blocks: GeneratedBlock[]; // every block produced, for history recording
  quality: QualityScore;
}

/** Recent fingerprints per generation type, used to avoid repetition. */
export type RecentByType = Record<GenerationType, string[]>;

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube_shorts: 'YouTube Shorts',
  x: 'X',
  linkedin: 'LinkedIn',
};

export const TONE_LABELS: Record<Tone, string> = {
  friendly: 'Friendly',
  professional: 'Professional',
  direct: 'Direct',
  educational: 'Educational',
  humorous: 'Humorous',
};

// --- Per-generator request/result contracts (shared by agents + Stage B generators) ---

export type ScriptFormat = 'talking_head' | 'voiceover';

export interface ScriptRequest {
  topic: string;
  platform: Platform;
  tone: Tone;
  lengthSeconds: number; // 15 | 30 | 60 | custom
  format: ScriptFormat;
}

export interface ScriptResult {
  hook: string;
  script: string;
  shotList: string[];
  onScreenText: string[];
  cta: string;
}

export interface ReviewRequest {
  reviewText: string;
  rating: number; // 1..5
  city?: string;
  service?: string;
  tone: Tone;
}

export interface ReviewResult {
  short: string;
  professional: string;
  seoFriendly: string;
}

export type SocialIntent =
  | 'question'
  | 'pricing'
  | 'booking'
  | 'complaint'
  | 'thank_you'
  | 'general';

export interface SocialRequest {
  platform: Platform;
  message: string;
  tone: Tone;
  intent: SocialIntent;
}

export interface SocialResult {
  replies: string[]; // 3 distinct replies
}

export interface RepurposeRequest {
  source: string;
  platform?: Platform;
}

export interface RepurposeResult {
  hooks: string[]; // 5
  captions: string[]; // 3
  shortScript: string;
  longScript: string;
  youtubeTitle: string;
  youtubeDescription: string;
  blogTopic: string;
  socialPost: string;
}
