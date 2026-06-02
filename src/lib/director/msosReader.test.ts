import { describe, it, expect } from 'vitest';
import { normalizeJob } from './msosReader';

const names = new Map<string, string>([['uid-marcus', 'Marcus'], ['uid-luis', 'Luis']]);

describe('normalizeJob (MSOS Job -> JobRecord)', () => {
  it('maps fields, coerces revenue, resolves technician, derives status + date', () => {
    const r = normalizeJob({
      service: 'Mobile Tire Replacement', city: 'Hollywood', vehicleType: 'SUV',
      tireSize: '275/40R20', customerName: 'Ana P.', revenue: '$1,250.50',
      status: 'Completed', assignedToUid: 'uid-marcus', date: '2026-05-20',
      customerPhone: '305-555-0100', customerEmail: 'ana@example.com', // must NOT appear on JobRecord
    }, 'job1', names);
    expect(r).toEqual({
      id: 'job1', service: 'Mobile Tire Replacement', city: 'Hollywood', vehicle: 'SUV',
      technician: 'Marcus', tireSize: '275/40R20', customer: 'Ana P.',
      ticketUsd: 1250.5, status: 'completed', completedAt: Date.parse('2026-05-20'),
    });
    // No PII beyond customer name leaks into the normalized record.
    expect(Object.keys(r)).not.toContain('customerPhone');
    expect(Object.keys(r)).not.toContain('customerEmail');
  });

  it('falls back: city->area->fullLocationLabel, tech uid label, pending status', () => {
    const r = normalizeJob({ area: 'Aventura', createdByUid: 'uid-unknown', status: 'Pending', revenue: 300 }, 'j2', names);
    expect(r.city).toBe('Aventura');
    expect(r.technician).toBe('Tech uid-u');
    expect(r.status).toBe('pending');
    expect(r.ticketUsd).toBe(300);
    expect(r.service).toBe('Unknown');
  });

  it('handles cancelled + unassigned + missing revenue', () => {
    const r = normalizeJob({ status: 'Cancelled' }, 'j3', names);
    expect(r.status).toBe('cancelled');
    expect(r.technician).toBe('Unassigned');
    expect(r.ticketUsd).toBe(0);
    expect(r.completedAt).toBe(0);
  });
});
