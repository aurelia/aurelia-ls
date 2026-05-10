import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
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
import { RepoRootLocus } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import {
  sourceRangeFromOneBasedReference,
  type SourceProject,
} from "../../source/index.js";
import {
  readProductVocabularyAnalysis,
  type ProductClaimGraphEdgeRow,
  type ProductClaimPredicateRow,
  type ProductClaimSignatureIssueRow,
  type ProductVocabularyAnalysis,
  type ProductVocabularyDefinitionRow,
  type ProductVocabularyUsageRow,
} from "./product-vocabulary-analysis.js";
import {
  inquiryQueryMatches,
  inquiryStringFilter,
  matchesFilterValue,
} from "./lens-filter-utils.js";
import {
  optionalNextPageContinuation,
  sourceForRow,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";

export interface ProductVocabularyValue {
  readonly version: ProductVocabularyAnalysis["version"];
  readonly rollup: ProductVocabularyAnalysis["rollup"];
  readonly definitions?: readonly ProductVocabularyDefinitionRow[];
  readonly usages?: readonly ProductVocabularyUsageRow[];
  readonly claimPredicates?: readonly ProductClaimPredicateRow[];
  readonly claimGraphEdges?: readonly ProductClaimGraphEdgeRow[];
  readonly claimSignatureIssues?: readonly ProductClaimSignatureIssueRow[];
}
type ProductVocabularyProjection =
  | "summary"
  | "catalog"
  | "usage"
  | "claim-schema"
  | "claim-graph"
  | "claim-issues";

export function answerProductVocabulary(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<ProductVocabularyValue> {
  const analysis = readProductVocabularyAnalysis(sourceProject);
  const projection = productVocabularyProjection(inquiry);
  const basis = productVocabularyBasis(sourceProject);
  const baseValue = {
    version: analysis.version,
    rollup: analysis.rollup,
  };

  switch (projection) {
    case "summary":
      return answerProductVocabularySummary(inquiry, analysis, basis, baseValue);
    case "catalog":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:catalog",
        "vocabulary definition row(s)",
        filterDefinitions(analysis.definitions, inquiry),
        basis,
        (rows) => ({ ...baseValue, definitions: rows }),
        evidenceForDefinition,
      );
    case "usage":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:usage",
        "vocabulary usage row(s)",
        filterUsages(analysis.usages, inquiry),
        basis,
        (rows) => ({ ...baseValue, usages: rows }),
        evidenceForVocabularyUsage,
      );
    case "claim-schema":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:claim-schema",
        "claim predicate schema row(s)",
        filterClaimPredicates(analysis.claimPredicates, inquiry),
        basis,
        (rows) => ({ ...baseValue, claimPredicates: rows }),
        evidenceForClaimPredicate,
      );
    case "claim-graph":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:claim-graph",
        "claim schema product-adjacency edge(s)",
        filterClaimGraphEdges(analysis.claimGraphEdges, inquiry),
        basis,
        (rows) => ({ ...baseValue, claimGraphEdges: rows }),
        evidenceForClaimGraphEdge,
      );
    case "claim-issues":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:claim-issues",
        "claim signature issue row(s)",
        filterClaimSignatureIssues(analysis.claimSignatureIssues, inquiry),
        basis,
        (rows) => ({ ...baseValue, claimSignatureIssues: rows }),
        evidenceForClaimSignatureIssue,
      );
  }
}

