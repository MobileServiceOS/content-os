// Shared agent machinery: trace logging + safe run wrapper. Subclasses implement
// execute(); run() captures a step trace and surfaces errors as a final step.
import type {
  Agent,
  AgentContext,
  AgentResult,
  AgentStep,
  StepStatus,
} from './types';

export abstract class BaseAgent<I, O> implements Agent<I, O> {
  abstract readonly name: string;
  protected steps: AgentStep[] = [];

  protected step(label: string, status: StepStatus, detail?: string): void {
    this.steps.push({ label, status, detail });
  }

  protected result(output: O, guardian?: AgentResult<O>['guardian']): AgentResult<O> {
    return { agent: this.name, output, steps: this.steps, guardian };
  }

  async run(input: I, ctx: AgentContext): Promise<AgentResult<O>> {
    this.steps = [];
    try {
      return await this.execute(input, ctx);
    } catch (err) {
      this.step('execute', 'error', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  protected abstract execute(input: I, ctx: AgentContext): Promise<AgentResult<O>>;
}
