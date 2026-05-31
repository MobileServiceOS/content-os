// Single-Source Content Engine: one job -> Master Content Asset -> a platform
// variant for each of the 6 platforms. You can edit and regenerate each variant
// BEFORE saving; saving queues it for approval (nothing is written until you do).
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { TextField, TextArea } from '../components/ui/Field';
import ScoreBadges from '../components/ui/ScoreBadges';
import CopyButton from '../components/ui/CopyButton';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useContentAssets } from '../hooks/useContentAssets';
import { useContentItems } from '../hooks/useContentItems';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { providerFor } from '../lib/ai/providers';
import { buildMasterAsset, requestForPlatform, type JobInput, type AssetDraft } from '../lib/ai/assetDistributor';
import { DISTRIBUTION_PLATFORMS, PLATFORM_RULES } from '../lib/platforms';
import { buildRecent } from '../lib/uniqueness/recent';
import type { QualityScore, Platform } from '../types/generation';

const PLATFORM_COLOR: Record<Platform, string> = {
  tiktok: 'var(--c-pink)', instagram: 'var(--c-violet)', facebook: 'var(--c-blue)',
  youtube_shorts: 'var(--c-orange)', x: 'var(--c-cyan)', linkedin: 'var(--c-emerald)',
};

interface Variant {
  platform: Platform;
  content: string;
  quality: QualityScore;
  saved: boolean;
  busy: boolean;
}

export default function NewJob() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { create: createAsset } = useContentAssets();
  const { create: createItem } = useContentItems();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { log } = useAgentLogs();

  const [job, setJob] = useState<JobInput>({ service: '', city: '', vehicle: '', tireSize: '', timeOfDay: '', responseTime: '', completionTime: '', notes: '' });
  const [asset, setAsset] = useState<AssetDraft | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const recent = useMemo(() => buildRecent(entries), [entries]);
  const set = (patch: Partial<JobInput>) => setJob((j) => ({ ...j, ...patch }));

  async function genOne(a: AssetDraft, platform: Platform): Promise<Variant> {
    const out = await providerFor(brand, businessId).generateContent(requestForPlatform(a, platform), brand!, recent);
    if (user) {
      await recordMany(user.uid, out.records);
      await recordCost(user.uid, 'content', out.cost);
    }
    const content = [out.result.hook?.text, out.result.caption?.text, out.result.cta?.text].filter(Boolean).join('\n\n');
    return { platform, content, quality: out.result.quality, saved: false, busy: false };
  }

  async function generate() {
    if (!brand || !businessId || !user) return setError('Workspace not loaded yet.');
    if (!job.service.trim()) return setError('Service is required.');
    setBusy(true);
    setError('');
    setVariants([]);
    try {
      const a = buildMasterAsset(job, brand);
      setAsset(a);
      const out: Variant[] = [];
      for (const platform of DISTRIBUTION_PLATFORMS) out.push(await genOne(a, platform));
      setVariants(out);
      setAssetId(null); // asset doc is created lazily on first save
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(i: number) {
    if (!asset) return;
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, busy: true } : v)));
    const fresh = await genOne(asset, variants[i].platform);
    setVariants((vs) => vs.map((v, j) => (j === i ? fresh : v)));
  }

  function edit(i: number, content: string) {
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, content, saved: false } : v)));
  }

  /** Lazily create the asset doc the first time something is saved. */
  async function ensureAsset(): Promise<string> {
    if (assetId) return assetId;
    const id = await createAsset(asset!);
    setAssetId(id);
    return id;
  }

  async function saveOne(i: number) {
    const v = variants[i];
    if (v.saved || !asset) return;
    const aid = await ensureAsset();
    await createItem({
      title: `${PLATFORM_RULES[v.platform].label}: ${asset.service}`,
      content: v.content,
      platform: v.platform,
      city: asset.city,
      service: asset.service,
      status: 'draft',
      approvalState: 'pending_approval',
      assetId: aid,
      tags: [v.platform],
      notes: '',
    });
    setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, saved: true } : x)));
  }

  async function saveAll() {
    for (let i = 0; i < variants.length; i++) await saveOne(i);
    if (user && asset) await log({ agent: 'ContentAgent', action: 'distributed', summary: `Queued "${asset.service}" for ${variants.length} platforms`, refKind: 'contentItems' });
  }

  const unsaved = variants.filter((v) => !v.saved).length;

  return (
    <>
      <PageHeader title="New Job → Distribute" subtitle="One job → one asset → all platforms" />

      <div className="card stack">
        <div className="grid grid-2">
          <TextField label="Service" value={job.service} onChange={(v) => set({ service: v })} placeholder="flat tire repair" />
          <TextField label="City" value={job.city} onChange={(v) => set({ city: v })} placeholder="Miami" />
          <TextField label="Vehicle" value={job.vehicle ?? ''} onChange={(v) => set({ vehicle: v })} placeholder="Tesla Model 3" />
          <TextField label="Tire size" value={job.tireSize ?? ''} onChange={(v) => set({ tireSize: v })} placeholder="235/45R18" />
          <TextField label="Time of day" value={job.timeOfDay ?? ''} onChange={(v) => set({ timeOfDay: v })} placeholder="late night" />
          <TextField label="Response time" value={job.responseTime ?? ''} onChange={(v) => set({ responseTime: v })} placeholder="25 minutes" />
          <TextField label="Completion time" value={job.completionTime ?? ''} onChange={(v) => set({ completionTime: v })} placeholder="30 minutes" />
        </div>
        <TextArea label="Notes" value={job.notes ?? ''} onChange={(v) => set({ notes: v })} placeholder="Anything notable about the job" />
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Generating…' : variants.length ? 'Regenerate all' : 'Generate for all 6 platforms'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {variants.length > 0 && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Platform variants</h2>
            <RoleGate action="content.create">
              <div className="row">
                {unsaved > 0 && <button className="btn btn-primary btn-sm" onClick={() => void saveAll()}>Save all to queue ({unsaved})</button>}
                <Link className="btn btn-sm" to="/approvals">Approvals →</Link>
              </div>
            </RoleGate>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>Edit or regenerate each one, then save it to the approval queue.</p>

          {variants.map((v, i) => (
            <div key={v.platform} className="card stack" style={{ background: 'var(--surface-2)' }}>
              <div className="row between">
                <span className="tag" style={{ color: PLATFORM_COLOR[v.platform], borderColor: PLATFORM_COLOR[v.platform], fontWeight: 700 }}>
                  {PLATFORM_RULES[v.platform].label}
                </span>
                <div className="row" style={{ gap: 6 }}>
                  <ScoreBadges scores={v.quality} />
                  {v.saved && <span className="badge badge-scheduled">Queued</span>}
                </div>
              </div>
              <div className="muted" style={{ fontSize: '0.74rem' }}>{PLATFORM_RULES[v.platform].guidance}</div>
              <textarea className="textarea" value={v.content} onChange={(e) => edit(i, e.target.value)} style={{ minHeight: 110 }} />
              <RoleGate action="content.create">
                <div className="row">
                  <button className="btn btn-sm" onClick={() => void regenerate(i)} disabled={v.busy}>{v.busy ? 'Regenerating…' : 'Regenerate'}</button>
                  <CopyButton text={v.content} />
                  {!v.saved && <button className="btn btn-sm btn-primary" onClick={() => void saveOne(i)}>Save to queue</button>}
                </div>
              </RoleGate>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
