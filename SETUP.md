# Content OS — Setup & Deployment

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
2. Once created, open **Build → Authentication → Get started** and enable the
   **Email/Password** sign-in provider.
3. Open **Build → Firestore Database → Create database** (production mode).
4. Open **Build → Storage → Get started**.
5. Open **Project settings → General → Your apps → Web app (`</>`)**, register an
   app, and copy the config values.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in from the Firebase web config:

| .env key                            | Firebase config field |
| ----------------------------------- | --------------------- |
| `VITE_FIREBASE_API_KEY`             | `apiKey`              |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `authDomain`          |
| `VITE_FIREBASE_PROJECT_ID`          | `projectId`           |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `storageBucket`       |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId`   |
| `VITE_FIREBASE_APP_ID`              | `appId`               |

> Firebase web keys are not secrets, but `.env` is git-ignored anyway. A future
> LLM API key must **never** ship to the client — that will run through a
> serverless function, not the browser.

## 3. Deploy security rules

Install the Firebase CLI and deploy the rules in this repo:

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # select your project, alias it "default"
firebase deploy --only firestore:rules,storage
```

`firebase.json` already points at `firestore.rules` and `storage.rules`.

## 4. Seed the Wheel Rush tenant

1. Run the app (`npm run dev`) and **sign up the owner account** (email/password).
2. Seed the business, owner membership, and brand settings:

```bash
OWNER_EMAIL=you@example.com OWNER_PASSWORD=yourpassword npm run seed
```

Optional: `BUSINESS_ID=wheel-rush` (default). Reload the app — you are now the
owner of Wheel Rush, and brand settings are pre-populated.

### Adding more users (MVP)

Self-serve signup creates a user with no tenant. To grant access, an owner adds a
member doc at `businesses/{businessId}/members/{uid}` with a role
(`owner` | `manager` | `viewer`) and appends the businessId to the user's
`users/{uid}.businessIds`. (A member-invite UI lands in a later phase.)

## 5. Deploy to GitHub Pages

1. Create a GitHub repo named **`content-os`** (the Vite `base` is `/content-os/`;
   change `vite.config.ts` if you use a different name).
2. Add the six `VITE_FIREBASE_*` values as **repository secrets**
   (Settings → Secrets and variables → Actions).
3. In **Settings → Pages**, set **Source = GitHub Actions**.
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   deploys automatically.

## 6. Testing checklist (Stage A)

- `npm run build` succeeds (typecheck + bundle).
- `npm run dev`, then sign up → you are redirected to the dashboard.
- Before seeding, the dashboard shows the **"No workspace yet"** state.
- After seeding, nav renders and all routes load.
- A **viewer** account does not see the generator links in the nav.

## 7. Enable Claude generation (Phase 2, optional)

By default every business uses the template (`mock`) provider — no AI, no backend.
To switch a business to real Claude generation:

1. **Upgrade Firebase to the Blaze plan** (Cloud Functions require it; cost is
   ~$0 at low volume).
2. **Set the Anthropic key as a Functions secret** (never commit it):
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   # optional: choose a model (defaults to claude-sonnet-4-6)
   ```
3. **Deploy the function:**
   ```bash
   firebase deploy --only functions
   ```
4. In the app, open **Brand Settings → Generation provider** (owner only) and
   select **Claude**. Save. Generation now routes through the serverless function;
   the uniqueness + BrandGuardian checks still run client-side.

See [functions/README.md](./functions/README.md) for details. The Anthropic key
lives only in the Functions secret — it never reaches the browser.

> OpenAI and Gemini providers are stubbed (`NotConfiguredError`) until implemented.
