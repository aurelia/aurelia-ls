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
    stage: LensStage.Contracted,
    summary: "Inspect exact source text, source ranges, and source-backed evidence.",
    supportedLoci: [LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.GitTree],
    requiredSubstrates: [SubstrateId.SourceFiles, SubstrateId.TypeScriptProgram],
    projections: [
      { id: "summary", summary: "Source metadata and evidence handles." },
      { id: "text", summary: "Bounded source text.", defaultBudget: { textChars: 20_000 } },
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
    stage: LensStage.Contracted,
    summary: "Read TypeScript project shape: API surface, module graph, declarations, symbols, imports, and exports.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol],
    requiredSubstrates: [SubstrateId.SourceFiles, SubstrateId.TypeScriptProgram],
    projections: [
      { id: "summary", summary: "Scope rollup." },
      { id: "api", summary: "API surface and declaration rows." },
      { id: "module-graph", summary: "Import/export graph rows." },
      { id: "symbols", summary: "Symbol search and document symbol rows." },
    ],
    outputKinds: [EvidenceKind.SourceSpan, EvidenceKind.Symbol, EvidenceKind.MaintenanceSignal],
    defaultBudget: { rows: 120 },
  },
  {
    id: LensId.TsType,
    family: LensFamily.TypeScript,
    stage: LensStage.Contracted,
    summary: "Inspect checker facts for symbols, source ranges, reference roles, call hierarchy, and carrier flow.",
    supportedLoci: [LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.TypeScriptChecker],
    projections: [
      { id: "facts", summary: "Checker-visible type, signature, and symbol facts." },
      { id: "references", summary: "Reference and role evidence." },
      { id: "flow", summary: "Carrier and method-effect evidence." },
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
    stage: LensStage.Contracted,
    summary: "Read narrow product-to-framework anchors declared through auLink.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.ProductAuLink, SubstrateId.ProductKernel, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "auLink rollup." },
      { id: "anchors", summary: "Product class to framework symbol anchors." },
      { id: "gaps", summary: "Missing, stale, or ambiguous anchor pressure." },
    ],
    outputKinds: [EvidenceKind.AuLinkAnchor, EvidenceKind.SourceSpan, EvidenceKind.Symbol, EvidenceKind.OpenSeam],
    defaultBudget: { rows: 80 },
  },
  {
    id: LensId.FrameworkEvaluator,
    family: LensFamily.Framework,
    stage: LensStage.Contracted,
    summary: "Static evaluator substrate for world-construction facts, closures, and explicit open seams.",
    supportedLoci: [LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.FrameworkStaticEvaluator, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "value", summary: "Evaluator value shape." },
      { id: "effects", summary: "Static world-construction effects." },
      { id: "open-seams", summary: "Unclosed dynamic or unsupported boundaries." },
    ],
    outputKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam],
    defaultBudget: { depth: 20, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkDi,
    family: LensFamily.Framework,
    stage: LensStage.Contracted,
    summary: "Trace Aurelia framework DI keys, registrations, lookup sites, providers, and evaluator closure limits.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.FrameworkDi, SubstrateId.FrameworkStaticEvaluator, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "DI key and provider rollup." },
      { id: "facts", summary: "Normalized registration and lookup facts." },
      { id: "evidence", summary: "Source evidence and open seams." },
    ],
    outputKinds: [EvidenceKind.DiRegistration, EvidenceKind.DiLookup, EvidenceKind.OpenSeam, EvidenceKind.TypeFact, EvidenceKind.SourceSpan],
    defaultBudget: { rows: 120, evidencePerSubject: 3 },
  },
  {
    id: LensId.FrameworkMaterialization,
    family: LensFamily.Framework,
    stage: LensStage.Contracted,
    summary: "Join DI provider seeds, evaluator facts, typed sinks, and returned contracts into materialization corridors.",
    supportedLoci: [LocusKind.Repo, LocusKind.RepoArea, LocusKind.Package, LocusKind.SourceFile, LocusKind.SourceRange, LocusKind.Symbol, LocusKind.Handle],
    requiredSubstrates: [SubstrateId.FrameworkDi, SubstrateId.FrameworkStaticEvaluator, SubstrateId.TypeScriptChecker],
    projections: [
      { id: "summary", summary: "Materialization rollup." },
      { id: "routes", summary: "Provider-method corridors." },
      { id: "facts", summary: "Normalized contract flow facts." },
      { id: "evidence", summary: "Nested evidence and open seams." },
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
