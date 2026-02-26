import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr, type TestVector, type CompilerContext } from "../_helpers/vector-runner.js";
import { diffByKeyCounts, noopModuleResolver } from "../_helpers/test-utils.js";

import { lowerDocument } from "../../out/analysis/10-lower/lower.js";
import { linkTemplateSemantics } from "../../out/analysis/20-link/resolve.js";
import { buildSemanticsSnapshot } from "../../out/schema/snapshot.js";
import { bindScopes } from "../../out/analysis/30-bind/bind.js";
import { typecheck } from "../../out/analysis/40-typecheck/typecheck.js";

// --- Types ---

interface TypeEntry {
  code: string;
  type: string;
}

interface ContractEntry {
  code: string;
  type: string;
  context: string;
}

interface TypecheckExpect {
  expected?: TypeEntry[];
  contracts?: ContractEntry[];
}

interface TypecheckIntent {
  expected: TypeEntry[];
  contracts: ContractEntry[];
}

interface TypecheckDiff {
  missingExpected: string[];
  extraExpected: string[];
  missingContracts: string[];
  extraContracts: string[];
}

runVectorTests<TypecheckExpect, TypecheckIntent, TypecheckDiff>({
  dirname: getDirname(import.meta.url),
  suiteName: "Typecheck (40) — Binding Contracts",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(ctx.sem), {
      moduleResolver: noopModuleResolver,
      templateFilePath: "mem.html",
      diagnostics: ctx.diagnostics.forSource("link"),
    });
    const scope = bindScopes(linked, { diagnostics: ctx.diagnostics.forSource("bind") });
    const tc = typecheck({
      linked,
      scope,
      rootVmType: v.rootVmType ?? "RootVm",
      config: { preset: "standard" },
    });
    return reduceTypecheckIntent({ ir, tc });
  },
  compare: compareTypecheckIntent,
  categories: ["expected", "contracts"],
  normalizeExpect: (expect) => ({
    expected: expect?.expected ?? [],
    contracts: expect?.contracts ?? [],
  }),
});

// --- Intent Reduction ---

interface TypecheckResult {
  expectedByExpr?: Map<string, string>;
  contracts?: Map<string, { type: string; context: string }>;
}

interface ReduceInput {
  ir: Parameters<typeof indexExprCodeFromIr>[0];
  tc: TypecheckResult;
}

function reduceTypecheckIntent({ ir, tc }: ReduceInput): TypecheckIntent {
  const codeIndex = indexExprCodeFromIr(ir);
  const expected = mapEntries(tc.expectedByExpr, codeIndex);
  const contracts: ContractEntry[] = [];
  if (tc.contracts && typeof tc.contracts.entries === "function") {
    for (const [id, contract] of tc.contracts.entries()) {
      contracts.push({
        code: codeIndex.get(id) ?? `(expr:${id})`,
        type: contract.type,
        context: contract.context,
      });
    }
  }
  return { expected, contracts };
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
    diffByKeyCounts(actual.expected, expected.expected, (e: TypeEntry) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingContracts, extra: extraContracts } =
    diffByKeyCounts(actual.contracts, expected.contracts, (e: ContractEntry) => `${e.code ?? ""}|${e.type ?? ""}|${e.context ?? ""}`);

  return { missingExpected, extraExpected, missingContracts, extraContracts };
}
