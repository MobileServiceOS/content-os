# Search Console — Go-Live Checklist

Do steps 1–4 (≈10 min). Then tell me and I run step 5 (deploy) + we verify.
Everything is **read-only**; no code changes needed from you.

---

## 1. Enable the API
Google Cloud Console → project **`content-os-wheelrush`** → **APIs & Services → Library**
→ search **"Google Search Console API"** → **Enable**.

## 2. OAuth consent screen
APIs & Services → **OAuth consent screen**:
- User type: **External** (or Internal if you use Google Workspace).
- App name: `Content OS`; user support email + developer email: yours.
- **Scopes** → Add → `https://www.googleapis.com/auth/webmasters.readonly` (only this).
- **Test users** → add the Google account that owns your Search Console property
  (so you can use it while the app is in "Testing"). Save.

## 3. Create the OAuth client
APIs & Services → **Credentials** → **Create credentials → OAuth client ID**:
- Application type: **Web application**.
- Name: `Content OS – Search Console`.
- **Authorized redirect URIs** → Add:
  ```
  https://us-central1-content-os-wheelrush.cloudfunctions.net/scOAuthCallback
  ```
- Create → copy the **Client ID** and **Client Secret**.

## 4. Set the 3 secrets (your terminal, in the Content OS repo)
Never paste these into chat — set them directly:
```bash
firebase functions:secrets:set SC_OAUTH_CLIENT_ID       # paste the Client ID
firebase functions:secrets:set SC_OAUTH_CLIENT_SECRET   # paste the Client Secret
firebase functions:secrets:set SC_REDIRECT_URI          # paste the redirect URI from step 3
```
Also confirm your site (e.g. `sc-domain:wheelrush.net`) is **verified** in Search Console
for that same Google account.

## 5. I deploy (after you confirm steps 1–4)
```bash
firebase deploy --only firestore:rules,functions:scAuthUrl,functions:scOAuthCallback,functions:scSync,functions:scDisconnect
# then frontend: push main (GitHub Pages)
```
Then we verify: Director → **🔎 SEO (Search Console)** → **Connect Search Console** →
Google read-only consent → **connected** → auto-sync → real clicks / impressions /
CTR / position + AI recommendations.

### If the deployed callback URL differs
v2 functions sometimes get a `*.run.app` URL instead of `cloudfunctions.net`. After my
deploy I'll read the actual `scOAuthCallback` URL; if it differs from step 3, update the
**Authorized redirect URI** (step 3) and the `SC_REDIRECT_URI` secret (step 4) to match,
then I redeploy. One-minute fix.

---

**Security recap:** the Client Secret + the OAuth refresh token live only server-side
(Functions secret + a Firestore doc locked `allow read,write: if false`). The browser
never sees them. Scope is read-only. Disconnect revokes the token at Google.
