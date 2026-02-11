import { describe, expect, test } from "vitest";

import {
  createDiffChannelSpecs,
  readDiffChannel,
  validateVectorsInFile,
} from "./vector-runner.js";
import { diffByKeyCounts } from "./test-utils.js";

describe("vector oracle contracts", () => {
  test("createDiffChannelSpecs builds default camel-case channels", () => {
    const channels = createDiffChannelSpecs(["frames", "diags"], undefined);
    expect(channels).toEqual({
      frames: { missingKey: "missingFrames", extraKey: "extraFrames" },
      diags: { missingKey: "missingDiags", extraKey: "extraDiags" },
    });
  });

  test("createDiffChannelSpecs honors explicit overrides", () => {
    const channels = createDiffChannelSpecs(["items"], {
      items: { missingKey: "missing_items", extraKey: "extra_items" },
    });
    expect(channels).toEqual({
      items: { missingKey: "missing_items", extraKey: "extra_items" },
    });
  });

  test("readDiffChannel throws when channel is missing", () => {
    expect(() =>
      readDiffChannel({}, "missingItems", "suite", "vector", "items")
    ).toThrow('compare() must provide diff channel "missingItems"');
  });

  test("readDiffChannel throws on non-array channel", () => {
    expect(() =>
      readDiffChannel(
        { missingItems: "bad" },
        "missingItems",
        "suite",
        "vector",
        "items"
      )
    ).toThrow('diff channel "missingItems" must be an array');
  });

  test("readDiffChannel throws on non-string entries", () => {
    expect(() =>
      readDiffChannel(
        { missingItems: ["ok", 1] },
        "missingItems",
        "suite",
        "vector",
        "items"
      )
    ).toThrow('diff channel "missingItems" must contain strings');
  });

  test("diffByKeyCounts tracks duplicate cardinality", () => {
    const actual = ["a", "a", "b"];
    const expected = ["a", "b", "b", "c"];
    const result = diffByKeyCounts(actual, expected, (value) => value);
    expect(result).toEqual({
      missing: ["b", "c"],
      extra: ["a"],
    });
  });

  test("validateVectorsInFile rejects unknown top-level keys", () => {
    const payload = [
      {
        name: "bad-top-level",
        markup: "<div></div>",
        expect: {},
        typoedKey: true,
      },
    ];

    expect(() =>
      validateVectorsInFile(payload, "bad.json", {
        suiteName: "suite",
        categories: ["items"],
      })
    ).toThrow('unknown top-level key "typoedKey"');
  });

  test("validateVectorsInFile rejects unknown expect keys", () => {
    const payload = [
      {
        name: "bad-expect",
        markup: "<div></div>",
        expect: {
          items: [],
          typoed_expect_key: [],
        },
      },
    ];

    expect(() =>
      validateVectorsInFile(payload, "bad.json", {
        suiteName: "suite",
        categories: ["items"],
      })
    ).toThrow('expect has unknown key "typoed_expect_key"');
  });
});
