import { GenerationAgent } from './GenerationAgent';
import { mockContent } from './mocks';
import type { AgentContext, GeneratorFn } from './types';
import type { GenerationRequest, GenerationResult } from '../../types/generation';

export class ContentAgent extends GenerationAgent<GenerationRequest, GenerationResult> {
  readonly name = 'ContentAgent';

  constructor(generate: GeneratorFn<GenerationRequest, GenerationResult> = mockContent) {
    super(generate);
  }

  protected extractTexts(o: GenerationResult): string[] {
    return [o.hook?.text, o.caption?.text, o.cta?.text].filter(Boolean) as string[];
  }

  protected recentFor(ctx: AgentContext): string[] {
    return ctx.recent.caption ?? [];
  }
}
