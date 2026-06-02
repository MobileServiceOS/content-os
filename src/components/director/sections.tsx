// The ten Marketing Director sections. Each is a pure view over a
// DirectorDataset, delegating all math to src/lib/director/analyze.ts and all
// chrome to ./shared + the existing analytics widgets. Consolidated into one
// module since they share heavy imports and read as a single surface.
import { Link } from 'react-router-dom';
import { money, compact, pct, scoreColor } from '../../lib/analytics/format';
import { POST_PLATFORM_LABELS } from '../../types/analytics';
import type { DirectorDataset } from '../../lib/director/types';
import {
  executiveSummary, revenueBreakdown, cityPerformance, servicePerformance,
  hookLeaderboard, contentPerformance, seoDirector, reviewDirector,
  contentOpportunities, dailyBrief,
} from '../../lib/director/analyze';
import { KpiTile, ActionList, Callout, RankTable, ScoreChip, SectionTitle, accentAt } from './shared';
import TrendChart, { type TrendPoint } from '../analytics/TrendChart';
import FunnelBar from '../analytics/FunnelBar';

const tc = (s: string): string => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface P { ds: DirectorDataset; }

// 1 ── Executive Dashboard ───────────────────────────────────────────────────
function dailyRevenue(ds: DirectorDataset): TrendPoint[] {
  const DAY = 86_400_000;
  const days = Math.max(1, Math.round((ds.range.end - ds.range.start) / DAY));
  const buckets = new Array(days).fill(0);
  for (const j of ds.jobs) {
    const idx = Math.min(days - 1, Math.max(0, Math.floor((j.completedAt - ds.range.start) / DAY)));
    buckets[idx] += j.ticketUsd;
  }
  return buckets.map((v, i) => ({ label: `D${i + 1}`, value: v }));
}

export function ExecutiveDashboard({ ds }: P) {
  const exec = executiveSummary(ds);
  const brief = dailyBrief(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid grid-3">
        {exec.findings.map((f, i) => <KpiTile key={f.label} finding={f} accent={accentAt(i)} />)}
      </div>

      <div className="grid grid-2">
        <Callout title="Most urgent problem" item={brief.mostUrgent} accent="var(--danger)" icon="⚠" />
        <Callout title="Highest-ROI opportunity" item={brief.highestRoi} accent="var(--success)" icon="↗" />
        <Callout title="Biggest growth opportunity" item={brief.biggestGrowth} accent="var(--c-cyan)" icon="📈" />
        <div className="card stack" style={{ gap: 8 }}>
          <SectionTitle accent="var(--c-violet)">Revenue trend (30d)</SectionTitle>
          <TrendChart points={dailyRevenue(ds)} accent="var(--c-emerald)" label="Daily revenue" />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-blue)">Top 3 actions today</SectionTitle>
          <ActionList items={brief.top3Today} />
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--c-amber)">Top 3 actions this week</SectionTitle>
          <ActionList items={brief.top3Week} />
        </div>
      </div>
    </div>
  );
}

// 2 ── Content Performance ────────────────────────────────────────────────────
export function ContentPerformanceView({ ds }: P) {
  const c = contentPerformance(ds);
  const Row = ({ p }: { p: typeof c.best[number] }) => (
    <div className="row between" style={{ gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.hookText ? `“${p.hookText}”` : POST_PLATFORM_LABELS[p.platform]}
        </div>
        <div className="muted" style={{ fontSize: '0.72rem' }}>{[POST_PLATFORM_LABELS[p.platform], p.hookCategory && tc(p.hookCategory), p.city].filter(Boolean).join(' · ')}</div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
        <div style={{ color: scoreColor(p.scores.viralScore), fontWeight: 700 }}>{Math.round(p.scores.viralScore * 100)}</div>
        <div className="muted" style={{ fontSize: '0.72rem' }}>{compact(p.metrics.views)} views</div>
      </div>
    </div>
  );
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack">
        <SectionTitle accent="var(--c-violet)">Patterns detected</SectionTitle>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{c.patterns.map((p, i) => <li key={i} style={{ fontSize: '0.86rem', marginBottom: 4 }}>{p}</li>)}</ul>
      </div>
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-emerald)">Top performing</SectionTitle>{c.best.map((p) => <Row key={p.id} p={p} />)}</div>
        <div className="card stack"><SectionTitle accent="var(--danger)">Worst performing</SectionTitle>{c.worst.map((p) => <Row key={p.id} p={p} />)}</div>
      </div>
    </div>
  );
}

