// Aggregates everything awaiting approval (content / GBP / SEO) into one queue,
// and runs decisions through the ApprovalWorkflowAgent + activity log.
import { useMemo } from 'react';
import { useContentItems } from './useContentItems';
import { useGbpPosts } from './useGbpPosts';
import { useSeoContent } from './useSeoContent';
import { useAgentLogs } from './useAgentLogs';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import type { ApprovalDecision } from '../lib/agents/workflow';
import type { RecentByType } from '../types/generation';

export type QueueKind = 'content' | 'gbp' | 'seo';
export interface QueueItem {
  kind: QueueKind;
  id: string;
  title: string;
  preview: string;
}

const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });
const REF_KIND: Record<QueueKind, string> = { content: 'contentItems', gbp: 'gbpPosts', seo: 'seoContent' };

export function useApprovalQueue() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { items: content, update: updateContent } = useContentItems();
  const { posts: gbp, setApproval: setGbp } = useGbpPosts();
  const { items: seo, setApproval: setSeo } = useSeoContent();
  const { log } = useAgentLogs();

  const items = useMemo<QueueItem[]>(() => {
    const c = content.filter((i) => !i.archived && i.approvalState === 'pending_approval').map((i) => ({ kind: 'content' as const, id: i.id, title: i.title, preview: i.content }));
    const g = gbp.filter((p) => p.approvalState === 'pending_approval').map((p) => ({ kind: 'gbp' as const, id: p.id, title: 'GBP post', preview: p.description }));
    const s = seo.filter((x) => x.approvalState === 'pending_approval').map((x) => ({ kind: 'seo' as const, id: x.id, title: x.title, preview: x.body }));
    return [...c, ...g, ...s];
  }, [content, gbp, seo]);

  async function decide(item: QueueItem, decision: ApprovalDecision): Promise<void> {
    if (item.kind === 'content') await updateContent(item.id, { approvalState: decision, status: decision === 'approved' ? 'approved' : 'draft' });
    else if (item.kind === 'gbp') await setGbp(item.id, decision);
    else await setSeo(item.id, decision);

    if (brand && businessId && user) {
      const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
      const reviewer = user.displayName || user.email || user.uid;
      const r = await agents.approval.run({ refId: item.id, refKind: REF_KIND[item.kind], decision, reviewer }, ctx);
      await log({ agent: 'ApprovalWorkflowAgent', action: decision, summary: `${decision} ${item.kind}: ${item.title}`, refId: item.id, refKind: r.output.refKind });
    }
  }

  const approve = (item: QueueItem) => decide(item, 'approved');
  const reject = (item: QueueItem) => decide(item, 'rejected');
  async function approveAll(): Promise<void> {
    for (const i of [...items]) await decide(i, 'approved');
  }

  return { items, approve, reject, approveAll };
}
