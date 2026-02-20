/**
 * R3: Gap-to-Catalog Resource Association — Verification Tests
 *
 * Tests the assertion patterns defined in the R3 implementation spec:
 *
 * Pattern E: Per-resource gap index contains gaps with matching identity.
 *   buildResourceCatalog groups gaps by resourceKind:resourceName.
 *
 * Pattern F: SemanticsLookup gap query produces correct results.
 *   gapsFor, hasGaps, and projectLevelGaps return expected data.
 *
 * Pattern H: Gap index is correct after third-party merge.
 *   applyThirdPartyResources produces a catalog with correctly indexed gaps.
 *
 * Seam-crossing tests: gap identity survives from AnalysisGap creation
 *   through catalog construction through SemanticsLookup query.
 */

import { describe, it, expect } from "vitest";
import type {
  CatalogGap,
  NormalizedPath,
  RegistrationAnalysis,
  ResourceKind,
  ResourceScopeId,
  ScopeCompleteness,
} from "@aurelia-ls/compiler";
import { toSourceFileId } from "@aurelia-ls/compiler";
import { buildResourceCatalog } from "../../src/schema/catalog.js";
import { createSemanticsLookup, prepareProjectSemantics, BUILTIN_SEMANTICS } from "../../src/schema/registry.js";
import { gap, type AnalysisGap } from "../../src/project-semantics/evaluate/types.js";
import { analysisGapToCatalogGap } from "../../src/project-semantics/resolve.js";
import { buildSemanticsArtifacts } from "../../src/project-semantics/assemble/build.js";
import { buildCustomElementDef } from "../../src/project-semantics/assemble/resource-def.js";
import { applyThirdPartyResources, buildThirdPartyResources } from "../../src/project-semantics/third-party/index.js";
import { discoverProjectSemantics } from "../../src/project-semantics/resolve.js";
import { buildResourceGraph } from "../../src/project-semantics/scope/builder.js";
import { DiagnosticsRuntime } from "../../src/diagnostics/runtime.js";
import { createProgramFromMemory } from "./_helpers/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

const EMPTY_RESOURCES = {
  elements: {},
  attributes: {},
  controllers: {},
  valueConverters: {},
  bindingBehaviors: {},
} as const;

function catalogGap(
  kind: string,
  message: string,
  resourceKind?: ResourceKind,
  resourceName?: string,
  resource?: string,
): CatalogGap {
  const base: CatalogGap = { kind, message };
  if (resourceKind !== undefined && resourceName !== undefined) {
    return { ...base, resourceKind, resourceName, ...(resource ? { resource } : {}) };
  }
  if (resource) {
    return { ...base, resource };
  }
  return base;
}

/** Count all gaps across all resource buckets in the index. */
function countIndexedGaps(gapsByResource: Readonly<Record<string, readonly CatalogGap[]>>): number {
  let count = 0;
  for (const key of Object.keys(gapsByResource)) {
    count += gapsByResource[key]!.length;
  }
  return count;
}

function incompleteScopeCompleteness(reason: string): ScopeCompleteness {
  return {
    complete: false,
    unresolvedRegistrations: [
      {
        source: "analysis",
        reason,
        file: "/src/main.ts" as NormalizedPath,
        span: { start: 0, end: 1 },
        pattern: { kind: "function-call", functionName: "loadPlugins" },
      },
    ],
  };
}

function span(file: NormalizedPath) {
  return {
    file: toSourceFileId(file),
    start: 0,
    end: 1,
  };
}

// =============================================================================
// Pattern E: Per-resource gap index contains gaps with matching identity
// =============================================================================

