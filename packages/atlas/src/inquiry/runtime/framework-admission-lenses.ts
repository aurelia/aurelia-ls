import {
  FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION,
  FrameworkBundleAssociationKind,
  classifyFrameworkAdmissionAssociation,
  type FrameworkAdmissionRelationshipRow,
} from "../../framework/admission.js";
import {
  FrameworkAdmissionMaterializationLinkKind,
  FrameworkAdmissionWorldFormationStatus,
  type FrameworkAdmissionWorldFormationRow,
} from "../../framework/admission-world.js";
import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  type SourceProject,
  type SourceTargetRow,
} from "../../source/index.js";
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
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import {
  evidenceLimit,
  pageOffset,
} from "../paging.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";
import {
  readFrameworkAdmissionMaterializationLinks,
  type FrameworkAdmissionMaterializationLinkRow,
} from "./framework-admission-materialization.js";
import { frameworkAdmissionContinuationPlanner } from "./framework-admission-continuations.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import {
  readFrameworkAdmissionWorldFormationRows,
} from "./framework-admission-world-formation.js";
import {
  FrameworkAdmissionFlowCorridor,
  readFrameworkAdmissionFlow,
  type FrameworkAdmissionFlowEdgeRow,
  type FrameworkAdmissionFlowEdgeSummaryRow,
  type FrameworkAdmissionFlowNodeRow,
  type FrameworkAdmissionFlowValue,
} from "./framework-admission-flow.js";
import {
  FRAMEWORK_JIT_COMPILER_ACTOR,
  frameworkTemplateCompilerFilters,
} from "./framework-jit-compiler-corridor.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import {
  countBy,
  route,
  sourceRangeForCallSiteEntry,
  sourceRangeForTarget,
} from "./framework-support.js";
import { readFrameworkBundles } from "./framework-bundles.js";
import {
  type FrameworkBundleAssociationRow,
  type FrameworkBundleExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";

/** Compact bundle row returned by framework.admission bundle projections. */
export interface FrameworkAdmissionBundleSummaryRow {
  /** Source bundle row id. */
  readonly id: string;
  /** Package that owns the bundle source. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Exported configuration or bundle name. */
  readonly exportName: string;
  /** Number of evaluator effects observed on the bundle source. */
  readonly effectCount: number;
  /** Number of evaluator open seams observed on the bundle source. */
  readonly openSeamCount: number;
  /** Relationship rows retained for this bundle after admission filtering. */
  readonly relationshipCount: number;
  /** Relationship counts by semantic admission relation. */
  readonly relations: Readonly<Record<string, number>>;
  /** Relationship counts by admitted target endpoint kind. */
  readonly endpointKinds: Readonly<Record<string, number>>;
  /** Counts by source bundle association kind. */
  readonly associationKinds: Readonly<Record<string, number>>;
  /** Best source anchor for the bundle or its first retained association. */
  readonly source?: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Value returned by framework.admission. */
export interface FrameworkAdmissionValue {
  /** Admission relationship schema version. */
  readonly version: string;
  /** Whether this value closed the requested scope or intentionally returned a cheap orientation. */
  readonly scope: "closed" | "requires-narrowing";
  /** Number of bundle/configuration rows after filtering. */
  readonly bundleCount: number | null;
  /** Number of admission relationship rows after filtering. */
  readonly relationshipCount: number | null;
  /** Relationship counts grouped by semantic relation. */
  readonly relations: Readonly<Record<string, number>>;
  /** Relationship counts grouped by source/runtime mechanism. */
  readonly mechanisms: Readonly<Record<string, number>>;
  /** Relationship counts grouped by world phase. */
  readonly phases: Readonly<Record<string, number>>;
  /** Relationship counts grouped by admitted target endpoint kind. */
  readonly endpointKinds: Readonly<Record<string, number>>;
  /** Relationship counts grouped by original bundle association kind. */
  readonly associationKinds: Readonly<Record<string, number>>;
  /** Bundle/configuration summary rows returned by bundle projections. */
  readonly bundles?: readonly FrameworkAdmissionBundleSummaryRow[];
  /** Admission relationship rows returned by relationship/fact projections. */
  readonly relationships?: readonly FrameworkAdmissionRelationshipRow[];
  /** Number of admission-to-materialization bridge rows after filtering. */
  readonly materializationLinkCount?: number;
  /** Bridge row counts grouped by bridge class. */
  readonly materializationLinkKinds?: Readonly<Record<string, number>>;
  /** Bridge row counts grouped by materialization class. */
  readonly materializationKinds?: Readonly<Record<string, number>>;
  /** Bridge row counts grouped by exact match basis. */
  readonly matchBases?: Readonly<Record<string, number>>;
  /** Admission-to-materialization bridge rows returned by materialization projections. */
  readonly materializationLinks?: readonly FrameworkAdmissionMaterializationLinkRow[];
  /** Number of admission-to-world-formation rows after filtering. */
  readonly worldFormationCount?: number;
  /** World-formation row counts grouped by formation kind. */
  readonly worldFormationKinds?: Readonly<Record<string, number>>;
  /** World-formation row counts grouped by status. */
  readonly worldFormationStatuses?: Readonly<Record<string, number>>;
  /** Admission-to-world-formation rows returned by world-formation projections. */
  readonly worldFormations?: readonly FrameworkAdmissionWorldFormationRow[];
  /** Configuration-to-world flow graph value returned by the flow projection. */
  readonly flow?: FrameworkAdmissionFlowValue;
}

interface FrameworkAdmissionFilters extends FrameworkDiscoveryFilters {
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly associationKind?: string;
  readonly targetName?: string;
  readonly resourceKind?: string;
  readonly key?: string;
  readonly linkKind?: string;
  readonly materializationKind?: string;
  readonly matchBasis?: string;
  readonly formationKind?: string;
  readonly status?: string;
  readonly slotName?: string;
  readonly appTaskExecutionKind?: string;
  readonly certainty?: string;
  readonly corridor?: string;
  readonly edgeKind?: string;
  readonly nodeKind?: string;
  readonly role?: string;
}

const ADMISSION_BUNDLE_ROW_FAMILY =
  new PagedRowFamily<FrameworkAdmissionBundleSummaryRow>({
    id: "framework.admission:bundles",
    rowLabel: "framework admission bundle row(s)",
    evidenceForRow: evidenceForBundle,
    continuationsForPage: bundleContinuations,
  });

const ADMISSION_MATERIALIZATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkAdmissionMaterializationLinkRow>({
    id: "framework.admission:materializations",
    rowLabel: "framework admission materialization link row(s)",
    evidenceForRow: evidenceForMaterializationLink,
    continuationsForPage: materializationLinkContinuations,
  });

const ADMISSION_WORLD_FORMATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkAdmissionWorldFormationRow>({
    id: "framework.admission:world-formation",
    rowLabel: "framework admission world-formation row(s)",
    evidenceForRow: evidenceForWorldFormation,
    continuationsForPage: worldFormationContinuations,
  });

const ADMISSION_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkAdmissionRelationshipRow>({
    id: "framework.admission:relationships",
    rowLabel: "framework admission relationship row(s)",
    evidenceForRow: evidenceForRelationship,
    continuationsForPage: relationshipContinuations,
  });

const ADMISSION_FLOW_ROW_FAMILY =
  new PagedRowFamily<FrameworkAdmissionFlowEdgeRow>({
    id: "framework.admission:flow-edges",
    rowLabel: "framework admission flow edge row(s)",
    evidenceForRow: evidenceForFlowEdge,
    continuationsForPage: flowEdgeContinuations,
  });

const ADMISSION_FLOW_NODE_ROW_FAMILY =
  new PagedRowFamily<FrameworkAdmissionFlowNodeRow>({
    id: "framework.admission:flow-nodes",
    rowLabel: "framework admission flow node row(s)",
    evidenceForRow: evidenceForFlowNode,
    continuationsForPage: flowNodeContinuations,
  });

/** Answer framework.admission inquiries from evaluator-derived bundle admission rows. */
export function answerFrameworkAdmission(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkAdmissionValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  if (projection === "summary" && !hasExactAdmissionScope(filters)) {
    return createAnswer(
      inquiry,
      OutcomeKind.Partial,
      "Returned a cheap framework admission orientation. Narrow by packageId or exportName to compute evaluator-derived admission counts.",
      {
        value: {
          version: FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION,
          scope: "requires-narrowing",
          bundleCount: null,
          relationshipCount: null,
          relations: {},
          mechanisms: {},
          phases: {},
          endpointKinds: {},
          associationKinds: {},
        },
        basis: [frameworkAdmissionBasis(sourceProject)],
        continuations: broadSummaryContinuations(inquiry, sourceProject),
      },
    );
  }
  const relationshipFilters = relationshipFiltersForProjection(
    projection,
    filters,
  );
  const bundles = readFrameworkBundles(sourceProject, relationshipFilters);
  const relationships = bundles
    .flatMap((bundle) => relationshipsForBundle(bundle))
    .filter((row) => relationshipProjectionRows(row, projection))
    .filter((row) => relationshipMatches(row, relationshipFilters));
  const bundleSummaries = bundleSummariesForRelationships(
    bundles,
    relationships,
  ).filter((row) => bundleMatches(row, relationshipFilters));
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);
  const basis = [frameworkAdmissionBasis(sourceProject)];

  if (projection === "bundles") {
    return ADMISSION_BUNDLE_ROW_FAMILY.answer({
      inquiry,
      rows: bundleSummaries,
      limit,
      offset,
      basis,
      value: (page) =>
        valueSummary(bundleSummaries, relationships, {
          bundles: page.rows,
        }),
    });
  }

  if (projection === "materializations") {
    const materializationLinks = readFrameworkAdmissionMaterializationLinks(
      sourceProject,
      relationships,
      filters,
    );
    return ADMISSION_MATERIALIZATION_ROW_FAMILY.answer({
      inquiry,
      rows: materializationLinks,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...valueSummary(bundleSummaries, relationships),
        materializationLinkCount: materializationLinks.length,
        materializationLinkKinds: countBy(
          materializationLinks,
          (row) => row.linkKind,
        ),
        materializationKinds: countBy(
          materializationLinks,
          (row) => row.materializationKind,
        ),
        matchBases: countBy(materializationLinks, (row) => row.matchBasis),
        materializationLinks: page.rows,
      }),
    });
  }

  if (projection === "world-formation") {
    const worldFormations = readFrameworkAdmissionWorldFormationRows(
      sourceProject,
      relationships,
      filters,
    );
    return ADMISSION_WORLD_FORMATION_ROW_FAMILY.answer({
      inquiry,
      rows: worldFormations,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...valueSummary(bundleSummaries, relationships),
        worldFormationCount: worldFormations.length,
        worldFormationKinds: countBy(
          worldFormations,
          (row) => row.formationKind,
        ),
        worldFormationStatuses: countBy(
          worldFormations,
          (row) => row.status,
        ),
        worldFormations: page.rows,
      }),
    });
  }

  if (projection === "flow") {
    const flow = readFrameworkAdmissionFlow(
      sourceProject,
      relationships,
      filters,
    );
    return createAnswer(
      inquiry,
      flow.edges.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Framework admission flow has ${flow.value.nodeCount} node(s) and ${flow.value.edgeCount} edge(s).`,
      {
        value: {
          ...valueSummary(bundleSummaries, relationships),
          flow: flow.value,
        },
        basis,
        continuations: flowSummaryContinuations(inquiry, filters),
      },
    );
  }

  if (projection === "flow-edges") {
    const flow = readFrameworkAdmissionFlow(
      sourceProject,
      relationships,
      filters,
    );
    return ADMISSION_FLOW_ROW_FAMILY.answer({
      inquiry,
      rows: flow.edges,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...valueSummary(bundleSummaries, relationships),
        flow: {
          ...flow.value,
          edges: page.rows.map(flowEdgeSummaryRow),
        },
      }),
    });
  }

  if (projection === "flow-edge-details") {
    const flow = readFrameworkAdmissionFlow(
      sourceProject,
      relationships,
      filters,
    );
    return ADMISSION_FLOW_ROW_FAMILY.answer({
      inquiry,
      rows: flow.edges,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...valueSummary(bundleSummaries, relationships),
        flow: {
          ...flow.value,
          edgeDetails: page.rows,
        },
      }),
    });
  }

  if (projection === "flow-nodes") {
    const flow = readFrameworkAdmissionFlow(
      sourceProject,
      relationships,
      filters,
    );
    return ADMISSION_FLOW_NODE_ROW_FAMILY.answer({
      inquiry,
      rows: flow.nodes,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...valueSummary(bundleSummaries, relationships),
        flow: {
          ...flow.value,
          nodes: page.rows,
        },
      }),
    });
  }

  if (
    projection === "relationships" ||
    projection === "facts" ||
    projection === "di" ||
    projection === "resources" ||
    projection === "registries" ||
    projection === "catalogs" ||
    projection === "factories" ||
    projection === "app-tasks" ||
    projection === "evidence"
  ) {
    return ADMISSION_RELATIONSHIP_ROW_FAMILY.answer({
      inquiry,
      rows: relationships,
      limit,
      offset,
      basis,
      value: (page) =>
        valueSummary(bundleSummaries, relationships, {
          relationships: page.rows,
        }),
      openSeams: (page, evidence) =>
        openSeamsForRelationships(page.rows, evidence),
    });
  }

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Framework admission has ${bundleSummaries.length} bundle row(s) and ${relationships.length} relationship row(s).`,
    {
      value: valueSummary(bundleSummaries, relationships),
      basis,
      evidence: [
        ...bundleSummaries.slice(0, 2).map(evidenceForBundle),
        ...relationships.slice(0, 4).map(evidenceForRelationship),
      ],
      openSeams: openSeamsForRelationships(
        relationships.slice(0, evidenceLimit(inquiry)),
        [],
      ),
      continuations: summaryContinuations(inquiry),
    },
  );
}

