import { describe, it, expect } from 'vitest';
import { viralIdeas, _buildPackage, type ContentPackage } from './viralEngine';
import { VERTICALS } from '../verticals';
import type { JobRecord } from './types';

const job = (p: Partial<JobRecord>): JobRecord => ({
  id: Math.random().toString(36), service: 'Emergency Tire Service', city: 'Miami', vehicle: 'SUV',
  technician: 'Marcus', tireSize: '275/40R20', customer: 'Ana', ticketUsd: 400,
  status: 'completed', completedAt: Date.UTC(2026, 5, 1), ...p,
});

// Miami + Emergency dominate revenue; Davie + Balancing trail.
const fixture: JobRecord[] = [
  job({ city: 'Miami', service: 'Emergency Tire Service', ticketUsd: 1000 }),
  job({ city: 'Miami', service: 'Emergency Tire Service', ticketUsd: 800 }),
  job({ city: 'Miami', service: 'Mobile Tire Replacement', ticketUsd: 500 }),
  job({ city: 'Davie', service: 'Tire Balancing', ticketUsd: 120 }),
  job({ city: 'Hollywood', service: 'Mobile Tire Replacement', ticketUsd: 600 }),
];

const ctx = { businessName: 'Wheel Rush', vertical: VERTICALS.tire };

const allFieldsPresent = (p: ContentPackage): boolean =>
  !!(p.hook && p.videoConcept && p.avatarScript && p.tiktokCaption && p.instagramCaption &&
     p.facebookCaption && p.youtubeTitle && p.youtubeDescription && p.gbpPost &&
     p.seoKeywords.length && p.hashtags.length);

describe('viralIdeas', () => {
  const ideas = viralIdeas(fixture, ctx);

  it('produces three non-empty Top-10 lists', () => {
    for (const list of [ideas.topToday, ideas.topThisWeek, ideas.topRevenueOpportunities]) {
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(10);
    }
  });

  it('every package has all 11 parts + 4 scores in 1..10', () => {
    for (const p of ideas.topToday) {
      expect(allFieldsPresent(p)).toBe(true);
      for (const v of Object.values(p.scores)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    }
  });

  it('revenue opportunities lead with the top revenue city', () => {
    expect(ideas.topRevenueOpportunities[0].city).toBe('Miami');
  });

  it('this-week list is ordered by virality (non-increasing)', () => {
    const v = ideas.topThisWeek.map((p) => p.scores.virality);
    expect([...v].sort((a, b) => b - a)).toEqual(v);
  });

  it('is deterministic', () => {
    const again = viralIdeas(fixture, ctx);
    expect(again.topToday.map((p) => p.id)).toEqual(ideas.topToday.map((p) => p.id));
  });
});

describe('package composer is vertical-aware', () => {
  it('embeds city, service keyword, and business name', () => {
    const seed = { city: 'Aventura', service: 'Emergency Tire Service', product: '275/40R20', angle: 'emergency rescue', cityShare: 1, serviceShare: 1 };
    const p = _buildPackage(seed, ctx);
    expect(p.gbpPost).toMatch(/Aventura/);
    expect(p.hashtags.join(' ')).toMatch(/wheelrush/);
    expect(p.seoKeywords.some((k) => /near me/.test(k))).toBe(true);
  });
});
