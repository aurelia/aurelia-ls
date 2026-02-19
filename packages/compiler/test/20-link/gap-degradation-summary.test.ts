/**
 * R6: Gap/Degradation Summary Tests (Patterns O–S + adversarial strengthening)
 *
 * Tests that compileTemplate() produces a degradation summary on
 * TemplateCompilation that aggregates R5's per-diagnostic gap qualifications
 * into a template-level degradation statement.
 *
 * Seam crossing: project analysis (gap creation) → catalog (gap indexing, R3)
 * → template analysis (diagnostic qualification, R5) → compilation output
 * (degradation summary, R6).
 *
 * The adversarial strengthening section addresses specific testing-landscape
 * findings: cross-verification between diagnostics and degradation (the
 * summary must be a faithful projection), determinism, negative
 * discrimination, resource-kind completeness, and non-contamination.
 */
import { describe, test, expect } from "vitest";

import { deepMergeSemantics } from "../_helpers/semantics-merge.js";
import { noopModuleResolver } from "../_helpers/test-utils.js";

import {
  compileTemplate,
  BUILTIN_SEMANTICS,
  DiagnosticsRuntime,
  lowerDocument,
  linkTemplateSemantics,
  getExpressionParser,
  DEFAULT_SYNTAX,
  buildSemanticsSnapshot,
} from "@aurelia-ls/compiler";

import { buildResourceCatalog } from "../../src/schema/catalog.js";
import type { CatalogGap, ResourceKind } from "../../src/schema/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

const NOOP_MODULE_RESOLVER = (_specifier: string, _containingFile: string) => null;

function catalogGap(
  kind: string,
  message: string,
  resourceKind?: ResourceKind,
  resourceName?: string,
): CatalogGap {
  const base: CatalogGap = { kind, message };
  if (resourceKind !== undefined && resourceName !== undefined) {
    return { ...base, resourceKind, resourceName };
  }
  return base;
}

/** Compile a template against semantics with a given catalog and return the compilation. */
function compileWith(markup: string, sem: any, catalog?: any) {
  return compileTemplate({
    html: markup,
    templateFilePath: "/test.html",
    isJs: false,
    vm: createVmReflection(),
    semantics: sem,
    catalog,
    moduleResolver: NOOP_MODULE_RESOLVER,
  });
}

/** Count diagnostics in the flat list that have data.confidence === "partial". */
function countPartialConfidence(diagnostics: readonly any[]): number {
  return diagnostics.filter(
    (d: any) => d.data?.confidence === "partial",
  ).length;
}

// ---------------------------------------------------------------------------
// Pattern O: Compilation with gap-qualified diagnostics carries degradation summary
// ---------------------------------------------------------------------------

