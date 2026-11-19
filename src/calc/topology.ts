import { isDataBearing } from "./members";
import { DEFAULT_K8S, MAX_MEMBERS, MAX_RAM_GB, MAX_VCPU, MIN_RAM_GB } from "./rules";
import type { Hosting, Member, Role, Topology, TopologyKind } from "./types";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const nextId = (members: readonly Member[]): number =>
  members.reduce((max, member) => Math.max(max, member.id), 0) + 1;

export const makeMember = (id: number, role: Role, vcpu: number, ramGB: number): Member => ({
  id,
  role,
  vcpu: clamp(Math.round(vcpu), 1, MAX_VCPU),
  ramGB: clamp(Math.round(ramGB), MIN_RAM_GB, MAX_RAM_GB),
});

export const singleNode = (vcpu: number, ramGB: number, hosting: Hosting = "vm"): Topology => ({
  kind: "single",
  hosting,
  members: [makeMember(1, "primary", vcpu, ramGB)],
  k8s: DEFAULT_K8S,
});

export const replicaSet = (
  size: number,
  vcpu: number,
  ramGB: number,
  hosting: Hosting = "vm",
): Topology => ({
  kind: "replicaSet",
  hosting,
  members: Array.from({ length: clamp(size, 1, MAX_MEMBERS) }, (_, i) =>
    makeMember(i + 1, i === 0 ? "primary" : "secondary", vcpu, ramGB),
  ),
  k8s: DEFAULT_K8S,
});

export const setHosting = (topology: Topology, hosting: Hosting): Topology => ({ ...topology, hosting });

export const setK8s = (topology: Topology, patch: Partial<Topology["k8s"]>): Topology => ({
  ...topology,
  k8s: {
    workerRamGB: clamp(patch.workerRamGB ?? topology.k8s.workerRamGB, 1, 4096),
    podsPerWorker: clamp(Math.round(patch.podsPerWorker ?? topology.k8s.podsPerWorker), 1, MAX_MEMBERS),
  },
});

export const setKind = (topology: Topology, kind: TopologyKind): Topology => {
  if (kind === topology.kind) return topology;
  if (kind === "single") {
    const first = topology.members.find(isDataBearing) ?? topology.members[0];
    return { ...topology, kind, members: first ? [{ ...first, role: "primary" }] : [] };
  }
  const base = topology.members[0] ?? makeMember(1, "primary", 4, 16);
  const filler = Array.from({ length: 2 }, (_, i) =>
    makeMember(nextId(topology.members) + i, "secondary", base.vcpu, base.ramGB),
  );
  return { ...topology, kind, members: [...topology.members, ...filler] };
};

export const addMember = (topology: Topology, role: Role = "secondary"): Topology => {
  if (topology.kind === "single" || topology.members.length >= MAX_MEMBERS) return topology;
  const template = topology.members.find(isDataBearing) ?? topology.members[0];
  const member = makeMember(nextId(topology.members), role, template?.vcpu ?? 4, template?.ramGB ?? 16);
  return { ...topology, members: [...topology.members, member] };
};

/** Grows with secondaries or shrinks from the end. Always keeps the first member. */
export const setMemberCount = (topology: Topology, count: number): Topology => {
  if (topology.kind === "single") return topology;
  const target = clamp(Math.round(count), 1, MAX_MEMBERS);
  if (target <= topology.members.length) {
    const kept = topology.members.slice(0, target);
    return kept.some(isDataBearing) ? { ...topology, members: kept } : topology;
  }
  return Array.from({ length: target - topology.members.length }).reduce<Topology>(
    (acc) => addMember(acc),
    topology,
  );
};

/** Arbiter <-> secondary. Never turns the last data-bearing member into an arbiter. */
export const toggleArbiter = (topology: Topology, id: number): Topology => {
  const target = topology.members.find((member) => member.id === id);
  if (!target || topology.kind === "single") return topology;
  if (target.role === "arbiter") return updateMember(topology, id, { role: "secondary" });
  const othersData = topology.members.filter((member) => member.id !== id && isDataBearing(member));
  return othersData.length === 0 ? topology : updateMember(topology, id, { role: "arbiter" });
};

export const removeMember = (topology: Topology, id: number): Topology => {
  const members = topology.members.filter((member) => member.id !== id);
  const hasData = members.some(isDataBearing);
  return topology.kind === "single" || !hasData ? topology : { ...topology, members };
};

export const updateMember = (
  topology: Topology,
  id: number,
  patch: Partial<Pick<Member, "role" | "vcpu" | "ramGB">>,
): Topology => ({
  ...topology,
  members: topology.members.map((member) =>
    member.id === id
      ? makeMember(member.id, patch.role ?? member.role, patch.vcpu ?? member.vcpu, patch.ramGB ?? member.ramGB)
      : member,
  ),
});

/** Sets every member's RAM and vCPU at once, for "all members the same size". */
export const setAllSizes = (
  topology: Topology,
  patch: Partial<Pick<Member, "vcpu" | "ramGB">>,
): Topology => ({
  ...topology,
  members: topology.members.map((member) =>
    makeMember(member.id, member.role, patch.vcpu ?? member.vcpu, patch.ramGB ?? member.ramGB),
  ),
});
