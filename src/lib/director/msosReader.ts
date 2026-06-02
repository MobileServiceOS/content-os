// READ-ONLY client reader for MSOS jobs, multi-business aware. Runs as the
// signed-in MSOS user (second app session), so every read is governed by MSOS's
// own Firestore rules. Only getDoc/getDocs — never set/update/delete. Nothing is
// persisted into Content OS. No business is hardcoded: the list comes from the
// user's own `users/{uid}.ownedBusinesses`, and the Director analyzes whichever
// one is selected.
import type { JobRecord, JobStatus } from './types';
import { msosDb } from './msosApp';
import { verticalFor, type VerticalId } from '../verticals';

// --- pure normalization (unit-tested; no Firebase) ---
const toNum = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const str = (v: unknown, fallback = 'Unknown'): string => {
  const s = typeof v === 'string' ? v.trim() : v != null ? String(v) : '';
  return s || fallback;
};
function toStatus(v: unknown): JobStatus {
  const s = String(v ?? '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'pending';
}
function toEpoch(job: Record<string, unknown>): number {
  for (const key of ['date', 'paidAt', 'createdAt']) {
    const raw = job[key];
    if (typeof raw === 'string' && raw) {
      const t = Date.parse(raw);
      if (!Number.isNaN(t)) return t;
    }
    if (typeof raw === 'number' && raw > 0) return raw;
  }
  return 0;
}

/** MSOS job document -> Content OS JobRecord. Pure. */
export function normalizeJob(raw: Record<string, unknown>, id: string, nameByUid: Map<string, string>): JobRecord {
  const techUid = str(raw.assignedToUid ?? raw.createdByUid, '');
  const technician = (techUid && nameByUid.get(techUid)) || (techUid ? `Tech ${techUid.slice(0, 5)}` : 'Unassigned');
  return {
    id,
    service: str(raw.service),
    city: str(raw.city ?? raw.area ?? raw.fullLocationLabel),
    vehicle: str(raw.vehicleType ?? raw.vehicleMakeModel),
    technician,
    tireSize: str(raw.tireSize),
    customer: str(raw.customerName),
    ticketUsd: toNum(raw.revenue),
    costUsd: toNum(raw.tireCost) + toNum(raw.materialCost) + toNum(raw.miscCost) + toNum(raw.partsCost) + toNum(raw.diagnosticFee),
    status: toStatus(raw.status),
    completedAt: toEpoch(raw),
  };
}

// --- business discovery (pure helpers + Firestore lookups) ---

export interface MsosBusiness {
  id: string;
  name: string;
  /** Resolved vertical (from MSOS businessType; defaults to tire). */
  vertical: VerticalId;
}

/**
 * All business ids a user owns (mirrors MSOS getOwnedBusinesses): the user's own
 * uid is always included; legacy single-business users have no list and default
 * to [uid]. Pure + unit-tested.
 */
export function collectOwnedBusinessIds(uid: string, ownedBusinesses: unknown): string[] {
  const list = Array.isArray(ownedBusinesses) ? ownedBusinesses.filter((x): x is string => typeof x === 'string' && !!x) : [];
  return Array.from(new Set([uid, ...list]));
}

/**
 * Choose the default selected business: a valid persisted choice, else the
 * MSOS active business, else the first owned. Pure + unit-tested.
 */
export function pickDefaultBusiness(
  ids: string[],
  opts: { persisted?: string | null; active?: string | null },
): string | null {
  const has = (x?: string | null): x is string => !!x && ids.includes(x);
  if (has(opts.persisted)) return opts.persisted;
  if (has(opts.active)) return opts.active;
  return ids[0] ?? null;
}

export interface MsosBusinessList {
  businesses: MsosBusiness[];
  activeBusinessId: string | null;
}

/** List the businesses the signed-in user owns, with display names. READ-ONLY. */
export async function listMsosBusinesses(uid: string): Promise<MsosBusinessList> {
  const { doc, getDoc } = await import('firebase/firestore');
  const db = await msosDb();

  let ownedBusinesses: unknown = null;
  let activeBusinessId: string | null = null;
  try {
    const snap = await getDoc(doc(db, `users/${uid}`));
    const d = (snap.data() ?? {}) as Record<string, unknown>;
    ownedBusinesses = d.ownedBusinesses;
    activeBusinessId = (typeof d.activeBusinessId === 'string' && d.activeBusinessId)
      || (typeof d.businessId === 'string' && d.businessId) || null;
  } catch {
    // user doc not readable — fall back to the legacy single business (= uid).
  }

  const ids = collectOwnedBusinessIds(uid, ownedBusinesses);
  const businesses = await Promise.all(ids.map(async (id): Promise<MsosBusiness> => {
    try {
      const s = await getDoc(doc(db, `businesses/${id}/settings/main`));
      const data = (s.data() ?? {}) as Record<string, unknown>;
      const name = (data.businessName as string) || '';
      return {
        id,
        name: name || `Business ·${id.slice(-4)}`,
        vertical: verticalFor(data.businessType as string | undefined).id,
      };
    } catch {
      return { id, name: `Business ·${id.slice(-4)}`, vertical: verticalFor(null).id };
    }
  }));
  return { businesses, activeBusinessId };
}

export interface MsosJobsResult {
  jobs: JobRecord[];
  businessId: string;
  readAt: number;
}

/** Read + normalize all jobs for ONE business. READ-ONLY (getDocs only). */
export async function fetchMsosJobs(businessId: string): Promise<MsosJobsResult> {
  if (!businessId) throw new Error('No business selected.');
  const { collection, getDocs } = await import('firebase/firestore');
  const db = await msosDb();

  const nameByUid = new Map<string, string>();
  try {
    const members = await getDocs(collection(db, `businesses/${businessId}/members`));
    members.forEach((m) => {
      const d = m.data() as Record<string, unknown>;
      const name = (d.displayName as string) || (d.name as string) || (d.email as string);
      if (name) nameByUid.set(m.id, name);
    });
  } catch {
    // members not readable — technician names fall back to uid labels.
  }

  const snap = await getDocs(collection(db, `businesses/${businessId}/jobs`));
  const jobs = snap.docs.map((doc) => normalizeJob(doc.data() as Record<string, unknown>, doc.id, nameByUid));
  return { jobs, businessId, readAt: Date.now() };
}
