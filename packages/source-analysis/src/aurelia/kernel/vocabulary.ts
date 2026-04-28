declare const kernelVocabularyKeyBrand: unique symbol;

const VOCABULARY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const definedVocabularyKeys = new Set<string>();

/**
 * Vocabulary is a fast-evolving pressure surface. Keep it controlled and centrally defined, but let real
 * producers and queries earn new entries. Do not use vocabulary keys for confidence, ranking, UI states, or
 * answer-envelope outcomes; those belong above the kernel.
 *
 * Vocabulary slots are product-owned semantic handles for MCP and other source-analysis lenses. Do not make
 * external tools rediscover slot meaning from constructor argument positions or naming patterns.
 */

/** Stable code for controlled semantic vocabulary, separate from store-local record handles. */
export type KernelVocabularyKey<TSlot extends KernelVocabularySlot = KernelVocabularySlot> =
  string & { readonly [kernelVocabularyKeyBrand]: TSlot };

export const enum KernelVocabularySlot {
  /** Predicate key used by `SemanticClaim` edges. */
  ClaimPredicate = 'claim-predicate',
  /** Seam-kind key used by `OpenSeam` records. */
  OpenSeamKind = 'seam-kind',
  /** Product-kind key used by `MaterializedProduct` records. */
  ProductKind = 'product-kind',
  /** Rule-kind key used by `DerivationRule` records. */
  DerivationRuleKind = 'derivation-rule-kind',
  /** Edge-role key used by derivation edges. */
  DerivationEdgeRole = 'derivation-edge-role',
  /** Binding-kind key used by binding identities and later binding products. */
  BindingKind = 'binding-kind',
  /** Instruction-kind key used by rendering-instruction identities and products. */
  InstructionKind = 'instruction-kind',
}

/** Controlled claim-predicate vocabulary key. */
export type ClaimPredicateKey = KernelVocabularyKey<KernelVocabularySlot.ClaimPredicate>;

/** Controlled open-seam-kind vocabulary key. */
export type OpenSeamKindKey = KernelVocabularyKey<KernelVocabularySlot.OpenSeamKind>;

/** Controlled materialized-product-kind vocabulary key. */
export type ProductKindKey = KernelVocabularyKey<KernelVocabularySlot.ProductKind>;

/** Controlled derivation-rule-kind vocabulary key. */
export type DerivationRuleKindKey = KernelVocabularyKey<KernelVocabularySlot.DerivationRuleKind>;

/** Controlled derivation-edge-role vocabulary key. */
export type DerivationEdgeRoleKey = KernelVocabularyKey<KernelVocabularySlot.DerivationEdgeRole>;

/** Controlled binding-kind vocabulary key. */
export type BindingKindKey = KernelVocabularyKey<KernelVocabularySlot.BindingKind>;

/** Controlled instruction-kind vocabulary key. */
export type InstructionKindKey = KernelVocabularyKey<KernelVocabularySlot.InstructionKind>;

export const enum KernelVocabularyRecordKind {
  /** Defines one controlled vocabulary entry that can classify claims, products, rules, and roles. */
  KernelVocabularyDefinition = 'kernel-vocabulary-definition',
}

export const enum KernelVocabularyNamespace {
  /** Vocabulary about TypeScript/module evaluation. */
  Evaluation = 'evaluation',
  /** Vocabulary about Aurelia resource discovery and availability. */
  Resource = 'resource',
  /** Vocabulary about dependency injection keys, registrations, and resolution. */
  Di = 'di',
  /** Vocabulary about registration admission before DI world construction. */
  Registration = 'registration',
  /** Vocabulary about app and plugin configuration flow. */
  Configuration = 'configuration',
  /** Vocabulary about template compiler services, scopes, syntax, and lowering. */
  Compiler = 'compiler',
  /** Vocabulary about template references and scope. */
  Template = 'template',
  /** Vocabulary about binding expression or binding instruction behavior. */
  Binding = 'binding',
  /** Vocabulary about rendering instructions produced by lowering. */
  Instruction = 'instruction',
  /** Vocabulary about unresolved seams and diagnostics. */
  Seam = 'seam',
  /** Vocabulary about compiler or tooling-generated structure. */
  Generated = 'generated',
  /** Vocabulary about derivation rules and derivation-edge roles. */
  Derivation = 'derivation',
}

