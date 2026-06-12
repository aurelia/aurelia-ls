import type { Answer } from "../answer.js";
import { atlasContractBasis as contractBasis } from "../basis.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import type { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import type {
  AtlasSelfAnalysis,
  AtlasSelfContinuationRow,
  AtlasSelfModuleDependencyRow,
  AtlasSelfProjectionBranchRow,
  AtlasSelfSemanticRouteRow,
  AtlasSelfSubstrateSurfaceRow,
} from "./self-analysis.js";
import {
  SelfContractReader,
  type SelfContractRow,
} from "./self-contracts.js";
import {
  inquiryBooleanFilter,
  inquiryLowerStringFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  answerSelfRowProjection,
  selfSourceBasis,
} from "./self-row-projection.js";
import type { SelfValue } from "./self-value.js";
import type { InquiryWorld } from "./world.js";





function selfContractRows(
  world: InquiryWorld,
  analysis: AtlasSelfAnalysis,
  implementedLensIds: ReadonlySet<LensId>,
): readonly SelfContractRow[] {
  return new SelfContractReader(
    world.lenses,
    analysis,
    implementedLensIds,
  ).rows();
}





export function answerSelfContractsProjection(
  world: InquiryWorld,
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
  implementedLensIds: ReadonlySet<LensId>,
): Answer<SelfValue> {
  const rows = filterContracts(
    selfContractRows(world, analysis, implementedLensIds),
    inquiry,
  );
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:contracts",
    rows,
    valueWithRows: (contracts) => ({ ...value, contracts }),
    rowNoun: "Atlas lens contract coherence row(s)",
    basis: [
      contractBasis("Read declared lens contracts from the in-memory world."),
      selfSourceBasis(
        "Joined lens contracts to runtime implementation source paths through the hot TypeScript Program.",
      ),
    ],
    evidenceForRow: evidenceForContract,
    nextPageId: "atlas.self:contracts:next-page",
    nextPageRationale: "Continue Atlas lens contract rows.",
    inspectionForRow: contractContinuationSubjects,
  });
}





function contractContinuationSubjects(
  row: SelfContractRow,
): readonly {
  readonly id: string;
  readonly source?: SourceRange;
  readonly summary: string;
}[] {
  return [
    {
      id: row.id,
      source: row.source,
      summary: `Inspect runtime implementation for ${row.lensId}.`,
    },
    ...row.coherenceFacts.map((fact) => ({
      id: fact.id,
      source: fact.source,
      summary: `Inspect source for ${fact.dimension} coherence fact on ${row.lensId}.`,
    })),
  ];
}





export function answerSelfProjectionBranchesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterProjectionBranches(analysis.projectionBranches, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:projections",
    rows,
    valueWithRows: (pageRows) => ({ ...value, projectionBranches: pageRows }),
    rowNoun: "Atlas projection branch row(s)",
    basisSummary:
      "Read runtime projection branches through the hot TypeScript Program.",
    evidenceForRow: evidenceForProjectionBranch,
    nextPageId: "atlas.self:projections:next-page",
    nextPageRationale: "Continue Atlas projection branch rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect projection branch ${row.projection} in ${row.functionName}.`,
    }),
  });
}





export function answerSelfContinuationsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterContinuations(analysis.continuations, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:continuations",
    rows,
    valueWithRows: (pageRows) => ({ ...value, continuationRows: pageRows }),
    rowNoun: "Atlas continuation row(s)",
    basisSummary:
      "Read continuation object literals through the hot TypeScript Program.",
    evidenceForRow: evidenceForContinuation,
    nextPageId: "atlas.self:continuations:next-page",
    nextPageRationale: "Continue Atlas continuation rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect continuation ${row.continuationId ?? row.id}.`,
    }),
  });
}





export function answerSelfSemanticRoutesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterSemanticRoutes(analysis.semanticRoutes, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:semantic-routes",
    rows,
    valueWithRows: (pageRows) => ({ ...value, semanticRoutes: pageRows }),
    rowNoun: "declared framework semantic route row(s)",
    basisSummary:
      "Read declared framework semantic route topology from Atlas route catalog source.",
    evidenceForRow: evidenceForSemanticRoute,
    nextPageId: "atlas.self:semantic-routes:next-page",
    nextPageRationale: "Continue declared framework semantic route rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect semantic route ${row.semanticRouteId}.`,
    }),
  });
}





