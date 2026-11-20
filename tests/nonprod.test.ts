import { describe, expect, it } from "vitest";
import { costCurve } from "../src/calc/breakEven";
import { evaluate, recommend } from "../src/calc/evaluate";
import { perNodeCost } from "../src/calc/perNode";
import { DEFAULT_PRICES, NONPROD_PRICE_FACTOR } from "../src/calc/rules";
import { addMember, replicaSet, setAllSizes, toggleEnv, updateMember } from "../src/calc/topology";
import type { Topology } from "../src/calc/types";

const withNonProd = (topology: Topology, ids: readonly number[]): Topology =>
  ids.reduce((acc, id) => updateMember(acc, id, { env: "nonprod" }), topology);

describe("non-prod members", () => {
  it("non-prod is half the prod price", () => {
    expect(NONPROD_PRICE_FACTOR).toBe(0.5);
  });

  it("new members are prod by default", () => {
    expect(addMember(replicaSet(3, 4, 16)).members.at(-1)?.env).toBe("prod");
  });

  it("addMember can add a non-prod member", () => {
    const after = addMember(replicaSet(3, 4, 16), "secondary", "nonprod");
    expect(after.members.at(-1)).toMatchObject({ env: "nonprod", role: "secondary" });
    expect(after.members).toHaveLength(4);
  });

  it("environment survives resizing and role changes, and does not mutate the input", () => {
    const before = withNonProd(replicaSet(3, 4, 16), [3]);
    const resized = setAllSizes(before, { ramGB: 64 });
    const reroled = updateMember(resized, 3, { role: "hidden" });
    expect(resized.members.map((m) => m.env)).toEqual(["prod", "prod", "nonprod"]);
    expect(reroled.members[2]).toMatchObject({ env: "nonprod", role: "hidden", ramGB: 64 });
    expect(before.members[2]?.ramGB).toBe(16);
  });

  it("toggleEnv flips prod and non-prod", () => {
    const once = toggleEnv(replicaSet(2, 4, 16), 2);
    expect(once.members[1]?.env).toBe("nonprod");
    expect(toggleEnv(once, 2).members[1]?.env).toBe("prod");
  });
});

describe("per-node licensing with non-prod", () => {
  it("charges non-prod nodes half price", () => {
    const topology = withNonProd(replicaSet(5, 4, 64), [4, 5]);
    expect(perNodeCost(topology, DEFAULT_PRICES)).toMatchObject({
      available: true,
      licenses: 5,
      prodLicenses: 3,
      nonProdLicenses: 2,
      cost: 3 * 100 + 2 * 50,
    });
  });

  it("a big non-prod node still needs one license per 256 GB, at half price", () => {
    const topology = withNonProd(replicaSet(1, 4, 384), [1]);
    expect(perNodeCost(topology, DEFAULT_PRICES)).toMatchObject({ licenses: 2, nonProdLicenses: 2, cost: 100 });
  });

});

describe("RAM pool treats every node the same", () => {
  it("pool cost is identical for prod and non-prod members", () => {
    const allProd = replicaSet(5, 4, 64);
    const mixed = withNonProd(allProd, [4, 5]);
    expect(evaluate(mixed, DEFAULT_PRICES).pool).toEqual(evaluate(allProd, DEFAULT_PRICES).pool);
    expect(evaluate(mixed, DEFAULT_PRICES).pool).toMatchObject({ totalGB: 320, licenses: 2, cost: 1280 });
  });

  it("separate non-prod replica sets flip a pool win into a per-node win", () => {
    const allProd = replicaSet(3, 8, 32, "vm", 5, 0);
    const mixedEstate = replicaSet(3, 8, 32, "vm", 2, 3);
    expect(recommend(evaluate(allProd, DEFAULT_PRICES))).toMatchObject({ winner: "ramPool", cost: 1280, otherCost: 1500 });
    expect(recommend(evaluate(mixedEstate, DEFAULT_PRICES))).toMatchObject({ winner: "perNode", cost: 1050, otherCost: 1280 });
  });

  it("many non-prod nodes make per-node cheaper at sizes where the pool wins for prod", () => {
    const prod = costCurve(12, DEFAULT_PRICES, { minGB: 20, maxGB: 20 })[0];
    const nonProd = costCurve(12, DEFAULT_PRICES, { minGB: 20, maxGB: 20, nonProdCount: 12 })[0];
    expect(prod).toMatchObject({ perNode: 1200, ramPool: 640, winner: "ramPool" });
    expect(nonProd).toMatchObject({ perNode: 600, ramPool: 640, winner: "perNode" });
  });
});