describe("Pattern E: per-resource gap index groups gaps correctly", () => {
  it("groups gaps by resourceKind:resourceName key", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
      catalogGap("function-return", "factory for data-grid", "custom-element", "data-grid"),
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    expect(catalog.gapsByResource).toBeDefined();
    const dataGridGaps = catalog.gapsByResource!["custom-element:data-grid"];
    expect(dataGridGaps).toHaveLength(2);
    expect(dataGridGaps![0]!.kind).toBe("dynamic-value");
    expect(dataGridGaps![1]!.kind).toBe("function-return");

    const myCardGaps = catalog.gapsByResource!["custom-element:my-card"];
    expect(myCardGaps).toHaveLength(1);
    expect(myCardGaps![0]!.kind).toBe("dynamic-value");
  });

  it("returns empty for a resource with no gaps", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    expect(catalog.gapsByResource!["custom-element:my-card"]).toBeUndefined();
  });

  it("puts gaps without resource identity in projectLevelGaps", () => {
    const gaps: CatalogGap[] = [
      catalogGap("unresolved-import", "import resolution", undefined, undefined, "/src/main.ts"),
      catalogGap("parse-error", "syntax error"),
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    expect(catalog.projectLevelGaps).toHaveLength(2);
    expect(catalog.projectLevelGaps![0]!.kind).toBe("unresolved-import");
    expect(catalog.projectLevelGaps![1]!.kind).toBe("parse-error");
  });

  it("preserves the flat gaps list for backward compatibility", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
      catalogGap("unresolved-import", "import resolution"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    expect(catalog.gaps).toBe(gaps);
    expect(catalog.gaps).toHaveLength(2);
  });

  it("indexed + project-level count equals flat list length (conservation)", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
      catalogGap("function-return", "factory for data-grid", "custom-element", "data-grid"),
      catalogGap("dynamic-value", "tooltip attr", "custom-attribute", "tooltip"),
      catalogGap("unresolved-import", "import resolution"),
      catalogGap("parse-error", "syntax error"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    const total = countIndexedGaps(catalog.gapsByResource!) + catalog.projectLevelGaps!.length;
    expect(total).toBe(gaps.length);
  });

  it("handles all five resource kinds", () => {
    const kinds: ResourceKind[] = [
      "custom-element",
      "custom-attribute",
      "template-controller",
      "value-converter",
      "binding-behavior",
    ];
    const gaps: CatalogGap[] = kinds.map((k) =>
      catalogGap("dynamic-value", `test for ${k}`, k, "test-resource"),
    );

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    for (const k of kinds) {
      const key = `${k}:test-resource`;
      expect(catalog.gapsByResource![key]).toHaveLength(1);
      expect(catalog.gapsByResource![key]![0]!.resourceKind).toBe(k);
    }
  });

  it("produces empty index when no gaps are provided", () => {
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, []);

    expect(catalog.gapsByResource).toEqual({});
    expect(catalog.projectLevelGaps).toEqual([]);
  });

  it("produces empty index when gaps array is empty", () => {
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps: [] });

    expect(catalog.gapsByResource).toEqual({});
    expect(catalog.projectLevelGaps).toEqual([]);
  });

  it("indexes same resource name under different kinds separately", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "element foo", "custom-element", "foo"),
      catalogGap("function-return", "attribute foo", "custom-attribute", "foo"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    expect(catalog.gapsByResource!["custom-element:foo"]).toHaveLength(1);
    expect(catalog.gapsByResource!["custom-element:foo"]![0]!.kind).toBe("dynamic-value");
    expect(catalog.gapsByResource!["custom-attribute:foo"]).toHaveLength(1);
    expect(catalog.gapsByResource!["custom-attribute:foo"]![0]!.kind).toBe("function-return");
  });

  it("treats gap with resourceKind but no resourceName as project-level", () => {
    const halfGap: CatalogGap = { kind: "dynamic-value", message: "partial identity", resourceKind: "custom-element" };
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps: [halfGap] });

    expect(catalog.projectLevelGaps).toHaveLength(1);
    expect(catalog.projectLevelGaps![0]).toBe(halfGap);
    expect(countIndexedGaps(catalog.gapsByResource!)).toBe(0);
  });

  it("treats gap with resourceName but no resourceKind as project-level", () => {
    const halfGap: CatalogGap = { kind: "dynamic-value", message: "partial identity", resourceName: "data-grid" };
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps: [halfGap] });

    expect(catalog.projectLevelGaps).toHaveLength(1);
    expect(catalog.projectLevelGaps![0]).toBe(halfGap);
    expect(countIndexedGaps(catalog.gapsByResource!)).toBe(0);
  });

  it("indexed gaps are reference-identical to those in the flat list", () => {
    const g1 = catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid");
    const g2 = catalogGap("unresolved-import", "import resolution");
    const gaps: CatalogGap[] = [g1, g2];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    // Resource-indexed gap is the same object, not a copy
    expect(catalog.gapsByResource!["custom-element:data-grid"]![0]).toBe(g1);
    // Project-level gap is the same object, not a copy
    expect(catalog.projectLevelGaps![0]).toBe(g2);
  });

  it("preserves all CatalogGap fields through indexing", () => {
    const fullGap: CatalogGap = {
      kind: "function-return",
      message: "factory for data-grid: Use explicit definition.",
      resource: "/src/factory.ts",
      resourceKind: "custom-element",
      resourceName: "data-grid",
    };
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps: [fullGap] });

    const indexed = catalog.gapsByResource!["custom-element:data-grid"]![0]!;
    expect(indexed.kind).toBe("function-return");
    expect(indexed.message).toBe("factory for data-grid: Use explicit definition.");
    expect(indexed.resource).toBe("/src/factory.ts");
    expect(indexed.resourceKind).toBe("custom-element");
    expect(indexed.resourceName).toBe("data-grid");
  });

  it("handles all gaps being project-level (no resource identity anywhere)", () => {
    const gaps: CatalogGap[] = [
      catalogGap("unresolved-import", "import 1"),
      catalogGap("parse-error", "parse 1"),
      catalogGap("cache-corrupt", "cache issue"),
    ];

    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });

    expect(catalog.projectLevelGaps).toHaveLength(3);
    expect(countIndexedGaps(catalog.gapsByResource!)).toBe(0);
    expect(catalog.projectLevelGaps!.length + countIndexedGaps(catalog.gapsByResource!)).toBe(gaps.length);
  });
});

