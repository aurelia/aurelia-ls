declare const kernelVocabularyKeyBrand: unique symbol;

const VOCABULARY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const definedVocabularyKeys = new Set<string>();
const definedVocabularyDefinitions = new Map<string, KernelVocabularyDefinition>();

/**
 * Vocabulary is a fast-evolving pressure surface. Keep it controlled and centrally defined, but let real
 * materializers and queries earn new entries. Do not use vocabulary keys for confidence, ranking, UI states, or
 * answer-envelope outcomes; those belong above the kernel.
 *
 * Vocabulary slots are product-owned semantic handles for Atlas, tooling, and other semantic-runtime lenses. Do not make
 * external tools rediscover slot meaning from constructor argument positions or naming patterns.
 */

/** Stable code for controlled semantic vocabulary, separate from store-local record handles. */
export type KernelVocabularyKey<
  TSlot extends KernelVocabularySlot = KernelVocabularySlot,
  TCode extends string = string,
> = TCode & { readonly [kernelVocabularyKeyBrand]: TSlot };

export const enum KernelVocabularySlot {
  /** Predicate key used by `SemanticClaim` edges. */
  ClaimPredicate = 'claim-predicate',
  /** Seam-kind key used by `OpenSeam` records. */
  OpenSeamKind = 'seam-kind',
  /** Product-kind key used by `MaterializedProduct` records. */
  ProductKind = 'product-kind',
  /** Binding-kind key used by binding identities and later binding products. */
  BindingKind = 'binding-kind',
  /** Instruction-kind key used by rendering-instruction identities and products. */
  InstructionKind = 'instruction-kind',
}

/** Controlled claim-predicate vocabulary key. */
export type ClaimPredicateKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.ClaimPredicate, TCode>;

/** Controlled open-seam-kind vocabulary key. */
export type OpenSeamKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.OpenSeamKind, TCode>;

/** Controlled materialized-product-kind vocabulary key. */
export type ProductKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.ProductKind, TCode>;

/** Controlled binding-kind vocabulary key. */
export type BindingKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.BindingKind, TCode>;

/** Controlled instruction-kind vocabulary key. */
export type InstructionKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.InstructionKind, TCode>;

type VocabularyCode<TNamespace extends KernelVocabularyNamespace, TName extends string> = `${TNamespace}.${TName}`;

export const enum KernelClaimEndpointKind {
  /** Claim endpoint carried by an AddressHandle. */
  Address = 'address',
  /** Claim endpoint carried by an IdentityHandle. */
  Identity = 'identity',
  /** Claim endpoint carried by a ProductHandle. */
  Product = 'product',
}

/** One side of a claim predicate signature. Product kinds constrain ProductHandle endpoints only. */
export class KernelClaimEndpointSignature<
  TEndpointKinds extends readonly KernelClaimEndpointKind[] = readonly KernelClaimEndpointKind[],
  TProductKinds extends readonly ProductKindKey[] = readonly ProductKindKey[],
> {
  /** String discriminator for serialized claim endpoint signatures. */
  readonly kind = 'kernel-claim-endpoint-signature' as const;

  constructor(
    /** Handle families accepted on this side of the claim. */
    readonly endpointKinds: TEndpointKinds,
    /** Product kinds accepted when the endpoint is a ProductHandle. Empty means any product kind. */
    readonly productKinds: TProductKinds = [] as unknown as TProductKinds,
  ) {
    if (endpointKinds.length === 0) {
      throw new Error('Claim endpoint signatures must accept at least one endpoint kind.');
    }
    if (productKinds.length > 0 && !endpointKinds.includes(KernelClaimEndpointKind.Product)) {
      throw new Error('Claim endpoint signatures with product-kind constraints must accept product endpoints.');
    }
  }
}

/** Directional shape for claim predicates so graph lenses do not infer edge topology from names. */
export class KernelClaimPredicateSignature<
  TSubject extends KernelClaimEndpointSignature = KernelClaimEndpointSignature,
  TObject extends KernelClaimEndpointSignature = KernelClaimEndpointSignature,
> {
  /** String discriminator for serialized claim predicate signatures. */
  readonly kind = 'kernel-claim-predicate-signature' as const;

  constructor(
    /** Expected subject-side shape for this predicate. */
    readonly subject: TSubject,
    /** Expected object-side shape for this predicate. */
    readonly object: TObject,
  ) {}
}

