// Learning Engine — turns observed performance into a generation bias. This is
// an explainable weighting (not a model retrain): each hook category / caption
// framework that beats the average gets a >1 weight, laggards get <1, and the
// generators surface favored styles more often. A no-op until enough data and
// the toggle is on.
import type { GenerationBias } from '../../types/analytics';
import { NO_BIAS } from '../../types/analytics';
import type { HookCategory, CaptionFramework } from '../../types/generation';
import type { PostPerformance } from '../../types/analytics';
import { byHookCategory, byCaptionFramework, type DimensionStat, type StatMetric } from './intelligence';

export interface BiasOptions {
  minSample?: number; // posts a group needs before it can influence weights
  metric?: StatMetric; // which performance metric drives the weights
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Build a weight map for one dimension: value/mean, clamped to [0.5, 1.5]. */
function weightsFor(stats: DimensionStat[], minSample: number, metric: StatMetric): Record<string, number> {
  const qualifying = stats.filter((s) => s.count >= minSample);
  if (qualifying.length < 2) return {}; // need at least two groups to compare
  const avg = mean(qualifying.map((s) => s[metric]));
  if (avg <= 0) return {};
  const out: Record<string, number> = {};
  qualifying.forEach((s) => { out[s.key] = Math.round(clamp(s[metric] / avg, 0.5, 1.5) * 100) / 100; });
  return out;
}

export function deriveBias(rows: PostPerformance[], opts: BiasOptions = {}): GenerationBias {
  const minSample = opts.minSample ?? 3;
  const metric = opts.metric ?? 'avgViral';
  const hooks = weightsFor(byHookCategory(rows), minSample, metric);
  const captions = weightsFor(byCaptionFramework(rows), minSample, metric);
  if (!Object.keys(hooks).length && !Object.keys(captions).length) return NO_BIAS;
  return {
    hookCategoryWeights: hooks as GenerationBias['hookCategoryWeights'],
    captionFrameworkWeights: captions as GenerationBias['captionFrameworkWeights'],
  };
}

/** Favored styles (weight clearly above average), highest first — for display + prompts. */
export function favoredStyles(bias: GenerationBias): { hooks: HookCategory[]; frameworks: CaptionFramework[] } {
  const pick = <K extends string>(weights: Partial<Record<K, number>>): K[] =>
    (Object.entries(weights) as [K, number][])
      .filter(([, w]) => w > 1.05)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  return { hooks: pick(bias.hookCategoryWeights), frameworks: pick(bias.captionFrameworkWeights) };
}

/** Combined category->weight lookup (hook categories + caption frameworks share the namespace). */
export function weightLookup(bias: GenerationBias): (category: string) => number {
  const merged: Record<string, number> = { ...bias.hookCategoryWeights, ...bias.captionFrameworkWeights };
  return (category: string) => merged[category] ?? 1;
}

/** True when the bias carries any weighting at all. */
export function hasBias(bias: GenerationBias): boolean {
  return Object.keys(bias.hookCategoryWeights).length > 0 || Object.keys(bias.captionFrameworkWeights).length > 0;
}
