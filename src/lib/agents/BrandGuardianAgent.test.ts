import { describe, it, expect } from 'vitest';
import { BrandGuardianAgent, agents } from './index';
import type { AgentContext } from './types';
import type { BrandSettings } from '../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair',
  website: 'wheelrush.net',
  phone: '305-897-7030',
  serviceAreas: ['Miami-Dade', 'Broward'],
  services: ['Mobile tire repair'],
  notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'],
  ctas: ['Book now at wheelrush.net'],
  localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: ['cheapest in town'],
  requiredPhrases: [],
  brandTone: 'helpful',
};

const ctx: AgentContext = {
  businessId: 'b',
  uid: 'u',
  brand,
  recent: { hook: [], caption: [], cta: [], script: [], review: [], reply: [] },
};

describe('BrandGuardianAgent', () => {
  const g = new BrandGuardianAgent();

  it('flags banned openers', () => {
    expect(g.detectBannedOpeners('Thank you for the review!')).toContain('thank you');
    expect(g.review('Glad we could help you out today.', ctx).passed).toBe(false);
  });

  it('flags banned phrases from brand settings', () => {
    const r = g.review('We are the cheapest in town, guaranteed.', ctx);
    expect(r.bannedPhrases).toContain('cheapest in town');
    expect(r.passed).toBe(false);
  });

  it('passes clean, on-brand text', () => {
    const r = g.review('We rolled out to Miami-Dade and had the driver back on the road fast.', ctx);
    expect(r.passed).toBe(true);
  });

  it('detects repetition against recent output', () => {
    const recent = ['We rolled out to Miami-Dade and had the driver back on the road fast.'];
    const r = g.review('We rolled out to Miami-Dade and had the driver back on the road fast.', ctx, recent);
    expect(r.repetitive).toBe(true);
    expect(r.uniqueness).toBeLessThan(0.5);
  });

  it('flags keyword stuffing', () => {
    expect(g.detectKeywordStuffing('tire tire tire tire tire tire tire tire tire repair')).toBe(true);
  });

  it('reports spamRisk + an aiSearch score', () => {
    const spammy = g.review('tire tire tire tire tire tire tire tire tire repair', ctx);
    expect(spammy.spamRisk).toBe(true);
    expect(spammy.passed).toBe(false);
    const clean = g.review('How fast can you reach Miami-Dade? Usually within 25 minutes.', ctx);
    expect(clean.aiSearch).toBeGreaterThan(0);
  });
});

describe('agent registry (Stage A mocks)', () => {
  it('ContentAgent produces guardian-checked output with a trace', async () => {
    const res = await agents.content.run({ platform: 'instagram' }, ctx);
    expect(res.output.hook?.text).toBeTruthy();
    expect(res.guardian).toBeDefined();
    expect(res.steps.length).toBeGreaterThan(0);
  });

  it('ReviewAgent never opens with a banned phrase', async () => {
    const res = await agents.review.run(
      { reviewText: 'Great service!', rating: 5, tone: 'friendly' },
      ctx,
    );
    expect(res.guardian?.bannedOpeners.length).toBe(0);
  });

  it('RepurposeAgent returns the full repurpose set', async () => {
    const res = await agents.repurpose.run({ source: 'A roadside blowout fix' }, ctx);
    expect(res.output.hooks).toHaveLength(5);
    expect(res.output.captions).toHaveLength(3);
  });
});
