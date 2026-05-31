// Future: Anthropic Claude provider. Not implemented yet.
import { UnconfiguredProvider } from './unconfigured';

export class ClaudeProvider extends UnconfiguredProvider {
  readonly name = 'claude' as const;
}

export const claudeContentProvider = new ClaudeProvider();
