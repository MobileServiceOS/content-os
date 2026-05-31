// Level 3 generators (GBP / Local SEO / Photo). Each runs through the shared gate
// (uniqueness + BrandGuardian + compliance). Mock path is the default; LLM path
// routes through the `generate` Cloud Function with the new kinds.
import { gate } from '../gate';
import { scoreOutput } from '../../quality/score';
import { approxTokens, costFromTokens, type GenerationCost, type ProviderName } from '../cost';
import { callGenerate, toBrandLite, type LlmProviderName } from '../functionsClient';
import {
  GBP_DESCRIPTIONS, GBP_BANNED_CTAS, HASHTAG_BANK, AI_SEARCH_QUESTIONS, PHOTO_CATEGORIES, SEO_BODIES,
} from './pools';
import type { GbpRequest, GbpResult, SeoRequest, SeoResult, PhotoRequest, PhotoResult } from './types';
import type { BrandSettings } from '../../../types/models';
import type { QualityScore } from '../../../types/generation';

export type { GbpRequest, GbpResult, SeoRequest, SeoResult, PhotoRequest, PhotoResult } from './types';

export interface L3Output<T> {
  result: T;
  quality: QualityScore;
  cost: GenerationCost;
}

const asStr = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const fill = (t: string, vars: Record<string, string>): string =>
  t.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? '').replace(/\s+/g, ' ').trim();

function varsFor(brand: BrandSettings, r: { service?: string; city?: string; vehicle?: string; tireSize?: string; completionTime?: string; responseTime?: string }): Record<string, string> {
  const area = brand.serviceAreas?.[0] ?? 'your area';
  const city = r.city || area;
  return {
    service: r.service || brand.services?.[0]?.toLowerCase() || 'mobile tire service',
    city, area,
    vehicle: r.vehicle || 'vehicle',
    tireSize: r.tireSize || 'tire',
    completionTime: r.completionTime || '30 minutes',
    responseTime: r.responseTime || 'minutes',
    cityTag: city.replace(/[^a-z0-9]/gi, '').toLowerCase(),
  };
}

function rotateHashtags(cityTag: string, seed: number): string[] {
  const bank = [...HASHTAG_BANK, `#${cityTag}`];
  const out: string[] = [];
  for (let i = 0; i < 5; i++) out.push(bank[(seed + i) % bank.length]);
  return Array.from(new Set(out));
}

/** Drop any sentence containing a banned CTA (GBP compliance guard). */
function stripCtas(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !GBP_BANNED_CTAS.some((c) => s.toLowerCase().includes(c)))
    .join(' ')
    .trim();
}

// --- GBP ---------------------------------------------------------------------

async function mockGbp(brand: BrandSettings, req: GbpRequest, recent: string[]): Promise<L3Output<GbpResult>> {
  const t0 = Date.now();
  const vars = varsFor(brand, req);
  let rot = req.service.length + (req.city?.length ?? 0);
  const gated = await gate(
    (avoid) => {
      const items = GBP_DESCRIPTIONS.map((t, i) => ({ t, id: `gbp-${i}` }));
      const avail = items.filter((x) => !avoid.includes(x.id));
      const list = avail.length ? avail : items;
      const choice = list[rot % list.length];
      rot++;
      return { text: fill(choice.t, vars), structureId: choice.id };
    },
    recent, brand, { forbidPhrases: GBP_BANNED_CTAS },
  );
  return {
    result: { description: gated.text, websiteUrl: brand.website || '', reviewUrl: brand.reviewUrl || '', hashtags: rotateHashtags(vars.cityTag, req.service.length) },
    quality: gated.quality,
    cost: { provider: 'mock', tokens: approxTokens(gated.text), estimatedCostUsd: 0, generationTimeMs: Date.now() - t0, regenerationCount: gated.regenerationCount },
  };
}

export async function runGbp(brand: BrandSettings, businessId: string, req: GbpRequest, recent: string[]): Promise<L3Output<GbpResult>> {
  const provider = brand.provider ?? 'mock';
  if (provider === 'mock') return mockGbp(brand, req, recent);
  const t0 = Date.now();
  const out = await callGenerate({ provider: provider as LlmProviderName, businessId, kind: 'gbp', payload: req as unknown as Record<string, unknown>, brand: toBrandLite(brand), avoid: recent });
  const j = out.result as Record<string, unknown>;
  const vars = varsFor(brand, req);
  const description = stripCtas(asStr(j.description));
  const result: GbpResult = {
    description,
    websiteUrl: brand.website || '',
    reviewUrl: brand.reviewUrl || '',
    hashtags: asArr(j.hashtags).length ? asArr(j.hashtags) : rotateHashtags(vars.cityTag, req.service.length),
  };
  const tokens = out.usage.inputTokens + out.usage.outputTokens;
  return { result, quality: scoreOutput(description, recent, brand), cost: costFromTokens(provider as ProviderName, tokens, Date.now() - t0, 0) };
}

