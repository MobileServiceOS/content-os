import { describe, it, expect } from 'vitest';
import { topVideos, topHooks, topCities, topServices, bestVideoLengths, bestPostingTimes, hookOf } from './socialIntel';
import { videoIdeas, hookRecommendations, postingSchedule } from './contentEngine';
import { viewsVsRevenue, cityVsRevenue, contentOpportunities } from './revenueCrossref';
import type { SocialData, SocialVocab } from './types';
import type { JobRecord } from '../types';

const D = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).getTime();
const vid = (p: Partial<SocialData['videos'][number]>): SocialData['videos'][number] => ({
  id: Math.random().toString(36), caption: '', hashtags: [], createdAt: D(2026, 5, 12, 18), durationSec: 22,
  views: 1000, likes: 100, comments: 10, shares: 5, favorites: 0, ...p,
});

const data: SocialData = {
  platform: 'tiktok',
  account: { username: 'wheelrush', displayName: 'Wheel Rush', followers: 5000, totalLikes: 20000 },
  totals: { views: 0, likes: 0, comments: 0, shares: 0, favorites: 0 },
  videos: [
    vid({ caption: 'Emergency tire repair in Miami! Watch this. #miami #tirerepair', views: 50000, likes: 4000, comments: 300, shares: 800, durationSec: 18, createdAt: D(2026, 5, 12, 18) }),
    vid({ caption: 'Mobile tire replacement Hollywood driveway #hollywood', views: 20000, likes: 1500, comments: 90, shares: 200, durationSec: 28, createdAt: D(2026, 5, 13, 12) }),
    vid({ caption: 'Tire balancing tips', views: 3000, likes: 100, comments: 5, shares: 4, durationSec: 65, createdAt: D(2026, 5, 14, 9) }),
  ],
  range: { start: D(2026, 5, 12, 18), end: D(2026, 5, 14, 9) },
  unavailable: ['reach', 'favorites'],
};
const vocab: SocialVocab = { cities: ['Miami', 'Hollywood', 'Davie'], services: ['Tire Repair', 'Tire Replacement', 'Tire Balancing'] };

describe('socialIntel', () => {
  it('ranks top videos by views and extracts hooks', () => {
    expect(topVideos(data)[0].views).toBe(50000);
    expect(hookOf('Emergency tire repair in Miami! more #x')).toBe('Emergency tire repair in Miami');
    expect(topHooks(data)[0].hook).toMatch(/Emergency tire repair in Miami/);
  });
  it('derives top cities + services from captions/hashtags', () => {
    expect(topCities(data, vocab)[0].key).toBe('Miami');
    expect(topServices(data, vocab)[0].key).toBe('Tire Repair');
  });
  it('buckets video lengths + posting times', () => {
    expect(bestVideoLengths(data)[0].avgViews).toBeGreaterThan(0);
    expect(bestPostingTimes(data).length).toBeGreaterThan(0);
  });
});

describe('contentEngine', () => {
  it('generates 10 ideas and 10 hooks', () => {
    expect(videoIdeas(data, vocab).length).toBe(10);
    expect(hookRecommendations(data, vocab).length).toBe(10);
    expect(videoIdeas(data, vocab)[0].hook.length).toBeGreaterThan(0);
  });
  it('recommends a posting schedule', () => {
    expect(postingSchedule(data).length).toBeGreaterThan(0);
  });
});

describe('revenueCrossref', () => {
  const jobs: JobRecord[] = [
    { id: 'j1', service: 'Tire Repair', city: 'Davie', vehicle: 'SUV', technician: 'Marcus', tireSize: '', customer: 'A', ticketUsd: 5000, status: 'completed', completedAt: D(2026, 5, 1, 12) },
    { id: 'j2', service: 'Tire Repair', city: 'Miami', vehicle: 'SUV', technician: 'Marcus', tireSize: '', customer: 'B', ticketUsd: 1000, status: 'completed', completedAt: D(2026, 5, 2, 12) },
  ];
  it('summarizes views vs revenue', () => {
    const r = viewsVsRevenue(data, jobs);
    expect(r.totalRevenue).toBe(6000);
    expect(r.summary).toMatch(/revenue/);
  });
  it('joins city content with city revenue', () => {
    const rows = cityVsRevenue(data, jobs, vocab);
    const davie = rows.find((x) => x.key === 'Davie');
    expect(davie?.revenue).toBe(5000);
    expect(davie?.views).toBe(0); // no Davie content
  });
  it('flags revenue-rich cities with little content as opportunities', () => {
    const opps = contentOpportunities(data, jobs, vocab);
    expect(opps.some((o) => /Davie/.test(o))).toBe(true); // $5000 revenue, 0 views
  });
});
