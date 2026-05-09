import type { EvaluationEffectCertainty } from "../../evaluation/index.js";
import type {
  FrameworkAnchorResolution,
  FrameworkFlowCallEdgeRow,
  FrameworkFlowCallSiteRow,
  FrameworkFlowCallTargetRow,
  FrameworkFlowDefinition,
  FrameworkFlowSeedRow,
  FrameworkExportCapability,
  FrameworkResourceDefinitionKind,
  FrameworkSyntaxProducerKind,
  FrameworkSyntaxProductKind,
} from "../../framework/index.js";
import type { FrameworkBundleAssociationKind } from "../../framework/admission.js";
import type {
  SourceDeclarationKind,
  TypeScriptCallSiteEntry,
  TypeScriptExpressionFact,
  TypeScriptExportSurfaceEntry,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkDiscoveryRecipeRow } from "./framework-recipes.js";
import type { FrameworkHydrationFlowRow } from "./framework-rendering-hydration-flow.js";
import type { FrameworkRenderConsequenceRow } from "./framework-rendering-consequences.js";
import type {
  FrameworkBindingAdmissionSummaryRow,
  FrameworkBindingProductSummaryRow,
  FrameworkControllerCreationSummaryRow,
  FrameworkInstructionDispatchSummaryRow,
  FrameworkInstructionSlotSummaryRow,
  FrameworkSyntaxProductSummaryRow,
} from "./framework-rendering-public-rows.js";
import type { FrameworkRenderingRelationshipRow } from "./framework-rendering-relationships.js";

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
  /** Calibrated cross-lens recipe examples for framework navigation. */
  readonly recipes?: readonly FrameworkDiscoveryRecipeRow[];
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
  /** Derived rendering relationship count after filtering, when computed. */
  readonly renderingRelationshipCount?: number;
  /** Controller creation flow count after filtering, when computed. */
  readonly controllerCreationCount?: number;
  /** Compact hydration/runtime rendering corridor row count after filtering, when computed. */
  readonly hydrationFlowCount?: number;
  /** Hydration-flow visibility mode for the current inquiry. */
  readonly hydrationFlowMode?: "overview" | "filtered";
  /** Total source-backed hydration-flow rows before overview/detail selection. */
  readonly hydrationFlowTotalCount?: number;
  /** Source-backed hydration-flow rows included in the default overview. */
  readonly hydrationFlowOverviewCount?: number;
  /** Hydration-flow row counts grouped by coarse runtime stage. */
  readonly hydrationStages?: Readonly<Record<string, number>>;
  /** Hydration-flow row counts grouped by runtime operation. */
  readonly hydrationOperations?: Readonly<Record<string, number>>;
  /** Hydration-flow row counts grouped by semantic target kind. */
  readonly hydrationTargetKinds?: Readonly<Record<string, number>>;
  /** Compact renderer consequence row count after filtering, when computed. */
  readonly renderConsequenceCount?: number;
  /** Render-consequence visibility mode for the current inquiry. */
  readonly renderConsequenceMode?: "overview" | "filtered";
  /** Total render-consequence rows before overview/detail selection. */
  readonly renderConsequenceTotalCount?: number;
  /** Render-consequence rows included in the default overview. */
  readonly renderConsequenceOverviewCount?: number;
  /** Render-consequence row counts grouped by compact kind. */
  readonly renderConsequenceKinds?: Readonly<Record<string, number>>;
  /** Render-consequence row counts grouped by runtime/source mechanism. */
  readonly renderConsequenceMechanisms?: Readonly<Record<string, number>>;
  /** Render-consequence row counts grouped by rendering/runtime phase. */
  readonly renderConsequencePhases?: Readonly<Record<string, number>>;
  /** Recursive renderer dispatch count inside controller creation flows, when computed. */
  readonly recursiveDispatchCount?: number;
  /** Relationship counts grouped by semantic relation. */
  readonly relationshipRelations?: Readonly<Record<string, number>>;
  /** Relationship counts grouped by runtime/source mechanism. */
  readonly relationshipMechanisms?: Readonly<Record<string, number>>;
  /** Relationship counts grouped by compiler/rendering/lifecycle phase. */
  readonly relationshipPhases?: Readonly<Record<string, number>>;
  /** Compact syntax/resource producers and the instruction or binding products they expose. */
  readonly syntaxProducts?: readonly FrameworkSyntaxProductSummaryRow[];
  /** Compact instruction discriminator constants joined to declarations and syntax products. */
  readonly instructionSlots?: readonly FrameworkInstructionSlotSummaryRow[];
  /** Compact instruction slot to renderer dispatch rows. */
  readonly instructionDispatches?: readonly FrameworkInstructionDispatchSummaryRow[];
  /** Compact renderer flows that create/admit child controllers during hydration. */
  readonly controllerCreations?: readonly FrameworkControllerCreationSummaryRow[];
  /** Compact source-backed hydration/runtime rendering corridor rows. */
  readonly hydrationFlow?: readonly FrameworkHydrationFlowRow[];
  /** Compact renderer consequence rows over dispatch, controller, binding, lifecycle, and observation effects. */
  readonly renderConsequences?: readonly FrameworkRenderConsequenceRow[];
  /** Compact binding classes joined to construction, admission, lifecycle, and observer surfaces. */
  readonly bindingProducts?: readonly FrameworkBindingProductSummaryRow[];
  /** Compact controller.addBinding admission edges for framework binding-like products. */
  readonly bindingAdmissions?: readonly FrameworkBindingAdmissionSummaryRow[];
  /** Binding lifecycle and setup effect rows discovered inside binding classes. */
  readonly bindingEffects?: readonly FrameworkBindingEffectRow[];
  /** Binding setup calls that alter target observers, accessors, or subscribers outside the binding class. */
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  /** Derived rendering graph relationships across compiler, renderer, binding, and observer surfaces. */
  readonly renderingRelationships?: readonly FrameworkRenderingRelationshipRow[];
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