// =============================================================================
// Pattern F: SemanticsLookup gap query produces correct results
// =============================================================================

describe("Pattern F: SemanticsLookup gap query methods", () => {
  function createLookupWithGaps(gaps: CatalogGap[]) {
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });
    const sem = { ...BUILTIN_SEMANTICS, catalog };
    return createSemanticsLookup(sem);
  }

  it("gapsFor returns gaps for a specific resource", () => {
    const lookup = createLookupWithGaps([
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
      catalogGap("function-return", "factory for my-card", "custom-element", "my-card"),
      catalogGap("dynamic-value", "other element", "custom-element", "other"),
    ]);

    const result = lookup.gapsFor("custom-element", "my-card");
    expect(result).toHaveLength(2);
    expect(result[0]!.kind).toBe("dynamic-value");
    expect(result[1]!.kind).toBe("function-return");
  });

  it("gapsFor returns empty for a resource not in the gap index", () => {
    const lookup = createLookupWithGaps([
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ]);

    const result = lookup.gapsFor("custom-element", "unknown");
    expect(result).toHaveLength(0);
  });

  it("hasGaps returns true for a resource with gaps", () => {
    const lookup = createLookupWithGaps([
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ]);

    expect(lookup.hasGaps("custom-element", "my-card")).toBe(true);
  });

  it("hasGaps returns false for a resource without gaps", () => {
    const lookup = createLookupWithGaps([
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ]);

    expect(lookup.hasGaps("custom-element", "unknown")).toBe(false);
  });

  it("projectLevelGaps returns gaps without resource identity", () => {
    const lookup = createLookupWithGaps([
      catalogGap("unresolved-import", "import resolution"),
      catalogGap("parse-error", "syntax error"),
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ]);

    const result = lookup.projectLevelGaps();
    expect(result).toHaveLength(2);
    expect(result[0]!.kind).toBe("unresolved-import");
    expect(result[1]!.kind).toBe("parse-error");
  });

  it("projectLevelGaps returns empty when all gaps have resource identity", () => {
    const lookup = createLookupWithGaps([
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ]);

    expect(lookup.projectLevelGaps()).toHaveLength(0);
  });

  it("gap queries work when catalog has no gaps", () => {
    const sem = { ...BUILTIN_SEMANTICS };
    const lookup = createSemanticsLookup(sem);

    expect(lookup.gapsFor("custom-element", "anything")).toHaveLength(0);
    expect(lookup.hasGaps("custom-element", "anything")).toBe(false);
    expect(lookup.projectLevelGaps()).toHaveLength(0);
  });

  it("gapsFor distinguishes same name across different resource kinds", () => {
    const lookup = createLookupWithGaps([
      catalogGap("dynamic-value", "element foo", "custom-element", "foo"),
      catalogGap("function-return", "attribute foo", "custom-attribute", "foo"),
    ]);

    expect(lookup.gapsFor("custom-element", "foo")).toHaveLength(1);
    expect(lookup.gapsFor("custom-element", "foo")[0]!.kind).toBe("dynamic-value");
    expect(lookup.gapsFor("custom-attribute", "foo")).toHaveLength(1);
    expect(lookup.gapsFor("custom-attribute", "foo")[0]!.kind).toBe("function-return");
  });
});

