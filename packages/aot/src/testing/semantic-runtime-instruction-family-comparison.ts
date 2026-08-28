import type { CompilerCaseData } from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import type { JitCompilerBlueprintBatch } from "./jit-compiler-blueprint-observer.js";
import {
  semanticRuntimeInstructionFamilyWireDigest,
  type SemanticRuntimeInstructionFamilyObservation,
} from "./semantic-runtime-instruction-family-observer.js";

export const SEMANTIC_RUNTIME_INSTRUCTION_COMPARISON_VERSION =
  "aurelia-ls/aot-semantic-runtime-instruction-comparison/v1" as const;

export const SEMANTIC_RUNTIME_INSTRUCTION_COMMON_JIT_FIELDS = [
  "recursive-instruction-type-and-kind",
  "runtime-expression-ast-value",
  "binding-mode",
  "listener-options",
  "resource-name-operand",
  "child-definition-reference",
  "projection-definition-reference",
  "containerless",
  "captures",
  "process-content-data",
] as const;

export const enum SemanticRuntimeInstructionMismatchKind {
  MissingJitCase = "missing-jit-case",
  JitOutcome = "jit-outcome",
  DefinitionCount = "definition-count",
  DefinitionIndex = "definition-index",
  WireDigestMetadata = "wire-digest-metadata",
  InstructionCountMetadata = "instruction-count-metadata",
  InstructionCount = "instruction-count",
  RowInstructionCountMetadata = "row-instruction-count-metadata",
  RowInstructionCount = "row-instruction-count",
  InstructionRows = "instruction-rows",
}

export interface SemanticRuntimeInstructionMismatch {
  readonly caseId: string;
  readonly mismatchKind: SemanticRuntimeInstructionMismatchKind;
  readonly semantic: unknown;
  readonly jit: unknown;
}

export interface SemanticRuntimeInstructionComparisonInput {
  readonly caseId: string;
  readonly runtimeInstructions: SemanticRuntimeInstructionFamilyObservation | null;
}

export class SemanticRuntimeInstructionComparison {
  readonly schemaVersion = SEMANTIC_RUNTIME_INSTRUCTION_COMPARISON_VERSION;
  readonly comparisonPosture = "runtime-instruction-characterization-only" as const;
  readonly comparedFields = SEMANTIC_RUNTIME_INSTRUCTION_COMMON_JIT_FIELDS;
  readonly satisfiedClaimIds: readonly [] = [];

  constructor(
    readonly selectedExactCaseCount: number,
    readonly joinedCaseCount: number,
    readonly matchingCaseIds: readonly string[],
    readonly semanticInstructionCount: number,
    readonly jitInstructionCount: number,
    readonly semanticRowInstructionCount: number,
    readonly jitRowInstructionCount: number,
    readonly mismatches: readonly SemanticRuntimeInstructionMismatch[],
  ) {
    if (
      joinedCaseCount > selectedExactCaseCount
      || matchingCaseIds.length > joinedCaseCount
      || new Set(matchingCaseIds).size !== matchingCaseIds.length
      || matchingCaseIds.some((caseId) => mismatches.some((mismatch) => mismatch.caseId === caseId))
    ) {
      throw new Error("Runtime instruction comparison lost case or mismatch accounting.");
    }
  }

  get isVacuous(): boolean {
    return this.selectedExactCaseCount === 0;
  }

  get isClean(): boolean {
    return !this.isVacuous
      && this.joinedCaseCount === this.selectedExactCaseCount
      && this.matchingCaseIds.length === this.selectedExactCaseCount
      && this.semanticInstructionCount === this.jitInstructionCount
      && this.semanticRowInstructionCount === this.jitRowInstructionCount
      && this.mismatches.length === 0;
  }
}

