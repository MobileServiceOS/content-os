// READ-ONLY client reader for MSOS jobs. Runs as the signed-in MSOS user (second
// app session), so every read is governed by MSOS's own Firestore rules. We only
// call getDoc/getDocs — never set/update/delete. Nothing is persisted into
// Content OS; the returned array lives in memory for the current view only.
import type { JobRecord, JobStatus } from './types';
import { MSOS_BUSINESS_ID_OVERRIDE } from './msosConfig';
import { msosDb } from './msosApp';

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
    status: toStatus(raw.status),
    completedAt: toEpoch(raw),
  };
}

export interface MsosJobsResult {
  jobs: JobRecord[];
  businessId: string;
  readAt: number;
}

/**
 * Resolve the MSOS business id for a signed-in user: explicit override, else the
 * user's `businessId`/`activeBusinessId`/first owned business, else legacy uid.
 */
export async function resolveMsosBusinessId(uid: string): Promise<string> {
  if (MSOS_BUSINESS_ID_OVERRIDE) return MSOS_BUSINESS_ID_OVERRIDE;
  const { doc, getDoc } = await import('firebase/firestore');
  const db = await msosDb();
  try {
    const snap = await getDoc(doc(db, `users/${uid}`));
    const d = (snap.data() ?? {}) as Record<string, unknown>;
    const candidate =
      (typeof d.businessId === 'string' && d.businessId) ||
      (typeof d.activeBusinessId === 'string' && d.activeBusinessId) ||
      (Array.isArray(d.ownedBusinesses) && typeof d.ownedBusinesses[0] === 'string' && d.ownedBusinesses[0]);
    if (candidate) return candidate as string;
  } catch {
    // users doc not readable — fall through to legacy convention.
  }
  return uid; // legacy: businessId == owner uid
}

/** Read + normalize all jobs for the signed-in MSOS user. READ-ONLY. */
export async function fetchMsosJobs(uid: string): Promise<MsosJobsResult> {
  const { collection, getDocs } = await import('firebase/firestore');
  const db = await msosDb();
  const businessId = await resolveMsosBusinessId(uid);

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
