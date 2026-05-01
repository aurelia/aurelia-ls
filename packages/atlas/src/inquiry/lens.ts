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
  /** Aurelia framework rendering, instruction, binding, and observer setup graph. */
  FrameworkRendering = "framework.rendering",
  /** Aurelia framework DI facts. */
  FrameworkDi = "framework.di",
  /** Aurelia framework static evaluator facts. */
  FrameworkEvaluator = "framework.evaluator",
  /** Aurelia framework materialization corridors. */
  FrameworkMaterialization = "framework.materialization",
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
  answer(inquiry: TInquiry, context?: LensContext): Answer<TValue, TInquiry> | Promise<Answer<TValue, TInquiry>>;
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
    return [...this.#implementations.values()].map((implementation) => implementation.spec);
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
    summary: "Orient around repository terrain, substrates, lenses, and active semantic priorities.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package],
    requiredSubstrates: [SubstrateId.RepoTerrain, SubstrateId.AtlasContracts],
    projections: [
      { id: "summary", summary: "Compact orientation map." },
      { id: "contracts", summary: "Terrain, substrate, and lens contract inventory." },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.RepoTerrain,
    family: LensFamily.Repo,
    stage: LensStage.Implemented,
    summary: "Classify active, deferred, external, and generated repository terrain.",
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
    summary: "Inspect exact source text, source ranges, and source-backed evidence.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle, LocusKind.GitTree],
    requiredSubstrates: [SubstrateId.SourceFiles, SubstrateId.TypeScriptProgram],
    projections: [
      { id: "summary", summary: "Source metadata and evidence handles." },
      { id: "text", summary: "Source text capped by the textChars budget.", defaultBudget: { textChars: 20_000 } },
    ],
    parameters: [
      { id: "sourcePart", role: ParameterRole.Projection, summary: "Select name, declaration, body, file, or exact range text." },
      { id: "treeish", role: ParameterRole.Basis, summary: "Use a git-tree basis for historical source." },
    ],
    outputKinds: [EvidenceKind.SourceSpan, EvidenceKind.Symbol],
    defaultBudget: { textChars: 20_000 },
  },
  {
    id: LensId.TsStructure,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary: "Read TypeScript project shape: API surface, module graph, declarations, symbols, imports, and exports.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol],
    requiredSubstrates: [SubstrateId.SourceFiles, SubstrateId.TypeScriptProgram],
    projections: [
      { id: "summary", summary: "Scope rollup." },
      { id: "api", summary: "API surface and declaration rows." },
      { id: "module-graph", summary: "Import/export graph rows." },
      { id: "document-symbols", summary: "Language-service document symbol tree rows." },
      { id: "symbols", summary: "Symbol search and document symbol rows." },
      { id: "exports", summary: "Checker-visible exports from package entrypoints or selected module files." },
    ],
    parameters: [
      { id: "query", role: ParameterRole.Filter, summary: "Filter symbol or export rows by exact substring." },
      { id: "memberName", role: ParameterRole.Filter, summary: "Filter export rows by checker-visible member/property name." },
    ],
    outputKinds: [EvidenceKind.SourceSpan, EvidenceKind.Symbol, EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 120 },
  },
  {
    id: LensId.TsType,
    family: LensFamily.TypeScript,
    stage: LensStage.Implemented,
    summary: "Inspect checker facts for symbols, source ranges, reference roles, call hierarchy, and carrier flow.",
    supportedLoci: [LocusKind.Repo, LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.TypeScriptChecker],
    projections: [
      { id: "facts", summary: "Checker-visible type, signature, and symbol facts." },
      { id: "references", summary: "Reference and role evidence." },
      { id: "definitions", summary: "Definitions, type definitions, and implementations." },
      { id: "call-hierarchy", summary: "Incoming and outgoing call hierarchy edges." },
      { id: "call-sites", summary: "Exact call expressions, callee facts, resolved signatures, and argument facts." },
      { id: "diagnostics", summary: "Syntactic, semantic, and suggestion diagnostics." },
      { id: "quick-info", summary: "Language-service quick info for selected targets." },
      { id: "signature-help", summary: "Language-service signature help for call positions." },
      { id: "highlights", summary: "Language-service document highlights across selected files." },
      { id: "rename", summary: "Rename availability and exact rename locations." },
      { id: "refactors", summary: "Applicable TypeScript refactor actions." },
      { id: "code-fixes", summary: "Code-fix actions with exact TypeScript edit payloads." },
      { id: "refactor-edits", summary: "Concrete TypeScript refactor edit plan for a selected action." },
      { id: "organize-imports", summary: "Organize-imports edit payloads for selected files." },
      { id: "file-rename-edits", summary: "Import/reference rewrite edit payloads for a file rename." },
      { id: "flow", summary: "Carrier and method-effect evidence." },
    ],
    parameters: [
      { id: "calleeName", role: ParameterRole.Filter, summary: "Filter exact call-site rows by callee symbol or property name." },
      { id: "kind", role: ParameterRole.Filter, summary: "Filter exact call-site rows by call or new syntax family.", values: ["call", "new"] },
    ],
    outputKinds: [EvidenceKind.TypeFact, EvidenceKind.CallSite, EvidenceKind.SourceSpan, EvidenceKind.Symbol],
    defaultBudget: { rows: 80, evidencePerSubject: 3, depth: 4 },
  },
  {
    id: LensId.ProductSubstrate,
    family: LensFamily.Product,
    stage: LensStage.Contracted,
    summary: "Read product-owned kernel substrate records, producers, preservation channels, and model surfaces.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.ProductKernel],
    projections: [
      { id: "summary", summary: "Substrate rollup." },
      { id: "records", summary: "Record families, producers, and model rows." },
      { id: "evidence", summary: "Evidence and provenance expansion." },
    ],
    outputKinds: [EvidenceKind.ProductClaim, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam, EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 120, evidencePerSubject: 3 },
  },
  {
    id: LensId.ProductVocabulary,
    family: LensFamily.Product,
    stage: LensStage.Contracted,
    summary: "Read product vocabulary terms, slots, predicate signatures, and allowed self-description surface.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.ProductVocabulary],
    projections: [
      { id: "terms", summary: "Vocabulary term inventory." },
      { id: "usage", summary: "Source usage and product claim links." },
    ],
    outputKinds: [EvidenceKind.VocabularyTerm, EvidenceKind.ProductClaim, EvidenceKind.SourceSpan],
    defaultBudget: { rows: 100 },
  },
  {
    id: LensId.ProductClaims,
    family: LensFamily.Product,
    stage: LensStage.Contracted,
    summary: "Read signed claim graph nodes, predicates, routes, producers, provenance, and open product seams.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.ProductKernel, SubstrateId.ProductVocabulary],
    projections: [
      { id: "summary", summary: "Claim graph rollup." },
      { id: "graph", summary: "Claim nodes and adjacency." },
      { id: "routes", summary: "Producer-to-product routes." },
      { id: "issues", summary: "Claim graph gaps and consistency issues." },
    ],
    outputKinds: [EvidenceKind.ProductClaim, EvidenceKind.VocabularyTerm, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam],
    defaultBudget: { rows: 100, routes: 80, evidencePerSubject: 3 },
  },
  {
    id: LensId.BridgeAuLink,
    family: LensFamily.Bridge,
    stage: LensStage.Implemented,
    summary: "Read narrow product-to-framework anchors declared through auLink.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.ProductAuLink, SubstrateId.ProductKernel, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "auLink rollup." },
      { id: "anchors", summary: "Product class to framework symbol anchors." },
      { id: "targets", summary: "Framework-side declaration resolution for auLink ids." },
      { id: "gaps", summary: "Missing, stale, or ambiguous anchor pressure." },
    ],
    outputKinds: [EvidenceKind.AuLinkAnchor, EvidenceKind.SourceSpan, EvidenceKind.Symbol, EvidenceKind.OpenSeam],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkDiscovery,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary: "Read the Aurelia framework discovery seeds: semantic domains, behavior flows, seed anchors, and next inquiry routes.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.AtlasContracts],
    projections: [
      { id: "summary", summary: "Framework discovery rollup." },
      { id: "flows", summary: "Framework behavior flow definitions." },
      { id: "anchors", summary: "Seed anchors with source hints and navigation affordances." },
      { id: "flow-seeds", summary: "Source-bound anchor plus framework-flow rows for semantic discovery." },
      { id: "call-edges", summary: "Precomputed call-hierarchy edge rows attached to framework flow seeds." },
      { id: "call-sites", summary: "Exact framework flow call-site rows with callee and argument facts." },
      { id: "call-targets", summary: "Grouped framework flow callee targets derived from precomputed call edges." },
      { id: "package-exports", summary: "Checker-visible exports from admitted Aurelia framework package entrypoints." },
      { id: "registry-exports", summary: "Framework package exports with structural registry/configuration member capabilities." },
      { id: "di-interfaces", summary: "Framework package exports that create DI InterfaceSymbol keys through direct or indirect createInterface calls." },
      { id: "resource-carriers", summary: "Source-exported framework resource carriers independent of package public export surface." },
      { id: "resources", summary: "Framework package exports that carry Aurelia resource definitions or syntax resources." },
      { id: "bundles", summary: "Evaluator-derived registration associations for registry/configuration bundle exports." },
      { id: "syntax-products", summary: "Syntax producers and the instruction or binding products they expose." },
      { id: "instruction-slots", summary: "Instruction discriminator constants joined to instruction declarations and syntax products." },
      { id: "instruction-dispatches", summary: "Instruction discriminator slot to renderer dispatch edges." },
      { id: "binding-products", summary: "Binding classes materialized by renderer syntax products, with lifecycle and observer-locator surfaces." },
      { id: "binding-admissions", summary: "Controller.addBinding admission edges that attach framework binding products to controller lifecycle lists." },
      { id: "binding-effects", summary: "Binding lifecycle declarations and setup effects such as observer lookup, event listeners, and subscriptions." },
      { id: "binding-setups", summary: "Renderer/resource-side calls that install target observers, accessors, or target subscribers on bindings." },
      { id: "observers", summary: "Framework observer-system exports, including ObserverLocator/NodeObserverLocator, observers, accessors, subscribers, connectables, effects, and signals." },
      { id: "app-tasks", summary: "Framework AppTask, lifecycle task-slot, task callback, and task queue exports." },
      { id: "router-entities", summary: "Framework router and route-recognizer exports." },
      { id: "expression-entities", summary: "Framework expression-parser and expression runtime exports." },
      { id: "rendering-structures", summary: "Framework rendering, hydration, controller, view, and lifecycle structure exports." },
      { id: "open-questions", summary: "Discovery questions that should remain visible during long-running work." },
    ],
    parameters: [
      { id: "domain", role: ParameterRole.Filter, summary: "Filter anchors and flows by framework semantic domain." },
      { id: "flow", role: ParameterRole.Filter, summary: "Filter anchors and flows by framework flow kind." },
      { id: "anchorId", role: ParameterRole.Filter, summary: "Filter anchors, flow seeds, and call edges by framework seed anchor id." },
      { id: "status", role: ParameterRole.Filter, summary: "Filter anchor and flow-seed rows by exact resolution/source-bound status." },
      { id: "packageId", role: ParameterRole.Filter, summary: "Filter seed anchors by Aurelia framework package id." },
      { id: "symbolName", role: ParameterRole.Filter, summary: "Filter seed anchors by framework symbol name." },
      { id: "auLinkId", role: ParameterRole.Filter, summary: "Filter seed anchors by semantic-runtime auLink id." },
      { id: "direction", role: ParameterRole.Filter, summary: "Filter precomputed call edges by incoming or outgoing direction." },
      { id: "fromPackageId", role: ParameterRole.Filter, summary: "Filter precomputed call edges by caller package id." },
      { id: "toPackageId", role: ParameterRole.Filter, summary: "Filter precomputed call edges by callee package id." },
      { id: "fromName", role: ParameterRole.Filter, summary: "Filter precomputed call edges by caller item name." },
      { id: "toName", role: ParameterRole.Filter, summary: "Filter precomputed call edges by callee item name." },
      { id: "calleeName", role: ParameterRole.Filter, summary: "Filter exact framework flow call sites by callee symbol or property name." },
      { id: "exportName", role: ParameterRole.Filter, summary: "Filter Aurelia framework package exports by exact exported name." },
      { id: "query", role: ParameterRole.Filter, summary: "Filter Aurelia framework package exports by exported-name substring." },
      { id: "memberName", role: ParameterRole.Filter, summary: "Filter Aurelia framework package exports by checker-visible member/property name." },
      { id: "resourceKind", role: ParameterRole.Filter, summary: "Filter framework resource exports by resource definition kind." },
      { id: "producerKind", role: ParameterRole.Filter, summary: "Filter syntax product rows by producer kind." },
      { id: "productKind", role: ParameterRole.Filter, summary: "Filter syntax product rows by product kind." },
      { id: "slotName", role: ParameterRole.Filter, summary: "Filter instruction slot rows by exact discriminator constant name." },
      { id: "instructionName", role: ParameterRole.Filter, summary: "Filter instruction slot rows by exact instruction class/interface/type name." },
      { id: "bindingName", role: ParameterRole.Filter, summary: "Filter binding product or syntax product rows by exact binding class name." },
      { id: "constructionKind", role: ParameterRole.Filter, summary: "Filter binding admission rows by static construction/admission shape." },
      { id: "effectKind", role: ParameterRole.Filter, summary: "Filter binding effect rows by lifecycle/setup effect kind." },
      { id: "setupKind", role: ParameterRole.Filter, summary: "Filter binding setup rows by target-observer, accessor, or target-subscriber setup kind." },
      { id: "observerKind", role: ParameterRole.Filter, summary: "Filter observer-system exports by semantic role such as observer-locator, node-observer-locator, observer, accessor, subscriber, connectable, watcher, signaler, effect, or dirty-checker." },
      { id: "observerCapability", role: ParameterRole.Filter, summary: "Filter observer-system exports by capability such as locate-observer, locate-accessor, locate-collection-observer, subscribe, notify, connect, signal, run-effect, dirty-check, or register." },
      { id: "exportShape", role: ParameterRole.Filter, summary: "Filter observer-system exports by public shape such as di-interface, class, interface, type-alias, function, or value." },
      { id: "appTaskKind", role: ParameterRole.Filter, summary: "Filter AppTask/lifecycle task exports by role such as app-task-factory, app-task-key, task-slot, task-callback, task, task-queue, or lifecycle-hook." },
      { id: "appTaskCapability", role: ParameterRole.Filter, summary: "Filter AppTask/lifecycle task exports by capability such as register, lifecycle-phase, queue, run, status, or callback." },
      { id: "routerKind", role: ParameterRole.Filter, summary: "Filter router exports by role such as router, configuration, route, route-context, route-tree, navigation, viewport, endpoint, location, url-parser, recognizer, event, state, instruction, or route-resource." },
      { id: "routerCapability", role: ParameterRole.Filter, summary: "Filter router exports by capability such as configure, navigate, recognize, parse-url, manage-state, render-viewport, emit-event, or register." },
      { id: "expressionKind", role: ParameterRole.Filter, summary: "Filter expression exports by role such as parser, ast-node, access, call, literal, operator, pattern, interpolation, for-of, binding-behavior, value-converter, visitor, evaluator, unparser, or helper." },
      { id: "expressionCapability", role: ParameterRole.Filter, summary: "Filter expression exports by capability such as parse, visit, evaluate, build-ast, assign, interpolate, convert-value, or apply-behavior." },
      { id: "renderingStructureKind", role: ParameterRole.Filter, summary: "Filter rendering structure exports by role such as app-root, controller, view, view-factory, hydration, renderer, render-context, render-location, node-sequence, lifecycle-hook, platform-boundary, mount-target, or ssr." },
      { id: "renderingCapability", role: ParameterRole.Filter, summary: "Filter rendering structure exports by capability such as render, hydrate, create-view, control-lifecycle, mount, locate-dom, platform, ssr, or register." },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal, EvidenceKind.Symbol, EvidenceKind.AuLinkAnchor, EvidenceKind.CallSite, EvidenceKind.TypeFact, EvidenceKind.DiRegistration, EvidenceKind.ResourceDefinition],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkEvaluator,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary: "Static evaluator substrate for world-construction facts, closures, and explicit open seams.",
    supportedLoci: [LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.FrameworkStaticEvaluator, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "value", summary: "Evaluator value shape." },
      { id: "effects", summary: "Static world-construction effects." },
      { id: "open-seams", summary: "Unclosed dynamic or unsupported boundaries." },
    ],
    parameters: [
      { id: "memberName", role: ParameterRole.Filter, summary: "Trace a specific member/function root such as register." },
      { id: "calleeName", role: ParameterRole.Filter, summary: "Filter invocation effects by callee symbol or member name." },
      { id: "receiverName", role: ParameterRole.Filter, summary: "Filter invocation effects by receiver binding or symbol name." },
    ],
    outputKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan, EvidenceKind.CallSite, EvidenceKind.OpenSeam],
    defaultBudget: { depth: 20, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkRendering,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary: "Trace Aurelia framework rendering from instruction products through renderer dispatch, binding admission, binding effects, and observer setup.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.TypeScriptProgram, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "Rendering graph rollup across syntax products, instruction slots, binding products, admissions, effects, and setup overrides." },
      { id: "syntax-products", summary: "Syntax producers and the instruction or binding products they expose." },
      { id: "instruction-slots", summary: "Instruction discriminator constants joined to instruction declarations and syntax products." },
      { id: "instruction-dispatches", summary: "Instruction discriminator slot to renderer dispatch edges." },
      { id: "binding-products", summary: "Binding classes reached from renderer construction and controller admission rows." },
      { id: "binding-admissions", summary: "Controller.addBinding admission edges that attach framework binding products to controller lifecycle lists." },
      { id: "binding-effects", summary: "Binding lifecycle declarations and setup effects such as observer lookup, event listeners, and subscriptions." },
      { id: "binding-setups", summary: "Renderer/resource-side calls that install target observers, accessors, or target subscribers on bindings." },
    ],
    parameters: [
      { id: "packageId", role: ParameterRole.Filter, summary: "Filter rendering rows by Aurelia framework package id." },
      { id: "query", role: ParameterRole.Filter, summary: "Filter rendering rows by exact substring." },
      { id: "producerKind", role: ParameterRole.Filter, summary: "Filter syntax product rows by producer kind." },
      { id: "productKind", role: ParameterRole.Filter, summary: "Filter syntax product rows by product kind." },
      { id: "slotName", role: ParameterRole.Filter, summary: "Filter instruction slot rows by exact discriminator constant name." },
      { id: "instructionName", role: ParameterRole.Filter, summary: "Filter instruction slot or syntax product rows by exact instruction class/interface/type name." },
      { id: "bindingName", role: ParameterRole.Filter, summary: "Filter binding rows by exact binding class name." },
      { id: "constructionKind", role: ParameterRole.Filter, summary: "Filter binding admission rows by static construction/admission shape." },
      { id: "effectKind", role: ParameterRole.Filter, summary: "Filter binding effect rows by lifecycle/setup effect kind." },
      { id: "setupKind", role: ParameterRole.Filter, summary: "Filter binding setup rows by target-observer, accessor, or target-subscriber setup kind." },
    ],
    outputKinds: [EvidenceKind.TypeFact, EvidenceKind.CallSite, EvidenceKind.SourceSpan, EvidenceKind.ResourceDefinition],
    defaultBudget: { rows: 100, evidencePerSubject: 5 },
  },
  {
    id: LensId.FrameworkDi,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary: "Trace Aurelia framework DI keys, relationship atoms, registrations, lookups, providers, and materialization mechanics.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.FrameworkDi, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "DI key and provider rollup." },
      { id: "keys", summary: "Framework DI InterfaceSymbol keys discovered from createInterface calls." },
      { id: "facts", summary: "Normalized DI relationship atoms." },
      { id: "relationships", summary: "Normalized DI relationship atoms with relation/mechanism/phase axes." },
      { id: "registrations", summary: "Kernel DI registration, resolver, provider, alias, and slot-write atoms." },
      { id: "providers", summary: "DI key provider and alias targets where the source exposes them exactly." },
      { id: "lookups", summary: "Kernel DI lookup and resolution atoms." },
      { id: "materializations", summary: "Kernel DI factory and construction atoms." },
      { id: "evidence", summary: "Source-backed relationship atom evidence." },
    ],
    parameters: [
      { id: "packageId", role: ParameterRole.Filter, summary: "Filter DI rows by Aurelia framework package id." },
      { id: "relation", role: ParameterRole.Filter, summary: "Filter relationship atoms by semantic relation." },
      { id: "mechanism", role: ParameterRole.Filter, summary: "Filter relationship atoms by runtime/source mechanism." },
      { id: "phase", role: ParameterRole.Filter, summary: "Filter relationship atoms by DI/world phase." },
      { id: "key", role: ParameterRole.Filter, summary: "Filter DI rows by InterfaceSymbol name or key expression." },
      { id: "strategy", role: ParameterRole.Filter, summary: "Filter DI rows by resolver strategy." },
      { id: "query", role: ParameterRole.Filter, summary: "Filter DI rows by exact substring." },
    ],
    outputKinds: [EvidenceKind.DiRegistration, EvidenceKind.DiLookup, EvidenceKind.OpenSeam, EvidenceKind.TypeFact, EvidenceKind.SourceSpan],
    defaultBudget: { rows: 120, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkMaterialization,
    family: LensFamily.Framework,
    stage: LensStage.Implemented,
    summary: "Join DI provider seeds and checker facts into first-pass materialization routes.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.FrameworkDi, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "Materialization rollup." },
      { id: "routes", summary: "DI key provider routes toward instance, constructable, callback, or alias materialization." },
      { id: "dependencies", summary: "Container dependency calls observed inside callback provider routes." },
      { id: "relationships", summary: "Graph relationships from keys to providers and callback dependency keys." },
      { id: "facts", summary: "Normalized materialization route facts." },
      { id: "evidence", summary: "Source-backed materialization route evidence and open seams." },
    ],
    parameters: [
      { id: "packageId", role: ParameterRole.Filter, summary: "Filter materialization routes by Aurelia framework package id." },
      { id: "key", role: ParameterRole.Filter, summary: "Filter materialization routes by DI key or provider expression name." },
      { id: "strategy", role: ParameterRole.Filter, summary: "Filter materialization routes by resolver strategy." },
      { id: "routeKind", role: ParameterRole.Filter, summary: "Filter materialization routes by route kind." },
      { id: "relation", role: ParameterRole.Filter, summary: "Filter materialization graph rows by relationship kind." },
      { id: "dependencyKey", role: ParameterRole.Filter, summary: "Filter callback dependency rows by dependency key." },
      { id: "dependencyAccess", role: ParameterRole.Filter, summary: "Filter callback dependency rows by container access kind." },
      { id: "dependencyPolicy", role: ParameterRole.Filter, summary: "Filter callback dependency rows by direct, guarded, fallback, repeated, or deferred policy." },
      { id: "certainty", role: ParameterRole.Filter, summary: "Filter callback dependency rows by evaluator certainty." },
      { id: "query", role: ParameterRole.Filter, summary: "Filter materialization routes by exact substring." },
    ],
    outputKinds: [EvidenceKind.DiRegistration, EvidenceKind.DiLookup, EvidenceKind.TypeFact, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam],
    defaultBudget: { rows: 100, groups: 40, facts: 120, routes: 80, evidencePerSubject: 3 },
  },
  {
    id: LensId.AtlasSelf,
    family: LensFamily.Atlas,
    stage: LensStage.Implemented,
    summary: "Maintain Atlas by inspecting inquiry/lens wiring, contract pressure, and static coherence evidence.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol],
    requiredSubstrates: [SubstrateId.AtlasContracts, SubstrateId.TypeScriptProgram],
    projections: [
      { id: "summary", summary: "Maintenance orientation." },
      { id: "pressure", summary: "Refactor pressure and missing contract evidence." },
      { id: "wiring", summary: "Lens, substrate, and answer-shape wiring." },
    ],
    outputKinds: [EvidenceKind.MaintenanceSignal, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam],
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
