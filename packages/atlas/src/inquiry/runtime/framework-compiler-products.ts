import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  FrameworkSyntaxProducerKind,
  type FrameworkRelationshipEndpoint,
} from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkSyntaxProductRow } from "./framework-entities.js";
import type { FrameworkCompilerFilters } from "./framework-compiler-model.js";
import { readFrameworkCompilerSyntaxProducts } from "./framework-rendering-graph.js";

export type { FrameworkCompilerFilters } from "./framework-compiler-model.js";

/** Compiler relationship row derived from instruction-producing syntax rows. */
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
  return compilerRelationshipsFromProducts(
    readFrameworkCompilerInstructionProducts(sourceProject, filters),
    filters,
  );
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
  const mechanism =
    row.producerKind === FrameworkSyntaxProducerKind.BindingCommand
      ? FrameworkRelationshipMechanism.BindingCommandBuild
      : FrameworkRelationshipMechanism.InstructionFactory;
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