function relationshipsForBundle(
  bundle: FrameworkBundleExportRow,
): readonly FrameworkAdmissionRelationshipRow[] {
  return bundle.associations.map((association) =>
    relationshipForAssociation(bundle, association),
  );
}

function relationshipForAssociation(
  bundle: FrameworkBundleExportRow,
  association: FrameworkBundleAssociationRow,
): FrameworkAdmissionRelationshipRow {
  const classification = classifyFrameworkAdmissionAssociation(association);
  const from = endpointForBundle(bundle, association);
  const to = endpointForAssociation(association);
  return {
    id: `framework-admission:${association.id}`,
    version: FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION,
    packageId: association.packageId,
    packageName: association.packageName,
    exportName: association.exportName,
    relation: classification.relation,
    mechanism: classification.mechanism,
    phase: classification.phase,
    associationKind: association.associationKind,
    certainty: association.certainty,
    effectId: association.effectId,
    effectSequence: association.effectSequence,
    argumentIndex: association.argumentIndex,
    spread: association.spread,
    path: association.path,
    catalogName: association.catalogName,
    helperName: association.helperName,
    targetName: association.targetName,
    from,
    to,
    source: association.source,
    bundleAssociationId: association.id,
    bundleId: bundle.id,
    summary: `${association.packageId}:${association.exportName} ${classification.relation} ${to.name} via ${classification.mechanism}.`,
  };
}