// 3 ── Hook Leaderboard ───────────────────────────────────────────────────────
export function HookLeaderboardView({ ds }: P) {
  const h = hookLeaderboard(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      {h.winner && (
        <div className="card tile" style={{ ['--accent' as string]: 'var(--c-amber)' }}>
          <div className="muted" style={{ fontSize: '0.74rem' }}>Winning hook style{h.winnerConfident ? '' : ' (still firming up)'}</div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>{tc(h.winner.key)}</div>
          <div className="muted" style={{ fontSize: '0.76rem' }}>{Math.round(h.winner.avgViral * 100)} viral · {compact(h.winner.avgViews)} avg views · {h.winner.count} posts</div>
        </div>
      )}
      <div className="card stack">
        <SectionTitle accent="var(--c-blue)">By hook category</SectionTitle>
        <RankTable
          rows={h.byCategory}
          lowConfidence={(s) => s.count < 3}
          cols={[
            { head: 'Hook style', align: 'left', cell: (s) => <span style={{ textTransform: 'capitalize' }}>{tc(s.key)}{s.count < 3 && <span className="muted" title="fewer than 3 posts"> *</span>}</span> },
            { head: 'Posts', cell: (s) => s.count },
            { head: 'Avg views', cell: (s) => compact(s.avgViews) },
            { head: 'Compl', cell: (s) => pct(s.avgCompletion) },
            { head: 'Leads', cell: (s) => s.leads },
            { head: 'Viral', cell: (s) => <span style={{ color: scoreColor(s.avgViral), fontWeight: 700 }}>{Math.round(s.avgViral * 100)}</span> },
          ]}
        />
      </div>
      <div className="card stack">
        <SectionTitle accent="var(--c-cyan)">Top hook lines</SectionTitle>
        <RankTable
          rows={h.byText.slice(0, 10)}
          cols={[
            { head: 'Hook', align: 'left', cell: (s) => <span style={{ display: 'inline-block', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{s.key}”</span> },
            { head: 'Posts', cell: (s) => s.count },
            { head: 'Avg views', cell: (s) => compact(s.avgViews) },
            { head: 'Viral', cell: (s) => <span style={{ color: scoreColor(s.avgViral), fontWeight: 700 }}>{Math.round(s.avgViral * 100)}</span> },
          ]}
        />
      </div>
    </div>
  );
}

// 4 ── City Performance ───────────────────────────────────────────────────────
export function CityPerformanceView({ ds }: P) {
  const c = cityPerformance(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      {c.recommendedTarget && (
        <div className="card tile" style={{ ['--accent' as string]: 'var(--c-emerald)' }}>
          <div className="muted" style={{ fontSize: '0.74rem' }}>Recommended city to target</div>
          <div className="stat-value">{c.recommendedTarget.key}</div>
          <div className="muted" style={{ fontSize: '0.78rem' }}>{c.rationale}</div>
        </div>
      )}
      <div className="card stack">
        <SectionTitle accent="var(--c-blue)">All cities (by revenue)</SectionTitle>
        <RankTable
          rows={c.rows}
          cols={[
            { head: 'City', align: 'left', cell: (r) => r.key },
            { head: 'Posts', cell: (r) => r.posts },
            { head: 'Avg views', cell: (r) => compact(r.avgViews) },
            { head: 'Leads', cell: (r) => r.leads },
            { head: 'Jobs', cell: (r) => r.jobs },
            { head: 'Revenue', align: 'right', cell: (r) => <strong>{money(r.revenue)}</strong> },
          ]}
        />
      </div>
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-emerald)">Top cities</SectionTitle>{c.top.map((r) => <div key={r.key} className="row between" style={{ fontSize: '0.86rem', padding: '3px 0' }}><span>{r.key}</span><strong>{money(r.revenue)}</strong></div>)}</div>
        <div className="card stack"><SectionTitle accent="var(--warning)">Weak cities</SectionTitle>{c.weak.map((r) => <div key={r.key} className="row between" style={{ fontSize: '0.86rem', padding: '3px 0' }}><span>{r.key}</span><span className="muted">{money(r.revenue)} · {r.posts} posts</span></div>)}</div>
      </div>
    </div>
  );
}

// 5 ── Service Performance ────────────────────────────────────────────────────
export function ServicePerformanceView({ ds }: P) {
  const s = servicePerformance(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid grid-2">
        {s.mostProfitable && (
          <div className="card tile" style={{ ['--accent' as string]: 'var(--c-emerald)' }}>
            <div className="muted" style={{ fontSize: '0.74rem' }}>Most profitable service</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{s.mostProfitable.key}</div>
            <div className="muted" style={{ fontSize: '0.78rem' }}>{money(s.mostProfitable.revenue)} · {s.mostProfitable.jobs} jobs · {money(s.mostProfitable.avgTicket)} avg ticket</div>
          </div>
        )}
        {s.mostViral && (
          <div className="card tile" style={{ ['--accent' as string]: 'var(--c-pink)' }}>
            <div className="muted" style={{ fontSize: '0.74rem' }}>Most viral service (social)</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{s.mostViral.key}</div>
            <div className="muted" style={{ fontSize: '0.78rem' }}>{Math.round(s.mostViral.avgViral * 100)} viral · {compact(s.mostViral.avgViews)} avg views</div>
          </div>
        )}
      </div>
      <div className="card stack">
        <SectionTitle accent="var(--c-blue)">Revenue by service</SectionTitle>
        <RankTable
          rows={s.byRevenue}
          cols={[
            { head: 'Service', align: 'left', cell: (g) => g.key },
            { head: 'Jobs', cell: (g) => g.jobs },
            { head: 'Avg ticket', cell: (g) => money(g.avgTicket) },
            { head: 'Revenue', align: 'right', cell: (g) => <strong>{money(g.revenue)}</strong> },
          ]}
        />
      </div>
      {s.toPromote && (
        <div className="card stack">
          <SectionTitle accent="var(--c-amber)">Recommendation</SectionTitle>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Promote <strong>{s.toPromote}</strong> — it's your revenue leader. Pair it with your winning hook styles for the highest-ROI content. <Link className="btn btn-sm" to="/new-job">Create content →</Link></p>
        </div>
      )}
    </div>
  );
}

// 6 ── SEO Director ───────────────────────────────────────────────────────────
const SEO_ICON: Record<string, string> = { gbp_post: '📍', service_page: '📄', faq: '❓', schema: '🏷️', internal_link: '🔗' };
export function SeoDirectorView({ ds }: P) {
  const s = seoDirector(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack">
        <SectionTitle accent="var(--c-cyan)">Recommended SEO actions</SectionTitle>
        <div className="stack" style={{ gap: 8 }}>
          {s.recommendations.map((r, i) => (
            <div key={i} className="card" style={{ padding: 12 }}>
              <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
                <strong style={{ fontSize: '0.9rem' }}>{SEO_ICON[r.kind]} {r.title}</strong>
                <span className="tag" style={{ fontSize: '0.64rem', flex: '0 0 auto' }}>{r.kind.replace(/_/g, ' ')}</span>
              </div>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{r.detail}</p>
            </div>
          ))}
        </div>
        <Link className="btn btn-sm btn-primary" to="/seo" style={{ alignSelf: 'flex-start' }}>Open SEO Studio →</Link>
      </div>
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--warning)">Weak cities (demand we're not capturing)</SectionTitle>
          <RankTable
            rows={s.weakCities}
            cols={[
              { head: 'City', align: 'left', cell: (c) => c.city },
              { head: 'Impressions', cell: (c) => compact(c.impressions) },
              { head: 'Clicks', cell: (c) => compact(c.clicks) },
              { head: 'Avg pos', cell: (c) => Math.round(c.avgPosition) },
            ]}
          />
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--c-orange)">Coverage gaps (no landing page)</SectionTitle>
          {s.coverageGaps.length ? s.coverageGaps.map((g, i) => (
            <div key={i} className="row between" style={{ fontSize: '0.84rem', padding: '3px 0' }}>
              <span>{g.service}</span><span className="muted">{g.city}</span>
            </div>
          )) : <p className="muted" style={{ margin: 0 }}>No major gaps detected.</p>}
        </div>
      </div>
    </div>
  );
}

