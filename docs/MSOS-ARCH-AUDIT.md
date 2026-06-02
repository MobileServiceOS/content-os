# MSOS → Marketing Director: Read-Only Architecture Audit

> **Decision (2026-06-02): Option B — client-side, your identity — was chosen and
> implemented.** No service account, no credentials. See `docs/MSOS-CONNECTION.md`.
> The service-account function from the earlier draft was removed.

Audit performed **before** provisioning any credentials. Two separate Firebase
projects: Content OS = `content-os-wheelrush`, MSOS = `mobile-service-os`.

**Core property:** this is a **read-through**, not a sync. MSOS jobs are read
live, normalized in memory, and returned to the browser for display. **Nothing
is written, copied, or persisted into Content OS** — no duplicate database, no
duplicate job collection, no scheduled mirror. If the function/tab isn't open,
zero reads happen.

---

## 1. Exact Firestore collections read

In project `mobile-service-os`, for one business id `B` (= `MSOS_BUSINESS_ID`):

| Collection path | Why | Access |
|---|---|---|
| `businesses/{B}/jobs` | the job records (revenue spine) | read (`.get()` on the collection) |
| `businesses/{B}/members` | resolve technician `uid` → display name | read (`.get()` on the collection) |

That's it. **Two collections, both read-only, both scoped to the single Wheel
Rush business.** No top-level collections, no other businesses, no `invoices`,
`inventory`, `pricing`, `customers`, `subscriptions`, or settings collections are
touched by the code.

---

## 2. Exact fields required

Read from each `jobs/{id}` document (per MSOS `src/types/index.ts` `Job`):

| MSOS field | Used for | Returned to browser? |
|---|---|---|
| `status` (`Completed`/`Pending`/`Cancelled`) | completed vs pending split | yes (normalized) |
| `revenue` (number\|string) | all revenue widgets | yes (as `ticketUsd`) |
| `service` | revenue by service, heat map | yes |
| `city` (→ `area` → `fullLocationLabel` fallback) | revenue by city, heat map | yes |
| `vehicleType` (→ `vehicleMakeModel`) | vehicle context | yes |
| `tireSize` | revenue by tire size | yes |
| `customerName` | Top Customers widget | yes |
| `assignedToUid` (→ `createdByUid`) | technician (resolved via members) | only the resolved **name** |
| `date` (→ `paidAt` → `createdAt`) | daily/monthly trends | yes (as epoch) |

From `members/{uid}`: `displayName` / `name` / `email` (first found) + doc id.

**Data-minimization note (a finding, see §4):** the reader fetches each job with
`doc.data()`, so the *whole* job document — including `customerPhone`,
`customerEmail`, costs, payment method, photos — is pulled **into the function's
memory**, even though only the fields above are returned to the browser. PII that
reaches the browser is limited to `customerName` + technician name. Phone/email
never leave the function. This can be tightened (see §6, option A-hardened).

---

## 3. Read permissions required

Depends on the mechanism:

**A. Service account (current code).** The function uses the Firebase Admin SDK,
which **bypasses Firestore security rules entirely.** Access is governed only by
the service account's **IAM role on `mobile-service-os`**:
- Required: **`roles/datastore.viewer`** (read-only).
- ⚠️ Firestore IAM is **database-level, not collection-level** — `datastore.viewer`
  grants read to the **entire `mobile-service-os` database**, not just `jobs`. You
  cannot scope an IAM role to one collection. (See §4.)

**B. Client-side read (alternative).** The browser reads MSOS directly as the
**signed-in user**, constrained by MSOS `firestore.rules`. MSOS already allows:
```
match /businesses/{businessId}/{document=**} {
  allow read: if isMemberOfBusiness(businessId);
}
```
So the user must be a **member of the Wheel Rush MSOS business** (a
`members/{uid}` doc, or `uid == businessId`). No service account, no IAM change —
read scope is whatever the rules already permit for that user.

---

