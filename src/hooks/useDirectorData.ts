// Data access for the Marketing Director. Phase 1: the sample dataset (no APIs).
// The shape is already Phase-2-ready: when live sources are connected, swap the
// body for `loadDataset(businessId, range, activeSources)` and every Director
// view keeps working unchanged. A dev/demo flag lets us optionally fold the
// business's real (manually-entered) postPerformance spine into the sample data
// so we can preview live numbers without any platform integration.
import { useMemo, useState } from 'react';
import { usePostPerformance } from './usePostPerformance';
import { sampleDataset } from '../lib/director/sampleData';
import type { DirectorDataset } from '../lib/director/types';

export interface UseDirectorData {
  dataset: DirectorDataset;
  loading: boolean;
  /** Whether the numbers are sample data (Phase 1) or include live rows. */
  usingSample: boolean;
}

export function useDirectorData(opts: { includeLive?: boolean } = {}): UseDirectorData {
  const { items: livePosts, loading } = usePostPerformance();
  const [base] = useState<DirectorDataset>(() => sampleDataset());

  const dataset = useMemo<DirectorDataset>(() => {
    const liveWithMetrics = livePosts.filter((p) => p.metrics.views > 0);
    if (!opts.includeLive || liveWithMetrics.length === 0) return base;
    // Fold real, metric-bearing posts in alongside the sample reach so the
    // owner can see their actual content surface in the Director before any
    // platform API exists. Jobs/reviews/SEO stay sample until Phase 2.
    return { ...base, posts: [...liveWithMetrics, ...base.posts] };
  }, [base, livePosts, opts.includeLive]);

  return {
    dataset,
    loading: opts.includeLive ? loading : false,
    usingSample: !opts.includeLive || dataset === base,
  };
}
