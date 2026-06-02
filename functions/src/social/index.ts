// Social platform registry. Add Instagram/Facebook/YouTube here later — a
// connector + its secrets is all it takes; the endpoints, OAuth, storage, and
// the entire client/UI are already shared.
import type { PlatformConnector } from './framework';
import { tiktok } from './tiktok';

export const CONNECTORS: Record<string, PlatformConnector> = {
  tiktok,
  // instagram, facebook, youtube — add connectors here.
};

export function connectorFor(platform: string): PlatformConnector | null {
  return CONNECTORS[platform] ?? null;
}

export * from './framework';
