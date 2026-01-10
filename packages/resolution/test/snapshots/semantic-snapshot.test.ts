import { describe, it, expect } from "vitest";

import type { CatalogGap, ResourceGraph, ResourceScopeId, Semantics } from "@aurelia-ls/compiler";
import { DEFAULT_SEMANTICS, normalizePathForId, stableHash } from "@aurelia-ls/compiler";
import { buildSemanticSnapshot, buildSemanticsArtifacts } from "@aurelia-ls/resolution";
import { buildBindableDefs, buildCustomAttributeDef, buildCustomElementDef } from "../../src/semantics/resource-def.js";

function baseSemantics(): Semantics {
  return {
    controllers: {},
    elements: {},
    attributes: {},
    valueConverters: {},
    bindingBehaviors: {},
    commands: DEFAULT_SEMANTICS.commands,
    patterns: DEFAULT_SEMANTICS.patterns,
    dom: DEFAULT_SEMANTICS.dom,
    events: DEFAULT_SEMANTICS.events,
    naming: DEFAULT_SEMANTICS.naming,
    twoWayDefaults: DEFAULT_SEMANTICS.twoWayDefaults,
  };
}

describe("buildSemanticSnapshot", () => {
  it("emits stable symbols with catalog metadata", () => {
    const fileA = normalizePathForId("/repo/src/alpha.ts");
    const fileB = normalizePathForId("/repo/src/beta.ts");

    const element = buildCustomElementDef({
      name: "alpha-element",
      className: "AlphaElement",
      file: fileA,
      aliases: ["alpha"],
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

    const gaps: CatalogGap[] = [{ kind: "test-gap", message: "missing metadata" }];
    const { semantics, catalog } = buildSemanticsArtifacts(
      [element, attribute],
      baseSemantics(),
      { gaps, confidence: "partial" },
    );

    const root = "root" as ResourceScopeId;
    const graph: ResourceGraph = {
      version: "aurelia-resource-graph@1",
      root,
      scopes: {
        [root]: { id: root, parent: null, resources: semantics.resources },
      },
    };

    const snapshotA = buildSemanticSnapshot(semantics, { catalog, graph });
    const snapshotB = buildSemanticSnapshot(semantics, { catalog, graph });

    expect(snapshotA.version).toBe("aurelia-semantic-snapshot@1");
    expect(snapshotA.gaps).toEqual(gaps);
    expect(snapshotA.confidence).toBe("partial");
    expect(snapshotA.graph).toBe(graph);
    expect(snapshotA.symbols).toEqual(snapshotB.symbols);

    const names = snapshotA.symbols.map((symbol) => symbol.name);
    expect(names).toEqual(["beta-attr", "alpha-element"]);
  });

  it("keeps symbol ids stable across roots when packageRoots are provided", () => {
    const packageName = "@demo/core";
    const expectedId = `sym:${stableHash({
      kind: "custom-element",
      name: "core-element",
      origin: "source",
      source: "src/alpha.ts",
      package: packageName,
    })}`;

    const idA = buildSnapshotId("/repo-a", packageName);
    const idB = buildSnapshotId("/repo-b", packageName);

    expect(idA).toBe(expectedId);
    expect(idB).toBe(expectedId);
  });
});

function buildSnapshotId(rootDir: string, packageName: string): string | undefined {
  const packageRoot = normalizePathForId(`${rootDir}/workspaces/pkg-core`);
  const fileA = normalizePathForId(`${packageRoot}/src/alpha.ts`);

  const element = {
    ...buildCustomElementDef({
      name: "core-element",
      className: "CoreElement",
      file: fileA,
    }),
    package: packageName,
  };

  const { semantics, catalog } = buildSemanticsArtifacts([element], baseSemantics());
  const snapshot = buildSemanticSnapshot(semantics, {
    catalog,
    rootDir,
    packageRoots: { [packageName]: packageRoot },
  });

  return snapshot.symbols.find((symbol) => symbol.name === "core-element")?.id;
}
