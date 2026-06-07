import { execFileSync } from "node:child_process";

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
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  navigationRoute,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import type { SourceDeclarationRow, SourceProject } from "../../source/index.js";
import {
  sourceRangeFromFileSpan,
  sourceRangeFromOneBasedReference,
} from "../../source/index.js";
import {
  atlasMemoryAnchorQueryValues,
  isDefinedMemorySearchValue,
  type AtlasMemoryLiveCheck,
  type AtlasMemoryRecordRow,
} from "./atlas-memory-contracts.js";
import {
  atlasMemoryNextActionRows,
  type AtlasMemoryNextActionRow,
} from "./atlas-memory-next-actions.js";
import {
  atlasMemoryRecordRowHasAuLink,
  atlasMemoryRecordRowHasLens,
  atlasMemoryRecordRowHasSymbol,
} from "./atlas-memory-row-matching.js";
import { readAtlasMemoryAnalysis } from "./atlas-memory-store.js";
import {
  type FrameworkCorpusExpectedEffectDescriptorRow,
  type FrameworkCorpusFixtureSeedRow,
  readFrameworkCorpusAnalysis,
} from "./framework-corpus-analysis.js";
import { frameworkCorpusFixtureSeedMatchesClassification } from "./framework-corpus-classification.js";
import {
  frameworkCorpusFixtureSeedAppPatternFilterScore,
  frameworkCorpusFixtureSeedMatchesAppPatternFilter,
} from "./framework-corpus-app-pattern-matching.js";
import { frameworkCorpusFixtureSeedQueryScore } from "./framework-corpus-row-relevance.js";
import { optionalNextPageContinuation } from "./lens-continuation-utils.js";
import {
  inquiryNumberFilter,
  queryRelevanceScore,
} from "./lens-filter-utils.js";
import {
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysis,
  type AtlasSelfClassSurfaceRow,
  type AtlasSelfFunctionSurfaceRow,
  type AtlasSelfSourceFileSurfaceRow,
  type AtlasSelfVariableSurfaceRow,
} from "./self-analysis.js";
import {
  readProductArchitectureAnalysis,
  type ProductArchitectureAnalysis,
  type ProductArchitectureClassSurfaceRow,
  type ProductArchitectureDeclarationRow,
  type ProductArchitectureFunctionSurfaceRow,
  type ProductArchitectureModuleRow,
} from "./product-architecture-analysis.js";
import {
  ATLAS_WORK_ROUTER_VERSION,
  AtlasWorkRouteCoverageState,
  type AtlasWorkRoute,
  type AtlasWorkRouteAnchor,
  type AtlasWorkRouteCorpusAnchor,
  type AtlasWorkRouteDocAnchor,
  type AtlasWorkRouteLensAnchor,
  type AtlasWorkRouteMatchStrength,
  type AtlasWorkRouteMemoryAnchor,
  type AtlasWorkRoutePathAnchor,
  type AtlasWorkRouteQueryCanary,
  type AtlasWorkRouteScriptAnchor,
  type AtlasWorkRouteSourceAnchor,
} from "./atlas-work-router-contracts.js";
import { ATLAS_WORK_ROUTES } from "./atlas-work-router-route-catalog.js";
import {
  atlasWorkRouterFilters,
  emptyAtlasWorkRouterFilters,
  firstFrameworkErrorCodeQuery,
  routeMatchStrengthMeets,
  scoredRoutesForFilters,
  sourcePathMatches,
  type AtlasWorkRouterFilters,
  type ScoredRoute,
} from "./atlas-work-router-matching.js";
import { routeNextQuestions } from "./atlas-work-router-next-questions.js";
import type {
  AtlasWorkRouteHealthIssue,
  AtlasWorkRouteHealthRow,
  AtlasWorkRouteCoverageRow,
  AtlasWorkRouteMemoryCoverageRow,
  AtlasWorkRoutePlanRow,
  AtlasWorkRouteQueryCanaryRow,
  AtlasWorkRouteRow,
  AtlasWorkRouteSourcePlanRow,
  AtlasWorkRouteWorksetFileRow,
  AtlasWorkRouteWorksetRow,
  AtlasWorkRouterRollup,
  AtlasWorkRouterValue,
} from "./atlas-work-router-rows.js";

type AtlasWorkRouterProjection =
  | "summary"
  | "routes"
  | "next"
  | "route-plan"
  | "next-questions"
  | "route-health"
  | "coverage"
  | "workset"
  | "memory-coverage"
  | "schema";

interface RouterState {
  readonly product: ProductArchitectureAnalysis;
  readonly atlasSelf: AtlasSelfAnalysis;
  readonly memoryRecords: readonly AtlasMemoryRecordRow[];
  readonly memoryNextActions: readonly AtlasMemoryNextActionRow[];
  readonly fixtureSeeds: readonly FrameworkCorpusFixtureSeedRow[];
  readonly expectedEffects: readonly FrameworkCorpusExpectedEffectDescriptorRow[];
  readonly sourceProject: SourceProject;
}

interface WorktreeFile {
  readonly status: string;
  readonly filePath: string;
}

/** Answer typed work-routing inquiries. */
export function answerAtlasWorkRouter(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<AtlasWorkRouterValue> {
  const projection = atlasWorkRouterProjection(inquiry);
  const filters = atlasWorkRouterFilters(inquiry);
  const state = readRouterState(sourceProject);
  const selectedRoutes = scoredRoutesForFilters(filters);
  const basis = atlasWorkRouterBasis(sourceProject);

  switch (projection) {
    case "schema":
      return answerAtlasWorkRouterSchema(inquiry, filters, selectedRoutes, basis);
    case "route-health":
      return answerAtlasWorkRouterRouteHealth(
        inquiry,
        selectedRoutes,
        state,
        basis,
      );
    case "coverage":
      return answerAtlasWorkRouterCoverage(
        inquiry,
        selectedRoutes,
        basis,
      );
    case "workset":
      return answerAtlasWorkRouterWorkset(
        inquiry,
        selectedRoutes,
        state,
        sourceProject,
        basis,
      );
    case "memory-coverage":
      return answerAtlasWorkRouterMemoryCoverage(
        inquiry,
        selectedRoutes,
        state,
        basis,
      );
    case "next":
    case "route-plan":
    case "next-questions":
      return answerAtlasWorkRouterRoutePlans(
        inquiry,
        selectedRoutes,
        state,
        basis,
      );
    case "routes":
      return answerAtlasWorkRouterRoutes(inquiry, filters, selectedRoutes, state, basis);
    case "summary":
      return answerAtlasWorkRouterSummary(
        inquiry,
        filters,
        selectedRoutes,
        state,
        basis,
      );
  }
}

function answerAtlasWorkRouterSummary(
  inquiry: Inquiry,
  filters: AtlasWorkRouterFilters,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const effectiveScoredRoutes = routePlanScoredRoutes(scoredRoutes, state, filters);
  const routes = effectiveScoredRoutes
    .slice(0, rowLimit(inquiry))
    .map((entry) => entry.row);
  const rollupPlans = effectiveScoredRoutes.map((entry) =>
    routePlan(entry, state, filters)
  );
  const plans = rollupPlans.slice(0, Math.min(3, routes.length));
  const rollup = routerRollup(effectiveScoredRoutes, rollupPlans);
  const weakSeams = weakTextOpenSeams(routes);
  return createAnswer(
    inquiry,
    routes.length > 0 ? OutcomeKind.Hit : OutcomeKind.Miss,
    `Returned ${routes.length} of ${effectiveScoredRoutes.length} matched Atlas work route(s) from ${ATLAS_WORK_ROUTES.length} catalog route(s); ${rollup.weakTextMatchCount} weak-text match(es), ${rollup.routeWithMemoryCount} route(s) with memory joins, ${rollup.routeWithFixtureSeedCount} route(s) with fixture seeds, and ${rollup.routeWithSourceMatchCount} route(s) with source matches.`,
    {
      value: {
        version: ATLAS_WORK_ROUTER_VERSION,
        rollup,
        routes,
        routePlans: plans,
      },
      basis,
      evidence: routes.slice(0, evidenceLimit(inquiry)).map(routeRowEvidence),
      openSeams: weakSeams,
      continuations: [
        ...atlasWorkRouterProjectionContinuations(inquiry, filters),
        ...routes.flatMap((row) => routeContinuations(row, state)).slice(0, 18),
      ],
    },
  );
}

function answerAtlasWorkRouterRoutes(
  inquiry: Inquiry,
  filters: AtlasWorkRouterFilters,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const rowFamily = new PagedRowFamily<AtlasWorkRouteRow>({
    id: "atlas.work-router:routes",
    rowLabel: "Atlas work route row(s)",
    evidenceForRow: routeRowEvidence,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the typed work-route row family.",
        routeSummary: "Next Atlas work-route page.",
      }),
      ...atlasWorkRouterProjectionContinuations(inquiry, filters),
      ...rows.flatMap((row) => routeContinuations(row, state)).slice(0, 18),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows: scoredRoutes.map((entry) => entry.row),
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => {
      const pagePlans = page.rows.flatMap((row) =>
        scoredRoutes
          .filter((entry) => entry.row.id === row.id)
          .map((entry) => routePlan(entry, state, filters)),
      );
      return {
        version: ATLAS_WORK_ROUTER_VERSION,
        rollup: routerRollup(scoredRoutes, pagePlans),
        routes: page.rows,
        routePlans: pagePlans.slice(0, 3),
      };
    },
    openSeams: (page) => weakTextOpenSeams(page.rows),
  });
}

function answerAtlasWorkRouterRoutePlans(
  inquiry: Inquiry,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const filters = atlasWorkRouterFilters(inquiry);
  const effectiveScoredRoutes = routePlanScoredRoutes(scoredRoutes, state, filters);
  const plans = effectiveScoredRoutes.map((entry) => routePlan(entry, state, filters));
  const rowFamily = new PagedRowFamily<AtlasWorkRoutePlanRow>({
    id: "atlas.work-router:route-plan",
    rowLabel: "Atlas work route plan(s)",
    evidenceForRow: routePlanEvidence,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the typed work-route plan family.",
        routeSummary: "Next Atlas work-route plan page.",
      }),
      ...atlasWorkRouterProjectionContinuations(inquiry, atlasWorkRouterFilters(inquiry)),
      ...rows.flatMap(routePlanContinuations).slice(0, 24),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows: plans,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => ({
      version: ATLAS_WORK_ROUTER_VERSION,
      rollup: routerRollup(effectiveScoredRoutes, plans),
      routes: effectiveScoredRoutes.map((entry) => entry.row),
      routePlans: page.rows,
    }),
    openSeams: (page) =>
      weakTextOpenSeams(
        effectiveScoredRoutes
          .map((entry) => entry.row)
          .filter((row) => page.rows.some((plan) => plan.routeId === row.id)),
      ),
  });
}

function answerAtlasWorkRouterRouteHealth(
  inquiry: Inquiry,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const filters = atlasWorkRouterFilters(inquiry);
  const plans = scoredRoutes.map((entry) => routePlan(entry, state, filters));
  const healthRows = plans.map((plan) => routeHealthRow(plan));
  const rowFamily = new PagedRowFamily<AtlasWorkRouteHealthRow>({
    id: "atlas.work-router:route-health",
    rowLabel: "Atlas work route health row(s)",
    evidenceForRow: routeHealthEvidence,
    continuationsForPage: (inquiry, _rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the work-route health row family.",
        routeSummary: "Next Atlas work-route health page.",
      }),
      ...atlasWorkRouterProjectionContinuations(inquiry, atlasWorkRouterFilters(inquiry)),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows: healthRows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => ({
      version: ATLAS_WORK_ROUTER_VERSION,
      rollup: routerRollup(scoredRoutes, plans),
      routes: scoredRoutes.map((entry) => entry.row),
      routePlans: plans.filter((plan) =>
        page.rows.some((row) => row.routeId === plan.routeId),
      ),
      routeHealth: page.rows,
    }),
    openSeams: (page) => page.rows.flatMap(routeHealthOpenSeams),
  });
}

