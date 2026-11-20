import { billableMembers, isNonProd } from "./members";
import { NODE_RAM_CAP_GB, NONPROD_PRICE_FACTOR } from "./rules";
import type { Prices, Topology } from "./types";

/** Licenses needed by one data-bearing mongod: ceil(RAM / 256), at least 1. */
export const licensesForNode = (ramGB: number): number =>
  Math.max(1, Math.ceil(ramGB / NODE_RAM_CAP_GB));

export type PerNodeResult =
  | {
      readonly available: true;
      /** All node licenses across the estate, prod and non-prod. */
      readonly licenses: number;
      readonly prodLicenses: number;
      readonly nonProdLicenses: number;
      readonly cost: number;
      /** Per-member licenses for one template deployment. */
      readonly perMember: readonly { readonly id: number; readonly licenses: number; readonly nonProd: boolean }[];
    }
  | { readonly available: false; readonly reason: string };

export const perNodeCost = (topology: Topology, prices: Prices): PerNodeResult => {
  if (topology.hosting === "k8s") {
    return {
      available: false,
      reason: "Per-node licensing is not available for containerized deployments. Use the RAM pool.",
    };
  }
  const members = billableMembers(topology);
  const perMember = members.map((member) => ({
    id: member.id,
    licenses: licensesForNode(member.ramGB),
    nonProd: isNonProd(member),
  }));
  const sum = (entries: readonly { readonly licenses: number }[]) =>
    entries.reduce((total, entry) => total + entry.licenses, 0);
  const templateTotal = sum(perMember);
  const templateNonProd = sum(perMember.filter((entry) => entry.nonProd));
  const templateProd = templateTotal - templateNonProd;

  const prodLicenses = templateProd * topology.clusters;
  const nonProdLicenses = templateNonProd * topology.clusters + templateTotal * topology.nonProdClusters;
  const licenses = prodLicenses + nonProdLicenses;
  const cost = (prodLicenses + nonProdLicenses * NONPROD_PRICE_FACTOR) * prices.perNodeLicense;
  return { available: true, licenses, prodLicenses, nonProdLicenses, cost, perMember };
};
