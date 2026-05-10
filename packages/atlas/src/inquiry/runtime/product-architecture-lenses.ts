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
import { LocusKind, RepoRootLocus } from "../locus.js";
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
import { groupByDefined } from "../../collections.js";
import {
  callDependencyRows,
  enrichProductArchitectureCallSiteRows,
  profileProductArchitectureAnalysis,
  readProductArchitectureAnalysis,
  type ProductArchitectureAnalysis,
  type ProductArchitectureAreaDependencyRow,
  type ProductArchitectureAreaRow,
  type ProductArchitectureCallDependencyRow,
  type ProductArchitectureCallSiteRow,
  type ProductArchitectureClassSurfaceRow,
  type ProductArchitectureCycleRow,
  type ProductArchitectureDeclarationRow,
  type ProductArchitectureDependencyRow,
  type ProductArchitectureFunctionSurfaceRow,
  type ProductArchitectureModuleRow,
  type ProductArchitecturePhaseProfile,
  type ProductArchitectureSymbolDependencyRow,
  type ProductArchitectureSymbolReferenceRow,
} from "./product-architecture-analysis.js";
import type {
  ProductArchitectureFieldProvenanceConstructionRow,
  ProductArchitectureKernelRecordBatchRow,
  ProductArchitectureKernelRecordConstructionRow,
} from "./product-architecture-kernel-records.js";
import type { ProductArchitectureSourceReference } from "./product-architecture-source.js";
import { productArchitectureProfileLaneName } from "./product-architecture-profile-label.js";
import {
  inquiryBooleanFilter,
  inquiryQueryMatches,
  inquiryNumberFilter,
  inquiryStringFilter,
  matchesFilterValue,
} from "./lens-filter-utils.js";
import {
  optionalNextPageContinuation,
  sourceForRow,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";

/** Value returned by the product.architecture lens. */
export interface ProductArchitectureValue {
  /** Analysis schema marker. */
  readonly version: ProductArchitectureAnalysis["version"];
  /** Compact rollup counts. Present only when the projection built every counted row family for its lane. */
  readonly rollup?: ProductArchitectureAnalysis["rollup"];
  /** Area rows when requested or useful for summary orientation. */
  readonly areas?: readonly ProductArchitectureAreaRow[];
  /** Module rows when requested or useful for summary orientation. */
  readonly modules?: readonly ProductArchitectureModuleRow[];
  /** Import dependency rows when requested or useful for summary orientation. */
  readonly dependencies?: readonly ProductArchitectureDependencyRow[];
  /** Aggregated area-to-area dependency rows when requested or useful for summary orientation. */
  readonly areaDependencies?: readonly ProductArchitectureAreaDependencyRow[];
  /** Declaration rows when requested. */
  readonly declarations?: readonly ProductArchitectureDeclarationRow[];
  /** Local import cycle rows when requested. */
  readonly cycles?: readonly ProductArchitectureCycleRow[];
  /** Class implementation surface rows when requested. */
  readonly classSurfaces?: readonly ProductArchitectureClassSurfaceRow[];
  /** Function/method implementation surface rows when requested. */
  readonly functionSurfaces?: readonly ProductArchitectureFunctionSurfaceRow[];
  /** Top-level helper-name duplicate groups when requested. */
  readonly functionDuplicateGroups?: readonly ProductArchitectureFunctionDuplicateGroupRow[];
  /** Checker-backed call or constructor invocation rows when requested. */
  readonly callSites?: readonly ProductArchitectureCallSiteRow[];
  /** Grouped checker-backed call dependency rows when requested. */
  readonly callDependencies?: readonly ProductArchitectureCallDependencyRow[];
  /** Checker-backed identifier reference rows when requested. */
  readonly symbolReferences?: readonly ProductArchitectureSymbolReferenceRow[];
  /** Grouped checker-backed symbol dependency rows when requested. */
  readonly symbolDependencies?: readonly ProductArchitectureSymbolDependencyRow[];
  /** KernelStoreRecord construction rows when requested. */
  readonly kernelRecordConstructions?: readonly ProductArchitectureKernelRecordConstructionRow[];
  /** KernelStoreBatch construction/commit rows when requested. */
  readonly kernelRecordBatches?: readonly ProductArchitectureKernelRecordBatchRow[];
  /** FieldProvenance construction rows when requested. */
  readonly fieldProvenanceConstructions?: readonly ProductArchitectureFieldProvenanceConstructionRow[];
  /** Cold build phase timings when requested. */
  readonly profile?: {
    /** True when checker-backed call-site and call dependency rows were included. */
    readonly includeCallSites: boolean;
    /** True when call-site rows include expensive checker type/signature displays. */
    readonly includeCallDetails: boolean;
    /** True when checker-backed identifier reference and symbol dependency rows were included. */
    readonly includeSymbols: boolean;
    /** True when KernelStoreRecord construction and batch rows were included. */
    readonly includeKernelRecords: boolean;
    readonly totalMilliseconds: number;
    readonly phases: readonly ProductArchitecturePhaseProfile[];
  };
}

interface ProductArchitectureSummaryRows {
  readonly largeModules: readonly ProductArchitectureModuleRow[];
  readonly crossAreaDependencies: readonly ProductArchitectureDependencyRow[];
  readonly areaDependencies: readonly ProductArchitectureAreaDependencyRow[];
  readonly largeFunctions: readonly ProductArchitectureFunctionSurfaceRow[];
  readonly callDependencies: readonly ProductArchitectureCallDependencyRow[];
  readonly cycles: readonly ProductArchitectureCycleRow[];
  readonly symbolDependencies: readonly ProductArchitectureSymbolDependencyRow[];
  readonly kernelRecordConstructions: readonly ProductArchitectureKernelRecordConstructionRow[];
  readonly kernelRecordBatches: readonly ProductArchitectureKernelRecordBatchRow[];
  readonly fieldProvenanceConstructions: readonly ProductArchitectureFieldProvenanceConstructionRow[];
}

type ProductArchitectureProjection =
  | "summary"
  | "areas"
  | "modules"
  | "dependencies"
  | "area-dependencies"
  | "declarations"
  | "cycles"
  | "classes"
  | "functions"
  | "function-duplicates"
  | "call-sites"
  | "call-dependencies"
  | "symbol-references"
  | "symbol-dependencies"
  | "kernel-records"
  | "kernel-batches"
  | "field-provenance"
  | "profile";

export interface ProductArchitectureFunctionDuplicateGroupRow {
  readonly id: string;
  readonly name: string;
  readonly functionCount: number;
  readonly fileCount: number;
  readonly lineCount: number;
  readonly distinctBodyFingerprintCount: number | null;
  readonly repeatedBodyFingerprintCount: number;
  readonly distinctBodyShapeFingerprintCount: number | null;
  readonly repeatedBodyShapeFingerprintCount: number;
  readonly samples: readonly string[];
  readonly source: ProductArchitectureSourceReference;
  readonly summary: string;
}

/** Answer semantic-runtime architecture inquiries from the hot TypeScript source project. */
export function answerProductArchitecture(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<ProductArchitectureValue> {
  const projection = productArchitectureProjection(inquiry);
  const basis = productArchitectureBasis(sourceProject);
  if (projection === "profile") {
    return answerProductArchitectureProfile(inquiry, sourceProject, basis);
  }
  const includeCallDetails = productArchitectureProjectionNeedsCallDetails(projection, inquiry);

  const analysis = readProductArchitectureAnalysis(sourceProject, {
    includeCallSites: productArchitectureProjectionNeedsCallSites(projection, inquiry),
    includeCallDetails,
    includeSymbols: productArchitectureProjectionNeedsSymbols(projection),
    includeKernelRecords: productArchitectureProjectionNeedsKernelRecords(projection),
  });

  switch (projection) {
    case "summary":
      return answerProductArchitectureSummary(inquiry, analysis, basis);
    case "areas":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:areas",
        "semantic-runtime area row(s)",
        filterAreas(analysis.areas, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), areas: rows }),
        evidenceForArea,
      );
    case "modules":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:modules",
        "semantic-runtime module row(s)",
        filterModules(analysis.modules, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), modules: rows }),
        productArchitectureSourceSpanEvidence,
      );
    case "dependencies":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:dependencies",
        "semantic-runtime dependency row(s)",
        filterDependencies(analysis.dependencies, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), dependencies: rows }),
        evidenceForDependency,
      );
    case "area-dependencies":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:area-dependencies",
        "semantic-runtime area dependency row(s)",
        filterAreaDependencies(analysis.areaDependencies, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), areaDependencies: rows }),
        productArchitectureMaintenanceEvidence,
      );
    case "declarations":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:declarations",
        "semantic-runtime declaration row(s)",
        filterDeclarations(analysis.declarations, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), declarations: rows }),
        evidenceForDeclaration,
      );
    case "cycles":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:cycles",
        "semantic-runtime import cycle row(s)",
        filterCycles(analysis.cycles, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), cycles: rows }),
        productArchitectureMaintenanceDiagnosticEvidence,
      );
    case "classes":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:classes",
        "semantic-runtime class surface row(s)",
        filterClassSurfaces(analysis.classSurfaces, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), classSurfaces: rows }),
        productArchitectureSourceSpanEvidence,
      );
    case "functions":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:functions",
        "semantic-runtime function surface row(s)",
        filterFunctionSurfaces(analysis.functionSurfaces, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), functionSurfaces: rows }),
        productArchitectureSourceSpanEvidence,
      );
    case "function-duplicates":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:function-duplicates",
        "semantic-runtime duplicate top-level function-name group(s)",
        filterFunctionDuplicateGroups(functionDuplicateGroups(analysis.functionSurfaces), inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), functionDuplicateGroups: rows }),
        productArchitectureMaintenanceEvidence,
      );
    case "call-sites":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:call-sites",
        "semantic-runtime call-site row(s)",
        filterCallSites(analysis.callSites, inquiry),
        basis,
        (rows) => ({
          ...productArchitectureBaseValue(analysis),
          callSites: callSiteRowsWithRequestedDetails(sourceProject, rows, inquiry),
        }),
        productArchitectureSymbolSupportEvidence,
      );
    case "call-dependencies":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:call-dependencies",
        "semantic-runtime call dependency row(s)",
        filterCallDependencies(callDependenciesForInquiry(analysis, inquiry), inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), callDependencies: rows }),
        productArchitectureMaintenanceEvidence,
      );
    case "symbol-references":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:symbol-references",
        "semantic-runtime checker-backed symbol reference row(s)",
        filterSymbolReferences(analysis.symbolReferences, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), symbolReferences: rows }),
        productArchitectureSymbolSupportEvidence,
      );
    case "symbol-dependencies":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:symbol-dependencies",
        "semantic-runtime checker-backed symbol dependency row(s)",
        filterSymbolDependencies(analysis.symbolDependencies, inquiry),
        basis,
        (rows) => ({ ...productArchitectureBaseValue(analysis), symbolDependencies: rows }),
        productArchitectureMaintenanceEvidence,
      );
    case "kernel-records":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:kernel-records",
        "semantic-runtime KernelStoreRecord construction row(s)",
        filterKernelRecordConstructions(analysis.kernelRecordConstructions, inquiry),
        basis,
        (rows) => ({
          ...productArchitectureBaseValue(analysis),
          kernelRecordConstructions: rows,
        }),
        productArchitectureSourceSpanEvidence,
      );
    case "kernel-batches":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:kernel-batches",
        "semantic-runtime KernelStoreBatch construction/commit row(s)",
        filterKernelRecordBatches(analysis.kernelRecordBatches, inquiry),
        basis,
        (rows) => ({
          ...productArchitectureBaseValue(analysis),
          kernelRecordBatches: rows,
        }),
        productArchitectureSourceSpanEvidence,
      );
    case "field-provenance":
      return answerProductArchitectureRows(
        inquiry,
        "product.architecture:field-provenance",
        "semantic-runtime FieldProvenance construction row(s)",
        filterFieldProvenanceConstructions(analysis.fieldProvenanceConstructions, inquiry),
        basis,
        (rows) => ({
          ...productArchitectureBaseValue(analysis),
          fieldProvenanceConstructions: rows,
        }),
        productArchitectureSourceSpanEvidence,
      );
  }
}

