// Provider layer. Pages resolve a provider per business via providerFor(); agents
// use a global default. Claude is per-tenant (needs businessId for the function
// call); mock/openai/gemini are singletons. Generators never import a concrete one.
import type { ContentProvider } from './types';
import type { ProviderName } from '../cost';
import type { BrandSettings } from '../../../types/models';
import { mockContentProvider } from './mockProvider';
import { openaiContentProvider } from './openaiProvider';
import { geminiContentProvider } from './geminiProvider';
import { makeClaudeProvider } from './claudeProvider';

export type { ContentProvider, ProviderOutput } from './types';
export { MockContentProvider, mockContentProvider } from './mockProvider';
export { ClaudeContentProvider, makeClaudeProvider } from './claudeProvider';
export { OpenAIProvider, openaiContentProvider } from './openaiProvider';
export { GeminiProvider, geminiContentProvider } from './geminiProvider';

// Singletons that need no per-business context.
const SINGLETONS: Record<Exclude<ProviderName, 'claude'>, ContentProvider> = {
  mock: mockContentProvider,
  openai: openaiContentProvider,
  gemini: geminiContentProvider,
};

/** Resolve the active provider for a business. Claude binds to the tenant. */
export function providerFor(brand: BrandSettings | null, businessId: string | null): ContentProvider {
  const name: ProviderName = brand?.provider ?? 'mock';
  if (name === 'claude') return businessId ? makeClaudeProvider(businessId) : mockContentProvider;
  return SINGLETONS[name] ?? mockContentProvider;
}

// Agents use a global default (the page path uses providerFor instead).
let active: ContentProvider = mockContentProvider;
export function getActiveProvider(): ContentProvider {
  return active;
}
export function setActiveProvider(name: Exclude<ProviderName, 'claude'>): void {
  active = SINGLETONS[name];
}
