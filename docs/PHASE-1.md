# Content OS — Phase 1 (MVP)

Standalone, multi-tenant SaaS for AI-assisted content creation, reputation
management, and social engagement for service businesses. **Wheel Rush Mobile
Tire Repair** is the first tenant. Completely separate from Mobile Service OS.

**Stack:** React · TypeScript · Vite · Firebase (Auth / Firestore / Storage) ·
GitHub Pages. Mobile-first. Template/rule-based generation behind a provider
abstraction (no LLM yet).

---

## Completed features

### Foundation
- **Auth** — email/password (Firebase Auth) with protected routes.
- **Multi-tenant** — every document under `businesses/{businessId}/…`; access
  requires a `members/{uid}` doc. Cross-tenant access is impossible at the rules
  layer, not just the UI.
- **Roles** — `owner` > `manager` > `viewer`, enforced in `firestore.rules` and
  mirrored in the UI via a permission matrix.
- **Wheel Rush seed** — first tenant + brand settings bootstrapped via
  `scripts/seedWheelRush.ts`.
- **Deploy** — GitHub Actions → GitHub Pages, Firebase config via repo secrets.

### Surfaces (pages)
- **Dashboard** — draft/approved/scheduled counts, review-response count, recent
  content, role-gated quick actions.
- **Content Generator** — hook, caption, CTA, on-screen text, hashtags, local
  keywords; 5-dimension quality badges; fingerprint + cost detail;
  Copy / Save / Edit / Regenerate.
- **Script Writer** — hook, script, shot list, on-screen text, CTA (15/30/60/custom).
- **Review Response** — short / professional / SEO-friendly; sentiment from rating;
  never a banned opener; never auto-admits fault.
- **Social Reply** — three distinct replies by platform + intent + tone.
- **Repurpose** — one source → 5 hooks, 3 captions, short + long script, YouTube
  title/description, blog topic, social post.
- **Content Library** — search, status/platform filters, edit modal, duplicate,
  archive, delete; statuses Draft → Approved → Scheduled → Posted.
- **Content Calendar** — day/week/month views, drag-and-drop scheduling, status
  tracking. No live posting.
- **Brand Settings** — business identity, services, voice + guardrails (banned /
  required phrases, local keywords, CTAs), and per-business uniqueness config.
  Owner-editable; live-affects generation.
- **Content Fingerprint Viewer** (owner-only) — similarity score, closest matching
  previous content, regeneration count.

### Content Uniqueness Engine (mandatory core)
- **Fingerprinting** + token/structure **similarity** scoring.
- **Regenerate-on-collision**: candidates above the per-business similarity
  threshold are rejected and regenerated (configurable max attempts).
- **Banned openers** hard-rejected (`Thank you…`, `Glad we could help…`,
  `A customer in…`, `Wheel Rush completed…`, plus per-business additions).
- **Variation pools** — 10 hook categories, 10 caption frameworks, review-response
  structures by sentiment, social-reply structures by intent, CTA + filler banks.
- **Last-50 history** per type powers repetition avoidance.

### Quality scoring (5 dimensions)
Uniqueness · Readability · Engagement · Brand alignment · Local relevance — surfaced
on every generation and recorded to history.

### Architecture
- **Provider layer** — `ContentProvider` interface (generateContent / generateScript
  / generateReviewResponse / generateSocialReply / repurposeContent); `mock` is
  active, `claude` / `openai` / `gemini` are typed stubs. Swap with one
  `setActiveProvider(...)` call. Generators never reference a concrete provider.
- **BrandGuardian** — banned openers/phrases, keyword stuffing, repetition,
  duplicate-structure detection, plus the 5 scores. Delegates to the shared
  uniqueness + quality modules.
- **Agent framework** — Content / Script / Review / Social / Repurpose agents over a
  `BaseAgent`, each wrapping generation with BrandGuardian validation. Placeholder
  agents (Image, Video, Approval, Publishing) are typed but not implemented.
- **Cost tracking** — `GenerationCost` (provider, tokens, est. cost, time, regen
  count) persisted to an append-only `generationCosts` collection (mocked values).

### Firestore collections
`users` · `businesses` · `…/members` · `…/brandSettings` · `…/contentItems` ·
`…/calendarItems` · `…/reviewResponses` · `…/socialReplies` ·
`…/generationHistory` · `…/generationCosts`

### Tests
48 unit tests (pools, uniqueness, quality, engine, generators, providers, agents).
Clean typecheck + production build.

---

## Going live
See [../SETUP.md](../SETUP.md): create Firebase project → fill `.env` → deploy rules
→ seed Wheel Rush → configure GitHub Pages + secrets → push.

## What's next
See [ROADMAP.md](./ROADMAP.md).
