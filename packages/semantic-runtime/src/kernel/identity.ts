import type { AddressHandle, IdentityHandle } from './handles.js';
import type {
  BindingKindKey,
  InstructionKindKey,
} from './vocabulary.js';

export const enum IdentityRecordKind {
  /** Names a TypeScript declaration without keeping a ts.Symbol alive. */
  TypeScriptDeclarationIdentity = 'typescript-declaration-identity',
  /** Names an Aurelia resource such as a custom element or value converter. */
  AureliaResourceIdentity = 'aurelia-resource-identity',
  /** Names an Aurelia attribute-pattern syntax resource by its parser pattern and symbols. */
  AureliaAttributePatternIdentity = 'aurelia-attribute-pattern-identity',
  /** Names a dependency injection key as understood by Aurelia. */
  DiKeyIdentity = 'di-key-identity',
  /** Names an abstract Aurelia container in the analyzed app world. */
  ContainerIdentity = 'container-identity',
  /** Names a DI product produced while spending configuration or registration into a container world. */
  DiProductIdentity = 'di-product-identity',
  /** Names a registration admission before container spending. */
  RegistrationIdentity = 'registration-identity',
  /** Names an app/configuration flow product before DI world construction. */
  ConfigurationIdentity = 'configuration-identity',
  /** Names compiler service, scope, parser, syntax, and lowering products that are not runtime resources. */
  CompilerIdentity = 'compiler-identity',
  /** Names a template at an authored, transformed, or compiled phase. */
  TemplateIdentity = 'template-identity',
  /** Names a node inside a template tree by semantic anchor, not child path alone. */
  TemplateNodeIdentity = 'template-node-identity',
  /** Names a binding produced from markup or compiler lowering. */
  BindingIdentity = 'binding-identity',
  /** Names a rendering instruction produced by compiler lowering. */
  InstructionIdentity = 'instruction-identity',
  /** Names a type-system projection visible to template/expression inquiry. */
  TypeSystemIdentity = 'type-system-identity',
  /** Names synthetic structure created by policy or compiler generation. */
  GeneratedIdentity = 'generated-identity',
}

export const enum IdentityStability {
  /** Use when consumers should not keep the identity after the current calculation step. */
  Unknown = 'unknown',
  /** Use for identities that only exist during one scanner or materializer invocation. */
  Ephemeral = 'ephemeral',
  /** Use for identities stable within the active editor session or TypeScript program instance. */
  Session = 'session',
  /** Use for identities tied to source declarations the active store can remap or invalidate. */
  SourceStable = 'source-stable',
  /** Use for identities derived from Aurelia semantics, such as resource name plus kind. */
  SemanticStable = 'semantic-stable',
  /** Use for identities backed by framework/package contracts rather than local source coordinates. */
  CrossProjectStable = 'cross-project-stable',
}

export const enum IdentityDomain {
  /** A TypeScript declaration observed through the checker or AST. */
  TypeScriptDeclaration = 'typescript-declaration',
  /** An Aurelia resource such as a custom element or binding behavior. */
  AureliaResource = 'aurelia-resource',
  /** A dependency injection lookup or registration key. */
  DiKey = 'di-key',
  /** An abstract Aurelia container participating in DI world construction. */
  Container = 'container',
  /** A DI product produced while spending configuration or registration into a container world. */
  DiProduct = 'di-product',
  /** A registration admission before container spending. */
  Registration = 'registration',
  /** An app/configuration flow product before DI world construction. */
  Configuration = 'configuration',
  /** A compiler service, scope, parser, syntax, or lowering product. */
  Compiler = 'compiler',
  /** A template unit before or after compiler transformation. */
  Template = 'template',
  /** A node inside a template unit. */
  TemplateNode = 'template-node',
  /** A binding between template syntax and runtime behavior. */
  Binding = 'binding',
  /** A rendering instruction emitted by template lowering. */
  Instruction = 'instruction',
  /** Type-system type and member projections for template/expression inquiry. */
  TypeSystem = 'type-system',
  /** Synthetic structure created by compiler or tooling policy. */
  Generated = 'generated',
}