export function compareSemanticRuntimeInstructionsToJit(
  semanticInputs: readonly SemanticRuntimeInstructionComparisonInput[],
  jitBatch: JitCompilerBlueprintBatch,
): SemanticRuntimeInstructionComparison {
  const semanticCaseIds = semanticInputs.map((input) => input.caseId);
  if (new Set(semanticCaseIds).size !== semanticCaseIds.length) {
    throw new Error("Runtime instruction comparison requires unique semantic case ids.");
  }
  const exact = semanticInputs.filter((input): input is SemanticRuntimeInstructionComparisonInput & {
    readonly runtimeInstructions: Extract<SemanticRuntimeInstructionFamilyObservation, { readonly kind: "exact" }>;
  } => input.runtimeInstructions?.kind === "exact");
  const jitCaseIds = jitBatch.observations.map((observation) => observation.data.caseId);
  if (new Set(jitCaseIds).size !== jitCaseIds.length) {
    throw new Error("Runtime instruction comparison requires unique JIT case ids.");
  }
  const jitByCase = new Map(jitBatch.observations.map((observation) => [observation.data.caseId, observation]));
  const mismatches: SemanticRuntimeInstructionMismatch[] = [];
  const matchingCaseIds: string[] = [];
  let joinedCaseCount = 0;
  let semanticInstructionCount = 0;
  let jitInstructionCount = 0;
  let semanticRowInstructionCount = 0;
  let jitRowInstructionCount = 0;

  for (const input of exact) {
    const mismatchStart = mismatches.length;
    const semanticRows = input.runtimeInstructions.definitions.map((definition) => definition.rows);
    const semanticDefinitionIndexes = input.runtimeInstructions.definitions.map((definition) => definition.definitionIndex);
    const expectedDefinitionIndexes = input.runtimeInstructions.definitions.map((_, definitionIndex) => definitionIndex);
    const semanticCaseRowInstructionCount = semanticRows.reduce((count, definition) =>
      count + definition.reduce((rowCount, row) => rowCount + row.length, 0)
    , 0);
    const semanticCaseInstructionCount = semanticRows.reduce(
      (count, definition) => count + countInstructions(definition),
      0,
    );
    semanticInstructionCount += semanticCaseInstructionCount;
    semanticRowInstructionCount += semanticCaseRowInstructionCount;
    const semanticWireDigest = semanticRuntimeInstructionFamilyWireDigest(input.runtimeInstructions.definitions);
    if (input.runtimeInstructions.wireDigest !== semanticWireDigest) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.WireDigestMetadata,
        input.runtimeInstructions.wireDigest,
        semanticWireDigest,
      ));
    }
    if (!sameData(semanticDefinitionIndexes, expectedDefinitionIndexes)) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.DefinitionIndex,
        semanticDefinitionIndexes,
        expectedDefinitionIndexes,
      ));
    }
    if (input.runtimeInstructions.instructionCount !== semanticCaseInstructionCount) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.InstructionCountMetadata,
        input.runtimeInstructions.instructionCount,
        semanticCaseInstructionCount,
      ));
    }
    if (input.runtimeInstructions.rowInstructionCount !== semanticCaseRowInstructionCount) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.RowInstructionCountMetadata,
        input.runtimeInstructions.rowInstructionCount,
        semanticCaseRowInstructionCount,
      ));
    }
    const jit = jitByCase.get(input.caseId) ?? null;
    if (jit == null) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.MissingJitCase,
        { kind: "exact-runtime-instruction-family" },
        { kind: "missing" },
      ));
      continue;
    }
    joinedCaseCount++;
    const outcome = jit.data.outcome;
    if (outcome.kind !== "compiled-definition") {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.JitOutcome,
        { kind: "compiled-definition" },
        { kind: outcome.kind },
      ));
      continue;
    }
    const jitRows = outcome.definitions.map((definition) => definition.rows);
    const jitDefinitionIndexes = outcome.definitions.map((definition) => definition.definitionIndex);
    const expectedJitDefinitionIndexes = outcome.definitions.map((_, definitionIndex) => definitionIndex);
    const jitCaseRowInstructionCount = jitRows.reduce((count, definition) =>
      count + definition.reduce((rowCount, row) => rowCount + row.length, 0)
    , 0);
    const jitCaseInstructionCount = jitRows.reduce(
      (count, definition) => count + countInstructions(definition),
      0,
    );
    jitRowInstructionCount += jitCaseRowInstructionCount;
    jitInstructionCount += jitCaseInstructionCount;
    if (!sameData(jitDefinitionIndexes, expectedJitDefinitionIndexes)) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.DefinitionIndex,
        expectedJitDefinitionIndexes,
        jitDefinitionIndexes,
      ));
    }
    if (semanticCaseInstructionCount !== jitCaseInstructionCount) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.InstructionCount,
        semanticCaseInstructionCount,
        jitCaseInstructionCount,
      ));
    }
    if (semanticCaseRowInstructionCount !== jitCaseRowInstructionCount) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.RowInstructionCount,
        semanticCaseRowInstructionCount,
        jitCaseRowInstructionCount,
      ));
    }
    if (semanticRows.length !== jitRows.length) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.DefinitionCount,
        semanticRows.length,
        jitRows.length,
      ));
    }
    if (!sameData(semanticRows, jitRows)) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticRuntimeInstructionMismatchKind.InstructionRows,
        semanticRows,
        jitRows,
      ));
    }
    if (mismatches.length === mismatchStart) matchingCaseIds.push(input.caseId);
  }

  return new SemanticRuntimeInstructionComparison(
    exact.length,
    joinedCaseCount,
    matchingCaseIds,
    semanticInstructionCount,
    jitInstructionCount,
    semanticRowInstructionCount,
    jitRowInstructionCount,
    mismatches,
  );
}

function countInstructions(rows: readonly (readonly CompilerCaseData[])[]): number {
  let count = 0;
  const visit = (instruction: CompilerCaseData): void => {
    if (instruction == null || Array.isArray(instruction) || typeof instruction !== "object") {
      throw new Error("Runtime-instruction row contains a non-object instruction.");
    }
    count++;
    const record = instruction as Readonly<Record<string, CompilerCaseData>>;
    for (const field of ["props", "instructions"] as const) {
      const nested = record[field];
      if (nested == null) continue;
      if (!Array.isArray(nested)) throw new Error(`Nested runtime-instruction field '${field}' is not an array.`);
      nested.forEach(visit);
    }
    const spread = record.instruction;
    if (spread != null) visit(spread);
  };
  for (const row of rows) row.forEach(visit);
  return count;
}

function sameData(left: unknown, right: unknown): boolean {
  return canonicalCompilerJson(left) === canonicalCompilerJson(right);
}

function mismatch(
  caseId: string,
  mismatchKind: SemanticRuntimeInstructionMismatchKind,
  semantic: unknown,
  jit: unknown,
): SemanticRuntimeInstructionMismatch {
  return { caseId, mismatchKind, semantic, jit };
}
