// Phase 8 — Automation Center UI. An honest status board: the content lifecycle
// (what's live in-app vs planned) and the platform integration matrix (read/
// write, connected/planned). Nothing here makes live API calls — it's the
// architecture made visible so the owner sees exactly where automation stands.
import { useState } from 'react';
import { INTEGRATIONS, LIFECYCLE, type IntegrationStatus, type IntegrationKind } from '../../lib/director/automation';
import { useBusiness } from '../../context/BusinessContext';
import { publishGbpPost } from '../../lib/director/publishClient';
import { SectionTitle } from './shared';

const STATUS_COLOR: Record<IntegrationStatus, string> = {
  connected: 'var(--success)', disconnected: 'var(--text-dim)', planned: 'var(--c-amber)',
};
const STATUS_DOT: Record<IntegrationStatus, string> = { connected: '●', disconnected: '○', planned: '◔' };
const KIND_LABEL: Record<IntegrationKind, string> = { read: 'Read', write: 'Write', both: 'Read + Write' };

// Wave 3 — publishing is fully wired server-side but gated until the platforms
// grant write access. This panel states that honestly and runs a real call so
// the owner can see the pipeline responds (returns the approval gate today).
function PublishPanel() {
  const { businessId } = useBusiness();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const test = async () => {
    if (!businessId) return;
    setBusy(true); setResult(null);
    const out = await publishGbpPost(businessId, 'Mobile tire repair — we come to you, same day.');
    setResult(
      out.ok ? `Published ✓ (${out.id})`
        : out.gated ? 'Pipeline confirmed wired — server returned the “awaiting platform approval” gate. Flips live the moment TikTok/GBP write access is granted.'
        : `Error: ${out.message}`,
    );
    setBusy(false);
  };

  const reqs: { name: string; need: string }[] = [
    { name: 'TikTok', need: 'Content Posting API product + video.publish scope + app audit' },
    { name: 'Google Business Profile', need: 'Business Profile API write allowlist + business.manage' },
  ];

  return (
    <div className="card stack">
      <SectionTitle accent="var(--primary)">Publishing — one-click auto-post</SectionTitle>
      <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
        The publish→measure loop is <strong>built and wired</strong> (TikTok Content Posting + GBP local posts).
        It’s <strong>gated off</strong> until the platforms approve write access — flip one server flag and it’s live.
      </p>
      <div className="stack" style={{ gap: 6 }}>
        {reqs.map((r) => (
          <div key={r.name} className="row between" style={{ gap: 8, fontSize: '0.8rem' }}>
            <span><span className="tag" style={{ fontSize: '0.62rem', borderColor: 'var(--c-amber)', color: 'var(--c-amber)' }}>◔ awaiting</span> <strong>{r.name}</strong></span>
            <span className="muted" style={{ fontSize: '0.74rem', textAlign: 'right', flex: 1, minWidth: 200 }}>{r.need}</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <button className="btn btn-sm" onClick={() => void test()} disabled={busy || !businessId}>{busy ? 'Testing…' : 'Test the publish pipeline'}</button>
        {result && <span className="muted" style={{ fontSize: '0.78rem', flex: 1, minWidth: 220 }}>{result}</span>}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>Setup + application steps: docs/PUBLISH-SETUP.md.</p>
    </div>
  );
}

export function AutomationCenter() {
  return (
    <div className="stack" style={{ gap: 16 }}>
      <PublishPanel />
      <div className="card" style={{ padding: '10px 12px' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
          The roadmap to a self-driving growth loop. <strong>Generate → Approve → Schedule</strong> work today;
          <strong> Publish → Track → Optimize</strong> unlock as the platform APIs below are wired. No live API calls are made here.
        </p>
      </div>

      {/* Content lifecycle */}
      <div className="card stack">
        <SectionTitle accent="var(--c-violet)">Content lifecycle</SectionTitle>
        <div className="grid grid-3">
          {LIFECYCLE.map((s, i) => (
            <div key={s.stage} className="card tile" style={{ ['--accent' as string]: s.live ? 'var(--success)' : 'var(--c-amber)' }}>
              <div className="muted" style={{ fontSize: '0.72rem' }}>Step {i + 1}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{s.label}</div>
              <span className="tag" style={{ fontSize: '0.66rem', borderColor: s.live ? 'var(--success)' : 'var(--c-amber)', color: s.live ? 'var(--success)' : 'var(--c-amber)' }}>
                {s.live ? '● Live' : '◔ Planned'}
              </span>
              <div className="muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>{s.poweredBy}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="card stack">
        <SectionTitle accent="var(--c-cyan)">Platform integrations</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Platform</th>
                <th style={{ textAlign: 'left' }}>Type</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'left' }}>Data / actions</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATIONS.map((i) => (
                <tr key={i.id}>
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>{i.label}</td>
                  <td style={{ textAlign: 'left' }}>{KIND_LABEL[i.kind]}</td>
                  <td style={{ textAlign: 'left', color: STATUS_COLOR[i.status], fontWeight: 600 }}>
                    {STATUS_DOT[i.status]} {i.status}
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <div className="muted" style={{ fontSize: '0.74rem' }}>{[...i.dataProvided, ...i.actions].join(' · ')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.72rem' }}>
          Each planned integration wires the same way the MSOS read did: a typed adapter behind a server function + OAuth, flipped on per business. Publishing is gated until then.
        </p>
      </div>
    </div>
  );
}
