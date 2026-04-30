declare const kernelVocabularyKeyBrand: unique symbol;

const VOCABULARY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const definedVocabularyKeys = new Set<string>();
const definedVocabularySlots = new Map<string, KernelVocabularySlot>();
const definedVocabularyDefinitions = new Map<string, KernelVocabularyDefinition>();
const referencedProductKindKeys = new Set<string>();

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
export type ClaimPredicateKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.ClaimPredicate, TCode>;

/** Controlled open-seam-kind vocabulary key. */
export type OpenSeamKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.OpenSeamKind, TCode>;

/** Controlled materialized-product-kind vocabulary key. */
export type ProductKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.ProductKind, TCode>;

/** Controlled derivation-rule-kind vocabulary key. */
export type DerivationRuleKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.DerivationRuleKind, TCode>;

/** Controlled derivation-edge-role vocabulary key. */
export type DerivationEdgeRoleKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.DerivationEdgeRole, TCode>;

/** Controlled binding-kind vocabulary key. */
export type BindingKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.BindingKind, TCode>;

/** Controlled instruction-kind vocabulary key. */
export type InstructionKindKey<TCode extends string = string> =
  KernelVocabularyKey<KernelVocabularySlot.InstructionKind, TCode>;

type VocabularyCode<TNamespace extends KernelVocabularyNamespace, TName extends string> = `${TNamespace}.${TName}`;
type ProductKindPart = readonly [KernelVocabularyNamespace, string];
type ProductKindKeyFromPart<TPart extends ProductKindPart> =
  TPart extends readonly [infer TNamespace extends KernelVocabularyNamespace, infer TName extends string]
    ? ProductKindKey<VocabularyCode<TNamespace, TName>>
    : never;
type ProductKindKeysFromParts<TParts extends readonly ProductKindPart[]> = {
  readonly [TIndex in keyof TParts]: TParts[TIndex] extends ProductKindPart
    ? ProductKindKeyFromPart<TParts[TIndex]>
    : never;
};

export const enum KernelClaimEndpointKind {
  /** Claim endpoint carried by an AddressHandle. */
  Address = 'address',
  /** Claim endpoint carried by an IdentityHandle. */
  Identity = 'identity',
  /** Claim endpoint carried by a ProductHandle. */
  Product = 'product',
}

export const enum KernelClaimSignatureRecordKind {
  /** Signature for one side of a claim predicate. */
  KernelClaimEndpointSignature = 'kernel-claim-endpoint-signature',
  /** Directional subject/object signature for a claim predicate. */
  KernelClaimPredicateSignature = 'kernel-claim-predicate-signature',
}

/** One side of a claim predicate signature. Product kinds constrain ProductHandle endpoints only. */
export class KernelClaimEndpointSignature<
  TEndpointKinds extends readonly KernelClaimEndpointKind[] = readonly KernelClaimEndpointKind[],
  TProductKinds extends readonly ProductKindKey[] = readonly ProductKindKey[],
> {
  /** String discriminator for serialized claim endpoint signatures. */
  readonly kind = KernelClaimSignatureRecordKind.KernelClaimEndpointSignature;

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
  readonly kind = KernelClaimSignatureRecordKind.KernelClaimPredicateSignature;

  constructor(
    /** Expected subject-side shape for this predicate. */
    readonly subject: TSubject,
    /** Expected object-side shape for this predicate. */
    readonly object: TObject,
  ) {}
}

