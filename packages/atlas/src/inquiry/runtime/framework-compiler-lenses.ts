import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
} from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisKind } from "../basis.js";
import {
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
import type { SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import {
  evidenceLimit,
  pageOffset,
  rowLimit,
} from "../paging.js";
import { LensId } from "../lens.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import {
  FRAMEWORK_JIT_COMPILER_ACTOR,
  frameworkJitCompilerFlowFilters,
  isFrameworkJitCompilerActorName,
} from "./framework-jit-compiler-corridor.js";
import type { FrameworkSyntaxProductRow } from "./framework-entities.js";
import { filtersFromInquiry } from "./framework-filters.js";
import {
  readFrameworkAttributeClassificationRows,
  readFrameworkCompileFlowRows,
  type FrameworkAttributeClassificationRow,
  type FrameworkCompileFlowRow,
} from "./framework-compiler-flow.js";
import type { FrameworkCompilerFilters } from "./framework-compiler-model.js";
import {
  readFrameworkCompilerInstructionProducts,
  readFrameworkCompilerRelationships,
  type FrameworkCompilerRelationshipRow,
} from "./framework-compiler-products.js";
import {
  checkerBasis,
  countBy,
  sourceIndexBasis,
} from "./framework-support.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import { stringFiltersFromRecord } from "./lens-filter-utils.js";

export {
  readFrameworkCompilerInstructionProducts,
  readFrameworkCompilerRelationships,
  type FrameworkCompilerFilters,
  type FrameworkCompilerRelationshipRow,
} from "./framework-compiler-products.js";

/** Value returned by framework.compiler. */
export interface FrameworkCompilerValue {
  readonly instructionProductCount: number;
  readonly relationshipCount: number;
  readonly compileFlowCount: number;
  readonly attributeClassificationCount: number;
  readonly producerKinds: Readonly<Record<string, number>>;
  readonly productKinds: Readonly<Record<string, number>>;
  readonly relationshipRelations: Readonly<Record<string, number>>;
  readonly relationshipMechanisms: Readonly<Record<string, number>>;
  readonly compileStages: Readonly<Record<string, number>>;
  readonly attributeClassificationBranches: Readonly<Record<string, number>>;
  readonly instructionProducts?: readonly FrameworkSyntaxProductRow[];
  readonly relationships?: readonly FrameworkCompilerRelationshipRow[];
  readonly compileFlow?: readonly FrameworkCompileFlowRow[];
  readonly attributeClassification?: readonly FrameworkAttributeClassificationRow[];
}

const CHECKER_PROJECTION_BASIS = [BasisKind.TypeScriptChecker] as const;
const MAX_DIRECT_ROW_CONTINUATIONS = 40;

const COMPILER_INSTRUCTION_PRODUCT_ROW_FAMILY =
  new PagedRowFamily<FrameworkSyntaxProductRow>({
    id: "framework.compiler:instruction-products",
    rowLabel: "Aurelia framework compiler instruction product row(s)",
    evidenceForRow: evidenceForCompilerInstructionProduct,
    continuationsForPage: compilerInstructionProductContinuations,
  });

const COMPILER_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkCompilerRelationshipRow>({
    id: "framework.compiler:relationships",
    rowLabel: "Aurelia framework compiler relationship row(s)",
    evidenceForRow: evidenceForCompilerTypeFactRow,
    continuationsForPage: compilerRelationshipContinuations,
  });

const COMPILER_COMPILE_FLOW_ROW_FAMILY =
  new PagedRowFamily<FrameworkCompileFlowRow>({
    id: "framework.compiler:compile-flow",
    rowLabel: "Aurelia framework compiler compile-flow stage row(s)",
    evidenceForRow: evidenceForCompilerTypeFactRow,
    continuationsForPage: compilerCompileFlowContinuations,
  });

const COMPILER_ATTRIBUTE_CLASSIFICATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkAttributeClassificationRow>({
    id: "framework.compiler:attribute-classification",
    rowLabel:
      "Aurelia framework compiler attribute-classification branch row(s)",
    evidenceForRow: evidenceForCompilerTypeFactRow,
    continuationsForPage: compilerAttributeClassificationContinuations,
  });

/** Answer framework.compiler inquiries from instruction-producing syntax rows. */
export function answerFrameworkCompiler(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkCompilerValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = compilerFiltersFromInquiry(inquiry);
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);
  const instructionProducts = readFrameworkCompilerInstructionProducts(
    sourceProject,
    filters,
  );
  const relationships = readFrameworkCompilerRelationships(sourceProject, filters);
  const compileFlow = readFrameworkCompileFlowRows(sourceProject, filters);
  const attributeClassification = readFrameworkAttributeClassificationRows(
    sourceProject,
    filters,
  );
  const rollup = compilerValue(
    instructionProducts,
    relationships,
    compileFlow,
    attributeClassification,
  );

  if (projection === "instruction-products") {
    return COMPILER_INSTRUCTION_PRODUCT_ROW_FAMILY.answer({
      inquiry,
      rows: instructionProducts,
      limit,
      offset,
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      value: (page) => ({ ...rollup, instructionProducts: page.rows }),
    });
  }

  if (projection === "relationships") {
    return COMPILER_RELATIONSHIP_ROW_FAMILY.answer({
      inquiry,
      rows: relationships,
      limit,
      offset,
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      value: (page) => ({ ...rollup, relationships: page.rows }),
    });
  }

  if (projection === "compile-flow") {
    return COMPILER_COMPILE_FLOW_ROW_FAMILY.answer({
      inquiry,
      rows: compileFlow,
      limit,
      offset,
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      value: (page) => ({ ...rollup, compileFlow: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${compileFlow.length} TemplateCompiler compile-flow stage row(s).`,
    });
  }

  if (projection === "attribute-classification") {
    return COMPILER_ATTRIBUTE_CLASSIFICATION_ROW_FAMILY.answer({
      inquiry,
      rows: attributeClassification,
      limit,
      offset,
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      value: (page) => ({ ...rollup, attributeClassification: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${attributeClassification.length} TemplateCompiler attribute-classification branch row(s).`,
    });
  }

  return createAnswer(
    inquiry,
    instructionProducts.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Compiler has ${compileFlow.length} compile-flow stage row(s), ${attributeClassification.length} attribute-classification branch row(s), ${instructionProducts.length} instruction product row(s), and ${relationships.length} relationship atom(s).`,
    {
      value: rollup,
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: compileFlow
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForCompilerTypeFactRow),
      continuations: [
        FrameworkSemanticRoutes.CompilerToAdmissionJitFlow.continuation(
          inquiry,
          {
            id: "framework.compiler:jit-compiler-flow",
            filters: frameworkJitCompilerFlowFilters({
              targetName: FRAMEWORK_JIT_COMPILER_ACTOR,
            }),
            rationale:
              "Place TemplateCompiler instruction production back into the default JIT compiler flow corridor.",
          },
        ),
        FrameworkSemanticRoutes.CompilerToRenderingHydrationFlow.continuation(
          inquiry,
          {
            id: "framework.compiler:hydration-flow",
            filters: {},
            rationale:
              "Follow compiled definitions and instruction rows into the hydration/runtime rendering corridor.",
          },
        ),
        projectionContinuation(
          inquiry,
          "framework.compiler:compile-flow",
          "compile-flow",
          "Inspect high-level TemplateCompiler compile-flow stages.",
          { filters: {}, basis: CHECKER_PROJECTION_BASIS },
        ),
        projectionContinuation(
          inquiry,
          "framework.compiler:attribute-classification",
          "attribute-classification",
          "Inspect the detailed TemplateCompiler._classifyAttributes decision tree.",
          {
            filters: { methodName: "_classifyAttributes" },
            basis: CHECKER_PROJECTION_BASIS,
            priority: ContinuationPriority.Secondary,
          },
        ),
        projectionContinuation(
          inquiry,
          "framework.compiler:instruction-products",
          "instruction-products",
          "Inspect compiler instruction product rows.",
          { basis: CHECKER_PROJECTION_BASIS },
        ),
        projectionContinuation(
          inquiry,
          "framework.compiler:relationships",
          "relationships",
          "Inspect compiler relationship rows.",
          { basis: CHECKER_PROJECTION_BASIS },
        ),
      ],
    },
  );
}

function compilerValue(
  instructionProducts: readonly FrameworkSyntaxProductRow[],
  relationships: readonly FrameworkCompilerRelationshipRow[],
  compileFlow: readonly FrameworkCompileFlowRow[],
  attributeClassification: readonly FrameworkAttributeClassificationRow[],
): FrameworkCompilerValue {
  return {
    instructionProductCount: instructionProducts.length,
    relationshipCount: relationships.length,
    compileFlowCount: compileFlow.length,
    attributeClassificationCount: attributeClassification.length,
    producerKinds: countBy(instructionProducts, (row) => row.producerKind),
    productKinds: countBy(instructionProducts, (row) => row.productKind),
    relationshipRelations: countBy(relationships, (row) => row.relation),
    relationshipMechanisms: countBy(relationships, (row) => row.mechanism),
    compileStages: countBy(compileFlow, (row) => row.stage),
    attributeClassificationBranches: countBy(
      attributeClassification,
      (row) => row.branchKind,
    ),
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

interface FrameworkCompilerTypeFactEvidenceRow {
  readonly id: string;
  readonly source: SourceRange;
  readonly summary: string;
}

function evidenceForCompilerTypeFactRow<T extends FrameworkCompilerTypeFactEvidenceRow>(
  row: T,
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
      { basis: CHECKER_PROJECTION_BASIS },
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
    const evidence = evidenceForCompilerTypeFactRow(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.compiler:relationships",
      index,
      evidence,
    );
    const route = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.compiler:relationships",
      index,
      evidence,
    );
    pushJitCompilerFlowContinuation(
      continuations,
      route,
      row.from.name,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this compiler instruction production.",
        "Source behind a compiler relationship.",
      ),
      route.continuation(
        FrameworkSemanticRoutes.CompilerToRenderingInstructionDispatches,
        "rendering-dispatch",
        {
          filters: compilerRelationshipFilters(row),
          rationale:
            "Inspect renderer dispatch rows that consume this produced instruction.",
        },
      ),
      route.continuation(
        FrameworkSemanticRoutes.CompilerToRenderingControllerCreations,
        "controller-creations",
        {
          filters: compilerRelationshipFilters(row),
          rationale:
            "Inspect renderer child-controller creation rows for this produced instruction, when any exist.",
        },
      ),
    );
  }
  return continuations;
}

function compilerCompileFlowContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkCompileFlowRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.compiler:compile-flow:next-page",
        "Continue TemplateCompiler compile-flow stage rows.",
        nextOffset,
        limit,
      ),
    );
  }
  if (rows.some(compileFlowRowReachesAttributeClassification)) {
    continuations.push(
      projectionContinuation(
        inquiry,
        "framework.compiler:attribute-classification",
        "attribute-classification",
        "Inspect the attribute-classification detail view for the complex compile-flow branch.",
        {
          filters: { methodName: "_classifyAttributes" },
          basis: CHECKER_PROJECTION_BASIS,
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }

  for (const [index, row] of rowsForDirectContinuations(rows).entries()) {
    const evidence = evidenceForCompilerTypeFactRow(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.compiler:compile-flow",
      index,
      evidence,
    );
    const route = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.compiler:compile-flow",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this TemplateCompiler compile-flow stage.",
        "Source behind a TemplateCompiler compile-flow stage.",
      ),
    );

    if (compileFlowRowFeedsHydration(row)) {
      continuations.push(
        route.continuation(
          FrameworkSemanticRoutes.CompilerToRenderingHydrationFlow,
          "hydration-flow",
          {
            filters: hydrationFiltersForCompileFlowRow(row),
            rationale:
              "Return to the hydration/runtime rendering corridor that consumes this compile-flow stage.",
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }

    if (row.stage === "attribute-classification") {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.compiler:compile-flow:attribute-classification:${index}`,
          "attribute-classification",
          "Open the detailed branch view for TemplateCompiler._classifyAttributes.",
          {
            filters: { methodName: "_classifyAttributes" },
            evidence,
            basis: CHECKER_PROJECTION_BASIS,
          },
        ),
      );
    }

    for (const methodName of targetMethodNamesFromCompileFlowTarget(row.targetName)) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.compiler:compile-flow:method:${index}:${methodName}`,
          "compile-flow",
          `Inspect compile-flow rows owned by TemplateCompiler.${methodName}.`,
          {
            filters: { methodName },
            evidence,
            basis: CHECKER_PROJECTION_BASIS,
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }

    const instructionName = instructionNameFromCompileFlowTarget(row.targetName);
    if (instructionName !== null) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.compiler:compile-flow:instruction-products:${index}`,
          "instruction-products",
          `Inspect compiler product rows that emit ${instructionName}.`,
          {
            filters: { instructionName },
            evidence,
            basis: CHECKER_PROJECTION_BASIS,
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
  }
  return continuations;
}

function compilerAttributeClassificationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAttributeClassificationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.compiler:attribute-classification:next-page",
        "Continue TemplateCompiler attribute-classification branch rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.compiler:attribute-classification:compile-flow",
      "compile-flow",
      "Return to the high-level compile-flow stage that owns attribute classification.",
      {
        filters: { compileStage: "attribute-classification" },
        basis: CHECKER_PROJECTION_BASIS,
      },
    ),
  );

  for (const [index, row] of rowsForDirectContinuations(rows).entries()) {
    const evidence = evidenceForCompilerTypeFactRow(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.compiler:attribute-classification",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect source behind this attribute-classification branch.",
        "Source behind a TemplateCompiler attribute-classification branch.",
      ),
    );
    for (const instructionName of row.instructionNames.slice(0, 2)) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.compiler:attribute-classification:instruction-products:${index}:${instructionName}`,
          "instruction-products",
          `Inspect compiler product rows that emit ${instructionName}.`,
          {
            filters: { instructionName },
            evidence,
            basis: CHECKER_PROJECTION_BASIS,
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
    pushAttributeBranchContinuations(continuations, inquiry, row, index, evidence);
  }
  return continuations;
}

function pushAttributeBranchContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  row: FrameworkAttributeClassificationRow,
  index: number,
  evidence: Evidence,
): void {
  if (row.branchKind === "attribute-bindables") {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.compiler:attribute-classification:custom-attribute-bindables:${index}`,
        "compile-flow",
        "Inspect the bindable compiler used for custom attributes and template controllers.",
        {
          filters: { methodName: "_compileCustomAttributeBindables" },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
  if (row.targetKind === "BindingCommand") {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.compiler:attribute-classification:binding-command-products:${index}`,
        "instruction-products",
        "Inspect binding-command compiler products used by this branch family.",
        {
          filters: { producerKind: "binding-command" },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
          priority: ContinuationPriority.Secondary,
        },
      ),
      projectionContinuation(
        inquiry,
        `framework.compiler:attribute-classification:binding-command-resources:${index}`,
        "convergence",
        "Inspect binding-command resource convergence rows resolved by the compiler.",
        {
          lens: LensId.FrameworkResources,
          filters: { resourceKind: "binding-command" },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
  if (row.branchKind === "attribute-resource-lookup") {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.compiler:attribute-classification:custom-attribute-resources:${index}`,
        "convergence",
        "Inspect custom-attribute resource convergence rows found by this branch.",
        {
          lens: LensId.FrameworkResources,
          filters: { resourceKind: "custom-attribute" },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
          priority: ContinuationPriority.Secondary,
        },
      ),
      projectionContinuation(
        inquiry,
        `framework.compiler:attribute-classification:template-controller-resources:${index}`,
        "convergence",
        "Inspect template-controller resource convergence rows found by this branch.",
        {
          lens: LensId.FrameworkResources,
          filters: { resourceKind: "template-controller" },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
}

function pushCompilerProductRowContinuations(
  continuations: Continuation[],
  inquiry: Inquiry,
  row: FrameworkSyntaxProductRow,
  index: number,
): void {
  const evidence = evidenceForCompilerInstructionProduct(row);
  const builder = new FrameworkRowContinuationBuilder(
    inquiry,
    "framework.compiler:instruction-products",
    index,
    evidence,
  );
  const route = new FrameworkSemanticRouteBuilder(
    inquiry,
    "framework.compiler:instruction-products",
    index,
    evidence,
  );
  pushJitCompilerFlowContinuation(
    continuations,
    route,
    row.producerName,
  );
  continuations.push(
    builder.source(
      "source",
      row.source,
      "Inspect source behind this compiler instruction product.",
      "Source behind a compiler instruction product.",
    ),
    route.continuation(
      FrameworkSemanticRoutes.CompilerToRenderingInstructionDispatches,
      "rendering-dispatch",
      {
        filters: compilerInstructionFilters(row),
        rationale:
          "Inspect renderer dispatch rows that consume this produced instruction.",
      },
    ),
    route.continuation(
      FrameworkSemanticRoutes.CompilerToRenderingControllerCreations,
      "controller-creations",
      {
        filters: compilerInstructionFilters(row),
        rationale:
          "Inspect renderer child-controller creation rows for this produced instruction, when any exist.",
      },
    ),
  );
}

function pushJitCompilerFlowContinuation(
  continuations: Continuation[],
  route: FrameworkSemanticRouteBuilder,
  producerName: string,
): void {
  if (!isFrameworkJitCompilerActorName(producerName)) {
    return;
  }
  continuations.push(
    route.continuation(
      FrameworkSemanticRoutes.CompilerToAdmissionJitFlow,
      "jit-flow",
      {
        filters: frameworkJitCompilerFlowFilters({
          targetName: FRAMEWORK_JIT_COMPILER_ACTOR,
        }),
        rationale:
          "Place this TemplateCompiler instruction-production row back into the default JIT compiler flow corridor.",
      },
    ),
  );
}

function compilerRelationshipFilters(
  row: FrameworkCompilerRelationshipRow,
): Inquiry["filters"] {
  return { instructionName: row.to.name };
}

function compilerInstructionFilters(
  row: FrameworkSyntaxProductRow,
): Inquiry["filters"] {
  return row.instructionName === null
    ? {}
    : { instructionName: row.instructionName };
}

function instructionNameFromCompileFlowTarget(
  targetName: string | undefined,
): string | null {
  if (targetName === undefined || targetName.includes("/")) {
    return null;
  }
  return targetName.endsWith("Instruction") ||
    targetName === "HydrateTemplateController"
    ? targetName
    : null;
}

function targetMethodNamesFromCompileFlowTarget(
  targetName: string | undefined,
): readonly string[] {
  if (targetName === undefined) {
    return [];
  }
  return targetName
    .split("/")
    .filter((name) => name.startsWith("_") && name !== "_classifyAttributes");
}

function compileFlowRowReachesAttributeClassification(
  row: FrameworkCompileFlowRow,
): boolean {
  return row.stage === "attribute-classification" ||
    row.targetName === "_classifyAttributes";
}

function compileFlowRowFeedsHydration(row: FrameworkCompileFlowRow): boolean {
  return (
    row.stage === "compiled-definition" ||
    row.stage === "element-instruction" ||
    row.stage === "instruction-merge" ||
    row.stage === "template-controller-wrapping" ||
    row.stage === "let-element" ||
    row.stage === "text-binding"
  );
}

function hydrationFiltersForCompileFlowRow(
  row: FrameworkCompileFlowRow,
): Inquiry["filters"] {
  if (row.stage === "compiled-definition") {
    return { targetKind: "compiled-definition" };
  }
  return { targetKind: "instruction" };
}

function rowsForDirectContinuations<TRow>(
  rows: readonly TRow[],
): readonly TRow[] {
  return rows.length <= MAX_DIRECT_ROW_CONTINUATIONS
    ? rows
    : rows.slice(0, 5);
}

function compilerFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkCompilerFilters {
  return {
    ...filtersFromInquiry(inquiry),
    ...compilerAxisFiltersFromRecord(inquiry.subject),
    ...compilerAxisFiltersFromRecord(inquiry.filters),
  };
}

function compilerAxisFiltersFromRecord(
  value: unknown,
): Partial<FrameworkCompilerFilters> {
  return stringFiltersFromRecord<FrameworkCompilerFilters>(value, [
    "relation",
    "mechanism",
    "phase",
    "compileStage",
    "branchKind",
    "methodName",
  ]);
}
