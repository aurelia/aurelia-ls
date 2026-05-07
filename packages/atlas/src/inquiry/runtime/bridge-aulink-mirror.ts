import path from "node:path";

import {
  FrameworkRelationshipFamily,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import { readFrameworkDiIndex } from "../../framework/di-index.js";
import {
  readAuLinkModel,
  sourceRangeForAuLinkFrameworkCandidate,
  sourceRangeForAuLinkTarget,
  type AuLinkAnchorRow,
  type AuLinkFilters,
  type AuLinkFrameworkTargetCandidate,
  type AuLinkFrameworkTargetResolution,
  type SourceProject,
} from "../../source/index.js";
import { BasisKind } from "../basis.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import {
  readFrameworkCompilerRelationships,
} from "./framework-compiler-lenses.js";
import { readFrameworkExpressionRelationships } from "./framework-expression-relationships.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  type FrameworkEmulationObligationRow,
  readFrameworkEmulationObligations,
} from "./framework-emulation-view.js";
import {
  readFrameworkLifecycleRelationships,
} from "./framework-lifecycle-lenses.js";
import {
  readFrameworkMaterializationIndex,
} from "./framework-materialization-lenses.js";
import {
  readFrameworkObservationRelationships,
} from "./framework-observation-lenses.js";
import { readFrameworkResourceConvergenceRows } from "./framework-resource-lenses.js";
import {
  readFrameworkRenderingRelationships,
} from "./framework-rendering-relationships.js";
import { readFrameworkStructuralRelationships } from "./framework-structural-relationships.js";
import { countBy } from "./framework-support.js";

/** Filters accepted by auLink mirror projections. */
export interface AuLinkMirrorFilters extends AuLinkFilters {
  readonly roleFamily?: string;
  readonly relation?: string;
  readonly sourceLens?: string;
  readonly sourceProjection?: string;
  readonly emulationLayer?: string;
  readonly emulationMode?: string;
  readonly obligationKind?: string;
  readonly productArea?: string;
  readonly productDeclarationKind?: string;
  readonly hasRoleEvidence?: boolean;
  readonly hasEmulationObligations?: boolean;
  readonly side?: string;
  readonly memberName?: string;
  readonly memberAccess?: string;
  readonly frameworkScopeMode?: string;
  readonly frameworkMemberAccess?: string;
  readonly productMemberAccess?: string;
  readonly memberDeclarationKind?: string;
  readonly presence?: string;
  readonly ownerName?: string;
  readonly ownerKind?: string;
  readonly ownerMemberName?: string;
  readonly usageRole?: string;
  readonly callCalleeName?: string;
  readonly callArgumentText?: string;
  readonly callArgumentSymbolName?: string;
  readonly callArgumentFullyQualifiedName?: string;
  readonly query?: string;
  readonly orderBy?: string;
}

/** Compact rollup for the product-to-framework mirror graph. */
export interface AuLinkMirrorRollup {
  readonly linkCount: number;
  readonly placedLinkCount: number;
  readonly resolvedTargetCount: number;
  readonly ambiguousTargetCount: number;
  readonly unresolvedTargetCount: number;
  readonly linksWithRoleEvidence: number;
  readonly linksWithoutRoleEvidence: number;
  readonly linksWithEmulationObligations: number;
  readonly linksWithoutEmulationObligations: number;
  readonly roleEvidenceCount: number;
  readonly emulationObligationCount: number;
  readonly roleFamilies: Readonly<Record<string, number>>;
  readonly relations: Readonly<Record<string, number>>;
  readonly sourceLenses: Readonly<Record<string, number>>;
  readonly emulationLayers: Readonly<Record<string, number>>;
  readonly emulationModes: Readonly<Record<string, number>>;
  readonly obligationKinds: Readonly<Record<string, number>>;
  readonly productAreas: Readonly<Record<string, number>>;
  readonly productDeclarationKinds: Readonly<Record<string, number>>;
}

/** One auLink id joined to framework semantic role evidence and product placement facts. */
export interface AuLinkMirrorRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly targetStatus: string;
  readonly placementCount: number;
  readonly frameworkCandidateCount: number;
  readonly roleEvidenceCount: number;
  readonly emulationObligationCount: number;
  readonly roleFamilies: Readonly<Record<string, number>>;
  readonly relations: Readonly<Record<string, number>>;
  readonly sourceLenses: Readonly<Record<string, number>>;
  readonly emulationLayers: Readonly<Record<string, number>>;
  readonly emulationModes: Readonly<Record<string, number>>;
  readonly obligationKinds: Readonly<Record<string, number>>;
  readonly productAreas: Readonly<Record<string, number>>;
  readonly productDeclarationKinds: Readonly<Record<string, number>>;
  readonly productPlacements: readonly AuLinkMirrorPlacementRef[];
  readonly frameworkTargets: readonly AuLinkMirrorTargetRef[];
  readonly firstProductSource?: SourceRange;
  readonly firstFrameworkSource?: SourceRange;
  readonly summary: string;
}

