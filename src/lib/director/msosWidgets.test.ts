import { describe, it, expect } from 'vitest';
import {
  jobsKpis, revenueByCity, revenueByService, revenueByTechnician, revenueByTireSize,
  topCustomers, dailyRevenueTrend, monthlyRevenueTrend, serviceHeatMap,
  revenueOpportunity, recommendedContent, serviceKeyword,
} from './msosWidgets';
import type { JobRecord } from './types';

const D = (y: number, m: number, day: number) => Date.UTC(y, m - 1, day);
const job = (p: Partial<JobRecord>): JobRecord => ({
  id: Math.random().toString(36), service: 'Mobile Tire Repair', city: 'Miami', vehicle: 'SUV',
  technician: 'Marcus', tireSize: '225/45R17', customer: 'Carlos M.', ticketUsd: 200,
  status: 'completed', completedAt: D(2026, 5, 15), ...p,
});

// Controlled fixture: Replacement dominates, Hollywood = 4x Davie, 275/40R20 tops tires.
const fixture: JobRecord[] = [
  job({ service: 'Mobile Tire Replacement', city: 'Hollywood', tireSize: '275/40R20', technician: 'Marcus', customer: 'Ana P.', ticketUsd: 1000 }),
  job({ service: 'Mobile Tire Replacement', city: 'Hollywood', tireSize: '275/40R20', technician: 'Marcus', customer: 'Ana P.', ticketUsd: 600 }),
  job({ service: 'Mobile Tire Repair', city: 'Davie', tireSize: '225/45R17', technician: 'Luis', customer: 'David K.', ticketUsd: 400 }),
  job({ service: 'Tire Balancing', city: 'Miami', tireSize: '235/55R19', technician: 'Andre', customer: 'Mike T.', ticketUsd: 200 }),
  job({ service: 'Mobile Tire Replacement', city: 'Aventura', tireSize: '275/40R20', technician: 'Marcus', customer: 'Sofia L.', ticketUsd: 500, status: 'pending', completedAt: D(2026, 5, 20) }),
  job({ service: 'Mobile Tire Repair', city: 'Miami', tireSize: '225/45R17', technician: 'Luis', customer: 'Carlos M.', ticketUsd: 0, status: 'cancelled' }),
];

describe('jobsKpis', () => {
  it('counts completed vs pending and realizes only completed revenue', () => {
    const k = jobsKpis(fixture);
    expect(k.totalRevenue).toBe(2200); // 1000+600+400+200
    expect(k.completedJobs).toBe(4);
    expect(k.pendingJobs).toBe(1);
    expect(k.pendingPipelineUsd).toBe(500);
    expect(k.avgTicket).toBe(550);
  });
});

describe('revenue dimensions', () => {
  it('ranks services with correct shares (replacement dominates)', () => {
    const s = revenueByService(fixture);
    expect(s[0].key).toBe('Mobile Tire Replacement');
    expect(s[0].revenue).toBe(1600);
    expect(Math.round(s[0].share * 100)).toBe(73); // 1600/2200
    expect(s.reduce((a, g) => a + g.revenue, 0)).toBe(2200);
  });
  it('ranks cities (Hollywood top, Davie low)', () => {
    const c = revenueByCity(fixture);
    expect(c[0].key).toBe('Hollywood');
    expect(c[0].revenue).toBe(1600);
    expect(c.find((g) => g.key === 'Davie')?.revenue).toBe(400);
  });
  it('tops the highest-revenue tire size', () => {
    expect(revenueByTireSize(fixture)[0].key).toBe('275/40R20');
  });
  it('ranks technicians', () => {
    expect(revenueByTechnician(fixture)[0].key).toBe('Marcus');
  });
});

describe('topCustomers', () => {
  it('ranks customers by revenue', () => {
    const t = topCustomers(fixture);
    expect(t[0].key).toBe('Ana P.'); // 1600
    expect(t[0].jobs).toBe(2);
  });
});

describe('trends', () => {
  it('daily trend has 30 buckets and sums to completed revenue in-range', () => {
    const pts = dailyRevenueTrend(fixture, 30);
    expect(pts.length).toBe(30);
    expect(pts.reduce((a, p) => a + p.value, 0)).toBe(2200);
  });
  it('monthly trend is chronological and non-empty', () => {
    const m = monthlyRevenueTrend(fixture);
    expect(m.length).toBeGreaterThan(0);
  });
});

describe('serviceHeatMap', () => {
  it('builds a service x city matrix', () => {
    const h = serviceHeatMap(fixture);
    expect(h.cities).toContain('Hollywood');
    expect(h.rows.find((r) => r.service === 'Mobile Tire Replacement')?.total).toBe(1600);
    expect(h.max).toBeGreaterThan(0);
  });
});

describe('revenueOpportunity', () => {
  it('produces the example-style insight strings', () => {
    const { insights } = revenueOpportunity(fixture);
    expect(insights.some((s) => /Mobile Tire Replacement generated 73% of revenue\./.test(s))).toBe(true);
    // top city vs lowest completed city: Hollywood $1600 / Miami $200 = 8.0x
    expect(insights.some((s) => /Hollywood generated 8\.0x more revenue than Miami\./.test(s))).toBe(true);
    expect(insights.some((s) => /275\/40R20 is the highest revenue tire size\./.test(s))).toBe(true);
  });
});

describe('recommendedContent', () => {
  it('recommends more of the top service + top cities', () => {
    const recs = recommendedContent(fixture);
    expect(recs[0].title).toBe('Create more replacement content.');
    expect(recs.some((r) => /Create more Hollywood content\./.test(r.title))).toBe(true);
  });
});

describe('serviceKeyword', () => {
  it('reduces a service name to its distinctive word', () => {
    expect(serviceKeyword('Mobile Tire Replacement')).toBe('replacement');
    expect(serviceKeyword('Emergency Tire Service')).toBe('emergency');
    expect(serviceKeyword('Tire Balancing')).toBe('balancing');
  });
});
