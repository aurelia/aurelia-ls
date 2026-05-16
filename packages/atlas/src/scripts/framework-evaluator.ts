import { LensId } from "../inquiry/lens.js";
import {
  LocusKind,
  type Locus,
} from "../inquiry/locus.js";
import type {
  FrameworkEvaluatorModuleSummary,
  FrameworkEvaluatorValue,
} from "../inquiry/runtime/framework-evaluator-lenses.js";
import type {
  EvaluationEffectOpenSeam,
  EvaluationInvocationEffect,
} from "../evaluation/index.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  countRows,
  printEmptyRows,
  printCounts,
  scriptArgumentValue,
  scriptNumberArgumentValue,
  scriptOptionalStringFilter,
} from "./script-output.js";

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "effects";
const query = scriptArgumentValue("--query=");
const path = scriptArgumentValue("--path=");
const packageId = scriptArgumentValue("--packageId=");
const packageName = scriptArgumentValue("--packageName=");
const rows = scriptNumberArgumentValue("--rows=");
const displayRowLimit = rows ?? (detail ? 40 : 16);
const answerRowBudget = rows ?? (detail ? 80 : 32);

const filters = {
  ...scriptOptionalStringFilter("memberName"),
  ...scriptOptionalStringFilter("calleeName"),
  ...scriptOptionalStringFilter("receiverName"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.FrameworkEvaluator,
  locus: evaluatorLocus(),
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 4 : 1 },
});

const value = answerValue<FrameworkEvaluatorValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.evaluator",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.evaluator");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value !== undefined) {
  console.log("");
  console.log("selection");
  console.log(`- selector: ${JSON.stringify(value.selector)}`);
  console.log(`- targets: ${value.targetCount}`);
  console.log(`- candidates: ${value.candidateCount}`);
}

if (projection === "effects") {
  printEffectRows(value?.effectTrace?.effects ?? [], displayRowLimit, detail);
  printOpenSeamPointer(value?.openSeams?.length ?? 0);
} else if (projection === "open-seams") {
  printOpenSeamRollup(value?.openSeamKindCounts, value?.openSeams ?? []);
  printOpenSeamRows(value?.openSeams ?? [], displayRowLimit, detail);
} else {
  printModuleRows(value?.modules ?? [], displayRowLimit, detail);
  if (detail) {
    printOpenSeamRollup(value?.openSeamKindCounts, value?.openSeams ?? []);
    printOpenSeamRows(value?.openSeams ?? [], displayRowLimit, detail);
  }
}

function evaluatorLocus(): Locus {
  if (path !== undefined) {
    return {
      kind: LocusKind.SourceFile,
      filePath: path,
    };
  }
  if (packageId !== undefined || packageName !== undefined) {
    if (packageId !== undefined && packageName !== undefined) {
      return { kind: LocusKind.Package, packageId, packageName };
    }
    return packageId !== undefined
      ? { kind: LocusKind.Package, packageId }
      : { kind: LocusKind.Package, packageName };
  }
  if (query !== undefined) {
    return {
      kind: LocusKind.Symbol,
      name: query,
    };
  }
  return { kind: LocusKind.Package };
}

function printEffectRows(
  rows: readonly EvaluationInvocationEffect[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("effects");
  printEmptyRows(rows, "no evaluator effect rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- #${row.sequence} ${row.root.label}: ${row.callSite.calleeName}; certainty=${row.certainty}; args=${row.callSite.argumentCount}; ${sourceSpanLabel(row.callSite.file.repoPath, row.callSite.span)}`,
    );
    if (!includeDetail) {
      continue;
    }
    const receiver = row.receiverBinding?.name ?? row.receiver?.text ?? "<none>";
    const control = row.controlPath.length === 0 ? "<root>" : row.controlPath.join(" > ");
    const args = row.arguments.map((argument) => `${argument.index}:${argument.binding?.name ?? argument.expression.text}`).join(", ");
    console.log(`  receiver=${receiver}; member=${row.memberName ?? "<none>"}; control=${control}`);
    console.log(`  arguments=${args || "<none>"}`);
  }
}

function printOpenSeamRows(
  rows: readonly EvaluationEffectOpenSeam[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("open seams");
  printEmptyRows(rows, "no evaluator open seam rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.openKind}; ${row.syntaxKindName}; ${sourceSpanLabel(row.file.repoPath, row.span)}; ${row.summary}`,
    );
    if (includeDetail) {
      console.log(`  id=${row.id}`);
    }
  }
}

function printOpenSeamRollup(
  counts: Readonly<Record<string, number>> | undefined,
  rows: readonly EvaluationEffectOpenSeam[],
): void {
  const rowCounts = counts ?? countRows(rows, (row) => row.openKind);
  if (Object.keys(rowCounts).length === 0) {
    return;
  }
  printCounts(counts === undefined ? "open seam kinds (returned rows)" : "open seam kinds (all rows)", rowCounts, 12);
}

function printOpenSeamPointer(count: number): void {
  if (count === 0) {
    return;
  }
  console.log("");
  console.log(`open seams observed: ${count}; rerun with --projection=open-seams to inspect boundary rows`);
}

function printModuleRows(
  rows: readonly FrameworkEvaluatorModuleSummary[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("modules");
  printEmptyRows(rows, "no evaluator module rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.moduleKey}; completion=${row.completionKind}; bindings=${row.bindingCount}; openSeams=${row.openSeams.length}`,
    );
    if (!includeDetail) {
      continue;
    }
    for (const binding of row.bindings.slice(0, limit)) {
      console.log(`  - ${binding.name}: ${binding.bindingKind}/${binding.state}/${binding.valueKind}`);
    }
  }
}

function sourceSpanLabel(
  repoPath: string,
  span: { readonly startLine: number },
): string {
  return `${repoPath}:${span.startLine}`;
}
