// Leaderboard — top performers across every dimension. The "Hooks" tab doubles
// as Hook Analytics (hook text → posts/views/completion/shares/leads/score).
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { usePostPerformance } from '../hooks/usePostPerformance';
import { compact, pct, scoreColor } from '../lib/analytics/format';
import {
  byHookText,
  byCaptionFramework,
  byCity,
  byService,
  byVehicle,
  hashtagStats,
  rankBy,
  topPosts,
  type DimensionStat,
} from '../lib/analytics/intelligence';
import { POST_PLATFORM_LABELS } from '../types/analytics';
import type { PostPerformance } from '../types/analytics';

type Tab = 'hooks' | 'videos' | 'captions' | 'locations' | 'services' | 'vehicles' | 'hashtags';
const TABS: { key: Tab; label: string }[] = [
  { key: 'hooks', label: 'Top Hooks' },
  { key: 'videos', label: 'Top Videos' },
  { key: 'captions', label: 'Top Captions' },
  { key: 'locations', label: 'Top Locations' },
  { key: 'services', label: 'Top Services' },
  { key: 'vehicles', label: 'Top Vehicles' },
  { key: 'hashtags', label: 'Top Hashtags' },
];

const MIN_SAMPLE = 3;

function StatTable({ stats }: { stats: DimensionStat[] }) {
  const ranked = rankBy(stats, 'avgViews');
  if (ranked.length === 0) return <Empty />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>#</th>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th>Posts</th>
            <th>Avg views</th>
            <th>Compl</th>
            <th>Shares</th>
            <th>Leads</th>
            <th>Viral</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s, i) => (
            <tr key={s.key} style={{ opacity: s.count < MIN_SAMPLE ? 0.6 : 1 }}>
              <td>{i + 1}</td>
              <td>
                {s.key}
                {s.count < MIN_SAMPLE && <span className="muted" title="Low confidence — fewer than 3 posts"> *</span>}
              </td>
              <td style={{ textAlign: 'center' }}>{s.count}</td>
              <td style={{ textAlign: 'center' }}>{compact(s.avgViews)}</td>
              <td style={{ textAlign: 'center' }}>{pct(s.avgCompletion)}</td>
              <td style={{ textAlign: 'center' }}>{compact(s.shares)}</td>
              <td style={{ textAlign: 'center' }}>{s.leads}</td>
              <td style={{ textAlign: 'center', color: scoreColor(s.avgViral), fontWeight: 600 }}>{Math.round(s.avgViral * 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: '0.7rem', margin: '4px 0 0' }}>* fewer than {MIN_SAMPLE} posts — not enough data to trust yet.</p>
    </div>
  );
}

function VideoTable({ rows }: { rows: PostPerformance[] }) {
  const ranked = topPosts(rows, 'viralScore').filter((r) => r.metrics.views > 0);
  if (ranked.length === 0) return <Empty />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>#</th>
            <th style={{ textAlign: 'left' }}>Post</th>
            <th>Views</th>
            <th>Compl</th>
            <th>Leads</th>
            <th>Viral</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{r.hookText ? `“${r.hookText.slice(0, 50)}”` : POST_PLATFORM_LABELS[r.platform]}</div>
                <div className="muted" style={{ fontSize: '0.72rem' }}>{[POST_PLATFORM_LABELS[r.platform], r.hookCategory, r.city].filter(Boolean).join(' · ')}</div>
              </td>
              <td style={{ textAlign: 'center' }}>{compact(r.metrics.views)}</td>
              <td style={{ textAlign: 'center' }}>{pct(r.metrics.completionRate)}</td>
              <td style={{ textAlign: 'center' }}>{r.metrics.leads}</td>
              <td style={{ textAlign: 'center', color: scoreColor(r.scores.viralScore), fontWeight: 600 }}>{Math.round(r.scores.viralScore * 100)}</td>
              <td style={{ textAlign: 'right' }}>{r.postUrl && <a className="btn btn-sm" href={r.postUrl} target="_blank" rel="noreferrer">↗</a>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Empty = () => <p className="muted" style={{ margin: 0 }}>No data for this view yet.</p>;

export default function Leaderboard() {
  const { items, loading } = usePostPerformance();
  const [tab, setTab] = useState<Tab>('hooks');

  const body = useMemo(() => {
    switch (tab) {
      case 'hooks': return <StatTable stats={byHookText(items)} />;
      case 'videos': return <VideoTable rows={items} />;
      case 'captions': return <StatTable stats={byCaptionFramework(items)} />;
      case 'locations': return <StatTable stats={byCity(items)} />;
      case 'services': return <StatTable stats={byService(items)} />;
      case 'vehicles': return <StatTable stats={byVehicle(items)} />;
      case 'hashtags': return <StatTable stats={hashtagStats(items)} />;
    }
  }, [tab, items]);

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle="Your best-performing content, ranked"
        actions={<Link className="btn btn-sm" to="/analytics">← Analytics</Link>}
      />
      <div className="row" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`btn btn-sm${tab === t.key ? ' btn-primary' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card stack">
        {loading ? <p className="muted" style={{ margin: 0 }}>Loading…</p> : items.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No performance data yet — add metrics in <Link to="/analytics">Analytics</Link> first.</p>
        ) : body}
      </div>
    </>
  );
}
