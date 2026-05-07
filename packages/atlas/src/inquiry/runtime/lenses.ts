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
import { LensFamily, LensId, LensStage } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset } from "../paging.js";
import { createSurfaceMap, type InquirySurfaceMap } from "../surface-map.js";
import { RepoAreaStatus } from "../terrain.js";
import type {
  SourceProject,
  SourceProjectSummary,
} from "../../source/index.js";
import {
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysis,
  type AtlasSelfAxisPressureRow,
  type AtlasSelfClassSurfaceRow,
  type AtlasSelfContractStringRow,
  type AtlasSelfContinuationRow,
  type AtlasSelfEnumMappingRow,
  type AtlasSelfEnumReferenceRow,
  type AtlasSelfEnumRow,
  type AtlasSelfEnumValueSpaceRow,
  type AtlasSelfFunctionSurfaceRow,
  type AtlasSelfSubstrateSurfaceRow,
  type AtlasSelfModuleDependencyRow,
  type AtlasSelfProjectionBranchRow,
  type AtlasSelfRelationshipSurfaceRow,
  type AtlasSelfRowSurfaceRow,
  type AtlasSelfSemanticRouteRow,
  type AtlasSelfStringLiteralRow,
} from "./self-analysis.js";
import {
  filterAtlasSelfRecipes,
  type AtlasSelfRecipeRow,
} from "./self-recipes.js";
import {
  SelfContractReader,
  type SelfContractRow,
} from "./self-contracts.js";
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

/** Summary returned by the atlas.self runtime lens. */
export interface SelfValue {
  /** Lens count grouped by implementation stage. */
  readonly lensesByStage: Readonly<Record<LensStage, number>>;
  /** Lens count grouped by broad family. */
  readonly lensesByFamily: Readonly<Record<LensFamily, number>>;
  /** Number of substrate contracts in the world. */
  readonly substrateContracts: number;
  /** Number of vocabulary definitions in the world. */
  readonly vocabularyDefinitions: number;
  /** Number of declared navigation route specs in the world. */
  readonly navigationRoutes: number;
  /** Number of contracted lenses without runtime implementations. */
  readonly unimplementedContractedLenses: number;
  /** Compact source project rollup held by the runtime substrate context. */
  readonly sourceProjectRollup: SourceProjectRollup;
  /** Full hot source project summary; omitted unless the caller asks for full source project details. */
  readonly sourceProject?: SourceProjectSummary;
  /** Runtime-implemented lens ids observed by the engine. */
  readonly implementedLensIds: readonly LensId[];
  /** Contracted lens ids that still need runtime implementations. */
  readonly unimplementedLensIds: readonly LensId[];
  /** Source-backed Atlas taxonomy rollup when requested or useful for orientation. */
  readonly taxonomy?: SelfTaxonomyValue;
  /** Calibrated hop graphs for using Atlas to analyze and evolve Atlas itself. */
  readonly recipes?: readonly AtlasSelfRecipeRow[];
  /** Enum declaration rows for enum/taxonomy projections. */
  readonly enums?: readonly AtlasSelfEnumRow[];
  /** Exact Enum.Member reference rows. */
  readonly enumReferences?: readonly AtlasSelfEnumReferenceRow[];
  /** Enum value-space overlap rows. */
  readonly enumValueSpaces?: readonly AtlasSelfEnumValueSpaceRow[];
  /** Exact enum-to-enum mapping rows. */
  readonly enumMappings?: readonly AtlasSelfEnumMappingRow[];
  /** Grouped string literal rows for magic-string projections. */
  readonly strings?: readonly AtlasSelfStringLiteralRow[];
  /** Relationship-like row/interface surfaces discovered in Atlas source. */
  readonly relationshipSurfaces?: readonly AtlasSelfRelationshipSurfaceRow[];
  /** Structural row/interface/type surfaces discovered in Atlas source. */
  readonly rowSurfaces?: readonly AtlasSelfRowSurfaceRow[];
  /** Class declaration surfaces discovered in Atlas source. */
  readonly classSurfaces?: readonly AtlasSelfClassSurfaceRow[];
  /** Function and method declaration surfaces discovered in Atlas source. */
  readonly functionSurfaces?: readonly AtlasSelfFunctionSurfaceRow[];
  /** Lens contract rows joined to runtime implementation paths. */
  readonly contracts?: readonly SelfContractRow[];
  /** Runtime projection branches observed in source. */
  readonly projectionBranches?: readonly AtlasSelfProjectionBranchRow[];
  /** Continuation object literals observed in source. */
  readonly continuationRows?: readonly AtlasSelfContinuationRow[];
  /** Declared framework semantic route topology rows. */
  readonly semanticRoutes?: readonly AtlasSelfSemanticRouteRow[];
  /** Relative module dependency rows. */
  readonly moduleDependencies?: readonly AtlasSelfModuleDependencyRow[];
  /** Substrate reader, builder, and schema surface rows. */
  readonly substrateSurfaces?: readonly AtlasSelfSubstrateSurfaceRow[];
  /** Contract-bearing string rows. */
  readonly contractStrings?: readonly AtlasSelfContractStringRow[];
  /** Exact axis/mapping/stringly-surface pressure rows. */
  readonly axisPressure?: readonly AtlasSelfAxisPressureRow[];
}

/** Compact source project summary without per-package rows. */
export type SourceProjectRollup = Omit<SourceProjectSummary, "packages">;

/** Compact source-backed self taxonomy attached to atlas.self answers. */
export interface SelfTaxonomyValue {
  /** Self-analysis schema marker. */
  readonly version: AtlasSelfAnalysis["version"];
  /** Analyzed Atlas source files. */
  readonly sourceFileCount: number;
  /** Stable rollup counts for enum/string/relationship-source surfaces. */
  readonly rollup: AtlasSelfAnalysis["rollup"];
  /** Pressure signals that should guide future cleanup without claiming semantic bugs. */
  readonly pressure: {
    readonly unreferencedEnumMembers: number;
    readonly enumReferences: number;
    readonly enumValueSpaces: number;
    readonly enumMappings: number;
    readonly enumLiteralReuses: number;
    readonly magicStringValues: number;
    readonly relationshipSurfacesWithoutSourceField: number;
    readonly relationshipSurfacesWithoutRelationAxis: number;
    readonly rowSurfacesWithoutSourceField: number;
    readonly axisPressureRows: number;
  };
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
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
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.TypeScriptChecker],
            "Aurelia framework observation graph from observer entities through binding lookup and setup rows.",
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
          route: route(
            NavigationPlane.Semantic,
            NavigationRelation.FrameworkFlowOf,
            [BasisKind.AuLink, BasisKind.TypeScriptChecker],
            "Aurelia framework actor composition graph.",
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
          route: route(
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
          route: route(
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
    this.#analysis = readAtlasSelfAnalysis(sourceProject);
    this.#value = selfBaseValue(
      world,
      implementedLensIds,
      sourceProject,
      this.#unimplemented,
      this.#analysis,
      booleanFilter(inquiry, "includeSourceProject", false),
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
      case "functions":
        return answerSelfFunctionsProjection(
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
      projectionContinuation(
        inquiry,
        "atlas.self:summary",
        "summary",
        "Return to Atlas self-maintenance orientation.",
      ),
    ],
  });
}

