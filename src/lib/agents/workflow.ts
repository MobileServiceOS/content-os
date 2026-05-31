// Placeholder workflow-automation agents. Interfaces are defined now to support
// future autonomous approval + publishing flows; execute() throws until built.
// NO implementation yet, and no posting APIs are wired (per MVP scope).
import { BaseAgent } from './BaseAgent';
import { NotImplementedError } from './types';
import type { AgentContext, AgentResult } from './types';
import type { Platform } from '../../types/generation';
import type { ContentStatus } from '../../types/models';

export interface ApprovalRequest {
  contentItemId: string;
  requestedBy: string;
}

export interface ApprovalResult {
  contentItemId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer?: string;
  note?: string;
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

export class ApprovalWorkflowAgent extends BaseAgent<ApprovalRequest, ApprovalResult> {
  readonly name = 'ApprovalWorkflowAgent';
  protected async execute(_input: ApprovalRequest, _ctx: AgentContext): Promise<AgentResult<ApprovalResult>> {
    throw new NotImplementedError(this.name);
  }
}

export class PublishingAgent extends BaseAgent<PublishRequest, PublishResult> {
  readonly name = 'PublishingAgent';
  protected async execute(_input: PublishRequest, _ctx: AgentContext): Promise<AgentResult<PublishResult>> {
    throw new NotImplementedError(this.name);
  }
}
