import { describe, expect, it } from "vitest";
import { TwoLevelKeyIndex } from "../../out/graph/index.js";

describe("semantic-authority graph two-level key index", () => {
  it("supports exact secondary lookup and primary-key range scan", () => {
    const index = new TwoLevelKeyIndex();

    index.set("ctx-a", "family-1", "n1");
    index.set("ctx-a", "family-2", "n2");
    index.set("ctx-a", "family-2", "n3");
    index.set("ctx-b", "family-1", "n4");

    expect(index.get("ctx-a", "family-1")).toEqual(["n1"]);
    expect(index.get("ctx-a", "family-2")).toEqual(["n2", "n3"]);
    expect(index.get("ctx-a")).toEqual(["n1", "n2", "n3"]);
    expect(index.get("ctx-b")).toEqual(["n4"]);
    expect(index.scanByPrimaryPrefix("ctx", "family-1")).toEqual(["n1", "n4"]);
    expect(index.scanByPrimaryPrefix("ctx-a")).toEqual(["n1", "n2", "n3"]);
  });

  it("deduplicates repeated inserts and removes empty buckets on delete", () => {
    const index = new TwoLevelKeyIndex();

    index.set("ctx-a", "family-1", "n1");
    index.set("ctx-a", "family-1", "n1");

    expect(index.get("ctx-a", "family-1")).toEqual(["n1"]);

    expect(index.delete("ctx-a", "family-1", "n1")).toBe(true);
    expect(index.delete("ctx-a", "family-1", "n1")).toBe(false);
    expect(index.get("ctx-a", "family-1")).toEqual([]);
    expect(index.get("ctx-a")).toEqual([]);
  });

  it("clears all primary and secondary buckets", () => {
    const index = new TwoLevelKeyIndex();

    index.set("ctx-a", "family-1", "n1");
    index.set("ctx-b", "family-2", "n2");

    index.clear();

    expect(index.get("ctx-a")).toEqual([]);
    expect(index.get("ctx-b", "family-2")).toEqual([]);
  });
});
