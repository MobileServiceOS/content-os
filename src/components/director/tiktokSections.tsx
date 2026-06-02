// TikTok Intelligence tab. Connect + five states, then: performance KPIs,
// Intelligence (top videos/hooks/services/cities/posting-times/lengths +
// engagement trend), Content Engine (10 ideas, 10 hooks, cities, services,
// schedule), and Revenue cross-reference against live MSOS jobs. Reusable shell:
// IG/FB/YT will render the same component with a different platform id. Existing
// design system; no mock data.
import { useBusiness } from '../../context/BusinessContext';
import { useSocialPlatform } from '../../hooks/useSocialPlatform';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import { compact, pct } from '../../lib/analytics/format';
import { money } from '../../lib/director/msosWidgets';
import {
  topVideos, topHooks, topCities, topServices, bestPostingTimes, bestVideoLengths, engagementTrend,
  type VideoRow, type KwGroup,
} from '../../lib/director/social/socialIntel';
import { videoIdeas, hookRecommendations, postingSchedule } from '../../lib/director/social/contentEngine';
import { viewsVsRevenue, cityVsRevenue, contentVsRevenue, contentOpportunities, type CrossRow } from '../../lib/director/social/revenueCrossref';
import { engagementRate, type SocialVocab } from '../../lib/director/social/types';
import { SectionTitle, RankTable, type Col } from './shared';
import TrendChart from '../analytics/TrendChart';

const PLATFORM = 'tiktok';

function Tile({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted" style={{ fontSize: '0.72rem' }}>{sub}</div>}
    </div>
  );
}

const kwCols = (head: string): Col<KwGroup>[] => [
  { head, align: 'left', cell: (g) => g.key },
  { head: 'Views', cell: (g) => compact(g.views) },
  { head: 'Videos', cell: (g) => g.videos },
];
const crossCols = (head: string): Col<CrossRow>[] => [
  { head, align: 'left', cell: (r) => r.key },
  { head: 'Videos', cell: (r) => r.videos },
  { head: 'Views', cell: (r) => compact(r.views) },
  { head: 'Revenue', align: 'right', cell: (r) => <strong>{money(r.revenue)}</strong> },
];

