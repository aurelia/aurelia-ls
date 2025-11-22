import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { lowerDocument } from "../../out/compiler/phases/10-lower/lower.js";
import { DEFAULT } from "../../out/compiler/language/registry.js";
import { resolveHost } from "../../out/compiler/phases/20-resolve-host/resolve.js";
import { materializeResourcesForScope } from "../../out/compiler/language/resource-graph.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const vectorFiles = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith(".json") && f !== "failures.json")
  .sort();
const vectors = vectorFiles.flatMap((file) => {
  const full = path.join(__dirname, file);
  return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
});

const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
attachWriter();

describe("Resolve (20)", () => {
  for (const v of vectors) {
    test(v.name, () => {
      const sem = v.semOverrides ? deepMergeSemantics(DEFAULT, v.semOverrides) : DEFAULT;
      const ir = lowerDocument(v.markup, {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        sem,
      });
      const linked = resolveHost(ir, sem);
      const intent = reduceLinkedIntent(linked);
      const expected = v.expect ?? {};

      const diff = compareIntent(intent, expected);
      const { missing, extra } = diff;

      const anyMissing =
        missing.items.length ||
        missing.diags.length;
      const anyExtra =
        extra.items.length ||
        extra.diags.length;

      if (anyMissing || anyExtra) {
        recordFailure({
          file: v.file,
          name: v.name,
          markup: v.markup,
          expected,
          actual: intent,
          diff,
        });
      }

      assert.ok(
        !anyMissing,
        "Resolve intent is missing expected items." +
        fmtList("missing.items", missing.items) +
        fmtList("missing.diags", missing.diags) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !anyExtra,
        "Resolve intent has unexpected extras." +
        fmtList("extra.items", extra.items) +
        fmtList("extra.diags", extra.diags) +
        "\nSee failures.json for full snapshot."
      );
    });
  }

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

function compareIntent(actual, expected) {
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
    missing: {
      items: items.missing,
      diags: diags.missing,
    },
    extra: {
      items: items.extra,
      diags: diags.extra,
    },
  };
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
    case "iteratorBinding":
      items.push({ kind: "iterator", res: "repeat", to: p.to });
      break;
    default:
      break;
  }
}
