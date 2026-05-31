// Firestore read/write for the generation-history ring that powers uniqueness.
// The engine itself is pure (recent entries are passed in); these helpers wire
// it to Firestore from the hook layer.
import { addDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { generationHistoryCol } from '../firebase/paths';
import { withAudit } from '../firebase/converters';
import type { GenerationHistoryEntry, GenerationType } from '../../types/models';

export interface RecentEntry {
  text: string;
  structureId: string;
  fingerprint: string;
  type: GenerationType;
}

export type NewHistoryEntry = Omit<
  GenerationHistoryEntry,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

const RECENT_LIMIT = 100;

/** Last N outputs of a given type for the tenant, newest first. */
export async function loadRecentByType(
  businessId: string,
  type: GenerationType,
  max: number = RECENT_LIMIT,
): Promise<RecentEntry[]> {
  const q = query(
    generationHistoryCol(businessId),
    where('type', '==', type),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as GenerationHistoryEntry;
    return {
      text: data.text,
      structureId: data.structureId,
      fingerprint: data.fingerprint,
      type: data.type,
    };
  });
}

/** Append a generated output to history (audit fields stamped). */
export async function recordGeneration(
  businessId: string,
  uid: string,
  entry: NewHistoryEntry,
): Promise<void> {
  await addDoc(generationHistoryCol(businessId), withAudit(businessId, uid, entry));
}
