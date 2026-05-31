// Single-Source Content Engine: turn one completed job into one Master Content
// Asset, then derive a platform-specific generation request for each platform.
import type { GenerationRequest, Platform, HookCategory } from '../../types/generation';
import type { MasterContentAsset } from '../../types/level3';
import type { BrandSettings } from '../../types/models';
import { PLATFORM_RULES } from '../platforms';

export interface JobInput {
  service: string;
  city: string;
  vehicle?: string;
  tireSize?: string;
  timeOfDay?: string;
  responseTime?: string;
  completionTime?: string;
  notes?: string;
  photoRefs?: string[];
}

export type AssetDraft = Omit<
  MasterContentAsset,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

const ANGLES = ['convenience', 'time savings', 'cost savings', 'emergency response', 'education'];
const HOOK_CYCLE: HookCategory[] = ['emergency', 'convenience', 'time_savings', 'customer_story', 'educational'];

/** Derive the single Master Content Asset from a completed job. Deterministic. */
export function buildMasterAsset(job: JobInput, _brand: BrandSettings): AssetDraft {
  const entityData = [job.vehicle, job.tireSize, job.city, job.service].filter(Boolean) as string[];
  const seed = (job.service.length + (job.city?.length ?? 0) + (job.vehicle?.length ?? 0));
  const idx = seed % HOOK_CYCLE.length;
  const story = [
    `${job.service}`,
    job.city ? ` in ${job.city}` : '',
    job.vehicle ? ` on a ${job.vehicle}` : '',
    job.responseTime ? `, on-site within ${job.responseTime}` : '',
    job.completionTime ? `, done in about ${job.completionTime}` : '',
    '.',
  ].join('');
  return {
    service: job.service,
    vehicle: job.vehicle ?? '',
    tireSize: job.tireSize ?? '',
    city: job.city ?? '',
    timeOfDay: job.timeOfDay,
    responseTime: job.responseTime,
    completionTime: job.completionTime,
    notes: job.notes,
    story,
    contentAngle: ANGLES[idx % ANGLES.length],
    hookCategory: HOOK_CYCLE[idx],
    entityData,
    photoRefs: job.photoRefs ?? [],
    status: 'draft',
  };
}

/** Build the platform-specific generation request from the master asset. */
export function requestForPlatform(asset: AssetDraft, platform: Platform): GenerationRequest {
  const rule = PLATFORM_RULES[platform];
  const notes = [
    asset.notes,
    `Platform style: ${rule.guidance}`,
    `Angle: ${asset.contentAngle}.`,
    `Story: ${asset.story}`,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    platform,
    service: asset.service,
    city: asset.city,
    vehicle: asset.vehicle || undefined,
    tireSize: asset.tireSize || undefined,
    timeOfDay: asset.timeOfDay,
    responseTime: asset.responseTime,
    completionTime: asset.completionTime,
    notes,
  };
}
