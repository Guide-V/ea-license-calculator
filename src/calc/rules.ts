import type { K8sSettings, Prices } from "./types";

/**
 * Licensing rules for MongoDB Enterprise Advanced.
 * Rules are fixed here. Prices are editable placeholders.
 */

/** One per-node license covers a data-bearing mongod with up to this much RAM. */
export const NODE_RAM_CAP_GB = 256;

/** A non-prod node license costs this share of a prod node license. Pool entitlements are identical for both. */
export const NONPROD_PRICE_FACTOR = 0.5;

/** One RAM pool license covers this much combined RAM, over any number of nodes. */
export const POOL_LICENSE_GB = 256;

export const MAX_MEMBERS = 50;
export const MIN_RAM_GB = 1;
export const MAX_RAM_GB = 1024;
export const MAX_VCPU = 128;

/**
 * Neutral placeholder prices (per year, arbitrary currency units).
 * They are NOT MongoDB prices. Only the ratio matters: with these values a
 * full pool beats node licenses below about 100 GB average RAM per node.
 */
export const DEFAULT_PRICES: Prices = {
  currency: "$",
  perNodeLicense: 100,
  poolLicense: 250,
};

export const DEFAULT_K8S: K8sSettings = {
  workerRamGB: 256,
  podsPerWorker: 3,
};

export const SOURCES = [
  {
    title: "MongoDB Enterprise Advanced pricing guidance",
    note: "Per-node rule, pool license, free arbiters and config servers, containers are pool-only.",
  },
  {
    title: "MongoDB Enterprise Advanced container licensing guidance",
    note: "On Kubernetes the pool counts each data-bearing mongod container's memory limit, not the worker RAM.",
  },
] as const;
