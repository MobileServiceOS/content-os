import { describe, it, expect } from 'vitest';
import {
  INTEGRATIONS, LIFECYCLE, liveStages, integrationsByStatus,
  canPublish, publishContent, IntegrationNotConfiguredError, notConfiguredPublisher,
} from './automation';

describe('integration registry', () => {
  it('covers the 7 future APIs + MSOS, all with a status', () => {
    const ids = INTEGRATIONS.map((i) => i.id);
    for (const id of ['msos_jobs', 'gbp', 'search_console', 'ga4', 'tiktok', 'instagram', 'facebook', 'youtube']) {
      expect(ids).toContain(id);
    }
    expect(INTEGRATIONS.every((i) => ['connected', 'disconnected', 'planned'].includes(i.status))).toBe(true);
  });
  it('MSOS Jobs is the only connected (live) integration', () => {
    expect(integrationsByStatus('connected').map((i) => i.id)).toEqual(['msos_jobs']);
  });
});

describe('content lifecycle', () => {
  it('generate/approve/schedule are live; publish/track/optimize are planned', () => {
    expect(liveStages()).toEqual(['generate', 'approve', 'schedule']);
    const planned = LIFECYCLE.filter((s) => !s.live).map((s) => s.stage);
    expect(planned).toEqual(['publish', 'track', 'optimize']);
  });
});

describe('publisher seam (inert)', () => {
  it('no platform can publish yet', () => {
    for (const i of INTEGRATIONS) expect(canPublish(i.id)).toBe(false);
  });
  it('publishContent refuses with a clear not-configured error', async () => {
    await expect(publishContent({ platform: 'tiktok', contentItemId: 'c1', text: 'hi' }))
      .rejects.toBeInstanceOf(IntegrationNotConfiguredError);
  });
  it('notConfiguredPublisher throws for its platform', async () => {
    await expect(notConfiguredPublisher('youtube').publish({ platform: 'youtube', contentItemId: 'c', text: 't' }))
      .rejects.toThrow(/not configured/i);
  });
});
