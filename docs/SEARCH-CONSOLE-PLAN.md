# Google Search Console Integration — Plan (await approval, no code yet)

First Phase-3-style live data source. Read-only OAuth, server-side token handling,
synced into the Marketing Director as a real **SEO** tab. **Only** Search Console —
no TikTok / Instagram / YouTube / GBP / GA4.

---

## 1. Required Google Cloud setup (you do this in the Console)

Use the existing **`content-os-wheelrush`** GCP project (so Functions + OAuth share a project):

1. **Enable the API:** APIs & Services → Enable **Google Search Console API** (`searchconsole.googleapis.com`).
2. **OAuth consent screen:** External (or Internal if Workspace). App name "Content OS", support email, your logo optional. Add scope `…/auth/webmasters.readonly`. Authorized domains: `mobileserviceos.github.io` and the Functions domain. While in **Testing**, add your Google account as a test user (or Publish the app).
3. **OAuth Client ID (Web application):** Credentials → Create credentials → OAuth client ID → Web application.
   - **Authorized redirect URI:** the callback Cloud Function, e.g.
     `https://us-central1-content-os-wheelrush.cloudfunctions.net/scOAuthCallback`
     (exact URL confirmed at deploy time).
   - Copy the **Client ID** and **Client Secret**.
4. **Search Console property:** make sure the site (e.g. `sc-domain:wheelrush.net`) is **verified** in Search Console and the Google account you'll consent with has access to it.
5. **Provide the secret safely:** set Client ID + Secret as Functions secrets via your terminal (`firebase functions:secrets:set …`) — never pasted into chat.

What I do vs you: **you** create the OAuth client + enable the API + verify the property + set the two secrets; **I** build all the code below and deploy.

---

## 2. OAuth scopes (read-only only)
- `https://www.googleapis.com/auth/webmasters.readonly` — read Search Console search-analytics + site list. **Read-only; nothing else.**
- (Optional, no extra access: `openid email` only to label which account connected. Can omit.)

No write scopes. Cannot modify Search Console, the site, or anything in your Google account.

---

## 3. Security model

- **Client secret + refresh token never touch the browser.** The OAuth *code → token* exchange happens only in a Cloud Function (the secret lives in a Functions secret). The browser only opens Google's consent screen and lands back on the app.
- **Token storage:** the long-lived **refresh token** is written to a Firestore doc that is **locked to clients** (`allow read, write: if false`) — only the Admin SDK (server functions) can read it. Even the business owner cannot read it from the client. (Alternative, slightly cleaner: Google Secret Manager per business — noted, but the locked-doc pattern needs no extra infra.)
- **Scope:** read-only (`webmasters.readonly`).
- **Caller authz:** every callable requires `assertMember` (owner/manager of the Content OS business) — same guard as the LLM/MSOS functions.
- **CSRF:** the OAuth `state` param carries a signed, time-boxed `businessId`; the callback validates it before exchanging the code.
- **Transport:** HTTPS only; the redirect URI is pinned in the GCP OAuth client.
- **Disconnect:** revokes the token at Google's revoke endpoint and deletes the locked doc.
- **Synced data** (clicks/impressions/CTR/position rows) is the owner's own data, stored per business, **owner-readable, function-write-only**.

---

## 4. What gets synced + how it groups (honest about SC's limits)

Search Console's `searchanalytics.query` natively returns rows by **query (keyword)**, **page**, country, device, date. Metrics: **clicks, impressions, CTR, average position** — all native. So:
- **By keyword** ✅ native (dimension = query)
- **By page** ✅ native (dimension = page)
- **By city** ⚠️ *derived* — SC has no city dimension (only country). We bucket by matching your business's **known cities** (from MSOS) against query text + page URLs.
- **By service** ⚠️ *derived* — same approach, matching your **services** vocab against queries/pages.

I'll label the derived groupings clearly in the UI so it's never misrepresented as a native SC dimension.

Sync stores the latest snapshot (e.g. last 90 days) per business; re-sync on demand (and later, scheduled).

---

## 5. Files to CREATE

**Functions (server):**
- `functions/src/searchConsole.ts` — OAuth (build consent URL, exchange code, refresh access token), SC API client (`searchanalytics.query`, `sites.list`), token storage (read/write the locked doc via Admin SDK), sync + grouping.
- (types inline or `functions/src/searchConsole.types.ts`).

**Client:**
- `src/lib/director/searchConsoleClient.ts` — calls the callables (`scAuthUrl`, `scStatus`, `scSync`, `scDisconnect`); kicks off the OAuth redirect.
- `src/hooks/useSearchConsole.ts` — exposes `{ status: 'disconnected'|'connecting'|'connected'|'syncing'|'error', data, lastSync, error, connect(), sync(), disconnect() }`.
- `src/lib/director/seoIntel.ts` — **pure**: group synced rows by keyword/page/city/service, top lists, and recommendations (e.g. "build a city page for {city}", "target {keyword}"). Unit-tested.
- `src/components/director/seoSections.tsx` — the **SEO** tab: Connect button + all four states + tables + recommendations, feeding the Marketing Director.

**Tests:**
- `src/lib/director/seoIntel.test.ts` — grouping + recommendation logic (fixture-based).

## 6. Files to MODIFY
- `functions/src/index.ts` — register `scAuthUrl` (onCall), `scOAuthCallback` (onRequest HTTP), `scSync` (onCall), `scStatus` (onCall), `scDisconnect` (onCall); bind secrets `SC_OAUTH_CLIENT_ID`, `SC_OAUTH_CLIENT_SECRET`.
- `firestore.rules` — **additive** rules: a locked token doc (`businesses/{id}/private/searchConsole` → `allow read, write: if false`) and SC data (`businesses/{id}/searchConsole/{doc}` → `read: if isMemberOfBusiness`, `write: if false`). **This is the one infra change** (new collection rules; flagged per your "maintain existing rules" rule — nothing existing is changed).
- `src/pages/Director.tsx` — add the **🔎 SEO** tab.
- `src/lib/director/automation.ts` — reflect `search_console` as connectable (status surfaced from the live integration).
- `functions/package.json` — add `googleapis` (or `google-auth-library` + REST) dependency for the SC client.

---

## Connection states (requirement #8)
`disconnected` (no token) → `connecting` (OAuth in progress) → `connected` (token stored) → `syncing` (pulling data) → `error` (auth/sync failure, with retry + reconnect). All driven by the integration doc's `status` + reflected in the SEO tab and the Automation matrix.

## Deploy sequence (after approval + your GCP setup)
1. I build all files above; `npm run build` + `vitest` green.
2. You set `SC_OAUTH_CLIENT_ID` / `SC_OAUTH_CLIENT_SECRET` secrets + confirm the redirect URI.
3. Deploy functions (`scAuthUrl`/`scOAuthCallback`/`scSync`/`scStatus`/`scDisconnect`) + `firestore.rules` + frontend.
4. Verify: Connect → consent → connected → sync → real clicks/impressions/CTR/position in the SEO tab.

**Awaiting approval.** No code until you approve (and the GCP OAuth client + property are ready).
