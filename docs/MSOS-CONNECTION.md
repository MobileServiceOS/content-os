# Connecting the Marketing Director to MSOS Jobs (READ-ONLY, Option B)

The "Revenue Intel (MSOS)" Director tab reads jobs from the **separate**
`mobile-service-os` Firebase project, **directly from the live data**, as the
signed-in user. Chosen mechanism: **Option B (client-side, your identity)** — see
`docs/MSOS-ARCH-AUDIT.md`.

## How it works
- The Content OS browser initializes a **second Firebase app** pointed at
  `mobile-service-os` (public web config — not a secret).
- You **sign in with the same Google account** you use for MSOS (an in-app
  "Connect MSOS account" button → Google popup). This creates a separate,
  read-only MSOS session in the browser.
- It resolves your business id from `users/{uid}` and reads
  `businesses/{businessId}/jobs` + `members`, **governed entirely by MSOS's own
  Firestore security rules** (`isMemberOfBusiness`).
- **No service account, no key to leak, no write paths.** Nothing is copied into
  Content OS — jobs are read into memory for the current view only (no duplicate
  database, no duplicate records). The tab shows a Connect button until you sign
  in; it never shows sample/mock data.

## One-time setup (no credentials)
The only requirement is letting the Content OS origin complete the Google popup
against the MSOS project's auth:

1. Firebase Console → project **`mobile-service-os`** → **Authentication** →
   **Settings** → **Authorized domains** → add:
   - `mobileserviceos.github.io` (production)
   - `localhost` (local dev — usually present already)
   This is an Auth setting only — it does **not** touch jobs, inventory, pricing,
   invoices, or any data, and grants **no write access**.
2. Make sure **Google** is an enabled sign-in provider on `mobile-service-os`
   (it already is — MSOS signs in with Google).

That's it. Deploy the Content OS frontend (push `main`), open the Director →
**Revenue Intel (MSOS)** tab → **Connect MSOS account** → sign in → the 10
widgets render off your live jobs. **Disconnect** signs out of the MSOS session
only (your Content OS login is untouched).

## Optional overrides (env, all public/non-secret)
`VITE_MSOS_API_KEY`, `VITE_MSOS_AUTH_DOMAIN`, `VITE_MSOS_PROJECT_ID`,
`VITE_MSOS_STORAGE_BUCKET`, `VITE_MSOS_MESSAGING_SENDER_ID`, `VITE_MSOS_APP_ID`,
and `VITE_MSOS_BUSINESS_ID` (force a specific business id instead of resolving
from `users/{uid}`). Defaults are baked in, so none are required.

## Read-only guarantees
1. The code only calls `getDoc`/`getDocs` — never `setDoc`/`updateDoc`/`deleteDoc`.
2. Reads run under **MSOS's security rules** as your user — you can only read what
   MSOS already lets you read, and the rules also gate writes (which we never attempt).
3. No service-account key exists, so there's no broad-database credential to leak
   (the risk R1/R2 from the audit is eliminated by this approach).
