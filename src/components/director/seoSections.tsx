// Phase 5 — SEO Intelligence UI (Google Search Console). Connect button + the
// four connection states (disconnected/connecting/connected/syncing/error) +
// real metrics: top keywords, top pages, derived by-city / by-service, and AI
// recommendations. No mock data — everything is the owner's synced SC snapshot.
import { useBusiness } from '../../context/BusinessContext';
import { useSearchConsole } from '../../hooks/useSearchConsole';
import { compact, pct } from '../../lib/analytics/format';
import {
  topKeywords, topPages, byCity, byService, seoRecommendations, shortPage,
  type SeoRow, type SeoVocab,
} from '../../lib/director/seoIntel';
import { SectionTitle, RankTable, type Col } from './shared';

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card tile" style={{ ['--accent' as string]: accent }}>
      <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

const seoCols = (head: string): Col<SeoRow>[] => [
  { head, align: 'left', cell: (r) => (head === 'Page' ? shortPage(r.key) : r.key) },
  { head: 'Clicks', cell: (r) => r.clicks },
  { head: 'Impr', cell: (r) => compact(r.impressions) },
  { head: 'CTR', cell: (r) => pct(r.ctr) },
  { head: 'Pos', cell: (r) => r.position.toFixed(1) },
];

const REC_ICON: Record<string, string> = { city_page: '📄', keyword: '🔑', page_ctr: '✍️' };

export function SeoConsole() {
  const { brand } = useBusiness();
  const { status, data, siteUrl, lastSync, error, connect, sync, disconnect } = useSearchConsole();
  const vocab: SeoVocab = { cities: brand?.serviceAreas ?? [], services: brand?.services ?? [] };

  if (status === 'disconnected') {
    return (
      <div className="card stack" style={{ maxWidth: 460 }}>
        <SectionTitle accent="var(--c-cyan)">Connect Google Search Console</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
          Read-only — we request only <code>webmasters.readonly</code> and pull your clicks, impressions, CTR, and
          average position. Tokens are handled server-side and never stored in your browser. We never write to Search Console.
        </p>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => void connect()}>Connect Search Console →</button>
        {error && <p className="muted" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }
  if (status === 'connecting') {
    return <div className="card"><p className="muted" style={{ margin: 0 }}>Redirecting to Google for read-only consent…</p></div>;
  }
  if (status === 'error') {
    return (
      <div className="card stack">
        <SectionTitle accent="var(--danger)">Search Console error</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{error ?? 'Something went wrong.'}</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={() => void sync()}>Retry sync</button>
          <button className="btn btn-sm" onClick={() => void connect()}>Reconnect</button>
          <button className="btn btn-sm" onClick={() => void disconnect()}>Disconnect</button>
        </div>
      </div>
    );
  }

  // connected or syncing
  const header = (
    <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
      <span className="tag" style={{ borderColor: 'var(--success)', color: 'var(--success)', fontSize: '0.7rem' }}>
        ● Search Console · read-only{siteUrl ? ` · ${siteUrl}` : ''}{status === 'syncing' ? ' · syncing…' : lastSync ? ` · synced ${new Date(lastSync).toLocaleString()}` : ''}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm" onClick={() => void sync()} disabled={status === 'syncing'}>{status === 'syncing' ? 'Syncing…' : 'Sync now'}</button>
        <button className="btn btn-sm" onClick={() => void disconnect()}>Disconnect</button>
      </div>
    </div>
  );

  if (!data) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        {header}
        <div className="card"><p className="muted" style={{ margin: 0 }}>{status === 'syncing' ? 'Pulling your Search Console data…' : 'Connected — click "Sync now" to pull your data.'}</p></div>
      </div>
    );
  }

  const recs = seoRecommendations(data, vocab);
  return (
    <div className="stack" style={{ gap: 16 }}>
      {header}
      <div className="grid grid-3">
        <Tile label="Clicks (90d)" value={compact(data.totals.clicks)} accent="var(--c-emerald)" />
        <Tile label="Impressions" value={compact(data.totals.impressions)} accent="var(--c-blue)" />
        <Tile label="CTR" value={pct(data.totals.ctr)} accent="var(--c-violet)" />
        <Tile label="Avg position" value={data.totals.position.toFixed(1)} accent="var(--c-amber)" />
      </div>

      {recs.length > 0 && (
        <div className="card stack">
          <SectionTitle accent="var(--c-pink)">AI recommendations</SectionTitle>
          {recs.map((r, i) => (
            <div key={i} className="card" style={{ padding: 10 }}>
              <strong style={{ fontSize: '0.88rem' }}>{REC_ICON[r.kind]} {r.title}</strong>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>{r.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-2">
        <div className="card stack"><SectionTitle accent="var(--c-blue)">Top keywords</SectionTitle><RankTable rows={topKeywords(data)} cols={seoCols('Keyword')} /></div>
        <div className="card stack"><SectionTitle accent="var(--c-cyan)">Top pages</SectionTitle><RankTable rows={topPages(data)} cols={seoCols('Page')} /></div>
        <div className="card stack">
          <SectionTitle accent="var(--c-emerald)">By city <span className="muted" style={{ fontSize: '0.66rem', fontWeight: 400 }}>(derived)</span></SectionTitle>
          <RankTable rows={byCity(data, vocab)} cols={seoCols('City')} empty="No city matches in your queries yet." />
        </div>
        <div className="card stack">
          <SectionTitle accent="var(--c-orange)">By service <span className="muted" style={{ fontSize: '0.66rem', fontWeight: 400 }}>(derived)</span></SectionTitle>
          <RankTable rows={byService(data, vocab)} cols={seoCols('Service')} empty="No service matches in your queries yet." />
        </div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>
        Keyword + page data are native Search Console dimensions. "By city" and "by service" are derived by matching your Brand Settings cities/services against query text.
      </p>
    </div>
  );
}
