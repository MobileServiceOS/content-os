# Viral Content OS — Phase 1 Plan (Analytics Core + Video MCP)

> Status: **IMPLEMENTED (all 5 steps).** Typecheck (app + functions) clean, 118 tests pass (42 new in `src/lib/analytics/*`), production build succeeds. Not yet verified in a live browser (requires Firebase auth + a seeded tenant) and Firestore rules + the `generateVideo` function are not yet deployed.
> Decisions locked: (1) Performance data via **manual entry + CSV import**; (2) Video via the **connected generate_video + virality_predictor MCP**; (3) Sequencing: **Analytics core first**, Learning Engine + Video as follow-on within this plan.

---

## 1. Audit conclusion — what already exists

The existing app already implements ~85% of the master prompt. **We reuse, we do not rebuild.**

| Spec section | Status | Reused component |
|---|---|---|
| Hook Generator (10 styles) | ✅ Built | `src/lib/ai/pools/hooks.ts` (56 templates, 10 categories) |
| Script Generator (15/30/60) | ✅ Built | `src/lib/ai/scriptGenerator.ts`, `pools/scripts.ts` |
| Caption Engine (per platform) | ✅ Built | `src/lib/ai/contentGenerators.ts`, `pools/captions.ts` |
| Hashtag Engine | ✅ Built | `contentGenerators.ts`, `level3/pools.ts` HASHTAG_BANK |
| GBP Engine (compliant) | ✅ Built | `src/lib/ai/level3/index.ts` `runGbp` |
| Uniqueness Engine | ✅ Built | `src/lib/uniqueness/*` |
| Brand Guardian | ✅ Built | `src/lib/quality/*`, `agents/BrandGuardianAgent.ts` |
| Content scoring (6 dims) | ✅ Built | `src/lib/quality/score.ts` |
| Library / Approval / Calendar / Tasks | ✅ Built | `src/pages/*`, `src/hooks/*` |
| One-job→multi-platform | ✅ Built | `src/pages/NewJob.tsx` |
| Real LLM (Claude/OpenAI/Gemini) | ✅ Built | `functions/src/index.ts` `generate` callable |
| **Viral Analytics Dashboard** | ❌ Missing | — build |
| **Hook Analytics** | ❌ Missing | — build |
| **Performance Intelligence** | ❌ Missing | — build |
| **Learning Engine** | ❌ Missing | — build |
| **Leaderboard** | ❌ Missing | — build |
| **Content Score persistence (Viral/Lead-gen)** | ⚠️ Partial | extend `score.ts` |
| **Video generation (real)** | ⚠️ Mock only | wire MCP |

**Architectural constraint we honor:** every collection lives under `businesses/{businessId}/...`; every doc carries the `Audit` base (`businessId/createdBy/createdAt/updatedAt`); append-only collections (history/costs/logs) never update or delete. New collections follow the same pattern and Firestore rules style.

---

## 2. Architecture plan

### 2.1 The missing link: a published post + its metrics

Today content flows `generate → ContentItem (draft→approved→scheduled→posted)`. There is **no record of what a post actually did** after it went live. That is the root gap behind Analytics, Hook Analytics, Performance Intelligence, Leaderboard, and the Learning Engine.

We introduce one new spine collection — **`postPerformance`** — plus a daily-snapshot subcollection for time series. Everything else (dashboard, hook analytics, leaderboard, learning) is a *read/aggregate* over this spine. One source of truth, many views.

```
ContentItem (status='posted')
        │  owner links it to a live URL + enters metrics (or imports CSV)
        ▼
postPerformance/{id}        ← one row per published post per platform
        │  carries denormalized "dimensions" copied at publish time:
        │  hookCategory, hookText, service, vehicle, tireSize, city,
        │  platform, captionFramework, videoLengthSec, postedAt, timeBucket
        │  + metrics: views, watchTimeSec, avgViewDurationSec, completionRate,
        │    shares, saves, comments, profileVisits, websiteClicks,
        │    calls, directionRequests, leads, jobs, revenueUsd
        │  + scores snapshot: viralScore, engagementScore, hookScore,
        │    seoScore, gbpScore, localRelevanceScore, leadGenScore
        ▼
postPerformance/{id}/snapshots/{yyyy-mm-dd}   ← optional daily deltas (CSV/manual)
```

