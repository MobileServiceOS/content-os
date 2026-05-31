// Dashboard: content counts, recent content, and quick actions.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onSnapshot } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useContentItems } from '../hooks/useContentItems';
import { reviewResponsesCol } from '../lib/firebase/paths';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{value}</div>
      <div className="muted" style={{ fontSize: '0.82rem' }}>{label}</div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: '/generator', label: 'New Caption' },
  { to: '/script', label: 'New Script' },
  { to: '/review', label: 'Review Response' },
  { to: '/social', label: 'Social Reply' },
  { to: '/repurpose', label: 'Repurpose Content' },
];

export default function Dashboard() {
  const { businessId, brand } = useBusiness();
  const { items } = useContentItems();
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    return onSnapshot(reviewResponsesCol(businessId), (snap) => setReviewCount(snap.size));
  }, [businessId]);

  const active = items.filter((i) => !i.archived);
  const drafts = active.filter((i) => i.status === 'draft').length;
  const approved = active.filter((i) => i.status === 'approved').length;
  const scheduled = active.filter((i) => i.status === 'scheduled').length;
  const recent = active.slice(0, 5);

  return (
    <>
      <PageHeader
        title={brand?.businessName ? `${brand.businessName}` : 'Dashboard'}
        subtitle="Your content workspace at a glance"
      />

      <div className="grid grid-3">
        <Stat label="Drafts" value={drafts} />
        <Stat label="Approved" value={approved} />
        <Stat label="Scheduled" value={scheduled} />
        <Stat label="Review responses" value={reviewCount} />
      </div>

      <RoleGate action="content.create">
        <div className="card stack" style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0 }}>Quick actions</h2>
          <div className="row">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.to} className="btn" to={a.to}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </RoleGate>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>Recent content</h2>
          <Link className="btn btn-sm" to="/library">View library</Link>
        </div>
        {recent.length === 0 ? (
          <p className="muted">No content yet. Generate something to get started.</p>
        ) : (
          <div className="stack">
            {recent.map((i) => (
              <div key={i.id} className="row between">
                <div>
                  <div>{i.title}</div>
                  <div className="muted" style={{ fontSize: '0.78rem' }}>
                    {i.platform}{i.city ? ` · ${i.city}` : ''}
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
