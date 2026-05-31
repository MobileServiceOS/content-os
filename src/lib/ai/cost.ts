// Generation Cost Tracking model. Values are mocked for the template provider
// now; real providers will report real token usage. Future analytics reads this.
import type { GeneratedRecord } from './shared';

export type ProviderName = 'mock' | 'claude' | 'openai' | 'gemini';

export interface GenerationCost {
  provider: ProviderName;
  tokens: number;
  estimatedCostUsd: number;
  generationTimeMs: number;
  regenerationCount: number;
}

// Mocked $ per 1K tokens. Replace with real rates when LLM providers are wired.
const RATE_PER_1K: Record<ProviderName, number> = {
  mock: 0,
  claude: 0.003,
  openai: 0.0025,
  gemini: 0.0011,
};

/** Rough token estimate (~4 chars/token). */
export function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  provider: ProviderName,
  records: GeneratedRecord[],
  generationTimeMs: number,
): GenerationCost {
  const tokens = records.reduce((n, r) => n + approxTokens(r.text), 0);
  const regenerationCount = records.reduce((n, r) => n + r.regenerationCount, 0);
  const estimatedCostUsd = (tokens / 1000) * RATE_PER_1K[provider];
  return { provider, tokens, estimatedCostUsd, generationTimeMs, regenerationCount };
}

/** Cost from real token usage (used by LLM providers reporting actual tokens). */
export function costFromTokens(
  provider: ProviderName,
  tokens: number,
  generationTimeMs: number,
  regenerationCount: number,
): GenerationCost {
  return {
    provider,
    tokens,
    estimatedCostUsd: (tokens / 1000) * RATE_PER_1K[provider],
    generationTimeMs,
    regenerationCount,
  };
}