export const enum KernelVocabularyRecordKind {
  /** Defines one controlled vocabulary entry that can classify claims, products, rules, and roles. */
  KernelVocabularyDefinition = 'kernel-vocabulary-definition',
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
export class KernelVocabularyDefinition<
  TSlot extends KernelVocabularySlot = KernelVocabularySlot,
  TCode extends string = string,
  TClaimSignature extends KernelClaimPredicateSignature | null = KernelClaimPredicateSignature | null,
> {
  /** String discriminator for serialized vocabulary-definition records. */
  readonly kind = KernelVocabularyRecordKind.KernelVocabularyDefinition;

  constructor(
    /** Stable vocabulary key, normally `${namespace}.${name}`. */
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
  definedVocabularySlots.set(key, slot);
  definedVocabularyDefinitions.set(key, definition);
  return definition;
}

function defineVocabulary<
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

function defineClaimPredicate<
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

function claimSignature<
  TSubject extends KernelClaimEndpointSignature,
  TObject extends KernelClaimEndpointSignature,
>(
  subject: TSubject,
  object: TObject,
): KernelClaimPredicateSignature<TSubject, TObject> {
  return new KernelClaimPredicateSignature(subject, object);
}

function identityEndpoint(): KernelClaimEndpointSignature<readonly [KernelClaimEndpointKind.Identity], readonly []> {
  return new KernelClaimEndpointSignature([KernelClaimEndpointKind.Identity]);
}

function productEndpoint<const TProductKindParts extends readonly ProductKindPart[]>(
  ...productKinds: TProductKindParts
): KernelClaimEndpointSignature<
  readonly [KernelClaimEndpointKind.Product],
  ProductKindKeysFromParts<TProductKindParts>
> {
  return new KernelClaimEndpointSignature(
    [KernelClaimEndpointKind.Product],
    productKinds.map(([namespace, name]) => productKindKey(namespace, name)) as ProductKindKeysFromParts<TProductKindParts>,
  );
}

function endpoint<
  const TEndpointKinds extends readonly KernelClaimEndpointKind[],
  const TProductKindParts extends readonly ProductKindPart[] = readonly [],
>(
  endpointKinds: TEndpointKinds,
  productKinds: TProductKindParts = [] as unknown as TProductKindParts,
): KernelClaimEndpointSignature<TEndpointKinds, ProductKindKeysFromParts<TProductKindParts>> {
  return new KernelClaimEndpointSignature(
    endpointKinds,
    productKinds.map(([namespace, name]) => productKindKey(namespace, name)) as ProductKindKeysFromParts<TProductKindParts>,
  );
}

function registrationAdmissionEndpoint() {
  return productEndpoint(
    [KernelVocabularyNamespace.Registration, 'open-admission'],
    [KernelVocabularyNamespace.Registration, 'resolver-admission'],
    [KernelVocabularyNamespace.Registration, 'parameterized-registry-admission'],
    [KernelVocabularyNamespace.Registration, 'registry-admission'],
    [KernelVocabularyNamespace.Registration, 'resource-admission'],
    [KernelVocabularyNamespace.Registration, 'framework-registration-admission'],
  );
}

function registrationValueEndpoint() {
  return endpoint(
    [KernelClaimEndpointKind.Address, KernelClaimEndpointKind.Identity, KernelClaimEndpointKind.Product],
    [
      [KernelVocabularyNamespace.Configuration, 'app-task'],
      [KernelVocabularyNamespace.Resource, 'definition'],
      [KernelVocabularyNamespace.Resource, 'definition-header'],
    ],
  );
}

function productKindKey<
  const TNamespace extends KernelVocabularyNamespace,
  const TName extends string,
>(
  namespace: TNamespace,
  name: TName,
): ProductKindKey<VocabularyCode<TNamespace, TName>> {
  if (!VOCABULARY_NAME_PATTERN.test(name)) {
    throw new Error(`Kernel vocabulary names must be kebab-case: ${namespace}.${name}`);
  }
  const key = `${namespace}.${name}`;
  referencedProductKindKeys.add(key);
  return makeVocabularyKey<KernelVocabularySlot.ProductKind, TNamespace, TName>(namespace, name);
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

/** Small seed vocabulary; new entries should be added deliberately as semantics are implemented. */
export const KernelVocabulary = {
  Evaluation: {
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
    /** A type projection exposes a member projection. */
    TypeShapeHasMember: defineClaimPredicate(
      KernelVocabularyNamespace.TypeSystem,
      'type-shape-has-member',
      'A type-system type projection exposes a member projection.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.TypeSystem, 'type-shape']),
        productEndpoint([KernelVocabularyNamespace.TypeSystem, 'type-member']),
      ),
    ),
    /** TypeChecker projection could not close the type or member surface. */
    OpenTypeProjection: defineVocabulary(
      KernelVocabularyNamespace.TypeSystem,
      'open-type-projection',
      KernelVocabularySlot.OpenSeamKind,
      'TypeChecker projection could not close the type or member surface without guessing.',
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
    Declares: defineClaimPredicate(
      KernelVocabularyNamespace.Resource,
      'declares',
      'Source syntax or convention declares an Aurelia resource.',
      claimSignature(
        endpoint(
          [KernelClaimEndpointKind.Address, KernelClaimEndpointKind.Identity, KernelClaimEndpointKind.Product],
          [[KernelVocabularyNamespace.Resource, 'definition-header']],
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
        productEndpoint([KernelVocabularyNamespace.Resource, 'built-in-catalog']),
        productEndpoint([KernelVocabularyNamespace.Resource, 'definition-header']),
      ),
    ),
    ConvergesToDefinition: defineClaimPredicate(
      KernelVocabularyNamespace.Resource,
      'converges-to-definition',
      'A resource definition header or contribution converges into a full resource metadata definition.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Resource, 'definition-header'],
          [KernelVocabularyNamespace.Resource, 'definition-contribution'],
        ),
        productEndpoint([KernelVocabularyNamespace.Resource, 'definition']),
      ),
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
    /** Resource definition convergence saw metadata fields it cannot safely materialize yet. */
    OpenDefinitionField: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-definition-field',
      KernelVocabularySlot.OpenSeamKind,
      'Resource definition convergence saw metadata fields it cannot safely materialize yet.',
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
    ProvidesKey: defineClaimPredicate(
      KernelVocabularyNamespace.Di,
      'provides-key',
      'Registration or resolver flow provides a DI key.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Di, 'resolver'],
          [KernelVocabularyNamespace.Di, 'resolver-slot'],
          [KernelVocabularyNamespace.Di, 'resource-slot'],
          [KernelVocabularyNamespace.Di, 'self-resolver-slot'],
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
        productEndpoint([KernelVocabularyNamespace.Di, 'container']),
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
          [KernelVocabularyNamespace.Di, 'container'],
          [KernelVocabularyNamespace.Di, 'container-registration'],
        ),
        productEndpoint(
          [KernelVocabularyNamespace.Di, 'resolver'],
          [KernelVocabularyNamespace.Di, 'registry'],
          [KernelVocabularyNamespace.Di, 'parameterized-registry'],
          [KernelVocabularyNamespace.Di, 'resolver-slot'],
          [KernelVocabularyNamespace.Di, 'self-resolver-slot'],
          [KernelVocabularyNamespace.Di, 'resource-slot'],
          [KernelVocabularyNamespace.Di, 'factory-slot'],
        ),
      ),
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
    /** Renderer/controller emulation reached a runtime child container that has not been materialized. */
    OpenChildContainer: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-child-container',
      KernelVocabularySlot.OpenSeamKind,
      'Renderer/controller emulation reached a runtime child, attribute, or template-controller container that has not been materialized.',
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
    ContainsStep: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'contains-step',
      'A configuration sequence contains one ordered step.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'sequence']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'step']),
      ),
    ),
    /** A configuration step produced or selected a product that later passes can consume. */
    ProducesProduct: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'produces-product',
      'A configuration step produced or selected a product that later passes can consume.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'step']),
        productEndpoint(
          [KernelVocabularyNamespace.Configuration, 'aurelia'],
          [KernelVocabularyNamespace.Configuration, 'app-root-config'],
          [KernelVocabularyNamespace.Configuration, 'app-root'],
          [KernelVocabularyNamespace.Configuration, 'controller'],
          [KernelVocabularyNamespace.Configuration, 'binding-scope'],
          [KernelVocabularyNamespace.Configuration, 'binding-context'],
          [KernelVocabularyNamespace.Configuration, 'override-context'],
          [KernelVocabularyNamespace.Configuration, 'option-contribution'],
          [KernelVocabularyNamespace.Configuration, 'app-task'],
          [KernelVocabularyNamespace.Configuration, 'app-task-slot-dispatch'],
          [KernelVocabularyNamespace.Di, 'container'],
        ),
      ),
    ),
    /** A configuration step admitted a registration product before DI world construction spends it. */
    AdmitsRegistration: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'admits-registration',
      'A configuration step admitted a registration product before DI world construction spends it.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'step']),
        registrationAdmissionEndpoint(),
      ),
    ),
    /** A modeled Aurelia facade owns the root container used by app admission. */
    OwnsContainer: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'owns-container',
      'A modeled Aurelia facade owns the root container used by app admission.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'aurelia']),
        productEndpoint([KernelVocabularyNamespace.Di, 'container']),
      ),
    ),
    /** A modeled Aurelia facade prepared or selected an AppRoot boundary. */
    HasAppRoot: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'has-app-root',
      'A modeled Aurelia facade prepared or selected an AppRoot boundary.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'aurelia']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'app-root']),
      ),
    ),
    /** A modeled AppRoot was constructed from an admitted AppRoot config. */
    AppRootUsesConfig: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'app-root-uses-config',
      'A modeled AppRoot was constructed from an admitted AppRoot config.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'app-root']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'app-root-config']),
      ),
    ),
    /** A modeled controller owns or receives a runtime binding scope. */
    ControllerUsesBindingScope: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-uses-binding-scope',
      'A modeled controller owns, receives, or activates with a runtime binding Scope.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'controller']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
      ),
    ),
    /** A modeled hydratable controller contains a child controller in the runtime controller tree. */
    ControllerHasChild: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-has-child',
      'A modeled hydratable controller contains a child controller in the runtime controller tree.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'controller']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'controller']),
      ),
    ),
    /** A modeled controller owns a runtime binding through Controller.addBinding. */
    ControllerOwnsRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'controller-owns-runtime-binding',
      'A modeled controller owns a runtime binding through Controller.addBinding.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'controller']),
        productEndpoint([KernelVocabularyNamespace.Binding, 'runtime-binding']),
      ),
    ),
    /** A lowered rendering instruction created a modeled runtime controller. */
    InstructionCreatesController: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'instruction-creates-controller',
      'A lowered rendering instruction created a modeled runtime controller.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'controller']),
      ),
    ),
    /** A lowered rendering instruction evaluates its expression-owned work under a modeled runtime scope. */
    InstructionUsesBindingScope: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'instruction-uses-binding-scope',
      'A lowered rendering instruction evaluates expression-owned work under a modeled runtime Scope.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
      ),
    ),
    /** A runtime binding scope has an ordinary parent-scope edge. */
    BindingScopeHasParent: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'binding-scope-has-parent',
      'A runtime binding Scope has an ordinary parent-scope edge used by $parent and fallback lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
      ),
    ),
    /** A runtime binding scope uses its binding context for ordinary name lookup. */
    BindingScopeUsesBindingContext: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'binding-scope-uses-binding-context',
      'A runtime binding Scope uses its binding context for ordinary view-model or synthetic-context lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-context']),
      ),
    ),
    /** A runtime binding scope uses its override context for template locals and contextual names. */
    BindingScopeUsesOverrideContext: defineClaimPredicate(
      KernelVocabularyNamespace.Configuration,
      'binding-scope-uses-override-context',
      'A runtime binding Scope uses its override context for template locals, repeat metadata, and contextual lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'override-context']),
      ),
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
    /** A multi-binding value site was split into one secondary segment. */
    SplitsMultiBindingSegment: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'splits-multi-binding-segment',
      'A custom-attribute inline multi-binding value site was split into one secondary segment.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'value-site']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'multi-binding-segment']),
      ),
    ),
    /** A multi-binding value site was lowered into instructions. */
    LowersMultiBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'lowers-multi-binding',
      'A custom-attribute inline multi-binding value site was lowered into instruction products.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'value-site']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'multi-binding-lowering']),
      ),
    ),
    /** Attribute classification produced a runtime-shaped ICommandBuildInfo product. */
    BuildsCommandInput: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'builds-command-input',
      'Attribute classification or secondary multi-binding segment produced a runtime-shaped ICommandBuildInfo product for binding-command lowering.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Template, 'attribute-classification'],
          [KernelVocabularyNamespace.Compiler, 'multi-binding-segment'],
        ),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'binding-command-build-input']),
      ),
    ),
    /** Runtime-shaped ICommandBuildInfo was lowered through a binding command. */
    LowersBindingCommand: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'lowers-binding-command',
      'Runtime-shaped ICommandBuildInfo was lowered through a binding command.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'binding-command-build-input']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'binding-command-lowering']),
      ),
    ),
    /** Binding-command lowering used a selected command executable. */
    UsesBindingCommandExecutable: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-binding-command-executable',
      'Binding-command or secondary multi-binding lowering used a selected command executable.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'binding-command-lowering'],
          [KernelVocabularyNamespace.Compiler, 'multi-binding-segment'],
          [KernelVocabularyNamespace.Compiler, 'multi-binding-lowering'],
        ),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'binding-command-executable']),
      ),
    ),
    /** Binding-command lowering produced one lowered rendering instruction. */
    ProducesInstruction: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'produces-instruction',
      'Compiler lowering produced one lowered rendering instruction.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'binding-command-lowering'],
          [KernelVocabularyNamespace.Compiler, 'multi-binding-lowering'],
        ),
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
      ),
    ),
    /** Lowered instruction uses an expression parser publication. */
    UsesExpressionParse: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-expression-parse',
      'Lowered instruction uses an expression parser publication.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
        productEndpoint([KernelVocabularyNamespace.Template, 'expression-parse']),
      ),
    ),
    /** Compiler scope provides a resource to template lookup. */
    ProvidesResource: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'provides-resource',
      'Compiler scope provides a resource to template lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'resource-scope']),
        productEndpoint(
          [KernelVocabularyNamespace.Resource, 'definition-header'],
          [KernelVocabularyNamespace.Resource, 'definition'],
        ),
      ),
    ),
    /** Compiler scope provides an attribute-pattern or binding-command executable to parser/lowering services. */
    ProvidesSyntaxResource: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'provides-syntax-resource',
      'Compiler scope provides an attribute-pattern or binding-command executable to parser/lowering services.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'resource-scope']),
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'attribute-pattern-executable'],
          [KernelVocabularyNamespace.Compiler, 'binding-command-executable'],
        ),
      ),
    ),
    /** A compiler world uses a resource scope for lookup. */
    UsesResourceScope: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-resource-scope',
      'A compiler world uses a resource scope for lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'world']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'resource-scope']),
      ),
    ),
    /** A compilation unit or context uses a compiler world. */
    UsesWorld: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-world',
      'A compilation unit or compilation context uses a compiler world.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'compilation-unit'],
          [KernelVocabularyNamespace.Compiler, 'compilation-context'],
        ),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'world']),
      ),
    ),
    /** A compilation unit or context uses parser/lowering inquiry pressure. */
    UsesParseContext: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-parse-context',
      'A compilation unit or compilation context uses parser/lowering inquiry pressure.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'compilation-unit'],
          [KernelVocabularyNamespace.Compiler, 'compilation-context'],
        ),
        productEndpoint([KernelVocabularyNamespace.Template, 'parse-context']),
      ),
    ),
    /** A compilation unit owns or uses its root runtime-shaped compilation context. */
    UsesCompilationContext: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-compilation-context',
      'A compilation unit owns or uses its root runtime-shaped compilation context.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compilation-unit']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compilation-context']),
      ),
    ),
    /** A compilation unit compiles an authored template source. */
    CompilesTemplate: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'compiles-template',
      'A compilation unit compiles an authored template source.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compilation-unit']),
        productEndpoint([KernelVocabularyNamespace.Template, 'source']),
      ),
    ),
    /** A runtime-shaped compilation context uses a resource scope for lookup. */
    ContextUsesResourceScope: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'context-uses-resource-scope',
      'A runtime-shaped compilation context uses a resource scope for lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compilation-context']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'resource-scope']),
      ),
    ),
    /** A runtime-shaped compilation context uses a compiler service product. */
    ContextUsesService: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'context-uses-service',
      'A runtime-shaped compilation context uses a compiler service product.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compilation-context']),
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'service'],
          [KernelVocabularyNamespace.Compiler, 'attribute-parser'],
          [KernelVocabularyNamespace.Compiler, 'binding-command-resolver'],
        ),
      ),
    ),
    /** A compiler world uses a compiler service product. */
    UsesService: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-service',
      'A compiler world uses a compiler service product.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'world']),
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'service'],
          [KernelVocabularyNamespace.Compiler, 'attribute-parser'],
          [KernelVocabularyNamespace.Compiler, 'binding-command-resolver'],
        ),
      ),
    ),
    /** A runtime Rendering service uses a runtime renderer product. */
    RenderingServiceUsesRenderer: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'rendering-service-uses-renderer',
      'A runtime Rendering service uses a runtime renderer product for one instruction kind.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'service']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'runtime-renderer']),
      ),
    ),
    /** A syntax catalog includes a compiler-visible attribute-pattern or binding-command executable. */
    ContainsSyntaxResource: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'contains-syntax-resource',
      'A syntax catalog includes a compiler-visible attribute-pattern or binding-command executable.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'built-in-syntax-catalog']),
        productEndpoint(
          [KernelVocabularyNamespace.Compiler, 'attribute-pattern-executable'],
          [KernelVocabularyNamespace.Compiler, 'binding-command-executable'],
        ),
      ),
    ),
    /** A runtime renderer catalog includes an IRenderer product. */
    ContainsRuntimeRenderer: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'contains-runtime-renderer',
      'A runtime renderer catalog includes an IRenderer product.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'built-in-runtime-renderer-catalog']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'runtime-renderer']),
      ),
    ),
    AdmitsSyntaxCatalog: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'admits-syntax-catalog',
      'A known framework registration admission made a built-in syntax catalog available for attribute-parser and binding-command resolver input.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'configured-syntax-catalog-selection']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'built-in-syntax-catalog']),
      ),
    ),
    AdmitsRuntimeRendererCatalog: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'admits-runtime-renderer-catalog',
      'A known framework registration admission made a built-in runtime renderer catalog available for Rendering input.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'configured-runtime-renderer-catalog-selection']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'built-in-runtime-renderer-catalog']),
      ),
    ),
    /** An attribute-pattern executable owns a compiled SyntaxInterpreter pattern. */
    CompilesAttributePattern: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'compiles-attribute-pattern',
      'An attribute-pattern executable owns a compiled SyntaxInterpreter pattern.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'attribute-pattern-executable']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compiled-attribute-pattern']),
      ),
    ),
    /** A runtime IAttributeParser service uses a compiled SyntaxInterpreter machine. */
    UsesAttributeParserMachine: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-attribute-parser-machine',
      'A runtime IAttributeParser service uses a compiled SyntaxInterpreter machine.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'attribute-parser']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'attribute-parser-machine']),
      ),
    ),
    /** A runtime SyntaxInterpreter machine uses a compiled attribute pattern for matching. */
    UsesCompiledAttributePattern: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'uses-compiled-attribute-pattern',
      'A runtime SyntaxInterpreter machine uses a compiled attribute pattern for matching.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'attribute-parser-machine']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'compiled-attribute-pattern']),
      ),
    ),
    AdmitsResourceCatalog: defineClaimPredicate(
      KernelVocabularyNamespace.Compiler,
      'admits-resource-catalog',
      'A known framework registration admission made a built-in resource catalog available for DI resource-slot spending.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'configured-resource-catalog-selection']),
        productEndpoint([KernelVocabularyNamespace.Resource, 'built-in-catalog']),
      ),
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
    /** A custom element processContent hook owns child DOM transformation that tooling has not executed. */
    OpenProcessContentHook: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-process-content-hook',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler reached a custom element processContent hook and cannot safely guess the transformed child DOM.',
    ),
    /** Projection, containerless child content, or slot extraction stayed open at compiled-template assembly. */
    OpenContentProjection: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-content-projection',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler could not close child content projection, containerless content, or slot extraction semantics.',
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
    /** Markup or binding syntax references a resource by name or command. */
    ReferencesResource: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'references-resource',
      'Markup or binding syntax references a resource by name or command.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Template, 'html-node'],
          [KernelVocabularyNamespace.Template, 'html-attribute'],
          [KernelVocabularyNamespace.Template, 'attribute-syntax'],
          [KernelVocabularyNamespace.Template, 'attribute-classification'],
          [KernelVocabularyNamespace.Binding, 'binding'],
        ),
        productEndpoint(
          [KernelVocabularyNamespace.Resource, 'definition-header'],
          [KernelVocabularyNamespace.Resource, 'definition'],
          [KernelVocabularyNamespace.Compiler, 'attribute-pattern-executable'],
          [KernelVocabularyNamespace.Compiler, 'binding-command-executable'],
        ),
      ),
    ),
    /** An authored template source belongs to a resource definition or definition header. */
    SourceForResource: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'source-for-resource',
      'An authored template source belongs to a resource definition or definition header.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'source']),
        productEndpoint(
          [KernelVocabularyNamespace.Resource, 'definition-header'],
          [KernelVocabularyNamespace.Resource, 'definition'],
        ),
      ),
    ),
    /** An authored template source parsed into an HTML document product. */
    ParsesToHtmlDocument: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'parses-to-html-document',
      'An authored template source parsed into an HTML document product.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'source']),
        productEndpoint([KernelVocabularyNamespace.Template, 'html-document']),
      ),
    ),
    /** An authored HTML document compiled into a compiled-template product. */
    CompilesToCompiledTemplate: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'compiles-to-compiled-template',
      'An authored HTML document compiled into a compiled-template product.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'html-document']),
        productEndpoint([KernelVocabularyNamespace.Template, 'compiled-template']),
      ),
    ),
    /** A compiled template contains one runtime render target. */
    ContainsRenderTarget: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'contains-render-target',
      'A compiled template contains one runtime render target.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'compiled-template']),
        productEndpoint([KernelVocabularyNamespace.Template, 'render-target']),
      ),
    ),
    /** A runtime render target is backed by an authored HTML node. */
    RenderTargetForHtmlNode: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'render-target-for-html-node',
      'A runtime render target is backed by an authored HTML node.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'render-target']),
        productEndpoint([KernelVocabularyNamespace.Template, 'html-node']),
      ),
    ),
    /** A runtime render target uses one instruction sequence. */
    RenderTargetUsesInstructionSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'render-target-uses-instruction-sequence',
      'A runtime render target uses one ordered instruction sequence.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'render-target']),
        productEndpoint([KernelVocabularyNamespace.Instruction, 'sequence']),
      ),
    ),
    /** An authored HTML document or node contains a child HTML node. */
    ContainsHtmlNode: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'contains-html-node',
      'An authored HTML document or node contains a child HTML node.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Template, 'html-document'],
          [KernelVocabularyNamespace.Template, 'html-node'],
        ),
        productEndpoint([KernelVocabularyNamespace.Template, 'html-node']),
      ),
    ),
    /** An authored HTML node owns an authored HTML attribute. */
    ContainsHtmlAttribute: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'contains-html-attribute',
      'An authored HTML node owns an authored HTML attribute.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'html-node']),
        productEndpoint([KernelVocabularyNamespace.Template, 'html-attribute']),
      ),
    ),
    /** An authored HTML attribute parsed into runtime AttrSyntax. */
    ParsesToAttributeSyntax: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'parses-to-attribute-syntax',
      'An authored HTML attribute parsed into runtime AttrSyntax.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Template, 'html-attribute'],
          [KernelVocabularyNamespace.Compiler, 'multi-binding-segment'],
        ),
        productEndpoint([KernelVocabularyNamespace.Template, 'attribute-syntax']),
      ),
    ),
    ClassifiesAttributeSyntax: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'classifies-attribute-syntax',
      'Runtime AttrSyntax was classified against resource scope, bindables, and binding-command lookup.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'attribute-syntax']),
        productEndpoint([KernelVocabularyNamespace.Template, 'attribute-classification']),
      ),
    ),
    SelectsValueSite: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'selects-value-site',
      'A template/compiler product selected an authored value into a value-site product.',
      claimSignature(
        productEndpoint(
          [KernelVocabularyNamespace.Template, 'html-node'],
          [KernelVocabularyNamespace.Template, 'html-attribute'],
          [KernelVocabularyNamespace.Template, 'attribute-syntax'],
          [KernelVocabularyNamespace.Template, 'attribute-classification'],
          [KernelVocabularyNamespace.Compiler, 'binding-command-build-input'],
          [KernelVocabularyNamespace.Compiler, 'multi-binding-segment'],
        ),
        productEndpoint([KernelVocabularyNamespace.Template, 'value-site']),
      ),
    ),
    ParsesToExpressionParse: defineClaimPredicate(
      KernelVocabularyNamespace.Template,
      'parses-to-expression-parse',
      'A parser-owned template value site was published through the expression parser boundary.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Template, 'value-site']),
        productEndpoint([KernelVocabularyNamespace.Template, 'expression-parse']),
      ),
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
    /** Binding kind for property assignment or observation. */
    Property: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'property',
      KernelVocabularySlot.BindingKind,
      'Property binding produced from bindable or command syntax.',
    ),
    /** Binding kind for attribute assignment or observation. */
    Attribute: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'attribute',
      KernelVocabularySlot.BindingKind,
      'Attribute binding produced by attr/class/style command syntax.',
    ),
    /** Binding kind for text or attribute interpolation. */
    Interpolation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'interpolation',
      KernelVocabularySlot.BindingKind,
      'Interpolation binding produced from text or attribute syntax.',
    ),
    /** Binding kind for one interpolation part observed by runtime interpolation machinery. */
    InterpolationPart: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'interpolation-part',
      KernelVocabularySlot.BindingKind,
      'Interpolation-part binding used inside runtime interpolation machinery.',
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
    /** Binding kind for let declarations. */
    Let: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'let',
      KernelVocabularySlot.BindingKind,
      'Let binding produced by let elements or standalone let-binding instructions.',
    ),
    /** Binding kind for text-node content updates. */
    Content: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'content',
      KernelVocabularySlot.BindingKind,
      'Content binding produced by text-binding instructions.',
    ),
    /** Binding kind for style-property updates. */
    StyleProperty: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'style-property',
      KernelVocabularySlot.BindingKind,
      'Property binding whose runtime target is an element style object.',
    ),
    /** Binding kind for spread hydration transfer. */
    Spread: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'spread',
      KernelVocabularySlot.BindingKind,
      'Spread binding that transfers captured attributes through runtime hydration context.',
    ),
    /** Binding kind for spread value updates. */
    SpreadValue: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'spread-value',
      KernelVocabularySlot.BindingKind,
      'Spread-value binding produced by spread command syntax.',
    ),
    /** Binding kind for i18n translation updates. */
    Translation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'translation',
      KernelVocabularySlot.BindingKind,
      'I18n translation binding produced by translation renderers.',
    ),
    /** Binding kind for i18n translation parameter updates. */
    TranslationParameters: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'translation-parameters',
      KernelVocabularySlot.BindingKind,
      'I18n translation-parameters binding produced by translation parameter renderers.',
    ),
    /** Binding kind for state plugin state-to-target updates. */
    State: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'state',
      KernelVocabularySlot.BindingKind,
      'State plugin binding that updates a target property from store state.',
    ),
    /** Binding kind for state plugin dispatch listeners. */
    StateDispatch: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'state-dispatch',
      KernelVocabularySlot.BindingKind,
      'State plugin dispatch binding attached to a DOM event.',
    ),
    /** A lowered instruction is rendered into a runtime binding instance. */
    InstructionCreatesRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'instruction-creates-runtime-binding',
      'A lowered rendering instruction is rendered into a runtime binding instance.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
        productEndpoint([KernelVocabularyNamespace.Binding, 'runtime-binding']),
      ),
    ),
    /** A lowered instruction selected a runtime renderer. */
    InstructionUsesRuntimeRenderer: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'instruction-uses-runtime-renderer',
      'A lowered rendering instruction selected a runtime renderer.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
        productEndpoint([KernelVocabularyNamespace.Compiler, 'runtime-renderer']),
      ),
    ),
    /** A runtime renderer produced a runtime binding instance. */
    RuntimeRendererCreatesRuntimeBinding: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-renderer-creates-runtime-binding',
      'A runtime renderer produced a runtime binding instance.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Compiler, 'runtime-renderer']),
        productEndpoint([KernelVocabularyNamespace.Binding, 'runtime-binding']),
      ),
    ),
    /** A runtime binding targets a child or custom-attribute controller rather than the rendering controller itself. */
    RuntimeBindingTargetsController: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-targets-controller',
      'A runtime binding targets a child or custom-attribute controller while being owned by its rendering controller.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Binding, 'runtime-binding']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'controller']),
      ),
    ),
    /** A runtime binding exposes a scope effect such as let or iterator locals. */
    RuntimeBindingCreatesScopeEffect: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'runtime-binding-creates-scope-effect',
      'A runtime binding exposes a scope effect such as let target assignment or iterator locals.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Binding, 'runtime-binding']),
        productEndpoint([KernelVocabularyNamespace.Binding, 'scope-effect']),
      ),
    ),
    /** A binding scope effect produced a modeled runtime Scope. */
    ScopeEffectCreatesBindingScope: defineClaimPredicate(
      KernelVocabularyNamespace.Binding,
      'scope-effect-creates-binding-scope',
      'A binding scope effect produced a modeled runtime Scope.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Binding, 'scope-effect']),
        productEndpoint([KernelVocabularyNamespace.Configuration, 'binding-scope']),
      ),
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
    /** A lowered hydrate instruction owns a child instruction sequence. */
    InstructionOwnsChildSequence: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'instruction-owns-child-sequence',
      'A lowered hydrate instruction owns a child instruction sequence.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
        productEndpoint([KernelVocabularyNamespace.Instruction, 'sequence']),
      ),
    ),
    /** An instruction sequence contains a lowered rendering instruction. */
    SequenceContainsInstruction: defineClaimPredicate(
      KernelVocabularyNamespace.Instruction,
      'sequence-contains-instruction',
      'An instruction sequence contains a lowered rendering instruction.',
      claimSignature(
        productEndpoint([KernelVocabularyNamespace.Instruction, 'sequence']),
        productEndpoint([KernelVocabularyNamespace.Instruction, 'instruction']),
      ),
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

validateKernelVocabularyDefinitions();

function validateKernelVocabularyDefinitions(): void {
  for (const key of referencedProductKindKeys) {
    const slot = definedVocabularySlots.get(key);
    if (slot !== KernelVocabularySlot.ProductKind) {
      throw new Error(`Claim signatures must reference defined product-kind vocabulary: ${key}`);
    }
  }
}
