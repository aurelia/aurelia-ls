/**
 * R5: Gap-Qualified Diagnostic Tests (Patterns I–N)
 *
 * Tests that the link stage qualifies "unknown resource" diagnostics with
 * reduced confidence when the gap index reports gaps for the resource.
 *
 * Seam crossing: project analysis (gap creation) → catalog (gap indexing, R3)
 * → template analysis (diagnostic qualification, R5).
 */
import { describe, test, expect } from "vitest";
import type { NormalizedPath } from "@aurelia-ls/compiler";

import { deepMergeSemantics } from "../_helpers/semantics-merge.js";
import { noopModuleResolver } from "../_helpers/test-utils.js";

import {
  getExpressionParser,
  DEFAULT_SYNTAX,
  lowerDocument,
  BUILTIN_SEMANTICS,
  linkTemplateSemantics,
  buildSemanticsSnapshot,
  DiagnosticsRuntime,
} from "@aurelia-ls/compiler";

import { buildResourceCatalog } from "../../src/schema/catalog.js";
import type {
  CatalogGap,
  ResourceCatalog,
  ResourceGraph,
  ResourceKind,
  ResourceScopeId,
  ScopeCompleteness,
} from "../../src/schema/types.js";

const RESOLVE_OPTS = { moduleResolver: noopModuleResolver, templateFilePath: "mem.html" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Lower markup and link against semantics with a given catalog, return all diagnostics. */
function linkWithDiagnostics(
  markup: string,
  sem: any,
  catalog?: ResourceCatalog,
  snapshotOpts?: {
    resourceGraph?: ResourceGraph | null;
    resourceScope?: ResourceScopeId | null;
  },
) {
  const diagnostics = new DiagnosticsRuntime();
  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "mem.html",
    name: "mem",
    catalog: catalog ?? sem.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });
  const snapshot = buildSemanticsSnapshot(sem, {
    catalog,
    ...(snapshotOpts?.resourceGraph !== undefined ? { resourceGraph: snapshotOpts.resourceGraph } : {}),
    ...(snapshotOpts?.resourceScope !== undefined ? { resourceScope: snapshotOpts.resourceScope } : {}),
  });
  linkTemplateSemantics(ir, snapshot, {
    ...RESOLVE_OPTS,
    diagnostics: diagnostics.forSource("link"),
  });
  return diagnostics.all;
}

/** Find a diagnostic by code from the list. */
function findDiag(diags: any[], code: string) {
  return diags.find((d: any) => d.code === code);
}

/** Find all diagnostics by code from the list. */
function findAllDiags(diags: any[], code: string) {
  return diags.filter((d: any) => d.code === code);
}

// ---------------------------------------------------------------------------
// Pattern I: Gap-qualified "unknown element" has reduced confidence
// ---------------------------------------------------------------------------

describe("Pattern I: Gap-qualified unknown element", () => {
  test("unknown element with gaps has data.confidence = 'partial'", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const d = findDiag(diags, "aurelia/unknown-element");

    expect(d, "aurelia/unknown-element should be emitted").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(analysis gaps exist for this resource)");
  });
});

// ---------------------------------------------------------------------------
// Pattern J: Non-gapped "unknown element" retains high confidence
// ---------------------------------------------------------------------------

describe("Pattern J: Non-gapped unknown element retains high confidence", () => {
  test("unknown element without gaps has no data.confidence override", () => {
    // No gaps for data-grid
    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS);
    const d = findDiag(diags, "aurelia/unknown-element");

    expect(d, "aurelia/unknown-element should be emitted").toBeDefined();
    expect(d.data?.confidence).toBeUndefined();
    expect(d.message).not.toContain("(analysis gaps exist for this resource)");
  });
});

