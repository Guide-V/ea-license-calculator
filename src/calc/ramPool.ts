import { POOL_LICENSE_GB } from "./rules";
import type { Prices } from "./types";

export type PoolCover = {
  readonly totalGB: number;
  /** Number of 256 GB pool licenses bought. */
  readonly licenses: number;
  /** RAM the licenses cover: licenses x 256 GB. */
  readonly coveredGB: number;
  readonly cost: number;
};

/**
 * One pool license covers 256 GB of combined data-bearing RAM, spread over
 * any number of nodes. Buy enough licenses for the combined RAM.
 */
export const poolCover = (totalGB: number, prices: Pick<Prices, "poolLicense">): PoolCover => {
  const licenses = Math.max(0, Math.ceil(totalGB / POOL_LICENSE_GB));
  return {
    totalGB,
    licenses,
    coveredGB: licenses * POOL_LICENSE_GB,
    cost: licenses * prices.poolLicense,
  };
};

/**
 * Average RAM per node below which a full pool beats per-node licensing:
 * N nodes of r GB cost N x perNode, and fill N x r / 256 pool licenses.
 */
export const poolBreakEvenGB = (prices: Pick<Prices, "perNodeLicense" | "poolLicense">): number =>
  prices.poolLicense === 0 ? Number.POSITIVE_INFINITY : (POOL_LICENSE_GB * prices.perNodeLicense) / prices.poolLicense;
