// Transport to the `generate` Cloud Function. Abstracted behind GenerateTransport
// so providers can be unit-tested without Firebase. Firebase is lazy-imported
// inside the default transport so importing this module never initializes it.
import type { BrandSettings } from '../../types/models';
import type { GenerationType } from '../../types/generation';

export type GenKind = 'content' | 'script' | 'review' | 'social' | 'repurpose';

export interface GenerateArgs {
  businessId: string;
  kind: GenKind;
  payload: Record<string, unknown>;
  brand: BrandLite;
  avoid?: string[];
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateResponse {
  result: unknown;
  usage: Usage;
}

export type GenerateTransport = (args: GenerateArgs) => Promise<GenerateResponse>;

/** The brand subset sent to the function for prompting. */
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

export function toBrandLite(brand: BrandSettings): BrandLite {
  return {
    businessName: brand.businessName,
    website: brand.website,
    phone: brand.phone,
    serviceAreas: brand.serviceAreas,
    services: brand.services,
    notOffered: brand.notOffered,
    socialHandles: brand.socialHandles,
    ctas: brand.ctas,
    localKeywords: brand.localKeywords,
    bannedPhrases: brand.bannedPhrases,
    requiredPhrases: brand.requiredPhrases,
    brandTone: brand.brandTone,
    bannedOpenings: brand.uniqueness?.bannedOpenings ?? [],
  };
}

/** Default transport: calls the deployed `generate` callable. Firebase is
 * imported lazily so test code that injects a mock transport never loads it. */
export const callGenerate: GenerateTransport = async (args) => {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<GenerateArgs, GenerateResponse>(functions, 'generate');
  const res = await fn(args);
  return res.data;
};

/** Map a client GenerationType bucket to the function kind (for `avoid` lookup). */
export const RECENT_KEY_FOR: Record<GenKind, GenerationType> = {
  content: 'caption',
  script: 'script',
  review: 'review',
  social: 'reply',
  repurpose: 'caption',
};