/** Product-side placement reference for a mirror row. */
export interface AuLinkMirrorPlacementRef {
  readonly name: string | null;
  readonly kind: string;
  readonly source: SourceRange;
}

/** Framework-side declaration reference for a mirror row. */
export interface AuLinkMirrorTargetRef {
  readonly name: string;
  readonly kind: string;
  readonly packageId: string;
  readonly packageName?: string;
  readonly source: SourceRange;
}

/** Exact way one framework row matched an auLink target. */
export type AuLinkMirrorMatchKind =
  | "endpoint-name"
  | "endpoint-member-owner"
  | "row-source-contained-by-target"
  | "emulation-target-name";

/** Relationship row attached to one auLink framework target. */
export interface AuLinkMirrorRoleEvidenceRow {
  readonly id: string;
  readonly linkId: string;
  readonly roleFamily: string;
  readonly relation: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly matchKind: AuLinkMirrorMatchKind;
  readonly matchedEndpoint: "from" | "to";
  readonly packageId: string;
  readonly packageName: string;
  readonly from: FrameworkRelationshipEndpointRef;
  readonly to: FrameworkRelationshipEndpointRef;
  readonly sourceLens: LensId;
  readonly sourceProjection: string;
  readonly sourceRowId: string;
  readonly source: SourceRange;
  readonly basis: readonly BasisKind[];
  readonly detailFilters: Readonly<Record<string, string>>;
  readonly summary: string;
}

/** Emulation obligation attached to one auLink framework target. */
export interface AuLinkMirrorObligationEvidenceRow {
  readonly id: string;
  readonly linkId: string;
  readonly layer: string;
  readonly mode: string;
  readonly obligationKind: string;
  readonly ownerName: string;
  readonly targetName: string;
  readonly targetKind: string;
  readonly matchKind: AuLinkMirrorMatchKind;
  readonly runtimeLifetime?: string;
  readonly closure: string;
  readonly interpretationStatus?: string;
  readonly sourceLens: LensId;
  readonly sourceProjection: string;
  readonly sourceRowId: string;
  readonly source?: SourceRange;
  readonly basis: readonly BasisKind[];
  readonly detailFilters: Readonly<Record<string, string>>;
  readonly summary: string;
}

/** Endpoint subset carried by mirror role evidence. */
export interface FrameworkRelationshipEndpointRef {
  readonly kind: string;
  readonly name: string;
  readonly packageId?: string;
  readonly packageName?: string;
  readonly resourceKind?: string;
  readonly resourceName?: string | null;
  readonly source?: SourceRange;
}

/** Full auLink mirror model. */
export interface AuLinkMirrorModel {
  readonly filters: AuLinkMirrorFilters;
  readonly rollup: AuLinkMirrorRollup;
  readonly rows: readonly AuLinkMirrorRow[];
  readonly roleEvidence: readonly AuLinkMirrorRoleEvidenceRow[];
  readonly obligationEvidence: readonly AuLinkMirrorObligationEvidenceRow[];
}

interface RelationshipSourceRow {
  readonly id: string;
  readonly roleFamily: string;
  readonly relation: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly sourceLens: LensId;
  readonly sourceProjection: string;
  readonly sourceRowId: string;
  readonly source: SourceRange;
  readonly basis: readonly BasisKind[];
  readonly detailFilters: Readonly<Record<string, string>>;
  readonly summary: string;
}

interface RoleMatch {
  readonly matchKind: AuLinkMirrorMatchKind;
  readonly matchedEndpoint: AuLinkMirrorRoleEvidenceRow["matchedEndpoint"];
}

