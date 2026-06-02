import { describe, it, expect } from 'vitest';
import {
  categorizeHook, top20Hooks, hookCategoryStats, bestOpeningLine,
  cityIntelligence, recommendedCities, serviceIntelligence, rankServices,
  contentGaps, dailyRecommendations, predictContentScore,
} from './viralIntel';
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
    vid({ caption: 'Emergency tire repair in Miami! Stuck on I-95? Watch.', views: 50000, likes: 5000 }),
    vid({ caption: 'The dealer quoted $900 for tire replacement. We did it for less.', views: 30000, likes: 2000 }),
    vid({ caption: 'We come to your Hollywood driveway for tire repair.', views: 8000, likes: 400 }),
  ],
  range: { start: 0, end: 0 }, unavailable: [],
};
const jobs: JobRecord[] = [
  { id: 'j1', service: 'Tire Replacement', city: 'Davie', vehicle: 'SUV', technician: 'M', tireSize: '', customer: 'A', ticketUsd: 6000, status: 'completed', completedAt: 0 },
  { id: 'j2', service: 'Tire Repair', city: 'Miami', vehicle: 'SUV', technician: 'M', tireSize: '', customer: 'B', ticketUsd: 1500, status: 'completed', completedAt: 0 },
  { id: 'j3', service: 'Spare Install', city: 'Sunrise', vehicle: 'SUV', technician: 'M', tireSize: '', customer: 'C', ticketUsd: 2000, status: 'completed', completedAt: 0 },
];
const vocab: SocialVocab = { cities: ['Miami', 'Hollywood', 'Davie'], services: ['Tire Repair', 'Tire Replacement', 'Spare Install'] };

describe('Hook Intelligence', () => {
  it('categorizes hooks', () => {
    expect(categorizeHook('Stuck on I-95 with a blowout?')).toBe('emergency');
    expect(categorizeHook('The dealer quoted $900')).toBe('cost');
    expect(categorizeHook('We come to your driveway')).toBe('convenience');
  });
  it('top 20 + best opening line + category stats', () => {
    expect(top20Hooks(tiktok).length).toBe(3);
    expect(bestOpeningLine(tiktok)).toMatch(/Emergency tire repair in Miami/);
    expect(hookCategoryStats(tiktok)[0].avgViews).toBeGreaterThan(0);
  });
});

describe('City + Service Intelligence', () => {
  it('city revenue + views + revenue per 1k views', () => {
    const c = cityIntelligence(tiktok, jobs, vocab);
    const miami = c.find((x) => x.city === 'Miami');
    expect(miami?.revenue).toBe(1500);
    expect(miami?.views).toBe(50000);
    expect(miami?.revenuePer1kViews).toBeCloseTo((1500 / 50000) * 1000, 3);
    // Davie has revenue but no content
    expect(c.find((x) => x.city === 'Davie')?.views).toBe(0);
  });
  it('recommended cities prefer high-revenue low-content (Davie)', () => {
    expect(recommendedCities(cityIntelligence(tiktok, jobs, vocab))[0].city).toBe('Davie');
  });
  it('service conversion opportunity is high for revenue-rich low-content service', () => {
    const s = rankServices(serviceIntelligence(tiktok, jobs, vocab), 'conversionOpportunity');
    expect(s[0].service).toBe('Tire Replacement'); // $6000 rev, little content
  });
});

describe('Content Gap Engine', () => {
  it('finds cities + services with revenue but no content', () => {
    const g = contentGaps(tiktok, jobs, vocab);
    expect(g.citiesNoContent.some((c) => c.city === 'Davie')).toBe(true);
    expect(g.servicesNoContent.some((s) => s.service === 'Spare Install')).toBe(true); // $2000 revenue, no video
    expect(g.highRevLowContent.length).toBeGreaterThan(0);
  });
});

describe('Daily Recommendations', () => {
  it('produces 3 TikTok, 3 GBP, 1 blog, 1 Short from real data', () => {
    const r = dailyRecommendations(tiktok, null, jobs, vocab);
    expect(r.tiktok.length).toBe(3);
    expect(r.gbp.length).toBe(3);
    expect(r.blog).toBeTruthy();
    expect(r.short).toMatch(/Short/);
  });
});

describe('Content Score prediction', () => {
  it('predicts a band + uses history when available', () => {
    const p = predictContentScore('Emergency tire repair in Miami! Stuck on the highway?', tiktok, vocab);
    expect(['Low', 'Medium', 'High', 'Viral']).toContain(p.band);
    expect(p.confidence).toBe('high');
    expect(p.predictedViews).toBeGreaterThan(0);
  });
  it('falls back to low confidence with no history', () => {
    const empty: SocialData = { ...tiktok, videos: [] };
    const p = predictContentScore('Some hook', empty, vocab);
    expect(p.confidence).toBe('low');
  });
});
