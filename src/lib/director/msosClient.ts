// Client transport to the READ-ONLY `getMsosJobs` Cloud Function. Firebase is
// lazy-imported so importing this module never initializes it (keeps tests +
// the analyzer layer Firebase-free). Returns real, normalized MSOS jobs or
// throws — there is no mock fallback by design.
import type { JobRecord } from './types';

export interface MsosJobsResponse {
  jobs: JobRecord[];
  readAt: number;
  businessId: string;
  readOnly: true;
}

/** Thrown (as a code) when the MSOS connection secrets aren't set yet. */
export const MSOS_NOT_CONFIGURED = 'msos-not-configured';

export async function fetchMsosJobs(businessId: string): Promise<MsosJobsResponse> {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<{ businessId: string }, MsosJobsResponse>(functions, 'getMsosJobs');
  try {
    const res = await fn({ businessId });
    return res.data;
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    const msg = (err as { message?: string })?.message ?? '';
    if (code.includes('failed-precondition') || /not configured/i.test(msg)) {
      throw new Error(MSOS_NOT_CONFIGURED);
    }
    throw err instanceof Error ? err : new Error('Failed to read MSOS jobs.');
  }
}