function answerAtlasWorkRouterCoverage(
  inquiry: Inquiry,
  scoredRoutes: readonly ScoredRoute[],
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const filters = atlasWorkRouterFilters(inquiry);
  const rows = scoredRoutes
    .flatMap((entry) => routeCoverageRows(entry.route))
    .filter((row) =>
      (filters.coverageDimension === undefined || row.dimension === filters.coverageDimension) &&
      (filters.coverageState === undefined || row.state === filters.coverageState) &&
      (filters.coverageDepth === undefined || row.depth === filters.coverageDepth)
    )
    .sort(compareRouteCoverageRows);
  const rowFamily = new PagedRowFamily<AtlasWorkRouteCoverageRow>({
    id: "atlas.work-router:coverage",
    rowLabel: "Atlas work route coverage row(s)",
    evidenceForRow: routeCoverageEvidence,
    continuationsForPage: (inquiry, pageRows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the work-route coverage row family.",
        routeSummary: "Next Atlas work-route coverage page.",
      }),
      ...atlasWorkRouterProjectionContinuations(inquiry, filters),
      ...pageRows.map((row) =>
        workRouterRoutePlanContinuation(
          row.routeId,
          `Inspect route plan for ${row.dimension} coverage on ${row.routeId}.`,
        ),
      ).slice(0, 16),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => ({
      version: ATLAS_WORK_ROUTER_VERSION,
      rollup: routerRollup(scoredRoutes, []),
      routes: scoredRoutes.map((entry) => entry.row),
      routeCoverage: page.rows,
    }),
  });
}

function answerAtlasWorkRouterWorkset(
  inquiry: Inquiry,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  sourceProject: SourceProject,
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const filters = atlasWorkRouterFilters(inquiry);
  const worktreeFiles = readWorktreeFiles(sourceProject.repoRoot);
  const fileSampleLimit = worksetFileSampleLimit(inquiry);
  const rows = scoredRoutes
    .map((entry) =>
      routeWorksetRow(entry.route, state, worktreeFiles, fileSampleLimit)
    )
    .filter((row): row is AtlasWorkRouteWorksetRow => row !== null)
    .sort((left, right) =>
      right.changedFileCount - left.changedFileCount ||
      right.matchedMemoryAnchorCount - left.matchedMemoryAnchorCount ||
      right.matchedMemoryShardCount - left.matchedMemoryShardCount ||
      left.routeId.localeCompare(right.routeId),
    );
  const worksetScoredRoutes = scoredRoutesForWorksetRows(rows, scoredRoutes);
  const rowFamily = new PagedRowFamily<AtlasWorkRouteWorksetRow>({
    id: "atlas.work-router:workset",
    rowLabel: "Atlas work route workset row(s)",
    evidenceForRow: routeWorksetEvidence,
    continuationsForPage: (inquiry, pageRows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the current workset route rows.",
        routeSummary: "Next Atlas workset route page.",
      }),
      ...atlasWorkRouterProjectionContinuations(inquiry, filters),
      ...pageRows.flatMap((row) =>
        routePlanContinuations(routePlanForWorksetRow(row, scoredRoutes, state, filters)),
      ).slice(0, 24),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => {
      const pagePlans = routePlansForWorksetRows(
        page.rows,
        scoredRoutes,
        state,
        filters,
      );
      return {
        version: ATLAS_WORK_ROUTER_VERSION,
        rollup: routerRollup(worksetScoredRoutes, pagePlans),
        routes: worksetScoredRoutes.map((entry) => entry.row),
        routePlans: pagePlans.slice(0, 3),
        workset: page.rows,
      };
    },
  });
}

function answerAtlasWorkRouterMemoryCoverage(
  inquiry: Inquiry,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  const filters = atlasWorkRouterFilters(inquiry);
  const coverageRows = state.memoryNextActions
    .filter((row) => memoryNextActionMatchesFilters(row, filters))
    .map((row) => memoryCoverageRow(row, scoredRoutes))
    .filter((row) => !routeScopedMemoryCoverage(filters) || row.routed);
  const rows = coverageRows
    .sort((left, right) =>
      compareMemoryCoverageRows(left, right, filters),
    );
  const rowFamily = new PagedRowFamily<AtlasWorkRouteMemoryCoverageRow>({
    id: "atlas.work-router:memory-coverage",
    rowLabel: "Atlas work route memory coverage row(s)",
    evidenceForRow: routeMemoryCoverageEvidence,
    continuationsForPage: (inquiry, pageRows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the memory next-action coverage rows.",
        routeSummary: "Next Atlas memory coverage page.",
      }),
      ...atlasWorkRouterProjectionContinuations(inquiry, filters),
      ...pageRows
        .filter((row) => row.routed)
        .flatMap((row) =>
          row.routeMatches.slice(0, 2).map((match) =>
            workRouterRoutePlanContinuation(
              match.routeId,
              `Inspect route plan for memory next action ${row.id}.`,
            ),
          ),
        )
        .slice(0, 16),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => {
      const pagePlans = routePlansForMemoryCoverageRows(
        page.rows,
        scoredRoutes,
        state,
        filters,
      );
      return {
        version: ATLAS_WORK_ROUTER_VERSION,
        rollup: routerRollup(scoredRoutes, pagePlans),
        routes: scoredRoutes.map((entry) => entry.row),
        routePlans: pagePlans.slice(0, 3),
        memoryCoverage: page.rows,
      };
    },
    openSeams: (page) => page.rows
      .filter((row) => !row.routed)
      .map(memoryCoverageOpenSeam),
  });
}

function routeScopedMemoryCoverage(filters: AtlasWorkRouterFilters): boolean {
  return filters.routeIds.length > 0 || filters.relatedTo !== undefined;
}

function compareMemoryCoverageRows(
  left: AtlasWorkRouteMemoryCoverageRow,
  right: AtlasWorkRouteMemoryCoverageRow,
  filters: AtlasWorkRouterFilters,
): number {
  if (hasQueryText(filters.query)) {
    const queryScoreDifference =
      memoryCoverageQueryScore(right, filters.query) -
      memoryCoverageQueryScore(left, filters.query);
    if (queryScoreDifference !== 0) {
      return queryScoreDifference;
    }
  }
  return routeScopedMemoryCoverage(filters)
    ? topRouteCoverageScore(right) - topRouteCoverageScore(left) ||
      right.rank - left.rank ||
      left.id.localeCompare(right.id)
    : Number(left.routed) - Number(right.routed) ||
      right.rank - left.rank ||
      left.id.localeCompare(right.id);
}

function topRouteCoverageScore(row: AtlasWorkRouteMemoryCoverageRow): number {
  return Math.max(0, ...row.routeMatches.map((match) => match.score));
}

function memoryCoverageQueryScore(
  row: AtlasWorkRouteMemoryCoverageRow,
  query: string | undefined,
): number {
  return queryRelevanceScore(query, [
    {
      weight: 6,
      values: [
        row.id,
        row.recordId ?? "",
        row.actionSummary,
      ],
    },
    {
      weight: 3,
      values: row.domains,
    },
  ]);
}

