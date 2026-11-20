import { licensesForNode } from "./perNode";
import { NONPROD_PRICE_FACTOR } from "./rules";
import { poolCover } from "./ramPool";
import type { Model, Prices } from "./types";

export type CurvePoint = {
  readonly ramGB: number;
  readonly perNode: number;
  readonly ramPool: number;
  readonly winner: Model | "tie";
};

const range = (from: number, to: number, step: number): readonly number[] =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

const winnerOf = (perNode: number, ramPool: number): Model | "tie" =>
  perNode === ramPool ? "tie" : perNode < ramPool ? "perNode" : "ramPool";

/**
 * Cost of `memberCount` identical data-bearing members as their RAM grows.
 * `nonProdCount` of them are non-prod: half price per-node, full RAM in the pool.
 * Both models are step functions, so the curve is sampled at every `step` GB.
 */
export const costCurve = (
  memberCount: number,
  prices: Prices,
  options: {
    readonly minGB?: number;
    readonly maxGB?: number;
    readonly step?: number;
    readonly nonProdCount?: number;
  } = {},
): readonly CurvePoint[] => {
  const { minGB = 1, maxGB = 512, step = 1, nonProdCount = 0 } = options;
  const nonProd = Math.min(Math.max(0, nonProdCount), memberCount);
  const weightedNodes = memberCount - nonProd + nonProd * NONPROD_PRICE_FACTOR;
  return range(minGB, maxGB, step).map((ramGB) => {
    const perNode = weightedNodes * licensesForNode(ramGB) * prices.perNodeLicense;
    const ramPool = poolCover(memberCount * ramGB, prices).cost;
    return { ramGB, perNode, ramPool, winner: winnerOf(perNode, ramPool) };
  });
};

export type Crossover = {
  readonly ramGB: number;
  readonly from: Model | "tie";
  readonly to: Model | "tie";
};

/** RAM values where the cheaper model changes (ties are skipped). */
export const breakEvenPoints = (curve: readonly CurvePoint[]): readonly Crossover[] => {
  const decided = curve.filter((point) => point.winner !== "tie");
  return decided.slice(1).flatMap((point, i) => {
    const previous = decided[i];
    return previous && previous.winner !== point.winner
      ? [{ ramGB: point.ramGB, from: previous.winner, to: point.winner }]
      : [];
  });
};

/** Share of the curve (by RAM size) where each model is cheaper or equal. */
export const winRegions = (
  curve: readonly CurvePoint[],
): readonly { readonly fromGB: number; readonly toGB: number; readonly winner: Model | "tie" }[] =>
  curve.reduce<{ fromGB: number; toGB: number; winner: Model | "tie" }[]>((regions, point) => {
    const last = regions[regions.length - 1];
    return last && last.winner === point.winner
      ? [...regions.slice(0, -1), { ...last, toGB: point.ramGB }]
      : [...regions, { fromGB: point.ramGB, toGB: point.ramGB, winner: point.winner }];
  }, []);
