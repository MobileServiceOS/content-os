// Media studio (Phase 3): generate images, thumbnails, and (mock) video posters
// via the media agents; preview, save to Storage, and manage the gallery.
import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextArea, TextField, SelectField } from '../components/ui/Field';
import StatusBadge from '../components/ui/StatusBadge';
import RoleGate from '../components/RoleGate';
import PhotoOptimizer from '../components/PhotoOptimizer';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useMediaItems } from '../hooks/useMediaItems';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { agents } from '../lib/agents';
import { ASPECT_LABELS, ASPECT_DIMENSIONS, type AspectRatio } from '../types/media';
import type { AgentContext } from '../lib/agents';
import type { RecentByType } from '../types/generation';
import type { ProviderName } from '../lib/ai/cost';

type Kind = 'image' | 'thumbnail' | 'video';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'video', label: 'Video' },
];
const ASPECTS = (Object.keys(ASPECT_LABELS) as AspectRatio[]).map((value) => ({ value, label: ASPECT_LABELS[value] }));
const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });

interface Preview {
  kind: Kind;
  dataUrl: string;
  alt: string;
  width: number;
  height: number;
  provider: string;
  note?: string;
  videoUrl?: string;
  predictedViralScore?: number;
}

export default function Media() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { items, save, remove } = useMediaItems();
  const { recordCost } = useGenerationHistory();

  const [kind, setKind] = useState<Kind>('image');
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState('');
  const [duration, setDuration] = useState('15');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function generate() {
    if (!brand || !businessId || !user) return setError('Workspace not loaded yet.');
    setBusy(true);
    setError('');
    setSavedId(null);
    const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
    try {
      if (kind === 'video') {
        const res = await agents.video.run({ prompt, durationSeconds: Number(duration) || 15, aspectRatio: aspect }, ctx);
        const dims = ASPECT_DIMENSIONS[aspect];
        setPreview({ kind, dataUrl: res.output.video.posterDataUrl, alt: res.output.video.alt, width: dims.width, height: dims.height, provider: res.output.cost.provider, note: res.output.video.note, videoUrl: res.output.video.videoUrl, predictedViralScore: res.output.video.predictedViralScore });
        await recordCost(user.uid, 'video', { provider: res.output.cost.provider as ProviderName, tokens: 0, estimatedCostUsd: res.output.cost.estimatedCostUsd, generationTimeMs: res.output.cost.generationTimeMs, regenerationCount: 0 });
      } else {
        const agent = kind === 'thumbnail' ? agents.thumbnail : agents.image;
        const res = await agent.run({ prompt, aspectRatio: aspect, style: style || undefined }, ctx);
        const img = res.output.image;
        setPreview({ kind, dataUrl: img.dataUrl, alt: img.alt, width: img.width, height: img.height, provider: res.output.cost.provider });
        await recordCost(user.uid, kind, { provider: res.output.cost.provider as ProviderName, tokens: 0, estimatedCostUsd: res.output.cost.estimatedCostUsd, generationTimeMs: res.output.cost.generationTimeMs, regenerationCount: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!preview) return;
    const id = await save({ kind: preview.kind, prompt, dataUrl: preview.videoUrl ?? preview.dataUrl, alt: preview.alt, width: preview.width, height: preview.height, provider: preview.provider });
    setSavedId(id);
  }

  return (
    <>
      <PageHeader title="Media Studio" subtitle="Images, thumbnails & video posters" />

      <div className="card stack">
        <div className="grid grid-2">
          <SelectField label="Type" value={kind} onChange={setKind} options={KINDS} />
          <SelectField label="Aspect ratio" value={aspect} onChange={setAspect} options={ASPECTS} />
        </div>
        <TextArea label="Prompt" value={prompt} onChange={setPrompt} placeholder="A mobile tire tech changing a tire at sunset on a Miami street" />
        {kind === 'video' ? (
          <TextField label="Duration (seconds)" value={duration} onChange={setDuration} />
        ) : (
          <TextField label="Style (optional)" value={style} onChange={setStyle} placeholder="photographic, warm, shallow depth of field" />
        )}
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Generating…' : preview ? 'Regenerate' : 'Generate'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {preview && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Preview</h2>
            <div className="row" style={{ gap: 6 }}>
              {preview.predictedViralScore !== undefined && (
                <span className="tag" style={{ borderColor: 'var(--c-violet)' }} title="Predicted viral score">
                  🔮 Viral {Math.round(preview.predictedViralScore * 100)}
                </span>
              )}
              <span className="tag">{preview.provider}</span>
            </div>
          </div>
          {preview.videoUrl ? (
            <video src={preview.videoUrl} poster={preview.dataUrl} controls style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          ) : (
            <img src={preview.dataUrl} alt={preview.alt} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          )}
          {preview.note && <p className="muted" style={{ fontSize: '0.8rem' }}>{preview.note}</p>}
          <RoleGate action="content.create" fallback={<p className="muted">Viewers can’t save media.</p>}>
            <div className="row">
              <button className="btn btn-primary" onClick={() => void onSave()}>Save to gallery</button>
              {savedId && <span className="muted">Saved ✓</span>}
            </div>
          </RoleGate>
        </div>
      )}

      <RoleGate action="content.create">
        <PhotoOptimizer />
      </RoleGate>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Gallery</h2>
        {items.length === 0 ? (
          <p className="muted">No media yet. Generate something above.</p>
        ) : (
          <div className="grid grid-3">
            {items.map((m) => (
              <div key={m.id} className="card stack" style={{ gap: 8 }}>
                <img src={m.url} alt={m.alt} style={{ width: '100%', borderRadius: 6 }} />
                <div className="row between">
                  <span className="tag">{m.kind}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="muted" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.prompt}</div>
                <RoleGate action="content.edit">
                  <button className="btn btn-sm btn-danger" onClick={() => void remove(m.id)}>Delete</button>
                </RoleGate>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
