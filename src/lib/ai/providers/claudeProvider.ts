// Real Claude provider. Calls the `generate` Cloud Function (which holds the key),
// then runs each candidate through the SAME client-side gate as the mock provider:
// banned-opener rejection + similarity-vs-recent, regenerating up to the per-business
// limit. The uniqueness/quality engine stays the single source of truth.
import type { ContentProvider, ProviderOutput } from './types';
import {
  callGenerate,
  toBrandLite,
  type GenerateTransport,
  type GenKind,
} from '../functionsClient';
import { resolveConfig } from '../engine';
import { costFromTokens } from '../cost';
import { hasBannedOpener } from '../../uniqueness/bannedOpeners';
import { maxSimilarity } from '../../uniqueness/similarity';
import { scoreOutput } from '../../quality/score';
import type { GeneratedRecord } from '../shared';
import type {
  GenerationRequest, GenerationResult, GeneratedBlock,
  ScriptRequest, ScriptResult, ReviewRequest, ReviewResult,
  SocialRequest, SocialResult, RepurposeRequest, RepurposeResult,
  RecentByType, GenerationType, QualityScore,
} from '../../../types/generation';
import type { BrandSettings } from '../../../types/models';

const asStr = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function record(
  type: GenerationType,
  text: string,
  recent: string[],
  brand: BrandSettings,
  regen: number,
): GeneratedRecord {
  const q = scoreOutput(text, recent, brand);
  return {
    type,
    generatorType: 'claude',
    structureId: 'claude',
    text,
    uniquenessScore: q.uniqueness,
    brandScore: q.brandAlignment,
    readabilityScore: q.readability,
    engagementScore: q.engagement,
    localRelevanceScore: q.localRelevance,
    similarityScore: maxSimilarity(text, recent),
    regenerationCount: regen,
  };
}

function avgQuality(scores: QualityScore[]): QualityScore {
  if (!scores.length) return { uniqueness: 0, readability: 0, brandAlignment: 0, engagement: 0, localRelevance: 0, overall: 0 };
  const acc = scores.reduce((a, s) => ({
    uniqueness: a.uniqueness + s.uniqueness, readability: a.readability + s.readability,
    brandAlignment: a.brandAlignment + s.brandAlignment, engagement: a.engagement + s.engagement,
    localRelevance: a.localRelevance + s.localRelevance, overall: a.overall + s.overall,
  }), { uniqueness: 0, readability: 0, brandAlignment: 0, engagement: 0, localRelevance: 0, overall: 0 });
  const n = scores.length;
  return { uniqueness: acc.uniqueness / n, readability: acc.readability / n, brandAlignment: acc.brandAlignment / n, engagement: acc.engagement / n, localRelevance: acc.localRelevance / n, overall: acc.overall / n };
}

export class ClaudeContentProvider implements ContentProvider {
  readonly name = 'claude' as const;

  constructor(private businessId: string, private transport: GenerateTransport = callGenerate) {}