function answerProductArchitectureSummary(
  inquiry: Inquiry,
  analysis: ProductArchitectureAnalysis,
  basis: readonly Basis[],
): Answer<ProductArchitectureValue> {
  const summaryRows = productArchitectureSummaryRows(inquiry, analysis);

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${analysis.rollup.sourceFileCount} semantic-runtime source file(s), ${analysis.rollup.declarationCount} declaration(s), ${analysis.rollup.functionSurfaceCount} function surface(s), ${analysis.rollup.callSiteCount} call-site row(s), ${analysis.rollup.symbolReferenceCount} checker-backed symbol reference(s), ${analysis.rollup.kernelRecordConstructionCount} KernelStoreRecord construction(s), ${analysis.rollup.kernelRecordBatchCount} KernelStoreBatch site(s), ${analysis.rollup.fieldProvenanceConstructionCount} FieldProvenance construction(s), ${analysis.rollup.cycleCount} import cycle(s), and ${analysis.rollup.crossAreaDependencyCount} cross-area import(s).`,
    {
      value: {
        ...productArchitectureBaseValue(analysis, true),
        areas: filterAreas(analysis.areas, inquiry),
        modules: summaryRows.largeModules,
        functionSurfaces: summaryRows.largeFunctions,
        callDependencies: summaryRows.callDependencies,
        cycles: summaryRows.cycles,
        symbolDependencies: summaryRows.symbolDependencies,
        kernelRecordConstructions: summaryRows.kernelRecordConstructions,
        kernelRecordBatches: summaryRows.kernelRecordBatches,
        fieldProvenanceConstructions: summaryRows.fieldProvenanceConstructions,
        areaDependencies: summaryRows.areaDependencies,
        dependencies: summaryRows.crossAreaDependencies.slice(0, 6),
      },
      basis,
      evidence: productArchitectureSummaryEvidence(summaryRows, inquiry),
      continuations: productArchitectureSummaryContinuations(inquiry),
    },
  );
}

function productArchitectureSummaryRows(
  inquiry: Inquiry,
  analysis: ProductArchitectureAnalysis,
): ProductArchitectureSummaryRows {
  const limit = Math.min(rowLimit(inquiry), 12);
  return {
    largeModules: [...analysis.modules]
      .filter((row) => filterModules([row], inquiry).length === 1)
      .sort((left, right) => right.lineCount - left.lineCount)
      .slice(0, limit),
    crossAreaDependencies: analysis.dependencies
      .filter((row) => row.crossesArea)
      .filter((row) => filterDependencies([row], inquiry).length === 1)
      .slice(0, limit),
    areaDependencies: analysis.areaDependencies
      .filter((row) => row.crossesArea)
      .filter((row) => filterAreaDependencies([row], inquiry).length === 1)
      .slice(0, limit),
    largeFunctions: [...analysis.functionSurfaces]
      .filter((row) => filterFunctionSurfaces([row], inquiry).length === 1)
      .sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      )
      .slice(0, limit),
    callDependencies: filterCallDependencies(analysis.callDependencies, inquiry)
      .slice(0, limit),
    cycles: filterCycles(analysis.cycles, inquiry).slice(0, limit),
    symbolDependencies: filterSymbolDependencies(analysis.symbolDependencies, inquiry)
      .slice(0, limit),
    kernelRecordConstructions: filterKernelRecordConstructions(
      analysis.kernelRecordConstructions,
      inquiry,
    ).slice(0, limit),
    kernelRecordBatches: filterKernelRecordBatches(
      analysis.kernelRecordBatches,
      inquiry,
    ).slice(0, limit),
    fieldProvenanceConstructions: filterFieldProvenanceConstructions(
      analysis.fieldProvenanceConstructions,
      inquiry,
    ).slice(0, limit),
  };
}

function productArchitectureSummaryEvidence(
  rows: ProductArchitectureSummaryRows,
  inquiry: Inquiry,
): readonly Evidence[] {
  const limit = evidenceLimit(inquiry);
  return [
    ...rows.areaDependencies
      .slice(0, limit)
      .map(productArchitectureMaintenanceEvidence),
    ...rows.largeModules.slice(0, limit).map(productArchitectureSourceSpanEvidence),
    ...rows.largeFunctions
      .slice(0, limit)
      .map(productArchitectureSourceSpanEvidence),
    ...rows.callDependencies
      .slice(0, limit)
      .map(productArchitectureMaintenanceEvidence),
    ...rows.cycles
      .slice(0, limit)
      .map(productArchitectureMaintenanceDiagnosticEvidence),
    ...rows.symbolDependencies
      .slice(0, limit)
      .map(productArchitectureMaintenanceEvidence),
    ...rows.kernelRecordConstructions
      .slice(0, limit)
      .map(productArchitectureSourceSpanEvidence),
    ...rows.kernelRecordBatches
      .slice(0, limit)
      .map(productArchitectureSourceSpanEvidence),
    ...rows.fieldProvenanceConstructions
      .slice(0, limit)
      .map(productArchitectureSourceSpanEvidence),
    ...rows.crossAreaDependencies
      .slice(0, limit)
      .map(evidenceForDependency),
  ];
}

function answerProductArchitectureProfile(
  inquiry: Inquiry,
  sourceProject: SourceProject,
  basis: readonly Basis[],
): Answer<ProductArchitectureValue> {
  const includeCallSites = inquiryBooleanFilter(inquiry, "includeCallSites") ?? true;
  const includeCallDetails = inquiryBooleanFilter(inquiry, "includeCallDetails") ?? false;
  const includeSymbols = inquiryBooleanFilter(inquiry, "includeSymbols") ?? true;
  const includeKernelRecords = inquiryBooleanFilter(inquiry, "includeKernelRecords") ?? true;
  const profile = profileProductArchitectureAnalysis(sourceProject, {
    includeCallSites,
    includeCallDetails,
    includeSymbols,
    includeKernelRecords,
  });
  const slowestPhases = [...profile.phases]
    .sort((left, right) => right.milliseconds - left.milliseconds)
    .slice(0, evidenceLimit(inquiry));
  const slowest = slowestPhases[0] ?? null;
  const lane = productArchitectureProfileLaneName(
    profile.includeCallSites,
    profile.includeCallDetails,
    profile.includeSymbols,
    profile.includeKernelRecords,
  );
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Profiled ${lane} product.architecture cold analysis in ${profile.totalMilliseconds.toFixed(1)}ms${slowest === null ? "" : `; slowest phase was ${slowest.phase} at ${slowest.milliseconds.toFixed(1)}ms`}.`,
    {
      value: {
        ...productArchitectureBaseValue(profile.analysis, true),
        profile: {
          includeCallSites: profile.includeCallSites,
          includeCallDetails: profile.includeCallDetails,
          includeSymbols: profile.includeSymbols,
          includeKernelRecords: profile.includeKernelRecords,
          totalMilliseconds: profile.totalMilliseconds,
          phases: profile.phases,
        },
      },
      basis,
      evidence: slowestPhases.map(evidenceForPhaseProfile),
      continuations: productArchitectureContinuations(inquiry),
    },
  );
}

function answerProductArchitectureRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => ProductArchitectureValue,
  evidenceForRow: (row: TRow) => Evidence,
): Answer<ProductArchitectureValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow: (row) => evidenceForRow(row),
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        id: "product.architecture:next-page",
        rationale: "Continue semantic-runtime architecture rows.",
        routeSummary: "Next semantic-runtime architecture row page.",
        basis: [BasisKind.TypeScriptProgram],
      }),
      ...rows.flatMap((row) => productArchitectureSourceContinuations(row)),
      ...productArchitectureContinuations(inquiry),
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

function productArchitectureBaseValue(
  analysis: ProductArchitectureAnalysis,
  includeRollup: boolean = false,
): ProductArchitectureValue {
  return {
    version: analysis.version,
    ...(includeRollup ? { rollup: analysis.rollup } : {}),
  };
}

function productArchitectureProjection(
  inquiry: Inquiry,
): ProductArchitectureProjection {
  switch (inquiry.projection) {
    case undefined:
    case "summary":
      return "summary";
    case "areas":
    case "modules":
    case "dependencies":
    case "area-dependencies":
    case "declarations":
    case "cycles":
    case "classes":
    case "functions":
    case "function-duplicates":
    case "call-sites":
    case "call-dependencies":
    case "symbol-references":
    case "symbol-dependencies":
    case "kernel-records":
    case "kernel-batches":
    case "field-provenance":
    case "profile":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function productArchitectureProjectionNeedsSymbols(
  projection: ProductArchitectureProjection,
): boolean {
  return projection === "summary" ||
    projection === "symbol-references" ||
    projection === "symbol-dependencies";
}

function productArchitectureProjectionNeedsKernelRecords(
  projection: ProductArchitectureProjection,
): boolean {
  return projection === "summary" ||
    projection === "kernel-records" ||
    projection === "kernel-batches" ||
    projection === "field-provenance";
}

function productArchitectureProjectionNeedsCallSites(
  projection: ProductArchitectureProjection,
  inquiry: Inquiry,
): boolean {
  const explicit = inquiryBooleanFilter(inquiry, "includeCallSites");
  if (projection === "functions" && explicit !== undefined) {
    return explicit;
  }
  return projection === "summary" ||
    projection === "functions" ||
    projection === "call-sites" ||
    projection === "call-dependencies";
}

function productArchitectureProjectionNeedsCallDetails(
  projection: ProductArchitectureProjection,
  inquiry: Inquiry,
): boolean {
  return productArchitectureProjectionRequestsCallDetails(projection, inquiry) &&
    inquiryStringFilter(inquiry, "query") !== undefined;
}

function productArchitectureProjectionRequestsCallDetails(
  projection: ProductArchitectureProjection,
  inquiry: Inquiry,
): boolean {
  return projection === "call-sites" &&
    (inquiryBooleanFilter(inquiry, "includeCallDetails") ?? false);
}

function filterAreas(
  rows: readonly ProductArchitectureAreaRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureAreaRow[] {
  return rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.sourceRoot,
      row.summary,
    ]),
  );
}

function filterModules(
  rows: readonly ProductArchitectureModuleRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureModuleRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    atLeast(row.lineCount, inquiryNumberFilter(inquiry, "minLineCount")) &&
    atLeast(
      row.functionSurfaceCount,
      inquiryNumberFilter(inquiry, "minFunctionSurfaceCount"),
    ) &&
    atLeast(row.largeFunctionCount, inquiryNumberFilter(inquiry, "minLargeFunctionCount")) &&
    atLeast(
      row.maxFunctionLineCount,
      inquiryNumberFilter(inquiry, "minMaxFunctionLineCount"),
    ) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.summary,
      ...row.exportedNames,
    ]),
  );
  return orderModules(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterDependencies(
  rows: readonly ProductArchitectureDependencyRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureDependencyRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  return rows.filter((row) =>
    matchesFilterValue(row.fromFilePath, inquiryStringFilter(inquiry, "fromFilePath")) &&
    matchesFilterValue(row.toFilePath ?? "", inquiryStringFilter(inquiry, "toFilePath")) &&
    matchesPathPrefix(row.fromFilePath, pathPrefix) &&
    matchesFilterValue(row.fromArea, inquiryStringFilter(inquiry, "fromArea")) &&
    matchesFilterValue(row.toArea ?? "", inquiryStringFilter(inquiry, "toArea")) &&
    matchesFilterValue(row.importKind, inquiryStringFilter(inquiry, "importKind")) &&
    matchesFilterValue(row.local, inquiryBooleanFilter(inquiry, "local")) &&
    matchesFilterValue(row.relative, inquiryBooleanFilter(inquiry, "relative")) &&
    matchesFilterValue(row.resolved, inquiryBooleanFilter(inquiry, "resolved")) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.fromFilePath,
      row.fromArea,
      row.moduleSpecifier,
      row.toFilePath ?? "",
      row.toArea ?? "",
      row.summary,
    ]),
  );
}

function filterAreaDependencies(
  rows: readonly ProductArchitectureAreaDependencyRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureAreaDependencyRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  return rows.filter((row) =>
    matchesFilterValue(row.fromArea, inquiryStringFilter(inquiry, "fromArea")) &&
    matchesFilterValue(row.toArea, inquiryStringFilter(inquiry, "toArea")) &&
    (pathPrefix === undefined ||
      row.fromFilePaths.some((filePath) =>
        matchesPathPrefix(filePath, pathPrefix)
      ) ||
      row.toFilePaths.some((filePath) =>
        matchesPathPrefix(filePath, pathPrefix)
      )) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.fromArea,
      row.toArea,
      row.summary,
      ...row.fromFilePaths,
      ...row.toFilePaths,
      ...row.sampleFromFiles,
      ...row.sampleToFiles,
      ...row.sampleModuleSpecifiers,
    ]),
  );
}

