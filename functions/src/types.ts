// Request shapes for the `generate` callable. Kept independent of the client
// package (separate build), mirroring the client's ContentProvider inputs.
export type GenKind =
  | 'content' | 'script' | 'review' | 'social' | 'repurpose'
  | 'gbp' | 'seo' | 'photo'
  | 'lead' | 'missed_call' | 'review_template' | 'task';
export type LlmProvider = 'claude' | 'openai' | 'gemini';

export interface BrandLite {
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
  bannedOpenings?: string[];
}

export interface GenerateData {
  provider: LlmProvider;
  businessId: string;
  kind: GenKind;
  payload: Record<string, unknown>;
  brand: BrandLite;
  avoid?: string[]; // recent outputs to avoid repeating
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
