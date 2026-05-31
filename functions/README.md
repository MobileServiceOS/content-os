# Content OS — Functions (serverless backend)

The one piece of backend Content OS needs: a single callable that holds the LLM
API keys and calls **Claude / OpenAI / Gemini** (chosen per business). Keys
**never** ship to the browser.

## `generate` callable

`onCall` (Firebase Functions v2). Flow:

1. Requires an authenticated Firebase user (`request.auth`).
2. Verifies tenant membership: reads `businesses/{businessId}/members/{uid}` and
   requires role `owner` or `manager`.
3. Builds a brand-aware prompt (`prompts.ts`) enforcing the content rules
   (banned openers/phrases, not-offered services, no keyword stuffing).
4. Routes to the requested provider — Claude (`anthropic.ts`), OpenAI
   (`openai.ts`), or Gemini (`gemini.ts`) — and returns `{ result, usage }`
   (strict JSON + token usage). Only the chosen provider's key is read.

The client (`ClaudeContentProvider`) then runs each candidate through the same
uniqueness + BrandGuardian gate and regenerates on collision — so the engine
stays the single source of truth.

**Request:** `{ provider, businessId, kind, payload, brand, avoid? }`
where `provider ∈ claude | openai | gemini` and
`kind ∈ content | script | review | social | repurpose`.

## `generateImage` callable

Same auth + membership guard (`auth.ts`). Calls OpenAI Images (`openaiImage.ts`,
default `gpt-image-1`, override `CONTENT_OS_IMAGE_MODEL`) and returns
`{ b64, width, height }` (base64 PNG). Uses the `OPENAI_API_KEY` secret.

**Request:** `{ businessId, prompt, aspectRatio?, style? }`.

## Local

```bash
cd functions
npm install
npm run build        # tsc -> lib/
```

## Configure keys (never commit them)

Set only the provider keys you intend to use:

```bash
# from the repo root, with the Firebase CLI logged in + project selected
firebase functions:secrets:set ANTHROPIC_API_KEY   # for Claude
firebase functions:secrets:set OPENAI_API_KEY      # for OpenAI
firebase functions:secrets:set GEMINI_API_KEY      # for Gemini
```

Models default to `claude-sonnet-4-6`, `gpt-4o-mini`, and `gemini-1.5-flash`.
Override via env vars `CONTENT_OS_CLAUDE_MODEL`, `CONTENT_OS_OPENAI_MODEL`,
`CONTENT_OS_GEMINI_MODEL`.

## Deploy

Requires the Firebase **Blaze** (pay-as-you-go) plan.

```bash
firebase deploy --only functions
```

## Notes

- The function and the client both keep a copy of the global banned-opener list;
  the client gate is authoritative.
- Only the chosen provider's secret is read per request, so you can run with just
  one key configured.
- Region is the project default (us-central1). The client `getFunctions(app)`
  must match if you change it.
