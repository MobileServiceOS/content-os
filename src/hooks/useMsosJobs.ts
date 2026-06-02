// Live, READ-ONLY read of MSOS jobs as the signed-in MSOS user (Option B),
// multi-business aware. The user picks which of their businesses to analyze; the
// Director reads ONLY the selected business. No service account, no mock data,
// no hardcoded business. States: loading -> needsConnect | (connected + jobs).
import { useCallback, useEffect, useState } from 'react';
import { onMsosAuth, connectMsosEmail, connectMsosGoogle, disconnectMsos } from '../lib/director/msosApp';
import { listMsosBusinesses, fetchMsosJobs, pickDefaultBusiness, type MsosBusiness } from '../lib/director/msosReader';
import type { JobRecord } from '../lib/director/types';

const SEL_KEY = 'msos.selectedBusinessId';

export interface UseMsosJobs {
  jobs: JobRecord[];
  loading: boolean;
  needsConnect: boolean;
  connected: boolean;
  error: string | null;
  readAt: number | null;
  account: string | null;
  businesses: MsosBusiness[];
  selectedBusinessId: string | null;
  selectBusiness: (id: string) => void;
  connectEmail: (email: string, password: string) => Promise<void>;
  connectGoogle: () => Promise<void>;
  disconnect: () => Promise<void>;
  reload: () => void;
}

export function useMsosJobs(): UseMsosJobs {
  const [uid, setUid] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [businesses, setBusinesses] = useState<MsosBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [listing, setListing] = useState(false);

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readAt, setReadAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  // Track the MSOS auth session (separate from Content OS).
  useEffect(() => {
    let unsub = () => {};
    onMsosAuth((user) => {
      setUid(user?.uid ?? null);
      setAccount(user?.email ?? null);
      setAuthReady(true);
    }).then((u) => { unsub = u; });
    return () => unsub();
  }, []);

  // On sign-in: list the user's businesses and pick the default selection.
  useEffect(() => {
    if (!authReady) return;
    if (!uid) { setBusinesses([]); setSelectedBusinessId(null); setJobs([]); return; }
    let cancelled = false;
    setListing(true);
    setError(null);
    listMsosBusinesses(uid)
      .then(({ businesses: bs, activeBusinessId }) => {
        if (cancelled) return;
        setBusinesses(bs);
        const persisted = typeof localStorage !== 'undefined' ? localStorage.getItem(SEL_KEY) : null;
        setSelectedBusinessId(pickDefaultBusiness(bs.map((b) => b.id), { persisted, active: activeBusinessId }));
      })
      .catch((err: Error) => { if (!cancelled) setError(err?.message ?? 'Failed to list businesses.'); })
      .finally(() => { if (!cancelled) setListing(false); });
    return () => { cancelled = true; };
  }, [authReady, uid]);

  // When a business is selected, read ONLY that business's jobs.
  useEffect(() => {
    if (!uid || !selectedBusinessId) return;
    let cancelled = false;
    setJobsLoading(true);
    setError(null);
    fetchMsosJobs(selectedBusinessId)
      .then((res) => { if (cancelled) return; setJobs(res.jobs); setReadAt(res.readAt); })
      .catch((err: Error) => { if (cancelled) return; setJobs([]); setError(err?.message ?? 'Failed to read MSOS jobs.'); })
      .finally(() => { if (!cancelled) setJobsLoading(false); });
    return () => { cancelled = true; };
  }, [uid, selectedBusinessId, nonce]);

  const selectBusiness = useCallback((id: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SEL_KEY, id);
    setSelectedBusinessId(id);
  }, []);

  const friendly = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? '';
    if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Incorrect email or password.';
    if (code.includes('user-not-found')) return 'No MSOS account for that email.';
    if (code.includes('too-many-requests')) return 'Too many attempts — try again shortly.';
    if (code.includes('popup-closed') || code.includes('cancelled')) return 'Sign-in cancelled.';
    return (err as Error)?.message ?? 'Sign-in failed.';
  };

  const connectEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await connectMsosEmail(email, password); // onMsosAuth fires -> auto-reads
    } catch (err) {
      setError(friendly(err));
    }
  }, []);

  const connectGoogle = useCallback(async () => {
    setError(null);
    try {
      await connectMsosGoogle();
    } catch (err) {
      setError(friendly(err));
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectMsos();
    setBusinesses([]);
    setSelectedBusinessId(null);
    setJobs([]);
    setReadAt(null);
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    jobs,
    loading: (!authReady && !uid) || listing || jobsLoading,
    needsConnect: authReady && !uid,
    connected: !!uid && !!selectedBusinessId,
    error,
    readAt,
    account,
    businesses,
    selectedBusinessId,
    selectBusiness,
    connectEmail,
    connectGoogle,
    disconnect,
    reload,
  };
}
