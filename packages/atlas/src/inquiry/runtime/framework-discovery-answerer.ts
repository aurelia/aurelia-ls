import {
  FRAMEWORK_DISCOVERY_SEEDS,
  groupFrameworkFlowCallTargets,
  readFrameworkDiscoveryIndex,
  readFrameworkDiscoverySeedIndex,
  type FrameworkAnchorResolution,
  type FrameworkFlowCallEdgeRow,
  type FrameworkFlowCallSiteRow,
  type FrameworkFlowCallTargetRow,
  type FrameworkFlowDefinition,
  type FrameworkFlowSeedRow,
} from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import {
  evidenceLimit,
  pageOffset,
  rowLimit,
} from "../paging.js";
import { readFrameworkBundles } from "./framework-bundles.js";
import { nextPageContinuation } from "./framework-continuation-core.js";
import {
  appTaskEntityContinuations,
  frameworkCatalogBundleContinuations,
  diInterfaceContinuations,
  expressionEntityContinuations,
  observerEntityContinuations,
  packageExportContinuations,
  renderingStructureContinuations,
  resourceCarrierContinuations,
  resourceExportContinuations,
  routerEntityContinuations,
} from "./framework-catalog-continuations.js";
import {
  callEdgeContinuations,
  callSiteContinuations,
  callTargetContinuations,
  flowContinuations,
  frameworkFlowAnchorContinuations,
  flowSeedContinuations,
} from "./framework-flow-continuations.js";
import {
  frameworkSummaryContinuations,
  openQuestionContinuations,
} from "./framework-summary-continuations.js";
import type {
  FrameworkAppTaskEntityRow,
  FrameworkBundleExportRow,
  FrameworkDiInterfaceExportRow,
  FrameworkDiscoveryValue,
  FrameworkExpressionEntityRow,
  FrameworkObserverEntityRow,
  FrameworkPackageExportRow,
  FrameworkRegistryExportRow,
  FrameworkRenderingStructureEntityRow,
  FrameworkResourceCarrierRow,
  FrameworkResourceExportRow,
  FrameworkRouterEntityRow,
} from "./framework-entities.js";
import {
  readFrameworkAppTaskEntities,
  readFrameworkExpressionEntities,
  readFrameworkObserverEntities,
  readFrameworkRenderingStructures,
  readFrameworkRouterEntities,
} from "./framework-entity-catalogs.js";
import {
  evidenceForAnchorResolution,
  evidenceForAppTaskEntity,
  evidenceForBundle,
  evidenceForCallEdge,
  evidenceForFrameworkFlowCallSite,
  evidenceForCallTarget,
  evidenceForDiInterface,
  evidenceForExpressionEntity,
  evidenceForFlow,
  evidenceForFlowSeed,
  evidenceForFrameworkDiscoveryRecipe,
  evidenceForObserverEntity,
  evidenceForPackageExport,
  evidenceForQuestion,
  evidenceForRenderingStructure,
  evidenceForResourceCarrier,
  evidenceForResourceExport,
  evidenceForRouterEntity,
} from "./framework-evidence.js";
import {
  anchorResolutionForRollup,
  anchorResolutionMatches,
  callEdgeMatches,
  callSiteMatches,
  filtersFromInquiry,
  flowMatches,
  flowSeedMatches,
  type FrameworkDiscoveryFilters,
} from "./framework-filters.js";
import {
  readFrameworkDiInterfaces,
  readFrameworkPackageExports,
  readFrameworkRegistryExports,
} from "./framework-package-exports.js";
import {
  readFrameworkResourceCarriers,
  readFrameworkResourceExports,
} from "./framework-resources.js";
import {
  filterFrameworkDiscoveryRecipes,
  type FrameworkDiscoveryRecipeRow,
} from "./framework-recipes.js";
import { PagedRowFamily } from "../paged-row-family.js";
import {
  checkerBasis,
  frameworkDiscoverySeedBasis,
  sourceIndexBasis,
  staticEvaluatorBasis,
} from "./framework-support.js";

class FrameworkDiscoveryQueryContext {
  readonly projection: string;
  readonly filters: FrameworkDiscoveryFilters;
  readonly seedIndex: ReturnType<typeof readFrameworkDiscoverySeedIndex>;
  readonly flows: readonly FrameworkFlowDefinition[];
  readonly anchors: readonly FrameworkAnchorResolution[];
  readonly flowSeeds: readonly FrameworkFlowSeedRow[];
  readonly anchorResolution: ReturnType<typeof anchorResolutionForRollup>;
  readonly limit: number;
  readonly offset: number;

