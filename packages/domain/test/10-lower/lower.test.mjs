import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { lowerDocument } from "../../out/compiler/phases/10-lower/lower.js";
import { DEFAULT as SEM_DEFAULT } from "../../out/compiler/language/registry.js";

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

describe("Lower (10)", () => {
  for (const v of vectors) {
    const suite = v.file === "spec-sweep.json" ? "SpecSweep" : "Vectors";
    test(`[${suite}] ${v.name}`, () => {
      const sem = v.semOverrides ? deepMergeSemantics(SEM_DEFAULT, v.semOverrides) : SEM_DEFAULT;
      const ir = lowerDocument(v.markup, {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        sem,
      });
      const intent = reduceIrToLowerIntent(ir);
      const expected = v.expect ?? {};

      const diff = compareIntent(intent, expected);
      const { missing, extra } = diff;

      const anyMissing =
        missing.expressions.length ||
        missing.controllers.length ||
        missing.lets.length ||
        missing.elements.length ||
        missing.attributes.length;
      const anyExtra =
        extra.expressions.length ||
        extra.controllers.length ||
        extra.lets.length ||
        extra.elements.length ||
        extra.attributes.length;

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
        "Lower intent is missing expected items." +
        fmtList("missing.expressions", missing.expressions) +
        fmtList("missing.controllers", missing.controllers) +
        fmtList("missing.lets",       missing.lets) +
        fmtList("missing.elements",   missing.elements) +
        fmtList("missing.attributes", missing.attributes) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !anyExtra,
        "Lower intent has unexpected extras." +
        fmtList("extra.expressions", extra.expressions) +
        fmtList("extra.controllers", extra.controllers) +
        fmtList("extra.lets",       extra.lets) +
        fmtList("extra.elements",   extra.elements) +
        fmtList("extra.attributes", extra.attributes) +
        "\nSee failures.json for full snapshot."
      );
    });
  }
});

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
    for (const e of source.exprs ?? []) list.push({ kind, on, code: e.code });
  } else {
    list.push({ kind, on, code: source.code });
  }
}

function reduceTemplate(t, out) {
  for (const row of t.rows ?? []) {
    for (const ins of row.instructions ?? []) {
      switch (ins.type) {
        case "textBinding":
          pushFromBindingSource(out.expressions, "text", undefined, ins.from);
          break;
        case "attributeBinding":
          if (ins.from && ins.from.kind === "interp") {
            pushFromBindingSource(out.expressions, "attrInterpolation", ins.attr, ins.from);
          } else {
            out.expressions.push({ kind: "propCommand", command: "bind", code: ins.from.code });
          }
          break;
        case "propertyBinding":
          out.expressions.push({
            kind: "propCommand",
            command: modeToCommand(ins.mode),
            code: (ins.from.kind === "interp" ? undefined : ins.from.code)
          });
          break;
        case "stylePropertyBinding":
          pushFromBindingSource(out.expressions, "propCommand", undefined, ins.from);
          out.expressions[out.expressions.length - 1].command = "bind";
          break;
        case "listenerBinding":
          out.expressions.push({
            kind: "event",
            on: ins.to,
            command: ins.capture ? "capture" : "trigger",
            code: ins.from.code
          });
          break;
        case "refBinding":
          out.expressions.push({ kind: "ref", on: ins.to, code: ins.from.code });
          break;
        case "hydrateLetElement":
          for (const b of ins.instructions ?? []) {
            if (b.type !== "letBinding") continue;
            out.lets.push({ name: b.to, toBindingContext: ins.toBindingContext === true, hasValue: !!b.from });
            if (!b.from) continue;
            if (b.from.kind === "interp") {
              pushFromBindingSource(out.expressions, "letValue", b.to, b.from);
            } else {
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
                command: "bind"
              });
            }
          }
          if (ins.def) reduceTemplate(ins.def, out);
          break;
        }
        case "hydrateElement": {
          out.elements.push({
            res: ins.res,
            containerless: !!ins.containerless,
            props: (ins.props ?? []).map((p) => p.to ?? p.attr ?? ""),
          });
          for (const p of ins.props ?? []) {
            if (p.type === "propertyBinding") {
              out.expressions.push({
                kind: "propCommand",
                code: p.from?.code,
                command: modeToCommand(p.mode),
              });
            } else if (p.type === "attributeBinding") {
              pushFromBindingSource(out.expressions, "attrInterpolation", p.attr, p.from);
            }
          }
          break;
        }
        case "hydrateAttribute": {
          out.attributes.push({
            res: ins.res,
            alias: ins.alias,
            props: (ins.props ?? []).map((p) => p.to ?? p.attr ?? ""),
          });
          for (const p of ins.props ?? []) {
            if (p.type === "propertyBinding") {
              out.expressions.push({
                kind: "propCommand",
                code: p.from?.code,
                command: modeToCommand(p.mode),
              });
            } else if (p.type === "attributeBinding") {
              pushFromBindingSource(out.expressions, "attrInterpolation", p.attr, p.from);
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }
}

function reduceIrToLowerIntent(irModule) {
  const out = { expressions: [], controllers: [], lets: [], elements: [], attributes: [] };
  const root = irModule.templates?.[0];
  if (root) reduceTemplate(root, out);
  return out;
}

function compareIntent(actual, expected) {
  const keyExpr = (e) => `${e.kind ?? ""}|${e.on ?? ""}|${e.command ?? ""}|${e.code ?? ""}|${e.name ?? ""}|${e.toBindingContext ? 1 : 0}|${e.hasValue ? 1 : 0}`;
  const keyElem = (e) => `${e.res ?? ""}|${e.containerless ? 1 : 0}|${(e.props ?? []).join(",")}`;
  const keyAttr = (e) => `${e.res ?? ""}|${e.alias ?? ""}|${(e.props ?? []).join(",")}`;
  const toSet = (list, keyFn) => new Set((list ?? []).map(keyFn));

  const a = {
    expressions: toSet(actual.expressions, keyExpr),
    controllers: toSet(actual.controllers, keyExpr),
    lets: toSet(actual.lets, keyExpr),
    elements: toSet(actual.elements, keyElem),
    attributes: toSet(actual.attributes, keyAttr),
  };
  const e = {
    expressions: toSet(expected.expressions, keyExpr),
    controllers: toSet(expected.controllers, keyExpr),
    lets: toSet(expected.lets, keyExpr),
    elements: toSet(expected.elements, keyElem),
    attributes: toSet(expected.attributes, keyAttr),
  };

  const missing = {
    expressions: [...e.expressions].filter((k) => !a.expressions.has(k)),
    controllers: [...e.controllers].filter((k) => !a.controllers.has(k)),
    lets: [...e.lets].filter((k) => !a.lets.has(k)),
    elements: [...e.elements].filter((k) => !a.elements.has(k)),
    attributes: [...e.attributes].filter((k) => !a.attributes.has(k)),
  };

  const extra = {
    expressions: [...a.expressions].filter((k) => !e.expressions.has(k)),
    controllers: [...a.controllers].filter((k) => !e.controllers.has(k)),
    lets: [...a.lets].filter((k) => !e.lets.has(k)),
    elements: [...a.elements].filter((k) => !e.elements.has(k)),
    attributes: [...a.attributes].filter((k) => !e.attributes.has(k)),
  };

  return { missing, extra };
}
