// Transport to the `generateImage` Cloud Function. Injectable so the OpenAI image
// provider is testable without Firebase (lazy-imported in the default transport).
import type { AspectRatio } from '../../types/media';

export interface ImageGenerateArgs {
  businessId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  style?: string;
}

export interface ImageGenerateResponse {
  b64: string; // base64 PNG
  width: number;
  height: number;
}

export type ImageTransport = (args: ImageGenerateArgs) => Promise<ImageGenerateResponse>;

export const callGenerateImage: ImageTransport = async (args) => {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<ImageGenerateArgs, ImageGenerateResponse>(functions, 'generateImage');
  const res = await fn(args);
  return res.data;
};
