// Streams the tenant's generation history (newest first) and records new
// generated outputs with their uniqueness/brand metadata + fingerprint.
import { useEffect, useState } from 'react';
import { addDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { generationHistoryCol } from '../lib/firebase/paths';
import { withAudit } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { fingerprint } from '../lib/uniqueness/fingerprint';
import type { GenerationHistoryEntry } from '../types/models';
import type { GeneratedRecord } from '../lib/ai/shared';

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export function useGenerationHistory(max = 100) {
  const { businessId } = useBusiness();
  const [entries, setEntries] = useState<GenerationHistoryEntry[]>([]);

  useEffect(() => {
    if (!businessId) {
      setEntries([]);
      return;
    }
    const q = query(generationHistoryCol(businessId), orderBy('createdAt', 'desc'), limit(max));
    return onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GenerationHistoryEntry, 'id'>) })),
      );
    });
  }, [businessId, max]);

  /** Persist generated outputs (with fingerprints) for the uniqueness engine. */
  async function recordMany(uid: string, records: GeneratedRecord[]): Promise<void> {
    if (!businessId) return;
    await Promise.all(
      records.map((r) =>
        addDoc(
          generationHistoryCol(businessId),
          withAudit(
            businessId,
            uid,
            stripUndefined({
              type: r.type,
              generatorType: r.generatorType,
              hookCategory: r.type === 'hook' ? r.category : undefined,
              contentCategory: r.category,
              structureId: r.structureId,
              fingerprint: fingerprint(r.text),
              text: r.text,
              uniquenessScore: r.uniquenessScore,
              brandScore: r.brandScore,
              similarityScore: r.similarityScore,
              regenerationCount: r.regenerationCount,
            }),
          ),
        ),
      ),
    );
  }

  return { entries, recordMany };
}
