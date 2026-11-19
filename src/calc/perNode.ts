import { billableMembers } from "./members";
import { NODE_RAM_CAP_GB } from "./rules";
import type { Prices, Topology } from "./types";

/** Licenses needed by one data-bearing mongod: ceil(RAM / 256), at least 1. */
export const licensesForNode = (ramGB: number): number =>
  Math.max(1, Math.ceil(ramGB / NODE_RAM_CAP_GB));

export type PerNodeResult =
  | {
      readonly available: true;
      readonly licenses: number;
      readonly cost: number;
      readonly perMember: readonly { readonly id: number; readonly licenses: number }[];
    }
  | { readonly available: false; readonly reason: string };

export const perNodeCost = (topology: Topology, prices: Prices): PerNodeResult => {
  if (topology.hosting === "k8s") {
    return {
      available: false,
      reason: "Per-node licensing is not available for containerized deployments. Use the RAM pool.",
    };
  }
  const perMember = billableMembers(topology).map((member) => ({
    id: member.id,
    licenses: licensesForNode(member.ramGB),
  }));
  const licenses = perMember.reduce((sum, entry) => sum + entry.licenses, 0);
  return { available: true, licenses, cost: licenses * prices.perNodeLicense, perMember };
};
