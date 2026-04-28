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
  /** Vocabulary about generic claim relationships while domain language is still forming. */
  Claim = 'claim',
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
  Claim: {
    /** Generic relationship for claims whose domain predicate has not earned a narrower vocabulary entry yet. */
    RelatesTo: defineVocabulary(
      KernelVocabularyNamespace.Claim,
      'relates-to',
      KernelVocabularySlot.ClaimPredicate,
      'A conservative generic relation used until implementation pressure justifies a narrower predicate.',
    ),
  },
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
    /** Static evaluation reached syntax that has a named evaluator seam rather than a guessed value. */
    UnsupportedSyntax: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-syntax',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached syntax that is intentionally not evaluated by the current substrate.',
    ),
    /** Static evaluation could not resolve a binding, module, or reference target. */
    UnresolvedReference: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unresolved-reference',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation could not resolve a binding, module, or reference target.',
    ),
    /** Static evaluation encountered a call, branch, loop, mutation, or import edge that should not be guessed. */
    DynamicEvaluation: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-evaluation',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation encountered dynamic behavior that must remain visible to producers and queries.',
    ),
    /** Static evaluation stopped because evaluator recursion or statement protection fired. */
    EvaluationGuardrail: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'evaluation-guardrail',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation stopped because a local evaluator guardrail prevented runaway interpretation.',
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
    /** Registration or resolver flow provides a DI key. */
    ProvidesKey: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'provides-key',
      KernelVocabularySlot.ClaimPredicate,
      'Registration or resolver flow provides a DI key.',
    ),
    /** A DI lookup resolves, ambiguously resolves, or fails to resolve to a provider. */
    ResolvesTo: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'resolves-to',
      KernelVocabularySlot.ClaimPredicate,
      'A DI lookup resolves, ambiguously resolves, or fails to resolve to a provider.',
    ),
  },
  Registration: {
    /** Product kind for a normalized registration admission before container-state spending. */
    Admission: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'admission',
      KernelVocabularySlot.ProductKind,
      'A normalized registration admission before DI world construction spends it into resolver or resource state.',
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
  Template: {
    /** Markup or binding syntax references a resource by name or command. */
    ReferencesResource: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'references-resource',
      KernelVocabularySlot.ClaimPredicate,
      'Markup or binding syntax references a resource by name or command.',
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
