// Phase 3 — GBP Intelligence tab. Connect button + the five connection states +
// real metrics (calls, website clicks, direction requests, search + maps views),
// calls + maps-visibility trends, derived top cities/services, review trends, and
// recommendations (city to target, service to promote, posts to create, reviews
// to respond to). Uses the existing design system. No mock data.
import { useBusiness } from '../../context/BusinessContext';
import { useGbp } from '../../hooks/useGbp';
import { compact } from '../../lib/analytics/format';
import {
  topCities, topServices, callsTrend, mapsTrend, gbpRecommendations,
  type GbpVocab, type KeywordGroup,
} from '../../lib/director/gbpIntel';
import { SectionTitle, RankTable, type Col } from './shared';
import TrendChart, { type TrendPoint } from '../analytics/TrendChart';

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

const kwCols = (head: string): Col<KeywordGroup>[] => [
  { head, align: 'left', cell: (g) => g.key },
  { head: 'GBP impressions', cell: (g) => compact(g.impressions) },
  { head: 'Search terms', cell: (g) => g.matches },
];

const toPoints = (pts: { date: string; value: number }[]): TrendPoint[] => pts.map((p) => ({ label: p.date.slice(5), value: p.value }));

export function GbpIntelligence() {
  const { brand } = useBusiness();
  const { status, data, locationTitle, lastSync, error, connect, sync, disconnect } = useGbp();
  const vocab: GbpVocab = { cities: brand?.serviceAreas ?? [], services: brand?.services ?? [] };

  if (status === 'disconnected') {
    return (
      <div className="card stack" style={{ maxWidth: 480 }}>
        <SectionTitle accent="var(--c-cyan)">Connect Google Business Profile</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
          Pulls your calls, website clicks, direction requests, and search/maps views — plus reviews and the search
          terms people use to find you. We only ever <strong>read</strong> (never post or reply); tokens are handled
          server-side and never stored in your browser.
        </p>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => void connect()}>Connect Business Profile →</button>
        {error && <p className="muted" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }
  if (status === 'connecting') return <div className="card"><p className="muted" style={{ margin: 0 }}>Redirecting to Google for consent…</p></div>;
  if (status === 'error') {
    return (
      <div className="card stack">
        <SectionTitle accent="var(--danger)">Business Profile error</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{error ?? 'Something went wrong.'}</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={() => void sync()}>Retry sync</button>
          <button className="btn btn-sm" onClick={() => void connect()}>Reconnect</button>
          <button className="btn btn-sm" onClick={() => void disconnect()}>Disconnect</button>
        </div>
      </div>
    );
  }

  const header = (
    <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
      <span className="tag" style={{ borderColor: 'var(--success)', color: 'var(--success)', fontSize: '0.7rem' }}>
        ● Business Profile · read-only{locationTitle ? ` · ${locationTitle}` : ''}{status === 'syncing' ? ' · syncing…' : lastSync ? ` · synced ${new Date(lastSync).toLocaleString()}` : ''}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm" onClick={() => void sync()} disabled={status === 'syncing'}>{status === 'syncing' ? 'Syncing…' : 'Sync now'}</button>
        <button className="btn btn-sm" onClick={() => void disconnect()}>Disconnect</button>
      </div>
    </div>
  );

  if (!data) {
    return <div className="stack" style={{ gap: 16 }}>{header}<div className="card"><p className="muted" style={{ margin: 0 }}>{status === 'syncing' ? 'Pulling your Business Profile data…' : 'Connected — click "Sync now" to pull your data.'}</p></div></div>;
  }

  const recs = gbpRecommendations(data, vocab);
  const t = data.totals;
  return (
    <div className="stack" style={{ gap: 16 }}>
      {header}

      {/* Performance metrics */}
      <div className="grid grid-3">
        <Tile label="Calls" value={compact(t.calls)} accent="var(--c-emerald)" />
        <Tile label="Website clicks" value={compact(t.websiteClicks)} accent="var(--c-blue)" />
        <Tile label="Direction requests" value={compact(t.directionRequests)} accent="var(--c-violet)" />
        <Tile label="Search views" value={compact(t.searchViews)} accent="var(--c-amber)" />
        <Tile label="Maps views" value={compact(t.mapsViews)} accent="var(--c-cyan)" />
        {data.reviews.available && <Tile label="Avg rating" value={`${data.reviews.averageRating.toFixed(1)}★`} accent="var(--c-pink)" />}
      </div>

      {/* Recommendations */}
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-pink)">Recommendations</SectionTitle>
          {recs.cityToTarget && <p style={{ margin: 0, fontSize: '0.86rem' }}>🎯 <strong>Target {recs.cityToTarget} next</strong> — your top-searched city on Google.</p>}
          {recs.serviceToPromote && <p style={{ margin: 0, fontSize: '0.86rem' }}>📣 <strong>Promote {recs.serviceToPromote}</strong> — most-searched service.</p>}
          {recs.posts.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GBP posts to create</span>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{recs.posts.map((p, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 4 }}>{p}</li>)}</ul>
            </div>
          )}
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--danger)">Reviews needing a response</SectionTitle>
          {!data.reviews.available ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>Review data needs the Business Profile reviews API (allowlisting). Once granted, unreplied reviews show here.</p>
          ) : recs.reviewsNeedingResponse.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>All caught up — no unanswered reviews. 🎉</p>
          ) : recs.reviewsNeedingResponse.map((r) => (
            <div key={r.id} className="card" style={{ padding: 10 }}>
              <div className="row between"><strong style={{ fontSize: '0.84rem' }}>{r.reviewer}</strong><span className="tag" style={{ fontSize: '0.66rem' }}>{'★'.repeat(r.rating)}</span></div>
              {r.comment && <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>“{r.comment.slice(0, 140)}”</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-emerald)">Calls trend</SectionTitle><TrendChart points={toPoints(callsTrend(data))} accent="var(--c-emerald)" label="Calls/day" /></div>
        <div className="card stack"><SectionTitle accent="var(--c-cyan)">Maps visibility trend</SectionTitle><TrendChart points={toPoints(mapsTrend(data))} accent="var(--c-cyan)" label="Maps views/day" /></div>
      </div>

      {/* Top cities / services (derived) */}
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-blue)">Top cities <span className="muted" style={{ fontSize: '0.66rem', fontWeight: 400 }}>(from Google search terms)</span></SectionTitle>
          <RankTable rows={topCities(data, vocab)} cols={kwCols('City')} empty="No city matches in your Google search terms yet." />
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--c-orange)">Top services <span className="muted" style={{ fontSize: '0.66rem', fontWeight: 400 }}>(from Google search terms)</span></SectionTitle>
          <RankTable rows={topServices(data, vocab)} cols={kwCols('Service')} empty="No service matches in your Google search terms yet." />
        </div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>
        Metrics + reviews are native Business Profile data. "Top cities/services" are derived from the Google search terms people used to find you, matched against your Brand Settings.
      </p>
    </div>
  );
}
