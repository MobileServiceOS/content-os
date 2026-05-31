// Generation provider contract. The engine is provider-agnostic: swap the mock
// provider for a real LLM provider without touching the uniqueness/quality loop.
import type { GenerationType, GeneratedBlock, GenerationRequest } from '../../types/generation';
import type { ReviewSentiment } from './pools/reviewResponses';
import type { SocialIntent } from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export interface ProviderRequest {
  type: GenerationType;
  req: GenerationRequest;
  sentiment?: ReviewSentiment; // for review responses
  intent?: SocialIntent; // for social replies
}

export interface GenerationProvider {
  readonly name: string;
  generateBlock(
    pr: ProviderRequest,
    brand: BrandSettings,
    avoidStructureIds: string[],
  ): GeneratedBlock;
}

export class NotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

export type { GenerationType, GeneratedBlock, GenerationRequest };
