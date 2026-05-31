// Quality scoring across five dimensions: uniqueness, readability, engagement,
// brand alignment, local relevance. Pure functions; recent outputs are passed in.
import { maxSimilarity, tokenize } from '../uniqueness/similarity';
import { scoreBrandAlignment, scoreLocalRelevance } from './brand';
import type { BrandSettings } from '../../types/models';
import type { QualityScore } from '../../types/generation';

const CTA_SIGNALS = ['book', 'call', 'text', 'dm', 'tap', 'save', 'link', 'now', 'today'];

/** Higher when sentences sit in an easy-to-read length band. */
export function scoreReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return 0;
  const words = tokenize(text);
  const avgLen = words.length / sentences.length;
  // Ideal ~8-18 words/sentence. Penalize very short or very long.
  const lengthScore = avgLen <= 18 ? Math.min(1, avgLen / 12) : Math.max(0.2, 1 - (avgLen - 18) / 30);
  const longWordRatio = words.filter((w) => w.length >= 11).length / Math.max(1, words.length);
  return Math.max(0, Math.min(1, lengthScore - longWordRatio));
}

/** Higher when the text has hook signals: a question, a number, "you", a CTA. */
export function scoreEngagement(text: string): number {
  const n = text.toLowerCase();
  let score = 0.4;
  if (/[?]/.test(text)) score += 0.2;
  if (/\d/.test(text)) score += 0.15;
  if (/\byou\b|\byour\b/.test(n)) score += 0.15;
  if (CTA_SIGNALS.some((c) => new RegExp(`\\b${c}\\b`).test(n))) score += 0.15;
  const first = (text.split(/[.!?]+/)[0] ?? '').trim();
  if (first && tokenize(first).length <= 9) score += 0.1; // punchy opener
  return Math.max(0, Math.min(1, score));
}

export function scoreOutput(
  text: string,
  recent: string[],
  brand: BrandSettings,
): QualityScore {
  const uniqueness = 1 - maxSimilarity(text, recent);
  const readability = scoreReadability(text);
  const engagement = scoreEngagement(text);
  const brandAlignment = scoreBrandAlignment(text, brand);
  const localRelevance = scoreLocalRelevance(text, brand);
  const overall =
    0.3 * uniqueness +
    0.25 * brandAlignment +
    0.2 * engagement +
    0.15 * readability +
    0.1 * localRelevance;
  return { uniqueness, readability, engagement, brandAlignment, localRelevance, overall };
}
