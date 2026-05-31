// Content Generator: hook + caption + CTA + on-screen text + hashtags + local
// keywords, each run through the uniqueness/quality engine.
import { generateBlock as engineGenerate } from './engine';
import { toRecord, aggregateQuality, type GeneratedRecord } from './shared';
import type { GenerationProvider } from './types';
import type {
  GenerationRequest,
  GenerationResult,
  RecentByType,
} from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export interface ContentOutput {
  result: GenerationResult;
  records: GeneratedRecord[];
}

function hashtags(req: GenerationRequest, brand: BrandSettings): string[] {
  const city = (req.city ?? brand.serviceAreas?.[0] ?? '').replace(/[^a-z0-9]/gi, '');
  const tags = ['#mobiletire', '#flattire', '#roadsideassistance'];
  if (city) tags.push(`#${city.toLowerCase()}`);
  return tags;
}

export function generateContent(
  req: GenerationRequest,
  brand: BrandSettings,
  recent: RecentByType,
  provider: GenerationProvider,
): ContentOutput {
  const hookER = engineGenerate(provider, { type: 'hook', req }, brand, recent.hook ?? []);
  const capER = engineGenerate(provider, { type: 'caption', req }, brand, recent.caption ?? []);
  const ctaER = engineGenerate(provider, { type: 'cta', req }, brand, recent.cta ?? []);

  const blocks = [hookER.block, capER.block, ctaER.block];
  const result: GenerationResult = {
    hook: hookER.block,
    caption: capER.block,
    cta: ctaER.block,
    onScreenText: [hookER.block.text.slice(0, 40), 'We come to you', ctaER.block.text],
    hashtags: hashtags(req, brand),
    localKeywords: (brand.localKeywords ?? []).slice(0, 3),
    blocks,
    quality: aggregateQuality([hookER, capER, ctaER]),
  };
  const records = [
    toRecord('content', hookER),
    toRecord('content', capER),
    toRecord('content', ctaER),
  ];
  return { result, records };
}
