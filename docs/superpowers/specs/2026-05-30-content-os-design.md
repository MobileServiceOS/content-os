# Content OS — Design Spec

**Date:** 2026-05-30
**Status:** Approved (design); Phase 1 pending implementation plan
**Repo:** `/Users/nashyberry/Content OS` (proposed GitHub name: `content-os`)

> Content OS is a standalone, multi-tenant SaaS for AI-assisted content creation,
> reputation management, and social engagement for service businesses. It is a
> **completely separate application** from Mobile Service OS — separate repo,
> architecture, database, and deployment. Mobile Service OS must not be modified.
> Wheel Rush Mobile Tire Repair is the first tenant.

## Locked decisions

1. **Build sequencing:** Vertical slice first. Phase 1 = auth + multi-tenant
   foundation + Dashboard + Content Generator + Content Library, working
   end-to-end and deployable, before fanning out to the remaining surfaces.
2. **Firebase:** Scaffold for a new Firebase project. `.env` placeholders +
   a step-by-step setup guide. No secrets committed.
3. **Tenant onboarding:** Seed Wheel Rush as the first tenant with brand
   settings pre-loaded; additional users added by invite/role. Self-serve
   "create a new business" signup deferred to Phase 4.
4. **Uniqueness engine:** Build the full uniqueness + quality machinery for
   real (structure rotation, last-50 history tracking, similarity scoring,
   auto-regenerate-on-collision, quality scoring). MVP fills structures with
   template/rule-based content. Swapping in a real LLM provider later leaves
   the engine wrapper untouched.

## Constraints (from master prompt)

- Tech: React + TypeScript + Vite + Firebase (Auth/Firestore/Storage) + GitHub Pages.
- Mobile-first responsive.
- NO Stripe. NO social-posting APIs. NO Google Business Profile posting.
- NO Mobile Service OS integration yet. Standalone MVP.
- AI generation is mock/template for MVP; Claude/OpenAI plugged in later.

## 1. Architecture

No backend server for MVP. All logic runs client-side; Firestore security rules
are the trust boundary. Layered so the future AI swap is isolated to one provider file.

```
src/
  lib/
    firebase/        # init, auth helpers, tenant-scoped firestore query builders
    ai/
      types.ts                 # GenerationRequest / GenerationResult contracts
      engine.ts                # uniqueness + quality orchestration (provider-agnostic)
      provider.mock.ts         # template/rule-based provider (MVP)
      provider.claude.ts       # stub; throws "not configured" until wired
      contentGenerators.ts
      scriptGenerator.ts
      reviewResponseGenerator.ts
      socialReplyGenerator.ts
      repurposeGenerator.ts
      pools/         # hook structures, caption frameworks, CTA banks, phrasing variants
    uniqueness/      # history tracking, similarity scoring, regenerate-on-collision
    quality/         # uniqueness / readability / brand-alignment / engagement scoring
  context/           # AuthContext, BusinessContext (current tenant + role)
  components/        # layout, nav, cards, forms, ProtectedRoute
  pages/             # Dashboard, ContentGenerator, Library (Phase 1); rest later
  hooks/             # useContentItems, useBrandSettings, useGenerationHistory, ...
```

**Generation engine flow** (`engine.generate(request)`):
1. Select a structure from the relevant variation pool **not** present in the recent set.
2. Fill it with brand-aware template content (from brand settings + request inputs).
3. Score uniqueness against the last 50 outputs of that type (token + structure similarity).
4. Auto-regenerate if uniqueness or quality is below threshold.
5. Record output fingerprint in `generationHistory`.

Provider swap (`provider.mock` → `provider.claude`) leaves the uniqueness/quality
wrapper untouched.

## 2. Database (Firestore)

Every document carries audit fields: `businessId`, `createdBy`, `createdAt`, `updatedAt`.

