import { makeMember, replicaSet, singleNode } from "./calc/topology";
import { DEFAULT_K8S } from "./calc/rules";
import type { Topology } from "./calc/types";

export type Preset = {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly topology: Topology;
};

const withNonProd: Topology = {
  kind: "replicaSet",
  hosting: "vm",
  k8s: DEFAULT_K8S,
  members: [
    makeMember(1, "primary", 8, 64),
    makeMember(2, "secondary", 8, 64),
    makeMember(3, "secondary", 8, 64),
    makeMember(4, "secondary", 8, 64, "nonprod"),
    makeMember(5, "secondary", 8, 64, "nonprod"),
  ],
};

const rsSmall: Preset = {
  id: "rs-small",
  label: "3 members, 16 GB, VMs",
  blurb: "Small replica set. One 256 GB pool license beats 3 node licenses.",
  topology: replicaSet(3, 4, 16),
};

export const DEFAULT_PRESET: Preset = rsSmall;

export const PRESETS: readonly Preset[] = [
  {
    id: "single-small",
    label: "Single node, 16 GB",
    blurb: "One small server. A whole pool license is more than it needs.",
    topology: singleNode(4, 16),
  },
  rsSmall,
  {
    id: "rs-large",
    label: "3 members, 192 GB, VMs",
    blurb: "Big nodes. Node licenses cost far less than 576 GB of pool.",
    topology: replicaSet(3, 32, 192),
  },
  {
    id: "rs-nonprod",
    label: "3 prod + 2 non-prod, 64 GB",
    blurb: "Non-prod nodes are half price per-node, but full RAM in the pool.",
    topology: withNonProd,
  },
  {
    id: "k8s-3pods",
    label: "Kubernetes, 3 pods x 32 GB",
    blurb: "Three 32 GB pods on 256 GB workers count as 96 GB, not 768 GB.",
    topology: { ...replicaSet(3, 8, 32, "k8s"), k8s: { workerRamGB: 256, podsPerWorker: 1 } },
  },
];
