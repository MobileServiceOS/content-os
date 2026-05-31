// Generalized uniqueness + BrandGuardian + compliance gate for any generation
// kind (GBP, SEO, photo, …). Mirrors the engine's regenerate-on-collision loop
// but works with an arbitrary async producer, so new kinds reuse the same
// "Provider -> Brand Guardian -> Uniqueness -> Output" pipeline.
import { resolveConfig } from './engine';
import { hasBannedOpener } from '../uniqueness/bannedOpeners';
import { maxSimilarity } from '../uniqueness/similarity';
import { scoreOutput } from '../quality/score';
import type { BrandSettings } from '../../types/models';
import type { QualityScore } from '../../types/generation';

export interface GateCandidate {
  text: string;
  structureId: string;
  category?: string;
}

export interface GateResult extends GateCandidate {
  quality: QualityScore;
  similarityScore: number;
  regenerationCount: number;
}

export interface GateOptions {
  /** Candidate is rejected if its text contains any of these (case-insensitive). */
  forbidPhrases?: string[];
}

const MIN_QUALITY = 0.5;

export async function gate(
  produce: (avoid: string[]) => GateCandidate | Promise<GateCandidate>,
  recent: string[],
  brand: BrandSettings,
  opts: GateOptions = {},
): Promise<GateResult> {
  const cfg = resolveConfig(brand);
  const attempts = Math.max(1, cfg.maxRegenerationAttempts);
  const threshold = cfg.similarityThreshold ?? 0.6;
  const forbid = (opts.forbidPhrases ?? []).map((p) => p.toLowerCase());
  const avoid: string[] = [];
  let best: GateResult | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const c = await produce(avoid);
    avoid.push(c.structureId);
    const lower = c.text.toLowerCase();
    const forbidden = forbid.some((f) => f && lower.includes(f));
    if (hasBannedOpener(c.text, cfg.bannedOpenings) || forbidden) continue;

    const similarityScore = maxSimilarity(c.text, recent);
    const quality = scoreOutput(c.text, recent, brand);
    const result: GateResult = { ...c, quality, similarityScore, regenerationCount: attempt };
    if (similarityScore < threshold && quality.overall >= MIN_QUALITY) return result;
    if (!best || similarityScore < best.similarityScore) best = result;
  }

  if (best) return best;
  const c = await produce([]);
  return {
    ...c,
    quality: scoreOutput(c.text, recent, brand),
    similarityScore: maxSimilarity(c.text, recent),
    regenerationCount: attempts,
  };
}
