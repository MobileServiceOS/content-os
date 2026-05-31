// Google Gemini provider — a thin binding over the generic LLM provider.
import { makeLlmProvider, type LlmContentProvider } from './llmProvider';
import type { GenerateTransport } from '../functionsClient';

export const makeGeminiProvider = (businessId: string, transport?: GenerateTransport): LlmContentProvider =>
  makeLlmProvider('gemini', businessId, transport);
