# Content OS → AI Growth Operating System — Architecture Audit & Phased Plan

Status: **audit + plan. No feature code written yet.** Rules honored: never break
existing functionality, modify only necessary files, preserve Firebase config /
Firestore rules / auth / hosting / GitHub Actions, verify each phase, SaaS-first
and multi-business/multi-vertical from day one.

---

## 0. Headline finding

Most of this vision is **assembly + extension of what already ships**, not a
greenfield build. The Marketing Director (`/director`), the live read-only MSOS
jobs pipeline (Option B), the analytics spine, the generation engine, and the
media/avatar plumbing already exist and are tested (155 tests, deployed). The two
genuinely new cross-cutting pieces are: **(A) a vertical/industry config layer**
(to satisfy rules #7/#8 — multi-vertical from day one, today the code is
tire-specific in places), and **(B) the "every widget explains itself" framing**
(what happened / why / action / $impact) applied consistently.

---

## 1. Audit — what exists today (reuse map)

| Capability | Where it lives | State |
|---|---|---|
| Director shell + 11 tabs | `pages/Director.tsx`, `components/director/*` | shipped |
| **Live MSOS jobs (read-only)** | `lib/director/msosApp.ts`, `msosReader.ts`, `hooks/useMsosJobs.ts` | shipped — real `JobRecord[]` for the selected business |
| **Multi-business selector** | `useMsosJobs` + `msosSections.tsx` | shipped — lists owned businesses, analyzes selected only |
| **Revenue widgets** | `lib/director/msosWidgets.ts` | shipped — revenue by city/service/technician/tireSize, top customers, daily+monthly trend, heat map, opportunity + content reports |
| Analytics spine (social) | `types/analytics.ts`, `lib/analytics/intelligence.ts`, `scores.ts`, `learning.ts` | shipped — `postPerformance` group-bys, scoring, learning bias |
| Exec summary + Daily Brief | `lib/director/analyze.ts` | shipped — KPIs, Top-3 actions, ROI/urgent callouts (on sample data) |
| Content generation | `lib/ai/*` (providers claude/openai/gemini via `functions/`), `contentGenerators`, `scriptGenerator`, `gate`, `pools`, `BrandGuardian`, uniqueness | shipped |
| Level-3 agents | `lib/ai/level3/*` (gbp/seo/photo/lead/missed-call/review/task) | shipped |
| Media generation | `lib/media/*` (image: openai/mock; video: higgsfield/mock), `functions` generateImage/generateVideo | shipped |
| Review responder | `pages/ReviewResponse.tsx`, review generators | shipped |
| GBP / SEO studios | `pages/GbpStudio.tsx`, `pages/SeoStudio.tsx`, level-3 gbp/seo | shipped |
| Approval queue + Calendar | `pages/ApprovalQueue.tsx`, `useApprovalQueue`, `pages/Calendar.tsx` | shipped (approve + schedule) |
| Brand settings | `pages/BrandSettings.tsx`, `BrandSettings` model | shipped — has name/services/areas/CTAs/tone/providers; **no logo/colors/voice yet** |
| Infra to preserve | `.firebaserc` (content-os-wheelrush), `firestore.rules`, `AuthContext`, `.github/workflows/deploy.yml`, GitHub Pages | shipped — do not disturb |

**Data reality (critical):**
- **LIVE now:** MSOS jobs (revenue, city, service, technician, tireSize, vehicle, customer, status, date) for the selected business. → Phases 1, 2, 4(partial), 7 can run on real data today.
- **NOT live yet:** social metrics (TikTok/IG/FB/YT views, watch time, etc.) and SEO (Search Console / GBP rankings). The `postPerformance` spine + manual/CSV entry exist, but no platform API. → Phases 3 and 5 run on manually-entered / historical data until Phase 8 wires APIs. I will not fabricate these as "live."
- **Reviews:** no live GBP review feed yet; review intelligence runs on entered reviews until the GBP API (Phase 8).

---

## 2. The multi-vertical backbone (new, do first)

Rules #7/#8 require every feature to support Tire / Roadside / Mechanic /
Detailing / Oil / Battery / Fleet. Today some logic is tire-specific (e.g. a
"tire size" revenue dimension, tire-flavored hook pools). MSOS already stamps a
`businessType` (`'tire' | 'mechanic' | 'detailing' | …`) on
`businesses/{id}/settings/main` — we read it for free.

**Proposed: `lib/verticals/` config** — one descriptor per vertical:
```ts
interface VerticalConfig {
  id: VerticalId;                 // 'tire' | 'roadside' | 'mechanic' | 'detailing' | 'oil' | 'battery' | 'fleet'
  label: string;
  revenueDimensions: DimensionDef[]; // tire -> includes tireSize; detailing -> packageType; etc.
  serviceVocab: string[];         // default services for hook/idea generation
  hookAngles: string[];           // vertical-appropriate viral angles
}
```
Every widget/generator reads the selected business's vertical (from MSOS
`businessType`, default `tire`) and pulls dimensions/vocab from the config — so
"tire size" becomes "the vertical's product dimension," and nothing is hardcoded
to Wheel Rush. This is small, additive, and unlocks all later phases to be
vertical-safe. **Recommend building this first (Phase 0).**

