import { describe, it, expect } from 'vitest';
import { ApprovalWorkflowAgent } from './workflow';
import type { AgentContext } from './types';
import type { BrandSettings } from '../../types/models';

const brand = { businessName: 'Wheel Rush', serviceAreas: [], services: [], notOffered: [], socialHandles: [], ctas: [], localKeywords: [], bannedPhrases: [], requiredPhrases: [], brandTone: '', website: '', phone: '' } as BrandSettings;
const ctx: AgentContext = { businessId: 'b', uid: 'u', brand, recent: { hook: [], caption: [], cta: [], script: [], review: [], reply: [] } };

describe('ApprovalWorkflowAgent', () => {
  it('records an approval decision with a trace step', async () => {
    const res = await new ApprovalWorkflowAgent().run({ refId: 'x1', refKind: 'gbpPosts', decision: 'approved', reviewer: 'owner' }, ctx);
    expect(res.output.status).toBe('approved');
    expect(res.output.refKind).toBe('gbpPosts');
    expect(res.steps.some((s) => s.label === 'decision')).toBe(true);
  });

  it('records a rejection as a warn step', async () => {
    const res = await new ApprovalWorkflowAgent().run({ refId: 'x2', refKind: 'contentItems', decision: 'rejected', reviewer: 'owner' }, ctx);
    expect(res.output.status).toBe('rejected');
    expect(res.steps.find((s) => s.label === 'decision')?.status).toBe('warn');
  });
});
