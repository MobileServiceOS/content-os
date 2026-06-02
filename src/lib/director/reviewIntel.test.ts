import { describe, it, expect } from 'vitest';
import { parseReviews, analyzeReviews, reviewOpportunities, type ReviewVocab } from './reviewIntel';

const vocab: ReviewVocab = {
  cities: ['Hollywood', 'Miami', 'Davie'],
  services: ['Tire Replacement', 'Emergency Tire Service'],
  technicians: ['Marcus', 'Luis'],
};

describe('parseReviews', () => {
  it('parses optional leading ratings and plain lines', () => {
    const r = parseReviews('5 - Came to my driveway, fast!\n4★ A bit pricey\nJust some text\n\n3 | took longer');
    expect(r).toEqual([
      { rating: 5, text: 'Came to my driveway, fast!' },
      { rating: 4, text: 'A bit pricey' },
      { text: 'Just some text' },
      { rating: 3, text: 'took longer' },
    ]);
  });
});

describe('analyzeReviews', () => {
  const reviews = parseReviews([
    '5 - Marcus came to my driveway in Hollywood, super fast and professional',
    '5 - Convenient, they came to me at work in Hollywood',
    '4 - A bit expensive but honest, no upsell',
    '3 - Showed up late, waited over an hour',
    '2 - Pricey and they rescheduled twice',
  ].join('\n'));
  const a = analyzeReviews(reviews, vocab);

  it('counts reviews + avg rating', () => {
    expect(a.count).toBe(5);
    expect(a.avgRating).toBeCloseTo(3.8, 5);
  });
  it('extracts praise + complaint themes ranked by frequency', () => {
    expect(a.praise.map((p) => p.theme)).toContain('convenience');
    expect(a.complaints.map((c) => c.theme)).toContain('wait_time');
    expect(a.complaints.map((c) => c.theme)).toContain('price');
  });
  it('finds most-mentioned city + technician from vocab', () => {
    expect(a.topCity?.name).toBe('Hollywood'); // mentioned twice
    expect(a.topTechnician?.name).toBe('Marcus');
  });
});

describe('reviewOpportunities', () => {
  it('turns the top praise theme into a video angle (the spec example)', () => {
    const a = analyzeReviews(parseReviews('5 - they came to me, so convenient\n5 - convenient, came to my driveway'), vocab);
    const o = reviewOpportunities(a, vocab);
    expect(o.videos.some((v) => /convenience/i.test(v) && /We Come To You/.test(v))).toBe(true);
    expect(o.responses.length).toBeGreaterThan(0);
    expect(o.seo.some((s) => /near me/.test(s))).toBe(true);
  });
});