// 7 ── Review Director ────────────────────────────────────────────────────────
export function ReviewDirectorView({ ds }: P) {
  const r = reviewDirector(ds);
  const ThemeRow = ({ t }: { t: typeof r.positives[number] }) => (
    <div className="card" style={{ padding: 10 }}>
      <div className="row between"><strong style={{ fontSize: '0.86rem', textTransform: 'capitalize' }}>{t.theme.replace(/_/g, ' ')}</strong><span className="tag" style={{ fontSize: '0.66rem' }}>{t.count}×</span></div>
      {t.contentAngle && <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>💡 {t.contentAngle}</p>}
    </div>
  );
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid grid-3">
        <div className="card tile" style={{ ['--accent' as string]: 'var(--c-amber)' }}><div className="muted" style={{ fontSize: '0.74rem' }}>Avg rating</div><div className="stat-value">{r.avgRating.toFixed(1)}★</div></div>
        <div className="card tile" style={{ ['--accent' as string]: 'var(--c-emerald)' }}><div className="muted" style={{ fontSize: '0.74rem' }}>Reviews</div><div className="stat-value">{r.total}</div></div>
        <div className="card tile" style={{ ['--accent' as string]: 'var(--danger)' }}><div className="muted" style={{ fontSize: '0.74rem' }}>Complaint themes</div><div className="stat-value">{r.complaints.length}</div></div>
      </div>
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-emerald)">What customers love → make content</SectionTitle>{r.positives.map((t) => <ThemeRow key={t.theme} t={t} />)}</div>
        <div className="card stack"><SectionTitle accent="var(--danger)">Complaints → fix + address</SectionTitle>{r.complaints.length ? r.complaints.map((t) => <ThemeRow key={t.theme} t={t} />) : <p className="muted" style={{ margin: 0 }}>No recurring complaints. 🎉</p>}</div>
      </div>
    </div>
  );
}