function filterDeclarations(
  rows: readonly ProductArchitectureDeclarationRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureDeclarationRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    matchesFilterValue(row.declarationKind, inquiryStringFilter(inquiry, "declarationKind")) &&
    matchesFilterValue(row.exported, inquiryBooleanFilter(inquiry, "exported")) &&
    matchesFilterValue(row.topLevel, inquiryBooleanFilter(inquiry, "topLevel")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.declarationKind,
      row.name,
      row.symbolKey ?? "",
      row.summary,
    ]),
  );
  return orderDeclarations(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterCycles(
  rows: readonly ProductArchitectureCycleRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureCycleRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    (inquiryStringFilter(inquiry, "area") === undefined ||
      row.areas.includes(inquiryStringFilter(inquiry, "area")!)) &&
    (inquiryStringFilter(inquiry, "filePath") === undefined ||
      row.filePaths.includes(inquiryStringFilter(inquiry, "filePath")!)) &&
    (pathPrefix === undefined ||
      row.filePaths.some((filePath) => matchesPathPrefix(filePath, pathPrefix))) &&
    matchesFilterValue(row.runtimeCycle, inquiryBooleanFilter(inquiry, "runtimeCycle")) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.summary,
      ...row.areas,
      ...row.filePaths,
      ...row.sampleModuleSpecifiers,
    ]),
  );
  return orderCycles(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterClassSurfaces(
  rows: readonly ProductArchitectureClassSurfaceRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureClassSurfaceRow[] {
  const className = inquiryStringFilter(inquiry, "className");
  const classNameSuffix = inquiryStringFilter(inquiry, "classNameSuffix");
  const methodName = inquiryStringFilter(inquiry, "methodName");
  const auLinkId = inquiryStringFilter(inquiry, "auLinkId");
  const auLinkCatalogIdForName = inquiryStringFilter(inquiry, "auLinkCatalogIdForName");
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    matchesFilterValue(row.name, className) &&
    (classNameSuffix === undefined || row.name.endsWith(classNameSuffix)) &&
    matchesFilterValue(row.exported, inquiryBooleanFilter(inquiry, "exported")) &&
    matchesFilterValue(row.auLinkIds.length > 0, inquiryBooleanFilter(inquiry, "hasAuLink")) &&
    matchesFilterValue(
      row.auLinkCatalogIdsForName.length > 0,
      inquiryBooleanFilter(inquiry, "hasAuLinkCatalogNameMatch"),
    ) &&
    matchesAny(row.auLinkIds, auLinkId) &&
    matchesAny(row.auLinkCatalogIdsForName, auLinkCatalogIdForName) &&
    atLeast(row.lineCount, inquiryNumberFilter(inquiry, "minLineCount")) &&
    atLeast(row.methodCount, inquiryNumberFilter(inquiry, "minMethodCount")) &&
    atLeast(row.propertyCount, inquiryNumberFilter(inquiry, "minPropertyCount")) &&
    (methodName === undefined ||
      row.methods.includes(methodName) ||
      row.staticMethods.includes(methodName)) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.name,
      row.extendsType ?? "",
      row.summary,
      ...row.implementsTypes,
      ...row.methods,
      ...row.staticMethods,
      ...row.accessors,
      ...row.properties,
      ...row.auLinkIds,
      ...row.auLinkCatalogIdsForName,
    ]),
  );
  return orderClassSurfaces(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterFunctionSurfaces(
  rows: readonly ProductArchitectureFunctionSurfaceRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureFunctionSurfaceRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    matchesFilterValue(row.functionKind, inquiryStringFilter(inquiry, "functionKind")) &&
    matchesFilterValue(row.className ?? "", inquiryStringFilter(inquiry, "className")) &&
    matchesFilterValue(
      row.parentFunctionName ?? "",
      inquiryStringFilter(inquiry, "parentFunctionName"),
    ) &&
    matchesFilterValue(row.name, inquiryStringFilter(inquiry, "functionName")) &&
    matchesFilterValue(row.bodyFingerprint, inquiryStringFilter(inquiry, "bodyFingerprint")) &&
    matchesFilterValue(row.bodyShapeFingerprint, inquiryStringFilter(inquiry, "bodyShapeFingerprint")) &&
    matchesFilterValue(row.exported, inquiryBooleanFilter(inquiry, "exported")) &&
    matchesFilterValue(row.static, inquiryBooleanFilter(inquiry, "static")) &&
    matchesFilterValue(row.async, inquiryBooleanFilter(inquiry, "async")) &&
    atLeast(row.lineCount, inquiryNumberFilter(inquiry, "minLineCount")) &&
    atLeast(row.callSiteCount, inquiryNumberFilter(inquiry, "minCallSiteCount")) &&
    atLeast(
      row.distinctCalleeCount,
      inquiryNumberFilter(inquiry, "minDistinctCalleeCount"),
    ) &&
    atLeast(
      row.crossAreaCallSiteCount,
      inquiryNumberFilter(inquiry, "minCrossAreaCallSiteCount"),
    ) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.functionKind,
      row.className ?? "",
      row.parentFunctionName ?? "",
      row.name,
      row.bodyFingerprint,
      row.bodyShapeFingerprint,
      row.summary,
    ]),
  );
  return orderFunctionSurfaces(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function functionDuplicateGroups(
  rows: readonly ProductArchitectureFunctionSurfaceRow[],
): readonly ProductArchitectureFunctionDuplicateGroupRow[] {
  const byName = new Map<string, ProductArchitectureFunctionSurfaceRow[]>();
  for (const row of rows) {
    if (row.name.length < 5 || row.functionKind !== "top-level") {
      continue;
    }
    const group = byName.get(row.name) ?? [];
    group.push(row);
    byName.set(row.name, group);
  }

  return [...byName.entries()]
    .map(([name, group]) => functionDuplicateGroupRow(name, group))
    .filter((group): group is ProductArchitectureFunctionDuplicateGroupRow => group !== null)
    .sort((left, right) =>
      right.repeatedBodyShapeFingerprintCount - left.repeatedBodyShapeFingerprintCount ||
      right.repeatedBodyFingerprintCount - left.repeatedBodyFingerprintCount ||
      right.functionCount - left.functionCount ||
      right.lineCount - left.lineCount ||
      left.name.localeCompare(right.name)
    );
}

function functionDuplicateGroupRow(
  name: string,
  group: readonly ProductArchitectureFunctionSurfaceRow[],
): ProductArchitectureFunctionDuplicateGroupRow | null {
  const fileCount = new Set(group.map((row) => row.filePath)).size;
  if (fileCount <= 1) {
    return null;
  }
  const rowsByBodyFingerprint = groupByDefined(group, (row) => row.bodyFingerprint);
  const rowsByBodyShapeFingerprint = groupByDefined(group, (row) => row.bodyShapeFingerprint);
  const first = group[0];
  if (first === undefined) {
    return null;
  }
  const repeatedBodyFingerprintCount = repeatedFingerprintCount(rowsByBodyFingerprint);
  const repeatedBodyShapeFingerprintCount = repeatedFingerprintCount(rowsByBodyShapeFingerprint);
  const lineCount = group.reduce((total, row) => total + row.lineCount, 0);
  return {
    id: `product.architecture:function-duplicates:${name}`,
    name,
    functionCount: group.length,
    fileCount,
    lineCount,
    distinctBodyFingerprintCount: rowsByBodyFingerprint.size === 0 ? null : rowsByBodyFingerprint.size,
    repeatedBodyFingerprintCount,
    distinctBodyShapeFingerprintCount: rowsByBodyShapeFingerprint.size === 0 ? null : rowsByBodyShapeFingerprint.size,
    repeatedBodyShapeFingerprintCount,
    samples: group.slice(0, 3).map((row) => `${row.filePath}:${row.source.startLine}`),
    source: first.source,
    summary: `${name}: ${group.length} top-level function surface(s) across ${fileCount} file(s), ${repeatedBodyShapeFingerprintCount} repeated body-shape fingerprint(s).`,
  };
}

function filterFunctionDuplicateGroups(
  rows: readonly ProductArchitectureFunctionDuplicateGroupRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureFunctionDuplicateGroupRow[] {
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.name, inquiryStringFilter(inquiry, "functionName")) &&
    atLeast(row.functionCount, inquiryNumberFilter(inquiry, "minFunctionCount")) &&
    atLeast(row.fileCount, inquiryNumberFilter(inquiry, "minFileCount")) &&
    atLeast(row.repeatedBodyFingerprintCount, inquiryNumberFilter(inquiry, "minRepeatedBodyFingerprintCount")) &&
    atLeast(row.repeatedBodyShapeFingerprintCount, inquiryNumberFilter(inquiry, "minRepeatedBodyShapeFingerprintCount")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.name,
      row.summary,
      ...row.samples,
    ]),
  );
  return orderFunctionDuplicateGroups(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function repeatedFingerprintCount(
  groups: ReadonlyMap<string, readonly ProductArchitectureFunctionSurfaceRow[]>,
): number {
  return [...groups.values()]
    .filter((rows) => new Set(rows.map((row) => row.filePath)).size > 1)
    .length;
}

function filterCallSites(
  rows: readonly ProductArchitectureCallSiteRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureCallSiteRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.fromFilePath, inquiryStringFilter(inquiry, "fromFilePath")) &&
    matchesFilterValue(row.targetFilePath ?? "", inquiryStringFilter(inquiry, "toFilePath")) &&
    matchesPathPrefix(row.fromFilePath, pathPrefix) &&
    matchesFilterValue(row.fromArea, inquiryStringFilter(inquiry, "fromArea")) &&
    matchesFilterValue(row.targetArea ?? "", inquiryStringFilter(inquiry, "toArea")) &&
    matchesFilterValue(row.targetPackageId ?? "", inquiryStringFilter(inquiry, "targetPackageId")) &&
    matchesFilterValue(row.callKind, inquiryStringFilter(inquiry, "callKind")) &&
    matchesFilterValue(row.calleeName, inquiryStringFilter(inquiry, "calleeName")) &&
    matchesFilterValue(row.calleeSymbolName ?? "", inquiryStringFilter(inquiry, "calleeSymbolName")) &&
    matchesFilterValue(row.calleeSymbolKey ?? "", inquiryStringFilter(inquiry, "calleeSymbolKey")) &&
    matchesFilterValue(row.className ?? "", inquiryStringFilter(inquiry, "className")) &&
    matchesFilterValue(row.functionName ?? "", inquiryStringFilter(inquiry, "functionName")) &&
    matchesFilterValue(row.resolved, inquiryBooleanFilter(inquiry, "resolved")) &&
    matchesFilterValue(row.local, inquiryBooleanFilter(inquiry, "local")) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.fromFilePath,
      row.fromArea,
      row.className ?? "",
      row.functionName ?? "",
      row.callKind,
      row.calleeName,
      row.calleeText,
      row.calleeType ?? "",
      row.calleeSymbolName ?? "",
      row.calleeSymbolKey ?? "",
      row.targetPackageId ?? "",
      row.targetFilePath ?? "",
      row.targetArea ?? "",
      row.signature ?? "",
      row.summary,
    ]),
  );
  return orderCallSites(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function callSiteRowsWithRequestedDetails(
  sourceProject: SourceProject,
  rows: readonly ProductArchitectureCallSiteRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureCallSiteRow[] {
  if (
    !productArchitectureProjectionRequestsCallDetails("call-sites", inquiry) ||
    rows.every((row) => row.calleeType !== null)
  ) {
    return rows;
  }
  return enrichProductArchitectureCallSiteRows(sourceProject, rows);
}

function callDependenciesForInquiry(
  analysis: ProductArchitectureAnalysis,
  inquiry: Inquiry,
): readonly ProductArchitectureCallDependencyRow[] {
  const className = inquiryStringFilter(inquiry, "className");
  const functionName = inquiryStringFilter(inquiry, "functionName");
  if (className === undefined && functionName === undefined) {
    return analysis.callDependencies;
  }
  return callDependencyRows(analysis.callSites.filter((row) =>
    matchesFilterValue(row.className ?? "", className) &&
    matchesFilterValue(row.functionName ?? "", functionName)
  ));
}

function filterCallDependencies(
  rows: readonly ProductArchitectureCallDependencyRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureCallDependencyRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.fromFilePath, inquiryStringFilter(inquiry, "fromFilePath")) &&
    matchesFilterValue(row.targetFilePath ?? "", inquiryStringFilter(inquiry, "toFilePath")) &&
    matchesPathPrefix(row.fromFilePath, pathPrefix) &&
    matchesFilterValue(row.fromArea, inquiryStringFilter(inquiry, "fromArea")) &&
    matchesFilterValue(row.targetArea ?? "", inquiryStringFilter(inquiry, "toArea")) &&
    matchesFilterValue(row.targetPackageId ?? "", inquiryStringFilter(inquiry, "targetPackageId")) &&
    matchesAny(row.classNames, inquiryStringFilter(inquiry, "className")) &&
    matchesAny(row.functionNames, inquiryStringFilter(inquiry, "functionName")) &&
    matchesFilterValue(row.resolved, inquiryBooleanFilter(inquiry, "resolved")) &&
    matchesFilterValue(row.local, inquiryBooleanFilter(inquiry, "local")) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.fromFilePath,
      row.fromArea,
      row.targetFilePath ?? "",
      row.targetPackageId ?? "",
      row.targetArea ?? "",
      row.summary,
      ...row.classNames,
      ...row.functionNames,
      ...row.sampleCalleeNames,
      ...row.sampleCalleeTexts,
      ...row.sampleFunctionNames,
    ]),
  );
  return orderCallDependencies(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterSymbolReferences(
  rows: readonly ProductArchitectureSymbolReferenceRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureSymbolReferenceRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.fromFilePath, inquiryStringFilter(inquiry, "fromFilePath")) &&
    matchesFilterValue(row.targetFilePath, inquiryStringFilter(inquiry, "toFilePath")) &&
    matchesPathPrefix(row.fromFilePath, pathPrefix) &&
    matchesFilterValue(row.fromArea, inquiryStringFilter(inquiry, "fromArea")) &&
    matchesFilterValue(row.targetArea ?? "", inquiryStringFilter(inquiry, "toArea")) &&
    matchesFilterValue(row.targetPackageId ?? "", inquiryStringFilter(inquiry, "targetPackageId")) &&
    matchesFilterValue(row.usageRole, inquiryStringFilter(inquiry, "usageRole")) &&
    matchesUsageFamily(row.usageRole, inquiryStringFilter(inquiry, "usageFamily")) &&
    matchesFilterValue(row.symbolName, inquiryStringFilter(inquiry, "symbolName")) &&
    matchesFilterValue(row.symbolKey, inquiryStringFilter(inquiry, "symbolKey")) &&
    matchesFilterValue(row.className ?? "", inquiryStringFilter(inquiry, "className")) &&
    matchesFilterValue(row.functionName ?? "", inquiryStringFilter(inquiry, "functionName")) &&
    matchesFilterValue(row.local, inquiryBooleanFilter(inquiry, "local")) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.fromFilePath,
      row.fromArea,
      row.className ?? "",
      row.functionName ?? "",
      row.usageRole,
      row.usageText,
      row.symbolName,
      row.symbolKey,
      row.targetPackageId ?? "",
      row.targetFilePath,
      row.targetArea ?? "",
      row.summary,
    ]),
  );
  return orderSymbolReferences(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterSymbolDependencies(
  rows: readonly ProductArchitectureSymbolDependencyRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureSymbolDependencyRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.fromFilePath, inquiryStringFilter(inquiry, "fromFilePath")) &&
    matchesFilterValue(row.targetFilePath, inquiryStringFilter(inquiry, "toFilePath")) &&
    matchesPathPrefix(row.fromFilePath, pathPrefix) &&
    matchesFilterValue(row.fromArea, inquiryStringFilter(inquiry, "fromArea")) &&
    matchesFilterValue(row.targetArea ?? "", inquiryStringFilter(inquiry, "toArea")) &&
    matchesFilterValue(row.targetPackageId ?? "", inquiryStringFilter(inquiry, "targetPackageId")) &&
    matchesSymbolDependencyUsageFamily(
      row,
      inquiryStringFilter(inquiry, "usageFamily"),
    ) &&
    matchesFilterValue(row.local, inquiryBooleanFilter(inquiry, "local")) &&
    matchesFilterValue(row.crossesArea, inquiryBooleanFilter(inquiry, "crossesArea")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.fromFilePath,
      row.fromArea,
      row.targetFilePath,
      row.targetPackageId ?? "",
      row.targetArea ?? "",
      row.summary,
      ...row.sampleSymbolNames,
      ...row.sampleFunctionNames,
    ]),
  );
  return orderSymbolDependencies(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function filterKernelRecordConstructions(
  rows: readonly ProductArchitectureKernelRecordConstructionRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureKernelRecordConstructionRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    matchesFilterValue(row.constructionKind, inquiryStringFilter(inquiry, "constructionKind")) &&
    matchesFilterValue(row.className ?? "", inquiryStringFilter(inquiry, "className")) &&
    matchesFilterValue(row.recordKind, inquiryStringFilter(inquiry, "recordKind")) &&
    matchesFilterValue(
      row.productKindExpression ?? "",
      inquiryStringFilter(inquiry, "productKindExpression"),
    ) &&
    matchesFilterValue(
      row.predicateKeyExpression ?? "",
      inquiryStringFilter(inquiry, "predicateKeyExpression"),
    ) &&
    matchesFilterValue(
      row.seamKindExpression ?? "",
      inquiryStringFilter(inquiry, "seamKindExpression"),
    ) &&
    matchesFilterValue(
      row.evidenceKindExpression ?? "",
      inquiryStringFilter(inquiry, "evidenceKindExpression"),
    ) &&
    matchesFilterValue(row.ownerClassName ?? "", inquiryStringFilter(inquiry, "ownerClassName")) &&
    matchesFilterValue(
      row.ownerFunctionName ?? "",
      inquiryStringFilter(inquiry, "ownerFunctionName"),
    ) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.constructionKind,
      row.className ?? "",
      row.recordKind,
      row.productKindExpression ?? "",
      row.predicateKeyExpression ?? "",
      row.seamKindExpression ?? "",
      row.evidenceKindExpression ?? "",
      row.ownerClassName ?? "",
      row.ownerFunctionName ?? "",
      row.summary,
    ]),
  );
  return orderKernelRecordConstructions(
    filtered,
    inquiryStringFilter(inquiry, "orderBy"),
  );
}

