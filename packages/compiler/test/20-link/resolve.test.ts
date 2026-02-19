import { test, describe, expect } from "vitest";

import { runVectorTests, getDirname, lowerOpts } from "../_helpers/vector-runner.js";
import { deepMergeSemantics } from "../_helpers/semantics-merge.js";
import { noopModuleResolver } from "../_helpers/test-utils.js";

import {
  getExpressionParser,
  DEFAULT_SYNTAX,
  lowerDocument,
  BUILTIN_SEMANTICS,
  linkTemplateSemantics, buildSemanticsSnapshot,
  materializeResourcesForScope,
  createSemanticsLookup,
  prepareProjectSemantics,
  DiagnosticsRuntime,
} from "@aurelia-ls/compiler";

// Internal import for direct unit testing of resolveControllerSem
import { resolveControllerSem } from "../../src/analysis/20-link/resolution-helpers.js";
import { createResolveContext, createResolveServices } from "../../src/analysis/20-link/resolve-context.js";
import { isStub } from "../../src/shared/diagnosed.js";

const dirname = getDirname(import.meta.url);
const RESOLVE_OPTS = { moduleResolver: noopModuleResolver, templateFilePath: "mem.html" };

// --- Types ---

interface ResolveItem {
  kind: string;
  to?: string;
  attr?: string;
  on?: string;
  res?: string;
  target?: string;
  effectiveMode?: string;
  type?: string;
  capture?: boolean;
  modifier?: string;
  value?: unknown;
  branch?: string; // Branch kind: "then" | "catch" | "pending" | "case" | "default"
}

interface DiagExpect {
  code?: string;
}

interface ResolveExpect {
  items?: ResolveItem[];
  diags?: (DiagExpect | string)[];
}

interface ResolveIntent {
  items: ResolveItem[];
  diags: string[];
}

interface ResolveDiff {
  missingItems: string[];
  extraItems: string[];
  missingDiags: string[];
  extraDiags: string[];
}

// --- Vector Tests ---

runVectorTests<ResolveExpect, ResolveIntent, ResolveDiff>({
  dirname,
  suiteName: "Resolve (20)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(ctx.sem), {
      ...RESOLVE_OPTS,
      diagnostics: ctx.diagnostics.forSource("link"),
    });
    return reduceLinkedIntent(linked, ctx.diagnostics.all);
  },
  compare: compareResolveIntent,
  categories: ["items", "diags"],
});

// --- Additional Non-Vector Tests ---

