// Transport to the `generateVideo` Cloud Function. Injectable so the MCP video
// provider is testable without Firebase (lazy-imported in the default transport).
import type { AspectRatio } from '../../types/media';

export interface VideoGenerateArgs {
  businessId: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
}

export interface VideoGenerateResponse {
  videoUrl: string;
  posterUrl?: string;
  durationSeconds?: number;
  predictedViralScore?: number; // 0..1 from the virality predictor, when available
}

export type VideoTransport = (args: VideoGenerateArgs) => Promise<VideoGenerateResponse>;

export const callGenerateVideo: VideoTransport = async (args) => {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import('firebase/functions'),
    import('../firebase/client'),
  ]);
  const fn = httpsCallable<VideoGenerateArgs, VideoGenerateResponse>(functions, 'generateVideo');
  const res = await fn(args);
  return res.data;
};