  /** Call the function, gating the `primary` text and regenerating on collision. */
  private async run<T>(
    kind: GenKind,
    payload: Record<string, unknown>,
    brand: BrandSettings,
    gateRecent: string[],
    parse: (json: unknown) => { primary: string; result: T },
  ): Promise<{ result: T; tokens: number; timeMs: number; regen: number }> {
    const cfg = resolveConfig(brand);
    const attempts = Math.max(1, cfg.maxRegenerationAttempts);
    const avoid = [...gateRecent];
    const t0 = Date.now();
    let tokens = 0;
    let last: { primary: string; result: T } | null = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const res = await this.transport({ businessId: this.businessId, kind, payload, brand: toBrandLite(brand), avoid });
      tokens += res.usage.inputTokens + res.usage.outputTokens;
      const parsed = parse(res.result);
      last = parsed;
      const banned = hasBannedOpener(parsed.primary, cfg.bannedOpenings);
      const sim = maxSimilarity(parsed.primary, gateRecent);
      if (!banned && sim < cfg.similarityThreshold) {
        return { result: parsed.result, tokens, timeMs: Date.now() - t0, regen: attempt };
      }
      avoid.push(parsed.primary);
    }
    return { result: last!.result, tokens, timeMs: Date.now() - t0, regen: attempts - 1 };
  }

  async generateContent(req: GenerationRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<GenerationResult>> {
    const { result, tokens, timeMs, regen } = await this.run('content', req as unknown as Record<string, unknown>, brand, recent.caption ?? [], (json) => {
      const o = json as Record<string, unknown>;
      const hook: GeneratedBlock = { type: 'hook', structureId: 'claude', text: asStr(o.hook) };
      const caption: GeneratedBlock = { type: 'caption', structureId: 'claude', text: asStr(o.caption) };
      const cta: GeneratedBlock = { type: 'cta', structureId: 'claude', text: asStr(o.cta) };
      return { primary: caption.text, result: { hook, caption, cta, onScreenText: asArr(o.onScreenText), hashtags: asArr(o.hashtags), localKeywords: asArr(o.localKeywords), blocks: [hook, caption, cta], quality: { uniqueness: 0, readability: 0, brandAlignment: 0, engagement: 0, localRelevance: 0, overall: 0 } } };
    });
    const records = [
      record('hook', result.hook!.text, recent.hook ?? [], brand, regen),
      record('caption', result.caption!.text, recent.caption ?? [], brand, regen),
      record('cta', result.cta!.text, recent.cta ?? [], brand, regen),
    ];
    result.quality = avgQuality(records.map((r) => scoreOutput(r.text, [], brand)));
    return { result, records, cost: costFromTokens('claude', tokens, timeMs, regen) };
  }

  async generateScript(req: ScriptRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<ScriptResult>> {
    const { result, tokens, timeMs, regen } = await this.run('script', req as unknown as Record<string, unknown>, brand, recent.script ?? [], (json) => {
      const o = json as Record<string, unknown>;
      const result: ScriptResult = { hook: asStr(o.hook), script: asStr(o.script), shotList: asArr(o.shotList), onScreenText: asArr(o.onScreenText), cta: asStr(o.cta) };
      return { primary: result.script, result };
    });
    const records = [
      record('hook', result.hook, recent.hook ?? [], brand, regen),
      record('script', result.script, recent.script ?? [], brand, regen),
    ];
    return { result, records, cost: costFromTokens('claude', tokens, timeMs, regen) };
  }

  async generateReviewResponse(req: ReviewRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<ReviewResult>> {
    const { result, tokens, timeMs, regen } = await this.run('review', req as unknown as Record<string, unknown>, brand, recent.review ?? [], (json) => {
      const o = json as Record<string, unknown>;
      const result: ReviewResult = { short: asStr(o.short), professional: asStr(o.professional), seoFriendly: asStr(o.seoFriendly) };
      return { primary: result.professional, result };
    });
    const records = [
      record('review', result.short, recent.review ?? [], brand, regen),
      record('review', result.professional, recent.review ?? [], brand, regen),
      record('review', result.seoFriendly, recent.review ?? [], brand, regen),
    ];
    return { result, records, cost: costFromTokens('claude', tokens, timeMs, regen) };
  }

  async generateSocialReply(req: SocialRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<SocialResult>> {
    const { result, tokens, timeMs, regen } = await this.run('social', req as unknown as Record<string, unknown>, brand, recent.reply ?? [], (json) => {
      const o = json as Record<string, unknown>;
      const replies = asArr(o.replies).slice(0, 3);
      return { primary: replies[0] ?? '', result: { replies } };
    });
    const records = result.replies.map((r) => record('reply', r, recent.reply ?? [], brand, regen));
    return { result, records, cost: costFromTokens('claude', tokens, timeMs, regen) };
  }

  async repurposeContent(req: RepurposeRequest, brand: BrandSettings, recent: RecentByType): Promise<ProviderOutput<RepurposeResult>> {
    const { result, tokens, timeMs, regen } = await this.run('repurpose', req as unknown as Record<string, unknown>, brand, recent.caption ?? [], (json) => {
      const o = json as Record<string, unknown>;
      const result: RepurposeResult = {
        hooks: asArr(o.hooks).slice(0, 5), captions: asArr(o.captions).slice(0, 3),
        shortScript: asStr(o.shortScript), longScript: asStr(o.longScript),
        youtubeTitle: asStr(o.youtubeTitle), youtubeDescription: asStr(o.youtubeDescription),
        blogTopic: asStr(o.blogTopic), socialPost: asStr(o.socialPost),
      };
      return { primary: result.hooks[0] ?? result.shortScript, result };
    });
    const records = [
      ...result.hooks.map((h) => record('hook', h, recent.hook ?? [], brand, regen)),
      ...result.captions.map((c) => record('caption', c, recent.caption ?? [], brand, regen)),
    ];
    return { result, records, cost: costFromTokens('claude', tokens, timeMs, regen) };
  }
}

export function makeClaudeProvider(businessId: string, transport?: GenerateTransport): ClaudeContentProvider {
  return new ClaudeContentProvider(businessId, transport);
}
