import ts from "typescript";

import {
  FRAMEWORK_DISCOVERY_SEEDS,
  FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID,
  FrameworkAnchorResolutionStatus,
  FrameworkExportCapability,
  frameworkJsonCacheProducerVersion,
  groupFrameworkFlowCallTargets,
  readFrameworkDiscoveryIndex,
  readFrameworkDiscoverySeedIndex,
  readFrameworkJsonCachePackage,
  sourceRangeForFrameworkAnchorCandidate,
  sourceRangeForFrameworkFlowCallEdge,
  sourceRangeForFrameworkFlowCallSite,
  writeFrameworkJsonCachePackage,
  type FrameworkAnchorResolution,
  type FrameworkDiscoveryAnchor,
  type FrameworkFlowCallEdgeRow,
  type FrameworkFlowCallSiteRow,
  type FrameworkFlowCallTargetRow,
  type FrameworkFlowSeedRow,
  type FrameworkFlowDefinition,
} from "../../framework/index.js";
import {
  EvaluationValueKind,
  StaticEvaluator,
  readEvaluationEffectTrace,
  type EvaluationInvocationEffect,
  type EvaluationInvocationArgumentEffect,
  type ModuleEvaluationResult,
} from "../../evaluation/index.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  readCallSites,
  readExportNames,
  readExportSurface,
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  SourceSelectorScheme,
  SourceDeclarationKind,
  SourceTargetKind,
  sourceSelectorForRange,
  type SourceProject,
  type SourceFileIdentity,
  type SourceSpan,
  type SourceTargetRow,
  type TypeScriptCallSiteEntry,
  type TypeScriptExpressionFact,
  type TypeScriptExportNameEntry,
  type TypeScriptExportSurfaceEntry,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisAuthority, BasisClosure, BasisFreshness, BasisKind, type Basis } from "../basis.js";
import { clampBudget } from "../budget.js";
import { ContinuationKind, ContinuationPriority, type Continuation } from "../continuation.js";
import { EvidenceConfidence, EvidenceKind, EvidenceRole, type Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import { NavigationPlane, NavigationRelation, type NavigationRouteClaim } from "../navigation.js";

/** Value returned by the framework.discovery runtime lens. */
export interface FrameworkDiscoveryValue {
  /** seed schema version. */
  readonly seedVersion: string;
  /** Number of framework flow definitions after filtering. */
  readonly flowCount: number;
  /** Number of seed anchors after filtering. */
  readonly anchorCount: number;
  /** Resolution counts for seed anchors. */
  readonly anchorResolution: {
    /** Anchors with exactly one matching framework declaration. */
    readonly resolved: number;
    /** Anchors with multiple matching framework declarations. */
    readonly ambiguous: number;
    /** Anchors with no matching framework declaration. */
    readonly unresolved: number;
    /** Anchors whose package is not admitted by the source project. */
    readonly packageUnadmitted: number;
  };
  /** Framework flow rows returned for flow-aware projections. */
  readonly flows?: readonly FrameworkFlowDefinition[];
  /** Seed anchor rows joined to exact source declaration candidates. */
  readonly anchors?: readonly FrameworkAnchorResolution[];
  /** Source-bound flow seed rows returned before full semantic route indexing exists. */
  readonly flowSeeds?: readonly FrameworkFlowSeedRow[];
  /** Precomputed call-hierarchy rows attached to flow seeds. */
  readonly callEdges?: readonly FrameworkFlowCallEdgeRow[];
  /** Exact call-site rows expanded from precomputed framework flow call edges. */
  readonly callSites?: readonly FrameworkFlowCallSiteRow[];
  /** Grouped callee targets derived from framework flow call edges. */
  readonly callTargets?: readonly FrameworkFlowCallTargetRow[];
  /** Checker-visible exports from admitted Aurelia framework package entrypoints. */
  readonly packageExports?: readonly FrameworkPackageExportRow[];
  /** Framework package exports with structural registry/configuration capabilities. */
  readonly registryExports?: readonly FrameworkRegistryExportRow[];
  /** Framework package exports that are direct or indirect DI.createInterface return values. */
  readonly diInterfaces?: readonly FrameworkDiInterfaceExportRow[];
  /** Source-exported framework declarations that carry resource definition headers. */
  readonly resourceCarriers?: readonly FrameworkResourceCarrierRow[];
  /** Framework package exports that carry resource definition headers. */
  readonly resources?: readonly FrameworkResourceExportRow[];
  /** Registry/configuration exports with evaluator-derived registration associations. */
  readonly bundles?: readonly FrameworkBundleExportRow[];
  /** Syntax/resource producers and the instruction or binding products they expose. */
  readonly syntaxProducts?: readonly FrameworkSyntaxProductRow[];
  /** Instruction discriminator constants joined to instruction declarations and syntax products. */
  readonly instructionSlots?: readonly FrameworkInstructionSlotRow[];
  /** Instruction slot to renderer dispatch rows. */
  readonly instructionDispatches?: readonly FrameworkInstructionDispatchRow[];
  /** Binding classes joined to renderer construction products and observer/lifecycle surfaces. */
  readonly bindingProducts?: readonly FrameworkBindingProductRow[];
  /** Exact controller.addBinding admission edges for framework binding-like products. */
  readonly bindingAdmissions?: readonly FrameworkBindingAdmissionRow[];
  /** Binding lifecycle and setup effect rows discovered inside binding classes. */
  readonly bindingEffects?: readonly FrameworkBindingEffectRow[];
  /** Binding setup calls that alter target observers, accessors, or subscribers outside the binding class. */
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  /** Public observer-system exports: locators, observers, accessors, subscribers, connectables, effects, and signals. */
  readonly observers?: readonly FrameworkObserverEntityRow[];
  /** Public AppTask, lifecycle-task, and scheduler/task queue exports. */
  readonly appTasks?: readonly FrameworkAppTaskEntityRow[];
  /** Public router and route-recognizer entities. */
  readonly routerEntities?: readonly FrameworkRouterEntityRow[];
  /** Public expression-parser and expression runtime entities. */
  readonly expressionEntities?: readonly FrameworkExpressionEntityRow[];
  /** Public rendering, hydration, controller, view, and lifecycle-structure entities. */
  readonly renderingStructures?: readonly FrameworkRenderingStructureEntityRow[];
  /** Open discovery questions returned by the seed. */
  readonly openQuestions?: readonly string[];
}

/** Value returned by the framework.rendering runtime lens. */
export interface FrameworkRenderingValue {
  /** Discovery seed schema version used as the orientation basis for rendering rows. */
  readonly seedVersion: string;
  /** Syntax product count after filtering, when computed. */
  readonly syntaxProductCount?: number;
  /** Instruction slot count after filtering, when computed. */
  readonly instructionSlotCount?: number;
  /** Instruction dispatch count after filtering, when computed. */
  readonly instructionDispatchCount?: number;
  /** Binding product count after filtering, when computed. */
  readonly bindingProductCount?: number;
  /** Binding admission count after filtering, when computed. */
  readonly bindingAdmissionCount?: number;
  /** Binding effect count after filtering, when computed. */
  readonly bindingEffectCount?: number;
  /** Binding setup count after filtering, when computed. */
  readonly bindingSetupCount?: number;
  /** Syntax/resource producers and the instruction or binding products they expose. */
  readonly syntaxProducts?: readonly FrameworkSyntaxProductRow[];
  /** Instruction discriminator constants joined to declarations and syntax products. */
  readonly instructionSlots?: readonly FrameworkInstructionSlotRow[];
  /** Instruction slot to renderer dispatch rows. */
  readonly instructionDispatches?: readonly FrameworkInstructionDispatchRow[];
  /** Binding classes joined to construction, admission, lifecycle, and observer surfaces. */
  readonly bindingProducts?: readonly FrameworkBindingProductRow[];
  /** Exact controller.addBinding admission edges for framework binding-like products. */
  readonly bindingAdmissions?: readonly FrameworkBindingAdmissionRow[];
  /** Binding lifecycle and setup effect rows discovered inside binding classes. */
  readonly bindingEffects?: readonly FrameworkBindingEffectRow[];
  /** Binding setup calls that alter target observers, accessors, or subscribers outside the binding class. */
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
}

/** Export row from one admitted Aurelia framework package surface. */
export interface FrameworkPackageExportRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the export surface. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Checker-visible package export row. */
  readonly exportEntry: TypeScriptExportSurfaceEntry;
}

/** Package export with structural registry/configuration capability axes. */
export interface FrameworkRegistryExportRow extends FrameworkPackageExportRow {
  /** Structural capabilities observed from checker-visible exported value members. */
  readonly capabilities: readonly FrameworkExportCapability[];
}

/** Exported Aurelia DI interface symbol discovered from createInterface call provenance. */
export interface FrameworkDiInterfaceExportRow extends FrameworkPackageExportRow {
  /** Interface key/name supplied to createInterface, or the export name when omitted. */
  readonly interfaceKey: string;
  /** Exact createInterface call that produced the exported InterfaceSymbol. */
  readonly createInterfaceCall: TypeScriptCallSiteEntry;
  /** Resolver-builder calls observed inside the createInterface builder callback. */
  readonly builderCalls: readonly TypeScriptCallSiteEntry[];
  /** True when the InterfaceSymbol call is nested inside another expression such as Object.assign(...). */
  readonly indirect: boolean;
}

/** Aurelia resource definition kind as observed from a framework package export carrier. */
export const enum FrameworkResourceDefinitionKind {
  CustomElement = "custom-element",
  CustomAttribute = "custom-attribute",
  TemplateController = "template-controller",
  ValueConverter = "value-converter",
  BindingBehavior = "binding-behavior",
  BindingCommand = "binding-command",
  AttributePattern = "attribute-pattern",
  Renderer = "renderer",
}

/** Source carrier lane that produced a framework resource export row. */
export const enum FrameworkResourceCarrierKind {
  Decorator = "decorator",
  StaticAu = "static-$au",
  DefineCall = "define-call",
  AttributePatternCreate = "attribute-pattern-create",
  RendererHelper = "renderer-helper",
}

/** Public Aurelia framework export that carries a resource definition header. */
export interface FrameworkResourceCarrierRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the source carrier. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Top-level exported source declaration name that carries the resource header. */
  readonly sourceExportName: string;
  /** Source-export carrier entry, independent of package entrypoint publicness. */
  readonly carrierEntry: TypeScriptExportSurfaceEntry;
  /** Resource definition kind observed from the carrier. */
  readonly resourceKind: FrameworkResourceDefinitionKind;
  /** Source carrier lane that exposed the resource. */
  readonly carrierKind: FrameworkResourceCarrierKind;
  /** Static resource lookup name when visible from the carrier. */
  readonly resourceName: string | null;
  /** Static aliases read from the carrier definition, when present. */
  readonly aliases: readonly string[];
  /** Best local target name behind the resource carrier. */
  readonly targetName: string | null;
  /** Exact carrier source range. */
  readonly source: SourceRange;
}

/** Public Aurelia framework package export that points at a resource source carrier. */
export interface FrameworkResourceExportRow extends FrameworkPackageExportRow {
  /** Source-level resource carrier behind this public export. */
  readonly carrier: FrameworkResourceCarrierRow;
  /** Resource definition kind observed from the carrier. */
  readonly resourceKind: FrameworkResourceDefinitionKind;
  /** Source carrier lane that exposed the resource. */
  readonly carrierKind: FrameworkResourceCarrierKind;
  /** Static resource lookup name when visible from the carrier. */
  readonly resourceName: string | null;
  /** Static aliases read from the carrier definition, when present. */
  readonly aliases: readonly string[];
  /** Best local target name behind the resource carrier. */
  readonly targetName: string | null;
  /** Exact carrier source range. */
  readonly source: SourceRange;
}

/** Bundle association kind produced by evaluating registry/configuration exports. */
export const enum FrameworkBundleAssociationKind {
  /** A register argument contributes a DI InterfaceSymbol registration key. */
  DiInterfaceRegistration = "di-interface-registration",
  /** A register argument contributes an Aurelia resource carrier. */
  ResourceRegistration = "resource-registration",
  /** A register argument is an array/catalog whose elements are expanded separately. */
  RegistrationCatalog = "registration-catalog",
  /** A register argument contributes another registry/configuration export. */
  RegistryExportRegistration = "registry-export-registration",
  /** A register argument is a static helper-produced registration product. */
  RegistrationHelper = "registration-helper",
  /** A register argument contributes an Aurelia AppTask lifecycle admission. */
  AppTaskRegistration = "app-task-registration",
  /** A container factory registration contributes a DI key/factory admission. */
  FactoryRegistration = "factory-registration",
  /** A register argument is a concrete value/class/function accepted by registration. */
  RegistrationArgument = "registration-argument",
  /** A register argument is visible but not yet semantically classified. */
  UnknownRegistrationArgument = "unknown-registration-argument",
}

/** One evaluated association between a registry/configuration bundle and a registration argument. */
export interface FrameworkBundleAssociationRow {
  /** Stable association id. */
  readonly id: string;
  /** Bundle package id. */
  readonly packageId: string;
  /** Bundle package name. */
  readonly packageName: string;
  /** Exported bundle/configuration name. */
  readonly exportName: string;
  /** Association classifier. */
  readonly associationKind: FrameworkBundleAssociationKind;
  /** Evaluator effect id that exposed this association. */
  readonly effectId: string;
  /** Evaluator effect sequence number. */
  readonly effectSequence: number;
  /** Static evaluator certainty for the effect path. */
  readonly certainty: string;
  /** Register/helper argument index that produced this association. */
  readonly argumentIndex: number;
  /** True when the original register argument was syntactically spread. */
  readonly spread: boolean;
  /** Path inside nested array/catalog expansion. */
  readonly path: readonly string[];
  /** Name of the surrounding catalog/array export, when this came from one. */
  readonly catalogName: string | null;
  /** Registration helper call name, when the association came through one. */
  readonly helperName: string | null;
  /** Best visible target name for the argument. */
  readonly targetName: string | null;
  /** Checker-backed expression fact for the exact argument or expanded element. */
  readonly expression: TypeScriptExpressionFact;
  /** Source range of the exact argument or expanded element. */
  readonly source: SourceRange;
  /** Matched DI InterfaceSymbol export, when closed. */
  readonly diInterface?: FrameworkDiInterfaceExportRow;
  /** Matched resource source carrier, when closed. */
  readonly resourceCarrier?: FrameworkResourceCarrierRow;
  /** Matched registry export, when closed. */
  readonly registryExport?: FrameworkRegistryExportRow;
}

/** Registry/configuration package export with evaluator-derived registration associations. */
export interface FrameworkBundleExportRow extends FrameworkRegistryExportRow {
  /** Number of evaluator effects observed while tracing the register member. */
  readonly effectCount: number;
  /** Normalized registration associations discovered from evaluator effects. */
  readonly associations: readonly FrameworkBundleAssociationRow[];
  /** Number of evaluator open seams observed while tracing this bundle. */
  readonly openSeamCount: number;
}

/** Source producer lane that exposes a lower-level syntax/runtime product. */
export const enum FrameworkSyntaxProducerKind {
  /** A binding-command class with a build(...) method. */
  BindingCommand = "binding-command",
  /** An IRenderer value registered through the renderer(...) helper. */
  Renderer = "renderer",
  /** A function or method that emits instruction records outside binding-command build(...). */
  InstructionFactory = "instruction-factory",
}

/** Product relation exposed by a framework syntax/runtime producer. */
export const enum FrameworkSyntaxProductKind {
  /** Binding-command build(...) constructs an instruction. */
  BuildsInstruction = "builds-instruction",
  /** Renderer declares the instruction target it handles. */
  HandlesInstruction = "handles-instruction",
  /** Renderer materializes a binding or binding factory call. */
  CreatesBinding = "creates-binding",
  /** Instruction factory emits an instruction record literal. */
  EmitsInstruction = "emits-instruction",
}

/** A lower-level production row behind a resource or source-level framework producer. */
export interface FrameworkSyntaxProductRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the producer. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Source declaration/export name for the producer. */
  readonly producerName: string;
  /** Producer lane. */
  readonly producerKind: FrameworkSyntaxProducerKind;
  /** Product relation. */
  readonly productKind: FrameworkSyntaxProductKind;
  /** Resource carrier behind the producer, when the source producer has a resource header. */
  readonly resourceCarrier?: FrameworkResourceCarrierRow;
  /** Instruction class/interface/type observed from construction or renderer parameter typing. */
  readonly instructionName: string | null;
  /** Renderer target discriminator expression text, usually an it* constant. */
  readonly instructionTarget: string | null;
  /** Binding class/factory observed inside renderer materialization. */
  readonly bindingName: string | null;
  /** Exact checker-backed expression fact for the production site. */
  readonly expression: TypeScriptExpressionFact;
  /** Exact production source range. */
  readonly source: SourceRange;
}

/** Declaration that binds an instruction type/class/interface to a runtime slot discriminator. */
export interface FrameworkInstructionDeclarationRow {
  /** Instruction class/interface/type name. */
  readonly instructionName: string;
  /** Source declaration kind for the instruction shape. */
  readonly declarationKind: SourceDeclarationKind;
  /** Exact declaration source range. */
  readonly source: SourceRange;
  /** Exact type-property declaration range that references the slot. */
  readonly typePropertySource: SourceRange;
}

/** Runtime instruction slot constant plus static products that target it. */
export interface FrameworkInstructionSlotRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that declares the slot constant. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Runtime discriminator constant name, usually it*. */
  readonly slotName: string;
  /** Numeric runtime discriminator when statically visible. */
  readonly slotValue: number | null;
  /** Exact checker-backed expression fact for the slot value initializer. */
  readonly valueExpression: TypeScriptExpressionFact;
  /** Exact slot declaration source range. */
  readonly source: SourceRange;
  /** Instruction declarations whose type property references this slot. */
  readonly instructionDeclarations: readonly FrameworkInstructionDeclarationRow[];
  /** Syntax product rows that construct or handle this slot. */
  readonly syntaxProducts: readonly FrameworkSyntaxProductRow[];
}

/** Dispatch edge from an instruction discriminator slot to the renderer that handles it. */
export interface FrameworkInstructionDispatchRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the renderer. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Runtime discriminator constant name. */
  readonly slotName: string;
  /** Numeric runtime discriminator when statically visible. */
  readonly slotValue: number | null;
  /** Instruction class/interface/type consumed by the renderer. */
  readonly instructionName: string | null;
  /** Renderer producer/export name. */
  readonly rendererName: string;
  /** Renderer syntax product row that handles this slot. */
  readonly rendererProduct: FrameworkSyntaxProductRow;
  /** Instruction slot row behind the dispatch. */
  readonly instructionSlot: FrameworkInstructionSlotRow;
  /** Exact renderer target source range. */
  readonly source: SourceRange;
}

/** Constructor parameter summary for a binding class. */
export interface FrameworkBindingConstructorParameterRow {
  /** Parameter name. */
  readonly name: string;
  /** Type annotation text, when present. */
  readonly typeText: string | null;
}

/** Binding class materialized by framework renderers. */
export interface FrameworkBindingProductRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the binding class. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Binding class name. */
  readonly bindingName: string;
  /** Source declaration kind for the binding shape. */
  readonly declarationKind: SourceDeclarationKind;
  /** Exact binding class source range. */
  readonly source: SourceRange;
  /** Renderer syntax products that materialize this binding. */
  readonly constructionProducts: readonly FrameworkSyntaxProductRow[];
  /** Controller binding-list admission edges that materialize or attach this binding. */
  readonly admissions: readonly FrameworkBindingAdmissionRow[];
  /** Constructor parameter surface. */
  readonly constructorParameters: readonly FrameworkBindingConstructorParameterRow[];
  /** Declared method names on the binding class. */
  readonly methodNames: readonly string[];
  /** Lifecycle-relevant method names observed on the binding class. */
  readonly lifecycleMethods: readonly string[];
  /** Constructor parameters whose type/name identifies an observer locator. */
  readonly observerLocatorParameters: readonly FrameworkBindingConstructorParameterRow[];
  /** Observer-locator call sites inside the binding class. */
  readonly observerLocatorCallSites: readonly TypeScriptCallSiteEntry[];
  /** Target-observer override methods exposed by the binding class. */
  readonly targetObserverMethods: readonly string[];
}

/** Static shape observed for the binding value passed into a controller binding list. */
export const enum FrameworkBindingConstructionKind {
  /** The admitted value is constructed directly in the addBinding argument. */
  InlineNew = "inline-new",
  /** The admitted value is returned by a static binding factory call in the addBinding argument. */
  InlineFactoryCall = "inline-factory-call",
  /** The admitted value is a local variable whose initializer constructs or creates the binding. */
  LocalVariable = "local-variable",
  /** The admitted value is a callback parameter sourced from a binding factory collection. */
  FactoryCollectionElement = "factory-collection-element",
}

/** Exact addBinding(...) admission edge for a binding-like product. */
export interface FrameworkBindingAdmissionRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the admission site. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Lexical producer that contains the admission call. */
  readonly producerName: string;
  /** Controller expression that receives the admitted binding. */
  readonly controllerExpression: string;
  /** Binding class/factory observed for the admitted value. */
  readonly bindingName: string;
  /** Static construction/admission shape. */
  readonly constructionKind: FrameworkBindingConstructionKind;
  /** Exact addBinding(...) call site. */
  readonly admissionCall: TypeScriptCallSiteEntry;
  /** Checker-backed expression fact for the admitted value or producing expression. */
  readonly bindingExpression: TypeScriptExpressionFact;
  /** Exact admission call source range. */
  readonly source: SourceRange;
  /** Syntax products that construct the same binding class, if any. */
  readonly constructionProducts: readonly FrameworkSyntaxProductRow[];
}

/** Binding-class effect lane exposed as a separate relation row. */
export const enum FrameworkBindingEffectKind {
  /** Binding lifecycle method declaration such as bind, unbind, updateTarget, or handleChange. */
  LifecycleMethod = "lifecycle-method",
  /** Observer/accessor lookup through IObserverLocator-style APIs. */
  ObserverLookup = "observer-lookup",
  /** Event listener registration or removal. */
  EventListener = "event-listener",
  /** Subscription or unsubscription to store/observable sources. */
  Subscription = "subscription",
}

/** Binding lifecycle/setup effect row inside one binding class. */
export interface FrameworkBindingEffectRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the binding class. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Binding class name. */
  readonly bindingName: string;
  /** Binding method containing the effect. */
  readonly methodName: string;
  /** Effect classifier. */
  readonly effectKind: FrameworkBindingEffectKind;
  /** Method/callee name for the effect. */
  readonly effectName: string;
  /** Checker-backed expression fact for the method name or call expression. */
  readonly expression: TypeScriptExpressionFact;
  /** Exact call site for call-shaped effects. */
  readonly callSite?: TypeScriptCallSiteEntry;
  /** Exact effect source range. */
  readonly source: SourceRange;
}

/** Binding setup override lane observed outside the binding class. */
export const enum FrameworkBindingSetupKind {
  /** Call to PropertyBinding.useTargetObserver(...). */
  TargetObserver = "target-observer",
  /** Call to InterpolationBinding.useAccessor(...). */
  Accessor = "accessor",
  /** Call to PropertyBinding.useTargetSubscriber(...). */
  TargetSubscriber = "target-subscriber",
}

/** Renderer/resource-side binding setup call that alters observation behavior. */
export interface FrameworkBindingSetupRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the setup site. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Lexical producer that contains the setup call. */
  readonly producerName: string;
  /** Binding class whose setup surface is invoked. */
  readonly bindingName: string;
  /** Setup classifier. */
  readonly setupKind: FrameworkBindingSetupKind;
  /** Method name called on the binding. */
  readonly setupMethodName: string;
  /** Receiver expression text, usually a binding variable or behavior parameter. */
  readonly receiverExpression: string;
  /** Checker-backed expression fact for the receiver binding expression. */
  readonly bindingExpression: TypeScriptExpressionFact;
  /** First setup argument, when present. */
  readonly setupArgument?: TypeScriptExpressionFact;
  /** Exact setup call site. */
  readonly callSite: TypeScriptCallSiteEntry;
  /** Exact setup source range. */
  readonly source: SourceRange;
}

/** Semantic role observed on a public framework export in the observation/reactivity system. */
export const enum FrameworkObserverEntityKind {
  /** IObserverLocator/ObserverLocator-style property observation gateway. */
  ObserverLocator = "observer-locator",
  /** INodeObserverLocator/NodeObserverLocator-style platform/HTML observation gateway. */
  NodeObserverLocator = "node-observer-locator",
  /** Observer contract or implementation. */
  Observer = "observer",
  /** Accessor contract or implementation. */
  Accessor = "accessor",
  /** Subscriber contract, subscriber collection, or concrete subscriber. */
  Subscriber = "subscriber",
  /** Collection observer/subscriber surface for arrays, maps, sets, or repeatables. */
  CollectionObserver = "collection-observer",
  /** Connectable expression/binding participant that records observer dependencies. */
  Connectable = "connectable",
  /** Watcher surface used by templating/reactivity. */
  Watcher = "watcher",
  /** Signal/signaler surface. */
  Signaler = "signaler",
  /** Effect/effect-runner surface. */
  Effect = "effect",
  /** Dirty checker and dirty-check fallback surface. */
  DirtyChecker = "dirty-checker",
  /** Helper or decorator that participates in observation without being the observed value. */
  ObservationHelper = "observation-helper",
}

/** Public export shape for an observer-system entity. */
export const enum FrameworkObserverEntityShape {
  /** DI InterfaceSymbol export produced through DI.createInterface/rtCreateInterface. */
  DiInterface = "di-interface",
  /** Class export. */
  Class = "class",
  /** Interface export. */
  Interface = "interface",
  /** Type alias export. */
  TypeAlias = "type-alias",
  /** Function export. */
  Function = "function",
  /** Variable/value export. */
  Value = "value",
  /** Mixed or unavailable declaration shape. */
  Unknown = "unknown",
}

/** Capability observed on an observer-system entity. */
export const enum FrameworkObserverCapability {
  /** Can locate or produce property observers. */
  LocateObserver = "locate-observer",
  /** Can locate or produce accessors. */
  LocateAccessor = "locate-accessor",
  /** Can locate or produce collection observers. */
  LocateCollectionObserver = "locate-collection-observer",
  /** Can locate or produce platform/node observers. */
  LocateNodeObserver = "locate-node-observer",
  /** Can subscribe to changes or hold subscribers. */
  Subscribe = "subscribe",
  /** Can publish/notify change records. */
  Notify = "notify",
  /** Can read or write an observed value. */
  AccessValue = "access-value",
  /** Can collect dependencies by connecting to observer records. */
  Connect = "connect",
  /** Participates in signal-based invalidation. */
  Signal = "signal",
  /** Can run effect-style reactive work. */
  RunEffect = "run-effect",
  /** Provides dirty-check fallback behavior. */
  DirtyCheck = "dirty-check",
  /** Can register itself or an implementation in DI. */
  Register = "register",
  /** Handles collection mutation observation. */
  Collection = "collection",
}

/** Provenance lane that caused an observer-system entity classification. */
export const enum FrameworkObserverMatchBasis {
  /** Exported name matched a stable observation/reactivity concept. */
  ExportName = "export-name",
  /** Resolved checker symbol name matched a stable observation/reactivity concept. */
  ResolvedName = "resolved-name",
  /** Checker type display matched a stable observation/reactivity concept. */
  TypeText = "type-text",
  /** Checker-visible member name matched an observation/reactivity capability. */
  MemberName = "member-name",
  /** DI interface creation or resolver builder tied the export to observation/reactivity. */
  DiInterface = "di-interface",
}

/** One exact match reason for an observer-system entity row. */
export interface FrameworkObserverMatchRow {
  /** Match basis. */
  readonly basis: FrameworkObserverMatchBasis;
  /** Exact text that matched. */
  readonly text: string;
}

/** Public framework export that belongs to the observer/reactivity side system. */
export interface FrameworkObserverEntityRow extends FrameworkPackageExportRow {
  /** Observation/reactivity semantic roles carried by this export. */
  readonly observerKinds: readonly FrameworkObserverEntityKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkObserverEntityShape;
  /** Capabilities inferred from TypeChecker facts, DI provenance, and stable observer role shape. */
  readonly observerCapabilities: readonly FrameworkObserverCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkObserverMatchRow[];
  /** DI interface row behind this entity, when this export is a createInterface key. */
  readonly diInterface?: FrameworkDiInterfaceExportRow;
  /** Implementation names visible in DI builder/default-registration provenance. */
  readonly defaultImplementationNames: readonly string[];
}

/** Public export declaration shape for non-observer entity catalogs. */
export const enum FrameworkCatalogExportShape {
  /** DI InterfaceSymbol export produced through DI.createInterface/rtCreateInterface. */
  DiInterface = "di-interface",
  /** Class export. */
  Class = "class",
  /** Interface export. */
  Interface = "interface",
  /** Type alias export. */
  TypeAlias = "type-alias",
  /** Function export. */
  Function = "function",
  /** Variable/value export. */
  Value = "value",
  /** Mixed or unavailable declaration shape. */
  Unknown = "unknown",
}

/** Provenance lane that caused a framework entity catalog classification. */
export const enum FrameworkCatalogMatchBasis {
  /** Exported name matched a stable framework concept. */
  ExportName = "export-name",
  /** Resolved checker symbol name matched a stable framework concept. */
  ResolvedName = "resolved-name",
  /** Checker type display matched a stable framework concept. */
  TypeText = "type-text",
  /** Checker-visible member name matched a stable framework concept. */
  MemberName = "member-name",
  /** Package membership admitted the export into a bounded package-specific catalog. */
  Package = "package",
}

/** One exact match reason for a framework entity catalog row. */
export interface FrameworkCatalogMatchRow {
  /** Match basis. */
  readonly basis: FrameworkCatalogMatchBasis;
  /** Exact text that matched. */
  readonly text: string;
}

/** AppTask/lifecycle task entity role. */
export const enum FrameworkAppTaskEntityKind {
  /** AppTask fluent lifecycle-registration factory. */
  AppTaskFactory = "app-task-factory",
  /** IAppTask DI key or task-slot contract. */
  AppTaskKey = "app-task-key",
  /** Task slot or lifecycle phase admission name. */
  TaskSlot = "task-slot",
  /** Task callback type accepted by app tasks. */
  TaskCallback = "task-callback",
  /** Concrete Task/RecurringTask value or status surface. */
  Task = "task",
  /** Queue/scheduler helper. */
  TaskQueue = "task-queue",
  /** Lifecycle hook entity that participates in task/lifecycle admission. */
  LifecycleHook = "lifecycle-hook",
}

/** AppTask/lifecycle task capability. */
export const enum FrameworkAppTaskCapability {
  /** Registers a lifecycle task in DI/container configuration. */
  Register = "register",
  /** Names a startup/hydration/activation/deactivation phase. */
  LifecyclePhase = "lifecycle-phase",
  /** Queues or schedules a task. */
  Queue = "queue",
  /** Runs or flushes queued tasks. */
  Run = "run",
  /** Reports task queue or task status. */
  Status = "status",
  /** Represents callback execution accepted by a task registration. */
  Callback = "callback",
}

/** Public framework export that belongs to the AppTask/lifecycle task catalog. */
export interface FrameworkAppTaskEntityRow extends FrameworkPackageExportRow {
  /** AppTask/lifecycle task semantic roles carried by this export. */
  readonly appTaskKinds: readonly FrameworkAppTaskEntityKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkCatalogExportShape;
  /** Capabilities inferred from TypeChecker facts and stable task role shape. */
  readonly appTaskCapabilities: readonly FrameworkAppTaskCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkCatalogMatchRow[];
}

/** Router entity role. */
export const enum FrameworkRouterEntityKind {
  Router = "router",
  Configuration = "configuration",
  Route = "route",
  RouteContext = "route-context",
  RouteTree = "route-tree",
  Navigation = "navigation",
  Viewport = "viewport",
  Endpoint = "endpoint",
  Location = "location",
  UrlParser = "url-parser",
  Recognizer = "recognizer",
  Event = "event",
  State = "state",
  Instruction = "instruction",
  RouteResource = "route-resource",
}

/** Router entity capability. */
export const enum FrameworkRouterCapability {
  Configure = "configure",
  Navigate = "navigate",
  Recognize = "recognize",
  ParseUrl = "parse-url",
  ManageState = "manage-state",
  RenderViewport = "render-viewport",
  EmitEvent = "emit-event",
  Register = "register",
}

/** Public framework export that belongs to the router catalog. */
export interface FrameworkRouterEntityRow extends FrameworkPackageExportRow {
  /** Router semantic roles carried by this export. */
  readonly routerKinds: readonly FrameworkRouterEntityKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkCatalogExportShape;
  /** Router capabilities inferred from TypeChecker facts and stable route role shape. */
  readonly routerCapabilities: readonly FrameworkRouterCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkCatalogMatchRow[];
}

/** Expression/parser entity role. */
export const enum FrameworkExpressionEntityKind {
  Parser = "parser",
  AstNode = "ast-node",
  Access = "access",
  Call = "call",
  Literal = "literal",
  Operator = "operator",
  Pattern = "pattern",
  Interpolation = "interpolation",
  ForOf = "for-of",
  BindingBehavior = "binding-behavior",
  ValueConverter = "value-converter",
  Visitor = "visitor",
  Evaluator = "evaluator",
  Unparser = "unparser",
  Helper = "helper",
}

/** Expression/parser entity capability. */
export const enum FrameworkExpressionCapability {
  Parse = "parse",
  Visit = "visit",
  Evaluate = "evaluate",
  BuildAst = "build-ast",
  Assign = "assign",
  Interpolate = "interpolate",
  ConvertValue = "convert-value",
  ApplyBehavior = "apply-behavior",
}

/** Public framework export that belongs to the expression/parser catalog. */
export interface FrameworkExpressionEntityRow extends FrameworkPackageExportRow {
  /** Expression/parser semantic roles carried by this export. */
  readonly expressionKinds: readonly FrameworkExpressionEntityKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkCatalogExportShape;
  /** Expression capabilities inferred from TypeChecker facts and stable expression role shape. */
  readonly expressionCapabilities: readonly FrameworkExpressionCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkCatalogMatchRow[];
}

/** Rendering/lifecycle structural entity role. */
export const enum FrameworkRenderingStructureKind {
  AppRoot = "app-root",
  Controller = "controller",
  View = "view",
  ViewFactory = "view-factory",
  Hydration = "hydration",
  Renderer = "renderer",
  RenderContext = "render-context",
  RenderLocation = "render-location",
  NodeSequence = "node-sequence",
  LifecycleHook = "lifecycle-hook",
  PlatformBoundary = "platform-boundary",
  MountTarget = "mount-target",
  Ssr = "ssr",
}

/** Rendering/lifecycle structural capability. */
export const enum FrameworkRenderingCapability {
  Render = "render",
  Hydrate = "hydrate",
  CreateView = "create-view",
  ControlLifecycle = "control-lifecycle",
  Mount = "mount",
  LocateDom = "locate-dom",
  Platform = "platform",
  Ssr = "ssr",
  Register = "register",
}

/** Public framework export that belongs to the rendering/lifecycle structural catalog. */
export interface FrameworkRenderingStructureEntityRow extends FrameworkPackageExportRow {
  /** Rendering/lifecycle structural roles carried by this export. */
  readonly renderingStructureKinds: readonly FrameworkRenderingStructureKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkCatalogExportShape;
  /** Rendering capabilities inferred from TypeChecker facts and stable rendering role shape. */
  readonly renderingCapabilities: readonly FrameworkRenderingCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkCatalogMatchRow[];
}

type BindingCreationExpression = ts.NewExpression | ts.CallExpression;

interface InstructionProductExpression {
  readonly instructionName: string | null;
  readonly instructionTarget: string | null;
  readonly expression: ts.Expression;
}

interface BindingAdmissionExpression {
  readonly bindingName: string;
  readonly constructionKind: FrameworkBindingConstructionKind;
  readonly expression: ts.Expression;
}

const diInterfaceRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkDiInterfaceExportRow[]>>();
const diInterfaceRowsByExportByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkDiInterfaceExportRow[]>>();
const frameworkPackageNamesByProject = new WeakMap<SourceProject, ReadonlyMap<string, string>>();
const frameworkPackageExportRowsByFilterByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkPackageExportRow[]>>();
const packageExportRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkPackageExportRow[]>>();
const publicExportSurfaceByPackageByProject = new WeakMap<SourceProject, Map<string, FrameworkPublicExportSurface>>();
const registryRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkRegistryExportRow[]>>();
const registryRowsByExportByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkRegistryExportRow[]>>();
const resourceCarrierRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkResourceCarrierRow[]>>();
const resourceCarrierRowsByExportByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkResourceCarrierRow[]>>();
const resourceRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkResourceExportRow[]>>();
const resourceRowsByExportByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkResourceExportRow[]>>();
const bundleRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkBundleExportRow[]>>();
const bundleRowsByExportByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkBundleExportRow[]>>();
const syntaxProductRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkSyntaxProductRow[]>>();
const instructionSlotRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkInstructionSlotRow[]>>();
const instructionDispatchRowsByProject = new WeakMap<SourceProject, readonly FrameworkInstructionDispatchRow[]>();
const bindingProductRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkBindingProductRow[]>>();
const bindingAdmissionRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkBindingAdmissionRow[]>>();
const bindingEffectRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkBindingEffectRow[]>>();
const bindingSetupRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkBindingSetupRow[]>>();
const observerEntityRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkObserverEntityRow[]>>();
const appTaskEntityRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkAppTaskEntityRow[]>>();
const routerEntityRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkRouterEntityRow[]>>();
const expressionEntityRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkExpressionEntityRow[]>>();
const renderingStructureRowsByPackageByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkRenderingStructureEntityRow[]>>();
const bundleClassificationContextByProject = new WeakMap<SourceProject, FrameworkBundleClassificationContext>();
const moduleEvaluationByFileByProject = new WeakMap<SourceProject, Map<string, ModuleEvaluationResult>>();

const FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION = "entity-catalog-atoms@1";
const frameworkEntityCatalogCacheProducerVersion = frameworkJsonCacheProducerVersion(
  FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID,
  FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION,
  import.meta.url,
);

interface FrameworkPublicExportSurface {
  readonly exportsByName: ReadonlyMap<string, TypeScriptExportNameEntry>;
}

interface FrameworkBundleClassificationContext {
  readonly packageNames: ReadonlyMap<string, string>;
  readonly metrics: FrameworkBundleClassificationMetrics;
  readonly declarationsByExpression: WeakMap<ts.Expression, readonly ts.Declaration[]>;
  readonly indexedResourcePackageIds: Set<string>;
  readonly resourceCarriersByDeclaration: Map<string, FrameworkResourceCarrierRow[]>;
  readonly resourceCarriersByName: Map<string, FrameworkResourceCarrierRow[]>;
  readonly resourceCarriersByPackageAndName: Map<string, FrameworkResourceCarrierRow[]>;
  readonly indexedDiPackageIds: Set<string>;
  readonly diInterfacesByDeclaration: Map<string, FrameworkDiInterfaceExportRow[]>;
  readonly diInterfacesByName: Map<string, FrameworkDiInterfaceExportRow[]>;
  readonly diInterfacesByPackageAndName: Map<string, FrameworkDiInterfaceExportRow[]>;
  readonly indexedRegistryPackageIds: Set<string>;
  readonly registryExportsByDeclaration: Map<string, FrameworkRegistryExportRow[]>;
  readonly registryExportsByName: Map<string, FrameworkRegistryExportRow[]>;
  readonly registryExportsByPackageAndName: Map<string, FrameworkRegistryExportRow[]>;
}

interface FrameworkBundleClassificationMetrics {
  expressions: number;
  expressionFactMs: number;
  arrayBindingMs: number;
  resourceMs: number;
  diMs: number;
  registryMs: number;
}

/** Answer framework discovery-seed inquiries from package-local Atlas contracts and the hot source index. */
export function answerFrameworkDiscovery(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkDiscoveryValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  const seedIndex = readFrameworkDiscoverySeedIndex(sourceProject);
  const flows = seedIndex.flows.filter((flow) => flowMatches(flow, filters));
  const anchors = seedIndex.anchors.filter((resolution) => anchorResolutionMatches(resolution, filters));
  const flowSeeds = seedIndex.flowSeeds.filter((row) => flowSeedMatches(row, filters));
  const anchorResolution = anchorResolutionForRollup(seedIndex.rollup);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "flows") {
    const page = pageRows(flows, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${flows.length} framework flow definition(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        flows: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis()],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForFlow),
      page: pageInfo(inquiry, page.rows.length, flows.length, limit, page.nextOffset),
      continuations: flowContinuations(inquiry, page.nextOffset, limit),
    });
  }

  if (projection === "anchors") {
    const page = pageRows(anchors, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${anchors.length} framework seed anchor(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        anchors: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForAnchorResolution),
      page: pageInfo(inquiry, page.rows.length, anchors.length, limit, page.nextOffset),
      continuations: anchorContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "flow-seeds") {
    const page = pageRows(flowSeeds, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${flowSeeds.length} framework flow seed row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        flowSeeds: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForFlowSeed),
      page: pageInfo(inquiry, page.rows.length, flowSeeds.length, limit, page.nextOffset),
      continuations: flowSeedContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "call-edges") {
    const index = readFrameworkDiscoveryIndex(sourceProject);
    const callEdges = index.flowCallEdges.filter((row) => callEdgeMatches(row, filters));
    const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
    const page = pageRows(callEdges, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${callEdges.length} framework flow call-edge row(s).`, {
      value: {
        seedVersion: index.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution: fullAnchorResolution,
        callEdges: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForCallEdge),
      page: pageInfo(inquiry, page.rows.length, callEdges.length, limit, page.nextOffset),
      continuations: callEdgeContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "call-sites") {
    const index = readFrameworkDiscoveryIndex(sourceProject);
    const callSites = index.flowCallSites.filter((row) => callSiteMatches(row, filters));
    const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
    const page = pageRows(callSites, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${callSites.length} framework flow call-site row(s).`, {
      value: {
        seedVersion: index.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution: fullAnchorResolution,
        callSites: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForCallSite),
      page: pageInfo(inquiry, page.rows.length, callSites.length, limit, page.nextOffset),
      continuations: callSiteContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "call-targets") {
    const index = readFrameworkDiscoveryIndex(sourceProject);
    const callEdges = index.flowCallEdges.filter((row) => callEdgeMatches(row, filters));
    const callTargets = groupFrameworkFlowCallTargets(callEdges);
    const fullAnchorResolution = anchorResolutionForRollup(index.rollup);
    const page = pageRows(callTargets, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${callTargets.length} framework flow call-target row(s).`, {
      value: {
        seedVersion: index.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution: fullAnchorResolution,
        callTargets: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForCallTarget),
      page: pageInfo(inquiry, page.rows.length, callTargets.length, limit, page.nextOffset),
      continuations: callTargetContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "package-exports") {
    const packageExports = readFrameworkPackageExports(sourceProject, filters);
    const page = pageRows(packageExports, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${packageExports.length} Aurelia framework package export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        packageExports: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForPackageExport),
      page: pageInfo(inquiry, page.rows.length, packageExports.length, limit, page.nextOffset),
      continuations: packageExportContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "registry-exports") {
    const registryExports = readFrameworkRegistryExports(sourceProject, filters);
    const page = pageRows(registryExports, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${registryExports.length} Aurelia framework registry export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        registryExports: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForPackageExport),
      page: pageInfo(inquiry, page.rows.length, registryExports.length, limit, page.nextOffset),
      continuations: packageExportContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "di-interfaces") {
    const diInterfaces = readFrameworkDiInterfaces(sourceProject, filters);
    const page = pageRows(diInterfaces, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${diInterfaces.length} Aurelia framework DI interface export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        diInterfaces: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForDiInterface),
      page: pageInfo(inquiry, page.rows.length, diInterfaces.length, limit, page.nextOffset),
      continuations: diInterfaceContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "resource-carriers") {
    const resourceCarriers = readFrameworkResourceCarriers(sourceProject, filters);
    const page = pageRows(resourceCarriers, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${resourceCarriers.length} Aurelia framework resource carrier row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        resourceCarriers: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForResourceCarrier),
      page: pageInfo(inquiry, page.rows.length, resourceCarriers.length, limit, page.nextOffset),
      continuations: resourceCarrierContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "resources") {
    const resources = readFrameworkResourceExports(sourceProject, filters);
    const page = pageRows(resources, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${resources.length} Aurelia framework resource export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        resources: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForResourceExport),
      page: pageInfo(inquiry, page.rows.length, resources.length, limit, page.nextOffset),
      continuations: resourceExportContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "bundles") {
    const bundles = readFrameworkBundles(sourceProject, filters);
    const page = pageRows(bundles, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bundles.length} Aurelia framework bundle row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        bundles: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject), staticEvaluatorBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBundle),
      page: pageInfo(inquiry, page.rows.length, bundles.length, limit, page.nextOffset),
      continuations: bundleContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "syntax-products") {
    const syntaxProducts = readFrameworkSyntaxProducts(sourceProject, filters);
    const page = pageRows(syntaxProducts, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${syntaxProducts.length} Aurelia framework syntax product row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        syntaxProducts: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForSyntaxProduct),
      page: pageInfo(inquiry, page.rows.length, syntaxProducts.length, limit, page.nextOffset),
      continuations: syntaxProductContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "instruction-slots") {
    const instructionSlots = readFrameworkInstructionSlots(sourceProject, filters);
    const page = pageRows(instructionSlots, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${instructionSlots.length} Aurelia framework instruction slot row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        instructionSlots: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForInstructionSlot),
      page: pageInfo(inquiry, page.rows.length, instructionSlots.length, limit, page.nextOffset),
      continuations: instructionSlotContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "instruction-dispatches") {
    const instructionDispatches = readFrameworkInstructionDispatches(sourceProject, filters);
    const page = pageRows(instructionDispatches, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${instructionDispatches.length} Aurelia framework instruction dispatch row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        instructionDispatches: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForInstructionDispatch),
      page: pageInfo(inquiry, page.rows.length, instructionDispatches.length, limit, page.nextOffset),
      continuations: instructionDispatchContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-products") {
    const bindingProducts = readFrameworkBindingProducts(sourceProject, filters);
    const page = pageRows(bindingProducts, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingProducts.length} Aurelia framework binding product row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        bindingProducts: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingProduct),
      page: pageInfo(inquiry, page.rows.length, bindingProducts.length, limit, page.nextOffset),
      continuations: bindingProductContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-admissions") {
    const bindingAdmissions = readFrameworkBindingAdmissions(sourceProject, filters);
    const page = pageRows(bindingAdmissions, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingAdmissions.length} Aurelia framework binding admission row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        bindingAdmissions: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingAdmission),
      page: pageInfo(inquiry, page.rows.length, bindingAdmissions.length, limit, page.nextOffset),
      continuations: bindingAdmissionContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-effects") {
    const bindingEffects = readFrameworkBindingEffects(sourceProject, filters);
    const page = pageRows(bindingEffects, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingEffects.length} Aurelia framework binding effect row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        bindingEffects: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingEffect),
      page: pageInfo(inquiry, page.rows.length, bindingEffects.length, limit, page.nextOffset),
      continuations: bindingEffectContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-setups") {
    const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
    const page = pageRows(bindingSetups, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingSetups.length} Aurelia framework binding setup row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        bindingSetups: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingSetup),
      page: pageInfo(inquiry, page.rows.length, bindingSetups.length, limit, page.nextOffset),
      continuations: bindingSetupContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "observers") {
    const observers = readFrameworkObserverEntities(sourceProject, filters);
    const page = pageRows(observers, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${observers.length} Aurelia framework observer-system export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        observers: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForObserverEntity),
      page: pageInfo(inquiry, page.rows.length, observers.length, limit, page.nextOffset),
      continuations: observerEntityContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "app-tasks") {
    const appTasks = readFrameworkAppTaskEntities(sourceProject, filters);
    const page = pageRows(appTasks, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${appTasks.length} Aurelia framework AppTask/lifecycle task export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        appTasks: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForAppTaskEntity),
      page: pageInfo(inquiry, page.rows.length, appTasks.length, limit, page.nextOffset),
      continuations: appTaskEntityContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "router-entities") {
    const routerEntities = readFrameworkRouterEntities(sourceProject, filters);
    const page = pageRows(routerEntities, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${routerEntities.length} Aurelia framework router export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        routerEntities: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRouterEntity),
      page: pageInfo(inquiry, page.rows.length, routerEntities.length, limit, page.nextOffset),
      continuations: routerEntityContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "expression-entities") {
    const expressionEntities = readFrameworkExpressionEntities(sourceProject, filters);
    const page = pageRows(expressionEntities, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${expressionEntities.length} Aurelia framework expression/parser export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        expressionEntities: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForExpressionEntity),
      page: pageInfo(inquiry, page.rows.length, expressionEntities.length, limit, page.nextOffset),
      continuations: expressionEntityContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "rendering-structures") {
    const renderingStructures = readFrameworkRenderingStructures(sourceProject, filters);
    const page = pageRows(renderingStructures, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${renderingStructures.length} Aurelia framework rendering/lifecycle structural export row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        renderingStructures: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRenderingStructure),
      page: pageInfo(inquiry, page.rows.length, renderingStructures.length, limit, page.nextOffset),
      continuations: renderingStructureContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "open-questions") {
    const page = pageRows(FRAMEWORK_DISCOVERY_SEEDS.openQuestions, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${FRAMEWORK_DISCOVERY_SEEDS.openQuestions.length} framework discovery question(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        flowCount: flows.length,
        anchorCount: anchors.length,
        anchorResolution,
        openQuestions: page.rows,
      },
      basis: [frameworkDiscoverySeedBasis()],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map((question, questionIndex) => evidenceForQuestion(question, offset + questionIndex)),
      page: pageInfo(inquiry, page.rows.length, FRAMEWORK_DISCOVERY_SEEDS.openQuestions.length, limit, page.nextOffset),
      continuations: openQuestionContinuations(inquiry, page.nextOffset, limit),
    });
  }

  return createAnswer(inquiry, OutcomeKind.Hit, `Framework discovery seeds has ${seedIndex.rollup.flows} flow definition(s), ${seedIndex.rollup.anchors} seed anchor(s), ${seedIndex.rollup.resolvedAnchors} resolved anchor(s), and ${FRAMEWORK_DISCOVERY_SEEDS.openQuestions.length} open question(s).`, {
    value: {
      seedVersion: seedIndex.seedVersion,
      flowCount: flows.length,
      anchorCount: anchors.length,
      anchorResolution,
    },
    basis: [frameworkDiscoverySeedBasis(), sourceIndexBasis(sourceProject)],
    evidence: [
      ...flows.slice(0, Math.max(1, Math.floor(evidenceLimit(inquiry) / 2))).map(evidenceForFlow),
      ...anchors.slice(0, Math.max(1, Math.ceil(evidenceLimit(inquiry) / 2))).map(evidenceForAnchorResolution),
    ],
    continuations: summaryContinuations(inquiry),
  });
}

/** Answer framework.rendering inquiries from rendering/resource/binding indexes over the hot source project. */
export function answerFrameworkRendering(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkRenderingValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  const seedIndex = readFrameworkDiscoverySeedIndex(sourceProject);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "syntax-products") {
    const syntaxProducts = readFrameworkSyntaxProducts(sourceProject, filters);
    const page = pageRows(syntaxProducts, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${syntaxProducts.length} Aurelia framework syntax product row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        syntaxProductCount: syntaxProducts.length,
        syntaxProducts: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForSyntaxProduct),
      page: pageInfo(inquiry, page.rows.length, syntaxProducts.length, limit, page.nextOffset),
      continuations: syntaxProductContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "instruction-slots") {
    const instructionSlots = readFrameworkInstructionSlots(sourceProject, filters);
    const page = pageRows(instructionSlots, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${instructionSlots.length} Aurelia framework instruction slot row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        instructionSlotCount: instructionSlots.length,
        instructionSlots: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForInstructionSlot),
      page: pageInfo(inquiry, page.rows.length, instructionSlots.length, limit, page.nextOffset),
      continuations: instructionSlotContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "instruction-dispatches") {
    const instructionDispatches = readFrameworkInstructionDispatches(sourceProject, filters);
    const page = pageRows(instructionDispatches, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${instructionDispatches.length} Aurelia framework instruction dispatch row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        instructionDispatchCount: instructionDispatches.length,
        instructionDispatches: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForInstructionDispatch),
      page: pageInfo(inquiry, page.rows.length, instructionDispatches.length, limit, page.nextOffset),
      continuations: instructionDispatchContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-products") {
    const bindingProducts = readFrameworkBindingProducts(sourceProject, filters);
    const page = pageRows(bindingProducts, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingProducts.length} Aurelia framework binding product row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        bindingProductCount: bindingProducts.length,
        bindingProducts: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingProduct),
      page: pageInfo(inquiry, page.rows.length, bindingProducts.length, limit, page.nextOffset),
      continuations: bindingProductContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-admissions") {
    const bindingAdmissions = readFrameworkBindingAdmissions(sourceProject, filters);
    const page = pageRows(bindingAdmissions, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingAdmissions.length} Aurelia framework binding admission row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        bindingAdmissionCount: bindingAdmissions.length,
        bindingAdmissions: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingAdmission),
      page: pageInfo(inquiry, page.rows.length, bindingAdmissions.length, limit, page.nextOffset),
      continuations: bindingAdmissionContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-effects") {
    const bindingEffects = readFrameworkBindingEffects(sourceProject, filters);
    const page = pageRows(bindingEffects, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingEffects.length} Aurelia framework binding effect row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        bindingEffectCount: bindingEffects.length,
        bindingEffects: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingEffect),
      page: pageInfo(inquiry, page.rows.length, bindingEffects.length, limit, page.nextOffset),
      continuations: bindingEffectContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "binding-setups") {
    const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
    const page = pageRows(bindingSetups, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${bindingSetups.length} Aurelia framework binding setup row(s).`, {
      value: {
        seedVersion: seedIndex.seedVersion,
        bindingSetupCount: bindingSetups.length,
        bindingSetups: page.rows,
      },
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForBindingSetup),
      page: pageInfo(inquiry, page.rows.length, bindingSetups.length, limit, page.nextOffset),
      continuations: bindingSetupContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  const syntaxProducts = readFrameworkSyntaxProducts(sourceProject, filters);
  const instructionSlots = readFrameworkInstructionSlots(sourceProject, filters);
  const instructionDispatches = readFrameworkInstructionDispatches(sourceProject, filters);
  const bindingProducts = readFrameworkBindingProducts(sourceProject, filters);
  const bindingAdmissions = readFrameworkBindingAdmissions(sourceProject, filters);
  const bindingEffects = readFrameworkBindingEffects(sourceProject, filters);
  const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
  return createAnswer(inquiry, OutcomeKind.Hit, `Framework rendering index has ${syntaxProducts.length} syntax product(s), ${instructionSlots.length} instruction slot(s), ${instructionDispatches.length} instruction dispatch edge(s), ${bindingProducts.length} binding product(s), ${bindingAdmissions.length} admission edge(s), ${bindingEffects.length} binding effect(s), and ${bindingSetups.length} binding setup override(s).`, {
    value: {
      seedVersion: seedIndex.seedVersion,
      syntaxProductCount: syntaxProducts.length,
      instructionSlotCount: instructionSlots.length,
      instructionDispatchCount: instructionDispatches.length,
      bindingProductCount: bindingProducts.length,
      bindingAdmissionCount: bindingAdmissions.length,
      bindingEffectCount: bindingEffects.length,
      bindingSetupCount: bindingSetups.length,
    },
    basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
    evidence: [
      ...syntaxProducts.slice(0, 2).map(evidenceForSyntaxProduct),
      ...bindingProducts.slice(0, 2).map(evidenceForBindingProduct),
      ...bindingSetups.slice(0, 2).map(evidenceForBindingSetup),
    ],
    continuations: renderingSummaryContinuations(inquiry),
  });
}

interface FrameworkDiscoveryFilters {
  readonly domain?: string;
  readonly flow?: string;
  readonly anchorId?: string;
  readonly status?: string;
  readonly packageId?: string;
  readonly symbolName?: string;
  readonly auLinkId?: string;
  readonly direction?: string;
  readonly fromPackageId?: string;
  readonly toPackageId?: string;
  readonly fromName?: string;
  readonly toName?: string;
  readonly calleeName?: string;
  readonly exportName?: string;
  readonly query?: string;
  readonly memberName?: string;
  readonly resourceKind?: string;
  readonly producerKind?: string;
  readonly productKind?: string;
  readonly slotName?: string;
  readonly instructionName?: string;
  readonly bindingName?: string;
  readonly constructionKind?: string;
  readonly effectKind?: string;
  readonly setupKind?: string;
  readonly observerKind?: string;
  readonly observerCapability?: string;
  readonly exportShape?: string;
  readonly appTaskKind?: string;
  readonly appTaskCapability?: string;
  readonly routerKind?: string;
  readonly routerCapability?: string;
  readonly expressionKind?: string;
  readonly expressionCapability?: string;
  readonly renderingStructureKind?: string;
  readonly renderingCapability?: string;
}

function filtersFromInquiry(inquiry: Inquiry): FrameworkDiscoveryFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

function anchorResolutionForRollup(rollup: {
  readonly resolvedAnchors: number;
  readonly ambiguousAnchors: number;
  readonly unresolvedAnchors: number;
  readonly packageUnadmittedAnchors: number;
}): FrameworkDiscoveryValue["anchorResolution"] {
  return {
    resolved: rollup.resolvedAnchors,
    ambiguous: rollup.ambiguousAnchors,
    unresolved: rollup.unresolvedAnchors,
    packageUnadmitted: rollup.packageUnadmittedAnchors,
  };
}

function filtersFromRecord(value: unknown): FrameworkDiscoveryFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "domain"),
    ...stringFilter(source, "flow"),
    ...stringFilter(source, "anchorId"),
    ...stringFilter(source, "status"),
    ...stringFilter(source, "packageId"),
    ...stringFilter(source, "symbolName"),
    ...stringFilter(source, "auLinkId"),
    ...stringFilter(source, "direction"),
    ...stringFilter(source, "fromPackageId"),
    ...stringFilter(source, "toPackageId"),
    ...stringFilter(source, "fromName"),
    ...stringFilter(source, "toName"),
    ...stringFilter(source, "calleeName"),
    ...stringFilter(source, "exportName"),
    ...stringFilter(source, "query"),
    ...stringFilter(source, "memberName"),
    ...stringFilter(source, "resourceKind"),
    ...stringFilter(source, "producerKind"),
    ...stringFilter(source, "productKind"),
    ...stringFilter(source, "slotName"),
    ...stringFilter(source, "instructionName"),
    ...stringFilter(source, "bindingName"),
    ...stringFilter(source, "constructionKind"),
    ...stringFilter(source, "effectKind"),
    ...stringFilter(source, "setupKind"),
    ...stringFilter(source, "observerKind"),
    ...stringFilter(source, "observerCapability"),
    ...stringFilter(source, "exportShape"),
    ...stringFilter(source, "appTaskKind"),
    ...stringFilter(source, "appTaskCapability"),
    ...stringFilter(source, "routerKind"),
    ...stringFilter(source, "routerCapability"),
    ...stringFilter(source, "expressionKind"),
    ...stringFilter(source, "expressionCapability"),
    ...stringFilter(source, "renderingStructureKind"),
    ...stringFilter(source, "renderingCapability"),
  };
}

function stringFilter(source: Record<string, unknown>, key: keyof FrameworkDiscoveryFilters): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function flowMatches(flow: FrameworkFlowDefinition, filters: FrameworkDiscoveryFilters): boolean {
  return (filters.domain === undefined || flow.domains.includes(filters.domain as never))
    && (filters.flow === undefined || flow.flow === filters.flow);
}

function anchorMatches(anchor: FrameworkDiscoveryAnchor, filters: FrameworkDiscoveryFilters): boolean {
  return (filters.anchorId === undefined || anchor.id === filters.anchorId)
    && (filters.domain === undefined || anchor.domains.includes(filters.domain as never))
    && (filters.flow === undefined || anchor.flows.includes(filters.flow as never))
    && (filters.packageId === undefined || anchor.source.packageId === filters.packageId)
    && (filters.symbolName === undefined || anchor.source.symbolName === filters.symbolName)
    && (filters.auLinkId === undefined || anchor.source.auLinkId === filters.auLinkId);
}

function anchorResolutionMatches(resolution: FrameworkAnchorResolution, filters: FrameworkDiscoveryFilters): boolean {
  return anchorMatches(resolution.anchor, filters)
    && (filters.status === undefined || resolution.status === filters.status);
}

function flowSeedMatches(row: FrameworkFlowSeedRow, filters: FrameworkDiscoveryFilters): boolean {
  return anchorMatches(row.anchorResolution.anchor, filters)
    && (filters.status === undefined || row.status === filters.status || row.anchorResolution.status === filters.status)
    && (filters.domain === undefined || row.flowDefinition?.domains.includes(filters.domain as never) === true)
    && (filters.flow === undefined || row.flow === filters.flow);
}

function readFrameworkPackageNames(sourceProject: SourceProject): ReadonlyMap<string, string> {
  const cached = frameworkPackageNamesByProject.get(sourceProject);
  if (cached !== undefined) {
    return cached;
  }
  const admittedFrameworkPackageIds = new Set(AURELIA_FRAMEWORK_PACKAGE_IDS);
  const packageNames = new Map(sourceProject.snapshot().summary.packages
    .filter((entry) => admittedFrameworkPackageIds.has(entry.id as never))
    .map((entry) => [entry.id, entry.packageName]));
  frameworkPackageNamesByProject.set(sourceProject, packageNames);
  return packageNames;
}

function frameworkPackageIdsForFilters(
  packageNames: ReadonlyMap<string, string>,
  filters: FrameworkDiscoveryFilters,
): readonly string[] {
  if (filters.packageId === undefined) {
    return [...packageNames.keys()];
  }
  return packageNames.has(filters.packageId) ? [filters.packageId] : [];
}

function readFrameworkPackageExports(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkPackageExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  if (filters.exportName === undefined && filters.query === undefined && filters.memberName === undefined) {
    return frameworkPackageIdsForFilters(packageNames, filters)
      .flatMap((packageId) => readFrameworkPackageExportPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId))
      .sort((left, right) =>
        left.packageId.localeCompare(right.packageId)
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
      );
  }
  const cache = frameworkPackageExportRowsByFilterByProject.get(sourceProject) ?? new Map<string, readonly FrameworkPackageExportRow[]>();
  if (!frameworkPackageExportRowsByFilterByProject.has(sourceProject)) {
    frameworkPackageExportRowsByFilterByProject.set(sourceProject, cache);
  }
  const cacheKey = frameworkPackageExportFilterCacheKey(filters);
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const admittedFrameworkPackageIds = new Set(AURELIA_FRAMEWORK_PACKAGE_IDS);
  const selector = filters.packageId === undefined
    ? { scheme: SourceSelectorScheme.Workspace } as const
    : { scheme: SourceSelectorScheme.Package, packageId: filters.packageId } as const;
  const exports = readExportSurface(sourceProject, {
    ...selector,
  }, {
    limit: 100_000,
    offset: 0,
    ...((filters.query ?? filters.exportName) === undefined ? {} : { query: filters.query ?? filters.exportName }),
    ...(filters.memberName === undefined ? {} : { memberName: filters.memberName }),
  }).exports;
  const rows = exports
    .filter((exportEntry) => exportEntry.surfaceFile.packageId !== null)
    .filter((exportEntry) => admittedFrameworkPackageIds.has(exportEntry.surfaceFile.packageId as never))
    .filter((exportEntry) => filters.packageId === undefined || exportEntry.surfaceFile.packageId === filters.packageId)
    .filter((exportEntry) => filters.exportName === undefined || exportEntry.exportName === filters.exportName)
    .map((exportEntry) => {
      const packageId = exportEntry.surfaceFile.packageId!;
      return {
        id: `framework-export:${packageId}:${exportEntry.exportName}`,
        packageId,
        packageName: packageNames.get(packageId) ?? packageId,
        exportEntry,
      };
    })
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
    || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
  cache.set(cacheKey, rows);
  return rows;
}

function readFrameworkPackageExportPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkPackageExportRow[] {
  const cache = packageExportRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkPackageExportRow[]>();
  if (!packageExportRowsByPackageByProject.has(sourceProject)) {
    packageExportRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkPackageExportRow>(sourceProject, "package-exports", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = readExportSurface(sourceProject, {
    scheme: SourceSelectorScheme.Package,
    packageId,
  }, {
    limit: 100_000,
    offset: 0,
  }).exports
    .filter((exportEntry) => exportEntry.surfaceFile.packageId === packageId)
    .map((exportEntry) => ({
      id: `framework-export:${packageId}:${exportEntry.exportName}`,
      packageId,
      packageName,
      exportEntry,
    }))
    .sort((left, right) => left.exportEntry.exportName.localeCompare(right.exportEntry.exportName));
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "package-exports", packageId, rows);
  return rows;
}

function frameworkPackageExportFilterCacheKey(filters: FrameworkDiscoveryFilters): string {
  return [
    filters.packageId ?? "*",
    filters.exportName ?? "",
    filters.query ?? "",
    filters.memberName ?? "",
  ].join("\u0000");
}

function readFrameworkRegistryExports(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkRegistryExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const memberName = filters.memberName ?? "register";
  const rows = filters.exportName === undefined
    ? packageIds.flatMap((packageId) => readFrameworkRegistryPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, memberName))
    : packageIds.flatMap((packageId) => readFrameworkRegistryExportRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, memberName, filters.exportName!));
  return rows
    .filter((row) => filters.query === undefined
      || row.exportEntry.exportName.includes(filters.query)
      || row.capabilities.some((capability) => capability.includes(filters.query!)))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkRegistryPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  memberName: string,
): readonly FrameworkRegistryExportRow[] {
  const cache = registryRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkRegistryExportRow[]>();
  if (!registryRowsByPackageByProject.has(sourceProject)) {
    registryRowsByPackageByProject.set(sourceProject, cache);
  }
  const key = `${packageId}:${memberName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkRegistryExportRow>(sourceProject, `registry-exports.${memberName}`, packageId);
  if (diskCached !== undefined) {
    cache.set(key, diskCached);
    return diskCached;
  }
  const rows = scanFrameworkRegistryPackageRows(sourceProject, packageId, packageName, memberName);
  cache.set(key, rows);
  writeFrameworkEntityCatalogCache(sourceProject, `registry-exports.${memberName}`, packageId, rows);
  return rows;
}

function readFrameworkRegistryExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  memberName: string,
  exportName: string,
): readonly FrameworkRegistryExportRow[] {
  const packageCache = registryRowsByPackageByProject.get(sourceProject)?.get(`${packageId}:${memberName}`);
  if (packageCache !== undefined) {
    return packageCache.filter((row) => row.exportEntry.exportName === exportName);
  }
  const cache = registryRowsByExportByProject.get(sourceProject) ?? new Map<string, readonly FrameworkRegistryExportRow[]>();
  if (!registryRowsByExportByProject.has(sourceProject)) {
    registryRowsByExportByProject.set(sourceProject, cache);
  }
  const key = `${packageId}:${memberName}:${exportName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkRegistryPackageRows(sourceProject, packageId, packageName, memberName, exportName);
  cache.set(key, rows);
  return rows;
}

function scanFrameworkRegistryPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
  memberName: string,
  exportName?: string,
): readonly FrameworkRegistryExportRow[] {
  return readFrameworkPackageExports(sourceProject, {
    packageId,
    memberName,
    ...(exportName === undefined ? {} : { exportName }),
  })
    .map((row) => ({
      ...row,
      capabilities: capabilitiesForPackageExport(row),
    }))
    .filter((row) => row.capabilities.length > 0)
    .sort((left, right) => left.exportEntry.exportName.localeCompare(right.exportEntry.exportName));
}

function readFrameworkDiInterfaces(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkDiInterfaceExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  if (filters.exportName !== undefined) {
    return packageIds
      .flatMap((packageId) => readFrameworkDiInterfaceExportRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, filters.exportName!))
      .filter((row) => filters.query === undefined || row.exportEntry.exportName.includes(filters.query) || row.interfaceKey.includes(filters.query))
      .sort((left, right) =>
        left.packageId.localeCompare(right.packageId)
        || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
        || left.interfaceKey.localeCompare(right.interfaceKey)
      );
  }
  return packageIds
    .flatMap((packageId) => readFrameworkDiInterfacePackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId))
    .filter((row) => filters.exportName === undefined || row.exportEntry.exportName === filters.exportName)
    .filter((row) => filters.query === undefined || row.exportEntry.exportName.includes(filters.query) || row.interfaceKey.includes(filters.query))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
      || left.interfaceKey.localeCompare(right.interfaceKey)
    );
}

function readFrameworkDiInterfacePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkDiInterfaceExportRow[] {
  const cache = diInterfaceRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkDiInterfaceExportRow[]>();
  if (!diInterfaceRowsByPackageByProject.has(sourceProject)) {
    diInterfaceRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkDiInterfaceExportRow>(sourceProject, "di-interfaces", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = scanFrameworkDiInterfacePackageRows(sourceProject, packageId, packageName);
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "di-interfaces", packageId, rows);
  return rows;
}

function readFrameworkDiInterfaceExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkDiInterfaceExportRow[] {
  const packageCache = diInterfaceRowsByPackageByProject.get(sourceProject)?.get(packageId);
  if (packageCache !== undefined) {
    return packageCache.filter((row) => row.exportEntry.exportName === exportName);
  }
  const cache = diInterfaceRowsByExportByProject.get(sourceProject) ?? new Map<string, readonly FrameworkDiInterfaceExportRow[]>();
  if (!diInterfaceRowsByExportByProject.has(sourceProject)) {
    diInterfaceRowsByExportByProject.set(sourceProject, cache);
  }
  const key = `${packageId}:${exportName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkDiInterfacePackageRows(sourceProject, packageId, packageName, exportName);
  cache.set(key, rows);
  return rows;
}

function scanFrameworkDiInterfacePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkDiInterfaceExportRow[] {
  const publicSurface = readFrameworkPublicExportSurface(sourceProject, packageId);
  if (publicSurface.exportsByName.size === 0) {
    return [];
  }
  return sourceProject.ownedSourceFiles()
    .filter((sourceFile) => sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => exportedVariableDeclarations(sourceFile)
      .filter((declaration): declaration is ts.VariableDeclaration & { readonly name: ts.Identifier } => ts.isIdentifier(declaration.name))
      .filter((declaration) => exportName === undefined || declaration.name.text === exportName)
      .flatMap((declaration) => {
        const publicExport = publicSurface.exportsByName.get(declaration.name.text);
        return publicExport === undefined
          ? []
          : diInterfaceRowsForVariable(sourceProject, sourceFile, declaration, packageId, packageName, publicExport);
      }))
    .sort((left, right) =>
      left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
      || left.interfaceKey.localeCompare(right.interfaceKey)
    );
}

function readFrameworkObserverEntities(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkObserverEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkObserverEntityPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId)
  );
  return rows
    .filter((row) => filters.exportName === undefined || row.exportEntry.exportName === filters.exportName)
    .filter((row) => filters.observerKind === undefined || row.observerKinds.includes(filters.observerKind as FrameworkObserverEntityKind))
    .filter((row) => filters.observerCapability === undefined || row.observerCapabilities.includes(filters.observerCapability as FrameworkObserverCapability))
    .filter((row) => filters.exportShape === undefined || row.exportShape === filters.exportShape)
    .filter((row) => filters.query === undefined || observerEntityMatchesQuery(row, filters.query))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.observerKinds.join(",").localeCompare(right.observerKinds.join(","))
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkObserverEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkObserverEntityRow[] {
  const cache = observerEntityRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkObserverEntityRow[]>();
  if (!observerEntityRowsByPackageByProject.has(sourceProject)) {
    observerEntityRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkObserverEntityRow>(sourceProject, "observers", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = scanFrameworkObserverEntityPackageRows(sourceProject, packageId, packageName);
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "observers", packageId, rows);
  return rows;
}

function scanFrameworkObserverEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkObserverEntityRow[] {
  const diInterfaces = readFrameworkDiInterfacePackageRows(sourceProject, packageId, packageName);
  const diInterfacesByExport = new Map(diInterfaces.map((row) => [row.exportEntry.exportName, row]));
  const candidateNames = observerCandidateExportNamesForPackage(sourceProject, packageId, diInterfaces);
  return packageExportsForCandidateNames(sourceProject, packageId, candidateNames, false)
    .flatMap((row) => {
      const diInterface = diInterfacesByExport.get(row.exportEntry.exportName);
      return observerEntityRowForPackageExport(row, diInterface);
    })
    .sort((left, right) =>
      left.observerKinds.join(",").localeCompare(right.observerKinds.join(","))
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function observerCandidateExportNamesForPackage(
  sourceProject: SourceProject,
  packageId: string,
  diInterfaces: readonly FrameworkDiInterfaceExportRow[],
): readonly string[] {
  const names = readExportNames(sourceProject, {
    scheme: SourceSelectorScheme.Package,
    packageId,
  }, {
    limit: 100_000,
    offset: 0,
  }).exports
    .map((entry) => entry.exportName)
    .filter(isObservationNameCandidate);
  return uniqueStrings([
    ...names,
    ...diInterfaces
      .filter((row) => isObservationNameCandidate(row.exportEntry.exportName) || isObservationNameCandidate(row.interfaceKey))
      .map((row) => row.exportEntry.exportName),
  ]);
}

function observerEntityRowForPackageExport(
  row: FrameworkPackageExportRow,
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverEntityRow[] {
  const matchedBy = observerMatchesForPackageExport(row, diInterface);
  const observerKinds = observerKindsForPackageExport(row, matchedBy, diInterface);
  if (observerKinds.length === 0) {
    return [];
  }
  const observerCapabilities = observerCapabilitiesForEntity(row, observerKinds, diInterface);
  return [{
    ...row,
    observerKinds,
    exportShape: observerEntityShapeForPackageExport(row, diInterface),
    observerCapabilities,
    matchedBy,
    ...(diInterface === undefined ? {} : { diInterface }),
    defaultImplementationNames: diInterface === undefined ? [] : defaultImplementationNamesForDiInterface(diInterface),
  }];
}

function observerMatchesForPackageExport(
  row: FrameworkPackageExportRow,
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverMatchRow[] {
  const matches: FrameworkObserverMatchRow[] = [];
  addObserverMatch(matches, FrameworkObserverMatchBasis.ExportName, row.exportEntry.exportName);
  addObserverMatch(matches, FrameworkObserverMatchBasis.ResolvedName, row.exportEntry.resolvedName);
  if (row.exportEntry.type !== null) {
    addObserverMatch(matches, FrameworkObserverMatchBasis.TypeText, row.exportEntry.type);
  }
  for (const memberName of row.exportEntry.memberNames) {
    addObserverMatch(matches, FrameworkObserverMatchBasis.MemberName, memberName);
  }
  if (diInterface !== undefined) {
    addObserverMatch(matches, FrameworkObserverMatchBasis.DiInterface, diInterface.interfaceKey);
    for (const builderCall of diInterface.builderCalls) {
      addObserverMatch(matches, FrameworkObserverMatchBasis.DiInterface, builderCall.calleeName);
      for (const argument of builderCall.arguments) {
        addObserverMatch(matches, FrameworkObserverMatchBasis.DiInterface, argument.expression.text);
        if (argument.expression.symbolName !== null) {
          addObserverMatch(matches, FrameworkObserverMatchBasis.DiInterface, argument.expression.symbolName);
        }
      }
    }
  }
  return uniqueObserverMatches(matches);
}

function addObserverMatch(matches: FrameworkObserverMatchRow[], basis: FrameworkObserverMatchBasis, text: string): void {
  if (isObservationMatchText(text)) {
    matches.push({ basis, text });
  }
}

function isObservationMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return normalized.includes("observer")
    || normalized.includes("accessor")
    || normalized.includes("subscriber")
    || normalized.includes("connectable")
    || normalized.includes("watcher")
    || normalized.includes("signaler")
    || normalized.includes("signalbindingbehavior")
    || isEffectObservationText(normalized)
    || normalized.includes("dirtychecker")
    || normalized.includes("dirtycheck")
    || normalized.includes("observable")
    || normalized.includes("subscribable")
    || normalized.includes("getobserver")
    || normalized.includes("getaccessor")
    || normalized.includes("getarrayobserver")
    || normalized.includes("getmapobserver")
    || normalized.includes("getsetobserver");
}

function isObservationNameCandidate(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return normalized.includes("observer")
    || normalized.includes("accessor")
    || normalized.includes("subscriber")
    || normalized.includes("connectable")
    || normalized.includes("watcher")
    || normalized.includes("signaler")
    || normalized === "signals"
    || normalized.includes("signalbindingbehavior")
    || isEffectObservationText(normalized)
    || normalized.includes("dirtychecker")
    || normalized.includes("dirtycheck")
    || normalized.includes("observable")
    || normalized.includes("subscribable");
}

function isEffectObservationText(normalized: string): boolean {
  return normalized === "ieffect"
    || normalized === "effectrunfunc"
    || normalized.endsWith("effect")
    || normalized.includes("runeffect")
    || normalized.includes("effectbindingbehavior");
}

function observerKindsForPackageExport(
  row: FrameworkPackageExportRow,
  matchedBy: readonly FrameworkObserverMatchRow[],
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverEntityKind[] {
  if (matchedBy.length === 0) {
    return [];
  }
  const texts = observerClassificationTexts(row, matchedBy, diInterface);
  const kinds: FrameworkObserverEntityKind[] = [];
  if (texts.some((text) => text === "inodeobserverlocator" || text === "nodeobserverlocator" || text.includes("nodeobserverlocator"))) {
    kinds.push(FrameworkObserverEntityKind.NodeObserverLocator);
  }
  if (texts.some((text) => text === "iobserverlocator" || text === "observerlocator")) {
    kinds.push(FrameworkObserverEntityKind.ObserverLocator);
  }
  if (texts.some((text) => text.includes("dirtychecker") || text.includes("dirtycheckproperty") || text.includes("dirtychecksettings"))) {
    kinds.push(FrameworkObserverEntityKind.DirtyChecker);
  }
  if (texts.some((text) => text.includes("collectionobserver") || text.includes("arrayobserver") || text.includes("mapobserver") || text.includes("setobserver") || text.includes("collectionsubscriber"))) {
    kinds.push(FrameworkObserverEntityKind.CollectionObserver);
  }
  if (texts.some((text) => text.includes("connectable"))) {
    kinds.push(FrameworkObserverEntityKind.Connectable);
  }
  if (texts.some((text) => text.includes("watcher"))) {
    kinds.push(FrameworkObserverEntityKind.Watcher);
  }
  if (texts.some((text) => text.includes("signaler") || text.includes("signalbindingbehavior") || text === "signals")) {
    kinds.push(FrameworkObserverEntityKind.Signaler);
  }
  if (texts.some((text) => text.includes("effect") && !text.includes("effective"))) {
    kinds.push(FrameworkObserverEntityKind.Effect);
  }
  if (texts.some((text) => text.includes("subscriber") || text.includes("subscribable"))) {
    kinds.push(FrameworkObserverEntityKind.Subscriber);
  }
  if (texts.some((text) => text.includes("accessor"))) {
    kinds.push(FrameworkObserverEntityKind.Accessor);
  }
  if (texts.some((text) => isObserverRoleText(text))) {
    kinds.push(FrameworkObserverEntityKind.Observer);
  }
  if (texts.some((text) =>
    text.includes("getobserverlookup")
    || text.includes("getcollectionobserver")
    || text.includes("subscribercollection")
    || text.includes("observable")
  )) {
    kinds.push(FrameworkObserverEntityKind.ObservationHelper);
  }
  return uniqueEnumValues(kinds);
}

function observerClassificationTexts(
  row: FrameworkPackageExportRow,
  matchedBy: readonly FrameworkObserverMatchRow[],
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly string[] {
  return [
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    row.exportEntry.fullyQualifiedName ?? "",
    ...row.exportEntry.memberNames,
    ...matchedBy.map((match) => match.text),
    ...(diInterface === undefined ? [] : [
      diInterface.interfaceKey,
      ...diInterface.builderCalls.map((call) => call.calleeName),
      ...diInterface.builderCalls.flatMap((call) => call.arguments.map((argument) => argument.expression.text)),
    ]),
  ]
    .filter((text) => text.length > 0)
    .map(normalizeIdentifierText);
}

function isObserverRoleText(text: string): boolean {
  return text === "iobserver"
    || text === "observer"
    || text.endsWith("observer")
    || text.includes("observerimpl")
    || text.includes("observerrecord")
    || text.includes("accessororobserver");
}

function observerCapabilitiesForEntity(
  row: FrameworkPackageExportRow,
  observerKinds: readonly FrameworkObserverEntityKind[],
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): readonly FrameworkObserverCapability[] {
  const capabilities: FrameworkObserverCapability[] = [];
  const kindSet = new Set(observerKinds);
  const texts = observerClassificationTexts(row, [], diInterface);
  if (kindSet.has(FrameworkObserverEntityKind.ObserverLocator)) {
    capabilities.push(
      FrameworkObserverCapability.LocateObserver,
      FrameworkObserverCapability.LocateAccessor,
      FrameworkObserverCapability.LocateCollectionObserver,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.NodeObserverLocator)) {
    capabilities.push(
      FrameworkObserverCapability.LocateNodeObserver,
      FrameworkObserverCapability.LocateObserver,
      FrameworkObserverCapability.LocateAccessor,
    );
  }
  if (kindSet.has(FrameworkObserverEntityKind.Observer)) {
    capabilities.push(FrameworkObserverCapability.AccessValue, FrameworkObserverCapability.Notify, FrameworkObserverCapability.Subscribe);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Accessor)) {
    capabilities.push(FrameworkObserverCapability.AccessValue);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Subscriber)) {
    capabilities.push(FrameworkObserverCapability.Subscribe);
  }
  if (kindSet.has(FrameworkObserverEntityKind.CollectionObserver)) {
    capabilities.push(FrameworkObserverCapability.Collection, FrameworkObserverCapability.Subscribe, FrameworkObserverCapability.Notify);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Connectable) || kindSet.has(FrameworkObserverEntityKind.Watcher)) {
    capabilities.push(FrameworkObserverCapability.Connect, FrameworkObserverCapability.Subscribe);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Signaler)) {
    capabilities.push(FrameworkObserverCapability.Signal);
  }
  if (kindSet.has(FrameworkObserverEntityKind.Effect)) {
    capabilities.push(FrameworkObserverCapability.RunEffect, FrameworkObserverCapability.Connect);
  }
  if (kindSet.has(FrameworkObserverEntityKind.DirtyChecker)) {
    capabilities.push(FrameworkObserverCapability.DirtyCheck);
  }
  if (row.exportEntry.memberNames.includes("register") || diInterface !== undefined) {
    capabilities.push(FrameworkObserverCapability.Register);
  }
  if (texts.some((text) => text.includes("getobserver"))) {
    capabilities.push(FrameworkObserverCapability.LocateObserver);
  }
  if (texts.some((text) => text.includes("getaccessor"))) {
    capabilities.push(FrameworkObserverCapability.LocateAccessor);
  }
  if (texts.some((text) => text.includes("getarrayobserver") || text.includes("getmapobserver") || text.includes("getsetobserver") || text.includes("getcollectionobserver"))) {
    capabilities.push(FrameworkObserverCapability.LocateCollectionObserver, FrameworkObserverCapability.Collection);
  }
  return uniqueEnumValues(capabilities);
}

function observerEntityShapeForPackageExport(
  row: FrameworkPackageExportRow,
  diInterface: FrameworkDiInterfaceExportRow | undefined,
): FrameworkObserverEntityShape {
  if (diInterface !== undefined) {
    return FrameworkObserverEntityShape.DiInterface;
  }
  const declarationKinds = row.exportEntry.targets
    .map((target) => target.declarationKind)
    .filter((declarationKind): declarationKind is SourceDeclarationKind => declarationKind !== undefined);
  if (declarationKinds.includes(SourceDeclarationKind.Class)) {
    return FrameworkObserverEntityShape.Class;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Interface)) {
    return FrameworkObserverEntityShape.Interface;
  }
  if (declarationKinds.includes(SourceDeclarationKind.TypeAlias)) {
    return FrameworkObserverEntityShape.TypeAlias;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Function)) {
    return FrameworkObserverEntityShape.Function;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Variable)) {
    return FrameworkObserverEntityShape.Value;
  }
  return FrameworkObserverEntityShape.Unknown;
}

function defaultImplementationNamesForDiInterface(row: FrameworkDiInterfaceExportRow): readonly string[] {
  const names: string[] = [];
  for (const call of row.builderCalls) {
    for (const argument of call.arguments) {
      if (argument.expression.symbolName !== null && /^[A-Z]/u.test(argument.expression.symbolName)) {
        names.push(argument.expression.symbolName);
      }
      const expressionText = argument.expression.text;
      const newExpressionMatches = expressionText.matchAll(/\bnew\s+([A-Z][$\w]*)/gu);
      for (const match of newExpressionMatches) {
        const name = match[1];
        if (name !== undefined) {
          names.push(name);
        }
      }
      const bareIdentifierMatches = expressionText.matchAll(/\b([A-Z][$\w]*(?:ObserverLocator|DirtyChecker|Observer|Accessor|Subscriber|Watcher|Signaler|Effect))\b/gu);
      for (const match of bareIdentifierMatches) {
        const name = match[1];
        if (name !== undefined) {
          names.push(name);
        }
      }
    }
  }
  return uniqueStrings(names).filter((name) => name !== row.interfaceKey);
}

function observerEntityMatchesQuery(row: FrameworkObserverEntityRow, query: string): boolean {
  const normalizedQuery = normalizeIdentifierText(query);
  return [
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    row.exportShape,
    ...row.observerKinds,
    ...row.observerCapabilities,
    ...row.defaultImplementationNames,
    ...row.matchedBy.map((match) => match.text),
].some((text) => normalizeIdentifierText(text).includes(normalizedQuery));
}

function readFrameworkAppTaskEntities(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkAppTaskEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForFilters(packageNames, filters)
    .flatMap((packageId) => readFrameworkAppTaskEntityPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  return rows
    .filter((row) => filters.exportName === undefined || row.exportEntry.exportName === filters.exportName)
    .filter((row) => filters.appTaskKind === undefined || row.appTaskKinds.includes(filters.appTaskKind as FrameworkAppTaskEntityKind))
    .filter((row) => filters.appTaskCapability === undefined || row.appTaskCapabilities.includes(filters.appTaskCapability as FrameworkAppTaskCapability))
    .filter((row) => filters.exportShape === undefined || row.exportShape === filters.exportShape)
    .filter((row) => filters.query === undefined || catalogEntityMatchesQuery(row, filters.query, row.appTaskKinds, row.appTaskCapabilities))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.appTaskKinds.join(",").localeCompare(right.appTaskKinds.join(","))
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkAppTaskEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkAppTaskEntityRow[] {
  const cache = appTaskEntityRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkAppTaskEntityRow[]>();
  if (!appTaskEntityRowsByPackageByProject.has(sourceProject)) {
    appTaskEntityRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkAppTaskEntityRow>(sourceProject, "app-tasks", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const candidateNames = candidateExportNamesForPackage(sourceProject, packageId, false, isAppTaskNameCandidate);
  const rows = packageExportsForCandidateNames(sourceProject, packageId, candidateNames, false)
    .flatMap((row) => appTaskEntityRowForPackageExport(row));
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "app-tasks", packageId, rows);
  return rows;
}

function appTaskEntityRowForPackageExport(row: FrameworkPackageExportRow): readonly FrameworkAppTaskEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(row, isAppTaskMatchText, false);
  const appTaskKinds = appTaskKindsForPackageExport(row);
  if (appTaskKinds.length === 0) {
    return [];
  }
  return [{
    ...row,
    appTaskKinds,
    exportShape: catalogExportShapeForPackageExport(row),
    appTaskCapabilities: appTaskCapabilitiesForEntity(row, appTaskKinds),
    matchedBy,
  }];
}

function readFrameworkRouterEntities(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkRouterEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForEntityFilters(packageNames, filters, ["router", "route-recognizer", "aurelia"])
    .flatMap((packageId) => readFrameworkRouterEntityPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  return rows
    .filter((row) => filters.exportName === undefined || row.exportEntry.exportName === filters.exportName)
    .filter((row) => filters.routerKind === undefined || row.routerKinds.includes(filters.routerKind as FrameworkRouterEntityKind))
    .filter((row) => filters.routerCapability === undefined || row.routerCapabilities.includes(filters.routerCapability as FrameworkRouterCapability))
    .filter((row) => filters.exportShape === undefined || row.exportShape === filters.exportShape)
    .filter((row) => filters.query === undefined || catalogEntityMatchesQuery(row, filters.query, row.routerKinds, row.routerCapabilities))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.routerKinds.join(",").localeCompare(right.routerKinds.join(","))
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkRouterEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkRouterEntityRow[] {
  const cache = routerEntityRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkRouterEntityRow[]>();
  if (!routerEntityRowsByPackageByProject.has(sourceProject)) {
    routerEntityRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkRouterEntityRow>(sourceProject, "router-entities", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const includePackage = packageId === "router" || packageId === "route-recognizer";
  const candidateNames = candidateExportNamesForPackage(sourceProject, packageId, includePackage, isRouterNameCandidate);
  const rows = packageExportsForCandidateNames(sourceProject, packageId, candidateNames, packageId === "router")
    .flatMap((row) => routerEntityRowForPackageExport(row, includePackage));
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "router-entities", packageId, rows);
  return rows;
}

function routerEntityRowForPackageExport(row: FrameworkPackageExportRow, packageAdmitted: boolean): readonly FrameworkRouterEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(row, isRouterMatchText, packageAdmitted);
  const routerKinds = routerKindsForPackageExport(row, packageAdmitted);
  if (routerKinds.length === 0) {
    return [];
  }
  return [{
    ...row,
    routerKinds,
    exportShape: catalogExportShapeForPackageExport(row),
    routerCapabilities: routerCapabilitiesForEntity(row, routerKinds),
    matchedBy,
  }];
}

function readFrameworkExpressionEntities(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkExpressionEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForEntityFilters(packageNames, filters, ["expression-parser", "runtime", "runtime-html", "template-compiler", "aurelia"])
    .flatMap((packageId) => readFrameworkExpressionEntityPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  return rows
    .filter((row) => filters.exportName === undefined || row.exportEntry.exportName === filters.exportName)
    .filter((row) => filters.expressionKind === undefined || row.expressionKinds.includes(filters.expressionKind as FrameworkExpressionEntityKind))
    .filter((row) => filters.expressionCapability === undefined || row.expressionCapabilities.includes(filters.expressionCapability as FrameworkExpressionCapability))
    .filter((row) => filters.exportShape === undefined || row.exportShape === filters.exportShape)
    .filter((row) => filters.query === undefined || catalogEntityMatchesQuery(row, filters.query, row.expressionKinds, row.expressionCapabilities))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.expressionKinds.join(",").localeCompare(right.expressionKinds.join(","))
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkExpressionEntityPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkExpressionEntityRow[] {
  const cache = expressionEntityRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkExpressionEntityRow[]>();
  if (!expressionEntityRowsByPackageByProject.has(sourceProject)) {
    expressionEntityRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkExpressionEntityRow>(sourceProject, "expression-entities", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const includePackage = packageId === "expression-parser";
  const candidateNames = candidateExportNamesForPackage(sourceProject, packageId, includePackage, isExpressionNameCandidate);
  const rows = packageExportsForCandidateNames(sourceProject, packageId, candidateNames, false)
    .flatMap((row) => expressionEntityRowForPackageExport(row, includePackage));
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "expression-entities", packageId, rows);
  return rows;
}

function expressionEntityRowForPackageExport(row: FrameworkPackageExportRow, packageAdmitted: boolean): readonly FrameworkExpressionEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(row, isExpressionMatchText, packageAdmitted);
  const expressionKinds = expressionKindsForPackageExport(row, packageAdmitted);
  if (expressionKinds.length === 0) {
    return [];
  }
  return [{
    ...row,
    expressionKinds,
    exportShape: catalogExportShapeForPackageExport(row),
    expressionCapabilities: expressionCapabilitiesForEntity(row, expressionKinds),
    matchedBy,
  }];
}

function readFrameworkRenderingStructures(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkRenderingStructureEntityRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const rows = frameworkPackageIdsForEntityFilters(packageNames, filters, ["runtime-html", "template-compiler", "runtime", "aurelia"])
    .flatMap((packageId) => readFrameworkRenderingStructurePackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  return rows
    .filter((row) => filters.exportName === undefined || row.exportEntry.exportName === filters.exportName)
    .filter((row) => filters.renderingStructureKind === undefined || row.renderingStructureKinds.includes(filters.renderingStructureKind as FrameworkRenderingStructureKind))
    .filter((row) => filters.renderingCapability === undefined || row.renderingCapabilities.includes(filters.renderingCapability as FrameworkRenderingCapability))
    .filter((row) => filters.exportShape === undefined || row.exportShape === filters.exportShape)
    .filter((row) => filters.query === undefined || catalogEntityMatchesQuery(row, filters.query, row.renderingStructureKinds, row.renderingCapabilities))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.renderingStructureKinds.join(",").localeCompare(right.renderingStructureKinds.join(","))
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkRenderingStructurePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkRenderingStructureEntityRow[] {
  const cache = renderingStructureRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkRenderingStructureEntityRow[]>();
  if (!renderingStructureRowsByPackageByProject.has(sourceProject)) {
    renderingStructureRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkRenderingStructureEntityRow>(sourceProject, "rendering-structures", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const candidateNames = candidateExportNamesForPackage(sourceProject, packageId, false, isRenderingStructureNameCandidate);
  const rows = packageExportsForCandidateNames(sourceProject, packageId, candidateNames, false)
    .flatMap((row) => renderingStructureRowForPackageExport(row));
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "rendering-structures", packageId, rows);
  return rows;
}

function renderingStructureRowForPackageExport(row: FrameworkPackageExportRow): readonly FrameworkRenderingStructureEntityRow[] {
  const matchedBy = catalogMatchesForPackageExport(row, isRenderingStructureMatchText, false);
  const renderingStructureKinds = renderingStructureKindsForPackageExport(row);
  if (renderingStructureKinds.length === 0) {
    return [];
  }
  return [{
    ...row,
    renderingStructureKinds,
    exportShape: catalogExportShapeForPackageExport(row),
    renderingCapabilities: renderingCapabilitiesForEntity(row, renderingStructureKinds),
    matchedBy,
  }];
}

function frameworkPackageIdsForEntityFilters(
  packageNames: ReadonlyMap<string, string>,
  filters: FrameworkDiscoveryFilters,
  allowedPackageIds: readonly string[],
): readonly string[] {
  const allowed = new Set(allowedPackageIds);
  return frameworkPackageIdsForFilters(packageNames, filters).filter((packageId) => allowed.has(packageId));
}

function readFrameworkEntityCatalogCache<T>(
  sourceProject: SourceProject,
  catalogId: string,
  packageId: string,
  dependencyPackageIds: readonly string[] = [],
): readonly T[] | undefined {
  if (process.env.ATLAS_FRAMEWORK_JSON_CACHE === "0") {
    return undefined;
  }
  return readFrameworkJsonCachePackage<readonly T[]>(sourceProject, {
    familyId: frameworkEntityCatalogCacheFamilyId(catalogId),
    familyVersion: FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION,
    producerVersion: frameworkEntityCatalogCacheProducerVersion,
    packageId,
    dependencyPackageIds,
  });
}

function writeFrameworkEntityCatalogCache<T>(
  sourceProject: SourceProject,
  catalogId: string,
  packageId: string,
  rows: readonly T[],
  dependencyPackageIds: readonly string[] = [],
): void {
  if (process.env.ATLAS_FRAMEWORK_JSON_CACHE === "0") {
    return;
  }
  writeFrameworkJsonCachePackage(sourceProject, {
    familyId: frameworkEntityCatalogCacheFamilyId(catalogId),
    familyVersion: FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION,
    producerVersion: frameworkEntityCatalogCacheProducerVersion,
    packageId,
    dependencyPackageIds,
  }, rows);
}

function frameworkEntityCatalogCacheFamilyId(catalogId: string): string {
  return `${FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID}.${catalogId}`;
}

function frameworkEntityCatalogDependencyPackageIds(sourceProject: SourceProject, ownerPackageId: string): readonly string[] {
  return [...readFrameworkPackageNames(sourceProject).keys()].filter((packageId) => packageId !== ownerPackageId);
}

function candidateExportNamesForPackage(
  sourceProject: SourceProject,
  packageId: string,
  includeEntirePackage: boolean,
  isCandidate: (name: string) => boolean,
): readonly string[] {
  return readExportNames(sourceProject, {
    scheme: SourceSelectorScheme.Package,
    packageId,
  }, {
    limit: 100_000,
    offset: 0,
  }).exports
    .map((entry) => entry.exportName)
    .filter((name) => includeEntirePackage || isCandidate(name));
}

function packageExportsForCandidateNames(
  sourceProject: SourceProject,
  packageId: string,
  candidateNames: readonly string[],
  preferFullSurface: boolean,
): readonly FrameworkPackageExportRow[] {
  const uniqueNames = uniqueStrings(candidateNames);
  if (uniqueNames.length === 0) {
    return [];
  }
  if (preferFullSurface) {
    const admittedNames = new Set(uniqueNames);
    return readFrameworkPackageExports(sourceProject, { packageId })
      .filter((row) => admittedNames.has(row.exportEntry.exportName));
  }
  return uniqueNames.flatMap((exportName) => readFrameworkPackageExports(sourceProject, { packageId, exportName }));
}

function catalogMatchesForPackageExport(
  row: FrameworkPackageExportRow,
  isMatchText: (text: string) => boolean,
  packageAdmitted: boolean,
): readonly FrameworkCatalogMatchRow[] {
  const matches: FrameworkCatalogMatchRow[] = [];
  if (packageAdmitted) {
    matches.push({ basis: FrameworkCatalogMatchBasis.Package, text: row.packageId });
  }
  addCatalogMatch(matches, FrameworkCatalogMatchBasis.ExportName, row.exportEntry.exportName, isMatchText);
  addCatalogMatch(matches, FrameworkCatalogMatchBasis.ResolvedName, row.exportEntry.resolvedName, isMatchText);
  if (row.exportEntry.type !== null) {
    addCatalogMatch(matches, FrameworkCatalogMatchBasis.TypeText, row.exportEntry.type, isMatchText);
  }
  for (const memberName of row.exportEntry.memberNames) {
    addCatalogMatch(matches, FrameworkCatalogMatchBasis.MemberName, memberName, isMatchText);
  }
  return uniqueCatalogMatches(matches);
}

function addCatalogMatch(
  matches: FrameworkCatalogMatchRow[],
  basis: FrameworkCatalogMatchBasis,
  text: string,
  isMatchText: (text: string) => boolean,
): void {
  if (isMatchText(text)) {
    matches.push({ basis, text });
  }
}

function catalogEntityMatchesQuery(
  row: FrameworkPackageExportRow & { readonly exportShape: FrameworkCatalogExportShape; readonly matchedBy: readonly FrameworkCatalogMatchRow[] },
  query: string,
  kinds: readonly string[],
  capabilities: readonly string[],
): boolean {
  const normalizedQuery = normalizeIdentifierText(query);
  return [
    row.packageId,
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    row.exportShape,
    ...kinds,
    ...capabilities,
    ...row.matchedBy.map((match) => match.text),
  ].some((text) => normalizeIdentifierText(text).includes(normalizedQuery));
}

function catalogExportShapeForPackageExport(row: FrameworkPackageExportRow): FrameworkCatalogExportShape {
  const declarationKinds = row.exportEntry.targets
    .map((target) => target.declarationKind)
    .filter((declarationKind): declarationKind is SourceDeclarationKind => declarationKind !== undefined);
  if (row.exportEntry.type?.includes("InterfaceSymbol") === true) {
    return FrameworkCatalogExportShape.DiInterface;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Class)) {
    return FrameworkCatalogExportShape.Class;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Interface)) {
    return FrameworkCatalogExportShape.Interface;
  }
  if (declarationKinds.includes(SourceDeclarationKind.TypeAlias)) {
    return FrameworkCatalogExportShape.TypeAlias;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Function)) {
    return FrameworkCatalogExportShape.Function;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Variable)) {
    return FrameworkCatalogExportShape.Value;
  }
  return FrameworkCatalogExportShape.Unknown;
}

function appTaskKindsForPackageExport(row: FrameworkPackageExportRow): readonly FrameworkAppTaskEntityKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkAppTaskEntityKind[] = [];
  if (texts.some((text) => text === "apptask")) {
    kinds.push(FrameworkAppTaskEntityKind.AppTaskFactory);
  }
  if (texts.some((text) => text === "iapptask")) {
    kinds.push(FrameworkAppTaskEntityKind.AppTaskKey);
  }
  if (texts.some((text) => text.includes("taskslot") || text.includes("creating") || text.includes("hydrating") || text.includes("activated"))) {
    kinds.push(FrameworkAppTaskEntityKind.TaskSlot);
  }
  if (texts.some((text) => text.includes("callback"))) {
    kinds.push(FrameworkAppTaskEntityKind.TaskCallback);
  }
  if (texts.some((text) => text === "task" || text === "recurringtask" || text === "taskstatus" || text === "taskaborterror")) {
    kinds.push(FrameworkAppTaskEntityKind.Task);
  }
  if (texts.some((text) => text.includes("queuetask") || text.includes("run_tasks") || text.includes("runtasks") || text.includes("taskqueue") || text.includes("taskssettled") || text.includes("istaskqueueempty") || text.includes("getrecurringtasks"))) {
    kinds.push(FrameworkAppTaskEntityKind.TaskQueue);
  }
  if (texts.some((text) => text.includes("lifecyclehook"))) {
    kinds.push(FrameworkAppTaskEntityKind.LifecycleHook);
  }
  return uniqueEnumValues(kinds);
}

function appTaskCapabilitiesForEntity(row: FrameworkPackageExportRow, kinds: readonly FrameworkAppTaskEntityKind[]): readonly FrameworkAppTaskCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkAppTaskCapability[] = [];
  if (kindSet.has(FrameworkAppTaskEntityKind.AppTaskFactory) || kindSet.has(FrameworkAppTaskEntityKind.AppTaskKey) || kindSet.has(FrameworkAppTaskEntityKind.TaskSlot) || row.exportEntry.memberNames.includes("register")) {
    capabilities.push(FrameworkAppTaskCapability.Register);
  }
  if (kindSet.has(FrameworkAppTaskEntityKind.AppTaskFactory) || kindSet.has(FrameworkAppTaskEntityKind.TaskSlot) || kindSet.has(FrameworkAppTaskEntityKind.LifecycleHook)) {
    capabilities.push(FrameworkAppTaskCapability.LifecyclePhase);
  }
  if (kindSet.has(FrameworkAppTaskEntityKind.TaskCallback)) {
    capabilities.push(FrameworkAppTaskCapability.Callback);
  }
  if (texts.some((text) => text.includes("queue") || text.includes("recurring"))) {
    capabilities.push(FrameworkAppTaskCapability.Queue);
  }
  if (texts.some((text) => text.includes("runtasks") || text.includes("taskssettled"))) {
    capabilities.push(FrameworkAppTaskCapability.Run);
  }
  if (texts.some((text) => text.includes("status") || text.includes("empty"))) {
    capabilities.push(FrameworkAppTaskCapability.Status);
  }
  return uniqueEnumValues(capabilities);
}

function routerKindsForPackageExport(row: FrameworkPackageExportRow, packageAdmitted: boolean): readonly FrameworkRouterEntityKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkRouterEntityKind[] = [];
  if (texts.some((text) => text === "router" || text.includes("contextrouter") || text.includes("routeroptions"))) {
    kinds.push(FrameworkRouterEntityKind.Router);
  }
  if (texts.some((text) => text.includes("configuration") || text.includes("registration") || text.includes("options"))) {
    kinds.push(FrameworkRouterEntityKind.Configuration);
  }
  if (texts.some((text) => text.includes("routeconfig") || text === "route" || text.includes("routeable") || text.includes("routetype") || text.includes("routeparameter"))) {
    kinds.push(FrameworkRouterEntityKind.Route);
  }
  if (texts.some((text) => text.includes("routecontext"))) {
    kinds.push(FrameworkRouterEntityKind.RouteContext);
  }
  if (texts.some((text) => text.includes("routetree") || text.includes("routenode"))) {
    kinds.push(FrameworkRouterEntityKind.RouteTree);
  }
  if (texts.some((text) => text.includes("navigation") || text.includes("transition"))) {
    kinds.push(FrameworkRouterEntityKind.Navigation);
  }
  if (texts.some((text) => text.includes("viewport"))) {
    kinds.push(FrameworkRouterEntityKind.Viewport);
  }
  if (texts.some((text) => text.includes("endpoint"))) {
    kinds.push(FrameworkRouterEntityKind.Endpoint);
  }
  if (texts.some((text) => text.includes("location") || text.includes("history"))) {
    kinds.push(FrameworkRouterEntityKind.Location);
  }
  if (texts.some((text) => text.includes("urlparser") || text.includes("fragmenturlparser") || text.includes("pathurlparser"))) {
    kinds.push(FrameworkRouterEntityKind.UrlParser);
  }
  if (texts.some((text) => text.includes("recognizer") || text.includes("recognizedroute") || text.includes("configurableroute") || text === "parameter")) {
    kinds.push(FrameworkRouterEntityKind.Recognizer);
  }
  if (texts.some((text) => text.includes("event"))) {
    kinds.push(FrameworkRouterEntityKind.Event);
  }
  if (texts.some((text) => text.includes("state") || text.includes("managedstate"))) {
    kinds.push(FrameworkRouterEntityKind.State);
  }
  if (texts.some((text) => text.includes("instruction"))) {
    kinds.push(FrameworkRouterEntityKind.Instruction);
  }
  if (texts.some((text) => text.includes("customattribute") || text.includes("defaultresources") || text.includes("defaultcomponents") || text === "hrefcustomattribute" || text === "loadcustomattribute")) {
    kinds.push(FrameworkRouterEntityKind.RouteResource);
  }
  if (kinds.length === 0 && packageAdmitted) {
    kinds.push(row.packageId === "route-recognizer" ? FrameworkRouterEntityKind.Recognizer : FrameworkRouterEntityKind.RouteResource);
  }
  return uniqueEnumValues(kinds);
}

function routerCapabilitiesForEntity(row: FrameworkPackageExportRow, kinds: readonly FrameworkRouterEntityKind[]): readonly FrameworkRouterCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkRouterCapability[] = [];
  if (kindSet.has(FrameworkRouterEntityKind.Configuration) || row.exportEntry.memberNames.includes("register")) {
    capabilities.push(FrameworkRouterCapability.Configure, FrameworkRouterCapability.Register);
  }
  if (kindSet.has(FrameworkRouterEntityKind.Router) || kindSet.has(FrameworkRouterEntityKind.Navigation) || texts.some((text) => text.includes("navigate"))) {
    capabilities.push(FrameworkRouterCapability.Navigate);
  }
  if (kindSet.has(FrameworkRouterEntityKind.Recognizer)) {
    capabilities.push(FrameworkRouterCapability.Recognize);
  }
  if (kindSet.has(FrameworkRouterEntityKind.UrlParser) || kindSet.has(FrameworkRouterEntityKind.Location)) {
    capabilities.push(FrameworkRouterCapability.ParseUrl);
  }
  if (kindSet.has(FrameworkRouterEntityKind.State)) {
    capabilities.push(FrameworkRouterCapability.ManageState);
  }
  if (kindSet.has(FrameworkRouterEntityKind.Viewport) || kindSet.has(FrameworkRouterEntityKind.Endpoint)) {
    capabilities.push(FrameworkRouterCapability.RenderViewport);
  }
  if (kindSet.has(FrameworkRouterEntityKind.Event)) {
    capabilities.push(FrameworkRouterCapability.EmitEvent);
  }
  return uniqueEnumValues(capabilities);
}

function expressionKindsForPackageExport(row: FrameworkPackageExportRow, packageAdmitted: boolean): readonly FrameworkExpressionEntityKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkExpressionEntityKind[] = [];
  if (texts.some((text) => text.includes("expressionparser") || text === "parseexpression")) {
    kinds.push(FrameworkExpressionEntityKind.Parser);
  }
  if (texts.some((text) => text.includes("access"))) {
    kinds.push(FrameworkExpressionEntityKind.Access);
  }
  if (texts.some((text) => text.includes("call"))) {
    kinds.push(FrameworkExpressionEntityKind.Call);
  }
  if (texts.some((text) => text.includes("literal") || text.includes("template"))) {
    kinds.push(FrameworkExpressionEntityKind.Literal);
  }
  if (texts.some((text) => text.includes("operator") || text.includes("binary") || text.includes("unary") || text.includes("conditional") || text.includes("assign"))) {
    kinds.push(FrameworkExpressionEntityKind.Operator);
  }
  if (texts.some((text) => text.includes("bindingpattern") || text.includes("destructuring") || text.includes("bindingidentifier"))) {
    kinds.push(FrameworkExpressionEntityKind.Pattern);
  }
  if (texts.some((text) => text.includes("interpolation"))) {
    kinds.push(FrameworkExpressionEntityKind.Interpolation);
  }
  if (texts.some((text) => text.includes("forof"))) {
    kinds.push(FrameworkExpressionEntityKind.ForOf);
  }
  if (texts.some((text) => text.includes("bindingbehavior"))) {
    kinds.push(FrameworkExpressionEntityKind.BindingBehavior);
  }
  if (texts.some((text) => text.includes("valueconverter"))) {
    kinds.push(FrameworkExpressionEntityKind.ValueConverter);
  }
  if (texts.some((text) => text.includes("visitor") || text.includes("astvisit"))) {
    kinds.push(FrameworkExpressionEntityKind.Visitor);
  }
  if (texts.some((text) => text.includes("astevaluator") || text.includes("astevaluate"))) {
    kinds.push(FrameworkExpressionEntityKind.Evaluator);
  }
  if (texts.some((text) => text.includes("unparser"))) {
    kinds.push(FrameworkExpressionEntityKind.Unparser);
  }
  if (texts.some((text) => text.startsWith("create") || text.startsWith("is") || text.includes("expressionkind") || text.includes("expressiontype"))) {
    kinds.push(FrameworkExpressionEntityKind.Helper);
  }
  if (texts.some((text) => text.includes("expression")) || (packageAdmitted && kinds.length === 0)) {
    kinds.push(FrameworkExpressionEntityKind.AstNode);
  }
  return uniqueEnumValues(kinds);
}

function expressionCapabilitiesForEntity(row: FrameworkPackageExportRow, kinds: readonly FrameworkExpressionEntityKind[]): readonly FrameworkExpressionCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkExpressionCapability[] = [];
  if (kindSet.has(FrameworkExpressionEntityKind.Parser) || texts.some((text) => text.includes("parse"))) {
    capabilities.push(FrameworkExpressionCapability.Parse);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Visitor)) {
    capabilities.push(FrameworkExpressionCapability.Visit);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Evaluator)) {
    capabilities.push(FrameworkExpressionCapability.Evaluate);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Helper) || texts.some((text) => text.startsWith("create"))) {
    capabilities.push(FrameworkExpressionCapability.BuildAst);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Operator) && texts.some((text) => text.includes("assign"))) {
    capabilities.push(FrameworkExpressionCapability.Assign);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.Interpolation)) {
    capabilities.push(FrameworkExpressionCapability.Interpolate);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.ValueConverter)) {
    capabilities.push(FrameworkExpressionCapability.ConvertValue);
  }
  if (kindSet.has(FrameworkExpressionEntityKind.BindingBehavior)) {
    capabilities.push(FrameworkExpressionCapability.ApplyBehavior);
  }
  return uniqueEnumValues(capabilities);
}

function renderingStructureKindsForPackageExport(row: FrameworkPackageExportRow): readonly FrameworkRenderingStructureKind[] {
  const texts = catalogClassificationTexts(row);
  const kinds: FrameworkRenderingStructureKind[] = [];
  if (texts.some((text) => text.includes("approot") || text === "aurelia")) {
    kinds.push(FrameworkRenderingStructureKind.AppRoot);
  }
  if (texts.some((text) => text.includes("controller"))) {
    kinds.push(FrameworkRenderingStructureKind.Controller);
  }
  if (texts.some((text) => text === "viewfactory" || text.includes("iviewfactory"))) {
    kinds.push(FrameworkRenderingStructureKind.ViewFactory);
  }
  if (texts.some((text) => text.includes("syntheticview") || text.includes("viewmodel") || text === "viewfactory")) {
    kinds.push(FrameworkRenderingStructureKind.View);
  }
  if (texts.some((text) => text.includes("hydrat"))) {
    kinds.push(FrameworkRenderingStructureKind.Hydration);
  }
  if (texts.some((text) => text.includes("renderer") || text === "rendering" || text === "irendering")) {
    kinds.push(FrameworkRenderingStructureKind.Renderer);
  }
  if (texts.some((text) => text.includes("rendercontext") || text.includes("hydrationcontext"))) {
    kinds.push(FrameworkRenderingStructureKind.RenderContext);
  }
  if (texts.some((text) => text.includes("renderlocation"))) {
    kinds.push(FrameworkRenderingStructureKind.RenderLocation);
  }
  if (texts.some((text) => text.includes("nodesequence") || text.includes("fragmentnodesequence"))) {
    kinds.push(FrameworkRenderingStructureKind.NodeSequence);
  }
  if (texts.some((text) => text.includes("lifecyclehook") || text.includes("lifecyclehooks"))) {
    kinds.push(FrameworkRenderingStructureKind.LifecycleHook);
  }
  if (texts.some((text) => text === "iplatform" || text === "iwindow" || text === "inode" || text.includes("platform") || text.includes("svg"))) {
    kinds.push(FrameworkRenderingStructureKind.PlatformBoundary);
  }
  if (texts.some((text) => text.includes("mounttarget") || text.includes("portal"))) {
    kinds.push(FrameworkRenderingStructureKind.MountTarget);
  }
  if (texts.some((text) => text.includes("ssr") || text.includes("adoptssr"))) {
    kinds.push(FrameworkRenderingStructureKind.Ssr);
  }
  return uniqueEnumValues(kinds);
}

function renderingCapabilitiesForEntity(row: FrameworkPackageExportRow, kinds: readonly FrameworkRenderingStructureKind[]): readonly FrameworkRenderingCapability[] {
  const kindSet = new Set(kinds);
  const texts = catalogClassificationTexts(row);
  const capabilities: FrameworkRenderingCapability[] = [];
  if (kindSet.has(FrameworkRenderingStructureKind.Renderer) || kindSet.has(FrameworkRenderingStructureKind.RenderLocation)) {
    capabilities.push(FrameworkRenderingCapability.Render);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.Hydration)) {
    capabilities.push(FrameworkRenderingCapability.Hydrate);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.View) || kindSet.has(FrameworkRenderingStructureKind.ViewFactory) || kindSet.has(FrameworkRenderingStructureKind.NodeSequence)) {
    capabilities.push(FrameworkRenderingCapability.CreateView);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.Controller) || kindSet.has(FrameworkRenderingStructureKind.LifecycleHook)) {
    capabilities.push(FrameworkRenderingCapability.ControlLifecycle);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.MountTarget) || kindSet.has(FrameworkRenderingStructureKind.AppRoot)) {
    capabilities.push(FrameworkRenderingCapability.Mount);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.PlatformBoundary) || texts.some((text) => text.includes("node") || text.includes("window"))) {
    capabilities.push(FrameworkRenderingCapability.Platform, FrameworkRenderingCapability.LocateDom);
  }
  if (kindSet.has(FrameworkRenderingStructureKind.Ssr)) {
    capabilities.push(FrameworkRenderingCapability.Ssr);
  }
  if (row.exportEntry.memberNames.includes("register")) {
    capabilities.push(FrameworkRenderingCapability.Register);
  }
  return uniqueEnumValues(capabilities);
}

function isAppTaskNameCandidate(name: string): boolean {
  const normalized = normalizeIdentifierText(name);
  return isAppTaskMatchText(normalized);
}

function isAppTaskMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return normalized.includes("apptask")
    || normalized.includes("taskslot")
    || normalized === "task"
    || normalized.includes("recurringtask")
    || normalized.includes("queuetask")
    || normalized.includes("taskstatus")
    || normalized.includes("taskaborterror")
    || normalized.includes("taskssettled")
    || normalized.includes("istaskqueueempty")
    || normalized.includes("getrecurringtasks")
    || normalized.includes("runtasks")
    || normalized.includes("lifecyclehook");
}

function isRouterNameCandidate(name: string): boolean {
  return isRouterMatchText(name);
}

function isRouterMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return normalized.includes("router")
    || normalized.includes("route")
    || normalized.includes("navigation")
    || normalized.includes("viewport")
    || normalized.includes("endpoint")
    || normalized.includes("urlparser")
    || normalized.includes("recognizer")
    || normalized.includes("managedstate")
    || normalized.includes("transition")
    || normalized.includes("hrefcustomattribute")
    || normalized.includes("loadcustomattribute");
}

function isExpressionNameCandidate(name: string): boolean {
  return isExpressionMatchText(name);
}

function isExpressionMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return normalized.includes("expression")
    || normalized.includes("parser")
    || normalized.includes("ast")
    || normalized.includes("evaluator")
    || normalized.includes("unparser")
    || normalized.includes("visitor")
    || normalized.includes("interpolation")
    || normalized.includes("bindingbehavior")
    || normalized.includes("valueconverter");
}

function isRenderingStructureNameCandidate(name: string): boolean {
  return isRenderingStructureMatchText(name);
}

function isRenderingStructureMatchText(text: string): boolean {
  const normalized = normalizeIdentifierText(text);
  return normalized.includes("approot")
    || normalized === "aurelia"
    || normalized.includes("controller")
    || normalized.includes("viewfactory")
    || normalized.includes("syntheticview")
    || normalized.includes("viewmodel")
    || normalized.includes("hydrat")
    || normalized.includes("renderer")
    || normalized === "rendering"
    || normalized === "irendering"
    || normalized.includes("renderlocation")
    || normalized.includes("rendercontext")
    || normalized.includes("hydrationcontext")
    || normalized.includes("nodesequence")
    || normalized.includes("lifecyclehook")
    || normalized === "iplatform"
    || normalized === "iwindow"
    || normalized === "inode"
    || normalized.includes("mounttarget")
    || normalized.includes("portal")
    || normalized.includes("ssr")
    || normalized.includes("svg");
}

function catalogClassificationTexts(row: FrameworkPackageExportRow): readonly string[] {
  return [
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    ...row.exportEntry.memberNames,
  ]
    .filter((text) => text.length > 0)
    .map(normalizeIdentifierText);
}

function uniqueCatalogMatches(matches: readonly FrameworkCatalogMatchRow[]): readonly FrameworkCatalogMatchRow[] {
  const seen = new Set<string>();
  const unique: FrameworkCatalogMatchRow[] = [];
  for (const match of matches) {
    const key = `${match.basis}:${match.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }
  return unique;
}

function uniqueObserverMatches(matches: readonly FrameworkObserverMatchRow[]): readonly FrameworkObserverMatchRow[] {
  const seen = new Set<string>();
  const unique: FrameworkObserverMatchRow[] = [];
  for (const match of matches) {
    const key = `${match.basis}:${match.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }
  return unique;
}

function uniqueEnumValues<TValue extends string>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function normalizeIdentifierText(text: string): string {
  return text.replace(/[^$\w]+/gu, "").toLowerCase();
}

function readFrameworkResourceCarriers(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkResourceCarrierRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = filters.exportName === undefined
    ? packageIds.flatMap((packageId) => readFrameworkResourcePackageCarrierRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId))
    : packageIds.flatMap((packageId) => readFrameworkResourceExportCarrierRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, filters.exportName!));
  return rows
    .filter((row) => filters.resourceKind === undefined || row.resourceKind === filters.resourceKind)
    .filter((row) => filters.query === undefined
      || row.sourceExportName.includes(filters.query)
      || row.resourceName?.includes(filters.query) === true
      || row.targetName?.includes(filters.query) === true)
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.resourceKind.localeCompare(right.resourceKind)
      || left.sourceExportName.localeCompare(right.sourceExportName)
      || (left.resourceName ?? "").localeCompare(right.resourceName ?? "")
    );
}

function readFrameworkResourcePackageCarrierRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkResourceCarrierRow[] {
  const cache = resourceCarrierRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkResourceCarrierRow[]>();
  if (!resourceCarrierRowsByPackageByProject.has(sourceProject)) {
    resourceCarrierRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkResourceCarrierRow>(sourceProject, "resource-carriers", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = scanFrameworkResourcePackageCarrierRows(sourceProject, packageId, packageName);
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "resource-carriers", packageId, rows);
  return rows;
}

function readFrameworkResourceExportCarrierRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkResourceCarrierRow[] {
  const packageCache = resourceCarrierRowsByPackageByProject.get(sourceProject)?.get(packageId);
  if (packageCache !== undefined) {
    return packageCache.filter((row) => row.sourceExportName === exportName);
  }
  const cache = resourceCarrierRowsByExportByProject.get(sourceProject) ?? new Map<string, readonly FrameworkResourceCarrierRow[]>();
  if (!resourceCarrierRowsByExportByProject.has(sourceProject)) {
    resourceCarrierRowsByExportByProject.set(sourceProject, cache);
  }
  const key = `${packageId}:${exportName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkResourcePackageCarrierRows(sourceProject, packageId, packageName, exportName);
  cache.set(key, rows);
  return rows;
}

function scanFrameworkResourcePackageCarrierRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkResourceCarrierRow[] {
  return sourceProject.ownedSourceFiles()
    .filter((sourceFile) => sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => [
      ...exportedClassDeclarations(sourceFile).flatMap((declaration) => {
        const name = declaration.name?.text;
        return name === undefined || (exportName !== undefined && name !== exportName)
          ? []
          : resourceCarriersForClass(sourceProject, sourceFile, declaration, packageId, packageName);
      }),
      ...exportedVariableDeclarations(sourceFile)
        .filter((declaration): declaration is ts.VariableDeclaration & { readonly name: ts.Identifier } => ts.isIdentifier(declaration.name))
        .flatMap((declaration) => {
          return exportName !== undefined && declaration.name.text !== exportName
            ? []
            : resourceCarriersForVariable(sourceProject, sourceFile, declaration, packageId, packageName);
        }),
      ...resourceCarriersForTopLevelDefineCalls(sourceProject, sourceFile, packageId, packageName, exportName),
    ])
    .sort((left, right) =>
      left.resourceKind.localeCompare(right.resourceKind)
      || left.sourceExportName.localeCompare(right.sourceExportName)
      || (left.resourceName ?? "").localeCompare(right.resourceName ?? "")
    );
}

function readFrameworkResourceExports(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkResourceExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = filters.exportName === undefined
    ? packageIds.flatMap((packageId) => readFrameworkResourcePackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId))
    : packageIds.flatMap((packageId) => readFrameworkResourceExportRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, filters.exportName!));
  return rows
    .filter((row) => filters.resourceKind === undefined || row.resourceKind === filters.resourceKind)
    .filter((row) => filters.query === undefined
      || row.exportEntry.exportName.includes(filters.query)
      || row.carrier.sourceExportName.includes(filters.query)
      || row.resourceName?.includes(filters.query) === true
      || row.targetName?.includes(filters.query) === true)
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.resourceKind.localeCompare(right.resourceKind)
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
      || (left.resourceName ?? "").localeCompare(right.resourceName ?? "")
    );
}

function readFrameworkResourcePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkResourceExportRow[] {
  const cache = resourceRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkResourceExportRow[]>();
  if (!resourceRowsByPackageByProject.has(sourceProject)) {
    resourceRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkResourceExportRow>(sourceProject, "resources", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = scanFrameworkResourcePackageRows(sourceProject, packageId, packageName);
  cache.set(packageId, rows);
  writeFrameworkEntityCatalogCache(sourceProject, "resources", packageId, rows);
  return rows;
}

function readFrameworkResourceExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkResourceExportRow[] {
  const packageCache = resourceRowsByPackageByProject.get(sourceProject)?.get(packageId);
  if (packageCache !== undefined) {
    return packageCache.filter((row) => row.exportEntry.exportName === exportName);
  }
  const cache = resourceRowsByExportByProject.get(sourceProject) ?? new Map<string, readonly FrameworkResourceExportRow[]>();
  if (!resourceRowsByExportByProject.has(sourceProject)) {
    resourceRowsByExportByProject.set(sourceProject, cache);
  }
  const key = `${packageId}:${exportName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkResourcePackageRows(sourceProject, packageId, packageName, exportName);
  cache.set(key, rows);
  return rows;
}

function scanFrameworkResourcePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkResourceExportRow[] {
  const publicSurface = readFrameworkPublicExportSurface(sourceProject, packageId);
  if (publicSurface.exportsByName.size === 0) {
    return [];
  }
  return readFrameworkResourcePackageCarrierRows(sourceProject, packageId, packageName)
    .flatMap((carrier) => {
      const publicExport = publicSurface.exportsByName.get(carrier.sourceExportName);
      return publicExport === undefined || (exportName !== undefined && publicExport.exportName !== exportName)
        ? []
        : [resourceExportRowFromCarrier(carrier, publicExport)];
    })
    .sort((left, right) =>
      left.resourceKind.localeCompare(right.resourceKind)
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
      || (left.resourceName ?? "").localeCompare(right.resourceName ?? "")
    );
}

function readFrameworkBundles(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkBundleExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = filters.exportName === undefined
    ? packageIds.flatMap((packageId) => readFrameworkBundlePackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId))
    : packageIds.flatMap((packageId) => readFrameworkBundleExportRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, filters.exportName!));
  return rows
    .filter((row) => filters.query === undefined
      || row.exportEntry.exportName.includes(filters.query)
      || row.associations.some((association) =>
        association.targetName?.includes(filters.query!) === true
        || association.catalogName?.includes(filters.query!) === true
        || association.helperName?.includes(filters.query!) === true))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.exportEntry.exportName.localeCompare(right.exportEntry.exportName)
    );
}

function readFrameworkSyntaxProducts(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkSyntaxProductRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = packageIds.flatMap((packageId) => readFrameworkSyntaxProductPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  return rows
    .filter((row) => filters.exportName === undefined || row.producerName === filters.exportName)
    .filter((row) => filters.resourceKind === undefined || row.resourceCarrier?.resourceKind === filters.resourceKind)
    .filter((row) => filters.producerKind === undefined || row.producerKind === filters.producerKind)
    .filter((row) => filters.productKind === undefined || row.productKind === filters.productKind)
    .filter((row) => filters.bindingName === undefined || row.bindingName === filters.bindingName)
    .filter((row) => filters.query === undefined
      || row.producerName.includes(filters.query)
      || row.instructionName?.includes(filters.query) === true
      || row.instructionTarget?.includes(filters.query) === true
      || row.bindingName?.includes(filters.query) === true)
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.producerKind.localeCompare(right.producerKind)
      || left.producerName.localeCompare(right.producerName)
      || left.productKind.localeCompare(right.productKind)
      || (left.instructionName ?? "").localeCompare(right.instructionName ?? "")
      || (left.bindingName ?? "").localeCompare(right.bindingName ?? "")
    );
}

function readFrameworkInstructionSlots(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkInstructionSlotRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const syntaxProducts = readFrameworkSyntaxProducts(sourceProject, {});
  const rows = packageIds.flatMap((packageId) => readFrameworkInstructionSlotPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, syntaxProducts));
  return rows
    .filter((row) => filters.slotName === undefined || row.slotName === filters.slotName)
    .filter((row) => filters.instructionName === undefined || row.instructionDeclarations.some((declaration) => declaration.instructionName === filters.instructionName))
    .filter((row) => filters.query === undefined
      || row.slotName.includes(filters.query)
      || row.instructionDeclarations.some((declaration) => declaration.instructionName.includes(filters.query!))
      || row.syntaxProducts.some((product) =>
        product.producerName.includes(filters.query!)
        || product.instructionName?.includes(filters.query!) === true
        || product.bindingName?.includes(filters.query!) === true))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || (left.slotValue ?? Number.MAX_SAFE_INTEGER) - (right.slotValue ?? Number.MAX_SAFE_INTEGER)
      || left.slotName.localeCompare(right.slotName)
    );
}

function readFrameworkInstructionDispatches(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkInstructionDispatchRow[] {
  const cached = instructionDispatchRowsByProject.get(sourceProject);
  const rows = cached ?? createFrameworkInstructionDispatchRows(sourceProject);
  if (cached === undefined) {
    instructionDispatchRowsByProject.set(sourceProject, rows);
  }
  return rows
    .filter((row) => filters.packageId === undefined || row.packageId === filters.packageId)
    .filter((row) => filters.slotName === undefined || row.slotName === filters.slotName)
    .filter((row) => filters.instructionName === undefined || row.instructionName === filters.instructionName)
    .filter((row) => filters.query === undefined
      || row.slotName.includes(filters.query)
      || row.rendererName.includes(filters.query)
      || row.instructionName?.includes(filters.query) === true)
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || (left.slotValue ?? Number.MAX_SAFE_INTEGER) - (right.slotValue ?? Number.MAX_SAFE_INTEGER)
      || left.slotName.localeCompare(right.slotName)
      || left.rendererName.localeCompare(right.rendererName)
    );
}

function createFrameworkInstructionDispatchRows(sourceProject: SourceProject): readonly FrameworkInstructionDispatchRow[] {
  const rows: FrameworkInstructionDispatchRow[] = [];
  for (const slot of readFrameworkInstructionSlots(sourceProject, {})) {
    for (const product of slot.syntaxProducts) {
      if (product.producerKind !== FrameworkSyntaxProducerKind.Renderer || product.productKind !== FrameworkSyntaxProductKind.HandlesInstruction) {
        continue;
      }
      rows.push({
        id: `framework-instruction-dispatch:${product.packageId}:${slot.slotName}:${product.producerName}:${product.source.start.line}:${product.source.start.character}`,
        packageId: product.packageId,
        packageName: product.packageName,
        slotName: slot.slotName,
        slotValue: slot.slotValue,
        instructionName: product.instructionName,
        rendererName: product.producerName,
        rendererProduct: product,
        instructionSlot: slot,
        source: product.source,
      });
    }
  }
  return uniqueById(rows);
}

function readFrameworkBindingProducts(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkBindingProductRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const constructionProducts = readFrameworkSyntaxProducts(sourceProject, { productKind: FrameworkSyntaxProductKind.CreatesBinding });
  const bindingAdmissions = readFrameworkBindingAdmissions(sourceProject, {});
  const rows = packageIds.flatMap((packageId) => readFrameworkBindingProductPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, constructionProducts, bindingAdmissions));
  return rows
    .filter((row) => filters.bindingName === undefined || row.bindingName === filters.bindingName)
    .filter((row) => filters.query === undefined
      || row.bindingName.includes(filters.query)
      || row.methodNames.some((methodName) => methodName.includes(filters.query!))
      || row.constructorParameters.some((parameter) => parameter.name.includes(filters.query!) || parameter.typeText?.includes(filters.query!) === true)
      || row.observerLocatorCallSites.some((callSite) => callSite.calleeName.includes(filters.query!))
      || row.constructionProducts.some((product) => product.producerName.includes(filters.query!))
      || row.admissions.some((admission) => admission.producerName.includes(filters.query!) || admission.controllerExpression.includes(filters.query!)))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.bindingName.localeCompare(right.bindingName)
    );
}

function readFrameworkBindingAdmissions(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkBindingAdmissionRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const constructionProducts = readFrameworkSyntaxProducts(sourceProject, { productKind: FrameworkSyntaxProductKind.CreatesBinding });
  const rows = packageIds.flatMap((packageId) => readFrameworkBindingAdmissionPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, constructionProducts));
  return rows
    .filter((row) => filters.bindingName === undefined || row.bindingName === filters.bindingName)
    .filter((row) => filters.constructionKind === undefined || row.constructionKind === filters.constructionKind)
    .filter((row) => filters.query === undefined
      || row.bindingName.includes(filters.query)
      || row.producerName.includes(filters.query)
      || row.controllerExpression.includes(filters.query)
      || row.constructionKind.includes(filters.query)
      || row.bindingExpression.text.includes(filters.query)
      || row.constructionProducts.some((product) => product.producerName.includes(filters.query!)))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.bindingName.localeCompare(right.bindingName)
      || left.producerName.localeCompare(right.producerName)
      || left.source.start.line - right.source.start.line
      || left.source.start.character - right.source.start.character
    );
}

function readFrameworkBindingEffects(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkBindingEffectRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const bindingProducts = readFrameworkBindingProducts(sourceProject, {});
  const rows = packageIds.flatMap((packageId) => readFrameworkBindingEffectPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId, bindingProducts));
  return rows
    .filter((row) => filters.bindingName === undefined || row.bindingName === filters.bindingName)
    .filter((row) => filters.effectKind === undefined || row.effectKind === filters.effectKind)
    .filter((row) => filters.memberName === undefined || row.methodName === filters.memberName)
    .filter((row) => filters.query === undefined
      || row.bindingName.includes(filters.query)
      || row.methodName.includes(filters.query)
      || row.effectKind.includes(filters.query)
      || row.effectName.includes(filters.query)
      || row.expression.text.includes(filters.query))
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.bindingName.localeCompare(right.bindingName)
      || left.methodName.localeCompare(right.methodName)
      || left.effectKind.localeCompare(right.effectKind)
      || left.source.start.line - right.source.start.line
      || left.source.start.character - right.source.start.character
    );
}

function readFrameworkBindingSetups(sourceProject: SourceProject, filters: FrameworkDiscoveryFilters): readonly FrameworkBindingSetupRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = packageIds.flatMap((packageId) => readFrameworkBindingSetupPackageRows(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  return rows
    .filter((row) => filters.bindingName === undefined || row.bindingName === filters.bindingName)
    .filter((row) => filters.setupKind === undefined || row.setupKind === filters.setupKind)
    .filter((row) => filters.query === undefined
      || row.bindingName.includes(filters.query)
      || row.producerName.includes(filters.query)
      || row.setupKind.includes(filters.query)
      || row.setupMethodName.includes(filters.query)
      || row.receiverExpression.includes(filters.query)
      || row.bindingExpression.text.includes(filters.query)
      || row.setupArgument?.text.includes(filters.query) === true)
    .sort((left, right) =>
      left.packageId.localeCompare(right.packageId)
      || left.bindingName.localeCompare(right.bindingName)
      || left.setupKind.localeCompare(right.setupKind)
      || left.producerName.localeCompare(right.producerName)
      || left.source.start.line - right.source.start.line
      || left.source.start.character - right.source.start.character
    );
}

function readFrameworkBindingProductPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
  bindingAdmissions: readonly FrameworkBindingAdmissionRow[],
): readonly FrameworkBindingProductRow[] {
  const cache = bindingProductRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkBindingProductRow[]>();
  if (!bindingProductRowsByPackageByProject.has(sourceProject)) {
    bindingProductRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const dependencyPackageIds = frameworkEntityCatalogDependencyPackageIds(sourceProject, packageId);
  const diskCached = readFrameworkEntityCatalogCache<FrameworkBindingProductRow>(sourceProject, "binding-products", packageId, dependencyPackageIds);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const bindingNames = new Set(constructionProducts
    .map((product) => product.bindingName)
    .filter((bindingName): bindingName is string => bindingName !== null));
  for (const bindingName of bindingAdmissions.map((admission) => admission.bindingName)) {
    bindingNames.add(bindingName);
  }
  const rows = sourceProject.ownedSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile && sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => bindingProductsForSourceFile(sourceProject, sourceFile, packageId, packageName, bindingNames, constructionProducts, bindingAdmissions));
  const unique = uniqueById(rows);
  cache.set(packageId, unique);
  writeFrameworkEntityCatalogCache(sourceProject, "binding-products", packageId, unique, dependencyPackageIds);
  return unique;
}

function readFrameworkBindingAdmissionPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
): readonly FrameworkBindingAdmissionRow[] {
  const cache = bindingAdmissionRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkBindingAdmissionRow[]>();
  if (!bindingAdmissionRowsByPackageByProject.has(sourceProject)) {
    bindingAdmissionRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const dependencyPackageIds = frameworkEntityCatalogDependencyPackageIds(sourceProject, packageId);
  const diskCached = readFrameworkEntityCatalogCache<FrameworkBindingAdmissionRow>(sourceProject, "binding-admissions", packageId, dependencyPackageIds);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = sourceProject.ownedSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile && sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => bindingAdmissionsForSourceFile(sourceProject, sourceFile, packageId, packageName, constructionProducts));
  const unique = uniqueById(rows);
  cache.set(packageId, unique);
  writeFrameworkEntityCatalogCache(sourceProject, "binding-admissions", packageId, unique, dependencyPackageIds);
  return unique;
}

function readFrameworkBindingEffectPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  bindingProducts: readonly FrameworkBindingProductRow[],
): readonly FrameworkBindingEffectRow[] {
  const cache = bindingEffectRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkBindingEffectRow[]>();
  if (!bindingEffectRowsByPackageByProject.has(sourceProject)) {
    bindingEffectRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const bindingNames = new Set(bindingProducts
    .filter((row) => row.packageId === packageId)
    .map((row) => row.bindingName));
  const rows = sourceProject.ownedSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile && sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => bindingEffectsForSourceFile(sourceProject, sourceFile, packageId, packageName, bindingNames));
  const unique = uniqueById(rows);
  cache.set(packageId, unique);
  return unique;
}

function readFrameworkBindingSetupPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkBindingSetupRow[] {
  const cache = bindingSetupRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkBindingSetupRow[]>();
  if (!bindingSetupRowsByPackageByProject.has(sourceProject)) {
    bindingSetupRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const rows = sourceProject.ownedSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile && sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => bindingSetupsForSourceFile(sourceProject, sourceFile, packageId, packageName));
  const unique = uniqueById(rows);
  cache.set(packageId, unique);
  return unique;
}

function bindingProductsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  bindingNames: ReadonlySet<string>,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
  bindingAdmissions: readonly FrameworkBindingAdmissionRow[],
): readonly FrameworkBindingProductRow[] {
  const rows: FrameworkBindingProductRow[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined && bindingNames.has(node.name.text)) {
      rows.push(bindingProductRow(sourceProject, sourceFile, packageId, packageName, node as ts.ClassDeclaration & { readonly name: ts.Identifier }, constructionProducts, bindingAdmissions));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function bindingEffectsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  bindingNames: ReadonlySet<string>,
): readonly FrameworkBindingEffectRow[] {
  const rows: FrameworkBindingEffectRow[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined && bindingNames.has(node.name.text)) {
      rows.push(...bindingEffectsForClass(sourceProject, sourceFile, packageId, packageName, node as ts.ClassDeclaration & { readonly name: ts.Identifier }));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function bindingSetupsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
): readonly FrameworkBindingSetupRow[] {
  const rows: FrameworkBindingSetupRow[] = [];
  const visit = (node: ts.Node, producerName: string): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      for (const member of node.members) {
        visit(member, node.name.text);
      }
      return;
    }
    if (ts.isClassExpression(node)) {
      const nextProducerName = node.name?.text ?? producerName;
      for (const member of node.members) {
        visit(member, nextProducerName);
      }
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body !== undefined) {
      const methodName = propertyNameText(node.name);
      visit(node.body, methodName === null ? producerName : `${producerName}.${methodName}`);
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
      visit(node.body, node.name?.text ?? producerName);
      return;
    }
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const nextProducerName = functionExpressionProducerName(node) ?? producerName;
      visit(node.body, nextProducerName);
      return;
    }
    if (ts.isCallExpression(node)) {
      const row = bindingSetupRow(sourceProject, sourceFile, packageId, packageName, producerName, node);
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, producerName));
  };

  visit(sourceFile, sourceFileProducerName(sourceFile));
  return rows;
}

function bindingEffectsForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.ClassDeclaration & { readonly name: ts.Identifier },
): readonly FrameworkBindingEffectRow[] {
  const rows: FrameworkBindingEffectRow[] = [];
  for (const member of declaration.members) {
    if (!ts.isMethodDeclaration(member) || member.body === undefined) {
      continue;
    }
    const methodName = propertyNameText(member.name);
    if (methodName === null) {
      continue;
    }
    if (isBindingLifecycleMethodName(methodName) && ts.isIdentifier(member.name)) {
      rows.push(bindingEffectRow(sourceProject, sourceFile, packageId, packageName, declaration.name.text, methodName, FrameworkBindingEffectKind.LifecycleMethod, methodName, member.name));
    }
    for (const call of callExpressionsIn(member.body)) {
      const effectKind = bindingEffectKindForCall(call);
      if (effectKind === null) {
        continue;
      }
      const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
      if (callSite === null) {
        continue;
      }
      rows.push(bindingEffectRow(sourceProject, sourceFile, packageId, packageName, declaration.name.text, methodName, effectKind, callSite.calleeName, call, callSite));
    }
  }
  return rows;
}

function bindingSetupRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  producerName: string,
  call: ts.CallExpression,
): FrameworkBindingSetupRow | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const setupKind = bindingSetupKindForMethod(expression.name.text);
  if (setupKind === null) {
    return null;
  }
  const receiver = unwrapExpression(expression.expression);
  const bindingName = bindingNameFromSetupReceiver(sourceProject, receiver);
  if (bindingName === null) {
    return null;
  }
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const firstArgument = call.arguments[0];
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, call);
  return {
    id: `framework-binding-setup:${packageId}:${bindingName}:${setupKind}:${span.start}`,
    packageId,
    packageName,
    producerName,
    bindingName,
    setupKind,
    setupMethodName: expression.name.text,
    receiverExpression: receiver.getText(sourceFile),
    bindingExpression: readTypeScriptExpressionFact(sourceProject, sourceFile, receiver),
    ...(firstArgument === undefined || ts.isSpreadElement(firstArgument) ? {} : { setupArgument: readTypeScriptExpressionFact(sourceProject, sourceFile, unwrapExpression(firstArgument)) }),
    callSite,
    source: sourceRangeFromFileSpan(file.repoPath, span),
  };
}

function bindingSetupKindForMethod(methodName: string): FrameworkBindingSetupKind | null {
  if (methodName === "useTargetObserver") {
    return FrameworkBindingSetupKind.TargetObserver;
  }
  if (methodName === "useAccessor") {
    return FrameworkBindingSetupKind.Accessor;
  }
  if (methodName === "useTargetSubscriber") {
    return FrameworkBindingSetupKind.TargetSubscriber;
  }
  return null;
}

function bindingNameFromSetupReceiver(sourceProject: SourceProject, receiver: ts.Expression): string | null {
  const directName = bindingNameFromBindingExpression(sourceProject, receiver);
  if (directName !== null) {
    return directName;
  }
  if (ts.isIdentifier(receiver)) {
    const initializer = localVariableInitializerForIdentifier(receiver);
    return initializer === null ? null : bindingNameFromBindingExpression(sourceProject, initializer);
  }
  return null;
}

function bindingEffectRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  bindingName: string,
  methodName: string,
  effectKind: FrameworkBindingEffectKind,
  effectName: string,
  expression: ts.Expression,
  callSite?: TypeScriptCallSiteEntry,
): FrameworkBindingEffectRow {
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, expression);
  return {
    id: `framework-binding-effect:${packageId}:${bindingName}:${methodName}:${effectKind}:${span.start}`,
    packageId,
    packageName,
    bindingName,
    methodName,
    effectKind,
    effectName,
    expression: readTypeScriptExpressionFact(sourceProject, sourceFile, expression),
    ...(callSite === undefined ? {} : { callSite }),
    source: sourceRangeFromFileSpan(file.repoPath, span),
  };
}

function bindingEffectKindForCall(call: ts.CallExpression): FrameworkBindingEffectKind | null {
  if (isObserverLocatorUseCall(call)) {
    return FrameworkBindingEffectKind.ObserverLookup;
  }
  const calleeName = propertyAccessCalleeName(call);
  if (calleeName === null) {
    return null;
  }
  if (calleeName === "addEventListener" || calleeName === "removeEventListener") {
    return FrameworkBindingEffectKind.EventListener;
  }
  if (calleeName === "subscribe" || calleeName === "unsubscribe") {
    return FrameworkBindingEffectKind.Subscription;
  }
  return null;
}

function bindingProductRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.ClassDeclaration & { readonly name: ts.Identifier },
  constructionProducts: readonly FrameworkSyntaxProductRow[],
  bindingAdmissions: readonly FrameworkBindingAdmissionRow[],
): FrameworkBindingProductRow {
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, declaration);
  const bindingName = declaration.name.text;
  const constructorParameters = bindingConstructorParameters(declaration);
  const methodNames = bindingMethodNames(declaration);
  return {
    id: `framework-binding-product:${packageId}:${bindingName}:${span.start}`,
    packageId,
    packageName,
    bindingName,
    declarationKind: SourceDeclarationKind.Class,
    source: sourceRangeFromFileSpan(file.repoPath, span),
    constructionProducts: constructionProducts.filter((product) => product.bindingName === bindingName),
    admissions: bindingAdmissions.filter((admission) => admission.bindingName === bindingName),
    constructorParameters,
    methodNames,
    lifecycleMethods: methodNames.filter(isBindingLifecycleMethodName),
    observerLocatorParameters: constructorParameters.filter(isObserverLocatorParameter),
    observerLocatorCallSites: observerLocatorCallSitesForBindingClass(sourceProject, sourceFile, declaration),
    targetObserverMethods: methodNames.filter((methodName) => ["useTargetObserver", "useAccessor", "useTargetSubscriber"].includes(methodName)),
  };
}

function bindingAdmissionsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
): readonly FrameworkBindingAdmissionRow[] {
  const rows: FrameworkBindingAdmissionRow[] = [];
  const visit = (node: ts.Node, producerName: string): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      for (const member of node.members) {
        visit(member, node.name.text);
      }
      return;
    }
    if (ts.isClassExpression(node)) {
      const nextProducerName = node.name?.text ?? producerName;
      for (const member of node.members) {
        visit(member, nextProducerName);
      }
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body !== undefined) {
      const methodName = propertyNameText(node.name);
      visit(node.body, methodName === null ? producerName : `${producerName}.${methodName}`);
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
      visit(node.body, node.name?.text ?? producerName);
      return;
    }
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const nextProducerName = functionExpressionProducerName(node) ?? producerName;
      if (ts.isBlock(node.body)) {
        visit(node.body, nextProducerName);
      } else {
        visit(node.body, nextProducerName);
      }
      return;
    }
    if (ts.isCallExpression(node) && isAddBindingCall(node)) {
      const row = bindingAdmissionRow(sourceProject, sourceFile, packageId, packageName, producerName, node, constructionProducts);
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, producerName));
  };

  visit(sourceFile, sourceFileProducerName(sourceFile));
  return rows;
}

function bindingAdmissionRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  producerName: string,
  call: ts.CallExpression,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
): FrameworkBindingAdmissionRow | null {
  const firstArgument = call.arguments[0];
  if (firstArgument === undefined || ts.isSpreadElement(firstArgument)) {
    return null;
  }
  const admission = bindingAdmissionExpressionForArgument(sourceProject, firstArgument);
  if (admission === null) {
    return null;
  }
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, call);
  const controllerExpression = addBindingControllerExpression(sourceFile, call) ?? "unknown";
  return {
    id: `framework-binding-admission:${packageId}:${admission.bindingName}:${span.start}`,
    packageId,
    packageName,
    producerName,
    controllerExpression,
    bindingName: admission.bindingName,
    constructionKind: admission.constructionKind,
    admissionCall: callSite,
    bindingExpression: readTypeScriptExpressionFact(sourceProject, admission.expression.getSourceFile(), unwrapExpression(admission.expression)),
    source: sourceRangeFromFileSpan(file.repoPath, span),
    constructionProducts: constructionProducts.filter((product) => product.bindingName === admission.bindingName),
  };
}

function isAddBindingCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression) && expression.name.text === "addBinding";
}

function addBindingControllerExpression(sourceFile: ts.SourceFile, call: ts.CallExpression): string | null {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression) ? expression.expression.getText(sourceFile) : null;
}

function bindingAdmissionExpressionForArgument(
  sourceProject: SourceProject,
  argument: ts.Expression,
): BindingAdmissionExpression | null {
  const current = unwrapExpression(argument);
  if (ts.isNewExpression(current)) {
    const bindingName = bindingNameFromCreationExpression(current);
    return bindingName === null ? null : {
      bindingName,
      constructionKind: FrameworkBindingConstructionKind.InlineNew,
      expression: current,
    };
  }
  if (ts.isCallExpression(current)) {
    const bindingName = bindingNameFromCreationExpression(current);
    return bindingName === null ? null : {
      bindingName,
      constructionKind: FrameworkBindingConstructionKind.InlineFactoryCall,
      expression: current,
    };
  }
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const localInitializer = localVariableInitializerForIdentifier(current);
  if (localInitializer !== null) {
    const bindingName = bindingNameFromBindingExpression(sourceProject, localInitializer);
    if (bindingName !== null) {
      return {
        bindingName,
        constructionKind: FrameworkBindingConstructionKind.LocalVariable,
        expression: localInitializer,
      };
    }
  }
  const collectionSource = collectionFactoryExpressionForCallbackParameter(sourceProject, current);
  if (collectionSource !== null) {
    return {
      bindingName: collectionSource.bindingName,
      constructionKind: FrameworkBindingConstructionKind.FactoryCollectionElement,
      expression: collectionSource.expression,
    };
  }
  return null;
}

function bindingNameFromBindingExpression(sourceProject: SourceProject, expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isNewExpression(current) || ts.isCallExpression(current)) {
    const bindingName = bindingNameFromCreationExpression(current);
    if (bindingName !== null) {
      return bindingName;
    }
  }
  return bindingNameFromType(sourceProject, current);
}

function bindingNameFromType(sourceProject: SourceProject, node: ts.Node): string | null {
  const type = sourceProject.checker.getTypeAtLocation(node);
  const symbolName = type.aliasSymbol?.getName() ?? type.symbol?.getName() ?? null;
  if (isBindingProductName(symbolName)) {
    return symbolName;
  }
  return bindingNameFromTypeText(sourceProject.checker.typeToString(type, node));
}

function bindingNameFromTypeText(text: string): string | null {
  const match = /\b([A-Z][$_0-9A-Za-z]*Binding)\b/u.exec(text);
  const name = match?.[1] ?? null;
  return isBindingProductName(name) ? name : null;
}

function localVariableInitializerForIdentifier(identifier: ts.Identifier): ts.Expression | null {
  const identifierPosition = identifier.getStart(identifier.getSourceFile());
  let scope: ts.Node | undefined = containingExecutionScope(identifier);
  while (scope !== undefined) {
    const initializer = variableInitializerInScope(scope, identifier.text, identifierPosition);
    if (initializer !== null) {
      return initializer;
    }
    scope = containingExecutionScope(scope);
  }
  return null;
}

function variableInitializerInScope(scope: ts.Node, name: string, beforePosition: number): ts.Expression | null {
  let match: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (match !== null) {
      return;
    }
    if (node !== scope && isNestedExecutionBoundary(node)) {
      return;
    }
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === name
      && node.initializer !== undefined
      && node.getStart(node.getSourceFile()) < beforePosition
    ) {
      match = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return match;
}

function containingExecutionScope(node: ts.Node): ts.Node | undefined {
  let current = node.parent;
  while (current !== undefined) {
    if (
      ts.isSourceFile(current)
      || ts.isFunctionDeclaration(current)
      || ts.isFunctionExpression(current)
      || ts.isArrowFunction(current)
      || ts.isMethodDeclaration(current)
      || ts.isConstructorDeclaration(current)
      || ts.isGetAccessorDeclaration(current)
      || ts.isSetAccessorDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function collectionFactoryExpressionForCallbackParameter(
  sourceProject: SourceProject,
  identifier: ts.Identifier,
): { readonly bindingName: string; readonly expression: ts.Expression } | null {
  const callback = containingCallbackParameterScope(identifier);
  if (callback === null) {
    return null;
  }
  let current: ts.Node | undefined = callback.parent;
  while (current !== undefined) {
    if (ts.isCallExpression(current) && current.arguments.some((argument) => argument === callback)) {
      const expression = unwrapExpression(current.expression);
      if (ts.isPropertyAccessExpression(expression) && expression.name.text === "forEach") {
        const collectionExpression = unwrapExpression(expression.expression);
        const bindingName = bindingNameFromBindingExpression(sourceProject, collectionExpression);
        return bindingName === null ? null : {
          bindingName,
          expression: collectionExpression,
        };
      }
    }
    if (isNestedExecutionBoundary(current) && current !== callback) {
      return null;
    }
    current = current.parent;
  }
  return null;
}

function containingCallbackParameterScope(identifier: ts.Identifier): ts.FunctionExpression | ts.ArrowFunction | null {
  let current: ts.Node | undefined = identifier.parent;
  while (current !== undefined) {
    if ((ts.isFunctionExpression(current) || ts.isArrowFunction(current)) && current.parameters.some((parameter) =>
      ts.isIdentifier(parameter.name) && parameter.name.text === identifier.text
    )) {
      return current;
    }
    if (isNestedExecutionBoundary(current)) {
      return null;
    }
    current = current.parent;
  }
  return null;
}

function bindingConstructorParameters(declaration: ts.ClassDeclaration): readonly FrameworkBindingConstructorParameterRow[] {
  const constructorDeclaration = declaration.members.find((member): member is ts.ConstructorDeclaration => ts.isConstructorDeclaration(member));
  return constructorDeclaration?.parameters.map((parameter) => ({
    name: parameter.name.getText(parameter.getSourceFile()),
    typeText: parameter.type?.getText(parameter.getSourceFile()) ?? null,
  })) ?? [];
}

function bindingMethodNames(declaration: ts.ClassDeclaration): readonly string[] {
  return declaration.members
    .filter((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member))
    .map((member) => propertyNameText(member.name))
    .filter((methodName): methodName is string => methodName !== null);
}

function isBindingLifecycleMethodName(methodName: string): boolean {
  return [
    "bind",
    "unbind",
    "attach",
    "detach",
    "handleChange",
    "handleCollectionChange",
    "handleEvent",
    "handleStateChange",
    "handleLocaleChange",
    "updateTarget",
    "updateSource",
    "callSource",
  ].includes(methodName);
}

function isObserverLocatorParameter(parameter: FrameworkBindingConstructorParameterRow): boolean {
  return parameter.name.toLowerCase().includes("observerlocator")
    || parameter.name === "oL"
    || parameter.typeText?.includes("IObserverLocator") === true;
}

function observerLocatorCallSitesForBindingClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.ClassDeclaration,
): readonly TypeScriptCallSiteEntry[] {
  return callExpressionsIn(declaration)
    .filter(isObserverLocatorUseCall)
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter((callSite): callSite is TypeScriptCallSiteEntry => callSite !== null);
}

function isObserverLocatorUseCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && ["getObserver", "getAccessor", "getArrayObserver", "getMapObserver", "getSetObserver"].includes(expression.name.text);
}

function propertyAccessCalleeName(call: ts.CallExpression): string | null {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression) ? expression.name.text : null;
}

function readFrameworkInstructionSlotPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  syntaxProducts: readonly FrameworkSyntaxProductRow[],
): readonly FrameworkInstructionSlotRow[] {
  const cache = instructionSlotRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkInstructionSlotRow[]>();
  if (!instructionSlotRowsByPackageByProject.has(sourceProject)) {
    instructionSlotRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const dependencyPackageIds = frameworkEntityCatalogDependencyPackageIds(sourceProject, packageId);
  const diskCached = readFrameworkEntityCatalogCache<FrameworkInstructionSlotRow>(sourceProject, "instruction-slots", packageId, dependencyPackageIds);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const sourceFiles = sourceProject.ownedSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile && sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId);
  const declarationsBySlot = instructionDeclarationsBySlot(sourceProject, sourceFiles);
  const rows = sourceFiles
    .flatMap((sourceFile) => instructionSlotVariablesIn(sourceFile)
      .map((declaration) => instructionSlotRow(sourceProject, sourceFile, packageId, packageName, declaration, declarationsBySlot, syntaxProducts))
      .filter((row): row is FrameworkInstructionSlotRow => row !== null));
  const unique = uniqueById(rows);
  cache.set(packageId, unique);
  writeFrameworkEntityCatalogCache(sourceProject, "instruction-slots", packageId, unique, dependencyPackageIds);
  return unique;
}

function instructionSlotVariablesIn(sourceFile: ts.SourceFile): readonly (ts.VariableDeclaration & { readonly name: ts.Identifier; readonly initializer: ts.Expression })[] {
  const declarations: (ts.VariableDeclaration & { readonly name: ts.Identifier; readonly initializer: ts.Expression })[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined && isInstructionSlotName(declaration.name.text)) {
        declarations.push(declaration as ts.VariableDeclaration & { readonly name: ts.Identifier; readonly initializer: ts.Expression });
      }
    }
  }
  return declarations;
}

function instructionDeclarationsBySlot(
  sourceProject: SourceProject,
  sourceFiles: readonly ts.SourceFile[],
): ReadonlyMap<string, readonly FrameworkInstructionDeclarationRow[]> {
  const bySlot = new Map<string, FrameworkInstructionDeclarationRow[]>();
  for (const sourceFile of sourceFiles) {
    const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
    for (const statement of sourceFile.statements) {
      const declaration = instructionDeclarationForStatement(sourceFile, file, statement);
      if (declaration === null) {
        continue;
      }
      const rows = bySlot.get(declaration.slotName) ?? [];
      rows.push(declaration.row);
      bySlot.set(declaration.slotName, rows);
    }
  }
  return bySlot;
}

function instructionDeclarationForStatement(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  statement: ts.Statement,
): { readonly slotName: string; readonly row: FrameworkInstructionDeclarationRow } | null {
  if (ts.isInterfaceDeclaration(statement)) {
    const typeProperty = statement.members.find((member): member is ts.PropertySignature => ts.isPropertySignature(member) && propertyNameText(member.name) === "type");
    const slotName = typeProperty?.type === undefined ? null : instructionSlotNameFromTypeNode(typeProperty.type);
    return slotName === null || typeProperty === undefined ? null : {
      slotName,
      row: instructionDeclarationRow(sourceFile, file, statement.name.text, SourceDeclarationKind.Interface, statement, typeProperty),
    };
  }
  if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
    const typeProperty = statement.members.find((member): member is ts.PropertyDeclaration => ts.isPropertyDeclaration(member) && propertyNameText(member.name) === "type");
    const slotName = typeProperty === undefined ? null : instructionSlotNameFromPropertyDeclaration(typeProperty);
    return slotName === null || typeProperty === undefined ? null : {
      slotName,
      row: instructionDeclarationRow(sourceFile, file, statement.name.text, SourceDeclarationKind.Class, statement, typeProperty),
    };
  }
  if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
    const typeProperty = statement.type.members.find((member): member is ts.PropertySignature => ts.isPropertySignature(member) && propertyNameText(member.name) === "type");
    const slotName = typeProperty?.type === undefined ? null : instructionSlotNameFromTypeNode(typeProperty.type);
    return slotName === null || typeProperty === undefined ? null : {
      slotName,
      row: instructionDeclarationRow(sourceFile, file, statement.name.text, SourceDeclarationKind.TypeAlias, statement, typeProperty),
    };
  }
  return null;
}

function instructionDeclarationRow(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  instructionName: string,
  declarationKind: SourceDeclarationKind,
  declaration: ts.Node,
  typeProperty: ts.Node,
): FrameworkInstructionDeclarationRow {
  return {
    instructionName,
    declarationKind,
    source: sourceRangeFromFileSpan(file.repoPath, sourceSpan(sourceFile, declaration)),
    typePropertySource: sourceRangeFromFileSpan(file.repoPath, sourceSpan(sourceFile, typeProperty)),
  };
}

function instructionSlotNameFromPropertyDeclaration(property: ts.PropertyDeclaration): string | null {
  if (property.initializer !== undefined) {
    const slotName = instructionSlotNameFromExpression(property.initializer);
    if (slotName !== null) {
      return slotName;
    }
  }
  return property.type === undefined ? null : instructionSlotNameFromTypeNode(property.type);
}

function instructionSlotNameFromTypeNode(type: ts.TypeNode): string | null {
  if (ts.isTypeQueryNode(type)) {
    const name = entityNameTail(type.exprName);
    return isInstructionSlotName(name) ? name : null;
  }
  return null;
}

function instructionSlotNameFromExpression(expression: ts.Expression): string | null {
  const name = calleeTail(expression);
  return isInstructionSlotName(name) ? name : null;
}

function instructionSlotRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.VariableDeclaration & { readonly name: ts.Identifier; readonly initializer: ts.Expression },
  declarationsBySlot: ReadonlyMap<string, readonly FrameworkInstructionDeclarationRow[]>,
  syntaxProducts: readonly FrameworkSyntaxProductRow[],
): FrameworkInstructionSlotRow | null {
  const slotValue = readStaticNumberExpression(sourceProject, declaration.initializer);
  if (slotValue === null) {
    return null;
  }
  const slotName = declaration.name.text;
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const declarations = declarationsBySlot.get(slotName) ?? [];
  const declarationNames = new Set(declarations.map((entry) => entry.instructionName));
  const products = syntaxProducts.filter((product) =>
    instructionSlotNameFromText(product.instructionTarget) === slotName
    || (product.instructionName !== null && declarationNames.has(product.instructionName))
  );
  const span = sourceSpan(sourceFile, declaration);
  return {
    id: `framework-instruction-slot:${packageId}:${slotName}:${span.start}`,
    packageId,
    packageName,
    slotName,
    slotValue,
    valueExpression: readTypeScriptExpressionFact(sourceProject, sourceFile, declaration.initializer),
    source: sourceRangeFromFileSpan(file.repoPath, span),
    instructionDeclarations: declarations,
    syntaxProducts: products,
  };
}

function readStaticNumberExpression(sourceProject: SourceProject, expression: ts.Expression): number | null {
  const current = unwrapExpression(expression);
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(current.operand)) {
    return -Number(current.operand.text);
  }
  const constant = sourceProject.checker.getConstantValue(current as ts.EnumMember | ts.PropertyAccessExpression | ts.ElementAccessExpression);
  if (typeof constant === "number") {
    return constant;
  }
  const type = sourceProject.checker.getTypeAtLocation(current);
  return (type.flags & ts.TypeFlags.NumberLiteral) !== 0 ? (type as ts.NumberLiteralType).value : null;
}

function instructionSlotNameFromText(text: string | null): string | null {
  if (text === null) {
    return null;
  }
  const match = /\b(it[$_0-9A-Za-z]+)\b/u.exec(text);
  const name = match?.[1] ?? null;
  return isInstructionSlotName(name) ? name : null;
}

function isInstructionSlotName(name: string | null): name is string {
  return name !== null && /^it[A-Z]/u.test(name);
}

function readFrameworkSyntaxProductPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkSyntaxProductRow[] {
  const cache = syntaxProductRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkSyntaxProductRow[]>();
  if (!syntaxProductRowsByPackageByProject.has(sourceProject)) {
    syntaxProductRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkEntityCatalogCache<FrameworkSyntaxProductRow>(sourceProject, "syntax-products", packageId);
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const resourceCarriers = readFrameworkResourcePackageCarrierRows(sourceProject, packageId, packageName);
  const rows = sourceProject.ownedSourceFiles()
    .filter((sourceFile) => sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId)
    .flatMap((sourceFile) => [
      ...syntaxProductsForBindingCommandClasses(sourceProject, sourceFile, packageId, packageName, resourceCarriers),
      ...syntaxProductsForRendererVariables(sourceProject, sourceFile, packageId, packageName, resourceCarriers),
      ...syntaxProductsForInstructionFactories(sourceProject, sourceFile, packageId, packageName, resourceCarriers),
    ]);
  const unique = uniqueById(rows);
  cache.set(packageId, unique);
  writeFrameworkEntityCatalogCache(sourceProject, "syntax-products", packageId, unique);
  return unique;
}

function syntaxProductsForBindingCommandClasses(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
): readonly FrameworkSyntaxProductRow[] {
  return sourceFile.statements
    .filter((statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement) && statement.name !== undefined)
    .flatMap((declaration) => {
      const producerName = declaration.name?.text;
      const buildMethod = declaration.members.find((member): member is ts.MethodDeclaration =>
        ts.isMethodDeclaration(member)
        && propertyNameText(member.name) === "build"
        && member.body !== undefined
      );
      if (producerName === undefined || buildMethod?.body === undefined) {
        return [];
      }
      const products = instructionProductExpressionsForBuildMethod(sourceProject, sourceFile, buildMethod);
      if (products.length === 0) {
        return [];
      }
      const resourceCarrier = resourceCarrierForProducer(resourceCarriers, producerName, FrameworkResourceDefinitionKind.BindingCommand);
      return products.map((product) => syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
        producerName,
        producerKind: FrameworkSyntaxProducerKind.BindingCommand,
        productKind: FrameworkSyntaxProductKind.BuildsInstruction,
        resourceCarrier,
        instructionName: product.instructionName,
        instructionTarget: product.instructionTarget,
        bindingName: null,
        expression: product.expression,
      }));
    });
}

function syntaxProductsForRendererVariables(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
): readonly FrameworkSyntaxProductRow[] {
  return exportedVariableDeclarations(sourceFile)
    .filter((declaration): declaration is ts.VariableDeclaration & { readonly name: ts.Identifier } => ts.isIdentifier(declaration.name) && declaration.initializer !== undefined)
    .flatMap((declaration) => {
      const producerName = declaration.name.text;
      const rendererCall = callExpressionsIn(declaration.initializer!).find((call) => isRendererHelperCall(call));
      const rendererClass = rendererCall === undefined ? null : rendererClassExpression(rendererCall);
      if (rendererCall === undefined || rendererClass === null) {
        return [];
      }
      const resourceCarrier = resourceCarrierForProducer(resourceCarriers, producerName, FrameworkResourceDefinitionKind.Renderer);
      const renderMethod = rendererClass.members.find((member): member is ts.MethodDeclaration =>
        ts.isMethodDeclaration(member)
        && propertyNameText(member.name) === "render"
        && member.body !== undefined
      );
      const targetExpression = rendererTargetExpression(rendererClass);
      const instructionName = renderMethod === undefined ? null : instructionNameFromRenderMethod(sourceProject, renderMethod);
      const rows: FrameworkSyntaxProductRow[] = [];
      if (targetExpression !== null || instructionName !== null) {
        rows.push(syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
          producerName,
          producerKind: FrameworkSyntaxProducerKind.Renderer,
          productKind: FrameworkSyntaxProductKind.HandlesInstruction,
          resourceCarrier,
          instructionName,
          instructionTarget: targetExpression === null ? null : targetExpression.getText(sourceFile),
          bindingName: null,
          expression: targetExpression ?? rendererCall,
        }));
      }
      if (renderMethod?.body !== undefined) {
        for (const expression of bindingCreationExpressionsIn(renderMethod.body)) {
          rows.push(syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
            producerName,
            producerKind: FrameworkSyntaxProducerKind.Renderer,
            productKind: FrameworkSyntaxProductKind.CreatesBinding,
            resourceCarrier,
            instructionName,
            instructionTarget: targetExpression === null ? null : targetExpression.getText(sourceFile),
            bindingName: bindingNameFromCreationExpression(expression),
            expression,
          }));
        }
      }
      return rows;
    });
}

function syntaxProductsForInstructionFactories(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
): readonly FrameworkSyntaxProductRow[] {
  if (sourceFile.isDeclarationFile) {
    return [];
  }
  const rows: FrameworkSyntaxProductRow[] = [];
  const bindingCommandClassNames = new Set(resourceCarriers
    .filter((carrier) => carrier.resourceKind === FrameworkResourceDefinitionKind.BindingCommand)
    .flatMap((carrier) => [carrier.sourceExportName, carrier.targetName])
    .filter((name): name is string => name !== null));

  const visit = (node: ts.Node, producerName: string): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      if (bindingCommandClassNames.has(node.name.text)) {
        return;
      }
      for (const member of node.members) {
        visit(member, node.name.text);
      }
      return;
    }
    if (ts.isClassExpression(node)) {
      const nextProducerName = node.name?.text ?? producerName;
      for (const member of node.members) {
        visit(member, nextProducerName);
      }
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body !== undefined) {
      const methodName = propertyNameText(node.name);
      visit(node.body, methodName === null ? producerName : `${producerName}.${methodName}`);
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
      visit(node.body, node.name?.text ?? producerName);
      return;
    }
    if ((ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && ts.isBlock(node.body)) {
      visit(node.body, functionExpressionProducerName(node) ?? producerName);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      const instructionTarget = instructionTargetFromReturnedExpression(sourceFile, node);
      if (instructionSlotNameFromText(instructionTarget) !== null) {
        rows.push(syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
          producerName,
          producerKind: FrameworkSyntaxProducerKind.InstructionFactory,
          productKind: FrameworkSyntaxProductKind.EmitsInstruction,
          instructionName: instructionNameFromExpressionContext(sourceProject, node),
          instructionTarget,
          bindingName: null,
          expression: node,
        }));
      }
    }
    ts.forEachChild(node, (child) => visit(child, producerName));
  };

  visit(sourceFile, sourceFileProducerName(sourceFile));
  return rows;
}

function functionExpressionProducerName(node: ts.FunctionExpression | ts.ArrowFunction): string | null {
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    return propertyNameText(parent.name);
  }
  return null;
}

function sourceFileProducerName(sourceFile: ts.SourceFile): string {
  return sourceFile.fileName.replace(/\\/gu, "/").replace(/^.*\//u, "").replace(/\.tsx?$/u, "");
}

function instructionNameFromExpressionContext(sourceProject: SourceProject, expression: ts.Expression): string | null {
  let current: ts.Node = expression;
  while (current.parent !== undefined) {
    const parent = current.parent;
    if (ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isTypeAssertionExpression(parent)) {
      const name = instructionNameFromTypeNode(parent.type, sourceProject);
      if (name !== null) {
        return name;
      }
    }
    if (ts.isReturnStatement(parent)) {
      const containing = containingFunctionWithReturnType(parent);
      if (containing?.type !== undefined) {
        const name = instructionNameFromTypeNode(containing.type, sourceProject);
        if (name !== null) {
          return name;
        }
      }
    }
    if (ts.isVariableDeclaration(parent) && parent.initializer === current && parent.type !== undefined) {
      const name = instructionNameFromTypeNode(parent.type, sourceProject);
      if (name !== null) {
        return name;
      }
    }
    current = parent;
  }
  return null;
}

function containingFunctionWithReturnType(node: ts.Node): (ts.FunctionLikeDeclarationBase & { readonly type?: ts.TypeNode }) | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (
      ts.isFunctionDeclaration(current)
      || ts.isFunctionExpression(current)
      || ts.isMethodDeclaration(current)
      || ts.isArrowFunction(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function syntaxProductRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  values: {
    readonly producerName: string;
    readonly producerKind: FrameworkSyntaxProducerKind;
    readonly productKind: FrameworkSyntaxProductKind;
    readonly resourceCarrier?: FrameworkResourceCarrierRow;
    readonly instructionName: string | null;
    readonly instructionTarget: string | null;
    readonly bindingName: string | null;
    readonly expression: ts.Expression;
  },
): FrameworkSyntaxProductRow {
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, values.expression);
  return {
    id: `framework-syntax-product:${packageId}:${values.producerName}:${values.productKind}:${span.start}:${values.instructionName ?? values.bindingName ?? values.instructionTarget ?? "product"}`,
    packageId,
    packageName,
    producerName: values.producerName,
    producerKind: values.producerKind,
    productKind: values.productKind,
    ...(values.resourceCarrier === undefined ? {} : { resourceCarrier: values.resourceCarrier }),
    instructionName: values.instructionName,
    instructionTarget: values.instructionTarget,
    bindingName: values.bindingName,
    expression: readTypeScriptExpressionFact(sourceProject, sourceFile, values.expression),
    source: sourceRangeFromFileSpan(file.repoPath, span),
  };
}

function instructionProductExpressionsForBuildMethod(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  buildMethod: ts.MethodDeclaration,
): readonly InstructionProductExpression[] {
  const body = buildMethod.body;
  if (body === undefined) {
    return [];
  }
  const products: InstructionProductExpression[] = [];
  for (const expression of newExpressionsIn(body)) {
    const instructionName = instructionNameFromNewExpression(expression);
    if (instructionName !== null) {
      products.push({
        instructionName,
        instructionTarget: null,
        expression,
      });
    }
  }
  for (const expression of returnExpressions(body)) {
    const instructionName = instructionNameFromReturnedExpression(sourceProject, buildMethod, expression);
    const instructionTarget = instructionTargetFromReturnedExpression(sourceFile, expression);
    if (instructionName !== null || instructionTarget !== null) {
      products.push({
        instructionName,
        instructionTarget,
        expression,
      });
    }
  }
  return uniqueInstructionProducts(products);
}

function uniqueInstructionProducts(products: readonly InstructionProductExpression[]): readonly InstructionProductExpression[] {
  const byKey = new Map<string, InstructionProductExpression>();
  for (const product of products) {
    const span = sourceSpan(product.expression.getSourceFile(), product.expression);
    byKey.set(`${span.start}:${span.end}:${product.instructionName ?? ""}:${product.instructionTarget ?? ""}`, product);
  }
  return [...byKey.values()];
}

function instructionNameFromReturnedExpression(
  sourceProject: SourceProject,
  buildMethod: ts.MethodDeclaration,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isNewExpression(current)) {
    return instructionNameFromNewExpression(current);
  }
  const annotatedName = buildMethod.type === undefined ? null : instructionNameFromTypeNode(buildMethod.type, sourceProject);
  if (annotatedName !== null) {
    return annotatedName;
  }
  return instructionNameFromType(sourceProject, current);
}

function instructionNameFromNewExpression(expression: ts.NewExpression): string | null {
  const name = calleeTail(expression.expression);
  return isConcreteInstructionName(name) ? name : null;
}

function instructionNameFromType(sourceProject: SourceProject, node: ts.Node): string | null {
  const type = sourceProject.checker.getTypeAtLocation(node);
  const symbolName = type.aliasSymbol?.getName() ?? type.symbol?.getName() ?? null;
  if (isConcreteInstructionName(symbolName)) {
    return symbolName;
  }
  return instructionNameFromTypeText(sourceProject.checker.typeToString(type, node));
}

function instructionNameFromTypeNode(type: ts.TypeNode, sourceProject?: SourceProject): string | null {
  if (ts.isTypeReferenceNode(type)) {
    const name = entityNameTail(type.typeName);
    if (isConcreteInstructionName(name)) {
      return name;
    }
    if (sourceProject !== undefined && isNamedInstructionSubtype(sourceProject, name, sourceProject.checker.getTypeFromTypeNode(type))) {
      return name;
    }
  }
  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    for (const candidate of type.types) {
      const name = instructionNameFromTypeNode(candidate, sourceProject);
      if (name !== null) {
        return name;
      }
    }
  }
  return instructionNameFromTypeText(type.getText(type.getSourceFile()));
}

function entityNameTail(name: ts.EntityName): string {
  return ts.isIdentifier(name) ? name.text : name.right.text;
}

function instructionNameFromTypeText(text: string): string | null {
  const match = /\b([A-Z][$_0-9A-Za-z]*Instruction)\b/u.exec(text);
  const name = match?.[1] ?? null;
  return isConcreteInstructionName(name) ? name : null;
}

function isConcreteInstructionName(name: string | null): name is string {
  return name !== null && name !== "IInstruction" && /Instruction$/u.test(name);
}

function isNamedInstructionSubtype(sourceProject: SourceProject, name: string, type: ts.Type): boolean {
  return name !== "IInstruction" && instructionTypeExtendsIInstruction(sourceProject, type);
}

function instructionTypeExtendsIInstruction(sourceProject: SourceProject, type: ts.Type, seen = new Set<ts.Type>()): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  const symbolName = type.aliasSymbol?.getName() ?? type.symbol?.getName() ?? null;
  if (symbolName === "IInstruction") {
    return true;
  }
  const baseTypes = (type as ts.InterfaceType).getBaseTypes?.() ?? [];
  if (baseTypes.some((baseType) => instructionTypeExtendsIInstruction(sourceProject, baseType, seen))) {
    return true;
  }
  const declarations = (type.aliasSymbol ?? type.symbol)?.getDeclarations() ?? [];
  return declarations.some((declaration) =>
    ts.isInterfaceDeclaration(declaration)
    && declaration.heritageClauses?.some((clause) =>
      clause.types.some((heritageType) => heritageExpressionTail(heritageType.expression) === "IInstruction"
        || instructionTypeExtendsIInstruction(sourceProject, sourceProject.checker.getTypeAtLocation(heritageType.expression), seen))
    ) === true
  );
}

function heritageExpressionTail(expression: ts.ExpressionWithTypeArguments["expression"]): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function instructionTargetFromReturnedExpression(sourceFile: ts.SourceFile, expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return null;
  }
  const property = objectProperty(current, "type");
  if (property === null || !ts.isPropertyAssignment(property)) {
    return null;
  }
  return unwrapExpression(property.initializer).getText(sourceFile);
}

function resourceCarrierForProducer(
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
  producerName: string,
  resourceKind: FrameworkResourceDefinitionKind,
): FrameworkResourceCarrierRow | undefined {
  return resourceCarriers.find((row) =>
    row.resourceKind === resourceKind
    && (
      row.sourceExportName === producerName
      || row.targetName === producerName
      || row.carrierEntry.exportName === producerName
      || row.carrierEntry.resolvedName === producerName
    )
  );
}

function rendererClassExpression(call: ts.CallExpression): ts.ClassExpression | null {
  const first = call.arguments[0];
  if (first === undefined || ts.isSpreadElement(first)) {
    return null;
  }
  const current = unwrapExpression(first);
  return ts.isClassExpression(current) ? current : null;
}

function rendererTargetExpression(declaration: ts.ClassExpression): ts.Expression | null {
  for (const member of declaration.members) {
    if (!ts.isPropertyDeclaration(member) || propertyNameText(member.name) !== "target" || member.initializer === undefined) {
      continue;
    }
    return unwrapExpression(member.initializer);
  }
  return null;
}

function instructionNameFromRenderMethod(sourceProject: SourceProject, method: ts.MethodDeclaration): string | null {
  const namedInstruction = method.parameters.find((parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === "instruction");
  const instructionParameter = namedInstruction ?? method.parameters[2];
  return instructionParameter?.type === undefined ? null : instructionNameFromTypeNode(instructionParameter.type, sourceProject);
}

function bindingCreationExpressionsIn(node: ts.Node): readonly BindingCreationExpression[] {
  const expressions: BindingCreationExpression[] = [];
  const visit = (current: ts.Node): void => {
    if (current !== node && isNestedExecutionBoundary(current)) {
      return;
    }
    if ((ts.isNewExpression(current) || ts.isCallExpression(current)) && bindingNameFromCreationExpression(current) !== null) {
      expressions.push(current);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return expressions;
}

function bindingNameFromCreationExpression(expression: BindingCreationExpression): string | null {
  if (ts.isNewExpression(expression)) {
    const name = calleeTail(expression.expression);
    return isBindingProductName(name) ? name : null;
  }
  const callee = unwrapExpression(expression.expression);
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === "create") {
    const receiverName = calleeTail(callee.expression);
    return isBindingProductName(receiverName) ? receiverName : null;
  }
  return null;
}

function isBindingProductName(name: string | null): name is string {
  return name !== null && name !== "Binding" && /Binding$/u.test(name);
}

function newExpressionsIn(node: ts.Node): readonly ts.NewExpression[] {
  const expressions: ts.NewExpression[] = [];
  const visit = (current: ts.Node): void => {
    if (current !== node && isNestedExecutionBoundary(current)) {
      return;
    }
    if (ts.isNewExpression(current)) {
      expressions.push(current);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return expressions;
}

function isNestedExecutionBoundary(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isClassLike(node);
}

function readFrameworkBundlePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkBundleExportRow[] {
  const cache = bundleRowsByPackageByProject.get(sourceProject) ?? new Map<string, readonly FrameworkBundleExportRow[]>();
  if (!bundleRowsByPackageByProject.has(sourceProject)) {
    bundleRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkBundlePackageRows(sourceProject, packageId, packageName);
  cache.set(packageId, rows);
  return rows;
}

function readFrameworkBundleExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkBundleExportRow[] {
  const packageCache = bundleRowsByPackageByProject.get(sourceProject)?.get(packageId);
  if (packageCache !== undefined) {
    return packageCache.filter((row) => row.exportEntry.exportName === exportName);
  }
  const cache = bundleRowsByExportByProject.get(sourceProject) ?? new Map<string, readonly FrameworkBundleExportRow[]>();
  if (!bundleRowsByExportByProject.has(sourceProject)) {
    bundleRowsByExportByProject.set(sourceProject, cache);
  }
  const key = `${packageId}:${exportName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkBundlePackageRows(sourceProject, packageId, packageName, exportName);
  cache.set(key, rows);
  return rows;
}

function scanFrameworkBundlePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
  exportName?: string,
): readonly FrameworkBundleExportRow[] {
  return readFrameworkRegistryExports(sourceProject, { packageId, ...(exportName === undefined ? {} : { exportName }) })
    .map((row) => bundleRowForRegistryExport(sourceProject, row))
    .sort((left, right) => left.exportEntry.exportName.localeCompare(right.exportEntry.exportName));
}

function bundleRowForRegistryExport(sourceProject: SourceProject, row: FrameworkRegistryExportRow): FrameworkBundleExportRow {
  const startedAt = performance.now();
  const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
  if (source === null) {
    return {
      ...row,
      effectCount: 0,
      associations: [],
      openSeamCount: 0,
    };
  }
  const classification = readFrameworkBundleClassificationContext(sourceProject);
  const afterClassification = performance.now();
  const effectTrace = readEvaluationEffectTrace(sourceProject, sourceSelectorForRange(source), {
    limit: 1_000,
    offset: 0,
    memberName: "register",
    maxDepth: 200,
  });
  const afterTrace = performance.now();
  const associations = effectTrace.effects.flatMap((effect) => associationsForBundleEffect(sourceProject, classification, row, effect));
  const afterAssociations = performance.now();
  profileFrameworkBundles({
    event: "atlas.framework.bundles.row.profile",
    packageId: row.packageId,
    exportName: row.exportEntry.exportName,
    classificationMs: Math.round(afterClassification - startedAt),
    effectTraceMs: Math.round(afterTrace - afterClassification),
    associationMs: Math.round(afterAssociations - afterTrace),
    totalMs: Math.round(afterAssociations - startedAt),
    effects: effectTrace.totalEffects,
    associations: associations.length,
    openSeams: effectTrace.openSeams.length,
    metrics: {
      expressions: classification.metrics.expressions,
      expressionFactMs: Math.round(classification.metrics.expressionFactMs),
      arrayBindingMs: Math.round(classification.metrics.arrayBindingMs),
      resourceMs: Math.round(classification.metrics.resourceMs),
      diMs: Math.round(classification.metrics.diMs),
      registryMs: Math.round(classification.metrics.registryMs),
    },
  });
  return {
    ...row,
    effectCount: effectTrace.totalEffects,
    associations,
    openSeamCount: effectTrace.openSeams.length,
  };
}

function associationsForBundleEffect(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
): readonly FrameworkBundleAssociationRow[] {
  if (effect.memberName === "registerFactory") {
    return associationsForRegisterFactoryEffect(sourceProject, classification, row, effect);
  }
  if (effect.memberName !== "register") {
    return [];
  }
  const sourceFile = sourceProject.readSourceFile(effect.callSite.file.repoPath) ?? sourceProject.readSourceFile(effect.callSite.file.absolutePath);
  if (sourceFile === null) {
    return effect.arguments.map((argument) => associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.UnknownRegistrationArgument, {
      targetName: visibleExpressionNameText(argument.expression.text),
      expression: argument.expression,
      sourceFile: null,
    }));
  }
  return effect.arguments.flatMap((argument) => {
    const expression = expressionForFact(sourceFile, argument.expression);
    return expression === null
      ? [associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.UnknownRegistrationArgument, {
        targetName: visibleExpressionNameText(argument.expression.text),
        expression: argument.expression,
        sourceFile,
      })]
      : associationsForRegistrationExpression(sourceProject, classification, row, effect, argument, sourceFile, expression, {
        path: [`arg${argument.index}`],
        catalogName: null,
        helperName: null,
      });
  });
}