export function answerSelfModulesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfModuleDependencies(analysis.moduleDependencies, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:modules",
    rows,
    valueWithRows: (pageRows) => ({ ...value, moduleDependencies: pageRows }),
    rowNoun: "Atlas module dependency row(s)",
    basisSummary:
      "Read relative import/export edges through the hot TypeScript Program.",
    evidenceForRow: evidenceForModuleDependency,
    nextPageId: "atlas.self:modules:next-page",
    nextPageRationale: "Continue Atlas module dependency rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect module dependency ${row.moduleSpecifier}.`,
    }),
  });
}





export function answerSelfSubstrateSurfacesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterSubstrateSurfaces(analysis.substrateSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:substrate-surfaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, substrateSurfaces: pageRows }),
    rowNoun: "Atlas substrate surface row(s)",
    basisSummary:
      "Read substrate reader, builder, and schema declarations through the hot TypeScript Program.",
    evidenceForRow: evidenceForSubstrateSurface,
    nextPageId: "atlas.self:substrate-surfaces:next-page",
    nextPageRationale: "Continue Atlas substrate surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect substrate surface ${row.name}.`,
    }),
  });
}





function filterContracts(
  rows: readonly SelfContractRow[],
  inquiry: Inquiry,
): readonly SelfContractRow[] {
  const lensId = inquiryStringFilter(inquiry, "lensId");
  const projection = inquiryStringFilter(inquiry, "projectionId");
  const parameter = inquiryStringFilter(inquiry, "parameterId");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (lensId !== undefined && row.lensId !== lensId) {
      return false;
    }
    if (
      projection !== undefined &&
      !row.declaredProjectionIds.includes(projection) &&
      !row.observedProjectionIds.includes(projection)
    ) {
      return false;
    }
    if (
      parameter !== undefined &&
      !row.declaredParameterIds.includes(parameter)
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.lensId.toLowerCase().includes(query) ||
      row.family.toLowerCase().includes(query) ||
      row.stage.toLowerCase().includes(query) ||
      (row.implementationFunction?.toLowerCase().includes(query) ?? false) ||
      row.declaredProjectionIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.observedProjectionIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.declaredParameterIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.duplicateParameterIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.coherenceFacts.some(
        (entry) =>
          entry.dimension.toLowerCase().includes(query) ||
          entry.subjectId.toLowerCase().includes(query) ||
          entry.signals.some((signal) => signal.toLowerCase().includes(query)) ||
          entry.interpretationSpace.some((signal) =>
            signal.toLowerCase().includes(query),
          ),
      )
    );
  });
}





function filterProjectionBranches(
  rows: readonly AtlasSelfProjectionBranchRow[],
  inquiry: Inquiry,
): readonly AtlasSelfProjectionBranchRow[] {
  const lensId = inquiryStringFilter(inquiry, "lensId");
  const projection = inquiryStringFilter(inquiry, "projectionId");
  const functionName = inquiryStringFilter(inquiry, "functionName");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (lensId !== undefined && !row.lensIds.includes(lensId)) {
      return false;
    }
    if (projection !== undefined && row.projection !== projection) {
      return false;
    }
    if (functionName !== undefined && row.functionName !== functionName) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.projection.toLowerCase().includes(query) ||
      row.functionName.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.lensIds.some((id) => id.toLowerCase().includes(query))
    );
  });
}





function filterContinuations(
  rows: readonly AtlasSelfContinuationRow[],
  inquiry: Inquiry,
): readonly AtlasSelfContinuationRow[] {
  const lensId = inquiryStringFilter(inquiry, "lensId");
  const kind = inquiryStringFilter(inquiry, "kind");
  const targetLens = inquiryStringFilter(inquiry, "targetLens");
  const targetProjection = inquiryStringFilter(inquiry, "targetProjection");
  const routeRelationMember = inquiryStringFilter(inquiry, "routeRelationMember");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (lensId !== undefined && !row.lensIds.includes(lensId)) {
      return false;
    }
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (targetLens !== undefined && row.targetLens !== targetLens) {
      return false;
    }
    if (
      targetProjection !== undefined &&
      row.targetProjection !== targetProjection
    ) {
      return false;
    }
    if (
      routeRelationMember !== undefined &&
      row.routeRelationMember !== routeRelationMember
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      (row.continuationId?.toLowerCase().includes(query) ?? false) ||
      (row.kind?.toLowerCase().includes(query) ?? false) ||
      (row.targetLens?.toLowerCase().includes(query) ?? false) ||
      (row.targetProjection?.toLowerCase().includes(query) ?? false) ||
      (row.routeRelationMember?.toLowerCase().includes(query) ?? false) ||
      row.filePath.toLowerCase().includes(query) ||
      row.functionName.toLowerCase().includes(query) ||
      row.lensIds.some((id) => id.toLowerCase().includes(query))
    );
  });
}





