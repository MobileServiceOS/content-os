// "Revenue Intel" — the MSOS-jobs Director surface. Renders the 10 widgets over
// REAL jobs read from MSOS (read-only). Never shows mock data: while loading,
// not-configured, or errored it shows an explicit state instead of numbers.
import { Link } from 'react-router-dom';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import { compact } from '../../lib/analytics/format';
import {
  jobsKpis, revenueByCity, revenueByService, revenueByTechnician, revenueByTireSize,
  topCustomers, dailyRevenueTrend, monthlyRevenueTrend, serviceHeatMap,
  revenueOpportunity, recommendedContent, money,
} from '../../lib/director/msosWidgets';
import type { JobRecord } from '../../lib/director/types';
import { RankTable, SectionTitle, accentAt } from './shared';
import TrendChart from '../analytics/TrendChart';

function Tile({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted" style={{ fontSize: '0.72rem' }}>{sub}</div>}
    </div>
  );
}

const revCols = (firstHead: string) => [
  { head: firstHead, align: 'left' as const, cell: (g: { key: string }) => g.key },
  { head: 'Jobs', cell: (g: { jobs: number }) => g.jobs },
  { head: 'Avg', cell: (g: { avgTicket: number }) => money(g.avgTicket) },
  { head: 'Share', cell: (g: { share: number }) => `${Math.round(g.share * 100)}%` },
  { head: 'Revenue', align: 'right' as const, cell: (g: { revenue: number }) => <strong>{money(g.revenue)}</strong> },
];