function answerAtlasWorkRouterSchema(
  inquiry: Inquiry,
  filters: AtlasWorkRouterFilters,
  scoredRoutes: readonly ScoredRoute[],
  basis: readonly Basis[],
): Answer<AtlasWorkRouterValue> {
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${ATLAS_WORK_ROUTES.length} Atlas work-route definition(s); showing ${scoredRoutes.length} route(s) after filters.`,
    {
      value: {
        version: ATLAS_WORK_ROUTER_VERSION,
        rollup: routerRollup(scoredRoutes, []),
        catalog: scoredRoutes.map((entry) => entry.route),
        routes: scoredRoutes.map((entry) => entry.row),
      },
      basis,
      evidence: scoredRoutes
        .slice(0, evidenceLimit(inquiry))
        .map((entry) => routeRowEvidence(entry.row)),
      openSeams: weakTextOpenSeams(scoredRoutes.map((entry) => entry.row)),
      continuations: atlasWorkRouterProjectionContinuations(inquiry, filters),
    },
  );
}

function readRouterState(sourceProject: SourceProject): RouterState {
  const product = readProductArchitectureAnalysis(sourceProject, {
    includeCallSites: false,
    includeSymbols: false,
    includeKernelRecords: false,
  });
  const memory = readAtlasMemoryAnalysis(sourceProject);
  const corpus = readFrameworkCorpusAnalysis(sourceProject);
  return {
    product,
    atlasSelf: readAtlasSelfAnalysis(sourceProject, {
      includeSemanticTaxonomyAnalysis: false,
    }),
    memoryRecords: memory.records,
    memoryNextActions: atlasMemoryNextActionRows(memory),
    fixtureSeeds: corpus.fixtureSeeds,
    expectedEffects: corpus.expectedEffectDescriptors,
    sourceProject,
  };
}

function atlasWorkRouterProjection(
  inquiry: Inquiry,
): AtlasWorkRouterProjection {
  switch (inquiry.projection) {
    case "routes":
    case "next":
    case "next-questions":
      return inquiry.projection;
    case "route-plan":
    case "route-health":
    case "coverage":
    case "workset":
    case "memory-coverage":
    case "schema":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function routePlan(
  scored: ScoredRoute,
  state: RouterState,
  filters: AtlasWorkRouterFilters,
): AtlasWorkRoutePlanRow {
  const route = scored.route;
  const sourceAnchors = route.anchors
    .filter((anchor): anchor is AtlasWorkRouteSourceAnchor => anchor.kind === "source")
    .map((anchor) => sourcePlan(anchor, state));
  const lensAnchors = route.anchors
    .filter((anchor): anchor is AtlasWorkRouteLensAnchor => anchor.kind === "lens");
  const scriptAnchors = route.anchors
    .filter((anchor): anchor is AtlasWorkRouteScriptAnchor => anchor.kind === "script");
  const docAnchors = route.anchors
    .filter((anchor): anchor is AtlasWorkRouteDocAnchor => anchor.kind === "doc");
  const pathAnchors = route.anchors
    .filter((anchor): anchor is AtlasWorkRoutePathAnchor => anchor.kind === "path");
  const corpusAnchors = route.anchors
    .filter((anchor): anchor is AtlasWorkRouteCorpusAnchor =>
      anchor.kind === "framework-corpus",
    );
  const memoryRecords = matchingMemoryRecords(
    state.memoryRecords,
    route.anchors,
    filters.query,
  )
    .slice(0, 8);
  const memoryNextActions = matchingMemoryNextActions(
    state.memoryNextActions,
    route.anchors,
    filters.query,
  ).slice(0, 8);
  const fixtureSeeds = matchingFixtureSeeds(state.fixtureSeeds, corpusAnchors, filters)
    .slice(0, 8);
  const expectedEffects = matchingExpectedEffects(
    state.expectedEffects,
    corpusAnchors,
    filters,
  ).slice(0, 8);
  const queryCanaries = routeQueryCanaryRows(route);
  return {
    routeId: route.id,
    title: route.title,
    matchStrength: scored.row.matchStrength,
    authority: route.authority,
    nextQuestions: routeNextQuestions(route, filters),
    relatedRouteIds: route.relatedRouteIds ?? [],
    sourceAnchors,
    lensAnchors,
    scriptAnchors,
    docAnchors,
    pathAnchors,
    memoryRecords,
    memoryNextActions,
    fixtureSeeds,
    expectedEffects,
    queryCanaries,
    coverage: route.coverage ?? [],
    frameworkErrorCodeLabel: route.id === "diagnostics.framework-error-grounding" &&
        filters.query !== undefined
      ? firstFrameworkErrorCodeQuery(filters.query)
      : undefined,
    cautions: route.cautions,
    summary:
      `${route.title}: ${sourceAnchors.filter((row) => row.found).length}/${sourceAnchors.length} source anchor(s) found, ${lensAnchors.length} lens anchor(s), ${scriptAnchors.length} script anchor(s), ${docAnchors.length} doc anchor(s), ${pathAnchors.length} path anchor(s), ${memoryRecords.length} memory record(s), ${memoryNextActions.length} memory next action(s), ${fixtureSeeds.length} fixture seed(s), ${expectedEffects.length} expected-effect descriptor(s), and ${route.coverage?.length ?? 0} coverage row(s).`,
  };
}

function routePlanScoredRoutes(
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  filters: AtlasWorkRouterFilters,
): readonly ScoredRoute[] {
  if (!workRouterFiltersAreEmpty(filters)) {
    return scoredRoutes;
  }

  const ranked = scoredRoutes
    .map((entry) => defaultRankedScoredRoute(entry, state))
    .filter((entry): entry is ScoredRoute => entry !== null)
    .sort(compareDefaultRankedScoredRoutes);
  return ranked.length === 0 ? scoredRoutes : ranked;
}

function workRouterFiltersAreEmpty(filters: AtlasWorkRouterFilters): boolean {
  return filters.query === undefined &&
    filters.routeIds.length === 0 &&
    filters.relatedTo === undefined &&
    filters.domains.length === 0 &&
    filters.role === undefined &&
    filters.lensId === undefined &&
    filters.path === undefined &&
    filters.symbolName === undefined &&
    filters.auLinkId === undefined &&
    filters.concept === undefined &&
    filters.effectKind === undefined &&
    filters.appPatternKey === undefined &&
    filters.seedUse === undefined &&
    filters.coverageDimension === undefined &&
    filters.coverageState === undefined &&
    filters.coverageDepth === undefined;
}

interface DefaultRouteRankComponent {
  readonly score: number;
  readonly matchStrength: AtlasWorkRouteMatchStrength;
  readonly matchedBy: string;
}

function defaultRankedScoredRoute(
  scored: ScoredRoute,
  state: RouterState,
): ScoredRoute | null {
  const memory = memoryRankComponent(scored.route, state.memoryNextActions);
  const product = productPressureRankComponent(scored.route, state.product, state.atlasSelf);
  if (memory === null && product === null) {
    return null;
  }
  const components = [memory, product].filter((entry): entry is DefaultRouteRankComponent =>
    entry !== null,
  );
  const strongest = [...components].sort((left, right) =>
    right.score - left.score ||
    left.matchStrength.localeCompare(right.matchStrength)
  )[0]!;
  return {
    route: scored.route,
    row: {
      ...scored.row,
      matchScore: components.reduce((total, entry) => total + entry.score, 0),
      matchStrength: strongest.matchStrength,
      matchedBy: components.map((entry) => entry.matchedBy),
    },
  };
}

function memoryRankComponent(
  route: AtlasWorkRoute,
  memoryNextActions: readonly AtlasMemoryNextActionRow[],
): DefaultRouteRankComponent | null {
  const topMatch = memoryNextActions
    .map((row) => ({
      row,
      score: memoryNextActionRouteScore(row, route),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) =>
      right.row.rank - left.row.rank ||
      right.score - left.score ||
      left.row.id.localeCompare(right.row.id),
    )[0];
  if (topMatch === undefined) {
    return null;
  }
  return {
    score: 2_500 + topMatch.row.rank + topMatch.score,
    matchStrength: "memory-structural",
    matchedBy:
      `live memory next action ${topMatch.row.id} matched route anchors with score ${topMatch.score}`,
  };
}

function productPressureRankComponent(
  route: AtlasWorkRoute,
  product: ProductArchitectureAnalysis,
  atlasSelf: AtlasSelfAnalysis,
): DefaultRouteRankComponent | null {
  const topMatch = route.anchors
    .filter((anchor): anchor is AtlasWorkRouteSourceAnchor => anchor.kind === "source")
    .flatMap((anchor) => sourceAnchorProductPressureMatches(anchor, product, atlasSelf))
    .sort((left, right) =>
      right.score - left.score ||
      left.label.localeCompare(right.label)
    )[0];
  if (topMatch === undefined || topMatch.score <= 0) {
    return null;
  }
  return {
    score: 2_500 + topMatch.score,
    matchStrength: "product-structural",
    matchedBy:
      `live product/source pressure ${topMatch.label} matched route source anchors with score ${topMatch.score}`,
  };
}

interface SourceAnchorProductPressureMatch {
  readonly score: number;
  readonly label: string;
}

function sourceAnchorProductPressureMatches(
  anchor: AtlasWorkRouteSourceAnchor,
  product: ProductArchitectureAnalysis,
  atlasSelf: AtlasSelfAnalysis,
): readonly SourceAnchorProductPressureMatch[] {
  const atlasModuleShapeByPath = new Map(
    atlasSelf.sourceFileSurfaces.map((row) => [row.filePath, row.moduleShape] as const),
  );
  return [
    ...product.modules
      .filter((row) =>
        anchor.symbolName === undefined &&
        sourcePathMatches(row.filePath, anchor.filePath)
      )
      .map((row) => ({
        score: sourceAnchorProductPressureScore(anchor, productModulePressureScore(row)),
        label: `${row.filePath}${row.maxFunctionName == null ? "" : `:${row.maxFunctionName}`}`,
      })),
    ...product.classSurfaces
      .filter((row) => sourcePathMatches(row.filePath, anchor.filePath) &&
        (anchor.symbolName === undefined || row.name === anchor.symbolName))
      .map((row) => ({
        score: sourceAnchorProductPressureScore(anchor, classLikePressureScore(row)),
        label: row.name,
      })),
    ...product.functionSurfaces
      .filter((row) => sourcePathMatches(row.filePath, anchor.filePath) &&
        (anchor.symbolName === undefined || row.name === anchor.symbolName || row.className === anchor.symbolName))
      .map((row) => ({
        score: sourceAnchorProductPressureScore(anchor, productFunctionPressureScore(row)),
        label: row.name,
    })),
    ...atlasSelf.sourceFileSurfaces
      .filter((row) =>
        anchor.symbolName === undefined &&
        sourcePathMatches(row.filePath, anchor.filePath)
      )
      .map((row) => ({
        score: sourceAnchorProductPressureScore(anchor, atlasSourceFilePressureScore(row)),
        label: row.filePath,
      })),
    ...atlasSelf.classSurfaces
      .filter((row) => sourcePathMatches(row.filePath, anchor.filePath) &&
        (anchor.symbolName === undefined || row.name === anchor.symbolName))
      .map((row) => ({
        score: sourceAnchorProductPressureScore(anchor, classLikePressureScore(row)),
        label: row.name,
      })),
    ...atlasSelf.functionSurfaces
      .filter((row) => sourcePathMatches(row.filePath, anchor.filePath) &&
        (anchor.symbolName === undefined || row.name === anchor.symbolName || row.className === anchor.symbolName))
      .map((row) => ({
        score: sourceAnchorProductPressureScore(anchor, atlasFunctionPressureScore(row)),
        label: row.name,
      })),
    ...atlasSelf.variableSurfaces
      .filter((row) => sourcePathMatches(row.filePath, anchor.filePath) &&
        (anchor.symbolName === undefined || row.name === anchor.symbolName))
      .map((row) => ({
        score: sourceAnchorProductPressureScore(
          anchor,
          atlasVariablePressureScore(row, atlasModuleShapeByPath.get(row.filePath)),
        ),
        label: row.name,
      })),
  ];
}

function sourceAnchorProductPressureScore(
  anchor: AtlasWorkRouteSourceAnchor,
  baseScore: number,
): number {
  if (baseScore <= 0) {
    return 0;
  }
  return Math.round(baseScore * sourceAnchorPressureRoleMultiplier(anchor.role));
}

function sourceAnchorPressureRoleMultiplier(
  role: AtlasWorkRouteSourceAnchor["role"],
): number {
  switch (role) {
    case "primary":
      return 1;
    case "pressure":
      return 0.85;
    case "grounding":
      return 0.7;
    case "supporting":
      return 0.35;
    case "caution":
      return 0.15;
  }
}

function productModulePressureScore(row: ProductArchitectureModuleRow): number {
  return Math.max(0,
    row.lineCount +
    row.maxFunctionLineCount * 20 +
    row.largeFunctionCount * 2_500 +
    row.crossAreaImportCount * 50 +
    row.localImportInCount * 10,
  );
}

function productFunctionPressureScore(row: ProductArchitectureFunctionSurfaceRow): number {
  return Math.max(0,
    row.lineCount * 25 +
    row.distinctCalleeCount * 30 +
    row.crossAreaCallSiteCount * 80 +
    row.switchTopologyCount * 200,
  );
}

function atlasSourceFilePressureScore(row: AtlasSelfSourceFileSurfaceRow): number {
  const rawScore = Math.max(0,
    row.lineCount +
    row.largeLiteralCount * 1_500 +
    row.crossAreaOutgoingImportCount * 60 +
    row.incomingLocalImportCount * 10,
  );
  return Math.round(rawScore * atlasModuleShapePressureMultiplier(row.moduleShape));
}

function classLikePressureScore(row: {
  readonly lineCount: number;
  readonly methodCount: number;
  readonly propertyCount: number;
}): number {
  return Math.max(0, row.lineCount + row.methodCount * 60 + row.propertyCount * 20);
}

function atlasVariablePressureScore(
  row: AtlasSelfVariableSurfaceRow,
  moduleShape: AtlasSelfSourceFileSurfaceRow["moduleShape"] | undefined,
): number {
  const rawScore = Math.max(0, row.lineCount);
  return Math.round(rawScore * atlasModuleShapePressureMultiplier(moduleShape));
}

function atlasModuleShapePressureMultiplier(
  moduleShape: AtlasSelfSourceFileSurfaceRow["moduleShape"] | undefined,
): number {
  switch (moduleShape) {
    case "barrel":
      return 0.1;
    case "catalog":
      return 0.2;
    case "contract":
      return 0.15;
    case "mixed":
      return 0.8;
    case "implementation":
    case undefined:
      return 1;
  }
}

function atlasFunctionPressureScore(row: AtlasSelfFunctionSurfaceRow): number {
  return Math.max(0,
    row.lineCount * 25 +
    row.callCount * 10 +
    row.uniqueCallTargetCount * 30 +
    row.switchTopologyCount * 200,
  );
}

function compareDefaultRankedScoredRoutes(
  left: ScoredRoute,
  right: ScoredRoute,
): number {
  return right.row.matchScore - left.row.matchScore ||
    left.route.id.localeCompare(right.route.id);
}

function routeQueryCanaryRows(route: AtlasWorkRoute): readonly AtlasWorkRouteQueryCanaryRow[] {
  return (route.queryCanaries ?? []).map((canary) =>
    routeQueryCanaryRow(route, canary),
  );
}

function routeQueryCanaryRow(
  route: AtlasWorkRoute,
  canary: AtlasWorkRouteQueryCanary,
): AtlasWorkRouteQueryCanaryRow {
  const minimumStrength = canary.minimumStrength ?? "declared-route-term";
  const matchedRoute = scoredRoutesForFilters({
    ...emptyAtlasWorkRouterFilters(),
    query: canary.query,
  })[0];
  const passed = matchedRoute !== undefined &&
    matchedRoute.route.id === route.id &&
    routeMatchStrengthMeets(matchedRoute.row.matchStrength, minimumStrength);
  return {
    query: canary.query,
    expectedRouteId: route.id,
    minimumStrength,
    actualRouteId: matchedRoute?.route.id,
    actualMatchStrength: matchedRoute?.row.matchStrength,
    passed,
    summary: passed
      ? `${canary.query} routes to ${route.id} as ${matchedRoute.row.matchStrength}.`
      : `${canary.query} should route to ${route.id} with at least ${minimumStrength}, but ${matchedRoute === undefined ? "no route matched" : `${matchedRoute.route.id} matched as ${matchedRoute.row.matchStrength}`}. ${canary.summary}`,
  };
}

function routeCoverageRows(route: AtlasWorkRoute): readonly AtlasWorkRouteCoverageRow[] {
  return (route.coverage ?? []).map((coverage) => ({
    routeId: route.id,
    title: route.title,
    dimension: coverage.dimension,
    state: coverage.state,
    depth: coverage.depth,
    ownerRouteId: coverage.ownerRouteId,
    domains: route.domains,
    relatedRouteIds: route.relatedRouteIds,
    summary: coverage.summary,
  }));
}

function compareRouteCoverageRows(
  left: AtlasWorkRouteCoverageRow,
  right: AtlasWorkRouteCoverageRow,
): number {
  return coverageStateSortOrder(left.state) - coverageStateSortOrder(right.state) ||
    coverageDepthSortOrder(left.depth) - coverageDepthSortOrder(right.depth) ||
    left.dimension.localeCompare(right.dimension) ||
    left.routeId.localeCompare(right.routeId);
}

function coverageStateSortOrder(state: AtlasWorkRouteCoverageRow["state"]): number {
  switch (state) {
    case AtlasWorkRouteCoverageState.Missing:
      return 0;
    case AtlasWorkRouteCoverageState.Partial:
      return 1;
    case AtlasWorkRouteCoverageState.Covered:
      return 2;
    case AtlasWorkRouteCoverageState.NotApplicable:
      return 3;
  }
  return 4;
}

function coverageDepthSortOrder(depth: AtlasWorkRouteCoverageRow["depth"]): number {
  switch (depth) {
    case undefined:
      return 0;
    case "wired":
      return 1;
    case "semantic":
      return 2;
    case "verified":
      return 3;
  }
  return 4;
}

function routeHealthRow(plan: AtlasWorkRoutePlanRow): AtlasWorkRouteHealthRow {
  const issues = routeHealthIssues(plan);
  const foundSourceAnchorCount = plan.sourceAnchors.filter((row) => row.found).length;
  const memoryAnchorCount = planMemoryJoinAnchorCount(plan);
  const corpusAnchorCount = planCorpusAnchorCount(plan);
  const failingQueryCanaryCount = plan.queryCanaries.filter((row) => !row.passed).length;
  return {
    routeId: plan.routeId,
    title: plan.title,
    matchStrength: plan.matchStrength,
    sourceAnchorCount: plan.sourceAnchors.length,
    foundSourceAnchorCount,
    memoryAnchorCount,
    memoryRecordCount: plan.memoryRecords.length,
    corpusAnchorCount,
    fixtureSeedCount: plan.fixtureSeeds.length,
    expectedEffectCount: plan.expectedEffects.length,
    queryCanaryCount: plan.queryCanaries.length,
    failingQueryCanaryCount,
    issues,
    summary: issues.length === 0
      ? `${plan.title} has live source anchors and no route-health warnings.`
      : `${plan.title} has ${issues.length} route-health warning(s).`,
  };
}

function routeHealthIssues(
  plan: AtlasWorkRoutePlanRow,
): readonly AtlasWorkRouteHealthIssue[] {
  const issues: AtlasWorkRouteHealthIssue[] = [];
  for (const sourceAnchor of plan.sourceAnchors) {
    if (!sourceAnchor.found) {
      issues.push({
        kind: "missing-source-anchor",
        severity: "warning",
        summary:
          `${plan.routeId} source anchor ${sourceAnchor.anchor.filePath}${sourceAnchor.anchor.symbolName === undefined ? "" : `#${sourceAnchor.anchor.symbolName}`} did not match the live source project.`,
      });
    }
  }
  if (planMemoryJoinAnchorCount(plan) > 0 && plan.memoryRecords.length === 0) {
    issues.push({
      kind: "empty-memory-join",
      severity: "warning",
      summary:
        `${plan.routeId} declares memory-join anchors but joins no durable memory records.`,
    });
  }
  if (planFixtureSeedAnchorCount(plan) > 0 && plan.fixtureSeeds.length === 0) {
    issues.push({
      kind: "empty-fixture-seed-join",
      severity: "warning",
      summary:
        `${plan.routeId} declares fixture seed anchors but joins no framework corpus fixture seeds.`,
    });
  }
  if (planExpectedEffectAnchorCount(plan) > 0 && plan.expectedEffects.length === 0) {
    issues.push({
      kind: "empty-expected-effect-join",
      severity: "warning",
      summary:
        `${plan.routeId} declares expected-effect anchors but joins no expected-effect descriptors.`,
    });
  }
  for (const canary of plan.queryCanaries) {
    if (!canary.passed) {
      issues.push({
        kind: "query-canary-miss",
        severity: "warning",
        summary: canary.summary,
      });
    }
  }
  if (plan.nextQuestions.length === 0) {
    issues.push({
      kind: "missing-next-question",
      severity: "warning",
      summary: `${plan.routeId} has no declared next question.`,
    });
  }
  return issues;
}

function planMemoryJoinAnchorCount(plan: AtlasWorkRoutePlanRow): number {
  return routeById(plan.routeId).anchors.filter((anchor) => {
    switch (anchor.kind) {
      case "source":
      case "lens":
      case "script":
      case "doc":
      case "path":
      case "auLink":
      case "memory":
        return true;
      case "framework-corpus":
        return false;
    }
  }).length;
}

function planCorpusAnchorCount(plan: AtlasWorkRoutePlanRow): number {
  return routeById(plan.routeId).anchors.filter((anchor) =>
    anchor.kind === "framework-corpus",
  ).length;
}

function planFixtureSeedAnchorCount(plan: AtlasWorkRoutePlanRow): number {
  return routeById(plan.routeId).anchors.filter((anchor) =>
    anchor.kind === "framework-corpus" && anchor.projection === "fixture-seeds",
  ).length;
}

function planExpectedEffectAnchorCount(plan: AtlasWorkRoutePlanRow): number {
  return routeById(plan.routeId).anchors.filter((anchor) =>
    anchor.kind === "framework-corpus" &&
    (anchor.projection === "expected-effects" || anchor.effectKind !== undefined),
  ).length;
}

function routeById(routeId: string): AtlasWorkRoute {
  const route = ATLAS_WORK_ROUTES.find((entry) => entry.id === routeId);
  if (route === undefined) {
    throw new Error(`Unknown Atlas work route ${routeId}.`);
  }
  return route;
}

function sourcePlan(
  anchor: AtlasWorkRouteSourceAnchor,
  state: RouterState,
): AtlasWorkRouteSourcePlanRow {
  const { product, atlasSelf, sourceProject } = state;
  const admittedSourceFileFound = sourceProject.readSourceFile(anchor.filePath) !== null;
  const admittedSourceDeclarations = admittedSourceDeclarationMatches(
    anchor,
    sourceProject.declarationRows(),
  ).slice(0, 8);
  const modules = product.modules.filter((module) =>
    sourcePathMatches(module.filePath, anchor.filePath),
  );
  const declarations = product.declarations.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  const classSurfaces = product.classSurfaces.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  const functionSurfaces = product.functionSurfaces.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName || row.className === anchor.symbolName),
  );
  const atlasSourceFiles = atlasSelf.sourceFileSurfaces.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath),
  );
  const atlasClassSurfaces = atlasSelf.classSurfaces.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  const atlasFunctionSurfaces = atlasSelf.functionSurfaces.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  const atlasVariableSurfaces = atlasSelf.variableSurfaces.filter((row) =>
    sourcePathMatches(row.filePath, anchor.filePath) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  const found =
    admittedSourceDeclarations.length > 0 ||
    (anchor.symbolName === undefined && admittedSourceFileFound) ||
    classSurfaces.length > 0 ||
    functionSurfaces.length > 0 ||
    declarations.length > 0 ||
    (anchor.symbolName === undefined && modules.length > 0) ||
    atlasClassSurfaces.length > 0 ||
    atlasFunctionSurfaces.length > 0 ||
    atlasVariableSurfaces.length > 0 ||
    (anchor.symbolName === undefined && atlasSourceFiles.length > 0);
  return {
    anchor,
    found,
    admittedSourceFileFound,
    admittedSourceDeclarations,
    classSurfaces: classSurfaces.slice(0, 8),
    declarations: declarations.slice(0, 8),
    functionSurfaces: functionSurfaces.slice(0, 8),
    modules: modules.slice(0, 4),
    atlasClassSurfaces: atlasClassSurfaces.slice(0, 8),
    atlasFunctionSurfaces: atlasFunctionSurfaces.slice(0, 8),
    atlasVariableSurfaces: atlasVariableSurfaces.slice(0, 8),
    atlasSourceFiles: atlasSourceFiles.slice(0, 4),
    summary: found
      ? `Found ${admittedSourceFileFound ? 1 : 0} admitted source file, ${admittedSourceDeclarations.length} admitted declaration row(s), ${classSurfaces.length} semantic-runtime class surface(s), ${functionSurfaces.length} semantic-runtime function surface(s), ${declarations.length} semantic-runtime declaration row(s), ${modules.length} semantic-runtime module row(s), ${atlasClassSurfaces.length} Atlas class surface(s), ${atlasFunctionSurfaces.length} Atlas function surface(s), ${atlasVariableSurfaces.length} Atlas variable surface(s), and ${atlasSourceFiles.length} Atlas source-file row(s) for ${anchor.filePath}.`
      : `No current admitted source match for ${anchor.filePath}${anchor.symbolName === undefined ? "" : `#${anchor.symbolName}`}.`,
  };
}

function admittedSourceDeclarationMatches(
  anchor: AtlasWorkRouteSourceAnchor,
  declarations: readonly SourceDeclarationRow[],
): AtlasWorkRouteSourcePlanRow["admittedSourceDeclarations"] {
  return declarations
    .filter((row) =>
      sourcePathMatches(row.file.repoPath, anchor.filePath) &&
      (anchor.symbolName === undefined || row.name === anchor.symbolName)
    )
    .map((row) => ({
      kind: row.kind,
      name: row.name,
      packageId: row.file.packageId,
      filePath: row.file.repoPath,
      exported: row.exported,
      source: sourceRangeFromFileSpan(row.file.repoPath, row.span),
      summary:
        `${row.name ?? "<anonymous>"} ${row.kind} declaration in ${row.file.repoPath}.`,
    }));
}

function routeWorksetRow(
  route: AtlasWorkRoute,
  state: RouterState,
  files: readonly WorktreeFile[],
  fileSampleLimit: number,
): AtlasWorkRouteWorksetRow | null {
  const sourceAnchors = route.anchors.filter((anchor): anchor is AtlasWorkRouteSourceAnchor =>
    anchor.kind === "source",
  );
  const docAnchors = route.anchors.filter((anchor): anchor is AtlasWorkRouteDocAnchor =>
    anchor.kind === "doc",
  );
  const pathAnchors = route.anchors.filter((anchor): anchor is AtlasWorkRoutePathAnchor =>
    anchor.kind === "path",
  );
  const memoryRecords = matchingMemoryRecords(state.memoryRecords, route.anchors);
  const changedFiles = files.flatMap((file) => {
    const matchKinds = worksetFileMatchKinds(file, sourceAnchors, docAnchors, pathAnchors, memoryRecords);
    return matchKinds.length === 0
      ? []
      : [{
          status: file.status,
          filePath: file.filePath,
          matchKinds,
        }];
  });
  if (changedFiles.length === 0) {
    return null;
  }
  const matchedAnchorCount = sourceAnchors.filter((anchor) =>
    files.some((file) => sourcePathMatches(anchor.filePath, file.filePath)),
  ).length + docAnchors.filter((anchor) =>
    files.some((file) => sourcePathMatches(anchor.path, file.filePath)),
  ).length + pathAnchors.filter((anchor) =>
    files.some((file) => sourcePathMatches(anchor.pathPrefix, file.filePath)),
  ).length;
  const matchedMemoryShardCount = new Set(
    memoryRecords
      .filter((record) => files.some((file) => file.filePath === record.shardPath))
      .map((record) => record.shardPath),
  ).size;
  const matchedMemoryAnchorCount = memoryRecordAnchorPathCount(memoryRecords, files);
  return {
    routeId: route.id,
    title: route.title,
    changedFileCount: changedFiles.length,
    changedFiles: changedFiles.slice(0, fileSampleLimit),
    matchedAnchorCount,
    matchedMemoryAnchorCount,
    matchedMemoryShardCount,
    summary:
      `${route.title} matches ${changedFiles.length} changed file(s), ${matchedAnchorCount} route anchor(s), ${matchedMemoryAnchorCount} memory anchor(s), and ${matchedMemoryShardCount} memory shard(s) in the current worktree.`,
  };
}

function worksetFileSampleLimit(inquiry: Inquiry): number {
  const requested = inquiryNumberFilter(inquiry, "worksetFileRows");
  if (requested === undefined) {
    return 24;
  }
  return Math.min(200, Math.max(0, Math.floor(requested)));
}

function worksetFileMatchKinds(
  file: WorktreeFile,
  sourceAnchors: readonly AtlasWorkRouteSourceAnchor[],
  docAnchors: readonly AtlasWorkRouteDocAnchor[],
  pathAnchors: readonly AtlasWorkRoutePathAnchor[],
  memoryRecords: readonly AtlasMemoryRecordRow[],
): readonly string[] {
  const kinds: string[] = [];
  if (sourceAnchors.some((anchor) => sourcePathMatches(anchor.filePath, file.filePath))) {
    kinds.push("source-anchor");
  }
  if (docAnchors.some((anchor) => sourcePathMatches(anchor.path, file.filePath))) {
    kinds.push("doc-anchor");
  }
  if (pathAnchors.some((anchor) => sourcePathMatches(anchor.pathPrefix, file.filePath))) {
    kinds.push("path-anchor");
  }
  if (memoryRecords.some((record) => record.shardPath === file.filePath)) {
    kinds.push("memory-shard");
  }
  const memoryAnchorKinds = new Set<string>();
  for (const record of memoryRecords) {
    for (const kind of memoryRecordFileMatchKinds(record, file.filePath)) {
      memoryAnchorKinds.add(kind);
    }
  }
  kinds.push(...memoryAnchorKinds);
  return kinds;
}

function memoryRecordAnchorPathCount(
  memoryRecords: readonly AtlasMemoryRecordRow[],
  files: readonly WorktreeFile[],
): number {
  const matches = new Set<string>();
  for (const record of memoryRecords) {
    for (const file of files) {
      for (const kind of memoryRecordFileMatchKinds(record, file.filePath)) {
        matches.add(`${kind}:${file.filePath}`);
      }
    }
  }
  return matches.size;
}

function memoryRecordFileMatchKinds(
  record: AtlasMemoryRecordRow,
  filePath: string,
): readonly string[] {
  const kinds: string[] = [];
  for (const anchor of record.record.anchors ?? []) {
    switch (anchor.kind) {
      case "source":
        if (sourcePathMatches(anchor.filePath, filePath)) {
          kinds.push("memory-source-anchor");
        }
        break;
      case "doc":
        if (sourcePathMatches(anchor.path, filePath)) {
          kinds.push("memory-doc-anchor");
        }
        break;
      case "fixture":
        if (sourcePathMatches(anchor.path, filePath)) {
          kinds.push("memory-fixture-anchor");
        }
        break;
      case "lens":
      case "script":
      case "auLink":
        break;
    }
  }
  for (const check of record.record.liveChecks ?? []) {
    if ("filePath" in check && check.filePath !== undefined && sourcePathMatches(check.filePath, filePath)) {
      kinds.push("memory-live-check");
    }
  }
  return kinds;
}

function routePlanForWorksetRow(
  row: AtlasWorkRouteWorksetRow,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  filters: AtlasWorkRouterFilters,
): AtlasWorkRoutePlanRow {
  const scored = scoredRouteForWorksetRow(row, scoredRoutes);
  return routePlan(scored, state, filters);
}

function routePlansForWorksetRows(
  rows: readonly AtlasWorkRouteWorksetRow[],
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  filters: AtlasWorkRouterFilters,
): readonly AtlasWorkRoutePlanRow[] {
  return rows.map((row) => routePlanForWorksetRow(row, scoredRoutes, state, filters));
}

function scoredRoutesForWorksetRows(
  rows: readonly AtlasWorkRouteWorksetRow[],
  scoredRoutes: readonly ScoredRoute[],
): readonly ScoredRoute[] {
  return rows.map((row) => scoredRouteForWorksetRow(row, scoredRoutes));
}

function scoredRouteForWorksetRow(
  row: AtlasWorkRouteWorksetRow,
  scoredRoutes: readonly ScoredRoute[],
): ScoredRoute {
  const scored = scoredRoutes.find((entry) => entry.route.id === row.routeId);
  if (scored === undefined) {
    throw new Error(`Workset row references missing route '${row.routeId}'.`);
  }
  return {
    route: scored.route,
    row: {
      ...scored.row,
      matchScore: routeWorksetMatchScore(row),
      matchStrength: "workset-structural",
      matchedBy: routeWorksetMatchedBy(row),
    },
  };
}

function routeWorksetMatchScore(row: AtlasWorkRouteWorksetRow): number {
  return 2_000 +
    row.matchedAnchorCount * 300 +
    row.matchedMemoryShardCount * 120 +
    row.matchedMemoryAnchorCount * 40 +
    row.changedFileCount;
}

function routeWorksetMatchedBy(row: AtlasWorkRouteWorksetRow): readonly string[] {
  const matchedBy = [`current workset matched ${row.changedFileCount} changed file(s)`];
  if (row.matchedAnchorCount > 0) {
    matchedBy.push(`${row.matchedAnchorCount} route anchor(s) matched changed files`);
  }
  if (row.matchedMemoryAnchorCount > 0) {
    matchedBy.push(`${row.matchedMemoryAnchorCount} memory anchor(s) matched changed files`);
  }
  if (row.matchedMemoryShardCount > 0) {
    matchedBy.push(`${row.matchedMemoryShardCount} memory shard(s) changed`);
  }
  return matchedBy;
}

function routePlansForMemoryCoverageRows(
  rows: readonly AtlasWorkRouteMemoryCoverageRow[],
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  filters: AtlasWorkRouterFilters,
): readonly AtlasWorkRoutePlanRow[] {
  const routeIds: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const match of row.routeMatches) {
      if (!seen.has(match.routeId)) {
        seen.add(match.routeId);
        routeIds.push(match.routeId);
      }
    }
  }
  return routeIds.map((routeId) =>
    routePlanForRouteId(routeId, scoredRoutes, state, filters)
  );
}

function routePlanForRouteId(
  routeId: string,
  scoredRoutes: readonly ScoredRoute[],
  state: RouterState,
  filters: AtlasWorkRouterFilters,
): AtlasWorkRoutePlanRow {
  const scored = scoredRoutes.find((entry) => entry.route.id === routeId);
  if (scored === undefined) {
    throw new Error(`Route row references missing route '${routeId}'.`);
  }
  return routePlan(scored, state, filters);
}

function readWorktreeFiles(repoRoot: string): readonly WorktreeFile[] {
  let output = "";
  try {
    output = execFileSync(
      "git",
      ["-C", repoRoot, "status", "--porcelain=v1", "-z", "--untracked-files=all"],
      {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  } catch {
    return [];
  }
  return parsePorcelainStatus(output);
}

function parsePorcelainStatus(output: string): readonly WorktreeFile[] {
  const entries = output.split("\0").filter((entry) => entry.length > 0);
  const files: WorktreeFile[] = [];
  for (let i = 0; i < entries.length; ++i) {
    const entry = entries[i]!;
    if (entry.length < 4) {
      continue;
    }
    const status = entry.slice(0, 2);
    let filePath = normalizeWorktreePath(entry.slice(3));
    if (isRenameOrCopyStatus(status) && entries[i + 1] !== undefined) {
      filePath = normalizeWorktreePath(entries[++i]!);
    }
    files.push({ status, filePath });
  }
  return files;
}

function isRenameOrCopyStatus(status: string): boolean {
  return status.includes("R") || status.includes("C");
}

function normalizeWorktreePath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function matchingMemoryRecords(
  rows: readonly AtlasMemoryRecordRow[],
  anchors: readonly AtlasWorkRouteAnchor[],
  query?: string,
): readonly AtlasMemoryRecordRow[] {
  if (anchors.length === 0) {
    return [];
  }
  return rows
    .map((row) => ({
      row,
      score: Math.max(
        0,
        ...anchors.map((anchor) => memoryRecordRouteAnchorScore(row, anchor)),
      ),
      queryScore: memoryRecordQueryScore(row, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => compareMemoryRecordRouteMatches(left, right, query))
    .map((entry) => entry.row);
}

function matchingMemoryNextActions(
  rows: readonly AtlasMemoryNextActionRow[],
  anchors: readonly AtlasWorkRouteAnchor[],
  query?: string,
): readonly AtlasMemoryNextActionRow[] {
  if (anchors.length === 0) {
    return [];
  }
  return rows
    .map((row) => ({
      row,
      score: Math.max(
        0,
        ...anchors.map((anchor) => memoryNextActionRouteAnchorScore(row, anchor)),
      ),
      queryScore: memoryNextActionQueryScore(row, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => compareMemoryNextActionRouteMatches(left, right, query))
    .map((entry) => entry.row);
}

function compareMemoryRecordRouteMatches(
  left: {
    readonly row: AtlasMemoryRecordRow;
    readonly score: number;
    readonly queryScore: number;
  },
  right: {
    readonly row: AtlasMemoryRecordRow;
    readonly score: number;
    readonly queryScore: number;
  },
  query: string | undefined,
): number {
  const queryFirst = hasQueryText(query);
  const priorityDelta =
    memoryRecordRoutePriority(right.row) - memoryRecordRoutePriority(left.row);
  return queryFirst
    ? right.queryScore - left.queryScore ||
      right.score - left.score ||
      priorityDelta ||
      left.row.id.localeCompare(right.row.id)
    : right.score - left.score ||
      priorityDelta ||
      left.row.id.localeCompare(right.row.id);
}

function compareMemoryNextActionRouteMatches(
  left: {
    readonly row: AtlasMemoryNextActionRow;
    readonly score: number;
    readonly queryScore: number;
  },
  right: {
    readonly row: AtlasMemoryNextActionRow;
    readonly score: number;
    readonly queryScore: number;
  },
  query: string | undefined,
): number {
  const queryFirst = hasQueryText(query);
  return queryFirst
    ? right.queryScore - left.queryScore ||
      right.score - left.score ||
      right.row.rank - left.row.rank ||
      left.row.id.localeCompare(right.row.id)
    : right.score - left.score ||
      right.row.rank - left.row.rank ||
      left.row.id.localeCompare(right.row.id);
}

function hasQueryText(query: string | undefined): boolean {
  return query !== undefined && query.trim().length > 0;
}

function memoryNextActionQueryScore(
  row: AtlasMemoryNextActionRow,
  query: string | undefined,
): number {
  const directScore = queryRelevanceScore(query, [
    {
      weight: 6,
      values: [row.id, row.summary, row.rationale],
    },
    {
      weight: 3,
      values: [...row.domains],
    },
    {
      weight: 4,
      values: [
        row.frontier?.className,
        row.frontier?.filePath,
        row.frontier?.area,
        row.sampleFrontier?.className,
        row.sampleFrontier?.filePath,
        row.sampleFrontier?.area,
      ].filter(isDefinedMemorySearchValue),
    },
  ]);
  return row.record === undefined
    ? directScore
    : directScore + memoryRecordQueryScore(row.record, query) * 0.75;
}

function memoryRecordQueryScore(
  row: AtlasMemoryRecordRow,
  query: string | undefined,
): number {
  return queryRelevanceScore(query, [
    {
      weight: 6,
      values: [row.id, row.record.summary, row.summary],
    },
    {
      weight: 4,
      values: [
        row.record.rationale,
        ...(row.record.guidance ?? []),
      ].filter(isDefinedMemorySearchValue),
    },
    {
      weight: 3,
      values: [...row.domains],
    },
    {
      weight: 3,
      values: (row.record.anchors ?? []).flatMap(atlasMemoryAnchorQueryValues),
    },
    {
      weight: 2,
      values: (row.record.liveChecks ?? []).flatMap(memoryLiveCheckQueryValues),
    },
  ]);
}

function memoryLiveCheckQueryValues(check: AtlasMemoryLiveCheck): readonly string[] {
  switch (check.kind) {
    case "product-large-class":
      return [check.className, check.filePath].filter(isDefinedMemorySearchValue);
    case "source-file-exists":
      return [check.filePath];
    case "source-declaration-exists":
      return [check.filePath, check.symbolName];
    case "atlas-self-source-file":
      return [check.filePath, check.moduleShape].filter(isDefinedMemorySearchValue);
    case "atlas-self-class":
      return [check.className, check.filePath].filter(isDefinedMemorySearchValue);
    case "atlas-self-function":
      return [check.functionName, check.filePath].filter(isDefinedMemorySearchValue);
    case "atlas-self-variable":
      return [
        check.variableName,
        check.filePath,
        check.initializerKind,
      ].filter(isDefinedMemorySearchValue);
    case "auLink-exists":
      return [check.linkId, check.symbolName, check.filePath].filter(isDefinedMemorySearchValue);
  }
}

function memoryNextActionMatchesFilters(
  row: AtlasMemoryNextActionRow,
  filters: AtlasWorkRouterFilters,
): boolean {
  if (
    hasQueryText(filters.query) &&
    memoryNextActionQueryScore(row, filters.query) === 0
  ) {
    return false;
  }
  if (filters.domains.length === 0) {
    return true;
  }
  const matches = filters.domains.filter((domain) => row.domains.includes(domain)).length;
  return filters.domainMode === "all"
    ? matches === filters.domains.length
    : matches > 0;
}

function memoryCoverageRow(
  row: AtlasMemoryNextActionRow,
  scoredRoutes: readonly ScoredRoute[],
): AtlasWorkRouteMemoryCoverageRow {
  const routeMatches = scoredRoutes
    .map((entry) => {
      return {
        routeId: entry.route.id,
        title: entry.route.title,
        score: memoryNextActionRouteScore(row, entry.route),
      };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.routeId.localeCompare(right.routeId),
    );
  const routeSummary = routeMatches.length === 0
    ? "unrouted"
    : routeMatches.slice(0, 3).map((match) => `${match.routeId}:${match.score}`).join(", ");
  return {
    id: row.id,
    kind: row.kind,
    recordId: row.record?.id,
    status: row.status,
    rank: row.rank,
    domains: row.domains,
    routed: routeMatches.length > 0,
    routeMatches,
    actionSummary: row.summary,
    summary:
      `${row.id}: ${routeMatches.length} route match(es); ${routeSummary}.`,
  };
}

function memoryNextActionAnchorScore(
  row: AtlasMemoryNextActionRow,
  anchor: AtlasWorkRouteMemoryAnchor,
): number {
  if (row.record !== undefined) {
    return memoryRecordAnchorScore(row.record, anchor);
  }
  return routeMemoryDomainScore(row.domains, anchor.domains);
}

function memoryNextActionRouteScore(
  row: AtlasMemoryNextActionRow,
  route: AtlasWorkRoute,
): number {
  return Math.max(
    0,
    ...route.anchors.map((anchor) => memoryNextActionRouteAnchorScore(row, anchor)),
  );
}

function memoryNextActionRouteAnchorScore(
  row: AtlasMemoryNextActionRow,
  anchor: AtlasWorkRouteAnchor,
): number {
  if (row.record !== undefined) {
    return memoryRecordRouteAnchorScore(row.record, anchor);
  }
  switch (anchor.kind) {
    case "memory": {
      const score = routeMemoryDomainScore(row.domains, anchor.domains);
      return score === 0 ? 0 : score + routeAnchorRoleScore(anchor.role);
    }
    case "source":
      return memoryFrontierMatchesSourceAnchor(row.frontier, anchor) ||
          memoryFrontierMatchesSourceAnchor(row.sampleFrontier, anchor)
        ? 40 + routeAnchorRoleScore(anchor.role)
        : 0;
    case "path":
      return 0;
    case "lens":
    case "auLink":
    case "script":
    case "doc":
    case "framework-corpus":
      return 0;
  }
}

function routeAnchorRoleScore(role: AtlasWorkRouteAnchor["role"]): number {
  switch (role) {
    case "primary":
      return 14;
    case "grounding":
      return 10;
    case "pressure":
      return 8;
    case "supporting":
      return 5;
    case "caution":
      return 2;
  }
}

function memoryFrontierMatchesSourceAnchor(
  frontier: AtlasMemoryNextActionRow["frontier"] | AtlasMemoryNextActionRow["sampleFrontier"],
  anchor: AtlasWorkRouteSourceAnchor,
): boolean {
  if (frontier === undefined) {
    return false;
  }
  return sourcePathMatches(anchor.filePath, frontier.filePath) &&
    (anchor.symbolName === undefined || anchor.symbolName === frontier.className);
}

function memoryFrontierMatchesPath(
  frontier: AtlasMemoryNextActionRow["frontier"] | AtlasMemoryNextActionRow["sampleFrontier"],
  pathPrefix: string,
): boolean {
  return frontier !== undefined && sourcePathMatches(pathPrefix, frontier.filePath);
}

function memoryRecordMatchesSourceAnchor(
  row: AtlasMemoryRecordRow,
  anchor: AtlasWorkRouteSourceAnchor,
): boolean {
  return (row.record.anchors ?? []).some((memoryAnchor) =>
    memoryAnchor.kind === "source" &&
    sourcePathMatches(anchor.filePath, memoryAnchor.filePath) &&
    (
      anchor.symbolName === undefined ||
      memoryAnchor.symbolName === undefined ||
      anchor.symbolName === memoryAnchor.symbolName
    )
  ) ||
    (row.record.liveChecks ?? []).some((check) =>
      memoryLiveCheckMatchesSourceAnchor(check, anchor)
    );
}

function memoryRecordMatchesPath(
  row: AtlasMemoryRecordRow,
  pathPrefix: string,
): boolean {
  return (row.record.anchors ?? []).some((memoryAnchor) =>
    "filePath" in memoryAnchor
      ? sourcePathMatches(pathPrefix, memoryAnchor.filePath)
      : "path" in memoryAnchor
        ? sourcePathMatches(pathPrefix, memoryAnchor.path)
        : false
  ) ||
    (row.record.liveChecks ?? []).some((check) =>
      "filePath" in check && check.filePath !== undefined && sourcePathMatches(pathPrefix, check.filePath)
    );
}

function memoryRecordMatchesLensAnchor(
  row: AtlasMemoryRecordRow,
  anchor: AtlasWorkRouteLensAnchor,
): boolean {
  if (!lensAnchorHasStructuralFilters(anchor)) {
    return false;
  }
  return (row.record.anchors ?? []).some((memoryAnchor) =>
    memoryAnchor.kind === "lens" &&
    memoryAnchor.lensId === anchor.lensId &&
    (
      anchor.projection === undefined ||
      memoryAnchor.projection === anchor.projection
    ) &&
    lensAnchorFiltersMatch(anchor.filters, memoryAnchor.filters)
  );
}

function lensAnchorHasStructuralFilters(anchor: AtlasWorkRouteLensAnchor): boolean {
  return anchor.filters !== undefined && Object.keys(anchor.filters).length > 0;
}

function lensAnchorFiltersMatch(
  expected: Readonly<Record<string, unknown>> | undefined,
  actual: Readonly<Record<string, unknown>> | undefined,
): boolean {
  if (expected === undefined || Object.keys(expected).length === 0) {
    return false;
  }
  if (actual === undefined) {
    return false;
  }
  return Object.entries(expected).every(([key, value]) =>
    lensFilterValueEquals(value, actual[key])
  );
}

function lensFilterValueEquals(
  left: unknown,
  right: unknown,
): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) =>
        lensFilterValueEquals(entry, right[index])
      );
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftRecord = left as Readonly<Record<string, unknown>>;
    const rightRecord = right as Readonly<Record<string, unknown>>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    return leftKeys.length === rightKeys.length &&
      leftKeys.every((key) =>
        lensFilterValueEquals(leftRecord[key], rightRecord[key])
      );
  }
  return left === right;
}

function memoryRecordMatchesScriptAnchor(
  row: AtlasMemoryRecordRow,
  anchor: AtlasWorkRouteScriptAnchor,
): boolean {
  return (row.record.anchors ?? []).some((memoryAnchor) =>
    memoryAnchor.kind === "script" && memoryAnchor.command === anchor.command,
  );
}

function memoryRecordMatchesDocAnchor(
  row: AtlasMemoryRecordRow,
  anchor: AtlasWorkRouteDocAnchor,
): boolean {
  return (row.record.anchors ?? []).some((memoryAnchor) =>
    memoryAnchor.kind === "doc" &&
    sourcePathMatches(anchor.path, memoryAnchor.path) &&
    (
      anchor.heading === undefined ||
      memoryAnchor.heading === undefined ||
      memoryAnchor.heading === anchor.heading
    )
  );
}

function memoryLiveCheckMatchesSourceAnchor(
  check: AtlasMemoryLiveCheck,
  anchor: AtlasWorkRouteSourceAnchor,
): boolean {
  if (!("filePath" in check) || check.filePath === undefined || !sourcePathMatches(anchor.filePath, check.filePath)) {
    return false;
  }
  return anchor.symbolName === undefined ||
    ("symbolName" in check && check.symbolName === anchor.symbolName) ||
    ("className" in check && check.className === anchor.symbolName) ||
    ("functionName" in check && check.functionName === anchor.symbolName) ||
    ("variableName" in check && check.variableName === anchor.symbolName);
}

function memoryRecordRouteAnchorScore(
  row: AtlasMemoryRecordRow,
  anchor: AtlasWorkRouteAnchor,
): number {
  switch (anchor.kind) {
    case "memory": {
      const score = memoryRecordAnchorScore(row, anchor);
      return score === 0 ? 0 : score + routeAnchorRoleScore(anchor.role);
    }
    case "source":
      return memoryRecordMatchesSourceAnchor(row, anchor)
        ? 40 + routeAnchorRoleScore(anchor.role)
        : 0;
    case "path":
      return 0;
    case "lens":
      return memoryRecordMatchesLensAnchor(row, anchor)
        ? 28 + routeAnchorRoleScore(anchor.role)
        : 0;
    case "auLink":
      return atlasMemoryRecordRowHasAuLink(row, anchor.linkId)
        ? 32 + routeAnchorRoleScore(anchor.role)
        : 0;
    case "script":
      return memoryRecordMatchesScriptAnchor(row, anchor)
        ? 22 + routeAnchorRoleScore(anchor.role)
        : 0;
    case "doc":
      return memoryRecordMatchesDocAnchor(row, anchor)
        ? 16 + routeAnchorRoleScore(anchor.role)
        : 0;
    case "framework-corpus":
      return 0;
  }
}

function memoryRecordAnchorScore(
  row: AtlasMemoryRecordRow,
  anchor: AtlasWorkRouteMemoryAnchor,
): number {
  const domainScore = routeMemoryDomainScore(row.domains, anchor.domains);
  const lensScore = anchor.anchorLensId !== undefined &&
    atlasMemoryRecordRowHasLens(row, anchor.anchorLensId)
    ? 12
    : 0;
  const symbolScore = anchor.symbolName !== undefined &&
    atlasMemoryRecordRowHasSymbol(row, anchor.symbolName)
    ? 10
    : 0;
  const auLinkScore = anchor.auLinkId !== undefined &&
    atlasMemoryRecordRowHasAuLink(row, anchor.auLinkId)
    ? 10
    : 0;
  return domainScore + lensScore + symbolScore + auLinkScore;
}

function routeMemoryDomainScore(
  rowDomains: readonly string[],
  anchorDomains: readonly string[],
): number {
  const exactDomainMatches = rowDomains.filter((domain) =>
    anchorDomains.includes(domain),
  ).length;
  if (exactDomainMatches === anchorDomains.length) {
    return exactDomainMatches * 3 + 4;
  }
  const specificMatches = rowDomains.filter((domain) =>
    anchorDomains.includes(domain) && !isGenericRouteMemoryDomain(domain),
  ).length;
  return specificMatches >= 2 ? specificMatches * 3 : 0;
}

function isGenericRouteMemoryDomain(domain: string): boolean {
  switch (domain) {
    case "semantic-runtime":
    case "atlas":
    case "template":
    case "memory":
    case "inquiry":
    case "analysis-substrate":
      return true;
    default:
      return false;
  }
}

function memoryRecordRoutePriority(row: AtlasMemoryRecordRow): number {
  switch (row.kind) {
    case "pressure-frontier":
      return row.status === "active" ? 50 : 40;
    case "reuse-guide":
      return 35;
    case "intentional-shape":
      return 30;
    case "decision":
      return 20;
    case "doc-shard":
      return 10;
  }
}

function matchingFixtureSeeds(
  rows: readonly FrameworkCorpusFixtureSeedRow[],
  anchors: readonly AtlasWorkRouteCorpusAnchor[],
  filters: AtlasWorkRouterFilters,
): readonly FrameworkCorpusFixtureSeedRow[] {
  if (anchors.length === 0) {
    return [];
  }
  const routeFilteredRows = rows.filter((row) =>
    fixtureSeedMatchesRouteFilters(row, filters),
  );
  const globalRanked = routeFilteredRows
    .map((row) => ({
      row,
      score: Math.max(
        0,
        ...anchors.map((anchor) => fixtureSeedAnchorScore(row, anchor)),
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) =>
      right.score - left.score || left.row.id.localeCompare(right.row.id),
    );
  const selected: FrameworkCorpusFixtureSeedRow[] = [];
  const selectedIds = new Set<string>();
  for (const anchor of [...anchors].sort(compareCorpusAnchorSpecificity)) {
    const anchorRows = routeFilteredRows
      .map((row) => ({ row, score: fixtureSeedAnchorScore(row, anchor) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) =>
        right.score - left.score || left.row.id.localeCompare(right.row.id),
      );
    for (const entry of anchorRows.slice(0, 2)) {
      if (!selectedIds.has(entry.row.id)) {
        selected.push(entry.row);
        selectedIds.add(entry.row.id);
      }
    }
  }
  for (const entry of globalRanked) {
    if (!selectedIds.has(entry.row.id)) {
      selected.push(entry.row);
      selectedIds.add(entry.row.id);
    }
  }
  return selected;
}

function compareCorpusAnchorSpecificity(
  left: AtlasWorkRouteCorpusAnchor,
  right: AtlasWorkRouteCorpusAnchor,
): number {
  return corpusAnchorSpecificityScore(right) - corpusAnchorSpecificityScore(left);
}

function corpusAnchorSpecificityScore(anchor: AtlasWorkRouteCorpusAnchor): number {
  return (anchor.classificationKey === undefined ? 0 : 40) +
    (anchor.classificationKind === undefined ? 0 : 20) +
    (anchor.expectedEffectFilterField === undefined ? 0 : 18) +
    (anchor.effectKind === undefined ? 0 : 12) +
    (anchor.appPatternKey === undefined ? 0 : 10) +
    (anchor.query === undefined ? 0 : 8) +
    (anchor.seedUse === undefined ? 0 : 4) +
    (anchor.concept === undefined ? 0 : 2);
}

function fixtureSeedMatchesRouteFilters(
  row: FrameworkCorpusFixtureSeedRow,
  filters: AtlasWorkRouterFilters,
): boolean {
  return (
    (filters.concept === undefined || row.concepts.includes(filters.concept as never)) &&
    (filters.effectKind === undefined || row.effectHints.includes(filters.effectKind as never)) &&
    frameworkCorpusFixtureSeedMatchesAppPatternFilter(row, filters.appPatternKey) &&
    (filters.seedUse === undefined || row.seedUse === filters.seedUse)
  );
}

function fixtureSeedAnchorScore(
  row: FrameworkCorpusFixtureSeedRow,
  anchor: AtlasWorkRouteCorpusAnchor,
): number {
  if (
    anchor.projection !== "fixture-seeds" &&
    anchor.projection !== "doc-snippets" &&
    anchor.projection !== "test-snippets"
  ) {
    return 0;
  }
  if (
    anchor.concept !== undefined &&
    !row.concepts.includes(anchor.concept as never)
  ) {
    return 0;
  }
  if (
    anchor.effectKind !== undefined &&
    !row.effectHints.includes(anchor.effectKind as never)
  ) {
    return 0;
  }
  if (
    anchor.appPatternKey !== undefined &&
    !frameworkCorpusFixtureSeedMatchesAppPatternFilter(row, anchor.appPatternKey)
  ) {
    return 0;
  }
  if (!frameworkCorpusFixtureSeedMatchesClassification(row, anchor)) {
    return 0;
  }
  if (!fixtureSeedMatchesExpectedEffectFilterAnchor(row, anchor)) {
    return 0;
  }
  if (
    anchor.seedUse !== undefined &&
    row.seedUse !== anchor.seedUse
  ) {
    return 0;
  }
  const queryScore = frameworkCorpusFixtureSeedQueryScore(row, anchor.query);
  if (anchor.query !== undefined && queryScore === 0) {
    return 0;
  }
  return (
    (anchor.effectKind === undefined ? 0 : 10) +
    (anchor.appPatternKey === undefined ? 0 : 4 + frameworkCorpusFixtureSeedAppPatternFilterScore(row, anchor.appPatternKey) * 4) +
    (anchor.classificationKey === undefined ? 0 : 9) +
    (anchor.classificationKind === undefined ? 0 : 5) +
    (anchor.expectedEffectFilterField === undefined ? 0 : 6) +
    (anchor.seedUse === undefined ? 0 : 4) +
    (anchor.concept === undefined ? 0 : 3) +
    queryScore +
    1
  );
}

function fixtureSeedMatchesExpectedEffectFilterAnchor(
  row: FrameworkCorpusFixtureSeedRow,
  anchor: AtlasWorkRouteCorpusAnchor,
): boolean {
  if (anchor.expectedEffectFilterField === undefined) {
    return true;
  }
  return row.expectedEffects.some((effect) =>
    effect.filters.some((filter) =>
      filter.field === anchor.expectedEffectFilterField &&
      (
        anchor.expectedEffectFilterValue === undefined ||
        String(filter.value ?? "") === anchor.expectedEffectFilterValue
      )
    )
  );
}

function matchingExpectedEffects(
  rows: readonly FrameworkCorpusExpectedEffectDescriptorRow[],
  anchors: readonly AtlasWorkRouteCorpusAnchor[],
  filters: AtlasWorkRouterFilters,
): readonly FrameworkCorpusExpectedEffectDescriptorRow[] {
  const effectKinds = [
    ...anchors
    .map((anchor) => anchor.effectKind)
    .filter((entry): entry is string => entry !== undefined),
    ...(filters.effectKind === undefined ? [] : [filters.effectKind]),
  ];
  if (effectKinds.length === 0) {
    return [];
  }
  return rows.filter((row) =>
    row.effectKind !== null && effectKinds.includes(row.effectKind),
  );
}

function routeRowEvidence(row: AtlasWorkRouteRow): Evidence {
  return {
    id: `atlas.work-router:${row.id}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: row.matchStrength === "weak-text"
      ? EvidenceConfidence.Heuristic
      : EvidenceConfidence.Exact,
    summary:
      `${row.title} matched as ${row.matchStrength}: ${row.matchedBy.join("; ")}.`,
    data: row,
  };
}

