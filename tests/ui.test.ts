import { describe, expect, it } from "vitest";
import { replicaSet, setMemberCount } from "../src/calc/topology";
import { money, plural } from "../src/ui/format";
import { fromSlider, toSlider } from "../src/ui/scale";

describe("log slider scale", () => {
  it("maps the ends of the range", () => {
    expect(fromSlider(0, 1, 1024)).toBe(1);
    expect(fromSlider(1000, 1, 1024)).toBe(1024);
  });

  it.each([1, 8, 16, 32, 64, 256, 512, 1024])("round-trips %i GB", (ram) => {
    expect(fromSlider(toSlider(ram, 1, 1024), 1, 1024)).toBe(ram);
  });
});

describe("format", () => {
  it("formats money with the chosen currency", () => {
    expect(money(12490, "$")).toBe("$12,490");
  });
  it("pluralizes", () => {
    expect(plural(1, "license")).toBe("1 license");
    expect(plural(3, "license")).toBe("3 licenses");
  });
});

describe("setMemberCount", () => {
  it("grows by adding secondaries", () => {
    expect(setMemberCount(replicaSet(3, 4, 16), 5).members).toHaveLength(5);
  });
  it("shrinks from the end and keeps the primary", () => {
    const shrunk = setMemberCount(replicaSet(5, 4, 16), 1);
    expect(shrunk.members.map((member) => member.role)).toEqual(["primary"]);
  });
});
