// Mock image provider — returns a self-contained SVG placeholder. Default until a
// business configures a real image provider. Zero external dependencies.
import { placeholderSvgDataUrl } from './svg';
import { ASPECT_DIMENSIONS, type ImageProvider, type ImageRequest, type ImageOutput } from '../../types/media';
import type { BrandSettings } from '../../types/models';

export class MockImageProvider implements ImageProvider {
  readonly name = 'mock' as const;

  async generateImage(req: ImageRequest, brand: BrandSettings, _businessId?: string): Promise<ImageOutput> {
    const t0 = Date.now();
    const aspect = req.aspectRatio ?? '1:1';
    const dims = ASPECT_DIMENSIONS[aspect];
    const dataUrl = placeholderSvgDataUrl(req.prompt, aspect, brand.businessName || 'Content OS', 'PREVIEW');
    return {
      image: { dataUrl, alt: req.prompt, width: dims.width, height: dims.height },
      cost: { provider: 'mock', estimatedCostUsd: 0, generationTimeMs: Date.now() - t0 },
    };
  }
}

export const mockImageProvider = new MockImageProvider();
