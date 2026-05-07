import {
  readAureliaApiUsageIndex,
  type AureliaApiFacetRow,
  type AureliaApiImplementationShapeRow,
  type AureliaApiMemberSlotRow,
  type AureliaApiMergeEdgeRow,
  type AureliaApiShapeEdgeRow,
  type AureliaApiSubjectRow,
  type AureliaApiUsageIndex,
  type AureliaApiUsageRollup,
  type AureliaApiUsageRow,
} from "../../framework/index.js";
import {
  sourceRangeKey,
  usageCallAggregate,
  type SourceProject,
  type TypeScriptMemberAccessKindId,
  type TypeScriptUsageCallAggregate,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisKind, type Basis } from "../basis.js";
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
  evidenceBreadcrumb,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset } from "../paging.js";
import {
  FrameworkRowContinuationBuilder,
  nextPageContinuation,
} from "./framework-continuation-core.js";
import {
  checkerBasis,
  sourceIndexBasis,
} from "./framework-support.js";

/** Filters accepted by the framework.api lens. */
export interface FrameworkApiFilters {
  readonly packageId?: string;
  readonly subjectName?: string;
  readonly implementationName?: string;
  readonly exportName?: string;
  readonly memberName?: string;
  readonly consumerPackageId?: string;
  readonly role?: string;
  readonly ownerName?: string;
  readonly ownerKind?: string;
  readonly ownerMemberName?: string;
  readonly callCalleeName?: string;
  readonly callArgumentText?: string;
  readonly callArgumentSymbolName?: string;
  readonly callArgumentFullyQualifiedName?: string;
  readonly relation?: string;
  readonly surfaceKind?: string;
  readonly query?: string;
}

/** Compact public row for one normalized API member slot. */
export interface FrameworkApiMemberSlotSummaryRow {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly name: string;
  readonly slotKind: string;
  readonly facetCount: number;
  readonly declarationCount: number;
  readonly surfaceContributionCount: number;
  readonly usageCount: number;
  readonly accessKinds: Readonly<Record<string, number>>;
  readonly declarationKinds: Readonly<Record<string, number>>;
  readonly firstSource: SourceRange;
  readonly summary: string;
}

/** Detail row for one source declaration contributing to an API member slot. */
export interface FrameworkApiMemberDeclarationRow {
  readonly id: string;
  readonly memberSlotId: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly memberName: string;
  readonly slotKind: string;
  readonly facetIds: readonly string[];
  readonly facetNames: readonly string[];
  readonly surfaceContributionCount: number;
  readonly declarationKind: string;
  readonly accessKinds: Readonly<Record<string, number>>;
  readonly source: SourceRange;
  readonly symbolKey: string | null;
  readonly summary: string;
}

/** Usage rows grouped by the source declaration that owns the usage site. */
export interface FrameworkApiUsageConsumerRow
  extends TypeScriptUsageCallAggregate {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly memberName?: string;
  readonly ownerKind: AureliaApiUsageRow["owner"]["ownerKind"];
  readonly ownerName: string;
  readonly ownerMemberKind?: AureliaApiUsageRow["owner"]["ownerMemberKind"];
  readonly ownerMemberName?: string;
  readonly consumerPackageId: string | null;
  readonly consumerPackageName: string | null;
  readonly usageCount: number;
  readonly usageRoles: Readonly<Record<string, number>>;
  readonly callCalleeNames: Readonly<Record<string, number>>;
  readonly callArgumentTexts: Readonly<Record<string, number>>;
  readonly callArgumentSymbolNames: Readonly<Record<string, number>>;
  readonly callArgumentFullyQualifiedNames: Readonly<Record<string, number>>;
  readonly firstSource: SourceRange;
  readonly ownerSource?: SourceRange;
  readonly ownerMemberSource?: SourceRange;
  readonly summary: string;
}

interface FrameworkApiMemberDeclarationGroup {
  readonly declarationKind: string;
  readonly accessKinds: Readonly<Record<string, number>>;
  readonly source: SourceRange;
  readonly symbolKey: string | null;
  readonly facetIds: readonly string[];
  readonly facetNames: readonly string[];
  readonly surfaceContributionCount: number;
}

/** Value returned by the framework.api runtime lens. */
export interface FrameworkApiValue {
  readonly filters: FrameworkApiFilters;
  readonly rollup: AureliaApiUsageRollup;
  readonly subjects?: readonly AureliaApiSubjectRow[];
  readonly facets?: readonly AureliaApiFacetRow[];
  readonly mergeEdges?: readonly AureliaApiMergeEdgeRow[];
  readonly shapeEdges?: readonly AureliaApiShapeEdgeRow[];
  readonly implementationShapes?: readonly AureliaApiImplementationShapeRow[];
  readonly memberSlots?: readonly FrameworkApiMemberSlotSummaryRow[];
  readonly memberDeclarations?: readonly FrameworkApiMemberDeclarationRow[];
  readonly usages?: readonly AureliaApiUsageRow[];
  readonly usageConsumers?: readonly FrameworkApiUsageConsumerRow[];
}

const SUBJECT_ROW_FAMILY = new PagedRowFamily<AureliaApiSubjectRow>({
  id: "framework.api:subjects",
  rowLabel: "Aurelia API subject row(s)",
  evidenceForRow: evidenceForSubject,
  continuationsForPage: subjectContinuations,
});

