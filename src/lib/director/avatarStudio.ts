// Phase 6 — Avatar Content Studio. Stores a brand profile (logo/colors/voice/
// guidelines) and turns it + the live business/vertical/top-revenue signals into
// scripts for 8 video types, each with tool-ready prompts for HeyGen, ElevenLabs,
// Higgsfield, Veo, Runway, and Sora. Pure + deterministic + unit-tested. Vertical-
// aware, never hardcoded to a single business (Wheel Rush is only the default).
import type { VerticalConfig } from '../verticals';

export interface BrandProfile {
  logoLabel: string;
  colors: string[];
  voiceProfile: string;
  guidelines: string;
}

export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  logoLabel: 'Wheel Rush',
  colors: ['Orange', 'Black', 'White'],
  voiceProfile: 'Confident, expert, friendly local pro — premium and fast, never a generic agency',
  guidelines: 'Premium, trustworthy, fast, helpful. Sound like a local owner who knows mobile service.',
};

export type VideoTypeId =
  | 'avatar' | 'ugc' | 'talking_head' | 'authority'
  | 'customer_story' | 'review' | 'educational' | 'emergency';

export const VIDEO_TYPES: { id: VideoTypeId; label: string }[] = [
  { id: 'avatar', label: 'Avatar Intro' },
  { id: 'ugc', label: 'UGC Style' },
  { id: 'talking_head', label: 'Talking Head' },
  { id: 'authority', label: 'Authority' },
  { id: 'customer_story', label: 'Customer Story' },
  { id: 'review', label: 'Review Highlight' },
  { id: 'educational', label: 'Educational' },
  { id: 'emergency', label: 'Emergency Response' },
];

export interface StudioContext {
  businessName: string;
  vertical: VerticalConfig;
  city: string;
  service: string; // human service label
  brand: BrandProfile;
}

export interface ToolPrompts {
  heygen: string;
  elevenlabs: string;
  higgsfield: string;
  veo: string;
  runway: string;
  sora: string;
}

export interface VideoScript {
  type: VideoTypeId;
  label: string;
  title: string;
  script: string; // spoken VO / talking-head copy
  sceneDirections: string;
  onScreenText: string[];
  cta: string;
  toolPrompts: ToolPrompts;
}

const svcLower = (s: string): string => s.toLowerCase();