describe("Scope completeness propagation: catalog and lookup", () => {
  const rootScope = "root" as ResourceScopeId;
  const localScope = "local:/src/page.ts" as ResourceScopeId;

  it("buildResourceCatalog carries scope completeness metadata", () => {
    const scopeCompleteness = {
      [rootScope]: incompleteScopeCompleteness("Cannot statically analyze loadPlugins()"),
    };
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { scopeCompleteness });

    expect(catalog.scopeCompleteness).toBeDefined();
    expect(catalog.scopeCompleteness?.[rootScope]?.complete).toBe(false);
    expect(catalog.scopeCompleteness?.[rootScope]?.unresolvedRegistrations[0]?.source).toBe("analysis");
  });

  it("SemanticsLookup reports local scope incomplete when root scope is incomplete", () => {
    const rootCompleteness = incompleteScopeCompleteness("Global registration path is dynamic");
    const scopeCompleteness = {
      [rootScope]: rootCompleteness,
      [localScope]: { complete: true, unresolvedRegistrations: [] },
    };
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { scopeCompleteness });
    const graph = {
      version: "aurelia-resource-graph@1" as const,
      root: rootScope,
      scopes: {
        [rootScope]: {
          id: rootScope,
          parent: null,
          resources: {},
          completeness: rootCompleteness,
        },
        [localScope]: {
          id: localScope,
          parent: rootScope,
          resources: {},
          completeness: { complete: true, unresolvedRegistrations: [] },
        },
      },
    };
    const sem = { ...BUILTIN_SEMANTICS, catalog, resourceGraph: graph, defaultScope: localScope };

    const lookup = createSemanticsLookup(sem, { graph, scope: localScope });

    expect(lookup.isScopeComplete()).toBe(false);
    expect(lookup.scopeCompleteness().unresolvedRegistrations[0]?.reason).toContain("Global registration path is dynamic");
    expect(lookup.isScopeComplete(rootScope)).toBe(false);
  });

  it("prepareProjectSemantics rebuild preserves scope completeness", () => {
    const scopeCompleteness = {
      [rootScope]: incompleteScopeCompleteness("Spread registration cannot be evaluated"),
    };
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { scopeCompleteness });
    const sem = { ...BUILTIN_SEMANTICS, catalog };

    const rebuilt = prepareProjectSemantics(sem);
    const lookup = createSemanticsLookup(sem, { resources: EMPTY_RESOURCES, scope: rootScope });

    expect(rebuilt.catalog.scopeCompleteness?.[rootScope]?.complete).toBe(false);
    expect(lookup.isScopeComplete()).toBe(false);
  });

  it("routes template-owner ambiguity to the owning local scope and keeps root complete", () => {
    const ownerPath = "/app/multi-owner.ts" as NormalizedPath;
    const templatePath = "/app/multi-owner.html" as NormalizedPath;
    const registration: RegistrationAnalysis = {
      sites: [
        {
          resourceRef: {
            kind: "resolved",
            resource: buildCustomElementDef({
              name: "local-widget",
              className: "LocalWidget",
              file: "/app/local-widget.ts" as NormalizedPath,
            }),
          },
          scope: { kind: "local", owner: ownerPath },
          evidence: {
            kind: "template-import",
            origin: "sibling",
            component: ownerPath,
            className: "FirstOwner",
            templateFile: templatePath,
          },
          span: span(templatePath),
        },
      ],
      orphans: [],
      unresolved: [
        {
          pattern: { kind: "other", description: "template-import-owner-ambiguous" },
          file: templatePath,
          span: span(templatePath),
          reason: "Cannot determine owner for source file '/app/multi-owner.ts'. Candidate owners: FirstOwner, SecondOwner",
        },
      ],
      activatedPlugins: [],
    };

    const graph = buildResourceGraph(registration);
    const ownerScope = `local:${ownerPath}` as ResourceScopeId;
    const sem = { ...BUILTIN_SEMANTICS, resourceGraph: graph, defaultScope: ownerScope };
    const lookup = createSemanticsLookup(sem, { graph, scope: ownerScope });

    expect(lookup.isScopeComplete(ownerScope)).toBe(false);
    expect(lookup.isScopeComplete(graph.root)).toBe(true);

    const localCompleteness = lookup.scopeCompleteness(ownerScope);
    expect(localCompleteness.unresolvedRegistrations).toHaveLength(1);
    expect(localCompleteness.unresolvedRegistrations[0]?.source).toBe("analysis");
    expect(localCompleteness.unresolvedRegistrations[0]?.reason).toContain("Candidate owners");
    expect(localCompleteness.unresolvedRegistrations[0]?.pattern?.kind).toBe("other");
    expect(localCompleteness.unresolvedRegistrations[0]?.pattern?.description).toBe("template-import-owner-ambiguous");

    expect(lookup.scopeCompleteness(graph.root).unresolvedRegistrations).toHaveLength(0);
  });
});