const FACET_ROW_FAMILY = new PagedRowFamily<AureliaApiFacetRow>({
  id: "framework.api:facets",
  rowLabel: "Aurelia API facet row(s)",
  evidenceForRow: evidenceForFacet,
  continuationsForPage: facetContinuations,
});

const MERGE_EDGE_ROW_FAMILY = new PagedRowFamily<AureliaApiMergeEdgeRow>({
  id: "framework.api:merge-edges",
  rowLabel: "Aurelia API merge edge row(s)",
  evidenceForRow: evidenceForMergeEdge,
  continuationsForPage: mergeEdgeContinuations,
});

const SHAPE_EDGE_ROW_FAMILY = new PagedRowFamily<AureliaApiShapeEdgeRow>({
  id: "framework.api:shape-edges",
  rowLabel: "Aurelia API shape edge row(s)",
  evidenceForRow: evidenceForShapeEdge,
  continuationsForPage: shapeEdgeContinuations,
});

const IMPLEMENTATION_SHAPE_ROW_FAMILY =
  new PagedRowFamily<AureliaApiImplementationShapeRow>({
    id: "framework.api:implementation-shapes",
    rowLabel: "Aurelia API implementation shape row(s)",
    evidenceForRow: evidenceForImplementationShape,
    continuationsForPage: implementationShapeContinuations,
  });

const MEMBER_SLOT_ROW_FAMILY = new PagedRowFamily<AureliaApiMemberSlotRow>({
  id: "framework.api:member-slots",
  rowLabel: "Aurelia API member slot row(s)",
  evidenceForRow: evidenceForMemberSlot,
  continuationsForPage: memberSlotContinuations,
});

const MEMBER_DECLARATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkApiMemberDeclarationRow>({
    id: "framework.api:member-declarations",
    rowLabel: "Aurelia API member declaration row(s)",
    evidenceForRow: evidenceForMemberDeclaration,
    continuationsForPage: memberDeclarationContinuations,
  });

const USAGE_ROW_FAMILY = new PagedRowFamily<AureliaApiUsageRow>({
  id: "framework.api:usages",
  rowLabel: "Aurelia API usage row(s)",
  evidenceForRow: evidenceForUsage,
  continuationsForPage: usageContinuations,
});

const USAGE_CONSUMER_ROW_FAMILY =
  new PagedRowFamily<FrameworkApiUsageConsumerRow>({
    id: "framework.api:usage-consumers",
    rowLabel: "Aurelia API usage consumer row(s)",
    evidenceForRow: evidenceForUsageConsumer,
    continuationsForPage: usageConsumerContinuations,
  });

/** Answer framework API usage inquiries from exact TypeChecker and source identity rows. */
export function answerFrameworkApi(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkApiValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  const index = readAureliaApiUsageIndex(sourceProject);
  const basis = apiBasis(sourceProject);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);
  const implementationSubjectIds = implementationSubjectIdsForFilters(index, filters);

  if (projection === "subjects") {
    const rows = index.subjects.filter((row) =>
      subjectMatches(row, filters, implementationSubjectIds),
    );
    return SUBJECT_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({ filters, rollup: index.rollup, subjects: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API subject row(s) from ${rows.length} matching subject(s).`,
    });
  }

  if (projection === "facets") {
    const rows = index.facets.filter((row) =>
      facetMatches(row, filters, implementationSubjectIds),
    );
    return FACET_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({ filters, rollup: index.rollup, facets: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API facet row(s) from ${rows.length} matching facet(s).`,
    });
  }

  if (projection === "merge-edges") {
    const rows = index.mergeEdges.filter((row) => edgeMatches(row, filters));
    return MERGE_EDGE_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({ filters, rollup: index.rollup, mergeEdges: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API merge edge row(s) from ${rows.length} matching edge(s).`,
    });
  }

  if (projection === "shape-edges") {
    const rows = index.shapeEdges.filter((row) => edgeMatches(row, filters));
    return SHAPE_EDGE_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({ filters, rollup: index.rollup, shapeEdges: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API shape edge row(s) from ${rows.length} matching edge(s).`,
    });
  }

  if (projection === "implementation-shapes") {
    const rows = index.implementationShapes.filter((row) =>
      implementationShapeMatches(row, filters),
    );
    return IMPLEMENTATION_SHAPE_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({
        filters,
        rollup: index.rollup,
        implementationShapes: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API implementation shape row(s) from ${rows.length} matching shape(s).`,
    });
  }

  if (projection === "member-slots") {
    const rows = index.memberSlots.filter((row) =>
      memberSlotMatches(row, filters, implementationSubjectIds),
    );
    return MEMBER_SLOT_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({
        filters,
        rollup: index.rollup,
        memberSlots: page.rows.map(compactMemberSlotRow),
      }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API member slot row(s) from ${rows.length} matching slot(s).`,
    });
  }

  if (projection === "member-declarations") {
    const slots = index.memberSlots.filter((row) =>
      memberSlotMatches(row, filters, implementationSubjectIds),
    );
    const rows = slots.flatMap(memberDeclarationRowsForSlot);
    return MEMBER_DECLARATION_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({
        filters,
        rollup: index.rollup,
        memberDeclarations: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API member declaration row(s) from ${rows.length} matching declaration(s).`,
    });
  }

  if (projection === "usages") {
    const rows = index.usages.filter((row) =>
      usageMatches(row, filters, implementationSubjectIds),
    );
    return USAGE_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({ filters, rollup: index.rollup, usages: page.rows }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API usage row(s) from ${rows.length} matching usage(s).`,
    });
  }

  if (projection === "usage-consumers") {
    const matchingUsages = index.usages.filter((row) =>
      usageMatches(row, filters, implementationSubjectIds),
    );
    const rows = usageConsumerRows(matchingUsages)
      .filter((row) => usageConsumerMatches(row, filters, implementationSubjectIds));
    return USAGE_CONSUMER_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis,
      value: (page) => ({
        filters,
        rollup: index.rollup,
        usageConsumers: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} Aurelia API usage consumer row(s) from ${rows.length} matching owner group(s).`,
    });
  }

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Aurelia API usage index has ${index.rollup.subjectCount} subject(s), ${index.rollup.implementationShapeCount} implementation shape(s), ${index.rollup.memberSlotCount} member slot(s), and ${index.rollup.usageCount} repo usage(s).`,
    {
      value: { filters, rollup: index.rollup },
      basis,
      evidence: [],
      continuations: summaryContinuations(inquiry),
    },
  );
}

