// Live read of MSOS jobs for the Marketing Director. No mock fallback: either
// real jobs load, the connection isn't configured yet ('not-configured'), or an
// error surfaces. The UI renders a "Connect MSOS" state for not-configured.
import { useCallback, useEffect, useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { fetchMsosJobs, MSOS_NOT_CONFIGURED } from '../lib/director/msosClient';
import type { JobRecord } from '../lib/director/types';

export interface UseMsosJobs {
  jobs: JobRecord[];
  loading: boolean;
  connected: boolean; // a successful read returned (even if zero jobs)
  notConfigured: boolean; // secrets not set on the function yet
  error: string | null;
  readAt: number | null;
  reload: () => void;
}

export function useMsosJobs(): UseMsosJobs {
  const { businessId } = useBusiness();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readAt, setReadAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    fetchMsosJobs(businessId)
      .then((res) => {
        if (cancelled) return;
        setJobs(res.jobs);
        setConnected(true);
        setReadAt(res.readAt);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setConnected(false);
        if (err.message === MSOS_NOT_CONFIGURED) setNotConfigured(true);
        else setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, nonce]);

  return { jobs, loading, connected, notConfigured, error, readAt, reload };
}
