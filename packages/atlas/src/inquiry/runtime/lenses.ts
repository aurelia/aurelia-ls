import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  atlasContractBasis as contractBasis,
  BasisClosure,
  BasisKind,
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
import { LensId, LensStage } from "../lens.js";
import { LocusKind, RepoRootLocus } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  navigationRoute,
} from "../navigation.js";
import { createSurfaceMap, type InquirySurfaceMap } from "../surface-map.js";
import { RepoAreaStatus } from "../terrain.js";
import type {
  SourceProject,
  TypeScriptEnumRawValueRoleSelection,
} from "../../source/index.js";
import {
  ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES,
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysis,
  type AtlasSelfAnalysisOptions,
} from "./self-analysis.js";
import {
  filterAtlasSelfRecipes,
  type AtlasSelfRecipeRow,
} from "./self-recipes.js";
import {
  answerSelfEnumMappingsProjection,
  answerSelfEnumProjection,
  answerSelfEnumReferencesProjection,
  answerSelfEnumValueOccurrencesProjection,
  answerSelfEnumValueSpacesProjection,
} from "./self-enum-lenses.js";
import { answerSelfPhaseProfileProjection } from "./self-phase-profile-lenses.js";
import {
  buildSelfBaseValue,
  type SelfValue,
} from "./self-value.js";
import {
  answerSelfRowProjection,
  atlasProjectionContinuation,
  selfSourceBasis,
} from "./self-row-projection.js";
import {
  answerSelfAxisPressureProjection,
  answerSelfClassesProjection,
  answerSelfContractStringsProjection,
  answerSelfFunctionControlFlowShapesProjection,
  answerSelfFunctionShapesProjection,
  answerSelfFunctionWrappersProjection,
  answerSelfFunctionsProjection,
  answerSelfRelationshipSurfaceProjection,
  answerSelfRowSurfaceProjection,
  answerSelfSourceFilesProjection,
  answerSelfStringProjection,
  answerSelfVariablesProjection,
} from "./self-source-surface-lenses.js";
import {
  answerSelfContinuationsProjection,
  answerSelfContractsProjection,
  answerSelfModulesProjection,
  answerSelfProjectionBranchesProjection,
  answerSelfSemanticRoutesProjection,
  answerSelfSubstrateSurfacesProjection,
} from "./self-topology-lenses.js";
import {
  inquiryBooleanFilter,
  inquiryBooleanFilterOrDefault,
  inquiryNumberFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import type { InquiryWorld } from "./world.js";

/** Summary returned by the repo.terrain runtime lens. */
export interface RepoTerrainValue {
  /** Total terrain areas known to Atlas. */
  readonly totalAreas: number;
  /** Active terrain areas that currently shape semantic inquiry. */
  readonly activeAreas: number;
  /** Deferred terrain areas intentionally excluded from current semantic inquiry. */
  readonly deferredAreas: number;
  /** External terrain areas that should not be edited by Atlas work. */
  readonly externalAreas: number;
  /** Terrain rows returned by this projection. */
  readonly areas: InquiryWorld["terrain"];
}

/** Answer the repo.map lens from the static inquiry world. */
export function answerRepoMap(
  world: InquiryWorld,
  inquiry: Inquiry,
): Answer<InquirySurfaceMap> {
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    "Returned the Atlas surface map.",
    {
      value: createSurfaceMap(world),
      basis: [contractBasis("Answered from the in-memory contract world.")],
      evidence: world.evidence,
      continuations: [
        {
          id: "repo.map:terrain",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Inspect the repository terrain rows behind the surface map.",
          inquiry: {
            lens: LensId.RepoTerrain,
            locus: RepoRootLocus,
            projection: "areas",
          },
          route: navigationRoute(
            NavigationPlane.Structure,
            NavigationRelation.ProjectionOf,
            [BasisKind.AtlasContract],
            "Repository terrain rows behind the surface map.",
          ),
        },
        {
          id: "repo.map:framework-discovery",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale: "Enter the Aurelia framework discovery seeds.",
          inquiry: {
            lens: LensId.FrameworkDiscovery,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.AtlasContract],
            "Aurelia framework discovery seeds from the surface map.",
          ),
        },
        {
          id: "repo.map:framework-di",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale: "Enter the Aurelia framework DI relationship atoms.",
          inquiry: {
            lens: LensId.FrameworkDi,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework DI relationship graph.",
          ),
        },
        {
          id: "repo.map:framework-api",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Enter exact Aurelia API subjects, implementation shapes, member slots, and repo usages.",
          inquiry: {
            lens: LensId.FrameworkApi,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework API usage and shape graph.",
          ),
        },
        {
          id: "repo.map:framework-resources",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Enter Aurelia resource convergence across exports, admissions, syntax products, and materialization.",
          inquiry: {
            lens: LensId.FrameworkResources,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
            "Aurelia framework resource convergence graph.",
          ),
        },
        {
          id: "repo.map:framework-compiler",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Enter compiler instruction production before renderer consumption.",
          inquiry: {
            lens: LensId.FrameworkCompiler,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework compiler instruction-production graph.",
          ),
        },
        {
          id: "repo.map:framework-admission",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Enter configuration and bundle admissions into the Aurelia framework world.",
          inquiry: {
            lens: LensId.FrameworkAdmission,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
            "Aurelia framework configuration and bundle admission graph.",
          ),
        },
        {
          id: "repo.map:framework-materialization",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale: "Enter first-pass DI provider materialization routes.",
          inquiry: {
            lens: LensId.FrameworkMaterialization,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework DI provider materialization routes.",
          ),
        },
        {
          id: "repo.map:framework-rendering",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale: "Enter the Aurelia framework rendering graph.",
          inquiry: {
            lens: LensId.FrameworkRendering,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework rendering graph from instruction products through binding setup.",
          ),
        },
        {
          id: "repo.map:framework-lifecycle",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Enter the Aurelia framework lifecycle graph across controller, binding, and resource phases.",
          inquiry: {
            lens: LensId.FrameworkLifecycle,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework lifecycle graph from controller methods through resource and binding lifecycle surfaces.",
          ),
        },
        {
          id: "repo.map:framework-observation",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale: "Enter the Aurelia framework observation graph.",
          inquiry: {
            lens: LensId.FrameworkObservation,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework observation graph from observer entities through binding lookup and setup rows.",
          ),
        },
        {
          id: "repo.map:framework-router",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale: "Enter the Aurelia framework router architecture map.",
          inquiry: {
            lens: LensId.FrameworkRouter,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptProgram],
            "Aurelia framework router, route-context, route-tree, viewport-agent, and route-recognizer source architecture.",
          ),
        },
        {
          id: "repo.map:framework-composition",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Enter actor-centered framework composition across auLink and relationship claims.",
          inquiry: {
            lens: LensId.FrameworkComposition,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.AuLink, BasisKind.TypeScriptChecker],
            "Aurelia framework actor composition graph.",
          ),
        },
        {
          id: "repo.map:framework-capabilities",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Enter curated Aurelia capability terrain before deriving consumer-specific guidance.",
          inquiry: {
            lens: LensId.FrameworkCapabilities,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.AtlasContract],
            "Curated Aurelia capability terrain across source forms, locality, resource kinds/source support, framework effects, requirements, constraints, and evidence.",
          ),
        },
        {
          id: "repo.map:framework-corpus",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale:
            "Enter Aurelia documentation and framework test corpus pressure.",
          inquiry: {
            lens: LensId.FrameworkCorpus,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.SourceText],
            "Aurelia docs/tests corpus pressure.",
          ),
        },
        {
          id: "repo.map:workspace-architecture",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Inspect admitted workspace package topology, Aurelia entrypoint signals, and Aurelia integration surfaces.",
          inquiry: {
            lens: LensId.WorkspaceArchitecture,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Structure,
            NavigationRelation.ProjectionOf,
            [BasisKind.TypeScriptProgram],
            "Workspace topology and app-integration rows behind the surface map.",
          ),
        },
        {
          id: "repo.map:plugin-architecture",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Inspect public Aurelia plugin package surfaces that pressure app analysis.",
          inquiry: {
            lens: LensId.PluginArchitecture,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptProgram],
            "Public Aurelia plugin framework-integration surfaces behind the surface map.",
          ),
        },
        {
          id: "repo.map:product-architecture",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Enter semantic-runtime source areas, modules, declarations, and cross-area import pressure.",
          inquiry: {
            lens: LensId.ProductArchitecture,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Structure,
            NavigationRelation.ProjectionOf,
            [BasisKind.TypeScriptProgram],
            "Semantic-runtime product architecture rows behind the surface map.",
          ),
        },
        {
          id: "repo.map:self",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale: "Inspect Atlas self-maintenance source surfaces.",
          inquiry: {
            lens: LensId.AtlasSelf,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: navigationRoute(
            NavigationPlane.Maintenance,
            NavigationRelation.DiagnosticsFor,
            [BasisKind.AtlasContract],
            "Atlas self-maintenance surfaces behind the surface map.",
          ),
        },
      ],
    },
  );
}

