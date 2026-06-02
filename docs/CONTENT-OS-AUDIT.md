# Content OS — Product Audit (founder / PM / growth lens)

Question behind the audit: **what will a mobile service owner pay $X/month for?**
Answer: a tool that tells them *where their money comes from, what to post today to
get more, whether it'll work, and eventually does it for them.* That is the
**Marketing Director**. Everything else is either supporting workflow or commodity
content tooling that shouldn't be the headline.

## The core finding
Content OS is **two products stacked in one app**:

- **Layer A — the Marketing Director** (new): connects the owner's REAL data (MSOS
  revenue, TikTok, Search Console, GBP) and turns it into decisions, recommendations,
  and a pre-publish content score. **This is the monetizable product.** Real data,
  defensible, answers "where's my next $10K."
- **Layer B — the original content studio** (Home + Generator/Script/Review/Social/
  Repurpose/Media + GBP/SEO studios + Tasks/Approvals/Library/Calendar/Brand/
  Fingerprints): single-tenant **template-based** content generation (no LLM key
  configured), **mostly empty** (the owner doesn't create here — they live in the
  Director). This is commodity "yet another caption generator" — low willingness-to-pay,
  and it now overlaps the Director.

**The product = Layer A. Layer B should be collapsed into it or cut.** More features
is the trap; the win is one tight loop: *connect → see the money → know what to post →
score it → publish → measure lift.*

> Note: the sample Director tabs (Content, Hooks, Cities, Services, Daily Brief) were
> already removed in the "real data only" pass — they're **Removed**, not pending.

---

## Per-page audit
Columns: **decision it helps · data source · real/sim · pays-rent? · verdict**

### Marketing Director (the monetizable core)
| Tab | Helps decide | Data | Real? | Pays rent | Verdict |
|---|---|---|---|---|---|
| **Revenue Intel (MSOS)** | where revenue comes from; what to push | MSOS jobs (live, read-only) | **Real** | ✅ high | **KEEP** (north-star surface) |
| **Viral Intelligence** | what to post, will it pop, where the gaps are | TikTok × Search Console × MSOS | **Real** | ✅ highest | **KEEP** (the differentiator) |
| **TikTok** | what content works | TikTok Display API (live) | **Real** | ✅ | **KEEP** |
| **SEO (Search Console)** | which keywords/cities to win | Search Console (live) | **Real** | ✅ | **KEEP** |
| **GBP Intelligence** | calls/maps/reviews → action | GBP API (pending allowlist) | **Real (gated)** | ✅ | **KEEP** |
| **Review Intel** | praise/complaints → content & responses | owner-entered reviews | **Real** | ◐ medium | **KEEP + IMPROVE** (auto-pull when GBP lands) |
| **Viral Engine** | 11-part content packages from data | MSOS jobs | Real seeds / **template copy** | ◐ | **MERGE → Viral Intelligence** (one place: insight → make it) |
| **Avatar Studio** | shoot-ready video scripts + tool prompts | MSOS subject + brand | Real subject / template scripts | ◐ | **IMPROVE** (seed from winning hooks; wire real video gen) |
| **Automation** | what's live vs planned | static status | n/a (honest) | ◐ | **IMPROVE → publishing roadmap with connect buttons** |

