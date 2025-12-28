import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr } from "../_helpers/vector-runner.js";
import { diffByKey } from "../_helpers/test-utils.js";

import { lowerDocument, resolveHost, bindScopes, typecheck } from "../../out/compiler/index.js";

runVectorTests({
  dirname: getDirname(import.meta.url),
  suiteName: "Typecheck (40)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem);
    const scope = bindScopes(linked);
    const tc = typecheck({
      linked,
      scope,
      ir,
      rootVmType: v.rootVmType ?? "RootVm",
    });
    return reduceTypecheckIntent({ ir, tc });
  },
  compare: compareTypecheckIntent,
  categories: ["expected", "inferred", "diags"],
  normalizeExpect: (expect) => ({
    expected: expect?.expected ?? [],
    inferred: expect?.inferred ?? [],
    diags: (expect?.diags ?? []).map((d) => ({
      code: typeof d === "string" ? d : d.code,
      expr: typeof d === "string" ? undefined : d.expr,
      expected: typeof d === "string" ? undefined : d.expected,
      actual: typeof d === "string" ? undefined : d.actual,
    })),
  }),
});

// --- Intent Reduction ---

function reduceTypecheckIntent({ ir, tc }) {
  const codeIndex = indexExprCodeFromIr(ir);
  const expected = mapEntries(tc.expectedByExpr, codeIndex);
  const inferred = mapEntries(tc.inferredByExpr, codeIndex);
  const diags = (tc.diags ?? []).map((d) => ({
    code: d.code,
    expr: d.exprId ? (codeIndex.get(d.exprId) ?? `(expr:${d.exprId})`) : undefined,
    expected: d.expected,
    actual: d.actual,
  }));
  return { expected, inferred, diags };
}

function mapEntries(mapLike, codeIndex) {
  const out = [];
  if (!mapLike || typeof mapLike.entries !== "function") return out;
  for (const [id, type] of mapLike.entries()) {
    out.push({ code: codeIndex.get(id) ?? `(expr:${id})`, type });
  }
  return out;
}

// --- Intent Comparison ---

function compareTypecheckIntent(actual, expected) {
  const { missing: missingExpected, extra: extraExpected } =
    diffByKey(actual.expected, expected.expected, (e) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingInferred, extra: extraInferred } =
    diffByKey(actual.inferred, expected.inferred, (e) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingDiags, extra: extraDiags } =
    diffByKey(actual.diags, expected.diags, (d) => `${d.code ?? ""}|${d.expr ?? ""}|${d.expected ?? ""}|${d.actual ?? ""}`);

  return { missingExpected, extraExpected, missingInferred, extraInferred, missingDiags, extraDiags };
}
