// Per-platform content rules for the multi-platform distribution engine.
import { PLATFORM_LABELS, type Platform } from '../types/generation';

export interface PlatformRule {
  label: string;
  guidance: string;
}

export const PLATFORM_RULES: Record<Platform, PlatformRule> = {
  tiktok: { label: PLATFORM_LABELS.tiktok, guidance: 'Strong hook, fast pacing, engagement-focused.' },
  instagram: { label: PLATFORM_LABELS.instagram, guidance: 'Storytelling, visual-first.' },
  facebook: { label: PLATFORM_LABELS.facebook, guidance: 'Community-focused, more detail.' },
  youtube_shorts: { label: PLATFORM_LABELS.youtube_shorts, guidance: 'Search-friendly; works as a title + description angle.' },
  x: { label: PLATFORM_LABELS.x, guidance: 'Short and conversational.' },
  linkedin: { label: PLATFORM_LABELS.linkedin, guidance: 'Business angle, professional tone.' },
};

/** The 6 distribution platforms, in display order. */
export const DISTRIBUTION_PLATFORMS: Platform[] = [
  'tiktok',
  'instagram',
  'facebook',
  'youtube_shorts',
  'x',
  'linkedin',
];
