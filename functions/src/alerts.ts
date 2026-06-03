// Wave 2d — proactive alerts. Between the weekly digests, a daily check emails
// the owner ONLY when something urgent is true (a revenue drop or a recurring
// complaint), and never re-nags: a per-business alertState doc fingerprints the
// last alert sent, so the same condition won't email again for 3 days. Reads the
// same client-written cockpit snapshot; sends via Resend. renderAlertHtml is pure.
import { getFirestore } from 'firebase-admin/firestore';
import type { DigestSnapshot } from './digest';

const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Only 'bad' + 'warn' alerts are urgent enough to interrupt; 'opportunity' waits for the digest. */
export function urgentAlerts(s: DigestSnapshot): { text: string; tone: string }[] {
  return (s.alerts ?? []).filter((a) => a.tone === 'bad' || a.tone === 'warn');
}

/** Stable key for a set of urgent alerts — same conditions → same fingerprint. */
export function alertFingerprint(alerts: { text: string }[]): string {
  return alerts.map((a) => a.text).sort().join(' | ');
}

export function alertSubject(s: DigestSnapshot, urgent: { text: string }[]): string {
  return `Heads up — ${s.businessName}: ${urgent[0]?.text ?? 'something needs attention'}`;
}

/** Pure: a short, urgent email (distinct from the weekly digest). */
export function renderAlertHtml(s: DigestSnapshot, urgent: { text: string; tone: string }[]): string {
  const items = urgent.map((a) =>
    `<li style="margin-bottom:8px;font-size:15px;color:${a.tone === 'bad' ? '#b91c1c' : '#92400e'};">${esc(a.text)}</li>`,
  ).join('');
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #fecaca;">
        <div style="font-size:13px;color:#dc2626;font-weight:700;letter-spacing:.04em;">NEEDS YOUR ATTENTION</div>
        <h1 style="margin:4px 0 8px;font-size:20px;color:#0f172a;">${esc(s.businessName)}</h1>
        <ul style="margin:8px 0 0;padding-left:20px;">${items}</ul>
        <div style="margin-top:14px;font-size:13px;color:#64748b;">Revenue ${usd(s.money.revenue)} · ${s.money.jobs} jobs. Open Content OS for the fix.</div>
        <div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          You only get this when something urgent changes — not every day.
        </div>
      </div>
    </div>
  </body></html>`;
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export interface AlertResult { businessId: string; to?: string; ok: boolean; reason?: string }
export interface AlertSummary { scanned: number; sent: number; deduped: number; failed: number; results: AlertResult[] }

const STALE_MS = 14 * 24 * 60 * 60 * 1000;
const RENAG_MS = 3 * 24 * 60 * 60 * 1000; // don't re-send the same alert for 3 days

/** Email owners whose urgent alerts are new (or stale enough to re-send). Deduped. */
export async function runDailyAlerts(apiKey: string, from: string, now: number): Promise<AlertSummary> {
  const db = getFirestore();
  const snap = await db.collectionGroup('cockpit').get();
  const summary: AlertSummary = { scanned: 0, sent: 0, deduped: 0, failed: 0, results: [] };

  for (const doc of snap.docs) {
    if (doc.id !== 'latest') continue;
    const s = doc.data() as DigestSnapshot;
    if (!s.ownerEmail || !s.generatedAt || now - s.generatedAt > STALE_MS) continue;
    const urgent = urgentAlerts(s);
    if (urgent.length === 0) continue;
    summary.scanned++;

    const fp = alertFingerprint(urgent);
    const stateRef = doc.ref.parent.doc('alertState'); // sibling of 'latest'
    const state = (await stateRef.get()).data() as { fingerprint?: string; sentAt?: number } | undefined;
    if (state?.fingerprint === fp && state.sentAt && now - state.sentAt < RENAG_MS) {
      summary.deduped++;
      summary.results.push({ businessId: s.businessId, ok: true, reason: 'deduped' });
      continue;
    }

    try {
      await sendViaResend(apiKey, from, s.ownerEmail, alertSubject(s, urgent), renderAlertHtml(s, urgent));
      await stateRef.set({ fingerprint: fp, sentAt: now }, { merge: true });
      summary.sent++;
      summary.results.push({ businessId: s.businessId, to: s.ownerEmail, ok: true });
    } catch (err) {
      summary.failed++;
      summary.results.push({ businessId: s.businessId, to: s.ownerEmail, ok: false, reason: err instanceof Error ? err.message : 'send failed' });
    }
  }
  return summary;
}