/** Build the exact auLink mirror over current product placements and framework relationship substrates. */
export function readAuLinkMirrorModel(
  sourceProject: SourceProject,
  filters: AuLinkMirrorFilters = {},
): AuLinkMirrorModel {
  const auLink = readAuLinkModel(sourceProject, auLinkFilters(filters));
  const matcher = new AuLinkTargetMatcher();
  const sourceRows = frameworkRelationshipRows(sourceProject);
  const obligations = readFrameworkEmulationObligations(sourceProject, {});
  const roleEvidence: AuLinkMirrorRoleEvidenceRow[] = [];
  const obligationEvidence: AuLinkMirrorObligationEvidenceRow[] = [];

  for (const target of auLink.frameworkTargets) {
    for (const sourceRow of sourceRows) {
      const match = matcher.matchRelationship(target, sourceRow);
      if (match === null) {
        continue;
      }
      roleEvidence.push(roleEvidenceRow(target, sourceRow, match));
    }
    for (const obligation of obligations) {
      const matchKind = matcher.matchObligation(target, obligation);
      if (matchKind === null) {
        continue;
      }
      obligationEvidence.push(obligationEvidenceRow(target, obligation, matchKind));
    }
  }

  const filteredRoleEvidence = roleEvidence
    .filter((row) => roleEvidenceMatches(row, filters))
    .sort((left, right) => compareRoleEvidenceRows(left, right, filters.orderBy));
  const filteredObligationEvidence = obligationEvidence
    .filter((row) => obligationEvidenceMatches(row, filters))
    .sort((left, right) =>
      compareObligationEvidenceRows(left, right, filters.orderBy),
    );
  const rows = auLink.frameworkTargets
    .map((target) =>
      mirrorRow(
        target,
        auLink.anchors.filter((anchor) => anchor.linkId === target.linkId),
        filteredRoleEvidence.filter((row) => row.linkId === target.linkId),
        filteredObligationEvidence.filter((row) => row.linkId === target.linkId),
      ),
    )
    .filter((row) => mirrorRowMatches(row, filters))
    .sort((left, right) => compareMirrorRows(left, right, filters.orderBy));
  const rowLinkIds = new Set(rows.map((row) => row.linkId));
  const visibleRoleEvidence = filteredRoleEvidence.filter((row) =>
    rowLinkIds.has(row.linkId),
  );
  const visibleObligationEvidence = filteredObligationEvidence.filter((row) =>
    rowLinkIds.has(row.linkId),
  );

  return {
    filters,
    rollup: rollup(
      rows,
      visibleRoleEvidence,
      visibleObligationEvidence,
    ),
    rows,
    roleEvidence: visibleRoleEvidence,
    obligationEvidence: visibleObligationEvidence,
  };
}

function auLinkFilters(filters: AuLinkMirrorFilters): AuLinkFilters {
  return {
    ...(filters.linkId === undefined ? {} : { linkId: filters.linkId }),
    ...(filters.packageId === undefined ? {} : { packageId: filters.packageId }),
    ...(filters.symbolName === undefined ? {} : { symbolName: filters.symbolName }),
    ...(filters.targetName === undefined ? {} : { targetName: filters.targetName }),
    ...(filters.filePath === undefined ? {} : { filePath: filters.filePath }),
    ...(filters.frameworkStatus === undefined ? {} : { frameworkStatus: filters.frameworkStatus }),
    ...(filters.query === undefined ? {} : { query: filters.query }),
  };
}

class AuLinkTargetMatcher {
  matchRelationship(
    target: AuLinkFrameworkTargetResolution,
    row: RelationshipSourceRow,
  ): RoleMatch | null {
    const from = this.matchEndpoint(target, row.from);
    if (from !== null) {
      return { ...from, matchedEndpoint: "from" };
    }

    const to = this.matchEndpoint(target, row.to);
    if (to !== null) {
      return { ...to, matchedEndpoint: "to" };
    }

    return null;
  }

  matchObligation(
    target: AuLinkFrameworkTargetResolution,
    row: FrameworkEmulationObligationRow,
  ): AuLinkMirrorMatchKind | null {
    if (
      target.packageId === row.packageId &&
      (row.targetName === target.symbolName || row.ownerName === target.symbolName)
    ) {
      return "emulation-target-name";
    }
    if (row.source !== undefined && this.candidatesContainSource(target, row.source)) {
      return "row-source-contained-by-target";
    }
    return null;
  }

  private matchEndpoint(
    target: AuLinkFrameworkTargetResolution,
    endpoint: FrameworkRelationshipEndpoint,
  ): Pick<RoleMatch, "matchKind"> | null {
    if (endpoint.packageId === target.packageId && endpoint.name === target.symbolName) {
      return { matchKind: "endpoint-name" };
    }
    if (
      endpoint.packageId === target.packageId &&
      endpoint.name.startsWith(`${target.symbolName}.`)
    ) {
      return { matchKind: "endpoint-member-owner" };
    }
    return null;
  }

