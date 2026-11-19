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
18. **Interactions edit the topology, not a copy.** Tap-to-arbiter, drop, add (diagram), steppers and RAM chips (builder), and click, drag, slider, and jump chip (chart) all call the same immutable topology functions. `toggleArbiter` never turns the last data-bearing member into an arbiter.
19. **Chart pointer handling is our own.** Recharts' click state was unreliable, so the chart maps the pointer position over the plot area to RAM. The slider is the keyboard path.
20. **Text cut.** The explainer and table became four tap-to-expand tiles and a five-row table. Result cards became bars and chips. Chart notes were removed in favor of chips and the legend. The disclaimer is one line.
21. **No new dependencies.** Effects use CSS and the existing Framer Motion. Reduced motion jumps straight to the final value.

## Pool pricing fix (2026-11-19)

22. **The pool is one 256 GB license, priced per license.** Bug report 1: the user set the 256 GB pool to 100,000 but left the other tiers at placeholder values, so the "cheapest" mix became 6 x 128 GB at 2,580. Clarification from the user: one 256 GB RAM pool license lets a customer run any number of nodes as long as their combined RAM stays within 256 GB. Fix: removed the 64 and 128 GB tiers and the knapsack. `poolCover` in `src/calc/ramPool.ts` returns `ceil(total / 256)` licenses. There is one pool price input. Break-even for a full pool is `256 x perNode / pool` GB per node. Presets and tests were re-derived (3 x 16 GB: pool 250 vs per-node 300, 3 nodes up to 85 GB each favor the pool). Consequence: a 3-node replica set below 256 GB total leaves most of the license unused, which the Pool fill meter now shows. The guide's 64 and 128 GB tiers are no longer modeled; confirm with the account team if they exist.

## Not modeled (known gaps)

- Dev/QA and non-prod environments, discounts, support SLA uplift.
- Sharded clusters, config servers, and `mongos` (the guide treats config servers as free).
- Multiple deployments in one estate with grand totals.
- Shareable URL for a configuration.

## Testing

Game tests cover: every intensity threshold boundary (savings and fill), improvement, increase, and unchanged deltas, fill and headroom values, nearest crossover, each badge rule (including Kubernetes forcing the pool), and arbiter toggling guards. Render tests cover the scoreboard golden path ($250 pool versus $300 per-node for 3 x 16 GB, "Saves $50 (17%)", "Idle 19%"), baseline chips, the Kubernetes locked state, compact mode, read-only diagrams, and the interactive chart controls. The click flows were also driven in a real browser (chips, steppers, arbiter toggle, add node, pin baseline, presets, side by side, chart click and drag, jump chip) with no console errors and no horizontal overflow at 390 px.

Core tests cover: per-node license counts (256, 257, 384, 512, 513, 768, 769 GB), arbiters and delayed or hidden members, Kubernetes unavailability, pool license counts (0, 1, 256, 257, 768 GB), pool break-even (102 GB at defaults, 38 GB at 15,000 vs 100,000), Kubernetes pod counting (3 x 32 GB counts 96 GB), crossover detection, recommendation flips, the preset golden path, immutable topology updates, and the slider scale.

## Task log

- 2026-11-19: Initial build of the full app from the approved plan.
- 2026-11-19: Game layer: scoreboard, baseline, badges, interactive diagram and chart, text cut.
- 2026-11-19: Pool is one 256 GB license priced per license; tiers and knapsack removed; tests, presets, docs updated.
