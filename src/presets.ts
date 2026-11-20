import { replicaSet } from "./calc/topology";
import type { Topology } from "./calc/types";

export type Preset = {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly topology: Topology;
};

const rsFleet: Preset = {
  id: "rs-fleet",
  label: "4 replica sets, 16 GB each",
  blurb: "Four small replica sets (12 nodes, 192 GB total) share one 256 GB pool license and cost 47% less than per-node.",
  topology: replicaSet(3, 4, 16, "vm", 4, 0),
};

export const DEFAULT_PRESET: Preset = rsFleet;

export const PRESETS: readonly Preset[] = [
  rsFleet,
  {
    id: "rs-single",
    label: "1 replica set, 32 GB, VMs",
    blurb: "One small replica set (96 GB) leaves 63% of a 256 GB pool empty, so 3 node licenses win unless you pool more clusters.",
    topology: replicaSet(3, 4, 32, "vm", 1, 0),
  },
  {
    id: "rs-large",
    label: "Large nodes, 192 GB, VMs",
    blurb: "Large nodes fit under the 256 GB per-node cap and cost less than 576 GB in the RAM pool.",
    topology: replicaSet(3, 32, 192, "vm", 1, 0),
  },
  {
    id: "estate-nonprod",
    label: "2 prod + 3 non-prod sets, 32 GB",
    blurb: "Separate non-prod replica sets cost half as much per-node, but count at full RAM weight in the pool. Per-node wins here.",
    topology: replicaSet(3, 8, 32, "vm", 2, 3),
  },
  {
    id: "k8s-3pods",
    label: "Kubernetes, 3 pods at 32 GB",
    blurb: "Kubernetes requires the RAM pool and counts container memory limits (96 GB), not worker RAM (768 GB).",
    topology: { ...replicaSet(3, 8, 32, "k8s"), k8s: { workerRamGB: 256, podsPerWorker: 1 } },
  },
];