function endpointForBundle(
  bundle: FrameworkBundleExportRow,
  association: FrameworkBundleAssociationRow,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.ConfigurationExport,
    name: bundle.exportEntry.exportName,
    packageId: bundle.packageId,
    packageName: bundle.packageName,
    source: sourceRangeForExportEntry(bundle) ?? association.source,
  };
}

function endpointForAssociation(
  association: FrameworkBundleAssociationRow,
): FrameworkRelationshipEndpoint {
  if (association.diInterface !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.DiKey,
      name: association.diInterface.interfaceKey,
      packageId: association.diInterface.packageId,
      packageName: association.diInterface.packageName,
      source: sourceRangeForCallSiteEntry(
        association.diInterface.createInterfaceCall,
      ),
    };
  }
  if (association.resourceCarrier !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.Resource,
      name:
        association.resourceCarrier.targetName ??
        association.resourceCarrier.sourceExportName,
      packageId: association.resourceCarrier.packageId,
      packageName: association.resourceCarrier.packageName,
      source: association.resourceCarrier.source,
      resourceKind: association.resourceCarrier.resourceKind,
      resourceName: association.resourceCarrier.resourceName,
    };
  }
  if (association.registryExport !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.RegistryExport,
      name: association.registryExport.exportEntry.exportName,
      packageId: association.registryExport.packageId,
      packageName: association.registryExport.packageName,
      source:
        sourceRangeForExportEntry(association.registryExport) ??
        association.source,
    };
  }
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.RegistrationCatalog
  ) {
    return {
      kind: FrameworkRelationshipEndpointKind.RegistrationCatalog,
      name:
        association.catalogName ??
        association.targetName ??
        association.expression.text,
      packageId: association.packageId,
      packageName: association.packageName,
      source: association.source,
    };
  }
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.AppTaskRegistration
  ) {
    return expressionEndpoint(
      FrameworkRelationshipEndpointKind.AppTask,
      association,
    );
  }
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.FactoryRegistration
  ) {
    return expressionEndpoint(
      FrameworkRelationshipEndpointKind.Factory,
      association,
    );
  }
  if (
    association.associationKind ===
    FrameworkBundleAssociationKind.UnknownRegistrationArgument
  ) {
    return expressionEndpoint(
      FrameworkRelationshipEndpointKind.Unknown,
      association,
    );
  }
  return expressionEndpoint(
    FrameworkRelationshipEndpointKind.RegistrationArgument,
    association,
  );
}

