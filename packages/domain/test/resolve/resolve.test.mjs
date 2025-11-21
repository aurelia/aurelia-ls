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
const vectorsPath = path.join(__dirname, "resolve-cases.json");
const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));

const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
attachWriter();

describe("Resolve Host (20)", () => {
  for (const v of vectors) {
    test(v.name, () => {
      const sem = v.semOverrides ? deepMergeSemantics(DEFAULT, v.semOverrides) : DEFAULT;
      const ir = lowerDocument(v.markup, {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        sem
      });

      const linked = resolveHost(ir, sem);

      const intent = reduceLinkedToIntent(linked);
      const expected = v.expect ?? { items: [], diags: [] };

      const diff = compareResolveIntent(intent, expected);
      const {
        missingItems, extraItems,
        missingDiags, extraDiags
      } = diff;

      const anyMismatch =
        missingItems.length || extraItems.length ||
        missingDiags.length || extraDiags.length;

      if (anyMismatch) {
        recordFailure({
          file: vectorsPath,
          name: v.name,
          markup: v.markup,
          expected,
          actual: intent,
          diff,
        });
      }

      assert.ok(
        !missingItems.length && !extraItems.length,
        "Resolve intent mismatch for items." +
        fmtList("missingItems", missingItems) +
        fmtList("extraItems",   extraItems) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !missingDiags.length && !extraDiags.length,
        "Resolve diagnostics mismatch." +
        fmtList("missingDiags", missingDiags) +
        fmtList("extraDiags",   extraDiags) +
        "\nSee failures.json for full snapshot."
      );
    });
  }
});

/**
 * Reduce a LinkedSemanticsModule into a compact intent:
 * - items: simplified view of property/attribute/event/controller/iterator/ref/style
 * - diags: AU11xx diagnostics (code only + message kept for debugging)
 *
 * NOTE: We only traverse the ROOT linked template. For resolve-host we care
 * about linking decisions on the rows; nested defs are visited by later phases.
 */
export function reduceLinkedToIntent(linked) {
  const out = { items: [], diags: [] };
  const root = linked.templates?.[0];
  if (!root) return out;

  const pushBindable = (ins, kindOverride, res) => {
    switch (ins.kind) {
      case "propertyBinding":
        out.items.push({
          kind: kindOverride ?? "prop",
          res,
          to: ins.to,
          target: mapTarget(ins.target),
          effectiveMode: ins.effectiveMode,
        });
        break;
      case "attributeBinding":
        out.items.push({
          kind: kindOverride ?? "attr",
          res,
          attr: ins.attr,
          to: ins.to,
          target: mapTarget(ins.target),
        });
        break;
      case "stylePropertyBinding":
        out.items.push({
          kind: kindOverride ?? "style",
          res,
          to: ins.to,
          target: "style",
        });
        break;
      default:
        break;
    }
  };

  for (const row of root.rows ?? []) {
    for (const ins of row.instructions ?? []) {
      switch (ins.kind) {
        case "propertyBinding":
        case "attributeBinding":
        case "stylePropertyBinding":
          pushBindable(ins);
          break;

        case "listenerBinding":
          out.items.push({
            kind: "event",
            to: ins.to,
            type: typeName(ins.eventType),
            capture: !!ins.capture,
            modifier: ins.modifier ?? null,
          });
          break;

        case "refBinding":
          out.items.push({
            kind: "ref",
            on: ins.to,
          });
          break;

        case "hydrateTemplateController":
          for (const p of ins.props ?? []) {
            if (p.kind === "iteratorBinding") {
              out.items.push({ kind: "iterator", res: ins.res, to: p.to });
            } else {
              pushBindable(p, "ctrlProp", ins.res);
            }
          }
          break;

        case "hydrateElement":
          for (const p of ins.props ?? []) pushBindable(p);
          break;

        case "hydrateAttribute":
          for (const p of ins.props ?? []) pushBindable(p);
          break;

        default:
          break;
      }
    }
  }

  for (const d of linked.diags ?? []) {
    out.diags.push({ code: d.code, message: d.message });
  }
  return out;
}
function mapTarget(t) {
  switch (t?.kind) {
    case "element.bindable": return "bindable";
    case "attribute.bindable": return "bindable";
    case "element.nativeProp": return "native";
    case "controller.prop": return "controller";
    case "attribute": return "attribute";
    case "unknown": return "unknown";
    default: return "unknown";
  }
}

function typeName(t) {
  return t && t.kind === "ts" ? t.name : "unknown";
}

/**
 * Compare actual vs expected resolve-host "intent" (set-like).
 * - Items are keyed by salient fields; missing/extra reported
 * - Diags compared by code (message is informational)
 */
export function compareResolveIntent(actual, expected) {
  const key = (i) => [
    i.kind ?? "",
    i.res ?? "",
    i.attr ?? "",
    i.on ?? "",
    i.to ?? "",
    i.target ?? "",
    i.effectiveMode ?? "",
    i.type ?? "",
    i.capture ? "1" : "",
    i.modifier ?? ""
  ].join("|");

  const aItems = new Set((actual.items ?? []).map(key));
  const eItems = new Set((expected.items ?? []).map(key));

  const aDiags = new Set((actual.diags ?? []).map(d => d.code));
  const eDiags = new Set((expected.diags ?? []).map(d => d.code));

  const missingItems = [...eItems].filter(k => !aItems.has(k));
  const extraItems   = [...aItems].filter(k => !eItems.has(k));
  const missingDiags = [...eDiags].filter(k => !aDiags.has(k));
  const extraDiags   = [...aDiags].filter(k => !eDiags.has(k));

  return { missingItems, extraItems, missingDiags, extraDiags };
}

