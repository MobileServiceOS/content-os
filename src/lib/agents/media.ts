// Media agents (Phase 3). Wrap the image/video provider layer; they read the
// per-business provider at execute time, so the registry can hold singletons.
import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentResult } from './types';
import { imageProviderFor, videoProviderFor } from '../media';
import type { ImageRequest, ImageOutput, VideoRequest, VideoOutput } from '../../types/media';

export class ImageAgent extends BaseAgent<ImageRequest, ImageOutput> {
  readonly name = 'ImageAgent';
  protected async execute(input: ImageRequest, ctx: AgentContext): Promise<AgentResult<ImageOutput>> {
    this.step('generate', 'ok', 'image');
    const out = await imageProviderFor(ctx.brand).generateImage(input, ctx.brand, ctx.businessId);
    return this.result(out);
  }
}

export class ThumbnailAgent extends BaseAgent<ImageRequest, ImageOutput> {
  readonly name = 'ThumbnailAgent';
  protected async execute(input: ImageRequest, ctx: AgentContext): Promise<AgentResult<ImageOutput>> {
    const req: ImageRequest = {
      ...input,
      aspectRatio: input.aspectRatio ?? '16:9',
      style: [input.style, 'bold high-contrast thumbnail, punchy, space for large text']
        .filter(Boolean)
        .join(', '),
    };
    this.step('generate', 'ok', 'thumbnail');
    const out = await imageProviderFor(ctx.brand).generateImage(req, ctx.brand, ctx.businessId);
    return this.result(out);
  }
}

export class VideoAgent extends BaseAgent<VideoRequest, VideoOutput> {
  readonly name = 'VideoAgent';
  protected async execute(input: VideoRequest, ctx: AgentContext): Promise<AgentResult<VideoOutput>> {
    const provider = videoProviderFor(ctx.brand);
    this.step('generate', 'ok', `video (${provider.name})`);
    const out = await provider.generateVideo(input, ctx.brand, ctx.businessId);
    return this.result(out);
  }
}