function apiBasis(sourceProject: SourceProject): readonly Basis[] {
  return [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)];
}

function filtersFromInquiry(inquiry: Inquiry): FrameworkApiFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

function filtersFromRecord(value: unknown): FrameworkApiFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "packageId"),
    ...stringFilter(source, "subjectName"),
    ...stringFilter(source, "implementationName"),
    ...stringFilter(source, "exportName"),
    ...stringFilter(source, "memberName"),
    ...stringFilter(source, "consumerPackageId"),
    ...stringFilter(source, "role"),
    ...stringFilter(source, "ownerName"),
    ...stringFilter(source, "ownerKind"),
    ...stringFilter(source, "ownerMemberName"),
    ...stringFilter(source, "callCalleeName"),
    ...stringFilter(source, "callArgumentText"),
    ...stringFilter(source, "callArgumentSymbolName"),
    ...stringFilter(source, "callArgumentFullyQualifiedName"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "surfaceKind"),
    ...stringFilter(source, "query"),
  };
}

function stringFilter(
  source: Record<string, unknown>,
  key: keyof FrameworkApiFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function implementationSubjectIdsForFilters(
  index: AureliaApiUsageIndex,
  filters: FrameworkApiFilters,
): ReadonlySet<string> | undefined {
  if (filters.implementationName === undefined) {
    return undefined;
  }
  const ids = index.implementationShapes
    .filter((row) => row.implementationName === filters.implementationName)
    .flatMap((row) => row.shapeSubjectIds);
  return new Set(ids);
}

function subjectMatches(
  row: AureliaApiSubjectRow,
  filters: FrameworkApiFilters,
  implementationSubjectIds: ReadonlySet<string> | undefined,
): boolean {
  return (
    (implementationSubjectIds === undefined || implementationSubjectIds.has(row.id)) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.subjectName === undefined || row.name === filters.subjectName) &&
    queryMatches(filters.query, [row.id, row.name, row.packageId, row.summary])
  );
}

function facetMatches(
  row: AureliaApiFacetRow,
  filters: FrameworkApiFilters,
  implementationSubjectIds: ReadonlySet<string> | undefined,
): boolean {
  return (
    (implementationSubjectIds === undefined || implementationSubjectIds.has(row.subjectId)) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.subjectName === undefined || row.localName === filters.subjectName) &&
    (filters.exportName === undefined || row.exportName === filters.exportName) &&
    (filters.surfaceKind === undefined || row.surfaceKind === filters.surfaceKind) &&
    queryMatches(filters.query, [
      row.id,
      row.exportName,
      row.localName,
      row.modulePath,
      row.declarationKind,
    ])
  );
}

function edgeMatches(
  row: AureliaApiMergeEdgeRow | AureliaApiShapeEdgeRow,
  filters: FrameworkApiFilters,
): boolean {
  return (
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.subjectName === undefined ||
      row.fromName === filters.subjectName ||
      row.toName === filters.subjectName) &&
    queryMatches(filters.query, [
      row.id,
      row.fromName,
      row.toName,
      row.relation,
      row.summary,
    ])
  );
}

function implementationShapeMatches(
  row: AureliaApiImplementationShapeRow,
  filters: FrameworkApiFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.implementationName === undefined ||
      row.implementationName === filters.implementationName) &&
    (filters.subjectName === undefined ||
      row.shapeSubjectNames.includes(filters.subjectName)) &&
    queryMatches(filters.query, [
      row.id,
      row.implementationName,
      ...row.shapeSubjectNames,
      ...row.directInterfaceNames,
      row.summary,
    ])
  );
}

function memberSlotMatches(
  row: AureliaApiMemberSlotRow,
  filters: FrameworkApiFilters,
  implementationSubjectIds: ReadonlySet<string> | undefined,
): boolean {
  return (
    (implementationSubjectIds === undefined || implementationSubjectIds.has(row.subjectId)) &&
    (filters.subjectName === undefined || row.subjectName === filters.subjectName) &&
    (filters.memberName === undefined || row.name === filters.memberName) &&
    queryMatches(filters.query, [
      row.id,
      row.subjectName,
      row.name,
      row.slotKind,
      row.summary,
    ])
  );
}

