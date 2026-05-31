import { GenerationAgent } from './GenerationAgent';
import { mockSocial } from './mocks';
import type { AgentContext, GeneratorFn } from './types';
import type { SocialRequest, SocialResult } from '../../types/generation';

export class SocialAgent extends GenerationAgent<SocialRequest, SocialResult> {
  readonly name = 'SocialAgent';

  constructor(generate: GeneratorFn<SocialRequest, SocialResult> = mockSocial) {
    super(generate);
  }

  protected extractTexts(o: SocialResult): string[] {
    return o.replies;
  }

  protected recentFor(ctx: AgentContext): string[] {
    return ctx.recent.reply ?? [];
  }
}
