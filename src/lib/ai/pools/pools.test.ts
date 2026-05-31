import { describe, it, expect } from 'vitest';
import { HOOK_STRUCTURES } from './hooks';
import { CAPTION_STRUCTURES } from './captions';
import { REVIEW_STRUCTURES } from './reviewResponses';
import { SOCIAL_STRUCTURES } from './socialReplies';
import { byCategory } from './types';

const BANNED_OPENERS = [
  'thank you',
  'thanks for choosing us',
  'we appreciate your business',
  'glad we could help',
  'a customer in',
  'wheel rush completed',
];

const allIds = [
  ...HOOK_STRUCTURES,
  ...CAPTION_STRUCTURES,
  ...REVIEW_STRUCTURES,
  ...SOCIAL_STRUCTURES,
].map((s) => s.id);

describe('variation pools', () => {
  it('have globally unique structure ids', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('cover all 10 hook categories with >=4 structures each', () => {
    const byCat = byCategory(HOOK_STRUCTURES);
    expect(Object.keys(byCat)).toHaveLength(10);
    for (const cat of Object.keys(byCat)) {
      expect(byCat[cat].length).toBeGreaterThanOrEqual(4);
    }
  });

  it('cover all 10 caption frameworks with >=3 structures each', () => {
    const byCat = byCategory(CAPTION_STRUCTURES);
    expect(Object.keys(byCat)).toHaveLength(10);
    for (const cat of Object.keys(byCat)) {
      expect(byCat[cat].length).toBeGreaterThanOrEqual(3);
    }
  });

  it('never start a review response with a banned opener', () => {
    for (const s of REVIEW_STRUCTURES) {
      const start = s.template.toLowerCase();
      for (const banned of BANNED_OPENERS) {
        expect(start.startsWith(banned)).toBe(false);
      }
    }
  });
});
