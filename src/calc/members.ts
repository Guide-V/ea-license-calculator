import type { Member, Topology } from "./types";

/** Arbiters hold no data and are free. Every other member counts. */
export const isDataBearing = (member: Member): boolean => member.role !== "arbiter";

export const billableMembers = (topology: Topology): readonly Member[] =>
  topology.members.filter(isDataBearing);

export const totalDataRamGB = (topology: Topology): number =>
  billableMembers(topology).reduce((sum, member) => sum + member.ramGB, 0);