function usageMatches(
  row: AureliaApiUsageRow,
  filters: FrameworkApiFilters,
  implementationSubjectIds: ReadonlySet<string> | undefined,
): boolean {
  return (
    (implementationSubjectIds === undefined || implementationSubjectIds.has(row.subjectId)) &&
    (filters.subjectName === undefined || row.subjectName === filters.subjectName) &&
    (filters.memberName === undefined || row.memberName === filters.memberName) &&
    (filters.consumerPackageId === undefined ||
      row.consumerPackageId === filters.consumerPackageId) &&
    (filters.role === undefined || row.role === filters.role) &&
    (filters.ownerName === undefined || row.owner.ownerName === filters.ownerName) &&
    (filters.ownerKind === undefined || row.owner.ownerKind === filters.ownerKind) &&
    (filters.ownerMemberName === undefined ||
      row.owner.ownerMemberName === filters.ownerMemberName) &&
    usageCallMatches(row, filters) &&
    queryMatches(filters.query, [
      row.id,
      row.subjectName,
      row.memberName ?? "",
      row.role,
      row.filePath,
      row.text,
      row.call?.calleeName ?? "",
      row.call?.calleeText ?? "",
      row.call?.receiverText ?? "",
      ...(row.call?.arguments.flatMap((argument) => [
        argument.text,
        argument.symbolName ?? "",
        argument.fullyQualifiedName ?? "",
      ]) ?? []),
      row.owner.ownerKind,
      row.owner.ownerName,
      row.owner.ownerMemberKind ?? "",
      row.owner.ownerMemberName ?? "",
      row.summary,
    ])
  );
}

function usageCallMatches(
  row: AureliaApiUsageRow,
  filters: FrameworkApiFilters,
): boolean {
  return (
    (filters.callCalleeName === undefined ||
      row.call?.calleeName === filters.callCalleeName) &&
    (hasCallArgumentFilter(filters)
      ? row.call?.arguments.some((argument) =>
          (filters.callArgumentText === undefined ||
            argument.text === filters.callArgumentText) &&
          (filters.callArgumentSymbolName === undefined ||
            argument.symbolName === filters.callArgumentSymbolName) &&
          (filters.callArgumentFullyQualifiedName === undefined ||
            argument.fullyQualifiedName === filters.callArgumentFullyQualifiedName),
        ) === true
      : true)
  );
}

function hasCallArgumentFilter(filters: FrameworkApiFilters): boolean {
  return filters.callArgumentText !== undefined ||
    filters.callArgumentSymbolName !== undefined ||
    filters.callArgumentFullyQualifiedName !== undefined;
}

function usageConsumerRows(
  usages: readonly AureliaApiUsageRow[],
): readonly FrameworkApiUsageConsumerRow[] {
  return [...groupBy(usages, usageConsumerGroupKey).values()]
    .flatMap(usageConsumerRow)
    .sort(compareUsageConsumers);
}

function usageConsumerRow(
  usages: readonly AureliaApiUsageRow[],
): readonly FrameworkApiUsageConsumerRow[] {
  const first = usages[0];
  if (first === undefined) {
    return [];
  }
  const owner = first.owner;
  return [{
    id: [
      "framework-api-usage-consumer",
      first.subjectId,
      first.memberName ?? "<subject>",
      owner.ownerKind,
      owner.ownerName,
      owner.ownerMemberName ?? "<owner>",
      first.consumerPackageId ?? "<external>",
    ].join(":"),
    subjectId: first.subjectId,
    subjectName: first.subjectName,
    ...(first.memberName === undefined ? {} : { memberName: first.memberName }),
    ownerKind: owner.ownerKind,
    ownerName: owner.ownerName,
    ...(owner.ownerMemberKind === undefined ? {} : { ownerMemberKind: owner.ownerMemberKind }),
    ...(owner.ownerMemberName === undefined ? {} : { ownerMemberName: owner.ownerMemberName }),
    consumerPackageId: first.consumerPackageId,
    consumerPackageName: first.consumerPackageName,
    usageCount: usages.length,
    usageRoles: countBy(usages, (usage) => usage.role),
    ...usageCallAggregate(usages),
    firstSource: first.source,
    ...(owner.ownerSource === undefined ? {} : { ownerSource: owner.ownerSource }),
    ...(owner.ownerMemberSource === undefined
      ? {}
      : { ownerMemberSource: owner.ownerMemberSource }),
    summary: `${first.subjectName}${first.memberName === undefined ? "" : `.${first.memberName}`} has ${usages.length} usage site(s) owned by ${owner.ownerName}${owner.ownerMemberName === undefined ? "" : `.${owner.ownerMemberName}`}.`,
  }];
}

function usageConsumerGroupKey(row: AureliaApiUsageRow): string {
  return [
    row.subjectId,
    row.memberName ?? "<subject>",
    row.owner.ownerKind,
    row.owner.ownerName,
    row.owner.ownerMemberName ?? "<owner>",
    row.consumerPackageId ?? "<external>",
  ].join("\0");
}

