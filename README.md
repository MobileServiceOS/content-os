# Content OS

AI-assisted content creation, reputation management, and social engagement for
service businesses. Multi-tenant SaaS. **Wheel Rush Mobile Tire Repair** is the
first tenant.

> Standalone application — completely separate from Mobile Service OS.

## Features (in progress)

- **Multi-tenant** workspaces with owner / content-manager / viewer roles
- **Content Generator** — hooks, captions, CTAs, on-screen text, hashtags, local keywords
- **Script Writer**, **Review Response**, **Social Reply**, **Repurpose**
- **Content Library** and **Content Calendar**
- **Brand Settings** with banned/required phrases and local keywords
- **Content Uniqueness Engine** — fingerprinting, similarity detection, and
  automatic regeneration so outputs never feel repetitive
- **Agent framework** (`src/lib/agents/`) ready for future autonomous workflows,
  including a **Brand Guardian** that scores brand alignment and uniqueness

Generation is template/rule-based for now behind a provider abstraction
(`src/lib/ai/`). A real LLM (Claude/OpenAI) can be plugged in later without
touching the uniqueness/quality engine.

## Tech stack

React · TypeScript · Vite · Firebase (Auth / Firestore / Storage) · GitHub Pages.
Mobile-first responsive UI.

## Local development

```bash
npm install
cp .env.example .env      # fill in your Firebase config
npm run dev
```

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the dev server                     |
| `npm run build`   | Typecheck + production build             |
| `npm run test`    | Run the engine/unit test suite (Vitest)  |
| `npm run typecheck` | Type-check only                        |
| `npm run seed`    | Seed the Wheel Rush tenant (see SETUP.md) |

## Setup & deployment

See [SETUP.md](./SETUP.md) for Firebase project creation, security-rules
deployment, tenant seeding, and GitHub Pages configuration.

## Project structure

```
src/
  context/      AuthContext, BusinessContext (current tenant + role)
  components/   Layout, Nav, ProtectedRoute, RoleGate, UI primitives
  pages/        Dashboard, ContentGenerator, ScriptWriter, ReviewResponse,
                SocialReply, Repurpose, Library, Calendar, BrandSettings
  hooks/        Firestore data hooks
  lib/
    firebase/   client, tenant-scoped paths, audit converters
    permissions.ts   role → action matrix (mirrors firestore.rules)
    ai/         generation engine, providers (mock + Claude stub), generators, pools
    agents/     ScriptAgent, ContentAgent, ReviewAgent, SocialAgent,
                RepurposeAgent, BrandGuardianAgent
    uniqueness/ fingerprint, similarity, history, banned openers
    quality/    uniqueness/readability/brand/engagement scoring
  types/        Firestore models + generation contracts
firestore.rules, storage.rules   security (tenant isolation + roles)
scripts/seedWheelRush.ts          first-tenant seed
```

## Security model

Every tenant document lives under `businesses/{businessId}/…`. A `members`
subcollection is the authorization source of truth: access requires a membership
doc, and roles are enforced in `firestore.rules` (not just the UI).
