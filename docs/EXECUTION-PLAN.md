# Content OS — Sequenced Execution Plan (impact-per-effort)

Goal: a product a mobile service owner **pays for every month**. Not more features —
the one loop: **connect → see the money → get today's 3 scored moves → publish → see
the lift.** Sequencing rule: **subtract first, make the daily home indispensable, earn
trust with automation, then close the publish/measure loop. Scale platforms last.**

Effort key: **S** = hours–1 day · **M** = 2–4 days · **L** = 1–2 weeks (often gated by
an external approval). "Metric" = how we know it worked.

---

## WAVE 0 — Subtract & consolidate · effort S · do this first
Highest impact-per-effort: less confusion, less to maintain, a legible value prop. No
new data, mostly routing + moving existing components.

1. **Remove from nav:** Fingerprints (dev tool), Engage (thin duplicate). *(S)*
2. **Merge the content studios into the tabs that already show their data:**
   - Generator / Script / Repurpose / New Job → one **content engine inside Viral
     Intelligence** (insight → "make this post," scored).
   - GBP studio → **GBP Intelligence** · SEO studio → **SEO tab** · Review generator →
     **Review Intel** · Media → **Avatar Studio**. *(M, but pure consolidation)*
3. **Collapse Approvals + Calendar + Library → one "Content Pipeline"** surface
   (generate → approve → schedule → publish → measure). *(M)*
- **Metric:** nav doors 24 → ~12; every remaining door maps to one decision on real data.
- **Risk:** none structural (subtraction). Keep code; just stop routing to it.

## WAVE 1 — Home becomes the cockpit (+ profit) · effort M · the "renew" surface
Home is the first thing they open and the reason they keep paying. Today it's an empty
content-item dashboard. Rebuild it (from existing live data — no new sources):

1. **Top strip:** Revenue + **Profit** (MSOS already has cost — show margin, not just
   revenue), Jobs, Avg ticket, Growth WoW. *(profit = S, the data's already synced)*
2. **"Your 3 moves today"** — one prioritized list spanning revenue + Viral Intel +
   reviews (consolidate the split recommendations into one ranked feed). *(M)*
3. **Content score widget** inline (paste a hook → Low/Med/High/Viral). *(S, reuse Phase 9)*
4. **Alerts:** "calls down 20% WoW", "3 reviews unanswered", "Miami revenue up, no content."
- **Metric:** DAU/WAU up; "opened Home" is the session start; time-to-first-action < 30s.
- **Why now:** highest retention lever, all data already live, no external blockers.

## WAVE 2 — Trust automations · effort M · "a tool they rely on"
This is the line between "a dashboard they check" and "a service they trust."

1. **Nightly auto-sync** (scheduled function) for TikTok / Search Console / GBP — kill
   the manual "Sync now." *(M)*
2. **Monday digest email:** "Your week + your 3 moves" (the Home cockpit, emailed). *(M)*
3. **Drop/opportunity alerts:** metric down, review needs reply, revenue-rich city with
   no content. *(S once Home alerts exist)*
- **Metric:** email open/click rate; % of weeks the owner takes ≥1 recommended action.
- **Dependency:** Wave 1 (the content of the digest = the cockpit).

## WAVE 3 — Close the revenue loop · effort L · the moat + the monetization
Today you **recommend** but can't **publish + measure**. Closing this is what turns
estimates into proof and "nice tool" into "pay every month."

1. **Publish** from the Content Pipeline → TikTok / GBP (write). *(L — gated: TikTok
   Content Posting API review, GBP allowlist; the Phase-8 seam + Approval/Calendar exist)*
2. **Measure lift:** tie a published post → views → calls/leads → MSOS revenue, and show
   "this post drove ~$X." *(M once publish + attribution exist)*
3. **Auto-draft the daily content** from the gap engine, queued for one-click approve+publish.
- **Metric:** the killer one — **revenue attributable to content created in-app.** That
  number is the renewal argument.
- **Risk/blocker:** platform write-API approvals (start the requests early, in parallel).

## WAVE 4 — Scale platforms · effort S each · only after the core retains
Instagram / YouTube / Facebook are **cheap** on the social framework (a connector +
secrets), and **GBP goes live** when allowlisting clears. But they multiply *reach of an
already-retaining loop* — they don't create retention. Do them after Waves 1–2 prove the
core holds.
- **Metric:** incremental connected platforms per account; they should *raise* the
  Wave-1/2 numbers, not be the headline.

---

## What I'd do literally first (highest leverage)
**Wave 0 + the profit KPI + the "3 moves" on Home.** ~1 focused build: subtract the
dead doors, add Profit (data's already there), and make Home the single cockpit. It
costs little, immediately makes the product feel like *one* product, and gives the owner
a reason to open it daily — before we spend on the expensive publish/measure loop.

## Activation & monetization (founder note)
- **Aha moment to optimize for:** *connect MSOS + one platform → Home shows your money +
  3 scored moves.* Get a new owner there in < 5 minutes.
- **Value metric to price on:** revenue/decisions, not seats or generations. The
  willingness-to-pay lives in "where's my next $10K," not "captions generated."
- **Don't ship** a paid tier on Layer B (content generation) alone — it's commodity and
  will anchor price low. Price on the Director outcome.

## Parallel, non-blocking
- Submit/await **GBP allowlisting** and **TikTok Content Posting API** review now (Wave 3
  depends on them; lead times are days–weeks).
- Decide whether to **remove the unused LLM/video Cloud Functions** (placeholder secrets)
  for a zero-placeholder system, or wire a real key when generation quality matters.
