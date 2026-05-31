// Stage A mock generators wired into the default agent registry. Stage B replaces
// these by injecting the real generators from src/lib/ai/* — the agent classes
// stay unchanged.
import type { AgentContext } from './types';
import type {
  GenerationRequest,
  GenerationResult,
  GeneratedBlock,
  ScriptRequest,
  ScriptResult,
  ReviewRequest,
  ReviewResult,
  SocialRequest,
  SocialResult,
  RepurposeRequest,
  RepurposeResult,
  QualityScore,
} from '../../types/generation';

const FULL: QualityScore = {
  uniqueness: 1,
  readability: 1,
  brandAlignment: 1,
  engagement: 1,
  localRelevance: 1,
  overall: 1,
};

const firstService = (ctx: AgentContext) => ctx.brand.services[0] ?? 'mobile tire service';
const firstArea = (ctx: AgentContext) => ctx.brand.serviceAreas[0] ?? 'your area';
const firstCta = (ctx: AgentContext) => ctx.brand.ctas[0] ?? 'Book now.';

export function mockContent(req: GenerationRequest, ctx: AgentContext): GenerationResult {
  const svc = req.service ?? firstService(ctx);
  const city = req.city ?? firstArea(ctx);
  const hook: GeneratedBlock = {
    type: 'hook',
    structureId: 'mock-hook',
    text: `Stuck with a flat in ${city}? Here's what most drivers get wrong.`,
  };
  const caption: GeneratedBlock = {
    type: 'caption',
    structureId: 'mock-caption',
    text: `${svc} that comes to you across ${city} — no tow truck, no waiting room.`,
  };
  const cta: GeneratedBlock = { type: 'cta', structureId: 'mock-cta', text: firstCta(ctx) };
  return {
    hook,
    caption,
    cta,
    onScreenText: ['Flat tire?', 'We come to you'],
    hashtags: ['#mobiletire', `#${city.replace(/\s+/g, '')}`],
    localKeywords: ctx.brand.localKeywords.slice(0, 3),
    blocks: [hook, caption, cta],
    quality: FULL,
  };
}

export function mockScript(req: ScriptRequest, ctx: AgentContext): ScriptResult {
  return {
    hook: `Ever had a blowout on I-95? Here's the move.`,
    script: `[${req.lengthSeconds}s ${req.format}] Quick story about a roadside fix in ${firstArea(ctx)}, then the takeaway.`,
    shotList: ['Open on the flat tire', 'Tech arriving', 'Close-up of the repair', 'Driver back on the road'],
    onScreenText: ['Blowout?', 'We come to you', firstCta(ctx)],
    cta: firstCta(ctx),
  };
}

export function mockReview(req: ReviewRequest, ctx: AgentContext): ReviewResult {
  const where = req.city ?? firstArea(ctx);
  // Deliberately avoids banned openers ("Thank you…", "Glad we could help…").
  return {
    short: `Really appreciate you taking the time to write this. Glad the team got you rolling again out in ${where}.`,
    professional: `It means a lot that you shared your experience. Getting drivers in ${where} back on the road quickly is exactly what we aim for.`,
    seoFriendly: `Stories like yours are why we do mobile tire service in ${where}. We're glad the ${req.service ?? 'repair'} went smoothly.`,
  };
}

export function mockSocial(_req: SocialRequest, ctx: AgentContext): SocialResult {
  const cta = firstCta(ctx);
  return {
    replies: [
      `Good question! Drop us your location and we'll get you a quick ETA. ${cta}`,
      `We can usually be out to ${firstArea(ctx)} fast — want us to take a look?`,
      `Happy to help with that. ${cta}`,
    ],
  };
}

export function mockRepurpose(_req: RepurposeRequest, ctx: AgentContext): RepurposeResult {
  const area = firstArea(ctx);
  return {
    hooks: [
      `The flat-tire mistake costing drivers hundreds`,
      `Why a tow truck is the wrong first call`,
      `What a mobile tire tech sees every single day`,
      `Stranded in ${area}? Read this first`,
      `The 20-minute fix most people don't know about`,
    ],
    captions: [
      `A flat doesn't have to wreck your day. Here's the faster way.`,
      `Roadside, driveway, parking lot — we meet you where you are.`,
      `Most "emergencies" are a quick fix when you call the right people.`,
    ],
    shortScript: `Hook → the problem → we come to you → back on the road. ${firstCta(ctx)}`,
    longScript: `Open on a stranded driver, walk through the call, the arrival, the repair, and the relief — close on the CTA.`,
    youtubeTitle: `Mobile Tire Repair in ${area}: How It Actually Works`,
    youtubeDescription: `We break down what happens when you call for mobile tire service in ${area}.`,
    blogTopic: `What to do (and what not to do) when you get a flat in ${area}`,
    socialPost: `Flat tire? Don't call a tow first. Here's why → ${firstCta(ctx)}`,
  };
}
