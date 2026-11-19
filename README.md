# MongoDB EA License Calculator

A static site that explains MongoDB Enterprise Advanced (EA) licensing and helps count license eligibility for a single node or a replica set. It compares **per-node** licensing with the **RAM pool**, on **virtual machines** and on **Kubernetes**, and shows where the break-even sits.

> Indicative only. Prices in the app are placeholders, not MongoDB prices. Confirm rules and pricing with your MongoDB account team and order form.

## Features

- Short, tap-to-expand explainer and a compact per-node versus RAM pool table.
- Single node or replica set (1 to 50 members). Roles: primary, secondary, hidden, delayed, arbiter.
- Build fast: quick RAM chips, node steppers, log-scale sliders, and per-member fine-tuning.
- Hosting toggle: **VMs**, **Kubernetes**, or **side by side**.
- **Scoreboard** (see "Game layer"): rolling cost, winner, savings, pinned baseline, battle bars, meters, badges.
- **Interactive diagram**: tap *Arbiter* to toggle a free arbiter, `x` to drop a node, or the dashed ghost card to add one.
  - VMs: the whole VM is the licensed unit, with a notch per 256 GB license.
  - Kubernetes: only each pod's memory limit counts toward the pool. Uncounted worker RAM is hatched.
- **Break-even chart**: click or drag on it (or use the slider) to change RAM per node. Chips show who wins where, with a one-tap jump to the nearest break-even.
- Five presets, editable placeholder prices, and **Export PDF** (browser print to PDF).

## Game layer

Feedback is game-like, but every number is deterministic and traceable to the inputs.

| Element | What it does |
| --- | --- |
| Score | Cost of the cheapest option, counting up from the value currently shown. |
| Baseline | You pin a cost. A chip shows how far you are below or above it. |
| Reward | Particles and a score pop fire only when a change **lowers** cost. A higher cost gets a plain "above baseline" chip. |
| Deal meter | Savings of the winning model: Even, Solid, Hot, Blazing, Max. Locked on Kubernetes (pool only). |
| Pool fill meter | How full the purchased pool licenses are: Idle, Roomy, Good, Great, Packed. Shows free GB. |
| Badges | Sweet spot, Big iron, Packed pool, Free rider, Kube cutter. Unlocked by the current setup only, not by history. |
| Flip chip | A short message when the cheaper model changes. |

Accessibility: reduced motion skips counting, particles and pops. Meters spell out the level in text. One polite status line announces the final result after a short pause. Animations are hidden in the PDF.

## Licensing rules encoded

Source: internal EA Pricing Guide, updated 2026-11-04 (see `spec.md`).

| Rule | Behavior in the app |
| --- | --- |
| Per-node | One license per data-bearing `mongod`, covering up to 256 GB RAM. `ceil(RAM / 256)` licenses per node. |
| RAM pool | One license covers 256 GB of combined data-bearing RAM, spread over any number of nodes. Buy enough licenses for the total (257 GB needs 2). |
| Free | Arbiters. Config servers and `mongos` are not data-bearing. |
| Kubernetes | Per-node is not available. The pool counts each data-bearing container's memory limit, not worker RAM. |
| vCPU | Shown only. It does not affect license counts. |

Scope today: production only. Dev/QA and non-prod pricing differences are not modeled.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run typecheck
npm run build      # static output in dist/
npm run preview
```

Node 20 or newer is recommended.

## Export to PDF

Click **Export PDF**, then choose **Save as PDF** in the print dialog. A print stylesheet hides the controls and lays out a report with the inputs, diagram, results, chart, sources, and disclaimer. Tip: enable "Background graphics" in the dialog so the dark diagram and chart panels keep their colors.

## Project layout

```text
src/
  calc/          pure, immutable calculation functions (no React)
    rules.ts       256 GB cap, pool license size, placeholder prices, sources
    perNode.ts     licenses per node and cost
    ramPool.ts     pool license count and cost, break-even
    k8s.ts         pod memory limits and worker layout
    breakEven.ts   cost curves, crossovers, win regions
    evaluate.ts    evaluation and recommendation
    topology.ts    immutable topology updates
  game/          presentation rules (pure) and animation hooks
  components/    React UI
  presets.ts     scenario presets
  styles.css, print.css
tests/           Vitest unit tests, including the preset golden path
```

## Deploy to Vercel

The site is fully static. `vercel.json` sets the Vite framework and the `dist` output directory.

```bash
npx vercel          # preview
npx vercel --prod   # production
```

Live: https://ea-license-calculator.vercel.app (Vercel team `guide-v`, deployed with the CLI; the GitHub repo is not yet connected for auto-deploys).

Or import the repository in Vercel and keep the defaults. If prices or rules are updated to real figures, consider protecting the deployment (Vercel password protection or SSO), because internal pricing should not be public.

## Keeping prices current

Edit placeholder prices in the UI. Set the per-node price and the price of one 256 GB RAM pool license. Or change `DEFAULT_PRICES` in `src/calc/rules.ts`. Only the ratio between the two prices drives the break-even point (average RAM per node of 256 x per-node price / pool price, when the pool is full). Update `spec.md` when rules change.
