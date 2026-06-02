import { describe, it, expect } from 'vitest';
import { buildVideoScript, VIDEO_TYPES, DEFAULT_BRAND_PROFILE } from './avatarStudio';
import { VERTICALS } from '../verticals';

const ctx = {
  businessName: 'Wheel Rush',
  vertical: VERTICALS.tire,
  city: 'Hollywood',
  service: 'Mobile Tire Replacement',
  brand: DEFAULT_BRAND_PROFILE,
};

describe('buildVideoScript', () => {
  it('produces a complete script + 6 tool prompts for every video type', () => {
    for (const t of VIDEO_TYPES) {
      const s = buildVideoScript(t.id, ctx);
      expect(s.title).toBeTruthy();
      expect(s.script).toBeTruthy();
      expect(s.sceneDirections).toBeTruthy();
      expect(s.onScreenText.length).toBeGreaterThan(0);
      expect(s.cta).toMatch(/Hollywood/);
      for (const tool of ['heygen', 'elevenlabs', 'higgsfield', 'veo', 'runway', 'sora'] as const) {
        expect(s.toolPrompts[tool]).toBeTruthy();
      }
    }
  });

  it('embeds the business, city, and brand colors into video prompts', () => {
    const s = buildVideoScript('emergency', ctx);
    expect(s.toolPrompts.higgsfield).toMatch(/Hollywood/);
    expect(s.toolPrompts.higgsfield).toMatch(/Orange/);
    expect(s.toolPrompts.veo).toMatch(/Wheel Rush/);
  });

  it('ElevenLabs prompt is clean voiceover (no scene/brand directions)', () => {
    const s = buildVideoScript('avatar', ctx);
    expect(s.toolPrompts.elevenlabs).toBe(s.script);
    expect(s.toolPrompts.elevenlabs).not.toMatch(/9:16|palette/);
  });

  it('is vertical-aware (mechanic uses its label, not tires)', () => {
    const s = buildVideoScript('avatar', { ...ctx, vertical: VERTICALS.mechanic, service: 'Brake Repair' });
    expect(s.script).toMatch(/mobile mechanic/i);
  });
});
