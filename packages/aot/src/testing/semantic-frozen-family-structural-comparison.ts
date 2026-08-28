import type { CompilerCaseData } from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import type {
  JitCompilerBlueprintBatch,
  JitCompilerBlueprintDefinition,
  JitCompilerBlueprintDefinitionOwner,
  JitCompilerBlueprintNode,
  JitCompilerBlueprintTemplate,
} from "./jit-compiler-blueprint-observer.js";
import {
  SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS,
  type SemanticFrozenFamilyDefinition,
  type SemanticFrozenFamilyDefinitionOwner,
  type SemanticFrozenFamilyNode,
  type SemanticFrozenFamilyObservation,
  type SemanticFrozenFamilyTargetGeometry,
  type SemanticFrozenFamilyTemplate,
} from "./semantic-frozen-family-observer.js";

export const SEMANTIC_FROZEN_FAMILY_STRUCTURAL_COMPARISON_VERSION =
  "aurelia-ls/aot-semantic-frozen-family-structural-comparison/v1" as const;

export const SEMANTIC_FROZEN_FAMILY_COMMON_JIT_FIELDS = [
  "definition-ownership-and-order",
  "transformed-template",
  "row-instruction-kind-order",
  "target-geometry-and-alignment",
  "needs-compile",
  "has-slots",
] as const;

export const enum SemanticFrozenFamilyStructuralMismatchKind {
  MissingJitCase = "missing-jit-case",
  JitOutcome = "jit-outcome",
  DefinitionCount = "definition-count",
  DefinitionOwnership = "definition-ownership",
  TransformedTemplate = "transformed-template",
  RowInstructionKinds = "row-instruction-kinds",
  TargetGeometry = "target-geometry",
  TargetAlignment = "target-alignment",
  NeedsCompile = "needs-compile",
  HasSlots = "has-slots",
}

export interface SemanticFrozenFamilyStructuralMismatch {
  readonly caseId: string;
  readonly definitionIndex: number | null;
  readonly mismatchKind: SemanticFrozenFamilyStructuralMismatchKind;
  readonly semantic: unknown;
  readonly jit: unknown;
}

export interface SemanticFrozenFamilyStructuralCounts {
  readonly semanticDefinitions: number;
  readonly jitDefinitions: number;
  readonly semanticRows: number;
  readonly jitRows: number;
  readonly semanticGeometries: number;
  readonly jitGeometries: number;
  readonly semanticInstructions: number;
  readonly jitInstructions: number;
  readonly semanticHasSlotsTrue: number;
  readonly jitHasSlotsTrue: number;
}

export interface SemanticFrozenFamilyComparisonInput {
  readonly caseId: string;
  readonly frozenFamily: SemanticFrozenFamilyObservation;
}

/**
 * Common structural-slice comparison only. It cannot satisfy an AOT obligation or stand in for full compiled wires.
 */
export class SemanticFrozenFamilyStructuralComparison {
  readonly schemaVersion = SEMANTIC_FROZEN_FAMILY_STRUCTURAL_COMPARISON_VERSION;
  readonly comparisonPosture = "structural-characterization-only" as const;
  readonly satisfiedClaimIds: readonly [] = [];
  readonly comparedFields = SEMANTIC_FROZEN_FAMILY_COMMON_JIT_FIELDS;
  readonly omittedJitFields = SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS;

  constructor(
    readonly selectedExactCaseCount: number,
    readonly joinedCaseCount: number,
    readonly matchingCaseIds: readonly string[],
    readonly mismatches: readonly SemanticFrozenFamilyStructuralMismatch[],
    readonly counts: SemanticFrozenFamilyStructuralCounts,
  ) {
    if (
      joinedCaseCount > selectedExactCaseCount
      || matchingCaseIds.length > joinedCaseCount
      || new Set(matchingCaseIds).size !== matchingCaseIds.length
      || matchingCaseIds.some((caseId) => mismatches.some((mismatch) => mismatch.caseId === caseId))
    ) {
      throw new Error("Frozen-family structural comparison lost case or mismatch accounting.");
    }
  }

  get isClean(): boolean {
    return !this.isVacuous
      && this.joinedCaseCount === this.selectedExactCaseCount
      && this.matchingCaseIds.length === this.selectedExactCaseCount
      && this.mismatches.length === 0;
  }

  get isVacuous(): boolean {
    return this.selectedExactCaseCount === 0;
  }
}

interface ComparableDefinitionOwner {
  readonly kind: "root" | "template-controller" | "projection" | "instruction-definition";
  readonly parentDefinitionIndex: number | null;
  readonly rowIndex: number | null;
  readonly instructionIndex: number | null;
  readonly instructionKind: string | null;
  readonly slotName: string | null;
  readonly fieldPath: readonly (string | number)[];
}

