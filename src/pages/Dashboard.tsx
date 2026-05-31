// Command Center — the Level 3 dashboard. Aggregates agents, content, reputation,
// GBP, local SEO, tasks, the approval queue, and the agent activity feed.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { onSnapshot } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useContentItems } from '../hooks/useContentItems';
import { useGbpPosts } from '../hooks/useGbpPosts';
import { useSeoContent } from '../hooks/useSeoContent';
import { useTasks } from '../hooks/useTasks';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { useMediaItems } from '../hooks/useMediaItems';
import { reviewResponsesCol, socialRepliesCol } from '../lib/firebase/paths';
import { agents } from '../lib/agents';

const ACCENT = {
  violet: 'var(--c-violet)', blue: 'var(--c-blue)', cyan: 'var(--c-cyan)',
  emerald: 'var(--c-emerald)', amber: 'var(--c-amber)', pink: 'var(--c-pink)', orange: 'var(--c-orange)',
} as const;
type Accent = keyof typeof ACCENT;

function Stat({ label, value, accent }: { label: string; value: number | string; accent: Accent }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: ACCENT[accent] }}>
      <div className="stat-value">{value}</div>
      <div className="muted" style={{ fontSize: '0.78rem' }}>{label}</div>
    </div>
  );
}

function Section({ title, children, to, cta, accent }: { title: string; children: ReactNode; to?: string; cta?: string; accent: Accent }) {
  return (
    <div className="card stack" style={{ marginTop: 16 }}>
      <div className="row between">
        <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: ACCENT[accent] }} />{title}</h2>
        {to && <Link className="btn btn-sm" to={to}>{cta ?? 'Open'}</Link>}
      </div>
      {children}
    </div>
  );
}