export const enum AureliaResourceIdentityKind {
  /** Use when resource classification is not known yet. */
  Unknown = 'unknown',
  /** A custom element available by element name in markup. */
  CustomElement = 'custom-element',
  /** A custom attribute available by attribute name in markup. */
  CustomAttribute = 'custom-attribute',
  /** A template controller such as repeat.for or if.bind. */
  TemplateController = 'template-controller',
  /** A value converter referenced from binding expressions. */
  ValueConverter = 'value-converter',
  /** A binding behavior referenced from binding expressions. */
  BindingBehavior = 'binding-behavior',
  /** A binding command such as bind, trigger, delegate, or two-way variants. */
  BindingCommand = 'binding-command',
}

export const enum DiKeyIdentityKind {
  /** Use when a DI key expression cannot be classified yet. */
  Unknown = 'unknown',
  /** A class constructor used directly as a DI key. */
  Class = 'class',
  /** An interface symbol created by Aurelia's DI helpers. */
  Interface = 'interface',
  /** A JavaScript symbol used as a DI key. */
  Symbol = 'symbol',
  /** A string key used through resolver or registration APIs. */
  String = 'string',
  /** A resource identity used as a registration or lookup key. */
  Resource = 'resource',
  /** A resolver object that computes or redirects the lookup. */
  Resolver = 'resolver',
}

export const enum DiResolverKeyKind {
  /** Use when a resolver expression was observed but not classified. */
  Unknown = 'unknown',
  /** Resolver helper that redirects to a lazily resolved key. */
  Lazy = 'lazy',
  /** Resolver helper that returns all registrations for a key. */
  All = 'all',
  /** Resolver helper that marks a key lookup as optional. */
  Optional = 'optional',
  /** Resolver helper that creates a factory function for a key. */
  Factory = 'factory',
  /** Resolver helper that restricts lookup to the current container. */
  Own = 'own',
  /** Resolver helper that reads from the hydration context. */
  FromHydrationContext = 'from-hydration-context',
  /** Resolver helper that creates a new instance for the request. */
  NewInstanceOf = 'new-instance-of',
  /** Resolver helper that creates a new instance for the current scope. */
  NewInstanceForScope = 'new-instance-for-scope',
  /** Resolver object supplied by user code or framework code outside the known helper set. */
  Custom = 'custom',
}

export const enum ContainerIdentityKind {
  /** Use while container role is not known yet. */
  Unknown = 'unknown',
  /** Root container for an app or analysis world. */
  Root = 'root',
  /** Child container created from a parent container. */
  Child = 'child',
  /** Synthetic container introduced by tooling policy or incomplete configuration recovery. */
  Synthetic = 'synthetic',
}

export const enum DiProductIdentityKind {
  /** Use when DI product identity shape is not known yet. */
  Unknown = 'unknown',
  /** A runtime-shaped resolver value produced from a registration admission. */
  Resolver = 'resolver',
  /** A runtime-shaped IRegistry value before its body is interpreted. */
  Registry = 'registry',
  /** Runtime-shaped ParameterizedRegistry produced by Registration.defer. */
  ParameterizedRegistry = 'parameterized-registry',
  /** An operation that spends a registration admission against a container. */
  ContainerRegistration = 'container-registration',
  /** A row in a container's resolver map. */
  ResolverSlot = 'resolver-slot',
  /** The built-in self resolver row for IContainer. */
  SelfResolverSlot = 'self-resolver-slot',
  /** A row in a container's resource lookup table. */
  ResourceSlot = 'resource-slot',
  /** A row in a container tree's factory map. */
  FactorySlot = 'factory-slot',
}