// =============================================================================
// Seam-crossing: AnalysisGap → CatalogGap → indexed catalog → lookup query
// =============================================================================

describe("Seam crossing: gap identity survives from AnalysisGap to SemanticsLookup query", () => {
  it("AnalysisGap with resource identity is queryable through SemanticsLookup", () => {
    // Create AnalysisGap with resource identity (as R1 provides)
    const analysisGap1 = gap(
      "bindables for user-card",
      { kind: "dynamic-value", expression: "computedBindables()" },
      "Provide explicit bindable declarations.",
      { file: "/src/user-card.ts" },
      { kind: "custom-element", name: "user-card" },
    );
    const analysisGap2 = gap(
      "factory for data-grid",
      { kind: "function-return", functionName: "createGrid" },
      "Use explicit resource definition.",
      undefined,
      { kind: "custom-element", name: "data-grid" },
    );
    const analysisGap3 = gap(
      "import resolution",
      { kind: "unresolved-import", path: "./missing", reason: "file not found" },
      "Check the import path.",
      { file: "/src/main.ts" },
      // No resource identity — project-level
    );

    // Cross seam 1: AnalysisGap → CatalogGap (R1's boundary)
    const catalogGaps = [analysisGap1, analysisGap2, analysisGap3].map(analysisGapToCatalogGap);

    // Cross seam 2: CatalogGap[] → indexed ResourceCatalog (R3's boundary)
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps: catalogGaps });

    // Cross seam 3: ResourceCatalog → SemanticsLookup query (R3's boundary)
    const sem = { ...BUILTIN_SEMANTICS, catalog };
    const lookup = createSemanticsLookup(sem);

    // Verify: gap identity survives all three seam crossings
    const userCardGaps = lookup.gapsFor("custom-element", "user-card");
    expect(userCardGaps).toHaveLength(1);
    expect(userCardGaps[0]!.kind).toBe("dynamic-value");
    expect(userCardGaps[0]!.resourceKind).toBe("custom-element");
    expect(userCardGaps[0]!.resourceName).toBe("user-card");
    expect(userCardGaps[0]!.resource).toBe("/src/user-card.ts");

    const dataGridGaps = lookup.gapsFor("custom-element", "data-grid");
    expect(dataGridGaps).toHaveLength(1);
    expect(dataGridGaps[0]!.kind).toBe("function-return");
    expect(dataGridGaps[0]!.resourceKind).toBe("custom-element");
    expect(dataGridGaps[0]!.resourceName).toBe("data-grid");

    // Project-level gap without resource identity
    const projectGaps = lookup.projectLevelGaps();
    expect(projectGaps).toHaveLength(1);
    expect(projectGaps[0]!.kind).toBe("unresolved-import");
    expect(projectGaps[0]!.resourceKind).toBeUndefined();

    // Boolean fast path agrees with list query
    expect(lookup.hasGaps("custom-element", "user-card")).toBe(true);
    expect(lookup.hasGaps("custom-element", "data-grid")).toBe(true);
    expect(lookup.hasGaps("custom-element", "unknown")).toBe(false);

    // Conservation: all gaps accounted for
    const indexed = countIndexedGaps(catalog.gapsByResource!);
    expect(indexed + catalog.projectLevelGaps!.length).toBe(catalogGaps.length);
  });
});

// =============================================================================
// Pipeline path: buildSemanticsArtifacts produces indexed catalog
// =============================================================================

