# Content OS — Level 3 Plan (Business Agent OS)

> Pre-coding deliverable. No code until approved. Builds on Phases 1–3; reuses the
> existing multi-tenant, provider, uniqueness, and agent architecture.

## 1. Audit — reuse vs. new

### Reuse as-is
- Multi-tenant auth, 3 roles, `firestore.rules` isolation, audit fields.
- Provider layer (mock/claude/openai/gemini) + `functions/generate`.
- Uniqueness engine (fingerprint, similarity, regenerate-on-collision).
- BrandGuardian + 5-dim quality + the agent framework (`BaseAgent`, registry).
- Existing generators (content/script/review/social/repurpose) and their pages.
- Calendar, Library, Media, Fingerprints, BrandSettings, generationHistory/costs.

### Extend (small changes to existing)
- **Uniqueness window:** recent 50 → configurable **100 / 500** (last-100 fast gate,
  last-500 deep check). `loadRecentByType` limit + engine config.
- **BrandGuardian / quality:** add a **6th dimension — AI-search friendliness** +
  an explicit **spam-risk** check. `QualityScore`, `scoreOutput`, guardian report.
- **BrandSettings:** add `reviewUrl` (for GBP review link), keep website/phone.
- **Provider function:** add new prompt **kinds** (`gbp`, `seo`, `photo`, `lead`,
  `missed_call`, `task`) to `prompts.ts` — no new infra.
- **Content status:** add an approval state (`pending_approval`) alongside the
  existing draft/approved/scheduled/posted.

### New
- **6 new agents:** GBP, Local SEO, Lead Follow-Up, Missed Call, Task, Photo
  Optimization. Plus implement the existing **ApprovalWorkflow** placeholder.
- **5 new collections:** `contentAssets`, `gbpPosts`, `seoContent`, `tasks`,
  `agentLogs`. (calendar already exists as `calendarItems`.)
- **Single-Source Content Engine:** one job → one **Master Content Asset** →
  multi-platform distribution (6 platforms, platform rules) → per-platform items
  with per-platform approval.
- **Command Center Dashboard** (8 sections) + **Agent Activity Feed** (from `agentLogs`).
- **GBP compliance generator:** separate Description / Website / Review / Hashtags
  fields; no CTA in description. Photo optimization (filename/alt/description/category).
- **Approval Queue** + ApprovalWorkflowAgent (approve-all or per-platform).

## 2. Data model changes

New collections under `businesses/{businessId}/`:

| Collection | Purpose | Key fields |
|---|---|---|
| `contentAssets` | Master Content Asset (single source) | service, vehicle, tireSize, city, story, contentAngle, hookCategory, entityData, photoRefs, status |
| `gbpPosts` | GBP outputs | assetId, description, websiteUrl, reviewUrl, hashtags[], approvalState |
| `seoContent` | Local SEO outputs | type(service/city/faq/ai_search), title, body, entities[], questions[] |
| `tasks` | Agent-created tasks | category(seo/gbp/review/content), title, priority, status, createdByAgent |
| `agentLogs` | Activity feed | agent, action, summary, refId, createdAt |

Field additions: `brandSettings.reviewUrl`; `contentItems.assetId?` +
`contentItems.approvalState`; `mediaItems` gains optimization fields
(filename, altText, category) — reuses the collection.

## 3. Security changes

- Rules for the 5 new collections: read = member; create/update = owner/manager +
  same-tenant; delete = owner (or creating manager for own drafts).
- `agentLogs`: append-only (no update/delete), like generationHistory.
- Approval transitions: only owner may move an item to `approved`; managers may
  submit (`pending_approval`). Enforced in rules + UI.

## 4. Command Center Dashboard — wireframe

```
┌───────────────────────────────────────────────────────────┐
│ Wheel Rush Mobile Tire Repair            [New Job] [+ ▾]   │  ← top bar
├───────────────────────────────────────────────────────────┤
│ AGENT OVERVIEW                                             │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐  │
│  │Active 6│Done 24 │Pending │Content │Reviews │Follow- │  │  ← stat tiles
│  │        │        │  3     │  18    │  7     │ups 5   │  │
│  └────────┴────────┴────────┴────────┴────────┴────────┘  │
├──────────────────────────────┬────────────────────────────┤
│ CONTENT OVERVIEW             │ REPUTATION OVERVIEW         │
│  Draft 6 · Approved 8        │  New 2 · Pending 3          │
│  Scheduled 3 · Posted 11     │  Response rate 86%          │
├──────────────────────────────┼────────────────────────────┤
│ GBP OVERVIEW                 │ LOCAL SEO OVERVIEW          │
│  Posts 4 · Photos 9          │  Content opps 5 · FAQ 4     │
│  Desc updates 2 · Pending 1  │  Cities 2/2 · Services 7/9  │
├──────────────────────────────┴────────────────────────────┤
│ APPROVAL QUEUE                            [Approve all ▾]  │
│  ▸ TikTok caption — "Stuck on I-95…"        [✓] [✗] [edit]│
│  ▸ GBP post — driveway fix                  [✓] [✗]       │
│  ▸ Review response — 5★                     [✓] [✗]       │
├───────────────────────────────────────────────────────────┤
│ TASK OVERVIEW            │ AGENT ACTIVITY FEED             │
│  Pending 7 · Done 12     │  • Content Agent generated 6    │
│  Priority: 3             │  • Brand Guardian approved 5    │
│                          │  • Review Agent drafted 2       │
│                          │  • Task Agent created 3 tasks   │
└──────────────────────────┴─────────────────────────────────┘
```
Mobile: sections stack single-column in the order above; stat tiles wrap 2-up.