function usageConsumerMatches(
  row: FrameworkApiUsageConsumerRow,
  filters: FrameworkApiFilters,
  implementationSubjectIds: ReadonlySet<string> | undefined,
): boolean {
  return (
    (implementationSubjectIds === undefined || implementationSubjectIds.has(row.subjectId)) &&
    (filters.subjectName === undefined || row.subjectName === filters.subjectName) &&
    (filters.memberName === undefined || row.memberName === filters.memberName) &&
    (filters.consumerPackageId === undefined ||
      row.consumerPackageId === filters.consumerPackageId) &&
    (filters.role === undefined || row.usageRoles[filters.role] !== undefined) &&
    (filters.ownerName === undefined || row.ownerName === filters.ownerName) &&
    (filters.ownerKind === undefined || row.ownerKind === filters.ownerKind) &&
    (filters.ownerMemberName === undefined ||
      row.ownerMemberName === filters.ownerMemberName) &&
    (filters.callCalleeName === undefined ||
      row.callCalleeNames[filters.callCalleeName] !== undefined) &&
    (filters.callArgumentText === undefined ||
      row.callArgumentTexts[filters.callArgumentText] !== undefined) &&
    (filters.callArgumentSymbolName === undefined ||
      row.callArgumentSymbolNames[filters.callArgumentSymbolName] !== undefined) &&
    (filters.callArgumentFullyQualifiedName === undefined ||
      row.callArgumentFullyQualifiedNames[filters.callArgumentFullyQualifiedName] !== undefined) &&
    queryMatches(filters.query, [
      row.id,
      row.subjectName,
      row.memberName ?? "",
      row.ownerKind,
      row.ownerName,
      row.ownerMemberKind ?? "",
      row.ownerMemberName ?? "",
      row.consumerPackageId ?? "",
      row.consumerPackageName ?? "",
      row.firstSource.filePath,
      row.ownerSource?.filePath ?? "",
      row.ownerMemberSource?.filePath ?? "",
      row.summary,
      ...Object.keys(row.usageRoles),
      ...Object.keys(row.callCalleeNames),
      ...Object.keys(row.callArgumentTexts),
      ...Object.keys(row.callArgumentSymbolNames),
      ...Object.keys(row.callArgumentFullyQualifiedNames),
    ])
  );
}

function compactMemberSlotRow(
  row: AureliaApiMemberSlotRow,
): FrameworkApiMemberSlotSummaryRow {
  const declarations = uniqueMemberDeclarationRefs(row);
  return {
    id: row.id,
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    name: row.name,
    slotKind: row.slotKind,
    facetCount: row.facetCount,
    declarationCount: declarations.length,
    surfaceContributionCount: row.declarations.length,
    usageCount: row.usageCount,
    accessKinds: countBy(declarations, (declaration) => declaration.accessKind),
    declarationKinds: countBy(declarations, (declaration) => declaration.declarationKind),
    firstSource: row.firstSource,
    summary: `${row.subjectName}.${row.name} ${row.slotKind} slot has ${declarations.length} source declaration(s), ${row.declarations.length} surface contribution(s), and ${row.usageCount} repo usage(s)`,
  };
}

function memberDeclarationRowsForSlot(
  slot: AureliaApiMemberSlotRow,
): readonly FrameworkApiMemberDeclarationRow[] {
  return uniqueMemberDeclarationGroups(slot).map((group, index) => ({
    id: `${slot.id}:declaration:${index}:${sourceRangeKey(group.source)}`,
    memberSlotId: slot.id,
    subjectId: slot.subjectId,
    subjectName: slot.subjectName,
    memberName: slot.name,
    slotKind: slot.slotKind,
    facetIds: group.facetIds,
    facetNames: group.facetNames,
    surfaceContributionCount: group.surfaceContributionCount,
    declarationKind: group.declarationKind,
    accessKinds: group.accessKinds,
    source: group.source,
    symbolKey: group.symbolKey,
    summary: `${slot.subjectName}.${slot.name} ${slot.slotKind} source declaration contributes through ${group.surfaceContributionCount} surface(s)`,
  }));
}

function uniqueMemberDeclarationRefs(
  slot: AureliaApiMemberSlotRow,
): readonly AureliaApiMemberSlotRow["declarations"][number][] {
  return uniqueMemberDeclarationGroups(slot).map((group) => ({
    facetId: group.facetIds[0] ?? "",
    facetName: group.facetNames[0] ?? "",
    declarationKind: group.declarationKind,
    accessKind: firstAccessKind(group.accessKinds),
    source: group.source,
    symbolKey: group.symbolKey,
  }));
}

function uniqueMemberDeclarationGroups(
  slot: AureliaApiMemberSlotRow,
): readonly FrameworkApiMemberDeclarationGroup[] {
  const bySource = new Map<string, {
    readonly declarationKind: string;
    readonly accessKinds: Record<string, number>;
    readonly source: SourceRange;
    readonly symbolKey: string | null;
    readonly facetIds: Set<string>;
    readonly facetNames: Set<string>;
    surfaceContributionCount: number;
  }>();
  for (const declaration of slot.declarations) {
    const key = sourceRangeKey(declaration.source);
    const existing = bySource.get(key);
    if (existing === undefined) {
      bySource.set(key, {
        declarationKind: declaration.declarationKind,
        accessKinds: { [declaration.accessKind]: 1 },
        source: declaration.source,
        symbolKey: declaration.symbolKey,
        facetIds: new Set([declaration.facetId]),
        facetNames: new Set([declaration.facetName]),
        surfaceContributionCount: 1,
      });
      continue;
    }
    existing.facetIds.add(declaration.facetId);
    existing.facetNames.add(declaration.facetName);
    existing.accessKinds[declaration.accessKind] = (existing.accessKinds[declaration.accessKind] ?? 0) + 1;
    existing.surfaceContributionCount += 1;
  }
  return [...bySource.values()]
    .map((group) => ({
      declarationKind: group.declarationKind,
      accessKinds: sortedRecord(group.accessKinds),
      source: group.source,
      symbolKey: group.symbolKey,
      facetIds: [...group.facetIds].sort((left, right) => left.localeCompare(right)),
      facetNames: [...group.facetNames].sort((left, right) => left.localeCompare(right)),
      surfaceContributionCount: group.surfaceContributionCount,
    }))
    .sort((left, right) =>
      left.source.filePath.localeCompare(right.source.filePath) ||
      left.source.start.line - right.source.start.line ||
      left.source.start.character - right.source.start.character ||
      left.declarationKind.localeCompare(right.declarationKind),
    );
}

