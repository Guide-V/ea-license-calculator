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
export const MAX_CLUSTERS = 50;
export const MIN_RAM_GB = 1;
export const MAX_RAM_GB = 1024;
export const MAX_VCPU = 128;

/**
 * Neutral placeholder prices (per year, arbitrary currency units).
 * They are NOT MongoDB prices. Only the ratio matters: 100 vs 640 (6.4x)
 * puts the full-pool break-even at 40 GB average RAM per prod node, matching
 * typical EA economics where RAM pool wins for small nodes / microservice fleets
 * and per-node wins for larger nodes.
 */
export const DEFAULT_PRICES: Prices = {
  currency: "$",
  perNodeLicense: 100,
  poolLicense: 640,
};

export type PriceRatioPreset = {
  readonly id: string;
  readonly label: string;
  readonly poolLicense: number;
  readonly perNodeLicense: number;
};

export const PRICE_RATIO_PRESETS: readonly PriceRatioPreset[] = [
  { id: "typical", label: "Typical (6.4x, 40 GB)", perNodeLicense: 100, poolLicense: 640 },
  { id: "mid", label: "Mid (4x, 64 GB)", perNodeLicense: 100, poolLicense: 400 },
  { id: "low", label: "Low (2.5x, 102 GB)", perNodeLicense: 100, poolLicense: 250 },
] as const;

export const DEFAULT_K8S: K8sSettings = {
  workerRamGB: 256,
  podsPerWorker: 3,
};

export const SOURCES = [
  {
    title: "MongoDB Enterprise Advanced pricing guidance",
    note: "Covers the 256 GB per-node cap, the 256 GB RAM pool license, 50% non-prod node pricing, and the pool-only container rule. Query routers (mongos), config servers, and Ops Manager servers do not need data-bearing licenses.",
  },
  {
    title: "MongoDB Enterprise Advanced container licensing guidance",
    note: "On Kubernetes, the pool counts each data-bearing mongod container's memory limit, not memory requests or worker RAM.",
  },
] as const;