describe("Scope completeness qualification: unknown element", () => {
  const rootScope = "root" as ResourceScopeId;

  function rootGraph(completeness: ScopeCompleteness): ResourceGraph {
    return {
      version: "aurelia-resource-graph@1",
      root: rootScope,
      scopes: {
        [rootScope]: {
          id: rootScope,
          parent: null,
          resources: {},
          completeness,
        },
      },
    };
  }

  test("incomplete scope qualifies unknown-element without per-resource gaps", () => {
    const completeness: ScopeCompleteness = {
      complete: false,
      unresolvedRegistrations: [
        {
          source: "analysis",
          reason: "Cannot statically analyze call to 'loadPlugins()'",
          file: "/src/main.ts" as NormalizedPath,
          span: { start: 0, end: 1 },
          pattern: { kind: "function-call", functionName: "loadPlugins" },
        },
      ],
    };
    const graph = rootGraph(completeness);
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { scopeCompleteness: { [rootScope]: completeness } },
    );

    const diags = linkWithDiagnostics(
      `<data-grid></data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
      { resourceGraph: graph, resourceScope: rootScope },
    );
    const d = findDiag(diags, "aurelia/unknown-element");

    expect(d, "aurelia/unknown-element should be emitted").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(scope analysis is incomplete)");
    expect(d.message).not.toContain("(analysis gaps exist for this resource)");
  });

  test("complete scope keeps unknown-element unqualified when no resource gaps exist", () => {
    const completeness: ScopeCompleteness = { complete: true, unresolvedRegistrations: [] };
    const graph = rootGraph(completeness);
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { scopeCompleteness: { [rootScope]: completeness } },
    );

    const diags = linkWithDiagnostics(
      `<data-grid></data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
      { resourceGraph: graph, resourceScope: rootScope },
    );
    const d = findDiag(diags, "aurelia/unknown-element");

    expect(d, "aurelia/unknown-element should be emitted").toBeDefined();
    expect(d.data?.confidence).toBeUndefined();
    expect(d.message).not.toContain("(scope analysis is incomplete)");
  });
});

// ---------------------------------------------------------------------------
// Pattern K: Gap-qualified "unknown bindable" on found-but-gapped element
// ---------------------------------------------------------------------------

describe("Pattern K: Gap-qualified unknown bindable on found-but-gapped element", () => {
  test("unknown bindable on gapped element has data.confidence = 'partial'", () => {
    // Element exists with limited bindables, plus a gap
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

    const diags = linkWithDiagnostics(
      `<data-grid columns.bind="cols"></data-grid>`,
      sem,
      catalog,
    );
    const d = findDiag(diags, "aurelia/unknown-bindable");

    expect(d, "aurelia/unknown-bindable should be emitted for 'columns'").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(element has analysis gaps)");
  });
});

// ---------------------------------------------------------------------------
// Pattern L: Non-gapped "unknown bindable" retains high confidence
// ---------------------------------------------------------------------------

describe("Pattern L: Non-gapped unknown bindable retains high confidence", () => {
  test("unknown bindable on non-gapped element has no data.confidence override", () => {
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

    const diags = linkWithDiagnostics(
      `<data-grid columns.bind="cols"></data-grid>`,
      sem,
    );
    const d = findDiag(diags, "aurelia/unknown-bindable");

    expect(d, "aurelia/unknown-bindable should be emitted for 'columns'").toBeDefined();
    expect(d.data?.confidence).toBeUndefined();
    expect(d.message).not.toContain("(element has analysis gaps)");
  });
});

// ---------------------------------------------------------------------------
// Pattern M: Gap-qualified diagnostics for all resource kinds
// ---------------------------------------------------------------------------

