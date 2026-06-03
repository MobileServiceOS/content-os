import { describe, it, expect } from 'vitest';
import { buildSnapshot } from './cockpitSnapshot';
import type { OwnerSummary } from './ownerExecutive';
import type { CockpitMove, CockpitAlert } from './homeCockpit';

const summary: OwnerSummary = {
  revenue: 41730, profit: 32643, profitKnown: true, marginPct: 0.78,
  jobs: 233, avgTicket: 179, growthPct: -0.97, bestCity: 'Miami', bestService: 'Tire Replacement', bestTechnician: 'Marcus',
};
const moves: CockpitMove[] = [
  { text: 'Publish a page for "flat tire repair near me"', why: '614 searches, rank #12', impact: 'high', dollars: null, to: '/director', source: 'seo' },
];
const alerts: CockpitAlert[] = [{ text: 'Revenue down 97% vs last month.', tone: 'bad', to: '/director' }];

describe('buildSnapshot', () => {
  it('captures money, moves, and alerts with no undefined values', () => {
    const snap = buildSnapshot({ businessId: 'b1', businessName: 'Wheel Rush', ownerEmail: 'o@wr.net', now: 1000, summary, moves, alerts });
    expect(snap.businessId).toBe('b1');           // required for sameTenant rule
    expect(snap.money.revenue).toBe(41730);
    expect(snap.money.marginPct).toBe(0.78);
    expect(snap.moves[0].text).toMatch(/flat tire repair/);
    expect(snap.moves[0].dollars).toBeNull();      // null, never undefined (Firestore rejects undefined)
    expect(snap.alerts[0].tone).toBe('bad');
    expect(JSON.stringify(snap)).not.toContain('undefined');
  });

  it('drops the to/source fields the digest does not need', () => {
    const snap = buildSnapshot({ businessId: 'b1', businessName: 'WR', ownerEmail: null, now: 1, summary, moves, alerts });
    expect((snap.moves[0] as Record<string, unknown>).to).toBeUndefined();
    expect((snap.moves[0] as Record<string, unknown>).source).toBeUndefined();
  });
});
