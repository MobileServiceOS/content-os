// Home — the owner's daily cockpit (Wave 1). The first surface they open and the
// reason they renew: this week's money, the single prioritized "do these 3 today"
// feed, proactive alerts, and a pre-publish content score — all from live
// connected data (MSOS revenue, TikTok, Search Console, owner reviews). No mock
// numbers: when nothing's connected it points to the Director to connect.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useMsosJobs } from '../hooks/useMsosJobs';
import { useSocialPlatform } from '../hooks/useSocialPlatform';
import { useSearchConsole } from '../hooks/useSearchConsole';
import { ownerSummary } from '../lib/director/ownerExecutive';
import { money } from '../lib/director/msosWidgets';
import { parseReviews, analyzeReviews, type ReviewVocab } from '../lib/director/reviewIntel';
import { predictContentScore, type ScoreBand } from '../lib/director/viralIntel';
import { cockpitMoves, cockpitAlerts, type CockpitMove, type AlertTone } from '../lib/director/homeCockpit';
import { buildSnapshot, persistCockpitSnapshot } from '../lib/director/cockpitSnapshot';
import { contentRoi, totalInfluenced, revenuePerThousandViews } from '../lib/director/contentRoi';
import type { SocialVocab } from '../lib/director/social/types';

const REVIEW_STORE_KEY = 'reviewIntel.text';
const uniq = (xs: string[]): string[] => [...new Set(xs.filter(Boolean))];

const BAND_COLOR: Record<ScoreBand, string> = { Low: 'var(--danger)', Medium: 'var(--warning)', High: 'var(--c-blue)', Viral: 'var(--c-emerald)' };
const ALERT_COLOR: Record<AlertTone, string> = { bad: 'var(--danger)', warn: 'var(--warning)', opportunity: 'var(--c-blue)' };
const IMPACT_COLOR: Record<CockpitMove['impact'], string> = { high: 'var(--c-emerald)', med: 'var(--c-amber)', low: 'var(--text-dim)' };

function Tile({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted" style={{ fontSize: '0.72rem' }}>{sub}</div>}
    </div>
  );
}

