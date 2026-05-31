// Aggregates everything awaiting approval (content / GBP / SEO) into one queue,
// supports inline edit + approve/reject + approve-and-schedule, and logs decisions
// through the ApprovalWorkflowAgent.
import { useMemo } from 'react';
import { useContentItems } from './useContentItems';
import { useGbpPosts } from './useGbpPosts';
import { useSeoContent } from './useSeoContent';
import { useCalendarItems } from './useCalendarItems';
import { useAgentLogs } from './useAgentLogs';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import type { ApprovalDecision } from '../lib/agents/workflow';
import { noon } from '../lib/date';
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
  const { posts: gbp, update: updateGbp, setApproval: setGbp } = useGbpPosts();
  const { items: seo, update: updateSeo, setApproval: setSeo } = useSeoContent();
  const { create: createCal } = useCalendarItems();
  const { log } = useAgentLogs();

  const items = useMemo<QueueItem[]>(() => {
    const c = content.filter((i) => !i.archived && i.approvalState === 'pending_approval').map((i) => ({ kind: 'content' as const, id: i.id, title: i.title, preview: i.content }));
    const g = gbp.filter((p) => p.approvalState === 'pending_approval').map((p) => ({ kind: 'gbp' as const, id: p.id, title: 'GBP post', preview: p.description }));
    const s = seo.filter((x) => x.approvalState === 'pending_approval').map((x) => ({ kind: 'seo' as const, id: x.id, title: x.title, preview: x.body }));
    return [...c, ...g, ...s];
  }, [content, gbp, seo]);

  async function logDecision(item: QueueItem, decision: ApprovalDecision, extra = '') {
    if (!brand || !businessId || !user) return;
    const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
    const reviewer = user.displayName || user.email || user.uid;
    const r = await agents.approval.run({ refId: item.id, refKind: REF_KIND[item.kind], decision, reviewer }, ctx);
    await log({ agent: 'ApprovalWorkflowAgent', action: decision, summary: `${decision}${extra} ${item.kind}: ${item.title}`, refId: item.id, refKind: r.output.refKind });
  }

  /** Edit the underlying text (content / GBP description / SEO body). */
  async function edit(item: QueueItem, text: string): Promise<void> {
    if (item.kind === 'content') await updateContent(item.id, { content: text });
    else if (item.kind === 'gbp') await updateGbp(item.id, { description: text });
    else await updateSeo(item.id, { body: text });
  }

  async function decide(item: QueueItem, decision: ApprovalDecision): Promise<void> {
    if (item.kind === 'content') await updateContent(item.id, { approvalState: decision, status: decision === 'approved' ? 'approved' : 'draft' });
    else if (item.kind === 'gbp') await setGbp(item.id, decision);
    else await setSeo(item.id, decision);
    await logDecision(item, decision);
  }

  /** Approve a content item and place it on the calendar (today). */
  async function approveAndSchedule(item: QueueItem): Promise<void> {
    if (item.kind !== 'content') return decide(item, 'approved');
    await updateContent(item.id, { approvalState: 'approved', status: 'scheduled' });
    await createCal({ contentItemId: item.id, title: item.title, scheduledAt: noon(Date.now()), status: 'scheduled' });
    await logDecision(item, 'approved', ' + scheduled');
  }

  const approve = (item: QueueItem) => decide(item, 'approved');
  const reject = (item: QueueItem) => decide(item, 'rejected');
  async function approveAll(kind?: QueueKind): Promise<void> {
    for (const i of items.filter((x) => !kind || x.kind === kind)) await decide(i, 'approved');
  }

  return { items, approve, reject, approveAll, edit, approveAndSchedule };
}
