import { BasisKind } from "../inquiry/basis.js";
import { EvidenceKind } from "../inquiry/evidence.js";
import { NavigationRelation } from "../inquiry/navigation.js";
import { SourceDeclarationKind } from "../source/index.js";

/** Schema marker for the provisional Aurelia framework discovery seeds. */
export const FRAMEWORK_DISCOVERY_SEEDS_VERSION = "framework-discovery-seeds-v1";

/** Discovery phase for one anchor or framework flow. */
export const enum FrameworkDiscoveryPhase {
  /** Human-seeded handle used to begin exact inquiry. */
  Seed = "seed",
  /** Exact source/type evidence exists but no semantic route index owns it yet. */
  Indexed = "indexed",
  /** Static evaluator or framework-specific reader has modeled part of this area. */
  Modeled = "modeled",
  /** The area has stable route continuations and known unresolved boundaries. */
  Routed = "routed",
}

/** Aurelia semantic domain. Domains classify meaning, not route mechanics. */
export const enum FrameworkSemanticDomain {
  /** Application entry and root world formation. */
  Application = "application",
  /** Dependency injection keys, providers, containers, and lookup paths. */
  DependencyInjection = "dependency-injection",
  /** Configuration, plugin, and app-task registration landscape. */
  Configuration = "configuration",
  /** Resource definitions, registries, and resource lookup. */
  Resource = "resource",
  /** Template compiler, syntax interpretation, commands, and instruction production. */
  Compiler = "compiler",
  /** Compiler instruction shapes and renderer consumption. */
  Instruction = "instruction",
  /** Rendering, hydration, controller creation, and view/controller graph formation. */
  Rendering = "rendering",
  /** Bind, attach, detach, unbind, dispose, and activation ordering. */
  Lifecycle = "lifecycle",
  /** Binding instances, expressions, and update paths. */
  Binding = "binding",
  /** Scope, binding context, override context, and context movement. */
  Scope = "scope",
  /** Observation, subscription, effect, signal, and update propagation. */
  Reactivity = "reactivity",
  /** Router package and route activation landscape. */
  Routing = "routing",
  /** Platform and DOM abstraction boundary. */
  Platform = "platform",
  /** Product-to-framework provenance and mirror pressure. */
  Bridge = "bridge",
  /** Error, recovery, and diagnostic policy. */
  ErrorPolicy = "error-policy",
}

/** Aurelia framework flow. Flows are behavior corridors, not generic source/type affordances. */
export const enum FrameworkFlowKind {
  /** Application facade entry, app config acceptance, and start/stop boundaries. */
  Startup = "startup",
  /** Root world construction before rendering begins. */
  WorldFormation = "world-formation",
  /** DI key, resolver, provider, or instance publication. */
  Registration = "registration",
  /** DI key, resolver, parent/root, or service locator lookup. */
  Lookup = "lookup",
  /** Plugin, fluent configuration, or app-task setup. */
  PluginConfiguration = "plugin-configuration",
  /** Resource definition construction or declaration extraction. */
  ResourceDefinition = "resource-definition",
  /** Resource registry, scope, or compiler lookup. */
  ResourceLookup = "resource-lookup",
  /** Template compilation and recursive compilation. */
  Compilation = "compilation",
  /** Compiler instruction creation and emitted instruction shape. */
  InstructionEmission = "instruction-emission",
  /** Renderer or hydrator consumption of compiler instructions. */
  InstructionConsumption = "instruction-consumption",
  /** Hydration of host, controller, view, and child components. */
  Hydration = "hydration",
  /** Rendering and view/controller graph construction. */
  Rendering = "rendering",
  /** Activation and deactivation entrypoints around bind/attach state. */
  Activation = "activation",
  /** Lifecycle propagation across controllers, children, and async paths. */
  LifecyclePropagation = "lifecycle-propagation",
  /** Binding instance setup, expression access, and update handoff. */
  Binding = "binding",
  /** Scope and binding-context creation, inheritance, or replacement. */
  ScopePropagation = "scope-propagation",
  /** Observer, signal, subscriber, or effect setup. */
  ReactivitySetup = "reactivity-setup",
  /** Router configuration, route recognition, navigation, endpoint, and viewport activation. */
  Routing = "routing",
  /** Product-to-framework auLink pressure that names emulation obligations. */
  MirrorPressure = "mirror-pressure",
}