function selfBaseValue(
  world: InquiryWorld,
  implementedLensIds: ReadonlySet<LensId>,
  sourceProject: SourceProject,
  unimplemented: readonly { readonly id: LensId }[],
  analysis: AtlasSelfAnalysis,
  includeSourceProject: boolean,
): SelfValue {
  const sourceProjectSummary = sourceProject.snapshot().summary;
  return {
    lensesByStage: countByEnum(
      world.lenses.map((lens) => lens.stage),
      [
        LensStage.Implemented,
        LensStage.Contracted,
        LensStage.Planned,
        LensStage.Deprecated,
      ],
    ),
    lensesByFamily: countByEnum(
      world.lenses.map((lens) => lens.family),
      [
        LensFamily.Repo,
        LensFamily.TypeScript,
        LensFamily.Product,
        LensFamily.Framework,
        LensFamily.Bridge,
        LensFamily.Atlas,
      ],
    ),
    substrateContracts: world.substrates.length,
    vocabularyDefinitions: world.vocabulary.length,
    navigationRoutes: world.navigation.routes.length,
    unimplementedContractedLenses: unimplemented.length,
    sourceProjectRollup: sourceProjectRollup(sourceProjectSummary),
    ...(includeSourceProject ? { sourceProject: sourceProjectSummary } : {}),
    implementedLensIds: [...implementedLensIds],
    unimplementedLensIds: unimplemented.map((lens) => lens.id),
    taxonomy: selfTaxonomyValue(analysis),
  };
}

function sourceProjectRollup(
  summary: SourceProjectSummary,
): SourceProjectRollup {
  const { packages: _packages, ...rollup } = summary;
  return rollup;
}

function selfTaxonomyValue(
  analysis: AtlasSelfAnalysis,
): SelfTaxonomyValue {
  return {
    version: analysis.version,
    sourceFileCount: analysis.sourceFileCount,
    rollup: analysis.rollup,
    pressure: {
      unreferencedEnumMembers: analysis.rollup.unreferencedEnumMemberCount,
      enumReferences: analysis.rollup.enumReferenceCount,
      enumValueSpaces: analysis.rollup.enumValueSpaceCount,
      enumMappings: analysis.rollup.enumMappingCount,
      enumLiteralReuses: analysis.enums.reduce(
        (sum, row) => sum + row.literalReuseCount,
        0,
      ),
      magicStringValues: analysis.rollup.magicStringValueCount,
      relationshipSurfacesWithoutSourceField:
        analysis.relationshipSurfaces.filter((row) => !row.hasSource).length,
      relationshipSurfacesWithoutRelationAxis:
        analysis.relationshipSurfaces.filter((row) => !row.hasRelation).length,
      rowSurfacesWithoutSourceField: analysis.rowSurfaces.filter(
        (row) => !row.hasSource,
      ).length,
      axisPressureRows: analysis.rollup.axisPressureCount,
    },
  };
}

function selfContractRows(
  world: InquiryWorld,
  analysis: AtlasSelfAnalysis,
  implementedLensIds: ReadonlySet<LensId>,
): readonly SelfContractRow[] {
  return new SelfContractReader(
    world.lenses,
    analysis,
    implementedLensIds,
  ).rows();
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
}

function answerSelfContractsProjection(
  world: InquiryWorld,
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
  implementedLensIds: ReadonlySet<LensId>,
): Answer<SelfValue> {
  const rows = filterContracts(
    selfContractRows(world, analysis, implementedLensIds),
    inquiry,
  );
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:contracts",
    rows,
    valueWithRows: (contracts) => ({ ...value, contracts }),
    rowNoun: "Atlas lens contract coherence row(s)",
    basis: [
      contractBasis("Read declared lens contracts from the in-memory world."),
      selfSourceBasis(
        "Joined lens contracts to runtime implementation source paths through the hot TypeScript Program.",
      ),
    ],
    evidenceForRow: evidenceForContract,
    nextPageId: "atlas.self:contracts:next-page",
    nextPageRationale: "Continue Atlas lens contract rows.",
    inspectionForRow: contractContinuationSubjects,
  });
}

function contractContinuationSubjects(
  row: SelfContractRow,
): readonly {
  readonly id: string;
  readonly source?: SourceRange;
  readonly summary: string;
}[] {
  return [
    {
      id: row.id,
      source: row.source,
      summary: `Inspect runtime implementation for ${row.lensId}.`,
    },
    ...row.coherenceFacts.map((fact) => ({
      id: fact.id,
      source: fact.source,
      summary: `Inspect source for ${fact.dimension} coherence fact on ${row.lensId}.`,
    })),
  ];
}

interface SelfRowInspectionSubject {
  readonly id: string;
  readonly source?: SourceRange;
  readonly summary: string;
}

interface SelfRowProjectionOptions<TRow> {
  readonly familyId: string;
  readonly rows: readonly TRow[];
  readonly valueWithRows: (rows: readonly TRow[]) => SelfValue;
  readonly rowNoun: string;
  readonly basis?: readonly Basis[];
  readonly basisSummary?: string;
  readonly evidenceForRow: (row: TRow) => Evidence;
  readonly nextPageId: string;
  readonly nextPageRationale: string;
  readonly inspectionForRow: (
    row: TRow,
  ) =>
    | SelfRowInspectionSubject
    | readonly SelfRowInspectionSubject[]
    | undefined;
  readonly extraContinuationsForPage?: (
    inquiry: Inquiry,
    rows: readonly TRow[],
    nextOffset: number | undefined,
    limit: number,
  ) => readonly Continuation[];
}

