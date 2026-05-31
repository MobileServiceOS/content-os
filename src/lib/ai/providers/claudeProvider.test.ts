import { describe, it, expect } from 'vitest';
import { makeClaudeProvider } from './claudeProvider';
import { makeOpenAIProvider } from './openaiProvider';
import { makeGeminiProvider } from './geminiProvider';
import type { GenerateResponse, GenerateTransport } from '../functionsClient';
import type { BrandSettings } from '../../../types/models';
import type { RecentByType } from '../../../types/generation';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair', website: 'wheelrush.net', phone: '305-897-7030',
  serviceAreas: ['Miami-Dade', 'Broward'], services: ['Mobile tire repair'], notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'], ctas: ['Book now'], localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [], requiredPhrases: [], brandTone: 'helpful',
};
const recent = (over: Partial<RecentByType> = {}): RecentByType => ({
  hook: [], caption: [], cta: [], script: [], review: [], reply: [], ...over,
});

/** Transport returning a scripted sequence of content JSON responses. */
function scriptedTransport(captions: string[]): GenerateTransport {
  let i = 0;
  return async (): Promise<GenerateResponse> => {
    const caption = captions[Math.min(i, captions.length - 1)];
    i++;
    return {
      result: { hook: 'Stuck with a flat in Miami?', caption, cta: 'Book now at wheelrush.net', onScreenText: ['Flat?', 'We come to you'], hashtags: ['#mobiletire'], localKeywords: ['mobile tire repair Miami'] },
      usage: { inputTokens: 100, outputTokens: 50 },
    };
  };
}

describe('ClaudeContentProvider', () => {
  it('returns result + records + real-token cost', async () => {
    const provider = makeClaudeProvider('b1', scriptedTransport(['A fresh caption about Miami mobile tire service']));
    const out = await provider.generateContent({ platform: 'instagram' }, brand, recent());
    expect(out.result.caption?.text).toBe('A fresh caption about Miami mobile tire service');
    expect(out.records).toHaveLength(3);
    expect(out.cost.provider).toBe('claude');
    expect(out.cost.tokens).toBe(150);
    expect(out.records[0]).toHaveProperty('readabilityScore');
    expect(out.records[0]).toHaveProperty('engagementScore');
  });

  it('regenerates when the candidate collides with recent output', async () => {
    const dup = 'We come to you in Miami today for a fast flat fix';
    const fresh = 'Three signs your truck needs a new tire soon';
    const provider = makeClaudeProvider('b1', scriptedTransport([dup, fresh]));
    const out = await provider.generateContent({ platform: 'instagram' }, brand, recent({ caption: [dup] }));
    expect(out.result.caption?.text).toBe(fresh);
    expect(out.records[1].regenerationCount).toBe(1);
    expect(out.cost.tokens).toBe(300); // two calls
  });

  it('rejects a banned opener and uses the clean candidate', async () => {
    const provider = makeClaudeProvider('b1', scriptedTransport([
      'Thank you for following our page and supporting us',
      'Caught a flat in Broward? We roll out fast',
    ]));
    const out = await provider.generateContent({ platform: 'instagram' }, brand, recent());
    expect(out.result.caption?.text).not.toMatch(/^thank you/i);
  });

  it('openai + gemini bindings share the logic and report their own provider/cost', async () => {
    const transport = scriptedTransport(['A fresh openai/gemini caption about Miami tires']);
    const openai = await makeOpenAIProvider('b1', transport).generateContent({ platform: 'instagram' }, brand, recent());
    expect(openai.result.caption?.text).toBeTruthy();
    expect(openai.cost.provider).toBe('openai');
    const gemini = await makeGeminiProvider('b1', scriptedTransport(['A gemini caption'])).generateContent({ platform: 'instagram' }, brand, recent());
    expect(gemini.cost.provider).toBe('gemini');
    expect(gemini.records).toHaveLength(3);
  });

  it('produces three distinct review responses', async () => {
    let i = 0;
    const transport: GenerateTransport = async () => {
      i++;
      return { result: { short: `Short ${i}`, professional: `Professional response ${i}`, seoFriendly: `SEO friendly ${i}` }, usage: { inputTokens: 80, outputTokens: 40 } };
    };
    const provider = makeClaudeProvider('b1', transport);
    const out = await provider.generateReviewResponse({ reviewText: 'late', rating: 2, tone: 'professional' }, brand, recent());
    expect(out.result.professional).toBeTruthy();
    expect(out.records).toHaveLength(3);
    expect(out.cost.provider).toBe('claude');
  });
});
