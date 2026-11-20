import { describe, expect, it } from "vitest";
import { MAX_MEMBERS } from "../src/calc/rules";
import {
  addMember,
  makeMember,
  removeMember,
  replicaSet,
  setAllSizes,
  setClusters,
  setKind,
  setMemberCountFromSlider,
  setNonProdClusters,
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

  it("updateMember changes the role and keeps every member", () => {
    const rs = updateMember(replicaSet(3, 4, 16), 2, { role: "hidden" });
    expect(rs.members.map((member) => member.role)).toEqual(["primary", "hidden", "secondary"]);
    expect(updateMember(rs, 1, { ramGB: 32 }).members[0]).toMatchObject({ role: "primary", ramGB: 32 });
  });

  it("member slider uses MAX_MEMBERS and does not delete members by echoing a clamped thumb", () => {
    const twenty = {
      ...replicaSet(1, 4, 16),
      members: Array.from({ length: 20 }, (_, index) => makeMember(index + 1, index === 0 ? "primary" : "secondary", 4, 16)),
    };
    expect(setMemberCountFromSlider(twenty, 20).members).toHaveLength(20);
    expect(setMemberCountFromSlider(twenty, 16).members).toHaveLength(16);
    expect(setMemberCountFromSlider(twenty, MAX_MEMBERS).members).toHaveLength(MAX_MEMBERS);

    const over = {
      ...twenty,
      members: Array.from({ length: MAX_MEMBERS + 5 }, (_, index) =>
        makeMember(index + 1, index === 0 ? "primary" : "secondary", 4, 16),
      ),
    };
    expect(setMemberCountFromSlider(over, MAX_MEMBERS)).toBe(over);
    expect(setMemberCountFromSlider(over, MAX_MEMBERS - 1).members).toHaveLength(MAX_MEMBERS - 1);
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

  it("setClusters and setNonProdClusters stay immutable and keep at least one deployment", () => {
    const rs = replicaSet(3, 4, 16);
    const grown = setClusters(rs, 4);
    expect(rs.clusters).toBe(1);
    expect(grown.clusters).toBe(4);
    expect(setClusters(rs, 0).clusters).toBe(1);

    const withNonProd = setNonProdClusters(rs, 2);
    expect(withNonProd.nonProdClusters).toBe(2);
    expect(setClusters(withNonProd, 0)).toMatchObject({ clusters: 0, nonProdClusters: 2 });
    expect(setNonProdClusters(setClusters(withNonProd, 0), 0).nonProdClusters).toBe(1);
  });
});
