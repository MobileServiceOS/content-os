// "Revenue Intel" — the MSOS-jobs Director surface. Renders the 10 widgets over
// REAL jobs read from MSOS (read-only). Never shows mock data: while loading,
// not-configured, or errored it shows an explicit state instead of numbers.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import { compact } from '../../lib/analytics/format';
import {
  jobsKpis, revenueByCity, revenueByService, revenueByTechnician,
  revenueByVehicle, revenueByCustomerType, revenueByField,
  revenueWindows, revenueRollups, serviceKeyword,
  topCustomers, dailyRevenueTrend, monthlyRevenueTrend, serviceHeatMap,
  revenueOpportunity, recommendedContent, money,
} from '../../lib/director/msosWidgets';
import { revenueInsight, type RevenueInsight } from '../../lib/director/insight';
import { ownerSummary, todaysPriorities } from '../../lib/director/ownerExecutive';
import type { VerticalConfig } from '../../lib/verticals';
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

// The 4-part insight frame: what happened / why / action / expected $ impact.
function InsightCard({ title, accent, insight }: { title: string; accent: string; insight: RevenueInsight }) {
  return (
    <div className="card stack" style={{ gap: 6, ['--accent' as string]: accent }}>
      <span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      <strong style={{ fontSize: '0.92rem' }}>{insight.whatHappened}</strong>
      <span className="muted" style={{ fontSize: '0.8rem' }}>Why: {insight.why}</span>
      <span style={{ fontSize: '0.84rem' }}>→ {insight.action}</span>
      <span className="tag" style={{ borderColor: 'var(--success)', color: 'var(--success)', fontSize: '0.7rem', alignSelf: 'flex-start' }}>{insight.impactLabel}</span>
    </div>
  );
}

function Best({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card" style={{ padding: 12, ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.72rem' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// Phase 7 — Owner Executive Dashboard: headline KPIs + Today's Priorities, live.
function OwnerExecutive({ jobs, vertical }: { jobs: JobRecord[]; vertical: VerticalConfig }) {
  const s = ownerSummary(jobs, Date.now());
  const priorities = todaysPriorities(jobs, vertical);
  const g = s.growthPct;
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <SectionTitle accent="var(--c-violet)">Owner Executive Dashboard</SectionTitle>
      <div className="grid grid-3">
        <Tile label="Revenue" value={money(s.revenue)} accent="var(--c-emerald)" />
        <Tile label={s.profitKnown ? 'Profit' : 'Profit'} value={s.profitKnown ? money(s.profit) : '—'} accent="var(--c-blue)"
          sub={s.profitKnown && s.marginPct != null ? `${Math.round(s.marginPct * 100)}% margin` : 'cost not recorded'} />
        <Tile label="Jobs" value={String(s.jobs)} accent="var(--c-cyan)" />
        <Tile label="Avg ticket" value={money(s.avgTicket)} accent="var(--c-amber)" />
        <Tile label="Growth (mo/mo)" value={g != null ? `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%` : '—'}
          accent={g != null && g < 0 ? 'var(--danger)' : 'var(--success)'} sub={g == null ? 'no prior-month data' : undefined} />
      </div>
      <div className="grid grid-3">
        <Best label="Best city" value={s.bestCity ?? '—'} accent="var(--c-blue)" />
        <Best label="Best service" value={s.bestService ?? '—'} accent="var(--c-emerald)" />
        <Best label="Best technician" value={s.bestTechnician ?? '—'} accent="var(--c-pink)" />
      </div>
      <div>
        <div className="muted" style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Today's Priorities</div>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {priorities.map((p, i) => (
            <li key={i} style={{ fontSize: '0.86rem', marginBottom: 6 }}>
              {p.text}
              {p.to && <Link className="btn btn-sm" to={p.to} style={{ marginLeft: 8, padding: '2px 8px', minHeight: 0 }}>Go →</Link>}
            </li>
          ))}
        </ol>
      </div>
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

