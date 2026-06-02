// Viral Analytics Dashboard — totals, trend, funnel, and the per-post table.
// Reads the postPerformance spine; metrics arrive via manual entry or CSV import.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import RoleGate from '../components/RoleGate';
import TrendChart, { type TrendPoint } from '../components/analytics/TrendChart';
import FunnelBar from '../components/analytics/FunnelBar';
import MetricsForm from '../components/analytics/MetricsForm';
import CsvImport from '../components/analytics/CsvImport';
import { usePostPerformance } from '../hooks/usePostPerformance';
import { compact, pct, money, scoreColor } from '../lib/analytics/format';
import { POST_PLATFORM_LABELS } from '../types/analytics';
import type { PostPerformance } from '../types/analytics';

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 0, label: 'All time' },
];

type SortKey = 'postedAt' | 'views' | 'completionRate' | 'calls' | 'leads' | 'viralScore' | 'leadGenScore';

function Stat({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="stat-value">{value}</div>
      <div className="muted" style={{ fontSize: '0.78rem' }}>{label}</div>
      {sub && <div className="muted" style={{ fontSize: '0.68rem' }}>{sub}</div>}
    </div>
  );
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayLabel(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export default function Analytics() {
  const { items, loading, recordMetrics, importRows } = usePostPerformance();
  const [rangeDays, setRangeDays] = useState(30);
  const [editing, setEditing] = useState<PostPerformance | null>(null);
  const [importing, setImporting] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'postedAt', dir: -1 });

  const rows = useMemo(() => {
    if (rangeDays === 0) return items;
    const cutoff = Date.now() - rangeDays * 86_400_000;
    return items.filter((i) => i.postedAt >= cutoff);
  }, [items, rangeDays]);

  const totals = useMemo(() => {
    const sum = (f: (r: PostPerformance) => number) => rows.reduce((a, r) => a + f(r), 0);
    const views = sum((r) => r.metrics.views);
    const eng = sum((r) => r.metrics.shares + r.metrics.saves + r.metrics.comments);
    return {
      views,
      engagementRate: views > 0 ? eng / views : 0,
      calls: sum((r) => r.metrics.calls),
      leads: sum((r) => r.metrics.leads),
      jobs: sum((r) => r.metrics.jobs),
      revenue: sum((r) => r.metrics.revenueUsd),
      websiteClicks: sum((r) => r.metrics.websiteClicks),
      needsMetrics: rows.filter((r) => r.metrics.views === 0).length,
    };
  }, [rows]);

  const trend: TrendPoint[] = useMemo(() => {
    const byDay = new Map<string, number>();
    rows.forEach((r) => byDay.set(dayKey(r.postedAt), (byDay.get(dayKey(r.postedAt)) ?? 0) + r.metrics.views));
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ label: dayLabel(k), value: v }));
  }, [rows]);

  const sorted = useMemo(() => {
    const val = (r: PostPerformance): number =>
      sort.key === 'completionRate' ? r.metrics.completionRate
      : sort.key === 'views' ? r.metrics.views
      : sort.key === 'calls' ? r.metrics.calls
      : sort.key === 'leads' ? r.metrics.leads
      : sort.key === 'viralScore' ? r.scores.viralScore
      : sort.key === 'leadGenScore' ? r.scores.leadGenScore
      : r.postedAt;
    return [...rows].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [rows, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === -1 ? ' ▾' : ' ▴') : '');

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="What your published content actually did"
        actions={
          <>
            <select className="select" style={{ width: 'auto' }} value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))}>
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <RoleGate action="content.create">
              <button className="btn btn-primary btn-sm" onClick={() => setImporting(true)}>Import CSV</button>
            </RoleGate>
          </>
        }
      />

      {loading ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>No performance data yet</h2>
          <p className="muted" style={{ margin: 0 }}>
            Mark content as <strong>posted</strong> in the <Link to="/library">Library</Link> to start a performance row,
            then add metrics here — or <button className="btn btn-sm" onClick={() => setImporting(true)}>import a CSV</button>.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            <Stat label="Views" value={compact(totals.views)} accent="var(--c-blue)" />
            <Stat label="Engagement rate" value={pct(totals.engagementRate)} accent="var(--c-violet)" />
            <Stat label="Calls" value={compact(totals.calls)} accent="var(--c-cyan)" />
            <Stat label="Leads" value={compact(totals.leads)} accent="var(--c-amber)" />
            <Stat label="Jobs" value={compact(totals.jobs)} accent="var(--c-emerald)" />
            <Stat label="Revenue" value={money(totals.revenue)} accent="var(--c-pink)" />
          </div>

          {totals.needsMetrics > 0 && (
            <p className="muted" style={{ fontSize: '0.76rem' }}>
              {totals.needsMetrics} post{totals.needsMetrics === 1 ? '' : 's'} in range still need metrics — add them to sharpen scores.
            </p>
          )}

          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div className="card stack">
              <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--c-blue)' }} />Views over time</h2>
              <TrendChart points={trend} accent="var(--c-blue)" />
            </div>
            <div className="card stack">
              <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--c-emerald)' }} />Funnel</h2>
              <FunnelBar
                steps={[
                  { label: 'Views', value: totals.views, accent: 'var(--c-blue)' },
                  { label: 'Website clicks', value: totals.websiteClicks, accent: 'var(--c-violet)' },
                  { label: 'Calls', value: totals.calls, accent: 'var(--c-cyan)' },
                  { label: 'Leads', value: totals.leads, accent: 'var(--c-amber)' },
                  { label: 'Jobs', value: totals.jobs, accent: 'var(--c-emerald)' },
                ]}
              />
            </div>
          </div>

          <div className="card stack" style={{ marginTop: 12 }}>
            <div className="row between">
              <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--c-cyan)' }} />Posts</h2>
              <Link className="btn btn-sm" to="/leaderboard">Leaderboard →</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Post</th>
                    <th onClick={() => toggleSort('views')} style={{ cursor: 'pointer' }}>Views{arrow('views')}</th>
                    <th onClick={() => toggleSort('completionRate')} style={{ cursor: 'pointer' }}>Compl{arrow('completionRate')}</th>
                    <th onClick={() => toggleSort('calls')} style={{ cursor: 'pointer' }}>Calls{arrow('calls')}</th>
                    <th onClick={() => toggleSort('leads')} style={{ cursor: 'pointer' }}>Leads{arrow('leads')}</th>
                    <th onClick={() => toggleSort('viralScore')} style={{ cursor: 'pointer' }}>Viral{arrow('viralScore')}</th>
                    <th onClick={() => toggleSort('leadGenScore')} style={{ cursor: 'pointer' }}>Lead-gen{arrow('leadGenScore')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{POST_PLATFORM_LABELS[r.platform]}</div>
                        <div className="muted" style={{ fontSize: '0.72rem' }}>
                          {[r.hookCategory, r.service, r.city].filter(Boolean).join(' · ') || (r.postUrl ?? '—')}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{compact(r.metrics.views)}</td>
                      <td style={{ textAlign: 'center' }}>{pct(r.metrics.completionRate)}</td>
                      <td style={{ textAlign: 'center' }}>{r.metrics.calls}</td>
                      <td style={{ textAlign: 'center' }}>{r.metrics.leads}</td>
                      <td style={{ textAlign: 'center', color: scoreColor(r.scores.viralScore), fontWeight: 600 }}>{Math.round(r.scores.viralScore * 100)}</td>
                      <td style={{ textAlign: 'center', color: scoreColor(r.scores.leadGenScore), fontWeight: 600 }}>{Math.round(r.scores.leadGenScore * 100)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.postUrl && <a className="btn btn-sm" href={r.postUrl} target="_blank" rel="noreferrer">↗</a>}{' '}
                        <RoleGate action="content.create"><button className="btn btn-sm" onClick={() => setEditing(r)}>+ metrics</button></RoleGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && (
        <MetricsForm
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(metrics) => recordMetrics(editing.id, metrics, 'manual')}
        />
      )}
      {importing && <CsvImport onClose={() => setImporting(false)} onImport={importRows} />}
    </>
  );
}
