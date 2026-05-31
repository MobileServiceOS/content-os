// Firestore document models + enums for Content OS.

export type Role = 'owner' | 'manager' | 'viewer';
export type ContentStatus = 'draft' | 'approved' | 'scheduled' | 'posted';

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
  /** Per-business uniqueness engine tuning. Falls back to DEFAULT_UNIQUENESS. */
  uniqueness?: UniquenessConfig;
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
  similarityScore: number; // max similarity vs recent at accept time
  regenerationCount: number; // attempts before this output was accepted
  // createdAt (from Audit) is the timestamp.
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  businessIds: string[];
}
