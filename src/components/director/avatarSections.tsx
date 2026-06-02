// Phase 6 — Avatar Content Studio UI. Edit the brand profile (logo/colors/voice/
// guidelines, persisted locally — no rules change), pick a video type, and get a
// ready-to-shoot script plus copy-ready prompts for HeyGen / ElevenLabs /
// Higgsfield / Veo / Runway / Sora. Uses the live business + top revenue signals.
import { useMemo, useState } from 'react';
import { useMsosJobs } from '../../hooks/useMsosJobs';
import { revenueRollups } from '../../lib/director/msosWidgets';
import {
  buildVideoScript, VIDEO_TYPES, DEFAULT_BRAND_PROFILE,
  type BrandProfile, type VideoTypeId,
} from '../../lib/director/avatarStudio';
import { SectionTitle } from './shared';

const STORE_KEY = 'avatarStudio.brand';

function loadBrand(): BrandProfile {
  if (typeof localStorage === 'undefined') return DEFAULT_BRAND_PROFILE;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_BRAND_PROFILE, ...JSON.parse(raw) } : DEFAULT_BRAND_PROFILE;
  } catch { return DEFAULT_BRAND_PROFILE; }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); });
  return (
    <div className="stack" style={{ gap: 3 }}>
      <div className="row between">
        <span className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <button className="btn btn-sm" style={{ padding: '1px 7px', minHeight: 0, fontSize: '0.68rem' }} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}

export function AvatarStudio() {
  const { jobs, vertical, businesses, selectedBusinessId } = useMsosJobs();
  const [brand, setBrand] = useState<BrandProfile>(loadBrand);
  const [type, setType] = useState<VideoTypeId>('avatar');

  const save = (b: BrandProfile) => {
    setBrand(b);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(b));
  };

  const businessName = businesses.find((b) => b.id === selectedBusinessId)?.name ?? 'Your business';
  const roll = useMemo(() => revenueRollups(jobs), [jobs]);
  const city = roll.topCity?.key ?? 'your city';
  const service = roll.topService?.key ?? vertical.serviceVocab[0] ?? 'service';

  const script = useMemo(
    () => buildVideoScript(type, { businessName, vertical, city, service, brand }),
    [type, businessName, vertical, city, service, brand],
  );
  const tp = script.toolPrompts;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Brand profile */}
      <div className="card stack">
        <SectionTitle accent="var(--c-orange)">Brand Profile</SectionTitle>
        <div className="grid grid-2">
          <label className="field" style={{ margin: 0 }}>
            <span>Logo label</span>
            <input className="input" value={brand.logoLabel} onChange={(e) => save({ ...brand, logoLabel: e.target.value })} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span>Brand colors (comma-separated)</span>
            <input className="input" value={brand.colors.join(', ')} onChange={(e) => save({ ...brand, colors: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </label>
        </div>
        <label className="field" style={{ margin: 0 }}>
          <span>Voice profile</span>
          <input className="input" value={brand.voiceProfile} onChange={(e) => save({ ...brand, voiceProfile: e.target.value })} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Brand guidelines</span>
          <textarea className="textarea" rows={2} value={brand.guidelines} onChange={(e) => save({ ...brand, guidelines: e.target.value })} />
        </label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {brand.colors.map((c) => <span key={c} className="tag" style={{ fontSize: '0.7rem' }}>{c}</span>)}
          <span className="muted" style={{ fontSize: '0.74rem' }}>Subject: {service} in {city} · {businessName}</span>
        </div>
      </div>

      {/* Video type picker */}
      <div className="card stack">
        <SectionTitle accent="var(--c-violet)">Generate a video script</SectionTitle>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {VIDEO_TYPES.map((t) => (
            <button key={t.id} className={`btn btn-sm${type === t.id ? ' btn-primary' : ''}`} onClick={() => setType(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Script + tool prompts */}
      <div className="card stack" style={{ gap: 10 }}>
        <SectionTitle accent="var(--c-emerald)">{script.label}: {script.title}</SectionTitle>
        <CopyRow label="Script (voiceover / talking head)" value={script.script} />
        <CopyRow label="Scene directions" value={script.sceneDirections} />
        <CopyRow label="On-screen text" value={script.onScreenText.join(' / ')} />
        <CopyRow label="Call to action" value={script.cta} />
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <SectionTitle accent="var(--c-cyan)">Tool-ready prompts</SectionTitle>
        <CopyRow label="HeyGen (avatar)" value={tp.heygen} />
        <CopyRow label="ElevenLabs (voiceover)" value={tp.elevenlabs} />
        <CopyRow label="Higgsfield (video)" value={tp.higgsfield} />
        <CopyRow label="Veo (video)" value={tp.veo} />
        <CopyRow label="Runway (video)" value={tp.runway} />
        <CopyRow label="Sora (video)" value={tp.sora} />
      </div>
    </div>
  );
}