/** Structural member capability observed on a framework package export. */
export const enum FrameworkExportCapability {
  /** Exported value exposes a register member and can participate in container admission. */
  Register = "register",
  /** Exported value exposes a customize member and can produce option/customization pressure. */
  Customize = "customize",
  /** Exported value exposes an init member and can start a builder-style configuration flow. */
  Init = "init",
  /** Exported value exposes a withStore member and can extend state-style builder configuration. */
  WithStore = "with-store",
  /** Exported value exposes a withChild member and can specialize child-scope configuration. */
  WithChild = "with-child",
  /** Exported value exposes an optionsProvider member or field. */
  OptionsProvider = "options-provider",
}

/** Source-facing handle for a seed anchor. */
export interface FrameworkSourceHint {
  /** Aurelia framework package id as admitted by the Atlas source project. */
  readonly packageId: string;
  /** Exported or top-level framework symbol name. */
  readonly symbolName: string;
  /** Optional declaration kind when known. */
  readonly declarationKind?: SourceDeclarationKind;
  /** Optional auLink id when semantic-runtime already has a product mirror anchor. */
  readonly auLinkId?: string;
}

/** One provisional anchor in the framework discovery seeds. */
export interface FrameworkDiscoveryAnchor {
  /** Stable anchor id for future continuation handles. */
  readonly id: string;
  /** Human-readable anchor name. */
  readonly label: string;
  /** Semantic domains this anchor can reveal. */
  readonly domains: readonly FrameworkSemanticDomain[];
  /** Current discovery phase. */
  readonly phase: FrameworkDiscoveryPhase;
  /** Exact source-level hint used to begin inquiry. */
  readonly source: FrameworkSourceHint;
  /** Aurelia behavior flows expected to become useful from this anchor. */
  readonly flows: readonly FrameworkFlowKind[];
  /** Generic inquiry relations useful before a framework index owns the flow. */
  readonly navigation: readonly NavigationRelation[];
  /** Grounded reason this anchor is useful as a starting handle. */
  readonly summary: string;
  /** Open questions this anchor should help answer. */
  readonly questions: readonly string[];
}

/** One framework flow with its source of authority and expected witnesses. */
export interface FrameworkFlowDefinition {
  /** Framework flow identifier. */
  readonly flow: FrameworkFlowKind;
  /** Domains that own or participate in this flow. */
  readonly domains: readonly FrameworkSemanticDomain[];
  /** What this flow should eventually answer. */
  readonly summary: string;
  /** Inquiry route relations that usually precede this semantic flow. */
  readonly navigation: readonly NavigationRelation[];
  /** Basis kinds that can honestly support indexed rows for this flow. */
  readonly requiredBasis: readonly BasisKind[];
  /** Evidence kinds expected in this flow. */
  readonly evidenceKinds: readonly EvidenceKind[];
}

/** Provisional framework discovery seeds consumed by future boot indexes and lenses. */
export interface FrameworkDiscoverySeeds {
  /** Schema marker for compaction-safe orientation. */
  readonly schemaVersion: typeof FRAMEWORK_DISCOVERY_SEEDS_VERSION;
  /** Operating rules for future framework indexing work. */
  readonly principles: readonly string[];
  /** Framework flow definitions currently recognized by the workbench. */
  readonly flows: readonly FrameworkFlowDefinition[];
  /** Provisional framework anchors used to seed exact inquiry. */
  readonly anchors: readonly FrameworkDiscoveryAnchor[];
  /** Questions that should remain visible until evidence closes or refines them. */
  readonly openQuestions: readonly string[];
}

