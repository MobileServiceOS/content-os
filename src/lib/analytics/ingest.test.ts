import { describe, it, expect } from 'vitest';
import {
  parseNumber,
  parseCompletionRate,
  parsePostedAt,
  parsePlatform,
  parseHookCategory,
  parseCsv,
  parseMetricsCsv,
  normalizeMetricsRow,
} from './ingest';

describe('parseNumber', () => {
  it('strips commas, currency, and percent', () => {
    expect(parseNumber('1,200')).toBe(1200);
    expect(parseNumber('$4,150')).toBe(4150);
    expect(parseNumber('61%')).toBe(61);
  });
  it('expands K and M suffixes', () => {
    expect(parseNumber('120K')).toBe(120_000);
    expect(parseNumber('1.2M')).toBe(1_200_000);
  });
  it('is NaN-safe', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('n/a')).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
    expect(parseNumber(42)).toBe(42);
  });
});

describe('parseCompletionRate', () => {
  it('normalizes percentages and fractions to 0..1', () => {
    expect(parseCompletionRate('61%')).toBeCloseTo(0.61, 5);
    expect(parseCompletionRate('61')).toBeCloseTo(0.61, 5);
    expect(parseCompletionRate('0.61')).toBeCloseTo(0.61, 5);
  });
  it('clamps to [0,1]', () => {
    expect(parseCompletionRate('150')).toBe(1);
    expect(parseCompletionRate('-5')).toBe(0);
  });
});

describe('parsePostedAt', () => {
  it('parses ISO dates', () => {
    expect(parsePostedAt('2026-05-20T18:00:00Z')).toBe(Date.parse('2026-05-20T18:00:00Z'));
  });
  it('treats large integers as epoch ms and small as seconds', () => {
    expect(parsePostedAt(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(parsePostedAt(1_700_000_000)).toBe(1_700_000_000_000);
    expect(parsePostedAt('1700000000000')).toBe(1_700_000_000_000);
  });
  it('returns undefined for junk or empty', () => {
    expect(parsePostedAt('')).toBeUndefined();
    expect(parsePostedAt('not a date')).toBeUndefined();
  });
});

describe('parsePlatform', () => {
  it('maps native names and aliases', () => {
    expect(parsePlatform('TikTok')).toBe('tiktok');
    expect(parsePlatform('IG Reels')).toBe('instagram');
    expect(parsePlatform('YouTube Shorts')).toBe('youtube_shorts');
    expect(parsePlatform('FB')).toBe('facebook');
    expect(parsePlatform('Google Business Profile')).toBe('gbp');
  });
  it('returns undefined for unknown', () => {
    expect(parsePlatform('Snapchat')).toBeUndefined();
    expect(parsePlatform('')).toBeUndefined();
  });
});

describe('parseHookCategory', () => {
  it('maps spaced and snake forms', () => {
    expect(parseHookCategory('cost savings')).toBe('cost_savings');
    expect(parseHookCategory('customer_story')).toBe('customer_story');
    expect(parseHookCategory('Emergency')).toBe('emergency');
  });
  it('returns undefined for unknown', () => {
    expect(parseHookCategory('clickbait')).toBeUndefined();
  });
});

describe('parseCsv', () => {
  it('handles quoted fields with commas and escaped quotes', () => {
    const rows = parseCsv('a,b\n"hello, world","she said ""hi"""');
    expect(rows).toEqual([
      ['a', 'b'],
      ['hello, world', 'she said "hi"'],
    ]);
  });
  it('drops fully blank lines', () => {
    expect(parseCsv('a\n\n1\n')).toEqual([['a'], ['1']]);
  });
});

describe('normalizeMetricsRow', () => {
  it('maps canonical headers to metrics and dimensions', () => {
    const row = normalizeMetricsRow({
      platform: 'tiktok',
      'hook category': 'cost savings',
      service: 'Tire Repair',
      city: 'Hollywood',
      views: '120000',
      'completion rate': '61%',
      calls: '7',
      'revenue usd': '$1,200',
    });
    expect(row.platform).toBe('tiktok');
    expect(row.dimensions.hookCategory).toBe('cost_savings');
    expect(row.dimensions.service).toBe('Tire Repair');
    expect(row.metrics.views).toBe(120000);
    expect(row.metrics.completionRate).toBeCloseTo(0.61, 5);
    expect(row.metrics.calls).toBe(7);
    expect(row.metrics.revenueUsd).toBe(1200);
  });
  it('defaults unmentioned metrics to 0', () => {
    const row = normalizeMetricsRow({ views: '10' });
    expect(row.metrics.leads).toBe(0);
    expect(row.metrics.jobs).toBe(0);
  });
});

describe('parseMetricsCsv', () => {
  it('aliases native TikTok export headers and reports unmapped columns', () => {
    const csv = [
      'Platform,Video views,Shares,Saved,Average watch percentage,Mystery Column',
      'TikTok,"48,000",900,120,55%,ignore-me',
    ].join('\n');
    const res = parseMetricsCsv(csv);
    expect(res.rows).toHaveLength(1);
    const r = res.rows[0];
    expect(r.platform).toBe('tiktok');
    expect(r.metrics.views).toBe(48000);
    expect(r.metrics.shares).toBe(900);
    expect(r.metrics.saves).toBe(120);
    expect(r.metrics.completionRate).toBeCloseTo(0.55, 5);
    expect(res.unmappedColumns).toContain('Mystery Column');
    expect(res.recognizedColumns).toContain('Video views');
  });
  it('returns empty result for header-only or empty input', () => {
    expect(parseMetricsCsv('').rows).toHaveLength(0);
    expect(parseMetricsCsv('views,calls').rows).toHaveLength(0);
  });
});