function expressionEndpoint(
  kind: FrameworkRelationshipEndpointKind,
  association: FrameworkBundleAssociationRow,
): FrameworkRelationshipEndpoint {
  return {
    kind,
    name:
      association.targetName ??
      association.expression.symbolName ??
      association.expression.text,
    packageId: association.packageId,
    packageName: association.packageName,
    source: association.source,
  };
}

function relationshipProjectionRows(
  row: FrameworkAdmissionRelationshipRow,
  projection: string,
): boolean {
  switch (projection) {
    case "di":
      return row.to.kind === FrameworkRelationshipEndpointKind.DiKey;
    case "resources":
      return row.to.kind === FrameworkRelationshipEndpointKind.Resource;
    case "registries":
      return row.to.kind === FrameworkRelationshipEndpointKind.RegistryExport;
    case "catalogs":
      return (
        row.to.kind === FrameworkRelationshipEndpointKind.RegistrationCatalog
      );
    case "factories":
      return row.to.kind === FrameworkRelationshipEndpointKind.Factory;
    case "app-tasks":
      return row.to.kind === FrameworkRelationshipEndpointKind.AppTask;
    default:
      return true;
  }
}

function bundleSummariesForRelationships(
  bundles: readonly FrameworkBundleExportRow[],
  relationships: readonly FrameworkAdmissionRelationshipRow[],
): readonly FrameworkAdmissionBundleSummaryRow[] {
  const byBundleId = new Map<string, FrameworkAdmissionRelationshipRow[]>();
  for (const relationship of relationships) {
    const rows = byBundleId.get(relationship.bundleId) ?? [];
    rows.push(relationship);
    byBundleId.set(relationship.bundleId, rows);
  }
  return bundles
    .flatMap((bundle) => {
      const rows = byBundleId.get(bundle.id) ?? [];
      if (rows.length === 0) {
        return [];
      }
      return [
        {
          id: bundle.id,
          packageId: bundle.packageId,
          packageName: bundle.packageName,
          exportName: bundle.exportEntry.exportName,
          effectCount: bundle.effectCount,
          openSeamCount: bundle.openSeamCount,
          relationshipCount: rows.length,
          relations: countBy(rows, (row) => row.relation),
          endpointKinds: countBy(rows, (row) => row.to.kind),
          associationKinds: countBy(rows, (row) => row.associationKind),
          source: sourceRangeForExportEntry(bundle) ?? rows[0]?.source,
          summary: `${bundle.packageId}:${bundle.exportEntry.exportName} admits ${rows.length} framework value(s).`,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.exportName.localeCompare(right.exportName),
    );
}

function valueSummary(
  bundles: readonly FrameworkAdmissionBundleSummaryRow[],
  relationships: readonly FrameworkAdmissionRelationshipRow[],
  extras: Pick<FrameworkAdmissionValue, "bundles" | "relationships"> = {},
): FrameworkAdmissionValue {
  return {
    version: FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION,
    scope: "closed",
    bundleCount: bundles.length,
    relationshipCount: relationships.length,
    relations: countBy(relationships, (row) => row.relation),
    mechanisms: countBy(relationships, (row) => row.mechanism),
    phases: countBy(relationships, (row) => row.phase),
    endpointKinds: countBy(relationships, (row) => row.to.kind),
    associationKinds: countBy(relationships, (row) => row.associationKind),
    ...extras,
  };
}

function filtersFromInquiry(inquiry: Inquiry): FrameworkAdmissionFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

function hasExactAdmissionScope(filters: FrameworkAdmissionFilters): boolean {
  return filters.packageId !== undefined || filters.exportName !== undefined;
}

function relationshipFiltersForProjection(
  projection: string,
  filters: FrameworkAdmissionFilters,
): FrameworkAdmissionFilters {
  if (!isFlowProjection(projection)) {
    return filters;
  }
  return {
    ...(filters.packageId === undefined ? {} : { packageId: filters.packageId }),
    ...(filters.exportName === undefined
      ? {}
      : { exportName: filters.exportName }),
  };
}

function isFlowProjection(projection: string): boolean {
  return projection === "flow" ||
    projection === "flow-edges" ||
    projection === "flow-edge-details" ||
    projection === "flow-nodes";
}

function filtersFromRecord(value: unknown): FrameworkAdmissionFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "packageId"),
    ...stringFilter(source, "exportName"),
    ...stringFilter(source, "query"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "mechanism"),
    ...stringFilter(source, "phase"),
    ...stringFilter(source, "associationKind"),
    ...stringFilter(source, "targetName"),
    ...stringFilter(source, "resourceKind"),
    ...stringFilter(source, "key"),
    ...stringFilter(source, "linkKind"),
    ...stringFilter(source, "materializationKind"),
    ...stringFilter(source, "matchBasis"),
    ...stringFilter(source, "formationKind"),
    ...stringFilter(source, "status"),
    ...stringFilter(source, "slotName"),
    ...stringFilter(source, "appTaskExecutionKind"),
    ...stringFilter(source, "certainty"),
    ...stringFilter(source, "corridor"),
    ...stringFilter(source, "edgeKind"),
    ...stringFilter(source, "nodeKind"),
    ...stringFilter(source, "role"),
  };
}

