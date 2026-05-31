// GBP Studio: compliant Google Business Profile posts — description (NO CTA),
// with website + review links and a hashtag block as separate fields.
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import StatusBadge from '../components/ui/StatusBadge';
import CopyButton from '../components/ui/CopyButton';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useGbpPosts } from '../hooks/useGbpPosts';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import type { GbpResult } from '../lib/ai/level3';
import type { QualityScore, RecentByType } from '../types/generation';
import type { GenerationCost } from '../lib/ai/cost';

const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });

export default function GbpStudio() {
  const { brand, businessId, role } = useBusiness();
  const { user } = useAuth();
  const { posts, create, setApproval, remove } = useGbpPosts();
  const { recordCost } = useGenerationHistory();
  const { log } = useAgentLogs();

  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [tireSize, setTireSize] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [gen, setGen] = useState<{ result: GbpResult; quality: QualityScore; cost: GenerationCost } | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const recent = useMemo(() => posts.map((p) => p.description), [posts]);

  async function generate() {
    if (!brand || !businessId || !user) return setError('Workspace not loaded yet.');
    if (!service.trim()) return setError('Service is required.');
    setBusy(true); setError(''); setSavedId(null);
    try {
      const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
      const res = await agents.gbp.run({ req: { service, city, vehicle, tireSize, completionTime }, recent }, ctx);
      setGen(res.output);
      await recordCost(user.uid, 'gbp', res.output.cost);
      await log({ agent: 'GBPAgent', action: 'generated', summary: `GBP post for ${service} in ${city || 'area'}`, refKind: 'gbpPosts' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!gen) return;
    const id = await create({
      description: gen.result.description,
      websiteUrl: gen.result.websiteUrl,
      reviewUrl: gen.result.reviewUrl,
      hashtags: gen.result.hashtags,
      approvalState: 'pending_approval',
      status: 'draft',
    });
    setSavedId(id);
  }

  return (
    <>
      <PageHeader title="GBP Studio" subtitle="Compliant Google Business Profile posts" />

      <div className="card stack">
        <div className="grid grid-2">
          <TextField label="Service" value={service} onChange={setService} placeholder="flat tire repair" />
          <TextField label="City" value={city} onChange={setCity} placeholder="Miami" />
          <TextField label="Vehicle" value={vehicle} onChange={setVehicle} placeholder="Tesla Model 3" />
          <TextField label="Tire size" value={tireSize} onChange={setTireSize} placeholder="235/45R18" />
          <TextField label="Completion time" value={completionTime} onChange={setCompletionTime} placeholder="30 minutes" />
        </div>
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Generating…' : gen ? 'Regenerate' : 'Generate GBP post'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>GBP post</h2>
            <ScoreBadges scores={gen.quality} />
          </div>
          <OutputBlock label="Description (no CTA — compliant)" text={gen.result.description} />
          <div className="grid grid-2">
            <div className="field"><label><span>Website</span></label><div className="row between"><span className="muted">{gen.result.websiteUrl || '—'}</span><CopyButton text={gen.result.websiteUrl} /></div></div>
            <div className="field"><label><span>Review link</span></label><div className="row between"><span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gen.result.reviewUrl || 'Set in Brand Settings'}</span><CopyButton text={gen.result.reviewUrl} /></div></div>
          </div>
          <OutputBlock label="Hashtags" text={gen.result.hashtags.join(' ')} />
          <RoleGate action="content.create" fallback={<p className="muted">Viewers can’t save.</p>}>
            <div className="row">
              <button className="btn btn-primary" onClick={() => void save()}>Save (pending approval)</button>
              {savedId && <span className="muted">Saved ✓</span>}
            </div>
          </RoleGate>
        </div>
      )}

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Saved GBP posts</h2>
        {posts.length === 0 ? (
          <p className="muted">No GBP posts yet.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="card stack" style={{ background: 'var(--surface-2)', gap: 8 }}>
              <div className="row between">
                <StatusBadge status={p.status} />
                <span className={`badge ${p.approvalState === 'approved' ? 'badge-approved' : 'badge-scheduled'}`}>{p.approvalState === 'approved' ? 'Approved' : 'Pending'}</span>
              </div>
              <p style={{ margin: 0 }}>{p.description}</p>
              <div className="row" style={{ gap: 4 }}>{p.hashtags.map((h) => <span key={h} className="tag">{h}</span>)}</div>
              <div className="row">
                <RoleGate action="content.approve">
                  {p.approvalState !== 'approved' && <button className="btn btn-sm btn-primary" onClick={() => void setApproval(p.id, 'approved')}>Approve</button>}
                </RoleGate>
                {role === 'owner' && <button className="btn btn-sm btn-danger" onClick={() => void remove(p.id)}>Delete</button>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