function answerSelfRowProjection<TRow>(
  inquiry: Inquiry,
  options: SelfRowProjectionOptions<TRow>,
): Answer<SelfValue> {
  const limit = rowLimit(inquiry);
  const rowFamily = new PagedRowFamily<TRow>({
    id: options.familyId,
    rowLabel: options.rowNoun,
    evidenceForRow: options.evidenceForRow,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...selfRowContinuations(
        inquiry,
        rows.flatMap((row) => {
          const subjects = options.inspectionForRow(row);
          if (subjects === undefined) {
            return [];
          }
          return Array.isArray(subjects) ? subjects : [subjects];
        }),
        nextOffset,
        limit,
        options.nextPageId,
        options.nextPageRationale,
      ),
      ...(options.extraContinuationsForPage?.(
        inquiry,
        rows,
        nextOffset,
        limit,
      ) ?? []),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows: options.rows,
    limit,
    offset: pageOffset(inquiry),
    basis:
      options.basis ??
      [
        selfSourceBasis(
          options.basisSummary ??
            "Read Atlas self-analysis rows through the hot TypeScript Program.",
        ),
      ],
    value: (page) => options.valueWithRows(page.rows),
  });
}

function answerSelfProjectionBranchesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterProjectionBranches(analysis.projectionBranches, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:projections",
    rows,
    valueWithRows: (pageRows) => ({ ...value, projectionBranches: pageRows }),
    rowNoun: "Atlas projection branch row(s)",
    basisSummary:
      "Read runtime projection branches through the hot TypeScript Program.",
    evidenceForRow: evidenceForProjectionBranch,
    nextPageId: "atlas.self:projections:next-page",
    nextPageRationale: "Continue Atlas projection branch rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect projection branch ${row.projection} in ${row.functionName}.`,
    }),
  });
}

function answerSelfContinuationsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterContinuations(analysis.continuations, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:continuations",
    rows,
    valueWithRows: (pageRows) => ({ ...value, continuationRows: pageRows }),
    rowNoun: "Atlas continuation row(s)",
    basisSummary:
      "Read continuation object literals through the hot TypeScript Program.",
    evidenceForRow: evidenceForContinuation,
    nextPageId: "atlas.self:continuations:next-page",
    nextPageRationale: "Continue Atlas continuation rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect continuation ${row.continuationId ?? row.id}.`,
    }),
  });
}

function answerSelfSemanticRoutesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterSemanticRoutes(analysis.semanticRoutes, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:semantic-routes",
    rows,
    valueWithRows: (pageRows) => ({ ...value, semanticRoutes: pageRows }),
    rowNoun: "declared framework semantic route row(s)",
    basisSummary:
      "Read declared framework semantic route topology from Atlas route catalog source.",
    evidenceForRow: evidenceForSemanticRoute,
    nextPageId: "atlas.self:semantic-routes:next-page",
    nextPageRationale: "Continue declared framework semantic route rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect semantic route ${row.semanticRouteId}.`,
    }),
  });
}

function answerSelfModulesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterModules(analysis.moduleDependencies, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:modules",
    rows,
    valueWithRows: (pageRows) => ({ ...value, moduleDependencies: pageRows }),
    rowNoun: "Atlas module dependency row(s)",
    basisSummary:
      "Read relative import/export edges through the hot TypeScript Program.",
    evidenceForRow: evidenceForModuleDependency,
    nextPageId: "atlas.self:modules:next-page",
    nextPageRationale: "Continue Atlas module dependency rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect module dependency ${row.moduleSpecifier}.`,
    }),
  });
}

function answerSelfSubstrateSurfacesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterSubstrateSurfaces(analysis.substrateSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:substrate-surfaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, substrateSurfaces: pageRows }),
    rowNoun: "Atlas substrate surface row(s)",
    basisSummary:
      "Read substrate reader, builder, and schema declarations through the hot TypeScript Program.",
    evidenceForRow: evidenceForSubstrateSurface,
    nextPageId: "atlas.self:substrate-surfaces:next-page",
    nextPageRationale: "Continue Atlas substrate surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect substrate surface ${row.name}.`,
    }),
  });
}

function answerSelfContractStringsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterContractStrings(analysis.contractStrings, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:contract-strings",
    rows,
    valueWithRows: (pageRows) => ({ ...value, contractStrings: pageRows }),
    rowNoun: "Atlas contract string row(s)",
    basisSummary:
      "Classified contract-bearing string literals through the hot TypeScript Program.",
    evidenceForRow: evidenceForContractString,
    nextPageId: "atlas.self:contract-strings:next-page",
    nextPageRationale: "Continue Atlas contract string rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.firstSource,
      summary: `Inspect contract string ${JSON.stringify(row.value)}.`,
    }),
  });
}

function answerSelfEnumProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterEnums(analysis.enums, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enums",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enums: pageRows }),
    rowNoun: "Atlas enum declaration row(s)",
    basisSummary:
      "Read enum declarations and Enum.Member references through the hot TypeScript Program.",
    evidenceForRow: evidenceForEnum,
    nextPageId: "atlas.self:enums:next-page",
    nextPageRationale: "Continue Atlas enum declaration rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect enum ${row.name}.`,
    }),
  });
}

function answerSelfEnumReferencesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterEnumReferences(analysis.enumReferences, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-references",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enumReferences: pageRows }),
    rowNoun: "Atlas enum reference row(s)",
    basisSummary:
      "Read exact Enum.Member reference sites through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumReference,
    nextPageId: "atlas.self:enum-references:next-page",
    nextPageRationale: "Continue Atlas enum reference rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect enum reference ${row.enumName}.${row.memberName}.`,
    }),
  });
}

function answerSelfEnumValueSpacesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterEnumValueSpaces(analysis.enumValueSpaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-value-spaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enumValueSpaces: pageRows }),
    rowNoun: "Atlas enum value-space row(s)",
    basisSummary:
      "Read enum member values and raw literal overlaps through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumValueSpace,
    nextPageId: "atlas.self:enum-value-spaces:next-page",
    nextPageRationale: "Continue Atlas enum value-space rows.",
    inspectionForRow: (row) =>
      row.firstSource === undefined
        ? undefined
        : {
            id: row.id,
            source: row.firstSource,
            summary: `Inspect first raw value occurrence for ${JSON.stringify(row.value)}.`,
          },
  });
}

function answerSelfEnumMappingsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterEnumMappings(analysis.enumMappings, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-mappings",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enumMappings: pageRows }),
    rowNoun: "Atlas enum mapping row(s)",
    basisSummary:
      "Read exact enum-to-enum translation evidence through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumMapping,
    nextPageId: "atlas.self:enum-mappings:next-page",
    nextPageRationale: "Continue Atlas enum mapping rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect enum mapping ${row.fromEnumName}.${row.fromMemberName} to ${row.toEnumName}.${row.toMemberName}.`,
    }),
  });
}

function answerSelfStringProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterStrings(analysis.strings, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:strings",
    rows,
    valueWithRows: (pageRows) => ({ ...value, strings: pageRows }),
    rowNoun: "Atlas string literal row(s)",
    basisSummary:
      "Read string literal occurrences through the hot TypeScript Program.",
    evidenceForRow: evidenceForStringLiteral,
    nextPageId: "atlas.self:strings:next-page",
    nextPageRationale: "Continue Atlas string literal rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.firstSource,
      summary: `Inspect first occurrence of string literal ${JSON.stringify(
        row.value,
      )}.`,
    }),
  });
}

function answerSelfRelationshipSurfaceProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  return answerSelfRelationshipRows(
    inquiry,
    value,
    filterRelationshipSurfaces(analysis.relationshipSurfaces, inquiry),
  );
}

function answerSelfRowSurfaceProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterRowSurfaces(analysis.rowSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:row-surfaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, rowSurfaces: pageRows }),
    rowNoun: "Atlas row surface row(s)",
    basisSummary:
      "Read structural interface/type row surfaces through the hot TypeScript Program.",
    evidenceForRow: evidenceForRowSurface,
    nextPageId: "atlas.self:row-surfaces:next-page",
    nextPageRationale: "Continue Atlas row surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect row surface ${row.name}.`,
    }),
  });
}

function answerSelfClassesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterClassSurfaces(analysis.classSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:classes",
    rows,
    valueWithRows: (pageRows) => ({ ...value, classSurfaces: pageRows }),
    rowNoun: "Atlas class surface row(s)",
    basisSummary:
      "Read class declarations, methods, fields, heritage, and constructor surfaces through the hot TypeScript Program.",
    evidenceForRow: evidenceForClassSurface,
    nextPageId: "atlas.self:classes:next-page",
    nextPageRationale: "Continue Atlas class surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect class surface ${row.name}.`,
    }),
  });
}

function answerSelfFunctionsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterFunctionSurfaces(analysis.functionSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:functions",
    rows,
    valueWithRows: (pageRows) => ({ ...value, functionSurfaces: pageRows }),
    rowNoun: "Atlas function surface row(s)",
    basisSummary:
      "Read top-level function and class-method declarations through the hot TypeScript Program.",
    evidenceForRow: evidenceForFunctionSurface,
    nextPageId: "atlas.self:functions:next-page",
    nextPageRationale: "Continue Atlas function surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect function surface ${row.name}.`,
    }),
  });
}

function answerSelfRelationshipRows(
  inquiry: Inquiry,
  value: SelfValue,
  rows: readonly AtlasSelfRelationshipSurfaceRow[],
): Answer<SelfValue> {
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:relationship-surfaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, relationshipSurfaces: pageRows }),
    rowNoun: "Atlas relationship surface row(s)",
    basisSummary:
      "Read relationship-like interface/type surfaces through the hot TypeScript Program.",
    evidenceForRow: evidenceForRelationshipSurface,
    nextPageId: "atlas.self:relationship-surfaces:next-page",
    nextPageRationale: "Continue Atlas relationship surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect relationship surface ${row.name}.`,
    }),
  });
}

function answerSelfAxisPressureProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAxisPressure(analysis.axisPressure, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:axis-pressure",
    rows,
    valueWithRows: (pageRows) => ({ ...value, axisPressure: pageRows }),
    rowNoun: "Atlas axis pressure row(s)",
    basisSummary:
      "Read axis, mapper, and stringly-surface pressure through the hot TypeScript Program.",
    evidenceForRow: evidenceForAxisPressure,
    nextPageId: "atlas.self:axis-pressure:next-page",
    nextPageRationale: "Continue Atlas axis pressure rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect axis pressure ${row.sourceName}.`,
    }),
  });
}

function selfSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "atlas.self:recipes",
      "recipes",
      "Use stored self-maintenance recipes when they fit the current architecture question.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:taxonomy",
      "taxonomy",
      "Inspect the compact source-backed Atlas self taxonomy rollup.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:contracts",
      "contracts",
      "Inspect lens contracts joined to runtime implementation paths.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:projections",
      "projections",
      "Inspect runtime projection branches and their owning lens paths.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:continuations",
      "continuations",
      "Inspect continuation object literals and route claims.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:semantic-routes",
      "semantic-routes",
      "Inspect declared framework semantic route topology.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:modules",
      "modules",
      "Inspect Atlas module dependency edges.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:substrate-surfaces",
      "substrate-surfaces",
      "Inspect substrate reader, builder, and schema surfaces.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:contract-strings",
      "contract-strings",
      "Inspect contract-bearing strings by class.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:enums",
      "enums",
      "Inspect enum axes and enum-member usage pressure.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:enum-references",
      "enum-references",
      "Inspect exact Enum.Member reference sites.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:enum-value-spaces",
      "enum-value-spaces",
      "Inspect enum member value spaces and raw literal overlap.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:enum-mappings",
      "enum-mappings",
      "Inspect exact enum-to-enum translation edges.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:strings",
      "strings",
      "Inspect grouped magic string literal pressure.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:relationship-surfaces",
      "relationship-surfaces",
      "Inspect relationship-like row surfaces and their axis fields.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:axis-pressure",
      "axis-pressure",
      "Inspect exact enum, mapper, stringly-field, and parallel-axis pressure rows.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:row-surfaces",
      "row-surfaces",
      "Inspect structural row/interface/type surfaces without treating every row as a relationship.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:classes",
      "classes",
      "Inspect class, method, field, heritage, and constructor surfaces.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:functions",
      "functions",
      "Inspect top-level function and class-method surfaces.",
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
      route: route(
        NavigationPlane.Structure,
        NavigationRelation.ProjectionOf,
        [BasisKind.AtlasContract],
        "Return from Atlas self-maintenance to the surface map.",
      ),
    },
  ];
}

