// Future: OpenAI provider. Not implemented yet.
import { UnconfiguredProvider } from './unconfigured';

export class OpenAIProvider extends UnconfiguredProvider {
  readonly name = 'openai' as const;
}

export const openaiContentProvider = new OpenAIProvider();
