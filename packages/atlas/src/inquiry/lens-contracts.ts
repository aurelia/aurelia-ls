import type { Answer } from "./answer.js";
import type { Budget } from "./budget.js";
import type { EvidenceKind } from "./evidence.js";
import type { Inquiry } from "./inquiry.js";
import type { LocusKind } from "./locus.js";
import type { SubstrateId } from "./substrate.js";

/** Broad lens family used for map grouping and maintenance pressure. */
export const enum LensFamily {
  /** Repository orientation and terrain classification. */
  Repo = "repo",
  /** TypeScript source, structure, checker, and flow lenses. */
  TypeScript = "typescript",
  /** Product-owned vocabulary lenses. */
  Product = "product",
  /** Aurelia framework DI, evaluator, and materialization lenses. */
  Framework = "framework",
  /** Cross-substrate bridge lenses such as auLink. */
  Bridge = "bridge",
  /** Atlas self-maintenance lenses. */
  Atlas = "atlas",
}

/** Implementation stage for a lens contract. */
export const enum LensStage {
  /** Lens has a callable implementation. */
  Implemented = "implemented",
  /** Lens has a static contract but no implementation yet. */
  Contracted = "contracted",
  /** Lens is expected but its contract is still not settled. */
  Planned = "planned",
  /** Lens remains for history or migration but should not receive new work. */
  Deprecated = "deprecated",
}

/** Stable lens id understood by the inquiry surface. */
export const enum LensId {
  /** Whole-surface orientation map. */
  RepoMap = "repo.map",
  /** Repository terrain classification. */
  RepoTerrain = "repo.terrain",
  /** Source text and source evidence inspection. */
  TsSource = "ts.source",
  /** TypeScript declaration, module, and symbol structure. */
  TsStructure = "ts.structure",
  /** TypeScript checker facts, references, calls, and flow. */
  TsType = "ts.type",
  /** Product vocabulary definitions and usages. */
  ProductVocabulary = "product.vocabulary",
  /** Semantic-runtime source architecture, module dependencies, and declaration surfaces. */
  ProductArchitecture = "product.architecture",
  /** Admitted workspace package topology, app entrypoints, and Aurelia integration surfaces. */
  WorkspaceArchitecture = "workspace.architecture",
  /** Public Aurelia plugin source architecture and framework integration surfaces. */
  PluginArchitecture = "plugin.architecture",
  /** auLink product-to-framework anchors. */
  BridgeAuLink = "bridge.aulink",
  /** Aurelia framework discovery seeds. */
  FrameworkDiscovery = "framework.discovery",
  /** Aurelia framework API facets, shape edges, member slots, and repo usages. */
  FrameworkApi = "framework.api",
  /** Aurelia framework resource convergence across exports, admissions, syntax, and materialization. */
  FrameworkResources = "framework.resources",
  /** Aurelia framework compiler instruction production graph. */
  FrameworkCompiler = "framework.compiler",
  /** Aurelia framework rendering, instruction, binding, and observer setup graph. */
  FrameworkRendering = "framework.rendering",
  /** Aurelia framework DI facts. */
  FrameworkDi = "framework.di",
  /** Aurelia framework static evaluator facts. */
  FrameworkEvaluator = "framework.evaluator",
  /** Aurelia framework materialization corridors. */
  FrameworkMaterialization = "framework.materialization",
  /** Aurelia framework lifecycle controller, binding, and resource flow. */
  FrameworkLifecycle = "framework.lifecycle",
  /** Aurelia framework observation and reactivity flow. */
  FrameworkObservation = "framework.observation",
  /** Aurelia framework router, route context, route tree, and route-recognizer architecture. */
  FrameworkRouter = "framework.router",
  /** Aurelia framework error/event code definitions and usage sites. */
  FrameworkErrors = "framework.errors",
  /** Aurelia framework configuration and bundle admission graph. */
  FrameworkAdmission = "framework.admission",
  /** Aurelia framework actor-centered semantic composition graph. */
  FrameworkComposition = "framework.composition",
  /** Aurelia docs, framework tests, and legacy package corpus used as fixture and authoring pressure. */
  FrameworkCorpus = "framework.corpus",
  /** Atlas self-maintenance source surfaces. */
  AtlasSelf = "atlas.self",
  /** Queryable Atlas memory joining durable intent records to live source pressure. */
  AtlasMemory = "atlas.memory",
}

/** Role for a lens parameter. */
export const enum ParameterRole {
  /** Parameter changes answer projection without changing the basis. */
  Projection = "projection",
  /** Parameter narrows answer rows. */
  Filter = "filter",
  /** Parameter controls budget or truncation. */
  Budget = "budget",
  /** Parameter changes source/checker/snapshot basis. */
  Basis = "basis",
  /** Parameter changes execution strategy while preserving question meaning. */
  Execution = "execution",
}

/** Lens-local parameter declaration. */
export interface ParameterSpec {
  /** Lens-local parameter id. */
  readonly id: string;
  /** Parameter role used by validators and capability docs. */
  readonly role: ParameterRole;
  /** Grounded explanation of what the parameter controls. */
  readonly summary: string;
  /** Optional allowed string values for enum-like parameters. */
  readonly values?: readonly string[];
}

/** Projection declaration for one lens. */
export interface ProjectionSpec {
  /** Lens-local projection id. */
  readonly id: string;
  /** Grounded explanation of the projection's intended use. */
  readonly summary: string;
  /** Optional budget applied when this projection is selected. */
  readonly defaultBudget?: Budget;
}

/** Static contract for one inquiry lens. */
export interface LensSpec {
  /** Stable lens id. */
  readonly id: LensId;
  /** Broad family used for orientation and grouping. */
  readonly family: LensFamily;
  /** Current implementation stage. */
  readonly stage: LensStage;
  /** Grounded explanation of the lens responsibility. */
  readonly summary: string;
  /** Locus kinds accepted by the lens. */
  readonly supportedLoci: readonly LocusKind[];
  /** Substrate contracts required by the lens. */
  readonly requiredSubstrates: readonly SubstrateId[];
  /** Projections supported by the lens. */
  readonly projections: readonly ProjectionSpec[];
  /** Optional lens-local parameter declarations. */
  readonly parameters?: readonly ParameterSpec[];
  /** Evidence kinds this lens may return. */
  readonly outputKinds: readonly EvidenceKind[];
  /** Default budget applied when the caller does not provide one. */
  readonly defaultBudget?: Budget;
}

/** Context supplied by the runtime around one lens answer. */
export interface LensContext {
  /** Optional trace id shared across nested answers and continuations. */
  readonly traceId?: string;
  /** Optional clock value for deterministic tests or logs. */
  readonly now?: Date;
}

/** Runtime implementation of a statically declared lens contract. */
export interface LensImplementation<
  TInquiry extends Inquiry = Inquiry,
  TValue = unknown,
> {
  /** Static lens contract implemented by this object. */
  readonly spec: LensSpec;
  /** Answer one inquiry under an optional runtime context. */
  answer(
    inquiry: TInquiry,
    context?: LensContext,
  ): Answer<TValue, TInquiry> | Promise<Answer<TValue, TInquiry>>;
}