**Why denormalize dimensions onto the perf row?** Analytics, Hook Analytics, and the Leaderboard all group-by these fields. Copying them at publish time means every analytics query is a single-collection read with no joins (Firestore has no joins), and historical truth is preserved even if the source ContentItem is edited or archived later. This mirrors the existing append-only `generationHistory` philosophy.

### 2.2 Data ingestion (manual + CSV)

- **Manual:** a metrics form on each post row (Analytics page + Library row action). Owner pastes the live post URL and types in the numbers they read off the platform dashboard.
- **CSV import:** a single drag-drop importer. We support a **canonical CSV schema** (documented in §3.4) and a best-effort column mapper for the native TikTok/IG/YouTube/Meta exports (header aliasing). Each row upserts a `postPerformance` doc keyed by `(platform, externalPostId)` or matched by URL.
- **API-ready:** ingestion is funneled through one pure module `src/lib/analytics/ingest.ts` (`normalizeMetricsRow → PostPerformance patch`). A future platform-API sync writes through the same function, so no rewrite is needed. (We are NOT building APIs this phase, per decision.)

### 2.3 Scoring — extend, don't replace

`src/lib/quality/score.ts` already computes uniqueness/readability/engagement/brand/local/aiSearch from **text**. Those are *pre-publication* (predictive) scores. We add **post-publication (actual) scores** computed from metrics:

- **Viral Score** = normalized blend of views-vs-baseline, completionRate, shares+saves rate. (Baseline = trailing median for that business/platform.)
- **Engagement Score** = (shares+saves+comments)/views, normalized.
- **Hook Score** = completionRate weighted by 3-second-retention proxy (avgViewDuration/videoLength).
- **Lead-Gen Score** = (calls+leads+jobs)/views, normalized; revenue as tiebreaker.
- **SEO Score / GBP Score** = retained from existing text scoring for GBP/SEO items.

When the connected **virality_predictor MCP** is wired, its score becomes the *predictive* Viral Score on generated video (shown pre-publish); the metrics-derived Viral Score remains the *actual* one. Both stored, clearly labeled.

### 2.4 Performance Intelligence + Learning Engine

- **`src/lib/analytics/intelligence.ts`** — pure aggregation over `postPerformance`: best hook category, best service, best vehicle, best tire size, best city, best time bucket, best video length, best caption framework. Returns ranked tables with sample sizes (never recommend off n=1; surfaces "needs more data").
- **Learning Engine** = a thin bias layer, not a retrain. `src/lib/analytics/learning.ts` reads the intelligence tables and produces a `GenerationBias` (weights per hook category / caption framework). The existing mock provider's category rotation and the LLM prompt builder accept these weights so top-performing styles surface more often. Fully explainable, no opaque ML. Off by default; toggle in Brand Settings.

### 2.5 Video via MCP

A new provider `src/lib/media/mcpVideoProvider.ts` implements the existing `VideoProvider` interface (`src/types/media.ts`) by calling the connected MCP `generate_video`, with `virality_predictor` for the predictive score and `reframe` for 9:16/1:1/16:9 variants. Because it conforms to the existing interface, the Media page and agents need no structural change — just provider selection (`brand.videoProvider`). Mock stays as fallback.

> Note: MCP video tools run from the agent/host side, not the browser. The browser calls a new Cloud Function `generateVideo` (mirrors `generateImage`) that brokers the MCP call, so secrets/credits stay server-side and tenancy is enforced via `assertMember`. If brokering through the MCP server-side proves out-of-scope, we fall back to "generate from the agent, store URL in `mediaItems`." Flagged as the one integration risk.

---

## 3. Database schema (new + changed)

All new collections are tenant-scoped under `businesses/{businessId}/` and extend `Audit`.