### Original app pages (Layer B)
| Page | Helps decide | Data | Real? | Pays rent | Verdict |
|---|---|---|---|---|---|
| **Home / Dashboard** | "command center" of content items | Firestore content/gbp/seo/tasks | Real but **empty** | ✗ today | **IMPROVE → owner daily home** (revenue + today's 3 priorities + alerts, pulled from Director) |
| **Generator** (/generator) | write a caption/hook | template gen (no LLM) | **Simulated-ish** (templates) | ✗ | **MERGE → Viral Intelligence content engine** |
| **Script** | write a video script | template gen | templates | ✗ | **MERGE → Avatar Studio** |
| **Review** (/review) | draft review replies | template gen | templates | ✗ | **MERGE → Review Intel** |
| **Social** | draft social replies | template gen | templates | ✗ | **MERGE → Review Intel / Engage** (or remove) |
| **Repurpose** | repurpose one asset to many | template gen | templates | ✗ | **MERGE → content engine** |
| **Media** | generate images/video | mock SVG / mock poster | **Simulated** unless keyed | ✗ | **MERGE → Avatar Studio** (real gen only) |
| **GBP** (/gbp studio) | create GBP posts | template + Firestore | templates | ◐ | **MERGE → GBP Intelligence** (analyze + create in one tab) |
| **SEO** (/seo studio) | create SEO/city-page content | template + Firestore | templates | ◐ | **MERGE → SEO (Search Console)** (insight + content in one tab) |
| **Engage** (/engagement) | reply to engagement | template gen | templates | ✗ | **REMOVE** (thin; overlaps Social) |
| **New Job** | single-source: 1 job → many posts | MSOS-ish brand + gen | templates | ◐ | **MERGE → content pipeline** |
| **Tasks** | what to do | Firestore tasks (agent-created) | Real but empty | ◐ | **MERGE → one "Today" view** with Director priorities |
| **Approvals** | approve content before publish | Firestore approvalState | Real (workflow) | ◐ | **KEEP → fold into Content Pipeline** (the real automation loop) |
| **Calendar** | when to publish | Firestore calendar items | Real but empty | ◐ | **KEEP → fold into Content Pipeline** |
| **Library** | content history + performance | Firestore + postPerformance | Real but empty | ◐ | **MERGE → Content Pipeline (history tab)** |
| **Brand** | voice/services/areas config | Firestore brandSettings | **Real** | ✅ (feeds everything) | **KEEP** (consolidate Avatar brand profile here) |
| **Fingerprints** | uniqueness-engine debug view | generation history | Real, internal | ✗ | **REMOVE from nav** (dev tool, zero owner value) |

---

## Verdicts

**KEEP (the product):** Revenue Intel · Viral Intelligence · TikTok · SEO (Search
Console) · GBP Intelligence · Review Intel · Brand. Plus the **publishing workflow**
(Approvals + Calendar + Library) once merged into one pipeline.

**IMPROVE:**
- **Home → the daily owner home:** revenue this week + the top 3 actions + a content
  score widget + alerts. Right now Home is an empty content-item dashboard — it should
  be the first thing they open and the reason they renew.
- **Review Intel:** auto-ingest reviews when GBP allowlisting lands (kill the paste-in).
- **Avatar Studio:** seed scripts from the *winning hooks* (Viral Intel), wire real
  HeyGen/video gen instead of prompts-only.
- **Automation:** turn the status board into real connect buttons + scheduled syncs.

**MERGE (kill the duplicate surfaces):**
- Generator + Script + Repurpose + New Job → **one content engine inside Viral
  Intelligence** ("here's the gap → here's the post, scored").
- GBP studio → **GBP Intelligence**; SEO studio → **SEO tab**; Review generator →
  **Review Intel**; Media → **Avatar Studio**.
- Approvals + Calendar + Library → **one "Content Pipeline"** (generate → approve →
  schedule → publish → measure) — this is the Automation lifecycle made real.

**REMOVE (from nav; keep code):** Fingerprints (dev tool) · Engage (thin/duplicate).
Already removed: the 5 sample Director tabs.

Net: **~24 surfaces → ~9** (Director tabs) **+ Brand + Content Pipeline + Home**. Fewer
doors, every one tied to real data and a decision.

---

## The 10 questions, rolled up to what's missing (the retention gaps)

**7. Missing KPIs:** a single **north-star** ("did marketing make money this week?"),
**content → revenue attribution**, week-over-week deltas, goal/target tracking, and
**cost/profit** (MSOS has cost — surface margin, not just revenue).

**8. Missing automations:** **nightly auto-sync** (TikTok/SC/GBP — today it's manual
"Sync now"); a **Monday digest email** ("your brief + 3 actions"); **alerts** when a
metric drops or a review needs a reply; **auto-draft** the daily content from the gap
engine. Automation is the difference between a tool they check and a tool they trust.

**9. Missing AI recommendations:** one **prioritized "do these 3 today"** that spans all
sources (today it's split across Owner Exec + Viral Intel — consolidate to the Home).
Proactive, not on-demand.

**10. Missing revenue opportunities:** **quantified $ impact** on every recommendation
(some exists — make it everywhere) and **closing the loop**: recommend → generate →
publish → **measure the lift**. Until publish+measure exist (Phase 8), the owner has to
trust estimates; that's the gap between "nice dashboard" and "pay every month."

---

## Founder recommendation (one paragraph)
Stop adding platforms for a beat. **Collapse the app to the Director**, make **Home** the
daily money-and-actions cockpit, merge the content studios into the tabs that already
show the data, and **build the one loop that justifies a subscription: connect → see the
money → get today's 3 moves (scored) → one-click publish → see the lift.** A mobile
service owner won't pay for a caption generator (commodity). They'll pay every month for
the thing that says *"post this in Hollywood today; it'll do ~3.4K views and you make ~$X
per view there."* You already have 80% of that — the work is **subtraction + the publish/
measure loop**, not more dashboards.
