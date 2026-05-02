import {
  FRAMEWORK_DISCOVERY_SEEDS,
  groupFrameworkFlowCallTargets,
  readFrameworkDiscoveryIndex,
  readFrameworkDiscoverySeedIndex,
  type FrameworkAnchorResolution,
  type FrameworkFlowDefinition,
  type FrameworkFlowSeedRow,
} from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { clampBudget } from "../budget.js";
import type { Inquiry } from "../inquiry.js";
import { readFrameworkBundles } from "./framework-bundles.js";
import {
  anchorContinuations,
  appTaskEntityContinuations,
  bindingAdmissionContinuations,
  bindingEffectContinuations,
  bindingProductContinuations,
  bindingSetupContinuations,
  bundleContinuations,
  callEdgeContinuations,
  callSiteContinuations,
  callTargetContinuations,
  diInterfaceContinuations,
  expressionEntityContinuations,
  flowContinuations,
  flowSeedContinuations,
  instructionDispatchContinuations,
  instructionSlotContinuations,
  observerEntityContinuations,
  openQuestionContinuations,
  packageExportContinuations,
  renderingStructureContinuations,
  resourceCarrierContinuations,
  resourceExportContinuations,
  routerEntityContinuations,
  summaryContinuations,
  syntaxProductContinuations,
} from "./framework-continuations.js";
import type { FrameworkDiscoveryValue } from "./framework-entities.js";
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
  evidenceForBindingAdmission,
  evidenceForBindingEffect,
  evidenceForBindingProduct,
  evidenceForBindingSetup,
  evidenceForBundle,
  evidenceForCallEdge,
  evidenceForCallSite,
  evidenceForCallTarget,
  evidenceForDiInterface,
  evidenceForExpressionEntity,
  evidenceForFlow,
  evidenceForFlowSeed,
  evidenceForInstructionDispatch,
  evidenceForInstructionSlot,
  evidenceForObserverEntity,
  evidenceForPackageExport,
  evidenceForQuestion,
  evidenceForRenderingStructure,
  evidenceForResourceCarrier,
  evidenceForResourceExport,
  evidenceForRouterEntity,
  evidenceForSyntaxProduct,
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
  readFrameworkBindingAdmissions,
  readFrameworkBindingEffects,
  readFrameworkBindingProducts,
  readFrameworkBindingSetups,
  readFrameworkInstructionDispatches,
  readFrameworkInstructionSlots,
  readFrameworkSyntaxProducts,
} from "./framework-rendering-graph.js";
import {
  readFrameworkResourceCarriers,
  readFrameworkResourceExports,
} from "./framework-resources.js";
import { filterFrameworkDiscoveryRecipes } from "./framework-recipes.js";
import {
  checkerBasis,
  evidenceLimit,
  frameworkDiscoverySeedBasis,
  pageInfo,
  pageOffset,
  pageRows,
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
    this.limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
    this.offset = pageOffset(inquiry);
  }
}

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

    if (projection === "flows") {
      const page = pageRows(flows, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${flows.length} framework flow definition(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            flows: page.rows,
          },
          basis: [frameworkDiscoverySeedBasis()],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForFlow),
          page: pageInfo(
            inquiry,
            page.rows.length,
            flows.length,
            limit,
            page.nextOffset,
          ),
          continuations: flowContinuations(inquiry, page.nextOffset, limit),
        },
      );
    }

    if (projection === "recipes") {
      const recipes = filterFrameworkDiscoveryRecipes(filters);
      const page = pageRows(recipes, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${recipes.length} framework discovery recipe row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            recipes: page.rows,
          },
          basis: [frameworkDiscoverySeedBasis()],
          page: pageInfo(
            inquiry,
            page.rows.length,
            recipes.length,
            limit,
            page.nextOffset,
          ),
        },
      );
    }

    if (projection === "anchors") {
      const page = pageRows(anchors, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${anchors.length} framework seed anchor(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            anchors: page.rows,
          },
          basis: [
            frameworkDiscoverySeedBasis(),
            sourceIndexBasis(sourceProject),
          ],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForAnchorResolution),
          page: pageInfo(
            inquiry,
            page.rows.length,
            anchors.length,
            limit,
            page.nextOffset,
          ),
          continuations: anchorContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "flow-seeds") {
      const page = pageRows(flowSeeds, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${flowSeeds.length} framework flow seed row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            flowSeeds: page.rows,
          },
          basis: [
            frameworkDiscoverySeedBasis(),
            sourceIndexBasis(sourceProject),
          ],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForFlowSeed),
          page: pageInfo(
            inquiry,
            page.rows.length,
            flowSeeds.length,
            limit,
            page.nextOffset,
          ),
          continuations: flowSeedContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "call-edges") {
      const index = readFrameworkDiscoveryIndex(sourceProject);
      const callEdges = index.flowCallEdges.filter((row) =>
        callEdgeMatches(row, filters),
      );
      const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
      const page = pageRows(callEdges, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${callEdges.length} framework flow call-edge row(s).`,
        {
          value: {
            seedVersion: index.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution: fullAnchorResolution,
            callEdges: page.rows,
          },
          basis: [
            frameworkDiscoverySeedBasis(),
            sourceIndexBasis(sourceProject),
            checkerBasis(sourceProject),
          ],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForCallEdge),
          page: pageInfo(
            inquiry,
            page.rows.length,
            callEdges.length,
            limit,
            page.nextOffset,
          ),
          continuations: callEdgeContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "call-sites") {
      const index = readFrameworkDiscoveryIndex(sourceProject);
      const callSites = index.flowCallSites.filter((row) =>
        callSiteMatches(row, filters),
      );
      const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
      const page = pageRows(callSites, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${callSites.length} framework flow call-site row(s).`,
        {
          value: {
            seedVersion: index.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution: fullAnchorResolution,
            callSites: page.rows,
          },
          basis: [
            frameworkDiscoverySeedBasis(),
            sourceIndexBasis(sourceProject),
            checkerBasis(sourceProject),
          ],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForCallSite),
          page: pageInfo(
            inquiry,
            page.rows.length,
            callSites.length,
            limit,
            page.nextOffset,
          ),
          continuations: callSiteContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "call-targets") {
      const index = readFrameworkDiscoveryIndex(sourceProject);
      const callEdges = index.flowCallEdges.filter((row) =>
        callEdgeMatches(row, filters),
      );
      const callTargets = groupFrameworkFlowCallTargets(callEdges);
      const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
      const page = pageRows(callTargets, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${callTargets.length} framework flow call-target row(s).`,
        {
          value: {
            seedVersion: index.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution: fullAnchorResolution,
            callTargets: page.rows,
          },
          basis: [
            frameworkDiscoverySeedBasis(),
            sourceIndexBasis(sourceProject),
            checkerBasis(sourceProject),
          ],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForCallTarget),
          page: pageInfo(
            inquiry,
            page.rows.length,
            callTargets.length,
            limit,
            page.nextOffset,
          ),
          continuations: callTargetContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "package-exports") {
      const packageExports = readFrameworkPackageExports(
        sourceProject,
        filters,
      );
      const page = pageRows(packageExports, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${packageExports.length} Aurelia framework package export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            packageExports: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForPackageExport),
          page: pageInfo(
            inquiry,
            page.rows.length,
            packageExports.length,
            limit,
            page.nextOffset,
          ),
          continuations: packageExportContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "registry-exports") {
      const registryExports = readFrameworkRegistryExports(
        sourceProject,
        filters,
      );
      const page = pageRows(registryExports, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${registryExports.length} Aurelia framework registry export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            registryExports: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForPackageExport),
          page: pageInfo(
            inquiry,
            page.rows.length,
            registryExports.length,
            limit,
            page.nextOffset,
          ),
          continuations: packageExportContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "di-interfaces") {
      const diInterfaces = readFrameworkDiInterfaces(sourceProject, filters);
      const page = pageRows(diInterfaces, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${diInterfaces.length} Aurelia framework DI interface export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            diInterfaces: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForDiInterface),
          page: pageInfo(
            inquiry,
            page.rows.length,
            diInterfaces.length,
            limit,
            page.nextOffset,
          ),
          continuations: diInterfaceContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "resource-carriers") {
      const resourceCarriers = readFrameworkResourceCarriers(
        sourceProject,
        filters,
      );
      const page = pageRows(resourceCarriers, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${resourceCarriers.length} Aurelia framework resource carrier row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            resourceCarriers: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForResourceCarrier),
          page: pageInfo(
            inquiry,
            page.rows.length,
            resourceCarriers.length,
            limit,
            page.nextOffset,
          ),
          continuations: resourceCarrierContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "resources") {
      const resources = readFrameworkResourceExports(sourceProject, filters);
      const page = pageRows(resources, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${resources.length} Aurelia framework resource export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            resources: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForResourceExport),
          page: pageInfo(
            inquiry,
            page.rows.length,
            resources.length,
            limit,
            page.nextOffset,
          ),
          continuations: resourceExportContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "bundles") {
      const bundles = readFrameworkBundles(sourceProject, filters);
      const page = pageRows(bundles, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bundles.length} Aurelia framework bundle row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            bundles: page.rows,
          },
          basis: [
            sourceIndexBasis(sourceProject),
            checkerBasis(sourceProject),
            staticEvaluatorBasis(sourceProject),
          ],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBundle),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bundles.length,
            limit,
            page.nextOffset,
          ),
          continuations: bundleContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "syntax-products") {
      const syntaxProducts = readFrameworkSyntaxProducts(
        sourceProject,
        filters,
      );
      const page = pageRows(syntaxProducts, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${syntaxProducts.length} Aurelia framework syntax product row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            syntaxProducts: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForSyntaxProduct),
          page: pageInfo(
            inquiry,
            page.rows.length,
            syntaxProducts.length,
            limit,
            page.nextOffset,
          ),
          continuations: syntaxProductContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "instruction-slots") {
      const instructionSlots = readFrameworkInstructionSlots(
        sourceProject,
        filters,
      );
      const page = pageRows(instructionSlots, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${instructionSlots.length} Aurelia framework instruction slot row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            instructionSlots: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForInstructionSlot),
          page: pageInfo(
            inquiry,
            page.rows.length,
            instructionSlots.length,
            limit,
            page.nextOffset,
          ),
          continuations: instructionSlotContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "instruction-dispatches") {
      const instructionDispatches = readFrameworkInstructionDispatches(
        sourceProject,
        filters,
      );
      const page = pageRows(instructionDispatches, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${instructionDispatches.length} Aurelia framework instruction dispatch row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            instructionDispatches: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForInstructionDispatch),
          page: pageInfo(
            inquiry,
            page.rows.length,
            instructionDispatches.length,
            limit,
            page.nextOffset,
          ),
          continuations: instructionDispatchContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-products") {
      const bindingProducts = readFrameworkBindingProducts(
        sourceProject,
        filters,
      );
      const page = pageRows(bindingProducts, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingProducts.length} Aurelia framework binding product row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            bindingProducts: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingProduct),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingProducts.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingProductContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-admissions") {
      const bindingAdmissions = readFrameworkBindingAdmissions(
        sourceProject,
        filters,
      );
      const page = pageRows(bindingAdmissions, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingAdmissions.length} Aurelia framework binding admission row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            bindingAdmissions: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingAdmission),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingAdmissions.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingAdmissionContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-effects") {
      const bindingEffects = readFrameworkBindingEffects(
        sourceProject,
        filters,
      );
      const page = pageRows(bindingEffects, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingEffects.length} Aurelia framework binding effect row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            bindingEffects: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingEffect),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingEffects.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingEffectContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-setups") {
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      const page = pageRows(bindingSetups, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingSetups.length} Aurelia framework binding setup row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            bindingSetups: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingSetup),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingSetups.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingSetupContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "observers") {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      const page = pageRows(observers, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${observers.length} Aurelia framework observer-system export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            observers: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForObserverEntity),
          page: pageInfo(
            inquiry,
            page.rows.length,
            observers.length,
            limit,
            page.nextOffset,
          ),
          continuations: observerEntityContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "app-tasks") {
      const appTasks = readFrameworkAppTaskEntities(sourceProject, filters);
      const page = pageRows(appTasks, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${appTasks.length} Aurelia framework AppTask/lifecycle task export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            appTasks: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForAppTaskEntity),
          page: pageInfo(
            inquiry,
            page.rows.length,
            appTasks.length,
            limit,
            page.nextOffset,
          ),
          continuations: appTaskEntityContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "router-entities") {
      const routerEntities = readFrameworkRouterEntities(
        sourceProject,
        filters,
      );
      const page = pageRows(routerEntities, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${routerEntities.length} Aurelia framework router export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            routerEntities: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForRouterEntity),
          page: pageInfo(
            inquiry,
            page.rows.length,
            routerEntities.length,
            limit,
            page.nextOffset,
          ),
          continuations: routerEntityContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "expression-entities") {
      const expressionEntities = readFrameworkExpressionEntities(
        sourceProject,
        filters,
      );
      const page = pageRows(expressionEntities, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${expressionEntities.length} Aurelia framework expression/parser export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            expressionEntities: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForExpressionEntity),
          page: pageInfo(
            inquiry,
            page.rows.length,
            expressionEntities.length,
            limit,
            page.nextOffset,
          ),
          continuations: expressionEntityContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "rendering-structures") {
      const renderingStructures = readFrameworkRenderingStructures(
        sourceProject,
        filters,
      );
      const page = pageRows(renderingStructures, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${renderingStructures.length} Aurelia framework rendering/lifecycle structural export row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            renderingStructures: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForRenderingStructure),
          page: pageInfo(
            inquiry,
            page.rows.length,
            renderingStructures.length,
            limit,
            page.nextOffset,
          ),
          continuations: renderingStructureContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "open-questions") {
      const page = pageRows(
        FRAMEWORK_DISCOVERY_SEEDS.openQuestions,
        offset,
        limit,
      );
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${FRAMEWORK_DISCOVERY_SEEDS.openQuestions.length} framework discovery question(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            flowCount: flows.length,
            anchorCount: anchors.length,
            anchorResolution,
            openQuestions: page.rows,
          },
          basis: [frameworkDiscoverySeedBasis()],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map((question, questionIndex) =>
              evidenceForQuestion(question, offset + questionIndex),
            ),
          page: pageInfo(
            inquiry,
            page.rows.length,
            FRAMEWORK_DISCOVERY_SEEDS.openQuestions.length,
            limit,
            page.nextOffset,
          ),
          continuations: openQuestionContinuations(
            inquiry,
            page.nextOffset,
            limit,
          ),
        },
      );
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
        continuations: summaryContinuations(inquiry),
      },
    );
  }
}
