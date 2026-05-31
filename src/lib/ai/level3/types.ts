// Request/result contracts for the Level 3 kinds.
import type { SeoContentType } from '../../../types/level3';

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