describe("Pattern M: Gap-qualified diagnostics for all resource kinds", () => {
  // M.1: custom-element (covered by Pattern I, included here for completeness)
  test("custom-element: gap-qualified unknown-element", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "custom-element", "my-widget"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(`<my-widget></my-widget>`, BUILTIN_SEMANTICS, catalog);
    const d = findDiag(diags, "aurelia/unknown-element");
    expect(d).toBeDefined();
    expect(d.data?.confidence).toBe("partial");
  });

  // M.2: custom-attribute (via hydrateAttribute path)
  test("custom-attribute: gap-qualified unknown-attribute", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "custom-attribute", "my-highlight"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    // To trigger hydrateAttribute for a custom attribute, we need an element
    // with the attribute recognized as a custom attribute in lowering.
    // Since my-highlight is NOT in the catalog, the lowerer won't recognize it
    // as a custom attribute. We need a different approach — the linkHydrateAttribute
    // path is only reached when the lowerer already classified it as a custom attribute.
    //
    // Instead, we register it in the lowering catalog but NOT in the link catalog.
    // This way lowering recognizes it, but the link stage can't find it.
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
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const d = findDiag(diagnostics.all, "aurelia/unknown-attribute");
    expect(d, "aurelia/unknown-attribute should be emitted").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(analysis gaps exist for this resource)");
  });

  // M.3: template-controller
  test("template-controller: gap-qualified unknown-controller", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "template-controller", "my-tc"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    // Template controllers are recognized by the lowerer from the catalog.
    // Since my-tc is NOT in the catalog, we need the lowerer to still produce
    // a hydrateTemplateController IR. We register it in the lower catalog.
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
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const d = findDiag(diagnostics.all, "aurelia/unknown-controller");
    expect(d, "aurelia/unknown-controller should be emitted").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(analysis gaps exist for this resource)");
  });

  // M.4: value-converter
  test("value-converter: gap-qualified unknown-converter", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "value-converter", "myFormat"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(
      `<div>\${value | myFormat}</div>`,
      BUILTIN_SEMANTICS,
      catalog,
    );
    const d = findDiag(diags, "aurelia/unknown-converter");
    expect(d, "aurelia/unknown-converter should be emitted").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(analysis gaps exist for this resource)");
  });

  // M.5: binding-behavior
  test("binding-behavior: gap-qualified unknown-behavior", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "binding-behavior", "myBehavior"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(
      `<div>\${value & myBehavior}</div>`,
      BUILTIN_SEMANTICS,
      catalog,
    );
    const d = findDiag(diags, "aurelia/unknown-behavior");
    expect(d, "aurelia/unknown-behavior should be emitted").toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(analysis gaps exist for this resource)");
  });

  // M.6: Verify all five kinds WITHOUT gaps retain default confidence
  test("all resource kinds without gaps retain default confidence", () => {
    // No gaps at all — verify each kind produces unqualified diagnostics
    const sem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        elements: {
          "known-el": {
            kind: "element",
            name: "known-el",
            bindables: { a: { name: "a" } },
          },
        },
      },
    });

    // Unknown element
    const elDiags = linkWithDiagnostics(`<unknown-el></unknown-el>`, sem);
    const elDiag = findDiag(elDiags, "aurelia/unknown-element");
    expect(elDiag).toBeDefined();
    expect(elDiag.data?.confidence).toBeUndefined();

    // Unknown bindable on known element
    const bindDiags = linkWithDiagnostics(`<known-el z.bind="x"></known-el>`, sem);
    const bindDiag = findDiag(bindDiags, "aurelia/unknown-bindable");
    expect(bindDiag).toBeDefined();
    expect(bindDiag.data?.confidence).toBeUndefined();

    // Unknown value converter
    const vcDiags = linkWithDiagnostics(`<div>\${v | noSuchVc}</div>`, sem);
    const vcDiag = findDiag(vcDiags, "aurelia/unknown-converter");
    expect(vcDiag).toBeDefined();
    expect(vcDiag.data?.confidence).toBeUndefined();

    // Unknown binding behavior
    const bbDiags = linkWithDiagnostics(`<div>\${v & noSuchBb}</div>`, sem);
    const bbDiag = findDiag(bbDiags, "aurelia/unknown-behavior");
    expect(bbDiag).toBeDefined();
    expect(bbDiag.data?.confidence).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pattern N: Cascade suppression still works for gap-qualified unknowns
// ---------------------------------------------------------------------------

