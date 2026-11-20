# Spec and decisions

Record of what was built, and why. Updated on every task.

## Goal

A static site that helps customers and field teams understand MongoDB EA licensing and count license eligibility for single nodes and replica sets, with a clear per-node versus RAM pool comparison, a break-even view, a VM versus Kubernetes distinction, and PDF export.

## Fact check (Glean, 2026-11-19)

| Source | Date | Confidence | Used for |
| --- | --- | --- | --- |
| Enterprise Advanced Pricing Guide (internal spreadsheet) | updated 2026-11-04 | High | All rules, tiers, examples, break-even remarks |
| EA RAM Pool Licensing Clarification (internal customer message) | undated | Medium | Kubernetes counts pod memory limits, not worker RAM |
| MongoDB EA - KD (internal deck) | undated | Medium | Ops Manager included with the pool |
| MongoDB Price Book | 2017 | Low | Only the "mongos and Ops Manager servers are free" rule |

Rejected or flagged:

- A Glean Assistant summary said per-node is attractive for small RAM. That is backwards. The guide says the pool "makes sense below ~27, 30, 38 GB" per node.
- An AI-generated Glean artifact claimed per-node "is now allowed on Kubernetes". The guide says "In case of Containerized deployment, RAM Pool is the only option". The guide wins.
- The guide footnote "784 GB would require 3 licenses" is a typo. The app uses `ceil(RAM / 256)`, so 784 GB needs 4.

## Decisions

1. **Per-node is `ceil(RAM / 256)` licenses per data-bearing node.** Primary, secondary, hidden, and delayed members count. Why: the guide says each `mongod` is one license, covers up to 256 GB, and delayed nodes are charged in its examples. Hidden members are not called out; treating them as data-bearing is the safe reading.
2. **RAM pool is a 256 GB license, not a per-GB price.** One pool license covers 256 GB of combined data-bearing RAM over any number of nodes, so cost is `ceil(total GB / 256) x price`. Superseded on 2026-11-19 (decision 22): this replaces the earlier 64/128/256 GB tier model.
3. **Kubernetes is pool-only and counts pod memory limits.** This replaces the earlier "pod basis versus worker basis" toggle. Why: the guide says containers cannot use per-node, and the clarification message counts container limits, not worker RAM. Worker RAM is still drawn (hatched) to explain why it is not counted.
4. **Prices are neutral placeholders, editable, with a banner.** Defaults are per-node 100 and one 256 GB pool license 250 (changed on 2026-11-19, decision 22). Why: the real guide is internal and the site may be public. Only the ratio matters, and 250 makes small replica sets favor the pool and big nodes favor per-node.
5. **Prod only.** No dev/QA, non-prod, or discount modeling. Why: chosen scope. The guide prices non-prod differently (dev/QA free, other non-prod about half for per-node, the pool is the same for any environment), so a future version could add an environment selector.
6. **vCPU is informational.** Why: no vCPU term exists in either licensing model.
7. **The chart assumes identical members at the average RAM.** It shows a note when members differ. Why: both models depend on the total and the per-node RAM, and a 2D curve needs one RAM value per node. The "you are here" dots use the real cost.
8. **Break-even is found on a 1 GB sampled curve up to 1,024 GB.** Both models are step functions, so there can be several crossovers. The chart lists them as win regions and marks crossovers, rather than quoting one number. Why: a single analytic formula is only valid when the pool license is exactly full.
9. **Preset kept at 3 x 16 GB.** The plan said "3 members with 32 GB". Both sizes fit one pool license under the current model, so 16 GB stays as the default preset.
10. **PDF through the browser print dialog with a print stylesheet.** Why: sharp text and vector charts, no extra libraries, nothing to maintain. Trade-off: the user chooses "Save as PDF" and enables background graphics.
11. **Pure, immutable calculation layer.** `src/calc` has no React and no mutation of inputs (the knapsack table is built with local mutation inside one function, which is not visible to callers). Why: the guidance to prefer functional style, and so the golden path can be unit-tested directly.
12. **Vite, React, TypeScript, Recharts, Framer Motion, Vitest.** Static `dist/` for Vercel. Why: simplest static build with strong typing and a charting library that supports step lines and reference areas.
13. **MongoDB palette.** Off White canvas, Slate and Evergreen foundations, Chartreuse as the single hero accent (boundaries, recommendation, break-even markers), Spring Green for counted or positive. Meaning is never color only (labels, dashes, hatching). Condensed display font for headings, system sans for body.

