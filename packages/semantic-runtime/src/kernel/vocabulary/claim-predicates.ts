import {
  claimSignature,
  defineClaimPredicate,
  endpoint,
  identityEndpoint,
  KernelClaimEndpointKind,
  KernelVocabularyNamespace,
  productEndpoint,
} from './core.js';
import { KernelProductKinds } from './product-kinds.js';

function registrationAdmissionEndpoint() {
  return productEndpoint(
    KernelProductKinds.Registration.OpenAdmission,
    KernelProductKinds.Registration.ResolverAdmission,
    KernelProductKinds.Registration.ParameterizedRegistryAdmission,
    KernelProductKinds.Registration.RegistryAdmission,
    KernelProductKinds.Registration.ResourceAdmission,
    KernelProductKinds.Registration.FrameworkRegistrationAdmission,
  );
}

function registrationValueEndpoint() {
  return endpoint(
    [KernelClaimEndpointKind.Address, KernelClaimEndpointKind.Identity, KernelClaimEndpointKind.Product],
    [
      KernelProductKinds.Configuration.AppTask,
      KernelProductKinds.Resource.Definition,
      KernelProductKinds.Resource.DefinitionHeader,
    ],
  );
}

export const KernelClaimPredicates = {
  Evaluation: {
  },
  TypeSystem: {

    /** A type projection exposes a member projection. */
    TypeShapeHasMember: defineClaimPredicate(
      KernelVocabularyNamespace.TypeSystem,
      'type-shape-has-member',
      'A type-system type projection exposes a member projection.',
      claimSignature(
        productEndpoint(KernelProductKinds.TypeSystem.TypeShape),
        productEndpoint(KernelProductKinds.TypeSystem.TypeMember),
      ),
    ),
  },
  Resource: {

    /** Source syntax or convention declares an Aurelia resource. */
    Declares: defineClaimPredicate(
      KernelVocabularyNamespace.Resource,
      'declares',
      'Source syntax or convention declares an Aurelia resource.',
      claimSignature(
        endpoint(
          [KernelClaimEndpointKind.Address, KernelClaimEndpointKind.Identity, KernelClaimEndpointKind.Product],
          [KernelProductKinds.Resource.DefinitionHeader],
        ),
        identityEndpoint(),
      ),
    ),

    /** A recognized resource name is an alias of another resource identity. */
    AliasOf: defineClaimPredicate(
      KernelVocabularyNamespace.Resource,
      'alias-of',
      'A recognized resource name is an alias of another resource identity.',
      claimSignature(identityEndpoint(), identityEndpoint()),
    ),

    ContainsDefinitionHeader: defineClaimPredicate(
      KernelVocabularyNamespace.Resource,
      'contains-definition-header',
      'A resource catalog contains a resource definition header product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Resource.BuiltInCatalog),
        productEndpoint(KernelProductKinds.Resource.DefinitionHeader),
      ),
    ),

    ConvergesToDefinition: defineClaimPredicate(
      KernelVocabularyNamespace.Resource,
      'converges-to-definition',
      'A resource definition header converges into a full resource metadata definition.',
      claimSignature(
        productEndpoint(KernelProductKinds.Resource.DefinitionHeader),
        productEndpoint(KernelProductKinds.Resource.Definition),
      ),
    ),
  },
  Di: {

    /** Registration or resolver flow provides a DI key. */
    ProvidesKey: defineClaimPredicate(
      KernelVocabularyNamespace.Di,
      'provides-key',
      'Registration or resolver flow provides a DI key.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Di.Resolver,
          KernelProductKinds.Di.ResolverSlot,
          KernelProductKinds.Di.FactorySlot,
          KernelProductKinds.Di.ResourceSlot,
          KernelProductKinds.Di.SelfResolverSlot,
        ),
        identityEndpoint(),
      ),
    ),

    /** A container accepts a registration admission for later resolver/resource/factory effects. */
    AcceptsRegistration: defineClaimPredicate(
      KernelVocabularyNamespace.Di,
      'accepts-registration',
      'A container accepts a registration admission for later resolver, resource, or factory effects.',
      claimSignature(
        productEndpoint(KernelProductKinds.Di.Container),
        registrationAdmissionEndpoint(),
      ),
    ),

    /** A DI operation produced a container-owned product while spending registration or lookup pressure. */
    ProducesProduct: defineClaimPredicate(
      KernelVocabularyNamespace.Di,
      'produces-product',
      'A DI operation produced a container-owned product while spending registration or lookup pressure.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Di.Container,
          KernelProductKinds.Di.ContainerRegistration,
        ),
        productEndpoint(
          KernelProductKinds.Configuration.AppTask,
          KernelProductKinds.Di.Resolver,
          KernelProductKinds.Di.Registry,
          KernelProductKinds.Di.ParameterizedRegistry,
          KernelProductKinds.Di.ResolverSlot,
          KernelProductKinds.Di.SelfResolverSlot,
          KernelProductKinds.Di.ResourceSlot,
          KernelProductKinds.Di.Issue,
          KernelProductKinds.Di.FactorySlot,
        ),
      ),
    ),
  },
  Registration: {

    /** A registration admission offers a DI key to later world construction. */
    AdmitsKey: defineClaimPredicate(
      KernelVocabularyNamespace.Registration,
      'admits-key',
      'A registration admission offers a DI key to later DI world construction.',
      claimSignature(registrationAdmissionEndpoint(), identityEndpoint()),
    ),

    /** A registration admission uses a class, instance, callback, resolver, registry, or resource value. */
    UsesValue: defineClaimPredicate(
      KernelVocabularyNamespace.Registration,
      'uses-value',
      'A registration admission uses a class, instance, callback, resolver, registry, or resource value.',
      claimSignature(registrationAdmissionEndpoint(), registrationValueEndpoint()),
    ),
  },
  Configuration: {

    /** A configuration sequence contains one ordered step. */
    ContainsStep: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'contains-step',
      'A configuration sequence contains one ordered step.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Sequence),
        productEndpoint(KernelProductKinds.Configuration.Step),
      ),
    ),

    /** A configuration step produced or selected a product that later passes can consume. */
    ProducesProduct: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'produces-product',
      'A configuration step produced or selected a product that later passes can consume.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Step),
        productEndpoint(
          KernelProductKinds.Configuration.Aurelia,
          KernelProductKinds.Configuration.AppRootConfig,
          KernelProductKinds.Configuration.AppRoot,
          KernelProductKinds.Configuration.Controller,
          KernelProductKinds.Configuration.CompositionContext,
          KernelProductKinds.Configuration.CompositionController,
          KernelProductKinds.Configuration.BindingScope,
          KernelProductKinds.Configuration.BindingContext,
          KernelProductKinds.Configuration.OverrideContext,
          KernelProductKinds.Configuration.OptionContribution,
          KernelProductKinds.Configuration.AppTask,
          KernelProductKinds.Di.Container,
        ),
      ),
    ),

    /** A configuration step admitted a registration product before DI world construction spends it. */
    AdmitsRegistration: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'admits-registration',
      'A configuration step admitted a registration product before DI world construction spends it.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Step),
        registrationAdmissionEndpoint(),
      ),
    ),

    /** A modeled Aurelia facade owns the root container used by app admission. */
    OwnsContainer: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'owns-container',
      'A modeled Aurelia facade owns the root container used by app admission.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Aurelia),
        productEndpoint(KernelProductKinds.Di.Container),
      ),
    ),

    /** A modeled Aurelia facade prepared or selected an AppRoot boundary. */
    HasAppRoot: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'has-app-root',
      'A modeled Aurelia facade prepared or selected an AppRoot boundary.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Aurelia),
        productEndpoint(KernelProductKinds.Configuration.AppRoot),
      ),
    ),

    /** A modeled AppRoot was constructed from an admitted AppRoot config. */
    AppRootUsesConfig: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'app-root-uses-config',
      'A modeled AppRoot was constructed from an admitted AppRoot config.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.AppRoot),
        productEndpoint(KernelProductKinds.Configuration.AppRootConfig),
      ),
    ),

    /** A modeled controller owns or receives a runtime binding scope. */
    ControllerUsesBindingScope: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-uses-binding-scope',
      'A modeled controller owns, receives, or activates with a runtime binding Scope.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
      ),
    ),

    /** A modeled au-compose controller created or updated a CompositionController. */
    ControllerOwnsComposition: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-owns-composition',
      'A modeled au-compose controller created, updated, or exposes an AuCompose CompositionController.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Configuration.CompositionController),
      ),
    ),

    /** A CompositionController was produced from one CompositionContext. */
    CompositionControllerUsesContext: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'composition-controller-uses-context',
      'An AuCompose CompositionController was produced from one CompositionContext.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.CompositionController),
        productEndpoint(KernelProductKinds.Configuration.CompositionContext),
      ),
    ),

    /** A CompositionController resolved one custom element definition candidate. */
    CompositionControllerUsesDefinition: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'composition-controller-uses-definition',
      'An AuCompose CompositionController resolved one custom-element definition candidate from its component input.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.CompositionController),
        productEndpoint(KernelProductKinds.Resource.Definition),
      ),
    ),

    /** A modeled hydratable controller contains a child controller in the runtime controller tree. */
    ControllerHasChild: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-has-child',
      'A modeled hydratable controller contains a child controller in the runtime controller tree.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Configuration.Controller),
      ),
    ),

    /** A modeled controller owns a runtime binding through Controller.addBinding. */
    ControllerOwnsRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-owns-runtime-binding',
      'A modeled controller owns a runtime binding through Controller.addBinding.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
      ),
    ),

    /** A modeled controller owns a runtime watcher through Controller.addBinding. */
    ControllerOwnsRuntimeWatcher: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-owns-runtime-watcher',
      'A modeled controller owns a ComputedWatcher or ExpressionWatcher through Controller.addBinding during watcher setup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Binding.RuntimeWatcher),
      ),
    ),

    /** A modeled controller is associated with the compiled template for its resource definition. */
    ControllerUsesCompiledTemplate: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-uses-compiled-template',
      'A modeled controller is associated with the compiled template for its custom-element resource definition.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Template.CompiledTemplate),
      ),
    ),

    /** A modeled controller is associated with a nested instruction sequence owned by its hydration instruction. */
    ControllerUsesInstructionSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-uses-instruction-sequence',
      'A modeled controller is associated with a nested instruction sequence owned by its hydration instruction.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Instruction.Sequence),
      ),
    ),

    /** A modeled controller receives or owns a runtime IViewFactory value. */
    ControllerUsesViewFactory: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-uses-view-factory',
      'A modeled controller receives or owns a runtime IViewFactory value.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Configuration.ViewFactory),
      ),
    ),

    /** A template-controller controller linked itself to another template-controller controller. */
    ControllerLinksTemplateController: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-links-template-controller',
      'A template-controller controller linked itself to another template-controller controller through ICustomAttributeViewModel.link.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.Controller),
        productEndpoint(KernelProductKinds.Configuration.Controller),
      ),
    ),

    /** A lowered template-controller instruction created a runtime IViewFactory value. */
    InstructionCreatesViewFactory: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'instruction-creates-view-factory',
      'A lowered template-controller instruction created a runtime IViewFactory value.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Configuration.ViewFactory),
      ),
    ),

    /** A runtime IViewFactory creates synthetic views from a nested instruction sequence. */
    ViewFactoryUsesInstructionSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'view-factory-uses-instruction-sequence',
      'A runtime IViewFactory creates synthetic views from a nested instruction sequence.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.ViewFactory),
        productEndpoint(KernelProductKinds.Instruction.Sequence),
      ),
    ),

    /** A runtime IViewFactory carries the generated embedded custom-element definition used to create child views. */
    ViewFactoryUsesDefinition: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'view-factory-uses-definition',
      'A runtime IViewFactory carries the generated embedded custom-element definition used to create child views.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.ViewFactory),
        productEndpoint(KernelProductKinds.Resource.Definition),
      ),
    ),

    /** A runtime IViewFactory created a modeled aggregate synthetic-view controller. */
    ViewFactoryCreatesSyntheticView: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'view-factory-creates-synthetic-view',
      'A runtime IViewFactory created a modeled aggregate synthetic-view controller for TypeChecker-backed child-view analysis.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.ViewFactory),
        productEndpoint(KernelProductKinds.Configuration.Controller),
      ),
    ),

    /** A lowered rendering instruction created a modeled runtime controller. */
    InstructionCreatesController: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'instruction-creates-controller',
      'A lowered rendering instruction created a modeled runtime controller.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Configuration.Controller),
      ),
    ),

    /** A lowered rendering instruction evaluates its expression-owned work under a modeled runtime scope. */
    InstructionUsesBindingScope: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'instruction-uses-binding-scope',
      'A lowered rendering instruction evaluates expression-owned work under a modeled runtime Scope.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
      ),
    ),

    /** A runtime binding scope has an ordinary parent-scope edge. */
    BindingScopeHasParent: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'binding-scope-has-parent',
      'A runtime binding Scope has an ordinary parent-scope edge used by $parent and fallback lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
      ),
    ),

    /** A runtime binding scope uses its binding context for ordinary name lookup. */
    BindingScopeUsesBindingContext: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'binding-scope-uses-binding-context',
      'A runtime binding Scope uses its binding context for ordinary view-model or synthetic-context lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
        productEndpoint(KernelProductKinds.Configuration.BindingContext),
      ),
    ),

    /** A runtime binding scope uses its override context for template locals and contextual names. */
    BindingScopeUsesOverrideContext: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'binding-scope-uses-override-context',
      'A runtime binding Scope uses its override context for template locals, repeat metadata, and contextual lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
        productEndpoint(KernelProductKinds.Configuration.OverrideContext),
      ),
    ),
  },
  Compiler: {

    /** A multi-binding value site was split into one secondary segment. */
    SplitsMultiBindingSegment: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'splits-multi-binding-segment',
      'A custom-attribute inline multi-binding value site was split into one secondary segment.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.ValueSite),
        productEndpoint(KernelProductKinds.Compiler.MultiBindingSegment),
      ),
    ),

    /** A multi-binding value site was lowered into instructions. */
    LowersMultiBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'lowers-multi-binding',
      'A custom-attribute inline multi-binding value site was lowered into instruction products.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.ValueSite),
        productEndpoint(KernelProductKinds.Compiler.MultiBindingLowering),
      ),
    ),

    /** Attribute classification produced a runtime-shaped ICommandBuildInfo product. */
    BuildsCommandInput: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'builds-command-input',
      'Attribute classification or secondary multi-binding segment produced a runtime-shaped ICommandBuildInfo product for binding-command lowering.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Template.AttributeClassification,
          KernelProductKinds.Compiler.MultiBindingSegment,
        ),
        productEndpoint(KernelProductKinds.Compiler.BindingCommandBuildInput),
      ),
    ),

    /** Runtime-shaped ICommandBuildInfo was lowered through a binding command. */
    LowersBindingCommand: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'lowers-binding-command',
      'Runtime-shaped ICommandBuildInfo was lowered through a binding command.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.BindingCommandBuildInput),
        productEndpoint(KernelProductKinds.Compiler.BindingCommandLowering),
      ),
    ),

    /** Binding-command lowering used a selected command executable. */
    UsesBindingCommandExecutable: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-binding-command-executable',
      'Binding-command or secondary multi-binding lowering used a selected command executable.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Compiler.BindingCommandLowering,
          KernelProductKinds.Compiler.MultiBindingSegment,
          KernelProductKinds.Compiler.MultiBindingLowering,
        ),
        productEndpoint(KernelProductKinds.Compiler.BindingCommandExecutable),
      ),
    ),

    /** Binding-command lowering produced one lowered rendering instruction. */
    ProducesInstruction: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'produces-instruction',
      'Compiler lowering produced one lowered rendering instruction.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Compiler.BindingCommandLowering,
          KernelProductKinds.Compiler.MultiBindingLowering,
        ),
        productEndpoint(KernelProductKinds.Instruction.Instruction),
      ),
    ),

    /** Lowered instruction uses an expression parser publication. */
    UsesExpressionParse: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-expression-parse',
      'Lowered instruction uses an expression parser publication.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Template.ExpressionParse),
      ),
    ),

    /** Compiler scope provides a resource to template lookup. */
    ProvidesResource: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'provides-resource',
      'Compiler scope provides a resource to template lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.ResourceScope),
        productEndpoint(
          KernelProductKinds.Resource.DefinitionHeader,
          KernelProductKinds.Resource.Definition,
        ),
      ),
    ),

    /** Compiler scope provides an attribute-pattern or binding-command executable to parser/lowering services. */
    ProvidesSyntaxResource: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'provides-syntax-resource',
      'Compiler scope provides an attribute-pattern or binding-command executable to parser/lowering services.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.ResourceScope),
        productEndpoint(
          KernelProductKinds.Compiler.AttributePatternExecutable,
          KernelProductKinds.Compiler.BindingCommandExecutable,
        ),
      ),
    ),

    /** A compiler world uses a resource scope for lookup. */
    UsesResourceScope: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-resource-scope',
      'A compiler world uses a resource scope for lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.World),
        productEndpoint(KernelProductKinds.Compiler.ResourceScope),
      ),
    ),

    /** A compilation unit or context uses a compiler world. */
    UsesWorld: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-world',
      'A compilation unit or compilation context uses a compiler world.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Compiler.CompilationUnit,
          KernelProductKinds.Compiler.CompilationContext,
        ),
        productEndpoint(KernelProductKinds.Compiler.World),
      ),
    ),

    /** A compilation unit or context uses parser/lowering inquiry pressure. */
    UsesParseContext: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-parse-context',
      'A compilation unit or compilation context uses parser/lowering inquiry pressure.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Compiler.CompilationUnit,
          KernelProductKinds.Compiler.CompilationContext,
        ),
        productEndpoint(KernelProductKinds.Template.ParseContext),
      ),
    ),

    /** A compilation unit owns or uses its root runtime-shaped compilation context. */
    UsesCompilationContext: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-compilation-context',
      'A compilation unit owns or uses its root runtime-shaped compilation context.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.CompilationUnit),
        productEndpoint(KernelProductKinds.Compiler.CompilationContext),
      ),
    ),

    /** A compilation unit compiles an authored template source. */
    CompilesTemplate: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'compiles-template',
      'A compilation unit compiles an authored template source.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.CompilationUnit),
        productEndpoint(KernelProductKinds.Template.Source),
      ),
    ),

    /** A runtime-shaped compilation context uses a resource scope for lookup. */
    ContextUsesResourceScope: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'context-uses-resource-scope',
      'A runtime-shaped compilation context uses a resource scope for lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.CompilationContext),
        productEndpoint(KernelProductKinds.Compiler.ResourceScope),
      ),
    ),

    /** A runtime-shaped compilation context uses a compiler service product. */
    ContextUsesService: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'context-uses-service',
      'A runtime-shaped compilation context uses a compiler service product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.CompilationContext),
        productEndpoint(
          KernelProductKinds.Compiler.Service,
          KernelProductKinds.Compiler.AttributeParser,
          KernelProductKinds.Compiler.BindingCommandResolver,
        ),
      ),
    ),

    /** A compiler world uses a compiler service product. */
    UsesService: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-service',
      'A compiler world uses a compiler service product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.World),
        productEndpoint(
          KernelProductKinds.Compiler.Service,
          KernelProductKinds.Compiler.AttributeParser,
          KernelProductKinds.Compiler.BindingCommandResolver,
        ),
      ),
    ),

    /** A runtime Rendering service uses a runtime renderer product. */
    RenderingServiceUsesRenderer: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'rendering-service-uses-renderer',
      'A runtime Rendering service uses a runtime renderer product for one instruction kind.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.Service),
        productEndpoint(KernelProductKinds.Compiler.RuntimeRenderer),
      ),
    ),

    /** A syntax catalog includes a compiler-visible attribute-pattern or binding-command executable. */
    ContainsSyntaxResource: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'contains-syntax-resource',
      'A syntax catalog includes a compiler-visible attribute-pattern or binding-command executable.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.BuiltInSyntaxCatalog),
        productEndpoint(
          KernelProductKinds.Compiler.AttributePatternExecutable,
          KernelProductKinds.Compiler.BindingCommandExecutable,
        ),
      ),
    ),

    /** A runtime renderer catalog includes an IRenderer product. */
    ContainsRuntimeRenderer: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'contains-runtime-renderer',
      'A runtime renderer catalog includes an IRenderer product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.BuiltInRuntimeRendererCatalog),
        productEndpoint(KernelProductKinds.Compiler.RuntimeRenderer),
      ),
    ),

    AdmitsSyntaxCatalog: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'admits-syntax-catalog',
      'A known framework registration admission made a built-in syntax catalog available for attribute-parser and binding-command resolver input.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.ConfiguredSyntaxCatalogSelection),
        productEndpoint(KernelProductKinds.Compiler.BuiltInSyntaxCatalog),
      ),
    ),

    AdmitsRuntimeRendererCatalog: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'admits-runtime-renderer-catalog',
      'A known framework registration admission made a built-in runtime renderer catalog available for Rendering input.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.ConfiguredRuntimeRendererCatalogSelection),
        productEndpoint(KernelProductKinds.Compiler.BuiltInRuntimeRendererCatalog),
      ),
    ),

    /** An attribute-pattern executable owns a compiled SyntaxInterpreter pattern. */
    CompilesAttributePattern: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'compiles-attribute-pattern',
      'An attribute-pattern executable owns a compiled SyntaxInterpreter pattern.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.AttributePatternExecutable),
        productEndpoint(KernelProductKinds.Compiler.CompiledAttributePattern),
      ),
    ),

    /** A runtime IAttributeParser service uses a compiled SyntaxInterpreter machine. */
    UsesAttributeParserMachine: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-attribute-parser-machine',
      'A runtime IAttributeParser service uses a compiled SyntaxInterpreter machine.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.AttributeParser),
        productEndpoint(KernelProductKinds.Compiler.AttributeParserMachine),
      ),
    ),

    /** A runtime SyntaxInterpreter machine uses a compiled attribute pattern for matching. */
    UsesCompiledAttributePattern: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-compiled-attribute-pattern',
      'A runtime SyntaxInterpreter machine uses a compiled attribute pattern for matching.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.AttributeParserMachine),
        productEndpoint(KernelProductKinds.Compiler.CompiledAttributePattern),
      ),
    ),

    AdmitsResourceCatalog: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'admits-resource-catalog',
      'A known framework registration admission made a built-in resource catalog available for DI resource-slot spending.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.ConfiguredResourceCatalogSelection),
        productEndpoint(KernelProductKinds.Resource.BuiltInCatalog),
      ),
    ),
  },
  Template: {

    /** Markup or binding syntax references a resource by name or command. */
    ReferencesResource: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'references-resource',
      'Markup or binding syntax references a resource by name or command.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Template.HtmlNode,
          KernelProductKinds.Template.HtmlAttribute,
          KernelProductKinds.Template.AttributeSyntax,
          KernelProductKinds.Template.AttributeClassification,
        ),
        productEndpoint(
          KernelProductKinds.Resource.DefinitionHeader,
          KernelProductKinds.Resource.Definition,
          KernelProductKinds.Compiler.AttributePatternExecutable,
          KernelProductKinds.Compiler.BindingCommandExecutable,
        ),
      ),
    ),

    /** An authored template source belongs to a resource definition or definition header. */
    SourceForResource: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'source-for-resource',
      'An authored template source belongs to a resource definition or definition header.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.Source),
        productEndpoint(
          KernelProductKinds.Resource.DefinitionHeader,
          KernelProductKinds.Resource.Definition,
        ),
      ),
    ),

    /** An authored template source parsed into an HTML document product. */
    ParsesToHtmlDocument: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'parses-to-html-document',
      'An authored template source parsed into an HTML document product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.Source),
        productEndpoint(KernelProductKinds.Template.HtmlDocument),
      ),
    ),

    /** An authored HTML document compiled into a compiled-template product. */
    CompilesToCompiledTemplate: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'compiles-to-compiled-template',
      'An authored HTML document compiled into a compiled-template product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.HtmlDocument),
        productEndpoint(KernelProductKinds.Template.CompiledTemplate),
      ),
    ),

    /** A compiled template contains one runtime render target. */
    ContainsRenderTarget: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'contains-render-target',
      'A compiled template contains one runtime render target.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.CompiledTemplate),
        productEndpoint(KernelProductKinds.Template.RenderTarget),
      ),
    ),

    /** A runtime render target is backed by an authored HTML node. */
    RenderTargetForHtmlNode: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'render-target-for-html-node',
      'A runtime render target is backed by an authored HTML node.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.RenderTarget),
        productEndpoint(KernelProductKinds.Template.HtmlNode),
      ),
    ),

    /** A runtime render target uses one instruction sequence. */
    RenderTargetUsesInstructionSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'render-target-uses-instruction-sequence',
      'A runtime render target uses one ordered instruction sequence.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.RenderTarget),
        productEndpoint(KernelProductKinds.Instruction.Sequence),
      ),
    ),

    /** A compiled template uses one ordered surrogate instruction sequence for host attribute work. */
    CompiledTemplateUsesSurrogateInstructionSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'compiled-template-uses-surrogate-instruction-sequence',
      'A compiled template uses one ordered surrogate instruction sequence for host attribute work.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.CompiledTemplate),
        productEndpoint(KernelProductKinds.Instruction.Sequence),
      ),
    ),

    /** An authored HTML document or node contains a child HTML node. */
    ContainsHtmlNode: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'contains-html-node',
      'An authored HTML document or node contains a child HTML node.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Template.HtmlDocument,
          KernelProductKinds.Template.HtmlNode,
        ),
        productEndpoint(KernelProductKinds.Template.HtmlNode),
      ),
    ),

    /** An authored HTML node owns an authored HTML attribute. */
    ContainsHtmlAttribute: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'contains-html-attribute',
      'An authored HTML node owns an authored HTML attribute.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.HtmlNode),
        productEndpoint(KernelProductKinds.Template.HtmlAttribute),
      ),
    ),

    /** An authored HTML attribute parsed into runtime AttrSyntax. */
    ParsesToAttributeSyntax: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'parses-to-attribute-syntax',
      'An authored HTML attribute parsed into runtime AttrSyntax.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Template.HtmlAttribute,
          KernelProductKinds.Compiler.MultiBindingSegment,
        ),
        productEndpoint(KernelProductKinds.Template.AttributeSyntax),
      ),
    ),

    ClassifiesAttributeSyntax: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'classifies-attribute-syntax',
      'Runtime AttrSyntax was classified against resource scope, bindables, and binding-command lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.AttributeSyntax),
        productEndpoint(KernelProductKinds.Template.AttributeClassification),
      ),
    ),

    SelectsValueSite: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'selects-value-site',
      'A template/compiler product selected an authored value into a value-site product.',
      claimSignature(
        productEndpoint(
          KernelProductKinds.Template.HtmlNode,
          KernelProductKinds.Template.HtmlAttribute,
          KernelProductKinds.Template.AttributeSyntax,
          KernelProductKinds.Template.AttributeClassification,
          KernelProductKinds.Compiler.BindingCommandBuildInput,
          KernelProductKinds.Compiler.MultiBindingSegment,
        ),
        productEndpoint(KernelProductKinds.Template.ValueSite),
      ),
    ),

    ParsesToExpressionParse: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'parses-to-expression-parse',
      'A parser-owned template value site was published through the expression parser boundary.',
      claimSignature(
        productEndpoint(KernelProductKinds.Template.ValueSite),
        productEndpoint(KernelProductKinds.Template.ExpressionParse),
      ),
    ),
  },
  Binding: {

    /** A lowered instruction is rendered into a runtime binding instance. */
    InstructionCreatesRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'instruction-creates-runtime-binding',
      'A lowered rendering instruction is rendered into a runtime binding instance.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
      ),
    ),

    /** A lowered instruction selected a runtime renderer. */
    InstructionUsesRuntimeRenderer: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'instruction-uses-runtime-renderer',
      'A lowered rendering instruction selected a runtime renderer.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Compiler.RuntimeRenderer),
      ),
    ),

    /** A runtime renderer produced a runtime binding instance. */
    RuntimeRendererCreatesRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-renderer-creates-runtime-binding',
      'A runtime renderer produced a runtime binding instance.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.RuntimeRenderer),
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
      ),
    ),

    /** A lowered instruction is rendered into an immediate target operation. */
    InstructionCreatesTargetOperation: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'instruction-creates-target-operation',
      'A lowered rendering instruction is rendered into an immediate target operation.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Binding.TargetOperation),
      ),
    ),

    /** A runtime renderer performed an immediate target operation. */
    RuntimeRendererUsesTargetOperation: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-renderer-uses-target-operation',
      'A runtime renderer performed an immediate target operation during Rendering.render.',
      claimSignature(
        productEndpoint(KernelProductKinds.Compiler.RuntimeRenderer),
        productEndpoint(KernelProductKinds.Binding.TargetOperation),
      ),
    ),

    /** A runtime binding targets a child or custom-attribute controller rather than the rendering controller itself. */
    RuntimeBindingTargetsController: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-targets-controller',
      'A runtime binding targets a child or custom-attribute controller while being owned by its rendering controller.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Configuration.Controller),
      ),
    ),

    /** A runtime binding owns another runtime binding through a surrogate controller-like lane. */
    RuntimeBindingOwnsRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-owns-runtime-binding',
      'A runtime binding owns another runtime binding through a surrogate controller-like lane such as SpreadBinding.addBinding.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
      ),
    ),

    /** A runtime binding exposes a scope effect such as let or iterator locals. */
    RuntimeBindingCreatesScopeEffect: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-creates-scope-effect',
      'A runtime binding exposes a scope effect such as let target assignment or iterator locals.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.ScopeEffect),
      ),
    ),

    /** A runtime binding selected a target-side accessor or observer. */
    RuntimeBindingUsesTargetAccess: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-uses-target-access',
      'A runtime binding selected a target-side accessor or observer through runtime observation lookup.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.TargetAccess),
      ),
    ),

    /** A runtime binding selected a direct target update operation. */
    RuntimeBindingUsesTargetOperation: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-uses-target-operation',
      'A runtime binding selected a direct target update operation such as classList.toggle, style.setProperty, or setAttribute/removeAttribute.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.TargetOperation),
      ),
    ),

    /** A runtime binding selected a source-side update operation. */
    RuntimeBindingUsesSourceOperation: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-uses-source-operation',
      'A runtime binding selected a source-side update operation such as assigning a resolved ref target into Scope.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.SourceOperation),
      ),
    ),

    /** A runtime binding exposes a modeled observer/accessor value channel. */
    RuntimeBindingUsesValueChannel: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-uses-value-channel',
      'A runtime binding exposes a modeled observer or accessor value channel through observation semantics.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.ValueChannel),
      ),
    ),

    /** A runtime binding exposes a modeled source/target data-flow edge. */
    RuntimeBindingUsesDataFlow: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-uses-data-flow',
      'A runtime binding exposes a modeled source/target data-flow edge through Scope lookup and observation facts.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.DataFlow),
      ),
    ),

    /** A runtime binding exposes a source-side dependency read collected by template connectable observation. */
    RuntimeBindingUsesObservedDependency: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-uses-observed-dependency',
      'A runtime binding exposes a source-side dependency read collected during source-to-target template connectable observation.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeBinding),
        productEndpoint(KernelProductKinds.Binding.ObservedDependency),
      ),
    ),

    /** A runtime watcher exposes a source-side dependency read collected by watcher execution. */
    RuntimeWatcherUsesObservedDependency: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-watcher-uses-observed-dependency',
      'A runtime watcher exposes a source-side dependency read collected during watcher expression evaluation.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.RuntimeWatcher),
        productEndpoint(KernelProductKinds.Binding.ObservedDependency),
      ),
    ),

    /** A runtime binding data-flow edge is explained by a source-side observed dependency. */
    DataFlowUsesObservedDependency: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'data-flow-uses-observed-dependency',
      'A runtime binding data-flow edge is explained by a source-side dependency read collected during source-to-target evaluation.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.DataFlow),
        productEndpoint(KernelProductKinds.Binding.ObservedDependency),
      ),
    ),

    /** A binding scope effect produced a modeled runtime Scope. */
    ScopeEffectCreatesBindingScope: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'scope-effect-creates-binding-scope',
      'A binding scope effect produced a modeled runtime Scope.',
      claimSignature(
        productEndpoint(KernelProductKinds.Binding.ScopeEffect),
        productEndpoint(KernelProductKinds.Configuration.BindingScope),
      ),
    ),
  },
  Observation: {

    /** A source-backed observer exposes a dependency read collected by its execution path. */
    SourceObserverUsesObservedDependency: defineClaimPredicate(
      KernelVocabularyNamespace.Observation,
      'source-observer-uses-observed-dependency',
      'A source-backed observer exposes a dependency read collected by computed-observer or controlled-computed-observer execution.',
      claimSignature(
        productEndpoint(KernelProductKinds.Observation.SourceObserver),
        productEndpoint(KernelProductKinds.Binding.ObservedDependency),
      ),
    ),

    /** A source-level IEffect exposes a dependency read collected by its observer path. */
    RuntimeEffectUsesObservedDependency: defineClaimPredicate(
      KernelVocabularyNamespace.Observation,
      'runtime-effect-uses-observed-dependency',
      'A source-level IEffect exposes a dependency read collected by Observation.watch(...) execution.',
      claimSignature(
        productEndpoint(KernelProductKinds.Observation.RuntimeEffect),
        productEndpoint(KernelProductKinds.Binding.ObservedDependency),
      ),
    ),
  },
  Instruction: {

    /** A runtime-compiled spread instruction came from a captured AttrSyntax. */
    DynamicInstructionOriginatesFromCapturedAttributeSyntax: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'dynamic-instruction-originates-from-captured-attribute-syntax',
      'A dynamic instruction allocated during TemplateCompiler.compileSpread originated from a captured runtime AttrSyntax product.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Template.AttributeSyntax),
      ),
    ),

    /** A runtime-compiled spread instruction used the hydrate-element instruction that owned the captured AttrSyntax. */
    DynamicInstructionUsesCapturedAttributeContextInstruction: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'dynamic-instruction-uses-captured-attribute-context-instruction',
      'A dynamic instruction allocated during TemplateCompiler.compileSpread used the hydrate-element instruction whose captured AttrSyntax products formed the spread compilation input.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Instruction.Instruction),
      ),
    ),

    /** A runtime-compiled spread instruction used a concrete hydration context controller. */
    DynamicInstructionUsesCapturedAttributeContextController: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'dynamic-instruction-uses-captured-attribute-context-controller',
      'A dynamic instruction allocated during TemplateCompiler.compileSpread used a concrete hydration context controller, distinguishing repeated uses of the same lowered instruction.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Configuration.Controller),
      ),
    ),

    /** A lowered hydrate instruction owns a child instruction sequence. */
    InstructionOwnsChildSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'instruction-owns-child-sequence',
      'A lowered hydrate instruction owns a child instruction sequence.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Instruction),
        productEndpoint(KernelProductKinds.Instruction.Sequence),
      ),
    ),

    /** An instruction sequence contains a lowered rendering instruction. */
    SequenceContainsInstruction: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'sequence-contains-instruction',
      'An instruction sequence contains a lowered rendering instruction.',
      claimSignature(
        productEndpoint(KernelProductKinds.Instruction.Sequence),
        productEndpoint(KernelProductKinds.Instruction.Instruction),
      ),
    ),
  },
} as const;
