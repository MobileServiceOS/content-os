import { describe, it, expect } from 'vitest';
import { mockImageProvider, openaiImageProvider, mockVideoProvider, imageProviderFor } from './index';
import { OpenAIImageProvider } from './openaiImageProvider';
import type { ImageTransport } from './imageClient';
import type { BrandSettings } from '../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair', website: 'wheelrush.net', phone: '305-897-7030',
  serviceAreas: ['Miami-Dade'], services: ['Mobile tire repair'], notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'], ctas: ['Book now'], localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [], requiredPhrases: [], brandTone: 'helpful',
};

describe('mock image provider', () => {
  it('returns an inline SVG data URL with the requested dimensions', async () => {
    const out = await mockImageProvider.generateImage({ prompt: 'A tire tech at sunset', aspectRatio: '16:9' }, brand, 'b1');
    expect(out.image.dataUrl.startsWith('data:image/svg+xml')).toBe(true);
    expect(out.image.width).toBe(1920);
    expect(out.image.height).toBe(1080);
    expect(out.cost.provider).toBe('mock');
  });
});

describe('openai image provider', () => {
  it('wraps the function transport into a PNG data URL', async () => {
    const transport: ImageTransport = async () => ({ b64: 'AAAA', width: 1024, height: 1024 });
    const provider = new OpenAIImageProvider(transport);
    const out = await provider.generateImage({ prompt: 'A tire', aspectRatio: '1:1' }, brand, 'b1');
    expect(out.image.dataUrl).toBe('data:image/png;base64,AAAA');
    expect(out.cost.provider).toBe('openai');
  });
});

describe('mock video provider', () => {
  it('returns a poster + note', async () => {
    const out = await mockVideoProvider.generateVideo({ prompt: 'roadside fix', durationSeconds: 15 }, brand, 'b1');
    expect(out.video.posterDataUrl.startsWith('data:image/svg+xml')).toBe(true);
    expect(out.video.note).toMatch(/mock/i);
  });
});

describe('imageProviderFor', () => {
  it('always resolves to mock (external image/video providers were removed)', () => {
    expect(imageProviderFor(brand).name).toBe('mock');
    // A stored imageProvider='openai' stays mock — the generateImage function is gone.
    expect(imageProviderFor({ ...brand, imageProvider: 'openai' }).name).toBe('mock');
  });
  it('exposes the singleton', () => {
    expect(openaiImageProvider.name).toBe('openai');
  });
});
