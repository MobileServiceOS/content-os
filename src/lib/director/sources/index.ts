// Director data sources — the Phase 2 seam, designed now. The analyzers in
// ../analyze.ts depend ONLY on a DirectorDataset, never on where it came from.
// So Phase 2 is purely "fill the dataset from live adapters": each source
// returns a slice (Partial<DirectorDataset>) and mergeDataset() combines them.
// Phase 1 ships only sampleSource; the rest are typed stubs that throw
// 'not-configured' until wired. Provider secrets (when added) live server-side
// in Firebase Functions — never in the browser, same as the LLM keys.
import type { DirectorDataset, SourceId, SourceStatus } from '../types';
import { EMPTY_RANGE } from './empty';

export interface FetchRange { start: number; end: number; }

export interface DirectorSource {
  readonly id: SourceId;
  readonly label: string;
  status(businessId: string): Promise<SourceStatus>;
  /** Return this source's slice of the dataset for the range. */
  fetch(businessId: string, range: FetchRange): Promise<Partial<DirectorDataset>>;
}

/** Combine source slices into one dataset. Later sources append, not overwrite. */
export function mergeDataset(slices: Partial<DirectorDataset>[], range: FetchRange): DirectorDataset {
  const out: DirectorDataset = { posts: [], jobs: [], reviews: [], seo: [], range, sources: [] };
  for (const s of slices) {
    if (s.posts) out.posts.push(...s.posts);
    if (s.jobs) out.jobs.push(...s.jobs);
    if (s.reviews) out.reviews.push(...s.reviews);
    if (s.seo) out.seo.push(...s.seo);
    if (s.sources) out.sources.push(...s.sources);
    if (s.range) out.range = s.range;
  }
  return out;
}

export { EMPTY_RANGE };
