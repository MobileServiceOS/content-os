// Media provider layer. Pages resolve providers per business; image is mock
// (SVG) until a business sets brand.imageProvider='openai'. Video is mock-only.
import type { ImageProvider, VideoProvider } from '../../types/media';
import type { BrandSettings } from '../../types/models';
import { mockImageProvider } from './mockImageProvider';
import { openaiImageProvider } from './openaiImageProvider';
import { mockVideoProvider } from './mockVideoProvider';
import { higgsfieldVideoProvider } from './higgsfieldVideoProvider';

export { mockImageProvider, MockImageProvider } from './mockImageProvider';
export { openaiImageProvider, OpenAIImageProvider } from './openaiImageProvider';
export { mockVideoProvider, MockVideoProvider } from './mockVideoProvider';
export { higgsfieldVideoProvider, HiggsfieldVideoProvider } from './higgsfieldVideoProvider';
export { placeholderSvgDataUrl } from './svg';

export function imageProviderFor(brand: BrandSettings | null): ImageProvider {
  return brand?.imageProvider === 'openai' ? openaiImageProvider : mockImageProvider;
}

export function videoProviderFor(brand: BrandSettings | null): VideoProvider {
  return brand?.videoProvider === 'higgsfield' ? higgsfieldVideoProvider : mockVideoProvider;
}
