import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
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
import { LocusKind, RepoRootLocus } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset } from "../paging.js";
import type { SourceProject } from "../../source/index.js";
import {
  readProductVocabularyAnalysis,
  toInquirySourceRange,
  type ProductClaimGraphEdgeRow,
  type ProductClaimPredicateRow,
  type ProductClaimSignatureIssueRow,
  type ProductVocabularyAnalysis,
  type ProductVocabularyDefinitionRow,
  type ProductVocabularyUsageRow,
} from "./product-vocabulary-analysis.js";

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

  switch (projection) {
    case "summary":
      return answerProductVocabularySummary(inquiry, analysis, basis);
    case "catalog":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:catalog",
        "vocabulary definition row(s)",
        filterDefinitions(analysis.definitions, inquiry),
        basis,
        (rows) => ({ ...baseValue(analysis), definitions: rows }),
        evidenceForDefinition,
      );
    case "usage":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:usage",
        "vocabulary usage row(s)",
        filterUsages(analysis.usages, inquiry),
        basis,
        (rows) => ({ ...baseValue(analysis), usages: rows }),
        evidenceForUsage,
      );
    case "claim-schema":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:claim-schema",
        "claim predicate schema row(s)",
        filterClaimPredicates(analysis.claimPredicates, inquiry),
        basis,
        (rows) => ({ ...baseValue(analysis), claimPredicates: rows }),
        evidenceForClaimPredicate,
      );
    case "claim-graph":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:claim-graph",
        "claim schema product-adjacency edge(s)",
        filterClaimGraphEdges(analysis.claimGraphEdges, inquiry),
        basis,
        (rows) => ({ ...baseValue(analysis), claimGraphEdges: rows }),
        evidenceForClaimGraphEdge,
      );
    case "claim-issues":
      return answerProductVocabularyRows(
        inquiry,
        "product.vocabulary:claim-issues",
        "claim signature issue row(s)",
        filterClaimSignatureIssues(analysis.claimSignatureIssues, inquiry),
        basis,
        (rows) => ({ ...baseValue(analysis), claimSignatureIssues: rows }),
        evidenceForClaimSignatureIssue,
      );
  }
}

function answerProductVocabularySummary(
  inquiry: Inquiry,
  analysis: ProductVocabularyAnalysis,
  basis: readonly Basis[],
): Answer<ProductVocabularyValue> {
  const topIssues = filterClaimSignatureIssues(analysis.claimSignatureIssues, inquiry)
    .slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${analysis.rollup.definitionCount} vocabulary definition(s), ${analysis.rollup.usageCount} exact source usage(s), and ${analysis.rollup.claimGraphEdgeCount} claim-schema product edge(s).`,
    {
      value: {
        ...baseValue(analysis),
        claimSignatureIssues: topIssues,
      },
      basis,
      evidence: topIssues.slice(0, evidenceLimit(inquiry)).map(evidenceForClaimSignatureIssue),
      continuations: summaryContinuations(inquiry),
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
      ...nextPageContinuation(inquiry, nextOffset, limit),
      ...rows.flatMap((row) => sourceContinuationsForRow(row)),
      ...commonContinuations(inquiry),
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

function baseValue(analysis: ProductVocabularyAnalysis): ProductVocabularyValue {
  return {
    version: analysis.version,
    rollup: analysis.rollup,
  };
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
    matches(row.slot, stringFilter(inquiry, "slot")) &&
    matches(row.namespace, stringFilter(inquiry, "namespace")) &&
    matches(row.memberName, stringFilter(inquiry, "memberName")) &&
    matches(row.rootName, stringFilter(inquiry, "rootName")) &&
    queryMatches(inquiry, [
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
    matches(row.rootName, stringFilter(inquiry, "rootName")) &&
    matches(row.namespace, stringFilter(inquiry, "namespace")) &&
    matches(row.memberName, stringFilter(inquiry, "memberName")) &&
    matches(row.syntacticRole, stringFilter(inquiry, "role")) &&
    matches(row.accessKind, stringFilter(inquiry, "accessKind")) &&
    queryMatches(inquiry, [
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
  const endpointKind = stringFilter(inquiry, "endpointKind");
  const productKind = stringFilter(inquiry, "productKind");
  return rows.filter((row) =>
    matches(row.namespace, stringFilter(inquiry, "namespace")) &&
    matches(row.memberName, stringFilter(inquiry, "memberName")) &&
    (endpointKind === undefined ||
      row.signature?.subject.endpointKinds.includes(endpointKind as never) === true ||
      row.signature?.object.endpointKinds.includes(endpointKind as never) === true) &&
    (productKind === undefined ||
      row.signature?.subject.productKindRefs.includes(productKind) === true ||
      row.signature?.object.productKindRefs.includes(productKind) === true) &&
    queryMatches(inquiry, [
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
  const productKind = stringFilter(inquiry, "productKind");
  return rows.filter((row) =>
    matches(row.predicateKey, stringFilter(inquiry, "predicateKey")) &&
    (productKind === undefined ||
      row.subjectProductKindId === productKind ||
      row.subjectProductKindKey === productKind ||
      row.objectProductKindId === productKind ||
      row.objectProductKindKey === productKind) &&
    queryMatches(inquiry, [
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
    matches(row.kind, stringFilter(inquiry, "issueKind")) &&
    matches(row.predicateKey, stringFilter(inquiry, "predicateKey")) &&
    matches(row.productKindRef ?? "", stringFilter(inquiry, "productKind")) &&
    queryMatches(inquiry, [
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
    source: toInquirySourceRange(row.source),
    data: row,
  };
}

function evidenceForUsage(row: ProductVocabularyUsageRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.accessPath} used as ${row.accessKind}/${row.syntacticRole}.`,
    source: toInquirySourceRange(row.source),
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
    source: toInquirySourceRange(row.source),
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
    source: toInquirySourceRange(row.source),
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
    source: toInquirySourceRange(row.source),
    data: row,
  };
}

