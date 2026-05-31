// High-level provider layer. A ContentProvider is what the app + agents call;
// it owns the full pipeline (provider source -> uniqueness engine -> BrandGuardian
// -> output) and reports cost. Swapping providers requires no generator changes.
//
// NOTE: this is distinct from the low-level GenerationProvider in ../types.ts,
// which is the per-block text source the engine's regenerate loop consumes.
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
import type { GenerationCost, ProviderName } from '../cost';

export interface ProviderOutput<T> {
  result: T;
  records: GeneratedRecord[];
  cost: GenerationCost;
}

export interface ContentProvider {
  readonly name: ProviderName;
  generateContent(req: GenerationRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<GenerationResult>>;
  generateScript(req: ScriptRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<ScriptResult>>;
  generateReviewResponse(req: ReviewRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<ReviewResult>>;
  generateSocialReply(req: SocialRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<SocialResult>>;
  repurposeContent(req: RepurposeRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<RepurposeResult>>;
}
