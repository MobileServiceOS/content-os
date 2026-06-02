// Phase 2 — Viral Content Engine. Turns LIVE MSOS revenue signals (top cities,
// services, product dimension, highest-ticket work) into scored content idea
// packages. Pure + deterministic (template composer, vertical-aware) so it works
// with no API key and is unit-tested; the same packages can later be upgraded to
// LLM-authored copy via the existing generate function without changing callers.
import type { JobRecord } from './types';
import type { VerticalConfig } from '../verticals';
import { revenueByCity, revenueByService, revenueByField, serviceKeyword } from './msosWidgets';

export interface ContentScores {
  virality: number; // 1..10
  revenue: number;
  seo: number;
  reviewGen: number;
  overall: number;
}

export interface ContentPackage {
  id: string;
  title: string;
  city: string;
  service: string;
  product: string;
  angle: string;
  hook: string;
  videoConcept: string;
  avatarScript: string;
  tiktokCaption: string;
  instagramCaption: string;
  facebookCaption: string;
  youtubeTitle: string;
  youtubeDescription: string;
  gbpPost: string;
  seoKeywords: string[];
  hashtags: string[];
  scores: ContentScores;
}

export interface EngineContext {
  businessName: string;
  vertical: VerticalConfig;
}

const clamp10 = (n: number): number => Math.max(1, Math.min(10, Math.round(n)));
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
/** Deterministic small hash for stable variety (no Math.random). */
const hash = (s: string): number => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

// Angle "heat" for the virality score — emotional/urgent angles travel further.
function angleHeat(angle: string): number {
  const a = angle.toLowerCase();
  if (/emergency|rescue|stranded|dead|shock/.test(a)) return 0.95;
  if (/story|transformation|before|after|satisfying/.test(a)) return 0.85;
  if (/price|dealer|cost|save/.test(a)) return 0.8;
  if (/we come|driveway|skip|wait/.test(a)) return 0.7;
  if (/mistake|warning|sign|myth/.test(a)) return 0.72;
  return 0.6;
}
// Services that delight (fast/rescue/convenience) generate more reviews.
function reviewHeat(service: string): number {
  const s = service.toLowerCase();
  if (/emergency|roadside|jump|lockout|rescue/.test(s)) return 0.95;
  if (/replacement|repair|detail|coating/.test(s)) return 0.8;
  return 0.65;
}

interface Seed { city: string; service: string; product: string; angle: string; cityShare: number; serviceShare: number; }

function scoreSeed(seed: Seed): ContentScores {
  const revenue = clamp10(2 + (seed.cityShare * 0.6 + seed.serviceShare * 0.4) * 14);
  const virality = clamp10(2 + angleHeat(seed.angle) * 8);
  const seo = clamp10(6 + (seed.city ? 2 : 0) + (seed.service ? 1 : 0)); // city+service+near-me = strong local intent
  const reviewGen = clamp10(2 + reviewHeat(seed.service) * 8);
  const overall = clamp10(virality * 0.35 + revenue * 0.3 + seo * 0.2 + reviewGen * 0.15);
  return { virality, revenue, seo, reviewGen, overall };
}

const HOOK_PATTERNS = [
  (s: Seed, svc: string) => `${cap(s.angle)} in ${s.city}: here's how we handle ${svc}.`,
  (s: Seed, svc: string) => `Why ${s.city} calls us first for ${svc}.`,
  (s: Seed, svc: string) => `${s.city} ${svc} — the part most people get wrong.`,
  (s: Seed, svc: string) => `Real ${s.city} ${svc}, start to finish. Watch.`,
];

