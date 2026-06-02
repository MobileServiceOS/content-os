import { describe, it, expect } from 'vitest';
import { buildSampleDataset, sampleDataset, CITIES, SERVICES, SAMPLE_NOW } from './sampleData';

describe('sample dataset', () => {
  it('is deterministic across builds', () => {
    const a = buildSampleDataset();
    const b = buildSampleDataset();
    expect(a.posts.map((p) => p.id + p.metrics.views)).toEqual(b.posts.map((p) => p.id + p.metrics.views));
    expect(a.jobs.map((j) => j.ticketUsd)).toEqual(b.jobs.map((j) => j.ticketUsd));
  });

  it('memoizes the singleton', () => {
    expect(sampleDataset()).toBe(sampleDataset());
  });

  it('has full coverage so every view is non-empty', () => {
    const ds = sampleDataset();
    expect(ds.posts.length).toBeGreaterThan(20);
    expect(ds.jobs.length).toBeGreaterThan(20);
    expect(ds.reviews.length).toBeGreaterThan(10);
    expect(ds.seo.length).toBeGreaterThan(10);
    // posts span multiple platforms and all the dimensions analyzers need
    expect(new Set(ds.posts.map((p) => p.platform)).size).toBeGreaterThanOrEqual(4);
    expect(ds.posts.every((p) => p.hookCategory && p.city && p.service)).toBe(true);
  });

  it('uses only real Wheel Rush cities and services', () => {
    const ds = sampleDataset();
    expect(ds.jobs.every((j) => CITIES.includes(j.city))).toBe(true);
    expect(ds.jobs.every((j) => SERVICES.includes(j.service))).toBe(true);
  });

  it('keeps posts inside the reported 30-day range', () => {
    const ds = sampleDataset();
    expect(ds.range.end).toBe(SAMPLE_NOW);
    expect(ds.posts.every((p) => p.postedAt <= ds.range.end && p.postedAt >= ds.range.start)).toBe(true);
  });

  it('computes real 0..1 scores on every post', () => {
    const ds = sampleDataset();
    expect(ds.posts.every((p) => p.scores.viralScore >= 0 && p.scores.viralScore <= 1)).toBe(true);
  });
});