  constructor(
    readonly inquiry: Inquiry,
    readonly sourceProject: SourceProject,
  ) {
    this.projection = inquiry.projection ?? "summary";
    this.filters = filtersFromInquiry(inquiry);
    this.seedIndex = readFrameworkDiscoverySeedIndex(sourceProject);
    this.flows = this.seedIndex.flows.filter((flow) =>
      flowMatches(flow, this.filters),
    );
    this.anchors = this.seedIndex.anchors.filter((resolution) =>
      anchorResolutionMatches(resolution, this.filters),
    );
    this.flowSeeds = this.seedIndex.flowSeeds.filter((row) =>
      flowSeedMatches(row, this.filters),
    );
    this.anchorResolution = anchorResolutionForRollup(this.seedIndex.rollup);
    this.limit = rowLimit(inquiry);
    this.offset = pageOffset(inquiry);
  }
}

const FLOW_DEFINITION_ROW_FAMILY =
  new PagedRowFamily<FrameworkFlowDefinition>({
    id: "framework.discovery:flows",
    rowLabel: "framework flow definition(s)",
    evidenceForRow: evidenceForFlow,
    continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
      flowContinuations(inquiry, nextOffset, limit),
  });

const DISCOVERY_RECIPE_ROW_FAMILY =
  new PagedRowFamily<FrameworkDiscoveryRecipeRow>({
    id: "framework.discovery:recipes",
    rowLabel: "framework discovery recipe row(s)",
    evidenceForRow: evidenceForFrameworkDiscoveryRecipe,
    continuationsForPage: recipeContinuations,
  });

const ANCHOR_ROW_FAMILY =
  new PagedRowFamily<FrameworkAnchorResolution>({
    id: "framework.discovery:anchors",
    rowLabel: "framework seed anchor(s)",
    evidenceForRow: evidenceForAnchorResolution,
    continuationsForPage: frameworkFlowAnchorContinuations,
  });

const FLOW_SEED_ROW_FAMILY =
  new PagedRowFamily<FrameworkFlowSeedRow>({
    id: "framework.discovery:flow-seeds",
    rowLabel: "framework flow seed row(s)",
    evidenceForRow: evidenceForFlowSeed,
    continuationsForPage: flowSeedContinuations,
  });

const CALL_EDGE_ROW_FAMILY =
  new PagedRowFamily<FrameworkFlowCallEdgeRow>({
    id: "framework.discovery:call-edges",
    rowLabel: "framework flow call-edge row(s)",
    evidenceForRow: evidenceForCallEdge,
    continuationsForPage: callEdgeContinuations,
  });

const CALL_SITE_ROW_FAMILY =
  new PagedRowFamily<FrameworkFlowCallSiteRow>({
    id: "framework.discovery:call-sites",
    rowLabel: "framework flow call-site row(s)",
    evidenceForRow: evidenceForFrameworkFlowCallSite,
    continuationsForPage: callSiteContinuations,
  });

const CALL_TARGET_ROW_FAMILY =
  new PagedRowFamily<FrameworkFlowCallTargetRow>({
    id: "framework.discovery:call-targets",
    rowLabel: "framework flow call-target row(s)",
    evidenceForRow: evidenceForCallTarget,
    continuationsForPage: callTargetContinuations,
  });

const PACKAGE_EXPORT_ROW_FAMILY =
  new PagedRowFamily<FrameworkPackageExportRow>({
    id: "framework.discovery:package-exports",
    rowLabel: "Aurelia framework package export row(s)",
    evidenceForRow: evidenceForPackageExport,
    continuationsForPage: packageExportContinuations,
  });

const REGISTRY_EXPORT_ROW_FAMILY =
  new PagedRowFamily<FrameworkRegistryExportRow>({
    id: "framework.discovery:registry-exports",
    rowLabel: "Aurelia framework registry export row(s)",
    evidenceForRow: evidenceForPackageExport,
    continuationsForPage: packageExportContinuations,
  });

const DI_INTERFACE_ROW_FAMILY =
  new PagedRowFamily<FrameworkDiInterfaceExportRow>({
    id: "framework.discovery:di-interfaces",
    rowLabel: "Aurelia framework DI interface export row(s)",
    evidenceForRow: evidenceForDiInterface,
    continuationsForPage: diInterfaceContinuations,
  });

