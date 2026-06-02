// Live Search Console connection + data for the Director. Subscribes to the
// owner-readable status/data doc (the token lives in a separate locked doc the
// client can't read). Drives disconnected / connecting / connected / syncing /
// error states. No fabricated data — everything comes from the synced snapshot.
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/client';
import { useBusiness } from '../context/BusinessContext';
import { scStartConnect, scSync, scDisconnect } from '../lib/director/searchConsoleClient';
import type { SeoData } from '../lib/director/seoIntel';

export type ScStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

interface ScDoc { status?: ScStatus; data?: SeoData | null; siteUrl?: string | null; lastSync?: number | null; error?: string | null; }

export interface UseSearchConsole {
  status: ScStatus;
  data: SeoData | null;
  siteUrl: string | null;
  lastSync: number | null;
  error: string | null;
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useSearchConsole(): UseSearchConsole {
  const { businessId } = useBusiness();
  const [state, setState] = useState<ScDoc>({});
  const [connecting, setConnecting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const autoSynced = useRef(false);

  useEffect(() => {
    if (!businessId) return;
    const ref = doc(db, `businesses/${businessId}/searchConsole/latest`);
    return onSnapshot(ref, (snap) => setState((snap.data() as ScDoc) ?? {}), () => setState({}));
  }, [businessId]);

  const sync = useCallback(async () => {
    if (!businessId) return;
    setLocalErr(null);
    try { await scSync(businessId); } catch (e) { setLocalErr((e as Error)?.message ?? 'Sync failed.'); }
  }, [businessId]);

  // Auto-sync once right after a fresh connect (status connected, no data yet).
  useEffect(() => {
    if (state.status === 'connected' && !state.data && !autoSynced.current && businessId) {
      autoSynced.current = true;
      void sync();
    }
    if (state.status === 'disconnected') autoSynced.current = false;
  }, [state.status, state.data, businessId, sync]);

  const connect = useCallback(async () => {
    if (!businessId) return;
    setConnecting(true);
    setLocalErr(null);
    try { await scStartConnect(businessId); } catch (e) { setConnecting(false); setLocalErr((e as Error)?.message ?? 'Could not start sign-in.'); }
  }, [businessId]);

  const disconnect = useCallback(async () => {
    if (!businessId) return;
    autoSynced.current = false;
    try { await scDisconnect(businessId); } catch (e) { setLocalErr((e as Error)?.message ?? 'Disconnect failed.'); }
  }, [businessId]);

  const status: ScStatus = localErr || state.status === 'error'
    ? 'error'
    : connecting
      ? 'connecting'
      : (state.status as ScStatus) ?? 'disconnected';

  return {
    status,
    data: state.data ?? null,
    siteUrl: state.siteUrl ?? null,
    lastSync: state.lastSync ?? null,
    error: localErr ?? state.error ?? null,
    connect,
    sync,
    disconnect,
  };
}
