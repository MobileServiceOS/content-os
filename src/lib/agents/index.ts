// Agent framework public surface + a default registry wired with Stage A mock
// generators. Stage B re-wires each agent with the real generators from
// src/lib/ai/* by passing them into the constructors.
export * from './types';
export { BaseAgent } from './BaseAgent';
export { GenerationAgent } from './GenerationAgent';
export { BrandGuardianAgent, BANNED_OPENERS } from './BrandGuardianAgent';
export { ContentAgent } from './ContentAgent';
export { ScriptAgent } from './ScriptAgent';
export { ReviewAgent } from './ReviewAgent';
export { SocialAgent } from './SocialAgent';
export { RepurposeAgent } from './RepurposeAgent';

import { ContentAgent } from './ContentAgent';
import { ScriptAgent } from './ScriptAgent';
import { ReviewAgent } from './ReviewAgent';
import { SocialAgent } from './SocialAgent';
import { RepurposeAgent } from './RepurposeAgent';
import { BrandGuardianAgent } from './BrandGuardianAgent';
import { generateContent } from '../ai/contentGenerators';
import { generateScript } from '../ai/scriptGenerator';
import { generateReviewResponse } from '../ai/reviewResponseGenerator';
import { generateSocialReplies } from '../ai/socialReplyGenerator';
import { repurposeContent } from '../ai/repurposeGenerator';

// Default registry wired with the real generators. The agents wrap generation
// with BrandGuardian validation; the page/hook layer records history separately.
export const agents = {
  content: new ContentAgent((input, ctx) => generateContent(input, ctx.brand, ctx.recent).result),
  script: new ScriptAgent((input, ctx) => generateScript(input, ctx.brand, ctx.recent).result),
  review: new ReviewAgent((input, ctx) => generateReviewResponse(input, ctx.brand, ctx.recent).result),
  social: new SocialAgent((input, ctx) => generateSocialReplies(input, ctx.brand, ctx.recent).result),
  repurpose: new RepurposeAgent((input, ctx) => repurposeContent(input, ctx.brand, ctx.recent).result),
  brandGuardian: new BrandGuardianAgent(),
} as const;

export type AgentRegistry = typeof agents;
