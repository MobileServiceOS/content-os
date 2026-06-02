// Marketing Director — the central intelligence surface. One route, ten
// sections behind a sticky sub-tab bar (horizontal scroll on mobile, matching
// the app's nav pattern). Phase 1 reads the deterministic sample dataset via
// useDirectorData; the same components light up on live data in Phase 2 with no
// changes here.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import PageHeader from '../components/PageHeader';
import { useDirectorData } from '../hooks/useDirectorData';
import {
  ExecutiveDashboard, ContentPerformanceView, HookLeaderboardView, CityPerformanceView,
  ServicePerformanceView, SeoDirectorView, ReviewDirectorView, RevenueDirectorView,
  ContentOpportunitiesView, DailyBriefView, SourceBadges,
} from '../components/director/sections';
import { JobsIntel } from '../components/director/msosSections';
import { ViralEngine } from '../components/director/viralSections';
import { ReviewIntel } from '../components/director/reviewSections';
import type { DirectorDataset } from '../lib/director/types';

type Key =
  | 'exec' | 'jobs' | 'viral' | 'reviewintel' | 'content' | 'hooks' | 'cities' | 'services'
  | 'seo' | 'reviews' | 'revenue' | 'ideas' | 'brief';

const TABS: { key: Key; label: string; icon: string; render: (ds: DirectorDataset) => ReactNode }[] = [
  { key: 'exec', label: 'Executive', icon: '🧭', render: (ds) => <ExecutiveDashboard ds={ds} /> },
  { key: 'jobs', label: 'Revenue Intel (MSOS)', icon: '💵', render: () => <JobsIntel /> },
  { key: 'viral', label: 'Viral Engine', icon: '🔥', render: () => <ViralEngine /> },
  { key: 'reviewintel', label: 'Review Intel', icon: '💬', render: () => <ReviewIntel /> },
  { key: 'content', label: 'Content', icon: '🎬', render: (ds) => <ContentPerformanceView ds={ds} /> },
  { key: 'hooks', label: 'Hooks', icon: '🪝', render: (ds) => <HookLeaderboardView ds={ds} /> },
  { key: 'cities', label: 'Cities', icon: '📍', render: (ds) => <CityPerformanceView ds={ds} /> },
  { key: 'services', label: 'Services', icon: '🛠️', render: (ds) => <ServicePerformanceView ds={ds} /> },
  { key: 'seo', label: 'SEO', icon: '🔎', render: (ds) => <SeoDirectorView ds={ds} /> },
  { key: 'reviews', label: 'Reviews', icon: '⭐', render: (ds) => <ReviewDirectorView ds={ds} /> },
  { key: 'revenue', label: 'Revenue', icon: '💰', render: (ds) => <RevenueDirectorView ds={ds} /> },
  { key: 'ideas', label: 'Opportunities', icon: '✨', render: (ds) => <ContentOpportunitiesView ds={ds} /> },
  { key: 'brief', label: 'Daily Brief', icon: '📋', render: (ds) => <DailyBriefView ds={ds} /> },
];

export default function Director() {
  const { dataset, usingSample } = useDirectorData();
  const [active, setActive] = useState<Key>('exec');
  const current = useMemo(() => TABS.find((t) => t.key === active) ?? TABS[0], [active]);

  return (
    <>
      <PageHeader
        title="Marketing Director"
        subtitle="Your AI CMO — what's working, what to do next, where the revenue is"
      />

      <div className="card" style={{ marginBottom: 12, padding: '10px 12px' }}>
        <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: '0.74rem' }}>
            {usingSample ? 'Showing sample data (Phase 1) — connect live sources in Phase 2.' : 'Including your live performance data.'}
          </span>
          <SourceBadges ds={dataset} />
        </div>
      </div>

      <div className="dir-tabs" role="tablist" aria-label="Marketing Director sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`btn btn-sm${active === t.key ? ' btn-primary' : ''}`}
            onClick={() => setActive(t.key)}
          >
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">{current.render(dataset)}</div>
    </>
  );
}
