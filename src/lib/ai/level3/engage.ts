// Engagement + task generators: lead follow-ups, missed-call texts, review
// request/follow-up templates, and agent-suggested tasks. Each text output runs
// through the shared gate; tasks are deterministic planning suggestions.
import { gate } from '../gate';
import { scoreOutput } from '../../quality/score';
import { approxTokens, costFromTokens, type GenerationCost, type ProviderName } from '../cost';
import { callGenerate, toBrandLite, type LlmProviderName } from '../functionsClient';
import {
  LEAD_MESSAGES, MISSED_CALL_TEXTS, MISSED_CALL_FOLLOWUPS, MISSED_CALL_CALLBACKS,
  REVIEW_REQUESTS, REVIEW_FOLLOWUPS, TASK_TEMPLATES,
} from './pools';
import type {
  LeadRequest, LeadResult, MissedCallRequest, MissedCallResult,
  ReviewTemplateRequest, ReviewTemplateResult, TaskGenRequest, TaskGenResult, GeneratedTask, L3Output,
} from './types';
import type { BrandSettings } from '../../../types/models';
import type { TaskCategory } from '../../../types/level3';

const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const asStr = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const fill = (t: string, v: Record<string, string>): string =>
  t.replace(/\{(\w+)\}/g, (_m, k: string) => v[k] ?? '').replace(/\s+/g, ' ').trim();

function vars(brand: BrandSettings, r: { service?: string; city?: string }): Record<string, string> {
  const area = brand.serviceAreas?.[0] ?? 'your area';
  const city = r.city || area;
  return { service: r.service || brand.services?.[0]?.toLowerCase() || 'mobile tire service', city, area, business: brand.businessName || 'us' };
}
const mockCost = (text: string, regen: number, t0: number): GenerationCost => ({
  provider: 'mock', tokens: approxTokens(text), estimatedCostUsd: 0, generationTimeMs: Date.now() - t0, regenerationCount: regen,
});

// --- Lead follow-up ----------------------------------------------------------

async function mockLead(brand: BrandSettings, req: LeadRequest, recent: string[]): Promise<L3Output<LeadResult>> {
  const t0 = Date.now();
  const v = vars(brand, req);
  const pool = LEAD_MESSAGES[req.intent];
  const seen = [...recent];
  const messages: string[] = [];
  let rot = req.intent.length;
  for (let n = 0; n < 3; n++) {
    const g = await gate((avoid) => {
      const items = pool.map((t, i) => ({ t, id: `lead-${req.intent}-${i}` }));
      const avail = items.filter((x) => !avoid.includes(x.id) && !seen.includes(fill(x.t, v)));
      const list = avail.length ? avail : items;
      const c = list[rot % list.length];
      rot++;
      return { text: fill(c.t, v), structureId: c.id };
    }, seen, brand);
    messages.push(g.text);
    seen.push(g.text);
  }
  return { result: { messages }, quality: scoreOutput(messages[0] ?? '', recent, brand), cost: mockCost(messages.join(' '), 0, t0) };
}

export async function runLead(brand: BrandSettings, businessId: string, req: LeadRequest, recent: string[]): Promise<L3Output<LeadResult>> {
  const provider = brand.provider ?? 'mock';
  if (provider === 'mock') return mockLead(brand, req, recent);
  const t0 = Date.now();
  const out = await callGenerate({ provider: provider as LlmProviderName, businessId, kind: 'lead', payload: req as unknown as Record<string, unknown>, brand: toBrandLite(brand), avoid: recent });
  const messages = asArr((out.result as Record<string, unknown>).messages).slice(0, 3);
  const tokens = out.usage.inputTokens + out.usage.outputTokens;
  return { result: { messages }, quality: scoreOutput(messages[0] ?? '', recent, brand), cost: costFromTokens(provider as ProviderName, tokens, Date.now() - t0, 0) };
}

// --- Missed call -------------------------------------------------------------

