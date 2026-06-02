// Social Content Engine (pure). Turns the platform's performance + the business
// vocab into 10 video ideas, 10 hook recommendations, best cities/services to
// target, and a posting schedule. Builds on socialIntel. Unit-tested.
import type { SocialData, SocialVocab } from './types';
import { topHooks, topCities, topServices, bestPostingTimes, bestVideoLengths, type KwGroup } from './socialIntel';

export interface VideoIdea { title: string; hook: string; city?: string; service?: string; lengthHint: string; rationale: string }
export interface HookIdea { hook: string; basedOn: string }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const HOOK_TEMPLATES = [
  (svc: string, city: string) => `Stuck needing ${svc} in ${city}? Watch this.`,
  (svc: string, city: string) => `The ${svc} mistake costing ${city} drivers money.`,
  (svc: string, city: string) => `POV: ${svc} in your ${city} driveway — you never leave home.`,
  (svc: string, city: string) => `Why ${city} calls us first for ${svc}.`,
  (svc: string, city: string) => `Real ${city} ${svc}, start to finish.`,
];

function pickName(groups: KwGroup[], vocabFallback: string[], i: number): string {
  return groups[i % Math.max(1, groups.length)]?.key ?? vocabFallback[i % Math.max(1, vocabFallback.length)] ?? '';
}

export function videoIdeas(d: SocialData, vocab: SocialVocab, n = 10): VideoIdea[] {
  const cities = topCities(d, vocab);
  const services = topServices(d, vocab);
  const lengthHint = bestVideoLengths(d)[0]?.band ?? '15–30s';
  const winningHooks = topHooks(d, 5);

  const ideas: VideoIdea[] = [];
  for (let i = 0; i < n; i++) {
    const city = pickName(cities, vocab.cities, i);
    const service = pickName(services, vocab.services, i + 1);
    const svc = service ? service.toLowerCase() : 'mobile service';
    const tmpl = HOOK_TEMPLATES[i % HOOK_TEMPLATES.length];
    const proven = winningHooks[i % Math.max(1, winningHooks.length)];
    ideas.push({
      title: `${cap(svc)}${city ? ` · ${city}` : ''}`,
      hook: city ? tmpl(svc, city) : tmpl(svc, 'your area'),
      city: city || undefined,
      service: service || undefined,
      lengthHint,
      rationale: proven && proven.views > 0
        ? `Mirrors your best hook style ("${proven.hook.slice(0, 40)}…", ${proven.views.toLocaleString()} views) on a top city+service combo.`
        : `Top city × top service combo from your data.`,
    });
  }
  return ideas;
}

export function hookRecommendations(d: SocialData, vocab: SocialVocab, n = 10): HookIdea[] {
  const out: HookIdea[] = [];
  // Proven hooks first (what already worked).
  for (const h of topHooks(d, 5)) {
    if (h.hook.length >= 6) out.push({ hook: h.hook, basedOn: `${h.views.toLocaleString()} views` });
  }
  // Fill with templated hooks on top city/service.
  const cities = topCities(d, vocab).map((g) => g.key).concat(vocab.cities);
  const services = topServices(d, vocab).map((g) => g.key).concat(vocab.services);
  let i = 0;
  while (out.length < n && i < HOOK_TEMPLATES.length * 4) {
    const city = cities[i % Math.max(1, cities.length)] ?? 'your city';
    const svc = (services[i % Math.max(1, services.length)] ?? 'service').toLowerCase();
    const hook = HOOK_TEMPLATES[i % HOOK_TEMPLATES.length](svc, city);
    if (!out.some((o) => o.hook === hook)) out.push({ hook, basedOn: 'top city × service' });
    i++;
  }
  return out.slice(0, n);
}

export const bestCitiesToTarget = (d: SocialData, v: SocialVocab): KwGroup[] => topCities(d, v).slice(0, 5);
export const bestServicesToFeature = (d: SocialData, v: SocialVocab): KwGroup[] => topServices(d, v).slice(0, 5);

export function postingSchedule(d: SocialData, slots = 4): string[] {
  const best = bestPostingTimes(d).filter((s) => s.videos >= 1).slice(0, slots);
  if (!best.length) return ['Not enough posts yet to recommend times — aim for 3–4 posts/week and re-check.'];
  return best.map((s) => `${s.label} — ${Math.round(s.avgViews).toLocaleString()} avg views (${s.videos} post${s.videos === 1 ? '' : 's'})`);
}