function routePlanEvidence(row: AtlasWorkRoutePlanRow): Evidence {
  const source = firstRoutePlanSource(row);
  return {
    id: `atlas.work-router:plan:${row.routeId}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Support,
    confidence: row.matchStrength === "weak-text"
      ? EvidenceConfidence.Heuristic
      : EvidenceConfidence.Strong,
    summary: row.summary,
    source,
    data: row,
  };
}

function routeHealthEvidence(row: AtlasWorkRouteHealthRow): Evidence {
  return {
    id: `atlas.work-router:health:${row.routeId}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: row.issues.length === 0 ? EvidenceRole.Support : EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    data: row,
  };
}

function routeCoverageEvidence(row: AtlasWorkRouteCoverageRow): Evidence {
  return {
    id: `atlas.work-router:coverage:${row.routeId}:${row.dimension}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: row.state === AtlasWorkRouteCoverageState.Missing ||
        row.state === AtlasWorkRouteCoverageState.Partial
      ? EvidenceRole.Diagnostic
      : EvidenceRole.Support,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    data: row,
  };
}

function routeWorksetEvidence(row: AtlasWorkRouteWorksetRow): Evidence {
  return {
    id: `atlas.work-router:workset:${row.routeId}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    data: row,
  };
}

function routeMemoryCoverageEvidence(row: AtlasWorkRouteMemoryCoverageRow): Evidence {
  return {
    id: `atlas.work-router:memory-coverage:${row.id}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: row.routed ? EvidenceRole.Support : EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    data: row,
  };
}

function atlasWorkRouterBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    {
      kind: BasisKind.AtlasContract,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Contract,
      freshness: BasisFreshness.Static,
      identity: "@aurelia-ls/atlas",
      version: ATLAS_WORK_ROUTER_VERSION,
      summary:
        "Work routes come from Atlas's static typed route catalog, not fuzzy task storage.",
    },
    {
      kind: BasisKind.HumanJudgement,
      closure: BasisClosure.Partial,
      authority: BasisAuthority.Human,
      freshness: BasisFreshness.Snapshot,
      summary:
        "Route definitions encode durable maintainer steering and are expected to evolve when weak matches expose missing ontology.",
    },
    {
      kind: BasisKind.TypeScriptProgram,
      closure: BasisClosure.Budgeted,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      identity: sourceProject.snapshot().identity,
      summary:
        "Route plans join catalog anchors to the live TypeScript/source project through product architecture, framework corpus, and memory substrates.",
    },
  ];
}

function routerRollup(
  scoredRoutes: readonly ScoredRoute[],
  plans: readonly AtlasWorkRoutePlanRow[],
): AtlasWorkRouterRollup {
  const byMatchStrength: Record<AtlasWorkRouteMatchStrength, number> = {
    "catalog-default": 0,
    "exact-structural": 0,
    "workset-structural": 0,
    "product-structural": 0,
    "memory-structural": 0,
    "declared-route-term": 0,
    "adjacent-ontology": 0,
    "weak-text": 0,
  };
  for (const scored of scoredRoutes) {
    byMatchStrength[scored.row.matchStrength] += 1;
  }
  return {
    routeCount: ATLAS_WORK_ROUTES.length,
    matchedRouteCount: scoredRoutes.length,
    byMatchStrength,
    weakTextMatchCount: byMatchStrength["weak-text"],
    routeWithMemoryCount: plans.filter((plan) =>
      plan.memoryRecords.length > 0 || plan.memoryNextActions.length > 0,
    ).length,
    routeWithFixtureSeedCount: plans.filter((plan) =>
      plan.fixtureSeeds.length > 0,
    ).length,
    routeWithSourceMatchCount: plans.filter((plan) =>
      plan.sourceAnchors.some((source) => source.found),
    ).length,
  };
}

function weakTextOpenSeams(rows: readonly AtlasWorkRouteRow[]): readonly OpenSeam[] {
  return rows
    .filter((row) => row.matchStrength === "weak-text")
    .map((row) => ({
      id: `atlas.work-router:weak-text:${row.id}`,
      kind: OpenSeamKind.InsufficientBasis,
      summary:
        `Route ${row.id} matched only descriptive prose. Add a structural anchor, declared term, memory domain, or corpus concept if this should become a reliable route.`,
      evidence: routeRowEvidence(row),
    }));
}

function routeHealthOpenSeams(row: AtlasWorkRouteHealthRow): readonly OpenSeam[] {
  return row.issues.map((issue) => ({
    id: `atlas.work-router:health:${row.routeId}:${issue.kind}`,
    kind: OpenSeamKind.InsufficientBasis,
    summary: issue.summary,
    evidence: routeHealthEvidence(row),
  }));
}

function memoryCoverageOpenSeam(row: AtlasWorkRouteMemoryCoverageRow): OpenSeam {
  return {
    id: `atlas.work-router:unrouted-memory-next:${row.id}`,
    kind: OpenSeamKind.InsufficientBasis,
    summary:
      `Atlas memory next action ${row.id} has no structural work route. Add or refine route memory anchors before relying on broad memory search.`,
    evidence: routeMemoryCoverageEvidence(row),
  };
}

function atlasWorkRouterProjectionContinuations(
  inquiry: Inquiry,
  filters: AtlasWorkRouterFilters,
): readonly Continuation[] {
  return [
    workRouterProjectionContinuation(inquiry, "routes", "Inspect matched work-route rows."),
    workRouterProjectionContinuation(inquiry, "next", "Ask for checkpoint-friendly route plans and next actions."),
    workRouterProjectionContinuation(inquiry, "route-plan", "Join matched routes to live memory, source, and corpus pressure."),
    workRouterProjectionContinuation(inquiry, "workset", "Join the current git worktree to typed work routes."),
    workRouterProjectionContinuation(inquiry, "memory-coverage", "Check whether live Atlas memory next actions are structurally routeable."),
    workRouterProjectionContinuation(inquiry, "coverage", "Inspect cross-cutting coverage dimensions declared by matched routes."),
    workRouterProjectionContinuation(inquiry, "route-health", "Inspect route catalog grounding warnings."),
    workRouterProjectionContinuation(inquiry, "schema", "Inspect typed route catalog definitions and anchor vocabulary."),
    {
      id: "atlas.work-router:memory-next",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect raw Atlas memory next actions behind route guidance.",
      inquiry: {
        lens: LensId.AtlasMemory,
        locus: RepoRootLocus,
        projection: "next",
        filters: filters.domains.length === 0
          ? undefined
          : { domain: filters.domains, domainMode: filters.domainMode },
      },
      route: navigationRoute(
        NavigationPlane.Maintenance,
        NavigationRelation.DiagnosticsFor,
        [BasisKind.HumanJudgement, BasisKind.TypeScriptProgram],
        "Work-router route to memory next-action pressure.",
      ),
    },
  ];
}

function workRouterProjectionContinuation(
  inquiry: Inquiry,
  projection: AtlasWorkRouterProjection,
  rationale: string,
): Continuation {
  return {
    id: `atlas.work-router:${projection}`,
    kind: ContinuationKind.SwitchProjection,
    priority: projection === "next" || projection === "route-plan"
      ? ContinuationPriority.Primary
      : ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
    },
    route: navigationRoute(
      NavigationPlane.Maintenance,
      NavigationRelation.ProjectionOf,
      [BasisKind.AtlasContract, BasisKind.TypeScriptProgram],
      `Switch atlas.work-router to ${projection}.`,
    ),
  };
}

function workRouterRoutePlanContinuation(
  routeId: string,
  rationale: string,
): Continuation {
  return {
    id: `atlas.work-router:plan:${routeId}`,
    kind: ContinuationKind.Narrow,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      lens: LensId.AtlasWorkRouter,
      locus: RepoRootLocus,
      projection: "route-plan",
      filters: { routeId },
    },
    route: navigationRoute(
      NavigationPlane.Maintenance,
      NavigationRelation.RefinementOf,
      [BasisKind.AtlasContract, BasisKind.TypeScriptProgram],
      "Narrow the work-router answer to one typed route plan.",
    ),
  };
}

function routeContinuations(
  row: AtlasWorkRouteRow,
  state: RouterState,
): readonly Continuation[] {
  const route = ATLAS_WORK_ROUTES.find((entry) => entry.id === row.id);
  if (route === undefined) {
    return [];
  }
  return [
    workRouterRoutePlanContinuation(route.id, `Build a live route plan for ${route.id}.`),
    ...route.anchors.flatMap(anchorContinuation).slice(0, 12),
    ...routePlanContinuations(routePlan({ route, row }, state, emptyAtlasWorkRouterFilters())).slice(0, 12),
  ];
}

function anchorContinuation(anchor: AtlasWorkRouteAnchor): readonly Continuation[] {
  switch (anchor.kind) {
    case "lens":
      return [lensAnchorContinuation(anchor)];
    case "memory":
      return [memoryAnchorContinuation(anchor)];
    case "framework-corpus":
      return [corpusAnchorContinuation(anchor)];
    case "source":
      return [sourceFileAnchorContinuation(anchor)];
    default:
      return [];
  }
}

function lensAnchorContinuation(anchor: AtlasWorkRouteLensAnchor): Continuation {
  return {
    id: `atlas.work-router:lens:${anchor.lensId}:${anchor.projection ?? "summary"}`,
    kind: ContinuationKind.SwitchLens,
    priority: anchor.role === "primary" || anchor.role === "grounding"
      ? ContinuationPriority.Primary
      : ContinuationPriority.Secondary,
    rationale: anchor.summary,
    inquiry: {
      lens: anchor.lensId,
      locus: RepoRootLocus,
      projection: anchor.projection,
      filters: anchor.filters,
    },
    route: navigationRoute(
      NavigationPlane.Maintenance,
      NavigationRelation.FrameworkFlowOf,
      [BasisKind.AtlasContract, BasisKind.TypeScriptProgram],
      `Route to ${anchor.lensId}.`,
    ),
  };
}

function memoryAnchorContinuation(anchor: AtlasWorkRouteMemoryAnchor): Continuation {
  const filters: Record<string, unknown> = {
    domain: anchor.domains,
    domainMode: "any",
  };
  if (anchor.anchorLensId !== undefined) {
    filters["anchorLensId"] = anchor.anchorLensId;
  }
  if (anchor.symbolName !== undefined) {
    filters["symbolName"] = anchor.symbolName;
  }
  if (anchor.auLinkId !== undefined) {
    filters["auLinkId"] = anchor.auLinkId;
  }
  return {
    id: `atlas.work-router:memory:${anchor.domains.join("+")}`,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Secondary,
    rationale: anchor.summary,
    inquiry: {
      lens: LensId.AtlasMemory,
      locus: RepoRootLocus,
      projection: "next",
      filters,
    },
    route: navigationRoute(
      NavigationPlane.Maintenance,
      NavigationRelation.DiagnosticsFor,
      [BasisKind.HumanJudgement, BasisKind.TypeScriptProgram],
      "Route to Atlas memory for matching durable guidance.",
    ),
  };
}

function corpusAnchorContinuation(anchor: AtlasWorkRouteCorpusAnchor): Continuation {
  const filters: Record<string, unknown> = {};
  if (anchor.concept !== undefined) {
    filters["concept"] = anchor.concept;
  }
  if (anchor.query !== undefined) {
    filters["query"] = anchor.query;
  }
  if (anchor.effectKind !== undefined) {
    filters["effectKind"] = anchor.effectKind;
  }
  if (anchor.appPatternKey !== undefined) {
    filters["appPatternKey"] = anchor.appPatternKey;
  }
  if (anchor.classificationKind !== undefined) {
    filters["classificationKind"] = anchor.classificationKind;
  }
  if (anchor.classificationKey !== undefined) {
    filters["classificationKey"] = anchor.classificationKey;
  }
  if (anchor.expectedEffectFilterField !== undefined) {
    filters["expectedEffectFilterField"] = anchor.expectedEffectFilterField;
  }
  if (anchor.expectedEffectFilterValue !== undefined) {
    filters["expectedEffectFilterValue"] = anchor.expectedEffectFilterValue;
  }
  return {
    id: `atlas.work-router:corpus:${anchor.projection}:${anchor.concept ?? anchor.effectKind ?? anchor.appPatternKey ?? "all"}:${anchor.classificationKind ?? "any"}:${anchor.classificationKey ?? "any"}:${anchor.query ?? "all"}`,
    kind: ContinuationKind.SwitchLens,
    priority: anchor.role === "pressure"
      ? ContinuationPriority.Primary
      : ContinuationPriority.Secondary,
    rationale: anchor.summary,
    inquiry: {
      lens: LensId.FrameworkCorpus,
      locus: RepoRootLocus,
      projection: anchor.projection,
      filters,
    },
    route: navigationRoute(
      NavigationPlane.Maintenance,
      NavigationRelation.FrameworkFlowOf,
      [BasisKind.SourceText],
      "Route to framework corpus pressure.",
    ),
  };
}

function sourceFileAnchorContinuation(anchor: AtlasWorkRouteSourceAnchor): Continuation {
  return {
    id: `atlas.work-router:source:${anchor.filePath}`,
    kind: ContinuationKind.InspectEvidence,
    priority: anchor.role === "primary"
      ? ContinuationPriority.Primary
      : ContinuationPriority.Secondary,
    rationale: anchor.summary,
    inquiry: {
      lens: LensId.TsSource,
      locus: { kind: LocusKind.SourceFile, filePath: anchor.filePath },
      projection: "text",
    },
    route: navigationRoute(
      NavigationPlane.Inspection,
      NavigationRelation.SourceFor,
      [BasisKind.SourceText],
      "Inspect source anchor for a work route.",
    ),
  };
}

function routePlanContinuations(row: AtlasWorkRoutePlanRow): readonly Continuation[] {
  return [
    ...frameworkErrorCodeContinuations(row),
    ...row.sourceAnchors.flatMap((entry) =>
      [
        ...entry.admittedSourceDeclarations.map((declaration) =>
          sourceRangeContinuation(
            `atlas.work-router:admitted-source-declaration:${entry.anchor.filePath}:${declaration.name ?? "anonymous"}`,
            declaration.source,
            `Inspect admitted ${declaration.kind} declaration ${declaration.name ?? "<anonymous>"} for route ${row.routeId}.`,
          ),
        ),
        ...entry.classSurfaces.map((classRow) =>
          sourceRangeContinuation(
            `atlas.work-router:source-class:${classRow.id}`,
            sourceRangeFromOneBasedReference(classRow.source),
            `Inspect class surface ${classRow.name} for route ${row.routeId}.`,
          ),
        ),
        ...entry.declarations.map((declaration) =>
          sourceRangeContinuation(
            `atlas.work-router:source-declaration:${declaration.id}`,
            sourceRangeFromOneBasedReference(declaration.source),
            `Inspect declaration ${declaration.name} for route ${row.routeId}.`,
          ),
        ),
        ...entry.atlasClassSurfaces.map((classRow) =>
          sourceRangeContinuation(
            `atlas.work-router:atlas-class:${classRow.id}`,
            classRow.source,
            `Inspect Atlas class surface ${classRow.name} for route ${row.routeId}.`,
          ),
        ),
        ...entry.atlasFunctionSurfaces.map((functionRow) =>
          sourceRangeContinuation(
            `atlas.work-router:atlas-function:${functionRow.id}`,
            functionRow.source,
            `Inspect Atlas function ${functionRow.name} for route ${row.routeId}.`,
          ),
        ),
        ...entry.atlasVariableSurfaces.map((variableRow) =>
          sourceRangeContinuation(
            `atlas.work-router:atlas-variable:${variableRow.id}`,
            variableRow.source,
            `Inspect Atlas variable ${variableRow.name} for route ${row.routeId}.`,
          ),
        ),
      ],
    ),
    ...row.fixtureSeeds.slice(0, 4).map((seed) =>
      sourceRangeContinuation(
        `atlas.work-router:fixture-seed:${seed.id}`,
        seed.source,
        `Inspect framework corpus fixture seed ${seed.id}.`,
      ),
    ),
    ...row.expectedEffects.slice(0, 4).map((effect) =>
      sourceRangeContinuation(
        `atlas.work-router:expected-effect:${effect.id}`,
        effect.source,
        `Inspect expected-effect descriptor ${effect.key}.`,
      ),
    ),
  ];
}

function frameworkErrorCodeContinuations(
  row: AtlasWorkRoutePlanRow,
): readonly Continuation[] {
  const codeLabel = row.frameworkErrorCodeLabel;
  if (codeLabel === undefined) {
    return [];
  }
  return [
    {
      id: `atlas.work-router:framework-error-code:${codeLabel}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale:
        `Inspect framework diagnostic intake rows for ${codeLabel}.`,
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: RepoRootLocus,
        projection: "diagnostic-codes",
        filters: { query: codeLabel },
      },
      route: navigationRoute(
        NavigationPlane.Maintenance,
        NavigationRelation.DiagnosticsFor,
        [BasisKind.SourceText, BasisKind.TypeScriptProgram],
        "Route exact AUR label to framework error-code diagnostics.",
      ),
    },
  ];
}