function selfRowContinuations(
  inquiry: Inquiry,
  rows: readonly {
    readonly id: string;
    readonly source?: SourceRange;
    readonly summary: string;
  }[],
  nextOffset: number | undefined,
  limit: number,
  nextPageId: string,
  nextPageRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        nextPageId,
        nextPageRationale,
        nextOffset,
        limit,
      ),
    );
  }
  for (const row of rows.filter((entry) => entry.source !== undefined).slice(0, 3)) {
    if (row.source === undefined) {
      continue;
    }
    continuations.push(
      sourceInspectionContinuation(`${row.id}:source`, row.summary, row.source),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "atlas.self:taxonomy",
      "taxonomy",
      "Return to the compact self-taxonomy rollup.",
    ),
  );
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
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: route(
      NavigationPlane.Addressing,
      NavigationRelation.ProjectionOf,
      [BasisKind.TypeScriptProgram, BasisKind.AtlasContract],
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
      [BasisKind.TypeScriptProgram],
      rationale,
    ),
  };
}

function sourceInspectionContinuation(
  id: string,
  rationale: string,
  source: SourceRange,
): Continuation {
  return {
    id,
    kind: ContinuationKind.InspectEvidence,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      lens: LensId.TsSource,
      locus: {
        kind: LocusKind.SourceRange,
        range: source,
      },
      projection: "text",
    },
    route: route(
      NavigationPlane.Inspection,
      NavigationRelation.SourceFor,
      [BasisKind.TypeScriptProgram],
      "Inspect source behind Atlas self-analysis row.",
    ),
  };
}

function filterEnums(
  rows: readonly AtlasSelfEnumRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumRow[] {
  const packageId = stringFilter(inquiry, "packageId");
  const enumName = stringFilter(inquiry, "enumName");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (enumName !== undefined && row.name !== enumName) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.packageId.toLowerCase().includes(query) ||
      row.source.filePath.toLowerCase().includes(query) ||
      row.members.some(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          String(member.value ?? "")
            .toLowerCase()
            .includes(query),
      )
    );
  });
}

function filterEnumReferences(
  rows: readonly AtlasSelfEnumReferenceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumReferenceRow[] {
  const enumName = stringFilter(inquiry, "enumName");
  const memberName = stringFilter(inquiry, "memberName");
  const role = stringFilter(inquiry, "role");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (enumName !== undefined && row.enumName !== enumName) {
      return false;
    }
    if (memberName !== undefined && row.memberName !== memberName) {
      return false;
    }
    if (role !== undefined && row.role !== role) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.enumName.toLowerCase().includes(query) ||
      row.memberName.toLowerCase().includes(query) ||
      row.role.toLowerCase().includes(query) ||
      row.expressionText.toLowerCase().includes(query) ||
      (row.containingFunction?.toLowerCase().includes(query) ?? false) ||
      (row.containingClass?.toLowerCase().includes(query) ?? false) ||
      row.source.filePath.toLowerCase().includes(query)
    );
  });
}

function filterEnumValueSpaces(
  rows: readonly AtlasSelfEnumValueSpaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumValueSpaceRow[] {
  const enumName = stringFilter(inquiry, "enumName");
  const memberName = stringFilter(inquiry, "memberName");
  const value = stringFilter(inquiry, "value");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (enumName !== undefined && !row.enumNames.includes(enumName)) {
      return false;
    }
    if (
      memberName !== undefined &&
      !row.memberNames.some((name) => name.endsWith(`.${memberName}`))
    ) {
      return false;
    }
    if (value !== undefined && String(row.value) !== value) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      String(row.value).toLowerCase().includes(query) ||
      row.enumNames.some((name) => name.toLowerCase().includes(query)) ||
      row.memberNames.some((name) => name.toLowerCase().includes(query)) ||
      row.sourceFiles.some((file) => file.toLowerCase().includes(query))
    );
  });
}

function filterEnumMappings(
  rows: readonly AtlasSelfEnumMappingRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumMappingRow[] {
  const enumName = stringFilter(inquiry, "enumName");
  const fromEnum = stringFilter(inquiry, "fromEnum");
  const toEnum = stringFilter(inquiry, "toEnum");
  const memberName = stringFilter(inquiry, "memberName");
  const carrier = stringFilter(inquiry, "carrier");
  const relation = stringFilter(inquiry, "enumRelation");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (
      enumName !== undefined &&
      row.fromEnumName !== enumName &&
      row.toEnumName !== enumName
    ) {
      return false;
    }
    if (fromEnum !== undefined && row.fromEnumName !== fromEnum) {
      return false;
    }
    if (toEnum !== undefined && row.toEnumName !== toEnum) {
      return false;
    }
    if (
      memberName !== undefined &&
      row.fromMemberName !== memberName &&
      row.toMemberName !== memberName
    ) {
      return false;
    }
    if (carrier !== undefined && row.carrier !== carrier) {
      return false;
    }
    if (relation !== undefined && row.relation !== relation) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.fromEnumName.toLowerCase().includes(query) ||
      row.fromMemberName.toLowerCase().includes(query) ||
      row.toEnumName.toLowerCase().includes(query) ||
      row.toMemberName.toLowerCase().includes(query) ||
      row.carrier.toLowerCase().includes(query) ||
      row.relation.toLowerCase().includes(query) ||
      row.evidence.toLowerCase().includes(query) ||
      row.expressionText.toLowerCase().includes(query) ||
      row.source.filePath.toLowerCase().includes(query)
    );
  });
}

function filterStrings(
  rows: readonly AtlasSelfStringLiteralRow[],
  inquiry: Inquiry,
): readonly AtlasSelfStringLiteralRow[] {
  const packageId = stringFilter(inquiry, "packageId");
  const role = stringFilter(inquiry, "stringRole");
  const query = lowerStringFilter(inquiry, "query");
  const magicOnly = booleanFilter(inquiry, "magicOnly", true);
  return rows.filter((row) => {
    if (magicOnly && !row.reusedOutsideDeclaration) {
      return false;
    }
    if (packageId !== undefined && !row.packageIds.includes(packageId)) {
      return false;
    }
    if (role !== undefined && row.roles[role] === undefined) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.value.toLowerCase().includes(query) ||
      row.files.some((file) => file.toLowerCase().includes(query)) ||
      row.declaredByEnumMembers.some((member) =>
        member.toLowerCase().includes(query),
      )
    );
  });
}

