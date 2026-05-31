// Script Writer: a hook (via the engine) plus a beat-by-beat script, shot list,
// on-screen text, and CTA filled from a length-appropriate skeleton.
import { generateBlock as engineGenerate } from './engine';
import { substitute } from './tokens';
import { scoreOutput } from '../quality/score';
import { maxSimilarity } from '../uniqueness/similarity';
import { pickSkeleton } from './pools/scripts';
import { toRecord, type GeneratedRecord } from './shared';
import type { GenerationProvider } from './types';
import type {
  GenerationRequest,
  ScriptRequest,
  ScriptResult,
} from '../../types/generation';
import type { BrandSettings, GenerationType } from '../../types/models';
import type { RecentByType } from '../../types/generation';

export interface ScriptOutput {
  result: ScriptResult;
  records: GeneratedRecord[];
}

function toGenReq(req: ScriptRequest): GenerationRequest {
  return { platform: req.platform, tone: req.tone, notes: req.topic };
}

/** Stable rotation seed from the topic so repeated topics still vary a bit. */
function seedFrom(topic: string): number {
  let h = 0;
  for (const c of topic) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

export function generateScript(
  req: ScriptRequest,
  brand: BrandSettings,
  recent: RecentByType,
  provider: GenerationProvider,
): ScriptOutput {
  const skeleton = pickSkeleton(req.lengthSeconds);
  const genReq = toGenReq(req);
  const hookER = engineGenerate(provider, { type: 'hook', req: genReq }, brand, recent.hook ?? []);
  const rot = seedFrom(req.topic);

  const fill = (t: string): string =>
    substitute(t.replace(/\{hook\}/g, hookER.block.text), genReq, brand, rot);

  const script = skeleton.beats.map(fill).join('\n');
  const onScreenText = skeleton.onScreen.map(fill);
  const cta = substitute('{cta}', genReq, brand, rot);

  const result: ScriptResult = {
    hook: hookER.block.text,
    script,
    shotList: skeleton.shots,
    onScreenText,
    cta,
  };

  // Record the hook + the script body for uniqueness tracking.
  const scriptType: GenerationType = 'script';
  const bodyQuality = scoreOutput(script, recent.script ?? [], brand);
  const bodyRecord: GeneratedRecord = {
    type: scriptType,
    generatorType: 'script',
    structureId: skeleton.id,
    category: `${req.format}-${skeleton.lengthSeconds}s`,
    text: script,
    uniquenessScore: bodyQuality.uniqueness,
    brandScore: bodyQuality.brandAlignment,
    similarityScore: maxSimilarity(script, recent.script ?? []),
    regenerationCount: 0,
  };

  return { result, records: [toRecord('script', hookER), bodyRecord] };
}
