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
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import type { SourceProject } from "../../source/index.js";
import {
  readFrameworkRouterAnalysis,
  type FrameworkRouterAnalysis,
  type FrameworkRouterFlowIssueRow,
  type FrameworkRouterFlowRow,
  type FrameworkRouterPackageRow,
  type FrameworkRouteRecognizerMechanicIssueRow,
  type FrameworkRouteRecognizerMechanicRow,
  type FrameworkRouterSurfaceRow,
} from "./framework-router-analysis.js";
import {
  routerRelationshipsFromRows,
  type FrameworkRouterRelationshipRow,
} from "./framework-router-relationships.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import {
  inquiryLowerStringFilter,
  inquiryNumberFilter,
  inquiryPackageIdFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  optionalNextPageContinuation,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";

export interface FrameworkRouterValue {
  readonly version: FrameworkRouterAnalysis["version"];
  readonly rollup: FrameworkRouterAnalysis["rollup"];
  readonly packages?: readonly FrameworkRouterPackageRow[];
  readonly surfaces?: readonly FrameworkRouterSurfaceRow[];
  readonly flows?: readonly FrameworkRouterFlowRow[];
  readonly flowIssues?: readonly FrameworkRouterFlowIssueRow[];
  readonly routeRecognizerMechanics?: readonly FrameworkRouteRecognizerMechanicRow[];
  readonly routeRecognizerMechanicIssues?: readonly FrameworkRouteRecognizerMechanicIssueRow[];
  readonly relationships?: readonly FrameworkRouterRelationshipRow[];
}

type FrameworkRouterProjection =
  | "summary"
  | "packages"
  | "surfaces"
  | "flow"
  | "flow-issues"
  | "recognizer"
  | "recognizer-issues"
  | "relationships";

const MAX_DIRECT_SOURCE_CONTINUATIONS = 12;

export function answerFrameworkRouter(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkRouterValue> {
  const analysis = readFrameworkRouterAnalysis(sourceProject);
  const basis = frameworkRouterBasis(sourceProject);
  switch (frameworkRouterProjection(inquiry)) {
    case "summary":
      return answerFrameworkRouterSummary(inquiry, analysis, basis);
    case "packages":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:packages",
        "framework router package row(s)",
        filterPackages(analysis.packages, inquiry),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), packages: rows }),
        frameworkRouterEvidenceForPackage,
      );
    case "surfaces":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:surfaces",
        "framework router surface row(s)",
        filterFrameworkRouterSurfaces(analysis.surfaces, inquiry),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), surfaces: rows }),
        frameworkRouterEvidenceForSurface,
      );
    case "flow":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:flow",
        "framework router route-flow row(s)",
        filterFlows(analysis.flows, inquiry),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), flows: rows }),
        evidenceForRouterFlow,
      );
    case "flow-issues":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:flow-issues",
        "framework router flow self-audit row(s)",
        filterFlowIssues(analysis.flowIssues, inquiry),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), flowIssues: rows }),
        evidenceForFlowIssue,
      );
    case "recognizer":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:recognizer",
        "framework route-recognizer mechanic row(s)",
        filterRecognizerMechanics(analysis.routeRecognizerMechanics, inquiry),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), routeRecognizerMechanics: rows }),
        evidenceForRouteRecognizerMechanic,
      );
    case "recognizer-issues":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:recognizer-issues",
        "framework route-recognizer mechanic self-audit row(s)",
        filterRecognizerMechanicIssues(analysis.routeRecognizerMechanicIssues, inquiry),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), routeRecognizerMechanicIssues: rows }),
        evidenceForRouteRecognizerMechanicIssue,
      );
    case "relationships":
      return answerFrameworkRouterRows(
        inquiry,
        "framework.router:relationships",
        "framework router relationship row(s)",
        routerRelationshipsFromRows(
          analysis.flows,
          analysis.routeRecognizerMechanics,
          routerRelationshipFilters(inquiry),
        ),
        basis,
        (rows) => ({ ...frameworkRouterBaseValue(analysis), relationships: rows }),
        frameworkRouterEvidenceForRelationship,
      );
  }
}