### 3.1 `postPerformance/{id}` — new (the spine)
```ts
interface PostPerformance extends Audit {
  id: string;
  contentItemId: string | null;     // link back to source (nullable for ad-hoc imports)
  assetId?: string;                  // MasterContentAsset link when from NewJob
  platform: Platform;                // tiktok | instagram | facebook | youtube_shorts | gbp
  externalPostId?: string;           // platform's id (for CSV dedupe)
  postUrl?: string;
  postedAt: number;                  // epoch ms
  timeBucket: string;                // e.g. 'wed-evening' derived from postedAt (for "best time")

  // denormalized dimensions (copied at publish; immutable thereafter)
  hookText?: string;
  hookCategory?: HookCategory;
  captionFramework?: CaptionFramework;
  service?: string;
  vehicle?: string;
  tireSize?: string;
  city?: string;
  videoLengthSec?: number;

  // metrics (latest cumulative values)
  metrics: PostMetrics;

  // scores (actual, metrics-derived) + predictive snapshot
  scores: PostScores;
  predictedViralScore?: number;      // from virality_predictor MCP, if available

  source: 'manual' | 'csv' | 'api';  // provenance
  lastMetricsAt?: number;
}

interface PostMetrics {
  views: number; watchTimeSec: number; avgViewDurationSec: number; completionRate: number; // 0..1
  shares: number; saves: number; comments: number;
  profileVisits: number; websiteClicks: number;
  calls: number; directionRequests: number; leads: number; jobs: number; revenueUsd: number;
}

interface PostScores {
  viralScore: number; engagementScore: number; hookScore: number;
  seoScore: number; gbpScore: number; localRelevanceScore: number; leadGenScore: number; // all 0..1
}
```

### 3.2 `postPerformance/{id}/snapshots/{yyyy-mm-dd}` — new (time series, optional)
```ts
interface PerformanceSnapshot { date: string; metrics: PostMetrics; createdAt: number; }
```
Append-only. Powers trend lines; if owner only enters one cumulative number, we still work without snapshots.

### 3.3 Changed types
- `src/types/generation.ts`: nothing breaking — reuse `HookCategory`, `CaptionFramework`, `Platform`.
- `src/types/models.ts`: add optional `videoProvider?: 'mock' | 'mcp'` and `learningEnabled?: boolean` to `BrandSettings`. Add `hookCategory?`, `captionFramework?`, `videoLengthSec?` to `ContentItem` so dimensions are captured at generation time (needed to copy onto perf row at publish).
- `src/types/media.ts`: add `'mcp'` to `VideoProviderName`.

### 3.4 Canonical import CSV
```
platform,post_url,external_post_id,posted_at,hook_category,service,vehicle,tire_size,city,
video_length_sec,views,watch_time_sec,avg_view_duration_sec,completion_rate,shares,saves,
comments,profile_visits,website_clicks,calls,direction_requests,leads,jobs,revenue_usd
```
Importer aliases common native-export headers (e.g. TikTok `Video views`→`views`, IG `Reach`/`Plays`→`views`). Unmapped columns ignored; missing metrics default 0.

### 3.5 Firestore rules (append to `firestore.rules`)
- `postPerformance`: read = `isMember`; create/update = owner/manager + sameTenant; delete = owner only. (Metrics get *updated* as new numbers come in, so unlike history this is updatable — but dimensions are validated immutable on update via a rule guard comparing `request.resource.data` dimension fields to `resource.data`.)
- `postPerformance/{id}/snapshots`: append-only (create only), read = member.

---

## 4. Dashboard wireframes