export const enum KernelVocabularyNamespace {
  /** Vocabulary about TypeScript/module evaluation. */
  Evaluation = 'evaluation',
  /** Vocabulary about type-system type and member projections. */
  TypeSystem = 'type-system',
  /** Vocabulary about Aurelia resource discovery and availability. */
  Resource = 'resource',
  /** Vocabulary about dependency injection keys, registrations, and resolution. */
  Di = 'di',
  /** Vocabulary about registration admission before DI world construction. */
  Registration = 'registration',
  /** Vocabulary about app and plugin configuration flow. */
  Configuration = 'configuration',
  /** Vocabulary about router configuration, route contexts, and navigation products. */
  Router = 'router',
  /** Vocabulary about route-recognizer path grammar and recognition products. */
  RouteRecognizer = 'route-recognizer',
  /** Vocabulary about i18n translation resources and bindings. */
  I18n = 'i18n',
  /** Vocabulary about @aurelia/state store configuration and state-plugin bindings. */
  State = 'state',
  /** Vocabulary about @aurelia/validation rule construction, hydration, and diagnostics. */
  Validation = 'validation',
  /** Vocabulary about @aurelia/fetch-client configuration and diagnostics. */
  FetchClient = 'fetch-client',
  /** Vocabulary about @aurelia/dialog configuration, services, and diagnostics. */
  Dialog = 'dialog',
  /** Vocabulary about Aurelia observation decorators, observers, and accessors outside a single binding. */
  Observation = 'observation',
  /** Vocabulary about template compiler services, scopes, syntax, and lowering. */
  Compiler = 'compiler',
  /** Vocabulary about template references and scope. */
  Template = 'template',
  /** Vocabulary about binding expression or binding instruction behavior. */
  Binding = 'binding',
  /** Vocabulary about rendering instructions produced by lowering. */
  Instruction = 'instruction',
}

/** Controlled vocabulary entry with a stable namespaced key, usage slot, and human/AI-readable intent. */
export class KernelVocabularyDefinition<
  TSlot extends KernelVocabularySlot = KernelVocabularySlot,
  TCode extends string = string,
  TClaimSignature extends KernelClaimPredicateSignature | null = KernelClaimPredicateSignature | null,
> {
  /** String discriminator for serialized vocabulary-definition records. */
  readonly kind = 'kernel-vocabulary-definition' as const;

  constructor(
    /** Stable vocabulary key, normally namespace.name. */
    readonly key: KernelVocabularyKey<TSlot, TCode>,
    /** Broad namespace that keeps provisional ontology growth from drifting globally. */
    readonly namespace: KernelVocabularyNamespace,
    /** Namespace-local kebab-case vocabulary name. */
    readonly name: string,
    /** Usage slot that tells tools where this key is valid. */
    readonly slot: TSlot,
    /** Grounded description of when this vocabulary entry should be used. */
    readonly summary: string,
    /** Directional subject/object shape for claim predicates; null for non-claim vocabulary entries. */
    readonly claimSignature: TClaimSignature,
  ) {}
}

export type KernelVocabularyDefinitionForSlot<
  TSlot extends KernelVocabularySlot,
  TCode extends string = string,
> = TSlot extends KernelVocabularySlot.ClaimPredicate
  ? KernelVocabularyDefinition<TSlot, TCode, KernelClaimPredicateSignature>
  : KernelVocabularyDefinition<TSlot, TCode, null>;

export type ProductKindDefinition<TCode extends string = string> =
  KernelVocabularyDefinition<KernelVocabularySlot.ProductKind, TCode, null>;

type ProductKindKeyFromDefinition<TDefinition extends ProductKindDefinition> =
  TDefinition extends ProductKindDefinition<infer TCode> ? ProductKindKey<TCode> : never;

type ProductKindKeysFromDefinitions<TDefinitions extends readonly ProductKindDefinition[]> = {
  readonly [TIndex in keyof TDefinitions]: TDefinitions[TIndex] extends ProductKindDefinition
    ? ProductKindKeyFromDefinition<TDefinitions[TIndex]>
    : never;
};

function makeVocabularyKey<
  TSlot extends KernelVocabularySlot,
  TNamespace extends KernelVocabularyNamespace,
  TName extends string,
>(
  namespace: TNamespace,
  name: TName,
): KernelVocabularyKey<TSlot, VocabularyCode<TNamespace, TName>> {
  return `${namespace}.${name}` as KernelVocabularyKey<TSlot, VocabularyCode<TNamespace, TName>>;
}

function createVocabularyDefinition<
  const TNamespace extends KernelVocabularyNamespace,
  const TName extends string,
  TSlot extends KernelVocabularySlot,
  TClaimSignature extends KernelClaimPredicateSignature | null,
