// Base for generation agents. Wraps a generator function, then runs the
// BrandGuardian over the produced text and attaches the report + trace.
// Future autonomous workflows can extend execute() with regeneration loops.
import { BaseAgent } from './BaseAgent';
import { BrandGuardianAgent } from './BrandGuardianAgent';
import type { AgentContext, AgentResult, GeneratorFn } from './types';

export abstract class GenerationAgent<I, O> extends BaseAgent<I, O> {
  protected guardian = new BrandGuardianAgent();
  protected generate: GeneratorFn<I, O>;

  constructor(generate: GeneratorFn<I, O>) {
    super();
    this.generate = generate;
  }

  /** The guardian-checkable text blocks from an output. */
  protected abstract extractTexts(output: O): string[];

  /** Recent outputs of the same kind to compare against (override per agent). */
  protected recentFor(_ctx: AgentContext): string[] {
    return [];
  }

  protected async execute(input: I, ctx: AgentContext): Promise<AgentResult<O>> {
    this.step('generate', 'ok', `${this.name} generating`);
    const output = await this.generate(input, ctx);
    const text = this.extractTexts(output).join('\n\n');
    const guardian = this.guardian.review(text, ctx, this.recentFor(ctx));
    this.step('guardian', guardian.passed ? 'ok' : 'warn', guardian.notes.join('; ') || 'clean');
    return this.result(output, guardian);
  }
}
