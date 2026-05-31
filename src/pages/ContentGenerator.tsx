// Content Generator: inputs -> provider/engine -> hook/caption/CTA + on-screen
// text + hashtags + local keywords, with quality + fingerprint detail, and
// Copy/Save/Edit/Duplicate/Regenerate. Generating records history + cost so the
// uniqueness engine and Fingerprint Viewer stay in sync.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField, TextArea, SelectField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useContentItems } from '../hooks/useContentItems';
import { getActiveProvider } from '../lib/ai/providers';
import { PLATFORM_LABELS } from '../types/generation';
import type {
  GenerationRequest,
  GenerationResult,
  Platform,
  ContentType,
  RecentByType,
} from '../types/generation';
import type { GeneratedRecord } from '../lib/ai/shared';
import type { GenerationCost } from '../lib/ai/cost';
import type { GenerationHistoryEntry } from '../types/models';

const PLATFORMS = Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value: value as Platform, label }));
const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'caption', label: 'Caption' },
  { value: 'hook', label: 'Hook' },
  { value: 'voiceover', label: 'Voiceover' },
  { value: 'talking_head', label: 'Talking-head script' },
  { value: 'story', label: 'Story post' },
  { value: 'educational', label: 'Educational post' },
  { value: 'promotional', label: 'Promotional post' },
];

function buildRecent(entries: GenerationHistoryEntry[]): RecentByType {
  const r: RecentByType = { hook: [], caption: [], cta: [], script: [], review: [], reply: [] };
  for (const e of entries) if (r[e.type] && r[e.type].length < 50) r[e.type].push(e.text);
  return r;
}

interface Generated {
  result: GenerationResult;
  records: GeneratedRecord[];
  cost: GenerationCost;
}

export default function ContentGenerator() {
  const { brand } = useBusiness();
  const { user } = useAuth();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { create } = useContentItems();

  const [form, setForm] = useState<GenerationRequest>({
    platform: 'instagram',
    contentType: 'caption',
    businessType: 'Mobile tire repair',
    service: '',
    city: '',
    vehicle: '',
    tireSize: '',
    timeOfDay: '',
    responseTime: '',
    completionTime: '',
    notes: '',
  });
  const [gen, setGen] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const recent = useMemo(() => buildRecent(entries), [entries]);
  const set = (patch: Partial<GenerationRequest>) => setForm((f) => ({ ...f, ...patch }));

  async function generate() {
    if (!brand) {
      setError('Brand settings not loaded yet.');
      return;
    }
    setBusy(true);
    setError('');
    setSavedId(null);
    try {
      const out = await getActiveProvider().generateContent(form, brand, recent);
      setGen({ result: out.result, records: out.records, cost: out.cost });
      if (user) {
        await recordMany(user.uid, out.records);
        await recordCost(user.uid, 'content', out.cost);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  function editBlock(key: 'hook' | 'caption' | 'cta', text: string) {
    setGen((g) => {
      if (!g?.result[key]) return g;
      return { ...g, result: { ...g.result, [key]: { ...g.result[key]!, text } } };
    });
  }

  async function save() {
    if (!gen) return;
    const { hook, caption, cta } = gen.result;
    const content = [hook?.text, caption?.text, cta?.text].filter(Boolean).join('\n\n');
    const title = (hook?.text ?? caption?.text ?? 'Untitled').split(' ').slice(0, 7).join(' ');
    const id = await create({
      title,
      content,
      platform: form.platform,
      city: form.city ?? '',
      service: form.service ?? '',
      status: 'draft',
      tags: [form.contentType ?? 'caption'],
      notes: form.notes ?? '',
    });
    setSavedId(id);
  }

  return (
    <>
      <PageHeader title="Content Generator" subtitle="Hooks, captions, CTAs & more" />

      <div className="card stack">
        <div className="grid grid-2">
          <SelectField label="Platform" value={form.platform} onChange={(v) => set({ platform: v })} options={PLATFORMS} />
          <SelectField label="Content type" value={form.contentType ?? 'caption'} onChange={(v) => set({ contentType: v })} options={CONTENT_TYPES} />
          <TextField label="Service" value={form.service ?? ''} onChange={(v) => set({ service: v })} placeholder="flat tire repair" />
          <TextField label="City" value={form.city ?? ''} onChange={(v) => set({ city: v })} placeholder="Miami" />
          <TextField label="Vehicle (optional)" value={form.vehicle ?? ''} onChange={(v) => set({ vehicle: v })} placeholder="Tesla Model 3" />
          <TextField label="Tire size (optional)" value={form.tireSize ?? ''} onChange={(v) => set({ tireSize: v })} placeholder="235/45R18" />
          <TextField label="Time of day" value={form.timeOfDay ?? ''} onChange={(v) => set({ timeOfDay: v })} placeholder="late night" />
          <TextField label="Response time" value={form.responseTime ?? ''} onChange={(v) => set({ responseTime: v })} placeholder="25 minutes" />
          <TextField label="Completion time" value={form.completionTime ?? ''} onChange={(v) => set({ completionTime: v })} placeholder="30 minutes" />
        </div>
        <TextArea label="Notes" value={form.notes ?? ''} onChange={(v) => set({ notes: v })} placeholder="Any context for this post" />
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Generating…' : gen ? 'Regenerate' : 'Generate'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Output</h2>
            <ScoreBadges scores={gen.result.quality} />
          </div>

          {gen.result.hook && (
            <OutputBlock label="Hook" category={gen.result.hook.category} text={gen.result.hook.text} editable onChange={(t) => editBlock('hook', t)} />
          )}
          {gen.result.caption && (
            <OutputBlock label="Caption" category={gen.result.caption.category} text={gen.result.caption.text} editable onChange={(t) => editBlock('caption', t)} />
          )}
          {gen.result.cta && (
            <OutputBlock label="CTA" text={gen.result.cta.text} editable onChange={(t) => editBlock('cta', t)} />
          )}

          <div className="grid grid-2">
            <OutputBlock label="On-screen text" text={(gen.result.onScreenText ?? []).join(' · ')} />
            <OutputBlock label="Hashtags" text={(gen.result.hashtags ?? []).join(' ')} />
          </div>
          <OutputBlock label="Local keyword suggestions" text={(gen.result.localKeywords ?? []).join(', ')} />

          <details>
            <summary className="muted" style={{ cursor: 'pointer', fontSize: '0.82rem' }}>
              Fingerprint details
            </summary>
            <div className="stack" style={{ marginTop: 8 }}>
              {gen.records.map((r, i) => (
                <div key={i} className="row between muted" style={{ fontSize: '0.8rem' }}>
                  <span>{r.type} [{r.category}]</span>
                  <span>similarity {Math.round(r.similarityScore * 100)}% · regen {r.regenerationCount}</span>
                </div>
              ))}
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Provider: {gen.cost.provider} · ~{gen.cost.tokens} tokens · {gen.cost.generationTimeMs}ms · est ${gen.cost.estimatedCostUsd.toFixed(4)}
              </div>
            </div>
          </details>

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
