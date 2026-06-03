import { describe, it, expect } from 'vitest';
import { cockpitMoves, cockpitAlerts, type CockpitInput } from './homeCockpit';
import type { SocialData, SocialVocab } from './social/types';
import type { JobRecord } from './types';
import type { ReviewAnalysis } from './reviewIntel';

const vid = (p: Partial<SocialData['videos'][number]>): SocialData['videos'][number] => ({
  id: Math.random().toString(36), caption: '', hashtags: [], createdAt: Date.UTC(2026, 4, 12), durationSec: 22,
  views: 1000, likes: 80, comments: 8, shares: 5, favorites: 0, ...p,
});
const tiktok: SocialData = {
  platform: 'tiktok', account: { username: 'wr', displayName: 'WR', followers: 4400, totalLikes: 20000 },
  totals: { views: 0, likes: 0, comments: 0, shares: 0, favorites: 0 },
  videos: [vid({ caption: 'Emergency tire repair in Miami! Watch.', views: 50000, likes: 5000 })],
  range: { start: 0, end: 0 }, unavailable: [],
};
// Davie: $6000 revenue, no video. Miami: $1500 revenue, has a video.
const jobs: JobRecord[] = [
  { id: 'j1', service: 'Tire Replacement', city: 'Davie', vehicle: 'SUV', technician: 'M', tireSize: '', customer: 'A', ticketUsd: 6000, status: 'completed', completedAt: 0 },
  { id: 'j2', service: 'Tire Repair', city: 'Miami', vehicle: 'SUV', technician: 'M', tireSize: '', customer: 'B', ticketUsd: 1500, status: 'completed', completedAt: 0 },
];
const vocab: SocialVocab = { cities: ['Miami', 'Davie'], services: ['Tire Repair', 'Tire Replacement'] };
const base: CockpitInput = { jobs, social: tiktok, sc: null, reviews: null, vocab, now: Date.UTC(2026, 5, 2) };

describe('cockpitMoves', () => {
  it('surfaces the highest-revenue content gap first', () => {
    const moves = cockpitMoves(base);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].text).toMatch(/Davie/);          // $6000 city with no content
    expect(moves[0].impact).toBe('high');
    expect(moves[0].dollars).toBe(6000);
  });

  it('caps at the requested limit', () => {
    expect(cockpitMoves(base, 2).length).toBeLessThanOrEqual(2);
  });

  it('folds reviews into the feed when present', () => {
    const reviews: ReviewAnalysis = {
      count: 4, avgRating: 4, praise: [], topCity: null, topService: null, topTechnician: null,
      complaints: [{ theme: 'wait_time', label: 'Wait time', count: 3 }],
    };
    const moves = cockpitMoves({ ...base, reviews }, 5);
    expect(moves.some((m) => m.source === 'reviews' && /Wait time/.test(m.text))).toBe(true);
  });

  it('returns nothing actionable with no data', () => {
    expect(cockpitMoves({ jobs: [], social: null, sc: null, reviews: null, vocab: { cities: [], services: [] }, now: 0 })).toEqual([]);
  });
});

describe('cockpitAlerts', () => {
  it('flags revenue cities with zero content as an opportunity', () => {
    const alerts = cockpitAlerts(base);
    expect(alerts.some((a) => a.tone === 'opportunity' && /zero content/.test(a.text))).toBe(true);
  });

  it('prompts to connect Search Console when jobs exist but SC is missing', () => {
    const alerts = cockpitAlerts(base);
    expect(alerts.some((a) => /Search Console/.test(a.text))).toBe(true);
  });

  it('prioritizes bad news (complaints) above opportunities', () => {
    const reviews: ReviewAnalysis = {
      count: 4, avgRating: 3, praise: [], topCity: null, topService: null, topTechnician: null,
      complaints: [{ theme: 'price', label: 'Price', count: 2 }],
    };
    const alerts = cockpitAlerts({ ...base, reviews });
    expect(alerts[0].tone).toBe('warn'); // complaint warn ranks above the opportunity alerts
  });
});
