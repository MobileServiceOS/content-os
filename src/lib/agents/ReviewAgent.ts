import { GenerationAgent } from './GenerationAgent';
import { mockReview } from './mocks';
import type { AgentContext, GeneratorFn } from './types';
import type { ReviewRequest, ReviewResult } from '../../types/generation';

export class ReviewAgent extends GenerationAgent<ReviewRequest, ReviewResult> {
  readonly name = 'ReviewAgent';

  constructor(generate: GeneratorFn<ReviewRequest, ReviewResult> = mockReview) {
    super(generate);
  }

  protected extractTexts(o: ReviewResult): string[] {
    return [o.short, o.professional, o.seoFriendly];
  }

  protected recentFor(ctx: AgentContext): string[] {
    return ctx.recent.review ?? [];
  }
}
