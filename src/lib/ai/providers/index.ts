// Provider layer. Pages resolve a provider per business via providerFor(); agents
// use the mock default. LLM providers (claude/openai/gemini) bind to the tenant
// (they need businessId for the function call); mock is a singleton. Generators
// never import a concrete provider.
import type { ContentProvider } from './types';
import type { BrandSettings } from '../../../types/models';
import { mockContentProvider } from './mockProvider';

export type { ContentProvider, ProviderOutput } from './types';
export { MockContentProvider, mockContentProvider } from './mockProvider';
export { LlmContentProvider, makeLlmProvider } from './llmProvider';
export { makeClaudeProvider } from './claudeProvider';
export { makeOpenAIProvider } from './openaiProvider';
export { makeGeminiProvider } from './geminiProvider';

/** Resolve the active content provider. Mock/template only: the serverless LLM
 *  `generate` function was removed (no LLM keys were ever configured), so the
 *  claude/openai/gemini providers are unwired. Generation runs on templates. */
export function providerFor(_brand: BrandSettings | null, _businessId: string | null): ContentProvider {
  return mockContentProvider;
}

// Agents use the mock default (the page path uses providerFor instead).
export function getActiveProvider(): ContentProvider {
  return mockContentProvider;
}
