import { describe, it, expect } from 'vitest';
import { ownerSummary, todaysPriorities } from './ownerExecutive';
import { VERTICALS } from '../verticals';
import type { JobRecord } from './types';

const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();
const SOD = (() => { const d = new Date(NOW); d.setHours(0, 0, 0, 0); return d.getTime(); })();

const job = (p: Partial<JobRecord>): JobRecord => ({
  id: Math.random().toString(36), service: 'Mobile Tire Replacement', city: 'Hollywood', vehicle: 'SUV',
  technician: 'Marcus', tireSize: '275/40R20', customer: 'Ana', ticketUsd: 500,
  status: 'completed', completedAt: NOW, ...p,
});

describe('ownerSummary', () => {
  it('computes revenue, profit (when cost known), jobs, avg, and best dimensions', () => {
    const jobs = [
      job({ ticketUsd: 1000, costUsd: 400, completedAt: SOD }),               // this month
      job({ ticketUsd: 600, costUsd: 300, completedAt: new Date(2026, 4, 10).getTime() }), // last month (May)
      job({ ticketUsd: 999, status: 'pending' }),                            // excluded
    ];
    const s = ownerSummary(jobs, NOW);
    expect(s.revenue).toBe(1600);
    expect(s.profit).toBe(900);            // 1600 - (400+300)
    expect(s.profitKnown).toBe(true);
    expect(Math.round((s.marginPct ?? 0) * 100)).toBe(56); // 900/1600
    expect(s.jobs).toBe(2);
    expect(s.avgTicket).toBe(800);
    expect(s.bestCity).toBe('Hollywood');
    expect(s.bestService).toBe('Mobile Tire Replacement');
    expect(s.bestTechnician).toBe('Marcus');
  });

  it('growth % compares this month vs last month', () => {
    const jobs = [
      job({ ticketUsd: 1000, completedAt: SOD }),                              // this month = 1000
      job({ ticketUsd: 500, completedAt: new Date(2026, 4, 10).getTime() }),  // last month = 500
    ];
    expect(ownerSummary(jobs, NOW).growthPct).toBeCloseTo(1.0, 5); // +100%
  });

  it('profit unknown when no cost recorded', () => {
    const s = ownerSummary([job({ ticketUsd: 500 })], NOW);
    expect(s.profitKnown).toBe(false);
    expect(s.marginPct).toBeNull();
  });

  it('null growth with no prior-month baseline', () => {
    expect(ownerSummary([job({ ticketUsd: 500, completedAt: SOD })], NOW).growthPct).toBeNull();
  });
});

describe('todaysPriorities', () => {
  it('derives concrete actions from the data (<=5)', () => {
    const jobs = [job({}), job({ customer: 'Ana' }), job({ customer: 'Ana' })];
    const p = todaysPriorities(jobs, VERTICALS.tire);
    expect(p.length).toBeGreaterThan(0);
    expect(p.length).toBeLessThanOrEqual(5);
    expect(p[0].text).toMatch(/Hollywood/);
    expect(p.some((x) => /Google Business Profile/.test(x.text))).toBe(true);
    expect(p.some((x) => /reviews/.test(x.text))).toBe(true);
  });
});
