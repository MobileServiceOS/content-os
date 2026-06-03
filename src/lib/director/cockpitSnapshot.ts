// Wave 2 — the cockpit snapshot. The Monday digest runs server-side, but the
// server can't read MSOS (Option B is client-only). So when the owner opens Home
// we persist a small derived summary (money + top moves + alerts) into Content
// OS Firestore; the digest function reads that. buildSnapshot is pure (tested);
// persist is throttled so a busy owner doesn't write it on every page load.
import { setDoc } from 'firebase/firestore';
import { cockpitSnapshotDoc } from '../firebase/paths';
import type { OwnerSummary } from './ownerExecutive';
import type { CockpitMove, CockpitAlert } from './homeCockpit';
import { totalInfluenced, revenuePerThousandViews, type ContentRoiRow } from './contentRoi';

export interface CockpitSnapshot {
  businessId: string;       // required for the sameTenant() rule
  businessName: string;
  ownerEmail: string | null;
  generatedAt: number;
  money: {
    revenue: number; profit: number; profitKnown: boolean; marginPct: number | null;
    jobs: number; avgTicket: number; growthPct: number | null;
    bestCity: string | null; bestService: string | null;
  };
  moves: { text: string; why: string; impact: CockpitMove['impact']; dollars: number | null }[];
  alerts: { text: string; tone: CockpitAlert['tone'] }[];
  // Content→revenue attribution (directional). Null when no TikTok/content data.
  contentRoi: { influenced: number; perThousandViews: number } | null;
}

export function buildSnapshot(args: {
  businessId: string; businessName: string; ownerEmail: string | null; now: number;
  summary: OwnerSummary; moves: CockpitMove[]; alerts: CockpitAlert[]; roi: ContentRoiRow[];
}): CockpitSnapshot {
  const { businessId, businessName, ownerEmail, now, summary, moves, alerts, roi } = args;
  const influenced = totalInfluenced(roi);
  return {
    businessId, businessName, ownerEmail, generatedAt: now,
    money: {
      revenue: summary.revenue, profit: summary.profit, profitKnown: summary.profitKnown,
      marginPct: summary.marginPct, jobs: summary.jobs, avgTicket: summary.avgTicket,
      growthPct: summary.growthPct, bestCity: summary.bestCity, bestService: summary.bestService,
    },
    moves: moves.map((m) => ({ text: m.text, why: m.why, impact: m.impact, dollars: m.dollars })),
    alerts: alerts.map((a) => ({ text: a.text, tone: a.tone })),
    contentRoi: influenced > 0 ? { influenced, perThousandViews: revenuePerThousandViews(roi) } : null,
  };
}

const THROTTLE_KEY = (bid: string): string => `cockpitSnap.${bid}`;
const SIX_HOURS = 6 * 60 * 60 * 1000;

/** Persist the snapshot, throttled to ~once per 6h per business. Idempotent merge. */
export async function persistCockpitSnapshot(snapshot: CockpitSnapshot): Promise<void> {
  const key = THROTTLE_KEY(snapshot.businessId);
  if (typeof localStorage !== 'undefined') {
    const last = Number(localStorage.getItem(key) ?? 0);
    if (snapshot.generatedAt - last < SIX_HOURS) return;
  }
  await setDoc(cockpitSnapshotDoc(snapshot.businessId), snapshot, { merge: true });
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(snapshot.generatedAt));
}
