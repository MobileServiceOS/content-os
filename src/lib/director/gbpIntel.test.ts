import { describe, it, expect } from 'vitest';
import { topCities, topServices, callsTrend, mapsTrend, gbpRecommendations, type GbpData, type GbpVocab } from './gbpIntel';

const data: GbpData = {
  locationTitle: 'Wheel Rush',
  range: { start: '2026-03-01', end: '2026-05-30' },
  totals: { calls: 120, websiteClicks: 80, directionRequests: 60, searchViews: 5000, mapsViews: 3000 },
  series: {
    calls: [{ date: '2026-05-28', value: 4 }, { date: '2026-05-29', value: 6 }],
    mapsViews: [{ date: '2026-05-28', value: 100 }, { date: '2026-05-29', value: 140 }],
    searchViews: [{ date: '2026-05-28', value: 160 }, { date: '2026-05-29', value: 200 }],
  },
  searchKeywords: [
    { keyword: 'mobile tire repair miami', impressions: 900 },
    { keyword: 'flat tire hollywood', impressions: 500 },
    { keyword: 'emergency tire service miami', impressions: 400 },
    { keyword: 'tire shop near me', impressions: 300 },
  ],
  reviews: {
    available: true, total: 42, averageRating: 4.8, unreplied: 2,
    recent: [
      { id: 'r1', rating: 5, comment: 'Fast!', reviewer: 'Ana', replied: false, at: '2026-05-20' },
      { id: 'r2', rating: 4, comment: 'Good', reviewer: 'Bob', replied: true, at: '2026-05-18' },
      { id: 'r3', rating: 3, comment: 'Late', reviewer: 'Cat', replied: false, at: '2026-05-15' },
    ],
  },
};
const vocab: GbpVocab = { cities: ['Miami', 'Hollywood', 'Davie'], services: ['Tire Repair', 'Emergency Tire Service'] };

describe('groupKeywords / top cities + services', () => {
  it('derives top cities from search keywords by impressions', () => {
    const c = topCities(data, vocab);
    expect(c[0].key).toBe('Miami'); // 900 + 400 = 1300
    expect(c[0].impressions).toBe(1300);
    expect(c.find((g) => g.key === 'Hollywood')?.impressions).toBe(500);
    expect(c.find((g) => g.key === 'Davie')).toBeUndefined(); // no match
  });
  it('derives top services', () => {
    const s = topServices(data, vocab);
    expect(s.find((g) => g.key === 'Emergency Tire Service')?.impressions).toBe(400);
  });
});

describe('trends', () => {
  it('exposes calls + maps series', () => {
    expect(callsTrend(data).length).toBe(2);
    expect(mapsTrend(data)[1].value).toBe(140);
  });
});

describe('gbpRecommendations', () => {
  const r = gbpRecommendations(data, vocab);
  it('targets the top city + promotes the top service (by GBP search impressions)', () => {
    expect(r.cityToTarget).toBe('Miami');
    expect(r.serviceToPromote).toBe('Tire Repair'); // 900 impr > Emergency Tire Service 400
  });
  it('proposes GBP posts and lists only unreplied reviews', () => {
    expect(r.posts.length).toBeGreaterThan(0);
    expect(r.posts.some((p) => /Miami/.test(p))).toBe(true);
    expect(r.reviewsNeedingResponse.map((x) => x.id)).toEqual(['r1', 'r3']);
  });
});
