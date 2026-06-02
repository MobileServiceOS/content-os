// Generic social-platform connection hook (reused by TikTok and, later, IG/FB/YT
// — pass the platform id). Subscribes to the owner-readable social/{platform}
// doc; drives disconnected/connecting/connected/syncing/error. No fabricated data.
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/client';
import { useBusiness } from '../context/BusinessContext';
import { socialStartConnect, socialSync, socialDisconnect } from '../lib/director/social/socialClient';
import type { SocialData } from '../lib/director/social/types';

export type SocialStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
interface SocialDoc { status?: SocialStatus; data?: SocialData | null; lastSync?: number | null; error?: string | null }

export interface UseSocialPlatform {
  status: SocialStatus;
  data: SocialData | null;
  lastSync: number | null;
  error: string | null;
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useSocialPlatform(platform: string): UseSocialPlatform {
  const { businessId } = useBusiness();
  const [state, setState] = useState<SocialDoc>({});
  const [connecting, setConnecting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const autoSynced = useRef(false);

  useEffect(() => {
    if (!businessId) return;
    const ref = doc(db, `businesses/${businessId}/social/${platform}`);
    return onSnapshot(ref, (snap) => setState((snap.data() as SocialDoc) ?? {}), () => setState({}));
  }, [businessId, platform]);

  const sync = useCallback(async () => {
    if (!businessId) return;
    setLocalErr(null);
    try { await socialSync(businessId, platform); } catch (e) { setLocalErr((e as Error)?.message ?? 'Sync failed.'); }
  }, [businessId, platform]);

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
    try { await socialStartConnect(businessId, platform); } catch (e) { setConnecting(false); setLocalErr((e as Error)?.message ?? 'Could not start sign-in.'); }
  }, [businessId, platform]);

  const disconnect = useCallback(async () => {
    if (!businessId) return;
    autoSynced.current = false;
    try { await socialDisconnect(businessId, platform); } catch (e) { setLocalErr((e as Error)?.message ?? 'Disconnect failed.'); }
  }, [businessId, platform]);

  const status: SocialStatus = localErr || state.status === 'error' ? 'error' : connecting ? 'connecting' : (state.status as SocialStatus) ?? 'disconnected';

  return {
    status,
    data: state.data ?? null,
    lastSync: state.lastSync ?? null,
    error: localErr ?? state.error ?? null,
    connect,
    sync,
    disconnect,
  };
}
