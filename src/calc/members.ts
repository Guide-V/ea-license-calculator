import { NONPROD_PRICE_FACTOR } from "./rules";
import type { Member, Topology } from "./types";

/** Every member is a data-bearing mongod and is licensed. Arbiters are not offered. */
export const billableMembers = (topology: Topology): readonly Member[] => topology.members;

/** Total deployments across prod and separate non-prod clusters (at least 1). */
export const totalDeployments = (topology: Topology): number =>
  Math.max(1, topology.clusters + topology.nonProdClusters);

/** Data-bearing RAM of a single deployment of this shape. */
export const clusterRamGB = (topology: Topology): number =>
  billableMembers(topology).reduce((sum, member) => sum + member.ramGB, 0);

/** Combined data-bearing RAM across the entire estate (all prod + non-prod deployments). */
export const totalDataRamGB = (topology: Topology): number =>
  clusterRamGB(topology) * totalDeployments(topology);

export const isNonProd = (member: Member): boolean => member.env === "nonprod";

/** Total data-bearing nodes across all deployments. */
export const estateNodeCount = (topology: Topology): number =>
  billableMembers(topology).length * totalDeployments(topology);

/** Total non-prod data-bearing nodes across all deployments. */
export const estateNonProdNodeCount = (topology: Topology): number => {
  const members = billableMembers(topology);
  const templateNonProd = members.filter(isNonProd).length;
  return topology.clusters * templateNonProd + topology.nonProdClusters * members.length;
};

/** Share of the prod per-node price that this member pays. */
export const nodePriceFactor = (member: Member): number => (isNonProd(member) ? NONPROD_PRICE_FACTOR : 1);
