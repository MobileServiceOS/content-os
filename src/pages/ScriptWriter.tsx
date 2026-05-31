// Script Writer: topic/platform/tone/length/format -> provider/engine -> hook,
// script, shot list, on-screen text, CTA. Records history + cost; saves to library.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField, SelectField } from '../components/ui/Field';
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
import { PLATFORM_LABELS, TONE_LABELS } from '../types/generation';
import type { Platform, Tone, ScriptFormat, ScriptResult } from '../types/generation';
import type { GenerationCost } from '../lib/ai/cost';

const PLATFORMS = Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value: value as Platform, label }));
const TONES = Object.entries(TONE_LABELS).map(([value, label]) => ({ value: value as Tone, label }));
const LENGTHS = [
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '60 seconds' },
  { value: 'custom', label: 'Custom' },
];
const FORMATS: { value: ScriptFormat; label: string }[] = [
  { value: 'talking_head', label: 'Talking-head' },
  { value: 'voiceover', label: 'Voiceover' },
];

interface Generated {
  result: ScriptResult;
  records: GeneratedRecord[];
  cost: GenerationCost;
}

export default function ScriptWriter() {
  const { brand } = useBusiness();
  const { user } = useAuth();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { create } = useContentItems();

  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [tone, setTone] = useState<Tone>('friendly');
  const [lengthChoice, setLengthChoice] = useState('30');
  const [customSeconds, setCustomSeconds] = useState('45');
  const [format, setFormat] = useState<ScriptFormat>('talking_head');
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
      const lengthSeconds = lengthChoice === 'custom' ? Number(customSeconds) || 30 : Number(lengthChoice);
      const out = await getActiveProvider().generateScript(
        { topic, platform, tone, lengthSeconds, format },
        brand,
        recent,
      );
      setGen(out);
      if (user) {
        await recordMany(user.uid, out.records);
        await recordCost(user.uid, 'script', out.cost);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!gen) return;
    const r = gen.result;
    const content = `HOOK: ${r.hook}\n\n${r.script}\n\nCTA: ${r.cta}\n\nSHOT LIST:\n${r.shotList.map((s) => `- ${s}`).join('\n')}\n\nON-SCREEN: ${r.onScreenText.join(' · ')}`;
    const id = await create({
      title: topic ? `Script: ${topic}`.slice(0, 60) : 'Script',
      content,
      platform,
      city: '',
      service: '',
      status: 'draft',
      tags: ['script', format],
      notes: '',
    });
    setSavedId(id);
  }

  const bodyRecord = gen?.records.find((r) => r.type === 'script');

  return (
    <>
      <PageHeader title="Script Writer" subtitle="Hooks, scripts, shot lists" />

      <div className="card stack">
        <TextField label="Topic" value={topic} onChange={setTopic} placeholder="Late-night roadside blowout on I-95" />
        <div className="grid grid-2">
          <SelectField label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} />
          <SelectField label="Tone" value={tone} onChange={setTone} options={TONES} />
          <SelectField label="Length" value={lengthChoice} onChange={setLengthChoice} options={LENGTHS} />
          <SelectField label="Format" value={format} onChange={setFormat} options={FORMATS} />
          {lengthChoice === 'custom' && (
            <TextField label="Custom seconds" value={customSeconds} onChange={setCustomSeconds} />
          )}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Writing…' : gen ? 'Regenerate' : 'Write script'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Output</h2>
            {bodyRecord && <ScoreBadges scores={recordScores(bodyRecord)} />}
          </div>
          <OutputBlock label="Hook" text={gen.result.hook} />
          <OutputBlock label="Script" text={gen.result.script} />
          <OutputBlock label="Shot list" text={gen.result.shotList.map((s) => `• ${s}`).join('\n')} />
          <OutputBlock label="On-screen text" text={gen.result.onScreenText.join(' · ')} />
          <OutputBlock label="CTA" text={gen.result.cta} />
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Provider: {gen.cost.provider} · ~{gen.cost.tokens} tokens · {gen.cost.generationTimeMs}ms · est ${gen.cost.estimatedCostUsd.toFixed(4)}
          </div>
          <RoleGate action="content.create" fallback={<p className="muted">Viewers can’t save content.</p>}>
            <div className="row">
              <button className="btn btn-primary" onClick={() => void save()}>Save to library</button>
              {savedId && <span className="muted">Saved ✓</span>}
            </div>
          </RoleGate>
        </div>
      )}
    </>
  );
}