function stringFilter(
  source: Record<string, unknown>,
  key: keyof FrameworkAdmissionFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function bundleMatches(
  row: FrameworkAdmissionBundleSummaryRow,
  filters: FrameworkAdmissionFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.exportName === undefined ||
      row.exportName === filters.exportName) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.packageId.includes(filters.query) ||
      row.exportName.includes(filters.query))
  );
}

function relationshipMatches(
  row: FrameworkAdmissionRelationshipRow,
  filters: FrameworkAdmissionFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.exportName === undefined ||
      row.exportName === filters.exportName) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined || row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.associationKind === undefined ||
      row.associationKind === filters.associationKind) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName ||
      row.to.name === filters.targetName) &&
    (filters.resourceKind === undefined ||
      row.to.resourceKind === filters.resourceKind) &&
    (filters.key === undefined ||
      row.to.name === filters.key ||
      row.targetName === filters.key) &&
    (filters.certainty === undefined || row.certainty === filters.certainty) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.exportName.includes(filters.query) ||
      row.packageId.includes(filters.query) ||
      row.to.kind.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.from.name.includes(filters.query) ||
      row.targetName?.includes(filters.query) === true ||
      row.catalogName?.includes(filters.query) === true ||
      row.helperName?.includes(filters.query) === true)
  );
}

function evidenceForBundle(row: FrameworkAdmissionBundleSummaryRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    ...(row.source === undefined ? {} : { source: row.source }),
    data: row,
  };
}

