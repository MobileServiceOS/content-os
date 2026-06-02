// Builds the Claude system + user prompts for each generation kind. The system
// prompt encodes the brand voice and the hard content rules; the per-kind schema
// forces strict JSON output that maps onto the client's result shapes.
import type { BrandLite, GenKind } from './types';

// Mirrors the client's global banned openers (Wheel Rush content rules).
const GLOBAL_BANNED_OPENERS = [
  'Thank you',
  'Thanks for choosing us',
  'We appreciate your business',
  'Glad we could help',
  'A customer in',
  'Wheel Rush completed',
];

const SCHEMAS: Record<GenKind, string> = {
  content: `{"hook": string, "caption": string, "cta": string, "onScreenText": string[2-3], "hashtags": string[3-5], "localKeywords": string[2-3]}`,
  script: `{"hook": string, "script": string, "shotList": string[3-6], "onScreenText": string[3-4], "cta": string}`,
  review: `{"short": string, "professional": string, "seoFriendly": string}`,
  social: `{"replies": string[3]}`,
  repurpose: `{"hooks": string[5], "captions": string[3], "shortScript": string, "longScript": string, "youtubeTitle": string, "youtubeDescription": string, "blogTopic": string, "socialPost": string}`,
  gbp: `{"description": string, "hashtags": string[4-6]}`,
  seo: `{"title": string, "body": string, "entities": string[], "questions": string[3-5]}`,
  photo: `{"filename": string, "altText": string, "description": string, "category": string}`,
  lead: `{"messages": string[3]}`,
  missed_call: `{"text": string, "followUp": string, "callbackReminder": string}`,
  review_template: `{"request": string, "followUp": string}`,
  task: `{"tasks": [{"category": "seo|gbp|review|content", "title": string, "detail": string, "priority": "low|medium|high"}]}`,
};

const KIND_BRIEF: Record<GenKind, string> = {
  content: 'Write social content for the platform and inputs provided.',
  script: 'Write a short-form video script (hook, body, shot list, on-screen text, CTA) for the topic and length.',
  review: 'Write three responses (short, professional, SEO-friendly) to the customer review. Match the sentiment of the star rating. Never automatically admit fault. Mention the service and city naturally, not as keyword stuffing.',
  social: 'Write three distinct, human replies to the comment or DM, matching the intent and tone.',
  repurpose: 'Repurpose the single source idea into the full set of formats.',
  gbp: 'Write a Google Business Profile description. CRITICAL: the description must NEVER contain a call-to-action (no "call now", "book now", "contact us", "schedule today", "text us"). Mention the service and city naturally. Then provide a rotating hashtag block.',
  seo: 'Write local SEO content of the requested type (service_page, city_page, faq, ai_search, or entity). Use natural language, real local + vehicle + tire entities, and answer questions people actually ask. No keyword stuffing, no repetitive city/service mentions.',
  photo: 'Write photo metadata for the subject: a kebab-case filename, descriptive alt text, a unique natural description, and a category.',
  lead: 'Write three distinct, human lead follow-up messages for the given intent (nurture, quote, or missed opportunity). No pressure, no spam.',
  missed_call: 'Write a missed-call text-back, a follow-up message, and a short internal callback reminder.',
  review_template: 'Write a review request template and a gentle review follow-up template. Natural and low-pressure.',
  task: 'Suggest a short list of marketing tasks for the business across SEO, GBP, review, and content, each with a category, title, detail, and priority.',
};

export function buildPrompt(
  kind: GenKind,
  payload: Record<string, unknown>,
  brand: BrandLite,
  avoid: string[] = [],
): { system: string; user: string } {
  const bannedOpeners = [...GLOBAL_BANNED_OPENERS, ...(brand.bannedOpenings ?? [])];

  const system = [
    `You are a senior social content writer for ${brand.businessName}.`,
    brand.brandTone && `Brand voice: ${brand.brandTone}`,
    brand.serviceAreas.length && `Service areas: ${brand.serviceAreas.join(', ')}.`,
    brand.services.length && `Services offered: ${brand.services.join(', ')}.`,
    brand.notOffered.length && `NEVER claim or mention these (not offered): ${brand.notOffered.join(', ')}.`,
    brand.ctas.length && `Preferred CTAs (use naturally, don't force): ${brand.ctas.join(' | ')}.`,
    brand.localKeywords.length && `Local keywords (use sparingly, naturally): ${brand.localKeywords.join(', ')}.`,
    brand.requiredPhrases.length && `Try to include: ${brand.requiredPhrases.join(', ')}.`,
    brand.bannedPhrases.length && `NEVER use these phrases: ${brand.bannedPhrases.join(', ')}.`,
    `Hard rules:`,
    `- Never begin any output with these openers: ${bannedOpeners.map((b) => `"${b}"`).join(', ')}.`,
    `- Never use real customer addresses. Never make fake claims. Never keyword-stuff.`,
    `- Sound human and natural, not robotic. Focus on real-world scenarios.`,
    `- Return STRICT JSON only — no markdown, no commentary — matching this exact shape:`,
    SCHEMAS[kind],
  ]
    .filter(Boolean)
    .join('\n');

  const favorStyles = Array.isArray((payload as { favorStyles?: unknown }).favorStyles)
    ? ((payload as { favorStyles: unknown[] }).favorStyles.filter((s) => typeof s === 'string') as string[])
    : [];

  const user = [
    KIND_BRIEF[kind],
    `Inputs (JSON): ${JSON.stringify(payload)}`,
    favorStyles.length ? `These angles have performed best recently — lean toward them when it fits naturally: ${favorStyles.join(', ')}.` : '',
    avoid.length ? `Do NOT repeat the structure or wording of these recent outputs:\n${avoid.slice(0, 12).map((a) => `- ${a}`).join('\n')}` : '',
    `Respond with JSON only.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}