function filterSemanticRoutes(
  rows: readonly AtlasSelfSemanticRouteRow[],
  inquiry: Inquiry,
): readonly AtlasSelfSemanticRouteRow[] {
  const semanticRouteId = inquiryStringFilter(inquiry, "semanticRouteId");
  const navigationSpecId = inquiryStringFilter(inquiry, "navigationSpecId");
  const targetEndpointId = inquiryStringFilter(inquiry, "targetEndpointId");
  const targetLens = inquiryStringFilter(inquiry, "targetLens");
  const targetProjection = inquiryStringFilter(inquiry, "targetProjection");
  const relation = inquiryStringFilter(inquiry, "routeRelationMember");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (
      semanticRouteId !== undefined &&
      row.semanticRouteId !== semanticRouteId
    ) {
      return false;
    }
    if (
      navigationSpecId !== undefined &&
      row.navigationSpecId !== navigationSpecId
    ) {
      return false;
    }
    if (
      targetEndpointId !== undefined &&
      row.targetEndpointId !== targetEndpointId
    ) {
      return false;
    }
    if (targetLens !== undefined && row.targetLens !== targetLens) {
      return false;
    }
    if (
      targetProjection !== undefined &&
      row.targetProjection !== targetProjection
    ) {
      return false;
    }
    if (
      relation !== undefined &&
      row.relation !== relation &&
      row.relationMember !== relation
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.semanticRouteId.toLowerCase().includes(query) ||
      row.navigationSpecId.toLowerCase().includes(query) ||
      row.targetEndpointId.toLowerCase().includes(query) ||
      row.targetLens.toLowerCase().includes(query) ||
      row.targetProjection.toLowerCase().includes(query) ||
      row.relation.toLowerCase().includes(query) ||
      (row.relationMember?.toLowerCase().includes(query) ?? false) ||
      row.basis.some((entry) => entry.toLowerCase().includes(query)) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}





function filterAtlasSelfModuleDependencies(
  rows: readonly AtlasSelfModuleDependencyRow[],
  inquiry: Inquiry,
): readonly AtlasSelfModuleDependencyRow[] {
  const fromArea = inquiryStringFilter(inquiry, "fromArea");
  const toArea = inquiryStringFilter(inquiry, "toArea");
  const crossesArea = inquiryBooleanFilter(inquiry, "crossesArea");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (fromArea !== undefined && row.fromArea !== fromArea) {
      return false;
    }
    if (toArea !== undefined && row.toArea !== toArea) {
      return false;
    }
    if (crossesArea !== undefined && row.crossesArea !== crossesArea) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.fromFile.toLowerCase().includes(query) ||
      row.moduleSpecifier.toLowerCase().includes(query) ||
      (row.toFile?.toLowerCase().includes(query) ?? false) ||
      row.fromArea.toLowerCase().includes(query) ||
      (row.toArea?.toLowerCase().includes(query) ?? false)
    );
  });
}





function filterSubstrateSurfaces(
  rows: readonly AtlasSelfSubstrateSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfSubstrateSurfaceRow[] {
  const kind = inquiryStringFilter(inquiry, "kind");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.kind.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      (row.value?.toLowerCase().includes(query) ?? false)
    );
  });
}





function evidenceForContract(row: SelfContractRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Lens contract coherence is joined from Atlas contracts and runtime source analysis.",
    ),
    source: row.source,
    data: row,
  };
}





function evidenceForProjectionBranch(
  row: AtlasSelfProjectionBranchRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Projection branch discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}





function evidenceForContinuation(row: AtlasSelfContinuationRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Continuation discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}





function evidenceForSemanticRoute(row: AtlasSelfSemanticRouteRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Declared semantic route topology is read from the framework route catalog.",
    ),
    source: row.source,
    data: row,
  };
}





function evidenceForModuleDependency(
  row: AtlasSelfModuleDependencyRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Module dependency discovery is AST-derived from import/export declarations.",
    ),
    source: row.source,
    data: row,
  };
}





function evidenceForSubstrateSurface(
  row: AtlasSelfSubstrateSurfaceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Substrate surface discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}
