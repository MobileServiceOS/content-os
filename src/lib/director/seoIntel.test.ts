import { describe, it, expect } from 'vitest';
import { topKeywords, topPages, byCity, byService, seoRecommendations, shortPage, type SeoData, type SeoVocab } from './seoIntel';

const data: SeoData = {
  range: { start: '2026-03-01', end: '2026-05-30' },
  totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
  byQuery: [
    { key: 'mobile tire repair miami', clicks: 40, impressions: 800, ctr: 0.05, position: 4 },
    { key: 'emergency tire service hollywood', clicks: 10, impressions: 600, ctr: 0.017, position: 14 },
    { key: 'tire replacement aventura', clicks: 5, impressions: 300, ctr: 0.017, position: 18 },
    { key: 'flat tire near me', clicks: 20, impressions: 500, ctr: 0.04, position: 6 },
  ],
  byPage: [
    { key: 'https://wheelrush.net/', clicks: 50, impressions: 1500, ctr: 0.033, position: 7 },
    { key: 'https://wheelrush.net/miami', clicks: 25, impressions: 900, ctr: 0.028, position: 5 },
  ],
};
const vocab: SeoVocab = { cities: ['Miami', 'Hollywood', 'Aventura'], services: ['Tire Repair', 'Emergency Tire Service', 'Tire Replacement'] };

describe('topKeywords / topPages', () => {
  it('rank by clicks', () => {
    expect(topKeywords(data)[0].key).toBe('mobile tire repair miami');
    expect(topPages(data)[0].key).toBe('https://wheelrush.net/');
  });
});

describe('byCity / byService (derived)', () => {
  it('aggregates queries that mention each city', () => {
    const c = byCity(data, vocab);
    const miami = c.find((g) => g.key === 'Miami');
    expect(miami?.impressions).toBe(800);
    expect(c.find((g) => g.key === 'Hollywood')?.impressions).toBe(600);
  });
  it('aggregates by service term', () => {
    const s = byService(data, vocab);
    expect(s.find((g) => g.key === 'Emergency Tire Service')?.clicks).toBe(10);
  });
});

describe('seoRecommendations', () => {
  const recs = seoRecommendations(data, vocab);
  it('recommends a city page for a city with impressions but no page (Hollywood, Aventura — Miami has /miami)', () => {
    const cityRecs = recs.filter((r) => r.kind === 'city_page').map((r) => r.title);
    expect(cityRecs.some((t) => /Hollywood/.test(t))).toBe(true);
    expect(cityRecs.some((t) => /Aventura/.test(t))).toBe(true);
    expect(cityRecs.some((t) => /Miami/.test(t))).toBe(false); // /miami page exists
  });
  it('flags high-impression keywords ranking off page 1', () => {
    expect(recs.some((r) => r.kind === 'keyword' && /emergency tire service hollywood/.test(r.title))).toBe(true);
  });
});

describe('shortPage', () => {
  it('shortens a URL to its path', () => {
    expect(shortPage('https://wheelrush.net/miami')).toBe('/miami');
    expect(shortPage('https://wheelrush.net/')).toBe('wheelrush.net');
  });
});