function ContentScore({ vocab, social }: { vocab: SocialVocab; social: ReturnType<typeof useSocialPlatform>['data'] }) {
  const [draft, setDraft] = useState('');
  const pred = useMemo(() => (draft.trim().length >= 4 ? predictContentScore(draft, social, vocab) : null), [draft, social, vocab]);
  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--c-pink)' }} />Score a post before you publish</h2>
      <textarea className="textarea" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)}
        placeholder={'Paste a hook, e.g. "Stuck with a blowout in Miami? Watch this."'} />
      {pred && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="tag" style={{ borderColor: BAND_COLOR[pred.band], color: BAND_COLOR[pred.band], fontWeight: 800 }}>
            {pred.band}{pred.predictedViews > 0 ? ` · ~${pred.predictedViews.toLocaleString()} views` : ''}
          </span>
          <span className="muted" style={{ fontSize: '0.78rem', flex: 1, minWidth: 220 }}>{pred.rationale}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { jobs, loading, needsConnect, account } = useMsosJobs();
  const tk = useSocialPlatform('tiktok');
  const sc = useSearchConsole();

  const vocab: SocialVocab = useMemo(
    () => ({ cities: brand?.serviceAreas ?? [], services: brand?.services ?? [] }),
    [brand],
  );

  // Fold the owner's pasted reviews (same store as Review Intel) into the feed.
  const reviews = useMemo(() => {
    const text = typeof localStorage !== 'undefined' ? localStorage.getItem(REVIEW_STORE_KEY) ?? '' : '';
    if (!text.trim()) return null;
    const vv: ReviewVocab = {
      cities: uniq(jobs.map((j) => j.city)),
      services: uniq(jobs.map((j) => j.service)),
      technicians: uniq(jobs.map((j) => j.technician).filter((t) => t && t !== 'Unassigned')),
    };
    return analyzeReviews(parseReviews(text), vv);
  }, [jobs]);

  const [now] = useState(() => Date.now()); // stable per mount (month windows + snapshot stamp)
  const input = { jobs, social: tk.data, sc: sc.data, reviews, vocab, now };
  const summary = useMemo(() => ownerSummary(jobs, now), [jobs, now]);
  const moves = useMemo(() => cockpitMoves(input), [jobs, tk.data, sc.data, reviews, vocab, now]);
  const alerts = useMemo(() => cockpitAlerts(input), [jobs, tk.data, sc.data, reviews, vocab, now]);
  const roi = useMemo(() => contentRoi(tk.data, jobs, vocab), [tk.data, jobs, vocab]);
  const roiInfluenced = totalInfluenced(roi);

  // Persist the cockpit snapshot (throttled to ~once/6h) so the Monday digest
  // function can email these numbers — the server can't read MSOS directly.
  useEffect(() => {
    if (!businessId || needsConnect || loading || jobs.length === 0) return;
    const snap = buildSnapshot({
      businessId, businessName: brand?.businessName ?? 'Your business',
      ownerEmail: user?.email ?? null, now, summary, moves, alerts, roi,
    });
    void persistCockpitSnapshot(snap).catch(() => {}); // best-effort; denied until cockpit rules deploy
  }, [businessId, needsConnect, loading, jobs.length, summary, moves, alerts, roi, brand, user, now]);

  const title = brand?.businessName ?? 'Home';

  if (needsConnect) {
    return (
      <>
        <PageHeader title={title} subtitle="Your money and your next moves — live." />
        <div className="card stack" style={{ maxWidth: 460 }}>
          <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--warning)' }} />Connect your business</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
            Sign in to Mobile Service OS (read-only) to see your revenue, profit, and today's
            prioritized moves here. It takes a minute and stays connected.
          </p>
          <Link className="btn btn-primary" to="/director" style={{ alignSelf: 'flex-start' }}>Connect in Marketing Director →</Link>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageHeader title={title} subtitle="Your money and your next moves — live." />
        <div className="card"><p className="muted" style={{ margin: 0 }}>Loading your numbers…</p></div>
      </>
    );
  }

  const g = summary.growthPct;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`Your money and your next moves — live${account ? ` · ${account}` : ''}.`}
      />

      {/* Money strip */}
      <div className="grid grid-3">
        <Tile label="Revenue (completed)" value={money(summary.revenue)} accent="var(--c-emerald)" />
        <Tile label="Profit" value={summary.profitKnown ? money(summary.profit) : '—'} accent="var(--c-blue)"
          sub={summary.profitKnown && summary.marginPct != null ? `${Math.round(summary.marginPct * 100)}% margin` : 'cost not recorded'} />
        <Tile label="Jobs" value={String(summary.jobs)} accent="var(--c-cyan)" />
        <Tile label="Avg ticket" value={money(summary.avgTicket)} accent="var(--c-amber)" />
        <Tile label="Growth (mo/mo)" value={g != null ? `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%` : '—'}
          accent={g != null && g < 0 ? 'var(--danger)' : 'var(--success)'} sub={g == null ? 'no prior-month data' : undefined} />
        <Tile label="Best city" value={summary.bestCity ?? '—'} accent="var(--c-violet)" sub={summary.bestService ? `Top service: ${summary.bestService}` : undefined} />
      </div>

      {/* Content ROI — the renewal number, on the first screen */}
      {roiInfluenced > 0 && (
        <Link to="/director" className="card" style={{ marginTop: 12, display: 'block', textDecoration: 'none', ['--accent' as string]: 'var(--c-emerald)' }}>
          <div className="row between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.92rem' }}>📈 Your content influenced <strong style={{ color: 'var(--success)' }}>{money(roiInfluenced)}</strong> of revenue <span className="muted">· {money(revenuePerThousandViews(roi))} per 1K views</span></span>
            <span className="muted" style={{ fontSize: '0.74rem' }}>See Content ROI →</span>
          </div>
        </Link>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {alerts.map((a, i) => (
            <Link key={i} to={a.to ?? '/director'} className="tag"
              style={{ borderColor: ALERT_COLOR[a.tone], color: ALERT_COLOR[a.tone], fontSize: '0.76rem', textDecoration: 'none' }}>
              {a.tone === 'bad' ? '▼ ' : a.tone === 'warn' ? '! ' : '+ '}{a.text}
            </Link>
          ))}
        </div>
      )}

      {/* The hero: do these 3 today */}
      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--c-violet)' }} />{moves.length > 0 ? `Do ${moves.length === 1 ? 'this' : `these ${moves.length}`} today` : 'Today’s moves'}</h2>
        {moves.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
            {jobs.length === 0
              ? 'No jobs yet for this business. Once jobs come in, your prioritized moves appear here.'
              : 'Connect TikTok and Search Console in the Marketing Director to unlock prioritized content moves.'}
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            {moves.map((m, i) => (
              <li key={i} style={{ marginBottom: 12 }}>
                <div className="row between" style={{ alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.92rem' }}>{m.text}</strong>
                      <span className="tag" style={{ fontSize: '0.64rem', borderColor: IMPACT_COLOR[m.impact], color: IMPACT_COLOR[m.impact] }}>{m.impact}</span>
                      {m.dollars != null && m.dollars > 0 && (
                        <span className="tag" style={{ fontSize: '0.64rem', borderColor: 'var(--success)', color: 'var(--success)' }}>{money(m.dollars)} opportunity</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>{m.why}</div>
                  </div>
                  <Link className="btn btn-sm" to={m.to} style={{ flex: '0 0 auto' }}>Go →</Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Content score */}
      <div style={{ marginTop: 16 }}>
        <ContentScore vocab={vocab} social={tk.data} />
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: '0.76rem' }}>
        Full breakdowns live in the <Link to="/director">Marketing Director</Link> — revenue, viral intelligence, SEO, GBP, and reviews.
      </p>
    </>
  );
}
