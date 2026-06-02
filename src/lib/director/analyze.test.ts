import { describe, it, expect } from 'vitest';
import { sampleDataset } from './sampleData';
import {
  executiveSummary, revenueBreakdown, cityPerformance, servicePerformance,
  hookLeaderboard, contentPerformance, seoDirector, reviewDirector,
  contentOpportunities, dailyBrief,
} from './analyze';

const ds = sampleDataset();

describe('executiveSummary', () => {
  it('totals revenue from jobs and reach from posts', () => {
    const e = executiveSummary(ds);
    expect(e.revenue).toBeGreaterThan(0);
    expect(e.jobs).toBe(ds.jobs.length);
    expect(e.avgTicket).toBeCloseTo(e.revenue / e.jobs, 5);
    expect(e.views).toBe(ds.posts.reduce((a, p) => a + p.metrics.views, 0));
    expect(e.findings.length).toBe(6);
  });
});

describe('revenueBreakdown', () => {
  it('splits revenue four ways, each sorted desc and reconciling to the total', () => {
    const r = revenueBreakdown(ds);
    const total = ds.jobs.reduce((a, j) => a + j.ticketUsd, 0);
    for (const dim of [r.byService, r.byCity, r.byVehicle, r.byTechnician]) {
      expect(dim.reduce((a, g) => a + g.revenue, 0)).toBe(total);
      // sorted descending by revenue
      expect([...dim].sort((a, b) => b.revenue - a.revenue)).toEqual(dim);
    }
    expect(r.actions.length).toBeGreaterThan(0);
  });
});

describe('cityPerformance', () => {
  it('ranks cities and recommends a scalable target', () => {
    const c = cityPerformance(ds);
    expect(c.rows.length).toBeGreaterThan(3);
    expect(c.top.length).toBe(3);
    expect(c.recommendedTarget).not.toBeNull();
  });
});

describe('servicePerformance', () => {
  it('identifies the most profitable service', () => {
    const s = servicePerformance(ds);
    expect(s.mostProfitable).not.toBeNull();
    expect(s.toPromote).toBe(s.mostProfitable?.key);
  });
});

describe('hookLeaderboard', () => {
  it('ranks hook categories by viral score with a winner', () => {
    const h = hookLeaderboard(ds);
    expect(h.byCategory.length).toBeGreaterThan(2);
    expect(h.winner).not.toBeNull();
    // emergency/customer_story are skewed to outperform in the sample
    expect(['emergency', 'customer_story', 'shock']).toContain(h.byCategory[0].key);
  });
});

describe('contentPerformance', () => {
  it('returns best, worst, and detected patterns', () => {
    const c = contentPerformance(ds);
    expect(c.best.length).toBe(5);
    expect(c.worst.length).toBe(5);
    expect(c.best[0].scores.viralScore).toBeGreaterThanOrEqual(c.worst[0].scores.viralScore);
    expect(c.patterns.length).toBeGreaterThan(0);
  });
});

describe('seoDirector', () => {
  it('surfaces weak cities, coverage gaps, and concrete recommendations', () => {
    const s = seoDirector(ds);
    expect(s.recommendations.length).toBeGreaterThan(3);
    expect(s.recommendations.some((r) => r.kind === 'service_page')).toBe(true);
    expect(s.recommendations.some((r) => r.kind === 'schema')).toBe(true);
  });
});

describe('reviewDirector', () => {
  it('distills positive and negative themes with an avg rating', () => {
    const r = reviewDirector(ds);
    expect(r.total).toBe(ds.reviews.length);
    expect(r.avgRating).toBeGreaterThan(0);
    expect(r.positives.length).toBeGreaterThan(0);
    expect(r.complaints.length).toBeGreaterThan(0);
    expect(r.positives[0].count).toBeGreaterThanOrEqual(r.positives[r.positives.length - 1].count);
  });
});

describe('contentOpportunities', () => {
  it('scores ideas 1..10 on every axis', () => {
    const ideas = contentOpportunities(ds);
    expect(ideas.length).toBeGreaterThan(0);
    for (const idea of ideas) {
      for (const v of Object.values(idea.scores)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe('dailyBrief', () => {
  it('answers all five questions and is never empty', () => {
    const b = dailyBrief(ds);
    expect(b.whatHappened.length).toBe(6);
    expect(b.whyItHappened.length).toBeGreaterThan(0);
    expect(b.doNext.length).toBeGreaterThan(0);
    expect(b.top3Today.length).toBeGreaterThan(0);
    expect(b.top3Today.length).toBeLessThanOrEqual(3);
    expect(b.highestRoi).not.toBeNull();
    expect(b.biggestGrowth).not.toBeNull();
  });
});
