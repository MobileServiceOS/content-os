// Future: Google Gemini provider. Not implemented yet.
import { UnconfiguredProvider } from './unconfigured';

export class GeminiProvider extends UnconfiguredProvider {
  readonly name = 'gemini' as const;
}

export const geminiContentProvider = new GeminiProvider();