  private candidatesContainSource(
    target: AuLinkFrameworkTargetResolution,
    source: SourceRange,
  ): boolean {
    return target.candidates.some((candidate) =>
      rangeContains(
        sourceRangeForAuLinkFrameworkCandidate(candidate),
        source,
      ),
    );
  }
}

function frameworkRelationshipRows(
  sourceProject: SourceProject,
): readonly RelationshipSourceRow[] {
  const filters: FrameworkDiscoveryFilters = {};
  return [
    ...readFrameworkDiIndex(sourceProject).relationships.map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkDi,
        sourceProjection: "relationships",
        sourceRowId: row.id,
        basis: [BasisKind.TypeScriptChecker],
      }),
    ),
    ...readFrameworkMaterializationIndex(
      sourceProject,
      filters,
    ).relationships.map((row) =>
      relationshipSourceRow(row, {
        roleFamily: FrameworkRelationshipFamily.Materialization,
        sourceLens: LensId.FrameworkMaterialization,
        sourceProjection: "relationships",
        sourceRowId: row.id,
        basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
        detailFilters: {
          key: row.key,
          relation: row.relation,
          ...(row.access === undefined ? {} : { access: row.access }),
        },
      }),
    ),
    ...readFrameworkCompilerRelationships(sourceProject, filters).map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkCompiler,
        sourceProjection: "relationships",
        sourceRowId: row.sourceRowId,
        basis: [BasisKind.TypeScriptChecker],
      }),
    ),
    ...readFrameworkExpressionRelationships(sourceProject, filters).map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkDiscovery,
        sourceProjection: "expression-entities",
        sourceRowId: row.sourceRowId,
        basis: [BasisKind.TypeScriptChecker],
        detailFilters: {
          packageId: row.packageId,
          exportName: row.to.name,
        },
      }),
    ),
    ...readFrameworkStructuralRelationships(sourceProject, filters).map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkDiscovery,
        sourceProjection: structuralRelationshipProjection(row.family),
        sourceRowId: row.sourceRowId,
        basis: [BasisKind.TypeScriptChecker],
        detailFilters: {
          packageId: row.packageId,
          exportName: row.to.name,
        },
      }),
    ),
    ...readFrameworkRenderingRelationships(sourceProject, filters).map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkRendering,
        sourceProjection: "relationships",
        sourceRowId: row.sourceRowId,
        basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      }),
    ),
    ...readFrameworkLifecycleRelationships(sourceProject, filters).map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkLifecycle,
        sourceProjection: "relationships",
        sourceRowId: row.sourceRowId,
        basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      }),
    ),
    ...readFrameworkObservationRelationships(sourceProject, filters).map((row) =>
      relationshipSourceRow(row, {
        sourceLens: LensId.FrameworkObservation,
        sourceProjection: "relationships",
        sourceRowId: row.sourceRowId,
        basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      }),
    ),
    ...readFrameworkResourceConvergenceRows(sourceProject, filters).map(
      resourceConvergenceRelationshipSourceRow,
    ),
  ].sort(compareRelationshipRows);
}

interface FrameworkRelationshipSource {
  readonly id: string;
  readonly family?: string;
  readonly relation: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly summary: string;
}

interface RelationshipSourceOptions {
  readonly roleFamily?: string;
  readonly sourceLens: LensId;
  readonly sourceProjection: string;
  readonly sourceRowId: string;
  readonly basis: readonly BasisKind[];
  readonly detailFilters?: Readonly<Record<string, string>>;
}

function relationshipSourceRow(
  row: FrameworkRelationshipSource,
  options: RelationshipSourceOptions,
): RelationshipSourceRow {
  return {
    id: row.id,
    roleFamily: options.roleFamily ?? row.family ?? "framework",
    relation: row.relation,
    ...(row.mechanism === undefined ? {} : { mechanism: row.mechanism }),
    ...(row.phase === undefined ? {} : { phase: row.phase }),
    packageId: row.packageId,
    packageName: row.packageName,
    from: row.from,
    to: row.to,
    sourceLens: options.sourceLens,
    sourceProjection: options.sourceProjection,
    sourceRowId: options.sourceRowId,
    source: row.source,
    basis: options.basis,
    detailFilters: options.detailFilters ?? relationshipDetailFilters(row),
    summary: row.summary,
  };
}

