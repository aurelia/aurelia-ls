import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  FrameworkSyntaxProducerKind,
  type FrameworkRelationshipEndpoint,
} from "../../framework/index.js";
import { uniqueValues } from "../../collections.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkSyntaxProductRow } from "./framework-entities.js";
import type { FrameworkCompilerFilters } from "./framework-compiler-model.js";
import {
  readAllFrameworkCompileFlowRows,
  readFrameworkAttributeClassificationRows,
  type FrameworkAttributeClassificationRow,
  type FrameworkCompileFlowRow,
} from "./framework-compiler-flow.js";
import { readFrameworkCompilerSyntaxProducts } from "./framework-rendering-graph.js";

export type { FrameworkCompilerFilters } from "./framework-compiler-model.js";

/** Compiler relationship row derived from TemplateCompiler flow and instruction-producing syntax rows. */
export interface FrameworkCompilerRelationshipRow {
  readonly id: string;
  readonly family: FrameworkRelationshipFamily.Compiler;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase.Compilation;
  readonly packageId: string;
  readonly packageName: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly sourceRowId: string;
  readonly summary: string;
}

const compilerProductMechanismByProducerKind: Readonly<
  Record<FrameworkSyntaxProducerKind, FrameworkRelationshipMechanism>
> = {
  [FrameworkSyntaxProducerKind.BindingCommand]:
    FrameworkRelationshipMechanism.BindingCommandBuild,
  [FrameworkSyntaxProducerKind.Renderer]:
    FrameworkRelationshipMechanism.InstructionFactory,
  [FrameworkSyntaxProducerKind.InstructionFactory]:
    FrameworkRelationshipMechanism.InstructionFactory,
};

export function readFrameworkCompilerInstructionProducts(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
): readonly FrameworkSyntaxProductRow[] {
  return readFrameworkCompilerSyntaxProducts(sourceProject, filters);
}

export function readFrameworkCompilerRelationships(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
): readonly FrameworkCompilerRelationshipRow[] {
  return [
    ...compilerRelationshipsFromProducts(
      readFrameworkCompilerInstructionProducts(sourceProject, filters),
      filters,
    ),
    ...compilerRelationshipsFromCompileFlow(
      readAllFrameworkCompileFlowRows(sourceProject, filters),
      filters,
    ),
    ...compilerRelationshipsFromAttributeClassification(
      readFrameworkAttributeClassificationRows(sourceProject, filters),
      filters,
    ),
  ].sort(compareCompilerRelationshipRows);
}

export function compilerRelationshipsFromProducts(
  products: readonly FrameworkSyntaxProductRow[],
  filters: FrameworkCompilerFilters,
): readonly FrameworkCompilerRelationshipRow[] {
  return products
    .map(compilerRelationshipFromProduct)
    .filter((row) => compilerRelationshipMatches(row, filters));
}

