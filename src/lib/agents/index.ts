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
// Media agents (Phase 3 — wrap the image/video provider layer).
export { ImageAgent, ThumbnailAgent, VideoAgent } from './media';
// Future-proof placeholders (interfaces defined; not implemented).
export { ApprovalWorkflowAgent, PublishingAgent } from './workflow';
export type { ApprovalRequest, ApprovalResult, PublishRequest, PublishResult } from './workflow';

import { ContentAgent } from './ContentAgent';
import { ScriptAgent } from './ScriptAgent';
import { ReviewAgent } from './ReviewAgent';
import { SocialAgent } from './SocialAgent';
import { RepurposeAgent } from './RepurposeAgent';
import { BrandGuardianAgent } from './BrandGuardianAgent';
import { ImageAgent, ThumbnailAgent, VideoAgent } from './media';
import { getActiveProvider } from '../ai/providers';

// Default registry routed through the active ContentProvider (the provider layer)
// — never a concrete provider. Swapping providers requires no change here. The
// agents wrap generation with BrandGuardian validation; the page/hook layer
// records history + cost separately.
export const agents = {
  content: new ContentAgent(async (input, ctx) => (await getActiveProvider().generateContent(input, ctx.brand, ctx.recent)).result),
  script: new ScriptAgent(async (input, ctx) => (await getActiveProvider().generateScript(input, ctx.brand, ctx.recent)).result),
  review: new ReviewAgent(async (input, ctx) => (await getActiveProvider().generateReviewResponse(input, ctx.brand, ctx.recent)).result),
  social: new SocialAgent(async (input, ctx) => (await getActiveProvider().generateSocialReply(input, ctx.brand, ctx.recent)).result),
  repurpose: new RepurposeAgent(async (input, ctx) => (await getActiveProvider().repurposeContent(input, ctx.brand, ctx.recent)).result),
  brandGuardian: new BrandGuardianAgent(),
  image: new ImageAgent(),
  thumbnail: new ThumbnailAgent(),
  video: new VideoAgent(),
} as const;

export type AgentRegistry = typeof agents;