export const enum ConfigurationIdentityKind {
  /** Use when configuration identity shape is not known yet. */
  Unknown = 'unknown',
  /** Aurelia facade construction or static facade admission. */
  Aurelia = 'aurelia',
  /** AppRoot configuration passed to `.app(...)` or equivalent. */
  AppRootConfig = 'app-root-config',
  /** AppRoot boundary that connects host, root component, container, and controller. */
  AppRoot = 'app-root',
  /** Runtime controller boundary owned by app or template construction. */
  Controller = 'controller',
  /** Runtime Scope used by controller activation and binding expression lookup. */
  BindingScope = 'binding-scope',
  /** Runtime binding context used by Scope lookup. */
  BindingContext = 'binding-context',
  /** Runtime override context used by Scope lookup. */
  OverrideContext = 'override-context',
  /** Ordered app/plugin/registry/builder configuration flow. */
  Sequence = 'sequence',
  /** One ordered step inside a configuration sequence. */
  Step = 'step',
  /** One source-backed contribution to a configuration option path. */
  OptionContribution = 'option-contribution',
  /** Deferred lifecycle task created by `AppTask.*(...)`. */
  AppTask = 'app-task',
  /** AppRoot dispatch point for one AppTask lifecycle slot. */
  AppTaskSlotDispatch = 'app-task-slot-dispatch',
}

export const enum CompilerIdentityKind {
  /** Use when compiler product identity shape is not known yet. */
  Unknown = 'unknown',
  /** Container-scoped compiler world used to parse, classify, and lower a template. */
  TemplateCompilerWorld = 'template-compiler-world',
  /** One compiler request that binds a template source, compiler world, parse context, and root context. */
  TemplateCompilationUnit = 'template-compilation-unit',
  /** Runtime-shaped CompilationContext frame used while compiling a template or nested view. */
  TemplateCompilationContext = 'template-compilation-context',
  /** Resource and syntax-resource scope visible to one compiler world. */
  TemplateResourceScope = 'template-resource-scope',
  /** Runtime-shaped compiler service such as a resource resolver or attribute parser. */
  TemplateCompilerService = 'template-compiler-service',
  /** Inquiry-driven parse context shared by HTML, attribute, expression, and lowering passes. */
  TemplateParseContext = 'template-parse-context',
  /** Authored HTML document product produced by the template HTML parser. */
  HtmlDocument = 'html-document',
  /** Authored HTML attribute product produced by the template HTML parser. */
  HtmlAttribute = 'html-attribute',
  /** Compiled template product after compiler DOM pass-through and instruction row assembly. */
  CompiledTemplate = 'compiled-template',
  /** Runtime render target corresponding to one compiled instruction row. */
  TemplateRenderTarget = 'template-render-target',
  /** Ordered runtime instruction row for one render target or surrogate host. */
  TemplateInstructionSequence = 'template-instruction-sequence',
  /** Runtime SyntaxInterpreter machine compiled from registered attribute patterns. */
  AttributeParserMachine = 'attribute-parser-machine',
  /** Runtime CompiledPattern entry inside a SyntaxInterpreter machine. */
  CompiledAttributePattern = 'compiled-attribute-pattern',
  /** Catalog of framework-provided syntax resources admitted by configuration. */
  BuiltInSyntaxCatalog = 'built-in-syntax-catalog',
  /** Selection of built-in syntax catalogs admitted by one known framework registration. */
  ConfiguredSyntaxCatalogSelection = 'configured-syntax-catalog-selection',
  /** Catalog of framework-provided runtime renderers admitted by configuration. */
  BuiltInRuntimeRendererCatalog = 'built-in-runtime-renderer-catalog',
  /** Selection of built-in runtime renderer catalogs admitted by one known framework registration. */
  ConfiguredRuntimeRendererCatalogSelection = 'configured-runtime-renderer-catalog-selection',
  /** Runtime IRenderer product selected by Rendering for one instruction type. */
  RuntimeRenderer = 'runtime-renderer',
  /** Catalog of framework-provided resource definition headers admitted by configuration. */
  BuiltInResourceCatalog = 'built-in-resource-catalog',
  /** Selection of built-in resource catalogs admitted by one known framework registration. */
  ConfiguredResourceCatalogSelection = 'configured-resource-catalog-selection',
  /** Runtime AttrSyntax product after attribute-pattern interpretation. */
  AttributeSyntax = 'attribute-syntax',
  /** Attribute classification product after resource/bindable lookup. */
  AttributeClassification = 'attribute-classification',
  /** Authored template value site selected for expression parsing or another grammar. */
  TemplateValueSite = 'template-value-site',
  /** Expression parser publication for one parser-owned template value site. */
  TemplateExpressionParse = 'template-expression-parse',
  /** Executable attribute-pattern handler visible to IAttributeParser. */
  AttributePatternExecutable = 'attribute-pattern-executable',
  /** Executable binding-command handler visible to IBindingCommandResolver. */
  BindingCommandExecutable = 'binding-command-executable',
  /** Runtime ICommandBuildInfo product before command lowering. */
  BindingCommandBuildInput = 'binding-command-build-input',
  /** Binding-command lowering result before final instruction sequence assembly. */
  BindingCommandLowering = 'binding-command-lowering',
  /** One secondary custom-attribute inline multi-binding segment. */
  MultiBindingSegment = 'multi-binding-segment',
  /** Inline custom-attribute multi-binding lowering result before final instruction sequence assembly. */
  MultiBindingLowering = 'multi-binding-lowering',
  /** Runtime binding scope effect such as let target assignment or iterator locals. */
  BindingScopeEffect = 'binding-scope-effect',
}

