import type { CompilerCaseData } from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import type { JitCompilerBlueprintBatch } from "./jit-compiler-blueprint-observer.js";
import {
  SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS,
  SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE,
  SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS,
  semanticCompiledDefinitionSourceDependencyIdentity,
  semanticCompiledDefinitionDigest,
  type SemanticCompiledDefinitionFamilyObservation,
} from "./semantic-compiled-definition-family-observer.js";

export const SEMANTIC_COMPILED_DEFINITION_COMPARISON_VERSION =
  "aurelia-ls/aot-semantic-compiled-definition-comparison/v2" as const;

export const enum SemanticCompiledDefinitionMismatchKind {
  MissingJitCase = "missing-jit-case",
  JitOutcome = "jit-outcome",
  DefinitionCount = "definition-count",
  DefinitionIndex = "definition-index",
  DefinitionDigestMetadata = "definition-digest-metadata",
  DefinitionFields = "definition-fields",
}

export interface SemanticCompiledDefinitionMismatch {
  readonly caseId: string;
  readonly mismatchKind: SemanticCompiledDefinitionMismatchKind;
  readonly semantic: unknown;
  readonly jit: unknown;
}

export interface SemanticCompiledDefinitionComparisonInput {
  readonly caseId: string;
  readonly compiledDefinitions: SemanticCompiledDefinitionFamilyObservation | null;
}

export class SemanticCompiledDefinitionComparison {
  readonly schemaVersion = SEMANTIC_COMPILED_DEFINITION_COMPARISON_VERSION;
  readonly comparisonPosture = "compiled-definition-characterization-only" as const;
  readonly dependencyComparisonPosture = SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE;
  readonly comparedFields = SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS;
  readonly omittedFields = SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS;
  readonly satisfiedClaimIds: readonly [] = [];

  constructor(
    readonly selectedExactCaseCount: number,
    readonly joinedCaseCount: number,
    readonly matchingCaseIds: readonly string[],
    readonly semanticDefinitionCount: number,
    readonly jitDefinitionCount: number,
    readonly mismatches: readonly SemanticCompiledDefinitionMismatch[],
  ) {
    if (
      joinedCaseCount > selectedExactCaseCount
      || matchingCaseIds.length > joinedCaseCount
      || new Set(matchingCaseIds).size !== matchingCaseIds.length
      || matchingCaseIds.some((caseId) => mismatches.some((mismatch) => mismatch.caseId === caseId))
    ) {
      throw new Error("Compiled-definition comparison lost case or mismatch accounting.");
    }
  }

  get isVacuous(): boolean {
    return this.selectedExactCaseCount === 0;
  }

  get isClean(): boolean {
    return !this.isVacuous
      && this.joinedCaseCount === this.selectedExactCaseCount
      && this.matchingCaseIds.length === this.selectedExactCaseCount
      && this.semanticDefinitionCount === this.jitDefinitionCount
      && this.mismatches.length === 0;
  }
}

export function compareSemanticCompiledDefinitionsToJit(
  semanticInputs: readonly SemanticCompiledDefinitionComparisonInput[],
  jitBatch: JitCompilerBlueprintBatch,
): SemanticCompiledDefinitionComparison {
  const semanticCaseIds = semanticInputs.map((input) => input.caseId);
  if (new Set(semanticCaseIds).size !== semanticCaseIds.length) {
    throw new Error("Compiled-definition comparison requires unique semantic case ids.");
  }
  const exact = semanticInputs.filter((input): input is SemanticCompiledDefinitionComparisonInput & {
    readonly compiledDefinitions: Extract<SemanticCompiledDefinitionFamilyObservation, { readonly kind: "exact" }>;
  } => input.compiledDefinitions?.kind === "exact");
  const jitCaseIds = jitBatch.observations.map((observation) => observation.data.caseId);
  if (new Set(jitCaseIds).size !== jitCaseIds.length) {
    throw new Error("Compiled-definition comparison requires unique JIT case ids.");
  }
  const jitByCase = new Map(jitBatch.observations.map((observation) => [observation.data.caseId, observation]));
  const mismatches: SemanticCompiledDefinitionMismatch[] = [];
  const matchingCaseIds: string[] = [];
  let joinedCaseCount = 0;
  let semanticDefinitionCount = 0;
  let jitDefinitionCount = 0;

  for (const input of exact) {
    const mismatchStart = mismatches.length;
    const semantic = input.compiledDefinitions;
    semanticDefinitionCount += semantic.definitions.length;
    const expectedDigest = semanticCompiledDefinitionDigest(semantic.definitions);
    if (semantic.definitionDigest !== expectedDigest) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.DefinitionDigestMetadata,
        semantic.definitionDigest,
        expectedDigest,
      ));
    }
    const semanticIndexes = semantic.definitions.map(definitionIndex);
    const expectedIndexes = semantic.definitions.map((_, index) => index);
    if (!sameData(semanticIndexes, expectedIndexes)) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.DefinitionIndex,
        semanticIndexes,
        expectedIndexes,
      ));
    }
    if (semantic.definitionCount !== semantic.definitions.length) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.DefinitionCount,
        semantic.definitionCount,
        semantic.definitions.length,
      ));
    }
    const jit = jitByCase.get(input.caseId) ?? null;
    if (jit == null) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.MissingJitCase,
        { kind: "exact-compiled-definition-family" },
        { kind: "missing" },
      ));
      continue;
    }
    joinedCaseCount++;
    if (jit.data.outcome.kind !== "compiled-definition") {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.JitOutcome,
        { kind: "compiled-definition" },
        { kind: jit.data.outcome.kind },
      ));
      continue;
    }
    const jitDefinitions = jit.data.outcome.definitions;
    jitDefinitionCount += jitDefinitions.length;
    const jitIndexes = jitDefinitions.map((definition) => definition.definitionIndex);
    const expectedJitIndexes = jitDefinitions.map((_, index) => index);
    if (!sameData(jitIndexes, expectedJitIndexes)) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.DefinitionIndex,
        expectedJitIndexes,
        jitIndexes,
      ));
    }
    if (semantic.definitions.length !== jitDefinitions.length) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.DefinitionCount,
        semantic.definitions.length,
        jitDefinitions.length,
      ));
    }
    const semanticCommon = semantic.definitions.map(semanticCommonDefinitionFields);
    const jitCommon = jitDefinitions.map((definition, index) => jitCommonDefinitionFields(
      definition as unknown as CompilerCaseData,
      index,
      index === 0 ? sourceDeclaredDependencyCount(semantic.definitions[0] ?? null) : null,
    ));
    if (!sameData(semanticCommon, jitCommon)) {
      mismatches.push(mismatch(
        input.caseId,
        SemanticCompiledDefinitionMismatchKind.DefinitionFields,
        semanticCommon,
        jitCommon,
      ));
    }
    if (mismatches.length === mismatchStart) matchingCaseIds.push(input.caseId);
  }

  return new SemanticCompiledDefinitionComparison(
    exact.length,
    joinedCaseCount,
    matchingCaseIds,
    semanticDefinitionCount,
    jitDefinitionCount,
    mismatches,
  );
}