---

## 3. Phase-by-phase plan (reuse → new, per phase)

Each phase: build behind the Director (new tab/section or enrichment), verify
with `npm run build` + `vitest`, commit, deploy on your OK. Every revenue/insight
widget gets the standard 4-part frame: **what happened · why · recommended action
· expected $ impact.**

**Phase 0 — Vertical backbone** *(new, ~1 module)*: `lib/verticals/` + read
`businessType` in `msosReader`. No UI change. Unblocks multi-vertical everywhere.

**Phase 1 — Revenue Intelligence** *(mostly reuse `msosWidgets.ts`)*: add
time-window widgets (Today / Yesterday / Week / Month / Last Month / 90d) off
`completedAt`; add Vehicle Type + Customer Type (new vs returning, derived from
repeat `customer`) dimensions; add Highest Avg Ticket + Highest Lifetime Customer
(extend `topCustomers`); wrap each widget in the 4-part insight frame with a
revenue-impact estimate. New: `revenueWindows.ts` + `insight.ts` (impact model);
extend the existing tab. **Highest value, closest to done — recommended start.**

**Phase 2 — Viral Content Engine** *(reuse generation engine + `analyze.contentOpportunities`)*:
feed real MSOS signals (top revenue city/service/tireSize, highest-ticket jobs,
review themes) into the existing generators to produce the 11-part package (hook,
concept, avatar script, per-platform captions, YT title/desc, GBP post, SEO
keywords, hashtags) with Virality/Revenue/SEO/Review scores; Top-10 lists +
one-click "Generate Content Package" (routes through `gate`/BrandGuardian/uniqueness).
New: `viralEngine.ts` + a Director section; reuses providers, pools, scoring.

**Phase 3 — Social Performance** *(reuse analytics spine)*: surface
`intelligence.ts` group-bys (winning hooks/topics/cities/services, "X outperforms
Y by N×") in a Director section. **Data-limited:** uses entered/CSV
`postPerformance` until Phase 8 social APIs — labeled honestly, never mock.

**Phase 4 — Review Intelligence** *(reuse review generators + `reviewDirector`)*:
praise/complaint/city/service/technician extraction → response suggestions + GBP/
video/SEO opportunities. Live once reviews are entered or the GBP API lands.

**Phase 5 — SEO Intelligence** *(reuse `seoDirector` + SeoStudio)*: top cities/
services/keywords/pages + city-page recommendations. **Data-limited:** Search
Console/GBP not connected yet → manual or recommendation-only until Phase 8.

**Phase 6 — Avatar Studio** *(reuse media + script generators)*: **needs new brand
fields** (logo URL, brand colors, voice profile) on `BrandSettings` (additive,
back-compatible). Generates avatar/UGC/authority/story/review/educational/
emergency scripts; exports prompt packages ready for HeyGen/ElevenLabs/Higgsfield/
Veo/Runway/Sora. Video already brokered via `functions` higgsfield.

**Phase 7 — Owner Executive Dashboard** *(reuse `analyze.executiveSummary` +
`dailyBrief`)*: re-point the Executive tab at **live MSOS** (currently sample) —
Revenue/Profit/Jobs/Avg/Growth%/Best City/Service/Tech + "Today's Priorities."
Profit needs a cost input (MSOS has tireCost/materialCost) — derive margin where
available, else show revenue-only.

**Phase 8 — Future Automation** *(architecture only, no live calls)*: extend the
existing Phase-2 **source seam** (`lib/director/sources/`) with typed adapters for
TikTok/IG/FB/YT/GBP/Search Console/GA4, and a publish/schedule interface building
on Approval Queue + Calendar. Inert until credentialed — mirrors how the MSOS
source was wired.

---

## 4. Guardrails & verification (every phase)
- **Changed files only**, listed per phase. Additive modules; no deletions of
  working features.
- **Never break:** `npm run build` (tsc) + full `vitest` must stay green; new
  pure logic gets unit tests; existing 155 tests must not regress.
- **Infra untouched:** no changes to `.firebaserc`, `firestore.rules`, auth,
  hosting, or `deploy.yml` unless a phase explicitly requires it (flagged first).
- **MSOS stays read-only**, multi-business, no service account.
- **Honesty:** data-limited phases (3, 5, parts of 4) are labeled; no sample data
  shown as live.

---

## 5. Recommended sequence
**Phase 0 (vertical backbone) → Phase 1 (Revenue Intelligence) → Phase 7 (Exec on
live data) → Phase 2 (Viral Engine) → Phase 4 → Phase 3 / 5 (data-limited) →
Phase 6 → Phase 8.**

Rationale: backbone makes everything vertical-safe; Phase 1 is highest-value and
closest to done on live data; Phase 7 reuses Phase 1 + existing analyze for an
immediate owner win; content/review/social/SEO follow; avatar + automation last.

**Awaiting approval to start.** Recommended kickoff: **Phase 0 + Phase 1** together
(backbone is tiny and Phase 1 depends on it), delivered as a verified, changed-
files-only increment behind the existing Revenue Intel surface.
