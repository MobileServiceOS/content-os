// Content Pipeline (Wave 0.3) — the one place for the publishing workflow:
// approve → schedule → review history, under a single header. Merges the former
// Approvals, Calendar, and Library pages (each still works standalone via its own
// route; here they render headerless via the `embedded` prop). The
// generate → publish → measure ends arrive as the loop closes (Wave 3).
import { useState } from 'react';
import type { ReactNode } from 'react';
import PageHeader from '../components/PageHeader';
import ApprovalQueue from './ApprovalQueue';
import Calendar from './Calendar';
import Library from './Library';

type Tab = 'approvals' | 'calendar' | 'library';

const TABS: { key: Tab; label: string; icon: string; render: () => ReactNode }[] = [
  { key: 'approvals', label: 'Approvals', icon: '🛡️', render: () => <ApprovalQueue embedded /> },
  { key: 'calendar', label: 'Calendar', icon: '🗓️', render: () => <Calendar embedded /> },
  { key: 'library', label: 'Library', icon: '📚', render: () => <Library embedded /> },
];

export default function ContentPipeline() {
  const [active, setActive] = useState<Tab>('approvals');
  const current = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <>
      <PageHeader title="Content Pipeline" subtitle="Approve → schedule → library. One workflow." />

      <div className="dir-tabs" role="tablist" aria-label="Content Pipeline sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`btn btn-sm${active === t.key ? ' btn-primary' : ''}`}
            onClick={() => setActive(t.key)}
          >
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">{current.render()}</div>
    </>
  );
}
