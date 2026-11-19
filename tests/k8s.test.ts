import { describe, expect, it } from "vitest";
import { layoutWorkers, poolRamFromPods, workerRamNotCounted } from "../src/calc/k8s";
import { evaluate } from "../src/calc/evaluate";
import { DEFAULT_PRICES } from "../src/calc/rules";
import { makeMember, replicaSet, setK8s } from "../src/calc/topology";
import type { Topology } from "../src/calc/types";

const threePods = setK8s(replicaSet(3, 8, 32, "k8s"), { workerRamGB: 256, podsPerWorker: 1 });

describe("kubernetes pool counting", () => {
  it("counts pod memory limits, not worker RAM", () => {
    expect(poolRamFromPods(threePods)).toBe(96);
    expect(evaluate(threePods, DEFAULT_PRICES).pool.totalGB).toBe(96);
  });

  it("reports uncounted worker RAM for the diagram", () => {
    expect(workerRamNotCounted(threePods)).toBe(3 * (256 - 32));
  });

  it("packs several pods on one worker", () => {
    const packed = setK8s(threePods, { podsPerWorker: 3 });
    const workers = layoutWorkers(packed);
    expect(workers).toHaveLength(1);
    expect(workers[0]).toMatchObject({ countedGB: 96, notCountedGB: 160, overCommitted: false });
  });

  it("flags an over-committed worker", () => {
    const tight = setK8s(threePods, { workerRamGB: 64, podsPerWorker: 3 });
    expect(layoutWorkers(tight)[0]?.overCommitted).toBe(true);
  });

  it("does not count arbiter pods", () => {
    const withArbiter: Topology = {
      ...threePods,
      members: [...threePods.members.slice(0, 2), makeMember(3, "arbiter", 2, 8)],
    };
    expect(poolRamFromPods(withArbiter)).toBe(64);
  });
});
