import { describe, it, expect } from 'vitest';
import { getActiveProvider, mockContentProvider, providerFor } from './index';
import type { BrandSettings } from '../../../types/models';
import type { RecentByType } from '../../../types/generation';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair',
  website: 'wheelrush.net',
  phone: '305-897-7030',
  serviceAreas: ['Miami-Dade'],
  services: ['Mobile tire repair'],
  notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'],
  ctas: ['Book now'],
  localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [],
  requiredPhrases: [],
  brandTone: 'helpful',
};
const recent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });

describe('provider layer', () => {
  it('the active provider is the mock provider', () => {
    expect(getActiveProvider().name).toBe('mock');
  });

  it('mock provider returns result + records + cost', async () => {
    const out = await mockContentProvider.generateContent({ platform: 'instagram', city: 'Miami' }, brand, recent());
    expect(out.result.hook?.text).toBeTruthy();
    expect(out.records.length).toBe(3);
    expect(out.cost.provider).toBe('mock');
    expect(out.cost.tokens).toBeGreaterThan(0);
    expect(out.cost).toHaveProperty('generationTimeMs');
    expect(out.cost).toHaveProperty('regenerationCount');
  });

  it('mock provider works across all five methods', async () => {
    const r = recent();
    const review = await mockContentProvider.generateReviewResponse({ reviewText: 'great', rating: 5, tone: 'friendly' }, brand, r);
    const social = await mockContentProvider.generateSocialReply({ platform: 'x', message: 'hi', tone: 'friendly', intent: 'general' }, brand, r);
    const repurpose = await mockContentProvider.repurposeContent({ source: 'a roadside fix' }, brand, r);
    expect(review.result.professional).toBeTruthy();
    expect(social.result.replies).toHaveLength(3);
    expect(repurpose.result.hooks).toHaveLength(5);
  });

  it('always resolves to mock (LLM providers were removed — templates only)', () => {
    expect(providerFor(brand, 'b1').name).toBe('mock');
    // Even if a stored brand still carries an old provider value, it stays mock —
    // the serverless `generate` function is gone, so the LLM path is unwired.
    expect(providerFor({ ...brand, provider: 'claude' }, 'b1').name).toBe('mock');
    expect(providerFor({ ...brand, provider: 'openai' }, 'b1').name).toBe('mock');
    expect(providerFor({ ...brand, provider: 'gemini' }, null).name).toBe('mock');
  });
});
