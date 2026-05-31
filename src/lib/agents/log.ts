// Append an entry to the tenant's agent activity log (powers the Activity Feed).
import { addDoc } from 'firebase/firestore';
import { agentLogsCol } from '../firebase/paths';
import { withAudit } from '../firebase/converters';
import type { AgentAction } from '../../types/level3';

export interface AgentLogEntry {
  agent: string;
  action: AgentAction;
  summary: string;
  refId?: string;
  refKind?: string;
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export async function logAgentActivity(
  businessId: string,
  uid: string,
  entry: AgentLogEntry,
): Promise<void> {
  await addDoc(agentLogsCol(businessId), withAudit(businessId, uid, stripUndefined(entry)));
}