function sourceRangeContinuation(
  id: string,
  source: SourceRange,
  rationale: string,
): Continuation {
  return {
    id,
    kind: ContinuationKind.InspectEvidence,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      lens: LensId.TsSource,
      locus: { kind: LocusKind.SourceRange, range: source },
      projection: "text",
    },
    route: navigationRoute(
      NavigationPlane.Inspection,
      NavigationRelation.SourceFor,
      [BasisKind.SourceText, BasisKind.TypeScriptProgram],
      "Inspect source behind a work-route plan row.",
    ),
  };
}

function firstRoutePlanSource(
  row: AtlasWorkRoutePlanRow,
): SourceRange | undefined {
  for (const sourceAnchor of row.sourceAnchors) {
    const admittedDeclaration = sourceAnchor.admittedSourceDeclarations[0];
    if (admittedDeclaration !== undefined) {
      return admittedDeclaration.source;
    }
    const classSurface = sourceAnchor.classSurfaces[0];
    if (classSurface !== undefined) {
      return sourceRangeFromOneBasedReference(classSurface.source);
    }
    const declaration = sourceAnchor.declarations[0];
    if (declaration !== undefined) {
      return sourceRangeFromOneBasedReference(declaration.source);
    }
    const atlasClass = sourceAnchor.atlasClassSurfaces[0];
    if (atlasClass !== undefined) {
      return atlasClass.source;
    }
    const atlasFunction = sourceAnchor.atlasFunctionSurfaces[0];
    if (atlasFunction !== undefined) {
      return atlasFunction.source;
    }
    const atlasVariable = sourceAnchor.atlasVariableSurfaces[0];
    if (atlasVariable !== undefined) {
      return atlasVariable.source;
    }
  }
  const fixtureSeed = row.fixtureSeeds[0];
  if (fixtureSeed !== undefined) {
    return fixtureSeed.source;
  }
  const expectedEffect = row.expectedEffects[0];
  return expectedEffect?.source;
}
