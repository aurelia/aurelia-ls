import type { Answer } from "./answer.js";
import type { Budget } from "./budget.js";
import { EvidenceKind } from "./evidence.js";
import type { Inquiry } from "./inquiry.js";
import { LocusKind } from "./locus.js";
import { SubstrateId } from "./substrate.js";

/** Broad lens family used for map grouping and maintenance pressure. */
export const enum LensFamily {
  /** Repository orientation and terrain classification. */
  Repo = "repo",
  /** TypeScript source, structure, checker, and flow lenses. */
  TypeScript = "typescript",
  /** Product-owned kernel, vocabulary, and claim lenses. */
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
  /** Product kernel substrate rows. */
  ProductSubstrate = "product.substrate",
  /** Product vocabulary definitions and usages. */
  ProductVocabulary = "product.vocabulary",
  /** Product signed claim graph. */
  ProductClaims = "product.claims",
  /** auLink product-to-framework anchors. */
  BridgeAuLink = "bridge.aulink",
  /** Aurelia framework discovery seeds. */
  FrameworkDiscovery = "framework.discovery",
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
  /** Aurelia framework configuration and bundle admission graph. */
  FrameworkAdmission = "framework.admission",
  /** atlas maintenance and contract pressure. */
  AtlasSelf = "atlas.self",
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

/** Small registry for implemented lens objects. */
export class LensRegistry {
  /** Implementations keyed by stable lens id. */
  readonly #implementations = new Map<LensId, LensImplementation>();

  constructor(
    /** Initial lens implementations to register. */
    implementations: readonly LensImplementation[] = [],
  ) {
    for (const implementation of implementations) {
      this.register(implementation);
    }
  }

  /** Specs for currently implemented lenses. */
  get implementedSpecs(): readonly LensSpec[] {
    return [...this.#implementations.values()].map(
      (implementation) => implementation.spec,
    );
  }

  /** Register or replace one lens implementation. */
  register(implementation: LensImplementation): void {
    this.#implementations.set(implementation.spec.id, implementation);
  }

  /** Find an implemented lens by id. */
  find(id: LensId): LensImplementation | undefined {
    return this.#implementations.get(id);
  }
}

/** Static lens contracts known to Atlas. */
export const LensCatalog: readonly LensSpec[] = [
  {
    id: LensId.RepoMap,
    family: LensFamily.Repo,
    stage: LensStage.Implemented,
    summary:
      "Orient around repository terrain, substrates, lenses, and active semantic priorities.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package],
    requiredSubstrates: [SubstrateId.RepoTerrain, SubstrateId.AtlasContracts],
    projections: [
      { id: "summary", summary: "Compact orientation map." },
      {
        id: "contracts",
        summary: "Terrain, substrate, and lens contract inventory.",
      },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.RepoTerrain,
    family: LensFamily.Repo,
    stage: LensStage.Implemented,
    summary:
      "Classify active, deferred, external, and generated repository terrain.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea],
    requiredSubstrates: [SubstrateId.RepoTerrain],
    projections: [
      { id: "summary", summary: "Terrain rollup." },
      { id: "areas", summary: "Area rows with status and ownership." },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.TsSource,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary:
      "Inspect exact source text, source ranges, and source-backed evidence.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
      LocusKind.GitTree,
    ],
    requiredSubstrates: [
      SubstrateId.SourceFiles,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      { id: "summary", summary: "Source metadata and evidence handles." },
      {
        id: "text",
        summary: "Source text capped by the textChars budget.",
        defaultBudget: { textChars: 20_000 },
      },
    ],
    parameters: [
      {
        id: "sourcePart",
        role: ParameterRole.Projection,
        summary: "Select name, declaration, body, file, or exact range text.",
      },
      {
        id: "treeish",
        role: ParameterRole.Basis,
        summary: "Use a git-tree basis for historical source.",
      },
    ],
    outputKinds: [EvidenceKind.SourceSpan, EvidenceKind.Symbol],
    defaultBudget: { textChars: 20_000 },
  },
  {
    id: LensId.TsStructure,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary:
      "Read TypeScript project shape: API surface, module graph, declarations, symbols, imports, and exports.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.SourceFiles,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      { id: "summary", summary: "Scope rollup." },
      { id: "api", summary: "API surface and declaration rows." },
      { id: "module-graph", summary: "Import/export graph rows." },
      {
        id: "document-symbols",
        summary: "Language-service document symbol tree rows.",
      },
      { id: "symbols", summary: "Symbol search and document symbol rows." },
      {
        id: "exports",
        summary:
          "Checker-visible exports from package entrypoints or selected module files.",
      },
    ],
    parameters: [
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter symbol or export rows by exact substring.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary: "Filter export rows by checker-visible member/property name.",
      },
    ],
    outputKinds: [
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
      EvidenceKind.MaintenanceSignal,
    ],
    defaultBudget: { rows: 120 },
  },
  {
    id: LensId.TsType,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary:
      "Inspect checker facts for symbols, source ranges, reference roles, call hierarchy, and carrier flow.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.TypeScriptChecker],
    projections: [
      {
        id: "guide",
        summary:
          "Compact IDE-like TypeScript request guide with exact package, symbol, source, and edit-affordance recipes.",
      },
      {
        id: "facts",
        summary: "Checker-visible type, signature, and symbol facts.",
      },
      { id: "references", summary: "Reference and role evidence." },
      {
        id: "definitions",
        summary: "Definitions, type definitions, and implementations.",
      },
      {
        id: "call-hierarchy",
        summary: "Incoming and outgoing call hierarchy edges.",
      },
      {
        id: "call-sites",
        summary:
          "Exact call expressions, callee facts, resolved signatures, and argument facts.",
      },
      {
        id: "diagnostics",
        summary: "Syntactic, semantic, and suggestion diagnostics.",
      },
      {
        id: "quick-info",
        summary: "Language-service quick info for selected targets.",
      },
      {
        id: "signature-help",
        summary: "Language-service signature help for call positions.",
      },
      {
        id: "highlights",
        summary: "Language-service document highlights across selected files.",
      },
      {
        id: "rename",
        summary: "Rename availability and exact rename locations.",
      },
      { id: "refactors", summary: "Applicable TypeScript refactor actions." },
      {
        id: "code-fixes",
        summary: "Code-fix actions with exact TypeScript edit payloads.",
      },
      {
        id: "refactor-edits",
        summary:
          "Concrete TypeScript refactor edit plan for a selected action.",
      },
      {
        id: "organize-imports",
        summary: "Organize-imports edit payloads for selected files.",
      },
      {
        id: "file-rename-edits",
        summary: "Import/reference rewrite edit payloads for a file rename.",
      },
      { id: "flow", summary: "Carrier and method-effect evidence." },
    ],
    parameters: [
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary:
          "Filter exact call-site rows by callee symbol or property name.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary: "Filter exact call-site rows by call or new syntax family.",
        values: ["call", "new"],
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 3, depth: 4 },
  },
  {
    id: LensId.ProductSubstrate,
    family: LensFamily.Product,
    stage: LensStage.Contracted,
    summary:
      "Read product-owned kernel substrate records, producers, preservation channels, and model surfaces.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.ProductKernel],
    projections: [
      { id: "summary", summary: "Substrate rollup." },
      { id: "records", summary: "Record families, producers, and model rows." },
      { id: "evidence", summary: "Evidence and provenance expansion." },
    ],
    outputKinds: [
      EvidenceKind.ProductClaim,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
      EvidenceKind.MaintenanceSignal,
    ],
    defaultBudget: { rows: 120, evidencePerSubject: 3 },
  },
  {
    id: LensId.ProductVocabulary,
    family: LensFamily.Product,
    stage: LensStage.Contracted,
    summary:
      "Read product vocabulary terms, slots, predicate signatures, and allowed self-description surface.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.ProductVocabulary],
    projections: [
      { id: "terms", summary: "Vocabulary term inventory." },
      { id: "usage", summary: "Source usage and product claim links." },
    ],
    outputKinds: [
      EvidenceKind.VocabularyTerm,
      EvidenceKind.ProductClaim,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 100 },
  },
  {
    id: LensId.ProductClaims,
    family: LensFamily.Product,
    stage: LensStage.Contracted,
    summary:
      "Read signed claim graph nodes, predicates, routes, producers, provenance, and open product seams.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.ProductKernel,
      SubstrateId.ProductVocabulary,
    ],
    projections: [
      { id: "summary", summary: "Claim graph rollup." },
      { id: "graph", summary: "Claim nodes and adjacency." },
      { id: "routes", summary: "Producer-to-product routes." },
      { id: "issues", summary: "Claim graph gaps and consistency issues." },
    ],
    outputKinds: [
      EvidenceKind.ProductClaim,
      EvidenceKind.VocabularyTerm,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, routes: 80, evidencePerSubject: 3 },
  },
  {
    id: LensId.BridgeAuLink,
    family: LensFamily.Bridge,
    stage: LensStage.Implemented,
    summary:
      "Read narrow product-to-framework anchors declared through auLink.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.ProductAuLink,
      SubstrateId.ProductKernel,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "auLink rollup." },
      { id: "anchors", summary: "Product class to framework symbol anchors." },
      {
        id: "targets",
        summary: "Framework-side declaration resolution for auLink ids.",
      },
      { id: "gaps", summary: "Missing, stale, or ambiguous anchor pressure." },
    ],
    outputKinds: [
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkDiscovery,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Read the Aurelia framework discovery seeds: semantic domains, behavior flows, seed anchors, and next inquiry routes.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.AtlasContracts],
    projections: [
      { id: "summary", summary: "Framework discovery rollup." },
      {
        id: "recipes",
        summary:
          "Calibrated cross-lens recipes that combine framework semantic projections with TypeScript source, type, call-site, and continuation hops.",
      },
      { id: "flows", summary: "Framework behavior flow definitions." },
      {
        id: "anchors",
        summary: "Seed anchors with source hints and navigation affordances.",
      },
      {
        id: "flow-seeds",
        summary:
          "Source-bound anchor plus framework-flow rows for semantic discovery.",
      },
      {
        id: "call-edges",
        summary:
          "Precomputed call-hierarchy edge rows attached to framework flow seeds.",
      },
      {
        id: "call-sites",
        summary:
          "Exact framework flow call-site rows with callee and argument facts.",
      },
      {
        id: "call-targets",
        summary:
          "Grouped framework flow callee targets derived from precomputed call edges.",
      },
      {
        id: "package-exports",
        summary:
          "Checker-visible exports from admitted Aurelia framework package entrypoints.",
      },
      {
        id: "registry-exports",
        summary:
          "Framework package exports with structural registry/configuration member capabilities.",
      },
      {
        id: "di-interfaces",
        summary:
          "Framework package exports that create DI InterfaceSymbol keys through direct or indirect createInterface calls.",
      },
      {
        id: "resource-carriers",
        summary:
          "Source-exported framework resource carriers independent of package public export surface.",
      },
      {
        id: "resources",
        summary:
          "Framework package exports that carry Aurelia resource definitions or syntax resources.",
      },
      {
        id: "bundles",
        summary:
          "Evaluator-derived registration associations for registry/configuration bundle exports.",
      },
      {
        id: "syntax-products",
        summary:
          "Syntax producers and the instruction or binding products they expose.",
      },
      {
        id: "instruction-slots",
        summary:
          "Instruction discriminator constants joined to instruction declarations and syntax products.",
      },
      {
        id: "instruction-dispatches",
        summary: "Instruction discriminator slot to renderer dispatch edges.",
      },
      {
        id: "controller-creations",
        summary:
          "Renderer hydration flows that construct view models, create child controllers, recursively render property instructions, and admit children to the parent controller.",
      },
      {
        id: "binding-products",
        summary:
          "Binding classes materialized by renderer syntax products, with lifecycle and observer-locator surfaces.",
      },
      {
        id: "binding-admissions",
        summary:
          "Controller.addBinding admission edges that attach framework binding products to controller lifecycle lists.",
      },
      {
        id: "binding-effects",
        summary:
          "Binding lifecycle declarations and setup effects such as observer lookup, event listeners, and subscriptions.",
      },
      {
        id: "binding-setups",
        summary:
          "Renderer/resource-side calls that install target observers, accessors, or target subscribers on bindings.",
      },
      {
        id: "observers",
        summary:
          "Framework observer-system exports, including ObserverLocator/NodeObserverLocator, observers, accessors, subscribers, connectables, effects, and signals.",
      },
      {
        id: "app-tasks",
        summary:
          "Framework AppTask, lifecycle task-slot, task callback, and task queue exports.",
      },
      {
        id: "router-entities",
        summary: "Framework router and route-recognizer exports.",
      },
      {
        id: "expression-entities",
        summary: "Framework expression-parser and expression runtime exports.",
      },
      {
        id: "rendering-structures",
        summary:
          "Framework rendering, hydration, controller, view, and lifecycle structure exports.",
      },
      {
        id: "open-questions",
        summary:
          "Discovery questions that should remain visible during long-running work.",
      },
    ],
    parameters: [
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary: "Filter anchors and flows by framework semantic domain.",
      },
      {
        id: "flow",
        role: ParameterRole.Filter,
        summary: "Filter anchors and flows by framework flow kind.",
      },
      {
        id: "anchorId",
        role: ParameterRole.Filter,
        summary:
          "Filter anchors, flow seeds, and call edges by framework seed anchor id.",
      },
      {
        id: "status",
        role: ParameterRole.Filter,
        summary:
          "Filter anchor and flow-seed rows by exact resolution/source-bound status.",
      },
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter seed anchors by Aurelia framework package id.",
      },
      {
        id: "symbolName",
        role: ParameterRole.Filter,
        summary: "Filter seed anchors by framework symbol name.",
      },
      {
        id: "auLinkId",
        role: ParameterRole.Filter,
        summary: "Filter seed anchors by semantic-runtime auLink id.",
      },
      {
        id: "direction",
        role: ParameterRole.Filter,
        summary:
          "Filter precomputed call edges by incoming or outgoing direction.",
      },
      {
        id: "fromPackageId",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by caller package id.",
      },
      {
        id: "toPackageId",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by callee package id.",
      },
      {
        id: "fromName",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by caller item name.",
      },
      {
        id: "toName",
        role: ParameterRole.Filter,
        summary: "Filter precomputed call edges by callee item name.",
      },
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary:
          "Filter exact framework flow call sites by callee symbol or property name.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary:
          "Filter Aurelia framework package exports by exact exported name.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter Aurelia framework package exports by exported-name substring.",
      },
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary:
          "Filter Aurelia framework package exports by checker-visible member/property name.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter framework resource exports by resource definition kind.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by product kind.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot rows by exact discriminator constant name.",
      },
      {
        id: "instructionName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot rows by exact instruction class/interface/type name.",
      },
      {
        id: "bindingName",
        role: ParameterRole.Filter,
        summary:
          "Filter binding product or syntax product rows by exact binding class name.",
      },
      {
        id: "constructionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding admission rows by static construction/admission shape.",
      },
      {
        id: "effectKind",
        role: ParameterRole.Filter,
        summary: "Filter binding effect rows by lifecycle/setup effect kind.",
      },
      {
        id: "setupKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding setup rows by target-observer, accessor, or target-subscriber setup kind.",
      },
      {
        id: "observerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observer-system exports by semantic role such as observer-locator, node-observer-locator, observer, accessor, subscriber, connectable, watcher, signaler, effect, or dirty-checker.",
      },
      {
        id: "observerCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter observer-system exports by capability such as locate-observer, locate-accessor, locate-collection-observer, subscribe, notify, connect, signal, run-effect, dirty-check, or register.",
      },
      {
        id: "exportShape",
        role: ParameterRole.Filter,
        summary:
          "Filter observer-system exports by public shape such as di-interface, class, interface, type-alias, function, or value.",
      },
      {
        id: "appTaskKind",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask/lifecycle task exports by role such as app-task-factory, app-task-key, task-slot, task-callback, task, task-queue, or lifecycle-hook.",
      },
      {
        id: "appTaskCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask/lifecycle task exports by capability such as register, lifecycle-phase, queue, run, status, or callback.",
      },
      {
        id: "routerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter router exports by role such as router, configuration, route, route-context, route-tree, navigation, viewport, endpoint, location, url-parser, recognizer, event, state, instruction, or route-resource.",
      },
      {
        id: "routerCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter router exports by capability such as configure, navigate, recognize, parse-url, manage-state, render-viewport, emit-event, or register.",
      },
      {
        id: "expressionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter expression exports by role such as parser, ast-node, access, call, literal, operator, pattern, interpolation, for-of, binding-behavior, value-converter, visitor, evaluator, unparser, or helper.",
      },
      {
        id: "expressionCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter expression exports by capability such as parse, visit, evaluate, build-ast, assign, interpolate, convert-value, or apply-behavior.",
      },
      {
        id: "renderingStructureKind",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering structure exports by role such as app-root, controller, view, view-factory, hydration, renderer, render-context, render-location, node-sequence, lifecycle-hook, platform-boundary, mount-target, or ssr.",
      },
      {
        id: "renderingCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering structure exports by capability such as render, hydrate, create-view, control-lifecycle, mount, locate-dom, platform, ssr, or register.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.Symbol,
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.CallSite,
      EvidenceKind.TypeFact,
      EvidenceKind.DiRegistration,
      EvidenceKind.ResourceDefinition,
    ],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkEvaluator,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Static evaluator substrate for world-construction facts, closures, and explicit open seams.",
    supportedLoci: [
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "value", summary: "Evaluator value shape." },
      { id: "effects", summary: "Static world-construction effects." },
      {
        id: "open-seams",
        summary: "Unclosed dynamic or unsupported boundaries.",
      },
    ],
    parameters: [
      {
        id: "memberName",
        role: ParameterRole.Filter,
        summary: "Trace a specific member/function root such as register.",
      },
      {
        id: "calleeName",
        role: ParameterRole.Filter,
        summary: "Filter invocation effects by callee symbol or member name.",
      },
      {
        id: "receiverName",
        role: ParameterRole.Filter,
        summary:
          "Filter invocation effects by receiver binding or symbol name.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.CallSite,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { depth: 20, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkResources,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Converge Aurelia resource carriers with public exports, bundle admissions, syntax products, and materialization sites.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkResources,
      SubstrateId.FrameworkAdmission,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary: "Resource convergence rollup across evidence lanes.",
      },
      {
        id: "convergence",
        summary:
          "One row per resource carrier joined to package exports, bundle admissions, syntax products, and materialization sites.",
      },
      {
        id: "definitions",
        summary:
          "Alias of convergence focused on source-backed resource definition carriers.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter resource rows by Aurelia framework package id.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resources by custom-element, custom-attribute, template-controller, value-converter, binding-behavior, binding-command, attribute-pattern, or renderer.",
      },
      {
        id: "resourceName",
        role: ParameterRole.Filter,
        summary:
          "Filter by static resource lookup name, source export name, target name, or public export name.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary: "Filter by local resource target class/function name.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary: "Filter by resource source/public export name.",
      },
      {
        id: "bundleExportName",
        role: ParameterRole.Filter,
        summary: "Filter by admitting configuration or bundle export name.",
      },
      {
        id: "lane",
        role: ParameterRole.Filter,
        summary:
          "Filter by convergence lane: source-carrier, package-export, bundle-admission, syntax-product, runtime-materialization, or definition-only.",
      },
      {
        id: "instantiationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter by resource runtime-existence class such as view-model-container-invoke, expression-resource-lookup, compiler-command, or definition-only.",
      },
      {
        id: "materializationSiteKind",
        role: ParameterRole.Filter,
        summary:
          "Filter by concrete materialization site kind such as view-model-construction or compiler-command-build.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter syntax-producing resources by binding-command, renderer, or instruction-factory producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary:
          "Filter syntax-producing resources by builds-instruction, handles-instruction, creates-binding, or emits-instruction.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter resource convergence rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.ResourceDefinition,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkCompiler,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework compiler instruction production from binding commands and instruction factories into rendering consumers.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.TypeScriptProgram,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Compiler instruction-production rollup across binding-command build methods and instruction factories.",
      },
      {
        id: "instruction-products",
        summary:
          "Instruction rows produced during compilation by binding commands or instruction-factory functions.",
      },
      {
        id: "relationships",
        summary:
          "Normalized compiler relationship rows with relation, mechanism, and phase axes.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter compiler rows by Aurelia framework package id.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter compiler rows by binding-command or instruction-factory producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary:
          "Filter compiler rows by builds-instruction or emits-instruction product kind.",
      },
      {
        id: "instructionName",
        role: ParameterRole.Filter,
        summary: "Filter compiler rows by produced instruction name.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter compiler relationship rows by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter compiler relationship rows by source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter compiler relationship rows by framework phase.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter compiler rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkRendering,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework rendering from instruction products through renderer dispatch, binding admission, binding effects, and observer setup.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.TypeScriptProgram,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Rendering graph rollup across syntax products, instruction slots, binding products, admissions, effects, and setup overrides.",
      },
      {
        id: "syntax-products",
        summary:
          "Syntax producers and the instruction or binding products they expose.",
      },
      {
        id: "instruction-slots",
        summary:
          "Instruction discriminator constants joined to instruction declarations and syntax products.",
      },
      {
        id: "instruction-dispatches",
        summary: "Instruction discriminator slot to renderer dispatch edges.",
      },
      {
        id: "controller-creations",
        summary:
          "Renderer hydration flows that construct view models, create child controllers, recursively render property instructions, and admit children to the parent controller.",
      },
      {
        id: "binding-products",
        summary:
          "Binding classes reached from renderer construction and controller admission rows.",
      },
      {
        id: "binding-admissions",
        summary:
          "Controller.addBinding admission edges that attach framework binding products to controller lifecycle lists.",
      },
      {
        id: "binding-effects",
        summary:
          "Binding lifecycle declarations and setup effects such as observer lookup, event listeners, and subscriptions.",
      },
      {
        id: "binding-setups",
        summary:
          "Renderer/resource-side calls that install target observers, accessors, or target subscribers on bindings.",
      },
      {
        id: "relationships",
        summary:
          "Normalized rendering relationship rows with relation, mechanism, and phase axes.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter rendering rows by Aurelia framework package id.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter rendering rows by exact substring.",
      },
      {
        id: "producerKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by producer kind.",
      },
      {
        id: "productKind",
        role: ParameterRole.Filter,
        summary: "Filter syntax product rows by product kind.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot rows by exact discriminator constant name.",
      },
      {
        id: "instructionName",
        role: ParameterRole.Filter,
        summary:
          "Filter instruction slot, syntax product, or controller creation rows by exact instruction class/interface/type name.",
      },
      {
        id: "rendererName",
        role: ParameterRole.Filter,
        summary:
          "Filter renderer-owned rows such as instruction dispatches or controller creation flows by renderer export/class name.",
      },
      {
        id: "bindingName",
        role: ParameterRole.Filter,
        summary: "Filter binding rows by exact binding class name.",
      },
      {
        id: "constructionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding admission rows by static construction/admission shape.",
      },
      {
        id: "effectKind",
        role: ParameterRole.Filter,
        summary: "Filter binding effect rows by lifecycle/setup effect kind.",
      },
      {
        id: "setupKind",
        role: ParameterRole.Filter,
        summary:
          "Filter binding setup rows by target-observer, accessor, or target-subscriber setup kind.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter rendering relationship rows by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering relationship rows by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary:
          "Filter rendering relationship rows by compiler/rendering/lifecycle phase.",
      },
      {
        id: "fromName",
        role: ParameterRole.Filter,
        summary: "Filter rendering relationship rows by source endpoint name.",
      },
      {
        id: "toName",
        role: ParameterRole.Filter,
        summary: "Filter rendering relationship rows by target endpoint name.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
      EvidenceKind.SourceSpan,
      EvidenceKind.ResourceDefinition,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.FrameworkDi,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework DI keys, relationship atoms, registrations, lookups, providers, and materialization mechanics.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkDi,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "DI key and provider rollup." },
      {
        id: "keys",
        summary:
          "Framework DI InterfaceSymbol keys discovered from createInterface calls.",
      },
      { id: "facts", summary: "Normalized DI relationship atoms." },
      {
        id: "relationships",
        summary:
          "Normalized DI relationship atoms with relation/mechanism/phase axes.",
      },
      {
        id: "registrations",
        summary:
          "Kernel DI registration, resolver, provider, alias, and slot-write atoms.",
      },
      {
        id: "providers",
        summary:
          "DI key provider and alias targets where the source exposes them exactly.",
      },
      { id: "lookups", summary: "Kernel DI lookup and resolution atoms." },
      {
        id: "materializations",
        summary: "Kernel DI factory and construction atoms.",
      },
      { id: "evidence", summary: "Source-backed relationship atom evidence." },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by Aurelia framework package id.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter relationship atoms by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter relationship atoms by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter relationship atoms by DI/world phase.",
      },
      {
        id: "key",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by InterfaceSymbol name or key expression.",
      },
      {
        id: "strategy",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by resolver strategy.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter DI rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 120, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkMaterialization,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Join DI provider seeds, resource carriers, checker facts, and evaluator effects into first-pass runtime materialization routes.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkDi,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "Materialization rollup." },
      {
        id: "routes",
        summary:
          "DI key provider routes toward instance, constructable, callback, or alias materialization.",
      },
      {
        id: "dependencies",
        summary:
          "Container dependency calls observed inside callback provider routes.",
      },
      {
        id: "relationships",
        summary:
          "Graph relationships from keys to providers and callback dependency keys.",
      },
      {
        id: "instantiations",
        summary:
          "DI key runtime-existence rows with provider source and low-level framework construction-site evidence.",
      },
      {
        id: "resource-instantiations",
        summary:
          "Framework resource runtime-existence rows with resource carrier source and runtime/compiler/evaluator materialization-site evidence.",
      },
      { id: "facts", summary: "Normalized materialization route facts." },
      {
        id: "evidence",
        summary: "Source-backed materialization route evidence and open seams.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary:
          "Filter materialization routes by Aurelia framework package id.",
      },
      {
        id: "key",
        role: ParameterRole.Filter,
        summary:
          "Filter materialization routes by DI key or provider expression name.",
      },
      {
        id: "strategy",
        role: ParameterRole.Filter,
        summary: "Filter materialization routes by resolver strategy.",
      },
      {
        id: "routeKind",
        role: ParameterRole.Filter,
        summary: "Filter materialization routes by route kind.",
      },
      {
        id: "instantiationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter key instantiation rows by existing value, constructable, callback return, alias delegation, or provider.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resource instantiation rows by resource kind such as custom-element or custom-attribute.",
      },
      {
        id: "resourceName",
        role: ParameterRole.Filter,
        summary:
          "Filter resource instantiation rows by static resource name, export name, or target name.",
      },
      {
        id: "resourceSiteKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resource instantiation rows by materialization site kind such as view-model-construction, expression-resource-lookup, or compiler-command-build.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter materialization graph rows by shared framework relation.",
      },
      {
        id: "dependencyKey",
        role: ParameterRole.Filter,
        summary: "Filter callback dependency rows by dependency key.",
      },
      {
        id: "dependencyAccess",
        role: ParameterRole.Filter,
        summary: "Filter callback dependency rows by container access kind.",
      },
      {
        id: "dependencyPolicy",
        role: ParameterRole.Filter,
        summary:
          "Filter callback dependency rows by direct, guarded, fallback, repeated, or deferred policy.",
      },
      {
        id: "certainty",
        role: ParameterRole.Filter,
        summary: "Filter callback dependency rows by evaluator certainty.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter materialization routes by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: {
      rows: 100,
      groups: 40,
      facts: 120,
      routes: 80,
      evidencePerSubject: 3,
    },
  },
  {
    id: LensId.FrameworkLifecycle,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework lifecycle surfaces across controller methods, binding lifecycle effects, resource materialization phases, and lifecycle relationships.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkDi,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      { id: "summary", summary: "Lifecycle rollup." },
      {
        id: "controller-methods",
        summary:
          "Controller lifecycle method declarations with exact source ranges.",
      },
      {
        id: "controller-calls",
        summary:
          "Controller lifecycle call sites such as child activation, binding, attach, detach, and teardown.",
      },
      {
        id: "resource-sites",
        summary:
          "Resource materialization sites grouped by lifecycle/world phase.",
      },
      {
        id: "binding-effects",
        summary:
          "Binding class lifecycle method/effect rows already discovered by the rendering substrate.",
      },
      {
        id: "app-tasks",
        summary:
          "AppTask slot invocation, IAppTask lookup, slot-filter, and task.run execution sites.",
      },
      {
        id: "hook-dispatches",
        summary:
          "View-model hook calls and registered lifecycle-hook dispatch sites.",
      },
      {
        id: "relationships",
        summary:
          "Normalized lifecycle relationship rows across controller, binding, and resource materialization surfaces.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle rows by Aurelia framework package id.",
      },
      {
        id: "lifecycleStage",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle rows by stage such as hydrate, activate, bind, attach, detach, unbind, or dispose.",
      },
      {
        id: "participantKind",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle rows by participant kind such as controller, binding, or resource.",
      },
      {
        id: "callKind",
        role: ParameterRole.Filter,
        summary:
          "Filter controller lifecycle calls by self-lifecycle, child-controller, binding-list, state-gate, or teardown.",
      },
      {
        id: "appTaskExecutionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask execution rows by slot invocation, collection lookup, slot filter, or task run.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary:
          "Filter AppTask execution rows by concrete lifecycle slot such as creating or activated.",
      },
      {
        id: "hookDispatchKind",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle hook dispatch rows by view-model hook, registered hook collection, or registered hook callback.",
      },
      {
        id: "hookName",
        role: ParameterRole.Filter,
        summary:
          "Filter lifecycle hook dispatch rows by hook name such as hydrating, bound, attached, or unbinding.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter resource lifecycle sites by resource kind such as custom-element or binding-behavior.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle relationship rows by shared framework relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle relationship rows by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle relationship rows by framework phase.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter lifecycle rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkObservation,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace Aurelia framework observer entities, binding observer lookup rows, observation setup overrides, and observation relationships.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "Observation rollup." },
      {
        id: "entities",
        summary:
          "Observer/reactivity entity catalog rows such as ObserverLocator, NodeObserverLocator, observers, accessors, subscribers, watchers, and dirty checker.",
      },
      {
        id: "binding-lookups",
        summary:
          "Binding class observer/accessor lookup rows through IObserverLocator-style APIs.",
      },
      {
        id: "binding-setups",
        summary:
          "Renderer/resource-side setup calls that configure binding observation behavior.",
      },
      {
        id: "surface-methods",
        summary:
          "ObserverLocator, NodeObserverLocator, DirtyChecker, connectable, watch decorator/registry/metadata, watcher, effect, and slot-watcher method/function declarations.",
      },
      {
        id: "flow-sites",
        summary:
          "Source-backed observation flow sites inside locator, dirty-checker, collection, connectable, watcher, effect, and slot-watcher surfaces.",
      },
      {
        id: "flow-entity-links",
        summary:
          "Flow-site targets associated with public observer entity rows with explicit match basis.",
      },
      {
        id: "relationships",
        summary:
          "Normalized observation relationships derived from binding lookup/setup rows and observation subsystem flow sites.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter observation rows by Aurelia framework package id.",
      },
      {
        id: "observerKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observer entity rows by observer-locator, node-observer-locator, observer, accessor, subscriber, collection-observer, connectable, watcher, signaler, effect, dirty-checker, or observation-helper.",
      },
      {
        id: "observerCapability",
        role: ParameterRole.Filter,
        summary:
          "Filter observer entity rows by observation capability such as locate-observer, locate-accessor, subscribe, notify, connect, signal, dirty-check, or collection.",
      },
      {
        id: "bindingName",
        role: ParameterRole.Filter,
        summary: "Filter binding lookup/setup rows by binding class name.",
      },
      {
        id: "setupKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observation setup rows by target-observer, accessor, or target-subscriber setup kind.",
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observation surface rows by observer-locator, node-observer-locator, dirty-checker, dirty-check-property, connectable-record, connectable-helper, collection-helper, watch-decorator, watch-definition, watch-registry, resource-watch-metadata, watcher-setup, watcher, effect, or slot-watcher.",
      },
      {
        id: "siteKind",
        role: ParameterRole.Filter,
        summary:
          "Filter observation flow sites by exact local role such as observer-locator-observer, node-locator-observer, observer-cache-read, collection-observer, connectable-subscribe, resource-watch-definition-merge, watch-expression-parse, watcher-compute, or effect-subscribe.",
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary:
          "Filter observation surface or flow rows by owning method/function name.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary:
          "Filter observation flow or relationship rows by exact target symbol or concept name.",
      },
      {
        id: "matchBasis",
        role: ParameterRole.Filter,
        summary:
          "Filter observation flow-to-entity link rows by fully-qualified-name, symbol-name, target-name, or target-root-name.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter observation relationship rows by shared framework relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter observation relationship rows by runtime/source mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter observation relationship rows by framework phase.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary: "Filter observation rows by exact substring.",
      },
    ],
    outputKinds: [
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 4 },
  },
  {
    id: LensId.FrameworkAdmission,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary:
      "Trace configuration and bundle admissions into DI keys, resources, registry exports, catalogs, factories, and lifecycle tasks.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.SourceRange,
      LocusKind.Symbol,
      LocusKind.Handle,
    ],
    requiredSubstrates: [
      SubstrateId.FrameworkAdmission,
      SubstrateId.FrameworkStaticEvaluator,
      SubstrateId.TypeScriptChecker,
    ],
    projections: [
      {
        id: "summary",
        summary:
          "Cheap admission orientation; narrow by packageId or exportName for computed rollup.",
      },
      {
        id: "bundles",
        summary:
          "Compact bundle/configuration rows with admission relation counts.",
      },
      {
        id: "relationships",
        summary: "Normalized admission relationship rows.",
      },
      { id: "facts", summary: "Normalized admission relationship rows." },
      {
        id: "di",
        summary:
          "Admission rows that offer DI keys or DI registration products.",
      },
      {
        id: "resources",
        summary: "Admission rows that offer Aurelia resource carriers.",
      },
      {
        id: "materializations",
        summary:
          "Bridge admitted DI keys and resources to visible DI/resource materialization rows.",
      },
      {
        id: "world-formation",
        summary:
          "Join admitted values to materialization or lifecycle execution evidence while preserving registry/catalog admission-only boundaries.",
      },
      {
        id: "registries",
        summary: "Admission rows that offer registry/configuration exports.",
      },
      {
        id: "catalogs",
        summary: "Admission rows that enter or expand registration catalogs.",
      },
      {
        id: "factories",
        summary: "Admission rows that offer factory registrations.",
      },
      {
        id: "app-tasks",
        summary:
          "Admission rows that offer AppTask or lifecycle task registrations.",
      },
      {
        id: "evidence",
        summary:
          "Source-backed admission relationship evidence and open seams.",
      },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by Aurelia framework package id.",
      },
      {
        id: "exportName",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by admitting bundle/configuration export name.",
      },
      {
        id: "relation",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by semantic relation.",
      },
      {
        id: "mechanism",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by register call, helper, catalog expansion, or factory mechanism.",
      },
      {
        id: "phase",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by world/admission phase.",
      },
      {
        id: "associationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by original bundle association classifier.",
      },
      {
        id: "targetName",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by admitted target name.",
      },
      {
        id: "resourceKind",
        role: ParameterRole.Filter,
        summary: "Filter admitted resource rows by resource definition kind.",
      },
      {
        id: "key",
        role: ParameterRole.Filter,
        summary: "Filter admitted DI rows by key or target name.",
      },
      {
        id: "linkKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admission materialization bridge rows by DI key or resource link class.",
      },
      {
        id: "materializationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admission materialization bridge rows by runtime-existence class.",
      },
      {
        id: "matchBasis",
        role: ParameterRole.Filter,
        summary:
          "Filter admission materialization bridge rows by the exact join basis.",
      },
      {
        id: "formationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter world-formation rows by runtime-existence, app-task-execution, registry-export-admission, catalog-expansion, factory-admission, registration-argument-admission, unknown-admission, or admission-only.",
      },
      {
        id: "status",
        role: ParameterRole.Filter,
        summary:
          "Filter world-formation rows by materialized, executed, expanded, admission-only, or open.",
      },
      {
        id: "slotName",
        role: ParameterRole.Filter,
        summary: "Filter admitted AppTask world-formation rows by lifecycle slot.",
      },
      {
        id: "appTaskExecutionKind",
        role: ParameterRole.Filter,
        summary:
          "Filter admitted AppTask world-formation rows by AppRoot execution site kind.",
      },
      {
        id: "certainty",
        role: ParameterRole.Filter,
        summary: "Filter admission rows by static evaluator certainty.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter admission rows by exact substring across bundle and target names.",
      },
    ],
    outputKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.OpenSeam,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.AtlasSelf,
    family: LensFamily.Atlas,
    stage: LensStage.Implemented,
    summary:
      "Maintain Atlas by inspecting inquiry/lens wiring, contract pressure, and static coherence evidence.",
    supportedLoci: [
      LocusKind.Repo,
      LocusKind.RepoArea,
      LocusKind.Package,
      LocusKind.SourceFile,
      LocusKind.Symbol,
    ],
    requiredSubstrates: [
      SubstrateId.AtlasContracts,
      SubstrateId.TypeScriptProgram,
    ],
    projections: [
      { id: "summary", summary: "Maintenance orientation." },
      {
        id: "recipes",
        summary:
          "Calibrated hop graphs that combine Atlas self-analysis projections with TypeScript source, type, module, and diagnostic reads.",
      },
      {
        id: "taxonomy",
        summary:
          "Source-backed self taxonomy rollup for enum, string, row, and relationship surfaces.",
      },
      {
        id: "contracts",
        summary:
          "Lens contracts joined to runtime implementation paths and projection branches.",
      },
      {
        id: "projections",
        summary:
          "Runtime projection branches with owning function and lens reachability.",
      },
      {
        id: "continuations",
        summary:
          "Continuation object literals with target inquiry and route-claim visibility.",
      },
      {
        id: "modules",
        summary:
          "Atlas relative module dependency edges and cross-area pressure.",
      },
      {
        id: "indexes",
        summary:
          "Index, cache, warmup, reader, builder, and schema provenance surfaces.",
      },
      {
        id: "contract-strings",
        summary:
          "Contract-bearing string literals classified by enum, schema, continuation, and lens contract roles.",
      },
      {
        id: "enums",
        summary:
          "Atlas enum declarations with member reference and literal reuse pressure.",
      },
      {
        id: "strings",
        summary:
          "Grouped Atlas string literal values, defaulting to magic-string occurrences.",
      },
      {
        id: "relationship-surfaces",
        summary:
          "Interface/type surfaces with relationship axes such as relation, mechanism, phase, or endpoints.",
      },
      {
        id: "axis-pressure",
        summary:
          "Exact enum, mapper-function, stringly-field, and parallel-axis pressure rows.",
      },
      {
        id: "row-surfaces",
        summary:
          "Structural interface/type row surfaces without implying relationship semantics.",
      },
      {
        id: "classes",
        summary:
          "Class declarations with method, field, heritage, constructor, and export surfaces.",
      },
      {
        id: "functions",
        summary: "Top-level function and class-method declaration surfaces.",
      },
      {
        id: "pressure",
        summary: "Refactor pressure and missing contract evidence.",
      },
      { id: "wiring", summary: "Lens, substrate, and answer-shape wiring." },
    ],
    parameters: [
      {
        id: "packageId",
        role: ParameterRole.Filter,
        summary:
          "Filter source-backed self-analysis rows by source package id.",
      },
      {
        id: "query",
        role: ParameterRole.Filter,
        summary:
          "Filter self-analysis rows by exact substring across names, files, fields, or literal values.",
      },
      {
        id: "domain",
        role: ParameterRole.Filter,
        summary: "Filter Atlas self-analysis recipe rows by broad maintenance domain.",
      },
      {
        id: "lensId",
        role: ParameterRole.Filter,
        summary:
          "Filter contract, projection, or continuation rows by lens id.",
      },
      {
        id: "projectionId",
        role: ParameterRole.Filter,
        summary: "Filter contract or projection rows by projection id.",
      },
      {
        id: "functionName",
        role: ParameterRole.Filter,
        summary:
          "Filter projection or function-surface rows by exact function name.",
      },
      {
        id: "targetLens",
        role: ParameterRole.Filter,
        summary: "Filter continuation rows by target lens id or LensId member.",
      },
      {
        id: "routeRelationMember",
        role: ParameterRole.Filter,
        summary: "Filter continuation rows by NavigationRelation member.",
      },
      {
        id: "axis",
        role: ParameterRole.Filter,
        summary: "Filter row surfaces or axis-pressure rows by semantic axis.",
      },
      {
        id: "pressure",
        role: ParameterRole.Filter,
        summary: "Filter axis-pressure rows by low, medium, or high pressure.",
      },
      {
        id: "fromArea",
        role: ParameterRole.Filter,
        summary: "Filter module dependency rows by Atlas source area.",
      },
      {
        id: "toArea",
        role: ParameterRole.Filter,
        summary: "Filter module dependency rows by target Atlas source area.",
      },
      {
        id: "crossesArea",
        role: ParameterRole.Filter,
        summary:
          "Filter module dependency rows by whether they cross top-level Atlas source areas.",
      },
      {
        id: "class",
        role: ParameterRole.Filter,
        summary:
          "Filter contract string rows by classification such as lens-id, schema-or-version, or continuation-or-row-id.",
      },
      {
        id: "kind",
        role: ParameterRole.Filter,
        summary: "Filter continuation or index provenance rows by row kind.",
      },
      {
        id: "enumName",
        role: ParameterRole.Filter,
        summary: "Filter enum rows by exact enum declaration name.",
      },
      {
        id: "stringRole",
        role: ParameterRole.Filter,
        summary: "Filter string literal rows by occurrence role.",
      },
      {
        id: "magicOnly",
        role: ParameterRole.Filter,
        summary:
          "When true, string rows exclude module specifiers and enum member declarations.",
      },
      {
        id: "declarationKind",
        role: ParameterRole.Filter,
        summary:
          "Filter row or relationship surfaces by TypeScript declaration kind.",
        values: ["interface", "type-alias"],
      },
      {
        id: "surfaceKind",
        role: ParameterRole.Filter,
        summary: "Filter row surfaces by exact ontology class.",
        values: ["row", "relationship"],
      },
      {
        id: "surfaceRole",
        role: ParameterRole.Filter,
        summary: "Filter row surfaces by Atlas role.",
        values: [
          "row",
          "relationship-row",
          "filter",
          "classification",
          "basis-transition",
          "navigation-contract",
        ],
      },
      {
        id: "axis",
        role: ParameterRole.Filter,
        summary:
          "Filter relationship surfaces by field or axis name such as relation, mechanism, phase, source, from, or to.",
      },
      {
        id: "className",
        role: ParameterRole.Filter,
        summary: "Filter class surfaces by exact class declaration name.",
      },
      {
        id: "methodName",
        role: ParameterRole.Filter,
        summary:
          "Filter class surfaces by exact instance or static method name.",
      },
      {
        id: "functionKind",
        role: ParameterRole.Filter,
        summary: "Filter function surfaces by declaration family.",
        values: ["top-level", "class-method"],
      },
      {
        id: "includeSourceProject",
        role: ParameterRole.Projection,
        summary:
          "Include the full source project package summary; omitted by default to keep self answers compact.",
      },
    ],
    outputKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    defaultBudget: { rows: 80 },
  },
];

/** Return one lens spec or fail loudly on static contract drift. */
export function findLensSpec(id: LensId): LensSpec {
  const spec = LensCatalog.find((lens) => lens.id === id);
  if (spec === undefined) {
    throw new Error(`Unknown lens: ${id}`);
  }
  return spec;
}