/** Controlled vocabulary entry with a stable namespaced key, usage slot, and human/AI-readable intent. */
export class KernelVocabularyDefinition<TSlot extends KernelVocabularySlot = KernelVocabularySlot> {
  /** String discriminator for serialized vocabulary-definition records. */
  readonly kind = KernelVocabularyRecordKind.KernelVocabularyDefinition;

  constructor(
    /** Stable vocabulary key, normally `${namespace}.${name}`. */
    readonly key: KernelVocabularyKey<TSlot>,
    /** Broad namespace that keeps provisional ontology growth from drifting globally. */
    readonly namespace: KernelVocabularyNamespace,
    /** Namespace-local kebab-case vocabulary name. */
    readonly name: string,
    /** Usage slot that tells tools where this key is valid. */
    readonly slot: TSlot,
    /** Grounded description of when this vocabulary entry should be used. */
    readonly summary: string,
  ) {}
}

function makeVocabularyKey<TSlot extends KernelVocabularySlot>(
  namespace: KernelVocabularyNamespace,
  name: string,
): KernelVocabularyKey<TSlot> {
  return `${namespace}.${name}` as KernelVocabularyKey<TSlot>;
}

function defineVocabulary<TSlot extends KernelVocabularySlot>(
  /** Namespace that owns the vocabulary entry. */
  namespace: KernelVocabularyNamespace,
  /** Namespace-local kebab-case name. */
  name: string,
  /** Usage slot that owns the key's semantic contract. */
  slot: TSlot,
  /** Grounded usage description for future maintainers and AI agents. */
  summary: string,
): KernelVocabularyDefinition<TSlot> {
  if (!VOCABULARY_NAME_PATTERN.test(name)) {
    throw new Error(`Kernel vocabulary names must be kebab-case: ${namespace}.${name}`);
  }
  const key = `${namespace}.${name}`;
  if (definedVocabularyKeys.has(key)) {
    throw new Error(`Duplicate kernel vocabulary definition: ${key}`);
  }
  definedVocabularyKeys.add(key);
  return new KernelVocabularyDefinition(makeVocabularyKey<TSlot>(namespace, name), namespace, name, slot, summary);
}