const RESOURCE_CARRIER_ROW_FAMILY =
  new PagedRowFamily<FrameworkResourceCarrierRow>({
    id: "framework.discovery:resource-carriers",
    rowLabel: "Aurelia framework resource carrier row(s)",
    evidenceForRow: evidenceForResourceCarrier,
    continuationsForPage: resourceCarrierContinuations,
  });

const RESOURCE_EXPORT_ROW_FAMILY =
  new PagedRowFamily<FrameworkResourceExportRow>({
    id: "framework.discovery:resources",
    rowLabel: "Aurelia framework resource export row(s)",
    evidenceForRow: evidenceForResourceExport,
    continuationsForPage: resourceExportContinuations,
  });

const BUNDLE_ROW_FAMILY =
  new PagedRowFamily<FrameworkBundleExportRow>({
    id: "framework.discovery:bundles",
    rowLabel: "Aurelia framework bundle row(s)",
    evidenceForRow: evidenceForBundle,
    continuationsForPage: frameworkCatalogBundleContinuations,
  });

const OBSERVER_ROW_FAMILY =
  new PagedRowFamily<FrameworkObserverEntityRow>({
    id: "framework.discovery:observers",
    rowLabel: "Aurelia framework observer-system export row(s)",
    evidenceForRow: evidenceForObserverEntity,
    continuationsForPage: observerEntityContinuations,
  });

const APP_TASK_ROW_FAMILY =
  new PagedRowFamily<FrameworkAppTaskEntityRow>({
    id: "framework.discovery:app-tasks",
    rowLabel: "Aurelia framework AppTask/lifecycle task export row(s)",
    evidenceForRow: evidenceForAppTaskEntity,
    continuationsForPage: appTaskEntityContinuations,
  });

const ROUTER_ENTITY_ROW_FAMILY =
  new PagedRowFamily<FrameworkRouterEntityRow>({
    id: "framework.discovery:router-entities",
    rowLabel: "Aurelia framework router export row(s)",
    evidenceForRow: evidenceForRouterEntity,
    continuationsForPage: routerEntityContinuations,
  });

const EXPRESSION_ENTITY_ROW_FAMILY =
  new PagedRowFamily<FrameworkExpressionEntityRow>({
    id: "framework.discovery:expression-entities",
    rowLabel: "Aurelia framework expression/parser export row(s)",
    evidenceForRow: evidenceForExpressionEntity,
    continuationsForPage: expressionEntityContinuations,
  });

const RENDERING_STRUCTURE_ROW_FAMILY =
  new PagedRowFamily<FrameworkRenderingStructureEntityRow>({
    id: "framework.discovery:rendering-structures",
    rowLabel: "Aurelia framework rendering/lifecycle structural export row(s)",
    evidenceForRow: evidenceForRenderingStructure,
    continuationsForPage: renderingStructureContinuations,
  });

const OPEN_QUESTION_ROW_FAMILY = new PagedRowFamily<string>({
  id: "framework.discovery:open-questions",
  rowLabel: "framework discovery question(s)",
  evidenceForRow: evidenceForQuestion,
  continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
    openQuestionContinuations(inquiry, nextOffset, limit),
});

