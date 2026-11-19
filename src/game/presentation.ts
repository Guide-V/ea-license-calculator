import type { Crossover } from "../calc/breakEven";
import type { Evaluation, Recommendation } from "../calc/evaluate";
import { layoutWorkers } from "../calc/k8s";
import { billableMembers } from "../calc/members";
import { licensesForNode } from "../calc/perNode";
import type { PoolCover } from "../calc/ramPool";
import { NODE_RAM_CAP_GB } from "../calc/rules";
import type { Topology } from "../calc/types";

/**
 * Pure presentation rules for the "game" layer. No DOM, timers, or randomness:
 * every value shown is derived from the inputs.
 */

export type Level = { readonly id: string; readonly label: string; readonly max: number };
export type ActiveLevel = Level & { readonly index: number };

/** First level whose max is >= value. Falls back to the last level. */
export const getIntensity = (value: number, levels: readonly Level[]): ActiveLevel => {
  const found = levels.findIndex((level) => value <= level.max);
  const index = found === -1 ? levels.length - 1 : found;
  const level = levels[index] as Level;
  return { ...level, index };
};

/** Savings of the winning model, in percent. */
export const SAVINGS_LEVELS: readonly Level[] = [
  { id: "even", label: "Even", max: 0 },
  { id: "solid", label: "Solid", max: 10 },
  { id: "hot", label: "Hot", max: 30 },
  { id: "blazing", label: "Blazing", max: 60 },
  { id: "max", label: "Max", max: Number.POSITIVE_INFINITY },
];

/** How full the purchased pool licenses is, in percent. */
export const FILL_LEVELS: readonly Level[] = [
  { id: "idle", label: "Idle", max: 25 },
  { id: "roomy", label: "Roomy", max: 50 },
  { id: "good", label: "Good", max: 75 },
  { id: "great", label: "Great", max: 90 },
  { id: "packed", label: "Packed", max: Number.POSITIVE_INFINITY },
];

export type Delta = {
  readonly type: "improvement" | "increase" | "same";
  readonly amount: number;
};

/** Lower cost is an improvement. */
export const getDelta = (value: number, baseline: number): Delta => ({
  type: value < baseline ? "improvement" : value > baseline ? "increase" : "same",
  amount: Math.abs(value - baseline),
});

export const poolFillPct = (pool: PoolCover): number =>
  pool.coveredGB === 0 ? 0 : (pool.totalGB / pool.coveredGB) * 100;

/** RAM you could add to the pool at no extra cost. */
export const poolHeadroomGB = (pool: PoolCover): number => Math.max(0, pool.coveredGB - pool.totalGB);

/** Smallest room left under a node license's 256 GB cap, across data-bearing nodes. */
export const perNodeHeadroomGB = (topology: Topology): number => {
  const rooms = billableMembers(topology).map(
    (member) => licensesForNode(member.ramGB) * NODE_RAM_CAP_GB - member.ramGB,
  );
  return rooms.length === 0 ? 0 : Math.min(...rooms);
};

export const nearestCrossover = (ramGB: number, crossovers: readonly Crossover[]): Crossover | null =>
  crossovers.reduce<Crossover | null>(
    (best, point) => (best === null || Math.abs(point.ramGB - ramGB) < Math.abs(best.ramGB - ramGB) ? point : best),
    null,
  );

export type Badge = {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly unlocked: boolean;
};

const uncountedWorkerShare = (topology: Topology): number => {
  const workers = layoutWorkers(topology);
  const total = workers.reduce((sum, worker) => sum + worker.ramGB, 0);
  const uncounted = workers.reduce((sum, worker) => sum + worker.notCountedGB, 0);
  return total === 0 ? 0 : uncounted / total;
};

/** Badges depend only on the current state, so they are deterministic. */
export const achievements = (
  topology: Topology,
  evaluation: Evaluation,
  recommendation: Recommendation,
): readonly Badge[] => {
  const fill = poolFillPct(evaluation.pool);
  const biggest = Math.max(0, ...billableMembers(topology).map((member) => member.ramGB));
  const choice = !recommendation.forced;
  return [
    {
      id: "sweet-spot",
      label: "Sweet spot",
      hint: "RAM pool wins and its licenses are 90%+ full",
      unlocked: choice && recommendation.winner === "ramPool" && fill >= 90,
    },
    {
      id: "big-iron",
      label: "Big iron",
      hint: "Per-node wins with a node of 128 GB or more",
      unlocked: choice && recommendation.winner === "perNode" && biggest >= 128,
    },
    {
      id: "packed",
      label: "Packed pool",
      hint: "Pool 90%+ full",
      unlocked: evaluation.pool.coveredGB > 0 && fill >= 90,
    },
    {
      id: "free-rider",
      label: "Free rider",
      hint: "Add an arbiter. It costs nothing",
      unlocked: topology.members.some((member) => member.role === "arbiter"),
    },
    {
      id: "kube-cutter",
      label: "Kube cutter",
      hint: "On Kubernetes, 75%+ of worker RAM stays uncounted",
      unlocked: topology.hosting === "k8s" && uncountedWorkerShare(topology) >= 0.75,
    },
  ];
};
