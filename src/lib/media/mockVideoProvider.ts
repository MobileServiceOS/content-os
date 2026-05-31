// Mock video provider — returns a placeholder poster. Real (async-job) video
// generation is a follow-up; this proves the agent/provider architecture.
import { placeholderSvgDataUrl } from './svg';
import type { VideoProvider, VideoRequest, VideoOutput } from '../../types/media';
import type { BrandSettings } from '../../types/models';

export class MockVideoProvider implements VideoProvider {
  readonly name = 'mock' as const;

  async generateVideo(req: VideoRequest, brand: BrandSettings, _businessId?: string): Promise<VideoOutput> {
    const t0 = Date.now();
    const aspect = req.aspectRatio ?? '9:16';
    const poster = placeholderSvgDataUrl(req.prompt, aspect, brand.businessName || 'Content OS', 'VIDEO • MOCK');
    return {
      video: {
        posterDataUrl: poster,
        alt: req.prompt,
        durationSeconds: req.durationSeconds,
        note: 'Mock video — real generation is a follow-up (async job).',
      },
      cost: { provider: 'mock', estimatedCostUsd: 0, generationTimeMs: Date.now() - t0 },
    };
  }
}

export const mockVideoProvider = new MockVideoProvider();