function resourceConvergenceRelationshipSourceRow(
  row: ReturnType<typeof readFrameworkResourceConvergenceRows>[number],
): RelationshipSourceRow {
  return {
    id: row.id,
    roleFamily: FrameworkRelationshipFamily.Resource,
    relation: FrameworkRelationshipRelation.RegistersResource,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Symbol,
      name: row.sourceExportName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
    },
    to: {
      kind: FrameworkRelationshipEndpointKind.Resource,
      name: row.targetName ?? row.resourceName ?? row.sourceExportName,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      resourceKind: row.resourceKind,
      resourceName: row.resourceName,
    },
    sourceLens: LensId.FrameworkResources,
    sourceProjection: "convergence",
    sourceRowId: row.id,
    source: row.source,
    basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
    detailFilters: {
      packageId: row.packageId,
      resourceKind: row.resourceKind,
      targetName: row.targetName ?? row.sourceExportName,
    },
    summary: row.summary,
  };
}

function relationshipDetailFilters(row: {
  readonly packageId: string;
  readonly relation: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly from: FrameworkRelationshipEndpoint;
}): Readonly<Record<string, string>> {
  return {
    packageId: row.packageId,
    relation: row.relation,
    ...(row.mechanism === undefined ? {} : { mechanism: row.mechanism }),
    ...(row.phase === undefined ? {} : { phase: row.phase }),
    query: row.from.name,
  };
}

function structuralRelationshipProjection(family: string): string {
  switch (family) {
    case FrameworkRelationshipFamily.Observation:
      return "observers";
    case FrameworkRelationshipFamily.Router:
      return "router-entities";
    case FrameworkRelationshipFamily.Rendering:
    default:
      return "rendering-structures";
  }
}

function roleEvidenceRow(
  target: AuLinkFrameworkTargetResolution,
  row: RelationshipSourceRow,
  match: RoleMatch,
): AuLinkMirrorRoleEvidenceRow {
  return {
    id: `aulink-mirror-role:${target.linkId}:${row.id}:${match.matchedEndpoint}`,
    linkId: target.linkId,
    roleFamily: row.roleFamily,
    relation: row.relation,
    ...(row.mechanism === undefined ? {} : { mechanism: row.mechanism }),
    ...(row.phase === undefined ? {} : { phase: row.phase }),
    matchKind: match.matchKind,
    matchedEndpoint: match.matchedEndpoint,
    packageId: row.packageId,
    packageName: row.packageName,
    from: endpointRef(row.from),
    to: endpointRef(row.to),
    sourceLens: row.sourceLens,
    sourceProjection: row.sourceProjection,
    sourceRowId: row.sourceRowId,
    source: row.source,
    basis: row.basis,
    detailFilters: row.detailFilters,
    summary: `${target.linkId} participates in ${row.roleFamily}/${row.relation}: ${row.summary}`,
  };
}

function obligationEvidenceRow(
  target: AuLinkFrameworkTargetResolution,
  row: FrameworkEmulationObligationRow,
  matchKind: AuLinkMirrorMatchKind,
): AuLinkMirrorObligationEvidenceRow {
  return {
    id: `aulink-mirror-obligation:${target.linkId}:${row.id}`,
    linkId: target.linkId,
    layer: row.layer,
    mode: row.mode,
    obligationKind: row.obligationKind,
    ownerName: row.ownerName,
    targetName: row.targetName,
    targetKind: row.targetKind,
    matchKind,
    ...(row.runtimeLifetime === undefined
      ? {}
      : { runtimeLifetime: row.runtimeLifetime }),
    closure: row.closure,
    ...(row.interpretationStatus === undefined
      ? {}
      : { interpretationStatus: row.interpretationStatus }),
    sourceLens: row.sourceLens,
    sourceProjection: row.sourceProjection,
    sourceRowId: row.sourceRowId,
    ...(row.source === undefined ? {} : { source: row.source }),
    basis: row.basis,
    detailFilters: row.detailFilters,
    summary: `${target.linkId} carries ${row.layer}/${row.mode} obligation: ${row.summary}`,
  };
}