## Game layer (added 2026-11-19)

Request: less text, more interaction, gamification.

14. **What is rewarded: lower cost and fuller pool licenses.** Particles, score pop, and the "below baseline" chip only appear when cost goes down. A higher cost shows a neutral "above baseline" chip. Why: gamify saving money, never a larger bill.
15. **Deterministic by construction.** Intensity levels, deltas, fill, headroom, and badges are pure functions in `src/game/presentation.ts`. No randomness touches a calculation. Badges depend only on the current setup, so the same inputs always show the same badges. Particles and timers live in hooks and components only.
16. **User-controlled baseline.** "Pin as baseline" stores a number the user chose. It is the honest reference for the reward, instead of a hidden target.
17. **Two meters, not one.** "Deal" (savings of the winner) is meaningless on Kubernetes where there is no choice, so it is shown as locked there. "Pool fill" works everywhere and rewards using what you buy.
18. **Interactions edit the topology, not a copy.** Tap non-prod, drop, add (diagram), steppers and RAM chips (builder), and click, drag, slider, and jump chip (chart) all call the same immutable topology functions. `toggleArbiter` never turns the last data-bearing member into an arbiter.
19. **Chart pointer handling is our own.** Recharts' click state was unreliable, so the chart maps the pointer position over the plot area to RAM. The slider is the keyboard path.
20. **Text cut.** The explainer and table became four tap-to-expand tiles and a five-row table. Result cards became bars and chips. Chart notes were removed in favor of chips and the legend. The disclaimer is one line.
21. **No new dependencies.** Effects use CSS and the existing Framer Motion. Reduced motion jumps straight to the final value.

## Pool pricing fix (2026-11-19)

22. **The pool is one 256 GB license, priced per license.** Bug report 1: the user set the 256 GB pool to 100,000 but left the other tiers at placeholder values, so the "cheapest" mix became 6 x 128 GB at 2,580. Clarification from the user: one 256 GB RAM pool license lets a customer run any number of nodes as long as their combined RAM stays within 256 GB. Fix: removed the 64 and 128 GB tiers and the knapsack. `poolCover` in `src/calc/ramPool.ts` returns `ceil(total / 256)` licenses. There is one pool price input. Break-even for a full pool is `256 x perNode / pool` GB per node. Presets and tests were re-derived (3 x 16 GB: pool 250 vs per-node 300, 3 nodes up to 85 GB each favor the pool). Consequence: a 3-node replica set below 256 GB total leaves most of the license unused, which the Pool fill meter now shows. The guide's 64 and 128 GB tiers are no longer modeled; confirm with the account team if they exist.
23. **The mixed-size chart note is back.** Decision 7 said the break-even chart assumes identical members at the average RAM and shows a note when members differ. Decision 20 removed chart notes in favor of chips and the legend. That left the You dot unexplained: with 512 + 16 + 16 GB the real per-node cost is 4 licenses, while the curve at the average (about 181 GB) shows 3. The note returns only in that case, as one line under the chart: the curve assumes equal-size members and the dot shows the real cost. The old multi-note block stays gone.

## Non-prod nodes (2026-11-20)

