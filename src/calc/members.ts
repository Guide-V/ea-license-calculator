import { NONPROD_PRICE_FACTOR } from "./rules";
import type { Member, Topology } from "./types";

/** Every member is a data-bearing mongod and is licensed. Arbiters are not offered. */
export const billableMembers = (topology: Topology): readonly Member[] => topology.members;

export const totalDataRamGB = (topology: Topology): number =>
  billableMembers(topology).reduce((sum, member) => sum + member.ramGB, 0);

export const isNonProd = (member: Member): boolean => member.env === "nonprod";

/** Share of the prod per-node price that this member pays. */
export const nodePriceFactor = (member: Member): number => (isNonProd(member) ? NONPROD_PRICE_FACTOR : 1);
