# Content OS — Implementation Plan (Phase 1 full build)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, multi-tenant Content OS SaaS — auth + role system, Firestore data layer with tenant isolation, a real content uniqueness/quality engine, and all content surfaces (Dashboard, Content Generator, Script Writer, Review Response, Social Reply, Repurpose, Content Library, Content Calendar, Brand Settings) backed by mock/template generation.

**Architecture:** Client-only React+TS+Vite app. Firestore security rules are the trust boundary. A provider-agnostic generation engine wraps template content now and a real LLM later. Tenant isolation via a `members` subcollection checked in rules.

**Tech Stack:** React 18, TypeScript, Vite, React Router (HashRouter), Firebase Auth/Firestore/Storage, Vitest for engine unit tests, GitHub Pages + Actions for deploy.

**Execution stages (checkpoint + report after each):**
- **Stage A — Foundation:** scaffold, firebase, types, auth, tenant/role, routing shell, security rules, deploy, Wheel Rush seed.
- **Stage B — AI engine:** types, variation pools, mock provider, uniqueness, quality, engine, all 5 generator files.
- **Stage C — Core surfaces:** Dashboard, Content Generator, Content Library.
- **Stage D — Generator surfaces:** Script Writer, Review Response, Social Reply, Repurpose.
- **Stage E — Planning surfaces:** Content Calendar, Brand Settings.

---

## File map (responsibility per file)

```
content-os/
  index.html
  vite.config.ts                       # base:'/content-os/', test config
  tsconfig.json, tsconfig.node.json
  package.json
  .gitignore, .env.example
  README.md, SETUP.md
  firestore.rules, storage.rules, firebase.json
  .github/workflows/deploy.yml
  scripts/seedWheelRush.ts             # one-off tenant seed (run locally)
  src/
    main.tsx, App.tsx                  # router + providers
    index.css                          # mobile-first base styles + design tokens
    types/
      models.ts                        # Firestore document types + enums
      generation.ts                    # GenerationRequest/Result, ContentType, Platform
    lib/
      firebase/
        client.ts                      # initializeApp from env, exports auth/db/storage
        paths.ts                       # tenant-scoped collection path helpers
        converters.ts                  # withAudit() + Firestore data converters
      ai/
        types.ts                       # GenerationProvider interface, pool types
        pools/
          hooks.ts                     # 10 hook category structure banks
          captions.ts                  # 10 caption framework banks
          scripts.ts                   # script skeletons by length
          reviewResponses.ts           # review response structure banks by sentiment
          socialReplies.ts             # reply structure banks by intent
          ctas.ts                      # CTA variant bank
          fillers.ts                   # phrasing variants, openers, transitions
        provider.mock.ts               # template provider implementing GenerationProvider
        provider.claude.ts             # stub provider; throws NotConfiguredError
        engine.ts                      # orchestrates provider + uniqueness + quality + regenerate
        contentGenerators.ts           # generateContent() public API
        scriptGenerator.ts             # generateScript()
        reviewResponseGenerator.ts     # generateReviewResponse()
        socialReplyGenerator.ts        # generateSocialReplies()
        repurposeGenerator.ts          # repurposeContent()
      uniqueness/
        fingerprint.ts                 # structural + token fingerprint of an output
        similarity.ts                  # jaccard/token similarity scoring
        history.ts                     # recent-output ring (last 50 per type) read/write
        bannedOpeners.ts               # forbidden opener detection ("Thank you", "Wheel Rush completed"...)
      quality/
        score.ts                       # uniqueness/readability/brand/engagement scores
        brand.ts                       # banned/required phrase + notOffered checks
    context/
      AuthContext.tsx                  # firebase auth state, login/logout/signup
      BusinessContext.tsx              # current tenant, role, brand settings
    components/
      Layout.tsx, Nav.tsx, ProtectedRoute.tsx, RoleGate.tsx
      ui/ (Button, Card, Field, Select, Tag, Badge, Modal, EmptyState, CopyButton)
      generator/ (GeneratorForm, OutputCard, RegenerateButton)
    hooks/
      useContentItems.ts, useBrandSettings.ts, useGenerationHistory.ts,
      useCalendarItems.ts, useMembers.ts
    pages/
      Login.tsx, Dashboard.tsx, ContentGenerator.tsx, ScriptWriter.tsx,
      ReviewResponse.tsx, SocialReply.tsx, Repurpose.tsx, Library.tsx,
      Calendar.tsx, BrandSettings.tsx, NotFound.tsx
```

