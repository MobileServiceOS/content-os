import { describe, it, expect } from 'vitest';
import { computeScores, median } from './scores';
import { EMPTY_METRICS } from '../../types/analytics';
import type { PostMetrics } from '../../types/analytics';

const m = (over: Partial<PostMetrics>): PostMetrics => ({ ...EMPTY_METRICS, ...over });

describe('median', () => {
  it('handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
  it('returns 0 for empty', () => {
    expect(median([])).toBe(0);
  });
});

describe('computeScores', () => {
  it('flags calibrating when no baseline and still scores completion/shares', () => {
    const r = computeScores({ metrics: m({ views: 1000, completionRate: 0.6, shares: 30, saves: 20 }) });
    expect(r.calibrating).toBe(true);
    expect(r.viralScore).toBeGreaterThan(0);
    expect(r.viralScore).toBeLessThanOrEqual(1);
  });

  it('rewards beating the view baseline', () => {
    const base = { metrics: m({ views: 5000, completionRate: 0.5, shares: 50, saves: 50 }), baselineViews: 1000 };
    const weak = { metrics: m({ views: 500, completionRate: 0.5, shares: 5, saves: 5 }), baselineViews: 1000 };
    expect(computeScores(base).viralScore).toBeGreaterThan(computeScores(weak).viralScore);
    expect(computeScores(base).calibrating).toBe(false);
  });

  it('engagement score saturates at the 10% target', () => {
    const r = computeScores({ metrics: m({ views: 100, shares: 6, saves: 4, comments: 0 }) });
    expect(r.engagementScore).toBeCloseTo(1, 5); // 10/100 = 0.1 -> 1.0
  });

  it('uses retention proxy for hook score when length is known', () => {
    const withLen = computeScores({ metrics: m({ completionRate: 0.5, avgViewDurationSec: 30 }), videoLengthSec: 30 });
    const noLen = computeScores({ metrics: m({ completionRate: 0.5, avgViewDurationSec: 30 }) });
    expect(withLen.hookScore).toBeGreaterThan(noLen.hookScore);
    expect(noLen.hookScore).toBeCloseTo(0.5, 5);
  });

  it('weights jobs heavier than calls in lead-gen score', () => {
    const jobs = computeScores({ metrics: m({ views: 1000, jobs: 10 }) });
    const calls = computeScores({ metrics: m({ views: 1000, calls: 10 }) });
    expect(jobs.leadGenScore).toBeGreaterThan(calls.leadGenScore);
  });

  it('is divide-by-zero safe at zero views', () => {
    const r = computeScores({ metrics: EMPTY_METRICS });
    expect(r.viralScore).toBe(0);
    expect(r.engagementScore).toBe(0);
    expect(r.leadGenScore).toBe(0);
  });

  it('passes through and clamps text scores', () => {
    const r = computeScores({ metrics: EMPTY_METRICS, textScores: { seo: 0.8, gbp: 1.5, local: -1 } });
    expect(r.seoScore).toBe(0.8);
    expect(r.gbpScore).toBe(1);
    expect(r.localRelevanceScore).toBe(0);
  });
});
