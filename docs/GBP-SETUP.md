# Google Business Profile — Go-Live Checklist

Code is built + deployed (functions `gbpAuthUrl/gbpOAuthCallback/gbpSync/gbpDisconnect`,
rules, frontend GBP tab). It reuses the **existing OAuth client** (no new secrets).
GBP go-live needs more than Search Console because Google gates the Business Profile APIs.

## 1. Enable the APIs (project content-os-wheelrush)
APIs & Services → Library → Enable each:
- **Business Profile Performance API** (`businessprofileperformance.googleapis.com`) — metrics
- **My Business Account Management API** (`mybusinessaccountmanagement.googleapis.com`) — accounts
- **My Business Business Information API** (`mybusinessbusinessinformation.googleapis.com`) — locations
- **Google My Business API** (`mybusiness.googleapis.com`) — reviews (legacy; may require access request)

## 2. Request Business Profile API access (the real gate ⚠️)
Unlike Search Console, the Business Profile APIs require your project to be **allowlisted**:
fill the access request form → https://support.google.com/business/contact/api_default
(select project `content-os-wheelrush`). **This can take a few days.** Until granted, the
APIs return `PERMISSION_DENIED` and the tab will show an error/empty — that's expected, not a bug.
(Reviews specifically need the legacy My Business API access; metrics/keywords come with the
Performance API.)

## 3. Add the GBP redirect URI to the existing OAuth client
APIs & Services → Credentials → your "Content OS – Search Console" OAuth client →
**Authorized redirect URIs → + Add**:
```
https://us-central1-content-os-wheelrush.cloudfunctions.net/gbpOAuthCallback
```
(Keep the existing Search Console redirect URI too — just add this one.)

## 4. Make the 4 GBP functions publicly invocable (like Search Console)
Either I do it in the Cloud Run console (you authorized this for SC — just say so), or run:
```bash
for f in gbpauthurl gbpoauthcallback gbpsync gbpdisconnect; do
  gcloud run services add-iam-policy-binding "$f" \
    --region=us-central1 --member=allUsers --role=roles/run.invoker \
    --project=content-os-wheelrush
done
```
(Auth is still enforced inside each function via `assertMember` — same as SC.)

## 5. Connect + verify
Director → **📍 GBP Intelligence** → **Connect Business Profile** → Google consent
(click through the "unverified app" notice — it's your own app; the scope is `business.manage`
but we only read) → connected → auto-sync → real calls / clicks / directions / search + maps
views, trends, top cities/services, reviews, and recommendations.

## Scope note
Google offers no read-only GBP scope; `business.manage` is the only option (read+write). **This
integration only ever calls read endpoints** (fetch/list/GET) — it never creates posts or replies.
"Posts to create" and "reviews needing responses" are recommendations, not actions.
