# Marketing Director — Architecture Review (Phase 1)

**Status:** awaiting approval. No application code written yet.
**Goal:** a central "Marketing Director" intelligence surface that answers — in plain
English, off real (later) data — *what's working, what's failing, which city to target,
which service to promote, which hooks win, what to make today, what drives revenue, what
improves local SEO.*

Phase 1 ships the **entire UI on mock/sample data**. No external APIs. Phase 2 swaps the
sample source for live adapters behind a seam designed now.

---

## 1. Audit of existing architecture (what we reuse vs. build)

The app already has a complete **analytics spine**. The Director is a layer *on top of it*.

### Already built — REUSE as-is (no changes)
| Asset | Path | What it gives the Director |
|---|---|---|
| Analytics spine model | `src/types/analytics.ts` | `PostPerformance`, `PostMetrics`, `PostScores`, `timeBucket()` — one row per published post, all dimensions denormalized. Every view is a group-by over this. |
| Aggregation engine | `src/lib/analytics/intelligence.ts` | `aggregate`, `rankBy`, `bestBy` (with sample-size guards), `byCity`, `byService`, `byHookCategory`, `byHookText`, `byCaptionFramework`, `byVehicle`, `byTireSize`, `byPlatform`, `byTimeBucket`, `byVideoLength`, `hashtagStats`, `topPosts`. **This is ~80% of the Director's math.** |
| Post scoring | `src/lib/analytics/scores.ts` | `computeScores` (viral/engagement/hook/leadGen/seo/gbp/local), `median` baseline. |
| Learning engine | `src/lib/analytics/learning.ts` | `deriveBias`, `favoredStyles`, `hasBias` — winning hooks/captions. |
| Formatting | `src/lib/analytics/format.ts` | `compact`, `pct`. |
| Live data hook | `src/hooks/usePostPerformance.ts` | subscription + baseline; the Phase-2 live path already exists. |
| Domain hooks | `useContentItems`, `useGbpPosts`, `useSeoContent`, `useReviewResponses`, `useTasks`, `useGenerationHistory`, `useAgentLogs` | feed SEO/Review/Content-opportunity directors. |
| Pre-publish quality scoring | `src/lib/quality/score.ts` | Hook/Retention/Engagement/SEO/Local 1–10 for *content ideas*. |
| UI primitives | `src/components/PageHeader.tsx`, `index.css` (`.card .tile .stat-value .grid .sec-dot .tag`) | the vibrant tile/section system the Director renders in. |
| Analytics widgets | `src/components/analytics/TrendChart.tsx`, `FunnelBar.tsx` | revenue/views trends, conversion funnels. |
| Nav grouping | `src/components/Nav.tsx` | grouped sidebar — drop in one new top item. |

### Overlap to consolidate (not duplicate)
`Analytics`, `Leaderboard`, and `Intelligence` pages already render slices of this data.
The Director **does not replace them** — it *synthesizes across all of them* and adds the
narrative ("what happened / why / next / stop / highest ROI") + revenue/review/SEO directors
those pages don't have. The three pages stay; Director links into them for drill-down.

### Genuinely NEW work (this build)
1. A **sample dataset** (Phase 1 has no live numbers — the spine is empty).
2. The **synthesis layer** — turns group-bys into ranked findings + recommendations + a written brief.
3. The **Director shell + 10 section views**.
4. The **Phase-2 source seam** (interface + registry; only the sample source implemented now).

---

## 2. Data models

### Reused unchanged
`PostPerformance` / `PostMetrics` / `PostScores` (`src/types/analytics.ts`) are the spine.
Every Director view is a group-by over `PostPerformance[]`. **No schema change.**

### New TYPES (Phase 1 — in-memory only, nothing persisted to Firestore yet)
In `src/lib/director/types.ts`:

```ts
// One completed job (revenue spine). Phase 1: sample. Phase 2: from MSOS Jobs.
interface JobRecord {
  id: string; service: string; city: string; vehicle: string;
  technician: string; ticketUsd: number; completedAt: number;
}

// A review signal distilled for theme analysis.
interface ReviewSignal {
  id: string; rating: number; city: string; service: string;
  text: string; themes: string[]; sentiment: 'pos' | 'neg' | 'neutral'; at: number;
}

// A local-SEO surface (city × service coverage + search position).
interface SeoMetric {
  city: string; service: string; impressions: number; clicks: number;
  position: number; hasServicePage: boolean;
}

// The full dataset the Director analyzes. Phase 1: produced by sampleSource.
// Phase 2: merged from many sources (see §5).
interface DirectorDataset {
  posts: PostPerformance[]; jobs: JobRecord[];
  reviews: ReviewSignal[]; seo: SeoMetric[];
  range: { start: number; end: number };
  sources: SourceStatus[];
}

// --- synthesis outputs (computed, never stored) ---
interface ActionItem { title: string; rationale: string; impact: 'high'|'med'|'low'; roiNote?: string; }
interface Finding { label: string; value: string; delta?: number; tone: 'good'|'bad'|'neutral'; }
interface ContentIdea {           // scored 1–10 on each axis
  hook: string; angle: string; platform: PostPlatform; city?: string; service?: string;
  scores: { hook:number; retention:number; engagement:number; seo:number; local:number; overall:number };
}
interface DirectorBrief {
  whatHappened: Finding[]; whyItHappened: string[];
  doNext: ActionItem[]; stopDoing: ActionItem[];
  highestRoi: ActionItem; biggestGrowth: ActionItem; mostUrgent: ActionItem;
  top3Today: ActionItem[]; top3Week: ActionItem[];
}
```

