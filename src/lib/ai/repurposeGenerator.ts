// Repurpose generator: turn one source idea into a full content set — 5 hooks,
// 3 captions, a short + long script, a YouTube title/description, a blog topic,
// and a social post.
import { generateBlock as engineGenerate } from './engine';
import { mockProvider } from './provider.mock';
import { substitute } from './tokens';
import { generateScript } from './scriptGenerator';
import { toRecord, type GeneratedRecord } from './shared';
import type { GenerationProvider } from './types';
import type {
  GenerationRequest,
  RepurposeRequest,
  RepurposeResult,
  RecentByType,
  Platform,
} from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export interface RepurposeOutput {
  result: RepurposeResult;
  records: GeneratedRecord[];
}

function seedFrom(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

export function repurposeContent(
  req: RepurposeRequest,
  brand: BrandSettings,
  recent: RecentByType,
  provider: GenerationProvider = mockProvider,
): RepurposeOutput {
  const platform: Platform = req.platform ?? 'youtube_shorts';
  const genReq: GenerationRequest = { platform, notes: req.source };
  const rot = seedFrom(req.source);
  const records: GeneratedRecord[] = [];

  // 5 distinct hooks.
  const hooks: string[] = [];
  const hookSeen = [...(recent.hook ?? [])];
  for (let i = 0; i < 5; i++) {
    const er = engineGenerate(provider, { type: 'hook', req: genReq }, brand, hookSeen);
    hooks.push(er.block.text);
    hookSeen.push(er.block.text);
    records.push(toRecord('repurpose', er));
  }

  // 3 distinct captions.
  const captions: string[] = [];
  const capSeen = [...(recent.caption ?? [])];
  for (let i = 0; i < 3; i++) {
    const er = engineGenerate(provider, { type: 'caption', req: genReq }, brand, capSeen);
    captions.push(er.block.text);
    capSeen.push(er.block.text);
    records.push(toRecord('repurpose', er));
  }

  // Short + long scripts via the script generator (reuse + records).
  const shortS = generateScript(
    { topic: req.source, platform, tone: 'friendly', lengthSeconds: 15, format: 'talking_head' },
    brand,
    recent,
    provider,
  );
  const longS = generateScript(
    { topic: req.source, platform, tone: 'friendly', lengthSeconds: 60, format: 'voiceover' },
    brand,
    recent,
    provider,
  );
  records.push(...shortS.records, ...longS.records);

  const area = brand.serviceAreas?.[0] ?? 'your area';
  const service = brand.services?.[0] ?? 'mobile tire service';

  const result: RepurposeResult = {
    hooks,
    captions,
    shortScript: shortS.result.script,
    longScript: longS.result.script,
    youtubeTitle: `${service} in ${area}: How It Actually Works`,
    youtubeDescription: substitute(
      `Here’s exactly what happens when you call for a {service} in {area} — {benefit}, no tow truck. {cta}`,
      genReq,
      brand,
      rot,
    ),
    blogTopic: `What to do (and what not to do) when you get a flat in ${area}`,
    socialPost: substitute('Flat tire? Don’t call a tow first. Here’s why → {cta}', genReq, brand, rot),
  };

  return { result, records };
}
