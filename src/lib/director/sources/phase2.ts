// Phase 2 source stubs — typed and registered so the seam is real and visible
// in the UI (Source badges show them as "disconnected"), but inert until wired.
// Each will return its OWN slice of the dataset:
//   msosJobs       -> { jobs }            (read-only export from Mobile Service OS — never writes back)
//   gbp            -> { posts(gbp), reviews }
//   searchConsole  -> { seo }
//   ga4            -> site conversions folded into posts
//   tiktok/ig/fb/yt-> { posts }           (PostPerformance rows; CSV import already exists as a fallback)
import type { DirectorSource, FetchRange } from './index';
import type { DirectorDataset, SourceId, SourceStatus } from '../types';
import { SourceNotConfiguredError } from './empty';
import { fetchMsosJobs, MSOS_NOT_CONFIGURED } from '../msosClient';

function stub(id: SourceId, label: string): DirectorSource {
  return {
    id, label,
    async status(): Promise<SourceStatus> {
      return { id, label, state: 'disconnected' };
    },
    async fetch(_businessId: string, _range: FetchRange): Promise<Partial<DirectorDataset>> {
      throw new SourceNotConfiguredError(label);
    },
  };
}

// MSOS Jobs is the one Phase-2 source that's fully wired (read-only). It returns
// a real { jobs } slice via the getMsosJobs callable, or surfaces not-configured.
export const msosJobsSource: DirectorSource = {
  id: 'msos_jobs',
  label: 'MSOS Jobs',
  async status(businessId: string): Promise<SourceStatus> {
    try {
      const res = await fetchMsosJobs(businessId);
      return { id: 'msos_jobs', label: 'MSOS Jobs', state: 'connected', lastSync: res.readAt };
    } catch (err) {
      const configured = (err as Error)?.message !== MSOS_NOT_CONFIGURED;
      return { id: 'msos_jobs', label: 'MSOS Jobs', state: configured ? 'error' : 'disconnected' };
    }
  },
  async fetch(businessId: string, _range: FetchRange): Promise<Partial<DirectorDataset>> {
    const res = await fetchMsosJobs(businessId);
    return { jobs: res.jobs };
  },
};
export const gbpSource = stub('gbp', 'Google Business Profile');
export const searchConsoleSource = stub('search_console', 'Search Console');
export const ga4Source = stub('ga4', 'Google Analytics');
export const tiktokSource = stub('tiktok', 'TikTok');
export const instagramSource = stub('instagram', 'Instagram');
export const facebookSource = stub('facebook', 'Facebook');
export const youtubeSource = stub('youtube', 'YouTube');

export const PHASE2_SOURCES: DirectorSource[] = [
  msosJobsSource, gbpSource, searchConsoleSource, ga4Source,
  tiktokSource, instagramSource, facebookSource, youtubeSource,
];
