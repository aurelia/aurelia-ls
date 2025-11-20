
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "../_helpers/test-utils.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { lowerDocument } from "../../out/compiler/phases/10-lower/lower.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorsPath = path.join(__dirname, "lower-cases.json");
const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));

const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
attachWriter();

describe("Lower (10)", () => {
  for (const v of vectors) {
    test(v.name, () => {
      const ir = lowerDocument(v.markup, {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem"
      });
      const intent = reduceIrToLowerIntent(ir);
      const expected = v.expect ?? {};

      const diff = compareIntent(intent, expected);
      const { missing, extra } = diff;

      const anyMissing = missing.expressions.length || missing.controllers.length || missing.lets.length;
      const anyExtra = extra.expressions.length || extra.controllers.length || extra.lets.length;

      if (anyMissing || anyExtra) {
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
        !anyMissing,
        "Lower intent is missing expected items." +
        fmtList("missing.expressions", missing.expressions) +
        fmtList("missing.controllers", missing.controllers) +
        fmtList("missing.lets",       missing.lets) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !anyExtra,
        "Lower intent has unexpected extras." +
        fmtList("extra.expressions", extra.expressions) +
        fmtList("extra.controllers", extra.controllers) +
        fmtList("extra.lets",       extra.lets) +
        "\nSee failures.json for full snapshot."
      );
    });
  }
});

/**
 * Normalize the IrModule produced by lowerDocument() into
 * a compact Intent shape our tests can assert against.
 *
 * Intent.expressions: one entry per authored expression.
 * Intent.controllers: controller names discovered (outer→inner order within the module).
 * Intent.lets: <let> locals and their flags.
 */

function modeToCommand(mode) {
  switch (mode) {
    case "oneTime": return "one-time";
    case "toView": return "to-view";
    case "fromView": return "from-view";
    case "twoWay": return "two-way";
    default: return "bind";
  }
}

function pushFromBindingSource(list, kind, on, source) {
  if (!source) return;
  if (source.kind === "interp") {
    // one entry per sub-expression
    for (const e of source.exprs ?? []) {
      list.push({ kind, on, code: e.code });
    }
  } else {
    list.push({ kind, on, code: source.code });
  }
}

/** Reduce a single TemplateIR into expressions/controllers/lets. */
function reduceTemplate(t, moduleExprTable, out) {
  for (const row of t.rows ?? []) {
    for (const ins of row.instructions ?? []) {
      switch (ins.type) {
        case "textBinding":
          pushFromBindingSource(out.expressions, "text", undefined, ins.from);
          break;

        case "attributeBinding":
          if (ins.from && ins.from.kind === "interp") {
            // plain attribute with ${...}
            pushFromBindingSource(out.expressions, "attrInterpolation", ins.attr, ins.from);
          } else {
            // .class/.attr overrides: expression (non-interp) on an attribute
            out.expressions.push({
              kind: "propCommand",
              command: "bind",
              code: ins.from.code
            });
          }
          break;

        case "propertyBinding": // .bind / .one-time / :prop
          out.expressions.push({
            kind: "propCommand",
            command: modeToCommand(ins.mode),
            code: (ins.from.kind === "interp" ? undefined : ins.from.code)
          });
          break;

        case "stylePropertyBinding": // bg.style="a"
          pushFromBindingSource(out.expressions, "propCommand", undefined, ins.from);
          // normalize to 'bind' for command semantics
          out.expressions[out.expressions.length - 1].command = "bind";
          break;

        case "listenerBinding": // foo.trigger="..."
          out.expressions.push({
            kind: "event",
            on: ins.to,
            command: ins.capture ? "capture" : "trigger",
            code: ins.from.code
          });
          break;

        case "refBinding": // ref=el
          out.expressions.push({ kind: "ref", on: ins.to, code: ins.from.code });
          break;

        case "hydrateLetElement":
          for (const b of ins.instructions ?? []) {
            if (b.type !== "letBinding") continue;

            out.lets.push({
              name: b.to,
              toBindingContext: ins.toBindingContext === true,
              hasValue: !!b.from
            });

            if (!b.from) continue;

            if (b.from.kind === "interp") {
              // interpolation form: expand per sub-expression, no 'command'
              pushFromBindingSource(out.expressions, "letValue", b.to, b.from);
            } else {
              // command form: record code + command:'bind'
              out.expressions.push({ kind: "letValue", on: b.to, code: b.from.code, command: "bind" });
            }
          }
          break;

        case "hydrateTemplateController": {
          out.controllers.push({ name: ins.res });

          for (const p of ins.props ?? []) {
            if (p.type === "iteratorBinding") {
              out.expressions.push({ kind: "iterator" });
            } else if (p.type === "propertyBinding") {
              const isControllerValue = p.to === "value";
              out.expressions.push({
                kind: isControllerValue ? "controllerValue" : "propCommand",
                code: (p.from && p.from.kind !== "interp") ? p.from.code : undefined,
                // both controllerValue(value=...) and propCommand on controllers behave like 'bind'
                command: "bind"
              });
            }
          }

          // Traverse inner view for nested controllers/expressions.
          if (ins.def) reduceTemplate(ins.def, moduleExprTable, out);
          break;
        }

        default:
          // ignore SetAttribute/SetClassAttribute/SetStyleAttribute/HydrateElementIR/HydrateAttributeIR
          break;
      }
    }
  }
}

/** Public reducer */
export function reduceIrToLowerIntent(irModule) {
  const out = { expressions: [], controllers: [], lets: [] };
  // IMPORTANT: only reduce the root template and recurse via `ins.def`.
  // `irModule.templates` also contains nested templates; iterating all would double count.
  const root = irModule.templates?.[0];
  if (root) reduceTemplate(root, irModule.exprTable ?? [], out);
  return out;
}

/** Deep comparison treating arrays as sets by value. */
export function compareIntent(actual, expected) {
  const key = (e) =>
    `${e.kind ?? ""}|${e.on ?? ""}|${e.command ?? ""}|${e.code ?? ""}|${e.name ?? ""}|${e.toBindingContext ? 1 : 0}|${e.hasValue ? 1 : 0}`;

  function toSet(list) {
    return new Set((list ?? []).map(key));
  }

  const a = {
    expressions: toSet(actual.expressions),
    controllers: toSet(actual.controllers),
    lets: toSet(actual.lets),
  };
  const e = {
    expressions: toSet(expected.expressions),
    controllers: toSet(expected.controllers),
    lets: toSet(expected.lets),
  };

  const missing = {
    expressions: [...e.expressions].filter(k => !a.expressions.has(k)),
    controllers: [...e.controllers].filter(k => !a.controllers.has(k)),
    lets: [...e.lets].filter(k => !a.lets.has(k)),
  };

  const extra = {
    expressions: [...a.expressions].filter(k => !e.expressions.has(k)),
    controllers: [...a.controllers].filter(k => !e.controllers.has(k)),
    lets: [...a.lets].filter(k => !e.lets.has(k)),
  };

  return { missing, extra };
}
