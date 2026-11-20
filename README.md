# MongoDB EA license calculator

A static site that explains MongoDB Enterprise Advanced (EA) licensing and helps you choose between per-node licensing and the RAM pool across single nodes, replica sets, multi-cluster deployments, virtual machines, and Kubernetes.

> Indicative only. Prices in the app are editable placeholders (default 6.4x pool-to-node ratio, 40 GB per node full-pool break-even), not MongoDB prices. Enter your quote and confirm rules and pricing with your MongoDB account team and order form.

## Features

- **Decision table up front.** Loads with a per-node versus RAM pool comparison table, plus a Rules and free components tab (`mongos`, config servers, and Ops Manager do not need data-bearing licenses).
- **Topology and environment count.** Model a single node or a replica set (1 to 50 members per deployment), scaled across prod and separate non-prod deployments (1 to 50 each). Roles cover primary, secondary, hidden, and delayed. Arbiters are not offered.
- **Fast sizing.** Quick RAM chips, steppers, log-scale sliders, and per-member fine-tuning.
- **Visible price ratio controls.** Open-by-default Prices and ratio panel with a live break-even rule of thumb and ratio presets (Typical 6.4x at 40 GB, Mid 4x at 64 GB, Low 2.5x at 102 GB).
- **Hosting toggle.** Switch between Virtual machines, Kubernetes, and Side by side.
- **Scoreboard and rationale.** Rolling annual cost, winner, plain-English reason, 256 GB step-boundary alerts, pinned baseline, battle bars, Deal and Pool fill meters (including how many extra deployments fit at $0), and deterministic badges.
- **Interactive diagram.** Tap Non-prod to switch a VM to half price, `x` to drop a node, or a ghost card to add a prod or non-prod node. Displays a deployment count badge when scaling across clusters.
  - On VMs, the whole VM is the licensed unit, with a notch per 256 GB license.
  - On Kubernetes, only each data-bearing pod's memory limit counts toward the pool, not memory requests or worker RAM. Uncounted worker RAM appears hatched.
- **Break-even and cost curve chart.** Click or drag on the chart, or use the slider, to change RAM per node. On VMs, chips show win regions and jump to the nearest break-even. On Kubernetes, the chart hides per-node comparisons and shows RAM pool cost steps only.
- **Beyond Day-1 cost.** Planning checklist for Kubernetes migration, vertical RAM growth, and multi-cluster growth, plus a list of components that do not need data-bearing licenses.
- **Presets and PDF export.** Five presets with visible takeaways, plus Export PDF via browser print with a decision summary, inputs, diagram, chart, rules, and disclaimer.

## Game layer

Feedback is game-like, and every number comes directly from your inputs.

| Element | What it does |
| --- | --- |
| Score | Cost of the cheapest option, counting from the value currently shown. |
| Baseline | You pin a cost. A chip shows how far you sit below or above it. |
| Reward | Particles and a score pop fire only when a change lowers cost. A higher cost shows a plain "above baseline" chip. |
| Deal meter | Savings of the winning model: Even, Solid, Hot, Blazing, Max. Locked on Kubernetes because only the pool applies. |
| Pool fill meter | How full the purchased pool licenses are: Idle, Roomy, Good, Great, Packed. Shows free GB and how many extra identical deployments fit at $0. |
| Badges | Sweet spot, Big iron, Packed pool, Kube cutter. Depend only on the current setup, not history. |
| Flip chip | Short message when the cheaper model changes. |

Reduced motion skips counting, particles, and pops. Meters spell out the level in text. One polite status line announces the final result after a short pause. The print stylesheet hides animations in the PDF.

## Licensing rules encoded

Source: internal EA Pricing Guide, updated 2026-11-04 (see `spec.md`).

| Rule | Behavior in the app |
| --- | --- |
| Per-node | One license per data-bearing `mongod`, covering up to 256 GB RAM. Uses `ceil(RAM / 256)` licenses per node. |
| RAM pool | One license covers 256 GB of combined data-bearing RAM across any number of nodes or clusters. Total licenses equal `ceil(total GB / 256)`. |
| Non-prod | Non-prod deployments and non-prod nodes cost 50% of a prod node license with the same 256 GB cap. The RAM pool counts prod and non-prod RAM at full weight. |
| Kubernetes | Per-node is not available. The pool counts each data-bearing container's memory limit, not requests or worker RAM. |
| Free components | Query routers (`mongos`), config servers (CSRS), and Ops Manager servers do not need data-bearing licenses. |
| vCPU | Informational only. Does not affect license counts. |

Scope note: the app models prod and 50% non-prod licensing across single or multi-cluster deployments of the same shape. It does not model free dev/QA tiers, volume discounts, or support SLA uplifts.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run typecheck
npm run build      # static output in dist/
npm run preview
```

Use Node 20 or newer.

## Export to PDF

Click Export PDF, then choose Save as PDF in the print dialog. The print stylesheet hides interactive controls and lays out a report with the decision summary, inputs, diagram, results, chart, rules, sources, and disclaimer. Enable "Background graphics" in the dialog so the dark diagram and chart panels keep their colors.

## Project layout

```text
src/
  calc/          pure, immutable calculation functions (no React)
    rules.ts       256 GB cap, pool license size, placeholder prices, ratio presets, sources
    perNode.ts     licenses per node and cost
    ramPool.ts     pool license count, cost, and break-even
    k8s.ts         pod memory limits and worker layout
    breakEven.ts   cost curves, crossovers, and win regions
    evaluate.ts    evaluation, recommendation, step alerts, and planning notes
    topology.ts    immutable topology and environment count updates
  game/          presentation rules (pure) and animation hooks
  components/    React UI
  presets.ts     scenario presets
  styles.css, print.css
tests/           Vitest unit tests, including the preset golden path
```

## Deploy to Vercel

The site is static. `vercel.json` sets the Vite framework and the `dist` output directory.

```bash
npx vercel          # preview
npx vercel --prod   # production
```

Live at https://ea-license-calculator.vercel.app (Vercel team `guide-v`, deployed with the CLI because the GitHub repo is not yet connected for auto-deploys).

You can also import the repository in Vercel and keep the defaults. If you replace placeholders with real prices, protect the deployment with Vercel password protection or SSO so internal pricing stays private.

## Keeping prices current

Edit placeholder prices in the UI to set the per-node price and the price of one 256 GB RAM pool license, or change `DEFAULT_PRICES` in `src/calc/rules.ts`. Only the ratio between the two prices drives the break-even point (average RAM per node of `256 * perNode / pool`, when the pool is full). Update `spec.md` when rules change.
