// A compact, deterministic structural signature for a generated output. Stored
// alongside each generation so admins can spot reused structures at a glance.
import { normalize, tokenize } from './similarity';

function lengthBucket(wordCount: number): string {
  if (wordCount <= 8) return 's';
  if (wordCount <= 20) return 'm';
  if (wordCount <= 45) return 'l';
  return 'xl';
}

export function fingerprint(text: string): string {
  const norm = normalize(text);
  const words = tokenize(text);
  const sentences = (text.match(/[.!?]+/g) ?? []).length || 1;
  // Top distinctive tokens (length >= 4), sorted for order-independence.
  const distinctive = Array.from(new Set(words.filter((w) => w.length >= 4)))
    .sort()
    .slice(0, 6)
    .join('-');
  return `${sentences}:${lengthBucket(words.length)}:${distinctive || norm.slice(0, 12)}`;
}
