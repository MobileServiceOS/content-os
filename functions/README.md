# Content OS — Functions (serverless backend)

The one piece of backend Content OS needs: a single callable that holds the
Anthropic API key and calls Claude. The key **never** ships to the browser.

## `generate` callable

`onCall` (Firebase Functions v2). Flow:

1. Requires an authenticated Firebase user (`request.auth`).
2. Verifies tenant membership: reads `businesses/{businessId}/members/{uid}` and
   requires role `owner` or `manager`.
3. Builds a brand-aware prompt (`prompts.ts`) enforcing the content rules
   (banned openers/phrases, not-offered services, no keyword stuffing).
4. Calls Claude (`anthropic.ts`) and returns `{ result, usage }` (strict JSON +
   token usage).

The client (`ClaudeContentProvider`) then runs each candidate through the same
uniqueness + BrandGuardian gate and regenerates on collision — so the engine
stays the single source of truth.

**Request:** `{ businessId, kind, payload, brand, avoid? }`
where `kind ∈ content | script | review | social | repurpose`.

## Local

```bash
cd functions
npm install
npm run build        # tsc -> lib/
```

## Configure the key (never commit it)

```bash
# from the repo root, with the Firebase CLI logged in + project selected
firebase functions:secrets:set ANTHROPIC_API_KEY
# (optional) pick a model — defaults to claude-sonnet-4-6
firebase functions:secrets:set CONTENT_OS_MODEL   # or set as an env var
```

## Deploy

Requires the Firebase **Blaze** (pay-as-you-go) plan.

```bash
firebase deploy --only functions
```

## Notes

- The function and the client both keep a copy of the global banned-opener list;
  the client gate is authoritative.
- Region is the project default (us-central1). The client `getFunctions(app)`
  must match if you change it.