function filterKernelRecordBatches(
  rows: readonly ProductArchitectureKernelRecordBatchRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureKernelRecordBatchRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    matchesFilterValue(row.recordsExpression ?? "", inquiryStringFilter(inquiry, "recordsExpression")) &&
    matchesFilterValue(row.labelExpression ?? "", inquiryStringFilter(inquiry, "labelExpression")) &&
    matchesFilterValue(row.labelLiteral ?? "", inquiryStringFilter(inquiry, "labelLiteral")) &&
    matchesFilterValue(
      row.commitReceiverExpression ?? "",
      inquiryStringFilter(inquiry, "commitReceiverExpression"),
    ) &&
    matchesFilterValue(row.ownerClassName ?? "", inquiryStringFilter(inquiry, "ownerClassName")) &&
    matchesFilterValue(
      row.ownerFunctionName ?? "",
      inquiryStringFilter(inquiry, "ownerFunctionName"),
    ) &&
    matchesFilterValue(row.committed, inquiryBooleanFilter(inquiry, "committed")) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.recordsExpression ?? "",
      row.labelExpression ?? "",
      row.labelLiteral ?? "",
      row.commitReceiverExpression ?? "",
      row.ownerClassName ?? "",
      row.ownerFunctionName ?? "",
      row.summary,
    ]),
  );
  return orderKernelRecordBatches(
    filtered,
    inquiryStringFilter(inquiry, "orderBy"),
  );
}

