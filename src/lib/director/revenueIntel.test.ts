import { describe, it, expect } from 'vitest';
import { revenueWindows, revenueByCustomerType, revenueRollups, revenueByField } from './msosWidgets';
import { revenueInsight, FOCUS_UPLIFT } from './insight';
import type { JobRecord } from './types';

// Fixed "now": local noon, June 15 2026. Build job dates relative to start-of-day
// so windows are deterministic regardless of test runner timezone.
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();
const SOD = (() => { const d = new Date(NOW); d.setHours(0, 0, 0, 0); return d.getTime(); })();
const DAY = 86_400_000;

const job = (p: Partial<JobRecord>): JobRecord => ({
  id: Math.random().toString(36), service: 'Mobile Tire Repair', city: 'Miami', vehicle: 'SUV',
  technician: 'Marcus', tireSize: '225/45R17', customer: 'Someone', ticketUsd: 100,
  status: 'completed', completedAt: NOW, ...p,
});

const fixture: JobRecord[] = [
  job({ ticketUsd: 100, completedAt: SOD + 12 * 3600_000, customer: 'Repeat' }),       // today
  job({ ticketUsd: 200, completedAt: SOD - DAY + 12 * 3600_000, customer: 'Repeat' }), // yesterday
  job({ ticketUsd: 300, completedAt: SOD - 10 * DAY + 12 * 3600_000, customer: 'Solo' }), // 10d ago (this month)
  job({ ticketUsd: 400, completedAt: new Date(2026, 4, 20, 12).getTime(), customer: 'Whale' }), // last month (May)
  job({ ticketUsd: 500, completedAt: new Date(2026, 1, 15, 12).getTime(), customer: 'Old' }),   // ~120d ago
  job({ ticketUsd: 999, completedAt: NOW, status: 'pending', customer: 'Pending' }),   // excluded
];

describe('revenueWindows', () => {
  const w = revenueWindows(fixture, NOW);
  it('today / yesterday', () => {
    expect(w.today).toMatchObject({ revenue: 100, jobs: 1 });
    expect(w.yesterday).toMatchObject({ revenue: 200, jobs: 1 });
  });
  it('this week = rolling 7 days (today + yesterday)', () => {
    expect(w.thisWeek.revenue).toBe(300);
  });
  it('this month = June (today + yesterday + 10d-ago)', () => {
    expect(w.thisMonth.revenue).toBe(600);
  });
  it('last month = May only', () => {
    expect(w.lastMonth).toMatchObject({ revenue: 400, jobs: 1 });
  });
  it('last 90 days excludes the ~120-day-old job; excludes pending', () => {
    expect(w.last90.revenue).toBe(1000); // 100+200+300+400
  });
});

describe('revenueByCustomerType', () => {
  it('splits New vs Returning by repeat customer name', () => {
    const groups = revenueByCustomerType(fixture);
    const returning = groups.find((g) => g.key === 'Returning');
    const fresh = groups.find((g) => g.key === 'New');
    expect(returning?.revenue).toBe(300); // Repeat: 100 + 200
    expect(fresh?.revenue).toBe(1200);    // Solo 300 + Whale 400 + Old 500
  });
});

describe('revenueRollups', () => {
  it('surfaces highest lifetime customer by total revenue', () => {
    const r = revenueRollups(fixture);
    expect(r.highestLifetimeCustomer?.key).toBe('Old'); // 500 is the single biggest
    expect(r.topCity).not.toBeNull();
    expect(r.highestAvgTicketService).not.toBeNull();
  });
});

describe('revenueByField (vertical product dimension)', () => {
  it('groups by an arbitrary field', () => {
    const byVehicle = revenueByField(fixture, 'vehicle');
    expect(byVehicle[0].key).toBe('SUV');
  });
});

describe('revenueInsight', () => {
  it('builds what/why/action and a transparent impact estimate', () => {
    const group = { key: 'Hollywood', jobs: 12, revenue: 10000, avgTicket: 833, share: 0.34 };
    const ins = revenueInsight('Hollywood', 'city', group, 'Create more Hollywood content.');
    expect(ins.whatHappened).toMatch(/Hollywood generated 34% of revenue/);
    expect(ins.action).toBe('Create more Hollywood content.');
    expect(ins.impactUsd).toBe(Math.round(10000 * FOCUS_UPLIFT));
    expect(ins.impactLabel).toMatch(/potential/);
  });
});