### 4.1 `/analytics` — Viral Analytics Dashboard (new)
```
┌──────────────────────────────────────────────────────────────┐
│ Analytics                          [ Date range ▾ ] [Import CSV]│
├──────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ Views  │ │ Engage │ │ Calls  │ │ Leads  │ │ Revenue│  …stat │
│ │ 312K ↑ │ │ 4.8% ↑ │ │  37    │ │  21    │ │ $4,150 │  tiles │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│  (reuses existing color-accent stat-tile component)            │
├──────────────────────────────────────────────────────────────┤
│  Views & engagement over time   │  Funnel: views→clicks→calls  │
│  [ sparkline/area, SVG ]         │  →leads→jobs  [ bar steps ]  │
├──────────────────────────────────────────────────────────────┤
│  Posts (sortable table)                                        │
│  Post · Platform · Hook cat · Views · Compl% · Calls · Leads · │
│  Viral · Lead-gen · [ + metrics ] [ edit ]                     │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 `/analytics/hooks` (or tab) — Hook Analytics (new)
```
Hook · Category · Posts · Avg Views · Avg Compl% · Shares · Leads · HookScore
"Would you pay $200 for this?"  cost_savings  4   120K   61%   2.1K  9   0.88
"Flat tire at 2 AM?"            emergency     3    48K   55%    900  4   0.74
…  (sortable; n<3 flagged "low confidence")
```

### 4.3 `/leaderboard` — Leaderboard (new)
```
[ Top Hooks ] [ Top Videos ] [ Top Captions ] [ Top Locations ]
[ Top Services ] [ Top Vehicles ] [ Top Hashtags ]   ← tab chips