// Per-type spoken script + scene direction (parameterized).
function bodyFor(type: VideoTypeId, c: StudioContext): { title: string; script: string; scene: string; onScreen: string[]; cta: string } {
  const { businessName: biz, city, service, vertical } = c;
  const svc = svcLower(service);
  const cta = `Need ${svc} in ${city}? We come to you — tap to call ${biz}.`;
  switch (type) {
    case 'avatar':
      return {
        title: `${biz} — Mobile ${service} in ${city}`,
        script: `Hi, I'm with ${biz}. We're your mobile ${vertical.label.toLowerCase()} in ${city} — we come to you for ${svc}, same day, no tow and no waiting room. Save this for the next time you need us.`,
        scene: `Branded avatar presenter, clean background in brand colors (${c.brand.colors.join('/')}), logo lower-third "${c.brand.logoLabel}".`,
        onScreen: [`Mobile ${service}`, `${city} — we come to you`, biz],
        cta,
      };
    case 'ugc':
      return {
        title: `POV: ${svc} without leaving home (${city})`,
        script: `Okay so I needed ${svc} and I did NOT want to deal with a shop. Found ${biz} — they literally came to my place in ${city}. Watch how fast this was.`,
        scene: `Handheld phone selfie style, natural light, real driveway/${city} setting. Authentic, unpolished.`,
        onScreen: ['no shop visit', 'they came to me', 'wait for it…'],
        cta,
      };
    case 'talking_head':
      return {
        title: `Why we built ${biz}`,
        script: `Most people in ${city} don't know mobile ${svc} is even an option. That's why we do this — you shouldn't lose your whole day to a flat or a breakdown. We come to you.`,
        scene: `Owner talking head, mid-shot, brand-colored accents, confident and warm.`,
        onScreen: [`Mobile ${svc}`, 'we come to you', biz],
        cta,
      };
    case 'authority':
      return {
        title: `The truth about ${svc} most shops won't tell you`,
        script: `Here's what 10 years of ${svc} taught us: speed and honesty win. In ${city} we show up fast, quote straight, and fix it right the first time. That's the whole game.`,
        scene: `Expert framing, tools visible, crisp B-roll of a real ${svc} job in ${city}.`,
        onScreen: ['fast', 'honest quote', 'fixed right'],
        cta,
      };
    case 'customer_story':
      return {
        title: `Stranded in ${city} — 25 minutes later`,
        script: `This ${city} driver thought they were stuck for the day. They called ${biz}, we rolled out for ${svc}, and they were back on the road in under half an hour. Real story.`,
        scene: `Mini-doc: problem (stranded) → dispatch → on-site fix → relieved customer. ${city} backdrop.`,
        onScreen: ['stranded', 'called us', 'back on the road'],
        cta,
      };
    case 'review':
      return {
        title: `What ${city} says about us`,
        script: `We'll let our customers talk. ${city} keeps telling us the same thing — fast, fair, and we come to you. That's exactly what mobile ${svc} should be.`,
        scene: `Animated 5-star review cards in brand colors over B-roll of a ${svc} job.`,
        onScreen: ['★★★★★', '"fast & fair"', '"came to me"'],
        cta,
      };
    case 'educational':
      return {
        title: `${service}: what you're getting wrong`,
        script: `Quick tip on ${svc}: the mistake we see most in ${city} is waiting too long. Catch it early, call mobile service, and you save time and money. Here's how to spot it.`,
        scene: `Clean explainer with on-screen diagram/tips, brand-colored text, close-up of the issue.`,
        onScreen: ['common mistake', 'catch it early', 'pro tip'],
        cta,
      };
    case 'emergency':
      return {
        title: `Emergency ${service} in ${city} — what to do`,
        script: `Emergency ${svc} in ${city}? Don't panic and don't risk it. Get somewhere safe, then call ${biz} — we come to you, fast, day or night. Here's exactly what happens when you call.`,
        scene: `Urgent tone, roadside/night setting, flashing hazard lights, fast cuts to on-site rescue.`,
        onScreen: ['stay safe', 'call us', 'we come to you — fast'],
        cta,
      };
  }
}

function toolPrompts(c: StudioContext, b: ReturnType<typeof bodyFor>): ToolPrompts {
  const colors = c.brand.colors.join(', ');
  const style = `Vertical 9:16, ${colors} brand palette, ${c.brand.voiceProfile}. Logo "${c.brand.logoLabel}". ${c.brand.guidelines}`;
  const videoPrompt = `${b.scene} ${style} Subject: ${c.service} in ${c.city} for ${c.businessName}. ~15–25s, punchy, social-first.`;
  return {
    heygen: `Avatar video. Voice: ${c.brand.voiceProfile}.\nScript:\n${b.script}\nOn-screen captions: ${b.onScreen.join(' / ')}`,
    elevenlabs: b.script, // clean VO text only
    higgsfield: videoPrompt,
    veo: videoPrompt,
    runway: videoPrompt,
    sora: videoPrompt,
  };
}

export function buildVideoScript(type: VideoTypeId, c: StudioContext): VideoScript {
  const b = bodyFor(type, c);
  const label = VIDEO_TYPES.find((t) => t.id === type)?.label ?? type;
  return {
    type, label,
    title: b.title,
    script: b.script,
    sceneDirections: b.scene,
    onScreenText: b.onScreen,
    cta: b.cta,
    toolPrompts: toolPrompts(c, b),
  };
}
