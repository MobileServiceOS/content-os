// Horizontal funnel: each step's bar is scaled to the first (widest) step,
// with the step-over-previous conversion rate shown.
import { compact } from '../../lib/analytics/format';

export interface FunnelStep {
  label: string;
  value: number;
  accent?: string;
}

export default function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {steps.map((s, i) => {
        const widthPct = Math.max(2, (s.value / top) * 100);
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label} className="stack" style={{ gap: 2 }}>
            <div className="row between" style={{ fontSize: '0.76rem' }}>
              <span>{s.label}</span>
              <span style={{ fontWeight: 600 }}>
                {compact(s.value)}
                {conv !== null && <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>{conv}%</span>}
              </span>
            </div>
            <div style={{ background: 'var(--surface-2, rgba(255,255,255,0.06))', borderRadius: 6, height: 10 }}>
              <div
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  borderRadius: 6,
                  background: s.accent ?? 'var(--c-blue)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
