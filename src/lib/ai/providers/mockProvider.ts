// Mock content provider (current default). Runs the real uniqueness/quality
// pipeline over the low-level mock text source, and attaches mocked cost.
import type { ContentProvider, ProviderOutput } from './types';
import { generateContent as orchestrateContent } from '../contentGenerators';
import { generateScript as orchestrateScript } from '../scriptGenerator';
import { generateReviewResponse as orchestrateReview } from '../reviewResponseGenerator';
import { generateSocialReplies as orchestrateSocial } from '../socialReplyGenerator';
import { repurposeContent as orchestrateRepurpose } from '../repurposeGenerator';
import { mockProvider as lowLevelMock } from '../provider.mock';
import { estimateCost } from '../cost';
import type {
  GenerationRequest,
  GenerationResult,
  ScriptRequest,
  ScriptResult,
  ReviewRequest,
  ReviewResult,
  SocialRequest,
  SocialResult,
  RepurposeRequest,
  RepurposeResult,
  RecentByType,
} from '../../../types/generation';
import type { BrandSettings } from '../../../types/models';
import type { GeneratedRecord } from '../shared';

const nowMs = (): number => Date.now();

export class MockContentProvider implements ContentProvider {
  readonly name = 'mock' as const;

  private wrap<T>(fn: () => { result: T; records: GeneratedRecord[] }): ProviderOutput<T> {
    const t0 = nowMs();
    const { result, records } = fn();
    const cost = estimateCost('mock', records, nowMs() - t0);
    return { result, records, cost };
  }

  async generateContent(req: GenerationRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<GenerationResult>> {
    return this.wrap(() => orchestrateContent(req, brand, recent, lowLevelMock));
  }

  async generateScript(req: ScriptRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<ScriptResult>> {
    return this.wrap(() => orchestrateScript(req, brand, recent, lowLevelMock));
  }

  async generateReviewResponse(req: ReviewRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<ReviewResult>> {
    return this.wrap(() => orchestrateReview(req, brand, recent, lowLevelMock));
  }

  async generateSocialReply(req: SocialRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<SocialResult>> {
    return this.wrap(() => orchestrateSocial(req, brand, recent, lowLevelMock));
  }

  async repurposeContent(req: RepurposeRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<RepurposeResult>> {
    return this.wrap(() => orchestrateRepurpose(req, brand, recent, lowLevelMock));
  }
}

export const mockContentProvider = new MockContentProvider();
