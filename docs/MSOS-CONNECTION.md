# Connecting the Marketing Director to MSOS Jobs (READ-ONLY)

The "Revenue Intel (MSOS)" Director tab reads jobs from the **separate**
`mobile-service-os` Firebase project. It is **read-only by construction** and
**never modifies MSOS** (no job creation, inventory, pricing, or invoice writes).

Two layers guarantee read-only:
1. The `getMsosJobs` Cloud Function only ever calls Firestore `.get()`.
2. The service account it uses is granted **Datastore Viewer only**, so it is
   physically incapable of writing to MSOS.

The Director only ever shows **real** MSOS data here — until this is configured,
the tab shows a "Connect MSOS" state (never sample/mock numbers).

## What the connection reads
`businesses/{MSOS_BUSINESS_ID}/jobs` → normalized to `JobRecord`
(service, city, vehicle, technician [resolved from `members`], tireSize,
customer, revenue, status, date). Plus `businesses/{id}/members` for tech names.

## One-time setup (you run these — the key never goes in chat)

**1. Create a read-only service account in the `mobile-service-os` project**
- GCP Console → project `mobile-service-os` → IAM & Admin → Service Accounts → Create.
- Name e.g. `content-os-jobs-reader`.
- Grant it role **`Cloud Datastore Viewer`** (read-only). Nothing else.
- Create a JSON key and download it (e.g. to `~/Desktop/msos-reader.json`).
  Treat this file as a secret — do not paste its contents anywhere.

**2. Find the Wheel Rush MSOS business id**
- Firebase Console → `mobile-service-os` → Firestore → `businesses` → the Wheel
  Rush document. Its **document id** is `MSOS_BUSINESS_ID` (often the owner uid).

**3. Set the Content OS function secrets** (run in the Content OS repo; project `content-os-wheelrush`)
```bash
# service-account key from the file (keeps the key out of your shell history/chat)
firebase functions:secrets:set MSOS_SERVICE_ACCOUNT --data-file ~/Desktop/msos-reader.json
# the MSOS business id (paste the id when prompted)
firebase functions:secrets:set MSOS_BUSINESS_ID
# then delete the local key file
rm ~/Desktop/msos-reader.json
```

**4. Deploy just the new function**
```bash
firebase deploy --only functions:getMsosJobs
```

**5. Deploy the frontend** (the Revenue Intel tab): push `main` (GitHub Actions),
or it ships with the next deploy.

After that, open the Director → **Revenue Intel (MSOS)** tab. It will read live
jobs and render all 10 widgets. Use **Refresh** to re-pull.

## If you'd rather I run steps 3–5
Drop the key at `~/Desktop/msos-reader.json` and tell me the MSOS business id via
a safe channel, and I'll set the secrets (via `--data-file`, never echoing the
key), deploy `getMsosJobs`, deploy the frontend, and verify with a real-data
screenshot. I will delete the key file afterward.