export const enum TypeSystemIdentityKind {
  /** Use when the checker-backed identity shape is not known yet. */
  Unknown = 'unknown',
  /** Projection of a TypeScript type as a queryable product. */
  TypeShape = 'type-shape',
  /** Projection of a member visible on a TypeScript type. */
  TypeMember = 'type-member',
}

export const enum TemplatePhase {
  /** Authored markup before compiler transformation. */
  Authored = 'authored',
  /** Markup after compiler DOM rewrites such as render locations. */
  Transformed = 'transformed',
  /** Lowered template with instructions and binding records available. */
  Compiled = 'compiled',
}

/** Identity for a TypeScript declaration without retaining checker-owned symbol objects. */
export class TypeScriptDeclarationIdentity {
  /** String discriminator for serialized TS declaration identity records. */
  readonly kind = IdentityRecordKind.TypeScriptDeclarationIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.TypeScriptDeclaration;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Module or source-file key that owns the declaration when known. */
    readonly moduleKey: string | null,
    /** Exported name used by downstream modules when this declaration is exported. */
    readonly exportedName: string | null,
    /** Local declaration name as written in source when available. */
    readonly localName: string | null,
    /** Source address handle for the declaration or best-known name span. */
    readonly declarationAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Identity for an Aurelia resource visible to markup, bindings, DI, or configuration. */
export class AureliaResourceIdentity {
  /** String discriminator for serialized resource identity records. */
  readonly kind = IdentityRecordKind.AureliaResourceIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.AureliaResource;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Aurelia resource kind that determines syntax and lookup behavior. */
    readonly resourceKind: AureliaResourceIdentityKind,
    /** Resource name as available to templates or expression syntax. */
    readonly name: string | null,
    /** Optional declaration identity handle that produced or owns this resource. */
    readonly declarationHandle: IdentityHandle | null = null,
  ) {}
}