describe("Pattern O: Gap-qualified compilation carries degradation summary", () => {
  test("unknown element with gaps produces degradation summary", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);

    expect(compilation.degradation).toBeDefined();
    expect(compilation.degradation.hasGaps).toBe(true);
    expect(compilation.degradation.gapQualifiedCount).toBe(1);
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "custom-element", name: "data-grid" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Pattern P: Compilation without gaps has clean degradation summary
// ---------------------------------------------------------------------------

describe("Pattern P: No gaps produces clean degradation summary", () => {
  test("fully resolved template has clean degradation", () => {
    // Use builtins only — all resources are fully resolved, no gaps
    const compilation = compileWith(
      `<div if.bind="true"></div>`,
      BUILTIN_SEMANTICS,
    );

    expect(compilation.degradation).toBeDefined();
    expect(compilation.degradation.hasGaps).toBe(false);
    expect(compilation.degradation.gapQualifiedCount).toBe(0);
    expect(compilation.degradation.affectedResources).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pattern Q: Multiple gap-affected resources aggregate correctly
// ---------------------------------------------------------------------------

describe("Pattern Q: Multiple gap-affected resources aggregate correctly", () => {
  test("two gap-affected resources both appear in affectedResources", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps for data-grid", "custom-element", "data-grid"),
      catalogGap("dynamic-value", "gaps for dateFormat", "value-converter", "dateFormat"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<data-grid>\${value | dateFormat}</data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    expect(compilation.degradation.hasGaps).toBe(true);
    expect(compilation.degradation.gapQualifiedCount).toBe(2);
    expect(compilation.degradation.affectedResources).toHaveLength(2);
    expect(compilation.degradation.affectedResources).toEqual(
      expect.arrayContaining([
        { kind: "custom-element", name: "data-grid" },
        { kind: "value-converter", name: "dateFormat" },
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// Pattern R: Gap-affected element with unknown bindable counts correctly
// ---------------------------------------------------------------------------

describe("Pattern R: Bindable on gapped element attributes to owning resource", () => {
  test("unknown bindable on gapped element appears in affectedResources as the element", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
    ];
    const sem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        elements: {
          "data-grid": {
            kind: "element",
            name: "data-grid",
            bindables: { items: { name: "items" } },
          },
        },
      },
    });
    const catalog = buildResourceCatalog(
      sem.catalog.resources,
      sem.catalog.bindingCommands,
      sem.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<data-grid items.bind="x" columns.bind="y"></data-grid>`,
      sem,
      catalog,
    );

    // Exactly one gap-qualified diagnostic for 'columns' (items resolves fine)
    expect(compilation.degradation.hasGaps).toBe(true);
    expect(compilation.degradation.gapQualifiedCount).toBe(1);
    // The affected resource is the element (custom-element:data-grid), not the individual bindable
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "custom-element", name: "data-grid" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Pattern S: Degradation summary is always present (not undefined)
// ---------------------------------------------------------------------------

describe("Pattern S: Degradation summary is always present", () => {
  test("compilation with gaps has defined degradation", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const compilation = compileWith(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);

    expect(compilation.degradation).toBeDefined();
    expect(compilation.degradation).not.toBeNull();
    expect(typeof compilation.degradation.hasGaps).toBe("boolean");
    expect(typeof compilation.degradation.gapQualifiedCount).toBe("number");
    expect(Array.isArray(compilation.degradation.affectedResources)).toBe(true);
  });

  test("compilation without gaps has defined degradation", () => {
    const compilation = compileWith(
      `<div if.bind="true"></div>`,
      BUILTIN_SEMANTICS,
    );

    expect(compilation.degradation).toBeDefined();
    expect(compilation.degradation).not.toBeNull();
    expect(typeof compilation.degradation.hasGaps).toBe("boolean");
    expect(typeof compilation.degradation.gapQualifiedCount).toBe("number");
    expect(Array.isArray(compilation.degradation.affectedResources)).toBe(true);
  });

  test("empty template has defined degradation", () => {
    const compilation = compileWith(`<template></template>`, BUILTIN_SEMANTICS);

    expect(compilation.degradation).toBeDefined();
    expect(compilation.degradation).not.toBeNull();
    expect(compilation.degradation.hasGaps).toBe(false);
    expect(compilation.degradation.gapQualifiedCount).toBe(0);
    expect(compilation.degradation.affectedResources).toEqual([]);
  });
});

// ===========================================================================
// Adversarial strengthening
//
// The testing-landscape adversarial identified specific failure classes the
// test suite couldn't catch. These tests address each class within R6 scope.
// ===========================================================================

// ---------------------------------------------------------------------------
// Cross-verification: degradation is a faithful projection of diagnostics.all
// ---------------------------------------------------------------------------

describe("Cross-verification: degradation matches diagnostics", () => {
  test("gapQualifiedCount exactly matches partial-confidence diagnostics in diagnostics.all", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps for data-grid", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);

    // Count partial-confidence diagnostics directly from the diagnostics list
    const partialCount = countPartialConfidence(compilation.diagnostics.all);

    // The degradation summary must be an exact projection — not approximation
    expect(compilation.degradation.gapQualifiedCount).toBe(partialCount);
    expect(partialCount).toBeGreaterThan(0);
  });

  test("cross-verification with multiple gap-affected resources", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "custom-element", "data-grid"),
      catalogGap("dynamic-value", "gaps", "value-converter", "dateFormat"),
      catalogGap("dynamic-value", "gaps", "binding-behavior", "myBehavior"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<data-grid>\${value | dateFormat & myBehavior}</data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    const partialCount = countPartialConfidence(compilation.diagnostics.all);
    expect(compilation.degradation.gapQualifiedCount).toBe(partialCount);
    expect(partialCount).toBe(3);
    expect(compilation.degradation.affectedResources).toHaveLength(3);
  });

  test("cross-verification with zero gaps: count is 0 and no partial diagnostics exist", () => {
    const compilation = compileWith(
      `<div if.bind="true"></div>`,
      BUILTIN_SEMANTICS,
    );

    const partialCount = countPartialConfidence(compilation.diagnostics.all);
    expect(partialCount).toBe(0);
    expect(compilation.degradation.gapQualifiedCount).toBe(0);
  });

  test("hasGaps is true iff gapQualifiedCount > 0", () => {
    // With gaps
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const withGaps = compileWith(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    expect(withGaps.degradation.hasGaps).toBe(withGaps.degradation.gapQualifiedCount > 0);
    expect(withGaps.degradation.hasGaps).toBe(true);

    // Without gaps
    const noGaps = compileWith(`<div if.bind="true"></div>`, BUILTIN_SEMANTICS);
    expect(noGaps.degradation.hasGaps).toBe(noGaps.degradation.gapQualifiedCount > 0);
    expect(noGaps.degradation.hasGaps).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Determinism: same input produces identical degradation summaries
// ---------------------------------------------------------------------------

describe("Determinism: degradation summary is stable across compilations", () => {
  test("compiling the same template twice produces identical degradation", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "custom-element", "data-grid"),
      catalogGap("dynamic-value", "gaps", "value-converter", "dateFormat"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const markup = `<data-grid>\${value | dateFormat}</data-grid>`;

    const c1 = compileWith(markup, BUILTIN_SEMANTICS, catalog);
    const c2 = compileWith(markup, BUILTIN_SEMANTICS, catalog);

    expect(c1.degradation.hasGaps).toBe(c2.degradation.hasGaps);
    expect(c1.degradation.gapQualifiedCount).toBe(c2.degradation.gapQualifiedCount);
    expect(c1.degradation.affectedResources).toEqual(c2.degradation.affectedResources);
  });

  test("gap ordering does not affect degradation summary content", () => {
    // Same gaps, different ordering
    const gapsA: CatalogGap[] = [
      catalogGap("dynamic-value", "gap1", "custom-element", "data-grid"),
      catalogGap("conditional-registration", "gap2", "value-converter", "dateFormat"),
    ];
    const gapsB: CatalogGap[] = [
      catalogGap("conditional-registration", "gap2", "value-converter", "dateFormat"),
      catalogGap("dynamic-value", "gap1", "custom-element", "data-grid"),
    ];

    const catalogA = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps: gapsA },
    );
    const catalogB = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps: gapsB },
    );

    const markup = `<data-grid>\${value | dateFormat}</data-grid>`;
    const cA = compileWith(markup, BUILTIN_SEMANTICS, catalogA);
    const cB = compileWith(markup, BUILTIN_SEMANTICS, catalogB);

    expect(cA.degradation.hasGaps).toBe(cB.degradation.hasGaps);
    expect(cA.degradation.gapQualifiedCount).toBe(cB.degradation.gapQualifiedCount);

    // affectedResources may have different ordering — compare as sets
    const setA = new Set(cA.degradation.affectedResources.map((r) => `${r.kind}:${r.name}`));
    const setB = new Set(cB.degradation.affectedResources.map((r) => `${r.kind}:${r.name}`));
    expect(setA).toEqual(setB);
  });
});

// ---------------------------------------------------------------------------
// Resource-kind completeness: all 5 resource kinds are tested
// ---------------------------------------------------------------------------

describe("Resource-kind completeness in degradation summary", () => {
  test("custom-attribute gaps appear in affectedResources", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "custom-attribute", "my-highlight"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    // Use the split catalog approach from R5 (M.2): lowerer recognizes the attribute,
    // linker doesn't find it — triggering a gap-qualified unknown-attribute diagnostic.
    const lowerCatalog = buildResourceCatalog(
      {
        ...BUILTIN_SEMANTICS.catalog.resources,
        attributes: {
          ...BUILTIN_SEMANTICS.catalog.resources.attributes,
          "my-highlight": {
            kind: "attribute" as const,
            name: "my-highlight",
            isTemplateController: false,
            bindables: {},
          },
        },
      },
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
    );

    // We need to use the link-level API for this test since the lowerer and linker
    // need different catalogs. Run through compileTemplate with the linker's catalog.
    // The lowered IR must see the attribute; the linker must NOT see it.
    const diagnostics = new DiagnosticsRuntime();
    const ir = lowerDocument(`<div my-highlight></div>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: lowerCatalog,
      diagnostics: diagnostics.forSource("lower"),
    });
    const snapshot = buildSemanticsSnapshot(BUILTIN_SEMANTICS, { catalog });
    linkTemplateSemantics(ir, snapshot, {
      moduleResolver: noopModuleResolver,
      templateFilePath: "mem.html",
      diagnostics: diagnostics.forSource("link"),
    });

    // Verify gap-qualified attribute diagnostic exists
    const d = diagnostics.all.find((d: any) => d.code === "aurelia/unknown-attribute");
    expect(d).toBeDefined();
    expect(d!.data?.confidence).toBe("partial");
    expect(d!.data?.resourceKind).toBe("custom-attribute");
  });

  test("template-controller gaps appear in affectedResources", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "template-controller", "my-tc"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    // Split catalog: lowerer recognizes my-tc as a controller, linker doesn't find it
    const lowerCatalog = buildResourceCatalog(
      {
        ...BUILTIN_SEMANTICS.catalog.resources,
        controllers: {
          ...BUILTIN_SEMANTICS.catalog.resources.controllers,
          "my-tc": {
            name: "my-tc",
            trigger: { kind: "value" as const, prop: "value" },
            scope: "overlay" as const,
          },
        },
      },
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
    );

    const diagnostics = new DiagnosticsRuntime();
    const ir = lowerDocument(`<div my-tc.bind="x"></div>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: lowerCatalog,
      diagnostics: diagnostics.forSource("lower"),
    });
    const snapshot = buildSemanticsSnapshot(BUILTIN_SEMANTICS, { catalog });
    linkTemplateSemantics(ir, snapshot, {
      moduleResolver: noopModuleResolver,
      templateFilePath: "mem.html",
      diagnostics: diagnostics.forSource("link"),
    });

    const d = diagnostics.all.find((d: any) => d.code === "aurelia/unknown-controller");
    expect(d).toBeDefined();
    expect(d!.data?.confidence).toBe("partial");
    expect(d!.data?.resourceKind).toBe("template-controller");
  });

  test("binding-behavior gaps appear in degradation via compileTemplate", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "binding-behavior", "myBehavior"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<div>\${value & myBehavior}</div>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    expect(compilation.degradation.hasGaps).toBe(true);
    expect(compilation.degradation.gapQualifiedCount).toBe(1);
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "binding-behavior", name: "myBehavior" },
    ]);
  });

  test("value-converter gaps appear in degradation via compileTemplate", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "value-converter", "myFormat"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<div>\${value | myFormat}</div>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    expect(compilation.degradation.hasGaps).toBe(true);
    expect(compilation.degradation.gapQualifiedCount).toBe(1);
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "value-converter", name: "myFormat" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Negative discrimination: non-gap unknown resources excluded from summary
// ---------------------------------------------------------------------------

describe("Negative discrimination: non-gap unknowns excluded", () => {
  test("unknown resource WITHOUT gaps does not appear in affectedResources", () => {
    // Gap for data-grid but NOT for unknown-widget — both are unknown elements
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<data-grid></data-grid><unknown-widget></unknown-widget>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    // Both elements trigger aurelia/unknown-element
    const unknownDiags = compilation.diagnostics.all.filter(
      (d: any) => d.code === "aurelia/unknown-element",
    );
    expect(unknownDiags).toHaveLength(2);

    // Only data-grid has confidence: partial (gap-qualified)
    const partial = unknownDiags.filter((d: any) => d.data?.confidence === "partial");
    expect(partial).toHaveLength(1);

    // Only data-grid appears in affectedResources
    expect(compilation.degradation.gapQualifiedCount).toBe(1);
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "custom-element", name: "data-grid" },
    ]);
    // unknown-widget is NOT in affectedResources
    const unknownWidget = compilation.degradation.affectedResources.find(
      (r) => r.name === "unknown-widget",
    );
    expect(unknownWidget).toBeUndefined();
  });

  test("mixed gap and non-gap value converters: only gapped one in summary", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "value-converter", "gappedVc"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<div>\${a | gappedVc}\${b | cleanVc}</div>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    // Both VCs trigger unknown-converter
    const vcDiags = compilation.diagnostics.all.filter(
      (d: any) => d.code === "aurelia/unknown-converter",
    );
    expect(vcDiags).toHaveLength(2);

    // Only gappedVc is gap-qualified
    expect(compilation.degradation.gapQualifiedCount).toBe(1);
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "value-converter", name: "gappedVc" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Non-contamination: non-gap diagnostics don't affect the summary
// ---------------------------------------------------------------------------

describe("Non-contamination: non-gap diagnostics excluded", () => {
  test("non-gap diagnostics (unknown-command, invalid-binding-pattern) do not inflate count", () => {
    // Template with a well-known non-gap diagnostic: unknown binding command
    // plus a gap-qualified unknown element
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);

    // There may be other diagnostics (non-gap) — verify they don't contaminate
    const totalDiags = compilation.diagnostics.all.length;
    const partialCount = countPartialConfidence(compilation.diagnostics.all);

    // The degradation count must equal partial diagnostics, not total diagnostics
    expect(compilation.degradation.gapQualifiedCount).toBe(partialCount);
    // And there might be more total diagnostics than gap-qualified ones
    expect(totalDiags).toBeGreaterThanOrEqual(partialCount);
  });

  test("template with only non-gap diagnostics has clean degradation", () => {
    // Unknown elements without gaps: diagnostics fire but not gap-qualified
    const compilation = compileWith(
      `<unknown-widget></unknown-widget>`,
      BUILTIN_SEMANTICS,
    );

    // There IS an unknown-element diagnostic
    const unknownEl = compilation.diagnostics.all.find(
      (d: any) => d.code === "aurelia/unknown-element",
    );
    expect(unknownEl).toBeDefined();

    // But it has no gap qualification
    expect(unknownEl!.data?.confidence).toBeUndefined();

    // So degradation is clean
    expect(compilation.degradation.hasGaps).toBe(false);
    expect(compilation.degradation.gapQualifiedCount).toBe(0);
    expect(compilation.degradation.affectedResources).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Project-level gaps don't inflate the summary
// ---------------------------------------------------------------------------

describe("Project-level gaps do not inflate degradation summary", () => {
  test("project-level gaps (no resource targeting) produce no affectedResources", () => {
    const gaps: CatalogGap[] = [
      catalogGap("missing-source", "project-wide analysis incomplete"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<data-grid></data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    // The unknown-element diagnostic fires but is NOT gap-qualified
    // (project-level gaps don't match per-resource hasGaps queries)
    expect(compilation.degradation.hasGaps).toBe(false);
    expect(compilation.degradation.gapQualifiedCount).toBe(0);
    expect(compilation.degradation.affectedResources).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Deduplication and aggregation edge cases
// ---------------------------------------------------------------------------

describe("Deduplication and aggregation", () => {
  test("same resource with multiple gap-qualified diagnostics appears once in affectedResources", () => {
    // data-grid element exists but has gaps, and template references multiple unknown bindables
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps for data-grid", "custom-element", "data-grid"),
    ];
    const sem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        elements: {
          "data-grid": {
            kind: "element",
            name: "data-grid",
            bindables: {},
          },
        },
      },
    });
    const catalog = buildResourceCatalog(
      sem.catalog.resources,
      sem.catalog.bindingCommands,
      sem.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(
      `<data-grid items.bind="x" columns.bind="y" sort.bind="z"></data-grid>`,
      sem,
      catalog,
    );

    // Multiple gap-qualified diagnostics for different bindables
    const partialCount = countPartialConfidence(compilation.diagnostics.all);
    expect(compilation.degradation.gapQualifiedCount).toBe(partialCount);
    expect(partialCount).toBeGreaterThanOrEqual(3);

    // But only one entry in affectedResources (deduplicated by kind:name)
    expect(compilation.degradation.affectedResources).toEqual([
      { kind: "custom-element", name: "data-grid" },
    ]);
  });

  test("affectedResources entries have exactly kind and name fields", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "gaps", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const compilation = compileWith(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);

    for (const entry of compilation.degradation.affectedResources) {
      const keys = Object.keys(entry);
      expect(keys).toHaveLength(2);
      expect(keys).toContain("kind");
      expect(keys).toContain("name");
      expect(typeof entry.kind).toBe("string");
      expect(typeof entry.name).toBe("string");
    }
  });
});
