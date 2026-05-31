# Content OS — Roadmap

Phase 1 (the MVP) is complete — see [PHASE-1.md](./PHASE-1.md). The architecture was
built so each phase below slots in without rework: the provider layer, agent
framework, and uniqueness/quality engine are already in place.

> **Level 3 (Business Agent OS) — ✅ shipped** (see [LEVEL-3-PLAN.md](./LEVEL-3-PLAN.md)).
> Single-Source Content Engine + multi-platform distribution, GBP / Local SEO /
> Photo agents, Lead Follow-Up / Missed Call / Review-template / Task agents, the
> Approval Workflow + unified Approval Queue, a 6th quality dimension (AI-search)
> + spam-risk, uniqueness window 100/500, 5 new collections, and the 8-section
> **Command Center**. Phases 2–3 below (real LLM providers, image/video) are also done.

---

## Phase 2 — Real LLM providers

Swap template generation for real models behind the existing `ContentProvider`
interface. The uniqueness engine, BrandGuardian, and quality scoring stay unchanged.

- **Real Claude API integration** — ✅ shipped. A Firebase Cloud Function holds the
  keys and calls the model; each candidate runs through the same banned-opener +
  similarity gate and regenerates on collision.
- **OpenAI integration** — ✅ shipped. Same function (routes by provider), same
  client gate; needs `OPENAI_API_KEY`.
- **Gemini integration** — ✅ shipped. Same path; needs `GEMINI_API_KEY`.
- **Provider switching** — ✅ shipped. Per-business `brand.provider` +
  `providerFor(brand, businessId)`; real token usage feeds the cost model. The
  three LLMs share one `LlmContentProvider` — only the model behind the function differs.

> Phase 2 is complete. LLM API keys never ship to the browser — providers call the serverless
> function (`functions/`, see [../functions/README.md](../functions/README.md)).

## Phase 3 — Visual content

Media agents over a provider layer that mirrors the text one (`/media` Media Studio).

- **Image Agent** — ✅ shipped. Mock SVG-placeholder provider (default) + OpenAI
  Images (real, via the `generateImage` Cloud Function, reuses `OPENAI_API_KEY`).
- **Thumbnail Agent** — ✅ shipped. Image agent tuned for bold 16:9 thumbnails.
- **Video Agent** — ◻ partial. Wired over a **mock** video provider (poster + note);
  real async video generation (job submit + poll + store) is a follow-up.
- Generated media uploads to Storage and lands in the `mediaItems` gallery.

## Phase 4 — Collaboration & approval

Implement the placeholder `ApprovalWorkflowAgent` and add team features.

- **Approval workflows** — submit → review → approve/reject.
- **Team collaboration** — member-invite UI, role management (rules already exist).
- **Content approval queue** — a shared queue gating what can be scheduled/published.

## Phase 5 — Publishing

Implement the placeholder `PublishingAgent` and connect external platforms.

- **Publishing Agent** — push approved content to channels.
- **Social media integrations** — platform connections + auth.
- **Scheduled posting** — the calendar's `scheduledAt` drives real posts.

## Phase 6 — Mobile Service OS integration

Close the loop with the field-service product: a completed job becomes content,
guarded, reviewed, and published — with a human approval gate.

```
MSOS Job Completed
        ↓
   Content Agent      generate hooks/captions/scripts from the job
        ↓
  Brand Guardian      enforce voice, guardrails, uniqueness
        ↓
   Review Agent       draft any review responses
        ↓
   Social Agent       draft social replies / posts
        ↓
  Approval Queue      human owner/manager approves (Phase 4)
        ↓
 Publishing Agent     schedule + publish (Phase 5)
```

## Phase 7 — Analytics & optimization

Use the generation-history + cost data (already recorded) plus published-content
performance to close the feedback loop.

- **Analytics** — usage, cost, and volume dashboards.
- **Content performance tracking** — engagement per post/format/hook category.
- **Review performance tracking** — response outcomes and sentiment trends.
- **AI optimization recommendations** — which hook categories, captions, and
  providers perform best; feed back into generation.