describe("Pattern N: Cascade suppression with gap-qualified unknowns", () => {
  test("gap-qualified unknown element suppresses property diagnostics", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "bindables for data-grid", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    const diags = linkWithDiagnostics(
      `<data-grid items.bind="list" columns.bind="cols"></data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
    );

    // ONE unknown-element diagnostic (gap-qualified)
    const unknownEls = findAllDiags(diags, "aurelia/unknown-element");
    expect(unknownEls).toHaveLength(1);
    expect(unknownEls[0].data?.confidence).toBe("partial");

    // NO unknown-bindable diagnostics (cascade suppression — property bindings on
    // unknown elements are suppressed since the root cause is the missing element)
    const unknownBindables = findAllDiags(diags, "aurelia/unknown-bindable");
    expect(unknownBindables, "cascade suppression: no unknown-bindable on unknown element").toHaveLength(0);
  });

  test("gap-qualified unknown element: cascade suppression identical to non-gapped", () => {
    // Without gaps
    const diagsNoGaps = linkWithDiagnostics(
      `<data-grid items.bind="list" columns.bind="cols"></data-grid>`,
      BUILTIN_SEMANTICS,
    );
    const noGapUnknownEls = findAllDiags(diagsNoGaps, "aurelia/unknown-element");
    const noGapUnknownBindables = findAllDiags(diagsNoGaps, "aurelia/unknown-bindable");

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
    const diagsWithGaps = linkWithDiagnostics(
      `<data-grid items.bind="list" columns.bind="cols"></data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
    );
    const gapUnknownEls = findAllDiags(diagsWithGaps, "aurelia/unknown-element");
    const gapUnknownBindables = findAllDiags(diagsWithGaps, "aurelia/unknown-bindable");

    // Same number of diagnostics per code — gap qualification doesn't change which diags fire
    expect(noGapUnknownEls).toHaveLength(gapUnknownEls.length);
    expect(noGapUnknownBindables).toHaveLength(gapUnknownBindables.length);

    // The only difference: confidence is set on the gap-qualified variant
    expect(noGapUnknownEls[0].data?.confidence).toBeUndefined();
    expect(gapUnknownEls[0].data?.confidence).toBe("partial");
  });

  test("event bindings are not cascade-suppressed (pre-R5 behavior preserved)", () => {
    // Events (.trigger) are DOM-level, not component-level. The cascade suppression
    // in isUnknownCustomElement only applies to property/attribute bindings (Sites 2/3/4),
    // NOT event bindings. This is pre-R5 behavior and R5 does not change it.
    // The R5 spec's Pattern N assertion about unknown-event was inaccurate.

    // Without gaps
    const diagsNoGaps = linkWithDiagnostics(
      `<data-grid sort.trigger="onSort()"></data-grid>`,
      BUILTIN_SEMANTICS,
    );
    const noGapEvents = findAllDiags(diagsNoGaps, "aurelia/unknown-event");

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
    const diagsWithGaps = linkWithDiagnostics(
      `<data-grid sort.trigger="onSort()"></data-grid>`,
      BUILTIN_SEMANTICS,
      catalog,
    );
    const gapEvents = findAllDiags(diagsWithGaps, "aurelia/unknown-event");

    // Event behavior is identical with and without gaps — neither is suppressed
    expect(noGapEvents).toHaveLength(gapEvents.length);
    expect(noGapEvents.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Adversarial edge cases: qualification specificity and invariants
// ---------------------------------------------------------------------------

describe("Gap qualification specificity", () => {
  test("resource-kind mismatch: element gap does NOT qualify unknown-attribute diagnostic", () => {
    // Gap is for custom-element:my-highlight, but the diagnostic is for
    // custom-attribute:my-highlight. The hasGaps query is kind-specific.
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "my-highlight"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    // Use the split catalog: lowerer knows my-highlight as custom-attribute,
    // linker doesn't — but gap is for custom-element kind, not custom-attribute.
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
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const d = findDiag(diagnostics.all, "aurelia/unknown-attribute");
    expect(d, "aurelia/unknown-attribute should be emitted").toBeDefined();
    // The gap is for custom-element, not custom-attribute — confidence should NOT be partial
    expect(d.data?.confidence).toBeUndefined();
    expect(d.message).not.toContain("(analysis gaps");
  });

  test("resource-name mismatch: gap for different element does NOT qualify", () => {
    // Gap is for custom-element:other-widget, but the unknown element is data-grid.
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "other-widget"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const d = findDiag(diags, "aurelia/unknown-element");
    expect(d, "aurelia/unknown-element should be emitted").toBeDefined();
    // Gap is for other-widget, not data-grid — confidence should NOT be partial
    expect(d.data?.confidence).toBeUndefined();
    expect(d.message).not.toContain("(analysis gaps");
  });

  test("project-level gaps (no resource targeting) do NOT qualify per-resource diagnostics", () => {
    // Project-level gap has no resourceKind/resourceName — it should not
    // match any specific resource in hasGaps queries.
    const gaps: CatalogGap[] = [
      catalogGap("missing-source", "project-wide analysis incomplete"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const d = findDiag(diags, "aurelia/unknown-element");
    expect(d, "aurelia/unknown-element should be emitted").toBeDefined();
    // Project-level gap, not resource-targeted — confidence should NOT be partial
    expect(d.data?.confidence).toBeUndefined();
    expect(d.message).not.toContain("(analysis gaps");
  });

  test("multiple gaps for same resource still qualifies correctly", () => {
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "first gap", "custom-element", "data-grid"),
      catalogGap("conditional-registration", "second gap", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const d = findDiag(diags, "aurelia/unknown-element");
    expect(d).toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.message).toContain("(analysis gaps exist for this resource)");
  });
});

describe("Gap qualification invariants", () => {
  test("gap-qualified diagnostics do not override severity (catalog default applies)", () => {
    // R5 spec: "Gap-qualified diagnostics remain error severity."
    // The gap qualification code never passes severity to the emitter,
    // so the diagnostic has no explicit severity — catalog default (error) applies.
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test gap", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const d = findDiag(diags, "aurelia/unknown-element");
    expect(d).toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    // Severity must NOT be explicitly set — it inherits from the catalog's defaultSeverity
    expect(d.severity).toBeUndefined();
  });

  test("gap-qualified diagnostics carry correct data.resourceKind", () => {
    // Verify the diagnostic data includes the resource kind that matches
    // the gap query vocabulary.
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "data-grid"),
      catalogGap("dynamic-value", "test", "value-converter", "myFormat"),
      catalogGap("dynamic-value", "test", "binding-behavior", "myBehavior"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );

    // Unknown element
    const elDiags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const elDiag = findDiag(elDiags, "aurelia/unknown-element");
    expect(elDiag.data?.resourceKind).toBe("custom-element");
    expect(elDiag.data?.name).toBe("data-grid");

    // Unknown value converter
    const vcDiags = linkWithDiagnostics(`<div>\${v | myFormat}</div>`, BUILTIN_SEMANTICS, catalog);
    const vcDiag = findDiag(vcDiags, "aurelia/unknown-converter");
    expect(vcDiag.data?.resourceKind).toBe("value-converter");
    expect(vcDiag.data?.name).toBe("myFormat");

    // Unknown binding behavior
    const bbDiags = linkWithDiagnostics(`<div>\${v & myBehavior}</div>`, BUILTIN_SEMANTICS, catalog);
    const bbDiag = findDiag(bbDiags, "aurelia/unknown-behavior");
    expect(bbDiag.data?.resourceKind).toBe("binding-behavior");
    expect(bbDiag.data?.name).toBe("myBehavior");
  });

  test("gap-qualified unknown-bindable carries correct bindable owner info", () => {
    // Verify bindable diagnostic data carries correct owner info when gapped
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "data-grid"),
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

    const diags = linkWithDiagnostics(
      `<data-grid columns.bind="cols"></data-grid>`,
      sem,
      catalog,
    );
    const d = findDiag(diags, "aurelia/unknown-bindable");
    expect(d).toBeDefined();
    expect(d.data?.confidence).toBe("partial");
    expect(d.data?.bindable?.ownerKind).toBe("element");
    expect(d.data?.bindable?.ownerName).toBe("data-grid");
  });

  test("diagnostic codes are unchanged (no new codes introduced by R5)", () => {
    // Verify R5 uses only the existing diagnostic codes, not new ones
    const gaps: CatalogGap[] = [
      catalogGap("dynamic-value", "test", "custom-element", "data-grid"),
    ];
    const catalog = buildResourceCatalog(
      BUILTIN_SEMANTICS.catalog.resources,
      BUILTIN_SEMANTICS.catalog.bindingCommands,
      BUILTIN_SEMANTICS.catalog.attributePatterns,
      { gaps },
    );
    const diags = linkWithDiagnostics(`<data-grid></data-grid>`, BUILTIN_SEMANTICS, catalog);
    const linkDiags = diags.filter((d: any) => d.stage === "link");
    // Every diagnostic code should be a known pre-R5 code
    const knownCodes = new Set([
      "aurelia/unknown-element",
      "aurelia/unknown-attribute",
      "aurelia/unknown-bindable",
      "aurelia/unknown-controller",
      "aurelia/unknown-converter",
      "aurelia/unknown-behavior",
      "aurelia/unknown-event",
      "aurelia/unknown-command",
      "aurelia/invalid-binding-pattern",
      "aurelia/invalid-command-usage",
    ]);
    for (const d of linkDiags) {
      expect(knownCodes.has(d.code), `unexpected new diagnostic code: ${d.code}`).toBe(true);
    }
  });
});
