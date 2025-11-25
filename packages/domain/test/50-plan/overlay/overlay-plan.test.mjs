import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, diffByKey, fmtList } from "../../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../../out/index.js";
import { lowerDocument } from "../../../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../../../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../../../out/compiler/phases/30-bind/bind.js";
import { plan as planOverlay } from "../../../out/compiler/phases/50-plan/overlay/plan.js";
import { DEFAULT as SEM_DEFAULT } from "../../../out/compiler/language/registry.js";

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

describe("Plan Overlay (50)", () => {
  for (const v of vectors) {
    test(`${v.name}  [${v.file}]`, () => {
      const sem = v.semOverrides ? deepMergeSemantics(SEM_DEFAULT, v.semOverrides) : SEM_DEFAULT;
      const ir = lowerDocument(v.markup, {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        sem,
      });
      const linked = resolveHost(ir, sem);
      const scope = bindScopes(linked);
      const vm = createVmReflection(v.rootVmType ?? "RootVm", v.syntheticPrefix ?? "__AU_TTC_");
      const pl = planOverlay(linked, scope, { isJs: false, vm });

      const intent = reducePlanIntent({ ir, scope, pl });
      const expected = normalizePlanExpect(v.expect);
      const diff = comparePlanIntent(intent, expected);
      const { missingFrames, extraFrames, missingLambdas, extraLambdas } = diff;

      const anyMismatch =
        missingFrames.length || extraFrames.length ||
        missingLambdas.length || extraLambdas.length;

      if (anyMismatch) {
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
        !missingFrames.length && !extraFrames.length,
        "Plan FRAMES mismatch." +
        fmtList("missingFrames", missingFrames) +
        fmtList("extraFrames",   extraFrames) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !missingLambdas.length && !extraLambdas.length,
        "Plan LAMBDAS mismatch." +
        fmtList("missingLambdas", missingLambdas) +
        fmtList("extraLambdas",   extraLambdas) +
        "\nSee failures.json for full snapshot."
      );
    });
  }
});

function createVmReflection(rootType, syntheticPrefix) {
  return {
    getRootVmTypeExpr() {
      return rootType;
    },
    getSyntheticPrefix() {
      return syntheticPrefix;
    },
  };
}

function normalizePlanExpect(expect) {
  return {
    frames: expect?.frames ?? [],
    lambdas: expect?.lambdas ?? [],
  };
}

function reducePlanIntent({ ir, scope, pl }) {
  const codeIndex = indexExprCodeFromIr(ir);
  const labels = labelFrames(scope.templates?.[0]);
  const frames = [];
  const lambdas = [];

  const tpl = pl.templates?.[0];
  if (tpl) {
    const alias = tpl.vmType?.alias;
    const aliasType = tpl.vmType?.typeExpr;
    const normalizeTypeExpr = (expr) => {
      if (!alias || !aliasType) return expr;
      return expr.split(alias).join(aliasType);
    };
    for (const f of tpl.frames ?? []) {
      const label = labels[f.frame] ?? `frame#${f.frame}`;
      frames.push({ label, typeName: f.typeName, typeExpr: normalizeTypeExpr(f.typeExpr) });
      for (const lam of f.lambdas ?? []) {
        lambdas.push({
          frame: label,
          lambda: lam.lambda,
          expr: codeIndex.get(lam.exprId) ?? `(expr:${lam.exprId})`,
        });
      }
    }
  }

  return { frames, lambdas };
}

function comparePlanIntent(actual, expected) {
  const { missing: missingFrames, extra: extraFrames } =
    diffByKey(actual.frames, expected.frames, (f) => `${f.label ?? ""}|${f.typeName ?? ""}|${f.typeExpr ?? ""}`);
  const { missing: missingLambdas, extra: extraLambdas } =
    diffByKey(actual.lambdas, expected.lambdas, (l) => `${l.frame ?? ""}|${l.lambda ?? ""}|${l.expr ?? ""}`);
  return { missingFrames, extraFrames, missingLambdas, extraLambdas };
}

function labelFrames(scopeTemplate) {
  if (!scopeTemplate) return [];
  const labels = [];
  let overlayCounter = 0;
  for (const f of scopeTemplate.frames ?? []) {
    if (f.parent == null) {
      labels[f.id] = "root";
      continue;
    }
    if (f.kind === "overlay") {
      overlayCounter++;
      const k =
        (f.origin && f.origin.kind) ? f.origin.kind :
        (f.overlay && f.overlay.kind) ? f.overlay.kind :
        "overlay";
      labels[f.id] = `overlay:${k}@${overlayCounter}`;
    } else {
      labels[f.id] = `frame#${f.id}`;
    }
  }
  return labels;
}

/**
 * Index ExprId -> authored code by walking IR binding sources.
 * Falls back to `(expr:<id>)` labels when the authored code isn't recorded.
 */
function indexExprCodeFromIr(ir) {
  const map = new Map();
  const visitSource = (src) => {
    if (!src) return;
    if (src.kind === "interp") {
      for (const r of src.exprs ?? []) map.set(r.id, r.code);
    } else {
      map.set(src.id, src.code);
    }
  };

  for (const t of ir.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        switch (ins.type) {
          case "propertyBinding":
          case "attributeBinding":
          case "stylePropertyBinding":
          case "textBinding":
            visitSource(ins.from);
            break;
          case "listenerBinding":
          case "refBinding":
            visitSource(ins.from);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding") visitSource(p.from);
            }
            if (ins.branch?.kind === "case" && ins.branch.expr) visitSource(ins.branch.expr);
            break;
          case "hydrateElement":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding" || p.type === "attributeBinding") {
                visitSource(p.from);
              }
            }
            break;
          case "hydrateAttribute":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding" || p.type === "attributeBinding") {
                visitSource(p.from);
              }
            }
            break;
          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;
          default:
            break;
        }
      }
    }
  }
  return map;
}