---

## Shared types (authoritative — used across all stages)

`src/types/models.ts`:
```ts
export type Role = 'owner' | 'manager' | 'viewer';
export type ContentStatus = 'draft' | 'approved' | 'scheduled' | 'posted';

export interface Audit {
  businessId: string;
  createdBy: string;
  createdAt: number;   // Date.now()
  updatedAt: number;
}

export interface Business extends Audit {
  id: string;
  name: string;
  ownerId: string;
}

export interface Member {
  userId: string;
  role: Role;
  displayName: string;
  email: string;
  createdAt: number;
}

export interface BrandSettings {
  businessName: string;
  website: string;
  phone: string;
  serviceAreas: string[];
  services: string[];
  notOffered: string[];
  socialHandles: string[];
  ctas: string[];
  localKeywords: string[];
  bannedPhrases: string[];
  requiredPhrases: string[];
  brandTone: string;
}

export interface ContentItem extends Audit {
  id: string;
  title: string;
  content: string;
  platform: Platform;
  city: string;
  service: string;
  status: ContentStatus;
  tags: string[];
  notes: string;
}

export interface CalendarItem extends Audit {
  id: string;
  contentItemId: string | null;
  title: string;
  scheduledAt: number;
  status: ContentStatus;
}

export interface GenerationHistoryEntry extends Audit {
  id: string;
  type: GenerationType;          // 'hook'|'caption'|'cta'|'script'|'review'|'reply'
  structureId: string;
  fingerprint: string;
  text: string;
}
```

`src/types/generation.ts`:
```ts
export type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube_shorts' | 'x' | 'linkedin';
export type ContentType = 'caption' | 'hook' | 'voiceover' | 'talking_head' | 'story' | 'educational' | 'promotional';
export type GenerationType = 'hook' | 'caption' | 'cta' | 'script' | 'review' | 'reply';
export type Tone = 'friendly' | 'professional' | 'direct' | 'educational' | 'humorous';

export interface GenerationRequest {
  businessType?: string;
  service?: string;
  city?: string;
  vehicle?: string;
  tireSize?: string;
  timeOfDay?: string;
  responseTime?: string;
  completionTime?: string;
  notes?: string;
  platform: Platform;
  contentType?: ContentType;
  tone?: Tone;
}

export interface GeneratedBlock {
  type: GenerationType;
  structureId: string;
  text: string;
}

export interface GenerationResult {
  hook?: GeneratedBlock;
  caption?: GeneratedBlock;
  cta?: GeneratedBlock;
  onScreenText?: string[];
  hashtags?: string[];
  localKeywords?: string[];
  blocks: GeneratedBlock[];        // everything produced, for history write
  quality: QualityScore;
}

export interface QualityScore {
  uniqueness: number;   // 0..1
  readability: number;  // 0..1
  brandAlignment: number;
  engagement: number;
  overall: number;
}
```

Generation engine contract `src/lib/ai/types.ts`:
```ts
import type { GenerationRequest, GeneratedBlock, GenerationType } from '../../types/generation';
import type { BrandSettings } from '../../types/models';

export interface ProviderContext {
  brand: BrandSettings;
  recent: Record<GenerationType, string[]>;   // recent fingerprints, last 50 per type
}

export interface GenerationProvider {
  name: string;
  generateBlock(type: GenerationType, req: GenerationRequest, ctx: ProviderContext, avoidStructureIds: string[]): GeneratedBlock;
}
```

---

## STAGE A — Foundation