/** Identity for an Aurelia attribute parser pattern. */
export class AureliaAttributePatternIdentity {
  /** String discriminator for serialized attribute-pattern identity records. */
  readonly kind = IdentityRecordKind.AureliaAttributePatternIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.AureliaResource;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Pattern string consumed by Aurelia's attribute parser. */
    readonly pattern: string | null,
    /** Symbol string that defines how the pattern is parsed into syntax parts. */
    readonly symbols: string | null,
    /** Optional declaration identity handle for the pattern handler type. */
    readonly declarationHandle: IdentityHandle | null = null,
    /** Optional source span for the pattern definition entry. */
    readonly definitionAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Identity for an abstract container in the analyzed DI world. */
export class ContainerIdentity {
  /** String discriminator for serialized container identity records. */
  readonly kind = IdentityRecordKind.ContainerIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Container;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Runtime-shaped container role. */
    readonly containerKind: ContainerIdentityKind,
    /** Parent container identity when this is a child container. */
    readonly parentHandle: IdentityHandle | null,
    /** Root container identity when known and different from this handle. */
    readonly rootHandle: IdentityHandle | null,
    /** Source address for the container-producing expression or app boundary. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Local source name for traces when the container is source-backed. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for a DI product produced while constructing an abstract container world. */
export class DiProductIdentity {
  /** String discriminator for serialized DI product identity records. */
  readonly kind = IdentityRecordKind.DiProductIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiProduct;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** DI product lane represented by this identity. */
    readonly productKind: DiProductIdentityKind,
    /** Container identity that owns this product, when applicable. */
    readonly containerHandle: IdentityHandle | null,
    /** Source or admission identity that caused this product to exist. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address for the operation or product. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity whose source expression stayed open. */
export class UnknownDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Unknown;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Address handle for the key expression that could not be classified. */
    readonly keyAddressHandle: AddressHandle | null,
    /** Short explanation of what prevented key classification. */
    readonly summary: string,
  ) {}
}

/** DI key identity for a class constructor used directly as the key. */
export class ClassDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Class;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Declaration identity for the class constructor used as the key. */
    readonly declarationHandle: IdentityHandle,
    /** Local class name used for app maps and traces. */
    readonly localName: string | null,
    /** Address handle for the expression or declaration that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity for an Aurelia interface symbol such as IContainer or IAppTask. */
export class InterfaceDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Interface;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Runtime-facing interface name, such as IContainer. */
    readonly interfaceName: string,
    /** Declaration identity for the interface symbol value. */
    readonly declarationHandle: IdentityHandle | null = null,
    /** Address handle for the expression or declaration that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity for a string key. */
export class StringDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.String;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Exact string key used by registration or lookup. */
    readonly value: string,
    /** Address handle for the expression or literal that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity for a JavaScript symbol key. */
export class SymbolDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Symbol;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Declaration identity for a named symbol, when the symbol is source-backed. */
    readonly declarationHandle: IdentityHandle | null,
    /** Symbol description or Symbol.for key when statically known. */
    readonly symbolName: string | null,
    /** Address handle for the expression or declaration that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity for an Aurelia resource key such as a custom element name. */
export class ResourceDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Resource;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Resource identity that determines the semantic resource key. */
    readonly resourceHandle: IdentityHandle,
    /** Runtime resource key string when it has been materialized. */
    readonly resourceKey: string | null,
    /** Address handle for the expression or definition that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity for a resolver object or resolver helper expression. */
export class ResolverDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = IdentityRecordKind.DiKeyIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.DiKey;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Resolver;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Known resolver helper family, or custom/open when not classified. */
    readonly resolverKind: DiResolverKeyKind,
    /** Inner DI key identity read by redirecting resolver helpers, when present. */
    readonly innerKeyHandle: IdentityHandle | null,
    /** Address handle for the resolver expression that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Concrete DI key identity variants understood by the kernel. */
export type DiKeyIdentity =
  | UnknownDiKeyIdentity
  | ClassDiKeyIdentity
  | InterfaceDiKeyIdentity
  | StringDiKeyIdentity
  | SymbolDiKeyIdentity
  | ResourceDiKeyIdentity
  | ResolverDiKeyIdentity;

/** Identity for a registration admission before container spending. */
export class RegistrationIdentity {
  /** String discriminator for serialized registration identity records. */
  readonly kind = IdentityRecordKind.RegistrationIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Registration;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** DI key identity offered by this registration admission, when this admission shape has one. */
    readonly keyHandle: IdentityHandle | null,
    /** Source address handle for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Identity for app/configuration flow products before DI world construction. */
export class ConfigurationIdentity {
  /** String discriminator for serialized configuration identity records. */
  readonly kind = IdentityRecordKind.ConfigurationIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Configuration;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Configuration product lane represented by this identity. */
    readonly configurationKind: ConfigurationIdentityKind,
    /** Optional owner identity such as an Aurelia facade, AppRoot, sequence, or plugin declaration. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address handle for the expression, declaration, or dispatch point. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Local source name for traces when the configuration product is source-backed. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for compiler service, scope, parser, syntax, and lowering products. */
export class CompilerIdentity {
  /** String discriminator for serialized compiler identity records. */
  readonly kind = IdentityRecordKind.CompilerIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Compiler;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Compiler product lane represented by this identity. */
    readonly compilerKind: CompilerIdentityKind,
    /** Optional owner identity such as a container, resource, template, node, or service. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source or generated address handle for navigation and explanation. */
    readonly addressHandle: AddressHandle | null = null,
    /** Local source/runtime name for traces when one exists. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for a template across authored, transformed, and compiled phases. */
export class TemplateIdentity {
  /** String discriminator for serialized template identity records. */
  readonly kind = IdentityRecordKind.TemplateIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Template;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Optional component/resource identity handle that owns this template. */
    readonly ownerHandle: IdentityHandle | null,
    /** Template phase represented by this identity. */
    readonly phase: TemplatePhase,
    /** Optional template address handle for navigation or tree-local addressing. */
    readonly addressHandle: AddressHandle | null = null,
  ) {}
}

/** Identity for a template node derived from authored anchors and transform provenance. */
export class TemplateNodeIdentity {
  /** String discriminator for serialized template-node identity records. */
  readonly kind = IdentityRecordKind.TemplateNodeIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.TemplateNode;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity; child path alone should not be source-stable. */
    readonly stability: IdentityStability,
    /** Identity handle of the template that owns this node. */
    readonly templateHandle: IdentityHandle,
    /** Node-local semantic key derived from source anchors, phase, and transform provenance. */
    readonly nodeKey: string,
    /** Optional template-node address handle carrying the current tree child path. */
    readonly addressHandle: AddressHandle | null = null,
  ) {}
}

/** Identity for a binding produced from template syntax or compiler lowering. */
export class BindingIdentity {
  /** String discriminator for serialized binding identity records. */
  readonly kind = IdentityRecordKind.BindingIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Binding;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Template node, resource, or instruction identity that owns the binding. */
    readonly ownerHandle: IdentityHandle,
    /** Controlled vocabulary key describing the binding kind. */
    readonly bindingKindKey: BindingKindKey,
  ) {}
}

/** Identity for a rendering instruction emitted by template lowering. */
export class InstructionIdentity {
  /** String discriminator for serialized instruction identity records. */
  readonly kind = IdentityRecordKind.InstructionIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Instruction;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Template, node, binding, or generated identity that owns the instruction. */
    readonly ownerHandle: IdentityHandle,
    /** Controlled vocabulary key describing the instruction kind. */
    readonly instructionKindKey: InstructionKindKey,
  ) {}
}

