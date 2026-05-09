import {
  defineVocabulary,
  KernelVocabularyNamespace,
  KernelVocabularySlot,
} from './core.js';

export const KernelProductKinds = {
  Evaluation: {
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

    /** Product kind for a runtime binding effect that creates or mutates template scope. */
    ScopeEffect: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'scope-effect',
      KernelVocabularySlot.ProductKind,
      'Runtime binding effect that creates or mutates template binding scope.',
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