### Task A1: Scaffold the Vite + React + TS project
**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`, `.env.example`.

- [ ] **Step 1:** Scaffold and install.
```bash
cd "/Users/nashyberry/Content OS"
npm create vite@latest . -- --template react-ts   # answer: ignore/keep existing files
npm i firebase react-router-dom
npm i -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```
- [ ] **Step 2:** Set `vite.config.ts` `base: '/content-os/'` and add Vitest config (`environment: 'jsdom'`, `globals: true`, `setupFiles`).
- [ ] **Step 3:** `.gitignore` includes `node_modules`, `dist`, `.env`, `.env.local`, `.DS_Store`, `*.local`.
- [ ] **Step 4:** `.env.example` with `VITE_FIREBASE_API_KEY=`, `VITE_FIREBASE_AUTH_DOMAIN=`, `VITE_FIREBASE_PROJECT_ID=`, `VITE_FIREBASE_STORAGE_BUCKET=`, `VITE_FIREBASE_MESSAGING_SENDER_ID=`, `VITE_FIREBASE_APP_ID=`.
- [ ] **Step 5:** Replace `src/App.tsx` with a placeholder `<div>Content OS</div>`, ensure `npm run dev` boots clean.
- [ ] **Step 6:** Commit `chore: scaffold Vite + React + TS + Firebase deps`.

### Task A2: Firebase client + path helpers
**Files:** Create `src/lib/firebase/client.ts`, `paths.ts`, `converters.ts`, `src/types/models.ts`, `src/types/generation.ts`.

- [ ] **Step 1:** `client.ts` reads `import.meta.env.VITE_*`, calls `initializeApp`, exports `auth`, `db`, `storage`. If `projectId` missing, console.warn but don't crash (lets UI render in dev).
- [ ] **Step 2:** Add the two `types/*.ts` files exactly as defined in "Shared types" above.
- [ ] **Step 3:** `paths.ts` — helpers: `businessDoc(id)`, `membersCol(id)`, `memberDoc(id,uid)`, `brandSettingsDoc(id)`, `contentItemsCol(id)`, `calendarItemsCol(id)`, `reviewResponsesCol(id)`, `socialRepliesCol(id)`, `generationHistoryCol(id)`, `userDoc(uid)`.
- [ ] **Step 4:** `converters.ts` — `withAudit(businessId, uid, partial)` stamps `createdBy/createdAt/updatedAt`; `touch(partial)` updates `updatedAt`.
- [ ] **Step 5:** Commit `feat: firebase client, path helpers, shared types`.

### Task A3: Auth context + Login page + ProtectedRoute
**Files:** Create `src/context/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/Login.tsx`.

- [ ] **Step 1:** `AuthContext` exposes `{ user, loading, login(email,pw), signup(email,pw,displayName), logout() }` via `onAuthStateChanged`. On signup, create `users/{uid}` doc.
- [ ] **Step 2:** `Login.tsx` — email/password form, toggle login/signup, error display. Mobile-first.
- [ ] **Step 3:** `ProtectedRoute` redirects to `/login` when no user; shows spinner while `loading`.
- [ ] **Step 4:** Commit `feat: auth context, login page, protected routes`.

### Task A4: Business context + role system
**Files:** Create `src/context/BusinessContext.tsx`, `src/components/RoleGate.tsx`, `src/hooks/useBrandSettings.ts`, `src/hooks/useMembers.ts`.

- [ ] **Step 1:** On login, `BusinessContext` reads `users/{uid}.businessIds`, picks the first (single-tenant MVP), loads the `members/{uid}` doc to get `role`, and subscribes to `brandSettings/main`. Exposes `{ businessId, role, brand, members, loading }`.
- [ ] **Step 2:** `RoleGate` renders children only if `role` ∈ allowed set; `can(action, role)` helper centralizes permission logic (owner⊃manager⊃viewer).
- [ ] **Step 3:** Commit `feat: business context + role-based access helpers`.

### Task A5: App shell, nav, routing (all routes registered as stubs)
**Files:** Modify `src/App.tsx`; create `src/components/Layout.tsx`, `Nav.tsx`, `src/pages/NotFound.tsx`, and empty stub pages for Dashboard, ContentGenerator, ScriptWriter, ReviewResponse, SocialReply, Repurpose, Library, Calendar, BrandSettings.

- [ ] **Step 1:** `App.tsx` wraps `<HashRouter>` → `<AuthProvider>` → `<BusinessProvider>`; routes: `/login`, and protected `/` (Dashboard), `/generator`, `/script`, `/review`, `/social`, `/repurpose`, `/library`, `/calendar`, `/brand`, `*` NotFound.
- [ ] **Step 2:** `Nav` lists links; hide write-only links from viewers via `RoleGate`; show current business + logout.
- [ ] **Step 3:** Each stub page renders its title so navigation is verifiable.
- [ ] **Step 4:** Commit `feat: app shell, nav, full route table with stubs`.

### Task A6: Security rules + storage rules + firebase.json
**Files:** Create `firestore.rules`, `storage.rules`, `firebase.json`.

- [ ] **Step 1:** `firestore.rules` — helper `isMember(bid)` = `exists(.../businesses/$(bid)/members/$(request.auth.uid))`; `roleOf(bid)` reads member role. Rules:
  - `businesses/{bid}` read if `isMember`; update if `roleOf=='owner'`.
  - `members/{uid}` read if `isMember`; write if `roleOf=='owner'`.
  - `brandSettings/main` read if `isMember`; write if role ∈ {owner}.
  - `contentItems`, `calendarItems`, `reviewResponses`, `socialReplies`, `generationHistory`: read if `isMember`; create/update if role ∈ {owner,manager} and `request.resource.data.businessId==bid`; delete if `roleOf=='owner'` OR (`roleOf=='manager'` and `resource.data.createdBy==uid` and `resource.data.status=='draft'`).
  - `users/{uid}` read/write if `request.auth.uid==uid`.
- [ ] **Step 2:** `storage.rules` — only members of `{bid}` can read/write `businesses/{bid}/**`.
- [ ] **Step 3:** `firebase.json` wires rules files for `firebase deploy`.
- [ ] **Step 4:** Commit `feat: firestore + storage security rules (tenant isolation + roles)`.

### Task A7: Wheel Rush seed script
**Files:** Create `scripts/seedWheelRush.ts`.

- [ ] **Step 1:** Node script (run with the Firebase Web SDK + a signed-in owner, or documented for Firebase console import) that creates `businesses/{wheelrush}` + `members/{ownerUid}` (role owner) + `brandSettings/main` populated from the spec's Wheel Rush data + `users/{ownerUid}.businessIds=[wheelrush]`.
- [ ] **Step 2:** Document the run in `SETUP.md` (sign up owner first → grab uid → run seed).
- [ ] **Step 3:** Commit `feat: Wheel Rush tenant seed script`.

### Task A8: Deploy pipeline + docs
**Files:** Create `.github/workflows/deploy.yml`, `README.md`, `SETUP.md`.

- [ ] **Step 1:** Workflow: on push to `main`, `npm ci && npm run build`, inject `VITE_*` from GitHub secrets, deploy `dist` to `gh-pages` (peaceiris/actions-gh-pages or actions/deploy-pages).
- [ ] **Step 2:** `README.md` — what Content OS is, stack, local dev, scripts. `SETUP.md` — Firebase project creation (Auth email/pw, Firestore, Storage), env config, rules deploy, seed, GitHub Pages + secrets.
- [ ] **Step 3:** Commit `ci: GitHub Pages deploy workflow + README/SETUP`.

**STAGE A REPORT:** list files created/modified + testing instructions (run `npm run dev`, sign up, confirm redirect, nav renders, rules compile via `firebase deploy --only firestore:rules` dry run or emulator).

---

## STAGE B — AI generation + uniqueness/quality engine (the mandatory core)

### Task B1: Variation pools
**Files:** Create all files under `src/lib/ai/pools/`.

- [ ] **Step 1:** `hooks.ts` — export `HOOK_POOLS: Record<HookCategory, HookStructure[]>` for the 10 categories (curiosity, shock, mistake, myth, emergency, customer_story, convenience, time_savings, cost_savings, educational). Each `HookStructure = { id, category, template }` where template uses tokens like `{service}`, `{city}`, `{timeOfDay}`. ≥4 structures per category.
- [ ] **Step 2:** `captions.ts` — `CAPTION_POOLS` for the 10 frameworks (problem_solution, storytelling, timeline, customer_perspective, educational, comparison, before_after, emergency, myth_busting, convenience). ≥3 per framework.
- [ ] **Step 3:** `ctas.ts` — CTA variants pulling from `brand.ctas` + generic bank; `scripts.ts` — skeletons keyed by length (15/30/60/custom) with shot-list + on-screen-text slots; `reviewResponses.ts` — structure banks keyed by sentiment (positive/neutral/negative) that NEVER start with banned openers; `socialReplies.ts` — banks keyed by intent (question/pricing/booking/complaint/thank_you/general); `fillers.ts` — openers/transitions/closers variant arrays for token substitution.
- [ ] **Step 4:** Unit test: every structure has a unique `id`, no banned opener appears in any review-response template. `vitest run src/lib/ai/pools`.
- [ ] **Step 5:** Commit `feat: variation pools for hooks/captions/scripts/reviews/replies/ctas`.

### Task B2: Uniqueness module (TDD)
**Files:** Create `src/lib/uniqueness/fingerprint.ts`, `similarity.ts`, `history.ts`, `bannedOpeners.ts`; tests alongside.

- [ ] **Step 1 (test):** `fingerprint(text)` returns a stable normalized signature (lowercased, stopword-stripped, structure-tokenized). Assert two reworded-same-structure strings share a high similarity and a different structure does not.
- [ ] **Step 2 (test):** `similarity(a,b)` → 0..1 (token Jaccard + structural overlap). Assert identical→1, disjoint→~0.
- [ ] **Step 3 (test):** `hasBannedOpener(text)` true for "Thank you...", "Thanks for choosing us", "We appreciate your business", "Glad we could help", "A customer in...", "Wheel Rush completed...".
- [ ] **Step 4 (impl):** Implement to pass. `history.ts` exposes `loadRecent(type)→string[]` and `recordOutput(entry)` backed by `generationHistoryCol` (cap reads at last 50, ordered by `createdAt desc`).
- [ ] **Step 5:** `vitest run src/lib/uniqueness`. Commit `feat: uniqueness engine (fingerprint, similarity, banned openers, history)`.

### Task B3: Quality scoring (TDD)
**Files:** Create `src/lib/quality/score.ts`, `brand.ts`; tests.

- [ ] **Step 1 (test):** `scoreBrand(text, brand)` penalizes `bannedPhrases` and `notOffered` mentions, rewards `requiredPhrases`/`localKeywords` used naturally (cap to avoid keyword-stuffing reward).
- [ ] **Step 2 (test):** `scoreReadability(text)` (sentence length / word complexity heuristic) and `scoreEngagement(text)` (hook strength, CTA presence, question/number presence) return 0..1.
- [ ] **Step 3 (test):** `scoreOutput(text, recent, brand)` returns `QualityScore` with `uniqueness = 1 - maxSimilarity(text, recent)` and `overall` as a weighted blend.
- [ ] **Step 4 (impl):** Implement to pass. Commit `feat: quality scoring (uniqueness/readability/brand/engagement)`.

### Task B4: Mock provider + Claude stub
**Files:** Create `src/lib/ai/provider.mock.ts`, `provider.claude.ts`, `src/lib/ai/types.ts`.

- [ ] **Step 1:** `provider.claude.ts` exports a provider whose `generateBlock` throws `NotConfiguredError('Claude provider not configured')`.
- [ ] **Step 2:** `provider.mock.ts` — `generateBlock(type, req, ctx, avoidStructureIds)`: pick a structure from the right pool **not** in `avoidStructureIds`, substitute tokens from `req` + `ctx.brand` + random `fillers`, return `{type, structureId, text}`. Rotate category selection so consecutive calls vary category.
- [ ] **Step 3 (test):** 20 sequential mock calls for `hook` produce ≥ N distinct `structureId`s and never repeat the immediately-previous structure. Commit `feat: mock generation provider + Claude stub`.

### Task B5: Engine orchestration (TDD — the heart)
**Files:** Create `src/lib/ai/engine.ts`; test.

- [ ] **Step 1 (test):** `generate(type, req, brand, recent)` returns a `GeneratedBlock` whose `similarity` vs every `recent` item is below `SIMILARITY_THRESHOLD` (0.6) — i.e., it regenerated past a forced collision.
- [ ] **Step 2 (test):** When the provider keeps colliding, engine tries up to `MAX_ATTEMPTS` (5) with growing `avoidStructureIds`, then returns the best-scoring candidate and flags `quality.uniqueness`.
- [ ] **Step 3 (impl):** Loop: generate candidate → score via quality module → if `uniqueness>=threshold && overall>=MIN_QUALITY(0.5)` accept; else accumulate `avoidStructureIds` and retry; keep best-so-far. Never return a banned-opener output (hard reject).
- [ ] **Step 4:** `vitest run src/lib/ai/engine`. Commit `feat: generation engine — regenerate-on-collision + quality gating`.

### Task B6: Public generator APIs (all five files)
**Files:** Create `contentGenerators.ts`, `scriptGenerator.ts`, `reviewResponseGenerator.ts`, `socialReplyGenerator.ts`, `repurposeGenerator.ts`.

- [ ] **Step 1:** `contentGenerators.ts` → `generateContent(req, brand, recent): GenerationResult` — produces hook + caption + cta + onScreenText + hashtags + localKeywords, each via `engine.generate`, assembles `blocks[]` + `quality`.
- [ ] **Step 2:** `scriptGenerator.ts` → `generateScript({topic, platform, tone, length, format}, brand, recent)` → `{ hook, script, shotList, onScreenText, cta }`.
- [ ] **Step 3:** `reviewResponseGenerator.ts` → `generateReviewResponse({reviewText, rating, city?, service?, tone}, brand, recent)` → `{ short, professional, seoFriendly }`, sentiment from rating, never auto-admits fault, never banned opener.
- [ ] **Step 4:** `socialReplyGenerator.ts` → `generateSocialReplies({platform, message, tone, intent}, brand, recent)` → 3 distinct replies.
- [ ] **Step 5:** `repurposeGenerator.ts` → `repurposeContent({source}, brand, recent)` → 5 hooks, 3 captions, 1 short + 1 long script, YouTube title + description, blog topic, social variation.
- [ ] **Step 6 (test):** Each generator returns the documented shape and writes nothing to Firestore itself (history write happens in the hook layer). Commit `feat: content/script/review/social/repurpose generator APIs`.

**STAGE B REPORT:** files + `vitest run` output (all engine/uniqueness/quality/pool tests green) + a tiny demo script printing 10 varied hooks.

---

## STAGE C — Core surfaces

### Task C1: Data hooks
**Files:** Create `src/hooks/useContentItems.ts`, `useGenerationHistory.ts`, `useCalendarItems.ts`.

- [ ] **Step 1:** `useContentItems(businessId)` — subscribe to `contentItemsCol`, expose `items`, `create`, `update`, `remove`, `duplicate`, `archive`. All writes stamped via `withAudit`/`touch`.
- [ ] **Step 2:** `useGenerationHistory(businessId)` — `recordOutputs(blocks)` writes each block; `recent(type)` returns last-50 fingerprints (wraps `uniqueness/history`).
- [ ] **Step 3:** Commit `feat: Firestore data hooks (content items, generation history)`.

### Task C2: UI primitives + generator components
**Files:** Create `src/components/ui/*`, `src/components/generator/*`.

- [ ] **Step 1:** Button, Card, Field, Select, Tag, Badge, Modal, EmptyState, CopyButton — minimal, mobile-first, design tokens in `index.css`.
- [ ] **Step 2:** `GeneratorForm` (renders inputs from a field schema), `OutputCard` (shows a block + Copy/Save/Edit/Duplicate + quality badge), `RegenerateButton`.
- [ ] **Step 3:** Commit `feat: UI primitives + generator components`.

### Task C3: Dashboard
**Files:** Replace `src/pages/Dashboard.tsx`.

- [ ] **Step 1:** Counts: drafts, approved, pending review responses, scheduled — derived from `useContentItems` + review/calendar collections. Recent content list. Quick actions linking to `/generator`, `/script`, `/review`, `/social`, `/repurpose`.
- [ ] **Step 2:** Commit `feat: dashboard with counts, recent content, quick actions`.

### Task C4: Content Generator page
**Files:** Replace `src/pages/ContentGenerator.tsx`.

- [ ] **Step 1:** Inputs per spec (businessType, service, city, vehicle?, tireSize?, timeOfDay, responseTime, completionTime, notes, platform, contentType). On generate: load `recent`, call `generateContent`, render hook/caption/cta/on-screen-text/hashtags/keywords in `OutputCard`s with quality badges.
- [ ] **Step 2:** Actions wired: Copy, Save (→ `contentItems` as draft + `recordOutputs`), Edit (inline), Duplicate, Regenerate (re-run avoiding shown structures). Gate Save/edit behind `manager+` via `RoleGate`.
- [ ] **Step 3:** Commit `feat: content generator page wired to engine + library save`.

### Task C5: Content Library
**Files:** Replace `src/pages/Library.tsx`.

- [ ] **Step 1:** Table/cards of `contentItems` with Title/Content/Platform/City/Service/Status/Tags/Notes. Search (title/content) + filters (status, platform, service).
- [ ] **Step 2:** Actions: Edit (modal), Duplicate, Delete (RoleGate + rules), Archive, status change (draft→approved→scheduled→posted). Viewers read-only.
- [ ] **Step 3:** Commit `feat: content library — CRUD, search, filter, statuses`.

**STAGE C REPORT:** files + manual test checklist (generate → save → appears in library → edit/duplicate/delete → role gating verified with a viewer account).

---

## STAGE D — Generator surfaces (reuse engine + components)

### Task D1: Script Writer (`/script`)
- [ ] Inputs: topic, platform, tone, length (15/30/60/custom), talking-head|voiceover. Outputs hook/script/shot-list/on-screen-text/cta via `generateScript`. Save to library (type-tagged). Commit `feat: script writer page`.

### Task D2: Review Response Generator (`/review`)
- [ ] Inputs: reviewText, starRating, city?, service?, tone. Outputs short/professional/seo-friendly via `generateReviewResponse`. Save selected to `reviewResponses`. Enforce: no banned openers, no auto-fault-admission, unique each run. Commit `feat: review response generator`.

### Task D3: Social Reply Generator (`/social`)
- [ ] Inputs: platform, comment/DM, tone, intent. Outputs 3 distinct replies via `generateSocialReplies`. Save to `socialReplies`. Commit `feat: social reply generator`.

### Task D4: Repurpose Content (`/repurpose`)
- [ ] Input: single source (story/concept/caption/script). Outputs full repurpose set via `repurposeContent`; each output independently Save/Copy. Commit `feat: repurpose content page`.

**STAGE D REPORT:** files + per-generator test checklist (uniqueness across repeated runs, banned-opener absence, role gating).

---

## STAGE E — Planning surfaces

### Task E1: Brand Settings (`/brand`)
- [ ] Owner-only editor (RoleGate) for all `BrandSettings` fields (business name, website, phone, service areas, services, notOffered, social handles, ctas, localKeywords, bannedPhrases, requiredPhrases, brandTone). Writes `brandSettings/main`; live-affects generation. Viewers/managers read-only view. Commit `feat: brand settings editor`.

### Task E2: Content Calendar (`/calendar`)
- [ ] `useCalendarItems`; daily/weekly/monthly views; drag-and-drop scheduling (HTML5 DnD, no posting); assign existing `contentItems` to dates; status tracking. Commit `feat: content calendar (day/week/month, drag-drop planning)`.

**STAGE E REPORT:** files + manual test checklist (edit brand → regenerate reflects change; schedule item → appears across views; status updates persist).

---

## Self-review notes (coverage)
- Spec sections → tasks: pages (A5/C/D/E), Firestore models (A2 types + A6 rules), role system (A4/A6), uniqueness engine (B2/B5), variation systems (B1), duplicate detection + auto-regenerate (B5), quality scoring (B3), AI abstraction with all 5 files (B4/B6), security/tenant isolation (A6), deployment (A8), Wheel Rush seed + content rules (A7 + B1 banned openers + B3 brand checks). All covered.
- Type consistency: `GenerationResult`, `GeneratedBlock`, `QualityScore`, `GenerationProvider`, `BrandSettings`, `Role`, `ContentStatus` referenced consistently across stages.
- Deferred (documented, not built): self-serve tenant signup (Phase 4), real LLM provider (stub only), serverless key handling, live posting/Stripe/GBP.
