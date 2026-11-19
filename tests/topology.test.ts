import { describe, expect, it } from "vitest";
import {
  addMember,
  removeMember,
  replicaSet,
  setAllSizes,
  setKind,
  singleNode,
  updateMember,
} from "../src/calc/topology";

describe("topology helpers are immutable", () => {
  it("addMember returns a new topology and leaves the original alone", () => {
    const before = replicaSet(3, 4, 16);
    const after = addMember(before);
    expect(before.members).toHaveLength(3);
    expect(after.members).toHaveLength(4);
    expect(after.members[3]?.id).toBe(4);
  });

  it("single node cannot gain members", () => {
    const single = singleNode(4, 16);
    expect(addMember(single)).toBe(single);
  });

  it("keeps at least one data-bearing member", () => {
    const rs = replicaSet(1, 4, 16);
    expect(removeMember(rs, 1)).toBe(rs);
  });

  it("updateMember clamps RAM to sane bounds", () => {
    const rs = updateMember(replicaSet(3, 4, 16), 2, { ramGB: 99999 });
    expect(rs.members[1]?.ramGB).toBe(1024);
  });

  it("switching single to replica set adds two secondaries", () => {
    const rs = setKind(singleNode(4, 16), "replicaSet");
    expect(rs.members.map((member) => member.role)).toEqual(["primary", "secondary", "secondary"]);
  });

  it("switching replica set to single keeps one primary", () => {
    const single = setKind(replicaSet(3, 4, 16), "single");
    expect(single.members).toHaveLength(1);
    expect(single.members[0]?.role).toBe("primary");
  });

  it("setAllSizes updates every member", () => {
    const rs = setAllSizes(replicaSet(3, 4, 16), { ramGB: 64 });
    expect(rs.members.every((member) => member.ramGB === 64)).toBe(true);
  });
});
