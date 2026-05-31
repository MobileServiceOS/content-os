// Placeholder media agents for future image/video workflows. Interfaces are
// defined now so callers and the registry can be typed; execute() throws until a
// real backend (and likely a serverless step) is wired up. NO implementation yet.
import { BaseAgent } from './BaseAgent';
import { NotImplementedError } from './types';
import type { AgentContext, AgentResult } from './types';
import type { Platform } from '../../types/generation';

export interface ImageRequest {
  prompt: string;
  style?: string;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  platform?: Platform;
}

export interface ImageResult {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface VideoRequest {
  script: string;
  durationSeconds: number;
  style?: string;
  platform?: Platform;
}

export interface VideoResult {
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

export class ImageAgent extends BaseAgent<ImageRequest, ImageResult> {
  readonly name = 'ImageAgent';
  protected async execute(_input: ImageRequest, _ctx: AgentContext): Promise<AgentResult<ImageResult>> {
    throw new NotImplementedError(this.name);
  }
}

export class VideoAgent extends BaseAgent<VideoRequest, VideoResult> {
  readonly name = 'VideoAgent';
  protected async execute(_input: VideoRequest, _ctx: AgentContext): Promise<AgentResult<VideoResult>> {
    throw new NotImplementedError(this.name);
  }
}
