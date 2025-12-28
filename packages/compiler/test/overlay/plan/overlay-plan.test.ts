import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr } from "../../_helpers/vector-runner.js";
import { diffByKey } from "../../_helpers/test-utils.js";

import { lowerDocument, resolveHost, bindScopes, planOverlay } from "../../../out/compiler/index.js";

runVectorTests({
  dirname: getDirname(import.meta.url),
  suiteName: "Plan Overlay (50)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem);
    const scope = bindScopes(linked);
    const vm = createVmReflection(v.rootVmType ?? "RootVm", v.syntheticPrefix ?? "__AU_TTC_");
    const pl = planOverlay(linked, scope, { isJs: false, vm });
    return reducePlanIntent({ ir, scope, pl });
  },
  compare: comparePlanIntent,
  categories: ["frames", "lambdas"],
  normalizeExpect: (expect) => ({
    frames: expect?.frames ?? [],
    lambdas: expect?.lambdas ?? [],
  }),
});

// --- Helpers ---

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

// --- Intent Reduction ---

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

// --- Intent Comparison ---

function comparePlanIntent(actual, expected) {
  const { missing: missingFrames, extra: extraFrames } =
    diffByKey(actual.frames, expected.frames, (f) => `${f.label ?? ""}|${f.typeName ?? ""}|${f.typeExpr ?? ""}`);
  const { missing: missingLambdas, extra: extraLambdas } =
    diffByKey(actual.lambdas, expected.lambdas, (l) => `${l.frame ?? ""}|${l.lambda ?? ""}|${l.expr ?? ""}`);
  return { missingFrames, extraFrames, missingLambdas, extraLambdas };
}