/** Answer the repo.terrain lens from static terrain declarations. */
export function answerRepoTerrain(
  world: InquiryWorld,
  inquiry: Inquiry,
): Answer<RepoTerrainValue> {
  const value: RepoTerrainValue = {
    totalAreas: world.terrain.length,
    activeAreas: world.terrain.filter(
      (area) => area.status === RepoAreaStatus.Active,
    ).length,
    deferredAreas: world.terrain.filter(
      (area) => area.status === RepoAreaStatus.Deferred,
    ).length,
    externalAreas: world.terrain.filter(
      (area) => area.status === RepoAreaStatus.External,
    ).length,
    areas: world.terrain,
  };

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Returned ${world.terrain.length} repository terrain area(s).`,
    {
      value,
      basis: [
        contractBasis("Answered from the static repository terrain contract."),
      ],
      evidence: [
        {
          id: "repo.terrain:areas",
          kind: EvidenceKind.MaintenanceSignal,
          role: EvidenceRole.Subject,
          confidence: EvidenceConfidence.Exact,
          summary: "Repository terrain rows are static declarations in Atlas.",
        },
      ],
      continuations: [
        {
          id: "repo.terrain:map",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale: "Return to the full inquiry surface map.",
          inquiry: {
            lens: LensId.RepoMap,
            locus: RepoRootLocus,
            projection: "summary",
          },
        },
      ],
    },
  );
}

/** Answer the atlas.self lens from contract-world status. */
export function answerSelf(
  world: InquiryWorld,
  inquiry: Inquiry,
  implementedLensIds: ReadonlySet<LensId>,
  sourceProject: SourceProject,
): Answer<SelfValue> {
  return new AtlasSelfAnswerer(
    world,
    inquiry,
    implementedLensIds,
    sourceProject,
  ).answer();
}

class AtlasSelfAnswerer {
  readonly #world: InquiryWorld;
  readonly #inquiry: Inquiry;
  readonly #implementedLensIds: ReadonlySet<LensId>;
  readonly #unimplemented: readonly { readonly id: LensId }[];
  readonly #analysis: AtlasSelfAnalysis;
  readonly #value: SelfValue;

  constructor(
    world: InquiryWorld,
    inquiry: Inquiry,
    implementedLensIds: ReadonlySet<LensId>,
    sourceProject: SourceProject,
  ) {
    this.#world = world;
    this.#inquiry = inquiry;
    this.#implementedLensIds = implementedLensIds;
    this.#unimplemented = world.lenses.filter(
      (lens) =>
        lens.stage === LensStage.Contracted && !implementedLensIds.has(lens.id),
    );
    this.#analysis = readAtlasSelfAnalysis(
      sourceProject,
      atlasSelfAnalysisOptionsForInquiry(inquiry),
    );
    this.#value = buildSelfBaseValue(
      world,
      implementedLensIds,
      sourceProject,
      this.#unimplemented,
      this.#analysis,
      inquiryBooleanFilterOrDefault(inquiry, "includeSourceProject", false),
      atlasSelfValueNeedsTaxonomy(inquiry),
    );
  }

  answer(): Answer<SelfValue> {
    switch (this.#inquiry.projection ?? "summary") {
      case "recipes":
        return answerSelfRecipesProjection(this.#inquiry, this.#value);
      case "contracts":
        return answerSelfContractsProjection(
          this.#world,
          this.#inquiry,
          this.#value,
          this.#analysis,
          this.#implementedLensIds,
        );
      case "projections":
        return answerSelfProjectionBranchesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "continuations":
        return answerSelfContinuationsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "semantic-routes":
        return answerSelfSemanticRoutesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "modules":
        return answerSelfModulesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "substrate-surfaces":
        return answerSelfSubstrateSurfacesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "contract-strings":
        return answerSelfContractStringsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enums":
        return answerSelfEnumProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-references":
        return answerSelfEnumReferencesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-value-spaces":
        return answerSelfEnumValueSpacesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-value-occurrences":
        return answerSelfEnumValueOccurrencesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-mappings":
        return answerSelfEnumMappingsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "strings":
        return answerSelfStringProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "relationship-surfaces":
        return answerSelfRelationshipSurfaceProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "axis-pressure":
        return answerSelfAxisPressureProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "phase-profile":
        return answerSelfPhaseProfileProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "row-surfaces":
        return answerSelfRowSurfaceProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "classes":
        return answerSelfClassesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "source-files":
        return answerSelfSourceFilesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "functions":
        return answerSelfFunctionsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "variables":
        return answerSelfVariablesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "function-shapes":
        return answerSelfFunctionShapesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "function-control-flow-shapes":
        return answerSelfFunctionControlFlowShapesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "function-wrappers":
        return answerSelfFunctionWrappersProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "taxonomy":
        return answerSelfTaxonomyProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "summary":
      default:
        return answerSelfSummaryProjection(
          this.#world,
          this.#inquiry,
          this.#value,
          this.#analysis,
          this.#openSeams(),
        );
    }
  }

  #openSeams(): readonly OpenSeam[] {
    return selfOpenSeams(this.#unimplemented);
  }
}

function atlasSelfAnalysisOptionsForInquiry(
  inquiry: Inquiry,
): AtlasSelfAnalysisOptions {
  return {
    enumRawValueContextRoles: enumRawValueContextRolesForInquiry(inquiry),
    includeFunctionBodyAnalysis: atlasSelfProjectionNeedsFunctionBodyAnalysis(inquiry),
    includeSemanticTaxonomyAnalysis: atlasSelfProjectionNeedsSemanticTaxonomyAnalysis(inquiry),
  };
}

function atlasSelfValueNeedsTaxonomy(inquiry: Inquiry): boolean {
  const projection = inquiry.projection ?? "summary";
  return projection === "summary" || projection === "taxonomy";
}

function atlasSelfProjectionNeedsSemanticTaxonomyAnalysis(
  inquiry: Inquiry,
): boolean {
  const explicit = inquiryBooleanFilter(inquiry, "includeSemanticTaxonomyAnalysis");
  if (explicit !== undefined) {
    return explicit;
  }
  switch (inquiry.projection ?? "summary") {
    case "summary":
    case "taxonomy":
    case "contracts":
    case "projections":
    case "continuations":
    case "semantic-routes":
    case "contract-strings":
    case "enums":
    case "enum-references":
    case "enum-value-spaces":
    case "enum-value-occurrences":
    case "enum-mappings":
    case "strings":
    case "axis-pressure":
    case "phase-profile":
      return true;
    default:
      return false;
  }
}

function atlasSelfProjectionNeedsFunctionBodyAnalysis(
  inquiry: Inquiry,
): boolean {
  const explicit = inquiryBooleanFilter(inquiry, "includeFunctionBodyAnalysis");
  if (explicit !== undefined) {
    return explicit;
  }
  const projection = inquiry.projection ?? "summary";
  if (
    projection === "function-shapes" ||
    projection === "function-control-flow-shapes"
  ) {
    return true;
  }
  if (projection !== "functions") {
    return false;
  }
  const orderBy = inquiryStringFilter(inquiry, "orderBy");
  return inquiryStringFilter(inquiry, "bodyFingerprint") !== undefined ||
    inquiryStringFilter(inquiry, "bodyShapeFingerprint") !== undefined ||
    inquiryStringFilter(inquiry, "switchTopologyFingerprint") !== undefined ||
    inquiryNumberFilter(inquiry, "minSwitchTopologyCount") !== undefined ||
    orderBy === "bodyFingerprint" ||
    orderBy === "bodyShapeFingerprint" ||
    orderBy === "switchTopologyCount" ||
    orderBy === "switchTopologyFingerprint";
}

function enumRawValueContextRolesForInquiry(
  inquiry: Inquiry,
): TypeScriptEnumRawValueRoleSelection {
  const filters = inquiry.filters as Record<string, unknown> | undefined;
  if (filters?.enumContext === "all") {
    return "all";
  }
  if (filters?.enumContext === "none") {
    return "none";
  }
  if (filters?.enumContext === "standard") {
    return ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES;
  }
  const projection = inquiry.projection ?? "summary";
  if (projection === "enum-value-occurrences" && filters?.role === "call-argument") {
    return "all";
  }
  if (projection === "phase-profile") {
    const query = typeof filters?.query === "string" ? filters.query : "";
    return query.includes("call-argument") || query.includes("getResolvedSignature.call-expression")
      ? "all"
      : ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES;
  }
  return ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES;
}

function answerSelfRecipesProjection(
  inquiry: Inquiry,
  value: SelfValue,
): Answer<SelfValue> {
  const rows = filterAtlasSelfRecipes(inquiry.filters);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:recipes",
    rows,
    valueWithRows: (recipes) => ({ ...value, recipes }),
    rowNoun: "Atlas self-analysis recipe row(s)",
    basis: [
      contractBasis(
        "Returned stored self-maintenance recipes from the Atlas inquiry contract surface.",
      ),
    ],
    evidenceForRow: evidenceForRecipe,
    nextPageId: "atlas.self:recipes:next-page",
    nextPageRationale: "Continue Atlas self-analysis recipe rows.",
    inspectionForRow: () => undefined,
    extraContinuationsForPage: (inquiry) => [
      atlasProjectionContinuation(
        inquiry,
        "atlas.self:summary",
        "summary",
        "Return to Atlas self-maintenance orientation.",
      ),
    ],
  });
}
function selfOpenSeams(
  unimplemented: readonly { readonly id: LensId }[],
): readonly OpenSeam[] {
  return unimplemented.map((lens) => ({
    id: `atlas.self:lens:${lens.id}`,
    kind: OpenSeamKind.MissingLens,
    summary: `Lens ${lens.id} has a static contract but no runtime implementation yet.`,
    basis: contractBasis(
      "Observed while inspecting the in-memory lens registry.",
    ),
  }));
}

function answerSelfSummaryProjection(
  world: InquiryWorld,
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
  openSeams: readonly OpenSeam[],
): Answer<SelfValue> {
  return createAnswer(
    inquiry,
    openSeams.length === 0 ? OutcomeKind.Hit : OutcomeKind.Partial,
    `Returned Atlas self status with ${value.implementedLensIds.length} implemented lens(es), ${value.unimplementedContractedLenses} missing contracted implementation(s), and source-backed taxonomy rollup.`,
    {
      value,
      basis: [
        contractBasis(
          "Answered from the in-memory lens registry and static catalogs.",
        ),
        selfSourceBasis(
          "Read Atlas source declarations through the hot TypeScript Program.",
        ),
      ],
      evidence: [
        ...world.evidence,
        selfAnalysisEvidence(
          analysis,
          "atlas.self:taxonomy",
          "Atlas self-analysis derived enums, string literals, and relationship-like row surfaces.",
        ),
      ],
      openSeams,
      continuations: selfSummaryContinuations(inquiry),
    },
  );
}

function answerSelfTaxonomyProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    "Returned compact Atlas self taxonomy rollup.",
    {
      value,
      basis: [
        selfSourceBasis(
          "Read Atlas source declarations through the hot TypeScript Program.",
        ),
      ],
      evidence: [
        selfAnalysisEvidence(
          analysis,
          "atlas.self:taxonomy",
          "Atlas self taxonomy rollup is source-backed.",
        ),
      ],
      continuations: selfSummaryContinuations(inquiry),
    },
  );
}function selfSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:recipes",
      "recipes",
      "Use stored self-maintenance recipes when they fit the current architecture question.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:taxonomy",
      "taxonomy",
      "Inspect the compact source-backed Atlas self taxonomy rollup.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:contracts",
      "contracts",
      "Inspect lens contracts joined to runtime implementation paths.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:projections",
      "projections",
      "Inspect runtime projection branches and their owning lens paths.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:continuations",
      "continuations",
      "Inspect continuation object literals and route claims.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:semantic-routes",
      "semantic-routes",
      "Inspect declared framework semantic route topology.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:modules",
      "modules",
      "Inspect Atlas module dependency edges.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:substrate-surfaces",
      "substrate-surfaces",
      "Inspect substrate reader, builder, and schema surfaces.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:contract-strings",
      "contract-strings",
      "Inspect contract-bearing strings by class.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:enums",
      "enums",
      "Inspect enum axes and enum-member usage pressure.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:enum-references",
      "enum-references",
      "Inspect exact Enum.Member reference sites.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:enum-value-spaces",
      "enum-value-spaces",
      "Inspect enum member value spaces and raw literal overlap.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:enum-value-occurrences",
      "enum-value-occurrences",
      "Inspect exact raw literal occurrences whose values overlap enum members.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:enum-mappings",
      "enum-mappings",
      "Inspect exact enum-to-enum translation edges.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:strings",
      "strings",
      "Inspect grouped magic string literal pressure.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:relationship-surfaces",
      "relationship-surfaces",
      "Inspect relationship-like row surfaces and their axis fields.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:axis-pressure",
      "axis-pressure",
      "Inspect exact enum, mapper, stringly-field, and parallel-axis pressure rows.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:phase-profile",
      "phase-profile",
      "Inspect measured self-analysis phase costs before cache or split work.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:row-surfaces",
      "row-surfaces",
      "Inspect structural row/interface/type surfaces without treating every row as a relationship.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:classes",
      "classes",
      "Inspect class, method, field, heritage, and constructor surfaces.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:functions",
      "functions",
      "Inspect top-level function and class-method surfaces.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:variables",
      "variables",
      "Inspect top-level variable declarations and initializer shapes.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:function-shapes",
      "function-shapes",
      "Inspect repeated canonical function body-shape groups across helper names.",
    ),
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:function-wrappers",
      "function-wrappers",
      "Inspect shallow constructor/call wrappers with local incoming-call counts.",
    ),
    {
      id: "atlas.self:map",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Return to the full inquiry surface map.",
      inquiry: {
        lens: LensId.RepoMap,
        locus: RepoRootLocus,
        projection: "summary",
      },
      route: navigationRoute(
        NavigationPlane.Structure,
        NavigationRelation.ProjectionOf,
        [BasisKind.AtlasContract],
        "Return from Atlas self-maintenance to the surface map.",
      ),
    },
  ];
}

function evidenceForRecipe(row: AtlasSelfRecipeRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.question,
    basis: contractBasis(
      "Atlas self-maintenance recipes are declared inquiry contract rows.",
    ),
    data: row,
  };
}

function selfAnalysisEvidence(
  analysis: AtlasSelfAnalysis,
  id: string,
  summary: string,
): Evidence {
  return {
    id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary,
    basis: selfSourceBasis(
      "Atlas self-analysis was derived from the hot TypeScript Program.",
    ),
    data: {
      version: analysis.version,
      sourceFileCount: analysis.sourceFileCount,
      rollup: analysis.rollup,
    },
  };
}

/** Build an unsupported answer for cataloged lenses without runtime implementation. */
export function answerUnimplementedLens(
  world: InquiryWorld,
  inquiry: Inquiry,
): Answer {
  const spec = world.lenses.find((lens) => lens.id === inquiry.lens);
  const requiredSubstrates = spec?.requiredSubstrates ?? [];

  return createAnswer(
    inquiry,
    OutcomeKind.Unsupported,
    `Lens ${inquiry.lens} is cataloged but not implemented yet.`,
    {
      basis: [
        {
          kind: BasisKind.Unsupported,
          closure: BasisClosure.Unsupported,
          summary:
            "This lens is part of the inquiry catalog but does not have a runtime implementation yet.",
          limitations: [
            `Required substrates: ${requiredSubstrates.join(", ")}`,
          ],
        },
      ],
      openSeams: [
        {
          kind: OpenSeamKind.MissingLens,
          summary: `Implement lens ${inquiry.lens} against the inquiry runtime contracts.`,
        },
      ],
      continuations: [
        {
          id: `${inquiry.lens}:map`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale:
            "Return to the implemented surface map while choosing the next lens to implement.",
          inquiry: {
            lens: LensId.RepoMap,
            locus: RepoRootLocus,
            projection: "summary",
          },
        },
      ],
    },
  );
}

/** Return true when the selected locus is rooted at the whole repo or one terrain area. */
export function isRepoLikeLocus(kind: LocusKind): boolean {
  return (
    kind === LocusKind.Repo ||
    kind === LocusKind.RepoArea ||
    kind === LocusKind.Package
  );
}
