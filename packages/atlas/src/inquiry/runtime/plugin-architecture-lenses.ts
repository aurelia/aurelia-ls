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
  pluginRollupForRows,
  readPluginArchitectureAnalysis,
  type PluginArchitectureAnalysis,
  type PluginPackageRow,
  type PluginSurfaceRow,
} from "./plugin-architecture-analysis.js";
import {
  hasAnyInquiryStringFilter,
  inquiryLowerStringFilter,
  inquiryPackageIdFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  optionalNextPageContinuation,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";

/** Value returned by the plugin.architecture lens. */
export interface PluginArchitectureValue {
  readonly version: PluginArchitectureAnalysis["version"];
  readonly rollup: PluginArchitectureAnalysis["rollup"];
  readonly packages?: readonly PluginPackageRow[];
  readonly surfaces?: readonly PluginSurfaceRow[];
}

type PluginArchitectureProjection = "summary" | "packages" | "surfaces";

interface FilteredPluginArchitectureRows {
  readonly packages: readonly PluginPackageRow[];
  readonly surfaces: readonly PluginSurfaceRow[];
}

/** Answer public Aurelia plugin architecture inquiries from the hot SourceProject. */
export function answerPluginArchitecture(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<PluginArchitectureValue> {
  const analysis = readPluginArchitectureAnalysis(sourceProject);
  const basis = pluginArchitectureBasis(sourceProject);
  switch (pluginArchitectureProjection(inquiry)) {
    case "summary":
      return answerPluginArchitectureSummary(inquiry, analysis, basis);
    case "packages": {
      const filtered = filterPluginArchitectureRows(analysis, inquiry);
      const rollup = pluginRollupForRows(filtered.packages, filtered.surfaces);
      return answerPluginRows(
        inquiry,
        "plugin.architecture:packages",
        "public Aurelia plugin package row(s)",
        filtered.packages,
        basis,
        (rows) => ({ version: analysis.version, rollup, packages: rows }),
        pluginEvidenceForPackage,
      );
    }
    case "surfaces": {
      const filtered = filterPluginArchitectureRows(analysis, inquiry);
      const rollup = pluginRollupForRows(filtered.packages, filtered.surfaces);
      return answerPluginRows(
        inquiry,
        "plugin.architecture:surfaces",
        "public Aurelia plugin surface row(s)",
        filtered.surfaces,
        basis,
        (rows) => ({ version: analysis.version, rollup, surfaces: rows }),
        pluginEvidenceForSurface,
      );
    }
  }
}

function answerPluginArchitectureSummary(
  inquiry: Inquiry,
  analysis: PluginArchitectureAnalysis,
  basis: readonly Basis[],
): Answer<PluginArchitectureValue> {
  const filtered = filterPluginArchitectureRows(analysis, inquiry);
  const rollup = pluginRollupForRows(filtered.packages, filtered.surfaces);
  const packages = filtered.packages.slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${rollup.packageCount} public Aurelia plugin package(s), ${rollup.surfaceCount} plugin surface row(s), ${rollup.resourceCount} resource row(s), and ${rollup.diRegistrationCount} DI registration row(s).`,
    {
      value: {
        version: analysis.version,
        rollup,
        packages,
      },
      basis,
      evidence: packages.slice(0, evidenceLimit(inquiry)).map(pluginEvidenceForPackage),
      continuations: pluginArchitectureContinuations(inquiry),
    },
  );
}

function answerPluginRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => PluginArchitectureValue,
  evidenceForRow: (row: TRow) => Evidence,
): Answer<PluginArchitectureValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the paged plugin architecture row family.",
        routeSummary: "Next public plugin architecture row page.",
      }),
      ...rows.flatMap((row) => pluginSourceContinuations(row)),
      ...pluginArchitectureContinuations(inquiry),
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

function pluginArchitectureProjection(
  inquiry: Inquiry,
): PluginArchitectureProjection {
  switch (inquiry.projection) {
    case "packages":
    case "surfaces":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function filterPluginArchitectureRows(
  analysis: PluginArchitectureAnalysis,
  inquiry: Inquiry,
): FilteredPluginArchitectureRows {
  const axisPackages = filterPluginPackagesForAxis(analysis.packages, inquiry);
  const axisPackageIds = new Set(axisPackages.map((row) => row.id));
  const query = inquiryLowerStringFilter(inquiry, "query");
  const queryPackageIds = new Set(
    query === undefined
      ? []
      : axisPackages.filter((row) => pluginPackageMatchesQuery(row, query)).map((row) => row.id),
  );
  const surfaces = filterPluginSurfaces(
    analysis.surfaces,
    inquiry,
    axisPackageIds,
    queryPackageIds,
  );
  const surfacePackageIds = new Set(surfaces.map((row) => row.packageId));
  const hasSurfaceFilter = hasExplicitPluginSurfaceFilter(inquiry);
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

function filterPluginPackagesForAxis(
  rows: readonly PluginPackageRow[],
  inquiry: Inquiry,
): readonly PluginPackageRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  return rows.filter((row) => {
    if (packageId !== undefined && row.id !== packageId) {
      return false;
    }
    return true;
  });
}

function filterPluginSurfaces(
  rows: readonly PluginSurfaceRow[],
  inquiry: Inquiry,
  packageIds: ReadonlySet<string>,
  queryPackageIds: ReadonlySet<string>,
): readonly PluginSurfaceRow[] {
  const kind = inquiryStringFilter(inquiry, "kind") ?? inquiryStringFilter(inquiry, "surfaceKind");
  const mechanism = inquiryStringFilter(inquiry, "mechanism");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (!packageIds.has(row.packageId)) {
      return false;
    }
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (mechanism !== undefined && row.mechanism !== mechanism) {
      return false;
    }
    return query === undefined ||
      queryPackageIds.has(row.packageId) ||
      pluginSurfaceMatchesQuery(row, query);
  });
}

function pluginPackageMatchesQuery(row: PluginPackageRow, query: string): boolean {
  return (
    row.id.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.rootPath.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query)
  );
}

function pluginSurfaceMatchesQuery(row: PluginSurfaceRow, query: string): boolean {
  return (
    row.packageId.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.kind.toLowerCase().includes(query) ||
    row.mechanism.toLowerCase().includes(query) ||
    (row.name?.toLowerCase().includes(query) ?? false) ||
    row.filePath.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query)
  );
}

function hasExplicitPluginSurfaceFilter(inquiry: Inquiry): boolean {
  return hasAnyInquiryStringFilter(inquiry, ["kind", "surfaceKind", "mechanism"]);
}

function pluginEvidenceForPackage(row: PluginPackageRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: pluginSourceBasis(
      "Public Aurelia plugin package rows are derived from admitted workspace package tsconfigs.",
    ),
    data: row,
  };
}

function pluginEvidenceForSurface(row: PluginSurfaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: pluginEvidenceKindForSurface(row),
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: pluginSourceBasis(
      "Public Aurelia plugin surface rows are AST-derived from admitted plugin source.",
    ),
    source: row.source,
    data: row,
  };
}

function pluginEvidenceKindForSurface(row: PluginSurfaceRow): EvidenceKind {
  switch (row.kind) {
    case "resource":
      return EvidenceKind.ResourceDefinition;
    case "container-registration":
    case "di-registration":
      return EvidenceKind.DiRegistration;
    default:
      return EvidenceKind.MaintenanceSignal;
  }
}

function pluginSourceContinuations(row: unknown): readonly Continuation[] {
  const source = (row as { readonly source?: PluginSurfaceRow["source"] }).source;
  return sourceInspectionContinuations(source, {
    basis: [BasisKind.TypeScriptProgram],
    rationale: "Inspect the exact plugin source span behind this row.",
    routeSummary: "Exact source span for this public plugin surface row.",
  });
}

function pluginArchitectureContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    {
      id: "plugin.architecture:packages",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect package-level public plugin surface rollups.",
      inquiry: {
        ...inquiry,
        projection: "packages",
      },
    },
    {
      id: "plugin.architecture:surfaces",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect exact public plugin source surfaces that pressure semantic-runtime app analysis.",
      inquiry: {
        ...inquiry,
        projection: "surfaces",
      },
    },
    {
      id: "plugin.architecture:map",
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

function pluginArchitectureBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    pluginSourceBasis(
      "Public Aurelia plugin architecture was derived from the hot TypeScript Program.",
      sourceProject.snapshot().identity,
    ),
  ];
}

function pluginSourceBasis(summary: string, identity = "aurelia2-plugins"): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary,
    identity,
  };
}
