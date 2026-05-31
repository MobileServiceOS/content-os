// Brand Settings editor. Owners edit everything (incl. the per-business uniqueness
// engine config); managers/viewers see a read-only view. Saving updates
// brandSettings/main and immediately affects generation (BusinessContext subscribes).
import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { TextField, TextArea } from '../components/ui/Field';
import { useBusiness } from '../context/BusinessContext';
import { useBrandSettings } from '../hooks/useBrandSettings';
import { can } from '../lib/permissions';
import { DEFAULT_UNIQUENESS } from '../types/generation';
import type { BrandSettings as Brand } from '../types/models';

const lines = (s: string): string[] => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
const toText = (a?: string[]): string => (a ?? []).join('\n');

const EMPTY: Brand = {
  businessName: '', website: '', phone: '', serviceAreas: [], services: [], notOffered: [],
  socialHandles: [], ctas: [], localKeywords: [], bannedPhrases: [], requiredPhrases: [],
  brandTone: '', uniqueness: DEFAULT_UNIQUENESS,
};

export default function BrandSettings() {
  const { brand, role } = useBusiness();
  const { save } = useBrandSettings();
  const editable = can('brand.edit', role);

  const [draft, setDraft] = useState<Brand>(brand ?? EMPTY);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Sync local draft when brand settings load/update.
  useEffect(() => {
    if (brand) setDraft({ ...brand, uniqueness: brand.uniqueness ?? DEFAULT_UNIQUENESS });
  }, [brand]);

  const u = draft.uniqueness ?? DEFAULT_UNIQUENESS;
  const set = (patch: Partial<Brand>) => setDraft((d) => ({ ...d, ...patch }));
  const setU = (patch: Partial<typeof u>) => setDraft((d) => ({ ...d, uniqueness: { ...u, ...patch } }));

  async function onSave() {
    setBusy(true);
    try {
      await save(draft);
      setSavedAt(Date.now());
    } finally {
      setBusy(false);
    }
  }

  function ArrayField({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
    return (
      <label className="field">
        <span>{label}</span>
        <textarea className="textarea" disabled={!editable} value={toText(value)} placeholder={placeholder} onChange={(e) => onChange(lines(e.target.value))} />
        <span className="muted" style={{ fontSize: '0.72rem' }}>One per line.</span>
      </label>
    );
  }

  return (
    <>
      <PageHeader
        title="Brand Settings"
        subtitle={editable ? 'Voice, services & guardrails' : 'Read-only (owners can edit)'}
      />

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Business</h2>
        <div className="grid grid-2">
          <TextField label="Business name" value={draft.businessName} onChange={(v) => set({ businessName: v })} />
          <TextField label="Website" value={draft.website} onChange={(v) => set({ website: v })} />
          <TextField label="Phone" value={draft.phone} onChange={(v) => set({ phone: v })} />
        </div>
        <ArrayField label="Service areas" value={draft.serviceAreas} onChange={(v) => set({ serviceAreas: v })} placeholder="Miami-Dade" />
        <div className="grid grid-2">
          <ArrayField label="Services offered" value={draft.services} onChange={(v) => set({ services: v })} />
          <ArrayField label="Not offered" value={draft.notOffered} onChange={(v) => set({ notOffered: v })} />
        </div>
        <ArrayField label="Social handles" value={draft.socialHandles} onChange={(v) => set({ socialHandles: v })} placeholder="@wheelrushllc" />
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Voice & guardrails</h2>
        <TextArea label="Brand tone" value={draft.brandTone} onChange={(v) => set({ brandTone: v })} />
        <ArrayField label="CTAs" value={draft.ctas} onChange={(v) => set({ ctas: v })} />
        <ArrayField label="Local keywords" value={draft.localKeywords} onChange={(v) => set({ localKeywords: v })} />
        <div className="grid grid-2">
          <ArrayField label="Required phrases" value={draft.requiredPhrases} onChange={(v) => set({ requiredPhrases: v })} />
          <ArrayField label="Banned phrases" value={draft.bannedPhrases} onChange={(v) => set({ bannedPhrases: v })} />
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Uniqueness engine</h2>
        <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
          Tune how aggressively the engine avoids repetition for this business.
        </p>
        <div className="grid grid-2">
          <label className="field">
            <span>Similarity threshold (0–1)</span>
            <input className="input" type="number" step="0.05" min="0" max="1" disabled={!editable}
              value={u.similarityThreshold}
              onChange={(e) => setU({ similarityThreshold: Number(e.target.value) })} />
            <span className="muted" style={{ fontSize: '0.72rem' }}>Regenerate when a candidate is at least this similar to recent output.</span>
          </label>
          <label className="field">
            <span>Max regeneration attempts</span>
            <input className="input" type="number" step="1" min="1" max="10" disabled={!editable}
              value={u.maxRegenerationAttempts}
              onChange={(e) => setU({ maxRegenerationAttempts: Number(e.target.value) })} />
          </label>
        </div>
        <ArrayField label="Banned openings (extra)" value={u.bannedOpenings} onChange={(v) => setU({ bannedOpenings: v })} placeholder="Thanks again" />
        <p className="muted" style={{ fontSize: '0.72rem', margin: 0 }}>
          Global banned openers (Thank you…, Glad we could help…, A customer in…, Wheel Rush completed…) always apply.
        </p>
      </div>

      {editable && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => void onSave()} disabled={busy}>
            {busy ? 'Saving…' : 'Save brand settings'}
          </button>
          {savedAt && <span className="muted">Saved ✓</span>}
        </div>
      )}
    </>
  );
}