/** Answer framework discovery-seed inquiries from package-local Atlas contracts and the hot source index. */
export function answerFrameworkDiscovery(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkDiscoveryValue> {
  return new FrameworkDiscoveryAnswerer(inquiry, sourceProject).answer();
}

class FrameworkDiscoveryAnswerer {
  readonly #inquiry: Inquiry;
  readonly #sourceProject: SourceProject;

  constructor(inquiry: Inquiry, sourceProject: SourceProject) {
    this.#inquiry = inquiry;
    this.#sourceProject = sourceProject;
  }

  answer(): Answer<FrameworkDiscoveryValue> {
    const context = new FrameworkDiscoveryQueryContext(
      this.#inquiry,
      this.#sourceProject,
    );
    const {
      inquiry,
      sourceProject,
      projection,
      filters,
      seedIndex,
      flows,
      anchors,
      flowSeeds,
      anchorResolution,
      limit,
      offset,
    } = context;
    const seedBasis = [frameworkDiscoverySeedBasis()];
    const seedSourceBasis = [
      frameworkDiscoverySeedBasis(),
      sourceIndexBasis(sourceProject),
    ];
    const checkerFlowBasis = [
      frameworkDiscoverySeedBasis(),
      sourceIndexBasis(sourceProject),
      checkerBasis(sourceProject),
    ];
    const sourceCheckerBasis = [
      sourceIndexBasis(sourceProject),
      checkerBasis(sourceProject),
    ];
    const evaluatorBasis = [
      sourceIndexBasis(sourceProject),
      checkerBasis(sourceProject),
      staticEvaluatorBasis(sourceProject),
    ];
    const baseValue = {
      seedVersion: seedIndex.seedVersion,
      flowCount: flows.length,
      anchorCount: anchors.length,
      anchorResolution,
    };

    if (projection === "flows") {
      return FLOW_DEFINITION_ROW_FAMILY.answer({
        inquiry,
        rows: flows,
        limit,
        offset,
        basis: seedBasis,
        value: (page) => ({ ...baseValue, flows: page.rows }),
      });
    }

    if (projection === "recipes") {
      const recipes = filterFrameworkDiscoveryRecipes(filters);
      return DISCOVERY_RECIPE_ROW_FAMILY.answer({
        inquiry,
        rows: recipes,
        limit,
        offset,
        basis: seedBasis,
        value: (page) => ({ ...baseValue, recipes: page.rows }),
      });
    }

    if (projection === "anchors") {
      return ANCHOR_ROW_FAMILY.answer({
        inquiry,
        rows: anchors,
        limit,
        offset,
        basis: seedSourceBasis,
        value: (page) => ({ ...baseValue, anchors: page.rows }),
      });
    }

    if (projection === "flow-seeds") {
      return FLOW_SEED_ROW_FAMILY.answer({
        inquiry,
        rows: flowSeeds,
        limit,
        offset,
        basis: seedSourceBasis,
        value: (page) => ({ ...baseValue, flowSeeds: page.rows }),
      });
    }

    if (projection === "call-edges") {
      const index = readFrameworkDiscoveryIndex(sourceProject);
      const callEdges = index.flowCallEdges.filter((row) =>
        callEdgeMatches(row, filters),
      );
      const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
      const fullBaseValue = {
        ...baseValue,
        seedVersion: index.seedVersion,
        anchorResolution: fullAnchorResolution,
      };
      return CALL_EDGE_ROW_FAMILY.answer({
        inquiry,
        rows: callEdges,
        limit,
        offset,
        basis: checkerFlowBasis,
        value: (page) => ({ ...fullBaseValue, callEdges: page.rows }),
      });
    }

    if (projection === "call-sites") {
      const index = readFrameworkDiscoveryIndex(sourceProject);
      const callSites = index.flowCallSites.filter((row) =>
        callSiteMatches(row, filters),
      );
      const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
      const fullBaseValue = {
        ...baseValue,
        seedVersion: index.seedVersion,
        anchorResolution: fullAnchorResolution,
      };
      return CALL_SITE_ROW_FAMILY.answer({
        inquiry,
        rows: callSites,
        limit,
        offset,
        basis: checkerFlowBasis,
        value: (page) => ({ ...fullBaseValue, callSites: page.rows }),
      });
    }

    if (projection === "call-targets") {
      const index = readFrameworkDiscoveryIndex(sourceProject);
      const callEdges = index.flowCallEdges.filter((row) =>
        callEdgeMatches(row, filters),
      );
      const callTargets = groupFrameworkFlowCallTargets(callEdges);
      const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
      const fullBaseValue = {
        ...baseValue,
        seedVersion: index.seedVersion,
        anchorResolution: fullAnchorResolution,
      };
      return CALL_TARGET_ROW_FAMILY.answer({
        inquiry,
        rows: callTargets,
        limit,
        offset,
        basis: checkerFlowBasis,
        value: (page) => ({ ...fullBaseValue, callTargets: page.rows }),
      });
    }

    if (projection === "package-exports") {
      const packageExports = readFrameworkPackageExports(
        sourceProject,
        filters,
      );
      return PACKAGE_EXPORT_ROW_FAMILY.answer({
        inquiry,
        rows: packageExports,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, packageExports: page.rows }),
      });
    }

    if (projection === "registry-exports") {
      const registryExports = readFrameworkRegistryExports(
        sourceProject,
        filters,
      );
      return REGISTRY_EXPORT_ROW_FAMILY.answer({
        inquiry,
        rows: registryExports,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, registryExports: page.rows }),
      });
    }

    if (projection === "di-interfaces") {
      const diInterfaces = readFrameworkDiInterfaces(sourceProject, filters);
      return DI_INTERFACE_ROW_FAMILY.answer({
        inquiry,
        rows: diInterfaces,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, diInterfaces: page.rows }),
      });
    }

    if (projection === "resource-carriers") {
      const resourceCarriers = readFrameworkResourceCarriers(
        sourceProject,
        filters,
      );
      return RESOURCE_CARRIER_ROW_FAMILY.answer({
        inquiry,
        rows: resourceCarriers,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, resourceCarriers: page.rows }),
      });
    }

    if (projection === "resources") {
      const resources = readFrameworkResourceExports(sourceProject, filters);
      return RESOURCE_EXPORT_ROW_FAMILY.answer({
        inquiry,
        rows: resources,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, resources: page.rows }),
      });
    }

    if (projection === "bundles") {
      const bundles = readFrameworkBundles(sourceProject, filters);
      return BUNDLE_ROW_FAMILY.answer({
        inquiry,
        rows: bundles,
        limit,
        offset,
        basis: evaluatorBasis,
        value: (page) => ({ ...baseValue, bundles: page.rows }),
      });
    }

    if (projection === "observers") {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      return OBSERVER_ROW_FAMILY.answer({
        inquiry,
        rows: observers,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, observers: page.rows }),
      });
    }

    if (projection === "app-tasks") {
      const appTasks = readFrameworkAppTaskEntities(sourceProject, filters);
      return APP_TASK_ROW_FAMILY.answer({
        inquiry,
        rows: appTasks,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, appTasks: page.rows }),
      });
    }

    if (projection === "router-entities") {
      const routerEntities = readFrameworkRouterEntities(
        sourceProject,
        filters,
      );
      return ROUTER_ENTITY_ROW_FAMILY.answer({
        inquiry,
        rows: routerEntities,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, routerEntities: page.rows }),
      });
    }

    if (projection === "expression-entities") {
      const expressionEntities = readFrameworkExpressionEntities(
        sourceProject,
        filters,
      );
      return EXPRESSION_ENTITY_ROW_FAMILY.answer({
        inquiry,
        rows: expressionEntities,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, expressionEntities: page.rows }),
      });
    }

    if (projection === "rendering-structures") {
      const renderingStructures = readFrameworkRenderingStructures(
        sourceProject,
        filters,
      );
      return RENDERING_STRUCTURE_ROW_FAMILY.answer({
        inquiry,
        rows: renderingStructures,
        limit,
        offset,
        basis: sourceCheckerBasis,
        value: (page) => ({ ...baseValue, renderingStructures: page.rows }),
      });
    }

    if (projection === "open-questions") {
      return OPEN_QUESTION_ROW_FAMILY.answer({
        inquiry,
        rows: FRAMEWORK_DISCOVERY_SEEDS.openQuestions,
        limit,
        offset,
        basis: seedBasis,
        value: (page) => ({ ...baseValue, openQuestions: page.rows }),
      });
    }

    return createAnswer(
      inquiry,
      OutcomeKind.Hit,
      `Framework discovery seeds has ${seedIndex.rollup.flows} flow definition(s), ${seedIndex.rollup.anchors} seed anchor(s), ${seedIndex.rollup.resolvedAnchors} resolved anchor(s), and ${FRAMEWORK_DISCOVERY_SEEDS.openQuestions.length} open question(s).`,
      {
        value: {
          seedVersion: seedIndex.seedVersion,
          flowCount: flows.length,
          anchorCount: anchors.length,
          anchorResolution,
        },
        basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject)],
        evidence: [
          ...flows
            .slice(0, Math.max(1, Math.floor(evidenceLimit(inquiry) / 2)))
            .map(evidenceForFlow),
          ...anchors
            .slice(0, Math.max(1, Math.ceil(evidenceLimit(inquiry) / 2)))
            .map(evidenceForAnchorResolution),
        ],
        continuations: frameworkSummaryContinuations(inquiry),
      },
    );
  }
}

function recipeContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkDiscoveryRecipeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:recipes:next-page",
        "Continue framework discovery recipe rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, recipe] of rows.slice(0, 3).entries()) {
    const firstHop = recipe.hops[0];
    if (firstHop === undefined) {
      continue;
    }
    continuations.push({
      id: `framework.discovery:recipes:first-hop:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale: `Start recipe ${recipe.id}: ${firstHop.purpose}`,
      inquiry: {
        ...firstHop.ask,
        locus: firstHop.ask.locus ?? inquiry.locus,
      },
      evidence: [evidenceForFrameworkDiscoveryRecipe(recipe)],
    });
  }
  return continuations;
}
