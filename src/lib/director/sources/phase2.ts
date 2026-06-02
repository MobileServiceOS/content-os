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

export const msosJobsSource = stub('msos_jobs', 'MSOS Jobs');
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
