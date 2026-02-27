import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CatalogGap, ResourceGraph, ResourceScopeId } from "@aurelia-ls/compiler/schema/types.js";
import { normalizePathForId } from "@aurelia-ls/compiler/model/identity.js";
import { stableHash } from "@aurelia-ls/compiler/pipeline/hash.js";
import { BUILTIN_SEMANTICS } from "@aurelia-ls/compiler/schema/registry.js";
import { buildSemanticsArtifacts } from "@aurelia-ls/compiler/project-semantics/assemble/build.js";
import { buildSemanticSnapshot } from "@aurelia-ls/compiler/project-semantics/snapshot/semantic-snapshot.js";
import { buildBindableDefs, buildCustomAttributeDef, buildCustomElementDef } from "../../../out/project-semantics/assemble/resource-def.js";
import { buildPackageRootMap, detectMonorepo } from "../../../out/project-semantics/npm/index.js";

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

describe("buildSemanticSnapshot", () => {
  it("emits stable symbols with catalog metadata", () => {
    const fileA = normalizePathForId("/repo/out/alpha.ts");
    const fileB = normalizePathForId("/repo/out/beta.ts");

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
      source: "out/alpha.ts",
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

  it("treats declaration file move as identity change", () => {
    const packageName = "@demo/core";
    const packageRoot = "/repo/workspaces/pkg-core";
    const idA = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      packageRoots: { [packageName]: packageRoot },
      filePath: `${packageRoot}/out/alpha.ts`,
      resourceName: "core-element",
    });
    const idB = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      packageRoots: { [packageName]: packageRoot },
      filePath: `${packageRoot}/out/beta.ts`,
      resourceName: "core-element",
    });

    expect(idA).toBeDefined();
    expect(idB).toBeDefined();
    expect(idA).not.toBe(idB);
  });

  it("treats declaration rename as identity change", () => {
    const packageName = "@demo/core";
    const packageRoot = "/repo/workspaces/pkg-core";
    const idA = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      packageRoots: { [packageName]: packageRoot },
      filePath: `${packageRoot}/out/alpha.ts`,
      resourceName: "core-element",
    });
    const idB = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      packageRoots: { [packageName]: packageRoot },
      filePath: `${packageRoot}/out/alpha.ts`,
      resourceName: "core-element-renamed",
    });

    expect(idA).toBeDefined();
    expect(idB).toBeDefined();
    expect(idA).not.toBe(idB);
  });

  it("uses node_modules package root fallback when packageRoots is missing", () => {
    const packageName = "@demo/core";
    const expectedId = `sym:${stableHash({
      kind: "custom-element",
      name: "core-element",
      origin: "source",
      source: "out/alpha.ts",
      package: packageName,
    })}`;

    const id = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      filePath: `/repo/node_modules/${packageName}/out/alpha.ts`,
      resourceName: "core-element",
    });

    expect(id).toBe(expectedId);
  });

  it("uses /packages/<pkgTail> fallback when packageRoots is missing", () => {
    const packageName = "@demo/core";
    const expectedId = `sym:${stableHash({
      kind: "custom-element",
      name: "core-element",
      origin: "source",
      source: "out/alpha.ts",
      package: packageName,
    })}`;

    const id = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      filePath: "/repo/packages/core/out/alpha.ts",
      resourceName: "core-element",
    });

    expect(id).toBe(expectedId);
  });

  it("falls back to project-root relative source when package root cannot be derived", () => {
    const packageName = "@demo/core";
    const expectedId = `sym:${stableHash({
      kind: "custom-element",
      name: "core-element",
      origin: "source",
      source: "packages/pkg-core/out/alpha.ts",
      package: packageName,
    })}`;

    const id = buildSnapshotIdForResource({
      rootDir: "/repo",
      packageName,
      filePath: "/repo/packages/pkg-core/out/alpha.ts",
      resourceName: "core-element",
    });

    expect(id).toBe(expectedId);
  });
});

function buildSnapshotId(rootDir: string, packageName: string): string | undefined {
  return buildSnapshotIdForResource({
    rootDir,
    packageName,
    packageRoots: { [packageName]: `${rootDir}/workspaces/pkg-core` },
    filePath: `${rootDir}/workspaces/pkg-core/out/alpha.ts`,
    resourceName: "core-element",
  });
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
  const fileA = normalizePathForId(`${packageRoot}/out/alpha.ts`);

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

function buildSnapshotIdForResource(options: {
  rootDir: string;
  packageName: string;
  filePath: string;
  resourceName: string;
  packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
}): string | undefined {
  const normalizedFile = normalizePathForId(options.filePath);
  const normalizedPackageRoots = options.packageRoots
    ? normalizePackageRoots(options.packageRoots)
    : undefined;

  const element = {
    ...buildCustomElementDef({
      name: options.resourceName,
      className: "CoreElement",
      file: normalizedFile,
    }),
    package: options.packageName,
  };

  const { semantics, catalog } = buildSemanticsArtifacts([element], baseSemantics());
  const snapshot = buildSemanticSnapshot(semantics, {
    catalog,
    rootDir: options.rootDir,
    ...(normalizedPackageRoots ? { packageRoots: normalizedPackageRoots } : {}),
  });

  return snapshot.symbols.find((symbol) => symbol.name === options.resourceName)?.id;
}

function normalizePackageRoots(
  roots: ReadonlyMap<string, string> | Readonly<Record<string, string>>,
): ReadonlyMap<string, string> | Readonly<Record<string, string>> {
  if (roots instanceof Map) {
    const map = new Map<string, string>();
    for (const [name, root] of roots) {
      map.set(name, String(normalizePathForId(root)));
    }
    return map;
  }

  const record = roots as Readonly<Record<string, string>>;
  const normalized: Record<string, string> = {};
  for (const [name, root] of Object.entries(record)) {
    normalized[name] = String(normalizePathForId(root));
  }
  return normalized;
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
