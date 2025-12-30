import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr, type TestVector, type CompilerContext } from "../_helpers/vector-runner.js";
import { diffByKey } from "../_helpers/test-utils.js";

import { lowerDocument, resolveHost, bindScopes, typecheck } from "@aurelia-ls/compiler";

// --- Types ---

interface TypeEntry {
  code: string;
  type: string;
}

interface DiagEntry {
  code: string;
  expr?: string;
  expected?: string;
  actual?: string;
}

interface DiagExpectInput {
  code?: string;
  expr?: string;
  expected?: string;
  actual?: string;
}

interface TypecheckExpect {
  expected?: TypeEntry[];
  inferred?: TypeEntry[];
  diags?: (DiagExpectInput | string)[];
}

interface TypecheckIntent {
  expected: TypeEntry[];
  inferred: TypeEntry[];
  diags: DiagEntry[];
}

interface TypecheckDiff {
  missingExpected: string[];
  extraExpected: string[];
  missingInferred: string[];
  extraInferred: string[];
  missingDiags: string[];
  extraDiags: string[];
}

runVectorTests<TypecheckExpect, TypecheckIntent, TypecheckDiff>({
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
      // Use "standard" preset for tests to get full error detection
      // (default is "lenient" for better user experience)
      config: { preset: "standard" },
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

interface TypecheckResult {
  expectedByExpr?: Map<string, string>;
  inferredByExpr?: Map<string, string>;
  diags?: Array<{
    code: string;
    exprId?: string;
    expected?: string;
    actual?: string;
  }>;
}

interface ReduceInput {
  ir: Parameters<typeof indexExprCodeFromIr>[0];
  tc: TypecheckResult;
}

function reduceTypecheckIntent({ ir, tc }: ReduceInput): TypecheckIntent {
  const codeIndex = indexExprCodeFromIr(ir);
  const expected = mapEntries(tc.expectedByExpr, codeIndex);
  const inferred = mapEntries(tc.inferredByExpr, codeIndex);
  const diags: DiagEntry[] = (tc.diags ?? []).map((d) => ({
    code: d.code,
    expr: d.exprId ? (codeIndex.get(d.exprId) ?? `(expr:${d.exprId})`) : undefined,
    expected: d.expected,
    actual: d.actual,
  }));
  return { expected, inferred, diags };
}

function mapEntries(mapLike: Map<string, string> | undefined, codeIndex: Map<string, string>): TypeEntry[] {
  const out: TypeEntry[] = [];
  if (!mapLike || typeof mapLike.entries !== "function") return out;
  for (const [id, type] of mapLike.entries()) {
    out.push({ code: codeIndex.get(id) ?? `(expr:${id})`, type });
  }
  return out;
}

// --- Intent Comparison ---

function compareTypecheckIntent(actual: TypecheckIntent, expected: TypecheckIntent): TypecheckDiff {
  const { missing: missingExpected, extra: extraExpected } =
    diffByKey(actual.expected, expected.expected, (e: TypeEntry) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingInferred, extra: extraInferred } =
    diffByKey(actual.inferred, expected.inferred, (e: TypeEntry) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingDiags, extra: extraDiags } =
    diffByKey(actual.diags, expected.diags, (d: DiagEntry) => `${d.code ?? ""}|${d.expr ?? ""}|${d.expected ?? ""}|${d.actual ?? ""}`);

  return { missingExpected, extraExpected, missingInferred, extraInferred, missingDiags, extraDiags };
}
