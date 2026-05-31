import { describe, it, expect } from 'vitest';
import { MockProvider } from './provider.mock';
import { generateContent } from './contentGenerators';
import { generateReviewResponse } from './reviewResponseGenerator';
import { generateSocialReplies } from './socialReplyGenerator';
import { repurposeContent } from './repurposeGenerator';
import { hasBannedOpener } from '../uniqueness/bannedOpeners';
import { similarity } from '../uniqueness/similarity';
import type { BrandSettings } from '../../types/models';
import type { RecentByType } from '../../types/generation';

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
  bannedPhrases: [],
  requiredPhrases: [],
  brandTone: 'helpful',
};

const emptyRecent = (): RecentByType => ({
  hook: [], caption: [], cta: [], script: [], review: [], reply: [],
});

describe('generateContent', () => {
  it('returns hook/caption/cta + records + 5-dim quality', () => {
    const out = generateContent({ platform: 'instagram', city: 'Miami', service: 'flat tire repair' }, brand, emptyRecent(), new MockProvider());
    expect(out.result.hook?.text).toBeTruthy();
    expect(out.result.caption?.text).toBeTruthy();
    expect(out.result.cta?.text).toBeTruthy();
    expect(out.records).toHaveLength(3);
    expect(out.result.quality).toHaveProperty('localRelevance');
  });

  it('duplicate detection: second run avoids the first hook', () => {
    const provider = new MockProvider();
    const recent = emptyRecent();
    const first = generateContent({ platform: 'instagram' }, brand, recent, provider);
    recent.hook.push(first.result.hook!.text);
    recent.caption.push(first.result.caption!.text);
    const second = generateContent({ platform: 'instagram' }, brand, recent, provider);
    // Different structure, and low similarity to the prior hook.
    expect(second.result.hook!.structureId).not.toBe(first.result.hook!.structureId);
    expect(similarity(second.result.hook!.text, first.result.hook!.text)).toBeLessThan(0.6);
  });
});

describe('generateReviewResponse', () => {
  it('5-star -> three distinct, none with a banned opener', () => {
    const out = generateReviewResponse({ reviewText: 'Amazing, super fast!', rating: 5, city: 'Miami', service: 'flat tire repair', tone: 'friendly' }, brand, emptyRecent(), new MockProvider());
    const all = [out.result.short, out.result.professional, out.result.seoFriendly];
    for (const r of all) expect(hasBannedOpener(r)).toBe(false);
    expect(new Set(all).size).toBe(3);
  });

  it('1-star uses a negative structure and does not admit fault', () => {
    const out = generateReviewResponse({ reviewText: 'Terrible experience', rating: 1, tone: 'professional' }, brand, emptyRecent(), new MockProvider());
    expect(out.records[0].category).toBe('negative');
    expect(out.result.professional.toLowerCase()).not.toContain('our fault');
  });
});

describe('generateSocialReplies', () => {
  it('returns 3 distinct replies', () => {
    const out = generateSocialReplies({ platform: 'instagram', message: 'How much?', tone: 'friendly', intent: 'pricing' }, brand, emptyRecent(), new MockProvider());
    expect(out.result.replies).toHaveLength(3);
    expect(new Set(out.result.replies).size).toBe(3);
  });
});

describe('repurposeContent', () => {
  it('produces the full distinct set', () => {
    const out = repurposeContent({ source: 'A roadside blowout fix on I-95 at night' }, brand, emptyRecent(), new MockProvider());
    expect(out.result.hooks).toHaveLength(5);
    expect(new Set(out.result.hooks).size).toBe(5);
    expect(out.result.captions).toHaveLength(3);
    expect(out.result.youtubeTitle).toBeTruthy();
    expect(out.result.blogTopic).toBeTruthy();
  });
});