function buildPackage(seed: Seed, ctx: EngineContext): ContentPackage {
  const svc = serviceKeyword(seed.service);
  const svcTitle = seed.service;
  const biz = ctx.businessName;
  const hook = HOOK_PATTERNS[hash(seed.city + seed.service + seed.angle) % HOOK_PATTERNS.length](seed, svc);
  const tags = ['#' + slug(biz), '#' + slug(seed.city), '#' + slug(svc), '#' + ctx.vertical.id, '#mobileservice', '#nearme'];
  const seo = [
    `${svcTitle} in ${seed.city}`,
    `${svc} near me`,
    `mobile ${svc} ${seed.city}`,
    `emergency ${svc} ${seed.city}`,
    `${seed.city} ${ctx.vertical.label.toLowerCase()}`,
  ];
  return {
    id: `${slug(seed.city)}-${slug(seed.service)}-${slug(seed.angle)}`,
    title: `${cap(seed.angle)} · ${svcTitle} · ${seed.city}`,
    city: seed.city, service: svcTitle, product: seed.product, angle: seed.angle,
    hook,
    videoConcept: `15–30s vertical video. Open on the ${seed.city} job site (${seed.product !== 'Unknown' ? seed.product + ', ' : ''}real ${svc}). Show the problem, the on-site fix, and the relieved customer. On-screen text leads with the hook; end on the ${biz} van + phone number.`,
    avatarScript: `Hook: ${hook}\nBody: We're ${biz} — we come to you in ${seed.city} for ${svc}. No tow, no waiting room. We handle it right in your driveway, usually same day.\nClose: Save this for the next time you need ${svc} in ${seed.city}.`,
    tiktokCaption: `${hook} 📍 ${seed.city}\nWe come to you for ${svc}. ${tags.slice(0, 4).join(' ')}`,
    instagramCaption: `${hook}\n\n${biz} — mobile ${svc} in ${seed.city}. We come to you, same day.\n\n${tags.join(' ')}`,
    facebookCaption: `${hook} If you're in ${seed.city} and need ${svc}, we come to you — no tow, no wait. Message us or tap to call.`,
    youtubeTitle: `${svcTitle} in ${seed.city} — ${cap(seed.angle)} (Mobile, We Come To You)`,
    youtubeDescription: `${biz} provides mobile ${svc} across ${seed.city}. In this short we show a real ${svcTitle.toLowerCase()} job from start to finish. Need ${svc} in ${seed.city}? We come to you.\n\nKeywords: ${seo.join(', ')}`,
    gbpPost: `Mobile ${svcTitle} in ${seed.city}. ${biz} comes to you — driveway, office, or roadside. Same-day availability for ${svc}. Serving ${seed.city} and nearby.`,
    seoKeywords: seo,
    hashtags: tags,
    scores: scoreSeed(seed),
  };
}

/** Build a candidate pool of packages from the live data + vertical angles. */
function candidatePool(jobs: JobRecord[], ctx: EngineContext): ContentPackage[] {
  const cityG = revenueByCity(jobs);
  const serviceG = revenueByService(jobs);
  const productG = revenueByField(jobs, ctx.vertical.productDimension.field);
  const maxCity = cityG[0]?.revenue || 1;
  const maxSvc = serviceG[0]?.revenue || 1;
  const cities = cityG.slice(0, 4);
  const services = serviceG.slice(0, 3);
  const angles = ctx.vertical.hookAngles.slice(0, 3);
  const topProduct = productG[0]?.key ?? 'Unknown';

  const pkgs: ContentPackage[] = [];
  const seen = new Set<string>();
  for (const c of cities) {
    for (const s of services) {
      for (const angle of angles) {
        const seed: Seed = {
          city: c.key, service: s.key, product: topProduct, angle,
          cityShare: c.revenue / maxCity, serviceShare: s.revenue / maxSvc,
        };
        const pkg = buildPackage(seed, ctx);
        if (seen.has(pkg.id)) continue;
        seen.add(pkg.id);
        pkgs.push(pkg);
      }
    }
  }
  return pkgs;
}

export interface ViralIdeas {
  topToday: ContentPackage[];        // best overall
  topThisWeek: ContentPackage[];     // most viral
  topRevenueOpportunities: ContentPackage[]; // highest revenue score
}

/** The three Top-10 lists, all from the same live-data candidate pool. */
export function viralIdeas(jobs: JobRecord[], ctx: EngineContext): ViralIdeas {
  const pool = candidatePool(jobs, ctx);
  const by = (sel: (p: ContentPackage) => number) => [...pool].sort((a, b) => sel(b) - sel(a)).slice(0, 10);
  return {
    topToday: by((p) => p.scores.overall * 100 + p.scores.virality),
    topThisWeek: by((p) => p.scores.virality * 100 + p.scores.overall),
    topRevenueOpportunities: by((p) => p.scores.revenue * 100 + p.scores.overall),
  };
}

export { buildPackage as _buildPackage };