```
businesses/{businessId}
  name, website, phone, socialHandles, ownerId, createdAt, updatedAt
businesses/{businessId}/members/{userId}        # role: owner|manager|viewer  (authz source of truth)
businesses/{businessId}/brandSettings/main      # services, areas, CTAs, keywords, banned/required phrases, tone, notOffered
businesses/{businessId}/contentItems/{id}       # title, content, platform, city, service, status, tags, notes
businesses/{businessId}/calendarItems/{id}      # contentId ref, scheduledAt, status   (Phase 3)
businesses/{businessId}/reviewResponses/{id}    # Phase 2
businesses/{businessId}/socialReplies/{id}      # Phase 2
businesses/{businessId}/generationHistory/{id}  # type, structureId, fingerprint, createdAt  (powers uniqueness)
users/{userId}                                   # email, displayName, businessIds[]  (login -> tenant routing)
```

`contentItems.status` ∈ { Draft, Approved, Scheduled, Posted }.
The `members` subcollection drives all authorization.

## 3. Security

- **Tenant isolation:** every rule requires
  `exists(/databases/$(db)/documents/businesses/$(businessId)/members/$(request.auth.uid))`.
  No member doc → no access. Cross-tenant access impossible at the rules layer.
- **Roles (enforced in `firestore.rules`, mirrored in UI via `BusinessContext.role`):**
  - `owner` — full access, member management, deletion, brand settings.
  - `manager` — generate/edit content, manage calendar, save drafts.
  - `viewer` — read-only.
- **Ownership:** `createdBy` set on create, immutable; deletion restricted to owner
  (creators may delete their own drafts — to confirm in implementation plan).
- **Secrets:** Firebase web config via `VITE_*` env vars; `.env.example` committed,
  `.env` git-ignored. The future LLM API key must never ship to the client — documented
  as a later serverless step (Cloud Function), not built in MVP.
- Ship `firestore.rules` + `storage.rules` with a tenant-isolation test checklist.

## 4. Deployment

- Vite `base: '/content-os/'`; `HashRouter` to avoid GitHub Pages deep-link 404s.
- GitHub Actions (`.github/workflows/deploy.yml`): build on push to `main` → deploy to
  `gh-pages`. Firebase config injected via GitHub repository secrets, never committed.
- Repo deliverables: `README`, `SETUP.md` (Firebase step-by-step), `.env.example`,
  `.gitignore`, deploy workflow.
- GitHub repo creation/push via `gh` only on explicit go-ahead.

## 5. Phase plan

| Phase | Scope |
|------|-------|
| **1 (next build)** | Repo scaffold, Firebase wiring, Auth + multi-tenant foundation, security rules, Dashboard, Content Generator (full engine), Content Library (CRUD/statuses/search/filter), seed Wheel Rush, deploy pipeline. |
| 2 | Script Writer, Review Response, Social Reply, Repurpose — reusing Phase-1 engine. |
| 3 | Content Calendar (daily/weekly/monthly, drag-drop), Brand Settings editor UI. |
| 4 | Self-serve business signup, member-invite UI, polish. |

## 6. Wheel Rush seed data (brand settings)

- Business: Wheel Rush Mobile Tire Repair · Website: wheelrush.net · Phone: 305-897-7030
- Social: @wheelrushllc · Service areas: Miami-Dade, Broward
- Services: mobile tire repair, mobile tire replacement, flat tire repair, blowout
  replacement, tire plug, tire patch, valve stem replacement, wheel lock removal,
  mount and balance
- Not offered: rim repair, wheel repair
- Content rules: no real customer addresses; avoid opening with "Wheel Rush completed";
  natural local references; no keyword stuffing; no fake claims; not robotic;
  never auto-admit fault in review responses.

## 7. Key trade-offs

- **HashRouter over BrowserRouter** — only reliable option on GitHub Pages without a 404 hack.
- **Members subcollection over a role field** — scales to multi-user tenants; clean rules.
- **Client-only MVP** — no Cloud Functions yet; the real-LLM key forces a small serverless
  function later, noted as a known limitation rather than built now.

## 8. Known limitations (MVP)

- Template-based generation has bounded variety vs. a real LLM; the engine is honest about
  collisions and regenerates, but cannot invent net-new phrasing the way an LLM will.
- No live social posting, no Google Business Profile, no Stripe.
- No self-serve tenant signup until Phase 4.
- LLM API key handling requires a serverless step not built in MVP.
