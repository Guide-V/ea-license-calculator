import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { evaluate, recommend, type Recommendation } from "../calc/evaluate";
import { billableMembers } from "../calc/members";
import type { PerNodeResult } from "../calc/perNode";
import type { PoolCover } from "../calc/ramPool";
import { POOL_LICENSE_GB } from "../calc/rules";
import type { Model, Prices, Topology } from "../calc/types";
import { useDebounced, useImprovementBurst, useWinnerFlip } from "../game/hooks";
import {
  achievements,
  FILL_LEVELS,
  getDelta,
  perNodeHeadroomGB,
  poolFillPct,
  poolHeadroomGB,
  SAVINGS_LEVELS,
} from "../game/presentation";
import { gb, money, plural } from "../ui/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { Burst } from "./Burst";
import { Meter } from "./Meter";

type Props = {
  readonly topology: Topology;
  readonly prices: Prices;
  /** Compact hides pinning, badges, and the flip toast (used side by side). */
  readonly compact?: boolean;
  readonly baseline?: number | null;
  readonly onPin?: (cost: number) => void;
  readonly onClearBaseline?: () => void;
};

const MODEL_LABEL = (winner: Model | "tie"): string =>
  winner === "perNode" ? "Per-node" : winner === "ramPool" ? "RAM pool" : "Tie";

const mixText = (pool: PoolCover): string =>
  pool.licenses === 0 ? "none" : `${pool.licenses} x ${POOL_LICENSE_GB} GB`;

const perNodeTag = (perNode: Extract<PerNodeResult, { available: true }>): string =>
  perNode.nonProdLicenses === 0
    ? plural(perNode.licenses, "license")
    : `${perNode.prodLicenses} prod + ${perNode.nonProdLicenses} non-prod`;

const verdictText = (recommendation: Recommendation, fmt: (value: number) => string): string =>
  recommendation.forced
    ? "RAM pool is the only option on Kubernetes"
    : recommendation.winner === "tie"
      ? "Both models cost the same"
      : `${MODEL_LABEL(recommendation.winner)} wins, saves ${fmt(recommendation.savings)} (${recommendation.savingsPct.toFixed(0)}%)`;

function Combo({ topology, pool }: { readonly topology: Topology; readonly pool: PoolCover }) {
  const nodes = billableMembers(topology);
  const sizes = new Set(nodes.map((node) => node.ramGB));
  const first = nodes[0];
  const uniform = sizes.size === 1 && first !== undefined;
  return (
    <div className="combo" aria-label="How the pool is counted">
      <span className="chip">{plural(nodes.length, "node")}</span>
      {uniform && (
        <>
          <span className="op">x</span>
          <span className="chip">{gb(first.ramGB)}</span>
        </>
      )}
      <span className="op">=</span>
      <span className="chip chip-strong">{gb(pool.totalGB)}</span>
      <span className="op">to</span>
      <span className="chip chip-hero">{mixText(pool)}</span>
    </div>
  );
}

