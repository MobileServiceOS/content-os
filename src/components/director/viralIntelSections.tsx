// Phase 9 — Viral Intelligence Engine UI. Fuses live TikTok + Search Console +
// MSOS revenue into hook/city/service intelligence, the content-gap engine,
// multi-format daily recommendations, and a pre-publish content scorer. Existing
// design system. Real data only — shows a connect prompt when nothing's wired,
// and uses whatever real sources are connected.
import { useMemo, useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useSocialPlatform } from '../../hooks/useSocialPlatform';
import { useSearchConsole } from '../../hooks/useSearchConsole';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import { compact, pct } from '../../lib/analytics/format';
import { money } from '../../lib/director/msosWidgets';
import type { SocialVocab } from '../../lib/director/social/types';
import {
  top20Hooks, hookCategoryStats, bestOpeningLine,
  cityIntelligence, recommendedCities, serviceIntelligence, rankServices,
  contentGaps, dailyRecommendations, predictContentScore,
  type HookRow, type CityIntel, type ServiceIntel, type ScoreBand,
} from '../../lib/director/viralIntel';
import { SectionTitle, RankTable, type Col } from './shared';

const BAND_COLOR: Record<ScoreBand, string> = { Low: 'var(--danger)', Medium: 'var(--warning)', High: 'var(--c-blue)', Viral: 'var(--c-emerald)' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ContentScorer({ tiktok, vocab }: { tiktok: ReturnType<typeof useSocialPlatform>['data']; vocab: SocialVocab }) {
  const [draft, setDraft] = useState('');
  const pred = useMemo(() => (draft.trim().length >= 4 ? predictContentScore(draft, tiktok, vocab) : null), [draft, tiktok, vocab]);
  return (
    <div className="card stack">
      <SectionTitle accent="var(--c-pink)">Content Score — predict before publishing</SectionTitle>
      <textarea className="textarea" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste a hook / caption, e.g. “Stuck with a blowout in Miami? Watch this.”" />
      {pred && (
        <div className="row between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="tag" style={{ borderColor: BAND_COLOR[pred.band], color: BAND_COLOR[pred.band], fontWeight: 800, fontSize: '0.9rem' }}>{pred.band}{pred.predictedViews > 0 ? ` · ~${compact(pred.predictedViews)} views` : ''}</span>
          <span className="muted" style={{ fontSize: '0.78rem', flex: 1, minWidth: 220 }}>{pred.rationale}{pred.confidence === 'low' ? ' (low confidence)' : ''}</span>
        </div>
      )}
    </div>
  );
}

export function ViralIntelligence() {
  const { brand } = useBusiness();
  const tk = useSocialPlatform('tiktok');
  const sc = useSearchConsole();
  const { jobs } = useMsosJobs();
  const vocab: SocialVocab = { cities: brand?.serviceAreas ?? [], services: brand?.services ?? [] };
  const tiktok = tk.data;

  const recs = dailyRecommendations(tiktok, sc.data, jobs, vocab);
  const cities = cityIntelligence(tiktok, jobs, vocab);
  const services = serviceIntelligence(tiktok, jobs, vocab);
  const gaps = contentGaps(tiktok, jobs, vocab);

  const sources = (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {([['TikTok', !!tiktok], ['Search Console', !!sc.data], ['MSOS revenue', jobs.length > 0]] as [string, boolean][]).map(([name, on]) => (
        <span key={name} className="tag" style={{ fontSize: '0.68rem', borderColor: on ? 'var(--success)' : 'var(--text-dim)', color: on ? 'var(--success)' : 'var(--text-dim)' }}>{on ? '●' : '○'} {name}</span>
      ))}
    </div>
  );

  if (!tiktok && jobs.length === 0) {
    return (
      <div className="card stack">
        <SectionTitle accent="var(--c-violet)">Viral Intelligence</SectionTitle>
        <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>Connect <strong>TikTok</strong> and <strong>MSOS</strong> (Revenue Intel) to fuse content performance with revenue. Everything here is built from your real connected data.</p>
        {sources}
      </div>
    );
  }

  const hookCols: Col<HookRow>[] = [
    { head: 'Hook', align: 'left', cell: (h) => <span style={{ display: 'inline-block', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{h.hook}”</span> },
    { head: 'Category', cell: (h) => cap(h.category) },
    { head: 'Views', cell: (h) => compact(h.views) },
    { head: 'Eng', cell: (h) => pct(h.engagement) },
  ];
  const cityCols: Col<CityIntel>[] = [
    { head: 'City', align: 'left', cell: (c) => c.city },
    { head: 'Revenue', cell: (c) => money(c.revenue) },
    { head: 'Views', cell: (c) => compact(c.views) },
    { head: 'Videos', cell: (c) => c.videos },
    { head: 'Rev / 1K views', align: 'right', cell: (c) => (c.revenuePer1kViews != null ? money(c.revenuePer1kViews) : '—') },
  ];
  const svcCols: Col<ServiceIntel>[] = [
    { head: 'Service', align: 'left', cell: (s) => s.service },
    { head: 'Revenue', cell: (s) => money(s.revenue) },
    { head: 'Views', cell: (s) => compact(s.views) },
    { head: 'Eng', cell: (s) => pct(s.engagement) },
    { head: 'Conv. opp', align: 'right', cell: (s) => <strong>{s.conversionOpportunity}/10</strong> },
  ];

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card" style={{ padding: '10px 12px' }}>
        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="muted" style={{ fontSize: '0.8rem' }}>Fused from your real connected data — TikTok performance, Search Console, and MSOS revenue.</span>
          {sources}
        </div>
      </div>

      {/* 6. Content Score (top — the action) */}
      <ContentScorer tiktok={tiktok} vocab={vocab} />

      {/* 5. Daily Recommendations */}
      <div className="card stack">
        <SectionTitle accent="var(--c-amber)">Today's recommendations</SectionTitle>
        <div className="grid grid-2">
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3 TikTok ideas</span><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{recs.tiktok.map((x, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 3 }}>{x}</li>)}</ul></div>
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3 GBP posts</span><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{recs.gbp.map((x, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 3 }}>{x}</li>)}</ul></div>
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1 blog article</span><p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>{recs.blog}</p></div>
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1 YouTube Short</span><p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>{recs.short}</p></div>
        </div>
      </div>

      {/* 1. Hook Intelligence */}
      {tiktok && (
        <>
          <div className="card stack">
            <SectionTitle accent="var(--c-pink)">Hook Intelligence — top 20</SectionTitle>
            {bestOpeningLine(tiktok) && <p style={{ margin: 0, fontSize: '0.84rem' }}>🏆 Best opening line: <strong>“{bestOpeningLine(tiktok)}”</strong></p>}
            <RankTable rows={top20Hooks(tiktok)} cols={hookCols} empty="No hooks yet." />
          </div>
          <div className="card stack">
            <SectionTitle accent="var(--c-violet)">Hook categories — avg views</SectionTitle>
            <RankTable rows={hookCategoryStats(tiktok)} cols={[{ head: 'Category', align: 'left', cell: (c) => cap(c.category) }, { head: 'Videos', cell: (c) => c.videos }, { head: 'Avg views', cell: (c) => compact(c.avgViews) }, { head: 'Total views', cell: (c) => compact(c.totalViews) }]} />
          </div>
        </>
      )}

      {/* 2. City Intelligence */}
      <div className="card stack">
        <SectionTitle accent="var(--c-blue)">City Intelligence</SectionTitle>
        <RankTable rows={cities} cols={cityCols} empty="No city data yet." />
        {recommendedCities(cities).length > 0 && (
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>🎯 Target next: <strong>{recommendedCities(cities).map((c) => c.city).slice(0, 3).join(', ')}</strong> — high revenue, low content.</p>
        )}
      </div>

      {/* 3. Service Intelligence */}
      <div className="card stack">
        <SectionTitle accent="var(--c-orange)">Service Intelligence</SectionTitle>
        <RankTable rows={rankServices(services, 'revenue')} cols={svcCols} empty="No service data yet." />
        <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>Ranked by revenue. "Conv. opp" = high revenue with low content/views — your biggest content gaps to convert.</p>
      </div>

      {/* 4. Content Gap Engine */}
      <div className="card stack">
        <SectionTitle accent="var(--danger)">Content Gap Engine</SectionTitle>
        <div className="grid grid-2">
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cities with revenue, no content</span>{gaps.citiesNoContent.length ? <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{gaps.citiesNoContent.map((c) => <li key={c.city} style={{ fontSize: '0.82rem' }}>{c.city} — {money(c.revenue)}</li>)}</ul> : <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>None — every revenue city has content. 🎉</p>}</div>
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Services with revenue, no content</span>{gaps.servicesNoContent.length ? <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{gaps.servicesNoContent.map((s) => <li key={s.service} style={{ fontSize: '0.82rem' }}>{s.service} — {money(s.revenue)}</li>)}</ul> : <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>None.</p>}</div>
        </div>
        {gaps.highRevLowContent.length > 0 && (
          <div><span className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High revenue / low content</span><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{gaps.highRevLowContent.map((g, i) => <li key={i} style={{ fontSize: '0.82rem', marginBottom: 3 }}>{g}</li>)}</ul></div>
        )}
      </div>
    </div>
  );
}
