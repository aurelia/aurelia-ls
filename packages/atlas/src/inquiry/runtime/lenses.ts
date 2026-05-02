import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
} from "../basis.js";
import { clampBudget, type PageInfo } from "../budget.js";
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
import { createSurfaceMap, type InquirySurfaceMap } from "../surface-map.js";
import { RepoAreaStatus } from "../terrain.js";
import type {
  SourceProject,
  SourceProjectSummary,
} from "../../source/index.js";
import {
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysisIndex,
  type AtlasSelfAxisPressureRow,
  type AtlasSelfClassSurfaceRow,
  type AtlasSelfContractStringRow,
  type AtlasSelfContinuationRow,
  type AtlasSelfEnumRow,
  type AtlasSelfFunctionSurfaceRow,
  type AtlasSelfIndexProvenanceRow,
  type AtlasSelfModuleDependencyRow,
  type AtlasSelfProjectionBranchRow,
  type AtlasSelfRelationshipSurfaceRow,
  type AtlasSelfRowSurfaceRow,
  type AtlasSelfStringLiteralRow,
} from "./self-analysis.js";
import {
  filterAtlasSelfRecipes,
  type AtlasSelfRecipeRow,
} from "./self-recipes.js";
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
  /** Relative module dependency rows. */
  readonly moduleDependencies?: readonly AtlasSelfModuleDependencyRow[];
  /** Index/cache/schema provenance rows. */
  readonly indexProvenance?: readonly AtlasSelfIndexProvenanceRow[];
  /** Contract-bearing string rows. */
  readonly contractStrings?: readonly AtlasSelfContractStringRow[];
  /** Exact axis/mapping/stringly-surface pressure rows. */
  readonly axisPressure?: readonly AtlasSelfAxisPressureRow[];
}

/** Compact source project summary without per-package rows. */
export type SourceProjectRollup = Omit<SourceProjectSummary, "packages">;

