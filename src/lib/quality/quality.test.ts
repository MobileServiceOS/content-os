import { describe, it, expect } from 'vitest';
import { scoreBrandAlignment, scoreLocalRelevance, brandChecks } from './brand';
import { scoreReadability, scoreEngagement, scoreOutput } from './score';
import type { BrandSettings } from '../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair',
  website: 'wheelrush.net',
  phone: '305-897-7030',
  serviceAreas: ['Miami-Dade', 'Broward'],
  services: ['Mobile tire repair'],
  notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'],
  ctas: ['Book now'],
  localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: ['cheapest in town'],
  requiredPhrases: [],
  brandTone: 'helpful',
};

describe('brand alignment', () => {
  it('penalizes banned phrases', () => {
    expect(scoreBrandAlignment('We are the cheapest in town.', brand)).toBeLessThan(0.7);
  });

  it('penalizes mentioning a not-offered service', () => {
    expect(scoreBrandAlignment('We also do rim repair on the side.', brand)).toBeLessThan(0.8);
  });

  it('keeps clean text high', () => {
    expect(scoreBrandAlignment('We come to you for a fast mobile tire repair.', brand)).toBeGreaterThan(0.9);
  });

  it('brandChecks reports hits', () => {
    const c = brandChecks('cheapest in town and rim repair too', brand);
    expect(c.bannedPhrasesHit).toContain('cheapest in town');
    expect(c.notOfferedHit).toContain('Rim repair');
  });
});

describe('local relevance', () => {
  it('rewards a service-area mention', () => {
    const withArea = scoreLocalRelevance('Fast help across Miami-Dade today.', brand);
    const without = scoreLocalRelevance('Fast help wherever you are today.', brand);
    expect(withArea).toBeGreaterThan(without);
  });
});

describe('readability + engagement', () => {
  it('readability returns 0..1', () => {
    const r = scoreReadability('We come to you. We fix the flat. You drive away.');
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('engagement rewards a question + CTA over a flat statement', () => {
    const engaging = scoreEngagement('Flat tire in Miami? Book now and we come to you.');
    const flat = scoreEngagement('Tire services exist in the region.');
    expect(engaging).toBeGreaterThan(flat);
  });
});

describe('scoreOutput (5 dimensions)', () => {
  it('reflects uniqueness against recent outputs', () => {
    const text = 'We come to you for a fast mobile tire repair in Miami-Dade.';
    const fresh = scoreOutput(text, ['totally different content about spreadsheets'], brand);
    const dup = scoreOutput(text, [text], brand);
    expect(fresh.uniqueness).toBeGreaterThan(0.8);
    expect(dup.uniqueness).toBeLessThan(0.2);
    for (const v of Object.values(dup)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
