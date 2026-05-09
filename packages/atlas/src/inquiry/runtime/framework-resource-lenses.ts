import {
  FrameworkResourceDefinitionKind,
  FrameworkResourceInstantiationKind,
  FrameworkSyntaxProductKind,
} from "../../framework/index.js";
import {
  groupBy,
  uniqueSortedStrings,
} from "../../collections.js";
import {
  SourceProjectMemo,
  type SourceProject,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import {
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
import type { SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import {
  evidenceLimit,
  pageOffset,
  rowLimit,
} from "../paging.js";
import {
  FrameworkResourceCarrierKind,
  type FrameworkBundleAssociationRow,
  type FrameworkResourceCarrierRow,
  type FrameworkResourceExportRow,
  type FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import {
  type FrameworkDiscoveryFilters,
  filtersFromInquiry as discoveryFiltersFromInquiry,
} from "./framework-filters.js";
import { readFrameworkBundles } from "./framework-bundles.js";
import {
  readFrameworkResourceCarriers,
  readFrameworkResourceExports,
} from "./framework-resources.js";
import {
  readFrameworkResourceInstantiationRows,
  type FrameworkResourceMaterializationSiteRow,
  type FrameworkResourceInstantiationRow,
} from "./framework-resource-materialization.js";
import { readFrameworkSyntaxProducts } from "./framework-rendering-syntax.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import { countBy } from "./framework-support.js";
import { stringFilter } from "./lens-filter-utils.js";

/** Evidence lane present in one resource convergence row. */
export const enum FrameworkResourceConvergenceLane {
  /** Source carrier with resource definition metadata exists. */
  SourceCarrier = "source-carrier",
  /** Resource carrier is visible through a package public export. */
  PackageExport = "package-export",
  /** Evaluated bundle/configuration admits the resource. */
  BundleAdmission = "bundle-admission",
  /** Resource participates as a syntax producer such as binding command or renderer. */
  SyntaxProduct = "syntax-product",
  /** Resource has a modeled runtime/compiler/evaluator materialization path. */
  RuntimeMaterialization = "runtime-materialization",
  /** Resource is known only as a definition carrier at this layer. */
  DefinitionOnly = "definition-only",
}

const RESOURCE_PROJECTION_BASIS = [
  BasisKind.TypeScriptChecker,
  BasisKind.StaticEvaluator,
] as const;

/** Admission fact attached to a resource convergence row. */
export interface FrameworkResourceConvergenceAdmissionRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly bundleExportName: string;
  readonly associationKind: string;
  readonly targetName: string | null;
  readonly helperName: string | null;
  readonly source: SourceRange;
  readonly summary: string;
}

export type FrameworkResourceConvergenceSourceRole =
  | "definition-carrier"
  | "backing-declaration"
  | "bundle-admission"
  | "syntax-product"
  | "materialization-site";

/** Exact source site that contributes one lane of a resource convergence row. */
export interface FrameworkResourceConvergenceSourceSiteRow {
  readonly id: string;
  readonly role: FrameworkResourceConvergenceSourceRole;
  readonly source: SourceRange;
  readonly summary: string;
}

/** One converged view of a resource carrier across exports, admissions, syntax, and materialization. */
export interface FrameworkResourceConvergenceRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly sourceExportName: string;
  readonly resourceKind: FrameworkResourceDefinitionKind;
  readonly carrierKind: FrameworkResourceCarrierKind;
  readonly resourceName: string | null;
  readonly aliases: readonly string[];
  readonly targetName: string | null;
  readonly publicExportNames: readonly string[];
  readonly lanes: readonly FrameworkResourceConvergenceLane[];
  readonly admissions: readonly FrameworkResourceConvergenceAdmissionRow[];
  readonly syntaxProductIds: readonly string[];
  readonly syntaxProductKinds: readonly string[];
  readonly instructionNames: readonly string[];
  readonly bindingNames: readonly string[];
  readonly instantiationKinds: readonly string[];
  readonly instanceLifetime: string;
  readonly materializationSiteKinds: readonly string[];
  readonly materializationPhases: readonly string[];
  readonly materializationRelations: readonly string[];
  readonly openReasons: readonly string[];
  readonly carrierSourceRole: string;
  readonly definitionSource: SourceRange;
  readonly declarationSource: SourceRange;
  readonly sourceSites: readonly FrameworkResourceConvergenceSourceSiteRow[];
  readonly summary: string;
}

/** Filters owned by framework.resources. */
interface FrameworkResourceFilters extends FrameworkDiscoveryFilters {
  readonly targetName?: string;
  readonly lane?: string;
  readonly bundleExportName?: string;
  readonly instantiationKind?: string;
  readonly materializationSiteKind?: string;
}

/** Value returned by framework.resources. */
export interface FrameworkResourcesValue {
  readonly resourceConvergenceCount: number;
  readonly resourceKinds: Readonly<Record<string, number>>;
  readonly carrierKinds: Readonly<Record<string, number>>;
  readonly carrierSourceRoles: Readonly<Record<string, number>>;
  readonly lanes: Readonly<Record<string, number>>;
  readonly sourceSiteRoles: Readonly<Record<string, number>>;
  readonly openReasonCount: number;
  readonly openConvergenceRowCount: number;
  readonly missingDefinitionSourceSiteCount: number;
  readonly onlyDefinitionSourceSiteCount: number;
  readonly definitionSourceSameAsDeclarationCount: number;
  readonly definitionSourceDiffersFromDeclarationCount: number;
  readonly convergenceRows?: readonly FrameworkResourceConvergenceRow[];
}

const RESOURCE_CONVERGENCE_ROW_FAMILY =
  new PagedRowFamily<FrameworkResourceConvergenceRow>({
    id: "framework.resources:convergence",
    rowLabel: "framework resource convergence row(s)",
    evidenceForRow: evidenceForRow,
    continuationsForPage: resourceContinuations,
  });

const frameworkResourceConvergenceMemo =
  new SourceProjectMemo<readonly FrameworkResourceConvergenceRow[]>();

/** Answer resource convergence inquiries. */
export function answerFrameworkResources(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkResourcesValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = resourceFiltersFromInquiry(inquiry);
  const rows = readFrameworkResourceConvergenceRows(sourceProject, filters);
  const baseValue = resourceValue(rows);
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);

  if (projection === "convergence" || projection === "definitions") {
    return RESOURCE_CONVERGENCE_ROW_FAMILY.answer({
      inquiry,
      rows,
      limit,
      offset,
      basis: [resourceConvergenceBasis(sourceProject)],
      value: (page) => ({
        ...baseValue,
        convergenceRows: page.rows,
      }),
      openSeams: (page) => openSeamsForRows(page.rows),
    });
  }

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Framework resources have ${rows.length} converged resource row(s) across carriers, public exports, bundle admissions, syntax products, and materialization sites.`,
    {
      value: baseValue,
      basis: [resourceConvergenceBasis(sourceProject)],
      evidence: rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRow),
      openSeams: openSeamsForRows(rows.slice(0, evidenceLimit(inquiry))),
      continuations: [
        projectionContinuation(
          inquiry,
          "framework.resources:convergence",
          "convergence",
          "Inspect converged resource rows.",
          { basis: RESOURCE_PROJECTION_BASIS },
        ),
      ],
    },
  );
}

/** Read converged resource rows without projecting an answer. */
export function readFrameworkResourceConvergenceRows(
  sourceProject: SourceProject,
  filters: FrameworkResourceFilters,
): readonly FrameworkResourceConvergenceRow[] {
  return frameworkResourceConvergenceMemo
    .read(sourceProject, () => readAllFrameworkResourceConvergenceRows(sourceProject))
    .filter((row) => convergenceRowMatches(row, filters));
}

function readAllFrameworkResourceConvergenceRows(
  sourceProject: SourceProject,
): readonly FrameworkResourceConvergenceRow[] {
  const filters: FrameworkResourceFilters = {};
  const carrierFilters = resourceCarrierFilters(filters);
  const carriers = readFrameworkResourceCarriers(sourceProject, carrierFilters);
  const exportsByCarrier = groupBy(
    readFrameworkResourceExports(sourceProject, resourceSideFilters(filters)),
    (row) => row.carrier.id,
  );
  const admissionsByCarrier = groupBy(
    readResourceAdmissionRows(sourceProject, filters),
    (row) => row.resourceCarrierId,
  );
  const instantiationsByCarrier = new Map(
    readFrameworkResourceInstantiationRows(
      sourceProject,
      resourceSideFilters(filters),
    ).map((row) => [resourceInstantiationCarrierId(row), row] as const),
  );
  const syntaxProductsByCarrier = groupBy(
    readFrameworkSyntaxProducts(sourceProject, syntaxProductFilters(filters)).filter(
      (row) => row.resourceCarrier !== undefined,
    ),
    (row) => row.resourceCarrier!.id,
  );
  return carriers
    .map((carrier) =>
      convergenceRow(
        carrier,
        exportsByCarrier.get(carrier.id) ?? [],
        admissionsByCarrier.get(carrier.id) ?? [],
        instantiationsByCarrier.get(carrier.id),
        syntaxProductsByCarrier.get(carrier.id) ?? [],
      ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.resourceKind.localeCompare(right.resourceKind) ||
        left.sourceExportName.localeCompare(right.sourceExportName),
    );
}

function convergenceRow(
  carrier: FrameworkResourceCarrierRow,
  publicExports: readonly FrameworkResourceExportRow[],
  admissions: readonly ResourceAdmissionWithCarrier[],
  instantiation: FrameworkResourceInstantiationRow | undefined,
  syntaxProducts: readonly FrameworkSyntaxProductRow[],
): FrameworkResourceConvergenceRow {
  const publicExportNames = uniqueSortedStrings(
    publicExports.map((row) => row.exportEntry.exportName),
  );
  const admissionRows = admissions.map((row) => ({
    id: row.association.id,
    packageId: row.association.packageId,
    packageName: row.association.packageName,
    bundleExportName: row.bundleExportName,
    associationKind: row.association.associationKind,
    targetName: row.association.targetName,
    helperName: row.association.helperName,
    source: row.association.source,
    summary: `${row.bundleExportName} admits ${carrier.resourceKind} ${carrier.targetName ?? carrier.sourceExportName}.`,
  }));
  const materializationSites = instantiation?.materializationSites ?? [];
  const instantiationKinds = uniqueSortedStrings(instantiation?.instantiationKinds ?? []);
  const materialized = instantiationKinds.some(
    (kind) => kind !== FrameworkResourceInstantiationKind.DefinitionOnly,
  );
  const lanes = convergenceLanes({
    publicExportNames,
    admissionRows,
    syntaxProducts,
    materialized,
  });
  const openReasons = convergenceOpenReasons(carrier, lanes);
  const sourceSites = convergenceSourceSites(
    carrier,
    admissionRows,
    syntaxProducts,
    materializationSites,
  );
  return {
    id: `framework-resource-convergence:${carrier.id}`,
    packageId: carrier.packageId,
    packageName: carrier.packageName,
    sourceExportName: carrier.sourceExportName,
    resourceKind: carrier.resourceKind,
    carrierKind: carrier.carrierKind,
    resourceName: carrier.resourceName,
    aliases: carrier.aliases,
    targetName: carrier.targetName,
    publicExportNames,
    lanes,
    admissions: admissionRows,
    syntaxProductIds: syntaxProducts.map((row) => row.id),
    syntaxProductKinds: uniqueSortedStrings(syntaxProducts.map((row) => row.productKind)),
    instructionNames: uniqueSortedStrings(
      syntaxProducts
        .map((row) => row.instructionName)
        .filter((name): name is string => name !== null),
    ),
    bindingNames: uniqueSortedStrings(
      syntaxProducts
        .map((row) => row.bindingName)
        .filter((name): name is string => name !== null),
    ),
    instantiationKinds,
    instanceLifetime: instantiation?.instanceLifetime ?? "definition-only",
    materializationSiteKinds: uniqueSortedStrings(
      materializationSites.map((site) => site.siteKind),
    ),
    materializationPhases: uniqueSortedStrings(materializationSites.map((site) => site.phase)),
    materializationRelations: uniqueSortedStrings(
      materializationSites.map((site) => site.relation),
    ),
    openReasons,
    carrierSourceRole: carrierSourceRole(carrier.carrierKind),
    definitionSource: carrier.source,
    declarationSource: carrier.declarationSource,
    sourceSites,
    summary: convergenceSummary(carrier, lanes, publicExportNames, admissionRows),
  };
}

function convergenceLanes(input: {
  readonly publicExportNames: readonly string[];
  readonly admissionRows: readonly FrameworkResourceConvergenceAdmissionRow[];
  readonly syntaxProducts: readonly FrameworkSyntaxProductRow[];
  readonly materialized: boolean;
}): readonly FrameworkResourceConvergenceLane[] {
  const lanes = [FrameworkResourceConvergenceLane.SourceCarrier];
  if (input.publicExportNames.length > 0) {
    lanes.push(FrameworkResourceConvergenceLane.PackageExport);
  }
  if (input.admissionRows.length > 0) {
    lanes.push(FrameworkResourceConvergenceLane.BundleAdmission);
  }
  if (input.syntaxProducts.length > 0) {
    lanes.push(FrameworkResourceConvergenceLane.SyntaxProduct);
  }
  lanes.push(
    input.materialized
      ? FrameworkResourceConvergenceLane.RuntimeMaterialization
      : FrameworkResourceConvergenceLane.DefinitionOnly,
  );
  return lanes;
}

function convergenceOpenReasons(
  carrier: FrameworkResourceCarrierRow,
  lanes: readonly FrameworkResourceConvergenceLane[],
): readonly string[] {
  const reasons: string[] = [];
  if (!lanes.includes(FrameworkResourceConvergenceLane.RuntimeMaterialization)) {
    reasons.push(
      "Resource has definition metadata but no modeled runtime materialization site.",
    );
  }
  if (
    carrier.resourceKind === FrameworkResourceDefinitionKind.BindingCommand &&
    !lanes.includes(FrameworkResourceConvergenceLane.SyntaxProduct)
  ) {
    reasons.push(
      "Binding command resource has no joined syntax product row yet.",
    );
  }
  return reasons;
}

function convergenceSummary(
  carrier: FrameworkResourceCarrierRow,
  lanes: readonly FrameworkResourceConvergenceLane[],
  publicExportNames: readonly string[],
  admissions: readonly FrameworkResourceConvergenceAdmissionRow[],
): string {
  const name = carrier.targetName ?? carrier.sourceExportName;
  const publicSurface =
    publicExportNames.length === 0
      ? "not publicly exported"
      : `exported as ${publicExportNames.join(", ")}`;
  const admissionSurface =
    admissions.length === 0
      ? "not admitted by an evaluated bundle"
      : `admitted by ${uniqueSortedStrings(admissions.map((row) => row.bundleExportName)).join(", ")}`;
  return `${carrier.resourceKind} ${name} is ${publicSurface}, ${admissionSurface}, and has lanes ${lanes.join(", ")}.`;
}

function convergenceSourceSites(
  carrier: FrameworkResourceCarrierRow,
  admissions: readonly FrameworkResourceConvergenceAdmissionRow[],
  syntaxProducts: readonly FrameworkSyntaxProductRow[],
  materializationSites: readonly FrameworkResourceMaterializationSiteRow[],
): readonly FrameworkResourceConvergenceSourceSiteRow[] {
  return uniqueBySourceSite([
    {
      id: `${carrier.id}:source:definition-carrier`,
      role: "definition-carrier",
      source: carrier.source,
      summary: `Exact ${carrierSourceRole(carrier.carrierKind)} that defines the resource.`,
    },
    ...(sameSourceRange(carrier.source, carrier.declarationSource)
      ? []
      : [
          {
            id: `${carrier.id}:source:backing-declaration`,
            role: "backing-declaration" as const,
            source: carrier.declarationSource,
            summary:
              "Backing declaration or source-export header that owns the resource carrier.",
          },
        ]),
    ...admissions.map((row) => ({
      id: `${carrier.id}:source:bundle-admission:${row.id}`,
      role: "bundle-admission" as const,
      source: row.source,
      summary: row.summary,
    })),
    ...syntaxProducts.map((row) => ({
      id: `${carrier.id}:source:syntax-product:${row.id}`,
      role: "syntax-product" as const,
      source: row.source,
      summary: `${row.producerName} produces ${row.productKind} syntax product.`,
    })),
    ...materializationSites.map((row) => ({
      id: `${carrier.id}:source:materialization-site:${row.id}`,
      role: "materialization-site" as const,
      source: row.source,
      summary: row.summary,
    })),
  ]);
}

interface ResourceAdmissionWithCarrier {
  readonly resourceCarrierId: string;
  readonly bundleExportName: string;
  readonly association: FrameworkBundleAssociationRow;
}

function readResourceAdmissionRows(
  sourceProject: SourceProject,
  filters: FrameworkResourceFilters,
): readonly ResourceAdmissionWithCarrier[] {
  const bundles = readFrameworkBundles(sourceProject, {
    packageId: filters.packageId,
    ...(filters.bundleExportName === undefined
      ? {}
      : { exportName: filters.bundleExportName }),
  });
  return bundles.flatMap((bundle) =>
    bundle.associations.flatMap((association) =>
      association.resourceCarrier === undefined
        ? []
        : [
            {
              resourceCarrierId: association.resourceCarrier.id,
              bundleExportName: bundle.exportEntry.exportName,
              association,
            },
          ],
    ),
  );
}

function resourceCarrierFilters(
  filters: FrameworkResourceFilters,
): FrameworkDiscoveryFilters {
  return {
    packageId: filters.packageId,
    resourceKind: filters.resourceKind,
  };
}

function resourceSideFilters(
  filters: FrameworkResourceFilters,
): FrameworkDiscoveryFilters {
  return {
    packageId: filters.packageId,
    resourceKind: filters.resourceKind,
  };
}

function syntaxProductFilters(
  filters: FrameworkResourceFilters,
): FrameworkDiscoveryFilters {
  return {
    packageId: filters.packageId,
    resourceKind: filters.resourceKind,
    producerKind: filters.producerKind,
    productKind: filters.productKind,
  };
}

function resourceInstantiationCarrierId(row: FrameworkResourceInstantiationRow): string {
  const prefix = "framework-resource-instantiation:";
  return row.id.startsWith(prefix) ? row.id.slice(prefix.length) : row.id;
}

function convergenceRowMatches(
  row: FrameworkResourceConvergenceRow,
  filters: FrameworkResourceFilters,
): boolean {
  return (
    (filters.exportName === undefined ||
      row.sourceExportName === filters.exportName ||
      row.publicExportNames.includes(filters.exportName)) &&
    (filters.targetName === undefined || row.targetName === filters.targetName) &&
    (filters.resourceName === undefined ||
      row.resourceName === filters.resourceName ||
      row.sourceExportName === filters.resourceName ||
      row.targetName === filters.resourceName ||
      row.publicExportNames.includes(filters.resourceName)) &&
    (filters.bundleExportName === undefined ||
      row.admissions.some(
        (admission) => admission.bundleExportName === filters.bundleExportName,
      )) &&
    (filters.lane === undefined ||
      row.lanes.some((lane) => lane === filters.lane)) &&
    (filters.instantiationKind === undefined ||
      row.instantiationKinds.some(
        (kind) => kind === filters.instantiationKind,
      )) &&
    (filters.materializationSiteKind === undefined ||
      row.materializationSiteKinds.includes(filters.materializationSiteKind)) &&
    (filters.producerKind === undefined ||
      row.lanes.includes(FrameworkResourceConvergenceLane.SyntaxProduct)) &&
    (filters.productKind === undefined ||
      row.syntaxProductKinds.includes(filters.productKind)) &&
    (filters.query === undefined ||
      [
        row.packageId,
        row.sourceExportName,
        row.resourceKind,
        row.carrierKind,
        row.resourceName,
        row.targetName,
        row.summary,
        ...row.aliases,
        ...row.publicExportNames,
        ...row.lanes,
        ...row.syntaxProductKinds,
        ...row.instructionNames,
        ...row.bindingNames,
        ...row.instantiationKinds,
        row.instanceLifetime,
        ...row.materializationSiteKinds,
        ...row.openReasons,
      ].some((value) => typeof value === "string" && value.includes(filters.query!)))
  );
}

function resourceFiltersFromInquiry(inquiry: Inquiry): FrameworkResourceFilters {
  return {
    ...discoveryFiltersFromInquiry(inquiry),
    ...resourceFilterExtras(inquiry.subject),
    ...resourceFilterExtras(inquiry.filters),
  };
}

function resourceFilterExtras(value: unknown): FrameworkResourceFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "targetName"),
    ...stringFilter(source, "lane"),
    ...stringFilter(source, "bundleExportName"),
    ...stringFilter(source, "instantiationKind"),
    ...stringFilter(source, "materializationSiteKind"),
  };
}

function resourceValue(
  rows: readonly FrameworkResourceConvergenceRow[],
): FrameworkResourcesValue {
  return {
    resourceConvergenceCount: rows.length,
    resourceKinds: countBy(rows, (row) => row.resourceKind),
    carrierKinds: countBy(rows, (row) => row.carrierKind),
    carrierSourceRoles: countBy(rows, (row) => row.carrierSourceRole),
    lanes: countBy(rows.flatMap((row) => row.lanes), (lane) => lane),
    sourceSiteRoles: countBy(
      rows.flatMap((row) => row.sourceSites),
      (site) => site.role,
    ),
    openReasonCount: rows.reduce(
      (total, row) => total + row.openReasons.length,
      0,
    ),
    openConvergenceRowCount: rows.filter((row) => row.openReasons.length > 0).length,
    missingDefinitionSourceSiteCount: rows.filter(
      (row) => !row.sourceSites.some((site) => site.role === "definition-carrier"),
    ).length,
    onlyDefinitionSourceSiteCount: rows.filter(
      (row) =>
        row.sourceSites.length === 1 &&
        row.sourceSites[0]?.role === "definition-carrier",
    ).length,
    definitionSourceSameAsDeclarationCount: rows.filter(
      (row) => sameSourceRange(row.definitionSource, row.declarationSource),
    ).length,
    definitionSourceDiffersFromDeclarationCount: rows.filter(
      (row) => !sameSourceRange(row.definitionSource, row.declarationSource),
    ).length,
  };
}

function evidenceForRow(row: FrameworkResourceConvergenceRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Subject,
    confidence: row.openReasons.length === 0
      ? EvidenceConfidence.Exact
      : EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.definitionSource,
    data: row,
  };
}

function openSeamsForRows(
  rows: readonly FrameworkResourceConvergenceRow[],
): readonly OpenSeam[] {
  return rows.flatMap((row) =>
    row.openReasons.map((reason, index) => ({
      id: `${row.id}:open:${index}`,
      kind: OpenSeamKind.Unknown,
      summary: reason,
      evidence: evidenceForRow(row),
      basis: resourceConvergenceOpenBasis(),
      data: row,
    })),
  );
}

function resourceContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkResourceConvergenceRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.resources:convergence:next-page",
        "Continue framework resource convergence rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForRow(row);
    const semanticRoute = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.resources",
      index,
      evidence,
    );
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.resources",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "definition-source",
        row.definitionSource,
        `Inspect the exact ${row.carrierSourceRole} that defines this resource.`,
        "Resource convergence row to exact definition carrier.",
      ),
    );
    if (
      row.declarationSource !== null &&
      !sameSourceRange(row.definitionSource, row.declarationSource)
    ) {
      continuations.push(
        builder.source(
          "declaration-source",
          row.declarationSource,
          "Inspect the backing declaration or source-export header for this resource.",
          "Resource convergence row to backing declaration source.",
          { priority: ContinuationPriority.Secondary },
        ),
      );
    }
    const secondarySourceSites = row.sourceSites.filter(
      (sourceSite) =>
        sourceSite.role !== "definition-carrier" &&
        sourceSite.role !== "backing-declaration",
    ).slice(0, 3);
    for (const [siteIndex, site] of secondarySourceSites.entries()) {
      continuations.push(
        builder.source(
          `source:${site.role}:${siteIndex}`,
          site.source,
          site.summary,
          `Resource convergence row to exact ${site.role} source.`,
          { priority: ContinuationPriority.Secondary },
        ),
      );
    }
    continuations.push(
      semanticRoute.continuation(
        FrameworkSemanticRoutes.ResourceToMaterializationResourceInstantiations,
        "materialization",
        {
          filters: {
            packageId: row.packageId,
            resourceKind: row.resourceKind,
            resourceName: row.targetName ?? row.sourceExportName,
          },
          rationale:
            "Inspect runtime/compiler/evaluator materialization rows for this resource.",
          routeSummary: "Resource convergence row to materialization detail.",
        },
      ),
    );
    if (row.admissions.length > 0) {
      continuations.push(
        semanticRoute.continuation(
          FrameworkSemanticRoutes.ResourceToAdmissionWorldFormation,
          "admission",
          {
            filters: {
              packageId: row.packageId,
              resourceKind: row.resourceKind,
              targetName: row.targetName ?? row.sourceExportName,
            },
            rationale:
              "Inspect bundle admission and world-formation rows for this resource.",
            routeSummary:
              "Resource convergence row to bundle admission and world formation.",
          },
        ),
      );
    }
    if (hasCompilerSyntaxProduct(row)) {
      continuations.push(
        semanticRoute.continuation(
          FrameworkSemanticRoutes.ResourceToCompilerInstructionProducts,
          "compiler-products",
          {
            filters: {
              packageId: row.packageId,
              exportName: row.sourceExportName,
            },
            rationale:
              "Inspect compiler instruction products produced by this resource carrier.",
            routeSummary:
              "Resource convergence row to compiler instruction products.",
            priority: ContinuationPriority.Primary,
          },
        ),
      );
    }
    if (hasRenderingSyntaxProduct(row)) {
      continuations.push(
        semanticRoute.continuation(
          FrameworkSemanticRoutes.ResourceToRenderingSyntaxProducts,
          "syntax-products",
          {
            filters: {
              packageId: row.packageId,
              exportName: row.sourceExportName,
            },
            rationale:
              "Inspect syntax products produced by this resource carrier.",
            routeSummary: "Resource convergence row to syntax products.",
            priority: ContinuationPriority.Secondary,
          },
        ),
      );
    }
  }
  return continuations;
}

function hasCompilerSyntaxProduct(row: FrameworkResourceConvergenceRow): boolean {
  return row.syntaxProductKinds.some(
    (kind) =>
      kind === FrameworkSyntaxProductKind.BuildsInstruction ||
      kind === FrameworkSyntaxProductKind.EmitsInstruction,
  );
}

function hasRenderingSyntaxProduct(row: FrameworkResourceConvergenceRow): boolean {
  return row.syntaxProductKinds.some(
    (kind) =>
      kind === FrameworkSyntaxProductKind.HandlesInstruction ||
      kind === FrameworkSyntaxProductKind.CreatesBinding,
  );
}

function carrierSourceRole(carrierKind: FrameworkResourceCarrierKind): string {
  switch (carrierKind) {
    case FrameworkResourceCarrierKind.Decorator:
      return "decorator expression";
    case FrameworkResourceCarrierKind.StaticAu:
      return "static $au definition initializer";
    case FrameworkResourceCarrierKind.DefineCall:
      return "resource define call";
    case FrameworkResourceCarrierKind.AttributePatternCreate:
      return "attribute-pattern create call";
    case FrameworkResourceCarrierKind.RendererHelper:
      return "renderer helper call";
  }
}

function sameSourceRange(left: SourceRange, right: SourceRange): boolean {
  return left.filePath === right.filePath &&
    left.start.line === right.start.line &&
    left.start.character === right.start.character &&
    left.end.line === right.end.line &&
    left.end.character === right.end.character;
}

function uniqueBySourceSite(
  sites: readonly FrameworkResourceConvergenceSourceSiteRow[],
): readonly FrameworkResourceConvergenceSourceSiteRow[] {
  const byKey = new Map<string, FrameworkResourceConvergenceSourceSiteRow>();
  for (const site of sites) {
    const key = [
      site.role,
      site.source.filePath,
      site.source.start.line,
      site.source.start.character,
      site.source.end.line,
      site.source.end.character,
    ].join(":");
    if (!byKey.has(key)) {
      byKey.set(key, site);
    }
  }
  return [...byKey.values()];
}

function resourceConvergenceBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Partial,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Converged from source-backed resource carriers, package exports, evaluator bundle admissions, syntax products, and materialization rows.",
    identity: sourceProject.snapshot().identity,
    limitations: [
      "Rows converge visible Atlas facts; they do not emulate final container/template visibility.",
    ],
  };
}

function resourceConvergenceOpenBasis(): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Partial,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Resource convergence is derived from TypeScript/checker rows plus evaluator admission evidence.",
  };
}
