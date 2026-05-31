// Anthropic Claude provider — a thin binding over the generic LLM provider.
import { makeLlmProvider, LlmContentProvider } from './llmProvider';
import type { GenerateTransport } from '../functionsClient';

export { LlmContentProvider };

export const makeClaudeProvider = (businessId: string, transport?: GenerateTransport): LlmContentProvider =>
  makeLlmProvider('claude', businessId, transport);
