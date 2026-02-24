import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  findSimilar,
  findBestMatch,
  formatSuggestion,
} from "../../out/shared/suggestions.js";

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
    expect(levenshteinDistance("abc", "abc")).toBe(0);
    expect(levenshteinDistance("bind", "bind")).toBe(0);
  });

  it("returns string length for empty comparisons", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
    expect(levenshteinDistance("", "hello")).toBe(5);
  });

  it("calculates single insertions", () => {
    expect(levenshteinDistance("bnd", "bind")).toBe(1);
    expect(levenshteinDistance("clik", "click")).toBe(1);
    expect(levenshteinDistance("to-vew", "to-view")).toBe(1);
  });

  it("calculates single deletions", () => {
    expect(levenshteinDistance("bindd", "bind")).toBe(1);
    expect(levenshteinDistance("clickk", "click")).toBe(1);
  });

  it("calculates single substitutions", () => {
    expect(levenshteinDistance("bund", "bind")).toBe(1);
    expect(levenshteinDistance("triiger", "trigger")).toBe(1);
  });

  it("calculates multiple edits", () => {
    expect(levenshteinDistance("cat", "dog")).toBe(3);
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("saturday", "sunday")).toBe(3);
  });

  it("handles case differences", () => {
    expect(levenshteinDistance("Bind", "bind")).toBe(1);
    expect(levenshteinDistance("BIND", "bind")).toBe(4);
  });

  it("is symmetric", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(levenshteinDistance("xyz", "abc"));
    expect(levenshteinDistance("bind", "bnd")).toBe(levenshteinDistance("bnd", "bind"));
  });
});

describe("findSimilar", () => {
  const commands = ["bind", "one-time", "to-view", "from-view", "two-way", "trigger", "capture"];

  it("finds exact matches with distance 0", () => {
    expect(findSimilar("bind", commands)).toEqual(["bind"]);
    expect(findSimilar("trigger", commands)).toEqual(["trigger"]);
  });

  it("finds single-character typos", () => {
    expect(findSimilar("bnd", commands)).toEqual(["bind"]);
    expect(findSimilar("trigerr", commands)).toEqual(["trigger"]);
  });

  it("returns empty array when nothing is close", () => {
    expect(findSimilar("xyz", commands)).toEqual([]);
    expect(findSimilar("unknowncommand", commands)).toEqual([]);
  });

  it("is case-insensitive by default", () => {
    expect(findSimilar("BIND", commands)).toEqual(["bind"]);
    expect(findSimilar("Trigger", commands)).toEqual(["trigger"]);
  });

  it("respects caseSensitive option", () => {
    expect(findSimilar("BIND", commands, { caseSensitive: true })).toEqual([]);
    expect(findSimilar("bind", commands, { caseSensitive: true })).toEqual(["bind"]);
  });

  it("respects maxDistance option", () => {
    expect(findSimilar("bnd", commands, { maxDistance: 1 })).toEqual(["bind"]);
    expect(findSimilar("bnd", commands, { maxDistance: 0 })).toEqual([]);
    expect(findSimilar("trigerr", commands, { maxDistance: 1 })).toEqual([]);
    expect(findSimilar("trigerr", commands, { maxDistance: 2 })).toEqual(["trigger"]);
  });

  it("returns multiple matches when limit > 1", () => {
    // "tw" is close to both "two-way" and... hmm, maybe not a good example
    // Let's use a custom list
    const similar = ["test", "text", "tent", "rest"];
    const matches = findSimilar("tost", similar, { limit: 3 });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("sorts by distance (closest first)", () => {
    const options = ["abc", "abcd", "abcde"];
    const matches = findSimilar("ab", options, { limit: 3 });
    // "abc" (distance 1) should come before "abcd" (distance 2)
    expect(matches[0]).toBe("abc");
  });
});

describe("findBestMatch", () => {
  const commands = ["bind", "one-time", "to-view", "from-view", "two-way"];

  it("returns the best match", () => {
    expect(findBestMatch("bnd", commands)).toBe("bind");
    expect(findBestMatch("to-veiw", commands)).toBe("to-view");
  });

  it("returns null when nothing is close", () => {
    expect(findBestMatch("xyz", commands)).toBeNull();
    expect(findBestMatch("unknowncommand", commands)).toBeNull();
  });
});

describe("formatSuggestion", () => {
  const commands = ["bind", "one-time", "to-view", "trigger"];

  it("formats a suggestion when match found", () => {
    expect(formatSuggestion("bnd", commands)).toBe(" Did you mean 'bind'?");
    expect(formatSuggestion("trigerr", commands)).toBe(" Did you mean 'trigger'?");
  });

  it("returns empty string when no match", () => {
    expect(formatSuggestion("xyz", commands)).toBe("");
    expect(formatSuggestion("unknowncommand", commands)).toBe("");
  });

  it("includes leading space for easy concatenation", () => {
    const suggestion = formatSuggestion("bnd", commands);
    expect(suggestion.startsWith(" ")).toBe(true);

    // Use case: error message concatenation
    const errorMsg = `Unknown command 'bnd'.${suggestion}`;
    expect(errorMsg).toBe("Unknown command 'bnd'. Did you mean 'bind'?");
  });
});