const ago = (ms: number): string => {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const QUICK = [
  { to: '/new-job', label: 'New Job' },
  { to: '/generator', label: 'Caption' },
  { to: '/gbp', label: 'GBP' },
  { to: '/seo', label: 'SEO' },
  { to: '/engagement', label: 'Engage' },
];

export default function Dashboard() {
  const { brand, businessId } = useBusiness();
  const { items: content } = useContentItems();
  const { posts: gbp } = useGbpPosts();
  const { items: seo } = useSeoContent();
  const { tasks } = useTasks();
  const { logs } = useAgentLogs(15);
  const { items: media } = useMediaItems();
  const [reviewCount, setReviewCount] = useState(0);
  const [socialCount, setSocialCount] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    const a = onSnapshot(reviewResponsesCol(businessId), (s) => setReviewCount(s.size));
    const b = onSnapshot(socialRepliesCol(businessId), (s) => setSocialCount(s.size));
    return () => { a(); b(); };
  }, [businessId]);

  const active = useMemo(() => content.filter((i) => !i.archived), [content]);
  const m = useMemo(() => {
    const pendingContent = active.filter((i) => i.approvalState === 'pending_approval').length;
    const pendingGbp = gbp.filter((p) => p.approvalState === 'pending_approval').length;
    const pendingSeo = seo.filter((x) => x.approvalState === 'pending_approval').length;
    const cities = new Set<string>([...seo.map((x) => x.city ?? ''), ...active.map((x) => x.city)].filter(Boolean));
    const services = new Set<string>([...seo.map((x) => x.service ?? ''), ...active.map((x) => x.service)].filter(Boolean));
    return {
      drafts: active.filter((i) => i.status === 'draft').length,
      approved: active.filter((i) => i.status === 'approved').length,
      scheduled: active.filter((i) => i.status === 'scheduled').length,
      posted: active.filter((i) => i.status === 'posted').length,
      pendingContent, pendingGbp, pendingSeo,
      pendingApprovals: pendingContent + pendingGbp + pendingSeo,
      tasksPending: tasks.filter((t) => t.status === 'pending').length,
      tasksDone: tasks.filter((t) => t.status === 'done').length,
      tasksAgent: tasks.filter((t) => t.createdByAgent).length,
      tasksHigh: tasks.filter((t) => t.status === 'pending' && t.priority === 'high').length,
      gbpTasks: tasks.filter((t) => t.status === 'pending' && t.category === 'gbp').length,
      faqs: seo.filter((x) => x.type === 'faq').length,
      cityCov: `${cities.size}/${brand?.serviceAreas.length ?? 0}`,
      serviceCov: `${services.size}/${brand?.services.length ?? 0}`,
    };
  }, [active, gbp, seo, tasks, brand]);

  return (
    <>
      <PageHeader
        title={brand?.businessName ?? 'Command Center'}
        subtitle="Your business agents at a glance"
        actions={<RoleGate action="content.create"><Link className="btn btn-primary btn-sm" to="/new-job">+ New Job</Link></RoleGate>}
      />

      <RoleGate action="content.create">
        <div className="row" style={{ marginBottom: 4 }}>
          {QUICK.map((q) => <Link key={q.to} className="btn btn-sm" to={q.to}>{q.label}</Link>)}
        </div>
      </RoleGate>

      <Section title="Agent overview" accent="violet">
        <div className="grid grid-3">
          <Stat label="Agents active" value={Object.keys(agents).length} accent="violet" />
          <Stat label="Tasks completed" value={m.tasksDone} accent="emerald" />
          <Stat label="Pending approvals" value={m.pendingApprovals} accent="orange" />
          <Stat label="Content items" value={active.length} accent="blue" />
          <Stat label="Review responses" value={reviewCount} accent="pink" />
          <Stat label="Social replies" value={socialCount} accent="cyan" />
        </div>
      </Section>

      <Section title="Content" to="/library" cta="Library" accent="blue">
        <div className="grid grid-2">
          <Stat label="Draft" value={m.drafts} accent="blue" />
          <Stat label="Approved" value={m.approved} accent="emerald" />
          <Stat label="Scheduled" value={m.scheduled} accent="amber" />
          <Stat label="Posted" value={m.posted} accent="cyan" />
        </div>
      </Section>

      <Section title="Reputation" to="/review" cta="Review" accent="pink">
        <div className="grid grid-3">
          <Stat label="Review responses" value={reviewCount} accent="pink" />
          <Stat label="Social replies" value={socialCount} accent="cyan" />
          <Stat label="Approved content" value={m.approved} accent="emerald" />
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>Live review ingest arrives with the GBP API (Phase 5).</p>
      </Section>

      <Section title="GBP" to="/gbp" cta="GBP Studio" accent="amber">
        <div className="grid grid-2">
          <Stat label="GBP posts" value={gbp.length} accent="amber" />
          <Stat label="Pending GBP" value={m.pendingGbp} accent="orange" />
          <Stat label="Media assets" value={media.length} accent="violet" />
          <Stat label="GBP tasks" value={m.gbpTasks} accent="blue" />
        </div>
      </Section>

      <Section title="Local SEO" to="/seo" cta="SEO Studio" accent="cyan">
        <div className="grid grid-2">
          <Stat label="SEO content" value={seo.length} accent="cyan" />
          <Stat label="FAQ pieces" value={m.faqs} accent="blue" />
          <Stat label="City coverage" value={m.cityCov} accent="emerald" />
          <Stat label="Service coverage" value={m.serviceCov} accent="violet" />
        </div>
      </Section>

      <Section title="Tasks" to="/tasks" cta="Tasks" accent="emerald">
        <div className="grid grid-2">
          <Stat label="Pending" value={m.tasksPending} accent="amber" />
          <Stat label="Agent-created" value={m.tasksAgent} accent="violet" />
          <Stat label="Completed" value={m.tasksDone} accent="emerald" />
          <Stat label="High priority" value={m.tasksHigh} accent="pink" />
        </div>
      </Section>

      <Section title="Approval queue" to="/approvals" cta="Open queue" accent="orange">
        <div className="grid grid-3">
          <Stat label="Content" value={m.pendingContent} accent="blue" />
          <Stat label="GBP" value={m.pendingGbp} accent="amber" />
          <Stat label="SEO" value={m.pendingSeo} accent="cyan" />
        </div>
      </Section>

      <Section title="Agent activity feed" accent="violet">
        {logs.length === 0 ? (
          <p className="muted">No agent activity yet. Generate something to see it here.</p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {logs.map((l) => (
              <div key={l.id} className="row between">
                <div>
                  <span className="tag" style={{ marginRight: 6 }}>{l.agent}</span>
                  <span style={{ fontSize: '0.9rem' }}>{l.summary}</span>
                </div>
                <span className="muted" style={{ fontSize: '0.74rem' }}>{ago(l.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
