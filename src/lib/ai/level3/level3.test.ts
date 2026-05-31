import { describe, it, expect } from 'vitest';
import { runGbp, runSeo, runPhoto, runLead, runMissedCall, runReviewTemplates, runTasks } from './index';
import { GBP_BANNED_CTAS, PHOTO_CATEGORIES } from './pools';
import { hasBannedOpener } from '../../uniqueness/bannedOpeners';
import type { BrandSettings } from '../../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair', website: 'wheelrush.net', phone: '305-897-7030',
  serviceAreas: ['Miami-Dade'], services: ['Mobile tire repair'], notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'], ctas: ['Book now'], localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [], requiredPhrases: [], brandTone: 'helpful', reviewUrl: 'https://g.page/r/abc/review',
};

describe('runGbp (mock)', () => {
  it('produces a compliant description (no CTA) + separate links + hashtags', async () => {
    const out = await runGbp(brand, 'b1', { service: 'flat tire repair', city: 'Miami', vehicle: 'Tesla Model 3', completionTime: '30 minutes' }, []);
    const lower = out.result.description.toLowerCase();
    for (const cta of GBP_BANNED_CTAS) expect(lower).not.toContain(cta);
    expect(out.result.websiteUrl).toBe('wheelrush.net');
    expect(out.result.reviewUrl).toBe('https://g.page/r/abc/review');
    expect(out.result.hashtags.length).toBeGreaterThan(0);
    expect(out.cost.provider).toBe('mock');
  });
});

describe('runSeo (mock)', () => {
  it('faq includes real questions; carries title + entities', async () => {
    const out = await runSeo(brand, 'b1', { type: 'faq', city: 'Miami' }, []);
    expect(out.result.title).toContain('Miami');
    expect(out.result.body).toContain('Q:');
    expect(out.result.questions.length).toBeGreaterThan(0);
    expect(out.result.entities.length).toBeGreaterThan(0);
  });
});

describe('runPhoto (mock)', () => {
  it('produces filename / alt / description / category', async () => {
    const out = await runPhoto(brand, 'b1', { subject: 'tech changing a tire', service: 'flat tire repair', city: 'Miami' }, []);
    expect(out.result.filename.endsWith('.jpg')).toBe(true);
    expect(out.result.altText).toBeTruthy();
    expect(out.result.description).toBeTruthy();
    expect(PHOTO_CATEGORIES).toContain(out.result.category);
  });
});

describe('engagement generators (mock)', () => {
  it('runLead returns 3 distinct, non-banned-opener messages', async () => {
    const out = await runLead(brand, 'b1', { intent: 'quote', service: 'flat tire repair', city: 'Miami' }, []);
    expect(out.result.messages).toHaveLength(3);
    expect(new Set(out.result.messages).size).toBe(3);
    for (const m of out.result.messages) expect(hasBannedOpener(m)).toBe(false);
  });

  it('runMissedCall returns text + follow-up + callback reminder', async () => {
    const out = await runMissedCall(brand, 'b1', { city: 'Miami', service: 'flat tire repair' }, []);
    expect(out.result.text).toContain('Wheel Rush');
    expect(out.result.followUp).toBeTruthy();
    expect(out.result.callbackReminder).toBeTruthy();
  });

  it('runReviewTemplates returns a request + follow-up (no banned opener)', async () => {
    const out = await runReviewTemplates(brand, 'b1', { service: 'flat tire repair', city: 'Miami' }, []);
    expect(hasBannedOpener(out.result.request)).toBe(false);
    expect(out.result.followUp).toBeTruthy();
  });

  it('runTasks (all) suggests tasks across categories', async () => {
    const out = await runTasks(brand, 'b1', { focus: 'all', city: 'Miami' }, []);
    expect(out.result.tasks.length).toBeGreaterThanOrEqual(4);
    expect(new Set(out.result.tasks.map((t) => t.category)).size).toBeGreaterThanOrEqual(3);
  });
});