function filterFieldProvenanceConstructions(
  rows: readonly ProductArchitectureFieldProvenanceConstructionRow[],
  inquiry: Inquiry,
): readonly ProductArchitectureFieldProvenanceConstructionRow[] {
  const pathPrefix = pathPrefixFilter(inquiry);
  const filtered = rows.filter((row) =>
    matchesFilterValue(row.area, inquiryStringFilter(inquiry, "area")) &&
    matchesFilterValue(row.filePath, inquiryStringFilter(inquiry, "filePath")) &&
    matchesPathPrefix(row.filePath, pathPrefix) &&
    matchesFilterValue(row.fieldNameLiteral ?? "", inquiryStringFilter(inquiry, "fieldName")) &&
    matchesFilterValue(row.fieldNameExpression ?? "", inquiryStringFilter(inquiry, "fieldNameExpression")) &&
    matchesFilterValue(row.provenanceExpression ?? "", inquiryStringFilter(inquiry, "provenanceExpression")) &&
    matchesFilterValue(row.ownerClassName ?? "", inquiryStringFilter(inquiry, "ownerClassName")) &&
    matchesFilterValue(
      row.ownerFunctionName ?? "",
      inquiryStringFilter(inquiry, "ownerFunctionName"),
    ) &&
    inquiryQueryMatches(inquiry, [
      row.id,
      row.area,
      row.filePath,
      row.fieldNameExpression ?? "",
      row.fieldNameLiteral ?? "",
      row.provenanceExpression ?? "",
      row.ownerClassName ?? "",
      row.ownerFunctionName ?? "",
      row.summary,
    ]),
  );
  return orderFieldProvenanceConstructions(
    filtered,
    inquiryStringFilter(inquiry, "orderBy"),
  );
}

function evidenceForArea(row: ProductArchitectureAreaRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    data: row,
  };
}

function evidenceForDependency(row: ProductArchitectureDependencyRow): Evidence {
  return productArchitectureSourceEvidence(
    row,
    row.resolved ? EvidenceKind.SourceSpan : EvidenceKind.MaintenanceSignal,
    row.resolved ? EvidenceRole.Support : EvidenceRole.Diagnostic,
  );
}

function evidenceForDeclaration(
  row: ProductArchitectureDeclarationRow,
): Evidence {
  return productArchitectureSourceEvidence(
    row,
    row.symbolKey === null ? EvidenceKind.SourceSpan : EvidenceKind.Symbol,
  );
}

function productArchitectureSourceSpanEvidence(
  row: ProductArchitectureSourceEvidenceRow,
): Evidence {
  return productArchitectureSourceEvidence(row, EvidenceKind.SourceSpan);
}

function productArchitectureMaintenanceEvidence(
  row: ProductArchitectureSourceEvidenceRow,
): Evidence {
  return productArchitectureSourceEvidence(row, EvidenceKind.MaintenanceSignal);
}

function productArchitectureMaintenanceDiagnosticEvidence(
  row: ProductArchitectureSourceEvidenceRow,
): Evidence {
  return productArchitectureSourceEvidence(row, EvidenceKind.MaintenanceSignal, EvidenceRole.Diagnostic);
}

function productArchitectureSymbolSupportEvidence(
  row: ProductArchitectureSourceEvidenceRow,
): Evidence {
  return productArchitectureSourceEvidence(row, EvidenceKind.Symbol, EvidenceRole.Support);
}

type ProductArchitectureSourceEvidenceRow = {
  readonly id: string;
  readonly summary: string;
  readonly source: Parameters<typeof sourceRangeFromOneBasedReference>[0];
};

function productArchitectureSourceEvidence(
  row: ProductArchitectureSourceEvidenceRow,
  kind: EvidenceKind,
  role: EvidenceRole = EvidenceRole.Subject,
): Evidence {
  return {
    id: row.id,
    kind,
    role,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  };
}

function evidenceForPhaseProfile(row: ProductArchitecturePhaseProfile): Evidence {
  return {
    id: `product.architecture:profile:${row.phase}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.phase} took ${row.milliseconds.toFixed(1)}ms${row.count == null ? "" : ` and produced ${row.count} row(s)`}.`,
    data: row,
  };
}

function productArchitectureSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:areas",
      "areas",
      "Inspect semantic-runtime top-level source areas and cross-area counts.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:area-dependencies",
      "area-dependencies",
      "Inspect grouped area-to-area import pressure before drilling into individual imports.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:dependencies",
      "dependencies",
      "Inspect import dependencies, especially cross-area and unresolved relatives.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:cycles",
      "cycles",
      "Inspect strongly-connected local import groups before larger product refactors.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:symbol-dependencies",
      "symbol-dependencies",
      "Inspect checker-backed symbol coupling between semantic-runtime source files.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:call-dependencies",
      "call-dependencies",
      "Inspect checker-backed call coupling between semantic-runtime source files and framework/product targets.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:kernel-records",
      "kernel-records",
      "Inspect source-level KernelStoreRecord construction sites and product vocabulary entry points.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:kernel-batches",
      "kernel-batches",
      "Inspect KernelStoreBatch construction and commit labels across semantic-runtime passes.",
      ContinuationPriority.Primary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:field-provenance",
      "field-provenance",
      "Inspect FieldProvenance construction sites across semantic-runtime product models.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:profile",
      "profile",
      "Profile cold product.architecture build phases before cache, warmup, or split work.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:call-sites",
      "call-sites",
      "Inspect exact semantic-runtime call sites with owner function, callee, and resolved target.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:symbol-references",
      "symbol-references",
      "Inspect exact semantic-runtime identifier references resolved by the TypeScript checker.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:modules",
      "modules",
      "Inspect source modules with declaration, import, and size counts.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:functions",
      "functions",
      "Inspect function and method implementation bodies ranked by source span.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:classes",
      "classes",
      "Inspect class surfaces with method, property, heritage, and source-span counts.",
      ContinuationPriority.Secondary,
    ),
    productArchitectureContinuation(
      inquiry,
      "product.architecture:summary:declarations",
      "declarations",
      "Inspect semantic-runtime declaration surfaces by area, file, and export.",
      ContinuationPriority.Secondary,
    ),
  ];
}

function productArchitectureContinuations(inquiry: Inquiry): readonly Continuation[] {
  if (inquiry.projection === "summary") {
    return [];
  }
  return [
    productArchitectureContinuation(
      inquiry,
      "product.architecture:back-to-summary",
      "summary",
      "Return to the semantic-runtime architecture rollup.",
      ContinuationPriority.Secondary,
    ),
  ];
}

function productArchitectureSourceContinuations(row: unknown): readonly Continuation[] {
  const source = sourceForRow<ProductArchitectureSourceReference>(row);
  return sourceInspectionContinuations(
    source === undefined ? undefined : sourceRangeFromOneBasedReference(source),
    {
      ...(source === undefined
        ? {}
        : {
            id: `product.architecture:source:${source.filePath}:${source.startLine}:${source.startCharacter}`,
          }),
      basis: [BasisKind.TypeScriptProgram, BasisKind.SourceText],
      rationale: "Inspect the source behind this semantic-runtime architecture row.",
      routeSummary: "Source backing for a product architecture row.",
    },
  );
}

function productArchitectureContinuation(
  inquiry: Inquiry,
  id: string,
  projection: ProductArchitectureProjection,
  rationale: string,
  priority: ContinuationPriority,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority,
    rationale,
    inquiry: {
      lens: LensId.ProductArchitecture,
      locus: inquiry.locus ?? RepoRootLocus,
      projection,
      filters: inquiry.filters,
      budget: inquiry.budget,
    },
    route: {
      plane: NavigationPlane.Structure,
      relation: NavigationRelation.ProjectionOf,
      basis: [BasisKind.TypeScriptProgram],
      summary: `Semantic-runtime architecture ${projection} projection.`,
    },
  };
}

function productArchitectureBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    {
      kind: BasisKind.TypeScriptProgram,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      summary:
        "Read semantic-runtime source files, declarations, and import declarations from the hot TypeScript Program.",
      identity: sourceProject.summary().identity,
    },
  ];
}

function atLeast(value: number, minimum: number | undefined): boolean {
  return minimum === undefined || value >= minimum;
}

function matchesAny(values: readonly string[], expected: string | undefined): boolean {
  return expected === undefined || values.includes(expected);
}

function pathPrefixFilter(inquiry: Inquiry): string | undefined {
  const explicit = inquiryStringFilter(inquiry, "pathPrefix");
  if (explicit !== undefined) {
    return explicit;
  }
  return inquiry.locus === undefined ? undefined : locusPathPrefix(inquiry.locus);
}

function locusPathPrefix(
  locus: NonNullable<Inquiry["locus"]>,
): string | undefined {
  switch (locus.kind) {
    case LocusKind.SourceFile:
      return locus.filePath;
    case LocusKind.SourceRange:
      return locus.range.filePath;
    case LocusKind.Symbol:
      return locus.filePath;
    case LocusKind.Package:
      return packageLocusPathPrefix(locus);
    case LocusKind.RepoArea:
      return locus.areaId === "semantic-runtime"
        ? "packages/semantic-runtime/src"
        : undefined;
    case LocusKind.GitTree:
      return locus.inner === undefined
        ? undefined
        : locusPathPrefix(locus.inner);
    case LocusKind.Repo:
    case LocusKind.Handle:
    default:
      return undefined;
  }
}

function packageLocusPathPrefix(
  locus: Extract<NonNullable<Inquiry["locus"]>, { readonly kind: LocusKind.Package }>,
): string | undefined {
  if (
    locus.packageId === "semantic-runtime" ||
    locus.packageName === "@aurelia-ls/semantic-runtime"
  ) {
    return "packages/semantic-runtime/src";
  }
  if (locus.relativePath === undefined) {
    return undefined;
  }
  const normalized = normalizeInquiryPath(locus.relativePath)
    .replace(/\/+$/u, "");
  if (normalized === "packages/semantic-runtime") {
    return "packages/semantic-runtime/src";
  }
  return normalized.startsWith("packages/semantic-runtime/src")
    ? normalized
    : undefined;
}

function matchesPathPrefix(value: string, prefix: string | undefined): boolean {
  if (prefix === undefined) {
    return true;
  }
  const normalizedValue = normalizeInquiryPath(value);
  const normalizedPrefix = normalizeInquiryPath(prefix).replace(/\/+$/u, "");
  return normalizedValue === normalizedPrefix
    || normalizedValue.startsWith(`${normalizedPrefix}/`);
}

function normalizeInquiryPath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//u, "");
  const semanticRuntimeRoot = "packages/semantic-runtime/src/";
  const index = normalized.indexOf(semanticRuntimeRoot);
  return index < 0 ? normalized : normalized.slice(index);
}

function matchesUsageFamily(
  role: ProductArchitectureSymbolReferenceRow["usageRole"],
  family: string | undefined,
): boolean {
  if (family === undefined) {
    return true;
  }
  switch (family) {
    case "import-export":
      return role === "import" || role === "export";
    case "type":
      return role === "type-reference" || role === "heritage";
    case "value":
      return role === "value-reference" || role === "member-reference";
    case "call":
      return role === "call-expression" ||
        role === "member-call" ||
        role === "new-expression";
    case "runtime":
      return role === "value-reference" ||
        role === "member-reference" ||
        role === "call-expression" ||
        role === "member-call" ||
        role === "new-expression";
    default:
      return true;
  }
}

function matchesSymbolDependencyUsageFamily(
  row: ProductArchitectureSymbolDependencyRow,
  family: string | undefined,
): boolean {
  if (family === undefined) {
    return true;
  }
  switch (family) {
    case "import-export":
      return row.importExportReferenceCount > 0;
    case "type":
      return row.typeReferenceCount > 0;
    case "value":
      return row.valueReferenceCount > 0;
    case "call":
      return row.callReferenceCount > 0;
    case "runtime":
      return row.runtimeReferenceCount > 0;
    default:
      return true;
  }
}

