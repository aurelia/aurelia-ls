declare const kernelVocabularyKeyBrand: unique symbol;

const VOCABULARY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const definedVocabularyKeys = new Set<string>();

/**
 * Vocabulary is a fast-evolving pressure surface. Keep it controlled and centrally defined, but let real
 * producers and queries earn new entries. Do not use vocabulary keys for confidence, ranking, UI states, or
 * answer-envelope outcomes; those belong above the kernel.
 */

/** Stable code for controlled semantic vocabulary, separate from store-local record handles. */
export type KernelVocabularyKey = string & { readonly [kernelVocabularyKeyBrand]: 'kernel-vocabulary' };

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

/** Controlled vocabulary entry with a stable namespaced key and human/AI-readable intent. */
export class KernelVocabularyDefinition {
  /** String discriminator for serialized vocabulary-definition records. */
  readonly kind = KernelVocabularyRecordKind.KernelVocabularyDefinition;

  constructor(
    /** Stable vocabulary key, normally `${namespace}.${name}`. */
    readonly key: KernelVocabularyKey,
    /** Broad namespace that keeps provisional ontology growth from drifting globally. */
    readonly namespace: KernelVocabularyNamespace,
    /** Namespace-local kebab-case vocabulary name. */
    readonly name: string,
    /** Grounded description of when this vocabulary entry should be used. */
    readonly summary: string,
  ) {}
}

function makeVocabularyKey(namespace: KernelVocabularyNamespace, name: string): KernelVocabularyKey {
  return `${namespace}.${name}` as KernelVocabularyKey;
}

function defineVocabulary(
  /** Namespace that owns the vocabulary entry. */
  namespace: KernelVocabularyNamespace,
  /** Namespace-local kebab-case name. */
  name: string,
  /** Grounded usage description for future maintainers and AI agents. */
  summary: string,
): KernelVocabularyDefinition {
  if (!VOCABULARY_NAME_PATTERN.test(name)) {
    throw new Error(`Kernel vocabulary names must be kebab-case: ${namespace}.${name}`);
  }
  const key = `${namespace}.${name}`;
  if (definedVocabularyKeys.has(key)) {
    throw new Error(`Duplicate kernel vocabulary definition: ${key}`);
  }
  definedVocabularyKeys.add(key);
  return new KernelVocabularyDefinition(makeVocabularyKey(namespace, name), namespace, name, summary);
}

/** Small seed vocabulary; new entries should be added deliberately as semantics are implemented. */
export const KernelVocabulary = {
  Claim: {
    /** Generic relationship for claims whose domain predicate has not earned a narrower vocabulary entry yet. */
    RelatesTo: defineVocabulary(
      KernelVocabularyNamespace.Claim,
      'relates-to',
      'A conservative generic relation used until implementation pressure justifies a narrower predicate.',
    ),
  },
  Evaluation: {
    /** A module or source unit imports another module, binding, or symbol. */
    Imports: defineVocabulary(KernelVocabularyNamespace.Evaluation, 'imports', 'A module or source unit imports another module, binding, or symbol.'),
    /** A module or source unit exports a declaration, value, or resource carrier. */
    Exports: defineVocabulary(KernelVocabularyNamespace.Evaluation, 'exports', 'A module or source unit exports a declaration, value, or resource carrier.'),
  },
  Resource: {
    /** Source syntax or convention declares an Aurelia resource. */
    Declares: defineVocabulary(KernelVocabularyNamespace.Resource, 'declares', 'Source syntax or convention declares an Aurelia resource.'),
    /** A resource is available to a template, container, or configuration scope. */
    AvailableInScope: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'available-in-scope',
      'A resource is available to a template, container, or configuration scope.',
    ),
  },
  Di: {
    /** Registration or resolver flow provides a DI key. */
    ProvidesKey: defineVocabulary(KernelVocabularyNamespace.Di, 'provides-key', 'Registration or resolver flow provides a DI key.'),
    /** A DI lookup resolves, ambiguously resolves, or fails to resolve to a provider. */
    ResolvesTo: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'resolves-to',
      'A DI lookup resolves, ambiguously resolves, or fails to resolve to a provider.',
    ),
  },
  Template: {
    /** Markup or binding syntax references a resource by name or command. */
    ReferencesResource: defineVocabulary(
      KernelVocabularyNamespace.Template,
      'references-resource',
      'Markup or binding syntax references a resource by name or command.',
    ),
  },
  Derivation: {
    /** Edge role for the main input a rule is transforming or resolving. */
    PrimaryInput: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'primary-input',
      'The main input edge a derivation rule is transforming, resolving, or materializing.',
    ),
    /** Edge role for supporting context such as scope, configuration, or containing resource. */
    ContextInput: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'context-input',
      'A supporting input edge that provides scope, configuration, or contextual constraints.',
    ),
    /** Edge role for an output that should become visible to later derivation or query phases. */
    ProducedOutput: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'produced-output',
      'An output edge produced by a derivation rule for later phases or projections.',
    ),
    /** Edge role for evidence that directly caused the rule application to run. */
    RuleWitness: defineVocabulary(
      KernelVocabularyNamespace.Derivation,
      'rule-witness',
      'Evidence that directly caused a derivation rule application to run.',
    ),
  },
} as const;
