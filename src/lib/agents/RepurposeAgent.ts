import { GenerationAgent } from './GenerationAgent';
import { mockRepurpose } from './mocks';
import type { AgentContext, GeneratorFn } from './types';
import type { RepurposeRequest, RepurposeResult } from '../../types/generation';

export class RepurposeAgent extends GenerationAgent<RepurposeRequest, RepurposeResult> {
  readonly name = 'RepurposeAgent';

  constructor(generate: GeneratorFn<RepurposeRequest, RepurposeResult> = mockRepurpose) {
    super(generate);
  }

  protected extractTexts(o: RepurposeResult): string[] {
    return [...o.hooks, ...o.captions, o.shortScript, o.socialPost];
  }

  protected recentFor(ctx: AgentContext): string[] {
    return ctx.recent.caption ?? [];
  }
}