## 4. Security risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **SA key over-grants**: `datastore.viewer` can read the *entire* `mobile-service-os` DB (all businesses, customers, payments, invoices) — not just jobs. A leaked key exposes everything readable. | **High** | Prefer mechanism B (no key, scoped by rules); or accept + rotate key, store only in Functions secret, restrict who can deploy. IAM can't scope to one collection. |
| R2 | **Admin SDK bypasses security rules** — read-only depends solely on the IAM role being `viewer`. If someone later grants the SA `editor`/`owner`, it could write to MSOS. | High | Pin the role to `datastore.viewer`; add an org policy / review. Mechanism B can't write (rules + no write paths). |
| R3 | **Long-lived credential**: JSON SA keys don't expire. | Medium | Rotate periodically; or use mechanism B (no key); or workload identity federation (no static key). |
| R4 | **Cross-app PII flow**: customer names (and, in-function, phone/email) move from MSOS into Content OS. | Medium | Minimize: return initials/hash instead of full names; don't read PII fields at all (select only needed fields). |
| R5 | **Caller authz**: the function gates on `assertMember` (Content OS owner/manager). A Content OS manager can read MSOS revenue. | Low | Tighten to owner-only if desired. |
| R6 | **Full-collection read each call** (no date filter/pagination) — larger blast radius + cost as jobs grow. | Low | Add a date-range/limit parameter; cache. |

**Net:** the single biggest issue is **R1/R2 — the service-account path is
broader than "read jobs."** It reads jobs *in practice*, but the *capability* is
"read the whole MSOS database, rules bypassed." Mechanism B avoids this by using
the user's own identity + MSOS's existing rules.

---

## 5. Cost impact

**No duplication ⇒ no extra storage cost.** Reads only.

Per `getMsosJobs` call: `(jobs in business) + (members)` document reads.
- Example: 500 jobs + 5 members = **505 reads/refresh**.
- Firestore read price ≈ **$0.06 per 100,000 reads** → 505 reads ≈ **$0.0003**.
- 1,000 refreshes/month ≈ **$0.30/month**. Negligible at this scale.
- Cloud Function invocation/compute: 256 MB, < 1 s — within free tier for this
  volume; pennies beyond it.
- Egress: a few hundred KB/call. Negligible.
- **No writes, no new indexes, no stored copy.**

Cost scales linearly with (#jobs × #refreshes). The only way it gets non-trivial
is a very large job count read repeatedly. Mitigation: short client cache and/or
a date-range filter so we read recent jobs, not the full history, on each view.
Mechanism B bills the same reads to the user's session.

---

## 6. Alternative approaches

| Option | How it reads | Duplication | Write-capable? | Least-privilege | Setup cost | Verdict |
|---|---|---|---|---|---|---|
| **A. Service account (current)** | Content OS function → Admin SDK → MSOS | none (read-through) | only if mis-roled (R2) | **weak** (whole-DB read, rules bypassed) | create SA + key + 2 secrets | Works; over-broad credential. |
| **A-hardened** | same, but `select()` only needed fields, return customer initials, add date-range param, cache | none | no | weak IAM but minimized data | same + small code change | A with R4/R6 addressed. |
| **B. Client-side, user identity** | browser → 2nd Firebase app → MSOS, gated by MSOS rules | none (read-through) | **no** (rules + no write code) | **strong** (only what the user may read; no key) | add MSOS web config; user must be an MSOS member | Best least-privilege if you're an MSOS member. |
| C. MSOS-side read endpoint | new callable in MSOS | none | no | scoped | **modifies MSOS** | ❌ violates "don't modify MSOS". |
| D. Mirror/sync to Content OS | scheduled copy of jobs | **yes — duplicate records** | n/a | n/a | pipeline | ❌ violates "no duplicate DB/records". |
| E. BigQuery/Data Connect export | analytics copy | **yes** | n/a | n/a | export setup | ❌ duplication. |

All of A, A-hardened, and B satisfy your hard constraints: **read directly from
the live MSOS business data, no duplicate database, no duplicate job records, no
write access.** C/D/E are ruled out by your constraints.

### Recommendation
- If you (the Content OS user) are a **member/owner of the Wheel Rush MSOS
  business** → **Option B** is the cleanest: no service-account key to leak, no
  IAM change, read scope limited to what MSOS rules already allow you, and it is
  structurally incapable of writing. Tradeoff: exposes the MSOS *web* config
  (public anyway) in the bundle and requires the same login identity.
- If you need the Director to work **without the viewer being an MSOS member**
  (e.g. a teammate who isn't in MSOS) → **Option A-hardened**, accepting the
  broad key but minimizing data (field `select()`, customer initials, date range,
  cache) and pinning `datastore.viewer`.

Currently implemented: **Option A** (service account). Switching to **B** or
**A-hardened** is a contained change. No credentials should be provisioned until
you pick the mechanism.
