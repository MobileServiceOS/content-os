// Generation engine: orchestrates a provider + uniqueness + quality. Generates a
// candidate, scores it, and regenerates (avoiding used structures) until it clears
// the per-business similarity threshold and a minimum quality bar, or returns the
// best non-banned candidate after the configured number of attempts.
import type { GenerationProvider, ProviderRequest } from './types';
import type { GeneratedBlock, QualityScore, UniquenessConfig } from '../../types/generation';
import { DEFAULT_UNIQUENESS } from '../../types/generation';
import type { BrandSettings } from '../../types/models';
import { maxSimilarity } from '../uniqueness/similarity';
import { hasBannedOpener } from '../uniqueness/bannedOpeners';
import { scoreOutput } from '../quality/score';

const MIN_QUALITY = 0.5;

export interface EngineResult {
  block: GeneratedBlock;
  quality: QualityScore;
  similarityScore: number; // max similarity vs recent at acceptance
  regenerationCount: number; // candidates tried before this one (0 = accepted first)
}

/** Merge per-business config over defaults. */
export function resolveConfig(brand: BrandSettings): UniquenessConfig {
  return { ...DEFAULT_UNIQUENESS, ...(brand.uniqueness ?? {}) };
}

export function generateBlock(
  provider: GenerationProvider,
  pr: ProviderRequest,
  brand: BrandSettings,
  recent: string[],
): EngineResult {
  const cfg = resolveConfig(brand);
  const bannedExtra = cfg.bannedOpenings ?? [];
  const attempts = Math.max(1, cfg.maxRegenerationAttempts);
  const avoid: string[] = [];
  let best: EngineResult | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const block = provider.generateBlock(pr, brand, avoid);
    avoid.push(block.structureId);

    // Hard reject banned openers: never accept and never treat as "best".
    if (hasBannedOpener(block.text, bannedExtra)) continue;

    const sim = maxSimilarity(block.text, recent);
    const quality = scoreOutput(block.text, recent, brand);
    const candidate: EngineResult = {
      block,
      quality,
      similarityScore: sim,
      regenerationCount: attempt,
    };

    if (sim < cfg.similarityThreshold && quality.overall >= MIN_QUALITY) {
      return candidate;
    }

    const better =
      !best ||
      sim < best.similarityScore ||
      (sim === best.similarityScore && quality.overall > best.quality.overall);
    if (better) best = candidate;
  }

  if (best) return best;

  // Every attempt was a banned opener (rare). Force one final candidate.
  const fallback = provider.generateBlock(pr, brand, []);
  return {
    block: fallback,
    quality: scoreOutput(fallback.text, recent, brand),
    similarityScore: maxSimilarity(fallback.text, recent),
    regenerationCount: attempts,
  };
}
