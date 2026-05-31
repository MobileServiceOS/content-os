// Workflow-automation agents. ApprovalWorkflowAgent is implemented (Level 3.5);
// PublishingAgent stays a placeholder until Phase 5 (no posting APIs yet).
import { BaseAgent } from './BaseAgent';
import { NotImplementedError } from './types';
import type { AgentContext, AgentResult } from './types';
import type { Platform } from '../../types/generation';
import type { ContentStatus } from '../../types/models';

export type ApprovalDecision = 'approved' | 'rejected';

export interface ApprovalRequest {
  refId: string;
  refKind: string; // 'contentItems' | 'gbpPosts' | 'seoContent'
  decision: ApprovalDecision;
  reviewer: string;
}

export interface ApprovalResult {
  refId: string;
  refKind: string;
  status: ApprovalDecision;
  reviewer: string;
}

export interface PublishRequest {
  contentItemId: string;
  platform: Platform;
  scheduledAt?: number;
}

export interface PublishResult {
  contentItemId: string;
  status: ContentStatus;
  externalId?: string;
}

// Records an approval decision (the Firestore transition happens in the hook
// layer). Provides a consistent agent step + result for the activity feed.
export class ApprovalWorkflowAgent extends BaseAgent<ApprovalRequest, ApprovalResult> {
  readonly name = 'ApprovalWorkflowAgent';
  protected async execute(input: ApprovalRequest, _ctx: AgentContext): Promise<AgentResult<ApprovalResult>> {
    this.step('decision', input.decision === 'approved' ? 'ok' : 'warn', `${input.decision} ${input.refKind}/${input.refId}`);
    return this.result({ refId: input.refId, refKind: input.refKind, status: input.decision, reviewer: input.reviewer });
  }
}

export class PublishingAgent extends BaseAgent<PublishRequest, PublishResult> {
  readonly name = 'PublishingAgent';
  protected async execute(_input: PublishRequest, _ctx: AgentContext): Promise<AgentResult<PublishResult>> {
    throw new NotImplementedError(this.name);
  }
}
