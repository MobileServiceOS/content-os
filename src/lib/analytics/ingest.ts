// Pure ingestion layer for post performance. Manual entry and CSV import both
// funnel through here, and a future platform-API sync would too — so metric
// normalization lives in one tested place. No Firestore, no React.
import type { HookCategory } from '../../types/generation';
import type { PostMetrics, PostPlatform } from '../../types/analytics';
import { EMPTY_METRICS } from '../../types/analytics';

/** A CSV row (or manual form) normalized into a PostPerformance patch. */
export interface NormalizedRow {
  platform?: PostPlatform;
  postUrl?: string;
  externalPostId?: string;
  postedAt?: number; // epoch ms
  dimensions: {
    hookCategory?: HookCategory;
    service?: string;
    vehicle?: string;
    tireSize?: string;
    city?: string;
    videoLengthSec?: number;
  };
  metrics: PostMetrics;
}

export interface CsvParseResult {
  rows: NormalizedRow[];
  recognizedColumns: string[]; // original headers we mapped to a field
  unmappedColumns: string[]; // original headers we ignored (surfaced in UI)
}

const HOOK_CATEGORIES: HookCategory[] = [
  'curiosity',
  'shock',
  'mistake',
  'myth',
  'emergency',
  'customer_story',
  'convenience',
  'time_savings',
  'cost_savings',
  'educational',
];

// Canonical metric field -> accepted header variants (normalized form).
// Covers the canonical CSV plus common native TikTok/IG/YT/Meta export headers.
const METRIC_ALIASES: Record<keyof PostMetrics, string[]> = {
  views: ['views', 'video views', 'plays', 'reach', 'impressions'],
  watchTimeSec: ['watch time sec', 'total watch time', 'watch time', 'total play time'],
  avgViewDurationSec: ['avg view duration sec', 'average watch time', 'avg view duration', 'avg watch time'],
  completionRate: ['completion rate', 'completed', 'avg watch percentage', 'average watch percentage', 'watched full video'],
  shares: ['shares', 'share', 'reshares'],
  saves: ['saves', 'saved', 'bookmarks'],
  comments: ['comments', 'comment'],
  profileVisits: ['profile visits', 'profile views'],
  websiteClicks: ['website clicks', 'link clicks', 'taps to website', 'url clicks'],
  calls: ['calls', 'phone calls', 'call clicks', 'phone call clicks'],
  directionRequests: ['direction requests', 'directions', 'get directions'],
  leads: ['leads', 'lead'],
  jobs: ['jobs', 'booked jobs', 'bookings', 'jobs booked'],
  revenueUsd: ['revenue usd', 'revenue', 'sales', 'revenue dollars'],
};

const DIMENSION_ALIASES = {
  platform: ['platform', 'channel', 'network'],
  postUrl: ['post url', 'url', 'link', 'permalink'],
  externalPostId: ['external post id', 'post id', 'id', 'video id', 'media id'],
  postedAt: ['posted at', 'post date', 'date', 'published', 'publish date', 'created'],
  hookCategory: ['hook category', 'hook type', 'hook'],
  service: ['service', 'service type'],
  vehicle: ['vehicle', 'car', 'make model'],
  tireSize: ['tire size', 'tyre size', 'size'],
  city: ['city', 'location', 'area'],
  videoLengthSec: ['video length sec', 'video length', 'duration', 'length', 'duration sec'],
} as const;

/** Lowercase, strip non-alphanumeric to spaces, collapse, trim. */
export function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Parse "1,200" / "$4,150" / "120K" / "1.2M" / "61%" -> number. NaN-safe -> 0. */
export function parseNumber(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let s = raw.trim().replace(/[$,%\s]/g, '');
  if (!s) return 0;
  let mult = 1;
  const suffix = s.slice(-1).toLowerCase();
  if (suffix === 'k') { mult = 1_000; s = s.slice(0, -1); }
  else if (suffix === 'm') { mult = 1_000_000; s = s.slice(0, -1); }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n * mult : 0;
}

/** Completion rate accepts 0.61, 61, or "61%" and always returns 0..1. */
export function parseCompletionRate(raw: string | number | undefined | null): number {
  const n = parseNumber(raw);
  const v = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, v));
}

