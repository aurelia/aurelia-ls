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
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import type { SourceProject } from "../../source/index.js";
import {
  readWorkspaceArchitectureAnalysis,
  workspaceRollupForRows,
  type WorkspaceArchitectureAnalysis,
  type WorkspacePackageRow,
  type WorkspaceSurfaceRow,
} from "./workspace-architecture-analysis.js";
import {
  hasAnyInquiryStringFilter,
  inquiryBooleanFilter,
  inquiryLowerStringFilter,
  inquiryPackageIdFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  optionalNextPageContinuation,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";

/** Value returned by the workspace.architecture lens. */
export interface WorkspaceArchitectureValue {
  readonly version: WorkspaceArchitectureAnalysis["version"];
  readonly rollup: WorkspaceArchitectureAnalysis["rollup"];
  readonly profile?: WorkspaceArchitectureAnalysis["profile"];
  readonly packages?: readonly WorkspacePackageRow[];
  readonly surfaces?: readonly WorkspaceSurfaceRow[];
}

type WorkspaceArchitectureProjection = "summary" | "packages" | "surfaces" | "profile";

interface FilteredWorkspaceArchitectureRows {
  readonly packages: readonly WorkspacePackageRow[];
  readonly surfaces: readonly WorkspaceSurfaceRow[];
}

/** Answer admitted workspace topology and app integration inquiries. */
export function answerWorkspaceArchitecture(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<WorkspaceArchitectureValue> {
  const analysis = readWorkspaceArchitectureAnalysis(sourceProject);
  const basis = workspaceArchitectureBasis(sourceProject);
  switch (workspaceArchitectureProjection(inquiry)) {
    case "summary":
      return answerWorkspaceArchitectureSummary(inquiry, analysis, basis);
    case "packages": {
      const filtered = filterWorkspaceArchitectureRows(analysis, inquiry);
      const rollup = workspaceRollupForRows(
        filtered.packages,
        filtered.surfaces,
        analysis.rollup.configDiagnosticCount,
      );
      return answerWorkspaceRows(
        inquiry,
        "workspace.architecture:packages",
        "workspace package row(s)",
        filtered.packages,
        basis,
        (rows) => ({ version: analysis.version, rollup, packages: rows }),
        workspaceEvidenceForPackage,
      );
    }
    case "surfaces": {
      const filtered = filterWorkspaceArchitectureRows(analysis, inquiry);
      const rollup = workspaceRollupForRows(
        filtered.packages,
        filtered.surfaces,
        analysis.rollup.configDiagnosticCount,
      );
      return answerWorkspaceRows(
        inquiry,
        "workspace.architecture:surfaces",
        "workspace source surface row(s)",
        filtered.surfaces,
        basis,
        (rows) => ({ version: analysis.version, rollup, surfaces: rows }),
        workspaceEvidenceForSurface,
      );
    }
    case "profile":
      return answerWorkspaceArchitectureProfile(inquiry, analysis, basis);
  }
}

function answerWorkspaceArchitectureSummary(
  inquiry: Inquiry,
  analysis: WorkspaceArchitectureAnalysis,
  basis: readonly Basis[],
): Answer<WorkspaceArchitectureValue> {
  const filtered = filterWorkspaceArchitectureRows(analysis, inquiry);
  const rollup = workspaceRollupForRows(
    filtered.packages,
    filtered.surfaces,
    analysis.rollup.configDiagnosticCount,
  );
  const packages = filtered.packages.slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${rollup.packageCount} admitted package(s), ${rollup.externalPackageCount} external package(s), ${rollup.aureliaPackageCount} Aurelia-shaped package(s), ${rollup.entrypointCount} app entrypoint signal(s), and ${Object.keys(rollup.surfaceMechanisms).length} normalized surface mechanism(s).`,
    {
      value: {
        version: analysis.version,
        rollup,
        packages,
      },
      basis,
      evidence: packages.slice(0, evidenceLimit(inquiry)).map(workspaceEvidenceForPackage),
      continuations: workspaceArchitectureContinuations(inquiry),
    },
  );
}

function answerWorkspaceArchitectureProfile(
  inquiry: Inquiry,
  analysis: WorkspaceArchitectureAnalysis,
  basis: readonly Basis[],
): Answer<WorkspaceArchitectureValue> {
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Profiled workspace architecture in ${analysis.profile.totalMilliseconds.toFixed(1)}ms across ${analysis.profile.phases.length} phase(s).`,
    {
      value: {
        version: analysis.version,
        rollup: analysis.rollup,
        profile: analysis.profile,
      },
      basis,
      continuations: workspaceArchitectureContinuations(inquiry),
    },
  );
}

function answerWorkspaceRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => WorkspaceArchitectureValue,
  evidenceForRow: (row: TRow) => Evidence,
): Answer<WorkspaceArchitectureValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the paged workspace architecture row family.",
        routeSummary: "Next workspace architecture row page.",
      }),
      ...rows.flatMap((row) => workspaceSourceContinuations(row)),
      ...workspaceArchitectureContinuations(inquiry),
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

