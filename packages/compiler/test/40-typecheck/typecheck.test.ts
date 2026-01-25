import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr, type TestVector, type CompilerContext } from "../_helpers/vector-runner.js";
import { diffByKey, noopModuleResolver } from "../_helpers/test-utils.js";

import { lowerDocument, resolveHost, buildSemanticsSnapshot, bindScopes, typecheck, buildExprSpanIndex } from "@aurelia-ls/compiler";

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
    const linked = resolveHost(ir, buildSemanticsSnapshot(ctx.sem), {
      moduleResolver: noopModuleResolver,
      templateFilePath: "mem.html",
      diagnostics: ctx.diagnostics.forSource("resolve-host"),
    });
    const scope = bindScopes(linked, { diagnostics: ctx.diagnostics.forSource("bind") });
    const tc = typecheck({
      linked,
      scope,
      ir,
      rootVmType: v.rootVmType ?? "RootVm",
      diagnostics: ctx.diagnostics.forSource("typecheck"),
      // Use "standard" preset for tests to get full error detection
      // (default is "lenient" for better user experience)
      config: { preset: "standard" },
    });
    return reduceTypecheckIntent({ ir, tc, diagnostics: ctx.diagnostics.all });
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
}

interface ReduceInput {
  ir: Parameters<typeof indexExprCodeFromIr>[0];
  tc: TypecheckResult;
  diagnostics: readonly CompilerDiag[];
}

interface CompilerDiag {
  code: string;
  source?: string;
  span?: { start: number; end: number; file?: string };
  data?: Readonly<Record<string, unknown>>;
}

function reduceTypecheckIntent({ ir, tc, diagnostics }: ReduceInput): TypecheckIntent {
  const codeIndex = indexExprCodeFromIr(ir);
  const spanIndex = buildExprSpanIndex(ir);
  const spanToExpr = new Map<string, string>();
  for (const [exprId, span] of spanIndex.spans.entries()) {
    const key = `${span.start}|${span.end}|${span.file ?? ""}`;
    spanToExpr.set(key, exprId);
  }
  const expected = mapEntries(tc.expectedByExpr, codeIndex);
  const inferred = mapEntries(tc.inferredByExpr, codeIndex);
  const diags: DiagEntry[] = (diagnostics ?? [])
    .filter((d) => d.source === "typecheck")
    .map((d) => {
      const span = d.span;
      const key = span ? `${span.start}|${span.end}|${span.file ?? ""}` : null;
      const exprId = key ? spanToExpr.get(key) : undefined;
      return {
        code: d.code,
        expr: exprId ? (codeIndex.get(exprId) ?? `(expr:${exprId})`) : undefined,
        expected: getDataString(d.data, "expected"),
        actual: getDataString(d.data, "actual"),
      };
    });
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

function getDataString(
  data: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  if (!data) return undefined;
  const value = data[key];
  return typeof value === "string" ? value : undefined;
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