function filterRelationshipSurfaces(
  rows: readonly AtlasSelfRelationshipSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfRelationshipSurfaceRow[] {
  return filterRowSurfaces(rows, inquiry).filter(
    (row): row is AtlasSelfRelationshipSurfaceRow =>
      row.surfaceKind === "relationship",
  );
}

function filterAxisPressure(
  rows: readonly AtlasSelfAxisPressureRow[],
  inquiry: Inquiry,
): readonly AtlasSelfAxisPressureRow[] {
  const kind = stringFilter(inquiry, "kind");
  const axis = stringFilter(inquiry, "axis");
  const axisId = stringFilter(inquiry, "axisId");
  const axisField = stringFilter(inquiry, "axisField");
  const valueSpace = stringFilter(inquiry, "valueSpace");
  const pressure = stringFilter(inquiry, "pressure");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (axis !== undefined && row.axis !== axis) {
      return false;
    }
    if (axisId !== undefined && row.axisId !== axisId) {
      return false;
    }
    if (axisField !== undefined && row.axisField !== axisField) {
      return false;
    }
    if (valueSpace !== undefined && row.valueSpace !== valueSpace) {
      return false;
    }
    if (pressure !== undefined && row.pressure !== pressure) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.axis.toLowerCase().includes(query) ||
      row.axisId.toLowerCase().includes(query) ||
      (row.axisField?.toLowerCase().includes(query) ?? false) ||
      (row.valueSpace?.toLowerCase().includes(query) ?? false) ||
      row.kind.toLowerCase().includes(query) ||
      row.sourceName.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.sourceAxes.some((entry) => entry.toLowerCase().includes(query)) ||
      row.targetAxes.some((entry) => entry.toLowerCase().includes(query)) ||
      row.signals.some((entry) => entry.toLowerCase().includes(query))
    );
  });
}

function filterRowSurfaces(
  rows: readonly AtlasSelfRowSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfRowSurfaceRow[] {
  const packageId = stringFilter(inquiry, "packageId");
  const declarationKind = stringFilter(inquiry, "declarationKind");
  const surfaceKind = stringFilter(inquiry, "surfaceKind");
  const surfaceRole = stringFilter(inquiry, "surfaceRole");
  const axis = stringFilter(inquiry, "axis");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (
      declarationKind !== undefined &&
      row.declarationKind !== declarationKind
    ) {
      return false;
    }
    if (surfaceKind !== undefined && row.surfaceKind !== surfaceKind) {
      return false;
    }
    if (surfaceRole !== undefined && row.surfaceRole !== surfaceRole) {
      return false;
    }
    if (axis !== undefined && !row.fields.includes(axis)) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.packageId.toLowerCase().includes(query) ||
      row.surfaceRole.toLowerCase().includes(query) ||
      row.source.filePath.toLowerCase().includes(query) ||
      row.fields.some(
        (field) =>
          field.toLowerCase().includes(query) ||
          row.fieldTypes[field]?.toLowerCase().includes(query),
      )
    );
  });
}

function filterClassSurfaces(
  rows: readonly AtlasSelfClassSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfClassSurfaceRow[] {
  const packageId = stringFilter(inquiry, "packageId");
  const className = stringFilter(inquiry, "className");
  const methodName = stringFilter(inquiry, "methodName");
  const minLineCount = numberFilter(inquiry, "minLineCount");
  const minMethodCount = numberFilter(inquiry, "minMethodCount");
  const minPropertyCount = numberFilter(inquiry, "minPropertyCount");
  const query = lowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (className !== undefined && row.name !== className) {
      return false;
    }
    if (
      methodName !== undefined &&
      !row.methods.includes(methodName) &&
        !row.staticMethods.includes(methodName)
    ) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (minMethodCount !== undefined && row.methodCount < minMethodCount) {
      return false;
    }
    if (
      minPropertyCount !== undefined &&
      row.propertyCount < minPropertyCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      (row.extendsType?.toLowerCase().includes(query) ?? false) ||
      row.implementsTypes.some((entry) =>
        entry.toLowerCase().includes(query),
      ) ||
      row.methods.some((method) => method.toLowerCase().includes(query)) ||
      row.staticMethods.some((method) =>
        method.toLowerCase().includes(query),
      ) ||
      row.accessors.some((accessor) =>
        accessor.toLowerCase().includes(query),
      ) ||
      row.properties.some((property) => property.toLowerCase().includes(query))
    );
  });
  return orderClassSurfaces(filtered, stringFilter(inquiry, "orderBy"));
}

function orderClassSurfaces(
  rows: readonly AtlasSelfClassSurfaceRow[],
  orderBy: string | undefined,
): readonly AtlasSelfClassSurfaceRow[] {
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
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case "propertyCount":
      return [...rows].sort((left, right) =>
        right.propertyCount - left.propertyCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function filterFunctionSurfaces(
  rows: readonly AtlasSelfFunctionSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfFunctionSurfaceRow[] {
  const packageId = stringFilter(inquiry, "packageId");
  const functionKind = stringFilter(inquiry, "functionKind");
  const className = stringFilter(inquiry, "className");
  const functionName = stringFilter(inquiry, "functionName");
  const minLineCount = numberFilter(inquiry, "minLineCount");
  const minCallCount = numberFilter(inquiry, "minCallCount");
  const minUniqueCallTargetCount = numberFilter(
    inquiry,
    "minUniqueCallTargetCount",
  );
  const query = lowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (functionKind !== undefined && row.functionKind !== functionKind) {
      return false;
    }
    if (className !== undefined && row.className !== className) {
      return false;
    }
    if (functionName !== undefined && row.name !== functionName) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (minCallCount !== undefined && row.callCount < minCallCount) {
      return false;
    }
    if (
      minUniqueCallTargetCount !== undefined &&
      row.uniqueCallTargetCount < minUniqueCallTargetCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      (row.className?.toLowerCase().includes(query) ?? false) ||
      row.filePath.toLowerCase().includes(query) ||
      row.functionKind.toLowerCase().includes(query)
    );
  });
  return orderFunctionSurfaces(filtered, stringFilter(inquiry, "orderBy"));
}

function orderFunctionSurfaces(
  rows: readonly AtlasSelfFunctionSurfaceRow[],
  orderBy: string | undefined,
): readonly AtlasSelfFunctionSurfaceRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        right.callCount - left.callCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "callCount":
      return [...rows].sort((left, right) =>
        right.callCount - left.callCount ||
        right.uniqueCallTargetCount - left.uniqueCallTargetCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "uniqueCallTargetCount":
      return [...rows].sort((left, right) =>
        right.uniqueCallTargetCount - left.uniqueCallTargetCount ||
        right.callCount - left.callCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function filterContracts(
  rows: readonly SelfContractRow[],
  inquiry: Inquiry,
): readonly SelfContractRow[] {
  const lensId = stringFilter(inquiry, "lensId");
  const projection = stringFilter(inquiry, "projectionId");
  const parameter = stringFilter(inquiry, "parameterId");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (lensId !== undefined && row.lensId !== lensId) {
      return false;
    }
    if (
      projection !== undefined &&
      !row.declaredProjectionIds.includes(projection) &&
      !row.observedProjectionIds.includes(projection)
    ) {
      return false;
    }
    if (
      parameter !== undefined &&
      !row.declaredParameterIds.includes(parameter)
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.lensId.toLowerCase().includes(query) ||
      row.family.toLowerCase().includes(query) ||
      row.stage.toLowerCase().includes(query) ||
      (row.implementationFunction?.toLowerCase().includes(query) ?? false) ||
      row.declaredProjectionIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.observedProjectionIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.declaredParameterIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.duplicateParameterIds.some((id) =>
        id.toLowerCase().includes(query),
      ) ||
      row.coherenceFacts.some(
        (entry) =>
          entry.dimension.toLowerCase().includes(query) ||
          entry.subjectId.toLowerCase().includes(query) ||
          entry.signals.some((signal) => signal.toLowerCase().includes(query)) ||
          entry.interpretationSpace.some((signal) =>
            signal.toLowerCase().includes(query),
          ),
      )
    );
  });
}

function filterProjectionBranches(
  rows: readonly AtlasSelfProjectionBranchRow[],
  inquiry: Inquiry,
): readonly AtlasSelfProjectionBranchRow[] {
  const lensId = stringFilter(inquiry, "lensId");
  const projection = stringFilter(inquiry, "projectionId");
  const functionName = stringFilter(inquiry, "functionName");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (lensId !== undefined && !row.lensIds.includes(lensId)) {
      return false;
    }
    if (projection !== undefined && row.projection !== projection) {
      return false;
    }
    if (functionName !== undefined && row.functionName !== functionName) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.projection.toLowerCase().includes(query) ||
      row.functionName.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.lensIds.some((id) => id.toLowerCase().includes(query))
    );
  });
}