function answerProductVocabularySummary(
  inquiry: Inquiry,
  analysis: ProductVocabularyAnalysis,
  basis: readonly Basis[],
  baseValue: ProductVocabularyValue,
): Answer<ProductVocabularyValue> {
  const topIssues = filterClaimSignatureIssues(analysis.claimSignatureIssues, inquiry)
    .slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${analysis.rollup.definitionCount} vocabulary definition(s), ${analysis.rollup.usageCount} exact source usage(s), and ${analysis.rollup.claimGraphEdgeCount} claim-schema product edge(s).`,
    {
      value: {
        ...baseValue,
        claimSignatureIssues: topIssues,
      },
      basis,
      evidence: topIssues.slice(0, evidenceLimit(inquiry)).map(evidenceForClaimSignatureIssue),
      continuations: productVocabularySummaryContinuations(inquiry),
    },
  );
}

function answerProductVocabularyRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => ProductVocabularyValue,
  evidenceForRow: (row: TRow) => Evidence,
): Answer<ProductVocabularyValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow: (row) => evidenceForRow(row),
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        id: "product.vocabulary:next-page",
        rationale: "Continue product vocabulary rows.",
        routeSummary: "Next product vocabulary row page.",
        basis: [BasisKind.ProductVocabulary],
      }),
      ...rows.flatMap((row) => productVocabularySourceContinuations(row)),
      ...productVocabularyContinuations(inquiry),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => valueWithRows(page.rows),
  });
}

function productVocabularyProjection(inquiry: Inquiry): ProductVocabularyProjection {
  switch (inquiry.projection) {
    case undefined:
    case "summary":
      return "summary";
    case "catalog":
    case "usage":
    case "claim-schema":
    case "claim-graph":
    case "claim-issues":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function filterDefinitions(
  rows: readonly ProductVocabularyDefinitionRow[],
  inquiry: Inquiry,
): readonly ProductVocabularyDefinitionRow[] {
  return rows.filter((row) =>
    matchesFilterValue(row.slot, inquiryStringFilter(inquiry, "slot")) &&
    matchesFilterValue(row.namespace, inquiryStringFilter(inquiry, "namespace")) &&
    matchesFilterValue(row.memberName, inquiryStringFilter(inquiry, "memberName")) &&
    matchesFilterValue(row.rootName, inquiryStringFilter(inquiry, "rootName")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.key,
      row.summary,
      row.slot,
      row.namespace,
      row.memberName,
    ]),
  );
}

function filterUsages(
  rows: readonly ProductVocabularyUsageRow[],
  inquiry: Inquiry,
): readonly ProductVocabularyUsageRow[] {
  return rows.filter((row) =>
    matchesFilterValue(row.rootName, inquiryStringFilter(inquiry, "rootName")) &&
    matchesFilterValue(row.namespace, inquiryStringFilter(inquiry, "namespace")) &&
    matchesFilterValue(row.memberName, inquiryStringFilter(inquiry, "memberName")) &&
    matchesFilterValue(row.syntacticRole, inquiryStringFilter(inquiry, "role")) &&
    matchesFilterValue(row.accessKind, inquiryStringFilter(inquiry, "accessKind")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.accessPath,
      row.entryId ?? "",
      row.entryKey ?? "",
      row.source.filePath,
    ]),
  );
}

function filterClaimPredicates(
  rows: readonly ProductClaimPredicateRow[],
  inquiry: Inquiry,
): readonly ProductClaimPredicateRow[] {
  const endpointKind = inquiryStringFilter(inquiry, "endpointKind");
  const productKind = inquiryStringFilter(inquiry, "productKind");
  return rows.filter((row) =>
    matchesFilterValue(row.namespace, inquiryStringFilter(inquiry, "namespace")) &&
    matchesFilterValue(row.memberName, inquiryStringFilter(inquiry, "memberName")) &&
    (endpointKind === undefined ||
      row.signature?.subject.endpointKinds.includes(endpointKind as never) === true ||
      row.signature?.object.endpointKinds.includes(endpointKind as never) === true) &&
    (productKind === undefined ||
      row.signature?.subject.productKindRefs.includes(productKind) === true ||
      row.signature?.object.productKindRefs.includes(productKind) === true) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.key,
      row.summary,
      row.namespace,
      row.memberName,
      ...(row.signature?.subject.productKindRefs ?? []),
      ...(row.signature?.object.productKindRefs ?? []),
    ]),
  );
}

function filterClaimGraphEdges(
  rows: readonly ProductClaimGraphEdgeRow[],
  inquiry: Inquiry,
): readonly ProductClaimGraphEdgeRow[] {
  const productKind = inquiryStringFilter(inquiry, "productKind");
  return rows.filter((row) =>
    matchesFilterValue(row.predicateKey, inquiryStringFilter(inquiry, "predicateKey")) &&
    (productKind === undefined ||
      row.subjectProductKindId === productKind ||
      row.subjectProductKindKey === productKind ||
      row.objectProductKindId === productKind ||
      row.objectProductKindKey === productKind) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.predicateId,
      row.predicateKey,
      row.subjectProductKindId,
      row.subjectProductKindKey,
      row.objectProductKindId,
      row.objectProductKindKey,
    ]),
  );
}

function filterClaimSignatureIssues(
  rows: readonly ProductClaimSignatureIssueRow[],
  inquiry: Inquiry,
): readonly ProductClaimSignatureIssueRow[] {
  return rows.filter((row) =>
    matchesFilterValue(row.kind, inquiryStringFilter(inquiry, "issueKind")) &&
    matchesFilterValue(row.predicateKey, inquiryStringFilter(inquiry, "predicateKey")) &&
    matchesFilterValue(row.productKindRef ?? "", inquiryStringFilter(inquiry, "productKind")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.kind,
      row.predicateId,
      row.predicateKey,
      row.productKindRef ?? "",
      row.summary,
    ]),
  );
}

function evidenceForDefinition(row: ProductVocabularyDefinitionRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.VocabularyTerm,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.slot} ${row.id}: ${row.summary}`,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  };
}