### New types (Phase 2 — designed now, built later)
```ts
type SourceId = 'sample' | 'msos_jobs' | 'gbp' | 'search_console'
              | 'ga4' | 'tiktok' | 'instagram' | 'facebook' | 'youtube';
interface SourceStatus { id: SourceId; label: string; state: 'sample'|'disconnected'|'connected'|'error'; lastSync?: number; }
// Persisted in Phase 2 only: businesses/{id}/sourceConnections/{sourceId}, businesses/{id}/jobRecords/{id}
```
No `firestore.rules` / `paths.ts` change in Phase 1 (sample data is in-memory).

---

## 3. Module / file plan

### Files to CREATE

**Logic (`src/lib/director/`)**
- `types.ts` — everything in §2.
- `sampleData.ts` — deterministic sample `DirectorDataset` (~50 posts across all cities/services/platforms/hooks, ~80 jobs, ~25 reviews, city×service SEO grid). Realistic enough that every view and recommendation is non-empty and tells a story.
- `analyze.ts` — the synthesis layer, built on `intelligence.ts`:
  `executiveSummary`, `contentPerformance` (top/worst), `hookLeaderboard`, `cityPerformance`, `servicePerformance`, `revenueBreakdown` (by service/city/vehicle/technician), `seoOpportunities`, `reviewThemes`, `contentOpportunities` (scored ideas), `dailyBrief` (assembles `DirectorBrief`).
- `sources/index.ts` — `DirectorSource` interface + registry + `mergeDataset()`.
- `sources/sampleSource.ts` — Phase-1 source returning `sampleData`.
- *(Phase 2 stubs, created but inert):* `sources/msosJobs.ts`, `gbp.ts`, `searchConsole.ts`, `ga4.ts`, `tiktok.ts`, `instagram.ts`, `facebook.ts`, `youtube.ts` — each exports a `DirectorSource` whose `fetch()` throws `not-configured` until Phase 2.

**Hook**
- `src/hooks/useDirectorData.ts` — returns `{ dataset, loading }`. Phase 1: sample source. Phase 2: merges enabled sources. (Has a dev toggle to read the *live* `usePostPerformance` spine so we can demo real data without APIs.)

**UI (`src/pages/` + `src/components/director/`)**
- `src/pages/Director.tsx` — shell: `PageHeader` + sticky sub-tab bar + active section. One route, ten sections (keeps the sidebar to a single item; mobile-friendly).
- `src/components/director/DirectorTabs.tsx` — the 10-section switcher.
- Section components (one file each):
  `ExecutiveDashboard.tsx`, `ContentPerformance.tsx`, `HookLeaderboard.tsx`, `CityPerformance.tsx`, `ServicePerformance.tsx`, `SeoDirector.tsx`, `ReviewDirector.tsx`, `RevenueDirector.tsx`, `ContentOpportunities.tsx`, `DailyBrief.tsx`.
- Shared bits: `RankTable.tsx` (reusable ranked group-by table), `KpiTile.tsx` (wraps `.card.tile`), `ActionList.tsx`, `ScoreBar.tsx`, `SourceBadges.tsx` (shows which sources are sample vs live).

**Tests**
- `src/lib/director/analyze.test.ts` — synthesis correctness (top/worst, revenue splits, brief never empty, recommendations respect sample-size guards).
- `src/lib/director/sampleData.test.ts` — dataset shape/coverage invariants.

### Files to MODIFY (small, surgical)
- `src/App.tsx` — add `<Route path="/director" element={<Director />} />` (optionally `/director/:section` for deep-linkable tabs).
- `src/components/Nav.tsx` — add `{ to:'/director', label:'Marketing Director', icon:'🧭', group:'Director' }` as a new group at the **top** (below Home) to signal it's the command surface.

That's **2 modified files.** No rules/paths/types-models changes in Phase 1.

---

## 4. Dashboard layout

One nav item → `/director` → sticky sub-tabs across the top (horizontal scroll on mobile,
matching the existing `.side-links` pattern). Default tab = **Executive Dashboard**.

