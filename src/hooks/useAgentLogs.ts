// Live agent activity feed + a convenience logger bound to the current user.
import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { agentLogsCol } from '../lib/firebase/paths';
import { logAgentActivity, type AgentLogEntry } from '../lib/agents/log';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { AgentLog } from '../types/level3';

export function useAgentLogs(max = 50) {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    if (!businessId) {
      setLogs([]);
      return;
    }
    const q = query(agentLogsCol(businessId), orderBy('createdAt', 'desc'), limit(max));
    return onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AgentLog, 'id'>) })));
    });
  }, [businessId, max]);

  async function log(entry: AgentLogEntry): Promise<void> {
    if (!businessId || !user) return;
    await logAgentActivity(businessId, user.uid, entry);
  }

  return { logs, log };
}
