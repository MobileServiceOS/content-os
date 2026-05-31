// Shared helpers for the public generators: history-ready records + quality
// aggregation. Every generator returns its shaped output plus `records` for the
// hook layer to write into generationHistory.
import type { EngineResult } from './engine';
import type { GenerationType, QualityScore } from '../../types/generation';

export interface GeneratedRecord {
  type: GenerationType;
  generatorType: string;
  structureId: string;
  category?: string;
  text: string;
  uniquenessScore: number;
  brandScore: number;
  similarityScore: number;
  regenerationCount: number;
}

export function toRecord(generatorType: string, er: EngineResult): GeneratedRecord {
  return {
    type: er.block.type,
    generatorType,
    structureId: er.block.structureId,
    category: er.block.category,
    text: er.block.text,
    uniquenessScore: er.quality.uniqueness,
    brandScore: er.quality.brandAlignment,
    similarityScore: er.similarityScore,
    regenerationCount: er.regenerationCount,
  };
}

export function aggregateQuality(results: EngineResult[]): QualityScore {
  if (results.length === 0) {
    return { uniqueness: 0, readability: 0, brandAlignment: 0, engagement: 0, localRelevance: 0, overall: 0 };
  }
  const sum = results.reduce(
    (acc, r) => ({
      uniqueness: acc.uniqueness + r.quality.uniqueness,
      readability: acc.readability + r.quality.readability,
      brandAlignment: acc.brandAlignment + r.quality.brandAlignment,
      engagement: acc.engagement + r.quality.engagement,
      localRelevance: acc.localRelevance + r.quality.localRelevance,
      overall: acc.overall + r.quality.overall,
    }),
    { uniqueness: 0, readability: 0, brandAlignment: 0, engagement: 0, localRelevance: 0, overall: 0 },
  );
  const n = results.length;
  return {
    uniqueness: sum.uniqueness / n,
    readability: sum.readability / n,
    brandAlignment: sum.brandAlignment / n,
    engagement: sum.engagement / n,
    localRelevance: sum.localRelevance / n,
    overall: sum.overall / n,
  };
}