function ConnectState({
  onConnectEmail, onConnectGoogle, error,
}: {
  onConnectEmail: (email: string, password: string) => Promise<void>;
  onConnectGoogle: () => Promise<void>;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try { await onConnectEmail(email, password); } finally { setBusy(false); }
  };

  return (
    <div className="card stack" style={{ maxWidth: 420 }}>
      <SectionTitle accent="var(--warning)">Connect MSOS (read-only)</SectionTitle>
      <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>
        Sign in to Mobile Service OS to read your jobs <strong>directly</strong> from the live
        <code> mobile-service-os</code> data as you — governed by MSOS's own security rules. No copy is made,
        it can never write to MSOS, and once connected it stays connected (no need to sign in again).
      </p>
      <form className="stack" style={{ gap: 10 }} onSubmit={(e) => void submit(e)}>
        <label className="field" style={{ margin: 0 }}>
          <span>MSOS email</span>
          <input className="input" type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy || !email || !password} style={{ alignSelf: 'flex-start' }}>
          {busy ? 'Signing in…' : 'Sign in to MSOS'}
        </button>
      </form>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.74rem' }}>or</span>
        <button className="btn btn-sm" onClick={() => void onConnectGoogle()}>Continue with Google</button>
      </div>
      {error && <p className="muted" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export function JobsIntel() {
  const {
    jobs, loading, needsConnect, error, readAt, account, vertical,
    businesses, selectedBusinessId, selectBusiness, connectEmail, connectGoogle, disconnect, reload,
  } = useMsosJobs();

  if (needsConnect) return <ConnectState onConnectEmail={connectEmail} onConnectGoogle={connectGoogle} error={error} />;

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
  const win = revenueWindows(jobs, Date.now());
  const roll = revenueRollups(jobs);
  const drivers: { title: string; accent: string; insight: RevenueInsight }[] = [];
  if (roll.topCity) drivers.push({ title: 'Top revenue city', accent: 'var(--c-blue)', insight: revenueInsight(roll.topCity.key, 'city', roll.topCity, `Create more ${roll.topCity.key} content.`) });
  if (roll.topService) drivers.push({ title: 'Top revenue service', accent: 'var(--c-emerald)', insight: revenueInsight(roll.topService.key, 'service', roll.topService, `Create more ${serviceKeyword(roll.topService.key)} content.`) });
  if (roll.topTechnician) drivers.push({ title: 'Top revenue technician', accent: 'var(--c-violet)', insight: revenueInsight(roll.topTechnician.key, 'technician', roll.topTechnician, `Feature ${roll.topTechnician.key} in a customer-story video.`) });

  return (
    <div className="stack" style={{ gap: 16 }}>
      {header}

      {/* Phase 7 — Owner Executive Dashboard (live) */}
      <OwnerExecutive jobs={jobs} vertical={vertical} />

      {/* Time-window revenue */}
      <div className="grid grid-3">
        <Tile label="Revenue today" value={money(win.today.revenue)} accent="var(--c-emerald)" sub={`${win.today.jobs} jobs`} />
        <Tile label="Yesterday" value={money(win.yesterday.revenue)} accent="var(--c-blue)" sub={`${win.yesterday.jobs} jobs`} />
        <Tile label="This week" value={money(win.thisWeek.revenue)} accent="var(--c-cyan)" sub={`${win.thisWeek.jobs} jobs`} />
        <Tile label="This month" value={money(win.thisMonth.revenue)} accent="var(--c-violet)" sub={`${win.thisMonth.jobs} jobs`} />
        <Tile label="Last month" value={money(win.lastMonth.revenue)} accent="var(--c-amber)" sub={`${win.lastMonth.jobs} jobs`} />
        <Tile label="Last 90 days" value={money(win.last90.revenue)} accent="var(--c-orange)" sub={`${win.last90.jobs} jobs`} />
      </div>

      {/* All-time KPIs */}
      <div className="grid grid-3">
        <Tile label="Revenue (completed)" value={money(k.totalRevenue)} accent="var(--c-emerald)" />
        <Tile label="Completed jobs" value={String(k.completedJobs)} accent="var(--c-blue)" />
        <Tile label="Avg ticket" value={money(k.avgTicket)} accent="var(--c-violet)" />
        <Tile label="Pending jobs" value={String(k.pendingJobs)} accent="var(--c-amber)" />
        <Tile label="Pending pipeline" value={money(k.pendingPipelineUsd)} accent="var(--c-orange)" sub="unrealized" />
        {roll.highestAvgTicketService && <Tile label="Highest avg ticket" value={money(roll.highestAvgTicketService.avgTicket)} accent="var(--c-pink)" sub={roll.highestAvgTicketService.key} />}
      </div>

      {/* Top revenue drivers — each with what happened / why / action / $ impact */}
      {drivers.length > 0 && (
        <div className="grid grid-3">
          {drivers.map((d) => <InsightCard key={d.title} title={d.title} accent={d.accent} insight={d.insight} />)}
        </div>
      )}
      {roll.highestLifetimeCustomer && (
        <div className="card stack" style={{ gap: 4, ['--accent' as string]: 'var(--c-cyan)' }}>
          <span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Highest lifetime customer</span>
          <strong style={{ fontSize: '0.92rem' }}>{roll.highestLifetimeCustomer.key} — {money(roll.highestLifetimeCustomer.revenue)} across {roll.highestLifetimeCustomer.jobs} job{roll.highestLifetimeCustomer.jobs === 1 ? '' : 's'}</strong>
          <span style={{ fontSize: '0.84rem' }}>→ Ask for a Google review and a referral; offer a loyalty perk.</span>
        </div>
      )}

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

      {/* revenue dimensions (product dimension is vertical-driven, never hardcoded) */}
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent={accentAt(0)}>Revenue by City</SectionTitle><RankTable rows={revenueByCity(jobs)} cols={revCols('City')} /></div>
        <div className="card stack"><SectionTitle accent={accentAt(1)}>Revenue by Service</SectionTitle><RankTable rows={revenueByService(jobs)} cols={revCols('Service')} /></div>
        <div className="card stack"><SectionTitle accent={accentAt(2)}>Revenue by Technician</SectionTitle><RankTable rows={revenueByTechnician(jobs)} cols={revCols('Technician')} /></div>
        <div className="card stack"><SectionTitle accent={accentAt(3)}>Revenue by {vertical.productDimension.label}</SectionTitle><RankTable rows={revenueByField(jobs, vertical.productDimension.field)} cols={revCols(vertical.productDimension.label)} /></div>
        {vertical.productDimension.field !== 'vehicle' && (
          <div className="card stack"><SectionTitle accent={accentAt(4)}>Revenue by Vehicle Type</SectionTitle><RankTable rows={revenueByVehicle(jobs)} cols={revCols('Vehicle')} /></div>
        )}
        <div className="card stack"><SectionTitle accent={accentAt(5)}>Revenue by Customer Type</SectionTitle><RankTable rows={revenueByCustomerType(jobs)} cols={revCols('Customer type')} /></div>
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