function sourceContinuationsForRow(row: unknown): readonly Continuation[] {
  const source = rowSource(row);
  if (source === undefined) {
    return [];
  }
  return [
    {
      id: `product.vocabulary:source:${source.filePath}:${source.startLine}:${source.startCharacter}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this product-vocabulary row.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: toInquirySourceRange(source) },
        projection: "text",
      },
      route: {
        plane: NavigationPlane.Inspection,
        relation: NavigationRelation.SourceFor,
        basis: [BasisKind.ProductVocabulary, BasisKind.SourceText],
        summary: "Source backing for a product-vocabulary row.",
      },
    },
  ];
}

function rowSource(row: unknown): ProductClaimSignatureIssueRow["source"] | undefined {
  if (typeof row !== "object" || row === null) {
    return undefined;
  }
  const candidate = row as { readonly source?: ProductClaimSignatureIssueRow["source"] };
  return candidate.source;
}

function summaryContinuations(inquiry: Inquiry): readonly Continuation[] {
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

function commonContinuations(inquiry: Inquiry): readonly Continuation[] {
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
      ...(inquiry.filters === undefined ? {} : { filters: inquiry.filters }),
      ...(inquiry.budget === undefined ? {} : { budget: inquiry.budget }),
    },
    route: {
      plane: NavigationPlane.Structure,
      relation: NavigationRelation.ProjectionOf,
      basis: [BasisKind.ProductVocabulary],
      summary: `Product vocabulary ${projection} projection.`,
    },
  };
}

function nextPageContinuation(
  inquiry: Inquiry,
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  if (nextOffset === undefined) {
    return [];
  }
  return [
    {
      id: "product.vocabulary:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue product vocabulary rows.",
      inquiry: {
        lens: LensId.ProductVocabulary,
        locus: inquiry.locus,
        projection: inquiry.projection,
        ...(inquiry.filters === undefined ? {} : { filters: inquiry.filters }),
        ...(inquiry.budget === undefined ? {} : { budget: inquiry.budget }),
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: {
        plane: NavigationPlane.Addressing,
        relation: NavigationRelation.NextPageOf,
        basis: [BasisKind.ProductVocabulary],
        summary: "Next product vocabulary row page.",
      },
    },
  ];
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

function rowLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.rows, 80, 500);
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 50);
}

function stringFilter(inquiry: Inquiry, id: string): string | undefined {
  const value = inquiry.filters?.[id];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function matches(value: string, expected: string | undefined): boolean {
  return expected === undefined || value === expected;
}

function queryMatches(inquiry: Inquiry, values: readonly string[]): boolean {
  const query = stringFilter(inquiry, "query");
  if (query === undefined) {
    return true;
  }
  const normalized = query.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalized));
}
