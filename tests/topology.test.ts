import { describe, expect, it } from "vitest";
import { MAX_MEMBERS } from "../src/calc/rules";
import {
  addMember,
  makeMember,
  removeMember,
  replicaSet,
  setAllSizes,
  setKind,
  setMemberCountFromSlider,
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

  it("updateMember keeps at least one data-bearing member", () => {
    const rs = replicaSet(3, 4, 16);
    const onlyPrimary = updateMember(updateMember(rs, 2, { role: "arbiter" }), 3, { role: "arbiter" });
    expect(onlyPrimary.members.map((member) => member.role)).toEqual(["primary", "arbiter", "arbiter"]);
    expect(updateMember(onlyPrimary, 1, { role: "arbiter" })).toBe(onlyPrimary);
    expect(updateMember(onlyPrimary, 1, { role: "arbiter", ramGB: 512 })).toBe(onlyPrimary);
    expect(updateMember(onlyPrimary, 1, { role: "hidden" }).members[0]?.role).toBe("hidden");
    expect(updateMember(onlyPrimary, 1, { ramGB: 32 }).members[0]).toMatchObject({ role: "primary", ramGB: 32 });
  });

  it("updateMember can make a member an arbiter while another data-bearing member remains", () => {
    const rs = updateMember(replicaSet(2, 4, 16), 1, { role: "arbiter" });
    expect(rs.members.map((member) => member.role)).toEqual(["arbiter", "secondary"]);
    expect(updateMember(singleNode(4, 16), 1, { role: "arbiter" })).toEqual(singleNode(4, 16));
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
});
