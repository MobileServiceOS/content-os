// Agent framework contracts. Agents are thin orchestrators over the generation
// engine + the BrandGuardian, designed to support future autonomous workflows
// (multi-step generation, self-critique, regeneration loops).
import type { BrandSettings } from '../../types/models';
import type { RecentByType } from '../../types/generation';

export interface AgentContext {
  businessId: string;
  uid: string;
  brand: BrandSettings;
  recent: RecentByType;
}

export type StepStatus = 'ok' | 'warn' | 'regenerated' | 'error';

export interface AgentStep {
  label: string;
  status: StepStatus;
  detail?: string;
}

/** What the BrandGuardian reports about a piece of generated text. */
export interface GuardianReport {
  passed: boolean;
  // Five scoring dimensions (0..1).
  uniqueness: number;
  readability: number;
  engagement: number;
  brandAlignment: number;
  localRelevance: number;
  // Findings.
  bannedPhrases: string[];
  bannedOpeners: string[];
  keywordStuffing: boolean;
  duplicateStructure: boolean;
  repetitive: boolean;
  notes: string[];
}

export interface AgentResult<O> {
  agent: string;
  output: O;
  steps: AgentStep[];
  guardian?: GuardianReport;
}

export interface Agent<I, O> {
  readonly name: string;
  run(input: I, ctx: AgentContext): Promise<AgentResult<O>>;
}

/** A generation function an agent wraps. Mock today, LLM-backed later. */
export type GeneratorFn<I, O> = (input: I, ctx: AgentContext) => O | Promise<O>;
