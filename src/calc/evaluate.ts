import {
  billableMembers,
  clusterRamGB,
  estateNodeCount,
  totalDataRamGB,
  totalDeployments,
} from "./members";
import { licensesForNode, perNodeCost, type PerNodeResult } from "./perNode";
import { poolCover, type PoolCover } from "./ramPool";
import { NODE_RAM_CAP_GB, POOL_LICENSE_GB } from "./rules";
import type { Model, PlanningSignals, Prices, Topology } from "./types";

export type Evaluation = {
  readonly perNode: PerNodeResult;
  readonly pool: PoolCover;
  readonly totalNodes: number;
  readonly totalDeployments: number;
  readonly singleClusterRamGB: number;
};

export const evaluate = (topology: Topology, prices: Prices): Evaluation => ({
  perNode: perNodeCost(topology, prices),
  pool: poolCover(totalDataRamGB(topology), prices),
  totalNodes: estateNodeCount(topology),
  totalDeployments: totalDeployments(topology),
  singleClusterRamGB: clusterRamGB(topology),
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

const pluralize = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

export const recommend = (evaluation: Evaluation): Recommendation => {
  const { perNode, pool, totalNodes, singleClusterRamGB } = evaluation;
  if (!perNode.available) {
    return {
      winner: "ramPool",
      forced: true,
      cost: pool.cost,
      otherCost: null,
      savings: 0,
      savingsPct: 0,
      reason:
        "Kubernetes deployments require RAM pool licensing. Only each data-bearing container's memory limit counts, not memory requests or worker RAM. Right-size pod limits to control cost.",
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
      reason:
        "Both models cost the same today. Per-node leaves free vertical headroom up to 256 GB per node. The RAM pool lets you add small clusters or move to Kubernetes without changing license models.",
    };
  }
  const poolWins = pool.cost < perNode.cost;
  const cost = poolWins ? pool.cost : perNode.cost;
  const otherCost = poolWins ? perNode.cost : pool.cost;
  const avgRam = totalNodes === 0 ? 0 : pool.totalGB / totalNodes;
  const headroom = Math.max(0, pool.coveredGB - pool.totalGB);
  const extraClusters = singleClusterRamGB > 0 ? Math.floor(headroom / singleClusterRamGB) : 0;

  let reason: string;
  if (poolWins) {
    const headroomNote =
      extraClusters > 0
        ? ` You also have ${headroom} GB free in the pool, enough for ${pluralize(extraClusters, "more identical deployment")} at no extra license cost.`
        : headroom > 0
          ? ` You still have ${headroom} GB free in the pool.`
          : "";
    reason = `${pluralize(totalNodes, "node")} averaging ${avgRam.toFixed(0)} GB share ${pluralize(pool.licenses, "256 GB pool license")} (${pool.totalGB} GB total) for less than ${pluralize(perNode.licenses, "node license")}.${headroomNote}`;
  } else if (pool.licenses === 1 && pool.totalGB < POOL_LICENSE_GB * 0.6) {
    reason = `Combined RAM (${pool.totalGB} GB) leaves ${Math.round(((POOL_LICENSE_GB - pool.totalGB) / POOL_LICENSE_GB) * 100)}% of a 256 GB pool license unused, so ${pluralize(perNode.licenses, "node license")} cost less unless you pool more clusters together.`;
  } else if (perNode.nonProdLicenses > 0) {
    reason = `At ${avgRam.toFixed(0)} GB average per node with ${pluralize(perNode.nonProdLicenses, "half-price non-prod license")}, per-node costs less than ${pluralize(pool.licenses, "pool license")}, which count non-prod RAM at full weight.`;
  } else {
    reason = `Average ${avgRam.toFixed(0)} GB per node is large enough that ${pluralize(perNode.licenses, "node license")} cost less than ${pluralize(pool.licenses, "256 GB pool license")} for ${pool.totalGB} GB.`;
  }

  return {
    winner: poolWins ? "ramPool" : "perNode",
    forced: false,
    cost,
    otherCost,
    savings: otherCost - cost,
    savingsPct: otherCost === 0 ? 0 : ((otherCost - cost) / otherCost) * 100,
    reason,
  };
};

export type CliffAlert = {
  readonly id: string;
  readonly model: Model;
  readonly kind: "crossed" | "approaching";
  readonly message: string;
};

/**
 * Flags 256 GB step boundaries when a small RAM change just triggered
 * or is about to trigger an extra license.
 */
export const cliffAlerts = (topology: Topology, evaluation: Evaluation): readonly CliffAlert[] => {
  const alerts: CliffAlert[] = [];

  if (topology.hosting === "vm") {
    const members = billableMembers(topology);
    const crossed = members.find((m) => m.ramGB > NODE_RAM_CAP_GB && m.ramGB % NODE_RAM_CAP_GB > 0 && m.ramGB % NODE_RAM_CAP_GB <= 32);
    if (crossed) {
      const cap = Math.floor(crossed.ramGB / NODE_RAM_CAP_GB) * NODE_RAM_CAP_GB;
      const lic = licensesForNode(crossed.ramGB);
      alerts.push({
        id: "node-crossed",
        model: "perNode",
        kind: "crossed",
        message: `Each ${crossed.ramGB} GB node exceeds the ${cap} GB cap by ${crossed.ramGB - cap} GB and requires ${lic} per-node licenses. Trimming to ${cap} GB saves 1 license per node.`,
      });
    } else {
      const near = members.find((m) => {
        const rem = NODE_RAM_CAP_GB - (m.ramGB % NODE_RAM_CAP_GB);
        return m.ramGB % NODE_RAM_CAP_GB !== 0 && rem <= 16;
      });
      if (near) {
        const nextCap = licensesForNode(near.ramGB) * NODE_RAM_CAP_GB;
        alerts.push({
          id: "node-approaching",
          model: "perNode",
          kind: "approaching",
          message: `Each node sits ${nextCap - near.ramGB} GB below the ${nextCap} GB cap. Adding more RAM requires an extra per-node license.`,
        });
      }
    }
  }

  const { totalGB, licenses } = evaluation.pool;
  if (totalGB > POOL_LICENSE_GB) {
    const over = totalGB % POOL_LICENSE_GB;
    if (over > 0 && over <= 32) {
      alerts.push({
        id: "pool-crossed",
        model: "ramPool",
        kind: "crossed",
        message: `Combined RAM (${totalGB} GB) exceeds ${(licenses - 1) * POOL_LICENSE_GB} GB by ${over} GB and triggers pool license #${licenses}.`,
      });
    }
  }
  if (totalGB > 0) {
    const remaining = licenses * POOL_LICENSE_GB - totalGB;
    if (remaining > 0 && remaining <= 16) {
      alerts.push({
        id: "pool-approaching",
        model: "ramPool",
        kind: "approaching",
        message: `Only ${remaining} GB remain in the pool before you need pool license #${licenses + 1}.`,
      });
    }
  }

  return alerts;
};

export type StrategicNote = {
  readonly id: string;
  readonly leans: Model;
  readonly title: string;
  readonly detail: string;
};

/** Evaluates roadmap choices alongside Day-1 cost. */
export const strategicNotes = (
  topology: Topology,
  evaluation: Evaluation,
  signals: PlanningSignals,
): readonly StrategicNote[] => {
  const notes: StrategicNote[] = [];
  if (signals.k8sPlanned && topology.hosting === "vm") {
    notes.push({
      id: "k8s-roadmap",
      leans: "ramPool",
      title: "Kubernetes migration ahead",
      detail: "Containers require the RAM pool. Starting on the RAM pool avoids changing license models when you move off VMs.",
    });
  }
  if (signals.verticalGrowth && topology.hosting === "vm") {
    notes.push({
      id: "vertical-growth",
      leans: "perNode",
      title: "Growing RAM per node",
      detail: "Per-node licenses include free vertical RAM headroom up to 256 GB per node. Scaling RAM up consumes more of a RAM pool.",
    });
  }
  if (signals.fleetSprawl) {
    const extra = evaluation.singleClusterRamGB > 0
      ? Math.floor(Math.max(0, evaluation.pool.coveredGB - evaluation.pool.totalGB) / evaluation.singleClusterRamGB)
      : 0;
    notes.push({
      id: "fleet-sprawl",
      leans: "ramPool",
      title: "Growing to many small clusters",
      detail:
        extra > 0
          ? `The RAM pool shares unused GB across clusters. Your current pool already fits ${pluralize(extra, "more identical deployment")} at no extra license cost.`
          : "The RAM pool lets many small clusters or shards share 256 GB buckets instead of paying a full node license for each small mongod.",
    });
  }
  return notes;
};