/** Accepts epoch ms, epoch seconds, or any Date-parseable string. */
export function parsePostedAt(raw: string | number | undefined | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n < 1e12 ? n * 1000 : n; // seconds vs ms
  }
  const t = Date.parse(trimmed);
  return Number.isNaN(t) ? undefined : t;
}

export function parsePlatform(raw: string | undefined | null): PostPlatform | undefined {
  if (!raw) return undefined;
  const s = normHeader(raw);
  if (s.includes('tiktok') || s === 'tt') return 'tiktok';
  if (s.includes('instagram') || s === 'ig' || s.includes('reel')) return 'instagram';
  if (s.includes('youtube') || s === 'yt' || s.includes('short')) return 'youtube_shorts';
  if (s.includes('facebook') || s === 'fb' || s.includes('meta')) return 'facebook';
  if (s.includes('google') || s.includes('gbp') || s.includes('business') || s.includes('maps')) return 'gbp';
  return undefined;
}

export function parseHookCategory(raw: string | undefined | null): HookCategory | undefined {
  if (!raw) return undefined;
  const s = normHeader(raw).replace(/ /g, '_');
  return HOOK_CATEGORIES.find((c) => c === s);
}

/** Build the metrics object from a normalized header->value row. */
function metricsFromRow(row: Record<string, string>): PostMetrics {
  const out: PostMetrics = { ...EMPTY_METRICS };
  (Object.keys(METRIC_ALIASES) as (keyof PostMetrics)[]).forEach((field) => {
    const aliases = METRIC_ALIASES[field];
    const hit = aliases.find((a) => a in row);
    if (hit === undefined) return;
    out[field] = field === 'completionRate' ? parseCompletionRate(row[hit]) : parseNumber(row[hit]);
  });
  return out;
}

/** Convert one normalized header->value row into a NormalizedRow. */
export function normalizeMetricsRow(row: Record<string, string>): NormalizedRow {
  const get = (aliases: readonly string[]): string | undefined => {
    const hit = aliases.find((a) => a in row && row[a] !== '');
    return hit === undefined ? undefined : row[hit];
  };
  const lenRaw = get(DIMENSION_ALIASES.videoLengthSec);
  return {
    platform: parsePlatform(get(DIMENSION_ALIASES.platform)),
    postUrl: get(DIMENSION_ALIASES.postUrl),
    externalPostId: get(DIMENSION_ALIASES.externalPostId),
    postedAt: parsePostedAt(get(DIMENSION_ALIASES.postedAt)),
    dimensions: {
      hookCategory: parseHookCategory(get(DIMENSION_ALIASES.hookCategory)),
      service: get(DIMENSION_ALIASES.service),
      vehicle: get(DIMENSION_ALIASES.vehicle),
      tireSize: get(DIMENSION_ALIASES.tireSize),
      city: get(DIMENSION_ALIASES.city),
      videoLengthSec: lenRaw === undefined ? undefined : parseNumber(lenRaw),
    },
    metrics: metricsFromRow(row),
  };
}

/** Minimal CSV parser: handles quoted fields, escaped "" quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); field = ''; row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** All header variants we know how to map (normalized). */
function knownHeaders(): Set<string> {
  const set = new Set<string>();
  Object.values(METRIC_ALIASES).forEach((arr) => arr.forEach((a) => set.add(a)));
  Object.values(DIMENSION_ALIASES).forEach((arr) => arr.forEach((a) => set.add(a)));
  return set;
}

/** Parse a metrics CSV into normalized rows + a report of unmapped columns. */
export function parseMetricsCsv(text: string): CsvParseResult {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], recognizedColumns: [], unmappedColumns: [] };
  const rawHeaders = table[0];
  const normHeaders = rawHeaders.map(normHeader);
  const known = knownHeaders();

  const recognizedColumns: string[] = [];
  const unmappedColumns: string[] = [];
  rawHeaders.forEach((orig, i) => {
    if (known.has(normHeaders[i])) recognizedColumns.push(orig);
    else if (orig.trim() !== '') unmappedColumns.push(orig);
  });

  const rows = table.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    normHeaders.forEach((h, i) => {
      if (h) obj[h] = (cells[i] ?? '').trim();
    });
    return normalizeMetricsRow(obj);
  });

  return { rows, recognizedColumns, unmappedColumns };
}