function mirrorRow(
  target: AuLinkFrameworkTargetResolution,
  anchors: readonly AuLinkAnchorRow[],
  roleEvidence: readonly AuLinkMirrorRoleEvidenceRow[],
  obligationEvidence: readonly AuLinkMirrorObligationEvidenceRow[],
): AuLinkMirrorRow {
  const firstAnchor = anchors[0];
  const firstCandidate = target.candidates[0];
  return {
    id: `aulink-mirror:${target.linkId}`,
    linkId: target.linkId,
    packageId: target.packageId,
    symbolName: target.symbolName,
    targetStatus: target.status,
    placementCount: anchors.length,
    frameworkCandidateCount: target.candidates.length,
    roleEvidenceCount: roleEvidence.length,
    emulationObligationCount: obligationEvidence.length,
    roleFamilies: countBy(roleEvidence, (row) => row.roleFamily),
    relations: countBy(roleEvidence, (row) => row.relation),
    sourceLenses: countBy(roleEvidence, (row) => row.sourceLens),
    emulationLayers: countBy(obligationEvidence, (row) => row.layer),
    emulationModes: countBy(obligationEvidence, (row) => row.mode),
    obligationKinds: countBy(obligationEvidence, (row) => row.obligationKind),
    productAreas: countBy(anchors, (anchor) =>
      productAreaForSource(sourceRangeForAuLinkTarget(anchor)),
    ),
    productDeclarationKinds: countBy(anchors, (anchor) => anchor.target.kind),
    productPlacements: anchors.map(placementRef),
    frameworkTargets: target.candidates.map(targetRef),
    ...(firstAnchor === undefined
      ? {}
      : { firstProductSource: sourceRangeForAuLinkTarget(firstAnchor) }),
    ...(firstCandidate === undefined
      ? {}
      : { firstFrameworkSource: sourceRangeForAuLinkFrameworkCandidate(firstCandidate) }),
    summary: `${target.linkId} has ${anchors.length} product placement(s), ${target.candidates.length} framework candidate(s), ${roleEvidence.length} framework role row(s), and ${obligationEvidence.length} emulation obligation row(s).`,
  };
}

function placementRef(anchor: AuLinkAnchorRow): AuLinkMirrorPlacementRef {
  return {
    name: anchor.target.name,
    kind: anchor.target.kind,
    source: sourceRangeForAuLinkTarget(anchor),
  };
}

function targetRef(candidate: AuLinkFrameworkTargetCandidate): AuLinkMirrorTargetRef {
  return {
    name: candidate.symbolName,
    kind: candidate.kind,
    packageId: candidate.packageId,
    source: sourceRangeForAuLinkFrameworkCandidate(candidate),
  };
}

function endpointRef(
  endpoint: FrameworkRelationshipEndpoint,
): FrameworkRelationshipEndpointRef {
  return {
    kind: endpoint.kind,
    name: endpoint.name,
    ...(endpoint.packageId === undefined ? {} : { packageId: endpoint.packageId }),
    ...(endpoint.packageName === undefined ? {} : { packageName: endpoint.packageName }),
    ...(endpoint.resourceKind === undefined ? {} : { resourceKind: endpoint.resourceKind }),
    ...(endpoint.resourceName === undefined ? {} : { resourceName: endpoint.resourceName }),
    ...(endpoint.source === undefined ? {} : { source: endpoint.source }),
  };
}

function rollup(
  rows: readonly AuLinkMirrorRow[],
  roleEvidence: readonly AuLinkMirrorRoleEvidenceRow[],
  obligationEvidence: readonly AuLinkMirrorObligationEvidenceRow[],
): AuLinkMirrorRollup {
  return {
    linkCount: rows.length,
    placedLinkCount: rows.filter((row) => row.placementCount > 0).length,
    resolvedTargetCount: rows.filter((row) => row.targetStatus === "resolved").length,
    ambiguousTargetCount: rows.filter((row) => row.targetStatus === "ambiguous").length,
    unresolvedTargetCount: rows.filter((row) => row.targetStatus === "unresolved").length,
    linksWithRoleEvidence: rows.filter((row) => row.roleEvidenceCount > 0).length,
    linksWithoutRoleEvidence: rows.filter((row) => row.roleEvidenceCount === 0).length,
    linksWithEmulationObligations: rows.filter(
      (row) => row.emulationObligationCount > 0,
    ).length,
    linksWithoutEmulationObligations: rows.filter(
      (row) => row.emulationObligationCount === 0,
    ).length,
    roleEvidenceCount: roleEvidence.length,
    emulationObligationCount: obligationEvidence.length,
    roleFamilies: countBy(roleEvidence, (row) => row.roleFamily),
    relations: countBy(roleEvidence, (row) => row.relation),
    sourceLenses: countBy(roleEvidence, (row) => row.sourceLens),
    emulationLayers: countBy(obligationEvidence, (row) => row.layer),
    emulationModes: countBy(obligationEvidence, (row) => row.mode),
    obligationKinds: countBy(obligationEvidence, (row) => row.obligationKind),
    productAreas: countMirrorRowRecords(rows, (row) => row.productAreas),
    productDeclarationKinds: countMirrorRowRecords(
      rows,
      (row) => row.productDeclarationKinds,
    ),
  };
}

