import { describe, it, expect } from 'vitest';
import {
  aggregate,
  rankBy,
  bestBy,
  byHookCategory,
  hashtagStats,
  topPosts,
  videoLengthBucket,
  timeBucketLabel,
} from './intelligence';
import { EMPTY_METRICS, EMPTY_SCORES } from '../../types/analytics';
import type { PostPerformance, PostMetrics, PostScores } from '../../types/analytics';

let n = 0;
function row(over: Omit<Partial<PostPerformance>, 'metrics' | 'scores'> & { metrics?: Partial<PostMetrics>; scores?: Partial<PostScores> }): PostPerformance {
  return {
    id: `r${n++}`,
    businessId: 'b',
    createdBy: 'u',
    createdAt: 0,
    updatedAt: 0,
    contentItemId: null,
    platform: 'tiktok',
    postedAt: 0,
    timeBucket: 'wed-evening',
    source: 'manual',
    ...over,
    metrics: { ...EMPTY_METRICS, ...over.metrics },
    scores: { ...EMPTY_SCORES, ...over.scores },
  };
}

describe('aggregate', () => {
  it('groups and computes sums/averages, dropping empty keys', () => {
    const rows = [
      row({ hookCategory: 'emergency', metrics: { views: 100, leads: 2 } }),
      row({ hookCategory: 'emergency', metrics: { views: 300, leads: 4 } }),
      row({ hookCategory: undefined, metrics: { views: 999 } }),
    ];
    const stats = byHookCategory(rows);
    expect(stats).toHaveLength(1);
    expect(stats[0].key).toBe('emergency');
    expect(stats[0].count).toBe(2);
    expect(stats[0].views).toBe(400);
    expect(stats[0].avgViews).toBe(200);
    expect(stats[0].leads).toBe(6);
  });
});

describe('rankBy / bestBy', () => {
  const stats = [
    aggregate([row({ city: 'Miami', metrics: { views: 1000 } })], (r) => r.city)[0],
    { ...aggregate([row({ city: 'Aventura', metrics: { views: 5000 } })], (r) => r.city)[0], count: 1 },
    { ...aggregate([row({ city: 'Hollywood', metrics: { views: 800 } })], (r) => r.city)[0], count: 5 },
  ];

  it('ranks descending by metric', () => {
    expect(rankBy(stats, 'avgViews')[0].key).toBe('Aventura');
  });

  it('bestBy respects the minimum sample size', () => {
    // Aventura has highest avgViews but only 1 post; Hollywood has 5.
    const res = bestBy(stats, 'avgViews', 3);
    expect(res.tentative?.key).toBe('Aventura');
    expect(res.confident).toBe(true);
    expect(res.leader?.key).toBe('Hollywood');
  });

  it('bestBy returns not-confident when nothing meets the threshold', () => {
    const res = bestBy(stats, 'avgViews', 10);
    expect(res.confident).toBe(false);
    expect(res.leader).toBeNull();
    expect(res.tentative).not.toBeNull();
  });
});

describe('hashtagStats', () => {
  it('counts a row toward each of its hashtags', () => {
    const rows = [
      row({ hashtags: ['#MobileTire', '#Miami'], metrics: { views: 100 } }),
      row({ hashtags: ['#miami'], metrics: { views: 200 } }),
    ];
    const stats = hashtagStats(rows);
    const miami = stats.find((s) => s.key === '#miami');
    expect(miami?.count).toBe(2);
    expect(miami?.views).toBe(300);
  });
});

describe('topPosts', () => {
  it('ranks individual posts by the chosen metric', () => {
    const rows = [row({ scores: { viralScore: 0.2 } }), row({ scores: { viralScore: 0.9 } })];
    expect(topPosts(rows, 'viralScore')[0].scores.viralScore).toBe(0.9);
  });
});

describe('videoLengthBucket', () => {
  it('bands lengths', () => {
    expect(videoLengthBucket(10)).toBe('<15s');
    expect(videoLengthBucket(25)).toBe('15–30s');
    expect(videoLengthBucket(45)).toBe('30–60s');
    expect(videoLengthBucket(90)).toBe('60s+');
    expect(videoLengthBucket(0)).toBeUndefined();
    expect(videoLengthBucket(undefined)).toBeUndefined();
  });
});

describe('timeBucketLabel', () => {
  it('humanizes the bucket', () => {
    expect(timeBucketLabel('wed-evening')).toBe('Wed evening');
  });
});
