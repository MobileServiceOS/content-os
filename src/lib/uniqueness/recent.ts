// Build the RecentByType map (recent output texts per generation type) from
// generation-history entries. Entries are newest-first, capped at 50 per type.
import type { GenerationHistoryEntry } from '../../types/models';
import type { RecentByType } from '../../types/generation';

/** Fast gate window (last `limit` per type). Default 100 (Level 3). */
export function buildRecent(entries: GenerationHistoryEntry[], limit = 100): RecentByType {
  const r: RecentByType = { hook: [], caption: [], cta: [], script: [], review: [], reply: [] };
  for (const e of entries) if (r[e.type] && r[e.type].length < limit) r[e.type].push(e.text);
  return r;
}
