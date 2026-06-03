// Wave 0.2 — reply tools merged into the Director's Review Intel tab. Hosts the
// former Review Response + Social Reply pages as sub-tools (headerless via their
// `embedded` prop), so drafting replies sits next to the review intelligence that
// informs them. Pure relocation — no logic change.
import { useState } from 'react';
import type { ReactNode } from 'react';
import ReviewResponse from '../../pages/ReviewResponse';
import SocialReply from '../../pages/SocialReply';

type Tool = 'review' | 'social';

const TOOLS: { key: Tool; label: string; icon: string; render: () => ReactNode }[] = [
  { key: 'review', label: 'Review reply', icon: '⭐', render: () => <ReviewResponse embedded /> },
  { key: 'social', label: 'Social reply', icon: '💬', render: () => <SocialReply embedded /> },
];

export function ReplyStudio() {
  const [active, setActive] = useState<Tool>('review');
  const current = TOOLS.find((t) => t.key === active) ?? TOOLS[0];

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="tablist" aria-label="Reply tools">
        {TOOLS.map((t) => (
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
    </div>
  );
}
