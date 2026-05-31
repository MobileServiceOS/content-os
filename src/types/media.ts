// Media generation contracts (Phase 3). Mirrors the text provider layering.
import type { BrandSettings } from './models';

export type ImageProviderName = 'mock' | 'openai';
export type VideoProviderName = 'mock';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';
export type MediaKind = 'image' | 'thumbnail' | 'video';

export interface ImageRequest {
  prompt: string;
  style?: string;
  aspectRatio?: AspectRatio;
  /** Optional content item the image illustrates. */
  sourceContentId?: string;
}

export interface GeneratedImage {
  dataUrl: string; // data: URL (mock SVG or base64 PNG)
  alt: string;
  width: number;
  height: number;
}

export interface MediaCost {
  provider: string;
  estimatedCostUsd: number;
  generationTimeMs: number;
}

export interface ImageOutput {
  image: GeneratedImage;
  cost: MediaCost;
}

export interface VideoRequest {
  prompt: string;
  durationSeconds: number;
  aspectRatio?: AspectRatio;
}

export interface GeneratedVideo {
  posterDataUrl: string; // placeholder poster for the mock provider
  alt: string;
  durationSeconds: number;
  note?: string; // e.g. "mock — real video generation is a follow-up"
}

export interface VideoOutput {
  video: GeneratedVideo;
  cost: MediaCost;
}

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};

export const ASPECT_LABELS: Record<AspectRatio, string> = {
  '1:1': 'Square (1:1)',
  '4:5': 'Portrait (4:5)',
  '9:16': 'Vertical (9:16)',
  '16:9': 'Landscape (16:9)',
};

export interface ImageProvider {
  readonly name: ImageProviderName;
  generateImage(req: ImageRequest, brand: BrandSettings, businessId: string): Promise<ImageOutput>;
}

export interface VideoProvider {
  readonly name: VideoProviderName;
  generateVideo(req: VideoRequest, brand: BrandSettings, businessId: string): Promise<VideoOutput>;
}
