import { describe, expect, it } from "vitest";
import { licensesForNode, perNodeCost } from "../src/calc/perNode";
import { DEFAULT_PRICES } from "../src/calc/rules";
import { makeMember, replicaSet, setHosting, singleNode } from "../src/calc/topology";
import type { Topology } from "../src/calc/types";

describe("licensesForNode", () => {
  it.each([
    [1, 1],
    [256, 1],
    [257, 2],
    [384, 2],
    [512, 2],
    [513, 3],
    [768, 3],
    [769, 4],
  ])("%i GB needs %i license(s)", (ramGB, expected) => {
    expect(licensesForNode(ramGB)).toBe(expected);
  });
});

describe("perNodeCost", () => {
  it("charges one license per data-bearing member", () => {
    const result = perNodeCost(replicaSet(3, 4, 32), DEFAULT_PRICES);
    expect(result).toMatchObject({ available: true, licenses: 3, cost: 300 });
  });

  it("charges hidden and delayed members", () => {
    const topology: Topology = {
      ...replicaSet(1, 4, 32),
      members: [
        makeMember(1, "primary", 4, 32),
        makeMember(2, "hidden", 4, 32),
        makeMember(3, "delayed", 4, 32),
      ],
    };
    expect(perNodeCost(topology, DEFAULT_PRICES)).toMatchObject({ licenses: 3 });
  });

  it("charges multiple licenses for a 384 GB member", () => {
    const result = perNodeCost(singleNode(32, 384), DEFAULT_PRICES);
    expect(result).toMatchObject({ licenses: 2, cost: 200 });
  });

  it("is unavailable on Kubernetes", () => {
    const result = perNodeCost(setHosting(replicaSet(3, 4, 32), "k8s"), DEFAULT_PRICES);
    expect(result.available).toBe(false);
  });
});
