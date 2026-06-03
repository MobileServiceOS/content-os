// Wave 2 — nightly auto-sync. Refreshes every connected integration for every
// business on a schedule, so owners never press "Sync now". Discovery is one
// collectionGroup('private') query: OAuth tokens live at
// businesses/{id}/private/{searchConsole|gbp|social_<platform>} (Admin-only),
// and the doc id tells us which connector to run. Reuses the exact sync cores
// the onCall handlers use — this is orchestration, not new sync logic. Per-
// business failures are isolated so one bad token never aborts the run.
import { getFirestore } from 'firebase-admin/firestore';
import { syncSearchConsole } from './searchConsole';
import * as gbp from './gbp';
import * as social from './social';

/** Pure: map a private-doc id to the connector it represents (null = unrelated). */
export function classifyPrivateDoc(id: string): { kind: 'searchConsole' | 'gbp' | 'social'; platform?: string } | null {
  if (id === 'searchConsole') return { kind: 'searchConsole' };
  if (id === 'gbp') return { kind: 'gbp' };
  if (id.startsWith('social_')) return { kind: 'social', platform: id.slice('social_'.length) };
  return null;
}

export interface AutoSyncCreds { scClientId: string; scSecret: string; tiktokKey: string; tiktokSecret: string; }
export interface AutoSyncDetail { businessId: string; connector: string; ok: boolean; error?: string }
export interface AutoSyncSummary { scanned: number; synced: number; failed: number; details: AutoSyncDetail[] }

/** Refresh all connected integrations across all businesses. Isolated per item. */
export async function runAutoSync(creds: AutoSyncCreds): Promise<AutoSyncSummary> {
  const db = getFirestore();
  const snap = await db.collectionGroup('private').get();
  const summary: AutoSyncSummary = { scanned: 0, synced: 0, failed: 0, details: [] };

  for (const doc of snap.docs) {
    const bid = doc.ref.parent.parent?.id;
    if (!bid) continue;
    const cls = classifyPrivateDoc(doc.id);
    if (!cls) continue;

    let task: Promise<unknown> | null = null;
    let connector: string = cls.kind;
    if (cls.kind === 'searchConsole') {
      task = syncSearchConsole(bid, creds.scClientId, creds.scSecret);
    } else if (cls.kind === 'gbp') {
      task = gbp.syncGbp(bid, creds.scClientId, creds.scSecret);
    } else if (cls.kind === 'social' && cls.platform) {
      const c = social.connectorFor(cls.platform);
      // Only platforms whose secrets are configured (TikTok today) can sync.
      if (c && cls.platform === 'tiktok') {
        connector = `social_${cls.platform}`;
        task = social.syncPlatform(c, bid, creds.tiktokKey, creds.tiktokSecret);
      }
    }
    if (!task) continue;

    summary.scanned++;
    try {
      await task;
      summary.synced++;
      summary.details.push({ businessId: bid, connector, ok: true });
    } catch (err) {
      summary.failed++;
      summary.details.push({ businessId: bid, connector, ok: false, error: err instanceof Error ? err.message : 'sync failed' });
    }
  }
  return summary;
}