function filterContinuations(
  rows: readonly AtlasSelfContinuationRow[],
  inquiry: Inquiry,
): readonly AtlasSelfContinuationRow[] {
  const lensId = stringFilter(inquiry, "lensId");
  const kind = stringFilter(inquiry, "kind");
  const targetLens = stringFilter(inquiry, "targetLens");
  const targetProjection = stringFilter(inquiry, "targetProjection");
  const routeRelationMember = stringFilter(inquiry, "routeRelationMember");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (lensId !== undefined && !row.lensIds.includes(lensId)) {
      return false;
    }
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (targetLens !== undefined && row.targetLens !== targetLens) {
      return false;
    }
    if (
      targetProjection !== undefined &&
      row.targetProjection !== targetProjection
    ) {
      return false;
    }
    if (
      routeRelationMember !== undefined &&
      row.routeRelationMember !== routeRelationMember
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      (row.continuationId?.toLowerCase().includes(query) ?? false) ||
      (row.kind?.toLowerCase().includes(query) ?? false) ||
      (row.targetLens?.toLowerCase().includes(query) ?? false) ||
      (row.targetProjection?.toLowerCase().includes(query) ?? false) ||
      (row.routeRelationMember?.toLowerCase().includes(query) ?? false) ||
      row.filePath.toLowerCase().includes(query) ||
      row.functionName.toLowerCase().includes(query) ||
      row.lensIds.some((id) => id.toLowerCase().includes(query))
    );
  });
}

function filterSemanticRoutes(
  rows: readonly AtlasSelfSemanticRouteRow[],
  inquiry: Inquiry,
): readonly AtlasSelfSemanticRouteRow[] {
  const semanticRouteId = stringFilter(inquiry, "semanticRouteId");
  const navigationSpecId = stringFilter(inquiry, "navigationSpecId");
  const targetEndpointId = stringFilter(inquiry, "targetEndpointId");
  const targetLens = stringFilter(inquiry, "targetLens");
  const targetProjection = stringFilter(inquiry, "targetProjection");
  const relation = stringFilter(inquiry, "routeRelationMember");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (
      semanticRouteId !== undefined &&
      row.semanticRouteId !== semanticRouteId
    ) {
      return false;
    }
    if (
      navigationSpecId !== undefined &&
      row.navigationSpecId !== navigationSpecId
    ) {
      return false;
    }
    if (
      targetEndpointId !== undefined &&
      row.targetEndpointId !== targetEndpointId
    ) {
      return false;
    }
    if (targetLens !== undefined && row.targetLens !== targetLens) {
      return false;
    }
    if (
      targetProjection !== undefined &&
      row.targetProjection !== targetProjection
    ) {
      return false;
    }
    if (relation !== undefined && row.relation !== relation) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.semanticRouteId.toLowerCase().includes(query) ||
      row.navigationSpecId.toLowerCase().includes(query) ||
      row.targetEndpointId.toLowerCase().includes(query) ||
      row.targetLens.toLowerCase().includes(query) ||
      row.targetProjection.toLowerCase().includes(query) ||
      row.relation.toLowerCase().includes(query) ||
      row.basis.some((entry) => entry.toLowerCase().includes(query)) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function filterModules(
  rows: readonly AtlasSelfModuleDependencyRow[],
  inquiry: Inquiry,
): readonly AtlasSelfModuleDependencyRow[] {
  const fromArea = stringFilter(inquiry, "fromArea");
  const toArea = stringFilter(inquiry, "toArea");
  const crossesArea = optionalBooleanFilter(inquiry, "crossesArea");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (fromArea !== undefined && row.fromArea !== fromArea) {
      return false;
    }
    if (toArea !== undefined && row.toArea !== toArea) {
      return false;
    }
    if (crossesArea !== undefined && row.crossesArea !== crossesArea) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.fromFile.toLowerCase().includes(query) ||
      row.moduleSpecifier.toLowerCase().includes(query) ||
      (row.toFile?.toLowerCase().includes(query) ?? false) ||
      row.fromArea.toLowerCase().includes(query) ||
      (row.toArea?.toLowerCase().includes(query) ?? false)
    );
  });
}

function filterSubstrateSurfaces(
  rows: readonly AtlasSelfSubstrateSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfSubstrateSurfaceRow[] {
  const kind = stringFilter(inquiry, "kind");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.kind.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      (row.value?.toLowerCase().includes(query) ?? false)
    );
  });
}

