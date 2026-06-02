// Higgsfield video provider — calls the `generateVideo` Cloud Function (which
// brokers the Higgsfield platform API, keeping credentials server-side) and
// returns a rendered video URL.
import { callGenerateVideo, type VideoTransport } from './videoClient';
import { placeholderSvgDataUrl } from './svg';
import type { VideoProvider, VideoRequest, VideoOutput } from '../../types/media';
import type { BrandSettings } from '../../types/models';

const EST_COST_USD = 0.5; // rough per-clip estimate; refine with real billing

export class HiggsfieldVideoProvider implements VideoProvider {
  readonly name = 'higgsfield' as const;

  constructor(private transport: VideoTransport = callGenerateVideo) {}

  async generateVideo(req: VideoRequest, brand: BrandSettings, businessId: string): Promise<VideoOutput> {
    const t0 = Date.now();
    const aspect = req.aspectRatio ?? '9:16';
    const res = await this.transport({ businessId, prompt: req.prompt, durationSeconds: req.durationSeconds, aspectRatio: aspect });
    const poster = res.posterUrl ?? placeholderSvgDataUrl(req.prompt, aspect, brand.businessName || 'Content OS', 'VIDEO');
    return {
      video: {
        posterDataUrl: poster,
        videoUrl: res.videoUrl,
        alt: req.prompt,
        durationSeconds: res.durationSeconds ?? req.durationSeconds,
        predictedViralScore: res.predictedViralScore,
      },
      cost: { provider: 'higgsfield', estimatedCostUsd: EST_COST_USD, generationTimeMs: Date.now() - t0 },
    };
  }
}

export const higgsfieldVideoProvider = new HiggsfieldVideoProvider();