function associationsForRegisterFactoryEffect(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
): readonly FrameworkBundleAssociationRow[] {
  const keyArgument = effect.arguments[0];
  if (keyArgument === undefined) {
    return [];
  }
  const sourceFile = sourceProject.readSourceFile(effect.callSite.file.repoPath) ?? sourceProject.readSourceFile(effect.callSite.file.absolutePath);
  if (sourceFile === null) {
    return [associationRow(sourceProject, row, effect, keyArgument, FrameworkBundleAssociationKind.FactoryRegistration, {
      targetName: visibleExpressionNameText(keyArgument.expression.text),
      expression: keyArgument.expression,
      sourceFile: null,
      helperName: "registerFactory",
    })];
  }
  const expression = expressionForFact(sourceFile, keyArgument.expression);
  if (expression === null) {
    return [associationRow(sourceProject, row, effect, keyArgument, FrameworkBundleAssociationKind.FactoryRegistration, {
      targetName: visibleExpressionNameText(keyArgument.expression.text),
      expression: keyArgument.expression,
      sourceFile,
      helperName: "registerFactory",
    })];
  }
  const diStartedAt = performance.now();
  const diInterface = diInterfacesForExpression(sourceProject, classification, sourceFile, expression)[0];
  classification.metrics.diMs += performance.now() - diStartedAt;
  return [associationRow(sourceProject, row, effect, keyArgument, FrameworkBundleAssociationKind.FactoryRegistration, {
    targetName: diInterface?.exportEntry.exportName ?? visibleExpressionName(expression),
    expression: readTypeScriptExpressionFact(sourceProject, sourceFile, unwrapExpression(expression)),
    sourceFile,
    path: [`arg${keyArgument.index}`],
    catalogName: null,
    helperName: "registerFactory",
    ...(diInterface === undefined ? {} : { diInterface }),
  })];
}

function associationsForRegistrationExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
  argument: EvaluationInvocationArgumentEffect,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  context: {
    readonly path: readonly string[];
    readonly catalogName: string | null;
    readonly helperName: string | null;
  },
): readonly FrameworkBundleAssociationRow[] {
  const current = unwrapExpression(expression);
  classification.metrics.expressions += 1;
  const expressionFactStartedAt = performance.now();
  const expressionFact = readTypeScriptExpressionFact(sourceProject, sourceFile, current);
  classification.metrics.expressionFactMs += performance.now() - expressionFactStartedAt;
  const declarations = declarationsForExpressionSymbolCached(sourceProject, classification, current);
  const helperName = registrationHelperName(current);
  if (helperName !== null && ts.isCallExpression(current)) {
    const keyExpression = current.arguments[0] === undefined || ts.isSpreadElement(current.arguments[0])
      ? null
      : unwrapExpression(current.arguments[0]);
    const diStartedAt = performance.now();
    const diInterface = keyExpression === null ? undefined : diInterfacesForExpression(sourceProject, classification, sourceFile, keyExpression)[0];
    classification.metrics.diMs += performance.now() - diStartedAt;
    return [associationRow(sourceProject, row, effect, argument, diInterface === undefined ? FrameworkBundleAssociationKind.RegistrationHelper : FrameworkBundleAssociationKind.DiInterfaceRegistration, {
      targetName: keyExpression === null ? visibleExpressionName(current) : visibleExpressionName(keyExpression),
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName,
      ...(diInterface === undefined ? {} : { diInterface }),
    })];
  }
  const appTaskName = appTaskHelperName(current);
  if (appTaskName !== null && ts.isCallExpression(current)) {
    const keyExpression = appTaskKeyExpression(current);
    const diStartedAt = performance.now();
    const diInterface = keyExpression === null ? undefined : diInterfacesForExpression(sourceProject, classification, sourceFile, keyExpression)[0];
    classification.metrics.diMs += performance.now() - diStartedAt;
    return [associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.AppTaskRegistration, {
      targetName: diInterface?.exportEntry.exportName ?? (keyExpression === null ? appTaskName : visibleExpressionName(keyExpression)),
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName: appTaskName,
      ...(diInterface === undefined ? {} : { diInterface }),
    })];
  }

  const inlineResourceKind = ts.isCallExpression(current) ? resourceKindFromDefinitionCall(current) : null;
  if (inlineResourceKind !== null && ts.isCallExpression(current)) {
    return [associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.ResourceRegistration, {
      targetName: targetNameFromResourceDefinitionCall(sourceProject, current) ?? visibleExpressionName(current),
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName: context.helperName,
    })];
  }

  const registryExportFromCall = registryExportForMemberCallReceiver(sourceProject, classification, sourceFile, current, row);
  if (registryExportFromCall !== undefined) {
    return [associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.RegistryExportRegistration, {
      targetName: registryExportFromCall.exportEntry.exportName,
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName: context.helperName,
      registryExport: registryExportFromCall,
    })];
  }

  const arrayStartedAt = performance.now();
  const arrayBinding = arrayLiteralForExpression(sourceProject, sourceFile, current, declarations);
  classification.metrics.arrayBindingMs += performance.now() - arrayStartedAt;
  if (arrayBinding !== null) {
    const catalogName = arrayBinding.name ?? visibleExpressionName(current);
    const catalogRow = associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.RegistrationCatalog, {
      targetName: catalogName,
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName,
      helperName: context.helperName,
    });
    const elementRows = arrayBinding.expression.elements.flatMap((element, index) => {
      if (ts.isOmittedExpression(element)) {
        return [];
      }
      const elementExpression = ts.isSpreadElement(element) ? element.expression : element;
      const elementPath = [...context.path, `${catalogName ?? "array"}[${index}]${ts.isSpreadElement(element) ? ":spread" : ""}`];
      return associationsForRegistrationExpression(sourceProject, classification, row, effect, {
        ...argument,
        spread: argument.spread || ts.isSpreadElement(element),
        expression: readTypeScriptExpressionFact(sourceProject, arrayBinding.sourceFile, unwrapExpression(elementExpression)),
      }, arrayBinding.sourceFile, elementExpression, {
        path: elementPath,
        catalogName,
        helperName: context.helperName,
      });
    });
    return [catalogRow, ...elementRows];
  }

  const inlineRegistryRows = associationsForInlineRegistryExpression(sourceProject, classification, row, effect, argument, sourceFile, current, context);
  if (inlineRegistryRows.length > 0) {
    return inlineRegistryRows;
  }

  const resourceStartedAt = performance.now();
  const resourceCarriers = resourceCarriersForExpression(sourceProject, classification, sourceFile, current, declarations);
  classification.metrics.resourceMs += performance.now() - resourceStartedAt;
  if (resourceCarriers.length > 0) {
    return resourceCarriers.map((resourceCarrier) => associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.ResourceRegistration, {
      targetName: resourceCarrier.targetName ?? resourceCarrier.sourceExportName,
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName: context.helperName,
      resourceCarrier,
    }));
  }

  const diStartedAt = performance.now();
  const diInterface = diInterfacesForExpression(sourceProject, classification, sourceFile, current, declarations)[0];
  classification.metrics.diMs += performance.now() - diStartedAt;
  if (diInterface !== undefined) {
    return [associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.DiInterfaceRegistration, {
      targetName: diInterface.exportEntry.exportName,
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName: context.helperName,
      diInterface,
    })];
  }

  const registryStartedAt = performance.now();
  const registryExport = registryExportsForExpression(sourceProject, classification, sourceFile, current, declarations)
    .find((candidate) => candidate.id !== row.id);
  classification.metrics.registryMs += performance.now() - registryStartedAt;
  if (registryExport !== undefined) {
    return [associationRow(sourceProject, row, effect, argument, FrameworkBundleAssociationKind.RegistryExportRegistration, {
      targetName: registryExport.exportEntry.exportName,
      expression: expressionFact,
      sourceFile,
      path: context.path,
      catalogName: context.catalogName,
      helperName: context.helperName,
      registryExport,
    })];
  }

  const aliasExpression = variableInitializerForExpression(current, declarations);
  if (aliasExpression !== null) {
    return associationsForRegistrationExpression(sourceProject, classification, row, effect, {
      ...argument,
      expression: readTypeScriptExpressionFact(sourceProject, aliasExpression.getSourceFile(), unwrapExpression(aliasExpression)),
    }, aliasExpression.getSourceFile(), aliasExpression, {
      path: [...context.path, `${visibleExpressionName(current) ?? "alias"}:initializer`],
      catalogName: context.catalogName,
      helperName: context.helperName,
    });
  }

  if (ts.isConditionalExpression(current)) {
    return [
      ...associationsForRegistrationExpression(sourceProject, classification, row, effect, {
        ...argument,
        expression: readTypeScriptExpressionFact(sourceProject, sourceFile, unwrapExpression(current.whenTrue)),
      }, sourceFile, current.whenTrue, {
        path: [...context.path, "conditional:true"],
        catalogName: context.catalogName,
        helperName: context.helperName,
      }),
      ...associationsForRegistrationExpression(sourceProject, classification, row, effect, {
        ...argument,
        expression: readTypeScriptExpressionFact(sourceProject, sourceFile, unwrapExpression(current.whenFalse)),
      }, sourceFile, current.whenFalse, {
        path: [...context.path, "conditional:false"],
        catalogName: context.catalogName,
        helperName: context.helperName,
      }),
    ];
  }

  const targetName = visibleExpressionName(current);
  return [associationRow(sourceProject, row, effect, argument, targetName === null ? FrameworkBundleAssociationKind.UnknownRegistrationArgument : FrameworkBundleAssociationKind.RegistrationArgument, {
    targetName,
    expression: expressionFact,
    sourceFile,
    path: context.path,
    catalogName: context.catalogName,
    helperName: context.helperName,
  })];
}

function associationsForInlineRegistryExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  outerEffect: EvaluationInvocationEffect,
  outerArgument: EvaluationInvocationArgumentEffect,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  context: {
    readonly path: readonly string[];
    readonly catalogName: string | null;
    readonly helperName: string | null;
  },
): readonly FrameworkBundleAssociationRow[] {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return [];
  }
  const factory = localFunctionDeclarationForCall(sourceProject, sourceFile, current);
  if (factory?.body === undefined) {
    return [];
  }
  const factoryName = factory.name?.text ?? visibleExpressionName(current) ?? "factory";
  const rows: FrameworkBundleAssociationRow[] = [];
  for (const [returnIndex, returned] of returnExpressions(factory.body).entries()) {
    const registerCalls = registerCallsForReturnedRegistry(returned);
    for (const [callIndex, registerCall] of registerCalls.entries()) {
      const nestedEffect = syntheticEffectForRegisterCall(sourceProject, outerEffect, sourceFile, registerCall, `${factoryName}:${returnIndex}:${callIndex}`);
      if (nestedEffect === null) {
        continue;
      }
      if (nestedEffect.memberName === "registerFactory") {
        rows.push(...associationsForRegisterFactoryEffect(sourceProject, classification, row, nestedEffect));
        continue;
      }
      for (const nestedArgument of nestedEffect.arguments) {
        const nestedExpression = expressionForFact(sourceFile, nestedArgument.expression);
        if (nestedExpression === null) {
          rows.push(associationRow(sourceProject, row, nestedEffect, nestedArgument, FrameworkBundleAssociationKind.UnknownRegistrationArgument, {
            targetName: visibleExpressionNameText(nestedArgument.expression.text),
            expression: nestedArgument.expression,
            sourceFile,
            path: [...context.path, `${factoryName}.register`, `arg${nestedArgument.index}`],
            catalogName: context.catalogName,
            helperName: context.helperName,
          }));
          continue;
        }
        rows.push(...associationsForRegistrationExpression(sourceProject, classification, row, nestedEffect, {
          ...nestedArgument,
          spread: outerArgument.spread || nestedArgument.spread,
        }, sourceFile, nestedExpression, {
          path: [...context.path, `${factoryName}.register`, `arg${nestedArgument.index}`],
          catalogName: context.catalogName,
          helperName: context.helperName,
        }));
      }
    }
  }
  if (rows.length === 0) {
    return [];
  }
  const catalogName = visibleExpressionName(current) ?? factoryName;
  return [
    associationRow(sourceProject, row, outerEffect, outerArgument, FrameworkBundleAssociationKind.RegistrationCatalog, {
      targetName: catalogName,
      expression: readTypeScriptExpressionFact(sourceProject, sourceFile, current),
      sourceFile,
      path: context.path,
      catalogName,
      helperName: context.helperName,
    }),
    ...rows,
  ];
}

function syntheticEffectForRegisterCall(
  sourceProject: SourceProject,
  outerEffect: EvaluationInvocationEffect,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  key: string,
): EvaluationInvocationEffect | null {
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const callee = unwrapExpression(call.expression);
  const receiverExpression = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)
    ? callee.expression
    : null;
  const receiver = receiverExpression === null
    ? null
    : readTypeScriptExpressionFact(sourceProject, sourceFile, receiverExpression);
  const memberName = ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : ts.isElementAccessExpression(callee)
      ? callee.argumentExpression?.getText(sourceFile) ?? null
      : null;
  return {
    id: `${outerEffect.id}:inline-registry:${key}:${callSite.span.start}`,
    sequence: outerEffect.sequence,
    root: outerEffect.root,
    certainty: outerEffect.certainty,
    controlPath: [...outerEffect.controlPath, `inline-registry:${key}`],
    callSite,
    memberName,
    receiver,
    receiverBinding: null,
    arguments: callSite.arguments.map((argument) => ({
      ...argument,
      binding: null,
    })),
  };
}

function registerCallsForReturnedRegistry(expression: ts.Expression): readonly ts.CallExpression[] {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return [];
  }
  return current.properties.flatMap((property) => {
    if (ts.isSpreadAssignment(property)) {
      return [];
    }
    const name = propertyNameText(property.name);
    if (name !== "register") {
      return [];
    }
    let body: ts.ConciseBody | undefined;
    if (ts.isMethodDeclaration(property)) {
      body = property.body;
    } else if (ts.isPropertyAssignment(property)) {
      const initializer = unwrapExpression(property.initializer);
      body = isFunctionExpressionLike(initializer) ? initializer.body : undefined;
    }
    return body === undefined ? [] : callExpressionsIn(body).filter((call) => {
      const callee = unwrapExpression(call.expression);
      return ts.isPropertyAccessExpression(callee)
        && (callee.name.text === "register" || callee.name.text === "registerFactory");
    });
  });
}

function associationRow(
  sourceProject: SourceProject,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
  argument: EvaluationInvocationArgumentEffect,
  associationKind: FrameworkBundleAssociationKind,
  values: {
    readonly targetName: string | null;
    readonly expression: TypeScriptExpressionFact;
    readonly sourceFile: ts.SourceFile | null;
    readonly path?: readonly string[];
    readonly catalogName?: string | null;
    readonly helperName?: string | null;
    readonly diInterface?: FrameworkDiInterfaceExportRow;
    readonly resourceCarrier?: FrameworkResourceCarrierRow;
    readonly registryExport?: FrameworkRegistryExportRow;
  },
): FrameworkBundleAssociationRow {
  const source = sourceRangeFromFileSpan(
    values.sourceFile === null
      ? effect.callSite.file.repoPath
      : (sourceProject.sourceFileIdentity(values.sourceFile) ?? externalFileIdentity(sourceProject, values.sourceFile)).repoPath,
    values.expression.span,
  );
  return {
    id: `framework-bundle-association:${row.packageId}:${row.exportEntry.exportName}:${effect.sequence}:${argument.index}:${(values.path ?? [`arg${argument.index}`]).join("/")}:${associationKind}:${values.targetName ?? values.expression.span.start}`,
    packageId: row.packageId,
    packageName: row.packageName,
    exportName: row.exportEntry.exportName,
    associationKind,
    effectId: effect.id,
    effectSequence: effect.sequence,
    certainty: effect.certainty,
    argumentIndex: argument.index,
    spread: argument.spread,
    path: values.path ?? [`arg${argument.index}`],
    catalogName: values.catalogName ?? null,
    helperName: values.helperName ?? null,
    targetName: values.targetName,
    expression: values.expression,
    source,
    ...(values.diInterface === undefined ? {} : { diInterface: values.diInterface }),
    ...(values.resourceCarrier === undefined ? {} : { resourceCarrier: values.resourceCarrier }),
    ...(values.registryExport === undefined ? {} : { registryExport: values.registryExport }),
  };
}

function arrayLiteralForExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbol(sourceProject, expression),
): { readonly name: string | null; readonly sourceFile: ts.SourceFile; readonly expression: ts.ArrayLiteralExpression } | null {
  const current = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(current)) {
    return { name: null, sourceFile, expression: current };
  }
  const declaration = declarations
    .find((candidate): candidate is ts.VariableDeclaration => ts.isVariableDeclaration(candidate)
      && candidate.initializer !== undefined
      && ts.isArrayLiteralExpression(unwrapExpression(candidate.initializer)));
  if (declaration === undefined || declaration.initializer === undefined) {
    return null;
  }
  return {
    name: ts.isIdentifier(declaration.name) ? declaration.name.text : null,
    sourceFile: declaration.getSourceFile(),
    expression: unwrapExpression(declaration.initializer) as ts.ArrayLiteralExpression,
  };
}

function readFrameworkBundleClassificationContext(sourceProject: SourceProject): FrameworkBundleClassificationContext {
  const cached = bundleClassificationContextByProject.get(sourceProject);
  if (cached !== undefined) {
    return cached;
  }
  const context = createFrameworkBundleClassificationContext(sourceProject);
  bundleClassificationContextByProject.set(sourceProject, context);
  return context;
}

function createFrameworkBundleClassificationContext(sourceProject: SourceProject): FrameworkBundleClassificationContext {
  const startedAt = performance.now();
  const packageNames = readFrameworkPackageNames(sourceProject);
  const afterPackages = performance.now();
  const context = {
    packageNames,
    metrics: {
      expressions: 0,
      expressionFactMs: 0,
      arrayBindingMs: 0,
      resourceMs: 0,
      diMs: 0,
      registryMs: 0,
    },
    declarationsByExpression: new WeakMap<ts.Expression, readonly ts.Declaration[]>(),
    indexedResourcePackageIds: new Set<string>(),
    resourceCarriersByDeclaration: new Map<string, FrameworkResourceCarrierRow[]>(),
    resourceCarriersByName: new Map<string, FrameworkResourceCarrierRow[]>(),
    resourceCarriersByPackageAndName: new Map<string, FrameworkResourceCarrierRow[]>(),
    indexedDiPackageIds: new Set<string>(),
    diInterfacesByDeclaration: new Map<string, FrameworkDiInterfaceExportRow[]>(),
    diInterfacesByName: new Map<string, FrameworkDiInterfaceExportRow[]>(),
    diInterfacesByPackageAndName: new Map<string, FrameworkDiInterfaceExportRow[]>(),
    indexedRegistryPackageIds: new Set<string>(),
    registryExportsByDeclaration: new Map<string, FrameworkRegistryExportRow[]>(),
    registryExportsByName: new Map<string, FrameworkRegistryExportRow[]>(),
    registryExportsByPackageAndName: new Map<string, FrameworkRegistryExportRow[]>(),
  };
  profileFrameworkBundles({
    event: "atlas.framework.bundles.classification.profile",
    packageMs: Math.round(afterPackages - startedAt),
    totalMs: Math.round(afterPackages - startedAt),
    packages: packageNames.size,
  });
  return context;
}

function ensureResourcePackageIndexed(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  packageId: string | undefined,
): void {
  if (packageId === undefined || classification.indexedResourcePackageIds.has(packageId)) {
    return;
  }
  const startedAt = performance.now();
  const packageName = classification.packageNames.get(packageId);
  if (packageName === undefined) {
    classification.indexedResourcePackageIds.add(packageId);
    return;
  }
  const rows = readFrameworkResourcePackageCarrierRows(sourceProject, packageId, packageName);
  for (const row of rows) {
    indexResourceCarrierRow(classification, row);
  }
  classification.indexedResourcePackageIds.add(packageId);
  profileFrameworkBundles({
    event: "atlas.framework.bundles.package-index.profile",
    family: "resource-carriers",
    packageId,
    ms: Math.round(performance.now() - startedAt),
    rows: rows.length,
  });
}

function ensureDiPackageIndexed(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  packageId: string | undefined,
): void {
  if (packageId === undefined || classification.indexedDiPackageIds.has(packageId)) {
    return;
  }
  const startedAt = performance.now();
  const packageName = classification.packageNames.get(packageId);
  if (packageName === undefined) {
    classification.indexedDiPackageIds.add(packageId);
    return;
  }
  const rows = readFrameworkDiInterfacePackageRows(sourceProject, packageId, packageName);
  for (const row of rows) {
    indexDiInterfaceRow(classification, row);
  }
  classification.indexedDiPackageIds.add(packageId);
  profileFrameworkBundles({
    event: "atlas.framework.bundles.package-index.profile",
    family: "di-interfaces",
    packageId,
    ms: Math.round(performance.now() - startedAt),
    rows: rows.length,
  });
}

function ensureRegistryPackageIndexed(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  packageId: string | undefined,
): void {
  if (packageId === undefined || classification.indexedRegistryPackageIds.has(packageId)) {
    return;
  }
  const startedAt = performance.now();
  const packageName = classification.packageNames.get(packageId);
  if (packageName === undefined) {
    classification.indexedRegistryPackageIds.add(packageId);
    return;
  }
  const rows = readFrameworkRegistryPackageRows(sourceProject, packageId, packageName, "register");
  for (const row of rows) {
    indexRegistryExportRow(classification, row);
  }
  classification.indexedRegistryPackageIds.add(packageId);
  profileFrameworkBundles({
    event: "atlas.framework.bundles.package-index.profile",
    family: "registry-exports",
    packageId,
    ms: Math.round(performance.now() - startedAt),
    rows: rows.length,
  });
}

function indexResourceCarrierRow(
  classification: FrameworkBundleClassificationContext,
  row: FrameworkResourceCarrierRow,
): void {
  for (const target of row.carrierEntry.targets) {
    addIndexedRow(classification.resourceCarriersByDeclaration, targetDeclarationKey(target), row);
  }
  addIndexedRow(classification.resourceCarriersByName, row.sourceExportName, row);
  addIndexedRow(classification.resourceCarriersByPackageAndName, packageNameKey(row.packageId, row.sourceExportName), row);
  addIndexedRow(classification.resourceCarriersByName, row.targetName, row);
  addIndexedRow(classification.resourceCarriersByPackageAndName, packageNameKey(row.packageId, row.targetName), row);
}

function indexDiInterfaceRow(
  classification: FrameworkBundleClassificationContext,
  row: FrameworkDiInterfaceExportRow,
): void {
  for (const target of row.exportEntry.targets) {
    addIndexedRow(classification.diInterfacesByDeclaration, targetDeclarationKey(target), row);
  }
  addIndexedRow(classification.diInterfacesByName, row.exportEntry.exportName, row);
  addIndexedRow(classification.diInterfacesByPackageAndName, packageNameKey(row.packageId, row.exportEntry.exportName), row);
  addIndexedRow(classification.diInterfacesByName, row.interfaceKey, row);
  addIndexedRow(classification.diInterfacesByPackageAndName, packageNameKey(row.packageId, row.interfaceKey), row);
}

function indexRegistryExportRow(
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
): void {
  for (const target of row.exportEntry.targets) {
    addIndexedRow(classification.registryExportsByDeclaration, targetDeclarationKey(target), row);
  }
  addIndexedRow(classification.registryExportsByName, row.exportEntry.exportName, row);
  addIndexedRow(classification.registryExportsByPackageAndName, packageNameKey(row.packageId, row.exportEntry.exportName), row);
  addIndexedRow(classification.registryExportsByName, row.exportEntry.resolvedName, row);
  addIndexedRow(classification.registryExportsByPackageAndName, packageNameKey(row.packageId, row.exportEntry.resolvedName), row);
}

function indexRowsByTargets<TRow>(
  rows: readonly TRow[],
  targetsForRow: (row: TRow) => readonly SourceTargetRow[],
): ReadonlyMap<string, readonly TRow[]> {
  const index = new Map<string, TRow[]>();
  for (const row of rows) {
    for (const target of targetsForRow(row)) {
      addIndexedRow(index, targetDeclarationKey(target), row);
    }
  }
  return index;
}

function addIndexedRow<TRow>(index: Map<string, TRow[]>, key: string | null | undefined, row: TRow): void {
  if (key === null || key === undefined) {
    return;
  }
  const rows = index.get(key);
  if (rows === undefined) {
    index.set(key, [row]);
    return;
  }
  rows.push(row);
}

function packageNameKey(packageId: string, name: string | null | undefined): string | null {
  return name === null || name === undefined ? null : `${packageId}:${name}`;
}

function rowsForExpressionDeclarations<TRow extends { readonly id: string }>(
  sourceProject: SourceProject,
  index: ReadonlyMap<string, readonly TRow[]>,
  expression: ts.Expression,
): readonly TRow[] {
  return rowsForDeclarations(index, declarationsForExpressionSymbol(sourceProject, expression));
}

function declarationsForExpressionSymbolCached(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  expression: ts.Expression,
): readonly ts.Declaration[] {
  const current = unwrapExpression(expression);
  const cached = classification.declarationsByExpression.get(current);
  if (cached !== undefined) {
    return cached;
  }
  const declarations = declarationsForExpressionSymbol(sourceProject, current);
  classification.declarationsByExpression.set(current, declarations);
  return declarations;
}

function rowsForDeclarations<TRow extends { readonly id: string }>(
  index: ReadonlyMap<string, readonly TRow[]>,
  declarations: readonly ts.Declaration[],
): readonly TRow[] {
  return uniqueById(declarations.flatMap((declaration) => {
    const key = declarationKey(declaration);
    return key === null ? [] : index.get(key) ?? [];
  }));
}

function resourceCarriersForDeclarations(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly FrameworkResourceCarrierRow[] {
  const direct = uniqueById(declarations.flatMap((declaration) => {
    const key = declarationKey(declaration);
    const cached = key === null ? undefined : classification.resourceCarriersByDeclaration.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const packageId = sourceProject.packageForFileName(declaration.getSourceFile().fileName)?.id;
    const packageName = packageId === undefined ? undefined : classification.packageNames.get(packageId);
    let rows: readonly FrameworkResourceCarrierRow[] = [];
    if (packageId === undefined || packageName === undefined) {
      rows = [];
    } else if (ts.isClassDeclaration(declaration) && declaration.name !== undefined) {
      rows = resourceCarriersForClass(sourceProject, declaration.getSourceFile(), declaration, packageId, packageName);
    } else if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
      rows = resourceCarriersForVariable(sourceProject, declaration.getSourceFile(), declaration as ts.VariableDeclaration & { readonly name: ts.Identifier }, packageId, packageName);
    }
    if (key !== null) {
      classification.resourceCarriersByDeclaration.set(key, [...rows]);
    }
    return rows;
  }));
  if (direct.length > 0) {
    return direct;
  }
  return uniqueById(namedPackageDeclarationKeys(sourceProject, classification, declarations).flatMap((entry) => {
    ensureResourcePackageIndexed(sourceProject, classification, entry.packageId);
    return classification.resourceCarriersByPackageAndName.get(packageNameKey(entry.packageId, entry.name)!) ?? [];
  }));
}

function diInterfacesForDeclarations(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly FrameworkDiInterfaceExportRow[] {
  const direct = uniqueById(declarations.flatMap((declaration) => {
    const key = declarationKey(declaration);
    const cached = key === null ? undefined : classification.diInterfacesByDeclaration.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const packageId = sourceProject.packageForFileName(declaration.getSourceFile().fileName)?.id;
    const packageName = packageId === undefined ? undefined : classification.packageNames.get(packageId);
    const rows = packageId === undefined || packageName === undefined || !ts.isVariableDeclaration(declaration)
      ? []
      : diInterfaceRowsForVariable(sourceProject, declaration.getSourceFile(), declaration, packageId, packageName);
    if (key !== null) {
      classification.diInterfacesByDeclaration.set(key, [...rows]);
    }
    return rows;
  }));
  if (direct.length > 0) {
    return direct;
  }
  return uniqueById(namedPackageDeclarationKeys(sourceProject, classification, declarations).flatMap((entry) =>
    readFrameworkDiInterfaceExportRows(sourceProject, entry.packageId, entry.packageName, entry.name)
  ));
}

function registryExportsForDeclarations(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly FrameworkRegistryExportRow[] {
  return uniqueById(declarations.flatMap((declaration) => {
    const key = declarationKey(declaration);
    const cached = key === null ? undefined : classification.registryExportsByDeclaration.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const rows = registryExportForDeclaration(sourceProject, classification, declaration);
    if (key !== null) {
      classification.registryExportsByDeclaration.set(key, [...rows]);
    }
    return rows;
  }));
}

function namedPackageDeclarationKeys(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly { readonly packageId: string; readonly packageName: string; readonly name: string }[] {
  const entries = new Map<string, { readonly packageId: string; readonly packageName: string; readonly name: string }>();
  for (const declaration of declarations) {
    const name = declarationNameText(declaration);
    const packageId = sourceProject.packageForFileName(declaration.getSourceFile().fileName)?.id;
    const packageName = packageId === undefined ? undefined : classification.packageNames.get(packageId);
    if (name === null || packageId === undefined || packageName === undefined) {
      continue;
    }
    entries.set(`${packageId}:${name}`, { packageId, packageName, name });
  }
  return [...entries.values()];
}

function declarationNameText(declaration: ts.Declaration): string | null {
  const name = (declaration as { readonly name?: ts.Node | null }).name;
  return name !== undefined && name !== null && ts.isIdentifier(name) ? name.text : null;
}

function registryExportForDeclaration(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declaration: ts.Declaration,
): readonly FrameworkRegistryExportRow[] {
  const value = valueDeclarationParts(declaration);
  if (value === null) {
    return [];
  }
  const sourceFile = declaration.getSourceFile();
  const packageId = sourceProject.packageForFileName(sourceFile.fileName)?.id;
  const packageName = packageId === undefined ? undefined : classification.packageNames.get(packageId);
  if (packageId === undefined || packageName === undefined) {
    return [];
  }
  const memberNames = memberNamesForValueName(sourceProject, value.nameNode);
  const exportEntry = {
    ...exportSurfaceEntryForNamedDeclaration(sourceProject, sourceFile, value.nameNode, value.declarationNode, value.declarationKind),
    memberNames,
  };
  const baseRow: FrameworkPackageExportRow = {
    id: `framework-export:${packageId}:${exportEntry.exportName}:source-registry`,
    packageId,
    packageName,
    exportEntry,
  };
  const capabilities = capabilitiesForPackageExport(baseRow);
  return capabilities.length === 0
    ? []
    : [{
      ...baseRow,
      capabilities,
    }];
}

function valueDeclarationParts(declaration: ts.Declaration): {
  readonly nameNode: ts.Node;
  readonly declarationNode: ts.Node;
  readonly declarationKind: SourceDeclarationKind;
} | null {
  if (ts.isClassDeclaration(declaration) && declaration.name !== undefined) {
    return { nameNode: declaration.name, declarationNode: declaration, declarationKind: SourceDeclarationKind.Class };
  }
  if (ts.isFunctionDeclaration(declaration) && declaration.name !== undefined) {
    return { nameNode: declaration.name, declarationNode: declaration, declarationKind: SourceDeclarationKind.Function };
  }
  if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
    return { nameNode: declaration.name, declarationNode: declaration, declarationKind: SourceDeclarationKind.Variable };
  }
  if (ts.isEnumDeclaration(declaration)) {
    return { nameNode: declaration.name, declarationNode: declaration, declarationKind: SourceDeclarationKind.Enum };
  }
  return null;
}

function memberNamesForValueName(sourceProject: SourceProject, nameNode: ts.Node): readonly string[] {
  const checker = sourceProject.checker;
  const symbol = checker.getSymbolAtLocation(nameNode);
  const type = symbol === undefined
    ? checker.getTypeAtLocation(nameNode)
    : checker.getTypeOfSymbolAtLocation(symbol, nameNode);
  return [...new Set(type.getProperties().map((property) => property.getName()))].sort();
}

function resourceCarriersForExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbolCached(sourceProject, classification, expression),
): readonly FrameworkResourceCarrierRow[] {
  const exact = resourceCarriersForDeclarations(sourceProject, classification, declarations);
  if (exact.length > 0) {
    return exact;
  }
  const targetName = visibleExpressionName(expression);
  if (targetName === null) {
    return [];
  }
  return rowsForExpressionDeclarations(sourceProject, classification.resourceCarriersByDeclaration, expression)
    .filter((row) => row.sourceExportName === targetName || row.targetName === targetName);
}

function diInterfacesForExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  _sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbolCached(sourceProject, classification, expression),
): readonly FrameworkDiInterfaceExportRow[] {
  const exact = diInterfacesForDeclarations(sourceProject, classification, declarations);
  if (exact.length > 0) {
    return exact;
  }
  const targetName = visibleExpressionName(expression);
  if (targetName === null) {
    return [];
  }
  return rowsForExpressionDeclarations(sourceProject, classification.diInterfacesByDeclaration, expression)
    .filter((row) => row.exportEntry.exportName === targetName || row.interfaceKey === targetName);
}

function registryExportsForExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  _sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbolCached(sourceProject, classification, expression),
): readonly FrameworkRegistryExportRow[] {
  const exact = registryExportsForDeclarations(sourceProject, classification, declarations);
  if (exact.length > 0) {
    return exact;
  }
  const targetName = visibleExpressionName(expression);
  if (targetName === null) {
    return [];
  }
  return rowsForExpressionDeclarations(sourceProject, classification.registryExportsByDeclaration, expression)
    .filter((row) => row.exportEntry.exportName === targetName || row.exportEntry.resolvedName === targetName);
}

function declarationsForExpressionSymbol(sourceProject: SourceProject, expression: ts.Expression): readonly ts.Declaration[] {
  const current = unwrapExpression(expression);
  const symbol = ts.isIdentifier(current)
    ? sourceProject.checker.getSymbolAtLocation(current)
    : ts.isPropertyAccessExpression(current)
      ? sourceProject.checker.getSymbolAtLocation(current.name) ?? sourceProject.checker.getSymbolAtLocation(current)
      : sourceProject.checker.getSymbolAtLocation(current);
  if (symbol === undefined) {
    return [];
  }
  const resolved = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? sourceProject.checker.getAliasedSymbol(symbol)
    : symbol;
  return resolved.getDeclarations() ?? symbol.getDeclarations() ?? [];
}

