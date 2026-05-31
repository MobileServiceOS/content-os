// Request/result contracts for the Level 3 kinds.
import type { SeoContentType, TaskCategory, TaskPriority } from '../../../types/level3';
import type { QualityScore } from '../../../types/generation';
import type { GenerationCost } from '../cost';
import type { LeadIntent } from './pools';

/** Standard Level 3 generator output: result + quality + cost. */
export interface L3Output<T> {
  result: T;
  quality: QualityScore;
  cost: GenerationCost;
}

export type { LeadIntent } from './pools';

export interface LeadRequest {
  intent: LeadIntent;
  service?: string;
  city?: string;
  notes?: string;
}
export interface LeadResult {
  messages: string[]; // 3 distinct follow-ups
}

export interface MissedCallRequest {
  city?: string;
  service?: string;
}
export interface MissedCallResult {
  text: string; // immediate missed-call text
  followUp: string;
  callbackReminder: string;
}

export interface ReviewTemplateRequest {
  service?: string;
  city?: string;
}
export interface ReviewTemplateResult {
  request: string; // review request template
  followUp: string; // review follow-up template
}

export interface TaskGenRequest {
  focus?: TaskCategory | 'all';
  city?: string;
}
export interface GeneratedTask {
  category: TaskCategory;
  title: string;
  detail: string;
  priority: TaskPriority;
}
export interface TaskGenResult {
  tasks: GeneratedTask[];
}

export interface GbpRequest {
  service: string;
  city: string;
  vehicle?: string;
  tireSize?: string;
  completionTime?: string;
  responseTime?: string;
  notes?: string;
  assetId?: string;
}

export interface GbpResult {
  description: string; // compliant: no CTA
  websiteUrl: string;
  reviewUrl: string;
  hashtags: string[];
}

export interface SeoRequest {
  type: SeoContentType;
  service?: string;
  city?: string;
}

export interface SeoResult {
  title: string;
  body: string;
  entities: string[];
  questions: string[];
}

export interface PhotoRequest {
  subject: string;
  service?: string;
  city?: string;
}

export interface PhotoResult {
  filename: string;
  altText: string;
  description: string;
  category: string;
}
