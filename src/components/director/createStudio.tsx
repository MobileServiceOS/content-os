// Wave 0.2 — the Create studio, merged into the Marketing Director. Hosts the
// former standalone Generator / Script / Repurpose pages as sub-tools (rendered
// headerless via their `embedded` prop), so content creation lives next to the
// intelligence that should drive it instead of in a separate nav silo. Zero
// logic change to the generators — pure relocation.
import { useState } from 'react';
import type { ReactNode } from 'react';
import ContentGenerator from '../../pages/ContentGenerator';
import ScriptWriter from '../../pages/ScriptWriter';
import Repurpose from '../../pages/Repurpose';
import NewJob from '../../pages/NewJob';
import Media from '../../pages/Media';

type Tool = 'newjob' | 'caption' | 'script' | 'repurpose' | 'media';

const TOOLS: { key: Tool; label: string; icon: string; render: () => ReactNode }[] = [
  { key: 'newjob', label: 'New Job → Posts', icon: '⚡', render: () => <NewJob embedded /> },
  { key: 'caption', label: 'Caption / Hook', icon: '✨', render: () => <ContentGenerator embedded /> },
  { key: 'script', label: 'Script', icon: '🎬', render: () => <ScriptWriter embedded /> },
  { key: 'repurpose', label: 'Repurpose', icon: '♻️', render: () => <Repurpose embedded /> },
  { key: 'media', label: 'Media', icon: '🖼️', render: () => <Media embedded /> },
];

export function CreateStudio() {
  const [active, setActive] = useState<Tool>('newjob');
  const current = TOOLS.find((t) => t.key === active) ?? TOOLS[0];

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="tablist" aria-label="Create tools">
        {TOOLS.map((t) => (
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
    </div>
  );
}
