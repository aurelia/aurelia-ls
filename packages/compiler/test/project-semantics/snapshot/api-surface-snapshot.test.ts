import { describe, it, expect } from "vitest";

import type { Semantics } from "@aurelia-ls/compiler";
import { BUILTIN_SEMANTICS, normalizePathForId } from "@aurelia-ls/compiler";
import { buildApiSurfaceSnapshot, buildSemanticSnapshot, buildSemanticsArtifacts } from "@aurelia-ls/compiler";
import { buildBindableDefs, buildCustomAttributeDef, buildCustomElementDef } from "../../../src/project-semantics/assemble/resource-def.js";

function baseSemantics(): Semantics {
  return {
    controllers: {},
    elements: {},
    attributes: {},
    valueConverters: {},
    bindingBehaviors: {},
    commands: BUILTIN_SEMANTICS.commands,
    patterns: BUILTIN_SEMANTICS.patterns,
    dom: BUILTIN_SEMANTICS.dom,
    events: BUILTIN_SEMANTICS.events,
    naming: BUILTIN_SEMANTICS.naming,
    twoWayDefaults: BUILTIN_SEMANTICS.twoWayDefaults,
  };
}

describe("buildApiSurfaceSnapshot", () => {
  it("summarizes bindables and aliases with stable ids", () => {
    const fileA = normalizePathForId("/repo/src/alpha.ts");
    const fileB = normalizePathForId("/repo/src/beta.ts");

    const element = buildCustomElementDef({
      name: "alpha-element",
      className: "AlphaElement",
      file: fileA,
      aliases: ["alpha-alt", "alpha"],
      bindables: buildBindableDefs([
        { name: "foo", attribute: "foo-bar", mode: "twoWay", primary: true },
        { name: "bar" },
      ], fileA),
    });

    const attribute = buildCustomAttributeDef({
      name: "beta-attr",
      className: "BetaAttr",
      file: fileB,
      aliases: ["beta"],
      primary: "value",
      bindables: buildBindableDefs([{ name: "value" }], fileB),
    });

    const { semantics, catalog } = buildSemanticsArtifacts(
      [element, attribute],
      baseSemantics(),
    );

    const snapshot = buildApiSurfaceSnapshot(semantics);
    const semanticSnapshot = buildSemanticSnapshot(semantics, { catalog });

    const elementSymbol = snapshot.symbols.find((symbol) => symbol.name === "alpha-element");
    expect(elementSymbol?.aliases).toEqual(["alpha", "alpha-alt"]);
    expect(elementSymbol?.bindables).toEqual([
      { name: "bar", attribute: "bar" },
      { name: "foo", attribute: "foo-bar", mode: "twoWay", primary: true },
    ]);

    const attributeSymbol = snapshot.symbols.find((symbol) => symbol.name === "beta-attr");
    expect(attributeSymbol?.bindables).toEqual([
      { name: "value", attribute: "value", primary: true },
    ]);

    const semanticId = semanticSnapshot.symbols.find((symbol) => symbol.name === "alpha-element")?.id;
    expect(elementSymbol?.id).toBe(semanticId);
  });
});
