// Live GBP connection + data for the Director. Subscribes to the owner-readable
// gbp status/data doc (token lives in a separate locked doc). States: disconnected
// / connecting / connected / syncing / error. No fabricated data. Mirrors
// useSearchConsole.
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/client';
import { useBusiness } from '../context/BusinessContext';
import { gbpStartConnect, gbpSync, gbpDisconnect } from '../lib/director/gbpClient';
import type { GbpData } from '../lib/director/gbpIntel';

export type GbpStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
interface GbpDoc { status?: GbpStatus; data?: GbpData | null; locationTitle?: string | null; lastSync?: number | null; error?: string | null }

export interface UseGbp {
  status: GbpStatus;
  data: GbpData | null;
  locationTitle: string | null;
  lastSync: number | null;
  error: string | null;
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useGbp(): UseGbp {
  const { businessId } = useBusiness();
  const [state, setState] = useState<GbpDoc>({});
  const [connecting, setConnecting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const autoSynced = useRef(false);

  useEffect(() => {
    if (!businessId) return;
    const ref = doc(db, `businesses/${businessId}/gbp/latest`);
    return onSnapshot(ref, (snap) => setState((snap.data() as GbpDoc) ?? {}), () => setState({}));
  }, [businessId]);

  const sync = useCallback(async () => {
    if (!businessId) return;
    setLocalErr(null);
    try { await gbpSync(businessId); } catch (e) { setLocalErr((e as Error)?.message ?? 'Sync failed.'); }
  }, [businessId]);

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
    try { await gbpStartConnect(businessId); } catch (e) { setConnecting(false); setLocalErr((e as Error)?.message ?? 'Could not start sign-in.'); }
  }, [businessId]);

  const disconnect = useCallback(async () => {
    if (!businessId) return;
    autoSynced.current = false;
    try { await gbpDisconnect(businessId); } catch (e) { setLocalErr((e as Error)?.message ?? 'Disconnect failed.'); }
  }, [businessId]);

  const status: GbpStatus = localErr || state.status === 'error' ? 'error' : connecting ? 'connecting' : (state.status as GbpStatus) ?? 'disconnected';

  return {
    status,
    data: state.data ?? null,
    locationTitle: state.locationTitle ?? null,
    lastSync: state.lastSync ?? null,
    error: localErr ?? state.error ?? null,
    connect,
    sync,
    disconnect,
  };
}