```
🧭 Marketing Director                          Sources: ● sample data (Phase 1)
[ Exec ] [ Content ] [ Hooks ] [ Cities ] [ Services ] [ SEO ] [ Reviews ] [ Revenue ] [ Ideas ] [ Brief ]
─────────────────────────────────────────────────────────────────────────────
EXEC (default):
┌── KPI tiles (.grid grid-3, accent-driven) ───────────────────────────────┐
│ Revenue (30d) │ Jobs │ Avg ticket │ Views │ Leads/Calls │ Avg viral      │
└──────────────────────────────────────────────────────────────────────────┘
┌ Top 3 Actions Today ┐ ┌ Top 3 This Week ┐   ┌ Most Urgent Problem ────────┐
│ • … (impact chip)   │ │ • …             │   │ ⚠ … (red accent)            │
└─────────────────────┘ └─────────────────┘   └─────────────────────────────┘
┌ Highest-ROI opportunity ┐  ┌ Biggest growth opportunity ┐
└─────────────────────────┘  └────────────────────────────┘
┌ 30-day trend (TrendChart: revenue + views) ─────────────────────────────┐
```

Each section is a card stack reusing `RankTable` + `KpiTile`:
- **Content Performance** — Top performers / Worst performers (reuse `topPosts`), "patterns detected", recommended next formats.
- **Hook Leaderboard** — `byHookCategory`/`byHookText` ranked by avg viral + lead-gen; winner badge + sample-size guard.
- **City Performance** — `byCity`: top cities, weak cities, recommended target (highest revenue-per-post with room to grow).
- **Service Performance** — `byService`: most profitable, most viral, what to promote.
- **SEO Director** — city×service coverage grid, weak cities, recommended GBP posts / service pages / FAQs / schema / internal links.
- **Review Director** — positive themes, complaints, content opportunities from reviews.
- **Revenue Director** — revenue by service / city / vehicle / technician (FunnelBar + RankTable) + revenue actions.
- **Content Opportunities** — scored idea cards (Hook/Retention/Engagement/SEO/Local/Overall 1–10) — generated from winning dimensions, deep-link to `/new-job` / `/generator`.
- **Daily Brief** — the full written report: what happened / why / do next / stop / highest ROI, ending with Top-3 Today, Top-3 Week, Highest ROI, Biggest Growth, Most Urgent.

Every recommendation passes through the existing `bestBy(..., minSample)` guard, so the
Director never recommends off one lucky post — it says "needs more data" instead.

---

## 5. Phase 2 architecture (the seam, designed now)

The analyzers depend **only on `DirectorDataset`** — never on where it came from. So Phase 2
is purely "fill the dataset from real sources":

```
DirectorSource { id; label; status; fetch(businessId, range) => Promise<Partial<DirectorDataset>> }

   sampleSource ─┐
   msosJobs ─────┤   each returns a SLICE:
   gbp ──────────┤     msosJobs    → { jobs }           (revenue spine)
   searchConsole ┤     searchConsole→ { seo }            (impressions/position)
   ga4 ──────────┤     ga4         → site conversions   (websiteClicks/leads)
   tiktok ───────┤     tiktok/ig/fb/yt → { posts }       (PostPerformance rows)
   instagram ────┤     gbp         → { posts(gbp), reviews }
   facebook ─────┤
   youtube ──────┘ → mergeDataset(slices) → DirectorDataset → analyzers (UNCHANGED)
```

- **MSOS Jobs** → `JobRecord[]` (read-only export/webhook; respects the "never modify MSOS" rule — Content OS only *reads*).
- **TikTok / Instagram / Facebook / YouTube** → normalize each platform's metrics into `PostPerformance` rows (the spine already models all four `PostPlatform`s; CSV import already exists as a fallback in `ingest.ts`).
- **GBP** → `gbp` posts + `ReviewSignal[]`.
- **Search Console** → `SeoMetric[]` (impressions/clicks/position per city×service query).
- **GA4** → conversion metrics folded into post/site rows.

Each source becomes a row in **`businesses/{id}/sourceConnections`** (status + token ref;
secrets stay server-side in Functions, never the browser — same pattern as the LLM keys).
`useDirectorData` flips from sample → merged-live per connected source, **with zero changes
to `analyze.ts` or any section component.** That's the payoff of the seam.

---

## 6. Build order (after approval)
1. `types.ts` → `sampleData.ts` → `analyze.ts` (+ tests) — logic first, TDD on the synthesis.
2. `sources/` seam + `sampleSource` + `useDirectorData`.
3. `Director.tsx` shell + `DirectorTabs` + shared components.
4. The 10 section components.
5. Wire route + nav. `npm run build` + `vitest` green.
6. Phase-2 source stubs (inert, typed) so the seam is real and visible.

**Scope guardrails:** 2 files modified; no Firestore schema/rules change; existing
Analytics/Leaderboard/Intelligence pages untouched; MSOS never written to.