24. **Each data-bearing member is prod or non-prod.** Request: add a non-prod node license at half the prod price, let "Add node" add non-prod nodes, and have the RAM pool treat every node the same. Implementation: `Member.env` ("prod" | "nonprod", default prod), `NONPROD_PRICE_FACTOR = 0.5` in `src/calc/rules.ts`. Per-node cost is `sum(ceil(RAM / 256) x perNodePrice x factor)`, so a big non-prod node still needs one half-price license per 256 GB. The pool ignores `env`: total RAM is the same sum as before. Why a constant and not a price input: the request fixed it at half. If the ratio changes, make it a field on `Prices`. The VM diagram has two add buttons (prod, non-prod) and a "Non-prod" toggle per node. Kubernetes shows no environment, because per-node is unavailable there and the pool does not care. The break-even chart takes `nonProdCount`, so its per-node line uses the same weighted node count. A new preset (3 prod + 2 non-prod, 64 GB) shows per-node winning, 400 vs 500, where all-prod ties.

## Arbiters removed (2026-11-20)

25. **Arbiters are not offered.** Request: do not encourage arbiters because of `w:1` (majority write concern) requirements. Every member is now a data-bearing, licensed `mongod`. Removed: the `arbiter` role, `isDataBearing`, `toggleArbiter`, the last-data-member guards, the Arbiter button and role option, the "Add arbiter" button, the "Free rider" badge, the "2 data nodes + arbiter" preset, the Learn "Free" tile (replaced by "Non-prod"), and the PDF "Counted" column. Why remove the code and not just hide the UI: dead paths drift and need tests. Arbiters were free under both models, so restoring them is a revert of this change. Supersedes the arbiter parts of decisions 18 and 24.

## Solutions architect review, realistic ratio, and multi-cluster environments (2026-11-20)

26. **Default placeholder ratio aligned with real EA economics (100 vs 640, 6.4x ratio, 40 GB per node break-even).** Supersedes the default price ratio in decisions 4 and 22. The previous 100 vs 250 placeholder (2.5x, 102 GB per node break-even) made typical 3 x 64 GB VMs favor the RAM pool, which misled readers relative to real EA economics (about 38 to 40 GB per node). `PricingPanel` now opens by default, shows the live pool-to-node ratio and break-even rule of thumb (`poolBreakEvenGB`), and offers three ratio presets (Typical 6.4x at 40 GB, Mid 4x at 64 GB, Low 2.5x at 102 GB).
27. **Multi-cluster environment counts (`clusters` and `nonProdClusters` on `Topology`).** Customers rarely buy a RAM pool for one small replica set. They pool across many small clusters or separate prod and non-prod replica sets. Adding `clusters` (prod deployments) and `nonProdClusters` (separate non-prod deployments at 50% per-node, full RAM in pool) models multi-cluster deployments without placing non-prod nodes inside a prod replica set. Per-member `env` stays available in fine-tuning for edge cases. Presets cover five real scenarios: 4 replica sets at 16 GB (default), 1 replica set at 32 GB, large 192 GB nodes, 2 prod plus 3 non-prod sets at 32 GB, and 3 Kubernetes pods at 32 GB.
28. **Decision rationale (`recommendation.reason`) and 256 GB step alerts shown in UI and PDF.** `recommend()` already computed why a model won, but `Scoreboard` and `PrintSummary` never rendered it. Both now show the plain-English reason, pool headroom expressed in free extra deployments, and `cliffAlerts()` warnings when a node or pool just crossed or is within 16 GB of a 256 GB boundary.
29. **Kubernetes Break-Even chart hides per-node comparisons.** Previously `BreakEvenChart` still rendered per-node win-region chips and a "Jump to break-even" button on Kubernetes, contradicting the pool-only rule. On Kubernetes it now shows only the RAM pool step curve and the next 256 GB pool step threshold. In Side-by-side mode it notes that the break-even curve applies to VMs only.
30. **Planning checklist, surfaced guidance, and copy cleanup.** Added `DecisionChecklist.tsx` (12 to 24 month roadmap toggles for Kubernetes migration, growing RAM per node, and multi-cluster growth) plus a "Not counted as data-bearing" box (`mongos`, config servers, Ops Manager servers, vCPU, Kubernetes worker RAM). In `Learn.tsx`, the Per-node vs pool table is now the default tab and the Rules tab displays all 5 rule cards without requiring clicks. In `Presets.tsx`, the active preset's takeaway renders as visible text. `PrintSummary.tsx` now includes a decision summary, environment breakdown, planning notes, and key licensing rules. The builder fieldset uses the label "Environment count" for clarity, and copy across the app and docs uses plain sentences without em dashes, en dashes, or inline-header colons.

