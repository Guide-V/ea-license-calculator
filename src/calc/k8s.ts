import { totalDataRamGB } from "./members";
import type { Member, Topology } from "./types";

/** On Kubernetes the pool counts pod memory limits across all deployments, not worker RAM. */
export const poolRamFromPods = (topology: Topology): number => totalDataRamGB(topology);

export type Worker = {
  readonly index: number;
  readonly pods: readonly Member[];
  readonly ramGB: number;
  readonly countedGB: number;
  readonly notCountedGB: number;
  readonly overCommitted: boolean;
};

const chunk = <T>(items: readonly T[], size: number): readonly (readonly T[])[] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/** Packs pods onto workers, in order, `podsPerWorker` at a time. */
export const layoutWorkers = (topology: Topology): readonly Worker[] =>
  chunk(topology.members, Math.max(1, topology.k8s.podsPerWorker)).map((pods, index) => {
    const podsGB = pods.reduce((sum, pod) => sum + pod.ramGB, 0);
    return {
      index,
      pods,
      ramGB: topology.k8s.workerRamGB,
      countedGB: podsGB,
      notCountedGB: Math.max(0, topology.k8s.workerRamGB - podsGB),
      overCommitted: podsGB > topology.k8s.workerRamGB,
    };
  });

export const workerRamNotCounted = (topology: Topology): number =>
  layoutWorkers(topology).reduce((sum, worker) => sum + worker.notCountedGB, 0);