Rank · Item · key metric · sample size            (cards, reuse status-color cards)
```

### 4.4 `/intelligence` — Performance Intelligence (new, owner/manager)
```
"What's working" panels, each a ranked mini-table w/ sample size:
Best Hook Category · Best Service · Best Vehicle · Best Tire Size ·
Best Location · Best Time to Post · Best Video Length · Best Caption Style
[ Learning Engine: ●ON ] toggle → "Top styles now favored in generation"
```

### 4.5 Touch points on existing pages
- **Dashboard (`/`)**: add a "Top performer this week" tile + "X posts need metrics" nudge.
- **Library row**: add "+ metrics" / "View performance" action on `posted` items.
- **NewJob / Media**: show predictive Viral Score (from virality_predictor) on generated video.
- **Nav**: new "Insights" group → Analytics, Leaderboard, Intelligence.

---

## 5. Files to CREATE

**Types & schema**
- `src/types/analytics.ts` — `PostPerformance`, `PostMetrics`, `PostScores`, `PerformanceSnapshot`, `GenerationBias`.

**Data layer**
- `src/lib/firebase/paths.ts` → add `postPerformanceCol/Doc`, `performanceSnapshotsCol` (edit, listed in §6).
- `src/hooks/usePostPerformance.ts` — live subscription + `upsert()`, `recordMetrics()`, `linkFromContentItem()`.

**Analytics engine (pure, unit-tested)**
- `src/lib/analytics/ingest.ts` — `normalizeMetricsRow`, CSV parse + header aliasing.
- `src/lib/analytics/ingest.test.ts`
- `src/lib/analytics/scores.ts` — viral/engagement/hook/lead-gen score formulas + baselines.
- `src/lib/analytics/scores.test.ts`
- `src/lib/analytics/intelligence.ts` — best-by-dimension aggregations w/ sample sizes.
- `src/lib/analytics/intelligence.test.ts`
- `src/lib/analytics/learning.ts` — intelligence → `GenerationBias`.
- `src/lib/analytics/learning.test.ts`

**Video MCP**
- `src/lib/media/mcpVideoProvider.ts` — implements `VideoProvider` via Cloud Function broker.
- `functions/src/video.ts` — `generateVideo` callable (brokers MCP generate_video + virality_predictor; `assertMember`).
- wire into `functions/src/index.ts` (edit, §6).

**UI**
- `src/pages/Analytics.tsx`
- `src/pages/HookAnalytics.tsx` (or a tab within Analytics)
- `src/pages/Leaderboard.tsx`
- `src/pages/Intelligence.tsx`
- `src/components/analytics/MetricsForm.tsx` — manual entry modal.
- `src/components/analytics/CsvImport.tsx` — drag-drop importer.
- `src/components/analytics/StatTile.tsx` *(only if the existing dashboard tile isn't already extractable; otherwise reuse)*.
- `src/components/analytics/TrendChart.tsx` — dependency-free SVG line/area.
- `src/components/analytics/FunnelBar.tsx` — SVG funnel.

## 6. Files to MODIFY

- `src/lib/firebase/paths.ts` — add postPerformance + snapshots path helpers.
- `firestore.rules` — add `postPerformance` (+ subcollection) rules with immutable-dimension guard.
- `src/types/models.ts` — `BrandSettings.videoProvider?`, `BrandSettings.learningEnabled?`; `ContentItem.hookCategory?/captionFramework?/videoLengthSec?`.
- `src/types/media.ts` — add `'mcp'` to `VideoProviderName`.
- `src/App.tsx` — routes `/analytics`, `/leaderboard`, `/intelligence`.
- `src/components/Nav.tsx` — new "Insights" group (Analytics 📈, Leaderboard 🏆, Intelligence 🧠).
- `src/pages/Dashboard.tsx` — top-performer tile + "needs metrics" nudge.
- `src/pages/Library.tsx` — per-row metrics action on posted items.
- `src/pages/NewJob.tsx` + `src/pages/Media.tsx` — show predictive Viral Score on generated video; set `videoProvider`.
- `src/lib/media/index.ts` — register `mcpVideoProvider` in provider selection.
- `src/lib/ai/provider.mock.ts` + `functions/src/prompts.ts` — accept optional `GenerationBias` to favor top styles (Learning Engine hook; no-op when disabled).
- `src/pages/BrandSettings.tsx` + `src/hooks/useBrandSettings.ts` — toggles for video provider + learning engine.
- `functions/src/index.ts` — export `generateVideo`; bind any MCP/video secret.
- `src/lib/permissions.ts` — add `analytics.view` / `analytics.edit` capabilities (owner/manager).

## 7. Testing & verification
- Unit tests (vitest) for every pure module in `src/lib/analytics/*` — formulas, CSV aliasing, baseline math, sample-size guards. Matches existing test density (engine/uniqueness/quality already tested).
- `npm run typecheck` + `npm run build` clean.
- Manual: seed a few `postPerformance` rows → verify Analytics totals, Hook Analytics ranking, Leaderboard tabs, Intelligence sample-size guards, CSV round-trip.
- Firestore rules: a manager can write metrics but cannot mutate a dimension field; non-member denied.

## 8. Sequencing (within this plan)
1. **Schema + data layer + ingest** (types, paths, rules, hook, ingest.ts + tests).
2. **Scores + Analytics page + MetricsForm + CsvImport**.
3. **Hook Analytics + Leaderboard**.
4. **Intelligence + Learning Engine** (bias wiring, default off).
5. **Video MCP** (provider + Cloud Function + UI predictive score).

Each step ends green (typecheck/build/tests) and is independently shippable.

## 8b. Video provider — Higgsfield (concrete)

The connected video MCP is **Higgsfield**. Since a deployed Cloud Function can't reach a session MCP, `generateVideo` calls Higgsfield's REST API directly ([docs.higgsfield.ai](https://docs.higgsfield.ai)):

- **Base:** `https://platform.higgsfield.ai` (override `HIGGSFIELD_BASE_URL`)
- **Auth:** `Authorization: Key {keyId}:{keySecret}` from secret `HIGGSFIELD_CREDENTIALS` (`"keyId:keySecret"`)
- **Submit:** `POST /{modelId}` (default `higgsfield-ai/dop/standard`, override `HIGGSFIELD_VIDEO_MODEL`) with `{ prompt, aspect_ratio, resolution, duration, image_url? }` → `{ request_id }`
- **Poll:** `GET /requests/{request_id}/status` until `completed` → `video.url`

To enable: `firebase functions:secrets:set HIGGSFIELD_CREDENTIALS` then deploy `generateVideo`, and set `brand.videoProvider='higgsfield'` in Brand Settings. **Virality prediction is a Higgsfield dashboard, not a REST score** — `predictedViralScore` is plumbed through but not populated by the REST path. Field names should be sanity-checked against the live Higgsfield account before production (contract assembled from official docs + SDK README).

## 9. Open risks / flags
- **MCP video brokering** (server-side Cloud Function vs agent-side) is the one integration unknown — fallback defined in §2.5.
- **Baselines need data** — Viral Score normalization is weak until ~20+ posts exist; until then we show raw metrics + "calibrating" label rather than a misleading 0–100.
- **CSV header drift** — platform exports change column names; aliasing is best-effort with an on-screen "unmapped columns" notice.