describe("Resolve (20) - Resource Graph", () => {
  test("resource graph: local scope overlays root but not parent scopes", () => {
    const diagnostics = new DiagnosticsRuntime();
    const baseSem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        elements: {},
        attributes: {},
        valueConverters: {},
        bindingBehaviors: {},
      },
    });

    const graph = {
      version: "aurelia-resource-graph@1",
      root: "root",
      scopes: {
        root: {
          id: "root",
          parent: null,
          resources: {
            elements: {
              "root-el": { kind: "element", name: "root-el", bindables: { foo: { name: "foo" } } },
            },
          },
        },
        feature: {
          id: "feature",
          parent: "root",
          resources: {
            elements: {
              "feature-el": { kind: "element", name: "feature-el", bindables: { bar: { name: "bar" } } },
            },
          },
        },
        child: {
          id: "child",
          parent: "feature",
          resources: {
            elements: {
              "child-el": { kind: "element", name: "child-el", bindables: { baz: { name: "baz" } } },
            },
          },
        },
      },
    };

    const scoped = materializeResourcesForScope(baseSem, graph, "child");
    const sem = prepareProjectSemantics(
      { ...baseSem, resourceGraph: graph, defaultScope: "child" },
      { resources: scoped.resources },
    );

    const ir = lowerDocument(
      `<root-el foo.bind="a"></root-el><feature-el bar.bind="b"></feature-el><child-el baz.bind="c"></child-el>`,
      {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        catalog: sem.catalog,
        diagnostics: diagnostics.forSource("lower"),
      },
    );

    const snapshot = buildSemanticsSnapshot(sem, {
      resourceGraph: graph,
      resourceScope: "child",
    });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    const propTargets = intent.items
      .filter((i) => i.kind === "prop")
      .map((p) => ({ to: p.to, target: p.target }))
      .sort((a, b) => a.to.localeCompare(b.to));

    expect(propTargets).toEqual([
      { to: "bar", target: "unknown" }, // parent scope resource should NOT be visible
      { to: "baz", target: "bindable" }, // local scope
      { to: "foo", target: "bindable" }, // root scope
    ]);

    expect(intent.diags, "Unknown host/prop from parent scope should surface aurelia/unknown-bindable").toContain("aurelia/unknown-bindable");
  });

  test("resource graph: local overrides root when names conflict", () => {
    const diagnostics = new DiagnosticsRuntime();
    const baseSem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        elements: {},
        attributes: {},
        valueConverters: {},
        bindingBehaviors: {},
      },
    });

    const graph = {
      version: "aurelia-resource-graph@1",
      root: "root",
      scopes: {
        root: {
          id: "root",
          parent: null,
          resources: {
            elements: {
              "conflict-el": { kind: "element", name: "conflict-el", bindables: { fromRoot: { name: "fromRoot" } } },
            },
          },
        },
        feature: {
          id: "feature",
          parent: "root",
          resources: {
            elements: {
              "conflict-el": { kind: "element", name: "conflict-el", bindables: { fromLocal: { name: "fromLocal" } } },
            },
          },
        },
      },
    };

    const scoped = materializeResourcesForScope(baseSem, graph, "feature");
    const sem = prepareProjectSemantics(
      { ...baseSem, resourceGraph: graph, defaultScope: "feature" },
      { resources: scoped.resources },
    );

    const ir = lowerDocument(`<conflict-el from-local.bind="x"></conflict-el><conflict-el from-root.bind="y"></conflict-el>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: sem.catalog,
      diagnostics: diagnostics.forSource("lower"),
    });

    const snapshot = buildSemanticsSnapshot(sem, {
      resourceGraph: graph,
      resourceScope: "feature",
    });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    const propTargets = intent.items
      .filter((i) => i.kind === "prop")
      .map((p) => ({ to: p.to, target: p.target }))
      .sort((a, b) => a.to.localeCompare(b.to));

    // local bindable wins; root bindable absent -> aurelia/unknown-bindable
    expect(propTargets).toEqual([
      { to: "fromLocal", target: "bindable" },
      { to: "fromRoot", target: "unknown" },
    ]);
    expect(intent.diags, "Root bindable should be hidden by local override").toContain("aurelia/unknown-bindable");
  });
});

describe("Resolve (20) - Controller Diagnostics", () => {
  test("resolveControllerSem returns aurelia/unknown-controller for unknown controller", () => {
    const diagnostics = new DiagnosticsRuntime();
    const { services } = createResolveServices({ diagnostics: diagnostics.forSource("link") });
    const ctx = createResolveContext(BUILTIN_SEMANTICS, services, undefined, null, noopModuleResolver, "mem.html");
    const result = resolveControllerSem(ctx, "unknown-tc", null);

    // Should have diagnostic
    expect(result.diagnostics.length > 0).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("aurelia/unknown-controller");
    expect(result.diagnostics[0]?.message).toContain("unknown-tc");

    // Should return stub config
    expect(isStub(result.value.config)).toBe(true);
    expect(result.value.res).toBe("unknown-tc");
  });

  test("resolveControllerSem returns success for built-in controller", () => {
    const diagnostics = new DiagnosticsRuntime();
    const { services } = createResolveServices({ diagnostics: diagnostics.forSource("link") });
    const ctx = createResolveContext(BUILTIN_SEMANTICS, services, undefined, null, noopModuleResolver, "mem.html");
    const result = resolveControllerSem(ctx, "if", null);

    // Should not have diagnostic
    expect(result.diagnostics.length).toBe(0);

    // Should return proper config
    expect(isStub(result.value.config)).toBe(false);
    expect(result.value.res).toBe("if");
    expect(result.value.config.name).toBe("if");
  });

  test("resolveControllerSem returns success for custom template controller", () => {
    const customSem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        attributes: {
          "my-tc": {
            kind: "attribute",
            name: "my-tc",
            isTemplateController: true,
            bindables: { value: { name: "value" } },
            primary: "value",
          },
        },
      },
    });

    const diagnostics = new DiagnosticsRuntime();
    const { services } = createResolveServices({ diagnostics: diagnostics.forSource("link") });
    const ctx = createResolveContext(customSem, services, undefined, null, noopModuleResolver, "mem.html");
    const result = resolveControllerSem(ctx, "my-tc", null);

    // Should not have diagnostic
    expect(result.diagnostics.length).toBe(0);

    // Should return proper config
    expect(isStub(result.value.config)).toBe(false);
    expect(result.value.res).toBe("my-tc");
    expect(result.value.config.name).toBe("my-tc");
  });
});

// --- Intent Reduction ---

interface LinkedModule {
  templates?: LinkedTemplate[];
}

interface LinkedTemplate {
  rows?: Array<{
    instructions?: LinkedInstruction[];
  }>;
}

interface LinkedInstruction {
  kind: string;
  to?: string;
  attr?: string;
  res?: string;
  target?: { kind: string };
  effectiveMode?: string;
  eventType?: { kind: string; name?: string };
  capture?: boolean;
  modifier?: string;
  value?: unknown;
  props?: LinkedInstruction[];
  def?: LinkedTemplate;
}

interface CompilerDiag {
  code: string;
  source?: string;
}

function reduceLinkedIntent(linked: LinkedModule, diagnostics: readonly CompilerDiag[]): ResolveIntent {
  const items: ResolveItem[] = [];
  const diags = diagnostics.filter((d) => d.stage === "link").map((d) => d.code);

  const visited = new Set<LinkedTemplate>();
  const visit = (template: LinkedTemplate): void => {
    if (!template || visited.has(template)) return;
    visited.add(template);
    visitTemplate(template, items, visit);
  };

  for (const template of linked.templates ?? []) {
    visit(template);
  }

  return { items, diags };
}

function visitTemplate(
  template: LinkedTemplate,
  items: ResolveItem[],
  visit: (t: LinkedTemplate) => void
): void {
  for (const row of template.rows ?? []) {
    for (const ins of row.instructions ?? []) {
      switch (ins.kind) {
        case "propertyBinding":
          items.push({
            kind: "prop",
            to: ins.to,
            target: mapTarget(ins.target),
            effectiveMode: ins.effectiveMode,
          });
          break;
        case "attributeBinding":
          items.push({
            kind: "attr",
            attr: ins.attr,
            to: ins.to,
            target: mapTarget(ins.target),
          });
          break;
        case "stylePropertyBinding":
          items.push({
            kind: "style",
            to: ins.to,
            target: mapTarget(ins.target),
          });
          break;
        case "listenerBinding":
          items.push({
            kind: "event",
            to: ins.to,
            type: ins.eventType?.kind === "ts" ? ins.eventType.name : "unknown",
            ...(ins.capture ? { capture: true } : {}),
            ...(ins.modifier ? { modifier: ins.modifier } : {}),
          });
          break;
        case "refBinding":
          items.push({ kind: "ref", on: ins.to });
          break;
        case "textBinding":
        case "setAttribute":
        case "setClassAttribute":
        case "setStyleAttribute":
        case "setProperty":
          break;
        case "iteratorBinding":
          items.push({ kind: "iterator", res: "repeat", to: ins.to ?? "items" });
          break;
        case "hydrateElement":
          for (const p of ins.props ?? []) pushBindingItem(items, p);
          break;
        case "hydrateAttribute":
          for (const p of ins.props ?? []) pushBindingItem(items, p);
          break;
        case "hydrateTemplateController":
          if (ins.props) {
            for (const p of ins.props) {
              if (p.kind === "propertyBinding") {
                items.push({
                  kind: "ctrlProp",
                  res: ins.res,
                  to: p.to,
                  target: "controller",
                  effectiveMode: p.effectiveMode,
                });
              } else if (p.kind === "iteratorBinding") {
                items.push({ kind: "iterator", res: ins.res, to: p.to });
              }
              else {
                pushBindingItem(items, p);
              }
            }
          }
          // Emit branch metadata if present (case, default, then, catch, pending)
          if (ins.branch) {
            items.push({
              kind: "branch",
              res: ins.res,
              branch: ins.branch.kind,
            });
          }
          if (ins.def) visit(ins.def);
          break;
        case "hydrateLetElement":
          break;
        default:
          break;
      }
    }
  }
}

function mapTarget(target: { kind: string } | undefined): string {
  if (!target) return "unknown";
  switch (target.kind) {
    case "element.nativeProp": return "native";
    case "element.bindable":
    case "attribute.bindable": return "bindable";
    case "controller.prop": return "controller";
    case "attribute": return "attribute";
    case "style": return "style";
    case "unknown": return "unknown";
    default: return target.kind;
  }
}

function pushBindingItem(items: ResolveItem[], p: LinkedInstruction): void {
  switch (p.kind) {
    case "propertyBinding":
      items.push({
        kind: "prop",
        to: p.to,
        target: mapTarget(p.target),
        effectiveMode: p.effectiveMode,
      });
      break;
    case "attributeBinding":
      items.push({
        kind: "attr",
        attr: p.attr,
        to: p.to,
        target: mapTarget(p.target),
      });
      break;
    case "stylePropertyBinding":
      items.push({
        kind: "style",
        to: p.to,
        target: mapTarget(p.target),
      });
      break;
    case "setProperty":
      items.push({
        kind: "setProp",
        to: p.to,
        value: p.value,
      });
      break;
    case "iteratorBinding":
      items.push({ kind: "iterator", res: "repeat", to: p.to });
      break;
    default:
      break;
  }
}

// --- Intent Comparison ---

function compareResolveIntent(actual: ResolveIntent, expected: ResolveExpect): ResolveDiff {
  const toCountMap = <T>(list: T[] | undefined, keyFn: (item: T) => string): Map<string, number> => {
    const map = new Map<string, number>();
    for (const item of list ?? []) {
      const k = keyFn(item);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  };
  const a = {
    items: toCountMap(actual.items, (e) => JSON.stringify(e)),
    diags: toCountMap(actual.diags, (e) => e),
  };
  const normalizeDiag = (d: DiagExpect | string): string => typeof d === "string" ? d : d.code ?? "";
  const e = {
    items: toCountMap(expected.items ?? [], (item) => JSON.stringify(item)),
    diags: toCountMap((expected.diags ?? []).map(normalizeDiag), (x) => x),
  };

  const diffCounts = (actualMap: Map<string, number>, expectedMap: Map<string, number>): { missing: string[]; extra: string[] } => {
    const missing: string[] = [];
    const extra: string[] = [];
    const keys = new Set([...actualMap.keys(), ...expectedMap.keys()]);
    for (const k of keys) {
      const aCount = actualMap.get(k) ?? 0;
      const eCount = expectedMap.get(k) ?? 0;
      if (eCount > aCount) {
        for (let i = 0; i < eCount - aCount; i++) missing.push(k);
      } else if (aCount > eCount) {
        for (let i = 0; i < aCount - eCount; i++) extra.push(k);
      }
    }
    return { missing, extra };
  };

  const items = diffCounts(a.items, e.items);
  const diags = diffCounts(a.diags, e.diags);

  return {
    missingItems: items.missing,
    extraItems: items.extra,
    missingDiags: diags.missing,
    extraDiags: diags.extra,
  };
}

// --- Local Imports Tests ---

describe("Resolve (20) - Local Imports", () => {
  test("localImports: element from template import resolves correctly", () => {
    const diagnostics = new DiagnosticsRuntime();
    // Simulate: <import from="./my-widget">
    // Template: <my-widget foo.bind="x"></my-widget>
    const localImports = [
      {
        name: "my-widget",
        bindables: { foo: { name: "foo" } },
      },
    ];

    const ir = lowerDocument(`<my-widget foo.bind="x"></my-widget>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: BUILTIN_SEMANTICS.catalog,
      diagnostics: diagnostics.forSource("lower"),
    });

    const snapshot = buildSemanticsSnapshot(BUILTIN_SEMANTICS, { localImports });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    // Bindable "foo" should resolve as bindable (proves element was recognized)
    const propItems = intent.items.filter((i) => i.kind === "prop");
    expect(propItems).toHaveLength(1);
    expect(propItems[0]).toEqual(
      expect.objectContaining({ to: "foo", target: "bindable" })
    );

    // No aurelia/unknown-bindable diagnostic for unknown element/property
    expect(intent.diags).not.toContain("aurelia/unknown-bindable");
  });

  test("localImports: element with alias resolves by alias", () => {
    const diagnostics = new DiagnosticsRuntime();
    // Simulate: <import from="./long-component-name" as="short">
    // Template: <short bar.bind="y"></short>
    const localImports = [
      {
        name: "long-component-name",
        bindables: { bar: { name: "bar" } },
        alias: "short",
      },
    ];

    const ir = lowerDocument(`<short bar.bind="y"></short>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: BUILTIN_SEMANTICS.catalog,
      diagnostics: diagnostics.forSource("lower"),
    });

    const snapshot = buildSemanticsSnapshot(BUILTIN_SEMANTICS, { localImports });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    // Bindable "bar" should resolve as bindable (proves element was recognized via alias)
    const propItems = intent.items.filter((i) => i.kind === "prop");
    expect(propItems).toHaveLength(1);
    expect(propItems[0]).toEqual(
      expect.objectContaining({ to: "bar", target: "bindable" })
    );

    // No aurelia/unknown-bindable diagnostic
    expect(intent.diags).not.toContain("aurelia/unknown-bindable");
  });

  test("localImports: does not override existing global registration", () => {
    const diagnostics = new DiagnosticsRuntime();
    // Setup semantics with global "au-compose" element
    const baseSem = deepMergeSemantics(BUILTIN_SEMANTICS, {
      resources: {
        elements: {
          "au-compose": {
            kind: "element",
            name: "au-compose",
            bindables: { globalProp: { name: "globalProp" } },
          },
        },
      },
    });

    // Local import tries to define "au-compose" with different bindable
    const localImports = [
      {
        name: "au-compose",
        bindables: { localProp: { name: "localProp" } },
      },
    ];

    const sem = prepareProjectSemantics(baseSem);
    const ir = lowerDocument(`<au-compose global-prop.bind="x"></au-compose>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: sem.catalog,
      diagnostics: diagnostics.forSource("lower"),
    });

    const snapshot = buildSemanticsSnapshot(sem, { localImports });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    // Global registration should win, so globalProp resolves as bindable
    const propItems = intent.items.filter((i) => i.kind === "prop");
    expect(propItems).toContainEqual(
      expect.objectContaining({ to: "globalProp", target: "bindable" })
    );
  });

  test("localImports: multiple imports resolve correctly", () => {
    const diagnostics = new DiagnosticsRuntime();
    // Simulate: <import from="./nav-bar"> <import from="./footer">
    const localImports = [
      { name: "nav-bar", bindables: { items: { name: "items" } } },
      { name: "footer", bindables: { year: { name: "year" } } },
    ];

    const ir = lowerDocument(
      `<nav-bar items.bind="menuItems"></nav-bar><footer year.bind="2024"></footer>`,
      {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        catalog: BUILTIN_SEMANTICS.catalog,
        diagnostics: diagnostics.forSource("lower"),
      }
    );

    const snapshot = buildSemanticsSnapshot(BUILTIN_SEMANTICS, { localImports });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    // Both bindables should resolve as bindable (proves both elements were recognized)
    const propItems = intent.items.filter((i) => i.kind === "prop");
    expect(propItems).toHaveLength(2);
    expect(propItems).toContainEqual(
      expect.objectContaining({ to: "items", target: "bindable" })
    );
    expect(propItems).toContainEqual(
      expect.objectContaining({ to: "year", target: "bindable" })
    );

    // No aurelia/unknown-bindable diagnostics
    expect(intent.diags).not.toContain("aurelia/unknown-bindable");
  });

  test("localImports: unknown element without import produces aurelia/unknown-element", () => {
    const diagnostics = new DiagnosticsRuntime();
    // No local imports - unknown element should produce diagnostic
    const ir = lowerDocument(`<unknown-widget prop.bind="x"></unknown-widget>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      catalog: BUILTIN_SEMANTICS.catalog,
      diagnostics: diagnostics.forSource("lower"),
    });

    const snapshot = buildSemanticsSnapshot(BUILTIN_SEMANTICS, { localImports: [] });
    const linked = linkTemplateSemantics(ir, snapshot, {
      ...RESOLVE_OPTS,
      diagnostics: diagnostics.forSource("link"),
    });
    const intent = reduceLinkedIntent(linked, diagnostics.all);

    // Property should resolve as "unknown" (element not recognized)
    const propItems = intent.items.filter((i) => i.kind === "prop");
    expect(propItems).toHaveLength(1);
    expect(propItems[0]).toEqual(
      expect.objectContaining({ to: "prop", target: "unknown" })
    );

    // Should have aurelia/unknown-element diagnostic for unknown element
    expect(intent.diags).toContain("aurelia/unknown-element");
  });
});




