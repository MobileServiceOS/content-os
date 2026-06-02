// Performance Intelligence — "what's working", with sample-size guards so a
// single lucky post never becomes a recommendation. Also shows the live
// Learning Engine bias derived from the same data.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useBusiness } from '../context/BusinessContext';
import { usePostPerformance } from '../hooks/usePostPerformance';
import { compact, pct } from '../lib/analytics/format';
import {
  byHookCategory, byCaptionFramework, byCity, byService, byVehicle, byTireSize,
  byTimeBucket, byVideoLength, bestBy, timeBucketLabel, type DimensionStat, type StatMetric,
} from '../lib/analytics/intelligence';
import { deriveBias, favoredStyles, hasBias } from '../lib/analytics/learning';
import type { PostPerformance } from '../types/analytics';

type Fmt = (s: DimensionStat) => string;
const fViews: Fmt = (s) => `${compact(s.avgViews)} avg views`;
const fViral: Fmt = (s) => `${Math.round(s.avgViral * 100)} viral score`;
const fCompletion: Fmt = (s) => `${pct(s.avgCompletion)} completion`;

const labelKey = (raw: string, isTime: boolean): string => (isTime ? timeBucketLabel(raw) : raw.replace(/_/g, ' '));

function BestPanel({
  title, stats, metric, fmt, isTime = false,
}: { title: string; stats: DimensionStat[]; metric: StatMetric; fmt: Fmt; isTime?: boolean }) {
  const res = bestBy(stats, metric, 3);
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <span className="muted" style={{ fontSize: '0.74rem' }}>{title}</span>
      {res.confident && res.leader ? (
        <>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'capitalize' }}>{labelKey(res.leader.key, isTime)}</div>
          <div className="muted" style={{ fontSize: '0.74rem' }}>{fmt(res.leader)} · {res.leader.count} posts</div>
        </>
      ) : res.tentative ? (
        <>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize', opacity: 0.7 }}>{labelKey(res.tentative.key, isTime)}</div>
          <div className="muted" style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>Leading, but only {res.tentative.count} post{res.tentative.count === 1 ? '' : 's'} — needs more data.</div>
        </>
      ) : (
        <div className="muted" style={{ fontSize: '0.8rem' }}>No data yet.</div>
      )}
    </div>
  );
}

export default function Intelligence() {
  const { brand } = useBusiness();
  const { items, loading } = usePostPerformance();
  const withMetrics = useMemo(() => items.filter((i: PostPerformance) => i.metrics.views > 0), [items]);

  const bias = useMemo(() => deriveBias(withMetrics), [withMetrics]);
  const favored = useMemo(() => favoredStyles(bias), [bias]);
  const learningOn = brand?.learningEnabled ?? false;

  return (
    <>
      <PageHeader title="Performance Intelligence" subtitle="What's actually working — and what to make more of" />

      {loading ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Loading…</p></div>
      ) : withMetrics.length === 0 ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Nothing to learn from yet</h2>
          <p className="muted" style={{ margin: 0 }}>Add metrics to a few posts in <Link to="/analytics">Analytics</Link>, then the patterns show up here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            <BestPanel title="Best hook category" stats={byHookCategory(withMetrics)} metric="avgViral" fmt={fViral} />
            <BestPanel title="Best caption style" stats={byCaptionFramework(withMetrics)} metric="avgViral" fmt={fViral} />
            <BestPanel title="Best service" stats={byService(withMetrics)} metric="avgViews" fmt={fViews} />
            <BestPanel title="Best vehicle" stats={byVehicle(withMetrics)} metric="avgViews" fmt={fViews} />
            <BestPanel title="Best tire size" stats={byTireSize(withMetrics)} metric="avgViews" fmt={fViews} />
            <BestPanel title="Best location" stats={byCity(withMetrics)} metric="avgViews" fmt={fViews} />
            <BestPanel title="Best time to post" stats={byTimeBucket(withMetrics)} metric="avgViews" fmt={fViews} isTime />
            <BestPanel title="Best video length" stats={byVideoLength(withMetrics)} metric="avgViral" fmt={fViral} />
            <BestPanel title="Highest completion" stats={byHookCategory(withMetrics)} metric="avgCompletion" fmt={fCompletion} />
          </div>

          <div className="card stack" style={{ marginTop: 16 }}>
            <div className="row between">
              <h2 style={{ margin: 0 }}><span className="sec-dot" style={{ ['--accent' as string]: 'var(--c-violet)' }} />Learning engine</h2>
              <span className="tag" style={{ borderColor: learningOn ? 'var(--success)' : 'var(--border)' }}>
                {learningOn ? '● On' : '○ Off'}
              </span>
            </div>
            {hasBias(bias) ? (
              <>
                <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                  {learningOn
                    ? 'These proven styles are being favored in generation now (variety is still preserved):'
                    : 'If you turn the learning engine on (Brand Settings), these proven styles would be favored:'}
                </p>
                <div className="row">
                  {favored.hooks.map((h) => <span key={h} className="tag" style={{ borderColor: 'var(--success)', textTransform: 'capitalize' }}>hook: {h.replace(/_/g, ' ')}</span>)}
                  {favored.frameworks.map((f) => <span key={f} className="tag" style={{ borderColor: 'var(--c-blue)', textTransform: 'capitalize' }}>caption: {f.replace(/_/g, ' ')}</span>)}
                  {favored.hooks.length === 0 && favored.frameworks.length === 0 && <span className="muted" style={{ fontSize: '0.8rem' }}>No clear front-runners above your average yet.</span>}
                </div>
                {!learningOn && <Link className="btn btn-sm" to="/brand">Turn on in Brand Settings →</Link>}
              </>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                Not enough comparable data to bias generation yet — aim for 3+ posts in at least two hook styles.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