function answerFrameworkRouterSummary(
  inquiry: Inquiry,
  analysis: FrameworkRouterAnalysis,
  basis: readonly Basis[],
): Answer<FrameworkRouterValue> {
  const packages = filterPackages(analysis.packages, inquiry).slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${analysis.rollup.packageCount} router package(s), ${analysis.rollup.surfaceCount} router surface row(s), ${analysis.rollup.flowCount} ordered route-flow row(s), ${analysis.rollup.routeRecognizerMechanicCount} route-recognizer mechanic row(s), ${analysis.rollup.relationshipCount} router relationship row(s), ${analysis.rollup.flowIssueCount} flow self-audit issue row(s), ${analysis.rollup.routeRecognizerMechanicIssueCount} recognizer self-audit issue row(s), ${analysis.rollup.routeContextCount} route-context row(s), ${analysis.rollup.routeTreeCount} route-tree row(s), and ${analysis.rollup.routeRecognizerCount} route-recognizer surface row(s).`,
    {
      value: {
        ...frameworkRouterBaseValue(analysis),
        packages,
      },
      basis,
      evidence: packages.slice(0, evidenceLimit(inquiry)).map(frameworkRouterEvidenceForPackage),
      continuations: frameworkRouterContinuations(inquiry),
    },
  );
}

function answerFrameworkRouterRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => FrameworkRouterValue,
  evidenceForRow: (row: TRow) => Evidence,
): Answer<FrameworkRouterValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the paged framework router row family.",
        routeSummary: "Next framework router row page.",
      }),
      ...rows.slice(0, MAX_DIRECT_SOURCE_CONTINUATIONS).flatMap((row, index) => [
        ...routerSourceContinuations(row),
        ...routerSemanticContinuationsForRow(inquiry, row, index),
      ]),
      ...frameworkRouterContinuations(inquiry),
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

function frameworkRouterBaseValue(analysis: FrameworkRouterAnalysis): FrameworkRouterValue {
  return {
    version: analysis.version,
    rollup: analysis.rollup,
  };
}

function frameworkRouterProjection(inquiry: Inquiry): FrameworkRouterProjection {
  switch (inquiry.projection) {
    case "packages":
    case "surfaces":
    case "flow":
    case "flow-issues":
    case "relationships":
    case "recognizer":
    case "recognizer-issues":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function filterPackages(
  rows: readonly FrameworkRouterPackageRow[],
  inquiry: Inquiry,
): readonly FrameworkRouterPackageRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.id !== packageId) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.id.toLowerCase().includes(query) ||
      row.packageName.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function filterFrameworkRouterSurfaces(
  rows: readonly FrameworkRouterSurfaceRow[],
  inquiry: Inquiry,
): readonly FrameworkRouterSurfaceRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  const kind = inquiryStringFilter(inquiry, "kind") ?? inquiryStringFilter(inquiry, "surfaceKind");
  const mechanism = inquiryStringFilter(inquiry, "mechanism");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (mechanism !== undefined && row.mechanism !== mechanism) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.packageId.toLowerCase().includes(query) ||
      row.packageName.toLowerCase().includes(query) ||
      row.kind.toLowerCase().includes(query) ||
      row.mechanism.toLowerCase().includes(query) ||
      (row.ownerName?.toLowerCase().includes(query) ?? false) ||
      (row.name?.toLowerCase().includes(query) ?? false) ||
      row.filePath.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function filterFlows(
  rows: readonly FrameworkRouterFlowRow[],
  inquiry: Inquiry,
): readonly FrameworkRouterFlowRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  const stage = inquiryStringFilter(inquiry, "stage");
  const relation = inquiryStringFilter(inquiry, "relation");
  const actor = inquiryStringFilter(inquiry, "actor");
  const target = inquiryStringFilter(inquiry, "target");
  const descriptorKey = inquiryStringFilter(inquiry, "descriptorKey") ?? inquiryStringFilter(inquiry, "key");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (stage !== undefined && row.stage !== stage) {
      return false;
    }
    if (relation !== undefined && row.flowRelation !== relation) {
      return false;
    }
    if (actor !== undefined && row.actor !== actor) {
      return false;
    }
    if (target !== undefined && row.target !== target) {
      return false;
    }
    if (descriptorKey !== undefined && row.descriptorKey !== descriptorKey) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.descriptorKey.toLowerCase().includes(query) ||
      row.packageId.toLowerCase().includes(query) ||
      row.packageName.toLowerCase().includes(query) ||
      row.stage.toLowerCase().includes(query) ||
      row.actor.toLowerCase().includes(query) ||
      row.flowRelation.toLowerCase().includes(query) ||
      row.target.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function filterFlowIssues(
  rows: readonly FrameworkRouterFlowIssueRow[],
  inquiry: Inquiry,
): readonly FrameworkRouterFlowIssueRow[] {
  const kind = inquiryStringFilter(inquiry, "kind") ?? inquiryStringFilter(inquiry, "issueKind");
  const descriptorKey = inquiryStringFilter(inquiry, "descriptorKey") ?? inquiryStringFilter(inquiry, "key");
  const sequence = inquiryNumberFilter(inquiry, "sequence");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (descriptorKey !== undefined && row.descriptorKey !== descriptorKey) {
      return false;
    }
    if (sequence !== undefined && row.sequence !== sequence) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.kind.toLowerCase().includes(query) ||
      (row.descriptorKey?.toLowerCase().includes(query) ?? false) ||
      (row.actor?.toLowerCase().includes(query) ?? false) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function filterRecognizerMechanics(
  rows: readonly FrameworkRouteRecognizerMechanicRow[],
  inquiry: Inquiry,
): readonly FrameworkRouteRecognizerMechanicRow[] {
  const packageId = inquiryPackageIdFilter(inquiry);
  const kind = inquiryStringFilter(inquiry, "kind") ?? inquiryStringFilter(inquiry, "mechanicKind");
  const phase = inquiryStringFilter(inquiry, "phase");
  const product = inquiryStringFilter(inquiry, "product");
  const ownerName = inquiryStringFilter(inquiry, "owner") ?? inquiryStringFilter(inquiry, "ownerName");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (phase !== undefined && row.phase !== phase) {
      return false;
    }
    if (product !== undefined && row.product !== product) {
      return false;
    }
    if (ownerName !== undefined && row.ownerName !== ownerName) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.descriptorKey.toLowerCase().includes(query) ||
      row.packageId.toLowerCase().includes(query) ||
      row.packageName.toLowerCase().includes(query) ||
      row.kind.toLowerCase().includes(query) ||
      row.phase.toLowerCase().includes(query) ||
      row.product.toLowerCase().includes(query) ||
      (row.ownerName?.toLowerCase().includes(query) ?? false) ||
      row.name.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function filterRecognizerMechanicIssues(
  rows: readonly FrameworkRouteRecognizerMechanicIssueRow[],
  inquiry: Inquiry,
): readonly FrameworkRouteRecognizerMechanicIssueRow[] {
  const kind = inquiryStringFilter(inquiry, "kind") ?? inquiryStringFilter(inquiry, "issueKind");
  const descriptorKey = inquiryStringFilter(inquiry, "descriptorKey") ?? inquiryStringFilter(inquiry, "key");
  const ownerName = inquiryStringFilter(inquiry, "owner") ?? inquiryStringFilter(inquiry, "ownerName");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (descriptorKey !== undefined && row.descriptorKey !== descriptorKey) {
      return false;
    }
    if (ownerName !== undefined && row.ownerName !== ownerName) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.kind.toLowerCase().includes(query) ||
      row.descriptorKey.toLowerCase().includes(query) ||
      (row.ownerName?.toLowerCase().includes(query) ?? false) ||
      row.name.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function routerRelationshipFilters(inquiry: Inquiry): {
  readonly packageId?: string;
  readonly stage?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly query?: string;
} {
  return {
    packageId: inquiryPackageIdFilter(inquiry),
    stage: inquiryStringFilter(inquiry, "stage"),
    relation: inquiryStringFilter(inquiry, "relation"),
    mechanism: inquiryStringFilter(inquiry, "mechanism"),
    phase: inquiryStringFilter(inquiry, "phase"),
    query: inquiryStringFilter(inquiry, "query"),
  };
}

function frameworkRouterEvidenceForPackage(row: FrameworkRouterPackageRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework router package rows are derived from admitted Aurelia framework source.",
    ),
    data: row,
  };
}

function frameworkRouterEvidenceForSurface(row: FrameworkRouterSurfaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: frameworkRouterEvidenceKindForSurface(row),
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework router surface rows are AST-derived from admitted router and route-recognizer source.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForRouterFlow(row: FrameworkRouterFlowRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework router flow rows are exact source-backed phase markers from router and route-recognizer source.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForFlowIssue(row: FrameworkRouterFlowIssueRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework router flow issue rows compare curated descriptors against materialized framework source rows.",
    ),
    data: row,
  };
}

function evidenceForRouteRecognizerMechanic(row: FrameworkRouteRecognizerMechanicRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework route-recognizer mechanic rows are exact source-backed parser/recognizer substrate markers.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForRouteRecognizerMechanicIssue(row: FrameworkRouteRecognizerMechanicIssueRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework route-recognizer mechanic issue rows compare curated descriptors against admitted framework source.",
    ),
    data: row,
  };
}

function frameworkRouterEvidenceForRelationship(row: FrameworkRouterRelationshipRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkRouterSourceBasis(
      "Framework router relationship rows normalize source-backed route-flow rows into framework relationship atoms.",
    ),
    source: row.source,
    data: row,
  };
}

function frameworkRouterEvidenceKindForSurface(row: FrameworkRouterSurfaceRow): EvidenceKind {
  switch (row.kind) {
    case "di":
      return EvidenceKind.DiRegistration;
    case "resource":
      return EvidenceKind.ResourceDefinition;
    default:
      return EvidenceKind.MaintenanceSignal;
  }
}

function routerSourceContinuations(row: unknown): readonly Continuation[] {
  const source = (row as { readonly source?: FrameworkRouterSurfaceRow["source"] }).source;
  return sourceInspectionContinuations(source, {
    basis: [BasisKind.TypeScriptProgram],
    rationale: "Inspect the exact framework router source span behind this row.",
    routeSummary: "Exact source span for this framework router surface row.",
  });
}

function routerSemanticContinuationsForRow(
  inquiry: Inquiry,
  row: unknown,
  index: number,
): readonly Continuation[] {
  const stage = routerStageForRow(row);
  if (stage === null) {
    return [];
  }
  const continuations: Continuation[] = [];
  if (
    stage === "route-config-resolution" ||
    stage === "route-config-context" ||
    stage === "component-context-creation"
  ) {
    continuations.push(
      FrameworkSemanticRoutes.RouterToMaterializationResourceInstantiations.continuation(
        inquiry,
        {
          id: `framework.router:materialization-resource-instantiations:${index}`,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Follow routeable component resolution into resource materialization rows.",
        },
      ),
    );
  }
  if (
    stage === "route-tree-compilation" ||
    stage === "component-context-creation" ||
    stage === "viewport-registration"
  ) {
    continuations.push(
      FrameworkSemanticRoutes.RouterToRenderingHydrationFlow.continuation(
        inquiry,
        {
          id: `framework.router:rendering-hydration-flow:${index}`,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Follow router route-tree or viewport pressure into the rendering hydration corridor.",
        },
      ),
    );
  }
  if (stage === "component-context-creation") {
    continuations.push(
      FrameworkSemanticRoutes.RouterToRenderingControllerCreations.continuation(
        inquiry,
        {
          id: `framework.router:rendering-controller-creations:${index}`,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Follow router component-agent creation into renderer child-controller creation rows.",
        },
      ),
    );
  }
  if (stage === "component-lifecycle") {
    continuations.push(
      FrameworkSemanticRoutes.RouterToLifecycleControllerCalls.continuation(
        inquiry,
        {
          id: `framework.router:lifecycle-controller-calls:${index}`,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Follow router component lifecycle pressure into controller lifecycle call rows.",
        },
      ),
    );
  }
  return continuations;
}

function routerStageForRow(row: unknown): FrameworkRouterFlowRow["stage"] | null {
  const candidate = row as {
    readonly stage?: FrameworkRouterFlowRow["stage"];
    readonly flowStage?: FrameworkRouterFlowRow["stage"];
  };
  return candidate.stage ?? candidate.flowStage ?? null;
}

function frameworkRouterContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    {
      id: "framework.router:packages",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect router package-level rollups.",
      inquiry: {
        ...inquiry,
        projection: "packages",
      },
    },
    {
      id: "framework.router:surfaces",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect exact framework router surfaces.",
      inquiry: {
        ...inquiry,
        projection: "surfaces",
      },
    },
    {
      id: "framework.router:flow",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the ordered route-configuration and navigation flow spine.",
      inquiry: {
        ...inquiry,
        projection: "flow",
      },
    },
    {
      id: "framework.router:flow-issues",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect self-audit rows for stale or ambiguous router flow descriptors.",
      inquiry: {
        ...inquiry,
        projection: "flow-issues",
      },
    },
    {
      id: "framework.router:recognizer",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect route-recognizer parser/state/endpoint/candidate mechanics.",
      inquiry: {
        ...inquiry,
        projection: "recognizer",
      },
    },
    {
      id: "framework.router:recognizer-issues",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect self-audit rows for stale or ambiguous route-recognizer mechanic descriptors.",
      inquiry: {
        ...inquiry,
        projection: "recognizer-issues",
      },
    },
    {
      id: "framework.router:relationships",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect normalized router relationship rows derived from the route-flow spine.",
      inquiry: {
        ...inquiry,
        projection: "relationships",
      },
    },
    FrameworkSemanticRoutes.RouterToRenderingHydrationFlow.continuation(
      inquiry,
      {
        id: "framework.router:rendering-hydration-flow",
        priority: ContinuationPriority.Secondary,
        rationale:
          "Compare router context/component-agent pressure with rendering hydration rows.",
      },
    ),
    FrameworkSemanticRoutes.RouterToLifecycleControllerCalls.continuation(
      inquiry,
      {
        id: "framework.router:lifecycle-controller-calls",
        priority: ContinuationPriority.Secondary,
        rationale:
          "Compare routed component lifecycle pressure with lifecycle controller-call rows.",
      },
    ),
  ];
}

function frameworkRouterBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    frameworkRouterSourceBasis(
      "Framework router architecture was derived from the hot TypeScript Program.",
      sourceProject.snapshot().identity,
    ),
  ];
}

function frameworkRouterSourceBasis(summary: string, identity = "router"): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary,
    identity,
  };
}
