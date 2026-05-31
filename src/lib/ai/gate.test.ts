import { describe, it, expect } from 'vitest';
import { gate, type GateCandidate } from './gate';
import type { BrandSettings } from '../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair', website: 'wheelrush.net', phone: '305-897-7030',
  serviceAreas: ['Miami-Dade'], services: ['Mobile tire repair'], notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'], ctas: ['Book now'], localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [], requiredPhrases: [], brandTone: 'helpful',
};

function scripted(cands: string[]): (avoid: string[]) => GateCandidate {
  let i = 0;
  return () => {
    const text = cands[Math.min(i, cands.length - 1)];
    return { text, structureId: `s${i++}` };
  };
}

describe('gate', () => {
  it('regenerates past a collision and returns a unique candidate', async () => {
    const dup = 'We rolled out to Miami-Dade and sorted the flat in about thirty minutes';
    const fresh = 'Three quiet signs a truck tire is about to give out';
    const res = await gate(scripted([dup, fresh]), [dup], brand);
    expect(res.text).toBe(fresh);
    expect(res.regenerationCount).toBe(1);
    expect(res.quality.aiSearch).toBeGreaterThanOrEqual(0);
  });

  it('rejects candidates containing forbidden phrases (GBP CTA compliance)', async () => {
    const withCta = 'Great mobile tire service in Miami. Call now to book!';
    const clean = 'Mobile tire service handled on-site across Miami-Dade in about half an hour.';
    const res = await gate(scripted([withCta, clean]), [], brand, { forbidPhrases: ['call now', 'book now'] });
    expect(res.text).toBe(clean);
  });

  it('never returns a banned opener', async () => {
    const res = await gate(scripted(['Thank you for the support today', 'A driveway fix done right in Broward county']), [], brand);
    expect(res.text).not.toMatch(/^thank you/i);
  });
});
