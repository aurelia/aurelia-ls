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
});

function reduceLinkedIntent(linked) {
  const items = [];
  const diags = (linked.diags ?? []).map((d) => d.code);

  const root = linked.templates?.[0];
  if (!root) return { items, diags };

  for (const row of root.rows ?? []) {
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
          break;
        case "hydrateLetElement":
          break;
        default:
          break;
      }
    }
  }

  return { items, diags };
}

function compareIntent(actual, expected) {
  const toSet = (list, keyFn) => new Set((list ?? []).map(keyFn));
  const a = {
    items: toSet(actual.items, (e) => JSON.stringify(e)),
    diags: toSet(actual.diags, (e) => e),
  };
  const e = {
    items: toSet(expected.items ?? [], (e) => JSON.stringify(e)),
    diags: toSet((expected.diags ?? []).map((d) => d.code ?? d), (e) => e),
  };

  const missing = {
    items: [...e.items].filter((k) => !a.items.has(k)),
    diags: [...e.diags].filter((k) => !a.diags.has(k)),
  };

  const extra = {
    items: [...a.items].filter((k) => !e.items.has(k)),
    diags: [...a.diags].filter((k) => !e.diags.has(k)),
  };

  return { missing, extra };
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