## 5. Single-Source flow

```
New Job (city, service, vehicle, tire size, times, notes, photos)
        ↓  ContentAgent
Master Content Asset  (story, angle, hook category, entities)
        ↓  Multi-platform distribution (platform rules)
TikTok · Instagram · Facebook · YT Shorts · X · LinkedIn   → contentItems (pending_approval)
        ↓  Brand Guardian (uniqueness + 6 scores) per item
Approval Queue  →  owner approves all / per-platform  →  Calendar / Library
```

## 6. Migration plan (phased — each ships + reports, like prior stages)

- **L3.1 Foundation** — 5 new collections + rules + types + hooks; `agentLogs`
  logging util; `brandSettings.reviewUrl`; uniqueness window 100/500; BrandGuardian
  +AI-search +spam-risk dimensions; approval state on content.
- **L3.2 Single-Source + Multi-Platform** — New Job intake → Master Content Asset →
  6 platform variants (platform rules) → per-platform items + approval state. New
  pages: New Job / Content Studio.
- **L3.3 GBP + Local SEO + Photo** — GBPAgent (compliance: separate desc/links/
  hashtags), LocalSeoAgent (service/city/FAQ/AI-search/entity), PhotoOptimization;
  generators + GBP Studio + SEO Studio pages + `gbpPosts`/`seoContent` wired.
- **L3.4 Engagement + Tasks** — Lead Follow-Up, Missed Call, Review request/
  follow-up templates, Task Agent; pages + `tasks` wired.
- **L3.5 Approval workflow** — ApprovalWorkflowAgent + approval state machine +
  per-platform approval + Approval Queue UI.
- **L3.6 Command Center** — the 8-section dashboard + Agent Activity Feed pulling
  from all of the above (replaces the current Dashboard).

## 7. Files (planned — each stage reports its exact set)

**Created (by area):**
- Types: `types/asset.ts`, `types/level3.ts` (gbp/seo/task/log/lead shapes).
- AI: `lib/ai/pools/{gbp,seo,lead,missedCall}.ts`, generators
  `gbpGenerator.ts`, `seoGenerator.ts`, `leadGenerator.ts`, `missedCallGenerator.ts`,
  `taskGenerator.ts`, `assetDistributor.ts` (multi-platform).
- Agents: `agents/{GBPAgent,LocalSeoAgent,LeadFollowUpAgent,MissedCallAgent,TaskAgent,PhotoAgent}.ts`;
  implement `workflow.ts` ApprovalWorkflowAgent.
- Hooks: `useContentAssets`, `useGbpPosts`, `useSeoContent`, `useTasks`, `useAgentLogs`, `useApprovalQueue`.
- Pages: `NewJob`, `ContentStudio`, `GbpStudio`, `SeoStudio`, `Tasks`, `Engagement`,
  `ApprovalQueue`, `CommandCenter` (Dashboard upgrade), `AgentActivity`.
- Lib: `lib/agents/log.ts` (agentLogs writer), `lib/platforms.ts` (platform rules).
- Functions: `functions/src/prompts.ts` extended for new kinds.

**Modified:**
- `types/models.ts` (reviewUrl, approvalState, asset/log refs), `firestore.rules`
  (+5 collections), `firebase/paths.ts` (+5 collections), `lib/uniqueness/*`
  (window 100/500), `lib/quality/*` + `BrandGuardianAgent.ts` (+2 dims),
  `App.tsx` + `Nav.tsx` (routes), `BrandSettings.tsx` (reviewUrl), `agents/index.ts`
  (register new agents), `functions/src/index.ts` (new kinds).

## 8. Out of scope (per prompt)
No Stripe / payments. No live social/GBP posting APIs (we generate + queue;
publishing is a later phase). No MSOS integration. Real video stays mock.

## 9. After coding (per stage + final)
Files created/modified, DB changes, security changes, testing instructions,
deployment steps, updated roadmap.
