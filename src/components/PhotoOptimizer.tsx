// Photo Optimization Agent UI: generate filename / alt text / description /
// category for a photo. Self-contained so it can drop into the Media page.
import { useState } from 'react';
import { TextField } from './ui/Field';
import CopyButton from './ui/CopyButton';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { agents } from '../lib/agents';
import type { AgentContext } from '../lib/agents';
import type { PhotoResult } from '../lib/ai/level3';
import type { RecentByType } from '../types/generation';

const emptyRecent = (): RecentByType => ({ hook: [], caption: [], cta: [], script: [], review: [], reply: [] });

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between">
      <div>
        <div className="muted" style={{ fontSize: '0.74rem' }}>{label}</div>
        <div style={{ fontSize: '0.9rem' }}>{value}</div>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

export default function PhotoOptimizer() {
  const { brand, businessId } = useBusiness();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const [res, setRes] = useState<PhotoResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!brand || !businessId || !user || !subject.trim()) return;
    setBusy(true);
    try {
      const ctx: AgentContext = { businessId, uid: user.uid, brand, recent: emptyRecent() };
      const r = await agents.photo.run({ req: { subject, service, city } }, ctx);
      setRes(r.output.result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack" style={{ marginTop: 16 }}>
      <h2 style={{ margin: 0 }}>Photo metadata optimizer</h2>
      <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>Filename, alt text, description & category — unique per photo.</p>
      <div className="grid grid-3">
        <TextField label="Subject" value={subject} onChange={setSubject} placeholder="tech changing a tire" />
        <TextField label="Service" value={service} onChange={setService} placeholder="flat tire repair" />
        <TextField label="City" value={city} onChange={setCity} placeholder="Miami" />
      </div>
      <button className="btn btn-block" onClick={() => void run()} disabled={busy}>
        {busy ? 'Optimizing…' : 'Generate photo metadata'}
      </button>
      {res && (
        <div className="card stack" style={{ background: 'var(--surface-2)', gap: 8 }}>
          <Field label="Filename" value={res.filename} />
          <Field label="Alt text" value={res.altText} />
          <Field label="Description" value={res.description} />
          <Field label="Category" value={res.category} />
        </div>
      )}
    </div>
  );
}
