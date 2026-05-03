import type { SourceRange } from "../inquiry/locus.js";
import type {
  TypeScriptCallSiteEntry,
  TypeScriptExpressionFact,
} from "../source/index.js";
import type { FrameworkResourceDefinitionKind } from "./resources.js";

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
  /** Template/compiler instruction production relationships. */
  Compiler = "compiler",
  /** Controller, binding, resource, and task lifecycle relationships. */
  Lifecycle = "lifecycle",
  /** Observer location, subscription, dirty-checking, and reactivity relationships. */
  Observation = "observation",
  /** Cross-domain routes that explain where runtime values come into existence. */
  Materialization = "materialization",
  /** Configuration/registry admission relationships into the framework world. */
  Admission = "admission",
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
  MaterializesThrough = "materializes-through",
  InstantiatesKey = "instantiates-key",
  DependsOnKey = "depends-on-key",
  ConstructsInstance = "constructs-instance",
  CreatesController = "creates-controller",
  AdmitsChildController = "admits-child-controller",
  InvokesRegistry = "invokes-registry",
  CreatesContainer = "creates-container",
  /** Configuration or bundle evaluation admits a typed endpoint into the framework world. */
  AdmitsValue = "admits-value",
  RegistersResource = "registers-resource",
  LooksUpResource = "looks-up-resource",
  ResolvesResource = "resolves-resource",
  AppliesResource = "applies-resource",
  InvokesLifecycle = "invokes-lifecycle",
  TransitionsLifecycleState = "transitions-lifecycle-state",
  ProducesInstruction = "produces-instruction",
  DispatchesInstruction = "dispatches-instruction",
  ProducesBinding = "produces-binding",
  AdmitsBinding = "admits-binding",
  PerformsBindingEffect = "performs-binding-effect",
  LooksUpObserver = "looks-up-observer",
  ConfiguresObservation = "configures-observation",
  StoresWatchDefinition = "stores-watch-definition",
  ReadsWatchDefinition = "reads-watch-definition",
  ParsesExpression = "parses-expression",
  EvaluatesExpression = "evaluates-expression",
  CollectsDependency = "collects-dependency",
  SchedulesEffect = "schedules-effect",
  InvokesCallback = "invokes-callback",
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
  RegisterCall = "register-call",
  RegistrationHelper = "registration-helper",
  CatalogExpansion = "catalog-expansion",
  RegisterFactory = "register-factory",
  UnknownArgument = "unknown-argument",
  ResourceRegister = "resource-register",
  ResourceFind = "resource-find",
  ResourceGet = "resource-get",
  AstEvaluatorResource = "ast-evaluator-resource",
  BindingCommandResolver = "binding-command-resolver",
  BindingCommandBuild = "binding-command-build",
  InstructionFactory = "instruction-factory",
  ControllerLifecycle = "controller-lifecycle",
  LifecycleHookDispatch = "lifecycle-hook-dispatch",
  AppTaskLifecycle = "app-task-lifecycle",
  SyntaxProduct = "syntax-product",
  RendererDispatch = "renderer-dispatch",
  RendererControllerFactory = "renderer-controller-factory",
  ControllerAddChild = "controller-add-child",
  RecursiveRendererDispatch = "recursive-renderer-dispatch",
  TemplateControllerLink = "template-controller-link",
  BindingConstruction = "binding-construction",
  ControllerAddBinding = "controller-add-binding",
  BindingLifecycle = "binding-lifecycle",
  ObserverLookup = "observer-lookup",
  BindingSetup = "binding-setup",
  ObserverLocator = "observer-locator",
  NodeObserverLocator = "node-observer-locator",
  ObserverCache = "observer-cache",
  DirtyChecker = "dirty-checker",
  Connectable = "connectable",
  CollectionObserver = "collection-observer",
  WatchDecorator = "watch-decorator",
  WatchRegistry = "watch-registry",
  WatchMetadata = "watch-metadata",
  Watcher = "watcher",
  Effect = "effect",
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
  ConfigurationEvaluation = "configuration-evaluation",
  RegistrationAdmission = "registration-admission",
  CatalogExpansion = "catalog-expansion",
  FactoryAdmission = "factory-admission",
  LifecycleTaskAdmission = "lifecycle-task-admission",
  Compilation = "compilation",
  Hydration = "hydration",
  Rendering = "rendering",
  Binding = "binding",
  Observation = "observation",
  Lifecycle = "lifecycle",
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
  ConfigurationExport = "configuration-export",
  Resource = "resource",
  RegistryExport = "registry-export",
  RegistrationCatalog = "registration-catalog",
  AppTask = "app-task",
  Factory = "factory",
  RegistrationArgument = "registration-argument",
  Unknown = "unknown",
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
  /** Optional resource definition kind when the endpoint is a resource carrier. */
  readonly resourceKind?: FrameworkResourceDefinitionKind;
  /** Optional resource lookup name when the endpoint is a resource carrier. */
  readonly resourceName?: string | null;
}

/** One typed relationship atom. */
export interface FrameworkRelationshipAtom {
  /** Stable atom id inside the current source basis. */
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