describe("Pipeline path: buildSemanticsArtifacts produces indexed catalog", () => {
  it("catalog from buildSemanticsArtifacts has gap index when gaps are provided", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for alpha", "custom-element", "alpha"),
      catalogGap("function-return", "factory for beta", "custom-attribute", "beta"),
      catalogGap("unresolved-import", "import resolution"),
    ];

    const { catalog } = buildSemanticsArtifacts([], undefined, { gaps, confidence: "partial" });

    expect(catalog.gaps).toHaveLength(3);
    expect(catalog.confidence).toBe("partial");

    // Index is present and correct
    expect(catalog.gapsByResource).toBeDefined();
    expect(catalog.gapsByResource!["custom-element:alpha"]).toHaveLength(1);
    expect(catalog.gapsByResource!["custom-attribute:beta"]).toHaveLength(1);
    expect(catalog.projectLevelGaps).toHaveLength(1);

    // Conservation
    expect(countIndexedGaps(catalog.gapsByResource!) + catalog.projectLevelGaps!.length).toBe(3);
  });

  it("catalog from buildSemanticsArtifacts without opts has empty index", () => {
    const { catalog } = buildSemanticsArtifacts([]);

    // No opts → no gaps → empty index
    expect(catalog.gapsByResource).toEqual({});
    expect(catalog.projectLevelGaps).toEqual([]);
  });

  it("SemanticsLookup created from buildSemanticsArtifacts catalog supports gap queries", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for alpha", "custom-element", "alpha"),
      catalogGap("unresolved-import", "import resolution"),
    ];

    const { semantics } = buildSemanticsArtifacts([], undefined, { gaps });
    const lookup = createSemanticsLookup(semantics);

    expect(lookup.gapsFor("custom-element", "alpha")).toHaveLength(1);
    expect(lookup.hasGaps("custom-element", "alpha")).toBe(true);
    expect(lookup.projectLevelGaps()).toHaveLength(1);
  });
});

// =============================================================================
// Rebuild path: prepareProjectSemantics round-trip preserves gap index
// =============================================================================

describe("Rebuild path: prepareProjectSemantics preserves gap index through round-trip", () => {
  it("rebuilds gap index correctly when catalog with gaps passes through prepareProjectSemantics", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
      catalogGap("function-return", "factory for data-grid", "custom-element", "data-grid"),
      catalogGap("unresolved-import", "import resolution"),
    ];

    // Build initial catalog with index
    const initialCatalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });
    expect(initialCatalog.gapsByResource!["custom-element:data-grid"]).toHaveLength(2);

    // Simulate rebuild: prepareProjectSemantics extracts { gaps, confidence }
    // from sem.catalog and rebuilds via buildResourceCatalog
    const sem = { ...BUILTIN_SEMANTICS, catalog: initialCatalog };
    const rebuilt = prepareProjectSemantics(sem);

    // The rebuilt catalog should have a correct index
    expect(rebuilt.catalog.gaps).toHaveLength(3);
    expect(rebuilt.catalog.gapsByResource).toBeDefined();
    expect(rebuilt.catalog.gapsByResource!["custom-element:data-grid"]).toHaveLength(2);
    expect(rebuilt.catalog.projectLevelGaps).toHaveLength(1);

    // Conservation after rebuild
    expect(
      countIndexedGaps(rebuilt.catalog.gapsByResource!) + rebuilt.catalog.projectLevelGaps!.length,
    ).toBe(gaps.length);
  });

  it("gap queries work on SemanticsLookup created with resource overrides", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for my-card", "custom-element", "my-card"),
    ];
    const catalog = buildResourceCatalog(EMPTY_RESOURCES, {}, [], { gaps });
    const sem = { ...BUILTIN_SEMANTICS, catalog };

    // Creating lookup with resource overrides triggers prepareProjectSemantics internally
    const lookup = createSemanticsLookup(sem, { resources: EMPTY_RESOURCES });

    // Gap query should still work after internal rebuild
    expect(lookup.hasGaps("custom-element", "my-card")).toBe(true);
    expect(lookup.gapsFor("custom-element", "my-card")).toHaveLength(1);
    expect(lookup.projectLevelGaps()).toHaveLength(0);
  });
});

// =============================================================================
// Pattern H: Gap index correct after third-party merge
// =============================================================================

