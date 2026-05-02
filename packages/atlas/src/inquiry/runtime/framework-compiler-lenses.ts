import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  FrameworkSyntaxProducerKind,
  FrameworkSyntaxProductKind,
  type FrameworkRelationshipEndpoint,
} from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisKind } from "../basis.js";
import { clampBudget } from "../budget.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import type { FrameworkSyntaxProductRow } from "./framework-entities.js";
import {
  filtersFromInquiry,
  type FrameworkDiscoveryFilters,
} from "./framework-filters.js";
import { readFrameworkSyntaxProducts } from "./framework-rendering-graph.js";
import {
  checkerBasis,
  evidenceLimit,
  pageInfo,
  pageOffset,
  pageRows,
  sourceIndexBasis,
} from "./framework-support.js";

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

/** Value returned by framework.compiler. */
export interface FrameworkCompilerValue {
  readonly instructionProductCount: number;
  readonly relationshipCount: number;
  readonly producerKinds: Readonly<Record<string, number>>;
  readonly productKinds: Readonly<Record<string, number>>;
  readonly relationshipRelations: Readonly<Record<string, number>>;
  readonly relationshipMechanisms: Readonly<Record<string, number>>;
  readonly instructionProducts?: readonly FrameworkSyntaxProductRow[];
  readonly relationships?: readonly FrameworkCompilerRelationshipRow[];
}

interface FrameworkCompilerFilters extends FrameworkDiscoveryFilters {
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
}

/** Answer framework.compiler inquiries from instruction-producing syntax rows. */
export function answerFrameworkCompiler(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkCompilerValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = compilerFiltersFromInquiry(inquiry);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);
  const instructionProducts = readFrameworkCompilerInstructionProducts(
    sourceProject,
    filters,
  );
  const relationships = compilerRelationshipsFromProducts(
    instructionProducts,
    filters,
  );
  const rollup = compilerValue(instructionProducts, relationships);

  if (projection === "instruction-products") {
    const page = pageRows(instructionProducts, offset, limit);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${instructionProducts.length} Aurelia framework compiler instruction product row(s).`,
      {
        value: { ...rollup, instructionProducts: page.rows },
        basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
        evidence: page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForCompilerInstructionProduct),
        page: pageInfo(
          inquiry,
          page.rows.length,
          instructionProducts.length,
          limit,
          page.nextOffset,
        ),
        continuations: compilerInstructionProductContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  if (projection === "relationships") {
    const page = pageRows(relationships, offset, limit);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${relationships.length} Aurelia framework compiler relationship row(s).`,
      {
        value: { ...rollup, relationships: page.rows },
        basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
        evidence: page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForCompilerRelationship),
        page: pageInfo(
          inquiry,
          page.rows.length,
          relationships.length,
          limit,
          page.nextOffset,
        ),
        continuations: compilerRelationshipContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  const page = pageRows(instructionProducts, offset, Math.min(limit, 20));
  return createAnswer(
    inquiry,
    instructionProducts.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Compiler instruction production has ${instructionProducts.length} row(s) and ${relationships.length} relationship atom(s).`,
    {
      value: { ...rollup, instructionProducts: page.rows },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: [
        ...page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForCompilerInstructionProduct),
      ],
      page: pageInfo(
        inquiry,
        page.rows.length,
        instructionProducts.length,
        Math.min(limit, 20),
        page.nextOffset,
      ),
      continuations: [
        projectionContinuation(
          inquiry,
          "framework.compiler:instruction-products",
          "instruction-products",
          "Inspect compiler instruction product rows.",
          {},
        ),
        projectionContinuation(
          inquiry,
          "framework.compiler:relationships",
          "relationships",
          "Inspect compiler relationship rows.",
          {},
        ),
      ],
    },
  );
}

function readFrameworkCompilerInstructionProducts(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
): readonly FrameworkSyntaxProductRow[] {
  return readFrameworkSyntaxProducts(sourceProject, filters).filter((row) =>
    isCompilerInstructionProduct(row),
  );
}

function isCompilerInstructionProduct(row: FrameworkSyntaxProductRow): boolean {
  if (row.instructionName === null) {
    return false;
  }
  return (
    row.productKind === FrameworkSyntaxProductKind.BuildsInstruction ||
    row.productKind === FrameworkSyntaxProductKind.EmitsInstruction
  );
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

function compilerRelationshipsFromProducts(
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

function compilerValue(
  instructionProducts: readonly FrameworkSyntaxProductRow[],
  relationships: readonly FrameworkCompilerRelationshipRow[],
): FrameworkCompilerValue {
  return {
    instructionProductCount: instructionProducts.length,
    relationshipCount: relationships.length,
    producerKinds: countBy(instructionProducts, (row) => row.producerKind),
    productKinds: countBy(instructionProducts, (row) => row.productKind),
    relationshipRelations: countBy(relationships, (row) => row.relation),
    relationshipMechanisms: countBy(relationships, (row) => row.mechanism),
  };
}

function evidenceForCompilerInstructionProduct(
  row: FrameworkSyntaxProductRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    source: row.source,
    summary: `${row.producerName} produces ${row.instructionName ?? "instruction"} during compilation.`,
  };
}

function evidenceForCompilerRelationship(
  row: FrameworkCompilerRelationshipRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    source: row.source,
    summary: row.summary,
  };
}

function compilerInstructionProductContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkSyntaxProductRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.compiler:instruction-products:next-page",
        "Continue compiler instruction product rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.compiler:relationships",
      "relationships",
      "Inspect compiler relationship atoms for instruction production.",
      {},
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    pushCompilerProductRowContinuations(continuations, inquiry, row, index);
  }
  return continuations;
}

function compilerRelationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkCompilerRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.compiler:relationships:next-page",
        "Continue compiler relationship rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForCompilerRelationship(row);
    continuations.push(
      {
        id: `framework.compiler:relationships:source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect source behind this compiler instruction production.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range: row.source },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.SourceFor,
          [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          "Source behind a compiler relationship.",
        ),
      },
      projectionContinuation(
        inquiry,
        `framework.compiler:relationships:rendering-dispatch:${index}`,
        "instruction-dispatches",
        "Inspect renderer dispatch rows that consume this produced instruction.",
        {
          lens: LensId.FrameworkRendering,
          filters: {
            instructionName: row.to.name,
          },
        },
      ),
      projectionContinuation(
        inquiry,
        `framework.compiler:relationships:controller-creations:${index}`,
        "controller-creations",
        "Inspect renderer child-controller creation rows for this produced instruction, when any exist.",
        {
          lens: LensId.FrameworkRendering,
          filters: {
            instructionName: row.to.name,
          },
        },
      ),
    );
  }
  return continuations;
}

function pushCompilerProductRowContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  row: FrameworkSyntaxProductRow,
  index: number,
): void {
  const evidence = evidenceForCompilerInstructionProduct(row);
  continuations.push(
    {
      id: `framework.compiler:instruction-products:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this compiler instruction product.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Source behind a compiler instruction product.",
      ),
    },
    projectionContinuation(
      inquiry,
      `framework.compiler:instruction-products:rendering-dispatch:${index}`,
      "instruction-dispatches",
      "Inspect renderer dispatch rows that consume this produced instruction.",
      {
        lens: LensId.FrameworkRendering,
        filters: compilerInstructionFilters(row),
      },
    ),
    projectionContinuation(
      inquiry,
      `framework.compiler:instruction-products:controller-creations:${index}`,
      "controller-creations",
      "Inspect renderer child-controller creation rows for this produced instruction, when any exist.",
      {
        lens: LensId.FrameworkRendering,
        filters: compilerInstructionFilters(row),
      },
    ),
  );
}

function compilerInstructionFilters(
  row: FrameworkSyntaxProductRow,
): Inquiry["filters"] {
  return row.instructionName === null
    ? {}
    : { instructionName: row.instructionName };
}

function projectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
  options: {
    readonly lens?: LensId;
    readonly filters?: Inquiry["filters"];
  },
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      ...(options.lens === undefined ? {} : { lens: options.lens }),
      projection,
      ...(options.filters === undefined ? {} : { filters: options.filters }),
      page: undefined,
    },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      [BasisKind.TypeScriptChecker],
      rationale,
    ),
  };
}

function nextPageContinuation(
  inquiry: Inquiry,
  id: string,
  rationale: string,
  nextOffset: number,
  limit: number,
): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      page: { size: limit, cursor: String(nextOffset) },
    },
    route: route(
      NavigationPlane.Addressing,
      NavigationRelation.NextPageOf,
      [],
      rationale,
    ),
  };
}

function compilerFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkCompilerFilters {
  return {
    ...filtersFromInquiry(inquiry),
    ...relationshipAxisFiltersFromRecord(inquiry.subject),
    ...relationshipAxisFiltersFromRecord(inquiry.filters),
  };
}

function relationshipAxisFiltersFromRecord(
  value: unknown,
): Pick<FrameworkCompilerFilters, "relation" | "mechanism" | "phase"> {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...compilerStringFilter(source, "relation"),
    ...compilerStringFilter(source, "mechanism"),
    ...compilerStringFilter(source, "phase"),
  };
}

function compilerStringFilter(
  source: Record<string, unknown>,
  key: keyof Pick<FrameworkCompilerFilters, "relation" | "mechanism" | "phase">,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
) {
  return { plane, relation, basis, summary };
}

function countBy<TValue>(
  values: readonly TValue[],
  key: (value: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const bucket = key(value);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  return counts;
}