/** Evaluator-visible registry/configuration export shape. */
export const enum FrameworkBundleKind {
  /** Export exposes register/customize/init-like configuration behavior. */
  Configuration = "configuration",
  /** Export is an array/catalog of registration values. */
  RegistrationCatalog = "registration-catalog",
  /** Export is a concrete registry with evaluator-visible register effects. */
  Registry = "registry",
}

/** Exported Aurelia DI interface symbol discovered from createInterface call provenance. */
export interface FrameworkDiInterfaceExportRow
  extends FrameworkPackageExportRow {
  /** Interface key/name supplied to createInterface, or the export name when omitted. */
  readonly interfaceKey: string;
  /** Exact createInterface call that produced the exported InterfaceSymbol. */
  readonly createInterfaceCall: TypeScriptCallSiteEntry;
  /** Resolver-builder calls observed inside the createInterface builder callback. */
  readonly builderCalls: readonly TypeScriptCallSiteEntry[];
  /** True when the InterfaceSymbol call is nested inside another expression such as Object.assign(...). */
  readonly indirect: boolean;
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
  /** Backing declaration/source-export range, which may differ from the exact resource carrier span. */
  readonly declarationSource: SourceRange;
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
  /** Backing declaration/source-export range, which may differ from the exact resource carrier span. */
  readonly declarationSource: SourceRange;
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
  readonly certainty: EvaluationEffectCertainty;
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
  /** Coarse source shape for this spendable registry/configuration export. */
  readonly bundleKind: FrameworkBundleKind;
  /** Number of array/catalog elements, when this row comes from an exported catalog. */
  readonly catalogElementCount?: number;
  /** Number of evaluator effects observed while tracing the register member. */
  readonly effectCount: number;
  /** Normalized registration associations discovered from evaluator effects. */
  readonly associations: readonly FrameworkBundleAssociationRow[];
  /** Number of evaluator open seams observed while tracing this bundle. */
  readonly openSeamCount: number;
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

/** Renderer flow that creates and admits a child Controller during hydration. */
export interface FrameworkControllerCreationRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the renderer. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Renderer export/class that owns the flow. */
  readonly rendererName: string;
  /** Resource kind hydrated by this renderer flow. */
  readonly resourceKind: FrameworkResourceDefinitionKind;
  /** Instruction class/interface/type consumed by this renderer. */
  readonly instructionName: string | null;
  /** Instruction discriminator target expression such as itHydrateElement. */
  readonly instructionTarget: string | null;
  /** Parent controller expression received by render(...). */
  readonly parentControllerExpression: string;
  /** Child controller local expression admitted to the parent. */
  readonly childControllerExpression: string;
  /** View-model construction or invocation call when visible. */
  readonly viewModelCall: TypeScriptCallSiteEntry | null;
  /** View-factory creation call for template-controller synthetic views, when visible. */
  readonly viewFactoryCall: TypeScriptCallSiteEntry | null;
  /** Render-location conversion call for template-controller anchors, when visible. */
  readonly renderLocationCall: TypeScriptCallSiteEntry | null;
  /** Controller factory call such as Controller.$el(...) or Controller.$attr(...). */
  readonly controllerFactoryCall: TypeScriptCallSiteEntry;
  /** Ref registration call that records a child controller by key/location, when visible. */
  readonly referenceRegistrationCall: TypeScriptCallSiteEntry | null;
  /** Parent addChild(...) admission call when visible. */
  readonly childAdmissionCall: TypeScriptCallSiteEntry | null;
  /** Recursive renderer dispatches that render property instructions into the child controller. */
  readonly recursiveDispatchCalls: readonly TypeScriptCallSiteEntry[];
  /** Template-controller link hook call when visible. */
  readonly linkCall: TypeScriptCallSiteEntry | null;
  /** Ordered source-backed handoff steps inside the renderer hydration flow. */
  readonly hydrationSteps: readonly FrameworkControllerHydrationStepRow[];
  /** Exact renderer method source range. */
  readonly source: SourceRange;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Step kind inside a renderer-owned controller hydration handoff. */
export type FrameworkControllerHydrationStepKind =
  | "view-factory-creation"
  | "render-location"
  | "view-model-invocation"
  | "controller-creation"
  | "reference-registration"
  | "template-controller-link"
  | "recursive-dispatch"
  | "child-admission";

/** One ordered call-site step inside a renderer-owned controller hydration handoff. */
export interface FrameworkControllerHydrationStepRow {
  /** Zero-based order after sorting source call sites inside the renderer method. */
  readonly order: number;
  /** Semantic role played by the call site. */
  readonly stepKind: FrameworkControllerHydrationStepKind;
  /** Exact checker-backed call site for this step. */
  readonly callSite: TypeScriptCallSiteEntry;
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

/** Public framework export that belongs to the observer/reactivity side system. */
export interface FrameworkObserverEntityRow extends FrameworkPackageExportRow {
  /** Observation/reactivity semantic roles carried by this export. */
  readonly observerKinds: readonly FrameworkObserverEntityKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkCatalogExportShape;
  /** Capabilities inferred from TypeChecker facts, DI provenance, and stable observer role shape. */
  readonly observerCapabilities: readonly FrameworkObserverCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkCatalogMatchRow[];
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
  /** DI interface creation or resolver builder tied the export to a semantic catalog. */
  DiInterface = "di-interface",
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
export interface FrameworkExpressionEntityRow
  extends FrameworkPackageExportRow {
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
  Scope = "scope",
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
export interface FrameworkRenderingStructureEntityRow
  extends FrameworkPackageExportRow {
  /** Rendering/lifecycle structural roles carried by this export. */
  readonly renderingStructureKinds: readonly FrameworkRenderingStructureKind[];
  /** Public export declaration shape. */
  readonly exportShape: FrameworkCatalogExportShape;
  /** Rendering capabilities inferred from TypeChecker facts and stable rendering role shape. */
  readonly renderingCapabilities: readonly FrameworkRenderingCapability[];
  /** Exact match provenance for this classification. */
  readonly matchedBy: readonly FrameworkCatalogMatchRow[];
}
