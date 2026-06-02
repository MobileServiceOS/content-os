// Live, READ-ONLY read of MSOS jobs as the signed-in MSOS user (Option B:
// client-side, your identity). No service account, no mock data. States:
//  - loading: resolving the MSOS auth session
//  - needsConnect: no MSOS session yet -> show a Connect button
//  - connected: jobs loaded (possibly empty)
//  - error: read failed
import { useCallback, useEffect, useState } from 'react';
import { onMsosAuth, connectMsos, disconnectMsos } from '../lib/director/msosApp';
import { fetchMsosJobs } from '../lib/director/msosReader';
import type { JobRecord } from '../lib/director/types';

export interface UseMsosJobs {
  jobs: JobRecord[];
  loading: boolean;
  needsConnect: boolean;
  connected: boolean;
  error: string | null;
  readAt: number | null;
  account: string | null; // signed-in MSOS email, for display
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reload: () => void;
}

export function useMsosJobs(): UseMsosJobs {
  const [uid, setUid] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
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

  // Once we know the session, read jobs (or fall to needsConnect).
  useEffect(() => {
    if (!authReady) return;
    if (!uid) {
      setLoading(false);
      setConnected(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMsosJobs(uid)
      .then((res) => {
        if (cancelled) return;
        setJobs(res.jobs);
        setConnected(true);
        setReadAt(res.readAt);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setConnected(false);
        setError(err?.message ?? 'Failed to read MSOS jobs.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authReady, uid, nonce]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await connectMsos(); // Google popup; onMsosAuth fires -> triggers read
    } catch (err) {
      setError((err as Error)?.message ?? 'Sign-in cancelled.');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectMsos();
    setJobs([]);
    setConnected(false);
    setReadAt(null);
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    jobs,
    loading: loading && (!authReady || !!uid),
    needsConnect: authReady && !uid,
    connected,
    error,
    readAt,
    account,
    connect,
    disconnect,
    reload,
  };
}