function declarationKey(declaration: ts.Declaration): string | null {
  const sourceFile = declaration.getSourceFile();
  const span = sourceSpan(sourceFile, declaration);
  return sourceLocationKey(sourceFile.fileName, span.start, span.end);
}

function targetDeclarationKey(target: SourceTargetRow): string | null {
  return target.file === undefined || target.span === undefined
    ? null
    : sourceLocationKey(target.file.absolutePath, target.span.start, target.span.end);
}

function sourceLocationKey(fileName: string, start: number, end: number): string {
  return `${fileName.replace(/\\/gu, "/").toLowerCase()}:${start}:${end}`;
}

function profileFrameworkBundles(payload: Record<string, unknown>): void {
  if (process.env.ATLAS_PROFILE_FRAMEWORK_BUNDLES !== "1") {
    return;
  }
  console.error(JSON.stringify(payload));
}

function uniqueById<TRow extends { readonly id: string }>(rows: readonly TRow[]): readonly TRow[] {
  const byId = new Map<string, TRow>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function expressionForFact(sourceFile: ts.SourceFile, fact: TypeScriptExpressionFact): ts.Expression | null {
  let best: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (node.getStart(sourceFile) === fact.span.start && node.getEnd() === fact.span.end && ts.isExpression(node)) {
      if (best === null || node.getWidth(sourceFile) <= best.getWidth(sourceFile)) {
        best = node;
      }
    }
    if (node.getStart(sourceFile) <= fact.span.start && node.getEnd() >= fact.span.end) {
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return best;
}

function registrationHelperName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  if (ts.isPropertyAccessExpression(callee) && calleeTail(callee.expression) === "Registration" && isKernelRegistrationMethod(callee.name.text)) {
    return `Registration.${callee.name.text}`;
  }
  const name = calleeTail(current.expression);
  return name !== null && /Registration$/u.test(name) ? name : null;
}

function isKernelRegistrationMethod(name: string): boolean {
  return ["singleton", "transient", "instance", "callback", "cachedCallback", "aliasTo"].includes(name);
}

function appTaskHelperName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  return ts.isPropertyAccessExpression(callee) && calleeTail(callee.expression) === "AppTask" && isAppTaskMethod(callee.name.text)
    ? `AppTask.${callee.name.text}`
    : null;
}

function isAppTaskMethod(name: string): boolean {
  return ["creating", "hydrating", "hydrated", "activating", "activated", "deactivating", "deactivated", "disposing"].includes(name);
}

function appTaskKeyExpression(call: ts.CallExpression): ts.Expression | null {
  const first = call.arguments[0];
  if (first === undefined || ts.isSpreadElement(first)) {
    return null;
  }
  const current = unwrapExpression(first);
  return isFunctionExpressionLike(current) ? null : current;
}

function variableInitializerForExpression(expression: ts.Expression, declarations: readonly ts.Declaration[]): ts.Expression | null {
  const current = unwrapExpression(expression);
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const declaration = declarations.find((candidate): candidate is ts.VariableDeclaration =>
    ts.isVariableDeclaration(candidate)
    && candidate.initializer !== undefined
    && candidate.name.getText(candidate.getSourceFile()) === current.text
  );
  return declaration?.initializer === undefined ? null : unwrapExpression(declaration.initializer);
}

function registryExportForMemberCallReceiver(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  owningRow: FrameworkRegistryExportRow,
): FrameworkRegistryExportRow | undefined {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return undefined;
  }
  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee) || !["customize", "withChild"].includes(callee.name.text)) {
    return undefined;
  }
  return registryExportsForExpression(sourceProject, classification, sourceFile, callee.expression)
    .find((candidate) => candidate.id !== owningRow.id);
}

function localFunctionDeclarationForCall(sourceProject: SourceProject, sourceFile: ts.SourceFile, call: ts.CallExpression): ts.FunctionDeclaration | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isIdentifier(expression)) {
    return null;
  }
  const symbol = sourceProject.checker.getSymbolAtLocation(expression);
  const declaration = symbol?.getDeclarations()?.find((candidate): candidate is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(candidate)
    && candidate.body !== undefined
    && candidate.getSourceFile().fileName === sourceFile.fileName
  );
  return declaration ?? null;
}

function returnExpressions(body: ts.Block): readonly ts.Expression[] {
  const expressions: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isClassLike(node)) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression !== undefined) {
      expressions.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return expressions;
}

function isFunctionExpressionLike(node: ts.Node): node is ts.FunctionExpression | ts.ArrowFunction {
  return ts.isFunctionExpression(node) || ts.isArrowFunction(node);
}

function visibleExpressionName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  if ((ts.isClassExpression(current) || ts.isFunctionExpression(current)) && current.name !== undefined) {
    return current.name.text;
  }
  if (ts.isCallExpression(current)) {
    return calleeTail(current.expression);
  }
  return null;
}

function visibleExpressionNameText(text: string): string | null {
  const match = /[$_A-Za-z][$_0-9A-Za-z]*/u.exec(text);
  return match?.[0] ?? null;
}

function readFrameworkPublicExportSurface(
  sourceProject: SourceProject,
  packageId: string,
): FrameworkPublicExportSurface {
  const cache = publicExportSurfaceByPackageByProject.get(sourceProject) ?? new Map<string, FrameworkPublicExportSurface>();
  if (!publicExportSurfaceByPackageByProject.has(sourceProject)) {
    publicExportSurfaceByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const entries = readExportNames(sourceProject, {
    scheme: SourceSelectorScheme.Package,
    packageId,
  }, {
    limit: 100_000,
    offset: 0,
  }).exports;
  const surface = {
    exportsByName: new Map(entries.map((entry) => [entry.exportName, entry])),
  };
  cache.set(packageId, surface);
  return surface;
}

function resourceCarriersForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.ClassDeclaration,
  packageId: string,
  packageName: string,
): readonly FrameworkResourceCarrierRow[] {
  const rows: FrameworkResourceCarrierRow[] = [];
  const targetName = declaration.name?.text ?? "<anonymous-class>";
  const carrierEntry = exportSurfaceEntryForNamedDeclaration(sourceProject, sourceFile, declaration.name ?? declaration, declaration, SourceDeclarationKind.Class);

  for (const decorator of ts.canHaveDecorators(declaration) ? ts.getDecorators(declaration) ?? [] : []) {
    const calleeName = decoratorCalleeName(decorator);
    let resourceKind = calleeName === null ? null : resourceKindFromDecoratorName(calleeName);
    if (resourceKind === FrameworkResourceDefinitionKind.CustomAttribute) {
      const definitionExpression = decoratorDefinitionExpression(decorator);
      if (definitionExpression !== null && readStaticBooleanProperty(definitionExpression, "isTemplateController") === true) {
        resourceKind = FrameworkResourceDefinitionKind.TemplateController;
      }
    }
    if (resourceKind === null) {
      continue;
    }
    const definitionExpression = decoratorDefinitionExpression(decorator);
    rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, resourceKind, FrameworkResourceCarrierKind.Decorator, decorator, {
      resourceName: definitionExpression === null ? null : readResourceName(sourceProject, definitionExpression),
      aliases: definitionExpression === null ? [] : readStaticStringArrayProperty(sourceProject, definitionExpression, "aliases"),
      targetName,
    }));
  }

  const staticAu = staticAuInitializer(declaration);
  if (staticAu !== null) {
    let resourceKind = resourceKindFromDefinitionExpression(sourceProject, staticAu);
    if (resourceKind === FrameworkResourceDefinitionKind.CustomAttribute && readStaticBooleanProperty(staticAu, "isTemplateController") === true) {
      resourceKind = FrameworkResourceDefinitionKind.TemplateController;
    }
    if (resourceKind !== null && resourceKind !== FrameworkResourceDefinitionKind.AttributePattern) {
      rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, resourceKind, FrameworkResourceCarrierKind.StaticAu, staticAu, {
        resourceName: readResourceName(sourceProject, staticAu),
        aliases: readStaticStringArrayProperty(sourceProject, staticAu, "aliases"),
        targetName,
      }));
    }
  }

  for (const member of declaration.members) {
    if (ts.isClassStaticBlockDeclaration(member)) {
      for (const call of callExpressionsIn(member)) {
        const defineKind = resourceKindFromDirectDefineCall(call);
        if (defineKind === null) {
          continue;
        }
        const definitionExpression = call.arguments[0] ?? null;
        rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, defineKind, FrameworkResourceCarrierKind.DefineCall, call, {
          resourceName: definitionExpression === null ? null : readResourceName(sourceProject, definitionExpression),
          aliases: definitionExpression === null ? [] : readStaticStringArrayProperty(sourceProject, definitionExpression, "aliases"),
          targetName,
        }));
      }
      continue;
    }
    if (!ts.isPropertyDeclaration(member) || member.initializer === undefined) {
      continue;
    }
    for (const call of callExpressionsIn(member.initializer)) {
      if (!isAttributePatternCreateCall(call)) {
        continue;
      }
      rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, FrameworkResourceDefinitionKind.AttributePattern, FrameworkResourceCarrierKind.AttributePatternCreate, call, {
        resourceName: null,
        aliases: [],
        targetName,
      }));
    }
  }

  return rows;
}

function resourceCarriersForVariable(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration & { readonly name: ts.Identifier },
  packageId: string,
  packageName: string,
): readonly FrameworkResourceCarrierRow[] {
  const initializer = declaration.initializer;
  if (initializer === undefined) {
    return [];
  }
  const carrierEntry = exportSurfaceEntryForVariable(sourceProject, sourceFile, declaration);
  const rows: FrameworkResourceCarrierRow[] = [];
  for (const call of callExpressionsIn(initializer)) {
    if (isRendererHelperCall(call)) {
      const targetName = targetNameFromExpression(sourceProject, call.arguments[0]) ?? declaration.name.text;
      rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, FrameworkResourceDefinitionKind.Renderer, FrameworkResourceCarrierKind.RendererHelper, call, {
        resourceName: targetName,
        aliases: [],
        targetName,
      }));
      continue;
    }
    const defineKind = resourceKindFromDefineCall(call);
    if (defineKind !== null) {
      const definitionExpression = call.arguments[0] ?? null;
      rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, defineKind, FrameworkResourceCarrierKind.DefineCall, call, {
        resourceName: definitionExpression === null ? null : readResourceName(sourceProject, definitionExpression),
        aliases: definitionExpression === null ? [] : readStaticStringArrayProperty(sourceProject, definitionExpression, "aliases"),
        targetName: targetNameFromExpression(sourceProject, call.arguments[1]) ?? declaration.name.text,
      }));
      continue;
    }
    if (isAttributePatternCreateCall(call)) {
      rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, FrameworkResourceDefinitionKind.AttributePattern, FrameworkResourceCarrierKind.AttributePatternCreate, call, {
        resourceName: null,
        aliases: [],
        targetName: targetNameFromExpression(sourceProject, call.arguments[1]) ?? declaration.name.text,
      }));
    }
  }
  return rows;
}

function resourceCarriersForTopLevelDefineCalls(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkResourceCarrierRow[] {
  const rows: FrameworkResourceCarrierRow[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement)) {
      continue;
    }
    const expression = unwrapExpression(statement.expression);
    if (!ts.isCallExpression(expression)) {
      continue;
    }
    const resourceKind = resourceKindFromDefinitionCall(expression);
    const targetExpression = resourceTargetExpressionFromDefinitionCall(expression);
    if (resourceKind === null || targetExpression === null) {
      continue;
    }
    const targetDeclarations = declarationsForExpressionSymbol(sourceProject, targetExpression)
      .filter((declaration) => sourceProject.packageForFileName(declaration.getSourceFile().fileName)?.id === packageId);
    for (const declaration of targetDeclarations) {
      const value = valueDeclarationParts(declaration);
      const name = declarationNameText(declaration);
      if (value === null || name === null || (exportName !== undefined && name !== exportName)) {
        continue;
      }
      const carrierEntry = exportSurfaceEntryForNamedDeclaration(sourceProject, declaration.getSourceFile(), value.nameNode, value.declarationNode, value.declarationKind);
      rows.push(resourceCarrierRow(sourceProject, sourceFile, packageId, packageName, carrierEntry, resourceKind, FrameworkResourceCarrierKind.DefineCall, expression, {
        resourceName: readResourceName(sourceProject, expression.arguments[0] ?? expression),
        aliases: readStaticStringArrayProperty(sourceProject, expression.arguments[0] ?? expression, "aliases"),
        targetName: name,
      }));
    }
  }
  return uniqueById(rows);
}

function resourceCarrierRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  carrierEntry: TypeScriptExportSurfaceEntry,
  resourceKind: FrameworkResourceDefinitionKind,
  carrierKind: FrameworkResourceCarrierKind,
  carrierNode: ts.Node,
  values: {
    readonly resourceName: string | null;
    readonly aliases: readonly string[];
    readonly targetName: string | null;
  },
): FrameworkResourceCarrierRow {
  const file = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, carrierNode);
  return {
    id: `framework-resource-carrier:${packageId}:${carrierEntry.exportName}:${resourceKind}:${span.start}`,
    packageId,
    packageName,
    sourceExportName: carrierEntry.exportName,
    carrierEntry,
    resourceKind,
    carrierKind,
    resourceName: values.resourceName,
    aliases: values.aliases,
    targetName: values.targetName,
    source: sourceRangeFromFileSpan(file.repoPath, span),
  };
}

function resourceExportRowFromCarrier(
  carrier: FrameworkResourceCarrierRow,
  publicExport: TypeScriptExportNameEntry,
): FrameworkResourceExportRow {
  const exportEntry: TypeScriptExportSurfaceEntry = {
    ...carrier.carrierEntry,
    id: `export:${publicExport.surfaceFile.repoPath}:${publicExport.exportName}`,
    exportName: publicExport.exportName,
    surfaceFile: publicExport.surfaceFile,
    alias: publicExport.alias,
    resolvedName: publicExport.resolvedName,
    symbolFlags: publicExport.symbolFlags,
    fullyQualifiedName: publicExport.fullyQualifiedName,
  };
  return {
    id: `framework-resource:${carrier.packageId}:${publicExport.exportName}:${carrier.resourceKind}:${carrier.source.start.line}:${carrier.source.start.character}`,
    packageId: carrier.packageId,
    packageName: carrier.packageName,
    exportEntry,
    carrier,
    resourceKind: carrier.resourceKind,
    carrierKind: carrier.carrierKind,
    resourceName: carrier.resourceName,
    aliases: carrier.aliases,
    targetName: carrier.targetName,
    source: carrier.source,
  };
}

function exportedClassDeclarations(sourceFile: ts.SourceFile): readonly ts.ClassDeclaration[] {
  return sourceFile.statements
    .filter((statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement) && statement.name !== undefined && hasExportModifier(statement));
}

function exportedVariableDeclarations(sourceFile: ts.SourceFile): readonly ts.VariableDeclaration[] {
  const declarations: ts.VariableDeclaration[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) {
      continue;
    }
    declarations.push(...statement.declarationList.declarations);
  }
  return declarations;
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
}

function diInterfaceRowsForVariable(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration,
  packageId: string,
  packageName: string,
  publicExport?: TypeScriptExportNameEntry,
): readonly FrameworkDiInterfaceExportRow[] {
  if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
    return [];
  }
  if (!containsCreateInterfaceText(declaration.initializer, sourceFile)) {
    return [];
  }
  const namedDeclaration = declaration as ts.VariableDeclaration & { readonly name: ts.Identifier };
  const exportEntry = exportSurfaceEntryForVariable(sourceProject, sourceFile, namedDeclaration, publicExport);
  const checker = sourceProject.checker;
  const calls = callExpressionsIn(declaration.initializer);
  const createInterfaceCalls = calls.filter((call) => isCreateInterfaceCall(checker, sourceFile, call))
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter((callSite): callSite is TypeScriptCallSiteEntry => callSite !== null);
  if (createInterfaceCalls.length === 0) {
    return [];
  }
  const builderCalls = calls.filter((call) => isResolverBuilderCall(checker, call))
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter((callSite): callSite is TypeScriptCallSiteEntry => callSite !== null);
  return createInterfaceCalls.map((createInterfaceCall, index): FrameworkDiInterfaceExportRow => ({
    id: `framework-export:${packageId}:${exportEntry.exportName}:di-interface:${index}`,
    packageId,
    packageName,
    exportEntry,
    interfaceKey: interfaceKeyForCreateInterfaceCall(exportEntry.exportName, createInterfaceCall),
    createInterfaceCall,
    builderCalls,
    indirect: createInterfaceCall.span.start !== declaration.initializer!.getStart(sourceFile),
  }));
}

function concreteExportTarget(targets: readonly SourceTargetRow[]): SourceTargetRow | undefined {
  return targets.find((target) => target.declarationKind !== "interface" && target.declarationKind !== "type-alias") ?? targets[0];
}

function isCreateInterfaceCall(checker: ts.TypeChecker, sourceFile: ts.SourceFile, call: ts.CallExpression): boolean {
  if (!containsCreateInterfaceText(unwrapExpression(call.expression), sourceFile)) {
    return false;
  }
  return callReturnTypeText(checker, call).includes("InterfaceSymbol");
}

function isResolverBuilderCall(checker: ts.TypeChecker, call: ts.CallExpression): boolean {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || !["singleton", "transient", "instance", "callback", "cachedCallback", "aliasTo"].includes(callee.name.text)) {
    return false;
  }
  return callReturnTypeText(checker, call).includes("IResolver");
}

function containsCreateInterfaceText(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  return node.getText(sourceFile).toLowerCase().includes("createinterface");
}

function decoratorCalleeName(decorator: ts.Decorator): string | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    return calleeTail(expression.expression);
  }
  return calleeTail(expression);
}

function decoratorDefinitionExpression(decorator: ts.Decorator): ts.Expression | null {
  const expression = unwrapExpression(decorator.expression);
  return ts.isCallExpression(expression) ? expression.arguments[0] ?? null : null;
}

function staticAuInitializer(declaration: ts.ClassDeclaration): ts.Expression | null {
  for (const member of declaration.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer === undefined) {
      continue;
    }
    if (propertyNameText(member.name) === "$au") {
      return member.initializer;
    }
  }
  return null;
}

function resourceKindFromDecoratorName(name: string): FrameworkResourceDefinitionKind | null {
  switch (name) {
    case "customElement":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "customAttribute":
      return FrameworkResourceDefinitionKind.CustomAttribute;
    case "templateController":
      return FrameworkResourceDefinitionKind.TemplateController;
    case "valueConverter":
      return FrameworkResourceDefinitionKind.ValueConverter;
    case "bindingBehavior":
      return FrameworkResourceDefinitionKind.BindingBehavior;
    case "bindingCommand":
      return FrameworkResourceDefinitionKind.BindingCommand;
    case "attributePattern":
      return FrameworkResourceDefinitionKind.AttributePattern;
    default:
      return null;
  }
}

function resourceKindFromDefineCall(call: ts.CallExpression): FrameworkResourceDefinitionKind | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== "define") {
    return null;
  }
  switch (calleeTail(expression.expression)) {
    case "CustomElement":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "CustomAttribute":
      return FrameworkResourceDefinitionKind.CustomAttribute;
    case "ValueConverter":
      return FrameworkResourceDefinitionKind.ValueConverter;
    case "BindingBehavior":
      return FrameworkResourceDefinitionKind.BindingBehavior;
    case "BindingCommand":
      return FrameworkResourceDefinitionKind.BindingCommand;
    default:
      return null;
  }
}

function resourceKindFromDefinitionCall(call: ts.CallExpression): FrameworkResourceDefinitionKind | null {
  return resourceKindFromDefineCall(call)
    ?? (isAttributePatternCreateCall(call) ? FrameworkResourceDefinitionKind.AttributePattern : null);
}

function resourceTargetExpressionFromDefinitionCall(call: ts.CallExpression): ts.Expression | null {
  const expression = unwrapExpression(call.expression);
  if (ts.isPropertyAccessExpression(expression) && expression.name.text === "define") {
    const target = call.arguments[1];
    return target === undefined || ts.isSpreadElement(target) ? null : unwrapExpression(target);
  }
  if (isAttributePatternCreateCall(call)) {
    const target = call.arguments[1];
    return target === undefined || ts.isSpreadElement(target) ? null : unwrapExpression(target);
  }
  return null;
}

function targetNameFromResourceDefinitionCall(sourceProject: SourceProject, call: ts.CallExpression): string | null {
  return targetNameFromExpression(sourceProject, resourceTargetExpressionFromDefinitionCall(call) ?? undefined)
    ?? readResourceName(sourceProject, call.arguments[0] ?? call);
}

function resourceKindFromDirectDefineCall(call: ts.CallExpression): FrameworkResourceDefinitionKind | null {
  switch (calleeTail(call.expression)) {
    case "defineElement":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "defineAttribute": {
      const definitionExpression = call.arguments[0] === undefined || ts.isSpreadElement(call.arguments[0])
        ? null
        : unwrapExpression(call.arguments[0]);
      return definitionExpression !== null && readStaticBooleanProperty(definitionExpression, "isTemplateController") === true
        ? FrameworkResourceDefinitionKind.TemplateController
        : FrameworkResourceDefinitionKind.CustomAttribute;
    }
    default:
      return null;
  }
}

function isAttributePatternCreateCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && expression.name.text === "create"
    && calleeTail(expression.expression) === "AttributePattern";
}

function isRendererHelperCall(call: ts.CallExpression): boolean {
  return calleeTail(call.expression) === "renderer";
}

function resourceKindFromDefinitionExpression(sourceProject: SourceProject, expression: ts.Expression): FrameworkResourceDefinitionKind | null {
  const raw = readStaticTypeNameProperty(sourceProject, expression, "type");
  switch (raw) {
    case "custom-element":
    case "elementTypeName":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "custom-attribute":
    case "attrTypeName":
      return FrameworkResourceDefinitionKind.CustomAttribute;
    case "template-controller":
      return FrameworkResourceDefinitionKind.TemplateController;
    case "value-converter":
    case "converterTypeName":
      return FrameworkResourceDefinitionKind.ValueConverter;
    case "binding-behavior":
    case "behaviorTypeName":
      return FrameworkResourceDefinitionKind.BindingBehavior;
    case "binding-command":
    case "bindingCommandTypeName":
      return FrameworkResourceDefinitionKind.BindingCommand;
    case "attribute-pattern":
      return FrameworkResourceDefinitionKind.AttributePattern;
    default:
      return null;
  }
}

function readStaticTypeNameProperty(sourceProject: SourceProject, expression: ts.Expression, propertyName: string): string | null {
  const current = unwrapExpression(expression);
  const property = objectProperty(current, propertyName);
  if (property !== null && ts.isPropertyAssignment(property)) {
    return readStaticStringLikeExpression(sourceProject, property.initializer, true);
  }
  return readTypeStringLiteralProperty(sourceProject, current, propertyName);
}

function readResourceName(sourceProject: SourceProject, expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  return readStaticStringProperty(sourceProject, expression, "name")
    ?? readEvaluatedStringProperty(sourceProject, current, "name");
}

function readStaticStringProperty(sourceProject: SourceProject, expression: ts.Expression, propertyName: string): string | null {
  const property = objectProperty(unwrapExpression(expression), propertyName);
  if (property === null || !ts.isPropertyAssignment(property)) {
    return null;
  }
  return readStaticStringLikeExpression(sourceProject, property.initializer, false);
}

function readStaticStringLikeExpression(sourceProject: SourceProject, expression: ts.Expression, allowIdentifierText: boolean): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  const constant = sourceProject.checker.getConstantValue(current as ts.EnumMember | ts.PropertyAccessExpression | ts.ElementAccessExpression);
  if (typeof constant === "string") {
    return constant;
  }
  const type = sourceProject.checker.getTypeAtLocation(current);
  if (type.isStringLiteral()) {
    return type.value;
  }
  return allowIdentifierText && ts.isIdentifier(current) ? current.text : null;
}

function readStaticBooleanProperty(expression: ts.Expression, propertyName: string): boolean | null {
  const property = objectProperty(unwrapExpression(expression), propertyName);
  if (property === null || !ts.isPropertyAssignment(property)) {
    return null;
  }
  const initializer = unwrapExpression(property.initializer);
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function readStaticStringArrayProperty(sourceProject: SourceProject, expression: ts.Expression, propertyName: string): readonly string[] {
  const property = objectProperty(unwrapExpression(expression), propertyName);
  if (property === null || !ts.isPropertyAssignment(property)) {
    return [];
  }
  const initializer = unwrapExpression(property.initializer);
  if (!ts.isArrayLiteralExpression(initializer)) {
    return [];
  }
  return initializer.elements
    .map((element) => readStaticStringLikeExpression(sourceProject, element, false))
    .filter((element): element is string => element !== null);
}

function readTypeStringLiteralProperty(sourceProject: SourceProject, expression: ts.Expression, propertyName: string): string | null {
  const type = sourceProject.checker.getTypeAtLocation(unwrapExpression(expression));
  const property = type.getProperty(propertyName);
  if (property === undefined) {
    return null;
  }
  const propertyType = sourceProject.checker.getTypeOfSymbolAtLocation(property, expression);
  if (propertyType.isStringLiteral()) {
    return propertyType.value;
  }
  if (propertyType.isUnion()) {
    const literals = propertyType.types.filter((candidate) => candidate.isStringLiteral());
    return literals.length === 1 ? literals[0]!.value : null;
  }
  return null;
}

function readEvaluatedStringProperty(sourceProject: SourceProject, expression: ts.Expression, propertyName: string): string | null {
  const sourceFile = expression.getSourceFile();
  const moduleEvaluation = readModuleEvaluation(sourceProject, sourceFile);
  const evaluator = new StaticEvaluator(sourceProject);
  const result = evaluator.evaluateExpressionInEnvironment(expression, moduleEvaluation.environment, sourceFile.fileName);
  if (result.value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = result.value.properties.get(propertyName);
  return property?.value.kind === EvaluationValueKind.String ? property.value.value : null;
}

function readModuleEvaluation(sourceProject: SourceProject, sourceFile: ts.SourceFile): ModuleEvaluationResult {
  const cache = moduleEvaluationByFileByProject.get(sourceProject) ?? new Map<string, ModuleEvaluationResult>();
  if (!moduleEvaluationByFileByProject.has(sourceProject)) {
    moduleEvaluationByFileByProject.set(sourceProject, cache);
  }
  const cached = cache.get(sourceFile.fileName);
  if (cached !== undefined) {
    return cached;
  }
  const evaluator = new StaticEvaluator(sourceProject);
  const result = evaluator.evaluateSourceFile(sourceFile, sourceFile.fileName);
  cache.set(sourceFile.fileName, result);
  return result;
}

function objectProperty(expression: ts.Expression, propertyName: string): ts.ObjectLiteralElementLike | null {
  if (!ts.isObjectLiteralExpression(expression)) {
    return null;
  }
  return expression.properties.find((property) => propertyNameText(property.name) === propertyName) ?? null;
}

function propertyNameText(name: ts.PropertyName | undefined): string | null {
  if (name === undefined) {
    return null;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function hasStaticModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true;
}

function calleeTail(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function targetNameFromExpression(sourceProject: SourceProject, expression: ts.Expression | undefined): string | null {
  if (expression === undefined) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if ((ts.isClassExpression(current) || ts.isFunctionExpression(current)) && current.name !== undefined) {
    return current.name.text;
  }
  if (ts.isObjectLiteralExpression(current)) {
    return readStaticStringProperty(sourceProject, current, "name");
  }
  return null;
}

function interfaceKeyForCreateInterfaceCall(exportName: string, callSite: TypeScriptCallSiteEntry): string {
  const first = callSite.arguments[0]?.expression;
  return typeof first?.literalValue === "string" ? first.literalValue : exportName;
}

function exportSurfaceEntryForNamedDeclaration(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  nameNode: ts.Node,
  declaration: ts.Node,
  declarationKind: SourceDeclarationKind,
  publicExport?: TypeScriptExportNameEntry,
): TypeScriptExportSurfaceEntry {
  const checker = sourceProject.checker;
  const symbol = checker.getSymbolAtLocation(nameNode);
  const targetFile = sourceProject.sourceFileIdentity(sourceFile) ?? externalFileIdentity(sourceProject, sourceFile);
  const surfaceFile = publicExport?.surfaceFile ?? targetFile;
  const span = sourceSpan(sourceFile, declaration);
  const localName = nameNode.getText(sourceFile);
  const exportName = publicExport?.exportName ?? localName;
  return {
    id: `export:${surfaceFile.repoPath}:${exportName}`,
    exportName,
    surfaceFile,
    alias: publicExport?.alias ?? false,
    resolvedName: publicExport?.resolvedName ?? symbol?.getName() ?? localName,
    symbolFlags: publicExport?.symbolFlags ?? symbol?.flags ?? 0,
    fullyQualifiedName: publicExport === undefined
      ? symbol === undefined ? null : checker.getFullyQualifiedName(symbol)
      : publicExport.fullyQualifiedName,
    type: null,
    memberNames: [],
    targets: [{
      kind: SourceTargetKind.Symbol,
      id: `declaration:${targetFile.repoPath}:${span.start}:${span.end}:${localName}`,
      label: localName,
      file: targetFile,
      span,
      declarationKind,
      ...(symbol === undefined ? {} : { symbolKey: checker.getFullyQualifiedName(symbol) }),
    }],
  };
}

function exportSurfaceEntryForVariable(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration & { readonly name: ts.Identifier },
  publicExport?: TypeScriptExportNameEntry,
): TypeScriptExportSurfaceEntry {
  return exportSurfaceEntryForNamedDeclaration(sourceProject, sourceFile, declaration.name, declaration, SourceDeclarationKind.Variable, publicExport);
}

function callExpressionsIn(node: ts.Node): readonly ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isCallExpression(current)) {
      calls.push(current);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return calls;
}

function callReturnTypeText(checker: ts.TypeChecker, call: ts.CallExpression): string {
  const signature = checker.getResolvedSignature(call);
  const type = signature === undefined
    ? checker.getTypeAtLocation(call)
    : checker.getReturnTypeOfSignature(signature);
  return checker.typeToString(type, call);
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function capabilitiesForPackageExport(row: FrameworkPackageExportRow): readonly FrameworkExportCapability[] {
  const members = new Set(row.exportEntry.memberNames);
  const capabilities: FrameworkExportCapability[] = [];
  if (members.has("register")) {
    capabilities.push(FrameworkExportCapability.Register);
  }
  if (members.has("customize")) {
    capabilities.push(FrameworkExportCapability.Customize);
  }
  if (members.has("init")) {
    capabilities.push(FrameworkExportCapability.Init);
  }
  if (members.has("withStore")) {
    capabilities.push(FrameworkExportCapability.WithStore);
  }
  if (members.has("withChild")) {
    capabilities.push(FrameworkExportCapability.WithChild);
  }
  if (members.has("optionsProvider")) {
    capabilities.push(FrameworkExportCapability.OptionsProvider);
  }
  return capabilities;
}

function callEdgeMatches(row: FrameworkFlowCallEdgeRow, filters: FrameworkDiscoveryFilters): boolean {
  return flowSeedMatches(row.flowSeed, filters)
    && (filters.direction === undefined || row.edge.direction === filters.direction)
    && (filters.fromPackageId === undefined || row.edge.from.file.packageId === filters.fromPackageId)
    && (filters.toPackageId === undefined || row.edge.to.file.packageId === filters.toPackageId)
    && (filters.fromName === undefined || row.edge.from.name === filters.fromName)
    && (filters.toName === undefined || row.edge.to.name === filters.toName);
}

function callSiteMatches(row: FrameworkFlowCallSiteRow, filters: FrameworkDiscoveryFilters): boolean {
  return callEdgeMatches(row.callEdge, filters)
    && (filters.calleeName === undefined || row.callSite.calleeName === filters.calleeName || row.callSite.callee.symbolName === filters.calleeName);
}

function summaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(inquiry, "framework.discovery:flows", "flows", "Inspect framework behavior flow definitions."),
    projectionContinuation(inquiry, "framework.discovery:anchors", "anchors", "Inspect seed anchors that start exact inquiry."),
    projectionContinuation(inquiry, "framework.discovery:flow-seeds", "flow-seeds", "Inspect source-bound anchor plus framework-flow seed rows."),
    projectionContinuation(inquiry, "framework.discovery:call-edges", "call-edges", "Inspect precomputed call edges attached to framework flow seeds."),
    projectionContinuation(inquiry, "framework.discovery:call-sites", "call-sites", "Inspect exact call-site arguments expanded from framework flow call edges."),
    projectionContinuation(inquiry, "framework.discovery:call-targets", "call-targets", "Inspect grouped callee targets for framework flow call edges."),
    projectionContinuation(inquiry, "framework.discovery:package-exports", "package-exports", "Inspect checker-visible exports from admitted Aurelia framework package entrypoints."),
    projectionContinuation(inquiry, "framework.discovery:registry-exports", "registry-exports", "Inspect framework package exports that expose structural registry/configuration capabilities."),
    projectionContinuation(inquiry, "framework.discovery:di-interfaces", "di-interfaces", "Inspect public Aurelia framework exports that create DI InterfaceSymbol keys."),
    projectionContinuation(inquiry, "framework.discovery:resource-carriers", "resource-carriers", "Inspect source-exported Aurelia resource carriers independently of package publicness."),
    projectionContinuation(inquiry, "framework.discovery:resources", "resources", "Inspect public Aurelia framework exports that carry resource definitions."),
    projectionContinuation(inquiry, "framework.discovery:bundles", "bundles", "Inspect evaluator-derived associations from registry/configuration bundle exports."),
    projectionContinuation(inquiry, "framework.discovery:syntax-products", "syntax-products", "Inspect syntax producers and the instruction or binding products they expose."),
    projectionContinuation(inquiry, "framework.discovery:instruction-slots", "instruction-slots", "Inspect instruction discriminator slots joined to declarations and syntax products."),
    projectionContinuation(inquiry, "framework.discovery:instruction-dispatches", "instruction-dispatches", "Inspect instruction slot to renderer dispatch edges."),
    projectionContinuation(inquiry, "framework.discovery:binding-products", "binding-products", "Inspect binding classes materialized by renderer syntax products."),
    projectionContinuation(inquiry, "framework.discovery:binding-admissions", "binding-admissions", "Inspect controller.addBinding admission edges for framework binding products."),
    projectionContinuation(inquiry, "framework.discovery:binding-effects", "binding-effects", "Inspect binding lifecycle and setup effect rows."),
    projectionContinuation(inquiry, "framework.discovery:binding-setups", "binding-setups", "Inspect renderer/resource-side target observer/accessor/subscriber setup calls."),
    projectionContinuation(inquiry, "framework.discovery:observers", "observers", "Inspect public observer-system exports, including ObserverLocator and NodeObserverLocator surfaces."),
    projectionContinuation(inquiry, "framework.discovery:app-tasks", "app-tasks", "Inspect AppTask, lifecycle task-slot, and task queue exports."),
    projectionContinuation(inquiry, "framework.discovery:router-entities", "router-entities", "Inspect router and route-recognizer exports."),
    projectionContinuation(inquiry, "framework.discovery:expression-entities", "expression-entities", "Inspect expression-parser and expression runtime exports."),
    projectionContinuation(inquiry, "framework.discovery:rendering-structures", "rendering-structures", "Inspect rendering, hydration, controller, view, and lifecycle structure exports."),
    projectionContinuation(inquiry, "framework.discovery:open-questions", "open-questions", "Inspect open discovery questions that should steer indexing work."),
  ];
}

function renderingSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(inquiry, "framework.rendering:syntax-products", "syntax-products", "Inspect syntax producers and the instruction or binding products they expose."),
    projectionContinuation(inquiry, "framework.rendering:instruction-slots", "instruction-slots", "Inspect instruction discriminator slots joined to declarations and syntax products."),
    projectionContinuation(inquiry, "framework.rendering:instruction-dispatches", "instruction-dispatches", "Inspect instruction slot to renderer dispatch edges."),
    projectionContinuation(inquiry, "framework.rendering:binding-products", "binding-products", "Inspect binding classes reached from rendering/admission/effect rows."),
    projectionContinuation(inquiry, "framework.rendering:binding-admissions", "binding-admissions", "Inspect controller.addBinding admission edges."),
    projectionContinuation(inquiry, "framework.rendering:binding-effects", "binding-effects", "Inspect binding lifecycle and setup effect rows."),
    projectionContinuation(inquiry, "framework.rendering:binding-setups", "binding-setups", "Inspect renderer/resource-side target observer/accessor/subscriber setup calls."),
  ];
}