function filterContractStrings(
  rows: readonly AtlasSelfContractStringRow[],
  inquiry: Inquiry,
): readonly AtlasSelfContractStringRow[] {
  const contractClass = stringFilter(inquiry, "class");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (contractClass !== undefined && !row.classes.includes(contractClass)) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.value.toLowerCase().includes(query) ||
      row.classes.some((entry) => entry.toLowerCase().includes(query)) ||
      row.files.some((file) => file.toLowerCase().includes(query)) ||
      row.declaredByEnumMembers.some((entry) =>
        entry.toLowerCase().includes(query),
      )
    );
  });
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

function evidenceForContract(row: SelfContractRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Lens contract coherence is joined from Atlas contracts and runtime source analysis.",
    ),
    ...(row.source === undefined ? {} : { source: row.source }),
    data: row,
  };
}

function evidenceForProjectionBranch(
  row: AtlasSelfProjectionBranchRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Projection branch discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}

function evidenceForContinuation(row: AtlasSelfContinuationRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Continuation discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}

function evidenceForSemanticRoute(row: AtlasSelfSemanticRouteRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Declared semantic route topology is read from the framework route catalog.",
    ),
    ...(row.source === undefined ? {} : { source: row.source }),
    data: row,
  };
}

function evidenceForModuleDependency(
  row: AtlasSelfModuleDependencyRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Module dependency discovery is AST-derived from import/export declarations.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForSubstrateSurface(
  row: AtlasSelfSubstrateSurfaceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Substrate surface discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}

function evidenceForContractString(row: AtlasSelfContractStringRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Contract-string classification is AST-derived from enum declarations, continuation ids, and schema/version declarations.",
    ),
    source: row.firstSource,
    data: row,
  };
}

function evidenceForEnum(row: AtlasSelfEnumRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum declaration and local reference counts are AST-derived.",
    ),
    source: row.source,
    data: {
      enumName: row.name,
      memberCount: row.memberCount,
      referencedMemberCount: row.referencedMemberCount,
      unreferencedMemberCount: row.unreferencedMemberCount,
      literalReuseCount: row.literalReuseCount,
      translationInCount: row.translationInCount,
      translationOutCount: row.translationOutCount,
    },
  };
}

function evidenceForEnumReference(row: AtlasSelfEnumReferenceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum reference rows are AST-derived and resolved against the TypeChecker-backed enum usage index.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForEnumValueSpace(row: AtlasSelfEnumValueSpaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum value-space rows are derived from enum member values and raw literal overlap.",
    ),
    ...(row.firstSource === undefined ? {} : { source: row.firstSource }),
    data: row,
  };
}

function evidenceForEnumMapping(row: AtlasSelfEnumMappingRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum mapping rows are exact local translation edges from the enum usage index.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForStringLiteral(row: AtlasSelfStringLiteralRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("String literal grouping is AST-derived."),
    source: row.firstSource,
    data: {
      value: row.value,
      count: row.count,
      roles: row.roles,
      declaredByEnumMembers: row.declaredByEnumMembers,
      reusedOutsideDeclaration: row.reusedOutsideDeclaration,
    },
  };
}

function evidenceForRelationshipSurface(
  row: AtlasSelfRelationshipSurfaceRow,
): Evidence {
  return evidenceForRowSurface(row);
}

function evidenceForRowSurface(row: AtlasSelfRowSurfaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      row.surfaceKind === "relationship"
        ? "Relationship surface discovery is AST-derived."
        : "Structural row surface discovery is AST-derived.",
    ),
    source: row.source,
    data: {
      name: row.name,
      declarationKind: row.declarationKind,
      surfaceKind: row.surfaceKind,
      fields: row.fields,
      hasRelation: row.hasRelation,
      hasMechanism: row.hasMechanism,
      hasPhase: row.hasPhase,
      hasSource: row.hasSource,
      hasEndpoints: row.hasEndpoints,
      surfaceRole: row.surfaceRole,
    },
  };
}

function evidenceForAxisPressure(row: AtlasSelfAxisPressureRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Axis pressure discovery is AST-derived from enum declarations, row surfaces, and mapper functions.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForClassSurface(row: AtlasSelfClassSurfaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Class surface discovery is AST-derived."),
    source: row.source,
    data: {
      name: row.name,
      exported: row.exported,
      abstract: row.abstract,
      filePath: row.filePath,
      lineCount: row.lineCount,
      extendsType: row.extendsType,
      implementsTypes: row.implementsTypes,
      methods: row.methods,
      staticMethods: row.staticMethods,
      accessors: row.accessors,
      properties: row.properties,
      constructorCount: row.constructorCount,
      methodCount: row.methodCount,
      propertyCount: row.propertyCount,
    },
  };
}

function evidenceForFunctionSurface(
  row: AtlasSelfFunctionSurfaceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Function surface discovery is AST-derived."),
    source: row.source,
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

function selfSourceBasis(summary: string) {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary,
    identity: "@aurelia-ls/atlas",
  };
}

function rowLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.rows ?? inquiry.page?.size, 80, 1_000);
}

function stringFilter(inquiry: Inquiry, key: string): string | undefined {
  const value = inquiry.filters?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function lowerStringFilter(inquiry: Inquiry, key: string): string | undefined {
  return stringFilter(inquiry, key)?.toLowerCase();
}

function numberFilter(inquiry: Inquiry, key: string): number | undefined {
  const value = inquiry.filters?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function booleanFilter(
  inquiry: Inquiry,
  key: string,
  defaultValue: boolean,
): boolean {
  const value = inquiry.filters?.[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return defaultValue;
}

function optionalBooleanFilter(
  inquiry: Inquiry,
  key: string,
): boolean | undefined {
  const value = inquiry.filters?.[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
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

/** Shared exact Atlas contract basis for runtime lenses over static catalogs. */
function contractBasis(summary: string) {
  return {
    kind: BasisKind.AtlasContract,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Contract,
    freshness: BasisFreshness.Static,
    summary,
    identity: "@aurelia-ls/atlas",
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

/** Count enum values while preserving all declared buckets. */
function countByEnum<TValue extends string>(
  values: readonly TValue[],
  buckets: readonly TValue[],
): Readonly<Record<TValue, number>> {
  const counts = Object.fromEntries(
    buckets.map((bucket) => [bucket, 0]),
  ) as Record<TValue, number>;
  for (const value of values) {
    counts[value] += 1;
  }
  return counts;
}

/** Return true when the selected locus is rooted at the whole repo or one terrain area. */
export function isRepoLikeLocus(kind: LocusKind): boolean {
  return (
    kind === LocusKind.Repo ||
    kind === LocusKind.RepoArea ||
    kind === LocusKind.Package
  );
}
