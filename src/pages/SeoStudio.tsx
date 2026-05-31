// Local SEO Studio: service pages, city pages, FAQs, AI-search answers, and
// entity-rich content. Runs through the gate (uniqueness + guardian + AI-search).
import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField, SelectField } from '../components/ui/Field';
import OutputBlock from '../components/generator/OutputBlock';
import ScoreBadges from '../components/ui/ScoreBadges';
import RoleGate from '../components/RoleGate';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useSeoContent } from '../hooks/useSeoContent';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import { useAgentLogs } from '../hooks/useAgentLogs';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import type { SeoResult } from '../lib/ai/level3';
import type { SeoContentType } from '../types/level3';
import type { QualityScore, RecentByType } from '../types/generation';
import type { GenerationCost } from '../lib/ai/cost';

const TYPES: { value: SeoContentType; label: string }[] = [
  { value: 'service_page', label: 'Service page' },
  { value: 'city_page', label: 'City page' },
  { value: 'faq', label: 'FAQ' },
  { value: 'ai_search', label: 'AI-search answers' },
  { value: 'entity', label: 'Entity-rich' },
];
const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });

export default function SeoStudio() {
  const { brand, businessId, role } = useBusiness();
  const { user } = useAuth();
  const { items, create, setApproval, remove } = useSeoContent();
  const { recordCost } = useGenerationHistory();
  const { log } = useAgentLogs();

  const [type, setType] = useState<SeoContentType>('service_page');
  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const [gen, setGen] = useState<{ result: SeoResult; quality: QualityScore; cost: GenerationCost } | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const recent = useMemo(() => items.map((i) => i.body), [items]);

  async function generate() {
    if (!brand || !businessId || !user) return setError('Workspace not loaded yet.');
    setBusy(true); setError(''); setSavedId(null);
    try {
      const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
      const res = await agents.localSeo.run({ req: { type, service, city }, recent }, ctx);
      setGen(res.output);
      await recordCost(user.uid, 'seo', res.output.cost);
      await log({ agent: 'LocalSeoAgent', action: 'generated', summary: `SEO ${type} for ${city || service || 'area'}`, refKind: 'seoContent' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!gen) return;
    const id = await create({
      type,
      title: gen.result.title,
      body: gen.result.body,
      entities: gen.result.entities,
      questions: gen.result.questions,
      city: city || undefined,
      service: service || undefined,
      approvalState: 'pending_approval',
    });
    setSavedId(id);
  }

  return (
    <>
      <PageHeader title="Local SEO Studio" subtitle="Pages, FAQs & AI-search content" />

      <div className="card stack">
        <div className="grid grid-2">
          <SelectField label="Type" value={type} onChange={setType} options={TYPES} />
          <TextField label="Service" value={service} onChange={setService} placeholder="flat tire repair" />
          <TextField label="City" value={city} onChange={setCity} placeholder="Miami" />
        </div>
        <button className="btn btn-primary btn-block" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Generating…' : gen ? 'Regenerate' : 'Generate SEO content'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {gen && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>{gen.result.title}</h2>
            <ScoreBadges scores={gen.quality} />
          </div>
          <OutputBlock label="Body" text={gen.result.body} />
          <div className="row" style={{ gap: 4 }}>{gen.result.entities.map((e) => <span key={e} className="tag">{e}</span>)}</div>
          {gen.result.questions.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <span className="muted" style={{ fontSize: '0.78rem' }}>Targets these questions:</span>
              {gen.result.questions.map((q) => <div key={q} style={{ fontSize: '0.88rem' }}>• {q}</div>)}
            </div>
          )}
          <RoleGate action="content.create" fallback={<p className="muted">Viewers can’t save.</p>}>
            <div className="row">
              <button className="btn btn-primary" onClick={() => void save()}>Save (pending approval)</button>
              {savedId && <span className="muted">Saved ✓</span>}
            </div>
          </RoleGate>
        </div>
      )}

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Saved SEO content</h2>
        {items.length === 0 ? (
          <p className="muted">No SEO content yet.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="card stack" style={{ background: 'var(--surface-2)', gap: 6 }}>
              <div className="row between">
                <strong>{it.title}</strong>
                <span className={`badge ${it.approvalState === 'approved' ? 'badge-approved' : 'badge-scheduled'}`}>{it.approvalState === 'approved' ? 'Approved' : 'Pending'}</span>
              </div>
              <span className="tag">{it.type}</span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{it.body.slice(0, 240)}{it.body.length > 240 ? '…' : ''}</p>
              <div className="row">
                <RoleGate action="content.approve">
                  {it.approvalState !== 'approved' && <button className="btn btn-sm btn-primary" onClick={() => void setApproval(it.id, 'approved')}>Approve</button>}
                </RoleGate>
                {role === 'owner' && <button className="btn btn-sm btn-danger" onClick={() => void remove(it.id)}>Delete</button>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
