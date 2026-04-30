declare const AtlasVocabularyKeyBrand: unique symbol;

const VOCABULARY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Usage slot for Atlas's controlled self-description vocabulary. */
export const enum InternalVocabularySlot {
  /** Key classifies an answer-envelope concept. */
  AnswerContract = "answer-contract",
  /** Key classifies a lens contract concept. */
  LensContract = "lens-contract",
  /** Key classifies a substrate contract concept. */
  SubstrateContract = "substrate-contract",
  /** Key classifies repository terrain intent. */
  TerrainIntent = "terrain-intent",
  /** Key classifies maintenance and static-coherence intent. */
  MaintenanceIntent = "maintenance-intent",
}

/** Namespace that owns one Atlas vocabulary definition. */
export const enum InternalVocabularyNamespace {
  /** Inquiry and answer algebra concepts. */
  Inquiry = "inquiry",
  /** Lens catalog and lens implementation concepts. */
  Lens = "lens",
  /** Substrate contract concepts. */
  Substrate = "substrate",
  /** Repository terrain concepts. */
  Terrain = "terrain",
  /** Atlas maintenance and self-analysis concepts. */
  Maintenance = "maintenance",
}

/** Stable controlled vocabulary key for Atlas self-description. */
export type InternalVocabularyKey<
  TSlot extends InternalVocabularySlot = InternalVocabularySlot,
  TCode extends string = string,
> = TCode & { readonly [AtlasVocabularyKeyBrand]: TSlot };

/** One self-description vocabulary definition that future Atlas lenses can analyze. */
export interface InternalVocabularyDefinition<
  TSlot extends InternalVocabularySlot = InternalVocabularySlot,
  TCode extends string = string,
> {
  /** Stable vocabulary key, normally `${namespace}.${name}`. */
  readonly key: InternalVocabularyKey<TSlot, TCode>;
  /** Namespace that owns this definition. */
  readonly namespace: InternalVocabularyNamespace;
  /** Namespace-local kebab-case vocabulary name. */
  readonly name: string;
  /** Usage slot that tells self-analysis where this key is valid. */
  readonly slot: TSlot;
  /** Grounded description of when the vocabulary entry should be used. */
  readonly summary: string;
}

type VocabularyCode<TNamespace extends InternalVocabularyNamespace, TName extends string> = `${TNamespace}.${TName}`;

/** Define one Atlas vocabulary entry while preserving its literal key type. */
export function defineInternalVocabulary<
  const TNamespace extends InternalVocabularyNamespace,
  const TName extends string,
  TSlot extends InternalVocabularySlot,
>(
  /** Namespace that owns the entry. */
  namespace: TNamespace,
  /** Namespace-local kebab-case name. */
  name: TName,
  /** Usage slot that controls valid use. */
  slot: TSlot,
  /** Grounded usage description. */
  summary: string,
): InternalVocabularyDefinition<TSlot, VocabularyCode<TNamespace, TName>> {
  if (!VOCABULARY_NAME_PATTERN.test(name)) {
    throw new Error(`Atlas vocabulary names must be kebab-case: ${namespace}.${name}`);
  }

  return {
    key: `${namespace}.${name}` as InternalVocabularyKey<TSlot, VocabularyCode<TNamespace, TName>>,
    namespace,
    name,
    slot,
    summary,
  };
}

/** Controlled self-description terms that make Atlas easier to analyze. */
export const InternalVocabularyDefinitions = [
  defineInternalVocabulary(
    InternalVocabularyNamespace.Inquiry,
    "answer-algebra",
    InternalVocabularySlot.AnswerContract,
    "Use for contracts that preserve hit, miss, partial, open, unsupported, reroute, and error outcomes.",
  ),
  defineInternalVocabulary(
    InternalVocabularyNamespace.Inquiry,
    "continuation-algebra",
    InternalVocabularySlot.AnswerContract,
    "Use for semantic next-question edges that should not be named after destination readers.",
  ),
  defineInternalVocabulary(
    InternalVocabularyNamespace.Lens,
    "lens-contract",
    InternalVocabularySlot.LensContract,
    "Use for declarations that bind a lens id to loci, substrates, projections, outputs, and budgets.",
  ),
  defineInternalVocabulary(
    InternalVocabularyNamespace.Substrate,
    "substrate-contract",
    InternalVocabularySlot.SubstrateContract,
    "Use for declarations that name a substrate's trust model, basis kinds, dependencies, and produced evidence.",
  ),
  defineInternalVocabulary(
    InternalVocabularyNamespace.Terrain,
    "active-semantic-terrain",
    InternalVocabularySlot.TerrainIntent,
    "Use for repository areas that should currently shape product or Atlas semantic inquiry.",
  ),
  defineInternalVocabulary(
    InternalVocabularyNamespace.Maintenance,
    "static-coherence",
    InternalVocabularySlot.MaintenanceIntent,
    "Use for self-analysis that checks contract consistency before runtime behavior is implemented.",
  ),
] as const satisfies readonly InternalVocabularyDefinition[];