// 8 ── Revenue Director ───────────────────────────────────────────────────────
export function RevenueDirectorView({ ds }: P) {
  const r = revenueBreakdown(ds);
  const exec = executiveSummary(ds);
  const revTable = (rows: typeof r.byService, head: string) => (
    <div className="card stack">
      <SectionTitle accent="var(--c-blue)">{head}</SectionTitle>
      <RankTable
        rows={rows}
        cols={[
          { head, align: 'left', cell: (g) => g.key },
          { head: 'Jobs', cell: (g) => g.jobs },
          { head: 'Avg', cell: (g) => money(g.avgTicket) },
          { head: 'Revenue', align: 'right', cell: (g) => <strong>{money(g.revenue)}</strong> },
        ]}
      />
    </div>
  );
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-emerald)">Acquisition funnel (social → revenue)</SectionTitle>
          <FunnelBar steps={[
            { label: 'Views', value: exec.views, accent: 'var(--c-blue)' },
            { label: 'Calls + leads', value: exec.calls + exec.leads, accent: 'var(--c-cyan)' },
            { label: 'Jobs', value: ds.jobs.length, accent: 'var(--c-emerald)' },
            { label: 'Revenue ($)', value: exec.revenue, accent: 'var(--c-amber)' },
          ]} />
        </div>
        <div className="card stack"><SectionTitle accent="var(--c-amber)">Revenue actions</SectionTitle><ActionList items={r.actions} /></div>
      </div>
      <div className="grid grid-2">
        {revTable(r.byService, 'Service')}
        {revTable(r.byCity, 'City')}
        {revTable(r.byVehicle, 'Vehicle')}
        {revTable(r.byTechnician, 'Technician')}
      </div>
    </div>
  );
}

