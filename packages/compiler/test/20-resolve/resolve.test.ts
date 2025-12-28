import { test, describe } from "vitest";
import assert from "node:assert/strict";

import { runVectorTests, getDirname, lowerOpts } from "../_helpers/vector-runner.js";
import { deepMergeSemantics } from "../_helpers/semantics-merge.js";

import {
  getExpressionParser,
  DEFAULT_SYNTAX,
  lowerDocument,
  DEFAULT,
  resolveHost,
  materializeResourcesForScope,
} from "../../out/compiler/index.js";

const dirname = getDirname(import.meta.url);

// --- Vector Tests ---

runVectorTests({
  dirname,
  suiteName: "Resolve (20)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem);
    return reduceLinkedIntent(linked);
  },
  compare: compareResolveIntent,
  categories: ["items", "diags"],
});

// --- Additional Non-Vector Tests ---

describe("Resolve (20) - Resource Graph", () => {
  test("resource graph: local scope overlays root but not parent scopes", () => {
    const baseSem = deepMergeSemantics(DEFAULT, {
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
    const sem = {
      ...baseSem,
      resources: scoped.resources,
      resourceGraph: graph,
      defaultScope: "child",
    };

    const ir = lowerDocument(
      `<root-el foo.bind="a"></root-el><feature-el bar.bind="b"></feature-el><child-el baz.bind="c"></child-el>`,
      {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        sem,
      },
    );

    const linked = resolveHost(ir, sem, { graph, scope: "child" });
    const intent = reduceLinkedIntent(linked);

    const propTargets = intent.items
      .filter((i) => i.kind === "prop")
      .map((p) => ({ to: p.to, target: p.target }))
      .sort((a, b) => a.to.localeCompare(b.to));

    assert.deepEqual(propTargets, [
      { to: "bar", target: "unknown" }, // parent scope resource should NOT be visible
      { to: "baz", target: "bindable" }, // local scope
      { to: "foo", target: "bindable" }, // root scope
    ]);

    assert.ok(
      intent.diags.includes("AU1104"),
      "Unknown host/prop from parent scope should surface AU1104",
    );
  });

  test("resource graph: local overrides root when names conflict", () => {
    const baseSem = deepMergeSemantics(DEFAULT, {
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
    const sem = {
      ...baseSem,
      resources: scoped.resources,
      resourceGraph: graph,
      defaultScope: "feature",
    };

    const ir = lowerDocument(`<conflict-el from-local.bind="x"></conflict-el><conflict-el from-root.bind="y"></conflict-el>`, {
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      file: "mem.html",
      name: "mem",
      sem,
    });

    const linked = resolveHost(ir, sem, { graph, scope: "feature" });
    const intent = reduceLinkedIntent(linked);

    const propTargets = intent.items
      .filter((i) => i.kind === "prop")
      .map((p) => ({ to: p.to, target: p.target }))
      .sort((a, b) => a.to.localeCompare(b.to));

    // local bindable wins; root bindable absent -> AU1104
    assert.deepEqual(propTargets, [
      { to: "fromLocal", target: "bindable" },
      { to: "fromRoot", target: "unknown" },
    ]);
    assert.ok(intent.diags.includes("AU1104"), "Root bindable should be hidden by local override");
  });
});

// --- Intent Reduction ---

function reduceLinkedIntent(linked) {
  const items = [];
  const diags = (linked.diags ?? []).map((d) => d.code);

  const visited = new Set();
  const visit = (template) => {
    if (!template || visited.has(template)) return;
    visited.add(template);
    visitTemplate(template, items, visit);
  };

  for (const template of linked.templates ?? []) {
    visit(template);
  }

  return { items, diags };
}

function visitTemplate(template, items, visit) {
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

function mapTarget(target) {
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

function pushBindingItem(items, p) {
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

function compareResolveIntent(actual, expected) {
  const toCountMap = (list, keyFn) => {
    const map = new Map();
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
  const e = {
    items: toCountMap(expected.items ?? [], (e) => JSON.stringify(e)),
    diags: toCountMap((expected.diags ?? []).map((d) => d.code ?? d), (e) => e),
  };

  const diffCounts = (actualMap, expectedMap) => {
    const missing = [];
    const extra = [];
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
