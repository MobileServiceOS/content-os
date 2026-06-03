// Wave 2 — the Monday digest. Reads each business's client-written cockpit
// snapshot (businesses/{id}/cockpit/latest) and emails the owner their week:
// money, the prioritized moves, and any alerts. The server can't read MSOS, so
// it relies on the snapshot the Home page persists. Email via Resend (a single
// fetch to their REST API — no SDK). renderDigestHtml is pure.
import { getFirestore } from 'firebase-admin/firestore';

// Mirror of the client-written snapshot (lib/director/cockpitSnapshot.ts).
export interface DigestSnapshot {
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
  generatedAt: number;
  money: {
    revenue: number; profit: number; profitKnown: boolean; marginPct: number | null;
    jobs: number; avgTicket: number; growthPct: number | null;
    bestCity: string | null; bestService: string | null;
  };
  moves: { text: string; why: string; impact: string; dollars: number | null }[];
  alerts: { text: string; tone: string }[];
  contentRoi?: { influenced: number; perThousandViews: number } | null;
}

const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ALERT_BG: Record<string, string> = { bad: '#fee2e2', warn: '#fef3c7', opportunity: '#dbeafe' };
const ALERT_FG: Record<string, string> = { bad: '#991b1b', warn: '#92400e', opportunity: '#1e40af' };

/** Pure: render the digest HTML from a snapshot. Inline styles for email clients. */
export function renderDigestHtml(s: DigestSnapshot): string {
  const g = s.money.growthPct;
  const growth = g != null ? `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%` : '—';
  const growthColor = g != null && g < 0 ? '#dc2626' : '#059669';
  const margin = s.money.profitKnown && s.money.marginPct != null ? ` · ${Math.round(s.money.marginPct * 100)}% margin` : '';

  const stat = (label: string, value: string, color = '#0f172a'): string =>
    `<td style="padding:10px 14px;background:#f8fafc;border-radius:8px;">
       <div style="font-size:12px;color:#64748b;">${label}</div>
       <div style="font-size:20px;font-weight:700;color:${color};">${value}</div>
     </td>`;

  const alerts = s.alerts.length
    ? `<div style="margin:16px 0;">${s.alerts.map((a) =>
        `<div style="display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border-radius:999px;font-size:13px;background:${ALERT_BG[a.tone] ?? '#e2e8f0'};color:${ALERT_FG[a.tone] ?? '#334155'};">${esc(a.text)}</div>`,
      ).join('')}</div>` : '';

  const moves = s.moves.length
    ? `<ol style="margin:8px 0 0;padding-left:20px;">${s.moves.map((m) =>
        `<li style="margin-bottom:12px;">
           <div style="font-size:15px;font-weight:600;color:#0f172a;">${esc(m.text)}
             ${m.dollars && m.dollars > 0 ? `<span style="font-size:12px;color:#059669;font-weight:600;">· ${usd(m.dollars)} opportunity</span>` : ''}
           </div>
           <div style="font-size:13px;color:#64748b;">${esc(m.why)}</div>
         </li>`,
      ).join('')}</ol>`
    : `<p style="color:#64748b;font-size:14px;">No prioritized moves this week — connect more sources for sharper recommendations.</p>`;

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
        <div style="font-size:13px;color:#7c3aed;font-weight:700;letter-spacing:.04em;">YOUR MONDAY BRIEF</div>
        <h1 style="margin:4px 0 2px;font-size:22px;color:#0f172a;">${esc(s.businessName)}</h1>
        <div style="font-size:13px;color:#64748b;">Revenue ${usd(s.money.revenue)}${margin}</div>

        <table cellpadding="0" cellspacing="6" style="margin:16px 0;width:100%;border-collapse:separate;"><tr>
          ${stat('Revenue', usd(s.money.revenue), '#059669')}
          ${stat('Profit', s.money.profitKnown ? usd(s.money.profit) : '—', '#2563eb')}
          ${stat('Jobs', String(s.money.jobs))}
        </tr><tr>
          ${stat('Avg ticket', usd(s.money.avgTicket), '#d97706')}
          ${stat('Growth', growth, growthColor)}
          ${stat('Best city', s.money.bestCity ?? '—', '#7c3aed')}
        </tr></table>

        ${alerts}

        ${s.contentRoi && s.contentRoi.influenced > 0
          ? `<div style="margin:16px 0;padding:12px 14px;background:#ecfdf5;border-radius:8px;font-size:14px;color:#065f46;">📈 Your content influenced <strong>${usd(s.contentRoi.influenced)}</strong> of revenue · ${usd(s.contentRoi.perThousandViews)} per 1K views</div>`
          : ''}

        <h2 style="font-size:16px;color:#0f172a;margin:18px 0 0;">Do these ${s.moves.length || ''} this week</h2>
        ${moves}

        <div style="margin-top:22px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          From Content OS — your marketing director. Numbers are live from your connected data.
        </div>
      </div>
    </div>
  </body></html>`;
}

export function digestSubject(s: DigestSnapshot): string {
  const g = s.money.growthPct;
  const tail = s.moves.length ? ` · ${s.moves.length} move${s.moves.length === 1 ? '' : 's'} ready` : '';
  const trend = g != null && g < 0 ? ` (down ${Math.round(Math.abs(g) * 100)}%)` : '';
  return `Your week: ${usd(s.money.revenue)}${trend}${tail}`;
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export interface DigestResult { businessId: string; to: string; ok: boolean; error?: string }
export interface DigestSummary { eligible: number; sent: number; failed: number; skipped: number; results: DigestResult[] }

const STALE_MS = 14 * 24 * 60 * 60 * 1000; // skip owners who haven't opened Home in 2 weeks

/** Email every business with a fresh snapshot + an owner address. Isolated per send. */
export async function runWeeklyDigest(apiKey: string, from: string, now: number): Promise<DigestSummary> {
  const db = getFirestore();
  const snap = await db.collectionGroup('cockpit').get();
  const summary: DigestSummary = { eligible: 0, sent: 0, failed: 0, skipped: 0, results: [] };

  for (const doc of snap.docs) {
    if (doc.id !== 'latest') continue;
    const s = doc.data() as DigestSnapshot;
    if (!s.ownerEmail || !s.generatedAt || now - s.generatedAt > STALE_MS) { summary.skipped++; continue; }
    summary.eligible++;
    try {
      await sendViaResend(apiKey, from, s.ownerEmail, digestSubject(s), renderDigestHtml(s));
      summary.sent++;
      summary.results.push({ businessId: s.businessId, to: s.ownerEmail, ok: true });
    } catch (err) {
      summary.failed++;
      summary.results.push({ businessId: s.businessId, to: s.ownerEmail, ok: false, error: err instanceof Error ? err.message : 'send failed' });
    }
  }
  return summary;
}