>(
  /** Namespace that owns the vocabulary entry. */
  namespace: TNamespace,
  /** Namespace-local kebab-case name. */
  name: TName,
  /** Usage slot that owns the key's semantic contract. */
  slot: TSlot,
  /** Grounded usage description for future maintainers and AI agents. */
  summary: string,
  /** Optional directional signature for claim-predicate entries. */
  claimSignature: TClaimSignature,
): KernelVocabularyDefinition<TSlot, VocabularyCode<TNamespace, TName>, TClaimSignature> {
  if (!VOCABULARY_NAME_PATTERN.test(name)) {
    throw new Error(`Kernel vocabulary names must be kebab-case: ${namespace}.${name}`);
  }
  const key = `${namespace}.${name}`;
  if (definedVocabularyKeys.has(key)) {
    throw new Error(`Duplicate kernel vocabulary definition: ${key}`);
  }
  if (slot !== KernelVocabularySlot.ClaimPredicate && claimSignature !== null) {
    throw new Error(`Only claim predicates can declare claim signatures: ${key}`);
  }
  if (slot === KernelVocabularySlot.ClaimPredicate && claimSignature === null) {
    throw new Error(`Claim predicates must declare claim signatures: ${key}`);
  }
  const definition = new KernelVocabularyDefinition(
    makeVocabularyKey<TSlot, TNamespace, TName>(namespace, name),
    namespace,
    name,
    slot,
    summary,
    claimSignature,
  );
  definedVocabularyKeys.add(key);
  definedVocabularyDefinitions.set(key, definition);
  return definition;
}

export function defineVocabulary<
  const TNamespace extends KernelVocabularyNamespace,
  const TName extends string,
  TSlot extends Exclude<KernelVocabularySlot, KernelVocabularySlot.ClaimPredicate>,
>(
  /** Namespace that owns the vocabulary entry. */
  namespace: TNamespace,
  /** Namespace-local kebab-case name. */
  name: TName,
  /** Usage slot that owns the key's semantic contract. */
  slot: TSlot,
  /** Grounded usage description for future maintainers and AI agents. */
  summary: string,
): KernelVocabularyDefinition<TSlot, VocabularyCode<TNamespace, TName>, null> {
  return createVocabularyDefinition(namespace, name, slot, summary, null);
}

export function defineClaimPredicate<
  const TNamespace extends KernelVocabularyNamespace,
  const TName extends string,
  TSignature extends KernelClaimPredicateSignature,
>(
  /** Namespace that owns the claim predicate. */
  namespace: TNamespace,
  /** Namespace-local kebab-case name. */
  name: TName,
  /** Grounded usage description for future maintainers and AI agents. */
  summary: string,
  /** Directional shape for subject/object endpoints. */
  claimSignature: TSignature,
): KernelVocabularyDefinition<KernelVocabularySlot.ClaimPredicate, VocabularyCode<TNamespace, TName>, TSignature> {
  return createVocabularyDefinition(namespace, name, KernelVocabularySlot.ClaimPredicate, summary, claimSignature);
}

export function claimSignature<
  TSubject extends KernelClaimEndpointSignature,
  TObject extends KernelClaimEndpointSignature,
>(
  subject: TSubject,
  object: TObject,
): KernelClaimPredicateSignature<TSubject, TObject> {
  return new KernelClaimPredicateSignature(subject, object);
}

export function identityEndpoint(): KernelClaimEndpointSignature<readonly [KernelClaimEndpointKind.Identity], readonly []> {
  return new KernelClaimEndpointSignature([KernelClaimEndpointKind.Identity]);
}

export function productEndpoint<const TProductKinds extends readonly ProductKindDefinition[]>(
  ...productKinds: TProductKinds
): KernelClaimEndpointSignature<
  readonly [KernelClaimEndpointKind.Product],
  ProductKindKeysFromDefinitions<TProductKinds>
> {
  return new KernelClaimEndpointSignature(
    [KernelClaimEndpointKind.Product],
    productKinds.map((definition) => definition.key) as ProductKindKeysFromDefinitions<TProductKinds>,
  );
}

export function endpoint<
  const TEndpointKinds extends readonly KernelClaimEndpointKind[],
  const TProductKinds extends readonly ProductKindDefinition[] = readonly [],
>(
  endpointKinds: TEndpointKinds,
  productKinds: TProductKinds = [] as unknown as TProductKinds,
): KernelClaimEndpointSignature<TEndpointKinds, ProductKindKeysFromDefinitions<TProductKinds>> {
  return new KernelClaimEndpointSignature(
    endpointKinds,
    productKinds.map((definition) => definition.key) as ProductKindKeysFromDefinitions<TProductKinds>,
  );
}

/** Read a centrally declared vocabulary definition by key. */
export function readKernelVocabularyDefinition<
  TSlot extends KernelVocabularySlot,
  TCode extends string,
>(
  key: KernelVocabularyKey<TSlot, TCode>,
): KernelVocabularyDefinitionForSlot<TSlot, TCode> | null {
  return definedVocabularyDefinitions.get(key) as KernelVocabularyDefinitionForSlot<TSlot, TCode> | undefined ?? null;
}

/** Read a claim-predicate definition, including its required directional signature. */
export function readClaimPredicateDefinition<TCode extends string>(
  key: ClaimPredicateKey<TCode>,
): KernelVocabularyDefinition<KernelVocabularySlot.ClaimPredicate, TCode, KernelClaimPredicateSignature> | null {
  const definition = readKernelVocabularyDefinition(key);
  if (definition?.slot !== KernelVocabularySlot.ClaimPredicate) {
    return null;
  }
  return definition;
}
