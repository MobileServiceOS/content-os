// Template/rule-based generation provider for the MVP. Rotates across pool
// categories and structures (honoring avoidStructureIds) and substitutes brand-
// aware tokens. Deterministic given its inputs + internal rotation counter.
import type { GenerationProvider, ProviderRequest } from './types';
import type { GeneratedBlock } from '../../types/generation';
import type { BrandSettings } from '../../types/models';
import type { Structure } from './pools/types';
import { HOOK_STRUCTURES } from './pools/hooks';
import { CAPTION_STRUCTURES } from './pools/captions';
import { CTA_BANK } from './pools/ctas';
import { REVIEW_STRUCTURES } from './pools/reviewResponses';
import { SOCIAL_STRUCTURES } from './pools/socialReplies';
import { substitute } from './tokens';
import { activeWeight } from '../analytics/biasState';

/**
 * Category iteration order. Unbiased: the original round-robin (rotation offset)
 * — existing behavior is preserved exactly. Biased (Learning Engine on): favored
 * categories are repeated proportional to their weight so they surface more
 * often, while every category stays in the rotation to preserve variety.
 */
function categoryOrder(cats: (string | undefined)[], rotation: number): (string | undefined)[] {
  const weighted = cats.map((c) => ({ c, w: activeWeight(String(c)) }));
  const biased = weighted.some((x) => x.w !== 1);
  if (!biased) return cats.map((_, i) => cats[(rotation + i) % cats.length]);
  const bag: (string | undefined)[] = [];
  weighted.forEach(({ c, w }) => {
    const reps = Math.max(1, Math.round(w * 2)); // weight 1.5 -> 3 slots, 0.5 -> 1 slot
    for (let i = 0; i < reps; i++) bag.push(c);
  });
  // Rotate the bag, then de-dup to first appearance for the iteration order.
  const seen = new Set<string>();
  const order: (string | undefined)[] = [];
  for (let i = 0; i < bag.length; i++) {
    const c = bag[(rotation + i) % bag.length];
    const key = String(c);
    if (!seen.has(key)) { seen.add(key); order.push(c); }
  }
  return order;
}

/** Rotate across categories, then pick a non-avoided structure within. */
function pickStructure(
  structures: Structure[],
  avoid: string[],
  rotation: number,
): Structure {
  const cats = Array.from(new Set(structures.map((s) => s.category)));
  const order = categoryOrder(cats, rotation);
  for (const cat of order) {
    const inCat = structures.filter((s) => s.category === cat && !avoid.includes(s.id));
    if (inCat.length) return inCat[rotation % inCat.length];
  }
  const any = structures.filter((s) => !avoid.includes(s.id));
  return any[0] ?? structures[0];
}

export class MockProvider implements GenerationProvider {
  readonly name = 'mock';
  private rotation = 0;

  generateBlock(
    pr: ProviderRequest,
    brand: BrandSettings,
    avoidStructureIds: string[],
  ): GeneratedBlock {
    const rot = this.rotation++;
    const { type, req } = pr;

    if (type === 'cta') {
      const bank = brand.ctas?.length ? [...brand.ctas, ...CTA_BANK] : CTA_BANK;
      const avoidIdx = new Set(avoidStructureIds.map((id) => id.replace('cta-', '')));
      let idx = rot % bank.length;
      for (let i = 0; i < bank.length; i++) {
        const cand = (rot + i) % bank.length;
        if (!avoidIdx.has(String(cand))) {
          idx = cand;
          break;
        }
      }
      return { type, structureId: `cta-${idx}`, text: bank[idx], category: 'cta' };
    }

    let pool: Structure[];
    if (type === 'caption') pool = CAPTION_STRUCTURES;
    else if (type === 'review') pool = REVIEW_STRUCTURES.filter((s) => s.category === (pr.sentiment ?? 'positive'));
    else if (type === 'reply') pool = SOCIAL_STRUCTURES.filter((s) => s.category === (pr.intent ?? 'general'));
    else pool = HOOK_STRUCTURES; // 'hook' and 'script' (hook line) default

    const structure = pickStructure(pool, avoidStructureIds, rot);
    const text = substitute(structure.template, req, brand, rot);
    return { type, structureId: structure.id, text, category: String(structure.category) };
  }
}

export const mockProvider = new MockProvider();
