// CRUD + live subscription for post performance, plus metric recording, CSV
// import (upsert by external id / url), and linking a published content item
// into a performance row (copying dimensions at publish time).
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { postPerformanceCol, postPerformanceDoc } from '../lib/firebase/paths';
import { withAudit, touch, now } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { computeScores, median } from '../lib/analytics/scores';
import { timeBucket, EMPTY_METRICS } from '../types/analytics';
import type {
  PostPerformance,
  PostMetrics,
  PostPlatform,
  MetricsSource,
} from '../types/analytics';
import type { ContentItem } from '../types/models';
import type { NormalizedRow } from '../lib/analytics/ingest';

export type NewPostPerformance = Omit<
  PostPerformance,
  'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

/** Deep-strip undefined values (Firestore rejects them). */
function clean<T>(o: T): T {
  if (Array.isArray(o)) return o.map(clean) as unknown as T;
  if (o && typeof o === 'object') {
    return Object.fromEntries(
      Object.entries(o as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, clean(v)]),
    ) as T;
  }
  return o;
}

export function usePostPerformance() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [items, setItems] = useState<PostPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(postPerformanceCol(businessId), orderBy('postedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostPerformance, 'id'>) })));
      setLoading(false);
    });
  }, [businessId]);

  /** Trailing median views for a platform (viral-score baseline). */
  function baselineFor(platform: PostPlatform): number {
    return median(items.filter((i) => i.platform === platform && i.metrics.views > 0).map((i) => i.metrics.views));
  }

  async function create(data: NewPostPerformance): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const ref = await addDoc(postPerformanceCol(businessId), withAudit(businessId, user.uid, clean(data)));
    return ref.id;
  }

  /** Update an existing row's metrics and recompute scores. */
  async function recordMetrics(id: string, metrics: PostMetrics, source: MetricsSource = 'manual'): Promise<void> {
    if (!businessId) return;
    const row = items.find((i) => i.id === id);
    const scores = computeScores({
      metrics,
      baselineViews: baselineFor(row?.platform ?? 'tiktok'),
      videoLengthSec: row?.videoLengthSec,
      textScores: { seo: row?.scores.seoScore, gbp: row?.scores.gbpScore, local: row?.scores.localRelevanceScore },
    });
    await updateDoc(
      postPerformanceDoc(businessId, id),
      touch(clean({ metrics, scores: stripCalibrating(scores), source, lastMetricsAt: now() })),
    );
  }

  /** Create a performance row from a published content item (dimensions copied). */
  async function linkFromContentItem(
    item: ContentItem,
    opts: { platform: PostPlatform; postUrl?: string; postedAt?: number; videoLengthSec?: number },
  ): Promise<string> {
    const postedAt = opts.postedAt ?? now();
    const metrics = { ...EMPTY_METRICS };
    const scores = computeScores({ metrics, baselineViews: baselineFor(opts.platform), videoLengthSec: opts.videoLengthSec });
    return create({
      contentItemId: item.id,
      assetId: item.assetId,
      platform: opts.platform,
      postUrl: opts.postUrl,
      postedAt,
      timeBucket: timeBucket(postedAt),
      hookCategory: item.hookCategory as PostPerformance['hookCategory'],
      captionFramework: item.captionFramework as PostPerformance['captionFramework'],
      service: item.service || undefined,
      city: item.city || undefined,
      videoLengthSec: opts.videoLengthSec ?? item.videoLengthSec,
      metrics,
      scores: stripCalibrating(scores),
      source: 'manual',
    });
  }

  /**
   * Upsert normalized CSV rows. Matches existing rows by externalPostId, then
   * postUrl; otherwise creates a new row. Returns counts.
   */
  async function importRows(rows: NormalizedRow[]): Promise<{ created: number; updated: number; skipped: number }> {
    if (!businessId || !user) throw new Error('No active business');
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const row of rows) {
      if (!row.platform) { skipped++; continue; }
      const match = items.find(
        (i) =>
          (row.externalPostId && i.externalPostId === row.externalPostId) ||
          (row.postUrl && i.postUrl === row.postUrl),
      );
      if (match) {
        await recordMetrics(match.id, row.metrics, 'csv');
        updated++;
      } else {
        const postedAt = row.postedAt ?? now();
        const scores = computeScores({
          metrics: row.metrics,
          baselineViews: baselineFor(row.platform),
          videoLengthSec: row.dimensions.videoLengthSec,
        });
        await create({
          contentItemId: null,
          platform: row.platform,
          externalPostId: row.externalPostId,
          postUrl: row.postUrl,
          postedAt,
          timeBucket: timeBucket(postedAt),
          hookCategory: row.dimensions.hookCategory,
          service: row.dimensions.service,
          vehicle: row.dimensions.vehicle,
          tireSize: row.dimensions.tireSize,
          city: row.dimensions.city,
          videoLengthSec: row.dimensions.videoLengthSec,
          metrics: row.metrics,
          scores: stripCalibrating(scores),
          source: 'csv',
          lastMetricsAt: now(),
        });
        created++;
      }
    }
    return { created, updated, skipped };
  }

  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(postPerformanceDoc(businessId, id));
  }

  return { items, loading, create, recordMetrics, linkFromContentItem, importRows, remove };
}

/** Drop the transient `calibrating` flag before persisting scores. */
function stripCalibrating(s: ReturnType<typeof computeScores>) {
  const { calibrating, ...scores } = s;
  void calibrating;
  return scores;
}