type ComparableTemplate =
  | {
      readonly kind: "template";
      readonly namespaceUri: string;
      readonly attributes: readonly {
        readonly name: string;
        readonly value: string;
        readonly namespaceUri: string | null;
        readonly prefix: string | null;
      }[];
      readonly content: readonly ComparableNode[];
    }
  | { readonly kind: "absent" | "markup" | "node" };

type ComparableNode =
  | { readonly kind: "fragment"; readonly children: readonly ComparableNode[] }
  | {
      readonly kind: "element";
      readonly tagName: string;
      readonly namespaceUri: string;
      readonly attributes: readonly {
        readonly name: string;
        readonly value: string;
        readonly namespaceUri: string | null;
        readonly prefix: string | null;
      }[];
      readonly children: readonly ComparableNode[];
      readonly content: readonly ComparableNode[] | null;
    }
  | { readonly kind: "text" | "comment"; readonly value: string }
  | { readonly kind: "doctype"; readonly name: string; readonly publicId: string; readonly systemId: string };

interface ComparableGeometry {
  readonly ordinal: number;
  readonly rowIndex: number | null;
  readonly targetKind: "marker-target" | "render-location" | "open";
  readonly kind: "marker-target" | "render-location" | "open";
  readonly markerPath: readonly (string | number)[];
  readonly targetPath: readonly (string | number)[] | null;
  readonly targetNodeKind: "element" | "text" | "comment" | "doctype" | null;
  readonly startPath: readonly (string | number)[] | null;
  readonly endPath: readonly (string | number)[] | null;
}

/** Join exact semantic families to independent JIT blueprints without comparing any omitted runtime-wire field. */
export function compareSemanticFrozenFamiliesToJit(
  semanticInputs: readonly SemanticFrozenFamilyComparisonInput[],
  jitBatch: JitCompilerBlueprintBatch,
): SemanticFrozenFamilyStructuralComparison {
  const exact = semanticInputs.filter((input): input is SemanticFrozenFamilyComparisonInput & {
    readonly frozenFamily: Extract<SemanticFrozenFamilyObservation, { readonly kind: "exact" }>;
  } => input.frozenFamily.kind === "exact");
  const jitCaseIds = jitBatch.observations.map((observation) => observation.data.caseId);
  if (new Set(jitCaseIds).size !== jitCaseIds.length) {
    throw new Error("Frozen-family structural comparison requires unique JIT case ids.");
  }
  const jitByCase = new Map(jitBatch.observations.map((observation) => [observation.data.caseId, observation]));
  const mismatches: SemanticFrozenFamilyStructuralMismatch[] = [];
  const matchingCaseIds: string[] = [];
  let joinedCaseCount = 0;
  let semanticDefinitions = 0;
  let jitDefinitions = 0;
  let semanticRows = 0;
  let jitRows = 0;
  let semanticGeometries = 0;
  let jitGeometries = 0;
  let semanticInstructions = 0;
  let jitInstructions = 0;
  let semanticHasSlotsTrue = 0;
  let jitHasSlotsTrue = 0;

  for (const input of exact) {
    const caseMismatchStart = mismatches.length;
    const semantic = input.frozenFamily.definitions;
    semanticDefinitions += semantic.length;
    semanticRows += semantic.reduce((count, definition) => count + definition.rows.length, 0);
    semanticGeometries += semantic.reduce((count, definition) => count + definition.rows.length, 0);
    semanticInstructions += semantic.reduce((count, definition) =>
      count + definition.rows.reduce((rowCount, row) => rowCount + row.frameworkInstructionKinds.length, 0)
    , 0);
    semanticHasSlotsTrue += semantic.filter((definition) => definition.hasSlots).length;
    const jit = jitByCase.get(input.caseId) ?? null;
    if (jit == null) {
      mismatches.push(mismatch(
        input.caseId,
        null,
        SemanticFrozenFamilyStructuralMismatchKind.MissingJitCase,
        { kind: "exact-semantic-family" },
        { kind: "missing" },
      ));
      continue;
    }
    joinedCaseCount++;
    const outcome = jit.data.outcome;
    if (outcome.kind !== "compiled-definition") {
      mismatches.push(mismatch(
        input.caseId,
        null,
        SemanticFrozenFamilyStructuralMismatchKind.JitOutcome,
        { kind: "compiled-definition" },
        { kind: outcome.kind },
      ));
      continue;
    }
    const jitDefinitionsForCase = outcome.definitions;
    jitDefinitions += jitDefinitionsForCase.length;
    jitRows += jitDefinitionsForCase.reduce((count, definition) => count + definition.rows.length, 0);
    jitGeometries += jitDefinitionsForCase.reduce((count, definition) => count + definition.targetMarkers.length, 0);
    jitInstructions += jitDefinitionsForCase.reduce((count, definition) =>
      count + definition.rows.reduce((rowCount, row) => rowCount + row.length, 0)
    , 0);
    jitHasSlotsTrue += jitDefinitionsForCase.filter((definition) => definition.hasSlots).length;

    compareField(
      input.caseId,
      null,
      SemanticFrozenFamilyStructuralMismatchKind.DefinitionOwnership,
      semantic[0]?.definitionIndex ?? null,
      outcome.rootDefinitionIndex,
      mismatches,
    );

    if (semantic.length !== jitDefinitionsForCase.length) {
      mismatches.push(mismatch(
        input.caseId,
        null,
        SemanticFrozenFamilyStructuralMismatchKind.DefinitionCount,
        semantic.length,
        jitDefinitionsForCase.length,
      ));
    }
    const definitionCount = Math.min(semantic.length, jitDefinitionsForCase.length);
    for (let definitionIndex = 0; definitionIndex < definitionCount; definitionIndex++) {
      compareDefinition(
        input.caseId,
        definitionIndex,
        semantic[definitionIndex]!,
        jitDefinitionsForCase[definitionIndex]!,
        mismatches,
      );
    }
    if (mismatches.length === caseMismatchStart) matchingCaseIds.push(input.caseId);
  }

  return new SemanticFrozenFamilyStructuralComparison(
    exact.length,
    joinedCaseCount,
    matchingCaseIds,
    mismatches,
    {
      semanticDefinitions,
      jitDefinitions,
      semanticRows,
      jitRows,
      semanticGeometries,
      jitGeometries,
      semanticInstructions,
      jitInstructions,
      semanticHasSlotsTrue,
      jitHasSlotsTrue,
    },
  );
}