/** Framework flows recognized by the initial discovery workbench. */
export const FRAMEWORK_FLOW_DEFINITIONS: readonly FrameworkFlowDefinition[] = [
  {
    flow: FrameworkFlowKind.Startup,
    domains: [FrameworkSemanticDomain.Application, FrameworkSemanticDomain.Configuration],
    summary: "Application facade entry, app config acceptance, start/stop calls, and transition into world formation.",
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.CallHierarchyOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.SourceSpan, EvidenceKind.TypeFact],
  },
  {
    flow: FrameworkFlowKind.WorldFormation,
    domains: [FrameworkSemanticDomain.Application, FrameworkSemanticDomain.DependencyInjection, FrameworkSemanticDomain.Rendering],
    summary: "Root container, app root, host, component, platform, and task state formed before rendering begins.",
    navigation: [NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.DiRegistration, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam],
  },
  {
    flow: FrameworkFlowKind.Registration,
    domains: [FrameworkSemanticDomain.DependencyInjection, FrameworkSemanticDomain.Configuration],
    summary: "DI key, resolver, provider, alias, singleton, transient, callback, and instance publication.",
    navigation: [NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.DiRegistration, EvidenceKind.TypeFact, EvidenceKind.CallSite],
  },
  {
    flow: FrameworkFlowKind.Lookup,
    domains: [FrameworkSemanticDomain.DependencyInjection],
    summary: "Container, resolver, service locator, parent/root, optional, and cached lookup reads.",
    navigation: [NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.DiLookup, EvidenceKind.TypeFact, EvidenceKind.CallSite],
  },
  {
    flow: FrameworkFlowKind.PluginConfiguration,
    domains: [FrameworkSemanticDomain.Configuration, FrameworkSemanticDomain.DependencyInjection],
    summary: "Plugin registration, fluent configuration helpers, package configuration, and app-task setup.",
    navigation: [NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.DiRegistration, EvidenceKind.SourceSpan],
  },
  {
    flow: FrameworkFlowKind.ResourceDefinition,
    domains: [FrameworkSemanticDomain.Resource, FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Rendering],
    summary: "Custom element, custom attribute, template-controller, binding command, value converter, and behavior definitions.",
    navigation: [NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan],
  },
  {
    flow: FrameworkFlowKind.Compilation,
    domains: [FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Resource, FrameworkSemanticDomain.Instruction],
    summary: "Template compilation, syntax interpretation, resource resolution, and recursive compilation branches.",
    navigation: [NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.TypeFact, EvidenceKind.OpenSeam],
  },
  {
    flow: FrameworkFlowKind.InstructionEmission,
    domains: [FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Instruction],
    summary: "Instruction object creation and emitted compiler output shapes.",
    navigation: [NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan, EvidenceKind.CallSite],
  },
  {
    flow: FrameworkFlowKind.InstructionConsumption,
    domains: [FrameworkSemanticDomain.Instruction, FrameworkSemanticDomain.Rendering],
    summary: "Renderer and hydrator consumption of compiler instruction rows.",
    navigation: [NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.CallSite, EvidenceKind.SourceSpan],
  },
  {
    flow: FrameworkFlowKind.Hydration,
    domains: [FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Resource, FrameworkSemanticDomain.Lifecycle],
    summary: "Host, controller, view, child component, and custom element hydration.",
    navigation: [NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.TypeFact, EvidenceKind.OpenSeam],
  },
  {
    flow: FrameworkFlowKind.LifecyclePropagation,
    domains: [FrameworkSemanticDomain.Lifecycle, FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Binding],
    summary: "Bind, attach, detach, unbind, dispose, child recursion, and promise-aware lifecycle ordering.",
    navigation: [NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.TypeFact, EvidenceKind.OpenSeam],
  },
  {
    flow: FrameworkFlowKind.Binding,
    domains: [FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Scope, FrameworkSemanticDomain.Reactivity],
    summary: "Binding instance setup, expression context access, update handoff, and connectable participation.",
    navigation: [NavigationRelation.CallHierarchyOf, NavigationRelation.TypeFactsFor, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.CallSite, EvidenceKind.SourceSpan],
  },
  {
    flow: FrameworkFlowKind.ScopePropagation,
    domains: [FrameworkSemanticDomain.Scope, FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Lifecycle],
    summary: "Scope, binding context, override context, parent scope, and contextual lookup movement.",
    navigation: [NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan],
  },
  {
    flow: FrameworkFlowKind.ReactivitySetup,
    domains: [FrameworkSemanticDomain.Reactivity, FrameworkSemanticDomain.Binding],
    summary: "Observer, subscriber, connectable, signal, effect, and scheduled update setup.",
    navigation: [NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.CallSite, EvidenceKind.SourceSpan],
  },
  {
    flow: FrameworkFlowKind.Routing,
    domains: [FrameworkSemanticDomain.Routing, FrameworkSemanticDomain.Configuration, FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Lifecycle],
    summary: "Router configuration, route recognition, navigation instruction processing, endpoint/viewport activation, and routed lifecycle handoff.",
    navigation: [NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf, NavigationRelation.FrameworkFlowOf, NavigationRelation.SeamFor],
    requiredBasis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.CallSite, EvidenceKind.SourceSpan, EvidenceKind.OpenSeam],
  },
  {
    flow: FrameworkFlowKind.MirrorPressure,
    domains: [FrameworkSemanticDomain.Bridge],
    summary: "Product-to-framework auLink pressure that names semantic-runtime emulation obligations.",
    navigation: [NavigationRelation.MirrorTargetOf, NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor],
    requiredBasis: [BasisKind.AuLink, BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.AuLinkAnchor, EvidenceKind.Symbol, EvidenceKind.OpenSeam],
  },
];

