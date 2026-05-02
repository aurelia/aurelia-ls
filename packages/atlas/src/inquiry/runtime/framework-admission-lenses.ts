import {
  FRAMEWORK_ADMISSION_RELATIONSHIP_VERSION,
  classifyFrameworkAdmissionAssociation,
  type FrameworkAdmissionRelationshipRow,
} from "../../framework/admission.js";
import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  type SourceProject,
  type SourceSpan,
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
import { LocusKind, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import {
  FrameworkAdmissionMaterializationLinkKind,
  readFrameworkAdmissionMaterializationLinks,
  type FrameworkAdmissionMaterializationLinkRow,
} from "./framework-admission-materialization.js";
import {
  FrameworkAdmissionWorldFormationKind,
  FrameworkAdmissionWorldFormationStatus,
  readFrameworkAdmissionWorldFormationRows,
  type FrameworkAdmissionWorldFormationRow,
} from "./framework-admission-world-formation.js";
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
}

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
          associationKinds: {},
        },
        basis: [frameworkAdmissionBasis(sourceProject)],
        continuations: broadSummaryContinuations(inquiry, sourceProject),
      },
    );
  }
  const bundles = readFrameworkBundles(sourceProject, filters);
  const relationships = bundles
    .flatMap((bundle) => relationshipsForBundle(bundle))
    .filter((row) => relationshipProjectionRows(row, projection))
    .filter((row) => relationshipMatches(row, filters));
  const bundleSummaries = bundleSummariesForRelationships(
    bundles,
    relationships,
  ).filter((row) => bundleMatches(row, filters));
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "bundles") {
    const page = pageRows(bundleSummaries, offset, limit);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${bundleSummaries.length} framework admission bundle row(s).`,
      {
        value: valueSummary(bundleSummaries, relationships, {
          bundles: page.rows,
        }),
        basis: [frameworkAdmissionBasis(sourceProject)],
        evidence: page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForBundle),
        page: pageInfo(
          inquiry,
          page.rows.length,
          bundleSummaries.length,
          limit,
          page.nextOffset,
        ),
        continuations: bundleContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  if (projection === "materializations") {
    const materializationLinks = readFrameworkAdmissionMaterializationLinks(
      sourceProject,
      relationships,
      filters,
    );
    const page = pageRows(materializationLinks, offset, limit);
    const evidence = page.rows
      .slice(0, evidenceLimit(inquiry))
      .map(evidenceForMaterializationLink);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${materializationLinks.length} framework admission materialization link row(s).`,
      {
        value: {
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
        },
        basis: [frameworkAdmissionBasis(sourceProject)],
        evidence,
        page: pageInfo(
          inquiry,
          page.rows.length,
          materializationLinks.length,
          limit,
          page.nextOffset,
        ),
        continuations: materializationLinkContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  if (projection === "world-formation") {
    const worldFormations = readFrameworkAdmissionWorldFormationRows(
      sourceProject,
      relationships,
      filters,
    );
    const page = pageRows(worldFormations, offset, limit);
    const evidence = page.rows
      .slice(0, evidenceLimit(inquiry))
      .map(evidenceForWorldFormation);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${worldFormations.length} framework admission world-formation row(s).`,
      {
        value: {
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
        },
        basis: [frameworkAdmissionBasis(sourceProject)],
        evidence,
        page: pageInfo(
          inquiry,
          page.rows.length,
          worldFormations.length,
          limit,
          page.nextOffset,
        ),
        continuations: worldFormationContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
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
    const page = pageRows(relationships, offset, limit);
    const evidence = page.rows
      .slice(0, evidenceLimit(inquiry))
      .map(evidenceForRelationship);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${relationships.length} framework admission relationship row(s).`,
      {
        value: valueSummary(bundleSummaries, relationships, {
          relationships: page.rows,
        }),
        basis: [frameworkAdmissionBasis(sourceProject)],
        evidence,
        openSeams: openSeamsForRelationships(page.rows, evidence),
        page: pageInfo(
          inquiry,
          page.rows.length,
          relationships.length,
          limit,
          page.nextOffset,
        ),
        continuations: relationshipContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Framework admission has ${bundleSummaries.length} bundle row(s) and ${relationships.length} relationship row(s).`,
    {
      value: valueSummary(bundleSummaries, relationships),
      basis: [frameworkAdmissionBasis(sourceProject)],
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
  const to = endpointForAssociation(association, classification.relation);
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
  relation: FrameworkRelationshipRelation,
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
  if (relation === FrameworkRelationshipRelation.AdmitsCatalog) {
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
  if (relation === FrameworkRelationshipRelation.AdmitsAppTask) {
    return expressionEndpoint(
      FrameworkRelationshipEndpointKind.AppTask,
      association,
    );
  }
  if (relation === FrameworkRelationshipRelation.AdmitsFactory) {
    return expressionEndpoint(
      FrameworkRelationshipEndpointKind.Factory,
      association,
    );
  }
  if (relation === FrameworkRelationshipRelation.AdmitsUnknownArgument) {
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
      return row.relation === FrameworkRelationshipRelation.AdmitsDiKey;
    case "resources":
      return row.relation === FrameworkRelationshipRelation.AdmitsResource;
    case "registries":
      return (
        row.relation === FrameworkRelationshipRelation.AdmitsRegistryExport
      );
    case "catalogs":
      return row.relation === FrameworkRelationshipRelation.AdmitsCatalog;
    case "factories":
      return row.relation === FrameworkRelationshipRelation.AdmitsFactory;
    case "app-tasks":
      return row.relation === FrameworkRelationshipRelation.AdmitsAppTask;
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
      row.relation === FrameworkRelationshipRelation.AdmitsUnknownArgument
        ? EvidenceConfidence.Unknown
        : EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

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

function evidenceKindForRelationship(
  row: FrameworkAdmissionRelationshipRow,
): EvidenceKind {
  switch (row.relation) {
    case FrameworkRelationshipRelation.AdmitsResource:
      return EvidenceKind.ResourceDefinition;
    case FrameworkRelationshipRelation.AdmitsDiKey:
    case FrameworkRelationshipRelation.AdmitsFactory:
    case FrameworkRelationshipRelation.AdmitsRegistryExport:
    case FrameworkRelationshipRelation.AdmitsAppTask:
    case FrameworkRelationshipRelation.AdmitsCatalog:
    case FrameworkRelationshipRelation.AdmitsRegistrationArgument:
    case FrameworkRelationshipRelation.AdmitsUnknownArgument:
    default:
      return EvidenceKind.DiRegistration;
  }
}

function openSeamsForRelationships(
  rows: readonly FrameworkAdmissionRelationshipRow[],
  evidence: readonly Evidence[],
): readonly OpenSeam[] {
  const seams: OpenSeam[] = [];
  for (const [index, row] of rows.entries()) {
    if (row.relation !== FrameworkRelationshipRelation.AdmitsUnknownArgument) {
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
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:relationships",
      "relationships",
      "Inspect normalized framework admission relationship rows.",
      admissionRelationshipContinuationFilters(inquiry),
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:di",
      "di",
      "Inspect admitted DI keys and DI registration products.",
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:resources",
      "resources",
      "Inspect admitted Aurelia resources.",
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:materializations",
      "materializations",
      "Join admitted DI keys and resources to visible materialization rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:world-formation",
      "world-formation",
      "Join admitted values to visible materialization/execution rows while preserving admission-only boundaries.",
    ),
    projectionContinuation(
      inquiry,
      "framework.admission:registries",
      "registries",
      "Inspect admitted registry/configuration exports.",
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
          {
            id: `framework.admission:package:${packageId}`,
            kind: ContinuationKind.SwitchProjection,
            priority: ContinuationPriority.Primary,
            rationale:
              "Inspect package-scoped admission rows to avoid broad cold evaluator work.",
            inquiry: {
              ...inquiry,
              projection: "bundles",
              filters: {
                ...inquiry.filters,
                packageId,
              },
              page: undefined,
            },
            route: route(
              NavigationPlane.Semantic,
              NavigationRelation.ProjectionOf,
              [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
              "Package-scoped framework admission rows.",
            ),
          } satisfies Continuation,
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
      admissionRelationshipContinuationFilters(inquiry),
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBundle(row);
    continuations.push({
      id: `framework.admission:bundles:relationships:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect admission relationships for this configuration or bundle export.",
      inquiry: {
        ...inquiry,
        projection: "relationships",
        filters: {
          ...inquiry.filters,
          packageId: row.packageId,
          exportName: row.exportName,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProjectionOf,
        [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
        "Admission relationships for one configuration or bundle.",
      ),
    });
    if (row.source !== undefined) {
      continuations.push({
        id: `framework.admission:bundles:source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect source behind this configuration or bundle admission row.",
        inquiry: {
          lens: LensId.TsSource,
          locus: sourceRangeLocus(row.source),
          projection: "text",
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.SourceFor,
          [BasisKind.SourceText, BasisKind.StaticEvaluator],
          "Source behind a framework admission bundle row.",
        ),
      });
    }
  }
  return continuations;
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
      admissionRelationshipContinuationFilters(inquiry),
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForMaterializationLink(row);
    continuations.push({
      id: `framework.admission:materializations:admission-source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect the exact source expression that admitted this materialized target.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.StaticEvaluator],
        "Admission source for a materialization bridge row.",
      ),
    });
    continuations.push({
      id: `framework.admission:materializations:materialization-source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect the exact materialization source for the admitted target.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.materializationSource),
        projection: "text",
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Materialization source for an admitted target.",
      ),
    });
    continuations.push(
      materializationDetailContinuation(inquiry, row, index, evidence),
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
      admissionRelationshipContinuationFilters(inquiry),
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForWorldFormation(row);
    continuations.push({
      id: `framework.admission:world-formation:admission-source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect the exact source expression that admitted this world-formation target.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.StaticEvaluator],
        "Admission source for a world-formation row.",
      ),
    });
    if (row.formationSource !== undefined) {
      continuations.push({
        id: `framework.admission:world-formation:formation-source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect the exact framework source that materializes or executes this admitted target.",
        inquiry: {
          lens: LensId.TsSource,
          locus: sourceRangeLocus(row.formationSource),
          projection: "text",
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.SourceFor,
          [BasisKind.SourceText, BasisKind.TypeScriptChecker],
          "World-formation source for an admitted target.",
        ),
      });
    }
    continuations.push(
      ...semanticContinuationsForWorldFormation(inquiry, row, index, evidence),
    );
  }
  return continuations;
}

function semanticContinuationsForWorldFormation(
  inquiry: Inquiry,
  row: FrameworkAdmissionWorldFormationRow,
  index: number,
  evidence: Evidence,
): readonly Continuation[] {
  if (row.formationKind === FrameworkAdmissionWorldFormationKind.RuntimeExistence) {
    return [
      {
        id: `framework.admission:world-formation:materialization:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect the materialization detail rows behind this world-formation row.",
        inquiry: {
          lens: LensId.FrameworkMaterialization,
          locus: inquiry.locus,
          projection:
            row.linkKind ===
            FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation
              ? "resource-instantiations"
              : "instantiations",
          filters:
            row.linkKind ===
            FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation
              ? {
                  resourceKind: row.resourceKind,
                  resourceName:
                    row.admittedTarget.resourceName ?? row.admittedTarget.name,
                }
              : { key: row.admittedTarget.name },
          page: undefined,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.FrameworkFlowOf,
          [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
          "World-formation row to materialization detail.",
        ),
      },
    ];
  }
  if (
    row.formationKind ===
      FrameworkAdmissionWorldFormationKind.AppTaskExecution &&
    row.slotName !== undefined
  ) {
    return [
      {
        id: `framework.admission:world-formation:app-task-execution:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect lifecycle AppTask execution rows for this admitted slot.",
        inquiry: {
          lens: LensId.FrameworkLifecycle,
          locus: inquiry.locus,
          projection: "app-tasks",
          filters: { slotName: row.slotName },
          page: undefined,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.FrameworkFlowOf,
          [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
          "World-formation row to AppRoot lifecycle execution.",
        ),
      },
    ];
  }
  if (
    row.formationKind ===
    FrameworkAdmissionWorldFormationKind.RegistryExportAdmission
  ) {
    return [
      {
        id: `framework.admission:world-formation:registry-admission:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect admission relationships owned by the admitted registry/configuration export.",
        inquiry: {
          lens: LensId.FrameworkAdmission,
          locus: inquiry.locus,
          projection: "relationships",
          filters: {
            packageId: row.admittedTarget.packageId,
            exportName: row.admittedTarget.name,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.FrameworkFlowOf,
          [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
          "Registry/configuration admission to its owned admissions.",
        ),
      },
    ];
  }
  return [];
}

function materializationDetailContinuation(
  inquiry: Inquiry,
  row: FrameworkAdmissionMaterializationLinkRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const isResource =
    row.linkKind ===
    FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation;
  return {
    id: `framework.admission:materializations:detail:${index}`,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Primary,
    rationale: isResource
      ? "Inspect resource materialization rows for this admitted resource."
      : "Inspect DI key instantiation rows for this admitted key.",
    inquiry: {
      lens: LensId.FrameworkMaterialization,
      locus: inquiry.locus,
      projection: isResource ? "resource-instantiations" : "instantiations",
      filters: isResource
        ? {
            resourceKind: row.resourceKind,
            resourceName:
              row.admittedTarget.resourceName ?? row.admittedTarget.name,
          }
        : {
            key: row.admittedTarget.name,
          },
      page: undefined,
    },
    evidence: [evidence],
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
      "Admitted target to visible materialization rows.",
    ),
  };
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
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForRelationship(row);
    continuations.push({
      id: `framework.admission:relationships:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect the exact source expression that admitted this value.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.StaticEvaluator],
        "Exact source expression behind a framework admission relationship.",
      ),
    });
    if (row.to.source !== undefined) {
      continuations.push({
        id: `framework.admission:relationships:target-type:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for the admitted target.",
        inquiry: {
          lens: LensId.TsType,
          locus: sourceRangeLocus(row.to.source),
          projection: "facts",
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Inspection,
          NavigationRelation.TypeFactsFor,
          [BasisKind.TypeScriptChecker],
          "TypeChecker facts for an admitted framework target.",
        ),
      });
    }
    continuations.push(
      ...semanticContinuationsForRelationship(inquiry, row, index, evidence),
    );
  }
  return continuations;
}