function countMirrorRowRecords(
  rows: readonly AuLinkMirrorRow[],
  select: (row: AuLinkMirrorRow) => Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const row of rows) {
    for (const [key, count] of Object.entries(select(row))) {
      counts[key] = (counts[key] ?? 0) + count;
    }
  }
  return counts;
}

function roleEvidenceMatches(
  row: AuLinkMirrorRoleEvidenceRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.roleFamily === undefined || row.roleFamily === filters.roleFamily) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.sourceLens === undefined || row.sourceLens === filters.sourceLens) &&
    (filters.sourceProjection === undefined ||
      row.sourceProjection === filters.sourceProjection) &&
    (filters.query === undefined || roleEvidenceContains(row, filters.query))
  );
}

function obligationEvidenceMatches(
  row: AuLinkMirrorObligationEvidenceRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.linkId.startsWith(`${filters.packageId}:`)) &&
    (filters.emulationLayer === undefined || row.layer === filters.emulationLayer) &&
    (filters.emulationMode === undefined || row.mode === filters.emulationMode) &&
    (filters.obligationKind === undefined ||
      row.obligationKind === filters.obligationKind) &&
    (filters.query === undefined || obligationEvidenceContains(row, filters.query))
  );
}

function mirrorRowMatches(
  row: AuLinkMirrorRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.symbolName === undefined || row.symbolName === filters.symbolName) &&
    (filters.frameworkStatus === undefined || row.targetStatus === filters.frameworkStatus) &&
    (filters.roleFamily === undefined ||
      row.roleFamilies[filters.roleFamily] !== undefined) &&
    (filters.relation === undefined || row.relations[filters.relation] !== undefined) &&
    (filters.sourceLens === undefined ||
      row.sourceLenses[filters.sourceLens] !== undefined) &&
    (filters.emulationLayer === undefined ||
      row.emulationLayers[filters.emulationLayer] !== undefined) &&
    (filters.emulationMode === undefined ||
      row.emulationModes[filters.emulationMode] !== undefined) &&
    (filters.obligationKind === undefined ||
      row.obligationKinds[filters.obligationKind] !== undefined) &&
    (filters.productArea === undefined ||
      row.productAreas[filters.productArea] !== undefined) &&
    (filters.productDeclarationKind === undefined ||
      row.productDeclarationKinds[filters.productDeclarationKind] !== undefined) &&
    (filters.hasRoleEvidence === undefined ||
      (row.roleEvidenceCount > 0) === filters.hasRoleEvidence) &&
    (filters.hasEmulationObligations === undefined ||
      (row.emulationObligationCount > 0) === filters.hasEmulationObligations) &&
    (filters.query === undefined || mirrorRowContains(row, filters.query))
  );
}

function roleEvidenceContains(
  row: AuLinkMirrorRoleEvidenceRow,
  query: string,
): boolean {
  return [
    row.linkId,
    row.roleFamily,
    row.relation,
    row.mechanism,
    row.phase,
    row.from.name,
    row.to.name,
    row.summary,
    row.source.filePath,
  ].some((value) => value?.includes(query) === true);
}

function obligationEvidenceContains(
  row: AuLinkMirrorObligationEvidenceRow,
  query: string,
): boolean {
  return [
    row.linkId,
    row.layer,
    row.mode,
    row.obligationKind,
    row.ownerName,
    row.targetName,
    row.targetKind,
    row.summary,
    row.source?.filePath,
  ].some((value) => value?.includes(query) === true);
}

function mirrorRowContains(row: AuLinkMirrorRow, query: string): boolean {
  return [
    row.linkId,
    row.packageId,
    row.symbolName,
    row.summary,
    row.firstProductSource?.filePath,
    row.firstFrameworkSource?.filePath,
    ...Object.keys(row.productAreas),
    ...Object.keys(row.productDeclarationKinds),
    ...row.productPlacements.map((placement) => placement.name ?? ""),
    ...row.frameworkTargets.map((target) => target.name),
  ].some((value) => value?.includes(query) === true);
}

function rangeContains(outer: SourceRange, inner: SourceRange): boolean {
  if (!samePath(outer.filePath, inner.filePath)) {
    return false;
  }
  const startsBefore =
    outer.start.line < inner.start.line ||
    (outer.start.line === inner.start.line &&
      outer.start.character <= inner.start.character);
  const endsAfter =
    outer.end.line > inner.end.line ||
    (outer.end.line === inner.end.line &&
      outer.end.character >= inner.end.character);
  return startsBefore && endsAfter;
}