function compareDefinition(
  caseId: string,
  definitionIndex: number,
  semantic: SemanticFrozenFamilyDefinition,
  jit: JitCompilerBlueprintDefinition,
  mismatches: SemanticFrozenFamilyStructuralMismatch[],
): void {
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.DefinitionOwnership,
    [semantic.definitionIndex, semanticOwner(semantic.owner)],
    [jit.definitionIndex, jitOwner(jit.owner)],
    mismatches,
  );
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.TransformedTemplate,
    semanticTemplate(semantic.template),
    jitTemplate(jit.template),
    mismatches,
  );
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.RowInstructionKinds,
    semantic.rows.map((row) => row.frameworkInstructionKinds),
    jit.rows.map((row) => row.map(jitInstructionKind)),
    mismatches,
  );
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.TargetGeometry,
    semantic.rows.map((row, rowIndex) => semanticGeometry(row.geometry, rowIndex, row.targetKind)),
    jit.targetMarkers.map((geometry): ComparableGeometry => ({
      ordinal: geometry.ordinal,
      rowIndex: geometry.rowIndex,
      targetKind: geometry.kind,
      kind: geometry.kind,
      markerPath: geometry.markerPath,
      targetPath: geometry.targetPath,
      targetNodeKind: geometry.targetNodeKind,
      startPath: geometry.startPath,
      endPath: geometry.endPath,
    })),
    mismatches,
  );
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.TargetAlignment,
    semantic.geometryAlignment,
    jit.targetAlignment,
    mismatches,
    (left, right) => left === "one-final-geometry-per-row" && right === "wire-count-aligned",
  );
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.NeedsCompile,
    semantic.needsCompile,
    jit.needsCompile,
    mismatches,
  );
  compareField(
    caseId,
    definitionIndex,
    SemanticFrozenFamilyStructuralMismatchKind.HasSlots,
    semantic.hasSlots,
    jit.hasSlots,
    mismatches,
  );
}

function compareField(
  caseId: string,
  definitionIndex: number | null,
  mismatchKind: SemanticFrozenFamilyStructuralMismatchKind,
  semantic: unknown,
  jit: unknown,
  mismatches: SemanticFrozenFamilyStructuralMismatch[],
  equal: ((semantic: unknown, jit: unknown) => boolean) | null = null,
): void {
  if ((equal?.(semantic, jit) ?? sameData(semantic, jit)) === true) return;
  mismatches.push(mismatch(caseId, definitionIndex, mismatchKind, semantic, jit));
}

