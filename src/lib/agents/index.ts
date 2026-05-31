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

export const agents = {
  content: new ContentAgent(),
  script: new ScriptAgent(),
  review: new ReviewAgent(),
  social: new SocialAgent(),
  repurpose: new RepurposeAgent(),
  brandGuardian: new BrandGuardianAgent(),
} as const;

export type AgentRegistry = typeof agents;