/** Small seed vocabulary; new entries should be added deliberately as semantics are implemented. */
export const KernelVocabulary = {
  Evaluation: {
    /** A module or source unit imports another module, binding, or symbol. */
    Imports: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'imports',
      KernelVocabularySlot.ClaimPredicate,
      'A module or source unit imports another module, binding, or symbol.',
    ),
    /** A module or source unit exports a declaration, value, or resource carrier. */
    Exports: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'exports',
      KernelVocabularySlot.ClaimPredicate,
      'A module or source unit exports a declaration, value, or resource carrier.',
    ),
    /** Evaluation stopped because recursion protection prevented deeper interpretation. */
    DepthLimit: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'depth-limit',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation stopped because recursion protection prevented deeper interpretation.',
    ),
    /** Evaluation stopped because statement protection prevented more interpretation. */
    StatementLimit: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'statement-limit',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation stopped because statement protection prevented more interpretation.',
    ),
    /** The evaluator reached a statement kind with runtime effects it does not model. */
    UnsupportedStatement: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-statement',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a statement kind with runtime effects it does not model.',
    ),
    /** The evaluator reached an expression kind with runtime effects it does not model. */
    UnsupportedExpression: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached an expression kind with runtime effects it does not model.',
    ),
    /** A binding pattern could not be represented in the environment record. */
    UnsupportedBindingPattern: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-binding-pattern',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a binding pattern that is not represented in environment records yet.',
    ),
    /** A referenced identifier was not present in the current environment record. */
    UnresolvedIdentifier: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unresolved-identifier',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation could not resolve an identifier in the current environment record.',
    ),
    /** A module specifier could not be resolved to a source module. */
    UnresolvedModule: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unresolved-module',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation could not resolve a module specifier to a source module.',
    ),
    /** A call expression was not a known evaluator intrinsic or simple local function. */
    DynamicCall: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-call',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a call expression that should not be guessed.',
    ),
    /** A branch condition could not be reduced without guessing which path executes. */
    DynamicBranch: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-branch',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a branch condition that could not be reduced without guessing.',
    ),
    /** A loop could not be reduced to a known finite set of iterations. */
    DynamicLoop: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-loop',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a loop that could not be reduced to a known finite iteration set.',
    ),
    /** A mutation could not be represented without executing user behavior. */
    DynamicMutation: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-mutation',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a mutation that could not be represented without executing user behavior.',
    ),
    /** A dynamic import or non-literal module edge could not be linked statically. */
    DynamicImport: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-import',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a dynamic import or non-literal module edge that could not be linked statically.',
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
    /** Product kind for source-specific resource definition field contributions before convergence. */
    DefinitionContribution: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'definition-contribution',
      KernelVocabularySlot.ProductKind,
      'Source-specific resource definition field contributions before metadata convergence folds them into a full definition.',
    ),
    /** Product kind for a fully converged resource metadata definition before DI admission or template compilation. */
    Definition: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'definition',
      KernelVocabularySlot.ProductKind,
      'A fully converged resource metadata definition before DI admission, scope visibility, or template compilation.',
    ),
    /** Source syntax or convention declares an Aurelia resource. */
    Declares: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'declares',
      KernelVocabularySlot.ClaimPredicate,
      'Source syntax or convention declares an Aurelia resource.',
    ),
    /** A recognized resource name is an alias of another resource identity. */
    AliasOf: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'alias-of',
      KernelVocabularySlot.ClaimPredicate,
      'A recognized resource name is an alias of another resource identity.',
    ),
    ContainsDefinitionHeader: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'contains-definition-header',
      KernelVocabularySlot.ClaimPredicate,
      'A resource catalog contains a resource definition header product.',
    ),
    /** Resource recognition could not close a resource kind from the carrier shape. */
    OpenKindExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-kind-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close a resource kind from the carrier shape.',
    ),
    /** Resource recognition could not close a resource name from the carrier shape. */
    OpenNameExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-name-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close a resource name from the carrier shape.',
    ),
    /** Resource recognition could not close every alias from the carrier shape. */
    OpenAliasExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-alias-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close every alias from the carrier shape.',
    ),
    /** Resource recognition could not close the class, function, or object target from the carrier shape. */
    OpenTargetExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-target-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close the class, function, or object target from the carrier shape.',
    ),
    /** Syntax-resource recognition could not close every attribute pattern entry from the carrier shape. */
    OpenPatternExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-pattern-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Syntax-resource recognition could not close every attribute pattern entry from the carrier shape.',
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
    /** Product kind for container configuration that affects abstract container behavior. */
    ContainerConfiguration: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'container-configuration',
      KernelVocabularySlot.ProductKind,
      'Container configuration that affects abstract container behavior.',
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
    /** Registration or resolver flow provides a DI key. */
    ProvidesKey: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'provides-key',
      KernelVocabularySlot.ClaimPredicate,
      'Registration or resolver flow provides a DI key.',
    ),
    /** A container accepts a registration admission for later resolver/resource/factory effects. */
    AcceptsRegistration: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'accepts-registration',
      KernelVocabularySlot.ClaimPredicate,
      'A container accepts a registration admission for later resolver, resource, or factory effects.',
    ),
    /** A DI operation produced a container-owned product while spending registration or lookup pressure. */
    ProducesProduct: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'produces-product',
      KernelVocabularySlot.ClaimPredicate,
      'A DI operation produced a container-owned product while spending registration or lookup pressure.',
    ),
    /** A DI lookup resolves, ambiguously resolves, or fails to resolve to a provider. */
    ResolvesTo: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'resolves-to',
      KernelVocabularySlot.ClaimPredicate,
      'A DI lookup resolves, ambiguously resolves, or fails to resolve to a provider.',
    ),
    /** DI world construction could not spend a registration admission into concrete container effects. */
    OpenRegistrationSpending: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-registration-spending',
      KernelVocabularySlot.OpenSeamKind,
      'DI world construction could not spend a registration admission into concrete container effects.',
    ),
    /** DI world construction reached an IRegistry body that has not been interpreted yet. */
    OpenRegistryBody: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-registry-body',
      KernelVocabularySlot.OpenSeamKind,
      'DI world construction reached an IRegistry body that has not been interpreted yet.',
    ),
    /** DI world construction reached runtime default resolver or JIT registration behavior. */
    OpenDefaultResolver: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-default-resolver',
      KernelVocabularySlot.OpenSeamKind,
      'DI world construction reached runtime default resolver or JIT registration behavior.',
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
    /** Product kind for a known framework registration group before its expanded values are spent. */
    FrameworkRegistrationAdmission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'framework-registration-admission',
      KernelVocabularySlot.ProductKind,
      'A known framework registration group before DI world construction spends its expanded registrations.',
    ),
    /** A registration admission offers a DI key to later world construction. */
    AdmitsKey: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'admits-key',
      KernelVocabularySlot.ClaimPredicate,
      'A registration admission offers a DI key to later DI world construction.',
    ),
    /** A registration admission uses a class, instance, callback, resolver, registry, or resource value. */
    UsesValue: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'uses-value',
      KernelVocabularySlot.ClaimPredicate,
      'A registration admission uses a class, instance, callback, resolver, registry, or resource value.',
    ),
    /** Registration recognition could not close the target key. */
    OpenKeyExpression: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-key-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the target key expression.',
    ),
    /** Registration recognition could not close the registered value. */
    OpenValueExpression: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-value-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the registered value expression.',
    ),
    /** Registration recognition could not classify the registration strategy. */
    OpenStrategy: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-strategy',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not classify the registration strategy.',
    ),
    /** Registration recognition could not close the receiving container or app boundary. */
    OpenContainer: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-container',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the receiving container or app boundary.',
    ),
    /** Registration recognition saw a callback whose body is intentionally not executed here. */
    OpenCallbackBody: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-callback-body',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition saw a callback whose body must remain for later evaluation or DI world construction.',
    ),
    /** Registration recognition saw an object-map registration whose entries are not all closed. */
    OpenObjectMap: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-object-map',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition saw an object-map registration whose entries are not all closed.',
    ),
    /** Registration recognition saw a spread argument or spread member that could not close. */
    OpenSpread: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-spread',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition saw a spread argument or spread member that could not close.',
    ),
    /** Registration recognition saw an IRegistry-like value whose register shape stayed open. */
    OpenRegistryShape: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-registry-shape',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition saw an IRegistry-like value whose register shape stayed open.',
    ),
    /** Registration recognition could not close the target of an alias registration. */
    OpenAliasTarget: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-alias-target',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the target of an alias registration.',
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
    /** Product kind for ordered app/plugin/registry/builder configuration flow. */
    Sequence: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'sequence',
      KernelVocabularySlot.ProductKind,
      'Ordered app, plugin, registry, builder, or lifecycle-slot configuration flow before DI world construction.',
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
      'A deferred lifecycle task registered under IAppTask and selected by AppRoot slot dispatch.',
    ),
    /** Product kind for an AppRoot lifecycle-slot dispatch point. */
    AppTaskSlotDispatch: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'app-task-slot-dispatch',
      KernelVocabularySlot.ProductKind,
      'An AppRoot lifecycle-slot dispatch point that selects AppTasks without executing callback bodies.',
    ),
    /** A configuration sequence contains one ordered step. */
    ContainsStep: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'contains-step',
      KernelVocabularySlot.ClaimPredicate,
      'A configuration sequence contains one ordered step.',
    ),
    /** A configuration step produced or selected a product that later passes can consume. */
    ProducesProduct: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'produces-product',
      KernelVocabularySlot.ClaimPredicate,
      'A configuration step produced or selected a product that later passes can consume.',
    ),
    /** A configuration step admitted a registration product before DI world construction spends it. */
    AdmitsRegistration: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'admits-registration',
      KernelVocabularySlot.ClaimPredicate,
      'A configuration step admitted a registration product before DI world construction spends it.',
    ),
    /** A modeled Aurelia facade owns the root container used by app admission. */
    OwnsContainer: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'owns-container',
      KernelVocabularySlot.ClaimPredicate,
      'A modeled Aurelia facade owns the root container used by app admission.',
    ),
    /** A modeled Aurelia facade prepared or selected an AppRoot boundary. */
    HasAppRoot: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'has-app-root',
      KernelVocabularySlot.ClaimPredicate,
      'A modeled Aurelia facade prepared or selected an AppRoot boundary.',
    ),
    /** Configuration recognition could not close the call receiver or target. */
    OpenConfigurationTarget: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-target',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition could not close a call receiver, configuration export, or plugin target.',
    ),
    /** Configuration recognition could not close an option contribution. */
    OpenConfigurationOption: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-option',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition could not close a configuration option path or value.',
    ),
    /** Configuration recognition saw a callback body that must not be executed in this layer. */
    OpenConfigurationCallback: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-callback',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition saw a callback whose body must stay available to later evaluation or DI spending.',
    ),
    /** Configuration recognition could not close ordering for a sequence edge. */
    OpenConfigurationOrder: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-order',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition could not close the ordering of configuration steps from source or evaluation flow.',
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
    /** Compiler scope provides a resource to template lookup. */
    ProvidesResource: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'provides-resource',
      KernelVocabularySlot.ClaimPredicate,
      'Compiler scope provides a resource to template lookup.',
    ),
    /** Compiler scope provides an attribute-pattern or binding-command executable to parser/lowering services. */
    ProvidesSyntaxResource: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'provides-syntax-resource',
      KernelVocabularySlot.ClaimPredicate,
      'Compiler scope provides an attribute-pattern or binding-command executable to parser/lowering services.',
    ),
    /** A compiler world uses a resource scope for lookup. */
    UsesResourceScope: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'uses-resource-scope',
      KernelVocabularySlot.ClaimPredicate,
      'A compiler world uses a resource scope for lookup.',
    ),
    /** A compiler world uses a compiler service product. */
    UsesService: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'uses-service',
      KernelVocabularySlot.ClaimPredicate,
      'A compiler world uses a compiler service product.',
    ),
    /** A syntax catalog includes a compiler-visible attribute-pattern or binding-command executable. */
    ContainsSyntaxResource: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'contains-syntax-resource',
      KernelVocabularySlot.ClaimPredicate,
      'A syntax catalog includes a compiler-visible attribute-pattern or binding-command executable.',
    ),
    AdmitsSyntaxCatalog: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'admits-syntax-catalog',
      KernelVocabularySlot.ClaimPredicate,
      'A known framework registration admission made a built-in syntax catalog available for attribute-parser and binding-command resolver input.',
    ),
    AdmitsResourceCatalog: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'admits-resource-catalog',
      KernelVocabularySlot.ClaimPredicate,
      'A known framework registration admission made a built-in resource catalog available for DI resource-slot spending.',
    ),
    /** Compiler service lookup could not be closed. */
    OpenServiceLookup: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-service-lookup',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler service lookup could not be closed from the DI world.',
    ),
    /** Resource lookup for a template name stayed open. */
    OpenResourceLookup: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-resource-lookup',
      KernelVocabularySlot.OpenSeamKind,
      'Template resource lookup could not close a custom element, custom attribute, bindable, or syntax resource.',
    ),
    /** Executable command or pattern body stayed opaque. */
    OpenExecutableBody: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-executable-body',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler reached a custom executable body that should be preserved rather than guessed.',
    ),
  },
  Template: {
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
    /** Markup or binding syntax references a resource by name or command. */
    ReferencesResource: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'references-resource',
      KernelVocabularySlot.ClaimPredicate,
      'Markup or binding syntax references a resource by name or command.',
    ),
    /** Template parsing reached malformed or frontier-owned HTML. */
    OpenHtmlSyntax: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'open-html-syntax',
      KernelVocabularySlot.OpenSeamKind,
      'Template parsing reached malformed or frontier-owned HTML syntax.',
    ),
    /** Attribute parser could not close an attribute pattern or syntax part. */
    OpenAttributeSyntax: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'open-attribute-syntax',
      KernelVocabularySlot.OpenSeamKind,
      'Attribute parser could not close an attribute pattern or syntax part.',
    ),
  },
  Binding: {
    /** Product kind for binding records produced by template lowering. */
    Binding: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'binding',
      KernelVocabularySlot.ProductKind,
      'Binding product produced by template lowering.',
    ),
    /** Binding kind for property assignment or observation. */
    Property: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'property',
      KernelVocabularySlot.BindingKind,
      'Property binding produced from bindable or command syntax.',
    ),
    /** Binding kind for text or attribute interpolation. */
    Interpolation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'interpolation',
      KernelVocabularySlot.BindingKind,
      'Interpolation binding produced from text or attribute syntax.',
    ),
    /** Binding kind for event listeners. */
    Listener: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'listener',
      KernelVocabularySlot.BindingKind,
      'Event listener binding produced by trigger, capture, or related syntax.',
    ),
    /** Binding kind for iterator semantics such as repeat.for. */
    Iterator: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'iterator',
      KernelVocabularySlot.BindingKind,
      'Iterator binding produced by template-controller syntax such as repeat.for.',
    ),
    /** Binding kind for ref semantics. */
    Ref: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'ref',
      KernelVocabularySlot.BindingKind,
      'Reference binding produced by ref syntax.',
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
    HydrateElement: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-element',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a custom element or element controller.',
    ),
    HydrateAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-attribute',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a custom attribute.',
    ),
    HydrateTemplateController: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-template-controller',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a template controller with a nested template.',
    ),
    HydrateLetElement: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-let-element',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a let element and its let-binding instructions.',
    ),
    PropertyBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'property-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to a target property.',
    ),
    Interpolation: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'interpolation',
      KernelVocabularySlot.InstructionKind,
      'Bind text or attribute interpolation expressions.',
    ),
    ListenerBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'listener-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an event listener expression.',
    ),
    IteratorBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'iterator-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind iterator locals and iterable expression.',
    ),
    RefBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'ref-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind a ref expression.',
    ),
    LetBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'let-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind a let declaration into template scope.',
    ),
    TextBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'text-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to a text node.',
    ),
    AttributeBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'attribute-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to an attribute, including attr/class/style command output.',
    ),
    MultiAttr: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'multi-attr',
      KernelVocabularySlot.InstructionKind,
      'Carry one iterator multi-attribute binding entry.',
    ),
    SetProperty: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-property',
      KernelVocabularySlot.InstructionKind,
      'Set a static property value.',
    ),
    SetAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-attribute',
      KernelVocabularySlot.InstructionKind,
      'Set a static attribute value.',
    ),
    SetClassAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-class-attribute',
      KernelVocabularySlot.InstructionKind,
      'Set a static class attribute value.',
    ),
    SetStyleAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-style-attribute',
      KernelVocabularySlot.InstructionKind,
      'Set a static style attribute value.',
    ),
    StylePropertyBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'style-property-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to one style property.',
    ),
    SpreadTransferedBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'spread-transfered-binding',
      KernelVocabularySlot.InstructionKind,
      'Carry the runtime marker for spread-transfered bindings.',
    ),
    SpreadElementPropBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'spread-element-prop-binding',
      KernelVocabularySlot.InstructionKind,
      'Wrap a spread instruction that targets a custom-element bindable.',
    ),
    SpreadValueBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'spread-value-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind a spread value to element or bindable spread handling.',
    ),
    TranslationBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'translation-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an i18n translation key or text expression.',
    ),
    TranslationBindBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'translation-bind-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an i18n translation expression.',
    ),
    TranslationParametersBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'translation-parameters-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind i18n translation parameter expressions.',
    ),
    StateBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'state-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind state plugin output to a target property.',
    ),
    DispatchBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'dispatch-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind state plugin dispatch handling to an event.',
    ),
    OpenInstruction: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'open-instruction',
      KernelVocabularySlot.OpenSeamKind,
      'Template lowering could not close the rendering instruction shape.',
    ),
  },
  Derivation: {
    /** Edge role for the main input a rule is transforming or resolving. */
    PrimaryInput: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'primary-input',
      KernelVocabularySlot.DerivationEdgeRole,
      'The main input edge a derivation rule is transforming, resolving, or materializing.',
    ),
    /** Edge role for supporting context such as scope, configuration, or containing resource. */
    ContextInput: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'context-input',
      KernelVocabularySlot.DerivationEdgeRole,
      'A supporting input edge that provides scope, configuration, or contextual constraints.',
    ),
    /** Edge role for an output that should become visible to later derivation or query phases. */
    ProducedOutput: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'produced-output',
      KernelVocabularySlot.DerivationEdgeRole,
      'An output edge produced by a derivation rule for later phases or projections.',
    ),
    /** Edge role for evidence that directly caused the rule application to run. */
    RuleWitness: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'rule-witness',
      KernelVocabularySlot.DerivationEdgeRole,
      'Evidence that directly caused a derivation rule application to run.',
    ),
  },
} as const;