function semanticOwner(owner: SemanticFrozenFamilyDefinitionOwner): ComparableDefinitionOwner {
  return owner.kind === "root"
    ? rootOwner()
    : {
        kind: owner.kind,
        parentDefinitionIndex: owner.parentDefinitionIndex,
        rowIndex: owner.rowIndex,
        instructionIndex: owner.instructionIndex,
        instructionKind: owner.instructionKind,
        slotName: owner.slotName,
        fieldPath: owner.fieldPath,
      };
}

function jitOwner(owner: JitCompilerBlueprintDefinitionOwner): ComparableDefinitionOwner {
  return owner.kind === "root"
    ? rootOwner()
    : {
        kind: owner.kind,
        parentDefinitionIndex: owner.parentDefinitionIndex,
        rowIndex: owner.rowIndex,
        instructionIndex: owner.instructionIndex,
        instructionKind: owner.instructionKind,
        slotName: owner.kind === "projection" ? owner.slotName : null,
        fieldPath: owner.fieldPath,
      };
}

function rootOwner(): ComparableDefinitionOwner {
  return {
    kind: "root",
    parentDefinitionIndex: null,
    rowIndex: null,
    instructionIndex: null,
    instructionKind: null,
    slotName: null,
    fieldPath: [],
  };
}

function semanticTemplate(template: SemanticFrozenFamilyTemplate): ComparableTemplate {
  return {
    kind: "template",
    namespaceUri: template.namespaceUri,
    attributes: template.attributes,
    content: template.content.map(semanticNode),
  };
}

function jitTemplate(template: JitCompilerBlueprintTemplate): ComparableTemplate {
  switch (template.kind) {
    case "template":
      return {
        kind: "template",
        namespaceUri: template.namespaceUri,
        attributes: template.attributes,
        content: template.content.map(jitNode),
      };
    case "absent":
    case "markup":
    case "node":
      return { kind: template.kind };
  }
}

function semanticNode(node: SemanticFrozenFamilyNode): ComparableNode {
  switch (node.kind) {
    case "fragment": return { kind: "fragment", children: node.children.map(semanticNode) };
    case "element":
      return {
        kind: "element",
        tagName: node.tagName,
        namespaceUri: node.namespaceUri,
        attributes: node.attributes,
        children: node.children.map(semanticNode),
        content: node.content?.map(semanticNode) ?? null,
      };
    case "text": return { kind: "text", value: node.value };
    case "comment": return { kind: "comment", value: node.value };
  }
}

function jitNode(node: JitCompilerBlueprintNode): ComparableNode {
  switch (node.kind) {
    case "fragment": return { kind: "fragment", children: node.children.map(jitNode) };
    case "element":
      return {
        kind: "element",
        tagName: node.tagName,
        namespaceUri: node.namespaceUri,
        attributes: node.attributes,
        children: node.children.map(jitNode),
        content: node.content?.map(jitNode) ?? null,
      };
    case "text": return { kind: "text", value: node.value };
    case "comment": return { kind: "comment", value: node.value };
    case "doctype":
      return {
        kind: "doctype",
        name: node.name,
        publicId: node.publicId,
        systemId: node.systemId,
      };
  }
}

function semanticGeometry(
  geometry: SemanticFrozenFamilyTargetGeometry,
  rowIndex: number,
  targetKind: string,
): ComparableGeometry {
  return {
    ordinal: rowIndex,
    rowIndex,
    targetKind: comparableTargetKind(targetKind),
    kind: geometry.kind,
    markerPath: geometry.markerPath,
    targetPath: geometry.targetPath,
    targetNodeKind: geometry.targetNodeKind,
    startPath: geometry.startPath,
    endPath: geometry.endPath,
  };
}

function comparableTargetKind(value: string): ComparableGeometry["targetKind"] {
  switch (value) {
    case "marker-target":
    case "render-location":
    case "open":
      return value;
    default:
      throw new Error(`Semantic frozen-family row has unsupported target kind '${value}'.`);
  }
}

function jitInstructionKind(instruction: CompilerCaseData): string {
  if (instruction == null || Array.isArray(instruction) || typeof instruction !== "object") {
    throw new Error("JIT blueprint row contains a non-object instruction.");
  }
  const kind = (instruction as Readonly<Record<string, CompilerCaseData>>).kind;
  if (typeof kind !== "string") throw new Error("JIT blueprint instruction has no normalized kind.");
  return kind;
}

function sameData(left: unknown, right: unknown): boolean {
  return canonicalCompilerJson(left) === canonicalCompilerJson(right);
}

function mismatch(
  caseId: string,
  definitionIndex: number | null,
  mismatchKind: SemanticFrozenFamilyStructuralMismatchKind,
  semantic: unknown,
  jit: unknown,
): SemanticFrozenFamilyStructuralMismatch {
  return { caseId, definitionIndex, mismatchKind, semantic, jit };
}
