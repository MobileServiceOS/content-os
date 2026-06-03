// Media provider layer. Pages resolve providers per business; image is mock
// (SVG) until a business sets brand.imageProvider='openai'. Video is mock-only.
import type { ImageProvider, VideoProvider } from '../../types/media';
import type { BrandSettings } from '../../types/models';
import { mockImageProvider } from './mockImageProvider';
import { mockVideoProvider } from './mockVideoProvider';

export { mockImageProvider, MockImageProvider } from './mockImageProvider';
export { openaiImageProvider, OpenAIImageProvider } from './openaiImageProvider';
export { mockVideoProvider, MockVideoProvider } from './mockVideoProvider';
export { higgsfieldVideoProvider, HiggsfieldVideoProvider } from './higgsfieldVideoProvider';
export { placeholderSvgDataUrl } from './svg';

// Mock-only: the serverless generateImage/generateVideo functions were removed
// (no OpenAI/Higgsfield keys configured), so those providers are unwired. Images
// are placeholder SVGs; video is mock. The `_brand` arg is kept for signature
// stability (callers pass brand) and a future re-wire.
export function imageProviderFor(_brand: BrandSettings | null): ImageProvider {
  return mockImageProvider;
}

export function videoProviderFor(_brand: BrandSettings | null): VideoProvider {
  return mockVideoProvider;
}
