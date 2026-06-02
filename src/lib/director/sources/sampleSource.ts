// Phase 1 source: returns the full deterministic sample dataset. This is the
// only fully-implemented source until Phase 2 adapters land.
import type { DirectorSource, FetchRange } from './index';
import type { DirectorDataset, SourceStatus } from '../types';
import { sampleDataset } from '../sampleData';

export const sampleSource: DirectorSource = {
  id: 'sample',
  label: 'Sample data',
  async status(): Promise<SourceStatus> {
    return { id: 'sample', label: 'Sample data', state: 'sample' };
  },
  async fetch(_businessId: string, _range: FetchRange): Promise<Partial<DirectorDataset>> {
    return sampleDataset();
  },
};
