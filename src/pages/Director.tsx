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
import { AvatarStudio } from '../components/director/avatarSections';
import { SeoConsole } from '../components/director/seoSections';
import { GbpIntelligence } from '../components/director/gbpSections';
import { TikTokIntelligence } from '../components/director/tiktokSections';
import { ViralIntelligence } from '../components/director/viralIntelSections';
import { CreateStudio } from '../components/director/createStudio';
import { AutomationCenter } from '../components/director/automationSections';

type Key = 'overview' | 'viralintel' | 'create' | 'viral' | 'reviewintel' | 'seo' | 'gbp' | 'tiktok' | 'avatar' | 'automation';

const TABS: { key: Key; label: string; icon: string; render: () => ReactNode }[] = [
  { key: 'overview', label: 'Revenue Intel (MSOS)', icon: '💵', render: () => <JobsIntel /> },
  { key: 'viralintel', label: 'Viral Intelligence', icon: '🧠', render: () => <ViralIntelligence /> },
  { key: 'create', label: 'Create', icon: '✍️', render: () => <CreateStudio /> },
  { key: 'viral', label: 'Viral Engine', icon: '🔥', render: () => <ViralEngine /> },
  { key: 'reviewintel', label: 'Review Intel', icon: '💬', render: () => <ReviewIntel /> },
  { key: 'seo', label: 'SEO (Search Console)', icon: '🔎', render: () => <SeoConsole /> },
  { key: 'gbp', label: 'GBP Intelligence', icon: '📍', render: () => <GbpIntelligence /> },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', render: () => <TikTokIntelligence /> },
  { key: 'avatar', label: 'Avatar Studio', icon: '🎭', render: () => <AvatarStudio /> },
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