function evidenceForVocabularyUsage(row: ProductVocabularyUsageRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.accessPath} used as ${row.accessKind}/${row.syntacticRole}.`,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  };
}

function evidenceForClaimPredicate(row: ProductClaimPredicateRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.VocabularyTerm,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `Claim predicate ${row.key} exposes a directional signature.`,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  };
}

function evidenceForClaimGraphEdge(row: ProductClaimGraphEdgeRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ProductClaim,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary:
      `${row.predicateKey}: ${row.subjectProductKindKey} -> ${row.objectProductKindKey}.`,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  };
}

function evidenceForClaimSignatureIssue(row: ProductClaimSignatureIssueRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  };
}

function productVocabularySourceContinuations(row: unknown): readonly Continuation[] {
  const source = sourceForRow<ProductClaimSignatureIssueRow["source"]>(row);
  return sourceInspectionContinuations(
    source === undefined ? undefined : sourceRangeFromOneBasedReference(source),
    {
      ...(source === undefined
        ? {}
        : {
            id: `product.vocabulary:source:${source.filePath}:${source.startLine}:${source.startCharacter}`,
          }),
      basis: [BasisKind.ProductVocabulary, BasisKind.SourceText],
      rationale: "Inspect the source behind this product-vocabulary row.",
      routeSummary: "Source backing for a product-vocabulary row.",
    },
  );
}

function productVocabularySummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    productVocabularyContinuation(
      inquiry,
      "product.vocabulary:summary:claim-graph",
      "claim-graph",
      "Inspect product-kind adjacency expanded from claim predicate signatures.",
      ContinuationPriority.Primary,
    ),
    productVocabularyContinuation(
      inquiry,
      "product.vocabulary:summary:claim-schema",
      "claim-schema",
      "Inspect signed claim predicate signatures.",
      ContinuationPriority.Primary,
    ),
    productVocabularyContinuation(
      inquiry,
      "product.vocabulary:summary:catalog",
      "catalog",
      "Inspect declared vocabulary definitions by slot and namespace.",
      ContinuationPriority.Secondary,
    ),
    productVocabularyContinuation(
      inquiry,
      "product.vocabulary:summary:usage",
      "usage",
      "Inspect exact source usages outside the vocabulary package.",
      ContinuationPriority.Secondary,
    ),
  ];
}

function productVocabularyContinuations(inquiry: Inquiry): readonly Continuation[] {
  if (inquiry.projection === "summary") {
    return [];
  }
  return [
    productVocabularyContinuation(
      inquiry,
      "product.vocabulary:back-to-summary",
      "summary",
      "Return to the product vocabulary rollup.",
      ContinuationPriority.Secondary,
    ),
  ];
}

function productVocabularyContinuation(
  inquiry: Inquiry,
  id: string,
  projection: ProductVocabularyProjection,
  rationale: string,
  priority: ContinuationPriority,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority,
    rationale,
    inquiry: {
      lens: LensId.ProductVocabulary,
      locus: inquiry.locus ?? RepoRootLocus,
      projection,
      filters: inquiry.filters,
      budget: inquiry.budget,
    },
    route: {
      plane: NavigationPlane.Structure,
      relation: NavigationRelation.ProjectionOf,
      basis: [BasisKind.ProductVocabulary],
      summary: `Product vocabulary ${projection} projection.`,
    },
  };
}

function productVocabularyBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    {
      kind: BasisKind.ProductVocabulary,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Product,
      freshness: BasisFreshness.Live,
      summary:
        "Read semantic-runtime vocabulary definitions, source usages, and claim signatures from the hot TypeScript Program.",
      identity: sourceProject.summary().identity,
    },
    {
      kind: BasisKind.TypeScriptProgram,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      summary: "Used TypeScript AST/source structure for exact definition and usage rows.",
      identity: sourceProject.summary().identity,
    },
  ];
}
