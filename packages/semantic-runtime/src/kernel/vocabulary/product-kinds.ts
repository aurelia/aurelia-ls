import {
  defineVocabulary,
  KernelVocabularyNamespace,
  KernelVocabularySlot,
} from './core.js';

export const KernelProductKinds = {
  Evaluation: {
    /** Product kind for a source-backed TypeScript/module-evaluation issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed TypeScript/module-evaluation issue such as a framework ModuleLoader input that Aurelia would reject.',
    ),
  },
  TypeSystem: {

    /** Product kind for a type-system type projection. */
    TypeShape: defineVocabulary(
      KernelVocabularyNamespace.TypeSystem,
      'type-shape',
      KernelVocabularySlot.ProductKind,
      'Type-system projection of a TypeScript, template, or expression type for inquiry.',
    ),

    /** Product kind for one member visible on a type-system type projection. */
    TypeMember: defineVocabulary(
      KernelVocabularyNamespace.TypeSystem,
      'type-member',
      KernelVocabularySlot.ProductKind,
      'Type-system projection of one property, method, accessor, call, construct, or index member.',
    ),
  },
  Resource: {

    /** Product kind for a resource definition header recognized from source carriers. */
    DefinitionHeader: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'definition-header',
      KernelVocabularySlot.ProductKind,
      'A resource definition header recognized from source carriers before metadata convergence, scope admission, or template use.',
    ),

    BuiltInCatalog: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'built-in-catalog',
      KernelVocabularySlot.ProductKind,
      'Catalog of framework-provided resource definition headers admitted by known framework registration effects.',
    ),

    /** Product kind for a fully converged resource metadata definition before DI admission or template compilation. */
    Definition: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'definition',
      KernelVocabularySlot.ProductKind,
      'A fully converged resource metadata definition before DI admission, scope visibility, or template compilation.',
    ),

    /** Product kind for a source-backed resource metadata issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed resource metadata issue such as invalid watch metadata or framework-rejected resource configuration.',
    ),
  },
  Di: {

    /** Product kind for an abstract Aurelia container in the analyzed app world. */
    Container: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'container',
      KernelVocabularySlot.ProductKind,
      'An abstract Aurelia container participating in DI world construction.',
    ),

    /** Product kind for a runtime-shaped resolver value. */
    Resolver: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'resolver',
      KernelVocabularySlot.ProductKind,
      'A runtime-shaped DI resolver value whose behavior can be abstractly interpreted.',
    ),

    /** Product kind for an IRegistry-shaped value. */
    Registry: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'registry',
      KernelVocabularySlot.ProductKind,
      'An IRegistry-shaped value whose register method can be abstractly interpreted.',
    ),

    /** Product kind for a runtime-shaped ParameterizedRegistry value. */
    ParameterizedRegistry: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'parameterized-registry',
      KernelVocabularySlot.ProductKind,
      'A runtime-shaped ParameterizedRegistry value produced by deferred registration.',
    ),

    /** Product kind for applying a registration admission to a concrete container. */
    ContainerRegistration: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'container-registration',
      KernelVocabularySlot.ProductKind,
      'A registration admission being spent against a concrete container.',
    ),

    /** Product kind for a row in a container resolver map. */
    ResolverSlot: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'resolver-slot',
      KernelVocabularySlot.ProductKind,
      'A DI resolver slot owned by a container for a specific key.',
    ),

    /** Product kind for the built-in IContainer self resolver row. */
    SelfResolverSlot: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'self-resolver-slot',
      KernelVocabularySlot.ProductKind,
      'The built-in IContainer self resolver row owned by a container.',
    ),

    /** Product kind for a row in a container resource lookup table. */
    ResourceSlot: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'resource-slot',
      KernelVocabularySlot.ProductKind,
      'A resource resolver slot visible through container resource lookup.',
    ),

    /** Product kind for a source-backed DI/container issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed DI/container issue such as a duplicate resource key discovered during world construction.',
    ),

    /** Product kind for a row in a container-tree factory map. */
    FactorySlot: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'factory-slot',
      KernelVocabularySlot.ProductKind,
      'A factory slot shared by a container tree for a constructable key.',
    ),
  },
  Registration: {

    /** Product kind for a registration admission whose runtime effect remains open. */
    OpenAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-admission',
      KernelVocabularySlot.ProductKind,
      'A registration admission whose key, value, strategy, or carrier is not closed enough to spend.',
    ),

    /** Product kind for a resolver-producing registration admission. */
    ResolverAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'resolver-admission',
      KernelVocabularySlot.ProductKind,
      'A registration admission that produces or admits an Aurelia resolver.',
    ),

    /** Product kind for a parameterized registry produced by Registration.defer. */
    ParameterizedRegistryAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'parameterized-registry-admission',
      KernelVocabularySlot.ProductKind,
      'A registration admission that produces a ParameterizedRegistry from Registration.defer.',
    ),

    /** Product kind for an IRegistry-shaped value before its register method is spent. */
    RegistryAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'registry-admission',
      KernelVocabularySlot.ProductKind,
      'An IRegistry-shaped registration admission before DI world construction spends its register method.',
    ),

    /** Product kind for a converged resource registration before its resource key rows are spent. */
    ResourceAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'resource-admission',
      KernelVocabularySlot.ProductKind,
      'A converged Aurelia resource registration before DI world construction spends its resource key rows.',
    ),

    /** Product kind for a known framework registration group before its expanded values are spent. */
    FrameworkRegistrationAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'framework-registration-admission',
      KernelVocabularySlot.ProductKind,
      'A known framework registration group before DI world construction spends its expanded registrations.',
    ),
  },
  Configuration: {

    /** Product kind for a modeled Aurelia facade that owns the root container/app-root provider handoff. */
    Aurelia: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'aurelia',
      KernelVocabularySlot.ProductKind,
      'A modeled Aurelia facade that owns the root container and AppRoot provider handoff for app admission.',
    ),

    /** Product kind for runtime-shaped AppRoot configuration before construction effects are spent. */
    AppRootConfig: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'app-root-config',
      KernelVocabularySlot.ProductKind,
      'Runtime-shaped AppRoot configuration before AppRoot construction spends host/component/container facts.',
    ),

    /** Product kind for a modeled AppRoot that connects a root component, host, container, and root controller. */
    AppRoot: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'app-root',
      KernelVocabularySlot.ProductKind,
      'A modeled AppRoot connecting a root component, host, container, and root custom-element controller.',
    ),

    /** Product kind for a modeled runtime controller at a known controller phase. */
    Controller: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'controller',
      KernelVocabularySlot.ProductKind,
      'A modeled runtime controller at a known controller phase, used to connect resources, containers, and templates.',
    ),

    /** Product kind for a framework-runtime issue discovered while constructing or hydrating a controller. */
    ControllerIssue: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'controller-issue',
      KernelVocabularySlot.ProductKind,
      'A framework-runtime issue discovered while constructing, hydrating, or activating a modeled controller.',
    ),

    /** Product kind for a runtime IViewFactory value that can create synthetic child views. */
    ViewFactory: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'view-factory',
      KernelVocabularySlot.ProductKind,
      'A modeled runtime IViewFactory value that can create synthetic child views from a nested instruction sequence.',
    ),

    /** Product kind for runtime Scope objects used by controller activation and binding lookup. */
    BindingScope: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'binding-scope',
      KernelVocabularySlot.ProductKind,
      'A modeled runtime Scope connecting parent scope, binding context, override context, and boundary behavior.',
    ),

    /** Product kind for an AuCompose CompositionContext produced from component/template/model inputs. */
    CompositionContext: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'composition-context',
      KernelVocabularySlot.ProductKind,
      'An AuCompose CompositionContext produced from component, template, model, scopeBehavior, tag, and flushMode inputs.',
    ),

    /** Product kind for an AuCompose CompositionController over one resolved composition context. */
    CompositionController: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'composition-controller',
      KernelVocabularySlot.ProductKind,
      'An AuCompose CompositionController that resolves a component or template and owns the composed child lifecycle boundary.',
    ),

    /** Product kind for runtime binding contexts used by Scope lookup. */
    BindingContext: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'binding-context',
      KernelVocabularySlot.ProductKind,
      'A modeled runtime binding context that exposes view-model, synthetic, object, or inferred property names.',
    ),

    /** Product kind for runtime override contexts used by Scope lookup. */
    OverrideContext: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'override-context',
      KernelVocabularySlot.ProductKind,
      'A modeled runtime override context that exposes template locals, repeat metadata, and contextual names.',
    ),

    /** Product kind for ordered app/plugin/registry/builder configuration flow. */
    Sequence: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'sequence',
      KernelVocabularySlot.ProductKind,
      'Ordered app, plugin, registry, or builder configuration flow before DI world construction.',
    ),

    /** Product kind for one ordered action or observation inside a configuration sequence. */
    Step: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'step',
      KernelVocabularySlot.ProductKind,
      'One ordered configuration action or observation that connects source/evaluation order to produced products.',
    ),

    /** Product kind for source-backed option defaulting, customization, forwarding, or builder mutation. */
    OptionContribution: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'option-contribution',
      KernelVocabularySlot.ProductKind,
      'One source-backed contribution to a configuration option path before configuration convergence folds precedence.',
    ),

    /** Product kind for an IAppTask value produced by AppTask slot factories. */
    AppTask: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'app-task',
      KernelVocabularySlot.ProductKind,
      'A deferred lifecycle task registered under IAppTask before AppRoot lifecycle emulation spends it.',
    ),

    /** Product kind for configuration-time framework service issues with source-backed diagnostic authority. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed configuration or framework-service customization issue discovered before app-world construction.',
    ),
  },
  Framework: {

    /** Product kind for a source-backed framework service or container root. */
    ServiceRoot: defineVocabulary(
      KernelVocabularyNamespace.Framework,
      'service-root',
      KernelVocabularySlot.ProductKind,
      'A source-backed framework service or container root with explicit evidence basis and provenance.',
    ),

    /** Product kind for an authored framework capability use joined to admission and availability evidence. */
    CapabilityDemand: defineVocabulary(
      KernelVocabularyNamespace.Framework,
      'capability-demand',
      KernelVocabularySlot.ProductKind,
      'An authored use of a framework capability, joined to app-world admission state and package/import availability evidence.',
    ),
  },
  Router: {

    /** Product kind for RouterOptions after RouterConfiguration defaults and customize contributions converge. */
    Options: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'router-options',
      KernelVocabularySlot.ProductKind,
      'RouterOptions after RouterConfiguration defaults and recognized customize option contributions converge.',
    ),

    /** Product kind for a source-backed router route configuration before recognizer population. */
    RouteConfig: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'route-config',
      KernelVocabularySlot.ProductKind,
      'A source-backed router route configuration before route-context and route-recognizer materialization.',
    ),

    /** Product kind for a runtime-shaped RouteConfigContext over one normalized RouteConfig. */
    RouteConfigContext: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'route-config-context',
      KernelVocabularySlot.ProductKind,
      'A runtime-shaped RouteConfigContext that owns parent/root topology, child route processing, and a route recognizer.',
    ),

    /** Product kind for a runtime RouteContext over one route config context and component/container boundary. */
    RouteContext: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'route-context',
      KernelVocabularySlot.ProductKind,
      'A runtime RouteContext that connects a RouteConfigContext to parent/root context, DI container, and hosting viewport agent.',
    ),

    /** Product kind for a source-backed RouteContext.getRouteParameters(...) call correlated with route path params. */
    RouteContextParameterRead: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'route-context-parameter-read',
      KernelVocabularySlot.ProductKind,
      'A source-backed RouteContext.getRouteParameters(...) read with declared parameter shape and known route path parameter alignment.',
    ),

    /** Product kind for one routeable component input after source/resource convergence. */
    RouteableComponent: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'routeable-component',
      KernelVocabularySlot.ProductKind,
      'A router RouteableComponent input converged from string, class, resource definition, promise, or navigation strategy source.',
    ),

    /** Product kind for the runtime au-viewport custom element instance semantics. */
    Viewport: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'viewport',
      KernelVocabularySlot.ProductKind,
      'A runtime au-viewport instance with name, usedBy, default, fallback, and owning route context semantics.',
    ),

    /** Product kind for a ViewportAgent attached to an au-viewport and route context. */
    ViewportAgent: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'viewport-agent',
      KernelVocabularySlot.ProductKind,
      'A ViewportAgent that mediates routed component controller activation for one au-viewport.',
    ),

    /** Product kind for a ComponentAgent created for a routed component. */
    ComponentAgent: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'component-agent',
      KernelVocabularySlot.ProductKind,
      'A ComponentAgent that joins a routed component controller, route node, route context, and viewport agent.',
    ),

    /** Product kind for a RouteNode in the router's route tree. */
    RouteNode: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'route-node',
      KernelVocabularySlot.ProductKind,
      'A RouteNode that joins a RouteContext to realized or synthetic route-tree state.',
    ),

    /** Product kind for the router's RouteTree state container. */
    RouteTree: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'route-tree',
      KernelVocabularySlot.ProductKind,
      'A RouteTree that owns the current root RouteNode and later transition-compiled child nodes.',
    ),

    /** Product kind for a source-backed router runtime issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed router issue such as RouteTree redirect migration encountering a framework-rejected route expression shape.',
    ),

    /** Product kind for a typed navigation instruction normalized by the router. */
    TypedNavigationInstruction: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'typed-navigation-instruction',
      KernelVocabularySlot.ProductKind,
      'A TypedNavigationInstruction normalized from a router NavigationInstruction value.',
    ),

    /** Product kind for a ViewportInstruction before route-tree node compilation. */
    ViewportInstruction: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'viewport-instruction',
      KernelVocabularySlot.ProductKind,
      'A ViewportInstruction that names a component/navigation instruction, viewport, params, children, and recognized route when known.',
    ),

    /** Product kind for a ViewportInstructionTree before route-tree node compilation. */
    ViewportInstructionTree: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'viewport-instruction-tree',
      KernelVocabularySlot.ProductKind,
      'A ViewportInstructionTree created by Router, ContextRouter, load, href, or RouteContext before transition compilation.',
    ),
  },
  I18n: {
    /** Product kind for one translation key admitted from static i18n init resources. */
    TranslationKey: defineVocabulary(
      KernelVocabularyNamespace.I18n,
      'translation-key',
      KernelVocabularySlot.ProductKind,
      'One static i18n translation key admitted from I18nConfiguration init resources for template authoring.',
    ),
  },
  State: {
    /** Product kind for one store configured by StateDefaultConfiguration.init(...) or .withStore(...). */
    StoreConfiguration: defineVocabulary(
      KernelVocabularyNamespace.State,
      'store-configuration',
      KernelVocabularySlot.ProductKind,
      'One @aurelia/state store configuration admitted from StateDefaultConfiguration builder calls before AppTask execution.',
    ),
    /** Product kind for one StateGetterBinding created by @fromState(...) lifecycle hooks. */
    GetterBinding: defineVocabulary(
      KernelVocabularyNamespace.State,
      'getter-binding',
      KernelVocabularySlot.ProductKind,
      'One @aurelia/state StateGetterBinding created by @fromState(...) for a field or setter target.',
    ),
    /** Product kind for a source-backed @aurelia/state configuration or store-registry issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.State,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed @aurelia/state issue such as reserved or duplicate store names.',
    ),
  },
  Validation: {
    /** Product kind for a source-backed @aurelia/validation rule-construction or hydration issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Validation,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed @aurelia/validation issue such as invalid fluent rule construction or model-rule hydration input.',
    ),
  },
  FetchClient: {
    /** Product kind for a source-backed @aurelia/fetch-client configuration issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.FetchClient,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed @aurelia/fetch-client issue such as invalid HttpClient.configure(...) or RetryInterceptor configuration input.',
    ),
  },
  Dialog: {
    /** Product kind for a source-backed @aurelia/dialog configuration or service issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Dialog,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed @aurelia/dialog issue such as empty DialogConfiguration registration or invalid DialogService.open(...) settings.',
    ),
  },
  Observation: {
    /** Product kind for a source-backed observation issue outside a single binding target. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Observation,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed observation issue such as framework-rejected @observable decorator usage.',
    ),

    /** Product kind for a valid @computed getter or method dependency declaration. */
    ComputedDefinition: defineVocabulary(
      KernelVocabularyNamespace.Observation,
      'computed-definition',
      KernelVocabularySlot.ProductKind,
      'A source-backed @computed getter or method dependency declaration that feeds computed observer or trackable-method dependency collection.',
    ),

    /** Product kind for a source-backed observer selected by ObserverLocator source-side semantics. */
    SourceObserver: defineVocabulary(
      KernelVocabularyNamespace.Observation,
      'source-observer',
      KernelVocabularySlot.ProductKind,
      'A source-backed observer selected by ObserverLocator source-side semantics, such as ComputedObserver or ControlledComputedObserver for an authored getter.',
    ),

    /** Product kind for a source-level IEffect produced by Aurelia observation APIs. */
    RuntimeEffect: defineVocabulary(
      KernelVocabularyNamespace.Observation,
      'runtime-effect',
      KernelVocabularySlot.ProductKind,
      'A source-level IEffect produced by Observation.watch(...) or Observation.run(...).',
    ),

    /** Product kind for source-level ProxyObservable raw/unwrap escape calls. */
    ProxyObservableEscape: defineVocabulary(
      KernelVocabularyNamespace.Observation,
      'proxy-observable-escape',
      KernelVocabularySlot.ProductKind,
      'A source-level ProxyObservable.getRaw(...) or ProxyObservable.unwrap(...) escape call.',
    ),
  },
  RouteRecognizer: {

    /** Product kind for the route-recognizer instance owned or inherited by a RouteConfigContext. */
    RouteRecognizer: defineVocabulary(
      KernelVocabularyNamespace.RouteRecognizer,
      'route-recognizer',
      KernelVocabularySlot.ProductKind,
      'A RouteRecognizer state-graph owner used by RouteConfigContext for route registration and recognition.',
    ),

    /** Product kind for a parsed configurable route pattern before recognizer state graph population. */
    ConfigurableRoute: defineVocabulary(
      KernelVocabularyNamespace.RouteRecognizer,
      'configurable-route',
      KernelVocabularySlot.ProductKind,
      'A source-backed route-recognizer configurable route path parsed into parameter and segment facts before state graph population.',
    ),

    /** Product kind for a route-recognizer endpoint produced from one configurable route. */
    Endpoint: defineVocabulary(
      KernelVocabularyNamespace.RouteRecognizer,
      'endpoint',
      KernelVocabularySlot.ProductKind,
      'A route-recognizer endpoint that joins a configurable route to parsed parameter facts and an optional residual endpoint.',
    ),

    /** Product kind for a route-recognizer state graph node. */
    State: defineVocabulary(
      KernelVocabularyNamespace.RouteRecognizer,
      'state',
      KernelVocabularySlot.ProductKind,
      'A route-recognizer State node created while appending separator, static, dynamic, star, or residual path segments.',
    ),

    /** Product kind for a route-recognizer recognized route produced from a matched path. */
    RecognizedRoute: defineVocabulary(
      KernelVocabularyNamespace.RouteRecognizer,
      'recognized-route',
      KernelVocabularySlot.ProductKind,
      'A RecognizedRoute produced by walking a RouteRecognizer state graph for a concrete navigation path.',
    ),

    /** Product kind for a static route-recognizer condition where the framework would throw. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.RouteRecognizer,
      'issue',
      KernelVocabularySlot.ProductKind,
      'A source-backed route-recognizer issue such as duplicate paths or ambiguous endpoint assignment.',
    ),
  },
  Compiler: {

    /** Product kind for a container-scoped compiler world. */
    World: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'world',
      KernelVocabularySlot.ProductKind,
      'Container-scoped compiler world that supplies resources, syntax resources, and services to template passes.',
    ),

    /** Product kind for one compiler request over an authored template source. */
    CompilationUnit: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'compilation-unit',
      KernelVocabularySlot.ProductKind,
      'One compiler request that binds a template source, compiler world, parse context, and root compilation context.',
    ),

    /** Product kind for a runtime-shaped CompilationContext frame. */
    CompilationContext: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'compilation-context',
      KernelVocabularySlot.ProductKind,
      'Runtime-shaped CompilationContext frame for template parsing, classification, and lowering.',
    ),

    /** Product kind for resource and syntax-resource visibility inside a compiler world. */
    ResourceScope: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'resource-scope',
      KernelVocabularySlot.ProductKind,
      'Resource and syntax-resource visibility inside a compiler world.',
    ),

    /** Product kind for a runtime-shaped compiler service model. */
    Service: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'service',
      KernelVocabularySlot.ProductKind,
      'Runtime-shaped compiler service such as a resource resolver, attribute parser, or command resolver.',
    ),

    /** Product kind for a runtime IAttributeParser model. */
    AttributeParser: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'attribute-parser',
      KernelVocabularySlot.ProductKind,
      'Runtime IAttributeParser model with visible attribute-pattern handlers.',
    ),

    AttributeParserMachine: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'attribute-parser-machine',
      KernelVocabularySlot.ProductKind,
      'Runtime SyntaxInterpreter model compiled from registered attribute patterns.',
    ),

    CompiledAttributePattern: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'compiled-attribute-pattern',
      KernelVocabularySlot.ProductKind,
      'Runtime CompiledPattern model used by SyntaxInterpreter matching.',
    ),

    BuiltInSyntaxCatalog: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'built-in-syntax-catalog',
      KernelVocabularySlot.ProductKind,
      'Catalog of framework-provided syntax resources admitted by known framework registration effects.',
    ),

    ConfiguredSyntaxCatalogSelection: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'configured-syntax-catalog-selection',
      KernelVocabularySlot.ProductKind,
      'Selection of framework built-in syntax catalogs admitted by one known framework registration before attribute-parser and binding-command resolver input.',
    ),

    BuiltInRuntimeRendererCatalog: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'built-in-runtime-renderer-catalog',
      KernelVocabularySlot.ProductKind,
      'Catalog of framework-provided runtime renderers admitted by known framework registration effects.',
    ),

    ConfiguredRuntimeRendererCatalogSelection: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'configured-runtime-renderer-catalog-selection',
      KernelVocabularySlot.ProductKind,
      'Selection of framework built-in runtime renderer catalogs admitted by one known framework registration before Rendering input.',
    ),

    RuntimeRenderer: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'runtime-renderer',
      KernelVocabularySlot.ProductKind,
      'Runtime IRenderer product selected by Rendering for one lowered instruction kind.',
    ),

    RuntimeRendererIssue: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'runtime-renderer-issue',
      KernelVocabularySlot.ProductKind,
      'Framework-runtime issue discovered while a runtime IRenderer spends a lowered instruction before a binding/controller product exists.',
    ),

    ConfiguredResourceCatalogSelection: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'configured-resource-catalog-selection',
      KernelVocabularySlot.ProductKind,
      'Selection of framework built-in resource catalogs admitted by one known framework registration before DI resource-slot spending.',
    ),

    /** Product kind for an executable attribute-pattern handler. */
    AttributePatternExecutable: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'attribute-pattern-executable',
      KernelVocabularySlot.ProductKind,
      'Executable attribute-pattern handler visible through IAttributeParser.',
    ),

    /** Product kind for a runtime IBindingCommandResolver model. */
    BindingCommandResolver: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'binding-command-resolver',
      KernelVocabularySlot.ProductKind,
      'Runtime IBindingCommandResolver model with visible binding-command handlers.',
    ),

    /** Product kind for an executable binding-command handler. */
    BindingCommandExecutable: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'binding-command-executable',
      KernelVocabularySlot.ProductKind,
      'Executable binding-command handler visible through IBindingCommandResolver.',
    ),

    /** Product kind for runtime ICommandBuildInfo before command lowering. */
    BindingCommandBuildInput: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'binding-command-build-input',
      KernelVocabularySlot.ProductKind,
      'Runtime ICommandBuildInfo product before a binding command builds instructions.',
    ),

    /** Product kind for the result of binding-command lowering. */
    BindingCommandLowering: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'binding-command-lowering',
      KernelVocabularySlot.ProductKind,
      'Result of binding-command lowering before final instruction sequence assembly.',
    ),

    /** Product kind for a source-backed template-compiler issue. */
    Issue: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'issue',
      KernelVocabularySlot.ProductKind,
      'Source-backed template-compiler issue produced by classification, lowering, or compiled-template assembly.',
    ),

    /** Product kind for one parsed custom-attribute inline multi-binding segment. */
    MultiBindingSegment: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'multi-binding-segment',
      KernelVocabularySlot.ProductKind,
      'Custom-attribute inline multi-binding segment before instruction assembly.',
    ),

    /** Product kind for inline multi-binding lowering. */
    MultiBindingLowering: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'multi-binding-lowering',
      KernelVocabularySlot.ProductKind,
      'Result of custom-attribute inline multi-binding lowering before final instruction sequence assembly.',
    ),
  },
  Template: {

    /** Product kind for an authored template source before HTML parsing. */
    Source: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'source',
      KernelVocabularySlot.ProductKind,
      'Authored template source before HTML parsing, attribute classification, or compiler DOM transformation.',
    ),

    /** Product kind for inquiry pressure shared by template parser and lowering passes. */
    ParseContext: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'parse-context',
      KernelVocabularySlot.ProductKind,
      'Inquiry pressure shared by HTML, attribute, expression, and lowering passes.',
    ),

    /** Product kind for authored HTML document or template fragments before Aurelia syntax classification. */
    HtmlDocument: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'html-document',
      KernelVocabularySlot.ProductKind,
      'Authored HTML document or template fragment before Aurelia syntax classification.',
    ),

    /** Product kind for authored HTML nodes before resource lookup or lowering. */
    HtmlNode: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'html-node',
      KernelVocabularySlot.ProductKind,
      'Authored HTML node before resource lookup or lowering.',
    ),

    /** Product kind for authored HTML attributes before attribute-pattern parsing. */
    HtmlAttribute: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'html-attribute',
      KernelVocabularySlot.ProductKind,
      'Authored HTML attribute before attribute-pattern parsing.',
    ),

    /** Product kind for a compiled template after DOM pass-through and instruction-row assembly. */
    CompiledTemplate: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'compiled-template',
      KernelVocabularySlot.ProductKind,
      'Compiled template after compiler DOM pass-through, render-target marking, and instruction-row assembly.',
    ),

    /** Product kind for one runtime render target in a compiled template. */
    RenderTarget: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'render-target',
      KernelVocabularySlot.ProductKind,
      'Runtime render target corresponding to one compiled instruction row.',
    ),

    /** Product kind for runtime AttrSyntax after attribute-pattern interpretation. */
    AttributeSyntax: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'attribute-syntax',
      KernelVocabularySlot.ProductKind,
      'Runtime AttrSyntax product after attribute-pattern interpretation.',
    ),

    /** Product kind for attribute classification after resource and bindable lookup. */
    AttributeClassification: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'attribute-classification',
      KernelVocabularySlot.ProductKind,
      'Attribute classification after resource, bindable, and command lookup.',
    ),

    /** Product kind for an authored template value with compiler-owned grammar ownership. */
    ValueSite: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'value-site',
      KernelVocabularySlot.ProductKind,
      'Authored template value site selected for expression parsing or an explicit non-expression grammar boundary.',
    ),

    /** Product kind for one expression parser publication from an authored template value site. */
    ExpressionParse: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'expression-parse',
      KernelVocabularySlot.ProductKind,
      'Expression parser publication for one parser-owned authored template value site.',
    ),
  },
  Binding: {

    /** Product kind for runtime binding instances emulated from renderer semantics. */
    RuntimeBinding: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'runtime-binding',
      KernelVocabularySlot.ProductKind,
      'Runtime binding instance emulated from renderer semantics and lowered instructions.',
    ),

    /** Product kind for controller-owned watcher bindings created from resource watch metadata. */
    RuntimeWatcher: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'runtime-watcher',
      KernelVocabularySlot.ProductKind,
      'Controller-owned ComputedWatcher or ExpressionWatcher binding created from resource watch metadata during controller hydration.',
    ),

    /** Product kind for a framework-runtime issue discovered while a modeled runtime binding executes its own lifecycle. */
    RuntimeBindingIssue: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-issue',
      KernelVocabularySlot.ProductKind,
      'Source-backed runtime issue discovered while a modeled binding executes its own lifecycle, such as SpreadBinding captured-attribute transfer.',
    ),

    /** Product kind for a runtime binding effect that creates or mutates template scope. */
    ScopeEffect: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'scope-effect',
      KernelVocabularySlot.ProductKind,
      'Runtime binding effect that creates or mutates template binding scope.',
    ),

    /** Product kind for a framework-runtime issue discovered while spending a binding scope effect. */
    ScopeIssue: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'scope-issue',
      KernelVocabularySlot.ProductKind,
      'Source-backed runtime issue discovered while spending a binding scope effect, such as repeat destructuring that can reach astAssign failure paths.',
    ),

    /** Product kind for a runtime binding target-side accessor or observer decision. */
    TargetAccess: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'target-access',
      KernelVocabularySlot.ProductKind,
      'Runtime binding target-side accessor or observer selected through ObserverLocator and NodeObserverLocator semantics.',
    ),

    /** Product kind for a runtime renderer or binding direct target update operation. */
    TargetOperation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'target-operation',
      KernelVocabularySlot.ProductKind,
      'Runtime renderer or binding direct target update operation such as setAttribute, classList.add/toggle, cssText append, style.setProperty, or setAttribute/removeAttribute.',
    ),

    /** Product kind for a runtime binding source-side update operation. */
    SourceOperation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'source-operation',
      KernelVocabularySlot.ProductKind,
      'Runtime binding source-side update operation such as RefBinding assigning a resolved target into the binding scope.',
    ),

    /** Product kind for a runtime binding observer/accessor value channel. */
    ValueChannel: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'value-channel',
      KernelVocabularySlot.ProductKind,
      'Runtime binding observer or accessor value channel selected from target access plus observer semantics.',
    ),

    /** Product kind for a runtime binding source/target data-flow edge. */
    DataFlow: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'data-flow',
      KernelVocabularySlot.ProductKind,
      'Runtime binding data-flow edge connecting source expression scope lookup to target accessor or observer facts.',
    ),

    /** Product kind for one expression read that participates in runtime dependency collection. */
    ObservedDependency: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'observed-dependency',
      KernelVocabularySlot.ProductKind,
      'Expression read observed by runtime binding or watcher evaluation through connectable dependency collection.',
    ),

    /** Product kind for a binding-behavior application over a runtime binding. */
    BehaviorApplication: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'behavior-application',
      KernelVocabularySlot.ProductKind,
      'Runtime binding-behavior application over an already-rendered binding and its bind-time target facts.',
    ),

    /** Product kind for a framework-runtime issue discovered while applying a binding behavior. */
    BehaviorIssue: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'behavior-issue',
      KernelVocabularySlot.ProductKind,
      'Source-backed runtime issue discovered while applying a binding behavior such as updateTrigger.',
    ),

    /** Product kind for a value-converter application over a runtime binding expression. */
    ValueConverterApplication: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'value-converter-application',
      KernelVocabularySlot.ProductKind,
      'Runtime value-converter application over a rendered binding expression and compiler-visible resource scope.',
    ),

    /** Product kind for a framework-runtime issue discovered while invoking a value converter. */
    ValueConverterIssue: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'value-converter-issue',
      KernelVocabularySlot.ProductKind,
      'Source-backed runtime issue discovered while invoking a value converter such as sanitize.',
    ),
  },
  Instruction: {

    /** Product kind for an ordered instruction list. */
    Sequence: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'sequence',
      KernelVocabularySlot.ProductKind,
      'Ordered lowered instruction list for a template, fragment, or synthetic view.',
    ),

    /** Product kind for one lowered rendering instruction. */
    Instruction: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'instruction',
      KernelVocabularySlot.ProductKind,
      'One lowered rendering instruction product.',
    ),
  },
} as const;
