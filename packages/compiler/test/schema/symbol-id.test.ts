import { describe, expect, it } from "vitest";

import {
  createBindableSymbolId,
  createLocalSymbolId,
  createResourceSymbolId,
  isSymbolId,
  isSymbolIdNamespace,
  normalizePathForId,
  parseSymbolId,
  stableHash,
  symbolIdNamespace,
  type SymbolId,
} from "@aurelia-ls/compiler";

describe("symbol id policy", () => {
  it("creates resource ids with sym namespace and stable payload hash", () => {
    const id = createResourceSymbolId({
      kind: "custom-element",
      name: "my-element",
      origin: "source",
      sourceKey: "src/my-element.ts",
      packageName: "@demo/core",
    });

    const expected = `sym:${stableHash({
      kind: "custom-element",
      name: "my-element",
      origin: "source",
      source: "src/my-element.ts",
      package: "@demo/core",
    })}`;

    expect(id).toBe(expected);
  });

  it("creates local ids with local namespace and normalized file path", () => {
    const id = createLocalSymbolId({
      file: "C:\\Repo\\src\\my-app.html",
      frame: "12",
      name: "total",
    });

    const expected = `local:${stableHash({
      kind: "local",
      file: String(normalizePathForId("C:\\Repo\\src\\my-app.html")),
      frame: "12",
      name: "total",
    })}`;

    expect(id).toBe(expected);
  });

  it("creates bindable ids with bindable namespace and owner linkage", () => {
    const owner = "sym:owner123" as SymbolId;
    const id = createBindableSymbolId({
      owner,
      property: "updatedAt",
    });

    const expected = `bindable:${stableHash({
      kind: "bindable",
      owner,
      property: "updatedAt",
    })}`;

    expect(id).toBe(expected);
  });

  it("parses namespace + hash from generated ids", () => {
    const id = createResourceSymbolId({
      kind: "custom-element",
      name: "my-element",
      origin: "source",
      sourceKey: "src/my-element.ts",
      packageName: null,
    });
    const parsed = parseSymbolId(id);
    expect(parsed).toBeTruthy();
    expect(parsed?.namespace).toBe("sym");
    expect(parsed?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(symbolIdNamespace(id)).toBe("sym");
    expect(isSymbolId(String(id))).toBe(true);
  });

  it("rejects malformed ids and unknown namespaces", () => {
    expect(parseSymbolId("")).toBeNull();
    expect(parseSymbolId("sym")).toBeNull();
    expect(parseSymbolId(":abc")).toBeNull();
    expect(parseSymbolId("sym:")).toBeNull();
    expect(parseSymbolId("sym:abc")).toBeNull();
    expect(parseSymbolId("foo:abc")).toBeNull();
    expect(symbolIdNamespace("sym:abc")).toBeNull();
    expect(isSymbolId("sym:abc")).toBe(false);
    expect(symbolIdNamespace("foo:abc")).toBeNull();
    expect(isSymbolId("foo:abc")).toBe(false);
    expect(isSymbolIdNamespace("sym")).toBe(true);
    expect(isSymbolIdNamespace("foo")).toBe(false);
  });
});
