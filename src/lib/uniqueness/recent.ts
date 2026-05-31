// Build the RecentByType map (recent output texts per generation type) from
// generation-history entries. Entries are newest-first, capped at 50 per type.
import type { GenerationHistoryEntry } from '../../types/models';
import type { RecentByType } from '../../types/generation';

export function buildRecent(entries: GenerationHistoryEntry[]): RecentByType {
  const r: RecentByType = { hook: [], caption: [], cta: [], script: [], review: [], reply: [] };
  for (const e of entries) if (r[e.type] && r[e.type].length < 50) r[e.type].push(e.text);
  return r;
}
