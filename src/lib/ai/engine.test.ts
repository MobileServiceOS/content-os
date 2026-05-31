import { describe, it, expect } from 'vitest';
import { generateBlock, resolveConfig } from './engine';
import { MockProvider } from './provider.mock';
import type { GenerationProvider, ProviderRequest } from './types';
import type { GeneratedBlock } from '../../types/generation';
import type { BrandSettings } from '../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair',
  website: 'wheelrush.net',
  phone: '305-897-7030',
  serviceAreas: ['Miami-Dade', 'Broward'],
  services: ['Mobile tire repair'],
  notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'],
  ctas: ['Book now at wheelrush.net'],
  localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [],
  requiredPhrases: [],
  brandTone: 'helpful',
};

/** Deterministic provider returning a scripted sequence of outputs. */
class StubProvider implements GenerationProvider {
  readonly name = 'stub';
  private i = 0;
  constructor(private outputs: Array<{ id: string; text: string }>) {}
  generateBlock(_pr: ProviderRequest, _b: BrandSettings, _avoid: string[]): GeneratedBlock {
    const o = this.outputs[Math.min(this.i, this.outputs.length - 1)];
    this.i++;
    return { type: 'hook', structureId: o.id, text: o.text };
  }
}

const hook = (): ProviderRequest => ({ type: 'hook', req: { platform: 'instagram' } });

describe('resolveConfig', () => {
  it('merges per-business config over defaults', () => {
    const cfg = resolveConfig({
      ...brand,
      uniqueness: { similarityThreshold: 0.4, maxRegenerationAttempts: 9, bannedOpenings: ['yo'] },
    });
    expect(cfg.similarityThreshold).toBe(0.4);
    expect(cfg.maxRegenerationAttempts).toBe(9);
  });

  it('uses defaults when unset', () => {
    expect(resolveConfig(brand).similarityThreshold).toBe(0.6);
    expect(resolveConfig(brand).maxRegenerationAttempts).toBe(5);
  });
});

describe('engine regenerate-on-collision', () => {
  it('skips colliding candidates and returns a unique one, counting regenerations', () => {
    const dup = 'We come to you for a fast flat tire fix in Miami';
    const fresh = 'Three signs your truck needs a tire looked at soon';
    const provider = new StubProvider([
      { id: 's1', text: dup },
      { id: 's2', text: dup },
      { id: 's3', text: fresh },
    ]);
    const res = generateBlock(provider, hook(), brand, [dup]);
    expect(res.block.text).toBe(fresh);
    expect(res.regenerationCount).toBe(2);
    expect(res.similarityScore).toBeLessThan(0.6);
  });

  it('never returns a banned opener; picks the clean candidate instead', () => {
    const provider = new StubProvider([
      { id: 'b1', text: 'Thank you for stopping by our page today.' },
      { id: 'c1', text: 'Stuck on the shoulder in Miami? Stay in the car.' },
    ]);
    const res = generateBlock(provider, hook(), brand, []);
    expect(res.block.text).not.toMatch(/^thank you/i);
    expect(res.block.structureId).toBe('c1');
  });

  it('returns the best (lowest-similarity) candidate when all collide', () => {
    const recent = ['flat tire fix in Miami driveway today right now'];
    const provider = new StubProvider([
      { id: 'h1', text: 'flat tire fix in Miami driveway today right now' },
      { id: 'h2', text: 'flat tire fix in Miami driveway today' },
      { id: 'h3', text: 'flat tire fix in Miami' },
    ]);
    const res = generateBlock(provider, hook(), brand, recent);
    expect(res.block.structureId).toBe('h3');
    expect(res.regenerationCount).toBeGreaterThanOrEqual(1);
  });

  it('honors maxRegenerationAttempts=1 (no regeneration)', () => {
    const b1: BrandSettings = {
      ...brand,
      uniqueness: { similarityThreshold: 0.6, maxRegenerationAttempts: 1, bannedOpenings: [] },
    };
    const provider = new StubProvider([
      { id: 'x1', text: 'flat tire fix in Miami driveway today' },
      { id: 'x2', text: 'a totally different unique sentence here' },
    ]);
    const res = generateBlock(provider, hook(), b1, ['flat tire fix in Miami driveway today']);
    expect(res.regenerationCount).toBe(0);
    expect(res.block.structureId).toBe('x1');
  });
});

describe('mock provider variety (example uniqueness results)', () => {
  it('produces mostly-distinct hooks across 20 generations', () => {
    const provider = new MockProvider();
    const recent: string[] = [];
    const sims: number[] = [];
    for (let i = 0; i < 20; i++) {
      const res = generateBlock(provider, { type: 'hook', req: { platform: 'instagram' } }, brand, recent);
      sims.push(res.similarityScore);
      recent.push(res.block.text);
    }
    const distinct = new Set(recent).size;
    expect(distinct).toBeGreaterThanOrEqual(15);
    const avg = sims.reduce((a, b) => a + b, 0) / sims.length;
    expect(avg).toBeLessThan(0.5);
  });
});