function semanticContinuationsForRelationship(
  inquiry: Inquiry,
  row: FrameworkAdmissionRelationshipRow,
  index: number,
  evidence: Evidence,
): readonly Continuation[] {
  switch (row.relation) {
    case FrameworkRelationshipRelation.AdmitsDiKey:
      return [
        {
          id: `framework.admission:relationships:materialization:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Follow the admitted DI key toward visible runtime-existence rows.",
          inquiry: {
            ...inquiry,
            lens: LensId.FrameworkMaterialization,
            projection: "instantiations",
            filters: { key: row.to.name },
            page: undefined,
          },
          evidence: [evidence],
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
            "Admitted DI key to runtime-existence rows.",
          ),
        },
        {
          id: `framework.admission:relationships:di:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Inspect DI provider and registration atoms behind the admitted key.",
          inquiry: {
            ...inquiry,
            lens: LensId.FrameworkDi,
            projection: "providers",
            filters: { key: row.to.name },
            page: undefined,
          },
          evidence: [evidence],
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.ProvenanceOf,
            [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
            "DI provider atoms behind an admitted DI key.",
          ),
        },
      ];
    case FrameworkRelationshipRelation.AdmitsResource:
      return [
        {
          id: `framework.admission:relationships:resource-instantiation:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Follow the admitted resource toward visible runtime/compiler/evaluator materialization sites.",
          inquiry: {
            ...inquiry,
            lens: LensId.FrameworkMaterialization,
            projection: "resource-instantiations",
            filters: {
              packageId: row.to.packageId,
              resourceKind: row.to.resourceKind,
              resourceName: row.to.name,
            },
            page: undefined,
          },
          evidence: [evidence],
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
            "Admitted resource to materialization sites.",
          ),
        },
        {
          id: `framework.admission:relationships:resource:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Follow the admitted resource into the framework resource catalog.",
          inquiry: {
            ...inquiry,
            lens: LensId.FrameworkDiscovery,
            projection: "resource-carriers",
            filters: {
              resourceKind: row.to.resourceKind,
              query: row.to.name,
            },
            page: undefined,
          },
          evidence: [evidence],
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Admitted resource to framework resource carrier catalog.",
          ),
        },
      ];
    case FrameworkRelationshipRelation.AdmitsRegistryExport:
      return [
        {
          id: `framework.admission:relationships:registry:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Inspect admission relationships owned by the admitted registry/configuration export.",
          inquiry: {
            ...inquiry,
            lens: LensId.FrameworkAdmission,
            projection: "relationships",
            filters: {
              packageId: row.to.packageId,
              exportName: row.to.name,
            },
            page: undefined,
          },
          evidence: [evidence],
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
            "Registry/configuration admission to its own admitted values.",
          ),
        },
      ];
    case FrameworkRelationshipRelation.AdmitsAppTask:
      return [
        ...(appTaskSlotName(row) === null
          ? []
          : [
              {
                id: `framework.admission:relationships:app-task-execution:${index}`,
                kind: ContinuationKind.SwitchLens,
                priority: ContinuationPriority.Primary,
                rationale:
                  "Follow the admitted AppTask slot to the AppRoot lifecycle execution sites.",
                inquiry: {
                  ...inquiry,
                  lens: LensId.FrameworkLifecycle,
                  projection: "app-tasks",
                  filters: { slotName: appTaskSlotName(row)! },
                  page: undefined,
                },
                evidence: [evidence],
                route: route(
                  NavigationPlane.Semantic,
                  NavigationRelation.FrameworkFlowOf,
                  [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
                  "Admitted AppTask slot to AppRoot lifecycle execution sites.",
                ),
              } satisfies Continuation,
            ]),
        {
          id: `framework.admission:relationships:app-task:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Follow the admitted lifecycle task into the AppTask entity catalog.",
          inquiry: {
            ...inquiry,
            lens: LensId.FrameworkDiscovery,
            projection: "app-tasks",
            filters: { query: row.to.name },
            page: undefined,
          },
          evidence: [evidence],
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Admitted AppTask to framework AppTask catalog.",
          ),
        },
      ];
    default:
      return [];
  }
}

