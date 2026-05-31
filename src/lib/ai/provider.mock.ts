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

/** Rotate across categories, then pick a non-avoided structure within. */
function pickStructure(
  structures: Structure[],
  avoid: string[],
  rotation: number,
): Structure {
  const cats = Array.from(new Set(structures.map((s) => s.category)));
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[(rotation + i) % cats.length];
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