function compilerRelationshipFromProduct(
  row: FrameworkSyntaxProductRow,
): FrameworkCompilerRelationshipRow {
  const mechanism = compilerProductMechanismByProducerKind[row.producerKind];
  const instructionName = row.instructionName ?? "unknown-instruction";
  return {
    id: `${row.id}:compiler-relationship:produces-instruction`,
    family: FrameworkRelationshipFamily.Compiler,
    relation: FrameworkRelationshipRelation.ProducesInstruction,
    mechanism,
    phase: FrameworkRelationshipPhase.Compilation,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Symbol,
      name: row.producerName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
    },
    to: {
      kind: FrameworkRelationshipEndpointKind.Symbol,
      name: instructionName,
      packageId: row.packageId,
      packageName: row.packageName,
    },
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.producerName} produces compiler instruction ${instructionName}.`,
  };
}

export function compilerRelationshipsFromCompileFlow(
  rows: readonly FrameworkCompileFlowRow[],
  filters: FrameworkCompilerFilters,
): readonly FrameworkCompilerRelationshipRow[] {
  return rows
    .flatMap(compilerRelationshipsForCompileFlowRow)
    .filter((row) => compilerRelationshipMatches(row, filters));
}

function compilerRelationshipsForCompileFlowRow(
  row: FrameworkCompileFlowRow,
): readonly FrameworkCompilerRelationshipRow[] {
  const targets = compilerFlowTargets(row);
  if (targets.length === 0) {
    return [];
  }
  return targets.map((target) => {
    const relation = compileFlowRelation(row, target);
    return {
      id: `${row.id}:compiler-relationship:${relation}:${target}`,
      family: FrameworkRelationshipFamily.Compiler,
      relation,
      mechanism: FrameworkRelationshipMechanism.SyntaxProduct,
      phase: FrameworkRelationshipPhase.Compilation,
      packageId: "template-compiler",
      packageName: "@aurelia/template-compiler",
      from: compilerMethodEndpoint(row.methodName, row.source),
      to: compilerTargetEndpoint(target),
      source: row.source,
      sourceRowId: row.id,
      summary: `${row.ownerName}.${row.methodName} ${relation} ${target} during ${row.stage}: ${row.summary}`,
    };
  });
}

export function compilerRelationshipsFromAttributeClassification(
  rows: readonly FrameworkAttributeClassificationRow[],
  filters: FrameworkCompilerFilters,
): readonly FrameworkCompilerRelationshipRow[] {
  return rows
    .flatMap(compilerRelationshipsForAttributeClassificationRow)
    .filter((row) => compilerRelationshipMatches(row, filters));
}

function compilerRelationshipsForAttributeClassificationRow(
  row: FrameworkAttributeClassificationRow,
): readonly FrameworkCompilerRelationshipRow[] {
  const targets = [
    ...(row.targetKind === undefined ? [] : [row.targetKind]),
    ...row.instructionNames,
  ].filter(isConcreteCompilerTarget);
  if (targets.length === 0) {
    return [];
  }
  return uniqueValues(targets).map((target) => {
    const relation = attributeClassificationRelation(row, target);
    return {
      id: `${row.id}:compiler-relationship:${relation}:${target}`,
      family: FrameworkRelationshipFamily.Compiler,
      relation,
      mechanism: attributeClassificationMechanism(row),
      phase: FrameworkRelationshipPhase.Compilation,
      packageId: "template-compiler",
      packageName: "@aurelia/template-compiler",
      from: compilerMethodEndpoint(row.methodName, row.source),
      to: compilerTargetEndpoint(target),
      source: row.source,
      sourceRowId: row.id,
      summary: `${row.ownerName}.${row.methodName} ${relation} ${target} in ${row.branchKind}: ${row.summary}`,
    };
  });
}

function compilerFlowTargets(row: FrameworkCompileFlowRow): readonly string[] {
  if (row.targetName === undefined) {
    return [];
  }
  return uniqueValues(
    row.targetName
      .split("/")
      .map((target) => target.trim())
      .filter(isConcreteCompilerTarget),
  );
}

function isConcreteCompilerTarget(target: string): boolean {
  return target.length > 0 && target !== "unknown-instruction";
}

function compileFlowRelation(
  row: FrameworkCompileFlowRow,
  target: string,
): FrameworkRelationshipRelation {
  if (row.stage === "compile-context") {
    return FrameworkRelationshipRelation.ConstructsInstance;
  }
  if (row.stage.includes("lookup")) {
    return FrameworkRelationshipRelation.LooksUpResource;
  }
  if (
    row.stage.includes("instruction") ||
    row.stage === "let-element" ||
    row.stage === "text-binding" ||
    target.endsWith("Instruction") ||
    target === "HydrateTemplateController"
  ) {
    return FrameworkRelationshipRelation.ProducesInstruction;
  }
  if (
    row.stage === "local-elements" ||
    row.stage === "local-element-registration" ||
    row.stage === "compiled-definition" ||
    target.includes("ComponentDefinition")
  ) {
    return FrameworkRelationshipRelation.CollectsDependency;
  }
  if (target.startsWith("_")) {
    return FrameworkRelationshipRelation.InvokesCallback;
  }
  return FrameworkRelationshipRelation.CollectsDependency;
}

function attributeClassificationRelation(
  row: FrameworkAttributeClassificationRow,
  target: string,
): FrameworkRelationshipRelation {
  if (row.operation === "parse" || target === "AttrSyntax") {
    return FrameworkRelationshipRelation.ParsesExpression;
  }
  if (row.operation === "find") {
    return FrameworkRelationshipRelation.LooksUpResource;
  }
  if (
    row.operation === "emit" ||
    row.operation === "build" ||
    target.endsWith("Instruction")
  ) {
    return FrameworkRelationshipRelation.ProducesInstruction;
  }
  return FrameworkRelationshipRelation.CollectsDependency;
}

function attributeClassificationMechanism(
  row: FrameworkAttributeClassificationRow,
): FrameworkRelationshipMechanism {
  if (row.operation === "get") {
    return FrameworkRelationshipMechanism.BindingCommandResolver;
  }
  if (row.operation === "build") {
    return FrameworkRelationshipMechanism.BindingCommandBuild;
  }
  if (row.operation === "find") {
    return FrameworkRelationshipMechanism.ResourceFind;
  }
  if (row.operation === "emit") {
    return FrameworkRelationshipMechanism.InstructionFactory;
  }
  return FrameworkRelationshipMechanism.SyntaxProduct;
}

function compilerMethodEndpoint(
  methodName: string,
  source: SourceRange,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Method,
    name: `TemplateCompiler.${methodName}`,
    packageId: "template-compiler",
    packageName: "@aurelia/template-compiler",
    source,
  };
}

function compilerTargetEndpoint(target: string): FrameworkRelationshipEndpoint {
  return {
    kind: target.startsWith("_")
      ? FrameworkRelationshipEndpointKind.Method
      : FrameworkRelationshipEndpointKind.Symbol,
    name: target.startsWith("_") ? `TemplateCompiler.${target}` : target,
    packageId: "template-compiler",
    packageName: "@aurelia/template-compiler",
  };
}

function compilerRelationshipMatches(
  row: FrameworkCompilerRelationshipRow,
  filters: FrameworkCompilerFilters,
): boolean {
  return (
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined ||
      row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.query === undefined ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query))
  );
}

function compareCompilerRelationshipRows(
  left: FrameworkCompilerRelationshipRow,
  right: FrameworkCompilerRelationshipRow,
): number {
  return (
    left.relation.localeCompare(right.relation) ||
    left.mechanism.localeCompare(right.mechanism) ||
    left.from.name.localeCompare(right.from.name) ||
    left.to.name.localeCompare(right.to.name) ||
    left.id.localeCompare(right.id)
  );
}