function firstAccessKind(accessKinds: Readonly<Record<string, number>>): TypeScriptMemberAccessKindId {
  return (Object.keys(accessKinds).sort((left, right) => left.localeCompare(right))[0] ?? "public") as TypeScriptMemberAccessKindId;
}

function sortedRecord(record: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function countBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function groupBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): ReadonlyMap<string, readonly TValue[]> {
  const grouped = new Map<string, TValue[]>();
  for (const row of rows) {
    const key = keyFor(row);
    const existing = grouped.get(key);
    if (existing === undefined) {
      grouped.set(key, [row]);
    } else {
      existing.push(row);
    }
  }
  return grouped;
}

function compareUsageConsumers(
  left: FrameworkApiUsageConsumerRow,
  right: FrameworkApiUsageConsumerRow,
): number {
  return left.subjectName.localeCompare(right.subjectName) ||
    (left.memberName === undefined ? 1 : 0) - (right.memberName === undefined ? 1 : 0) ||
    (left.memberName ?? "").localeCompare(right.memberName ?? "") ||
    left.ownerName.localeCompare(right.ownerName) ||
    (left.ownerMemberName ?? "").localeCompare(right.ownerMemberName ?? "") ||
    right.usageCount - left.usageCount ||
    left.id.localeCompare(right.id);
}

function queryMatches(query: string | undefined, values: readonly string[]): boolean {
  return query === undefined || values.some((value) => value.includes(query));
}

function evidenceForSubject(row: AureliaApiSubjectRow): Evidence {
  return evidenceForSourceRow(row.id, EvidenceKind.Symbol, row.summary, row.firstSource, row);
}

function evidenceForFacet(row: AureliaApiFacetRow): Evidence {
  return evidenceForSourceRow(
    row.id,
    EvidenceKind.Symbol,
    `${row.surfaceKind} ${row.packageId}:${row.exportName} -> ${row.localName}`,
    row.source,
    row,
  );
}

function evidenceForMergeEdge(row: AureliaApiMergeEdgeRow): Evidence {
  return evidenceForSourceRow(row.id, EvidenceKind.TypeFact, row.summary, row.source, row);
}

function evidenceForShapeEdge(row: AureliaApiShapeEdgeRow): Evidence {
  return evidenceForSourceRow(row.id, EvidenceKind.TypeFact, row.summary, row.source, row);
}

function evidenceForImplementationShape(
  row: AureliaApiImplementationShapeRow,
): Evidence {
  return evidenceForSourceRow(row.id, EvidenceKind.TypeFact, row.summary, row.firstSource, row);
}

function evidenceForMemberSlot(row: AureliaApiMemberSlotRow): Evidence {
  return evidenceForSourceRow(
    row.id,
    EvidenceKind.TypeFact,
    row.summary,
    row.firstSource,
    compactMemberSlotRow(row),
  );
}

function evidenceForMemberDeclaration(
  row: FrameworkApiMemberDeclarationRow,
): Evidence {
  return evidenceForSourceRow(row.id, EvidenceKind.TypeFact, row.summary, row.source, row);
}

function evidenceForUsage(row: AureliaApiUsageRow): Evidence {
  return evidenceForSourceRow(row.id, EvidenceKind.TypeFact, row.summary, row.source, row);
}

function evidenceForUsageConsumer(row: FrameworkApiUsageConsumerRow): Evidence {
  return evidenceForSourceRow(
    row.id,
    EvidenceKind.TypeFact,
    row.summary,
    row.firstSource,
    {
      subjectName: row.subjectName,
      memberName: row.memberName,
      ownerKind: row.ownerKind,
      ownerName: row.ownerName,
      ownerMemberKind: row.ownerMemberKind,
      ownerMemberName: row.ownerMemberName,
      consumerPackageId: row.consumerPackageId,
      usageCount: row.usageCount,
      usageRoles: row.usageRoles,
    },
  );
}

function evidenceForSourceRow(
  id: string,
  kind: EvidenceKind,
  summary: string,
  source: SourceRange,
  data: unknown,
): Evidence {
  return {
    id,
    kind,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary,
    source,
    data,
  };
}

function summaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(inquiry, "subjects", "Inspect merged API declaration subjects."),
    projectionContinuation(inquiry, "implementation-shapes", "Inspect class-rooted API implementation shapes."),
    projectionContinuation(inquiry, "member-slots", "Inspect normalized API member slots."),
    projectionContinuation(inquiry, "usages", "Inspect repo-wide TypeChecker-resolved API usage rows."),
    projectionContinuation(inquiry, "usage-consumers", "Group API usage rows by owning declaration."),
    projectionContinuation(inquiry, "shape-edges", "Inspect exact implementation and interface-extension shape edges."),
  ];
}

