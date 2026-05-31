// Provider layer. Pages resolve a provider per business via providerFor(); agents
// use the mock default. LLM providers (claude/openai/gemini) bind to the tenant
// (they need businessId for the function call); mock is a singleton. Generators
// never import a concrete provider.
import type { ContentProvider } from './types';
import type { BrandSettings } from '../../../types/models';
import { mockContentProvider } from './mockProvider';
import { makeLlmProvider, type LlmName } from './llmProvider';

export type { ContentProvider, ProviderOutput } from './types';
export { MockContentProvider, mockContentProvider } from './mockProvider';
export { LlmContentProvider, makeLlmProvider } from './llmProvider';
export { makeClaudeProvider } from './claudeProvider';
export { makeOpenAIProvider } from './openaiProvider';
export { makeGeminiProvider } from './geminiProvider';

/** Resolve the active provider for a business. LLM providers bind to the tenant. */
export function providerFor(brand: BrandSettings | null, businessId: string | null): ContentProvider {
  const name = brand?.provider ?? 'mock';
  if (name === 'mock') return mockContentProvider;
  return businessId ? makeLlmProvider(name as LlmName, businessId) : mockContentProvider;
}

// Agents use the mock default (the page path uses providerFor instead).
export function getActiveProvider(): ContentProvider {
  return mockContentProvider;
}
