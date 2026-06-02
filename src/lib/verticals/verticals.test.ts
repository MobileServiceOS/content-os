import { describe, it, expect } from 'vitest';
import { verticalFor, productValue, VERTICALS } from './index';
import type { JobRecord } from '../director/types';

describe('verticalFor', () => {
  it('maps MSOS businessType values', () => {
    expect(verticalFor('tire').id).toBe('tire');
    expect(verticalFor('mechanic').id).toBe('mechanic');
    expect(verticalFor('detailing').id).toBe('detailing');
  });
  it('handles aliases + casing/spacing', () => {
    expect(verticalFor('Mobile Mechanic').id).toBe('mechanic');
    expect(verticalFor('Car Wash').id).toBe('detailing');
    expect(verticalFor('Oil Change').id).toBe('oil');
  });
  it('defaults to tire for unknown/empty', () => {
    expect(verticalFor(undefined).id).toBe('tire');
    expect(verticalFor(null).id).toBe('tire');
    expect(verticalFor('spaceship').id).toBe('tire');
  });
});

describe('productValue (no hardcoded field)', () => {
  const job = { tireSize: '275/40R20', vehicle: 'SUV', service: 'Full Detail' } as JobRecord;
  it('reads the vertical-appropriate field', () => {
    expect(productValue(job, VERTICALS.tire)).toBe('275/40R20');
    expect(productValue(job, VERTICALS.mechanic)).toBe('SUV');
    expect(productValue(job, VERTICALS.detailing)).toBe('Full Detail');
  });
});