/** Lens contract joined to runtime implementation and projection branches. */
export interface SelfContractRow {
  /** Stable row id. */
  readonly id: string;
  /** Lens id. */
  readonly lensId: LensId;
  /** Lens family. */
  readonly family: LensFamily;
  /** Lens implementation stage. */
  readonly stage: LensStage;
  /** True when the runtime engine reports an implementation. */
  readonly implemented: boolean;
  /** Runtime answer function when found in the engine switch. */
  readonly implementationFunction: string | null;
  /** Declared projection ids from LensCatalog. */
  readonly declaredProjectionIds: readonly string[];
  /** Projection branch ids observed under the implementation call path. */
  readonly observedProjectionIds: readonly string[];
  /** Declared projections without an observed string-literal runtime branch. */
  readonly unobservedProjectionIds: readonly string[];
  /** Runtime projection branches not declared by the lens contract. */
  readonly extraRuntimeProjectionIds: readonly string[];
  /** Implementation source when found. */
  readonly source?: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Compact source-backed self taxonomy attached to atlas.self answers. */
export interface SelfTaxonomyValue {
  /** Self-analysis schema marker. */
  readonly version: AtlasSelfAnalysisIndex["version"];
  /** Analyzed Atlas source files. */
  readonly sourceFileCount: number;
  /** Stable rollup counts for enum/string/relationship-source surfaces. */
  readonly rollup: AtlasSelfAnalysisIndex["rollup"];
  /** Pressure signals that should guide future cleanup without claiming semantic bugs. */
  readonly pressure: {
    readonly unreferencedEnumMembers: number;
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
          id: "repo.map:self",
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Secondary,
          rationale: "Inspect contract pressure and implementation status.",
          inquiry: {
            lens: LensId.AtlasSelf,
            locus: RepoRootLocus,
            projection: "summary",
          },
          route: route(
            NavigationPlane.Maintenance,
            NavigationRelation.DiagnosticsFor,
            [BasisKind.AtlasContract],
            "Atlas contract pressure behind the surface map.",
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
  readonly #analysis: AtlasSelfAnalysisIndex;
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
      case "modules":
        return answerSelfModulesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "indexes":
        return answerSelfIndexesProjection(
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
      case "pressure":
        return answerSelfPressureProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
          this.#openSeams(),
        );
      case "wiring":
        return answerSelfWiringProjection(
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
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas self-analysis recipe row(s).`,
    {
      value: {
        ...value,
        recipes: page.rows,
      },
      basis: [
        contractBasis(
          "Returned calibrated self-analysis hop graphs from the Atlas inquiry contract surface.",
        ),
      ],
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: [
        ...(page.nextOffset === undefined
          ? []
          : [
              nextPageContinuation(
                inquiry,
                "atlas.self:recipes:next-page",
                "Continue Atlas self-analysis recipe rows.",
                page.nextOffset,
                limit,
              ),
            ]),
        projectionContinuation(
          inquiry,
          "atlas.self:summary",
          "summary",
          "Return to Atlas self-maintenance orientation.",
        ),
      ],
    },
  );
}

function selfBaseValue(
  world: InquiryWorld,
  implementedLensIds: ReadonlySet<LensId>,
  sourceProject: SourceProject,
  unimplemented: readonly { readonly id: LensId }[],
  analysis: AtlasSelfAnalysisIndex,
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
  analysis: AtlasSelfAnalysisIndex,
): SelfTaxonomyValue {
  return {
    version: analysis.version,
    sourceFileCount: analysis.sourceFileCount,
    rollup: analysis.rollup,
    pressure: {
      unreferencedEnumMembers: analysis.rollup.unreferencedEnumMemberCount,
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
  analysis: AtlasSelfAnalysisIndex,
  implementedLensIds: ReadonlySet<LensId>,
): readonly SelfContractRow[] {
  return world.lenses.map((lens) => {
    const implementation = analysis.lensImplementations.find(
      (row) => row.lensId === lens.id,
    );
    const declaredProjectionIds = lens.projections.map(
      (projection) => projection.id,
    );
    const observedProjectionIds = uniqueSorted(
      analysis.projectionBranches
        .filter((row) => row.lensIds.includes(lens.id))
        .map((row) => row.projection),
    );
    const unobservedProjectionIds = declaredProjectionIds.filter(
      (projection) => !observedProjectionIds.includes(projection),
    );
    const extraRuntimeProjectionIds = observedProjectionIds.filter(
      (projection) => !declaredProjectionIds.includes(projection),
    );
    return {
      id: `atlas-self:contract:${lens.id}`,
      lensId: lens.id,
      family: lens.family,
      stage: lens.stage,
      implemented: implementedLensIds.has(lens.id),
      implementationFunction: implementation?.implementationFunction ?? null,
      declaredProjectionIds,
      observedProjectionIds,
      unobservedProjectionIds,
      extraRuntimeProjectionIds,
      ...(implementation?.source === undefined
        ? {}
        : { source: implementation.source }),
      summary: `${lens.id} declares ${
        declaredProjectionIds.length
      } projection(s), has ${
        observedProjectionIds.length
      } observed runtime branch(es), and ${
        implementation === undefined
          ? "has no engine implementation row"
          : `is answered by ${implementation.implementationFunction}`
      }.`,
    };
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
  analysis: AtlasSelfAnalysisIndex,
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
          "Atlas self-analysis indexed enums, string literals, and relationship-like row surfaces.",
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
  analysis: AtlasSelfAnalysisIndex,
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
  analysis: AtlasSelfAnalysisIndex,
  implementedLensIds: ReadonlySet<LensId>,
): Answer<SelfValue> {
  const rows = filterContracts(
    selfContractRows(world, analysis, implementedLensIds),
    inquiry,
  );
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas lens contract coherence row(s).`,
    {
      value: {
        ...value,
        contracts: page.rows,
      },
      basis: [
        contractBasis("Read declared lens contracts from the in-memory world."),
        selfSourceBasis(
          "Joined lens contracts to runtime implementation source paths through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForContract),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect runtime implementation for ${row.lensId}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:contracts:next-page",
        "Continue Atlas lens contract rows.",
      ),
    },
  );
}

function answerSelfProjectionBranchesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterProjectionBranches(analysis.projectionBranches, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas projection branch row(s).`,
    {
      value: {
        ...value,
        projectionBranches: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read runtime projection branches through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForProjectionBranch),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect projection branch ${row.projection} in ${row.functionName}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:projections:next-page",
        "Continue Atlas projection branch rows.",
      ),
    },
  );
}

function answerSelfContinuationsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterContinuations(analysis.continuations, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas continuation row(s).`,
    {
      value: {
        ...value,
        continuationRows: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read continuation object literals through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForContinuation),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect continuation ${row.continuationId ?? row.id}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:continuations:next-page",
        "Continue Atlas continuation rows.",
      ),
    },
  );
}

function answerSelfModulesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterModules(analysis.moduleDependencies, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas module dependency row(s).`,
    {
      value: {
        ...value,
        moduleDependencies: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read relative import/export edges through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForModuleDependency),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect module dependency ${row.moduleSpecifier}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:modules:next-page",
        "Continue Atlas module dependency rows.",
      ),
    },
  );
}

function answerSelfIndexesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterIndexes(analysis.indexProvenance, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas index/cache provenance row(s).`,
    {
      value: {
        ...value,
        indexProvenance: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read index/cache/schema declarations through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForIndexProvenance),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect index/cache surface ${row.name}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:indexes:next-page",
        "Continue Atlas index/cache provenance rows.",
      ),
    },
  );
}

function answerSelfContractStringsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterContractStrings(analysis.contractStrings, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas contract string row(s).`,
    {
      value: {
        ...value,
        contractStrings: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Classified contract-bearing string literals through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForContractString),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.firstSource,
          summary: `Inspect contract string ${JSON.stringify(row.value)}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:contract-strings:next-page",
        "Continue Atlas contract string rows.",
      ),
    },
  );
}

function answerSelfEnumProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterEnums(analysis.enums, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas enum declaration row(s).`,
    {
      value: {
        ...value,
        enums: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read enum declarations and Enum.Member references through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForEnum),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect enum ${row.name}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:enums:next-page",
        "Continue Atlas enum declaration rows.",
      ),
    },
  );
}

function answerSelfStringProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterStrings(analysis.strings, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas string literal row(s).`,
    {
      value: {
        ...value,
        strings: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read string literal occurrences through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForStringLiteral),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.firstSource,
          summary: `Inspect first occurrence of string literal ${JSON.stringify(
            row.value,
          )}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:strings:next-page",
        "Continue Atlas string literal rows.",
      ),
    },
  );
}

function answerSelfRelationshipSurfaceProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  return answerSelfRelationshipRows(
    inquiry,
    value,
    filterRelationshipSurfaces(analysis.relationshipSurfaces, inquiry),
    "relationship-surfaces",
  );
}

function answerSelfRowSurfaceProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterRowSurfaces(analysis.rowSurfaces, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas row surface row(s).`,
    {
      value: {
        ...value,
        rowSurfaces: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read structural interface/type row surfaces through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForRowSurface),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect row surface ${row.name}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:row-surfaces:next-page",
        "Continue Atlas row surface rows.",
      ),
    },
  );
}

function answerSelfClassesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterClassSurfaces(analysis.classSurfaces, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas class surface row(s).`,
    {
      value: {
        ...value,
        classSurfaces: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read class declarations, methods, fields, heritage, and constructor surfaces through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForClassSurface),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect class surface ${row.name}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:classes:next-page",
        "Continue Atlas class surface rows.",
      ),
    },
  );
}

function answerSelfFunctionsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterFunctionSurfaces(analysis.functionSurfaces, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas function surface row(s).`,
    {
      value: {
        ...value,
        functionSurfaces: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read top-level function and class-method declarations through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForFunctionSurface),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect function surface ${row.name}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:functions:next-page",
        "Continue Atlas function surface rows.",
      ),
    },
  );
}

function answerSelfWiringProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  return answerSelfRelationshipRows(
    inquiry,
    value,
    filterRelationshipSurfaces(analysis.relationshipSurfaces, inquiry),
    "wiring",
  );
}

function answerSelfRelationshipRows(
  inquiry: Inquiry,
  value: SelfValue,
  rows: readonly AtlasSelfRelationshipSurfaceRow[],
  projection: "relationship-surfaces" | "wiring",
): Answer<SelfValue> {
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas relationship surface row(s).`,
    {
      value: {
        ...value,
        relationshipSurfaces: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read relationship-like interface/type surfaces through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForRelationshipSurface),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect ${
            projection === "wiring" ? "wiring" : "relationship"
          } surface ${row.name}.`,
        })),
        page.nextOffset,
        limit,
        `atlas.self:${projection}:next-page`,
        "Continue Atlas relationship surface rows.",
      ),
    },
  );
}

function answerSelfAxisPressureProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
): Answer<SelfValue> {
  const rows = filterAxisPressure(analysis.axisPressure, inquiry);
  const limit = rowLimit(inquiry);
  const page = pageRows(rows, pageOffset(inquiry), limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} Atlas axis pressure row(s).`,
    {
      value: {
        ...value,
        axisPressure: page.rows,
      },
      basis: [
        selfSourceBasis(
          "Read axis, mapper, and stringly-surface pressure through the hot TypeScript Program.",
        ),
      ],
      evidence: page.rows
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForAxisPressure),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: selfRowContinuations(
        inquiry,
        page.rows.map((row) => ({
          id: row.id,
          source: row.source,
          summary: `Inspect axis pressure ${row.sourceName}.`,
        })),
        page.nextOffset,
        limit,
        "atlas.self:axis-pressure:next-page",
        "Continue Atlas axis pressure rows.",
      ),
    },
  );
}

function answerSelfPressureProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysisIndex,
  openSeams: readonly OpenSeam[],
): Answer<SelfValue> {
  const limit = rowLimit(inquiry);
  const enums = filterEnums(analysis.enums, inquiry)
    .filter(
      (row) => row.unreferencedMemberCount > 0 || row.literalReuseCount > 0,
    )
    .slice(0, limit);
  const strings = filterStrings(analysis.strings, inquiry)
    .filter((row) => row.reusedOutsideDeclaration)
    .slice(0, limit);
  const relationshipSurfaces = filterRelationshipSurfaces(
    analysis.relationshipSurfaces,
    inquiry,
  )
    .filter((row) => !row.hasSource || !row.hasRelation)
    .slice(0, limit);

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    "Returned Atlas self pressure rows for enum, string, relationship, and lens-contract maintenance.",
    {
      value: {
        ...value,
        enums,
        strings,
        relationshipSurfaces,
      },
      basis: [
        contractBasis(
          "Answered lens implementation pressure from the in-memory lens registry.",
        ),
        selfSourceBasis(
          "Read source-backed enum, string, and relationship pressure through the hot TypeScript Program.",
        ),
      ],
      evidence: [
        ...enums.slice(0, evidenceLimit(inquiry)).map(evidenceForEnum),
        ...strings
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForStringLiteral),
        ...relationshipSurfaces
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForRelationshipSurface),
      ],
      openSeams,
      continuations: selfSummaryContinuations(inquiry),
    },
  );
}

function selfSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "atlas.self:recipes",
      "recipes",
      "Use calibrated self-analysis hop graphs before broad Atlas architecture work.",
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
      "atlas.self:modules",
      "modules",
      "Inspect Atlas module dependency edges.",
    ),
    projectionContinuation(
      inquiry,
      "atlas.self:indexes",
      "indexes",
      "Inspect index, cache, warmup, and schema provenance surfaces.",
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
  for (const row of rows.slice(0, 3)) {
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
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
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
}

function filterFunctionSurfaces(
  rows: readonly AtlasSelfFunctionSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfFunctionSurfaceRow[] {
  const packageId = stringFilter(inquiry, "packageId");
  const functionKind = stringFilter(inquiry, "functionKind");
  const className = stringFilter(inquiry, "className");
  const functionName = stringFilter(inquiry, "functionName");
  const query = lowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
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
}

function filterContracts(
  rows: readonly SelfContractRow[],
  inquiry: Inquiry,
): readonly SelfContractRow[] {
  const lensId = stringFilter(inquiry, "lensId");
  const projection = stringFilter(inquiry, "projectionId");
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
      row.observedProjectionIds.some((id) => id.toLowerCase().includes(query))
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

function filterIndexes(
  rows: readonly AtlasSelfIndexProvenanceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfIndexProvenanceRow[] {
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

function evidenceForIndexProvenance(
  row: AtlasSelfIndexProvenanceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Index/cache provenance discovery is AST-derived."),
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
    },
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
      extendsType: row.extendsType,
      implementsTypes: row.implementsTypes,
      methods: row.methods,
      staticMethods: row.staticMethods,
      accessors: row.accessors,
      properties: row.properties,
      constructorCount: row.constructorCount,
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
  analysis: AtlasSelfAnalysisIndex,
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
      "Atlas self-analysis index was derived from the hot TypeScript Program.",
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

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}

function pageInfo(
  inquiry: Inquiry,
  returned: number,
  total: number,
  limit: number,
  nextOffset: number | undefined,
): PageInfo {
  return {
    size: limit,
    cursor: inquiry.page?.cursor,
    returned,
    total,
    ...(nextOffset === undefined ? {} : { nextCursor: String(nextOffset) }),
  };
}

function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): { readonly rows: readonly TValue[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset =
    offset + page.length < rows.length ? offset + page.length : undefined;
  return {
    rows: page,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  if (cursor === undefined) {
    return 0;
  }
  const offset = Number(cursor);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function stringFilter(inquiry: Inquiry, key: string): string | undefined {
  const value = inquiry.filters?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function lowerStringFilter(inquiry: Inquiry, key: string): string | undefined {
  return stringFilter(inquiry, key)?.toLowerCase();
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

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
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
