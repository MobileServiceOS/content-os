import { describe, it, expect } from 'vitest';
import { similarity, jaccard, maxSimilarity } from './similarity';
import { fingerprint } from './fingerprint';
import { hasBannedOpener, matchedOpeners } from './bannedOpeners';

describe('similarity', () => {
  it('scores identical text as 1', () => {
    expect(similarity('We come to you in Miami', 'We come to you in Miami')).toBeCloseTo(1, 5);
  });

  it('scores disjoint text near 0', () => {
    expect(similarity('mobile tire repair driveway', 'quarterly invoice spreadsheet logic')).toBeLessThan(0.1);
  });

  it('scores reworded-same-topic in the middle', () => {
    const s = similarity(
      'We come to you and fix the flat in your driveway',
      'We drive out and repair the flat right in your driveway',
    );
    expect(s).toBeGreaterThan(0.25);
    expect(s).toBeLessThan(0.95);
  });

  it('jaccard ignores stopwords and word order', () => {
    expect(jaccard('flat tire repair', 'repair tire flat')).toBeCloseTo(1, 5);
  });

  it('maxSimilarity finds the closest match', () => {
    const m = maxSimilarity('flat tire in Miami', [
      'totally unrelated text here',
      'flat tire in Miami today',
    ]);
    expect(m).toBeGreaterThan(0.5);
  });
});

describe('fingerprint', () => {
  it('is stable for identical text', () => {
    expect(fingerprint('Stuck with a flat in Miami?')).toBe(fingerprint('Stuck with a flat in Miami?'));
  });

  it('differs for clearly different text', () => {
    expect(fingerprint('Stuck with a flat in Miami?')).not.toBe(
      fingerprint('Our quarterly revenue projections look strong this year.'),
    );
  });

  it('is order-independent on distinctive tokens', () => {
    // Same distinctive tokens, reordered -> same fingerprint.
    expect(fingerprint('driveway flat repair Miami')).toBe(fingerprint('Miami repair flat driveway'));
  });
});

describe('banned openers', () => {
  it('flags the global banned openers', () => {
    expect(hasBannedOpener('Thank you for the kind words!')).toBe(true);
    expect(hasBannedOpener('Glad we could help you today.')).toBe(true);
    expect(hasBannedOpener('A customer in Miami called us.')).toBe(true);
    expect(hasBannedOpener('Wheel Rush completed a job today.')).toBe(true);
  });

  it('respects per-business extra banned openings', () => {
    expect(matchedOpeners('Hey there friend, welcome!', ['hey there'])).toContain('hey there');
  });

  it('passes clean openers', () => {
    expect(hasBannedOpener('Reviews like this make our day.')).toBe(false);
  });
});