/** Identity for a type-system type or member projection. */
export class TypeSystemIdentity {
  /** String discriminator for serialized type-system identity records. */
  readonly kind = IdentityRecordKind.TypeSystemIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.TypeSystem;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Type-system product lane represented by this identity. */
    readonly typeSystemKind: TypeSystemIdentityKind,
    /** Checker/program-local key that lets the hot sidecar reconnect to current TypeChecker state. */
    readonly checkerKey: string,
    /** Optional owner identity such as a declaration, binding context, or containing type shape. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address for the declaration or use-site that caused this projection. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Human-readable checker display for traces; not a semantic carrier. */
    readonly display: string | null = null,
  ) {}
}

/** Identity for synthetic compiler/tooling structure that still needs store tracking. */
export class GeneratedIdentity {
  /** String discriminator for serialized generated identity records. */
  readonly kind = IdentityRecordKind.GeneratedIdentity;
  /** Identity-domain discriminator for cheap filtering. */
  readonly domain = IdentityDomain.Generated;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Retention promise for this identity inside the active analysis store. */
    readonly stability: IdentityStability,
    /** Name of the compiler/tooling mechanism that generated the identity. */
    readonly generator: string,
    /** Optional authored or semantic handle that explains why this generated identity exists. */
    readonly anchorHandle: IdentityHandle | AddressHandle | null = null,
  ) {}
}

/** Union of semantic identity records that can be stored in indexes and expanded by queries. */
export type SemanticIdentity =
  | TypeScriptDeclarationIdentity
  | AureliaResourceIdentity
  | AureliaAttributePatternIdentity
  | DiKeyIdentity
  | ContainerIdentity
  | DiProductIdentity
  | RegistrationIdentity
  | ConfigurationIdentity
  | CompilerIdentity
  | TemplateIdentity
  | TemplateNodeIdentity
  | BindingIdentity
  | InstructionIdentity
  | TypeSystemIdentity
  | GeneratedIdentity;
