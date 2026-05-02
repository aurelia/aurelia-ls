import { FrameworkResourceDefinitionKind } from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
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
import { LocusKind, type SourceRange, type SourceRangeLocus } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import type {
  FrameworkBundleAssociationRow,
  FrameworkResourceCarrierRow,
  FrameworkResourceExportRow,
  FrameworkSyntaxProductRow,
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
  FrameworkResourceInstantiationKind,
  readFrameworkResourceInstantiationRows,
  type FrameworkResourceInstantiationRow,
} from "./framework-resource-materialization.js";
import { readFrameworkSyntaxProducts } from "./framework-rendering-syntax.js";

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

/** One converged view of a resource carrier across exports, admissions, syntax, and materialization. */
export interface FrameworkResourceConvergenceRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly sourceExportName: string;
  readonly resourceKind: FrameworkResourceDefinitionKind;
  readonly carrierKind: string;
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
  readonly materializationSiteKinds: readonly string[];
  readonly materializationPhases: readonly string[];
  readonly materializationRelations: readonly string[];
  readonly openReasons: readonly string[];
  readonly source: SourceRange;
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
  readonly lanes: Readonly<Record<string, number>>;
  readonly openReasonCount: number;
  readonly convergenceRows?: readonly FrameworkResourceConvergenceRow[];
}

/** Answer resource convergence inquiries. */
export function answerFrameworkResources(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkResourcesValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = resourceFiltersFromInquiry(inquiry);
  const rows = readFrameworkResourceConvergenceRows(sourceProject, filters);
  const baseValue = resourceValue(rows);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "convergence" || projection === "definitions") {
    const page = pageRows(rows, offset, limit);
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${rows.length} framework resource convergence row(s).`,
      {
        value: {
          ...baseValue,
          convergenceRows: page.rows,
        },
        basis: [resourceConvergenceBasis(sourceProject)],
        evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRow),
        openSeams: openSeamsForRows(page.rows),
        page: pageInfo(inquiry, page.rows.length, rows.length, limit, page.nextOffset),
        continuations: resourceContinuations(
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
    .filter((row) => convergenceRowMatches(row, filters))
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
  const publicExportNames = unique(
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
  const instantiationKinds = unique(instantiation?.instantiationKinds ?? []);
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
    syntaxProductKinds: unique(syntaxProducts.map((row) => row.productKind)),
    instructionNames: unique(
      syntaxProducts
        .map((row) => row.instructionName)
        .filter((name): name is string => name !== null),
    ),
    bindingNames: unique(
      syntaxProducts
        .map((row) => row.bindingName)
        .filter((name): name is string => name !== null),
    ),
    instantiationKinds,
    materializationSiteKinds: unique(
      materializationSites.map((site) => site.siteKind),
    ),
    materializationPhases: unique(materializationSites.map((site) => site.phase)),
    materializationRelations: unique(
      materializationSites.map((site) => site.relation),
    ),
    openReasons,
    source: carrier.source,
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
      : `admitted by ${unique(admissions.map((row) => row.bundleExportName)).join(", ")}`;
  return `${carrier.resourceKind} ${name} is ${publicSurface}, ${admissionSurface}, and has lanes ${lanes.join(", ")}.`;
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

function stringFilter(
  source: Record<string, unknown>,
  key: keyof FrameworkResourceFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function resourceValue(
  rows: readonly FrameworkResourceConvergenceRow[],
): FrameworkResourcesValue {
  return {
    resourceConvergenceCount: rows.length,
    resourceKinds: countBy(rows, (row) => row.resourceKind),
    lanes: countBy(rows.flatMap((row) => row.lanes), (lane) => lane),
    openReasonCount: rows.reduce(
      (total, row) => total + row.openReasons.length,
      0,
    ),
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
    source: row.source,
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
    continuations.push({
      id: `framework.resources:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the source carrier that defines this resource.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Resource convergence row to source carrier.",
      ),
    });
    continuations.push({
      id: `framework.resources:materialization:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect runtime/compiler/evaluator materialization rows for this resource.",
      inquiry: {
        lens: LensId.FrameworkMaterialization,
        locus: inquiry.locus,
        projection: "resource-instantiations",
        filters: {
          packageId: row.packageId,
          resourceKind: row.resourceKind,
          resourceName: row.targetName ?? row.sourceExportName,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.TypeScriptChecker],
        "Resource convergence row to materialization detail.",
      ),
    });
    if (row.admissions.length > 0) {
      continuations.push({
        id: `framework.resources:admission:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect bundle admission and world-formation rows for this resource.",
        inquiry: {
          lens: LensId.FrameworkAdmission,
          locus: inquiry.locus,
          projection: "world-formation",
          filters: {
            packageId: row.packageId,
            resourceKind: row.resourceKind,
            targetName: row.targetName ?? row.sourceExportName,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.FrameworkFlowOf,
          [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
          "Resource convergence row to bundle admission and world formation.",
        ),
      });
    }
    if (row.lanes.includes(FrameworkResourceConvergenceLane.SyntaxProduct)) {
      continuations.push({
        id: `framework.resources:syntax-products:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect syntax products produced by this resource carrier.",
        inquiry: {
          lens: LensId.FrameworkDiscovery,
          locus: inquiry.locus,
          projection: "syntax-products",
          filters: {
            packageId: row.packageId,
            exportName: row.sourceExportName,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.FrameworkFlowOf,
          [BasisKind.TypeScriptChecker],
          "Resource convergence row to syntax products.",
        ),
      });
    }
  }
  return continuations;
}

function projectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
      rationale,
    ),
  };
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

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  const parsed = cursor === undefined ? 0 : Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function pageRows<TRow>(
  rows: readonly TRow[],
  offset: number,
  limit: number,
): { readonly rows: readonly TRow[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset = offset + page.length < rows.length ? offset + page.length : undefined;
  return nextOffset === undefined ? { rows: page } : { rows: page, nextOffset };
}

function pageInfo(
  inquiry: Inquiry,
  returned: number,
  total: number,
  limit: number,
  nextOffset: number | undefined,
): Answer["page"] {
  return {
    size: inquiry.page?.size ?? limit,
    returned,
    total,
    ...(nextOffset === undefined ? {} : { nextCursor: String(nextOffset) }),
  };
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 4, 20);
}

function sourceRangeLocus(range: SourceRange): SourceRangeLocus {
  return { kind: LocusKind.SourceRange, range };
}

function groupBy<TRow, TKey>(
  rows: readonly TRow[],
  keyForRow: (row: TRow) => TKey,
): Map<TKey, readonly TRow[]> {
  const groups = new Map<TKey, TRow[]>();
  for (const row of rows) {
    const key = keyForRow(row);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [row]);
    } else {
      group.push(row);
    }
  }
  return groups;
}

function countBy<TRow>(
  rows: readonly TRow[],
  keyForRow: (row: TRow) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyForRow(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function unique<TValue extends string>(
  values: readonly TValue[],
): readonly TValue[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
