// Text similarity scoring used by the uniqueness engine. Blends token-set
// overlap (catches reworded duplicates) with character trigrams (catches
// structural/phrasing reuse).

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for',
  'we', 'you', 'your', 'our', 'is', 'it', 'that', 'this', 'with', 'so', 'i',
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(s: string, dropStopwords = false): string[] {
  const toks = normalize(s).split(' ').filter(Boolean);
  return dropStopwords ? toks.filter((t) => !STOPWORDS.has(t)) : toks;
}

export function jaccard(a: string, b: string): number {
  const A = new Set(tokenize(a, true));
  const B = new Set(tokenize(b, true));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export function trigrams(s: string): Set<string> {
  const n = normalize(s).replace(/\s/g, '');
  const out = new Set<string>();
  for (let i = 0; i + 3 <= n.length; i++) out.add(n.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Combined similarity in 0..1. */
export function similarity(a: string, b: string): number {
  return 0.6 * jaccard(a, b) + 0.4 * trigramSimilarity(a, b);
}

/** Highest similarity of `text` against any string in `others`. */
export function maxSimilarity(text: string, others: string[]): number {
  return others.reduce((m, o) => Math.max(m, similarity(text, o)), 0);
}
