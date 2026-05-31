// BrandGuardianAgent — detects repetition, banned phrases/openers, keyword
// stuffing, and duplicate structures; scores brand alignment and uniqueness.
//
// Stage A ships self-contained heuristics so the agent is usable immediately.
// Stage B refactors review() to delegate to src/lib/uniqueness + src/lib/quality
// so the scoring logic lives in exactly one place.
import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentResult, GuardianReport } from './types';
import type { BrandSettings } from '../../types/models';

export const BANNED_OPENERS = [
  'thank you',
  'thanks for choosing us',
  'we appreciate your business',
  'glad we could help',
  'a customer in',
  'wheel rush completed',
];

const UNIQUENESS_THRESHOLD = 0.4; // uniqueness below this fails the guardian

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (s: string): string[] => normalize(s).split(' ').filter(Boolean);

function jaccard(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export interface GuardianInput {
  text: string;
  recent?: string[]; // recent outputs of the same kind
}

export class BrandGuardianAgent extends BaseAgent<GuardianInput, GuardianReport> {
  readonly name = 'BrandGuardian';

  detectBannedOpeners(text: string): string[] {
    const n = normalize(text);
    return BANNED_OPENERS.filter((o) => n.startsWith(o));
  }

  detectBannedPhrases(text: string, brand: BrandSettings): string[] {
    const n = normalize(text);
    return (brand.bannedPhrases ?? []).filter((p) => p && n.includes(normalize(p)));
  }

  /** Flags any content word that dominates the text (cheap stuffing heuristic). */
  detectKeywordStuffing(text: string): boolean {
    const t = tokenize(text);
    if (t.length < 8) return false;
    const counts = new Map<string, number>();
    for (const w of t) if (w.length > 3) counts.set(w, (counts.get(w) ?? 0) + 1);
    const max = counts.size ? Math.max(...counts.values()) : 0;
    return max / t.length > 0.18;
  }

  /** Highest token-overlap against recent outputs (0..1). */
  detectRepetition(text: string, recent: string[]): number {
    return recent.reduce((m, r) => Math.max(m, jaccard(text, r)), 0);
  }

  scoreBrandAlignment(text: string, brand: BrandSettings): number {
    let score = 1;
    if (this.detectBannedOpeners(text).length) score -= 0.4;
    if (this.detectBannedPhrases(text, brand).length) score -= 0.4;
    const n = normalize(text);
    for (const off of brand.notOffered ?? []) {
      if (off && n.includes(normalize(off))) score -= 0.25;
    }
    if (this.detectKeywordStuffing(text)) score -= 0.2;
    const required = brand.requiredPhrases ?? [];
    if (required.length) {
      const present = required.filter((p) => p && n.includes(normalize(p))).length;
      if (present === required.length) score += 0.1;
    }
    return Math.max(0, Math.min(1, score));
  }

  /** Build a full report for a piece of text against brand + recent outputs. */
  review(text: string, ctx: AgentContext, recent: string[] = []): GuardianReport {
    const bannedOpeners = this.detectBannedOpeners(text);
    const bannedPhrases = this.detectBannedPhrases(text, ctx.brand);
    const keywordStuffing = this.detectKeywordStuffing(text);
    const maxRepetition = this.detectRepetition(text, recent);
    const uniqueness = 1 - maxRepetition;
    const brandAlignment = this.scoreBrandAlignment(text, ctx.brand);
    const duplicateStructure = maxRepetition >= 0.85;
    const repetitive = maxRepetition >= 0.6;

    const notes: string[] = [];
    if (bannedOpeners.length) notes.push(`Banned opener: "${bannedOpeners[0]}…"`);
    if (bannedPhrases.length) notes.push(`Banned phrase: ${bannedPhrases.join(', ')}`);
    if (keywordStuffing) notes.push('Possible keyword stuffing');
    if (duplicateStructure) notes.push('Duplicate structure vs recent output');
    else if (repetitive) notes.push('Similar to recent output');

    const passed =
      bannedOpeners.length === 0 &&
      bannedPhrases.length === 0 &&
      !keywordStuffing &&
      uniqueness >= UNIQUENESS_THRESHOLD;

    return {
      passed,
      brandAlignment,
      uniqueness,
      bannedPhrases,
      bannedOpeners,
      keywordStuffing,
      duplicateStructure,
      repetitive,
      notes,
    };
  }

  protected async execute(
    input: GuardianInput,
    ctx: AgentContext,
  ): Promise<AgentResult<GuardianReport>> {
    const report = this.review(input.text, ctx, input.recent ?? []);
    this.step('review', report.passed ? 'ok' : 'warn', report.notes.join('; ') || 'clean');
    return this.result(report, report);
  }
}
