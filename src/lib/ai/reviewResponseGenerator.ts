// Review Response generator: three distinct responses (short / professional /
// SEO-friendly), sentiment from the star rating. Never opens with a banned phrase
// (enforced by the engine) and never automatically admits fault.
import { generateBlock as engineGenerate } from './engine';
import { mockProvider } from './provider.mock';
import { toRecord, type GeneratedRecord } from './shared';
import type { GenerationProvider } from './types';
import type { ReviewSentiment } from './pools/reviewResponses';
import type {
  GenerationRequest,
  ReviewRequest,
  ReviewResult,
  RecentByType,
} from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export interface ReviewOutput {
  result: ReviewResult;
  records: GeneratedRecord[];
}

function sentimentFor(rating: number): ReviewSentiment {
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : text).trim();
}

export function generateReviewResponse(
  req: ReviewRequest,
  brand: BrandSettings,
  recent: RecentByType,
  provider: GenerationProvider = mockProvider,
): ReviewOutput {
  const sentiment = sentimentFor(req.rating);
  const genReq: GenerationRequest = {
    platform: 'facebook',
    service: req.service,
    city: req.city,
    tone: req.tone,
  };
  const recents = recent.review ?? [];

  const a = engineGenerate(provider, { type: 'review', req: genReq, sentiment }, brand, recents);
  const b = engineGenerate(provider, { type: 'review', req: genReq, sentiment }, brand, [
    ...recents,
    a.block.text,
  ]);
  const c = engineGenerate(provider, { type: 'review', req: genReq, sentiment }, brand, [
    ...recents,
    a.block.text,
    b.block.text,
  ]);

  const area = brand.serviceAreas?.[0] ?? '';
  const service = req.service ?? brand.services?.[0] ?? 'mobile tire service';
  const seoFriendly = area
    ? `${c.block.text} If you ever need ${service.toLowerCase()} around ${area}, we’re a call away.`
    : c.block.text;

  const result: ReviewResult = {
    short: firstSentence(a.block.text),
    professional: b.block.text,
    seoFriendly,
  };

  return { result, records: [toRecord('review', a), toRecord('review', b), toRecord('review', c)] };
}
