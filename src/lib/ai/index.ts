// Public surface of the AI generation layer.
export * from './types';
export { generateBlock, resolveConfig, type EngineResult } from './engine';
export { mockProvider, MockProvider } from './provider.mock';
export { claudeProvider, ClaudeProvider } from './provider.claude';
export { substitute } from './tokens';
export { toRecord, aggregateQuality, type GeneratedRecord } from './shared';

export { generateContent, type ContentOutput } from './contentGenerators';
export { generateScript, type ScriptOutput } from './scriptGenerator';
export { generateReviewResponse, type ReviewOutput } from './reviewResponseGenerator';
export { generateSocialReplies, type SocialOutput } from './socialReplyGenerator';
export { repurposeContent, type RepurposeOutput } from './repurposeGenerator';
