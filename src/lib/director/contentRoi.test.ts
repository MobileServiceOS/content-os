import { describe, it, expect } from 'vitest';
import { contentRoi, roiByHookCategory, totalInfluenced, revenuePerThousandViews } from './contentRoi';
import type { SocialData, SocialVocab } from './social/types';
import type { JobRecord } from './types';

const vid = (p: Partial<SocialData['videos'][number]>): SocialData['videos'][number] => ({
  id: Math.random().toString(36), caption: '', hashtags: [], createdAt: Date.UTC(2026, 4, 12), durationSec: 22,
  views: 1000, likes: 80, comments: 8, shares: 5, favorites: 0, ...p,
});
const tiktok: SocialData = {
  platform: 'tiktok', account: { username: 'wr', displayName: 'WR', followers: 4400, totalLikes: 20000 },
  totals: { views: 0, likes: 0, comments: 0, shares: 0, favorites: 0 },
  videos: [
    vid({ id: 'a', caption: 'Emergency tire repair in Miami! Stuck on I-95?', views: 30000 }), // Miami
    vid({ id: 'b', caption: 'Another Miami tire repair, fast.', views: 10000 }),              // Miami
    vid({ id: 'c', caption: 'A generic tip with no city mentioned.', views: 5000 }),          // no city
  ],
  range: { start: 0, end: 0 }, unavailable: [],
};
// Miami has $2000 of revenue total.
const jobs: JobRecord[] = [
  { id: 'j1', service: 'Tire Repair', city: 'Miami', vehicle: 'SUV', technician: 'M', tireSize: '', customer: 'A', ticketUsd: 2000, status: 'completed', completedAt: 0 },
];
const vocab: SocialVocab = { cities: ['Miami', 'Hollywood'], services: ['Tire Repair'] };

describe('contentRoi', () => {
  it("splits a city's revenue across its videos by view share", () => {
    const rows = contentRoi(tiktok, jobs, vocab);
    const a = rows.find((r) => r.id === 'a')!;
    const b = rows.find((r) => r.id === 'b')!;
    const c = rows.find((r) => r.id === 'c')!;
    // Miami views = 40000; a has 30000 -> 75% of $2000 = $1500; b -> $500; c (no city) -> $0
    expect(a.influencedRevenue).toBeCloseTo(1500, 5);
    expect(b.influencedRevenue).toBeCloseTo(500, 5);
    expect(c.influencedRevenue).toBe(0);
    expect(rows[0].id).toBe('a'); // ranked by influenced revenue
  });

  it('never invents money — total attributed ≤ city revenue', () => {
    const rows = contentRoi(tiktok, jobs, vocab);
    expect(totalInfluenced(rows)).toBeCloseTo(2000, 5); // exactly Miami's revenue, nothing more
  });

  it('aggregates ROI by hook category and computes efficiency', () => {
    const rows = contentRoi(tiktok, jobs, vocab);
    expect(roiByHookCategory(rows).reduce((s, h) => s + h.influencedRevenue, 0)).toBeCloseTo(2000, 5);
    expect(revenuePerThousandViews(rows)).toBeCloseTo((2000 / 45000) * 1000, 3);
  });

  it('returns nothing without TikTok data', () => {
    expect(contentRoi(null, jobs, vocab)).toEqual([]);
  });
});
