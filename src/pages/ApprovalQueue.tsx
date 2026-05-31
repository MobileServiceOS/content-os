// Unified Approval Queue: everything awaiting approval (content / GBP / SEO) in
// one place. Approve-all or per-item approve/reject (owner-gated).
import PageHeader from '../components/PageHeader';
import RoleGate from '../components/RoleGate';
import { useApprovalQueue, type QueueKind } from '../hooks/useApprovalQueue';

const KIND_LABEL: Record<QueueKind, string> = { content: 'Content', gbp: 'GBP', seo: 'SEO' };

export default function ApprovalQueue() {
  const { items, approve, reject, approveAll } = useApprovalQueue();

  return (
    <>
      <PageHeader
        title="Approval Queue"
        subtitle={`${items.length} item${items.length === 1 ? '' : 's'} awaiting approval`}
        actions={
          items.length > 0 ? (
            <RoleGate action="content.approve">
              <button className="btn btn-primary btn-sm" onClick={() => void approveAll()}>Approve all</button>
            </RoleGate>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <div className="card empty">Nothing pending. New content, GBP posts, and SEO pages land here for approval.</div>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="card stack">
              <div className="row between">
                <strong>{item.title}</strong>
                <span className="tag">{KIND_LABEL[item.kind]}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {item.preview.slice(0, 280)}{item.preview.length > 280 ? '…' : ''}
              </p>
              <RoleGate action="content.approve" fallback={<p className="muted">Only owners can approve.</p>}>
                <div className="row">
                  <button className="btn btn-sm btn-primary" onClick={() => void approve(item)}>Approve</button>
                  <button className="btn btn-sm btn-danger" onClick={() => void reject(item)}>Reject</button>
                </div>
              </RoleGate>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