function evidenceForRelationship(
  row: FrameworkAdmissionRelationshipRow,
): Evidence {
  return {
    id: row.id,
    kind: evidenceKindForRelationship(row),
    role: EvidenceRole.Subject,
    confidence:
      row.to.kind === FrameworkRelationshipEndpointKind.Unknown
        ? EvidenceConfidence.Unknown
        : EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

const ADMISSION_PROJECTION_BASIS = [
  BasisKind.StaticEvaluator,
  BasisKind.TypeScriptChecker,
] as const;

function evidenceForMaterializationLink(
  row: FrameworkAdmissionMaterializationLinkRow,
): Evidence {
  return {
    id: row.id,
    kind:
      row.linkKind ===
      FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation
        ? EvidenceKind.ResourceDefinition
        : EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence:
      row.closure === FrameworkRelationshipClosure.Partial
        ? EvidenceConfidence.Strong
        : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForWorldFormation(
  row: FrameworkAdmissionWorldFormationRow,
): Evidence {
  return {
    id: row.id,
    kind:
      row.linkKind ===
        FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation ||
      row.resourceKind !== undefined
        ? EvidenceKind.ResourceDefinition
        : EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence:
      row.status === FrameworkAdmissionWorldFormationStatus.Open
        ? EvidenceConfidence.Strong
        : row.closure === FrameworkRelationshipClosure.Partial
          ? EvidenceConfidence.Strong
          : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForFlowEdge(row: FrameworkAdmissionFlowEdgeRow): Evidence {
  return {
    id: row.id,
    kind:
      row.layer === "compiler"
        ? EvidenceKind.TypeFact
        : row.resourceKind !== undefined
        ? EvidenceKind.ResourceDefinition
        : EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence:
      (row.openReasons?.length ?? 0) > 0
        ? EvidenceConfidence.Strong
        : EvidenceConfidence.Exact,
    summary: row.summary,
    ...(row.source === undefined ? {} : { source: row.source }),
  };
}

function flowEdgeSummaryRow(
  row: FrameworkAdmissionFlowEdgeRow,
): FrameworkAdmissionFlowEdgeSummaryRow {
  return {
    id: row.id,
    edgeKind: row.edgeKind,
    layer: row.layer,
    role: row.role,
    fromName: row.fromName,
    toName: row.toName,
    ...(row.source === undefined ? {} : { source: row.source }),
    ...(row.ownerKey === undefined ? {} : { ownerKey: row.ownerKey }),
    ...(row.providerName === undefined
      ? {}
      : { providerName: row.providerName }),
    ...(row.dependencyAccess === undefined
      ? {}
      : { dependencyAccess: row.dependencyAccess }),
    ...(row.dependencyKey === undefined
      ? {}
      : { dependencyKey: row.dependencyKey }),
    ...(row.resourceKind === undefined
      ? {}
      : { resourceKind: row.resourceKind }),
    ...(row.instructionName === undefined
      ? {}
      : { instructionName: row.instructionName }),
    ...(row.compilerProducerName === undefined
      ? {}
      : { compilerProducerName: row.compilerProducerName }),
    summary: row.summary,
  };
}

function evidenceForFlowNode(row: FrameworkAdmissionFlowNodeRow): Evidence {
  return {
    id: row.id,
    kind: row.source === undefined ? EvidenceKind.TypeFact : EvidenceKind.SourceSpan,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    ...(row.source === undefined ? {} : { source: row.source }),
  };
}

function evidenceKindForRelationship(
  row: FrameworkAdmissionRelationshipRow,
): EvidenceKind {
  if (row.to.kind === FrameworkRelationshipEndpointKind.Resource) {
    return EvidenceKind.ResourceDefinition;
  }
  return EvidenceKind.DiRegistration;
}

function openSeamsForRelationships(
  rows: readonly FrameworkAdmissionRelationshipRow[],
  evidence: readonly Evidence[],
): readonly OpenSeam[] {
  const seams: OpenSeam[] = [];
  for (const [index, row] of rows.entries()) {
    if (row.to.kind !== FrameworkRelationshipEndpointKind.Unknown) {
      continue;
    }
    seams.push({
      id: `framework-admission:unknown:${row.bundleAssociationId}`,
      kind: OpenSeamKind.Unknown,
      summary: `${row.exportName} admits ${row.to.name}, but the association is not semantically classified yet.`,
      evidence: evidence[index] ?? evidenceForRelationship(row),
      basis: frameworkAdmissionBasisSummary(),
      data: row,
    });
  }
  return seams;
}

function summaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.admission:bundles",
      "bundles",
      "Inspect compact configuration/bundle admission rows.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:relationships",
      "relationships",
      "Inspect normalized framework admission relationship rows.",
      {
        filters: admissionRelationshipContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:di",
      "di",
      "Inspect admitted DI keys and DI registration products.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:resources",
      "resources",
      "Inspect admitted Aurelia resources.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:materializations",
      "materializations",
      "Join admitted DI keys and resources to visible materialization rows.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:world-formation",
      "world-formation",
      "Join admitted values to visible materialization/execution rows while preserving admission-only boundaries.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:flow",
      "flow",
      "Inspect the compact configuration flow rollup before paging graph rows.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:flow:jit-compiler",
      "flow",
      "Inspect the compact JIT compiler corridor rollup before paging graph rows.",
      {
        filters: {
          ...inquiry.filters,
          corridor: FrameworkAdmissionFlowCorridor.JitCompiler,
        },
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:registries",
      "registries",
      "Inspect admitted registry/configuration exports.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
    {
      id: "framework.admission:raw-bundles",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect raw evaluator-derived bundle associations behind the admission relationship rows.",
      inquiry: {
        ...inquiry,
        lens: LensId.FrameworkDiscovery,
        projection: "bundles",
        page: undefined,
      },
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProvenanceOf,
        [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
        "Raw bundle associations behind framework admission rows.",
      ),
    },
  ];
}

function broadSummaryContinuations(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): readonly Continuation[] {
  const admittedPackageIds = new Set(AURELIA_FRAMEWORK_PACKAGE_IDS);
  const packageId = sourceProject
    .snapshot()
    .summary.packages.some((entry) => entry.id === "runtime-html")
    ? "runtime-html"
    : sourceProject
        .snapshot()
        .summary.packages.find((entry) =>
          admittedPackageIds.has(entry.id as never),
        )?.id;
  return [
    {
      id: "framework.admission:registry-exports",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect registry/configuration exports before choosing an admission scope.",
      inquiry: {
        ...inquiry,
        lens: LensId.FrameworkDiscovery,
        projection: "registry-exports",
        page: undefined,
      },
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.TypeScriptChecker],
        "Registry/configuration exports that can own admission rows.",
      ),
    },
    ...(packageId === undefined
      ? []
      : [
          projectionContinuation(
            inquiry,
            `framework.admission:package:${packageId}`,
            "bundles",
            "Inspect package-scoped admission rows to avoid broad cold evaluator work.",
            {
              filters: {
                ...inquiry.filters,
                packageId,
              },
              basis: ADMISSION_PROJECTION_BASIS,
              summary: "Package-scoped framework admission rows.",
            },
          ),
        ]),
  ];
}

function bundleContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAdmissionBundleSummaryRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.admission:bundles:next-page",
        "Continue framework admission bundle rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.admission:relationships",
      "relationships",
      "Inspect relationship rows for these admitted values.",
      {
        filters: admissionRelationshipContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBundle(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.admission:bundles",
      index,
      evidence,
    );
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.admission:bundles:relationships:${index}`,
        "relationships",
        "Inspect admission relationships for this configuration or bundle export.",
        {
          filters: {
            ...inquiry.filters,
            packageId: row.packageId,
            exportName: row.exportName,
          },
          evidence,
          basis: ADMISSION_PROJECTION_BASIS,
          summary: "Admission relationships for one configuration or bundle.",
        },
      ),
    );
    if (row.source !== undefined) {
      continuations.push(
        builder.source(
          "source",
          row.source,
          "Inspect source behind this configuration or bundle admission row.",
          "Source behind a framework admission bundle row.",
          {
            priority: ContinuationPriority.Secondary,
            basis: [BasisKind.SourceText, BasisKind.StaticEvaluator],
          },
        ),
      );
    }
  }
  return continuations;
}

function flowSummaryContinuations(
  inquiry: Inquiry,
  filters: FrameworkAdmissionFilters,
): readonly Continuation[] {
  const continuations: Continuation[] = [
    projectionContinuation(
      inquiry,
      "framework.admission:flow:edges",
      "flow-edges",
      "Inspect paged flow edge rows after reviewing the graph rollup.",
      {
        filters: flowContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:flow:nodes",
      "flow-nodes",
      "Inspect paged flow node rows after reviewing the graph rollup.",
      {
        filters: flowContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
  ];
  if (filters.corridor === FrameworkAdmissionFlowCorridor.JitCompiler) {
    const routeBuilder = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.admission:flow",
      0,
    );
    continuations.push(
      routeBuilder.continuation(
        FrameworkSemanticRoutes.AdmissionFlowToCompilerInstructionProducts,
        "template-compiler",
        {
          filters: frameworkTemplateCompilerFilters(),
          rationale: `Inspect ${FRAMEWORK_JIT_COMPILER_ACTOR} instruction-production rows behind this JIT compiler corridor.`,
        },
      ),
    );
  }
  return continuations;
}

function flowEdgeContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAdmissionFlowEdgeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.admission:flow:next-page",
        "Continue framework admission flow edge rows.",
        nextOffset,
        limit,
      ),
    );
  }
  if (inquiry.projection !== "flow-edge-details") {
    continuations.push(
      projectionContinuation(
        inquiry,
        "framework.admission:flow:edge-details",
        "flow-edge-details",
        "Inspect full flow edge payloads for the current graph slice.",
        {
          filters: flowContinuationFilters(inquiry),
          basis: ADMISSION_PROJECTION_BASIS,
        },
      ),
    );
    return continuations;
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    if (row.source === undefined) {
      continue;
    }
    const evidence = evidenceForFlowEdge(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.admission:flow",
      index,
      evidence,
    );
    const routeBuilder = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.admission:flow",
      index,
      evidence,
    );
    if (row.layer === "compiler" && row.instructionName !== undefined) {
      continuations.push(
        routeBuilder.continuation(
          FrameworkSemanticRoutes.AdmissionFlowToCompilerInstructionProducts,
          "compiler-products",
          {
            filters: { instructionName: row.instructionName },
            rationale:
              "Inspect compiler instruction products represented by this flow edge.",
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact source behind this configuration flow edge.",
        "Source behind a framework admission flow edge.",
        { basis: [BasisKind.SourceText, BasisKind.StaticEvaluator] },
      ),
    );
  }
  return continuations;
}

function flowNodeContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAdmissionFlowNodeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.admission:flow-nodes:next-page",
        "Continue framework admission flow node rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.admission:flow-nodes:edges",
      "flow-edges",
      "Inspect paged flow edges for these nodes.",
      {
        filters: flowContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    if (row.source === undefined) {
      continue;
    }
    const evidence = evidenceForFlowNode(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.admission:flow-nodes",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact source behind this configuration flow node.",
        "Source behind a framework admission flow node.",
        { basis: [BasisKind.SourceText, BasisKind.StaticEvaluator] },
      ),
    );
  }
  return continuations;
}

function flowContinuationFilters(inquiry: Inquiry): Inquiry["filters"] {
  return inquiry.filters;
}

function materializationLinkContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAdmissionMaterializationLinkRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.admission:materializations:next-page",
        "Continue framework admission materialization bridge rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.admission:relationships",
      "relationships",
      "Return to the admission relationship rows that produced these bridges.",
      {
        filters: admissionRelationshipContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForMaterializationLink(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.admission:materializations",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "admission-source",
        row.source,
        "Inspect the exact source expression that admitted this materialized target.",
        "Admission source for a materialization bridge row.",
        {
          priority: ContinuationPriority.Secondary,
          basis: [BasisKind.SourceText, BasisKind.StaticEvaluator],
        },
      ),
      builder.source(
        "materialization-source",
        row.materializationSource,
        "Inspect the exact materialization source for the admitted target.",
        "Materialization source for an admitted target.",
      ),
    );
    continuations.push(
      frameworkAdmissionContinuationPlanner.materializationDetailContinuation(
        inquiry,
        row,
        index,
        evidence,
      ),
    );
  }
  return continuations;
}

function worldFormationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAdmissionWorldFormationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.admission:world-formation:next-page",
        "Continue framework admission world-formation rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.admission:world-formation:relationships",
      "relationships",
      "Return to admission relationship rows that feed world formation.",
      {
        filters: admissionRelationshipContinuationFilters(inquiry),
        basis: ADMISSION_PROJECTION_BASIS,
      },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForWorldFormation(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.admission:world-formation",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "admission-source",
        row.source,
        "Inspect the exact source expression that admitted this world-formation target.",
        "Admission source for a world-formation row.",
        {
          priority: ContinuationPriority.Secondary,
          basis: [BasisKind.SourceText, BasisKind.StaticEvaluator],
        },
      ),
    );
    if (row.formationSource !== undefined) {
      continuations.push(
        builder.source(
          "formation-source",
          row.formationSource,
          "Inspect the exact framework source that materializes or executes this admitted target.",
          "World-formation source for an admitted target.",
        ),
      );
    }
    continuations.push(
      ...frameworkAdmissionContinuationPlanner.worldFormationSemanticContinuations(
        inquiry,
        row,
        index,
        evidence,
      ),
    );
  }
  return continuations;
}

function relationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAdmissionRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.admission:relationships:next-page",
        "Continue framework admission relationship rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.admission:bundles",
      "bundles",
      "Return to bundle/configuration rows that own these admissions.",
      { basis: ADMISSION_PROJECTION_BASIS },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForRelationship(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.admission:relationships",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact source expression that admitted this value.",
        "Exact source expression behind a framework admission relationship.",
        { basis: [BasisKind.SourceText, BasisKind.StaticEvaluator] },
      ),
    );
    if (row.to.source !== undefined) {
      continuations.push(
        builder.typeFacts(
          "target-type",
          row.to.source,
          "Inspect TypeChecker facts for the admitted target.",
          "TypeChecker facts for an admitted framework target.",
        ),
      );
    }
    continuations.push(
      ...frameworkAdmissionContinuationPlanner.relationshipSemanticContinuations(
        inquiry,
        row,
        index,
        evidence,
      ),
    );
  }
  return continuations;
}

function admissionRelationshipContinuationFilters(
  inquiry: Inquiry,
): Record<string, unknown> | undefined {
  const filters = inquiry.filters ?? {};
  const retained: Record<string, unknown> = {};
  for (const key of [
    "packageId",
    "exportName",
    "relation",
    "mechanism",
    "phase",
    "associationKind",
    "targetName",
    "resourceKind",
    "key",
    "certainty",
  ] as const) {
    const value = filters[key];
    if (value !== undefined) {
      retained[key] = value;
    }
  }
  return Object.keys(retained).length === 0 ? undefined : retained;
}

function sourceRangeForExportEntry(row: {
  readonly exportEntry: { readonly targets: readonly SourceTargetRow[] };
}): SourceRange | null {
  return sourceRangeForTarget(row.exportEntry.targets[0]);
}

function frameworkAdmissionBasis(sourceProject: SourceProject): Basis {
  return {
    ...frameworkAdmissionBasisSummary(),
    identity: sourceProject.snapshot().identity,
  };
}

function frameworkAdmissionBasisSummary(): Basis {
  return {
    kind: BasisKind.StaticEvaluator,
    closure: BasisClosure.Partial,
    authority: BasisAuthority.Evaluator,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from evaluator-derived framework bundle admissions joined to TypeChecker-classified DI, resource, registry, factory, and lifecycle targets.",
  };
}
