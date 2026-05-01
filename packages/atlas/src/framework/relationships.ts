import type { SourceRange } from "../inquiry/locus.js";
import type { TypeScriptCallSiteEntry, TypeScriptExpressionFact } from "../source/index.js";

/** Broad framework relationship family. */
export const enum FrameworkRelationshipFamily {
  /** Source/package/symbol identity and provenance relationships. */
  Identity = "identity",
  /** Aurelia kernel DI relationships. */
  Di = "di",
  /** Aurelia resource/catalog relationships. */
  Resource = "resource",
  /** Compilation, instruction, renderer, binding, and observation relationships. */
  Rendering = "rendering",
  /** Cross-domain routes that explain where runtime values come into existence. */
  Materialization = "materialization",
}

/** Semantic relation expressed by one atom. Kept separate from mechanism and phase. */
export const enum FrameworkRelationshipRelation {
  DefinesKey = "defines-key",
  CreatesRegistration = "creates-registration",
  CreatesResolver = "creates-resolver",
  RegistersProvider = "registers-provider",
  ProvidesKey = "provides-key",
  AliasesKey = "aliases-key",
  StoresResolverSlot = "stores-resolver-slot",
  StoresResourceSlot = "stores-resource-slot",
  LooksUpKey = "looks-up-key",
  ResolvesKey = "resolves-key",
  DelegatesLookup = "delegates-lookup",
  CreatesFactory = "creates-factory",
  MaterializesKey = "materializes-key",
  ConstructsInstance = "constructs-instance",
  InvokesRegistry = "invokes-registry",
  CreatesContainer = "creates-container",
}

/** Runtime or source mechanism that produced the relation. */
export const enum FrameworkRelationshipMechanism {
  CreateInterface = "create-interface",
  ResolverBuilder = "resolver-builder",
  RegistrationFactory = "registration-factory",
  ResolverConstructor = "resolver-constructor",
  ContainerRegister = "container-register",
  ContainerRegisterResolver = "container-register-resolver",
  ResolverStore = "resolver-store",
  ResourceStore = "resource-store",
  ContainerGet = "container-get",
  ContainerGetAll = "container-get-all",
  ContainerGetResolver = "container-get-resolver",
  ContainerHas = "container-has",
  ContainerFind = "container-find",
  ContainerInvoke = "container-invoke",
  ResolverResolve = "resolver-resolve",
  ResolverGetFactory = "resolver-get-factory",
  FactoryConstruct = "factory-construct",
  ResolverHelper = "resolver-helper",
  JitRegister = "jit-register",
  ContainerChild = "container-child",
}

/** Aurelia lifecycle/world phase where a relationship participates. */
export const enum FrameworkRelationshipPhase {
  Definition = "definition",
  Registration = "registration",
  Lookup = "lookup",
  Resolution = "resolution",
  Materialization = "materialization",
  ContainerConstruction = "container-construction",
  ResourceLookup = "resource-lookup",
}

/** Evidence basis that justifies one relationship atom. */
export const enum FrameworkRelationshipEvidenceBasis {
  Syntax = "syntax",
  Checker = "checker",
  KernelSource = "kernel-source",
  StaticEvaluator = "static-evaluator",
}

/** Closure class for one relationship atom. */
export const enum FrameworkRelationshipClosure {
  /** The atom is exact within the syntax/checker basis it declares. */
  Exact = "exact",
  /** The atom is a runtime-model relationship backed by exact source mechanics. */
  Modeled = "modeled",
  /** The relationship is visible, but important target details remain open. */
  Partial = "partial",
  /** The relationship explicitly marks a dynamic or unsupported boundary. */
  Open = "open",
}

/** DI resolver strategy names used by Aurelia's kernel. */
export const enum FrameworkDiResolverStrategy {
  Instance = "instance",
  Singleton = "singleton",
  Transient = "transient",
  Callback = "callback",
  CachedCallback = "cached-callback",
  Array = "array",
  Alias = "alias",
  Defer = "defer",
  Unknown = "unknown",
}

/** Endpoint kind used by relationship atoms. */
export const enum FrameworkRelationshipEndpointKind {
  Package = "package",
  Symbol = "symbol",
  Method = "method",
  CallSite = "call-site",
  Expression = "expression",
  DiKey = "di-key",
  ResolverStrategy = "resolver-strategy",
  ContainerSlot = "container-slot",
  Concept = "concept",
}

/** Serializable relationship endpoint. */
export interface FrameworkRelationshipEndpoint {
  /** Endpoint kind. */
  readonly kind: FrameworkRelationshipEndpointKind;
  /** Human-readable endpoint name. */
  readonly name: string;
  /** Package id when the endpoint is source-backed. */
  readonly packageId?: string;
  /** Package name when the endpoint is source-backed. */
  readonly packageName?: string;
  /** Source range when this endpoint has an exact declaration or expression. */
  readonly source?: SourceRange;
  /** Checker expression fact when the endpoint is expression-backed. */
  readonly expression?: TypeScriptExpressionFact;
}

/** One typed relationship atom. */
export interface FrameworkRelationshipAtom {
  /** Stable atom id inside the current source/cache basis. */
  readonly id: string;
  /** Broad relationship family. */
  readonly family: FrameworkRelationshipFamily;
  /** Semantic edge being asserted. */
  readonly relation: FrameworkRelationshipRelation;
  /** Mechanism that produced the edge. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Runtime/world phase where this relation participates. */
  readonly phase: FrameworkRelationshipPhase;
  /** Evidence basis used to emit this atom. */
  readonly evidenceBasis: FrameworkRelationshipEvidenceBasis;
  /** Closure class for this atom. */
  readonly closure: FrameworkRelationshipClosure;
  /** Package that owns the source evidence for the atom. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Source-side relationship origin. */
  readonly from: FrameworkRelationshipEndpoint;
  /** Relationship target. */
  readonly to: FrameworkRelationshipEndpoint;
  /** Exact source range for the relationship evidence. */
  readonly source: SourceRange;
  /** Optional checker-backed call or constructor site. */
  readonly callSite?: TypeScriptCallSiteEntry;
  /** Optional DI key name or expression text observed at this site. */
  readonly key?: string;
  /** Optional value/provider expression text observed at this site. */
  readonly value?: string;
  /** Optional resolver strategy for DI relationships. */
  readonly strategy?: FrameworkDiResolverStrategy;
  /** Short human-facing summary. */
  readonly summary: string;
}