function definitionIndex(definition: CompilerCaseData): number | null {
  if (definition == null || Array.isArray(definition) || typeof definition !== "object") return null;
  const value = (definition as Readonly<Record<string, CompilerCaseData>>).definitionIndex;
  return typeof value === "number" ? value : null;
}

function semanticCommonDefinitionFields(definition: CompilerCaseData): CompilerCaseData {
  return commonDefinitionFields(definition);
}

function jitCommonDefinitionFields(
  definition: CompilerCaseData,
  definitionIndex: number,
  sourceDependencyCount: number | null,
): CompilerCaseData {
  const common = commonDefinitionFields(definition, definitionIndex);
  if (common == null || Array.isArray(common) || typeof common !== "object") {
    throw new Error("Compiled-definition JIT normalization lost its definition record.");
  }
  const record = common as Readonly<Record<string, CompilerCaseData>>;
  const dependencies = record.dependencies;
  if (!Array.isArray(dependencies)) {
    throw new Error("Compiled-definition JIT normalization requires one dependency array.");
  }
  return {
    ...record,
    dependencies: (sourceDependencyCount == null ? dependencies : dependencies.slice(0, sourceDependencyCount))
      .map(jitSourceDeclaredResourceDependencyIdentity),
  };
}

function sourceDeclaredDependencyCount(definition: CompilerCaseData): number {
  if (definition == null || Array.isArray(definition) || typeof definition !== "object") {
    throw new Error("Compiled-definition source dependency count requires one semantic root record.");
  }
  const dependencies = (definition as Readonly<Record<string, CompilerCaseData>>).dependencies;
  if (!Array.isArray(dependencies)) {
    throw new Error("Compiled-definition source dependency count requires one semantic dependency array.");
  }
  return dependencies.length;
}

function jitSourceDeclaredResourceDependencyIdentity(value: CompilerCaseData): CompilerCaseData {
  if (value == null || Array.isArray(value) || typeof value !== "object") {
    return { kind: "jit-dependency-outside-source-resource-corridor", value };
  }
  const record = value as Readonly<Record<string, CompilerCaseData>>;
  if (
    record.kind !== "resource-reference"
    || (record.resourceKind !== "custom-element" && record.resourceKind !== "custom-attribute")
    || typeof record.resourceKey !== "string"
    || record.resourceKey.length === 0
    || typeof record.name !== "string"
    || record.name.length === 0
    || !Array.isArray(record.aliases)
    || record.aliases.some((alias) => typeof alias !== "string")
  ) {
    return { kind: "jit-dependency-outside-source-resource-corridor", value };
  }
  return semanticCompiledDefinitionSourceDependencyIdentity(
    record.resourceKind,
    record.resourceKey,
    record.name,
    record.aliases as readonly string[],
  );
}

function commonDefinitionFields(definition: CompilerCaseData, definitionIndex?: number): CompilerCaseData {
  if (definition == null || Array.isArray(definition) || typeof definition !== "object") {
    throw new Error("Compiled-definition comparison encountered a non-object definition.");
  }
  const record = definition as Readonly<Record<string, CompilerCaseData>>;
  const index = definitionIndex ?? definitionIndexForRecord(record);
  return Object.fromEntries(Object.entries(record).filter(([key]) =>
    key !== "executableFields" || index !== 0
  ));
}

function definitionIndexForRecord(record: Readonly<Record<string, CompilerCaseData>>): number | null {
  const value = record.definitionIndex;
  return typeof value === "number" ? value : null;
}

function sameData(left: unknown, right: unknown): boolean {
  return canonicalCompilerJson(left) === canonicalCompilerJson(right);
}

function mismatch(
  caseId: string,
  mismatchKind: SemanticCompiledDefinitionMismatchKind,
  semantic: unknown,
  jit: unknown,
): SemanticCompiledDefinitionMismatch {
  return { caseId, mismatchKind, semantic, jit };
}
