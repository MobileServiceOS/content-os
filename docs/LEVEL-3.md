# Content OS — Level 3 (Business Agent OS)

AI-powered business agent operating system for service businesses. Automates
content creation, reputation, local SEO, GBP workflows, engagement, lead
nurturing, and task planning — with an approval gate for high-risk actions.
First tenant: **Wheel Rush Mobile Tire Repair**. Standalone app; Mobile Service
OS is never modified.

Builds on Phase 1 (MVP), Phase 2 (real LLM providers), and Phase 3 (media). See
[PHASE-1.md](./PHASE-1.md), [ROADMAP.md](./ROADMAP.md), and the build plan in
[LEVEL-3-PLAN.md](./LEVEL-3-PLAN.md).

---

## Completed features

### Single-Source Content Engine
One completed job → one **Master Content Asset** (`contentAssets`: story, content
angle, hook category, entity data) → **multi-platform distribution** to all 6
platforms (TikTok, Instagram, Facebook, YouTube Shorts, X, LinkedIn) using
per-platform rules. Each variant is saved as a `contentItem` (with `assetId` +
`approvalState: pending_approval`).

### Agents (16 registered)
- **Content, Script, Review, Social, Repurpose** — text generation.
- **BrandGuardian** — 6-dimension scoring + spam-risk gate.
- **Image, Thumbnail, Video** — media (image real via OpenAI; video mock).
- **GBP** — compliant Google Business Profile posts.
- **LocalSeo** — service/city/FAQ/AI-search/entity content.
- **Photo** — filename / alt / description / category.
- **LeadFollowUp** — nurture / quote / missed-opportunity messages.
- **MissedCall** — text-back + follow-up + callback reminder.
- **Task** — suggests prioritized SEO/GBP/review/content tasks.
- **ApprovalWorkflow** — records approve/reject decisions.
- (Publishing — placeholder for Phase 5.)

### GBP compliance
GBP descriptions never contain a CTA (banned phrases rejected on mock + LLM paths);
**Website** and **Review** links and a **rotating hashtag block** are separate
fields. Review URL lives in Brand Settings.

### Local SEO + AI-search
Service pages, city pages, FAQs, AI-search answers, and entity-rich content,
targeting the questions people actually ask. Scored on the **AI-search**
dimension.

### Engagement + tasks
Lead follow-ups, missed-call texts, review request/follow-up templates, and the
Task Agent feeding the `tasks` collection (Tasks page: pending/done/priority).

### Approval workflow
Everything generated lands **pending approval**. The unified **Approval Queue**
pulls pending content / GBP / SEO into one place; owners approve-all or per-item
approve/reject. Enforced owner-only in `firestore.rules` and the UI.

### Command Center
8-section dashboard (Agent / Content / Reputation / GBP / Local SEO / Task
overviews + Approval Queue summary + **Agent Activity Feed** from `agentLogs`).

### Uniqueness + quality
- Fingerprint + similarity, **regenerate-on-collision**, banned-opener + CTA
  compliance, all via a reusable `gate()` shared by every new kind.
- Window: gate against the **last 100**, with **500** loaded for deep checks.
- **6 quality dimensions:** uniqueness, readability, engagement, brand alignment,
  local relevance, **AI-search friendliness** — plus a **spam-risk** flag.

### Provider architecture
`Mock` (default, template) + `Claude / OpenAI / Gemini` (via the `functions/`
backend, keys in Functions secrets). Every kind flows
**Provider → Brand Guardian → Uniqueness Engine → Output**. The function handles
12 kinds (content, script, review, social, repurpose, gbp, seo, photo, lead,
missed_call, review_template, task) + `generateImage`.

## Firestore collections
`users` · `businesses` · `…/members` · `…/brandSettings` · `…/contentItems`
(+assetId, approvalState) · `…/calendarItems` · `…/reviewResponses` ·
`…/socialReplies` · `…/generationHistory` · `…/generationCosts` · `…/mediaItems`
· **`…/contentAssets`** · **`…/gbpPosts`** · **`…/seoContent`** · **`…/tasks`** ·
**`…/agentLogs`**

## Surfaces (routes)
Command Center `/` · New Job `/new-job` · Generator `/generator` · Script
`/script` · Review `/review` · Social `/social` · Repurpose `/repurpose` · Media
`/media` · GBP `/gbp` · SEO `/seo` · Engage `/engagement` · Tasks `/tasks` ·
Approvals `/approvals` · Library `/library` · Calendar `/calendar` · Brand
`/brand` · Fingerprints `/fingerprints` (owner).

## Security
Tenant isolation via `members` membership checks; roles owner > manager > viewer.
New collections: member-read, owner/manager-write, `agentLogs` append-only, and
**owner-only approval** transitions on `gbpPosts` / `seoContent` (+ content
approval gated in UI via `content.approve`).

## Tests
~76 unit tests (pools, uniqueness, quality incl. AI-search, engine, gate,
generators, providers, level3 GBP/SEO/photo/engagement/tasks, agents,
approval). Clean typecheck (client + functions) and production build.

## Deploy
```bash
firebase deploy --only firestore:rules,storage,functions
```
Set the keys you use (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`);
choose providers per business in Brand Settings. See [SETUP.md](../SETUP.md).

## Known limitations
- No live review/GBP **ingest** or **posting** (Phase 5 — external APIs). We
  generate + queue; nothing is posted.
- Real video generation is a mock poster.
- LLM kinds verified via typecheck + mocked-transport tests; first real calls
  confirm on deploy.
- No Stripe / payments. No Mobile Service OS integration yet.

## What's next
Phase 5 (publishing + social/GBP APIs + scheduled posting), Phase 6 (MSOS → content
pipeline), Phase 7 (analytics on the generation-history + cost + activity data).
See [ROADMAP.md](./ROADMAP.md).