// --- Local SEO ---------------------------------------------------------------

function seoTitle(type: SeoRequest['type'], vars: Record<string, string>): string {
  switch (type) {
    case 'service_page': return fill('Mobile {service} in {area}', vars);
    case 'city_page': return fill('Mobile Tire Service in {city}', vars);
    case 'faq': return fill('Mobile Tire Service in {city}: FAQ', vars);
    case 'ai_search': return fill('Mobile Tire Help in {area}: Quick Answers', vars);
    case 'entity': return fill('Mobile Tire Service in {city} — Vehicles & Tire Sizes', vars);
  }
}

async function mockSeo(brand: BrandSettings, req: SeoRequest, recent: string[]): Promise<L3Output<SeoResult>> {
  const t0 = Date.now();
  const vars = varsFor(brand, req);
  const skeletons = SEO_BODIES[req.type];
  let rot = req.type.length + (req.city?.length ?? 0);
  const gated = await gate(
    (avoid) => {
      const items = skeletons.map((t, i) => ({ t, id: `seo-${req.type}-${i}` }));
      const avail = items.filter((x) => !avoid.includes(x.id));
      const list = avail.length ? avail : items;
      const choice = list[rot % list.length];
      rot++;
      let body = fill(choice.t, vars);
      if (req.type === 'faq' || req.type === 'ai_search') {
        body += '\n\n' + AI_SEARCH_QUESTIONS.slice(0, 4).map((q) => `Q: ${q}\nA: ${fill('Yes — a mobile tech handles it on-site in {city}, usually within {responseTime}.', vars)}`).join('\n\n');
      }
      return { text: body, structureId: choice.id };
    },
    recent, brand,
  );
  const result: SeoResult = {
    title: seoTitle(req.type, vars),
    body: gated.text,
    entities: [vars.service, vars.city, vars.area, 'mobile tire', 'roadside'].filter(Boolean),
    questions: AI_SEARCH_QUESTIONS.slice(0, 4),
  };
  return {
    result,
    quality: gated.quality,
    cost: { provider: 'mock', tokens: approxTokens(gated.text), estimatedCostUsd: 0, generationTimeMs: Date.now() - t0, regenerationCount: gated.regenerationCount },
  };
}

export async function runSeo(brand: BrandSettings, businessId: string, req: SeoRequest, recent: string[]): Promise<L3Output<SeoResult>> {
  const provider = brand.provider ?? 'mock';
  if (provider === 'mock') return mockSeo(brand, req, recent);
  const t0 = Date.now();
  const out = await callGenerate({ provider: provider as LlmProviderName, businessId, kind: 'seo', payload: req as unknown as Record<string, unknown>, brand: toBrandLite(brand), avoid: recent });
  const j = out.result as Record<string, unknown>;
  const vars = varsFor(brand, req);
  const result: SeoResult = {
    title: asStr(j.title) || seoTitle(req.type, vars),
    body: asStr(j.body),
    entities: asArr(j.entities),
    questions: asArr(j.questions).length ? asArr(j.questions) : AI_SEARCH_QUESTIONS.slice(0, 4),
  };
  const tokens = out.usage.inputTokens + out.usage.outputTokens;
  return { result, quality: scoreOutput(result.body, recent, brand), cost: costFromTokens(provider as ProviderName, tokens, Date.now() - t0, 0) };
}

// --- Photo optimization ------------------------------------------------------

export async function runPhoto(brand: BrandSettings, _businessId: string, req: PhotoRequest, recent: string[]): Promise<L3Output<PhotoResult>> {
  const t0 = Date.now();
  const vars = varsFor(brand, req);
  const seed = req.subject.length;
  const category = PHOTO_CATEGORIES[seed % PHOTO_CATEGORIES.length];
  // Unique description via the gate (deterministic producer with light variation).
  const openers = ['On location in', 'A real job in', 'Out in', 'Captured in'];
  const gated = await gate(
    (avoid) => {
      const i = (seed + avoid.length) % openers.length;
      const text = `${openers[i]} ${vars.city}: ${req.subject} during ${vars.service}. ${vars.vehicle !== 'vehicle' ? vars.vehicle + ', ' : ''}${vars.tireSize !== 'tire' ? vars.tireSize + '. ' : ''}`.trim();
      return { text, structureId: `photo-${i}` };
    },
    recent, brand,
  );
  const slug = `${req.subject} ${vars.service} ${vars.city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const result: PhotoResult = {
    filename: `${slug || 'mobile-tire'}.jpg`,
    altText: fill('{service} in {city} — {subject}', { ...vars, subject: req.subject }),
    description: gated.text,
    category,
  };
  return {
    result,
    quality: gated.quality,
    cost: { provider: 'mock', tokens: approxTokens(gated.text), estimatedCostUsd: 0, generationTimeMs: Date.now() - t0, regenerationCount: gated.regenerationCount },
  };
}