function workspaceArchitectureProjection(
  inquiry: Inquiry,
): WorkspaceArchitectureProjection {
  switch (inquiry.projection) {
    case "packages":
    case "surfaces":
    case "profile":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function filterWorkspaceArchitectureRows(
  analysis: WorkspaceArchitectureAnalysis,
  inquiry: Inquiry,
): FilteredWorkspaceArchitectureRows {
  const axisPackages = filterWorkspacePackagesForAxis(analysis.packages, inquiry);
  const axisPackageIds = new Set(axisPackages.map((row) => row.id));
  const query = inquiryLowerStringFilter(inquiry, "query");
  const queryPackageIds = new Set(
    query === undefined
      ? []
      : axisPackages.filter((row) => workspacePackageMatchesQuery(row, query)).map((row) => row.id),
  );
  const surfaces = filterWorkspaceSurfaces(
    analysis.surfaces,
    inquiry,
    axisPackageIds,
    queryPackageIds,
  );
  const surfacePackageIds = new Set(surfaces.map((row) => row.packageId));
  const hasSurfaceFilter = hasExplicitWorkspaceSurfaceFilter(inquiry);
  const packages = axisPackages.filter((row) => {
    if (surfacePackageIds.has(row.id)) {
      return true;
    }
    if (hasSurfaceFilter) {
      return false;
    }
    return query === undefined || queryPackageIds.has(row.id);
  });
  return { packages, surfaces };
}

function workspacePackageMatchesQuery(row: WorkspacePackageRow, query: string): boolean {
  return (
    row.id.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.rootPath.toLowerCase().includes(query) ||
    row.tsconfigPath.toLowerCase().includes(query) ||
    row.admissionRole.toLowerCase().includes(query) ||
    row.aureliaShape.toLowerCase().includes(query) ||
    (row.packageManager?.toLowerCase().includes(query) ?? false) ||
    row.buildToolHints.some((hint) => hint.toLowerCase().includes(query)) ||
    row.summary.toLowerCase().includes(query)
  );
}

function filterWorkspacePackagesForAxis(
  rows: readonly WorkspacePackageRow[],
  inquiry: Inquiry,
): readonly WorkspacePackageRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  const admissionRole = inquiryStringFilter(inquiry, "admissionRole");
  const aureliaShape = inquiryStringFilter(inquiry, "aureliaShape");
  const externalOnly = inquiryBooleanFilter(inquiry, "externalOnly");
  const aureliaOnly = inquiryBooleanFilter(inquiry, "aureliaOnly");
  return rows.filter((row) => {
    if (packageId !== undefined && row.id !== packageId) {
      return false;
    }
    if (admissionRole !== undefined && row.admissionRole !== admissionRole) {
      return false;
    }
    if (aureliaShape !== undefined && row.aureliaShape !== aureliaShape) {
      return false;
    }
    if (externalOnly === true && !row.external) {
      return false;
    }
    if (aureliaOnly === true && row.aureliaShape === "non-aurelia") {
      return false;
    }
    return true;
  });
}

function filterWorkspaceSurfaces(
  rows: readonly WorkspaceSurfaceRow[],
  inquiry: Inquiry,
  packageIds: ReadonlySet<string>,
  queryPackageIds: ReadonlySet<string>,
): readonly WorkspaceSurfaceRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  const admissionRole = inquiryStringFilter(inquiry, "admissionRole");
  const aureliaShape = inquiryStringFilter(inquiry, "aureliaShape");
  const kind = inquiryStringFilter(inquiry, "kind") ?? inquiryStringFilter(inquiry, "surfaceKind");
  const mechanism = inquiryStringFilter(inquiry, "mechanism");
  const facet = inquiryStringFilter(inquiry, "facet");
  const facetPrefix = inquiryStringFilter(inquiry, "facetPrefix");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (!packageIds.has(row.packageId)) {
      return false;
    }
    if (admissionRole !== undefined && row.admissionRole !== admissionRole) {
      return false;
    }
    if (aureliaShape !== undefined && row.aureliaShape !== aureliaShape) {
      return false;
    }
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (mechanism !== undefined && row.mechanism !== mechanism) {
      return false;
    }
    if (facet !== undefined && !(row.facets ?? []).includes(facet)) {
      return false;
    }
    if (
      facetPrefix !== undefined &&
      !(row.facets ?? []).some((rowFacet) => rowFacet.startsWith(facetPrefix))
    ) {
      return false;
    }
    return query === undefined ||
      queryPackageIds.has(row.packageId) ||
      workspaceSurfaceMatchesQuery(row, query);
  });
}

