// Dependency-free SVG area/line chart. Scales to its container width.
import { compact } from '../../lib/analytics/format';

export interface TrendPoint {
  label: string;
  value: number;
}

export default function TrendChart({
  points,
  accent = 'var(--c-blue)',
  height = 120,
  label,
}: {
  points: TrendPoint[];
  accent?: string;
  height?: number;
  label?: string;
}) {
  if (points.length === 0) {
    return <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>No data in range yet.</p>;
  }
  const W = 100; // viewBox units; SVG stretches to 100% width
  const H = height;
  const pad = 6;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const x = (i: number): number => (n === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1));
  const y = (v: number): number => H - pad - (v / max) * (H - pad * 2);

  const line = points.map((p, i) => `${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
  const area = `${pad},${H - pad} ${line} ${(W - pad).toFixed(2)},${H - pad}`;
  const last = points[points.length - 1];

  return (
    <div className="stack" style={{ gap: 4 }}>
      {label && (
        <div className="row between">
          <span className="muted" style={{ fontSize: '0.74rem' }}>{label}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{compact(last.value)}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }} role="img" aria-label={label ?? 'trend'}>
        <polygon points={area} fill={accent} opacity={0.12} />
        <polyline points={line} fill="none" stroke={accent} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(n - 1)} cy={y(last.value)} r={2} fill={accent} />
      </svg>
      <div className="row between" style={{ fontSize: '0.66rem' }}>
        <span className="muted">{points[0].label}</span>
        <span className="muted">{last.label}</span>
      </div>
    </div>
  );
}