function samePath(left: string, right: string): boolean {
  const leftPath = canonicalPath(left);
  const rightPath = canonicalPath(right);
  return (
    leftPath === rightPath ||
    leftPath.endsWith(`/${rightPath}`) ||
    rightPath.endsWith(`/${leftPath}`)
  );
}

function productAreaForSource(source: SourceRange): string {
  const normalized = canonicalPath(source.filePath);
  const prefix = "packages/semantic-runtime/src/";
  if (!normalized.startsWith(prefix)) {
    return "unknown";
  }
  return normalized.slice(prefix.length).split("/")[0] ?? "unknown";
}

function canonicalPath(filePath: string): string {
  const normalized = path.normalize(filePath).replace(/\\/gu, "/").toLowerCase();
  const aureliaIndex = normalized.indexOf("/aurelia/packages/");
  if (aureliaIndex >= 0) {
    return normalized.slice(aureliaIndex + 1);
  }
  const semanticRuntimeIndex = normalized.indexOf("/packages/semantic-runtime/");
  if (semanticRuntimeIndex >= 0) {
    return normalized.slice(semanticRuntimeIndex + 1);
  }
  return normalized.replace(/^[a-z]:\//u, "");
}

function compareRelationshipRows(
  left: RelationshipSourceRow,
  right: RelationshipSourceRow,
): number {
  return (
    left.roleFamily.localeCompare(right.roleFamily) ||
    left.relation.localeCompare(right.relation) ||
    left.packageId.localeCompare(right.packageId) ||
    left.id.localeCompare(right.id)
  );
}

function compareMirrorRows(
  left: AuLinkMirrorRow,
  right: AuLinkMirrorRow,
  orderBy: string | undefined,
): number {
  const fallback =
    left.packageId.localeCompare(right.packageId) ||
    left.symbolName.localeCompare(right.symbolName) ||
    left.linkId.localeCompare(right.linkId);
  switch (orderBy) {
    case "roleEvidence":
      return right.roleEvidenceCount - left.roleEvidenceCount || fallback;
    case "emulationObligation":
    case "emulationObligations":
      return (
        right.emulationObligationCount - left.emulationObligationCount ||
        fallback
      );
    case "mirrorPressure":
      return (
        right.roleEvidenceCount +
          right.emulationObligationCount -
          (left.roleEvidenceCount + left.emulationObligationCount) ||
        fallback
      );
    case "targetStatus":
      return left.targetStatus.localeCompare(right.targetStatus) || fallback;
    case "productArea":
      return primaryRecordKey(left.productAreas).localeCompare(
        primaryRecordKey(right.productAreas),
      ) || fallback;
    case "packageId":
      return fallback;
    case "linkId":
    default:
      return left.linkId.localeCompare(right.linkId);
  }
}

function compareRoleEvidenceRows(
  left: AuLinkMirrorRoleEvidenceRow,
  right: AuLinkMirrorRoleEvidenceRow,
  orderBy: string | undefined,
): number {
  const fallback =
    left.linkId.localeCompare(right.linkId) ||
    left.roleFamily.localeCompare(right.roleFamily) ||
    left.relation.localeCompare(right.relation) ||
    left.id.localeCompare(right.id);
  switch (orderBy) {
    case "sourceLens":
      return left.sourceLens.localeCompare(right.sourceLens) || fallback;
    case "relation":
      return left.relation.localeCompare(right.relation) || fallback;
    case "roleFamily":
      return left.roleFamily.localeCompare(right.roleFamily) || fallback;
    case "linkId":
    default:
      return fallback;
  }
}

function compareObligationEvidenceRows(
  left: AuLinkMirrorObligationEvidenceRow,
  right: AuLinkMirrorObligationEvidenceRow,
  orderBy: string | undefined,
): number {
  const fallback =
    left.linkId.localeCompare(right.linkId) ||
    left.layer.localeCompare(right.layer) ||
    left.mode.localeCompare(right.mode) ||
    left.obligationKind.localeCompare(right.obligationKind) ||
    left.id.localeCompare(right.id);
  switch (orderBy) {
    case "sourceLens":
      return left.sourceLens.localeCompare(right.sourceLens) || fallback;
    case "obligationKind":
      return left.obligationKind.localeCompare(right.obligationKind) || fallback;
    case "emulationLayer":
      return left.layer.localeCompare(right.layer) || fallback;
    case "emulationMode":
      return left.mode.localeCompare(right.mode) || fallback;
    case "linkId":
    default:
      return fallback;
  }
}

function primaryRecordKey(record: Readonly<Record<string, number>>): string {
  const [first] = Object.entries(record)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return first?.[0] ?? "";
}