/** Initial seed anchors. They are handles for discovery, not the final framework taxonomy. */
export const FRAMEWORK_DISCOVERY_SEED_ANCHORS: readonly FrameworkDiscoveryAnchor[] = [
  {
    id: "application.runtime-html-aurelia",
    label: "runtime-html:Aurelia",
    domains: [FrameworkSemanticDomain.Application, FrameworkSemanticDomain.Configuration, FrameworkSemanticDomain.DependencyInjection],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "Aurelia", declarationKind: SourceDeclarationKind.Class, auLinkId: "runtime-html:Aurelia" },
    flows: [FrameworkFlowKind.Startup, FrameworkFlowKind.WorldFormation, FrameworkFlowKind.PluginConfiguration, FrameworkFlowKind.Registration, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.CallHierarchyOf, NavigationRelation.MirrorTargetOf],
    summary: "Primary runtime-html application facade and startup handle.",
    questions: [
      "What exact world is created before start resolves?",
      "Which app tasks and registrations participate in startup?",
      "Where do user component, host, container, and platform assumptions enter?",
    ],
  },
  {
    id: "application.aggregator-aurelia",
    label: "aurelia:Aurelia",
    domains: [FrameworkSemanticDomain.Application, FrameworkSemanticDomain.Configuration],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "aurelia", symbolName: "Aurelia", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.Startup, FrameworkFlowKind.WorldFormation, FrameworkFlowKind.PluginConfiguration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.CallHierarchyOf],
    summary: "Umbrella package facade over runtime-html application startup.",
    questions: [
      "Which setup is introduced by the umbrella facade before reaching runtime-html?",
      "Where should aggregator package semantics be collapsed or preserved?",
    ],
  },
  {
    id: "di.container",
    label: "kernel:Container",
    domains: [FrameworkSemanticDomain.DependencyInjection],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "kernel", symbolName: "Container", declarationKind: SourceDeclarationKind.Class, auLinkId: "kernel:Container" },
    flows: [FrameworkFlowKind.Registration, FrameworkFlowKind.Lookup, FrameworkFlowKind.WorldFormation, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf, NavigationRelation.MirrorTargetOf],
    summary: "Core container implementation that publishes and resolves the framework world.",
    questions: [
      "Which resolver strategies and parent/root traversal rules must semantic-runtime emulate?",
      "Which calls mutate container state versus only read provider state?",
    ],
  },
  {
    id: "di.icontainer",
    label: "kernel:IContainer",
    domains: [FrameworkSemanticDomain.DependencyInjection],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "kernel", symbolName: "IContainer", declarationKind: SourceDeclarationKind.Interface, auLinkId: "kernel:IContainer" },
    flows: [FrameworkFlowKind.Lookup, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.MirrorTargetOf],
    summary: "Public DI contract that many packages consume rather than concrete Container.",
    questions: [
      "Which public contract members are semantic obligations and which are convenience surface?",
      "Where do framework packages type against IContainer instead of Container?",
    ],
  },
  {
    id: "compiler.template-compiler",
    label: "template-compiler:TemplateCompiler",
    domains: [FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Resource, FrameworkSemanticDomain.Instruction],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "template-compiler", symbolName: "TemplateCompiler", declarationKind: SourceDeclarationKind.Class, auLinkId: "template-compiler:TemplateCompiler" },
    flows: [FrameworkFlowKind.Compilation, FrameworkFlowKind.InstructionEmission, FrameworkFlowKind.ResourceLookup, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.CallHierarchyOf, NavigationRelation.MirrorTargetOf],
    summary: "Main template compiler anchor for instruction production and recursive compilation discovery.",
    questions: [
      "Which resource, syntax, and binding-command inputs shape compiler output?",
      "Where does recursive compilation begin, and which outputs feed rendering?",
    ],
  },
  {
    id: "rendering.controller",
    label: "runtime-html:Controller",
    domains: [FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Lifecycle, FrameworkSemanticDomain.Scope],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "Controller", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.Hydration, FrameworkFlowKind.Rendering, FrameworkFlowKind.Activation, FrameworkFlowKind.LifecyclePropagation, FrameworkFlowKind.ScopePropagation],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "Controller/view lifecycle anchor for hydration, binding, activation, and child controller routes.",
    questions: [
      "Which controller states gate bind/attach/detach/unbind?",
      "How does lifecycle recursion flow through children and views?",
    ],
  },
  {
    id: "rendering.app-root",
    label: "runtime-html:AppRoot",
    domains: [FrameworkSemanticDomain.Application, FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Lifecycle],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "AppRoot", declarationKind: SourceDeclarationKind.Class, auLinkId: "runtime-html:AppRoot" },
    flows: [FrameworkFlowKind.WorldFormation, FrameworkFlowKind.Hydration, FrameworkFlowKind.Rendering, FrameworkFlowKind.LifecyclePropagation, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.CallHierarchyOf, NavigationRelation.MirrorTargetOf],
    summary: "Application root controller/host bridge for startup-to-rendering handoff.",
    questions: [
      "How does root config become a host/component/controller relationship?",
      "Where does root lifecycle differ from nested component lifecycle?",
    ],
  },
  {
    id: "resource.custom-element-definition",
    label: "runtime-html:CustomElementDefinition",
    domains: [FrameworkSemanticDomain.Resource, FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Rendering],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "CustomElementDefinition", declarationKind: SourceDeclarationKind.Class, auLinkId: "runtime-html:CustomElementDefinition" },
    flows: [FrameworkFlowKind.ResourceDefinition, FrameworkFlowKind.ResourceLookup, FrameworkFlowKind.Compilation, FrameworkFlowKind.Hydration, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.MirrorTargetOf],
    summary: "Custom element resource definition anchor for compiler/rendering handoff.",
    questions: [
      "Which definition fields are required by compiler output and hydration?",
      "Which static definition helpers need evaluator support?",
    ],
  },
  {
    id: "compiler.hydrate-element-instruction",
    label: "template-compiler:HydrateElementInstruction",
    domains: [FrameworkSemanticDomain.Instruction, FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Rendering],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "template-compiler", symbolName: "HydrateElementInstruction", declarationKind: SourceDeclarationKind.Interface },
    flows: [FrameworkFlowKind.InstructionEmission, FrameworkFlowKind.InstructionConsumption, FrameworkFlowKind.Hydration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf],
    summary: "Instruction shape likely involved in compiler-to-renderer handoff.",
    questions: [
      "Which renderer consumes this instruction shape?",
      "Which fields connect compiled resources to controller creation?",
    ],
  },
  {
    id: "scope.scope",
    label: "runtime:Scope",
    domains: [FrameworkSemanticDomain.Scope, FrameworkSemanticDomain.Binding],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime", symbolName: "Scope", declarationKind: SourceDeclarationKind.Class, auLinkId: "runtime:Scope" },
    flows: [FrameworkFlowKind.ScopePropagation, FrameworkFlowKind.Binding, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.MirrorTargetOf],
    summary: "Runtime scope anchor for binding context and override-context movement.",
    questions: [
      "Where are scopes created, inherited, replaced, or captured?",
      "Which binding and lifecycle routes depend on scope shape?",
    ],
  },
  {
    id: "scope.binding-context",
    label: "runtime:BindingContext",
    domains: [FrameworkSemanticDomain.Scope, FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Reactivity],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime", symbolName: "BindingContext", declarationKind: SourceDeclarationKind.Class, auLinkId: "runtime:BindingContext" },
    flows: [FrameworkFlowKind.ScopePropagation, FrameworkFlowKind.Binding, FrameworkFlowKind.ReactivitySetup, FrameworkFlowKind.MirrorPressure],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.MirrorTargetOf],
    summary: "Binding context anchor for expression access and reactive binding setup.",
    questions: [
      "Which expression and binding paths read or synthesize binding contexts?",
      "How do override contexts and parent scopes relate to binding context access?",
    ],
  },
  {
    id: "reactivity.observer-locator-interface",
    label: "runtime:IObserverLocator",
    domains: [FrameworkSemanticDomain.Reactivity, FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.DependencyInjection],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime", symbolName: "IObserverLocator", declarationKind: SourceDeclarationKind.Variable },
    flows: [FrameworkFlowKind.ReactivitySetup, FrameworkFlowKind.Binding, FrameworkFlowKind.Lookup, FrameworkFlowKind.Registration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    summary: "DI key and contract for the html-agnostic observer lookup gateway used by bindings and connectables.",
    questions: [
      "Which binding and watcher paths ask IObserverLocator for observers or accessors?",
      "Which default implementation is registered for this DI key?",
      "Where does the locator delegate from object/property observation to node or collection observation?",
    ],
  },
  {
    id: "reactivity.observer-locator-implementation",
    label: "runtime:ObserverLocator",
    domains: [FrameworkSemanticDomain.Reactivity, FrameworkSemanticDomain.Binding],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime", symbolName: "ObserverLocator", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.ReactivitySetup, FrameworkFlowKind.Binding, FrameworkFlowKind.Lookup],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "Html-agnostic observer locator implementation that creates property, computed, dirty-check, and collection observation paths.",
    questions: [
      "Which observer classes can this locator return for a property or collection?",
      "Where does dirty-check fallback enter the observation path?",
      "Which APIs are consumed by binding products during bind/update setup?",
    ],
  },
  {
    id: "reactivity.node-observer-locator-interface",
    label: "runtime:INodeObserverLocator",
    domains: [FrameworkSemanticDomain.Reactivity, FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Platform, FrameworkSemanticDomain.DependencyInjection],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime", symbolName: "INodeObserverLocator", declarationKind: SourceDeclarationKind.Variable },
    flows: [FrameworkFlowKind.ReactivitySetup, FrameworkFlowKind.Binding, FrameworkFlowKind.Lookup, FrameworkFlowKind.Registration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    summary: "DI key and contract for platform/node-specific observer lookup delegated to by ObserverLocator.",
    questions: [
      "Which default fallback exists when no platform-specific node observer locator is registered?",
      "Which runtime-html implementation replaces the fallback?",
    ],
  },
  {
    id: "reactivity.node-observer-locator-html",
    label: "runtime-html:NodeObserverLocator",
    domains: [FrameworkSemanticDomain.Reactivity, FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Platform],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "NodeObserverLocator", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.ReactivitySetup, FrameworkFlowKind.Binding, FrameworkFlowKind.Registration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "HTML-specific observer locator implementation that maps elements/properties to node observers and accessors.",
    questions: [
      "Which HTML node observer classes can this locator return?",
      "Which configuration maps, events, and accessors shape node observation?",
      "Where do binding behaviors override target observers or subscribers around this locator?",
    ],
  },
  {
    id: "task.app-task",
    label: "runtime-html:AppTask",
    domains: [FrameworkSemanticDomain.Configuration, FrameworkSemanticDomain.DependencyInjection, FrameworkSemanticDomain.Lifecycle],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "AppTask", declarationKind: SourceDeclarationKind.Variable },
    flows: [FrameworkFlowKind.PluginConfiguration, FrameworkFlowKind.Registration, FrameworkFlowKind.WorldFormation, FrameworkFlowKind.LifecyclePropagation],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    summary: "Lifecycle task registration factory that admits startup, hydration, activation, and deactivation work into the app world.",
    questions: [
      "Which AppTask phases participate before and after root rendering?",
      "How are AppTask callbacks registered and later invoked through task slots?",
      "Which configuration bundles publish AppTask rows?",
    ],
  },
  {
    id: "lifecycle.lifecycle-hooks",
    label: "runtime-html:LifecycleHooks",
    domains: [FrameworkSemanticDomain.Lifecycle, FrameworkSemanticDomain.Rendering],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "LifecycleHooks", declarationKind: SourceDeclarationKind.Variable },
    flows: [FrameworkFlowKind.LifecyclePropagation, FrameworkFlowKind.Activation, FrameworkFlowKind.Rendering],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    summary: "Lifecycle hook registration/lookup surface that shapes bind, attach, detach, unbind, and dispose participation.",
    questions: [
      "Which hook kinds are admitted and where are they invoked?",
      "How do lifecycle hooks relate to controller traversal and AppTask phases?",
    ],
  },
  {
    id: "router.router",
    label: "router:Router",
    domains: [FrameworkSemanticDomain.Routing, FrameworkSemanticDomain.DependencyInjection, FrameworkSemanticDomain.Lifecycle],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "router", symbolName: "Router", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.Routing, FrameworkFlowKind.Lookup, FrameworkFlowKind.LifecyclePropagation],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "Primary router orchestration surface for navigation, route tree state, and endpoint/viewport handoff.",
    questions: [
      "Where does navigation enter the router and become route tree/viewport work?",
      "Which services and lifecycle hooks does Router depend on?",
    ],
  },
  {
    id: "router.configuration",
    label: "router:RouterConfiguration",
    domains: [FrameworkSemanticDomain.Routing, FrameworkSemanticDomain.Configuration, FrameworkSemanticDomain.DependencyInjection],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "router", symbolName: "RouterConfiguration", declarationKind: SourceDeclarationKind.Variable },
    flows: [FrameworkFlowKind.Routing, FrameworkFlowKind.PluginConfiguration, FrameworkFlowKind.Registration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.FrameworkFlowOf],
    summary: "Router plugin/configuration export that admits router resources and services into Aurelia.register.",
    questions: [
      "Which router services and resources are registered by default?",
      "How does router configuration alter routing semantics before app startup?",
    ],
  },
  {
    id: "expression.expression-parser",
    label: "expression-parser:ExpressionParser",
    domains: [FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Compiler, FrameworkSemanticDomain.Reactivity],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "expression-parser", symbolName: "ExpressionParser", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.Compilation, FrameworkFlowKind.Binding, FrameworkFlowKind.ReactivitySetup],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "Expression parsing entrypoint that turns binding syntax into AST shapes consumed by compiler/runtime binding work.",
    questions: [
      "Which parse modes produce the AST families that bindings and commands consume?",
      "Where do expression ASTs cross from compiler output into runtime evaluation and observation?",
    ],
  },
  {
    id: "expression.expression-kind",
    label: "expression-parser:ExpressionKind",
    domains: [FrameworkSemanticDomain.Binding, FrameworkSemanticDomain.Compiler],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "expression-parser", symbolName: "ExpressionKind", declarationKind: SourceDeclarationKind.Enum },
    flows: [FrameworkFlowKind.Compilation, FrameworkFlowKind.Binding],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf],
    summary: "Expression AST discriminator surface used to classify parsed binding expressions.",
    questions: [
      "Which AST discriminator families need semantic-runtime emulation?",
      "How do expression kind values map to evaluator and observer behavior?",
    ],
  },
  {
    id: "rendering.view-factory",
    label: "runtime-html:ViewFactory",
    domains: [FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Resource, FrameworkSemanticDomain.Lifecycle],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "ViewFactory", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.Rendering, FrameworkFlowKind.Hydration, FrameworkFlowKind.LifecyclePropagation],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "View construction surface that materializes renderable views from compiled definitions/instructions.",
    questions: [
      "Which compiled products and containers feed view creation?",
      "Where do created views enter controller lifecycle traversal?",
    ],
  },
  {
    id: "rendering.rendering-service",
    label: "runtime-html:Rendering",
    domains: [FrameworkSemanticDomain.Rendering, FrameworkSemanticDomain.Instruction, FrameworkSemanticDomain.Lifecycle],
    phase: FrameworkDiscoveryPhase.Seed,
    source: { packageId: "runtime-html", symbolName: "Rendering", declarationKind: SourceDeclarationKind.Class },
    flows: [FrameworkFlowKind.Rendering, FrameworkFlowKind.InstructionConsumption, FrameworkFlowKind.Hydration],
    navigation: [NavigationRelation.SourceFor, NavigationRelation.TypeFactsFor, NavigationRelation.ReferencesOf, NavigationRelation.CallHierarchyOf],
    summary: "Rendering service surface that bridges compiled instructions, renderers, controllers, and hydration context.",
    questions: [
      "Which renderer registry and hydration context paths does Rendering coordinate?",
      "Where does recursive rendering re-enter instruction dispatch?",
    ],
  },
];

