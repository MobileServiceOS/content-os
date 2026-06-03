// Unified Approval Queue: pending content / GBP / SEO in one place, with per-kind
// filtering, expandable preview, inline edit, approve / reject / approve-&-schedule.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import RoleGate from '../components/RoleGate';
import { useApprovalQueue, type QueueKind, type QueueItem } from '../hooks/useApprovalQueue';

const KIND_LABEL: Record<QueueKind, string> = { content: 'Content', gbp: 'GBP', seo: 'SEO' };
const KIND_COLOR: Record<QueueKind, string> = { content: 'var(--c-blue)', gbp: 'var(--c-amber)', seo: 'var(--c-cyan)' };
type Filter = 'all' | QueueKind;

export default function ApprovalQueue({ embedded = false }: { embedded?: boolean } = {}) {
  const { items, approve, reject, approveAll, edit, approveAndSchedule } = useApprovalQueue();
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const counts = useMemo(() => ({
    all: items.length,
    content: items.filter((i) => i.kind === 'content').length,
    gbp: items.filter((i) => i.kind === 'gbp').length,
    seo: items.filter((i) => i.kind === 'seo').length,
  }), [items]);
  const shown = items.filter((i) => filter === 'all' || i.kind === filter);
  const key = (i: QueueItem) => `${i.kind}-${i.id}`;

  function toggle(i: QueueItem) {
    setExpanded((s) => { const n = new Set(s); const k = key(i); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }
  function startEdit(i: QueueItem) { setEditing(key(i)); setDraft(i.preview); }
  async function saveEdit(i: QueueItem) { await edit(i, draft); setEditing(null); }

  const FILTERS: Filter[] = ['all', 'content', 'gbp', 'seo'];

  return (
    <>
      {!embedded && (
        <PageHeader
          title="Approval Queue"
          subtitle={`${items.length} awaiting approval`}
          actions={shown.length > 0 ? (
            <RoleGate action="content.approve">
              <button className="btn btn-primary btn-sm" onClick={() => void approveAll(filter === 'all' ? undefined : filter)}>
                Approve {filter === 'all' ? 'all' : KIND_LABEL[filter]}
              </button>
            </RoleGate>
          ) : undefined}
        />
      )}

      <div className="row" style={{ marginBottom: 4 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : KIND_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card empty" style={{ marginTop: 12 }}>Nothing pending here. New content, GBP posts, and SEO pages land here for approval.</div>
      ) : (
        <div className="stack" style={{ marginTop: 12 }}>
          {shown.map((item) => {
            const isOpen = expanded.has(key(item));
            const isEditing = editing === key(item);
            const long = item.preview.length > 240;
            return (
              <div key={key(item)} className="card stack">
                <div className="row between">
                  <strong>{item.title}</strong>
                  <span className="tag" style={{ color: KIND_COLOR[item.kind], borderColor: KIND_COLOR[item.kind], fontWeight: 700 }}>{KIND_LABEL[item.kind]}</span>
                </div>

                {isEditing ? (
                  <textarea className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ minHeight: 130 }} />
                ) : (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {isOpen || !long ? item.preview : `${item.preview.slice(0, 240)}…`}
                    {long && <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => toggle(item)}>{isOpen ? 'Less' : 'More'}</button>}
                  </p>
                )}

                <RoleGate action="content.approve" fallback={<p className="muted">Only owners can approve.</p>}>
                  <div className="row">
                    {isEditing ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => void saveEdit(item)}>Save edit</button>
                        <button className="btn btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => void approve(item)}>Approve</button>
                        {item.kind === 'content' && <button className="btn btn-sm" onClick={() => void approveAndSchedule(item)}>Approve &amp; schedule</button>}
                        <button className="btn btn-sm" onClick={() => startEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => void reject(item)}>Reject</button>
                      </>
                    )}
                  </div>
                </RoleGate>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
