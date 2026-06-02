// Shared presentational bits for the Marketing Director sections. Built on the
// existing vibrant card/tile/tag system in index.css — no new global styles.
import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import type { ActionItem, Finding } from '../../lib/director/types';

export const ACCENTS = ['var(--c-violet)', 'var(--c-blue)', 'var(--c-cyan)', 'var(--c-emerald)', 'var(--c-amber)', 'var(--c-pink)', 'var(--c-orange)'];
export const accentAt = (i: number): string => ACCENTS[i % ACCENTS.length];

const accentStyle = (accent: string): CSSProperties => ({ ['--accent' as keyof CSSProperties]: accent } as CSSProperties);

/** A KPI tile rendering a Finding (value + optional period delta). */
export function KpiTile({ finding, accent }: { finding: Finding; accent: string }) {
  const d = finding.delta;
  const deltaColor = finding.tone === 'good' ? 'var(--success)' : finding.tone === 'bad' ? 'var(--danger)' : 'var(--text-dim)';
  return (
    <div className="card tile" style={accentStyle(accent)}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{finding.label}</div>
      <div className="stat-value">{finding.value}</div>
      {d !== undefined && (
        <div style={{ fontSize: '0.74rem', color: deltaColor, fontWeight: 600 }}>
          {d >= 0 ? '▲' : '▼'} {Math.abs(Math.round(d * 100))}% vs prior
        </div>
      )}
    </div>
  );
}

const IMPACT_COLOR: Record<ActionItem['impact'], string> = { high: 'var(--danger)', med: 'var(--warning)', low: 'var(--text-dim)' };

/** A list of recommended actions with impact chips + optional deep links. */
export function ActionList({ items, emptyText = 'Nothing flagged.' }: { items: ActionItem[]; emptyText?: string }) {
  if (!items.length) return <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{emptyText}</p>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((a, i) => (
        <div key={i} className="card" style={{ padding: 12, ...accentStyle(IMPACT_COLOR[a.impact]) }}>
          <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
            <strong style={{ fontSize: '0.92rem' }}>{a.title}</strong>
            <span className="tag" style={{ borderColor: IMPACT_COLOR[a.impact], color: IMPACT_COLOR[a.impact], fontSize: '0.66rem', flex: '0 0 auto' }}>{a.impact.toUpperCase()}</span>
          </div>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{a.rationale}</p>
          <div className="row" style={{ gap: 8, marginTop: a.roiNote || a.to ? 6 : 0 }}>
            {a.roiNote && <span className="muted" style={{ fontSize: '0.72rem', color: 'var(--success)' }}>↗ {a.roiNote}</span>}
            {a.to && <Link className="btn btn-sm" to={a.to}>Open →</Link>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A single headline callout (Highest ROI / Biggest growth / Most urgent). */
export function Callout({ title, item, accent, icon }: { title: string; item: ActionItem | null; accent: string; icon: string }) {
  return (
    <div className="card stack" style={{ gap: 6, ...accentStyle(accent) }}>
      <span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{icon} {title}</span>
      {item ? (
        <>
          <strong style={{ fontSize: '0.98rem' }}>{item.title}</strong>
          <span className="muted" style={{ fontSize: '0.8rem' }}>{item.rationale}</span>
          {item.to && <Link className="btn btn-sm" to={item.to} style={{ alignSelf: 'flex-start' }}>Take action →</Link>}
        </>
      ) : <span className="muted" style={{ fontSize: '0.84rem' }}>Not enough data yet.</span>}
    </div>
  );
}

export interface Col<T> { head: string; cell: (row: T, i: number) => ReactNode; align?: 'left' | 'center' | 'right'; }

/** A generic ranked table — the workhorse for every leaderboard-style view. */
export function RankTable<T>({ rows, cols, lowConfidence, empty = 'No data for this view yet.' }: {
  rows: T[];
  cols: Col<T>[];
  lowConfidence?: (row: T) => boolean;
  empty?: string;
}) {
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>#</th>
            {cols.map((c) => <th key={c.head} style={{ textAlign: c.align ?? 'center' }}>{c.head}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ opacity: lowConfidence?.(row) ? 0.6 : 1 }}>
              <td>{i + 1}</td>
              {cols.map((c) => <td key={c.head} style={{ textAlign: c.align ?? 'center' }}>{c.cell(row, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A 1..10 score chip with traffic-light coloring. */
export function ScoreChip({ value, label }: { value: number; label?: string }) {
  const color = value >= 7 ? 'var(--success)' : value >= 4 ? 'var(--warning)' : 'var(--danger)';
  return (
    <span className="tag" style={{ borderColor: color, color, fontWeight: 700, fontSize: '0.72rem' }}>
      {label ? `${label} ` : ''}{value}/10
    </span>
  );
}

/** Section heading with a colored dot (matches Dashboard sections). */
export function SectionTitle({ children, accent }: { children: ReactNode; accent: string }) {
  return <h2 style={{ margin: 0 }}><span className="sec-dot" style={accentStyle(accent)} />{children}</h2>;
}
