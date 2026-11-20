import { describe, expect, it } from "vitest";
import { breakEvenPoints, costCurve, winRegions } from "../src/calc/breakEven";
import { evaluate, recommend } from "../src/calc/evaluate";
import { DEFAULT_PRICES } from "../src/calc/rules";
import { replicaSet, setHosting } from "../src/calc/topology";
import { PRESETS } from "../src/presets";

const winnerAt = (memberCount: number, ramGB: number) =>
  costCurve(memberCount, DEFAULT_PRICES, { minGB: ramGB, maxGB: ramGB })[0]?.winner;

describe("costCurve", () => {
  it("favors the pool for small nodes and per-node for big nodes", () => {
    expect(winnerAt(3, 16)).toBe("ramPool");
    expect(winnerAt(3, 85)).toBe("ramPool");
    expect(winnerAt(3, 86)).toBe("perNode");
    expect(winnerAt(3, 192)).toBe("perNode");
  });

  it("finds the crossover for a 3 member replica set at 86 GB (3 nodes x 85 GB still fit one pool license)", () => {
    const curve = costCurve(3, DEFAULT_PRICES, { maxGB: 128 });
    const [first] = breakEvenPoints(curve);
    expect(first).toMatchObject({ from: "ramPool", to: "perNode", ramGB: 86 });
  });

  it("steps per-node cost at the 256 GB cap", () => {
    const curve = costCurve(1, DEFAULT_PRICES, { minGB: 255, maxGB: 258 });
    expect(curve.map((point) => point.perNode)).toEqual([100, 100, 200, 200]);
  });

  it("groups the curve into win regions", () => {
    const regions = winRegions(costCurve(3, DEFAULT_PRICES, { maxGB: 128 }));
    expect(regions[0]).toMatchObject({ winner: "ramPool", fromGB: 1 });
    expect(regions.length).toBeGreaterThan(1);
  });
});

describe("recommend", () => {
  it("flips as RAM per node grows", () => {
    const small = recommend(evaluate(replicaSet(3, 4, 16), DEFAULT_PRICES));
    const large = recommend(evaluate(replicaSet(3, 4, 192), DEFAULT_PRICES));
    expect(small.winner).toBe("ramPool");
    expect(large.winner).toBe("perNode");
  });

  it("computes savings against the other model", () => {
    const result = recommend(evaluate(replicaSet(3, 4, 16), DEFAULT_PRICES));
    expect(result).toMatchObject({ cost: 250, otherCost: 300, savings: 50 });
    expect(result.savingsPct).toBeCloseTo(16.67, 1);
  });

  it("forces the pool on Kubernetes", () => {
    const result = recommend(evaluate(setHosting(replicaSet(3, 4, 192), "k8s"), DEFAULT_PRICES));
    expect(result).toMatchObject({ winner: "ramPool", forced: true, otherCost: null });
  });
});

describe("golden path: presets", () => {
  const expected: Record<string, string> = {
    "single-small": "perNode",
    "rs-small": "ramPool",
    "rs-large": "perNode",
    "rs-nonprod": "perNode",
    "k8s-3pods": "ramPool",
  };

  it.each(PRESETS.map((preset) => [preset.id, preset] as const))("%s evaluates to the expected winner", (id, preset) => {
    const recommendation = recommend(evaluate(preset.topology, DEFAULT_PRICES));
    expect(recommendation.winner).toBe(expected[id]);
    expect(recommendation.cost).toBeGreaterThan(0);
  });
});
