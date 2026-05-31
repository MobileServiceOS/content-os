// OpenAI provider — a thin binding over the generic LLM provider.
import { makeLlmProvider, type LlmContentProvider } from './llmProvider';
import type { GenerateTransport } from '../functionsClient';

export const makeOpenAIProvider = (businessId: string, transport?: GenerateTransport): LlmContentProvider =>
  makeLlmProvider('openai', businessId, transport);
