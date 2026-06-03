# Publishing setup — activating one-click auto-post (Wave 3)

The publish pipeline is **fully built and wired**: TikTok Content Posting (Direct
Post via PULL_FROM_URL) and Google Business Profile local posts, behind a single
server gate. It's **off** until the platforms grant write access. Nothing in the
code changes when you're approved except flipping one flag and redeploying.

## The flag

`functions/src/index.ts`:
```ts
const PUBLISH_ENABLED = false;  // → true once approved, then: firebase deploy --only functions
```
While `false`, `socialPublish` / `gbpPublish` return a catchable
`failed-precondition` ("awaiting platform write-API approval"). The Automation
tab's **Test the publish pipeline** button shows this — proof the wiring is live.

---

## 1. TikTok — Content Posting API

The current app is read-only (Login Kit + Display API). Publishing needs more:

1. **developers.tiktok.com → your app ("Wheel Rush Content OS") → Add products →
   Content Posting API.**
2. Request the **`video.publish`** scope (Direct Post). Add it to `SCOPES`/consent
   — the connector already declares `publishScopes = 'video.publish'`.
3. **Verify the video host domain** (Settings → URL properties): PULL_FROM_URL only
   accepts videos from a URL-prefix-verified domain. (You need somewhere to host
   the MP4 — e.g. Firebase Storage with a public URL on a verified domain.)
4. **Submit the app for audit.** Until audited, posts are forced `SELF_ONLY`
   (private); public posting requires passing review. (`privacy` defaults to
   `SELF_ONLY` in the connector — safe for testing.)
5. Move the app from **Sandbox → Production** when audit passes.

Lead time: typically 1–3 weeks for audit. Note: publishing a TikTok needs an
actual video file/URL — Content OS produces captions/scripts, so you supply the
video (record on phone → upload), and the app posts it with the generated caption.

## 2. Google Business Profile — local posts (write)

GBP already uses the `business.manage` scope (read). Writing local posts needs:

1. **Get the project allowlisted** for the Business Profile APIs:
   https://developers.google.com/my-business/content/prereqs — fill the
   **Business Profile API access request** form (the same one that gates GBP read,
   still pending). Approval enables both read and `localPosts` write.
2. Ensure **`mybusiness.googleapis.com`** + the Business Profile APIs are enabled
   in the GCP project (`content-os-wheelrush`).
3. No new scope needed — `business.manage` already covers writes. No new secret.

Lead time: Google's allowlist review is days–weeks.

---

## When approved
1. (TikTok) add `video.publish` to the OAuth scopes and re-consent the account.
2. Set `PUBLISH_ENABLED = true`.
3. `firebase deploy --only functions:socialPublish,functions:gbpPublish`.
4. The Automation **Test** button now posts for real; wire the publish action into
   the Content Pipeline / Create tabs as desired.

## What's already done (no further code needed)
- `framework.ts`: `publish()` connector capability + `publishPlatform()` orchestration + a publish record on the data doc (feeds Content ROI).
- `tiktok.ts`: `publish()` → Content Posting API Direct Post (PULL_FROM_URL).
- `gbp.ts`: `publishLocalPost()` → `localPosts` create with optional CTA + media.
- `index.ts`: gated `socialPublish` + `gbpPublish` callables.
- Client: `publishClient.ts` + the Automation **Publishing** panel.
