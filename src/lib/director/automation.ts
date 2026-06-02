// Phase 8 — Future Automation architecture. This is the typed, INERT seam for
// the full content lifecycle (generate -> approve -> schedule -> publish -> track
// -> optimize) and the platform integrations (TikTok/IG/FB/YouTube/GBP/Search
// Console/GA4 + MSOS). No live API calls are made here: publishers throw
// 'not-configured' until real credentials + adapters land. It mirrors how the
// MSOS read was wired — define the contract first, fill it later — and powers an
// honest status view so the owner sees exactly what's live vs planned.

export type IntegrationId =
  | 'msos_jobs' | 'gbp' | 'search_console' | 'ga4'
  | 'tiktok' | 'instagram' | 'facebook' | 'youtube';

export type IntegrationKind = 'read' | 'write' | 'both';
export type IntegrationStatus = 'connected' | 'disconnected' | 'planned';

export interface PlatformIntegration {
  id: IntegrationId;
  label: string;
  kind: IntegrationKind;
  /** What this integration would read into the Director. */
  dataProvided: string[];
  /** What actions it would perform (publish/schedule). */
  actions: string[];
  status: IntegrationStatus;
  /** How it will be wired (kept consistent with the MSOS pattern). */
  configHint: string;
}

export const INTEGRATIONS: PlatformIntegration[] = [
  {
    id: 'msos_jobs', label: 'MSOS Jobs', kind: 'read', status: 'connected',
    dataProvided: ['jobs', 'revenue', 'city', 'service', 'technician', 'customer'],
    actions: [], configHint: 'Live — client-side read as the signed-in MSOS user (read-only).',
  },
  {
    id: 'gbp', label: 'Google Business Profile', kind: 'both', status: 'planned',
    dataProvided: ['reviews', 'posts', 'calls', 'direction requests', 'profile views'],
    actions: ['publish GBP post', 'reply to review'],
    configHint: 'GBP API via server function + OAuth; publish posts, ingest reviews/insights.',
  },
  {
    id: 'search_console', label: 'Search Console', kind: 'read', status: 'planned',
    dataProvided: ['impressions', 'clicks', 'avg position', 'top queries', 'top pages'],
    actions: [], configHint: 'Search Console API (read-only) for ranking/keyword intelligence.',
  },
  {
    id: 'ga4', label: 'Google Analytics (GA4)', kind: 'read', status: 'planned',
    dataProvided: ['sessions', 'conversions', 'website calls', 'form leads'],
    actions: [], configHint: 'GA4 Data API (read-only) for site conversion attribution.',
  },
  {
    id: 'tiktok', label: 'TikTok', kind: 'both', status: 'planned',
    dataProvided: ['views', 'watch time', 'shares', 'comments', 'follows'],
    actions: ['publish video', 'schedule video'],
    configHint: 'TikTok Content Posting + Display API via server function + OAuth.',
  },
  {
    id: 'instagram', label: 'Instagram', kind: 'both', status: 'planned',
    dataProvided: ['reach', 'saves', 'shares', 'profile visits'],
    actions: ['publish reel', 'schedule reel'],
    configHint: 'Instagram Graph API via server function + OAuth.',
  },
  {
    id: 'facebook', label: 'Facebook', kind: 'both', status: 'planned',
    dataProvided: ['reach', 'engagement', 'page calls'],
    actions: ['publish reel/post', 'schedule'],
    configHint: 'Facebook Graph API via server function + OAuth.',
  },
  {
    id: 'youtube', label: 'YouTube', kind: 'both', status: 'planned',
    dataProvided: ['views', 'watch time', 'subscribers', 'traffic sources'],
    actions: ['publish Short', 'schedule Short'],
    configHint: 'YouTube Data API via server function + OAuth.',
  },
];

export const integrationsByStatus = (status: IntegrationStatus): PlatformIntegration[] =>
  INTEGRATIONS.filter((i) => i.status === status);

// --- content lifecycle ---

export type LifecycleStage = 'generate' | 'approve' | 'schedule' | 'publish' | 'track' | 'optimize';

export interface LifecycleStep {
  stage: LifecycleStage;
  label: string;
  /** Live in-app today, or planned (needs the platform integrations above). */
  live: boolean;
  poweredBy: string;
}

export const LIFECYCLE: LifecycleStep[] = [
  { stage: 'generate', label: 'Generate content', live: true, poweredBy: 'Viral Engine + generators' },
  { stage: 'approve', label: 'Approve content', live: true, poweredBy: 'Approval Queue' },
  { stage: 'schedule', label: 'Schedule content', live: true, poweredBy: 'Calendar' },
  { stage: 'publish', label: 'Publish to platforms', live: false, poweredBy: 'Platform write APIs (Phase 8)' },
  { stage: 'track', label: 'Track results', live: false, poweredBy: 'Platform read APIs -> postPerformance' },
  { stage: 'optimize', label: 'Optimize automatically', live: false, poweredBy: 'Learning engine + auto-loop' },
];

export const liveStages = (): LifecycleStage[] => LIFECYCLE.filter((s) => s.live).map((s) => s.stage);

// --- inert publisher seam ---

export interface PublishRequest {
  platform: IntegrationId;
  contentItemId: string;
  text: string;
  mediaUrl?: string;
  scheduledAt?: number; // epoch ms; omitted = publish now (when live)
}

export interface PublishResult {
  platform: IntegrationId;
  status: 'published' | 'scheduled';
  externalId?: string;
  url?: string;
  at: number;
}

export class IntegrationNotConfiguredError extends Error {
  constructor(public platform: IntegrationId) {
    super(`${platform} publishing is not configured yet (Phase 8). Generate → approve → schedule works today; publishing is planned.`);
    this.name = 'IntegrationNotConfiguredError';
  }
}

export interface Publisher {
  readonly platform: IntegrationId;
  publish(req: PublishRequest): Promise<PublishResult>;
}

/** Default publisher for a planned platform: refuses, clearly, until wired. */
export function notConfiguredPublisher(platform: IntegrationId): Publisher {
  return {
    platform,
    async publish(_req: PublishRequest): Promise<PublishResult> {
      throw new IntegrationNotConfiguredError(platform);
    },
  };
}

/** Whether a platform can publish today (none until the write APIs are wired). */
export function canPublish(platform: IntegrationId): boolean {
  const i = INTEGRATIONS.find((x) => x.id === platform);
  return !!i && i.status === 'connected' && (i.kind === 'write' || i.kind === 'both') && i.actions.length > 0;
}

/** Route a publish request. Inert today — throws not-configured for all platforms. */
export async function publishContent(req: PublishRequest): Promise<PublishResult> {
  if (!canPublish(req.platform)) throw new IntegrationNotConfiguredError(req.platform);
  // When a platform becomes connected, swap in its real Publisher here.
  return notConfiguredPublisher(req.platform).publish(req);
}
