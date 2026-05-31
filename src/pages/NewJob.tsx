// Single-Source Content Engine: one completed job -> one Master Content Asset ->
// platform-specific content for all 6 platforms, each saved pending approval.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { TextField, TextArea } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useContentAssets } from '../hooks/useContentAssets';
import { useContentItems } from '../hooks/useContentItems';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { providerFor } from '../lib/ai/providers';
import { buildMasterAsset, requestForPlatform, type JobInput } from '../lib/ai/assetDistributor';
import { DISTRIBUTION_PLATFORMS, PLATFORM_RULES } from '../lib/platforms';
import { buildRecent } from '../lib/uniqueness/recent';
import type { QualityScore, Platform } from '../types/generation';

interface Variant {
  platform: Platform;
  itemId: string;
  content: string;
  quality: QualityScore;
  approved: boolean;
}

export default function NewJob() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const { create: createAsset } = useContentAssets();
  const { create: createItem, update: updateItem } = useContentItems();
  const { entries, recordMany, recordCost } = useGenerationHistory();
  const { log } = useAgentLogs();

  const [job, setJob] = useState<JobInput>({ service: '', city: '', vehicle: '', tireSize: '', timeOfDay: '', responseTime: '', completionTime: '', notes: '' });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const recent = useMemo(() => buildRecent(entries), [entries]);
  const set = (patch: Partial<JobInput>) => setJob((j) => ({ ...j, ...patch }));

  async function distribute() {
    if (!brand || !businessId || !user) return setError('Workspace not loaded yet.');
    if (!job.service.trim()) return setError('Service is required.');
    setBusy(true);
    setError('');
    setVariants([]);
    try {
      const asset = buildMasterAsset(job, brand);
      const assetId = await createAsset(asset);
      const provider = providerFor(brand, businessId);
      const out: Variant[] = [];
      for (const platform of DISTRIBUTION_PLATFORMS) {
        const g = await provider.generateContent(requestForPlatform(asset, platform), brand, recent);
        await recordMany(user.uid, g.records);
        await recordCost(user.uid, 'content', g.cost);
        const content = [g.result.hook?.text, g.result.caption?.text, g.result.cta?.text].filter(Boolean).join('\n\n');
        const itemId = await createItem({
          title: `${PLATFORM_RULES[platform].label}: ${asset.service}`,
          content,
          platform,
          city: asset.city,
          service: asset.service,
          status: 'draft',
          approvalState: 'pending_approval',
          assetId,
          tags: [platform],
          notes: '',
        });
        out.push({ platform, itemId, content, quality: g.result.quality, approved: false });
      }
      await log({ agent: 'ContentAgent', action: 'distributed', summary: `Distributed "${asset.service}" to ${out.length} platforms`, refId: assetId, refKind: 'contentAssets' });
      setVariants(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Distribution failed');
    } finally {
      setBusy(false);
    }
  }

  async function approve(i: number) {
    const v = variants[i];
    if (v.approved) return;
    await updateItem(v.itemId, { approvalState: 'approved', status: 'approved' });
    setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, approved: true } : x)));
    await log({ agent: 'ApprovalWorkflowAgent', action: 'approved', summary: `Approved ${PLATFORM_RULES[v.platform].label} content`, refId: v.itemId, refKind: 'contentItems' });
  }
  async function approveAll() {
    for (let i = 0; i < variants.length; i++) await approve(i);
  }

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
        <button className="btn btn-primary btn-block" onClick={() => void distribute()} disabled={busy}>
          {busy ? 'Creating asset & distributing…' : 'Create asset & distribute to 6 platforms'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {variants.length > 0 && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Platform variants ({variants.length})</h2>
            <RoleGate action="content.approve">
              <button className="btn btn-primary btn-sm" onClick={() => void approveAll()}>Approve all</button>
            </RoleGate>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
            Saved to the library as drafts, pending approval. Manage them in the{' '}
            <Link to="/library">Library</Link>.
          </p>
          {variants.map((v, i) => (
            <div key={v.platform} className="stack">
              <div className="row between">
                <strong>{PLATFORM_RULES[v.platform].label}</strong>
                <div className="row" style={{ gap: 6 }}>
                  <ScoreBadges scores={v.quality} />
                  {v.approved ? (
                    <span className="badge badge-approved">Approved</span>
                  ) : (
                    <span className="badge badge-scheduled">Pending</span>
                  )}
                </div>
              </div>
              <OutputBlock label={PLATFORM_RULES[v.platform].guidance} text={v.content} />
              <RoleGate action="content.approve">
                {!v.approved && (
                  <div className="row">
                    <button className="btn btn-sm btn-primary" onClick={() => void approve(i)}>Approve {PLATFORM_RULES[v.platform].label}</button>
                  </div>
                )}
              </RoleGate>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
