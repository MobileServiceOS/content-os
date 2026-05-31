// Level 3 agents: GBP, Local SEO, Photo. Thin wrappers over the Level 3
// generators (which run through the shared gate). Recents are passed in via input
// since GBP/SEO/photo track uniqueness against their own collections.
import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentResult } from './types';
import {
  runGbp, runSeo, runPhoto,
  type GbpRequest, type SeoRequest, type PhotoRequest,
  type GbpResult, type SeoResult, type PhotoResult, type L3Output,
} from '../ai/level3';

export interface GbpInput { req: GbpRequest; recent?: string[] }
export interface SeoInput { req: SeoRequest; recent?: string[] }
export interface PhotoInput { req: PhotoRequest; recent?: string[] }

export class GBPAgent extends BaseAgent<GbpInput, L3Output<GbpResult>> {
  readonly name = 'GBPAgent';
  protected async execute(input: GbpInput, ctx: AgentContext): Promise<AgentResult<L3Output<GbpResult>>> {
    this.step('generate', 'ok', 'gbp');
    return this.result(await runGbp(ctx.brand, ctx.businessId, input.req, input.recent ?? []));
  }
}

export class LocalSeoAgent extends BaseAgent<SeoInput, L3Output<SeoResult>> {
  readonly name = 'LocalSeoAgent';
  protected async execute(input: SeoInput, ctx: AgentContext): Promise<AgentResult<L3Output<SeoResult>>> {
    this.step('generate', 'ok', `seo:${input.req.type}`);
    return this.result(await runSeo(ctx.brand, ctx.businessId, input.req, input.recent ?? []));
  }
}

export class PhotoAgent extends BaseAgent<PhotoInput, L3Output<PhotoResult>> {
  readonly name = 'PhotoAgent';
  protected async execute(input: PhotoInput, ctx: AgentContext): Promise<AgentResult<L3Output<PhotoResult>>> {
    this.step('generate', 'ok', 'photo');
    return this.result(await runPhoto(ctx.brand, ctx.businessId, input.req, input.recent ?? []));
  }
}
