// Process-wide holder for the active generation bias (Learning Engine). The
// mock provider and the LLM functions client both read this so learning works
// without threading bias through every generator call site. Single-tenant MVP:
// one active bias at a time, set by useApplyLearningBias() in the Layout.
import type { GenerationBias } from '../../types/analytics';
import { NO_BIAS } from '../../types/analytics';
import { favoredStyles, weightLookup, hasBias } from './learning';

let active: GenerationBias = NO_BIAS;

export function setActiveBias(bias: GenerationBias): void {
  active = bias;
}

export function getActiveBias(): GenerationBias {
  return active;
}

/** Category->weight lookup for the active bias (1 when unbiased). */
export function activeWeight(category: string): number {
  if (!hasBias(active)) return 1;
  return weightLookup(active)(category);
}

/** Favored style names for the active bias, as plain strings (for LLM prompts). */
export function activeFavorStyles(): string[] {
  const f = favoredStyles(active);
  return [...f.hooks, ...f.frameworks].map((s) => s.replace(/_/g, ' '));
}
