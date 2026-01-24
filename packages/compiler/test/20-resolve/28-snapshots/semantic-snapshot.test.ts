import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { CatalogGap, ResourceGraph, ResourceScopeId, Semantics } from "@aurelia-ls/compiler";
import { DEFAULT_SEMANTICS, normalizePathForId, stableHash } from "@aurelia-ls/compiler";
import { buildSemanticSnapshot, buildSemanticsArtifacts } from "@aurelia-ls/compiler";
import { buildBindableDefs, buildCustomAttributeDef, buildCustomElementDef } from "../../../src/analysis/20-resolve/resolution/25-semantics/resource-def.js";
import { buildPackageRootMap, detectMonorepo } from "../../../src/analysis/20-resolve/resolution/npm/index.js";

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

  it("keeps symbol ids stable across monorepo roots using derived packageRoots", async () => {
    const packageName = "@demo/core";
    const workspaceA = createMonorepoWorkspace("a", packageName);
    const workspaceB = createMonorepoWorkspace("b", packageName);

    try {
      const idA = await buildSnapshotIdFromMonorepo(workspaceA.root, workspaceA.packageRoot, packageName);
      const idB = await buildSnapshotIdFromMonorepo(workspaceB.root, workspaceB.packageRoot, packageName);

      expect(idA).toBeDefined();
      expect(idB).toBeDefined();
      expect(idA).toBe(idB);
    } finally {
      cleanupWorkspace(workspaceA.root);
      cleanupWorkspace(workspaceB.root);
    }
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

async function buildSnapshotIdFromMonorepo(
  rootDir: string,
  packageRoot: string,
  packageName: string,
): Promise<string | undefined> {
  const ctx = await detectMonorepo(packageRoot);
  if (!ctx) {
    throw new Error(`Monorepo context not detected for ${packageRoot}`);
  }
  const packageRoots = buildPackageRootMap(ctx);
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
    packageRoots,
  });

  return snapshot.symbols.find((symbol) => symbol.name === "core-element")?.id;
}

function createMonorepoWorkspace(label: string, packageName: string): { root: string; packageRoot: string } {
  const root = mkdtempSync(join(tmpdir(), `aurelia-mono-${label}-`));
  const packagesRoot = join(root, "packages");
  const packageRoot = join(packagesRoot, "pkg-core");

  mkdirSync(join(packageRoot, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "monorepo-root", private: true, workspaces: ["packages/*"] }, null, 2),
    "utf-8",
  );
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: packageName, version: "1.0.0" }, null, 2),
    "utf-8",
  );
  writeFileSync(join(packageRoot, "src", "alpha.ts"), "export const marker = 0;\n", "utf-8");

  return { root, packageRoot };
}

function cleanupWorkspace(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