function orderModules(
  rows: readonly ProductArchitectureModuleRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureModuleRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "declarationCount":
      return [...rows].sort((left, right) =>
        right.declarationCount - left.declarationCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "functionSurfaceCount":
      return [...rows].sort((left, right) =>
        right.functionSurfaceCount - left.functionSurfaceCount ||
        right.maxFunctionLineCount - left.maxFunctionLineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "largeFunctionCount":
      return [...rows].sort((left, right) =>
        right.largeFunctionCount - left.largeFunctionCount ||
        right.maxFunctionLineCount - left.maxFunctionLineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "bodyPressure":
    case "maxFunctionLineCount":
      return [...rows].sort((left, right) =>
        right.maxFunctionLineCount - left.maxFunctionLineCount ||
        right.largeFunctionCount - left.largeFunctionCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "importCount":
      return [...rows].sort((left, right) =>
        right.importCount - left.importCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "crossAreaImportCount":
      return [...rows].sort((left, right) =>
        right.crossAreaImportCount - left.crossAreaImportCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "incomingImportCount":
      return [...rows].sort((left, right) =>
        right.localImportInCount - left.localImportInCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case undefined:
    case "filePath":
    default:
      return rows;
  }
}

function orderDeclarations(
  rows: readonly ProductArchitectureDeclarationRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureDeclarationRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderCycles(
  rows: readonly ProductArchitectureCycleRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureCycleRow[] {
  switch (orderBy) {
    case "moduleCount":
      return [...rows].sort((left, right) =>
        right.moduleCount - left.moduleCount ||
        right.internalDependencyCount - left.internalDependencyCount ||
        left.filePaths[0]!.localeCompare(right.filePaths[0]!),
      );
    case "internalDependencyCount":
      return [...rows].sort((left, right) =>
        right.internalDependencyCount - left.internalDependencyCount ||
        right.moduleCount - left.moduleCount ||
        left.filePaths[0]!.localeCompare(right.filePaths[0]!),
      );
    case undefined:
    case "cyclePressure":
    default:
      return rows;
  }
}

function orderClassSurfaces(
  rows: readonly ProductArchitectureClassSurfaceRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureClassSurfaceRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case "methodCount":
      return [...rows].sort((left, right) =>
        right.methodCount - left.methodCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case "propertyCount":
      return [...rows].sort((left, right) =>
        right.propertyCount - left.propertyCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderFunctionSurfaces(
  rows: readonly ProductArchitectureFunctionSurfaceRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureFunctionSurfaceRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "parameterCount":
      return [...rows].sort((left, right) =>
        right.parameterCount - left.parameterCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "callPressure":
    case "callSiteCount":
      return [...rows].sort((left, right) =>
        right.callSiteCount - left.callSiteCount ||
        right.distinctCalleeCount - left.distinctCalleeCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "distinctCalleeCount":
      return [...rows].sort((left, right) =>
        right.distinctCalleeCount - left.distinctCalleeCount ||
        right.callSiteCount - left.callSiteCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "crossAreaCallSiteCount":
      return [...rows].sort((left, right) =>
        right.crossAreaCallSiteCount - left.crossAreaCallSiteCount ||
        right.callSiteCount - left.callSiteCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderFunctionDuplicateGroups(
  rows: readonly ProductArchitectureFunctionDuplicateGroupRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureFunctionDuplicateGroupRow[] {
  switch (orderBy) {
    case "functionCount":
      return [...rows].sort((left, right) =>
        right.functionCount - left.functionCount ||
        right.lineCount - left.lineCount ||
        left.name.localeCompare(right.name),
      );
    case "lineCount":
    case "size":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        right.functionCount - left.functionCount ||
        left.name.localeCompare(right.name),
      );
    case "bodyFingerprint":
      return [...rows].sort((left, right) =>
        right.repeatedBodyFingerprintCount - left.repeatedBodyFingerprintCount ||
        right.functionCount - left.functionCount ||
        left.name.localeCompare(right.name),
      );
    case "bodyShapeFingerprint":
    case undefined:
    default:
      return [...rows].sort((left, right) =>
        right.repeatedBodyShapeFingerprintCount - left.repeatedBodyShapeFingerprintCount ||
        right.repeatedBodyFingerprintCount - left.repeatedBodyFingerprintCount ||
        right.functionCount - left.functionCount ||
        right.lineCount - left.lineCount ||
        left.name.localeCompare(right.name),
      );
  }
}

function orderCallSites(
  rows: readonly ProductArchitectureCallSiteRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureCallSiteRow[] {
  switch (orderBy) {
    case "calleeName":
      return [...rows].sort((left, right) =>
        left.calleeName.localeCompare(right.calleeName) ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "argumentCount":
      return [...rows].sort((left, right) =>
        right.argumentCount - left.argumentCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "crossArea":
      return [...rows].sort((left, right) =>
        Number(right.crossesArea) - Number(left.crossesArea) ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderCallDependencies(
  rows: readonly ProductArchitectureCallDependencyRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureCallDependencyRow[] {
  switch (orderBy) {
    case "callCount":
      return [...rows].sort((left, right) =>
        right.callCount - left.callCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        (left.targetFilePath ?? "").localeCompare(right.targetFilePath ?? ""),
      );
    case "distinctCalleeCount":
      return [...rows].sort((left, right) =>
        right.distinctCalleeCount - left.distinctCalleeCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        (left.targetFilePath ?? "").localeCompare(right.targetFilePath ?? ""),
      );
    case "constructorCallCount":
      return [...rows].sort((left, right) =>
        right.constructorCallCount - left.constructorCallCount ||
        right.callCount - left.callCount ||
        left.fromFilePath.localeCompare(right.fromFilePath),
      );
    case "memberCallCount":
      return [...rows].sort((left, right) =>
        right.memberCallCount - left.memberCallCount ||
        right.callCount - left.callCount ||
        left.fromFilePath.localeCompare(right.fromFilePath),
      );
    case undefined:
    case "callPressure":
    default:
      return rows;
  }
}

function orderSymbolReferences(
  rows: readonly ProductArchitectureSymbolReferenceRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureSymbolReferenceRow[] {
  switch (orderBy) {
    case "symbolName":
      return [...rows].sort((left, right) =>
        left.symbolName.localeCompare(right.symbolName) ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "usageRole":
      return [...rows].sort((left, right) =>
        left.usageRole.localeCompare(right.usageRole) ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderSymbolDependencies(
  rows: readonly ProductArchitectureSymbolDependencyRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureSymbolDependencyRow[] {
  switch (orderBy) {
    case "referenceCount":
      return [...rows].sort((left, right) =>
        right.referenceCount - left.referenceCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.targetFilePath.localeCompare(right.targetFilePath),
      );
    case "distinctSymbolCount":
      return [...rows].sort((left, right) =>
        right.distinctSymbolCount - left.distinctSymbolCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.targetFilePath.localeCompare(right.targetFilePath),
      );
    case "callReferenceCount":
      return [...rows].sort((left, right) =>
        right.callReferenceCount - left.callReferenceCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.targetFilePath.localeCompare(right.targetFilePath),
      );
    case "runtimeReferenceCount":
      return [...rows].sort((left, right) =>
        right.runtimeReferenceCount - left.runtimeReferenceCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.targetFilePath.localeCompare(right.targetFilePath),
      );
    case "typeReferenceCount":
      return [...rows].sort((left, right) =>
        right.typeReferenceCount - left.typeReferenceCount ||
        left.fromFilePath.localeCompare(right.fromFilePath) ||
        left.targetFilePath.localeCompare(right.targetFilePath),
      );
    case undefined:
    case "referencePressure":
    default:
      return rows;
  }
}

function orderKernelRecordConstructions(
  rows: readonly ProductArchitectureKernelRecordConstructionRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureKernelRecordConstructionRow[] {
  switch (orderBy) {
    case "recordKind":
      return [...rows].sort((left, right) =>
        left.recordKind.localeCompare(right.recordKind) ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "className":
      return [...rows].sort((left, right) =>
        (left.className ?? "").localeCompare(right.className ?? "") ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "owner":
      return [...rows].sort((left, right) =>
        (left.ownerFunctionName ?? left.ownerClassName ?? "").localeCompare(
          right.ownerFunctionName ?? right.ownerClassName ?? "",
        ) ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderKernelRecordBatches(
  rows: readonly ProductArchitectureKernelRecordBatchRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureKernelRecordBatchRow[] {
  switch (orderBy) {
    case "label":
    case "labelLiteral":
      return [...rows].sort((left, right) =>
        (left.labelLiteral ?? left.labelExpression ?? "").localeCompare(
          right.labelLiteral ?? right.labelExpression ?? "",
        ) ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "owner":
      return [...rows].sort((left, right) =>
        (left.ownerFunctionName ?? left.ownerClassName ?? "").localeCompare(
          right.ownerFunctionName ?? right.ownerClassName ?? "",
        ) ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function orderFieldProvenanceConstructions(
  rows: readonly ProductArchitectureFieldProvenanceConstructionRow[],
  orderBy: string | undefined,
): readonly ProductArchitectureFieldProvenanceConstructionRow[] {
  switch (orderBy) {
    case "fieldName":
      return [...rows].sort((left, right) =>
        (left.fieldNameLiteral ?? left.fieldNameExpression ?? "").localeCompare(
          right.fieldNameLiteral ?? right.fieldNameExpression ?? "",
        ) ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case "owner":
      return [...rows].sort((left, right) =>
        (left.ownerFunctionName ?? left.ownerClassName ?? "").localeCompare(
          right.ownerFunctionName ?? right.ownerClassName ?? "",
        ) ||
        left.filePath.localeCompare(right.filePath) ||
        left.source.startLine - right.source.startLine,
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}