## Not modeled (known gaps)

- Free dev/QA environments, volume discounts, and support SLA uplifts. Separate non-prod clusters and non-prod members at half price are modeled (decisions 24 and 27).
- Heterogeneous multi-cluster estates where each cluster has a different shape. The environment count scales prod and non-prod deployments of the configured topology shape.
- Shareable URL for a configuration.

## Testing

Game tests cover every intensity threshold boundary (savings and fill), improvement, increase, and unchanged deltas, fill, headroom, extra deployments in pool headroom, nearest crossover, and each badge rule (including Kubernetes forcing the pool). Render tests cover the scoreboard golden path ($640 pool versus $1,200 per-node for 4 replica sets at 16 GB, "Saves $560 (47%)", "Good · 75%", "64 GB free in the pool (fits 1 more deployment at $0)", rendered `recommendation.reason`, and 256 GB step alerts), baseline chips, the Kubernetes locked state, compact mode, read-only diagrams, environment count labels, interactive VM chart controls, Kubernetes chart hiding per-node controls, visible preset takeaway, default Learn comparison table, open PricingPanel ratio rule, DecisionChecklist notes, and PrintSummary decision summary.

Core tests cover per-node license counts (256, 257, 384, 512, 513, 768, 769 GB), delayed and hidden members, Kubernetes unavailability, pool license counts (0, 1, 256, 257, 768 GB), pool break-even (40 GB at defaults, 38.4 GB at 15,000 vs 100,000), Kubernetes pod counting (3 x 32 GB counts 96 GB), crossover detection, recommendation flips, step alerts, planning notes, separate prod and non-prod deployment counts, the preset golden path, immutable topology and environment updates (`setClusters`, `setNonProdClusters`), the slider scale, the member slider staying on `MAX_MEMBERS`, the mixed-size chart note, and generic public source titles.

## Task log

- 2026-11-20: Unslopped frontend copy, `README.md`, and `spec.md`, and renamed the builder section to "Environment count" (decision 30).
- 2026-11-20: Added realistic 6.4x default price ratio (40 GB per node break-even), open PricingPanel with ratio presets, multi-cluster prod and non-prod counts, rendered `recommendation.reason` and 256 GB step alerts, Kubernetes chart fix, planning checklist, surfaced Learn table and preset takeaways, and PDF decision summary (decisions 26 to 30).
- 2026-11-20: Arbiters removed from the app (decision 25).
- 2026-11-20: Non-prod nodes at half price per-node, same entitlement in the pool, add buttons, toggle, preset, tests.
- 2026-11-19: Pool is one 256 GB license priced per license; tiers and knapsack removed; tests, presets, docs updated.
- 2026-11-19: Deployed to Vercel (team guide-v, project ea-license-calculator) with the CLI. Why CLI: linking the GitHub repo failed because the Vercel GitHub app lacks access to the Guide-V org, so pushes do not auto-deploy yet.
- 2026-11-19: Quick fixes. Role changes go through `updateMember`, which now refuses to turn the last data-bearing member into an arbiter (the diagram already used `toggleArbiter`). The member slider uses `MAX_MEMBERS` and ignores a thumb that is only clamped below the real count. The mixed-size chart note is reinstated (decision 23). Shipped source lines use generic titles. CI runs install, test, typecheck, and build. MIT license added.
