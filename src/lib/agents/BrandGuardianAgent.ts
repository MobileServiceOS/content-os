// BrandGuardianAgent — the quality gate. Detects repetition, banned
// openers/phrases, keyword stuffing, and duplicate structures, and scores five
// dimensions (uniqueness, readability, engagement, brand alignment, local
// relevance). Delegates to the shared uniqueness + quality modules so the logic
// lives in exactly one place.
import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentResult, GuardianReport } from './types';
import type { BrandSettings } from '../../types/models';
import { matchedOpeners, DEFAULT_BANNED_OPENERS } from '../uniqueness/bannedOpeners';
import { maxSimilarity } from '../uniqueness/similarity';
import { brandChecks, detectKeywordStuffing, scoreBrandAlignment } from '../quality/brand';
import { scoreOutput } from '../quality/score';

export const BANNED_OPENERS = DEFAULT_BANNED_OPENERS;

const UNIQUENESS_THRESHOLD = 0.4; // uniqueness below this fails the guardian

export interface GuardianInput {
  text: string;
  recent?: string[]; // recent outputs of the same kind
}

export class BrandGuardianAgent extends BaseAgent<GuardianInput, GuardianReport> {
  readonly name = 'BrandGuardian';

  private extraOpeners(brand: BrandSettings): string[] {
    return brand.uniqueness?.bannedOpenings ?? [];
  }

  detectBannedOpeners(text: string, brand?: BrandSettings): string[] {
    return matchedOpeners(text, brand ? this.extraOpeners(brand) : []);
  }

  detectBannedPhrases(text: string, brand: BrandSettings): string[] {
    return brandChecks(text, brand).bannedPhrasesHit;
  }

  detectKeywordStuffing(text: string): boolean {
    return detectKeywordStuffing(text);
  }

  detectRepetition(text: string, recent: string[]): number {
    return maxSimilarity(text, recent);
  }

  scoreBrandAlignment(text: string, brand: BrandSettings): number {
    return scoreBrandAlignment(text, brand);
  }

  /** Full report for a piece of text against brand + recent outputs. */
  review(text: string, ctx: AgentContext, recent: string[] = []): GuardianReport {
    const bannedOpeners = this.detectBannedOpeners(text, ctx.brand);
    const checks = brandChecks(text, ctx.brand);
    const q = scoreOutput(text, recent, ctx.brand);
    const maxSim = maxSimilarity(text, recent);
    const duplicateStructure = maxSim >= 0.85;
    const repetitive = maxSim >= 0.6;

    const notes: string[] = [];
    if (bannedOpeners.length) notes.push(`Banned opener: "${bannedOpeners[0]}…"`);
    if (checks.bannedPhrasesHit.length) notes.push(`Banned phrase: ${checks.bannedPhrasesHit.join(', ')}`);
    if (checks.notOfferedHit.length) notes.push(`Mentions not-offered: ${checks.notOfferedHit.join(', ')}`);
    if (checks.keywordStuffing) notes.push('Possible keyword stuffing');
    if (duplicateStructure) notes.push('Duplicate structure vs recent output');
    else if (repetitive) notes.push('Similar to recent output');

    // Spam risk: stuffing or near-duplicate structure.
    const spamRisk = checks.keywordStuffing || maxSim >= 0.75;
    if (spamRisk) notes.push('Spam risk');

    const passed =
      bannedOpeners.length === 0 &&
      checks.bannedPhrasesHit.length === 0 &&
      !spamRisk &&
      q.uniqueness >= UNIQUENESS_THRESHOLD;

    return {
      passed,
      uniqueness: q.uniqueness,
      readability: q.readability,
      engagement: q.engagement,
      brandAlignment: q.brandAlignment,
      localRelevance: q.localRelevance,
      aiSearch: q.aiSearch,
      bannedPhrases: checks.bannedPhrasesHit,
      bannedOpeners,
      keywordStuffing: checks.keywordStuffing,
      duplicateStructure,
      repetitive,
      spamRisk,
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
