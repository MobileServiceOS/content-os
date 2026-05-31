import { GenerationAgent } from './GenerationAgent';
import { mockScript } from './mocks';
import type { AgentContext, GeneratorFn } from './types';
import type { ScriptRequest, ScriptResult } from '../../types/generation';

export class ScriptAgent extends GenerationAgent<ScriptRequest, ScriptResult> {
  readonly name = 'ScriptAgent';

  constructor(generate: GeneratorFn<ScriptRequest, ScriptResult> = mockScript) {
    super(generate);
  }

  protected extractTexts(o: ScriptResult): string[] {
    return [o.hook, o.script, o.cta];
  }

  protected recentFor(ctx: AgentContext): string[] {
    return ctx.recent.script ?? [];
  }
}
