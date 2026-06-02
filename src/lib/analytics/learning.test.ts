import { describe, it, expect } from 'vitest';
import { deriveBias, favoredStyles, weightLookup, hasBias } from './learning';
import { NO_BIAS, EMPTY_METRICS, EMPTY_SCORES } from '../../types/analytics';
import type { PostPerformance, PostScores } from '../../types/analytics';
import type { HookCategory } from '../../types/generation';

let n = 0;
function row(hookCategory: HookCategory, viral: number, scores: Partial<PostScores> = {}): PostPerformance {
  return {
    id: `r${n++}`, businessId: 'b', createdBy: 'u', createdAt: 0, updatedAt: 0,
    contentItemId: null, platform: 'tiktok', postedAt: 0, timeBucket: 'wed-evening', source: 'manual',
    hookCategory,
    metrics: { ...EMPTY_METRICS },
    scores: { ...EMPTY_SCORES, viralScore: viral, ...scores },
  };
}

describe('deriveBias', () => {
  it('returns NO_BIAS without enough comparable groups', () => {
    const rows = [row('emergency', 0.9), row('emergency', 0.8)]; // one category only
    expect(deriveBias(rows)).toBe(NO_BIAS);
  });

  it('weights above-average categories >1 and below-average <1', () => {
    const rows = [
      ...Array.from({ length: 3 }, () => row('emergency', 0.9)),
      ...Array.from({ length: 3 }, () => row('myth', 0.3)),
    ];
    const bias = deriveBias(rows, { minSample: 3, metric: 'avgViral' });
    expect(bias.hookCategoryWeights.emergency!).toBeGreaterThan(1);
    expect(bias.hookCategoryWeights.myth!).toBeLessThan(1);
  });

  it('ignores categories below the sample threshold', () => {
    const rows = [
      ...Array.from({ length: 3 }, () => row('emergency', 0.9)),
      ...Array.from({ length: 3 }, () => row('myth', 0.3)),
      row('curiosity', 1.0), // only 1 post — excluded
    ];
    const bias = deriveBias(rows, { minSample: 3 });
    expect(bias.hookCategoryWeights.curiosity).toBeUndefined();
  });

  it('clamps weights into [0.5, 1.5]', () => {
    const rows = [
      ...Array.from({ length: 3 }, () => row('emergency', 1.0)),
      ...Array.from({ length: 3 }, () => row('myth', 0.01)),
    ];
    const bias = deriveBias(rows, { minSample: 3 });
    Object.values(bias.hookCategoryWeights).forEach((w) => {
      expect(w).toBeGreaterThanOrEqual(0.5);
      expect(w).toBeLessThanOrEqual(1.5);
    });
  });
});

describe('favoredStyles / weightLookup / hasBias', () => {
  const rows = [
    ...Array.from({ length: 3 }, () => row('emergency', 0.9)),
    ...Array.from({ length: 3 }, () => row('myth', 0.3)),
  ];
  const bias = deriveBias(rows, { minSample: 3 });

  it('lists favored hooks highest-first', () => {
    expect(favoredStyles(bias).hooks[0]).toBe('emergency');
  });
  it('weightLookup defaults to 1 for unknown categories', () => {
    expect(weightLookup(bias)('unknown_cat')).toBe(1);
  });
  it('hasBias reflects presence of weights', () => {
    expect(hasBias(bias)).toBe(true);
    expect(hasBias(NO_BIAS)).toBe(false);
  });
});
