import type { AddressHandle, IdentityHandle } from './handles.js';
import type {
  BindingKindKey,
  InstructionKindKey,
  ProductKindKey,
} from './vocabulary.js';

export const enum AureliaResourceIdentityKind {
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
  /** A resolver object used as a key expression that computes or redirects lookup. */
  ResolverKey = 'resolver-key',
}

export const enum DiResolverKeyKind {
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
  /** Root container for an app or analysis world. */
  Root = 'root',
  /** Child container created from a parent container. */
  Child = 'child',
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
  readonly kind = 'typescript-declaration-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'aurelia-resource-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'aurelia-attribute-pattern-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'container-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'di-product-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
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
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Unknown;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Address handle for the key expression that could not be classified. */
    readonly keyAddressHandle: AddressHandle | null,
    /** Short explanation of what prevented key classification. */
    readonly summary: string,
  ) {}
}

/** DI key identity for a class constructor used directly as the key. */
export class ClassDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Class;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Interface;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.String;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Exact string key used by registration or lookup. */
    readonly value: string,
    /** Address handle for the expression or literal that supplied the key. */
    readonly keyAddressHandle: AddressHandle | null = null,
  ) {}
}

/** DI key identity for a JavaScript symbol key. */
export class SymbolDiKeyIdentity {
  /** String discriminator for serialized DI key identity records. */
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Symbol;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.Resource;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'di-key-identity' as const;
  /** Runtime-relevant key shape discriminator. */
  readonly keyKind = DiKeyIdentityKind.ResolverKey;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'registration-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** DI key identity offered by this registration admission, when this admission shape has one. */
    readonly keyHandle: IdentityHandle | null,
    /** Source address handle for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Identity for app/configuration flow products before DI world construction. */
export class ConfigurationIdentity {
  /** String discriminator for serialized configuration identity records. */
  readonly kind = 'configuration-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
    /** Optional owner identity such as an Aurelia facade, AppRoot, sequence, or plugin declaration. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address handle for the expression, declaration, or dispatch point. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Local source name for traces when the configuration product is source-backed. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for router configuration and navigation products. */
export class RouterIdentity {
  /** String discriminator for serialized router identity records. */
  readonly kind = 'router-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
    /** Optional owner identity such as a parent route config or route context. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address for the router source shape or runtime owner. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Local source/router label for traces while broader router materializers are still referential. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for lower-level route-recognizer path grammar and matching products. */
export class RouteRecognizerIdentity {
  /** String discriminator for serialized route-recognizer identity records. */
  readonly kind = 'route-recognizer-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
    /** Optional owner identity such as the route config that produced this recognizer fact. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address for the authored path or recognizer owner. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Local route-recognizer label, usually the authored path. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for i18n translation products. */
export class I18nIdentity {
  /** String discriminator for serialized i18n identity records. */
  readonly kind = 'i18n-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
    /** Optional owner identity such as the configuration sequence that admitted the translation resources. */
    readonly ownerHandle: IdentityHandle | null,
    /** Source address for the translation resource admission or key owner. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Runtime translation key, namespace, or catalog label. */
    readonly localName: string | null = null,
  ) {}
}

/** Identity for compiler service, scope, parser, syntax, and lowering products. */
export class CompilerIdentity {
  /** String discriminator for serialized compiler identity records. */
  readonly kind = 'compiler-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
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
  readonly kind = 'template-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'template-node-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
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
  readonly kind = 'binding-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Template node, resource, or instruction identity that owns the binding. */
    readonly ownerHandle: IdentityHandle,
    /** Controlled vocabulary key describing the binding kind. */
    readonly bindingKindKey: BindingKindKey,
  ) {}
}

/** Identity for a rendering instruction emitted by template lowering. */
export class InstructionIdentity {
  /** String discriminator for serialized instruction identity records. */
  readonly kind = 'instruction-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Template, node, binding, or generated identity that owns the instruction. */
    readonly ownerHandle: IdentityHandle,
    /** Controlled vocabulary key describing the instruction kind. */
    readonly instructionKindKey: InstructionKindKey,
  ) {}
}

/** Identity for a type-system type or member projection. */
export class TypeSystemIdentity {
  /** String discriminator for serialized type-system identity records. */
  readonly kind = 'type-system-identity' as const;

  constructor(
    /** Store-local handle for this identity record. */
    readonly handle: IdentityHandle,
    /** Controlled product kind represented by this identity. */
    readonly productKindKey: ProductKindKey,
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
  | RouterIdentity
  | RouteRecognizerIdentity
  | I18nIdentity
  | CompilerIdentity
  | TemplateIdentity
  | TemplateNodeIdentity
  | BindingIdentity
  | InstructionIdentity
  | TypeSystemIdentity;
