// Helpers for stamping audit fields on tenant-scoped documents.
import type { Audit } from '../../types/models';

/** Returns a monotonic-ish timestamp in epoch ms. Centralized so tests can mock it. */
export const now = (): number => Date.now();

/** Stamp a new document with full audit metadata. */
export function withAudit<T extends object>(
  businessId: string,
  uid: string,
  data: T,
): T & Audit {
  const ts = now();
  return { ...data, businessId, createdBy: uid, createdAt: ts, updatedAt: ts };
}

/** Bump updatedAt on an existing document patch. */
export function touch<T extends object>(data: T): T & { updatedAt: number } {
  return { ...data, updatedAt: now() };
}
