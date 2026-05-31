// Firestore document models + enums for Content OS.

export type Role = 'owner' | 'manager' | 'viewer';
export type ContentStatus = 'draft' | 'approved' | 'scheduled' | 'posted';
/** Approval workflow state (Level 3). Separate from ContentStatus. */
export type ApprovalState = 'none' | 'pending_approval' | 'approved' | 'rejected';

/** Audit fields stamped on every tenant-scoped document. */
export interface Audit {
  businessId: string;
  createdBy: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export interface Business extends Audit {
  id: string;
  name: string;
  ownerId: string;
}

export interface Member {
  userId: string;
  role: Role;
  displayName: string;
  email: string;
  createdAt: number;
}

export interface UniquenessConfig {
  similarityThreshold: number;
  maxRegenerationAttempts: number;
  bannedOpenings: string[];
}

export interface BrandSettings {
  businessName: string;
  website: string;
  phone: string;
  serviceAreas: string[];
  services: string[];
  notOffered: string[];
  socialHandles: string[];
  ctas: string[];
  localKeywords: string[];
  bannedPhrases: string[];
  requiredPhrases: string[];
  brandTone: string;
  /** Review URL for GBP review links (Level 3). Kept separate from website. */
  reviewUrl?: string;
  /** Per-business uniqueness engine tuning. Falls back to DEFAULT_UNIQUENESS. */
  uniqueness?: UniquenessConfig;
  /** Which generation provider this business uses. Defaults to 'mock'. */
  provider?: 'mock' | 'claude' | 'openai' | 'gemini';
  /** Which image provider this business uses. Defaults to 'mock'. */
  imageProvider?: 'mock' | 'openai';
}

export interface ContentItem extends Audit {
  id: string;
  title: string;
  content: string;
  platform: string;
  city: string;
  service: string;
  status: ContentStatus;
  tags: string[];
  notes: string;
  archived?: boolean;
  /** Master Content Asset this item was distributed from (Level 3). */
  assetId?: string;
  /** Approval workflow state (Level 3). */
  approvalState?: ApprovalState;
}

export interface CalendarItem extends Audit {
  id: string;
  contentItemId: string | null;
  title: string;
  scheduledAt: number; // epoch ms
  status: ContentStatus;
}

export interface ReviewResponseDoc extends Audit {
  id: string;
  reviewText: string;
  rating: number;
  city: string;
  service: string;
  response: string;
  style: 'short' | 'professional' | 'seo';
}

export interface SocialReplyDoc extends Audit {
  id: string;
  platform: string;
  message: string;
  intent: string;
  reply: string;
}

export type GenerationType = 'hook' | 'caption' | 'cta' | 'script' | 'review' | 'reply';

export interface GenerationHistoryEntry extends Audit {
  id: string;
  type: GenerationType;
  generatorType: string; // 'content' | 'script' | 'review' | 'social' | 'repurpose'
  hookCategory?: string;
  contentCategory?: string;
  structureId: string;
  fingerprint: string;
  text: string;
  uniquenessScore: number;
  brandScore: number;
  readabilityScore: number;
  engagementScore: number;
  localRelevanceScore: number;
  similarityScore: number; // max similarity vs recent at accept time
  regenerationCount: number; // attempts before this output was accepted
  // createdAt (from Audit) is the timestamp.
}

export interface MediaItem extends Audit {
  id: string;
  kind: 'image' | 'thumbnail' | 'video';
  prompt: string;
  url: string; // Storage download URL (or inline data URL for the mock)
  alt: string;
  width: number;
  height: number;
  provider: string;
  status: ContentStatus;
  tags: string[];
  sourceContentId?: string;
  // Photo optimization fields (Level 3).
  filename?: string;
  altText?: string;
  category?: string;
}

export interface GenerationCostEntry extends Audit {
  id: string;
  generatorType: string; // 'content' | 'script' | 'review' | 'social' | 'repurpose'
  provider: string; // 'mock' | 'claude' | 'openai' | 'gemini'
  tokens: number;
  estimatedCostUsd: number;
  generationTimeMs: number;
  regenerationCount: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  businessIds: string[];
}