function workspaceSurfaceMatchesQuery(row: WorkspaceSurfaceRow, query: string): boolean {
  return (
    row.packageId.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.admissionRole.toLowerCase().includes(query) ||
    row.aureliaShape.toLowerCase().includes(query) ||
    row.kind.toLowerCase().includes(query) ||
    row.mechanism.toLowerCase().includes(query) ||
    (row.facets ?? []).some((rowFacet) =>
      rowFacet.toLowerCase().includes(query),
    ) ||
    (row.name?.toLowerCase().includes(query) ?? false) ||
    (row.filePath?.toLowerCase().includes(query) ?? false) ||
    row.summary.toLowerCase().includes(query)
  );
}

function hasExplicitWorkspaceSurfaceFilter(inquiry: Inquiry): boolean {
  return hasAnyInquiryStringFilter(inquiry, [
    "kind",
    "surfaceKind",
    "mechanism",
    "facet",
    "facetPrefix",
  ]);
}

function workspaceEvidenceForPackage(row: WorkspacePackageRow): Evidence {
  return {
    id: `${row.id}:workspace-evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    basis: workspaceSourceBasis(
      "Workspace package rows are derived from admitted package tsconfigs, package manifests, file inventory, and AST-level source signals.",
    ),
    data: row,
  };
}

function workspaceEvidenceForSurface(row: WorkspaceSurfaceRow): Evidence {
  return {
    id: `${row.id}:workspace-evidence`,
    kind: workspaceEvidenceKindForSurface(row),
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: workspaceSourceBasis(
      "Workspace surface rows are source-shape observations; app-entrypoint rows are import/receiver-grounded Aurelia bootstrap signals, not complete runtime proof.",
    ),
    source: row.source,
    data: row,
  };
}

function workspaceEvidenceKindForSurface(row: WorkspaceSurfaceRow): EvidenceKind {
  switch (row.kind) {
    case "resource":
      return EvidenceKind.ResourceDefinition;
    case "registration":
      return EvidenceKind.DiRegistration;
    case "di-resolution":
      return EvidenceKind.DiLookup;
    default:
      return EvidenceKind.MaintenanceSignal;
  }
}

function workspaceSourceContinuations(row: unknown): readonly Continuation[] {
  const source = (row as { readonly source?: WorkspaceSurfaceRow["source"] }).source;
  return sourceInspectionContinuations(source, {
    basis: [BasisKind.TypeScriptProgram],
    rationale: "Inspect the exact workspace source span behind this row.",
    routeSummary: "Exact source span for this workspace architecture row.",
  });
}

function workspaceArchitectureContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    {
      id: "workspace.architecture:packages",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect admitted package topology rows.",
      inquiry: {
        ...inquiry,
        projection: "packages",
      },
    },
    {
      id: "workspace.architecture:surfaces",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect exact source and manifest surfaces that expose app/workspace integration pressure.",
      inquiry: {
        ...inquiry,
        projection: "surfaces",
      },
    },
    {
      id: "workspace.architecture:plugin-architecture",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Move from broad workspace topology into the public Aurelia plugin pressure lane.",
      inquiry: {
        lens: LensId.PluginArchitecture,
        locus: RepoRootLocus,
        projection: "summary",
      },
    },
    {
      id: "workspace.architecture:map",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Return to the Atlas surface map.",
      inquiry: {
        lens: LensId.RepoMap,
        locus: RepoRootLocus,
        projection: "summary",
      },
    },
  ];
}

function workspaceArchitectureBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    workspaceSourceBasis(
      "Workspace architecture was derived from admitted source files, package manifests, file inventory, and the hot TypeScript Program.",
      sourceProject.snapshot().identity,
    ),
  ];
}

function workspaceSourceBasis(summary: string, identity = "working-tree"): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary,
    identity,
  };
}
