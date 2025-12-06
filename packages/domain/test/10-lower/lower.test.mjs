import { runVectorTests, getDirname, lowerOpts } from "../_helpers/vector-runner.mjs";
import { diffByKey } from "../_helpers/test-utils.mjs";

import { lowerDocument } from "../../out/compiler/index.js";

runVectorTests({
  dirname: getDirname(import.meta.url),
  suiteName: "Lower (10)",
  execute: (v, ctx) => reduceIrToLowerIntent(lowerDocument(v.markup, lowerOpts(ctx))),
  compare: compareLowerIntent,
  categories: ["expressions", "controllers", "lets", "elements", "attributes"],
});

// --- Intent Reduction ---

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
          // if and else are separate controllers (linked at runtime via Else.link())
          const ctrl = { name: ins.res };
          out.controllers.push(ctrl);
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

// --- Intent Comparison ---

function compareLowerIntent(actual, expected) {
  const keyExpr = (e) => `${e.kind ?? ""}|${e.on ?? ""}|${e.command ?? ""}|${e.code ?? ""}|${e.name ?? ""}|${e.toBindingContext ? 1 : 0}|${e.hasValue ? 1 : 0}`;
  const keyElem = (e) => `${e.res ?? ""}|${e.containerless ? 1 : 0}|${(e.props ?? []).join(",")}`;
  const keyAttr = (e) => `${e.res ?? ""}|${e.alias ?? ""}|${(e.props ?? []).join(",")}`;

  const { missing: missingExpressions, extra: extraExpressions } =
    diffByKey(actual.expressions, expected.expressions, keyExpr);
  const { missing: missingControllers, extra: extraControllers } =
    diffByKey(actual.controllers, expected.controllers, keyExpr);
  const { missing: missingLets, extra: extraLets } =
    diffByKey(actual.lets, expected.lets, keyExpr);
  const { missing: missingElements, extra: extraElements } =
    diffByKey(actual.elements, expected.elements, keyElem);
  const { missing: missingAttributes, extra: extraAttributes } =
    diffByKey(actual.attributes, expected.attributes, keyAttr);

  return {
    missingExpressions, extraExpressions,
    missingControllers, extraControllers,
    missingLets, extraLets,
    missingElements, extraElements,
    missingAttributes, extraAttributes,
  };
}