// 9 ── Content Opportunities ──────────────────────────────────────────────────
export function ContentOpportunitiesView({ ds }: P) {
  const ideas = contentOpportunities(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>Generated from your winning hooks, top cities, and highest-revenue service — each scored 1–10.</p>
      {ideas.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Need at least 3 posts in a hook style before ideas are reliable.</p></div>}
      {ideas.map((idea, i) => (
        <div className="card stack" key={i} style={{ ['--accent' as string]: accentAt(i) }}>
          <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
            <strong style={{ fontSize: '0.96rem' }}>{idea.hook}</strong>
            <ScoreChip value={idea.scores.overall} label="Overall" />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{idea.angle}</p>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <ScoreChip value={idea.scores.hook} label="Hook" />
            <ScoreChip value={idea.scores.retention} label="Retention" />
            <ScoreChip value={idea.scores.engagement} label="Engage" />
            <ScoreChip value={idea.scores.seo} label="SEO" />
            <ScoreChip value={idea.scores.local} label="Local" />
          </div>
          <div className="row" style={{ gap: 8 }}>
            {[idea.city, idea.service, POST_PLATFORM_LABELS[idea.platform]].filter(Boolean).map((t) => <span key={t} className="tag" style={{ fontSize: '0.68rem' }}>{t}</span>)}
            <Link className="btn btn-sm btn-primary" to="/new-job" style={{ marginLeft: 'auto' }}>Create →</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// 10 ── Daily Brief ───────────────────────────────────────────────────────────
export function DailyBriefView({ ds }: P) {
  const b = dailyBrief(ds);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack">
        <SectionTitle accent="var(--c-violet)">What happened</SectionTitle>
        <div className="grid grid-3">{b.whatHappened.map((f, i) => <KpiTile key={f.label} finding={f} accent={accentAt(i)} />)}</div>
      </div>
      <div className="card stack">
        <SectionTitle accent="var(--c-blue)">Why it happened</SectionTitle>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{b.whyItHappened.map((w, i) => <li key={i} style={{ fontSize: '0.86rem', marginBottom: 4 }}>{w}</li>)}</ul>
      </div>
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-emerald)">What to do next</SectionTitle><ActionList items={b.doNext} /></div>
        <div className="card stack"><SectionTitle accent="var(--danger)">What to stop doing</SectionTitle><ActionList items={b.stopDoing} emptyText="Nothing to cut — keep going." /></div>
      </div>
      <div className="grid grid-3">
        <Callout title="Highest ROI" item={b.highestRoi} accent="var(--success)" icon="↗" />
        <Callout title="Biggest growth" item={b.biggestGrowth} accent="var(--c-cyan)" icon="📈" />
        <Callout title="Most urgent" item={b.mostUrgent} accent="var(--danger)" icon="⚠" />
      </div>
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-blue)">Top 3 today</SectionTitle><ActionList items={b.top3Today} /></div>
        <div className="card stack"><SectionTitle accent="var(--c-amber)">Top 3 this week</SectionTitle><ActionList items={b.top3Week} /></div>
      </div>
    </div>
  );
}

// Source badges (shows which data is sample vs live) ──────────────────────────
const STATE_COLOR: Record<string, string> = { sample: 'var(--c-violet)', connected: 'var(--success)', disconnected: 'var(--text-dim)', error: 'var(--danger)' };
const STATE_DOT: Record<string, string> = { sample: '◆', connected: '●', disconnected: '○', error: '✕' };
export function SourceBadges({ ds }: P) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {ds.sources.map((s) => (
        <span key={s.id} className="tag" title={`${s.label}: ${s.state}`} style={{ borderColor: STATE_COLOR[s.state], color: STATE_COLOR[s.state], fontSize: '0.68rem' }}>
          {STATE_DOT[s.state]} {s.label}
        </span>
      ))}
    </div>
  );
}
