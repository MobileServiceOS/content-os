// Provider registry. The app + agents call getActiveProvider() — never a concrete
// provider. Swap providers here (or via setActiveProvider) without touching any
// generator or UI code.
import type { ContentProvider } from './types';
import type { ProviderName } from '../cost';
import { mockContentProvider } from './mockProvider';
import { claudeContentProvider } from './claudeProvider';
import { openaiContentProvider } from './openaiProvider';
import { geminiContentProvider } from './geminiProvider';

export type { ContentProvider, ProviderOutput } from './types';
export { MockContentProvider, mockContentProvider } from './mockProvider';
export { ClaudeProvider, claudeContentProvider } from './claudeProvider';
export { OpenAIProvider, openaiContentProvider } from './openaiProvider';
export { GeminiProvider, geminiContentProvider } from './geminiProvider';

export const PROVIDERS: Record<ProviderName, ContentProvider> = {
  mock: mockContentProvider,
  claude: claudeContentProvider,
  openai: openaiContentProvider,
  gemini: geminiContentProvider,
};

// Current provider is the mock until an LLM backend is wired up.
let active: ContentProvider = mockContentProvider;

export function getActiveProvider(): ContentProvider {
  return active;
}

export function setActiveProvider(name: ProviderName): void {
  active = PROVIDERS[name];
}
