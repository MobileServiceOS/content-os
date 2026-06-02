// READ-ONLY bridge to Mobile Service OS (the separate `mobile-service-os`
// Firebase project). We initialize a SECOND firebase-admin app from a
// service-account key and only ever call .get() — never write. MSOS code is
// never touched; read-only is additionally enforced at the IAM level by
// granting the service account Datastore Viewer only.
//
// MSOS job shape (businesses/{businessId}/jobs/{id}) — see MSOS src/types/index.ts:
//   status: 'Completed'|'Pending'|'Cancelled'; revenue: number|string;
//   service, tireSize, vehicleType, customerName, city/area/fullLocationLabel,
//   date/createdAt; createdByUid/assignedToUid (technician via members lookup).
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export interface MsosJobRecord {
  id: string;
  service: string;
  city: string;
  vehicle: string;
  technician: string;
  tireSize: string;
  customer: string;
  ticketUsd: number;
  status: 'completed' | 'pending' | 'cancelled';
  completedAt: number; // epoch ms
}

export interface MsosJobsResult {
  jobs: MsosJobRecord[];
  readAt: number;
  businessId: string;
  /** True — this connector is read-only by construction. */
  readOnly: true;
}

const APP_NAME = 'msos-readonly';

/** Get-or-create the read-only MSOS admin app from the service-account JSON. */
function msosApp(serviceAccountJson: string): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return getApp(APP_NAME);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error('MSOS_SERVICE_ACCOUNT is not valid JSON.');
  }
  return initializeApp({ credential: cert(parsed as never), projectId: parsed.project_id as string }, APP_NAME);
}

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

function toStatus(v: unknown): MsosJobRecord['status'] {
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

/**
 * Read all jobs for one MSOS business and normalize to MsosJobRecord[].
 * Resolves technician uid -> member displayName. READ-ONLY (only .get()).
 */
export async function readMsosJobs(serviceAccountJson: string, businessId: string): Promise<MsosJobsResult> {
  if (!businessId) throw new Error('MSOS business id is required.');
  const db = getFirestore(msosApp(serviceAccountJson));

  // uid -> display name (technician resolution). Best-effort: empty if unreadable.
  const nameByUid = new Map<string, string>();
  try {
    const members = await db.collection(`businesses/${businessId}/members`).get();
    members.forEach((m) => {
      const d = m.data();
      const name = (d.displayName as string) || (d.name as string) || (d.email as string);
      if (name) nameByUid.set(m.id, name);
    });
  } catch {
    // members not readable — fall back to uid labels below.
  }

  const snap = await db.collection(`businesses/${businessId}/jobs`).get();
  const jobs: MsosJobRecord[] = snap.docs.map((doc) => {
    const j = doc.data() as Record<string, unknown>;
    const techUid = str(j.assignedToUid ?? j.createdByUid, '');
    const technician = (techUid && nameByUid.get(techUid)) || (techUid ? `Tech ${techUid.slice(0, 5)}` : 'Unassigned');
    return {
      id: doc.id,
      service: str(j.service),
      city: str(j.city ?? j.area ?? j.fullLocationLabel),
      vehicle: str(j.vehicleType ?? j.vehicleMakeModel),
      technician,
      tireSize: str(j.tireSize),
      customer: str(j.customerName),
      ticketUsd: toNum(j.revenue),
      status: toStatus(j.status),
      completedAt: toEpoch(j),
    };
  });

  return { jobs, readAt: Date.now(), businessId, readOnly: true };
}
