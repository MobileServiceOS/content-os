// Social Reply generator: three distinct human-sounding replies for the given
// platform + intent + tone.
import { generateBlock as engineGenerate } from './engine';
import { toRecord, type GeneratedRecord } from './shared';
import type { GenerationProvider } from './types';
import type {
  GenerationRequest,
  SocialRequest,
  SocialResult,
  RecentByType,
} from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export interface SocialOutput {
  result: SocialResult;
  records: GeneratedRecord[];
}

export function generateSocialReplies(
  req: SocialRequest,
  brand: BrandSettings,
  recent: RecentByType,
  provider: GenerationProvider,
): SocialOutput {
  const genReq: GenerationRequest = {
    platform: req.platform,
    tone: req.tone,
    notes: req.message,
  };
  const recents = recent.reply ?? [];
  const results = [];
  const seen: string[] = [...recents];
  for (let i = 0; i < 3; i++) {
    const er = engineGenerate(provider, { type: 'reply', req: genReq, intent: req.intent }, brand, seen);
    results.push(er);
    seen.push(er.block.text);
  }

  return {
    result: { replies: results.map((r) => r.block.text) },
    records: results.map((r) => toRecord('social', r)),
  };
}
