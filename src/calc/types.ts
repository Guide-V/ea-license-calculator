export type Role = "primary" | "secondary" | "hidden" | "delayed";

/** Non-prod members cost half under per-node licensing. The RAM pool treats them like prod. */
export type Environment = "prod" | "nonprod";

export type Hosting = "vm" | "k8s";

export type TopologyKind = "single" | "replicaSet";

export type Member = {
  readonly id: number;
  readonly role: Role;
  readonly env: Environment;
  readonly vcpu: number;
  /** VM RAM on VMs, or the enforced pod memory limit on Kubernetes. */
  readonly ramGB: number;
};

export type K8sSettings = {
  readonly workerRamGB: number;
  readonly podsPerWorker: number;
};

export type Topology = {
  readonly kind: TopologyKind;
  readonly hosting: Hosting;
  readonly members: readonly Member[];
  readonly k8s: K8sSettings;
};

export type Prices = {
  readonly currency: string;
  /** Price of one per-node license (covers up to NODE_RAM_CAP_GB). */
  readonly perNodeLicense: number;
  /** Price of one RAM pool license (covers POOL_LICENSE_GB of combined RAM). */
  readonly poolLicense: number;
};

export type Model = "perNode" | "ramPool";
