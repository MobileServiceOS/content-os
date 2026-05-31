import { describe, it, expect } from 'vitest';
import { buildMasterAsset, requestForPlatform } from './assetDistributor';
import { DISTRIBUTION_PLATFORMS } from '../platforms';
import type { BrandSettings } from '../../types/models';

const brand: BrandSettings = {
  businessName: 'Wheel Rush Mobile Tire Repair', website: 'wheelrush.net', phone: '305-897-7030',
  serviceAreas: ['Miami-Dade'], services: ['Mobile tire repair'], notOffered: ['Rim repair'],
  socialHandles: ['@wheelrushllc'], ctas: ['Book now'], localKeywords: ['mobile tire repair Miami'],
  bannedPhrases: [], requiredPhrases: [], brandTone: 'helpful',
};

const job = { service: 'flat tire repair', city: 'Miami', vehicle: 'Tesla Model 3', tireSize: '235/45R18', responseTime: '25 minutes', completionTime: '30 minutes', notes: 'highway shoulder' };

describe('buildMasterAsset', () => {
  it('derives entities, a story, an angle, and a hook category', () => {
    const a = buildMasterAsset(job, brand);
    expect(a.entityData).toContain('Tesla Model 3');
    expect(a.entityData).toContain('235/45R18');
    expect(a.entityData).toContain('Miami');
    expect(a.story).toContain('flat tire repair');
    expect(a.story).toContain('30 minutes');
    expect(a.contentAngle).toBeTruthy();
    expect(a.hookCategory).toBeTruthy();
    expect(a.status).toBe('draft');
  });

  it('is deterministic', () => {
    expect(buildMasterAsset(job, brand)).toEqual(buildMasterAsset(job, brand));
  });
});

describe('requestForPlatform', () => {
  it('builds a request per platform carrying the platform rule + story', () => {
    const a = buildMasterAsset(job, brand);
    for (const p of DISTRIBUTION_PLATFORMS) {
      const req = requestForPlatform(a, p);
      expect(req.platform).toBe(p);
      expect(req.service).toBe('flat tire repair');
      expect(req.notes).toContain('Platform style');
      expect(req.notes).toContain('Story:');
    }
  });
});