/** Provisional discovery seeds used as the workbench's compaction-safe orientation surface. */
export const FRAMEWORK_DISCOVERY_SEEDS: FrameworkDiscoverySeeds = {
  schemaVersion: FRAMEWORK_DISCOVERY_SEEDS_VERSION,
  principles: [
    "Seed anchors are starting handles, not final taxonomy.",
    "Semantic domains classify Aurelia meaning; framework flows classify behavior corridors; navigation relations classify inquiry hops.",
    "Rows need source, TypeChecker, evaluator, auLink, or explicit human basis.",
    "Dynamic runtime behavior should become an explicit unresolved boundary until a named evaluator model can close it.",
    "Framework semantics should pressure product modeling through auLink instead of duplicate hand-maintained vocabulary.",
    "Expensive recurrent discovery belongs in boot-time indexes; query-time reads should filter and traverse.",
  ],
  flows: FRAMEWORK_FLOW_DEFINITIONS,
  anchors: FRAMEWORK_DISCOVERY_SEED_ANCHORS,
  openQuestions: [
    "Which app startup route is the first durable index target after auLink target resolution?",
    "Which registration/configuration helper calls should become evaluator intrinsics?",
    "Where does recursive compilation actually branch, and what exact instruction rows join compiler to renderer?",
    "Which lifecycle routes are synchronous, promise-aware, or branch-dependent?",
    "Which product-specific semantics can disappear once framework route facts are stable?",
  ],
};
