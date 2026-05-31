// Real-LLM provider stub. Wiring a Claude/OpenAI key happens behind a serverless
// function later (the key must never ship to the browser). Until then this throws,
// and the engine stays on the mock provider.
import type { GenerationProvider, ProviderRequest } from './types';
import { NotConfiguredError } from './types';
import type { GeneratedBlock } from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export class ClaudeProvider implements GenerationProvider {
  readonly name = 'claude';

  generateBlock(
    _pr: ProviderRequest,
    _brand: BrandSettings,
    _avoidStructureIds: string[],
  ): GeneratedBlock {
    throw new NotConfiguredError(
      'Claude provider is not configured. Generation runs on the mock provider until an LLM backend is wired up via a serverless function.',
    );
  }
}

export const claudeProvider = new ClaudeProvider();
