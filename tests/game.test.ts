import { describe, expect, it } from "vitest";
import { breakEvenPoints, costCurve } from "../src/calc/breakEven";
import { evaluate, recommend } from "../src/calc/evaluate";
import { DEFAULT_PRICES } from "../src/calc/rules";
import { replicaSet, setHosting, setK8s, singleNode } from "../src/calc/topology";
import {
  FILL_LEVELS,
  SAVINGS_LEVELS,
  achievements,
  extraDeploymentsInPool,
  getDelta,
  getIntensity,
  nearestCrossover,
  perNodeHeadroomGB,
  poolFillPct,
  poolHeadroomGB,
} from "../src/game/presentation";

const badgesFor = (topology: Parameters<typeof evaluate>[0]) => {
  const evaluation = evaluate(topology, DEFAULT_PRICES);
  return Object.fromEntries(
    achievements(topology, evaluation, recommend(evaluation)).map((badge) => [badge.id, badge.unlocked]),
  );
};

describe("getIntensity", () => {
  it.each([
    [-5, "even"],
    [0, "even"],
    [0.01, "solid"],
    [10, "solid"],
    [10.01, "hot"],
    [30, "hot"],
    [30.01, "blazing"],
    [60, "blazing"],
    [60.01, "max"],
    [100, "max"],
  ])("savings %f%% is %s", (value, id) => {
    expect(getIntensity(value, SAVINGS_LEVELS).id).toBe(id);
  });

  it.each([
    [0, "idle"],
    [25, "idle"],
    [25.5, "roomy"],
    [50, "roomy"],
    [75, "good"],
    [90, "great"],
    [90.1, "packed"],
    [100, "packed"],
  ])("fill %f%% is %s", (value, id) => {
    expect(getIntensity(value, FILL_LEVELS).id).toBe(id);
  });

  it("reports the level index for the meter", () => {
    expect(getIntensity(100, FILL_LEVELS).index).toBe(FILL_LEVELS.length - 1);
  });
});

describe("getDelta", () => {
  it("lower cost is an improvement", () => {
    expect(getDelta(240, 300)).toEqual({ type: "improvement", amount: 60 });
  });
  it("higher cost is an increase, not a reward", () => {
    expect(getDelta(300, 240)).toEqual({ type: "increase", amount: 60 });
  });
  it("equal cost is the same", () => {
    expect(getDelta(300, 300)).toEqual({ type: "same", amount: 0 });
  });
});

describe("headroom and fill", () => {
  it("192 GB in one 256 GB pool license is 75% full with 64 GB free", () => {
    const { pool } = evaluate(replicaSet(3, 4, 64), DEFAULT_PRICES);
    expect(poolFillPct(pool)).toBe(75);
    expect(poolHeadroomGB(pool)).toBe(64);
  });

  it("an empty pool has no fill and no headroom", () => {
    const empty = { totalGB: 0, licenses: 0, coveredGB: 0, cost: 0 };
    expect(poolFillPct(empty)).toBe(0);
    expect(poolHeadroomGB(empty)).toBe(0);
  });

  it("per-node headroom is the smallest gap to the 256 GB cap", () => {
    expect(perNodeHeadroomGB(replicaSet(3, 4, 192))).toBe(64);
    expect(perNodeHeadroomGB(singleNode(4, 300))).toBe(212);
  });
  it("reports how many extra identical deployments fit in pool headroom", () => {
    const fleet = evaluate(replicaSet(3, 4, 16, "vm", 4), DEFAULT_PRICES);
    expect(extraDeploymentsInPool(fleet)).toBe(1);
    const single = evaluate(replicaSet(3, 4, 16, "vm", 1), DEFAULT_PRICES);
    expect(extraDeploymentsInPool(single)).toBe(4);
  });
});

describe("nearestCrossover", () => {
  const points = breakEvenPoints(costCurve(12, DEFAULT_PRICES, { maxGB: 128 }));
  it("returns null when there is none", () => {
    expect(nearestCrossover(16, [])).toBeNull();
  });
  it("finds the closest crossover", () => {
    expect(nearestCrossover(5, points)?.ramGB).toBe(22);
  });
});

describe("achievements", () => {
  it("unlocks Big iron only when per-node wins on a 128 GB+ node", () => {
    expect(badgesFor(replicaSet(3, 4, 192))["big-iron"]).toBe(true);
    expect(badgesFor(replicaSet(3, 4, 16))["big-iron"]).toBe(false);
  });

  it("unlocks Packed pool and Sweet spot when the pool license is 90%+ full and the pool wins", () => {
    const full = badgesFor(replicaSet(4, 4, 16, "vm", 4)); // 16 nodes x 16 GB = 256 GB
    expect(full.packed).toBe(true);
    expect(full["sweet-spot"]).toBe(true);
    expect(badgesFor(replicaSet(3, 4, 16)).packed).toBe(false);
  });

  it("Kube cutter needs Kubernetes and mostly uncounted worker RAM", () => {
    const k8s = setHosting(setK8s(replicaSet(3, 8, 32), { workerRamGB: 256, podsPerWorker: 1 }), "k8s");
    expect(badgesFor(k8s)["kube-cutter"]).toBe(true);
    expect(badgesFor(setHosting(k8s, "vm"))["kube-cutter"]).toBe(false);
  });

  it("gives no choice-based badges when Kubernetes forces the pool", () => {
    const k8s = setHosting(replicaSet(4, 4, 16), "k8s");
    expect(badgesFor(k8s)["sweet-spot"]).toBe(false);
  });
});
