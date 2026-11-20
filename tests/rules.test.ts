import { describe, expect, it } from "vitest";
import { evaluate, recommend } from "../src/calc/evaluate";
import { DEFAULT_PRICES, SOURCES } from "../src/calc/rules";
import { replicaSet } from "../src/calc/topology";

/** Mirrors worked examples from the EA Pricing Guide, using placeholder prices. */
describe("guide examples", () => {
  it("example 1: two 128 GB data nodes prefer per-node", () => {
    const topology = replicaSet(2, 4, 128);
    expect(recommend(evaluate(topology, DEFAULT_PRICES)).winner).toBe("perNode");
    expect(evaluate(topology, DEFAULT_PRICES).perNode).toMatchObject({ licenses: 2 });
  });

  it("example 4: two 384 GB nodes need 4 licenses", () => {
    expect(evaluate(replicaSet(2, 8, 384), DEFAULT_PRICES).perNode).toMatchObject({ licenses: 4 });
  });

  it("example 5: 32 + 16 + 16 GB fits one 256 GB pool license and the pool wins", () => {
    const topology = replicaSet(3, 4, 16);
    const members = [32, 16, 16].map((ramGB, i) => ({ ...topology.members[i]!, ramGB }));
    const small = { ...topology, members };
    const evaluation = evaluate(small, DEFAULT_PRICES);
    expect(evaluation.pool).toMatchObject({ licenses: 1, cost: 250 });
    expect(recommend(evaluation).winner).toBe("ramPool");
  });
});

describe("public source lines", () => {
  it("uses generic titles and does not name internal documents", () => {
    const text = SOURCES.map((source) => `${source.title} ${source.note}`).join("\n");
    expect(text).toContain("MongoDB Enterprise Advanced pricing guidance");
    expect(text.toLowerCase()).not.toContain("internal");
    expect(text).not.toContain("Pricing Guide");
    expect(text).not.toContain("Licensing Clarification");
  });
});
