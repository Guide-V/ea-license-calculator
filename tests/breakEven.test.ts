import { describe, expect, it } from "vitest";
import { breakEvenPoints, costCurve, winRegions } from "../src/calc/breakEven";
import { cliffAlerts, evaluate, recommend, strategicNotes } from "../src/calc/evaluate";
import { DEFAULT_PRICES } from "../src/calc/rules";
import { replicaSet, setHosting, singleNode } from "../src/calc/topology";
import { PRESETS } from "../src/presets";

const winnerAt = (memberCount: number, ramGB: number) =>
  costCurve(memberCount, DEFAULT_PRICES, { minGB: ramGB, maxGB: ramGB })[0]?.winner;

describe("costCurve", () => {
  it("favors the pool for small nodes in a fleet and per-node for big nodes", () => {
    expect(winnerAt(12, 16)).toBe("ramPool");
    expect(winnerAt(12, 21)).toBe("ramPool");
    expect(winnerAt(12, 22)).toBe("perNode");
    expect(winnerAt(12, 192)).toBe("perNode");
  });

  it("finds the crossover for a 12-node fleet at 22 GB (12 x 21 GB still fit one 256 GB pool license)", () => {
    const curve = costCurve(12, DEFAULT_PRICES, { maxGB: 128 });
    const [first] = breakEvenPoints(curve);
    expect(first).toMatchObject({ from: "ramPool", to: "perNode", ramGB: 22 });
  });

  it("steps per-node cost at the 256 GB cap", () => {
    const curve = costCurve(1, DEFAULT_PRICES, { minGB: 255, maxGB: 258 });
    expect(curve.map((point) => point.perNode)).toEqual([100, 100, 200, 200]);
  });

  it("groups the curve into win regions", () => {
    const regions = winRegions(costCurve(12, DEFAULT_PRICES, { maxGB: 128 }));
    expect(regions[0]).toMatchObject({ winner: "ramPool", fromGB: 1 });
    expect(regions.length).toBeGreaterThan(1);
  });
});

describe("recommend", () => {
  it("flips as RAM per node grows across a fleet", () => {
    const small = recommend(evaluate(replicaSet(3, 4, 16, "vm", 4), DEFAULT_PRICES));
    const large = recommend(evaluate(replicaSet(3, 4, 192, "vm", 4), DEFAULT_PRICES));
    expect(small.winner).toBe("ramPool");
    expect(large.winner).toBe("perNode");
  });

  it("computes savings against the other model", () => {
    const result = recommend(evaluate(replicaSet(3, 4, 16, "vm", 4), DEFAULT_PRICES));
    expect(result).toMatchObject({ cost: 640, otherCost: 1200, savings: 560 });
    expect(result.savingsPct).toBeCloseTo(46.67, 1);
    expect(result.reason).toContain("12 nodes");
    expect(result.reason).toContain("64 GB free");
  });

  it("explains why a single small cluster favors per-node when the pool is mostly empty", () => {
    const result = recommend(evaluate(replicaSet(3, 4, 32), DEFAULT_PRICES));
    expect(result.winner).toBe("perNode");
    expect(result.reason).toContain("unused");
  });

  it("forces the pool on Kubernetes", () => {
    const result = recommend(evaluate(setHosting(replicaSet(3, 4, 192), "k8s"), DEFAULT_PRICES));
    expect(result).toMatchObject({ winner: "ramPool", forced: true, otherCost: null });
    expect(result.reason).toContain("memory limit");
  });
});

describe("cliffAlerts", () => {
  it("flags a node that just crossed the 256 GB cap", () => {
    const topology = singleNode(8, 260);
    const alerts = cliffAlerts(topology, evaluate(topology, DEFAULT_PRICES));
    expect(alerts.some((a) => a.id === "node-crossed")).toBe(true);
  });

  it("flags a pool that just crossed a 256 GB step", () => {
    const topology = replicaSet(3, 4, 90); // 270 GB = 256 + 14 GB
    const alerts = cliffAlerts(topology, evaluate(topology, DEFAULT_PRICES));
    expect(alerts.some((a) => a.id === "pool-crossed")).toBe(true);
  });

  it("does not emit per-node cliff alerts on Kubernetes", () => {
    const topology = singleNode(8, 260, "k8s");
    const alerts = cliffAlerts(topology, evaluate(topology, DEFAULT_PRICES));
    expect(alerts.some((a) => a.model === "perNode")).toBe(false);
    expect(alerts.some((a) => a.id === "pool-crossed")).toBe(true);
  });
});

describe("strategicNotes", () => {
  it("returns targeted recommendations for checked roadmap signals", () => {
    const topology = replicaSet(3, 4, 16, "vm", 4);
    const notes = strategicNotes(topology, evaluate(topology, DEFAULT_PRICES), {
      k8sPlanned: true,
      verticalGrowth: true,
      fleetSprawl: true,
    });
    expect(notes.map((n) => n.id)).toEqual(["k8s-roadmap", "vertical-growth", "fleet-sprawl"]);
    expect(notes[0]?.leans).toBe("ramPool");
    expect(notes[1]?.leans).toBe("perNode");
    expect(notes[2]?.detail).toContain("1 more identical deployment");
  });
});

describe("golden path: presets", () => {
  const expected: Record<string, string> = {
    "rs-fleet": "ramPool",
    "rs-single": "perNode",
    "rs-large": "perNode",
    "estate-nonprod": "perNode",
    "k8s-3pods": "ramPool",
  };

  it.each(PRESETS.map((preset) => [preset.id, preset] as const))("%s evaluates to the expected winner", (id, preset) => {
    const recommendation = recommend(evaluate(preset.topology, DEFAULT_PRICES));
    expect(recommendation.winner).toBe(expected[id]);
    expect(recommendation.cost).toBeGreaterThan(0);
  });
});