function BattleBar({
  label,
  cost,
  max,
  tag,
  locked,
  winner,
  currency,
}: {
  readonly label: string;
  readonly cost: number | null;
  readonly max: number;
  readonly tag: string;
  readonly locked: boolean;
  readonly winner: boolean;
  readonly currency: string;
}) {
  const width = cost === null || max === 0 ? 0 : Math.max(4, (cost / max) * 100);
  return (
    <div className={winner ? "battle battle-win" : locked ? "battle battle-locked" : "battle"}>
      <div className="battle-head">
        <span>{label}</span>
        <span className="battle-cost">{locked ? "Not available" : money(cost ?? 0, currency)}</span>
      </div>
      <div className="battle-track" aria-hidden="true">
        <motion.div
          className="battle-fill"
          initial={false}
          animate={{ width: `${locked ? 0 : width}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        />
      </div>
      <span className="battle-tag">{winner ? `Cheapest · ${tag}` : tag}</span>
    </div>
  );
}

export function Scoreboard({ topology, prices, compact = false, baseline = null, onPin, onClearBaseline }: Props) {
  const evaluation = evaluate(topology, prices);
  const recommendation = recommend(evaluation);
  const { perNode, pool } = evaluation;
  const fmt = useCallback((value: number) => money(value, prices.currency), [prices.currency]);

  const best = recommendation.cost;
  const burst = useImprovementBurst(best);
  const flip = useWinnerFlip(recommendation.winner, !recommendation.forced && !compact, MODEL_LABEL);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (burst === 0) return undefined;
    setPop(true);
    const timer = setTimeout(() => setPop(false), 450);
    return () => clearTimeout(timer);
  }, [burst]);
  const delta = baseline === null ? null : getDelta(best, baseline);
  const announced = useDebounced(`${verdictText(recommendation, fmt)}. Best cost ${fmt(best)} per year.`, 600);

  const fill = poolFillPct(pool);
  const headroom = poolHeadroomGB(pool);
  const badges = achievements(topology, evaluation, recommendation);
  const unlocked = badges.filter((badge) => badge.unlocked).length;
  const maxCost = Math.max(perNode.available ? perNode.cost : 0, pool.cost);

  return (
    <section className={compact ? "scoreboard scoreboard-compact" : "scoreboard"} aria-label="Scoreboard">
      <div className="score-top">
        <span className="score-label">{recommendation.forced ? "Pool cost" : "Best deal"}</span>
        {!compact && onPin && (
          <button
            type="button"
            className="btn-ghost no-print"
            onClick={() => (baseline === null ? onPin(best) : onClearBaseline?.())}
            aria-pressed={baseline !== null}
          >
            {baseline === null ? "Pin as baseline" : `Baseline ${fmt(baseline)} (unpin)`}
          </button>
        )}
      </div>

      <div className="score-main">
        <Burst burstKey={burst} />
        <p className={pop ? "score score-pop" : "score"}>
          <AnimatedNumber value={best} format={fmt} />
          <span className="per">/ year</span>
        </p>
        <span className={recommendation.winner === "tie" ? "pill" : "pill pill-hero"}>
          {recommendation.forced ? "RAM pool only" : MODEL_LABEL(recommendation.winner)}
        </span>
      </div>

      <div className="chip-row">
        {!recommendation.forced && recommendation.winner !== "tie" && (
          <span className="chip chip-save">
            Saves {fmt(recommendation.savings)} ({recommendation.savingsPct.toFixed(0)}%)
          </span>
        )}
        {delta && delta.type === "improvement" && <span className="chip chip-save">{fmt(delta.amount)} below baseline</span>}
        {delta && delta.type === "increase" && <span className="chip chip-up">{fmt(delta.amount)} above baseline</span>}
        {delta && delta.type === "same" && <span className="chip">Same as baseline</span>}
        <AnimatePresence>
          {flip && (
            <motion.span
              key={flip}
              className="chip chip-flip no-print"
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {flip}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <Combo topology={topology} pool={pool} />

      <div className="battles">
        <BattleBar
          label="Per-node"
          cost={perNode.available ? perNode.cost : null}
          max={maxCost}
          tag={perNode.available ? perNodeTag(perNode) : "pool only on Kubernetes"}
          locked={!perNode.available}
          winner={recommendation.winner === "perNode"}
          currency={prices.currency}
        />
        <BattleBar
          label="RAM pool"
          cost={pool.cost}
          max={maxCost}
          tag={mixText(pool)}
          locked={false}
          winner={recommendation.winner === "ramPool"}
          currency={prices.currency}
        />
      </div>

      <div className="meters">
        <Meter
          label="Deal"
          value={recommendation.savingsPct}
          levels={SAVINGS_LEVELS}
          disabledText={recommendation.forced ? "No choice on Kubernetes" : undefined}
        />
        <Meter
          label="Pool fill"
          value={fill}
          levels={FILL_LEVELS}
          detail={
            pool.coveredGB === 0
              ? undefined
              : `${gb(headroom)} free in the pool` +
                (perNode.available ? ` · ${gb(perNodeHeadroomGB(topology))} free per node` : "")
          }
        />
      </div>

      {!compact && (
        <div className="badges no-print">
          <span className="badges-count">
            Badges {unlocked}/{badges.length}
          </span>
          <ul>
            {badges.map((badge) => (
              <motion.li
                key={`${badge.id}-${badge.unlocked}`}
                className={badge.unlocked ? "badge-on" : "badge-off"}
                title={badge.hint}
                initial={badge.unlocked ? { scale: 0.6, opacity: 0.4 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
              >
                {badge.label}
                <span className="sr-only">{badge.unlocked ? " (unlocked)" : ` (locked: ${badge.hint})`}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <p className="sr-only" role="status">
          {announced}
        </p>
      )}
    </section>
  );
}