async function mockMissed(brand: BrandSettings, req: MissedCallRequest, recent: string[]): Promise<L3Output<MissedCallResult>> {
  const t0 = Date.now();
  const v = vars(brand, req);
  let rot = req.city?.length ?? 0;
  const g = await gate((avoid) => {
    const items = MISSED_CALL_TEXTS.map((t, i) => ({ t, id: `mc-${i}` }));
    const avail = items.filter((x) => !avoid.includes(x.id));
    const list = avail.length ? avail : items;
    const c = list[rot % list.length];
    rot++;
    return { text: fill(c.t, v), structureId: c.id };
  }, recent, brand);
  return {
    result: { text: g.text, followUp: fill(MISSED_CALL_FOLLOWUPS[rot % MISSED_CALL_FOLLOWUPS.length], v), callbackReminder: MISSED_CALL_CALLBACKS[rot % MISSED_CALL_CALLBACKS.length] },
    quality: g.quality,
    cost: mockCost(g.text, g.regenerationCount, t0),
  };
}

export async function runMissedCall(brand: BrandSettings, businessId: string, req: MissedCallRequest, recent: string[]): Promise<L3Output<MissedCallResult>> {
  const provider = brand.provider ?? 'mock';
  if (provider === 'mock') return mockMissed(brand, req, recent);
  const t0 = Date.now();
  const out = await callGenerate({ provider: provider as LlmProviderName, businessId, kind: 'missed_call', payload: req as unknown as Record<string, unknown>, brand: toBrandLite(brand), avoid: recent });
  const j = out.result as Record<string, unknown>;
  const result: MissedCallResult = { text: asStr(j.text), followUp: asStr(j.followUp), callbackReminder: asStr(j.callbackReminder) };
  const tokens = out.usage.inputTokens + out.usage.outputTokens;
  return { result, quality: scoreOutput(result.text, recent, brand), cost: costFromTokens(provider as ProviderName, tokens, Date.now() - t0, 0) };
}

// --- Review templates --------------------------------------------------------

async function mockReviewT(brand: BrandSettings, req: ReviewTemplateRequest, recent: string[]): Promise<L3Output<ReviewTemplateResult>> {
  const t0 = Date.now();
  const v = vars(brand, req);
  let rot = req.service?.length ?? 0;
  const g = await gate((avoid) => {
    const items = REVIEW_REQUESTS.map((t, i) => ({ t, id: `rr-${i}` }));
    const avail = items.filter((x) => !avoid.includes(x.id));
    const list = avail.length ? avail : items;
    const c = list[rot % list.length];
    rot++;
    return { text: fill(c.t, v), structureId: c.id };
  }, recent, brand);
  return {
    result: { request: g.text, followUp: fill(REVIEW_FOLLOWUPS[rot % REVIEW_FOLLOWUPS.length], v) },
    quality: g.quality,
    cost: mockCost(g.text, g.regenerationCount, t0),
  };
}

export async function runReviewTemplates(brand: BrandSettings, businessId: string, req: ReviewTemplateRequest, recent: string[]): Promise<L3Output<ReviewTemplateResult>> {
  const provider = brand.provider ?? 'mock';
  if (provider === 'mock') return mockReviewT(brand, req, recent);
  const t0 = Date.now();
  const out = await callGenerate({ provider: provider as LlmProviderName, businessId, kind: 'review_template', payload: req as unknown as Record<string, unknown>, brand: toBrandLite(brand), avoid: recent });
  const j = out.result as Record<string, unknown>;
  const result: ReviewTemplateResult = { request: asStr(j.request), followUp: asStr(j.followUp) };
  const tokens = out.usage.inputTokens + out.usage.outputTokens;
  return { result, quality: scoreOutput(result.request, recent, brand), cost: costFromTokens(provider as ProviderName, tokens, Date.now() - t0, 0) };
}

// --- Task agent (deterministic planning) -------------------------------------

export async function runTasks(brand: BrandSettings, _businessId: string, req: TaskGenRequest, _recent: string[]): Promise<L3Output<TaskGenResult>> {
  const t0 = Date.now();
  const v = vars(brand, req);
  const cats: TaskCategory[] = req.focus && req.focus !== 'all' ? [req.focus] : ['gbp', 'review', 'content', 'seo'];
  const all = req.focus === 'all' || !req.focus;
  const tasks: GeneratedTask[] = [];
  for (const cat of cats) {
    const templates = TASK_TEMPLATES[cat];
    const take = all ? 1 : templates.length;
    for (let i = 0; i < take; i++) {
      const tpl = templates[i % templates.length];
      tasks.push({ category: cat, title: fill(tpl.title, v), detail: tpl.detail, priority: tpl.priority });
    }
  }
  const text = tasks.map((t) => t.title).join('. ');
  return { result: { tasks }, quality: scoreOutput(text, [], brand), cost: mockCost(text, 0, t0) };
}
