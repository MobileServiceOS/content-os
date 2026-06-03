// Marketing Director — the central intelligence surface. REAL DATA ONLY: every
// tab here reads live MSOS data (or the owner's own entered reviews), or shows an
// honest connect/planned state — never sample/demo numbers. The Phase-1 sample
// tabs were retired from the UI; their components remain in the repo to be
// repointed at live social/SEO feeds when those APIs are wired (see Automation).
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import PageHeader from '../components/PageHeader';
import { JobsIntel } from '../components/director/msosSections';
import { ViralEngine } from '../components/director/viralSections';
import { ReviewIntel } from '../components/director/reviewSections';
import { SeoConsole } from '../components/director/seoSections';
import { GbpIntelligence } from '../components/director/gbpSections';
import { TikTokIntelligence } from '../components/director/tiktokSections';
import { ViralIntelligence } from '../components/director/viralIntelSections';
import { CreateStudio } from '../components/director/createStudio';
import { ReplyStudio } from '../components/director/replyStudio';
import { AutomationCenter } from '../components/director/automationSections';
import GbpStudio from './GbpStudio';
import SeoStudio from './SeoStudio';

// Analysis on top, the matching create tool below — so insight drives creation
// in one tab (Wave 0.2 studio merge).
function WithCreate({ analysis, studio, label }: { analysis: ReactNode; studio: ReactNode; label: string }) {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>{analysis}</div>
      <div>
        <div className="row" style={{ gap: 8, alignItems: 'center', margin: '4px 0 12px' }}>
          <span aria-hidden style={{ fontSize: '1.1rem' }}>✍️</span>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>{label}</h2>
          <span className="muted" style={{ fontSize: '0.74rem' }}>create from the insights above</span>
        </div>
        {studio}
      </div>
    </div>
  );
}

type Key = 'overview' | 'viralintel' | 'create' | 'viral' | 'reviewintel' | 'seo' | 'gbp' | 'tiktok' | 'automation';

const TABS: { key: Key; label: string; icon: string; render: () => ReactNode }[] = [
  { key: 'overview', label: 'Revenue Intel (MSOS)', icon: '💵', render: () => <JobsIntel /> },
  { key: 'viralintel', label: 'Viral Intelligence', icon: '🧠', render: () => <ViralIntelligence /> },
  { key: 'create', label: 'Create', icon: '✍️', render: () => <CreateStudio /> },
  { key: 'viral', label: 'Viral Engine', icon: '🔥', render: () => <ViralEngine /> },
  { key: 'reviewintel', label: 'Review Intel', icon: '💬', render: () => <WithCreate analysis={<ReviewIntel />} studio={<ReplyStudio />} label="Draft a reply" /> },
  { key: 'seo', label: 'SEO (Search Console)', icon: '🔎', render: () => <WithCreate analysis={<SeoConsole />} studio={<SeoStudio embedded />} label="Create SEO content" /> },
  { key: 'gbp', label: 'GBP Intelligence', icon: '📍', render: () => <WithCreate analysis={<GbpIntelligence />} studio={<GbpStudio embedded />} label="Create a GBP post" /> },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', render: () => <TikTokIntelligence /> },
  { key: 'automation', label: 'Automation', icon: '🤖', render: () => <AutomationCenter /> },
];

export default function Director() {
  const [active, setActive] = useState<Key>('overview');
  const current = useMemo(() => TABS.find((t) => t.key === active) ?? TABS[0], [active]);

  return (
    <>
      <PageHeader
        title="Marketing Director"
        subtitle="Your AI CMO — live from your MSOS data. Real numbers only."
      />

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

      <div role="tabpanel">{current.render()}</div>
    </>
  );
}
