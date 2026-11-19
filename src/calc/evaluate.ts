import { totalDataRamGB } from "./members";
import { perNodeCost, type PerNodeResult } from "./perNode";
import { poolCover, type PoolCover } from "./ramPool";
import type { Model, Prices, Topology } from "./types";

export type Evaluation = {
  readonly perNode: PerNodeResult;
  readonly pool: PoolCover;
};

export const evaluate = (topology: Topology, prices: Prices): Evaluation => ({
  perNode: perNodeCost(topology, prices),
  pool: poolCover(totalDataRamGB(topology), prices),
});

export type Recommendation = {
  readonly winner: Model | "tie";
  /** True when per-node licensing is not an option at all (Kubernetes). */
  readonly forced: boolean;
  readonly cost: number;
  readonly otherCost: number | null;
  readonly savings: number;
  readonly savingsPct: number;
  readonly reason: string;
};

export const recommend = (evaluation: Evaluation): Recommendation => {
  const { perNode, pool } = evaluation;
  if (!perNode.available) {
    return {
      winner: "ramPool",
      forced: true,
      cost: pool.cost,
      otherCost: null,
      savings: 0,
      savingsPct: 0,
      reason:
        "The pool counts each pod's memory limit, not the worker's RAM, so right-sizing pod limits is the only lever to lower cost.",
    };
  }
  if (perNode.cost === pool.cost) {
    return {
      winner: "tie",
      forced: false,
      cost: pool.cost,
      otherCost: perNode.cost,
      savings: 0,
      savingsPct: 0,
      reason: "Both models cost the same for this topology. Per-node licensing leaves more room to grow up to 256 GB per node.",
    };
  }
  const poolWins = pool.cost < perNode.cost;
  const cost = poolWins ? pool.cost : perNode.cost;
  const otherCost = poolWins ? perNode.cost : pool.cost;
  const avgRam = perNode.perMember.length === 0 ? 0 : pool.totalGB / perNode.perMember.length;
  return {
    winner: poolWins ? "ramPool" : "perNode",
    forced: false,
    cost,
    otherCost,
    savings: otherCost - cost,
    savingsPct: otherCost === 0 ? 0 : ((otherCost - cost) / otherCost) * 100,
    reason: poolWins
      ? `Average ${avgRam.toFixed(0)} GB per node is small, so ${pool.licenses} pool ${pool.licenses === 1 ? "license" : "licenses"} cover the whole deployment for less than ${perNode.licenses} node licenses.`
      : `Average ${avgRam.toFixed(0)} GB per node is large enough that ${perNode.licenses} node licenses cost less than the ${pool.licenses} pool ${pool.licenses === 1 ? "license" : "licenses"} needed to cover ${pool.totalGB} GB.`,
  };
};