function projectionContinuation(
  inquiry: Inquiry,
  projection: string,
  rationale: string,
): Continuation {
  return {
    id: `framework.api:${projection}`,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      lens: LensId.FrameworkApi,
      locus: inquiry.locus,
      projection,
      filters: inquiry.filters,
      budget: inquiry.budget,
    },
  };
}

function sourceAndTypeContinuations(
  inquiry: Inquiry,
  idPrefix: string,
  index: number,
  source: SourceRange,
  evidence: Evidence,
): readonly Continuation[] {
  const builder = new FrameworkRowContinuationBuilder(
    inquiry,
    idPrefix,
    index,
    evidenceBreadcrumb(evidence),
  );
  return [
    builder.source(
      "source",
      source,
      "Inspect the source behind this API row.",
      "Source range behind an Aurelia API row.",
    ),
    builder.typeFacts(
      "type",
      source,
      "Inspect TypeChecker facts for this API row.",
      "TypeChecker facts behind an Aurelia API row.",
      { basis: [BasisKind.TypeScriptChecker] },
    ),
  ];
}

function subjectContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiSubjectRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:subjects", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) => [
      ...sourceAndTypeContinuations(inquiry, "framework.api:subjects", index, row.firstSource, evidenceForSubject(row)),
      projectionForSubject(inquiry, row.name, "member-slots", index),
      projectionForSubject(inquiry, row.name, "usages", index),
      projectionForSubject(inquiry, row.name, "usage-consumers", index),
      projectionForSubject(inquiry, row.name, "shape-edges", index),
    ]),
  ];
}

function facetContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiFacetRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:facets", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) =>
      sourceAndTypeContinuations(inquiry, "framework.api:facets", index, row.source, evidenceForFacet(row)),
    ),
  ];
}

function mergeEdgeContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiMergeEdgeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return edgeContinuations(inquiry, "framework.api:merge-edges", rows, nextOffset, limit, evidenceForMergeEdge);
}

function shapeEdgeContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiShapeEdgeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return edgeContinuations(inquiry, "framework.api:shape-edges", rows, nextOffset, limit, evidenceForShapeEdge);
}

function implementationShapeContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiImplementationShapeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:implementation-shapes", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) => [
      ...sourceAndTypeContinuations(inquiry, "framework.api:implementation-shapes", index, row.firstSource, evidenceForImplementationShape(row)),
      projectionForImplementation(inquiry, row.implementationName, "subjects", index),
      projectionForImplementation(inquiry, row.implementationName, "member-slots", index),
      projectionForImplementation(inquiry, row.implementationName, "usages", index),
      projectionForImplementation(inquiry, row.implementationName, "usage-consumers", index),
    ]),
  ];
}

function memberSlotContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiMemberSlotRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:member-slots", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) => [
      ...sourceAndTypeContinuations(inquiry, "framework.api:member-slots", index, row.firstSource, evidenceForMemberSlot(row)),
      projectionForSubject(inquiry, row.subjectName, "member-declarations", index, { memberName: row.name }),
      projectionForSubject(inquiry, row.subjectName, "usages", index, { memberName: row.name }),
      projectionForSubject(inquiry, row.subjectName, "usage-consumers", index, { memberName: row.name }),
    ]),
  ];
}

function memberDeclarationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkApiMemberDeclarationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:member-declarations", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) =>
      sourceAndTypeContinuations(
        inquiry,
        "framework.api:member-declarations",
        index,
        row.source,
        evidenceForMemberDeclaration(row),
      ),
    ),
  ];
}

function usageContinuations(
  inquiry: Inquiry,
  rows: readonly AureliaApiUsageRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:usages", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) => [
      ...sourceAndTypeContinuations(inquiry, "framework.api:usages", index, row.source, evidenceForUsage(row)),
      projectionForSubject(inquiry, row.subjectName, "usage-consumers", index, {
        ...(row.memberName === undefined ? {} : { memberName: row.memberName }),
        ownerName: row.owner.ownerName,
        ...(row.owner.ownerMemberName === undefined
          ? {}
          : { ownerMemberName: row.owner.ownerMemberName }),
      }),
    ]),
  ];
}

function usageConsumerContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkApiUsageConsumerRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, "framework.api:usage-consumers", nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) => {
      const evidence = evidenceForUsageConsumer(row);
      const continuations: Continuation[] = [
        ...sourceAndTypeContinuations(
          inquiry,
          "framework.api:usage-consumers",
          index,
          row.firstSource,
          evidence,
        ),
        projectionForSubject(inquiry, row.subjectName, "usages", index, {
          ...(row.memberName === undefined ? {} : { memberName: row.memberName }),
          ownerName: row.ownerName,
          ...(row.ownerMemberName === undefined
            ? {}
            : { ownerMemberName: row.ownerMemberName }),
        }),
      ];
      if (row.ownerSource !== undefined) {
        continuations.push(
          sourceContinuation(
            inquiry,
            "framework.api:usage-consumers",
            index,
            "owner-source",
            row.ownerSource,
            evidence,
            "Inspect the owner declaration for this usage group.",
          ),
        );
      }
      if (row.ownerMemberSource !== undefined) {
        continuations.push(
          sourceContinuation(
            inquiry,
            "framework.api:usage-consumers",
            index,
            "owner-member-source",
            row.ownerMemberSource,
            evidence,
            "Inspect the owner member declaration for this usage group.",
          ),
          callSitesContinuation(
            inquiry,
            "framework.api:usage-consumers",
            index,
            "owner-member-calls",
            row.ownerMemberSource,
            evidence,
            "Inspect TypeChecker call sites inside the owner member for this usage group.",
          ),
        );
        if (row.memberName !== undefined && row.usageRoles["member-call"] !== undefined) {
          continuations.push(
            callSitesContinuation(
              inquiry,
              "framework.api:usage-consumers",
              index,
              "owner-member-api-calls",
              row.ownerMemberSource,
              evidence,
              "Inspect TypeChecker call sites for the consumed API member inside the owner member.",
              {
                calleeName: row.memberName,
                ...singletonRecordFilter(row.callArgumentTexts, "argumentText"),
                ...singletonRecordFilter(row.callArgumentSymbolNames, "argumentSymbolName"),
                ...singletonRecordFilter(
                  row.callArgumentFullyQualifiedNames,
                  "argumentFullyQualifiedName",
                ),
                ...callSiteFiltersFromFrameworkFilters(inquiry.filters),
              },
            ),
          );
        }
      }
      return continuations;
    }),
  ];
}

function edgeContinuations<TRow extends AureliaApiMergeEdgeRow | AureliaApiShapeEdgeRow>(
  inquiry: Inquiry,
  idPrefix: string,
  rows: readonly TRow[],
  nextOffset: number | undefined,
  limit: number,
  evidence: (row: TRow) => Evidence,
): readonly Continuation[] {
  return [
    ...nextPage(inquiry, idPrefix, nextOffset, limit),
    ...rows.slice(0, 4).flatMap((row, index) =>
      sourceAndTypeContinuations(inquiry, idPrefix, index, row.source, evidence(row)),
    ),
  ];
}

function sourceContinuation(
  inquiry: Inquiry,
  idPrefix: string,
  index: number,
  idSuffix: string,
  source: SourceRange,
  evidence: Evidence,
  rationale: string,
): Continuation {
  const builder = new FrameworkRowContinuationBuilder(
    inquiry,
    idPrefix,
    index,
    evidenceBreadcrumb(evidence),
  );
  return builder.source(
    idSuffix,
    source,
    rationale,
    "Source range behind an Aurelia API row.",
    { priority: ContinuationPriority.Secondary },
  );
}

function callSitesContinuation(
  inquiry: Inquiry,
  idPrefix: string,
  index: number,
  idSuffix: string,
  source: SourceRange,
  evidence: Evidence,
  rationale: string,
  filters?: Inquiry["filters"],
): Continuation {
  const builder = new FrameworkRowContinuationBuilder(
    inquiry,
    idPrefix,
    index,
    evidenceBreadcrumb(evidence),
  );
  return builder.callSites(
    idSuffix,
    source,
    rationale,
    "Call sites inside an Aurelia API usage owner.",
    { priority: ContinuationPriority.Secondary, filters },
  );
}

function singletonRecordFilter(
  values: Readonly<Record<string, number>>,
  key: string,
): Record<string, string> {
  const entries = Object.keys(values);
  return entries.length === 1 ? { [key]: entries[0]! } : {};
}

function callSiteFiltersFromFrameworkFilters(
  filters: Inquiry["filters"],
): Record<string, string> {
  if (filters === undefined) {
    return {};
  }
  return {
    ...stringField(filters, "callArgumentText", "argumentText"),
    ...stringField(filters, "callArgumentSymbolName", "argumentSymbolName"),
    ...stringField(
      filters,
      "callArgumentFullyQualifiedName",
      "argumentFullyQualifiedName",
    ),
  };
}

function stringField(
  source: Readonly<Record<string, unknown>>,
  sourceKey: string,
  targetKey: string,
): Record<string, string> {
  const value = source[sourceKey];
  return typeof value === "string" && value.length > 0 ? { [targetKey]: value } : {};
}

function projectionForSubject(
  inquiry: Inquiry,
  subjectName: string,
  projection: string,
  index: number,
  extraFilters: FrameworkApiFilters = {},
): Continuation {
  return {
    id: `framework.api:${projection}:subject:${index}`,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Secondary,
    rationale: `Inspect ${projection} for ${subjectName}.`,
    inquiry: {
      lens: LensId.FrameworkApi,
      locus: inquiry.locus,
      projection,
      filters: {
        ...inquiry.filters,
        subjectName,
        ...extraFilters,
      },
      budget: inquiry.budget,
    },
  };
}

function projectionForImplementation(
  inquiry: Inquiry,
  implementationName: string,
  projection: string,
  index: number,
): Continuation {
  return {
    id: `framework.api:${projection}:implementation:${index}`,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Secondary,
    rationale: `Inspect ${projection} for the ${implementationName} implementation shape.`,
    inquiry: {
      lens: LensId.FrameworkApi,
      locus: inquiry.locus,
      projection,
      filters: {
        ...inquiry.filters,
        implementationName,
      },
      budget: inquiry.budget,
    },
  };
}

function nextPage(
  inquiry: Inquiry,
  idPrefix: string,
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return nextOffset === undefined
    ? []
    : [
        nextPageContinuation(
          inquiry,
          `${idPrefix}:next-page`,
          "Continue Aurelia API rows.",
          nextOffset,
          limit,
        ),
      ];
}
