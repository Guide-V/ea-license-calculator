import { NONPROD_PRICE_FACTOR } from "./rules";
import type { Member, Topology } from "./types";

/** Arbiters hold no data and are free. Every other member counts. */
export const isDataBearing = (member: Member): boolean => member.role !== "arbiter";

export const billableMembers = (topology: Topology): readonly Member[] =>
  topology.members.filter(isDataBearing);

export const totalDataRamGB = (topology: Topology): number =>
  billableMembers(topology).reduce((sum, member) => sum + member.ramGB, 0);

export const isNonProd = (member: Member): boolean => member.env === "nonprod";

/** Share of the prod per-node price that this member pays. */
export const nodePriceFactor = (member: Member): number => (isNonProd(member) ? NONPROD_PRICE_FACTOR : 1);
