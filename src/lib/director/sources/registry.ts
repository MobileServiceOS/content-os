// The source registry. Phase 1: only the sample source is "active" (it provides
// the whole dataset). Phase 2: flip individual sources on per business as they
// connect, and loadDataset() merges every active source's slice.
import type { DirectorDataset } from '../types';
import { mergeDataset, type DirectorSource, type FetchRange } from './index';
import { sampleSource } from './sampleSource';
import { PHASE2_SOURCES } from './phase2';

/** All known sources (sample + the Phase 2 adapters, inert until wired). */
export const ALL_SOURCES: DirectorSource[] = [sampleSource, ...PHASE2_SOURCES];

/**
 * Load the dataset from the active sources. Phase 1: just the sample source.
 * Phase 2: pass the connected sources; their slices merge with no analyzer
 * changes. A source that throws (not configured / error) is skipped, not fatal.
 */
export async function loadDataset(
  businessId: string,
  range: FetchRange,
  active: DirectorSource[] = [sampleSource],
): Promise<DirectorDataset> {
  const slices = await Promise.all(
    active.map(async (s) => {
      try {
        return await s.fetch(businessId, range);
      } catch {
        return {} as Partial<DirectorDataset>;
      }
    }),
  );
  // Always surface the full source roster (with states) for the UI badges.
  const statuses = await Promise.all(ALL_SOURCES.map((s) => s.status(businessId)));
  return { ...mergeDataset(slices, range), sources: statuses };
}
