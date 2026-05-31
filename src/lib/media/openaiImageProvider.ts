// OpenAI image provider — calls the `generateImage` Cloud Function (which holds the
// key) and returns a base64 PNG as a data URL.
import { callGenerateImage, type ImageTransport } from './imageClient';
import { ASPECT_DIMENSIONS, type ImageProvider, type ImageRequest, type ImageOutput } from '../../types/media';
import type { BrandSettings } from '../../types/models';

const EST_COST_USD = 0.04; // rough per-image estimate; refine with real billing

export class OpenAIImageProvider implements ImageProvider {
  readonly name = 'openai' as const;

  constructor(private transport: ImageTransport = callGenerateImage) {}

  async generateImage(req: ImageRequest, _brand: BrandSettings, businessId: string): Promise<ImageOutput> {
    const t0 = Date.now();
    const aspect = req.aspectRatio ?? '1:1';
    const dims = ASPECT_DIMENSIONS[aspect];
    const res = await this.transport({ businessId, prompt: req.prompt, aspectRatio: aspect, style: req.style });
    return {
      image: {
        dataUrl: `data:image/png;base64,${res.b64}`,
        alt: req.prompt,
        width: res.width || dims.width,
        height: res.height || dims.height,
      },
      cost: { provider: 'openai', estimatedCostUsd: EST_COST_USD, generationTimeMs: Date.now() - t0 },
    };
  }
}

export const openaiImageProvider = new OpenAIImageProvider();