export function TikTokIntelligence() {
  const { brand } = useBusiness();
  const { status, data, lastSync, error, connect, sync, disconnect } = useSocialPlatform(PLATFORM);
  const { jobs } = useMsosJobs();
  const vocab: SocialVocab = { cities: brand?.serviceAreas ?? [], services: brand?.services ?? [] };

  if (status === 'disconnected') {
    return (
      <div className="card stack" style={{ maxWidth: 480 }}>
        <SectionTitle accent="var(--c-pink)">Connect TikTok</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
          Pulls your video performance (views, likes, comments, shares), follower count, captions, and post times to
          power intelligence + content ideas. <strong>Read-only</strong>; tokens are handled server-side, never in your browser.
        </p>
        <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
          Requires a TikTok developer app (client key/secret). Reach, favorites, profile visits, avg watch time,
          completion rate, and followers-gained need TikTok's Business API and show as "not available" until then.
        </p>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => void connect()}>Connect TikTok →</button>
        {error && <p className="muted" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }
  if (status === 'connecting') return <div className="card"><p className="muted" style={{ margin: 0 }}>Redirecting to TikTok…</p></div>;
  if (status === 'error') {
    return (
      <div className="card stack">
        <SectionTitle accent="var(--danger)">TikTok error</SectionTitle>
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
        ● TikTok · read-only{data?.account.displayName ? ` · @${data.account.username || data.account.displayName}` : ''}{status === 'syncing' ? ' · syncing…' : lastSync ? ` · synced ${new Date(lastSync).toLocaleString()}` : ''}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm" onClick={() => void sync()} disabled={status === 'syncing'}>{status === 'syncing' ? 'Syncing…' : 'Sync now'}</button>
        <button className="btn btn-sm" onClick={() => void disconnect()}>Disconnect</button>
      </div>
    </div>
  );

  if (!data) {
    return <div className="stack" style={{ gap: 16 }}>{header}<div className="card"><p className="muted" style={{ margin: 0 }}>{status === 'syncing' ? 'Pulling your TikTok data…' : 'Connected — click "Sync now" to pull your data.'}</p></div></div>;
  }

  const ideas = videoIdeas(data, vocab);
  const hooks = hookRecommendations(data, vocab);
  const cross = viewsVsRevenue(data, jobs);
  const opps = contentOpportunities(data, jobs, vocab);
  const vidCols: Col<VideoRow>[] = [
    { head: 'Video', align: 'left', cell: (v) => <span style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.caption || v.id}</span> },
    { head: 'Views', cell: (v) => compact(v.views) },
    { head: 'Likes', cell: (v) => compact(v.likes) },
    { head: 'Eng', cell: (v) => pct(v.engagement) },
  ];

  return (
    <div className="stack" style={{ gap: 16 }}>
      {header}

      {/* KPIs */}
      <div className="grid grid-3">
        <Tile label="Views" value={compact(data.totals.views)} accent="var(--c-emerald)" />
        <Tile label="Likes" value={compact(data.totals.likes)} accent="var(--c-pink)" />
        <Tile label="Comments" value={compact(data.totals.comments)} accent="var(--c-blue)" />
        <Tile label="Shares" value={compact(data.totals.shares)} accent="var(--c-violet)" />
        <Tile label="Followers" value={compact(data.account.followers)} accent="var(--c-amber)" />
        <Tile label="Avg engagement" value={pct(data.videos.length ? data.videos.reduce((a, v) => a + engagementRate(v), 0) / data.videos.length : 0)} accent="var(--c-cyan)" />
      </div>
      {data.unavailable.length > 0 && (
        <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>Not available via TikTok's Display API (needs Business API): {data.unavailable.join(', ')}.</p>
      )}

      {/* Intelligence */}
      <div className="card stack"><SectionTitle accent="var(--c-emerald)">Top performing videos</SectionTitle><RankTable rows={topVideos(data)} cols={vidCols} /></div>
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-pink)">Top hooks</SectionTitle>
          {topHooks(data).map((h, i) => <div key={i} className="row between" style={{ fontSize: '0.84rem', padding: '3px 0' }}><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{h.hook}”</span><span className="muted" style={{ flex: '0 0 auto' }}>{compact(h.views)}</span></div>)}
        </div>
        <div className="card stack"><SectionTitle accent="var(--c-cyan)">Engagement trend</SectionTitle><TrendChart points={engagementTrend(data)} accent="var(--c-cyan)" label="Engagement % per video" /></div>
        <div className="card stack"><SectionTitle accent="var(--c-blue)">Top cities</SectionTitle><RankTable rows={topCities(data, vocab)} cols={kwCols('City')} empty="No city matches in captions yet." /></div>
        <div className="card stack"><SectionTitle accent="var(--c-orange)">Top services</SectionTitle><RankTable rows={topServices(data, vocab)} cols={kwCols('Service')} empty="No service matches in captions yet." /></div>
        <div className="card stack"><SectionTitle accent="var(--c-violet)">Best posting times</SectionTitle><RankTable rows={bestPostingTimes(data)} cols={[{ head: 'Slot', align: 'left', cell: (s) => s.label }, { head: 'Posts', cell: (s) => s.videos }, { head: 'Avg views', cell: (s) => compact(s.avgViews) }]} /></div>
        <div className="card stack"><SectionTitle accent="var(--c-amber)">Best video lengths</SectionTitle><RankTable rows={bestVideoLengths(data)} cols={[{ head: 'Length', align: 'left', cell: (b) => b.band }, { head: 'Videos', cell: (b) => b.videos }, { head: 'Avg views', cell: (b) => compact(b.avgViews) }, { head: 'Eng', cell: (b) => pct(b.avgEngagement) }]} /></div>
      </div>

      {/* Content Engine */}
      <div className="card stack">
        <SectionTitle accent="var(--c-emerald)">Content Engine — 10 video ideas</SectionTitle>
        <div className="grid grid-2">
          {ideas.map((idea, i) => (
            <div key={i} className="card" style={{ padding: 10 }}>
              <strong style={{ fontSize: '0.86rem' }}>{idea.title}</strong>
              <p style={{ margin: '4px 0', fontSize: '0.82rem' }}>“{idea.hook}”</p>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {[idea.city, idea.service, idea.lengthHint].filter(Boolean).map((x) => <span key={x} className="tag" style={{ fontSize: '0.66rem' }}>{x}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card stack">
          <SectionTitle accent="var(--c-pink)">10 recommended hooks</SectionTitle>
          <ol style={{ margin: 0, paddingLeft: 18 }}>{hooks.map((h, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 4 }}>{h.hook}</li>)}</ol>
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--c-violet)">Recommended posting schedule</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{postingSchedule(data).map((s, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 4 }}>{s}</li>)}</ul>
        </div>
      </div>

      {/* Revenue cross-reference (live MSOS) */}
      <div className="card stack">
        <SectionTitle accent="var(--success)">TikTok ↔ Revenue</SectionTitle>
        {jobs.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>Connect MSOS in the <strong>Revenue Intel</strong> tab to compare content against revenue.</p>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: '0.86rem' }}>{cross.summary}</p>
            {opps.length > 0 && (
              <div className="stack" style={{ gap: 4 }}>
                <span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content opportunities</span>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{opps.map((o, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 4 }}>{o}</li>)}</ul>
              </div>
            )}
            <div className="grid grid-2">
              <div className="card stack"><SectionTitle accent="var(--c-blue)">City content vs city revenue</SectionTitle><RankTable rows={cityVsRevenue(data, jobs, vocab)} cols={crossCols('City')} /></div>
              <div className="card stack"><SectionTitle accent="var(--c-orange)">Content type vs revenue</SectionTitle><RankTable rows={contentVsRevenue(data, jobs, vocab)} cols={crossCols('Service')} /></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