function appTaskSlotName(row: FrameworkAdmissionRelationshipRow): string | null {
  if (row.helperName?.startsWith("AppTask.") !== true) {
    return null;
  }
  return row.helperName.slice("AppTask.".length);
}

function projectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
  filters?: Record<string, unknown>,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      ...(filters === undefined ? {} : { filters }),
      page: undefined,
    },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      rationale,
    ),
  };
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

function sourceRangeLocus(range: SourceRange) {
  return {
    kind: LocusKind.SourceRange,
    range,
  } as const;
}

function sourceRangeForExportEntry(row: {
  readonly exportEntry: { readonly targets: readonly SourceTargetRow[] };
}): SourceRange | null {
  return sourceRangeForTarget(row.exportEntry.targets[0]);
}

function sourceRangeForTarget(
  target: SourceTargetRow | undefined,
): SourceRange | null {
  if (target?.file === undefined || target.span === undefined) {
    return null;
  }
  return sourceRangeFromFileSpan(target.file.repoPath, target.span);
}

function sourceRangeForCallSiteEntry(callSite: {
  readonly file: { readonly repoPath: string };
  readonly span: SourceSpan;
}): SourceRange {
  return sourceRangeFromFileSpan(callSite.file.repoPath, callSite.span);
}

function sourceRangeFromFileSpan(
  filePath: string,
  span: {
    readonly startLine: number;
    readonly startCharacter: number;
    readonly endLine: number;
    readonly endCharacter: number;
  },
): SourceRange {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function pageInfo(
  inquiry: Inquiry,
  returned: number,
  total: number,
  limit: number,
  nextOffset: number | undefined,
) {
  return {
    size: limit,
    cursor: inquiry.page?.cursor,
    returned,
    total,
    ...(nextOffset === undefined ? {} : { nextCursor: String(nextOffset) }),
  };
}

function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): { readonly rows: readonly TValue[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset =
    offset + page.length < rows.length ? offset + page.length : undefined;
  return {
    rows: page,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
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

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

function countBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}
