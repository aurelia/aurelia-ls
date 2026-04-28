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
  /** Names a registration of a key into a container or configuration flow. */
  RegistrationIdentity = 'registration-identity',
  /** Names a template at an authored, transformed, or compiled phase. */
  TemplateIdentity = 'template-identity',
  /** Names a node inside a template tree by semantic anchor, not child path alone. */
  TemplateNodeIdentity = 'template-node-identity',
  /** Names a binding produced from markup or compiler lowering. */
  BindingIdentity = 'binding-identity',
  /** Names a rendering instruction produced by compiler lowering. */
  InstructionIdentity = 'instruction-identity',
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
  /** A container or configuration registration event. */
  Registration = 'registration',
  /** A template unit before or after compiler transformation. */
  Template = 'template',
  /** A node inside a template unit. */
  TemplateNode = 'template-node',
  /** A binding between template syntax and runtime behavior. */
  Binding = 'binding',
  /** A rendering instruction emitted by template lowering. */
  Instruction = 'instruction',
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

/** Identity for a registration of one key into a container or configuration pipeline. */
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
    /** DI key identity offered by this registration admission. */
    readonly keyHandle: IdentityHandle,
    /** Source address handle for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Optional container/configuration identity that receives the registration. */
    readonly containerHandle: IdentityHandle | null = null,
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
  | RegistrationIdentity
  | TemplateIdentity
  | TemplateNodeIdentity
  | BindingIdentity
  | InstructionIdentity
  | GeneratedIdentity;