describe("Pattern H: gap index correct after third-party merge", () => {
  it("merged catalog has gap index covering both initial and third-party gaps", () => {
    // Set up a minimal project with a class that produces a gap
    const { program } = createProgramFromMemory(
      {
        "/workspace/src/my-element.ts": `
          declare function customElement(name: string): ClassDecorator;
          @customElement("my-element")
          export class MyElementCustomElement {}
        `,
      },
      ["/workspace/src/my-element.ts"],
    );
    const diagnostics = new DiagnosticsRuntime();
    const base = discoverProjectSemantics(program, {
      packagePath: "/workspace",
      diagnostics: diagnostics.forSource("project"),
    });

    // Apply third-party resources with explicit gaps
    const extraGaps: AnalysisGap[] = [
      gap(
        "dynamic factory for ext-grid",
        { kind: "function-return", functionName: "createGrid" },
        "Use explicit definition.",
        undefined,
        { kind: "custom-element", name: "ext-grid" },
      ),
      gap(
        "unresolved third-party import",
        { kind: "unresolved-import", path: "@ext/lib", reason: "not found" },
        "Check package.",
      ),
    ];

    const merged = applyThirdPartyResources(
      base,
      buildThirdPartyResources({ elements: { "ext-grid": { bindables: {} } } }),
      { gaps: extraGaps },
    );

    // The merged catalog should have the gap index
    expect(merged.catalog.gapsByResource).toBeDefined();

    // Third-party gap with resource identity should be indexed
    const extGridGaps = merged.catalog.gapsByResource!["custom-element:ext-grid"];
    expect(extGridGaps).toBeDefined();
    expect(extGridGaps).toHaveLength(1);
    expect(extGridGaps![0]!.kind).toBe("function-return");
    expect(extGridGaps![0]!.resourceKind).toBe("custom-element");
    expect(extGridGaps![0]!.resourceName).toBe("ext-grid");

    // Third-party gap without resource identity should be project-level
    expect(merged.catalog.projectLevelGaps!.some((g) => g.kind === "unresolved-import")).toBe(true);

    // Flat list has all gaps (backward compatibility)
    expect(merged.catalog.gaps!.length).toBeGreaterThanOrEqual(2);

    // Conservation
    expect(
      countIndexedGaps(merged.catalog.gapsByResource!) + merged.catalog.projectLevelGaps!.length,
    ).toBe(merged.catalog.gaps!.length);
  });

  it("initial gaps and third-party gaps are both indexed after merge", () => {
    // Set up a project that will produce initial gaps
    const { program } = createProgramFromMemory(
      {
        "/workspace/src/placeholder.ts": `export const x = 1;`,
      },
      ["/workspace/src/placeholder.ts"],
    );
    const diagnostics = new DiagnosticsRuntime();
    const base = discoverProjectSemantics(program, {
      packagePath: "/workspace",
      diagnostics: diagnostics.forSource("project"),
    });

    // Inject initial gaps into the base catalog
    const initialGaps: CatalogGap[] = [
      catalogGap("dynamic-value", "initial gap", "custom-element", "initial-el"),
    ];
    const baseWithGaps = {
      ...base,
      catalog: buildResourceCatalog(
        base.catalog.resources,
        base.catalog.bindingCommands,
        base.catalog.attributePatterns,
        { gaps: initialGaps, confidence: base.catalog.confidence },
      ),
    };

    // Add third-party gaps
    const extraGaps: AnalysisGap[] = [
      gap(
        "third-party factory",
        { kind: "function-return", functionName: "factory" },
        "Use explicit definition.",
        undefined,
        { kind: "custom-attribute", name: "extra-attr" },
      ),
    ];

    const merged = applyThirdPartyResources(
      baseWithGaps,
      buildThirdPartyResources({}),
      { gaps: extraGaps },
    );

    // Both initial and third-party gaps should be in the flat list
    expect(merged.catalog.gaps!.some((g) => g.resourceName === "initial-el")).toBe(true);
    expect(merged.catalog.gaps!.some((g) => g.resourceName === "extra-attr")).toBe(true);

    // Both should be indexed
    expect(merged.catalog.gapsByResource!["custom-element:initial-el"]).toHaveLength(1);
    expect(merged.catalog.gapsByResource!["custom-attribute:extra-attr"]).toHaveLength(1);

    // Conservation
    expect(
      countIndexedGaps(merged.catalog.gapsByResource!) + merged.catalog.projectLevelGaps!.length,
    ).toBe(merged.catalog.gaps!.length);
  });
});
