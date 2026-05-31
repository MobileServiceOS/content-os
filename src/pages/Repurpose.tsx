// Repurpose Content: one source idea -> 5 hooks, 3 captions, short + long script,
// YouTube title/description, blog topic, social post. Records history + cost; saves
// the pack to the library.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextArea, SelectField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useContentItems } from '../hooks/useContentItems';
import { getActiveProvider } from '../lib/ai/providers';
import { recordScores, type GeneratedRecord } from '../lib/ai/shared';
import { buildRecent } from '../lib/uniqueness/recent';
import { PLATFORM_LABELS } from '../types/generation';
import type { Platform, RepurposeResult } from '../types/generation';
import type { GenerationCost } from '../lib/ai/cost';

const PLATFORMS = Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value: value as Platform, label }));

interface Generated {
  result: RepurposeResult;
  records: GeneratedRecord[];
  cost: GenerationCost;
}

function packToText(r: RepurposeResult): string {
  return [
    `HOOKS:\n${r.hooks.map((h) => `- ${h}`).join('\n')}`,
    `CAPTIONS:\n${r.captions.map((c) => `- ${c}`).join('\n')}`,
    `SHORT SCRIPT:\n${r.shortScript}`,
    `LONG SCRIPT:\n${r.longScript}`,
    `YOUTUBE TITLE: ${r.youtubeTitle}`,
    `YOUTUBE DESCRIPTION: ${r.youtubeDescription}`,
    `BLOG TOPIC: ${r.blogTopic}`,
    `SOCIAL POST: ${r.socialPost}`,
  ].join('\n\n');
}

export default function Repurpose() {
  const { brand } = useBusiness();
  const { user } = useAuth();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { create } = useContentItems();

  const [source, setSource] = useState('');
  const [platform, setPlatform] = useState<Platform>('youtube_shorts');
  const [gen, setGen] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const recent = useMemo(() => buildRecent(entries), [entries]);

  async function generate() {
    if (!brand) return setError('Brand settings not loaded yet.');
    setBusy(true);
    setError('');
    setSavedId(null);
    try {
      const out = await getActiveProvider().repurposeContent({ source, platform }, brand, recent);
      setGen(out);
      if (user) {
        await recordMany(user.uid, out.records);
        await recordCost(user.uid, 'repurpose', out.cost);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!gen) return;
    const id = await create({
      title: source ? `Repurpose: ${source}`.slice(0, 60) : 'Repurpose pack',
      content: packToText(gen.result),
      platform,
      city: '',
      service: '',
      status: 'draft',
      tags: ['repurpose'],
      notes: '',
    });
    setSavedId(id);
  }

  return (
    <>
      <PageHeader title="Repurpose Content" subtitle="One idea into many formats" />

      <div className="card stack">
        <TextArea label="Source (story, concept, caption, or script)" value={source} onChange={setSource} placeholder="A roadside blowout fix on I-95 at night" />
        <SelectField label="Primary platform" value={platform} onChange={setPlatform} options={PLATFORMS} />
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Repurposing…' : gen ? 'Regenerate' : 'Repurpose'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Repurpose pack</h2>
            {gen.records[0] && <ScoreBadges scores={recordScores(gen.records[0])} />}
          </div>
          <OutputBlock label="5 hooks" text={gen.result.hooks.map((h) => `• ${h}`).join('\n')} />
          <OutputBlock label="3 captions" text={gen.result.captions.map((c) => `• ${c}`).join('\n')} />
          <div className="grid grid-2">
            <OutputBlock label="Short script" text={gen.result.shortScript} />
            <OutputBlock label="Long script" text={gen.result.longScript} />
          </div>
          <OutputBlock label="YouTube title" text={gen.result.youtubeTitle} />
          <OutputBlock label="YouTube description" text={gen.result.youtubeDescription} />
          <div className="grid grid-2">
            <OutputBlock label="Blog topic" text={gen.result.blogTopic} />
            <OutputBlock label="Social post" text={gen.result.socialPost} />
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Provider: {gen.cost.provider} · ~{gen.cost.tokens} tokens · {gen.cost.generationTimeMs}ms · est ${gen.cost.estimatedCostUsd.toFixed(4)}
          </div>
          <RoleGate action="content.create" fallback={<p className="muted">Viewers can’t save content.</p>}>
            <div className="row">
              <button className="btn btn-primary" onClick={() => void save()}>Save pack to library</button>
              {savedId && <span className="muted">Saved ✓</span>}
            </div>
          </RoleGate>
        </div>
      )}
    </>
  );
}