function flowContinuations(inquiry: Inquiry, nextOffset: number | undefined, limit: number): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:flows:next-page", "Continue framework flow definitions.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:anchors", "anchors", "Inspect seed anchors related to these flows."));
  return continuations;
}

function anchorContinuations(
  inquiry: Inquiry,
  anchors: readonly FrameworkAnchorResolution[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:anchors:next-page", "Continue framework seed anchors.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:flows", "flows", "Inspect flow definitions behind these anchors."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:flow-seeds", "flow-seeds", "Inspect source-bound flow seeds derived from these anchors."));
  for (const [index, resolution] of anchors.slice(0, 3).entries()) {
    const anchor = resolution.anchor;
    const firstCandidate = resolution.candidates[0];
    const selector = declarationSelectorForAnchor(anchor);
    const evidence = evidenceForAnchorResolution(resolution);
    const sourceLocus = firstCandidate === undefined
      ? RepoRootLocus
      : { kind: LocusKind.SourceRange as const, range: sourceRangeForFrameworkAnchorCandidate(firstCandidate) };
    continuations.push({
      id: `framework.discovery:anchors:source:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: firstCandidate === undefined ? ContinuationPriority.Secondary : ContinuationPriority.Primary,
      rationale: firstCandidate === undefined
        ? "Resolve this framework seed anchor through the TypeScript source substrate."
        : "Inspect the exact framework declaration resolved for this seed anchor.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceLocus,
        ...(firstCandidate === undefined ? { subject: selector } : {}),
        projection: firstCandidate === undefined ? "summary" : "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptProgram], "Source declaration for a framework seed anchor."),
    });
    continuations.push({
      id: `framework.discovery:anchors:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this framework seed anchor.",
      inquiry: {
        lens: LensId.TsType,
        locus: firstCandidate === undefined
          ? RepoRootLocus
          : { kind: LocusKind.SourceRange as const, range: sourceRangeForFrameworkAnchorCandidate(firstCandidate) },
        ...(firstCandidate === undefined ? { subject: selector } : {}),
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a framework seed anchor."),
    });
    if (anchor.source.auLinkId !== undefined) {
      continuations.push({
        id: `framework.discovery:anchors:aulink:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect semantic-runtime auLink mirror pressure for this framework seed anchor.",
        inquiry: {
          lens: LensId.BridgeAuLink,
          locus: RepoRootLocus,
          subject: anchor.source.auLinkId,
          projection: "targets",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.MirrorTargetOf, [BasisKind.AuLink, BasisKind.TypeScriptChecker], "auLink mirror target for a framework seed anchor."),
      });
    }
  }
  return continuations;
}

function flowSeedContinuations(
  inquiry: Inquiry,
  flowSeeds: readonly FrameworkFlowSeedRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:flow-seeds:next-page", "Continue framework flow seed rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:anchors", "anchors", "Return to seed anchors behind these flow seeds."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:flows", "flows", "Inspect flow definitions behind these flow seeds."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:call-edges", "call-edges", "Inspect precomputed call edges attached to these flow seeds."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:call-sites", "call-sites", "Inspect exact call-site arguments attached to these flow seeds."));
  for (const [index, seed] of flowSeeds.slice(0, 3).entries()) {
    const firstCandidate = seed.candidates[0];
    const evidence = evidenceForFlowSeed(seed);
    if (firstCandidate !== undefined) {
      continuations.push({
        id: `framework.discovery:flow-seeds:source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect the source declaration that currently seeds this framework flow.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range: sourceRangeForFrameworkAnchorCandidate(firstCandidate) },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptProgram], "Source declaration that seeds a framework flow."),
      });
      continuations.push({
        id: `framework.discovery:flow-seeds:call-hierarchy:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect call hierarchy around the source declaration that seeds this framework flow.",
        inquiry: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.SourceRange, range: sourceRangeForFrameworkAnchorCandidate(firstCandidate) },
          projection: "call-hierarchy",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Flow, NavigationRelation.CallHierarchyOf, [BasisKind.TypeScriptChecker], "Call hierarchy around a framework flow seed."),
      });
    }
    if (seed.anchorResolution.anchor.source.auLinkId !== undefined) {
      continuations.push({
        id: `framework.discovery:flow-seeds:aulink:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect semantic-runtime auLink mirror pressure for this framework flow seed.",
        inquiry: {
          lens: LensId.BridgeAuLink,
          locus: RepoRootLocus,
          subject: seed.anchorResolution.anchor.source.auLinkId,
          projection: "targets",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.MirrorTargetOf, [BasisKind.AuLink, BasisKind.TypeScriptChecker], "auLink mirror target for a framework flow seed."),
      });
    }
  }
  return continuations;
}

function callEdgeContinuations(
  inquiry: Inquiry,
  callEdges: readonly FrameworkFlowCallEdgeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:call-edges:next-page", "Continue framework flow call edges.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:flow-seeds", "flow-seeds", "Return to the source-bound flow seeds behind these call edges."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:call-sites", "call-sites", "Expand these call edges into exact call-site argument rows."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:call-targets", "call-targets", "Group these call edges by callee target."));
  for (const [index, row] of callEdges.slice(0, 3).entries()) {
    const source = sourceRangeForFrameworkFlowCallEdge(row);
    if (source === null) {
      continue;
    }
    const evidence = evidenceForCallEdge(row);
    continuations.push({
      id: `framework.discovery:call-edges:call-sites:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect exact call-site argument facts behind this framework flow call edge.",
      inquiry: {
        ...inquiry,
        projection: "call-sites",
        filters: {
          ...inquiry.filters,
          flow: row.flowSeed.flow,
          direction: row.edge.direction,
          fromPackageId: row.edge.from.file.packageId ?? undefined,
          toPackageId: row.edge.to.file.packageId ?? undefined,
          fromName: row.edge.from.name,
          toName: row.edge.to.name,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Flow, NavigationRelation.CallSitesOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Exact call-site facts behind a framework flow call edge."),
    });
    continuations.push({
      id: `framework.discovery:call-edges:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the source call site behind this framework flow call edge.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptProgram], "Source call site behind a framework flow call edge."),
    });
    continuations.push({
      id: `framework.discovery:call-edges:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this framework flow call site.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a framework flow call edge."),
    });
  }
  return continuations;
}

function callTargetContinuations(
  inquiry: Inquiry,
  callTargets: readonly FrameworkFlowCallTargetRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:call-targets:next-page", "Continue framework flow call targets.", nextOffset, limit));
  }
  for (const [index, target] of callTargets.slice(0, 3).entries()) {
    continuations.push({
      id: `framework.discovery:call-targets:edges:${index}`,
      kind: ContinuationKind.Narrow,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect call edges behind this grouped framework call target.",
      inquiry: {
        ...inquiry,
        projection: "call-edges",
        filters: {
          ...inquiry.filters,
          flow: target.flow,
          direction: target.direction,
          toPackageId: target.targetPackageId ?? undefined,
          toName: target.targetName,
        },
        page: undefined,
      },
      evidence: [evidenceForCallTarget(target)],
      route: route(NavigationPlane.Flow, NavigationRelation.CallHierarchyOf, [BasisKind.TypeScriptChecker], "Call edges behind a grouped framework call target."),
    });
    continuations.push({
      id: `framework.discovery:call-targets:call-sites:${index}`,
      kind: ContinuationKind.Narrow,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect exact call-site arguments behind this grouped framework call target.",
      inquiry: {
        ...inquiry,
        projection: "call-sites",
        filters: {
          ...inquiry.filters,
          flow: target.flow,
          direction: target.direction,
          toPackageId: target.targetPackageId ?? undefined,
          toName: target.targetName,
        },
        page: undefined,
      },
      evidence: [evidenceForCallTarget(target)],
      route: route(NavigationPlane.Flow, NavigationRelation.CallSitesOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Exact call-site facts behind a grouped framework call target."),
    });
  }
  return continuations;
}

function callSiteContinuations(
  inquiry: Inquiry,
  callSites: readonly FrameworkFlowCallSiteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:call-sites:next-page", "Continue framework flow call sites.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:call-edges", "call-edges", "Return to grouped call-hierarchy edges behind these exact call sites."));
  for (const [index, row] of callSites.slice(0, 3).entries()) {
    const source = sourceRangeForFrameworkFlowCallSite(row);
    const evidence = evidenceForCallSite(row);
    continuations.push({
      id: `framework.discovery:call-sites:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this exact framework flow call site.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptProgram], "Source range behind an exact framework flow call site."),
    });
    continuations.push({
      id: `framework.discovery:call-sites:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this exact framework flow call site.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for an exact framework flow call site."),
    });
  }
  return continuations;
}

function packageExportContinuations(
  inquiry: Inquiry,
  packageExports: readonly FrameworkPackageExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:package-exports:next-page", "Continue Aurelia framework package export rows.", nextOffset, limit));
  }
  for (const [index, row] of packageExports.slice(0, 3).entries()) {
    const firstTarget = row.exportEntry.targets[0];
    if (firstTarget === undefined || firstTarget.file === undefined || firstTarget.span === undefined) {
      continue;
    }
    const source = {
      filePath: firstTarget.file.repoPath,
      start: {
        line: firstTarget.span.startLine - 1,
        character: firstTarget.span.startCharacter - 1,
      },
      end: {
        line: firstTarget.span.endLine - 1,
        character: firstTarget.span.endCharacter - 1,
      },
    };
    const evidence = evidenceForPackageExport(row);
    continuations.push({
      id: `framework.discovery:package-exports:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this Aurelia framework package export.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptProgram], "Source declaration behind an Aurelia framework package export."),
    });
    continuations.push({
      id: `framework.discovery:package-exports:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this Aurelia framework package export.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for an Aurelia framework package export."),
    });
    const effectTarget = row.exportEntry.targets.find((target) => target.declarationKind !== "interface" && target.declarationKind !== "type-alias") ?? firstTarget;
    const effectSource = effectTarget.file === undefined || effectTarget.span === undefined
      ? source
      : {
        filePath: effectTarget.file.repoPath,
        start: {
          line: effectTarget.span.startLine - 1,
          character: effectTarget.span.startCharacter - 1,
        },
        end: {
          line: effectTarget.span.endLine - 1,
          character: effectTarget.span.endCharacter - 1,
        },
      };
    if (row.exportEntry.memberNames.includes("register")) {
      continuations.push({
        id: `framework.discovery:package-exports:effects:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale: "Trace static invocation effects inside this export's register member.",
        inquiry: {
          lens: LensId.FrameworkEvaluator,
          locus: { kind: LocusKind.SourceRange, range: effectSource },
          projection: "effects",
          filters: {
            memberName: "register",
          },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.EffectsOf, [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker, BasisKind.SourceText], "Static invocation effects for a framework registry export."),
      });
    }
  }
  return continuations;
}

function observerEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:observers:next-page", "Continue Aurelia framework observer-system export rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:package-exports", "package-exports", "Return to raw package exports behind observer-system rows."));
  continuations.push({
    id: "framework.discovery:observers:binding-effects",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect binding observer/accessor lookup rows that consume ObserverLocator-style APIs.",
    inquiry: {
      lens: LensId.FrameworkDiscovery,
      locus: inquiry.locus,
      projection: "binding-effects",
      filters: { effectKind: FrameworkBindingEffectKind.ObserverLookup },
      budget: inquiry.budget,
    },
    route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Binding observer lookup rows connected to observer-system entities."),
  });
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
    const evidence = evidenceForObserverEntity(row);
    if (source !== null) {
      continuations.push({
        id: `framework.discovery:observers:source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect source behind this observer-system export.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range: source },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind an observer-system export."),
      });
      continuations.push({
        id: `framework.discovery:observers:type:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for this observer-system export.",
        inquiry: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.SourceRange, range: source },
          projection: "facts",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for an observer-system export."),
      });
    }
    for (const [implementationIndex, implementationName] of row.defaultImplementationNames.slice(0, 2).entries()) {
      continuations.push({
        id: `framework.discovery:observers:implementation:${index}:${implementationIndex}`,
        kind: ContinuationKind.Narrow,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect the default implementation named by this observer DI interface.",
        inquiry: {
          lens: LensId.FrameworkDiscovery,
          locus: inquiry.locus,
          projection: "observers",
          filters: {
            exportName: implementationName,
          },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.TypeScriptChecker], "Default implementation named by an observer DI interface."),
      });
    }
  }
  return continuations;
}

function appTaskEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkAppTaskEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "app-tasks",
    nextPageId: "framework.discovery:app-tasks:next-page",
    nextPageRationale: "Continue Aurelia framework AppTask/lifecycle task rows.",
    sourceIdPrefix: "framework.discovery:app-tasks",
    sourceRationale: "Inspect source behind this AppTask/lifecycle task export.",
    typeRationale: "Inspect TypeChecker facts for this AppTask/lifecycle task export.",
    sourceSummary: "Source behind an AppTask/lifecycle task export.",
    typeSummary: "Type facts for an AppTask/lifecycle task export.",
    evidenceFor: evidenceForAppTaskEntity,
  });
}

function routerEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRouterEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "router-entities",
    nextPageId: "framework.discovery:router-entities:next-page",
    nextPageRationale: "Continue Aurelia framework router entity rows.",
    sourceIdPrefix: "framework.discovery:router-entities",
    sourceRationale: "Inspect source behind this router export.",
    typeRationale: "Inspect TypeChecker facts for this router export.",
    sourceSummary: "Source behind a router export.",
    typeSummary: "Type facts for a router export.",
    evidenceFor: evidenceForRouterEntity,
  });
}

function expressionEntityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkExpressionEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "expression-entities",
    nextPageId: "framework.discovery:expression-entities:next-page",
    nextPageRationale: "Continue Aurelia framework expression/parser entity rows.",
    sourceIdPrefix: "framework.discovery:expression-entities",
    sourceRationale: "Inspect source behind this expression/parser export.",
    typeRationale: "Inspect TypeChecker facts for this expression/parser export.",
    sourceSummary: "Source behind an expression/parser export.",
    typeSummary: "Type facts for an expression/parser export.",
    evidenceFor: evidenceForExpressionEntity,
  });
}

function renderingStructureContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRenderingStructureEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return catalogEntityContinuations(inquiry, rows, nextOffset, limit, {
    projection: "rendering-structures",
    nextPageId: "framework.discovery:rendering-structures:next-page",
    nextPageRationale: "Continue Aurelia framework rendering/lifecycle structural rows.",
    sourceIdPrefix: "framework.discovery:rendering-structures",
    sourceRationale: "Inspect source behind this rendering/lifecycle structural export.",
    typeRationale: "Inspect TypeChecker facts for this rendering/lifecycle structural export.",
    sourceSummary: "Source behind a rendering/lifecycle structural export.",
    typeSummary: "Type facts for a rendering/lifecycle structural export.",
    evidenceFor: evidenceForRenderingStructure,
  });
}

function catalogEntityContinuations<TRow extends FrameworkPackageExportRow>(
  inquiry: Inquiry,
  rows: readonly TRow[],
  nextOffset: number | undefined,
  limit: number,
  options: {
    readonly projection: string;
    readonly nextPageId: string;
    readonly nextPageRationale: string;
    readonly sourceIdPrefix: string;
    readonly sourceRationale: string;
    readonly typeRationale: string;
    readonly sourceSummary: string;
    readonly typeSummary: string;
    readonly evidenceFor: (row: TRow) => Evidence;
  },
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, options.nextPageId, options.nextPageRationale, nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:package-exports", "package-exports", "Return to raw package exports behind these catalog rows."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
    if (source === null) {
      continue;
    }
    const evidence = options.evidenceFor(row);
    continuations.push({
      id: `${options.sourceIdPrefix}:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: options.sourceRationale,
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], options.sourceSummary),
    });
    continuations.push({
      id: `${options.sourceIdPrefix}:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: options.typeRationale,
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], options.typeSummary),
    });
  }
  return continuations;
}

function diInterfaceContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkDiInterfaceExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:di-interfaces:next-page", "Continue Aurelia framework DI interface export rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:package-exports", "package-exports", "Return to package exports behind these DI interface rows."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForCallSiteEntry(row.createInterfaceCall);
    const evidence = evidenceForDiInterface(row);
    continuations.push({
      id: `framework.discovery:di-interfaces:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this DI interface creation call.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a DI interface creation call."),
    });
    continuations.push({
      id: `framework.discovery:di-interfaces:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker call-site facts for this DI interface creation call.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "call-sites",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Flow, NavigationRelation.CallSitesOf, [BasisKind.TypeScriptChecker, BasisKind.SourceText], "Exact call-site facts behind a DI interface creation call."),
    });
  }
  return continuations;
}

function resourceCarrierContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkResourceCarrierRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:resource-carriers:next-page", "Continue Aurelia framework resource carrier rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:resources", "resources", "Inspect which resource carriers are public package exports."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForResourceCarrier(row);
    continuations.push({
      id: `framework.discovery:resource-carriers:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this framework resource carrier.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a framework resource carrier."),
    });
    continuations.push({
      id: `framework.discovery:resource-carriers:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this framework resource carrier.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a framework resource carrier."),
    });
  }
  return continuations;
}

function resourceExportContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkResourceExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:resources:next-page", "Continue Aurelia framework resource export rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:package-exports", "package-exports", "Return to package exports behind these resource rows."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForResourceExport(row);
    continuations.push({
      id: `framework.discovery:resources:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this framework resource carrier.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a framework resource carrier."),
    });
    continuations.push({
      id: `framework.discovery:resources:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this framework resource carrier.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a framework resource carrier."),
    });
  }
  return continuations;
}

function bundleContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBundleExportRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:bundles:next-page", "Continue Aurelia framework bundle rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:registry-exports", "registry-exports", "Return to structural registry/configuration exports."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:resource-carriers", "resource-carriers", "Inspect source-level resources used by bundle associations."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBundle(row);
    const firstTarget = concreteExportTarget(row.exportEntry.targets);
    const source = sourceRangeForTarget(firstTarget);
    if (source !== null) {
      continuations.push({
        id: `framework.discovery:bundles:effects:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale: "Trace raw evaluator effects behind this bundle's register member.",
        inquiry: {
          lens: LensId.FrameworkEvaluator,
          locus: { kind: LocusKind.SourceRange, range: source },
          projection: "effects",
          filters: { memberName: "register" },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.EffectsOf, [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker, BasisKind.SourceText], "Raw evaluator effects behind a framework bundle association row."),
      });
    }
    const firstAssociation = row.associations[0];
    if (firstAssociation !== undefined) {
      continuations.push({
        id: `framework.discovery:bundles:association-source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect source behind the first evaluated registration association.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range: firstAssociation.source },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidenceForBundleAssociation(firstAssociation)],
        route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.StaticEvaluator], "Source behind an evaluated bundle association."),
      });
    }
  }
  return continuations;
}

function syntaxProductContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkSyntaxProductRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:syntax-products:next-page", "Continue Aurelia framework syntax product rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:resource-carriers", "resource-carriers", "Return to source-level syntax/resource carriers behind these products."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:bundles", "bundles", "Return to evaluated bundle admissions that can register these producers."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForSyntaxProduct(row);
    continuations.push({
      id: `framework.discovery:syntax-products:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this syntax product expression.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a syntax product expression."),
    });
    continuations.push({
      id: `framework.discovery:syntax-products:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this syntax product expression.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a syntax product expression."),
    });
  }
  return continuations;
}

function instructionSlotContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkInstructionSlotRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:instruction-slots:next-page", "Continue Aurelia framework instruction slot rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:syntax-products", "syntax-products", "Return to syntax products that consume instruction slots."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForInstructionSlot(row);
    continuations.push({
      id: `framework.discovery:instruction-slots:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this instruction slot constant.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind an instruction slot constant."),
    });
    continuations.push({
      id: `framework.discovery:instruction-slots:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this instruction slot constant.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for an instruction slot constant."),
    });
    if (row.syntaxProducts.length > 0) {
      continuations.push({
        id: `framework.discovery:instruction-slots:syntax-products:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect syntax products that build or handle this instruction slot.",
        inquiry: {
          lens: LensId.FrameworkDiscovery,
          locus: inquiry.locus,
          projection: "syntax-products",
          filters: { query: row.slotName },
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Syntax products connected to one instruction slot."),
      });
    }
  }
  return continuations;
}

function instructionDispatchContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkInstructionDispatchRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.rendering:instruction-dispatches:next-page", "Continue Aurelia framework instruction dispatch rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.rendering:instruction-slots", "instruction-slots", "Inspect instruction slots behind these dispatch edges."));
  continuations.push(projectionContinuation(inquiry, "framework.rendering:syntax-products", "syntax-products", "Inspect renderer syntax products behind these dispatch edges."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForInstructionDispatch(row);
    continuations.push({
      id: `framework.rendering:instruction-dispatches:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this renderer target dispatch.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind an instruction renderer dispatch edge."),
    });
    continuations.push({
      id: `framework.rendering:instruction-dispatches:binding-admissions:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect binding admissions produced while rendering this instruction slot.",
      inquiry: {
        lens: LensId.FrameworkRendering,
        locus: inquiry.locus,
        projection: "binding-admissions",
        filters: { query: row.rendererName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Binding admissions connected to one renderer dispatch edge."),
    });
  }
  return continuations;
}

function bindingProductContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingProductRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:binding-products:next-page", "Continue Aurelia framework binding product rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:syntax-products", "syntax-products", "Return to renderer syntax products that create these bindings."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:binding-admissions", "binding-admissions", "Inspect controller binding-list admissions for these bindings."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:binding-effects", "binding-effects", "Inspect lifecycle and setup effects inside these binding classes."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingProduct(row);
    continuations.push({
      id: `framework.discovery:binding-products:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this binding class.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a renderer-created binding class."),
    });
    continuations.push({
      id: `framework.discovery:binding-products:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this binding class.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a renderer-created binding class."),
    });
    continuations.push({
      id: `framework.discovery:binding-products:syntax-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect syntax products that create this binding class.",
      inquiry: {
        lens: LensId.FrameworkDiscovery,
        locus: inquiry.locus,
        projection: "syntax-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Syntax products connected to one binding class."),
    });
  }
  return continuations;
}

function bindingEffectContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingEffectRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:binding-effects:next-page", "Continue Aurelia framework binding effect rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:binding-products", "binding-products", "Inspect binding classes that own these effects."));
  if (rows.some((row) => row.effectKind === FrameworkBindingEffectKind.ObserverLookup)) {
    continuations.push(projectionContinuation(inquiry, "framework.discovery:observers", "observers", "Inspect observer-locator and observer/accessor exports behind these lookup effects."));
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingEffect(row);
    continuations.push({
      id: `framework.discovery:binding-effects:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this binding lifecycle/setup effect.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a binding lifecycle/setup effect."),
    });
    continuations.push({
      id: `framework.discovery:binding-effects:binding-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the binding product that owns this effect.",
      inquiry: {
        lens: LensId.FrameworkDiscovery,
        locus: inquiry.locus,
        projection: "binding-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Binding product connected to one effect row."),
    });
  }
  return continuations;
}

function bindingSetupContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingSetupRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.rendering:binding-setups:next-page", "Continue Aurelia framework binding setup rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.rendering:binding-products", "binding-products", "Inspect binding classes whose setup surface is invoked."));
  continuations.push(projectionContinuation(inquiry, "framework.rendering:binding-effects", "binding-effects", "Inspect binding-class effects that complement these external setup calls."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:observers", "observers", "Inspect observer/accessor/subscriber exports named by these setup calls."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingSetup(row);
    continuations.push({
      id: `framework.rendering:binding-setups:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this binding setup call.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a binding setup call."),
    });
    continuations.push({
      id: `framework.rendering:binding-setups:binding-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the binding product whose setup method is called here.",
      inquiry: {
        lens: LensId.FrameworkRendering,
        locus: inquiry.locus,
        projection: "binding-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Binding product connected to one setup edge."),
    });
  }
  return continuations;
}

function bindingAdmissionContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingAdmissionRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.discovery:binding-admissions:next-page", "Continue Aurelia framework binding admission rows.", nextOffset, limit));
  }
  continuations.push(projectionContinuation(inquiry, "framework.discovery:binding-products", "binding-products", "Inspect binding classes behind these admission edges."));
  continuations.push(projectionContinuation(inquiry, "framework.discovery:syntax-products", "syntax-products", "Inspect renderer/factory products that construct admitted bindings."));
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForBindingAdmission(row);
    continuations.push({
      id: `framework.discovery:binding-admissions:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this controller.addBinding admission call.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Source behind a controller binding admission edge."),
    });
    continuations.push({
      id: `framework.discovery:binding-admissions:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this binding admission call.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Type facts for a controller binding admission edge."),
    });
    continuations.push({
      id: `framework.discovery:binding-admissions:binding-products:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the binding product row admitted by this call.",
      inquiry: {
        lens: LensId.FrameworkDiscovery,
        locus: inquiry.locus,
        projection: "binding-products",
        filters: { bindingName: row.bindingName },
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Binding product connected to one admission edge."),
    });
  }
  return continuations;
}

function openQuestionContinuations(inquiry: Inquiry, nextOffset: number | undefined, limit: number): readonly Continuation[] {
  return nextOffset === undefined
    ? [projectionContinuation(inquiry, "framework.discovery:anchors", "anchors", "Return to seed anchors that can answer these questions.")]
    : [
      nextPageContinuation(inquiry, "framework.discovery:open-questions:next-page", "Continue framework discovery questions.", nextOffset, limit),
      projectionContinuation(inquiry, "framework.discovery:anchors", "anchors", "Return to seed anchors that can answer these questions."),
    ];
}

function projectionContinuation(inquiry: Inquiry, id: string, projection: string, rationale: string): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.AtlasContract], rationale),
  };
}

function nextPageContinuation(inquiry: Inquiry, id: string, rationale: string, nextOffset: number, limit: number): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      page: { size: limit, cursor: String(nextOffset) },
    },
    route: route(NavigationPlane.Addressing, NavigationRelation.NextPageOf, [], rationale),
  };
}

function declarationSelectorForAnchor(anchor: FrameworkDiscoveryAnchor) {
  return {
    scheme: SourceSelectorScheme.Declaration,
    name: anchor.source.symbolName,
    packageId: anchor.source.packageId,
    ...(anchor.source.declarationKind === undefined ? {} : { kind: anchor.source.declarationKind }),
  };
}

function sourceRangeForTarget(target: SourceTargetRow | undefined): SourceRange | null {
  if (target?.file === undefined || target.span === undefined) {
    return null;
  }
  return sourceRangeFromFileSpan(target.file.repoPath, target.span);
}

function sourceRangeForCallSiteEntry(callSite: TypeScriptCallSiteEntry): SourceRange {
  return sourceRangeFromFileSpan(callSite.file.repoPath, callSite.span);
}

function sourceRangeFromFileSpan(
  filePath: string,
  span: { readonly startLine: number; readonly startCharacter: number; readonly endLine: number; readonly endCharacter: number },
): SourceRange {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function externalFileIdentity(sourceProject: SourceProject, sourceFile: ts.SourceFile): SourceFileIdentity {
  return {
    absolutePath: sourceFile.fileName,
    repoPath: sourceFile.fileName.replace(/\\/gu, "/") as never,
    packageId: sourceProject.packageForFileName(sourceFile.fileName)?.id ?? null,
  };
}

function evidenceForFlow(flow: FrameworkFlowDefinition): Evidence {
  return {
    id: `framework.flow:${flow.flow}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${flow.flow}: ${flow.summary}`,
    data: flow,
  };
}

function evidenceForAnchorResolution(resolution: FrameworkAnchorResolution): Evidence {
  const firstCandidate = resolution.candidates[0];
  return {
    id: resolution.id,
    kind: resolution.anchor.source.auLinkId === undefined ? EvidenceKind.Symbol : EvidenceKind.AuLinkAnchor,
    role: EvidenceRole.Subject,
    confidence: resolution.status === FrameworkAnchorResolutionStatus.Resolved ? EvidenceConfidence.Exact : EvidenceConfidence.Strong,
    summary: `${resolution.anchor.source.packageId}:${resolution.anchor.source.symbolName} is ${resolution.status}`,
    ...(firstCandidate === undefined ? {} : { source: sourceRangeForFrameworkAnchorCandidate(firstCandidate) }),
    data: resolution,
  };
}

function evidenceForFlowSeed(seed: FrameworkFlowSeedRow): Evidence {
  const firstCandidate = seed.candidates[0];
  return {
    id: seed.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: firstCandidate === undefined ? EvidenceConfidence.Strong : EvidenceConfidence.Exact,
    summary: `${seed.anchorResolution.anchor.source.packageId}:${seed.anchorResolution.anchor.source.symbolName} -> ${seed.flow} is ${seed.status}`,
    ...(firstCandidate === undefined ? {} : { source: sourceRangeForFrameworkAnchorCandidate(firstCandidate) }),
    data: seed,
  };
}

function evidenceForCallEdge(row: FrameworkFlowCallEdgeRow): Evidence {
  const source = sourceRangeForFrameworkFlowCallEdge(row);
  return {
    id: row.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.flowSeed.flow}: ${row.edge.direction} call ${row.edge.from.name} -> ${row.edge.to.name}`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForCallTarget(row: FrameworkFlowCallTargetRow): Evidence {
  const firstEdge = row.edges[0];
  const source = firstEdge === undefined ? null : sourceRangeForFrameworkFlowCallEdge(firstEdge);
  return {
    id: row.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.flow}: ${row.direction} calls to ${row.targetPackageId ?? "<unknown>"}:${row.targetName} from ${row.anchorIds.length} anchor(s), ${row.edgeCount} edge row(s)`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForCallSite(row: FrameworkFlowCallSiteRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.flowSeed.flow}: ${row.callSite.kind} ${row.callSite.calleeName} with ${row.callSite.argumentCount} argument(s)`,
    source: sourceRangeForFrameworkFlowCallSite(row),
    data: row,
  };
}

function evidenceForPackageExport(row: FrameworkPackageExportRow): Evidence {
  const firstTarget = row.exportEntry.targets[0];
  const source = firstTarget === undefined || firstTarget.file === undefined || firstTarget.span === undefined
    ? null
    : {
      filePath: firstTarget.file.repoPath,
      start: {
        line: firstTarget.span.startLine - 1,
        character: firstTarget.span.startCharacter - 1,
      },
      end: {
        line: firstTarget.span.endLine - 1,
        character: firstTarget.span.endCharacter - 1,
      },
    };
  return {
    id: row.id,
    kind: EvidenceKind.Symbol,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportEntry.exportName}`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForDiInterface(row: FrameworkDiInterfaceExportRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportEntry.exportName} creates DI interface ${row.interfaceKey}`,
    source: sourceRangeForCallSiteEntry(row.createInterfaceCall),
    data: row,
  };
}

function evidenceForResourceCarrier(row: FrameworkResourceCarrierRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.sourceExportName} carries ${row.resourceKind}${row.resourceName === null ? "" : ` '${row.resourceName}'`} via ${row.carrierKind}`,
    source: row.source,
    data: row,
  };
}

function evidenceForResourceExport(row: FrameworkResourceExportRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportEntry.exportName} carries ${row.resourceKind}${row.resourceName === null ? "" : ` '${row.resourceName}'`} via ${row.carrierKind}`,
    source: row.source,
    data: row,
  };
}

function evidenceForBundle(row: FrameworkBundleExportRow): Evidence {
  const firstAssociation = row.associations[0];
  const firstTarget = concreteExportTarget(row.exportEntry.targets);
  const source = sourceRangeForTarget(firstTarget) ?? firstAssociation?.source ?? null;
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} has ${row.associations.length} evaluated registration association(s) from ${row.effectCount} effect(s)`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForBundleAssociation(row: FrameworkBundleAssociationRow): Evidence {
  return {
    id: row.id,
    kind: row.associationKind === FrameworkBundleAssociationKind.ResourceRegistration ? EvidenceKind.ResourceDefinition : EvidenceKind.DiRegistration,
    role: EvidenceRole.Support,
    confidence: row.associationKind === FrameworkBundleAssociationKind.UnknownRegistrationArgument ? EvidenceConfidence.Unknown : EvidenceConfidence.Strong,
    summary: `${row.exportName} ${row.associationKind}${row.targetName === null ? "" : ` ${row.targetName}`}`,
    source: row.source,
    data: row,
  };
}

function evidenceForSyntaxProduct(row: FrameworkSyntaxProductRow): Evidence {
  const product = row.instructionName ?? row.bindingName ?? row.instructionTarget ?? row.expression.text;
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.producerName} ${row.productKind} ${product}`,
    source: row.source,
    data: row,
  };
}

function evidenceForInstructionSlot(row: FrameworkInstructionSlotRow): Evidence {
  const declarations = row.instructionDeclarations.map((declaration) => declaration.instructionName).join(", ");
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.slotName} = ${row.slotValue ?? "unknown"}${declarations.length === 0 ? "" : ` declares ${declarations}`} and has ${row.syntaxProducts.length} syntax product(s)`,
    source: row.source,
    data: row,
  };
}

function evidenceForInstructionDispatch(row: FrameworkInstructionDispatchRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.slotName} dispatches to ${row.rendererName}${row.instructionName === null ? "" : ` for ${row.instructionName}`}`,
    source: row.source,
    data: row,
  };
}

function evidenceForBindingProduct(row: FrameworkBindingProductRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.bindingName} has ${row.constructionProducts.length} construction product(s), ${row.admissions.length} admission edge(s), lifecycle [${row.lifecycleMethods.join(", ")}], and ${row.observerLocatorCallSites.length} observer-locator call(s)`,
    source: row.source,
    data: row,
  };
}

function evidenceForBindingAdmission(row: FrameworkBindingAdmissionRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.producerName} admits ${row.bindingName} into ${row.controllerExpression} via ${row.constructionKind}`,
    source: row.source,
    data: row,
  };
}

function evidenceForBindingEffect(row: FrameworkBindingEffectRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.bindingName}.${row.methodName} exposes ${row.effectKind} ${row.effectName}`,
    source: row.source,
    data: row,
  };
}

function evidenceForBindingSetup(row: FrameworkBindingSetupRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.producerName} calls ${row.bindingName}.${row.setupMethodName} via ${row.setupKind}`,
    source: row.source,
    data: row,
  };
}

function evidenceForObserverEntity(row: FrameworkObserverEntityRow): Evidence {
  const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} observer roles [${row.observerKinds.join(", ")}] capabilities [${row.observerCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForAppTaskEntity(row: FrameworkAppTaskEntityRow): Evidence {
  const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} AppTask roles [${row.appTaskKinds.join(", ")}] capabilities [${row.appTaskCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForRouterEntity(row: FrameworkRouterEntityRow): Evidence {
  const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} router roles [${row.routerKinds.join(", ")}] capabilities [${row.routerCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForExpressionEntity(row: FrameworkExpressionEntityRow): Evidence {
  const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} expression roles [${row.expressionKinds.join(", ")}] capabilities [${row.expressionCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForRenderingStructure(row: FrameworkRenderingStructureEntityRow): Evidence {
  const source = sourceRangeForTarget(concreteExportTarget(row.exportEntry.targets));
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} rendering roles [${row.renderingStructureKinds.join(", ")}] capabilities [${row.renderingCapabilities.join(", ")}]`,
    ...(source === null ? {} : { source }),
    data: row,
  };
}

function evidenceForQuestion(question: string, index: number): Evidence {
  return {
    id: `framework.question:${index}`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: question,
  };
}

function pageInfo(inquiry: Inquiry, returned: number, total: number, limit: number, nextOffset: number | undefined) {
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
  const nextOffset = offset + page.length < rows.length ? offset + page.length : undefined;
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
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}

function frameworkDiscoverySeedBasis(): Basis {
  return {
    kind: BasisKind.AtlasContract,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Contract,
    freshness: BasisFreshness.Static,
    summary: "Answered from the package-local Aurelia framework discovery seeds.",
    identity: "@aurelia-ls/atlas/framework",
    version: FRAMEWORK_DISCOVERY_SEEDS.schemaVersion,
  };
}

function sourceIndexBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary: "Resolved framework seed anchors against the daemon-prewarmed source declaration index.",
    identity: sourceProject.snapshot().identity,
  };
}

function checkerBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary: "Answered from precomputed TypeScript call hierarchy over framework flow seed declarations.",
    identity: sourceProject.snapshot().identity,
  };
}

function staticEvaluatorBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.StaticEvaluator,
    closure: BasisClosure.Budgeted,
    authority: BasisAuthority.Evaluator,
    freshness: BasisFreshness.Live,
    summary: "Answered from Atlas static invocation/effect tracing over checker-selected framework source roots.",
    identity: sourceProject.snapshot().identity,
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
