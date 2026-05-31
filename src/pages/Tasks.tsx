// Task Overview + Task Agent: generate suggested marketing tasks across SEO / GBP
// / review / content, add them to the tasks collection, and manage them.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { SelectField } from '../components/ui/Field';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import type { GeneratedTask } from '../lib/ai/level3';
import type { TaskCategory } from '../types/level3';
import type { RecentByType } from '../types/generation';

const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });
const FOCI: { value: TaskCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All areas' },
  { value: 'gbp', label: 'GBP' },
  { value: 'seo', label: 'Local SEO' },
  { value: 'review', label: 'Reviews' },
  { value: 'content', label: 'Content' },
];
const PRIORITY_BADGE: Record<string, string> = { high: 'badge-scheduled', medium: 'badge-posted', low: 'badge-draft' };

export default function Tasks() {
  const { brand, businessId, role } = useBusiness();
  const { user } = useAuth();
  const { tasks, create, setStatus, remove } = useTasks();
  const { log } = useAgentLogs();

  const [focus, setFocus] = useState<TaskCategory | 'all'>('all');
  const [suggested, setSuggested] = useState<GeneratedTask[]>([]);
  const [busy, setBusy] = useState(false);

  const pending = useMemo(() => tasks.filter((t) => t.status === 'pending'), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.status === 'done'), [tasks]);

  async function suggest() {
    if (!brand || !businessId || !user) return;
    setBusy(true);
    try {
      const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
      const res = await agents.task.run({ req: { focus } }, ctx);
      setSuggested(res.output.result.tasks);
      await log({ agent: 'TaskAgent', action: 'created_task', summary: `Suggested ${res.output.result.tasks.length} tasks (${focus})` });
    } finally { setBusy(false); }
  }

  async function add(t: GeneratedTask) {
    await create({ category: t.category, title: t.title, detail: t.detail, priority: t.priority, status: 'pending', createdByAgent: 'TaskAgent' });
    setSuggested((s) => s.filter((x) => x !== t));
  }
  async function addAll() {
    for (const t of [...suggested]) await add(t);
  }

  return (
    <>
      <PageHeader title="Tasks" subtitle="Agent-suggested marketing tasks" />

      <RoleGate action="content.create">
        <div className="card stack">
          <div className="grid grid-2">
            <SelectField label="Focus" value={focus} onChange={setFocus} options={FOCI} />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => void suggest()} disabled={busy}>
            {busy ? 'Thinking…' : 'Suggest tasks (Task Agent)'}
          </button>
          {suggested.length > 0 && (
            <div className="stack">
              <div className="row between">
                <span className="muted" style={{ fontSize: '0.82rem' }}>{suggested.length} suggestions</span>
                <button className="btn btn-sm btn-primary" onClick={() => void addAll()}>Add all</button>
              </div>
              {suggested.map((t, i) => (
                <div key={i} className="row between">
                  <div>
                    <div>{t.title}</div>
                    <div className="muted" style={{ fontSize: '0.76rem' }}>{t.category} · {t.priority} · {t.detail}</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => void add(t)}>Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </RoleGate>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="muted">No pending tasks. Suggest some above.</p>
        ) : (
          pending.map((t) => (
            <div key={t.id} className="row between">
              <div>
                <div className="row" style={{ gap: 6 }}>
                  <span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span>
                  <span>{t.title}</span>
                </div>
                <div className="muted" style={{ fontSize: '0.76rem' }}>{t.category}{t.detail ? ` · ${t.detail}` : ''}</div>
              </div>
              <RoleGate action="content.edit">
                <div className="row">
                  <button className="btn btn-sm btn-primary" onClick={() => void setStatus(t.id, 'done')}>Done</button>
                  {role !== 'viewer' && <button className="btn btn-sm btn-danger" onClick={() => void remove(t.id)}>✕</button>}
                </div>
              </RoleGate>
            </div>
          ))
        )}
      </div>

      {done.length > 0 && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0 }}>Completed ({done.length})</h2>
          {done.map((t) => (
            <div key={t.id} className="row between">
              <span className="muted" style={{ textDecoration: 'line-through' }}>{t.title}</span>
              <RoleGate action="content.edit">
                <button className="btn btn-sm" onClick={() => void setStatus(t.id, 'pending')}>Reopen</button>
              </RoleGate>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
