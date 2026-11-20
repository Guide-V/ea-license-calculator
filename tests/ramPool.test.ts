import { describe, expect, it } from "vitest";
import { poolBreakEvenGB, poolCover } from "../src/calc/ramPool";
import { DEFAULT_PRICES } from "../src/calc/rules";

const prices = { ...DEFAULT_PRICES, poolLicense: 100_000 };

describe("poolCover: one license covers 256 GB over any number of nodes", () => {
  it("buys nothing for 0 GB", () => {
    expect(poolCover(0, prices)).toMatchObject({ licenses: 0, cost: 0, coveredGB: 0 });
  });

  it("covers up to 256 GB with one license", () => {
    [1, 48, 255, 256].forEach((gb) => {
      expect(poolCover(gb, prices)).toMatchObject({ licenses: 1, cost: 100_000, coveredGB: 256 });
    });
  });

  it("needs a second license at 257 GB", () => {
    expect(poolCover(257, prices)).toMatchObject({ licenses: 2, cost: 200_000, coveredGB: 512 });
  });

  it("covers 768 GB with 3 licenses", () => {
    expect(poolCover(768, prices)).toMatchObject({ licenses: 3, cost: 300_000 });
  });

  it("always covers at least the requested RAM and never gets cheaper as RAM grows", () => {
    const totals = [1, 64, 128, 256, 257, 500, 1000];
    const covers = totals.map((gb) => poolCover(gb, prices));
    covers.forEach((cover, i) => expect(cover.coveredGB).toBeGreaterThanOrEqual(totals[i]!));
    const costs = covers.map((cover) => cover.cost);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });
});

describe("poolBreakEvenGB", () => {
  it("is the average RAM per node where a full pool equals node licenses", () => {
    expect(poolBreakEvenGB(DEFAULT_PRICES)).toBeCloseTo(40);
    expect(poolBreakEvenGB({ perNodeLicense: 15_000, poolLicense: 100_000 })).toBeCloseTo(38.4);
  });

  it("is unbounded when the pool is free", () => {
    expect(poolBreakEvenGB({ perNodeLicense: 100, poolLicense: 0 })).toBe(Number.POSITIVE_INFINITY);
  });
});
