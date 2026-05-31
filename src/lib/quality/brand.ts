// Brand-alignment + local-relevance checks. Pure functions over text + brand.
import { normalize, tokenize } from '../uniqueness/similarity';
import type { BrandSettings } from '../../types/models';

export interface BrandChecks {
  bannedPhrasesHit: string[];
  notOfferedHit: string[];
  requiredPresent: number;
  requiredTotal: number;
  keywordStuffing: boolean;
}

export function detectKeywordStuffing(text: string): boolean {
  const t = tokenize(text);
  if (t.length < 8) return false;
  const counts = new Map<string, number>();
  for (const w of t) if (w.length > 3) counts.set(w, (counts.get(w) ?? 0) + 1);
  const max = counts.size ? Math.max(...counts.values()) : 0;
  return max / t.length > 0.18;
}

export function brandChecks(text: string, brand: BrandSettings): BrandChecks {
  const n = normalize(text);
  const has = (phrase: string) => phrase && n.includes(normalize(phrase));
  const required = brand.requiredPhrases ?? [];
  return {
    bannedPhrasesHit: (brand.bannedPhrases ?? []).filter(has),
    notOfferedHit: (brand.notOffered ?? []).filter(has),
    requiredPresent: required.filter(has).length,
    requiredTotal: required.length,
    keywordStuffing: detectKeywordStuffing(text),
  };
}

export function scoreBrandAlignment(text: string, brand: BrandSettings): number {
  const c = brandChecks(text, brand);
  let score = 1;
  score -= 0.4 * Math.min(2, c.bannedPhrasesHit.length);
  score -= 0.25 * Math.min(2, c.notOfferedHit.length);
  if (c.keywordStuffing) score -= 0.2;
  if (c.requiredTotal > 0 && c.requiredPresent === c.requiredTotal) score += 0.1;
  return Math.max(0, Math.min(1, score));
}

/** How well the text grounds itself in the business's locale (areas + keywords). */
export function scoreLocalRelevance(text: string, brand: BrandSettings): number {
  const n = normalize(text);
  const areas = brand.serviceAreas ?? [];
  const keywords = brand.localKeywords ?? [];
  if (areas.length === 0 && keywords.length === 0) return 0.5; // neutral, nothing to match

  const areaHit = areas.some((a) => a && n.includes(normalize(a)));
  // Count distinctive local-keyword tokens that appear in the text.
  const kwTokens = new Set(keywords.flatMap((k) => tokenize(k).filter((w) => w.length >= 4)));
  let kwHits = 0;
  for (const t of kwTokens) if (n.includes(t)) kwHits++;

  let score = 0.25;
  if (areaHit) score += 0.5;
  score += Math.min(0.25, kwHits * 0.08);
  return Math.max(0, Math.min(1, score));
}