function HeatMap({ jobs }: { jobs: JobRecord[] }) {
  const h = serviceHeatMap(jobs);
  if (!h.rows.length || !h.cities.length) return <p className="muted" style={{ margin: 0 }}>Not enough data for a heat map yet.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Service \ City</th>
            {h.cities.map((c) => <th key={c} style={{ padding: '4px 6px' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {h.rows.map((row) => (
            <tr key={row.service}>
              <td style={{ textAlign: 'left', fontWeight: 600 }}>{row.service}</td>
              {row.cells.map((v, i) => {
                const intensity = v / h.max; // 0..1
                return (
                  <td key={i} title={money(v)} style={{
                    textAlign: 'center', padding: '4px 6px',
                    background: v > 0 ? `rgba(124, 92, 255, ${0.12 + intensity * 0.6})` : 'transparent',
                    color: intensity > 0.5 ? '#fff' : 'var(--text-dim)', borderRadius: 6,
                  }}>{v > 0 ? compact(v) : '·'}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConnectState({ onConnect, error }: { onConnect: () => void; error: string | null }) {
  return (
    <div className="card stack">
      <SectionTitle accent="var(--warning)">Connect MSOS (read-only)</SectionTitle>
      <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
        Sign in with the Google account you use for Mobile Service OS. The Director reads your jobs
        <strong> directly</strong> from the live <code>mobile-service-os</code> data as you — governed by MSOS's own
        security rules. No copy is made, and it can never write to MSOS. No sample data is shown here.
      </p>
      <button className="btn btn-primary" onClick={onConnect} style={{ alignSelf: 'flex-start' }}>
        Connect MSOS account →
      </button>
      {error && <p className="muted" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export function JobsIntel() {
  const {
    jobs, loading, needsConnect, error, readAt, account,
    businesses, selectedBusinessId, selectBusiness, connect, disconnect, reload,
  } = useMsosJobs();

  if (needsConnect) return <ConnectState onConnect={() => void connect()} error={error} />;

  const selected = businesses.find((b) => b.id === selectedBusinessId);
  const header = (
    <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {businesses.length > 1 ? (
          <label className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.74rem' }}>Business</span>
            <select
              className="select"
              aria-label="Select business to analyze"
              value={selectedBusinessId ?? ''}
              onChange={(e) => selectBusiness(e.target.value)}
              style={{ width: 'auto', maxWidth: 260 }}
            >
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        ) : selected ? (
          <span className="tag" style={{ fontWeight: 600 }}>{selected.name}</span>
        ) : null}
        <span className="tag" style={{ borderColor: 'var(--success)', color: 'var(--success)', fontSize: '0.7rem' }}>
          ● Live MSOS · read-only{account ? ` · ${account}` : ''}{readAt ? ` · ${new Date(readAt).toLocaleTimeString()}` : ''}
        </span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm" onClick={reload}>Refresh</button>
        <button className="btn btn-sm" onClick={() => void disconnect()}>Disconnect</button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="stack" style={{ gap: 16 }}>{header}<div className="card"><p className="muted" style={{ margin: 0 }}>Reading MSOS jobs…</p></div></div>;
  }
  if (error) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        {header}
        <div className="card stack">
          <SectionTitle accent="var(--danger)">Couldn't read MSOS</SectionTitle>
          <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{error}</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={reload}>Retry</button>
            <button className="btn btn-sm" onClick={() => void disconnect()}>Switch account</button>
          </div>
        </div>
      </div>
    );
  }
  if (jobs.length === 0) {
    return <div className="stack" style={{ gap: 16 }}>{header}<div className="card"><p className="muted" style={{ margin: 0 }}>No jobs found for {selected?.name ?? 'this business'} yet.</p></div></div>;
  }

  const k = jobsKpis(jobs);
  const opp = revenueOpportunity(jobs);
  const recs = recommendedContent(jobs);

  return (
    <div className="stack" style={{ gap: 16 }}>
      {header}

      {/* KPIs */}
      <div className="grid grid-3">
        <Tile label="Revenue (completed)" value={money(k.totalRevenue)} accent="var(--c-emerald)" />
        <Tile label="Completed jobs" value={String(k.completedJobs)} accent="var(--c-blue)" />
        <Tile label="Avg ticket" value={money(k.avgTicket)} accent="var(--c-violet)" />
        <Tile label="Pending jobs" value={String(k.pendingJobs)} accent="var(--c-amber)" />
        <Tile label="Pending pipeline" value={money(k.pendingPipelineUsd)} accent="var(--c-orange)" sub="unrealized" />
      </div>

      {/* 9 + 10: opportunity + recommended content */}
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-pink)">Revenue Opportunity Report</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {opp.insights.map((s, i) => <li key={i} style={{ fontSize: '0.86rem', marginBottom: 5 }}>{s}</li>)}
          </ul>
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--c-amber)">Recommended Content Report</SectionTitle>
          <div className="stack" style={{ gap: 8 }}>
            {recs.map((r, i) => (
              <div key={i} className="card" style={{ padding: 10 }}>
                <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <strong style={{ fontSize: '0.88rem' }}>{r.title}</strong>
                  {r.to && <Link className="btn btn-sm" to={r.to}>Create →</Link>}
                </div>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>{r.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6 + 7: trends */}
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-emerald)">Daily Revenue Trend</SectionTitle><TrendChart points={dailyRevenueTrend(jobs)} accent="var(--c-emerald)" label="Last 30 days" /></div>
        <div className="card stack"><SectionTitle accent="var(--c-blue)">Monthly Revenue Trend</SectionTitle><TrendChart points={monthlyRevenueTrend(jobs)} accent="var(--c-blue)" label="By month" /></div>
      </div>

      {/* 1–4: revenue dimensions */}
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent={accentAt(0)}>Revenue by City</SectionTitle><RankTable rows={revenueByCity(jobs)} cols={revCols('City')} /></div>
        <div className="card stack"><SectionTitle accent={accentAt(1)}>Revenue by Service</SectionTitle><RankTable rows={revenueByService(jobs)} cols={revCols('Service')} /></div>
        <div className="card stack"><SectionTitle accent={accentAt(2)}>Revenue by Technician</SectionTitle><RankTable rows={revenueByTechnician(jobs)} cols={revCols('Technician')} /></div>
        <div className="card stack"><SectionTitle accent={accentAt(3)}>Revenue by Tire Size</SectionTitle><RankTable rows={revenueByTireSize(jobs)} cols={revCols('Tire size')} /></div>
      </div>

      {/* 5: top customers */}
      <div className="card stack">
        <SectionTitle accent="var(--c-cyan)">Top Customers</SectionTitle>
        <RankTable rows={topCustomers(jobs)} cols={revCols('Customer')} />
      </div>

      {/* 8: heat map */}
      <div className="card stack">
        <SectionTitle accent="var(--c-violet)">Service Heat Map (revenue by service × city)</SectionTitle>
        <HeatMap jobs={jobs} />
      </div>
    </div>
  );
}
