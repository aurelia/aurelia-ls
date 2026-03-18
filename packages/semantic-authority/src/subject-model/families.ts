import { CLAIM_FAMILY_DEFINITIONS } from "./claim-families.js";
import { CLOSURE_CONTRACT_DEFINITIONS } from "./closure-contracts.js";
import { DECLARATION_SURFACE_DEFINITIONS } from "./declaration-surfaces.js";
import { FIELD_SCHEMA_DEFINITIONS } from "./field-schemas.js";
import { GOVERNED_FAMILY_DEFINITIONS } from "./governed-families.js";
import { GRAMMAR_SHAPE_DEFINITIONS } from "./grammar-shapes.js";
import { POSITION_FAMILY_DEFINITIONS } from "./position-families.js";
import { RESOURCE_KIND_DEFINITIONS } from "./resource-kinds.js";
import { SCOPE_FAMILY_DEFINITIONS } from "./scope-families.js";
import { TRAIT_SCHEMA_DEFINITIONS } from "./trait-schemas.js";
import type {
  ClaimFamilyDefinition,
  ClosureContractDefinition,
  DeclarationSurfaceDefinition,
  EvaluatorGroupId,
  FieldSchemaDefinition,
  GrammarShapeDefinition,
  GovernedFamilyDefinition,
  PositionFamilyDefinition,
  ResourceKindDefinition,
  ScopeFamilyDefinition,
  SubjectModelExtension,
  SubjectModelRegistry,
  TraitSchemaDefinition,
  VocabularyCatalogDefinition,
  WitnessFamilyDefinition,
} from "./types.js";
import { SUBJECT_MODEL_VOCABULARIES } from "./vocabulary.js";
import { WITNESS_FAMILY_DEFINITIONS } from "./witness-families.js";

type KeySelector<TEntry, TKey extends string | number> = (entry: TEntry) => TKey;

function groupBy<TEntry, TKey extends string | number>(
  entries: readonly TEntry[],
  keySelector: KeySelector<TEntry, TKey>,
): ReadonlyMap<TKey, readonly TEntry[]> {
  const grouped = new Map<TKey, TEntry[]>();
  for (const entry of entries) {
    const key = keySelector(entry);
    const bucket = grouped.get(key);
    if (bucket === undefined) {
      grouped.set(key, [entry]);
      continue;
    }
    bucket.push(entry);
  }

  return new Map(
    [...grouped.entries()].map(([key, bucket]) => [key, Object.freeze([...bucket])]),
  );
}

function indexBy<TEntry, TKey extends string | number>(
  entries: readonly TEntry[],
  keySelector: KeySelector<TEntry, TKey>,
  label: string,
): ReadonlyMap<TKey, TEntry> {
  const indexed = new Map<TKey, TEntry>();
  for (const entry of entries) {
    const key = keySelector(entry);
    if (indexed.has(key)) {
      throw new Error(`Duplicate ${label} key "${String(key)}".`);
    }
    indexed.set(key, entry);
  }
  return indexed;
}

function mergeUnique<TEntry, TKey extends string | number>(
  baseEntries: readonly TEntry[],
  extraEntries: readonly TEntry[],
  keySelector: KeySelector<TEntry, TKey>,
  label: string,
): readonly TEntry[] {
  const merged = [...baseEntries];
  const seen = new Set(baseEntries.map((entry) => keySelector(entry)));
  for (const entry of extraEntries) {
    const key = keySelector(entry);
    if (seen.has(key)) {
      throw new Error(`Extension attempted to override existing ${label} "${String(key)}".`);
    }
    seen.add(key);
    merged.push(entry);
  }
  return Object.freeze(merged);
}

function applyExtensions<TEntry, TKey extends string | number>(
  baseEntries: readonly TEntry[],
  extensions: readonly SubjectModelExtension[],
  extensionSelector: (extension: SubjectModelExtension) => readonly TEntry[] | undefined,
  keySelector: KeySelector<TEntry, TKey>,
  label: string,
): readonly TEntry[] {
  let current = Object.freeze([...baseEntries]) as readonly TEntry[];
  for (const extension of extensions) {
    current = mergeUnique(current, extensionSelector(extension) ?? [], keySelector, label);
  }
  return current;
}

function groupClaimFamiliesByEvaluatorGroup(
  claimFamilies: SubjectModelRegistry["claimFamilies"],
): ReadonlyMap<EvaluatorGroupId, readonly SubjectModelRegistry["claimFamilies"][number][]> {
  const grouped = new Map<EvaluatorGroupId, SubjectModelRegistry["claimFamilies"][number][]>();
  for (const family of claimFamilies) {
    for (const group of family.producingEvaluatorGroups) {
      const bucket = grouped.get(group);
      if (bucket === undefined) {
        grouped.set(group, [family]);
        continue;
      }
      bucket.push(family);
    }
  }

  return new Map(
    [...grouped.entries()].map(([key, bucket]) => [key, Object.freeze([...bucket])]),
  );
}

function buildRegistry(extensions: readonly SubjectModelExtension[]): SubjectModelRegistry {
  const claimFamilies = applyExtensions<ClaimFamilyDefinition, string>(
    CLAIM_FAMILY_DEFINITIONS,
    extensions,
    (extension) => extension.claimFamilies,
    (entry) => entry.familyId,
    "claim family",
  );
  const resourceKinds = applyExtensions<ResourceKindDefinition, ResourceKindDefinition["kind"]>(
    RESOURCE_KIND_DEFINITIONS,
    extensions,
    (extension) => extension.resourceKinds,
    (entry) => entry.kind,
    "resource kind",
  );
  const fieldSchemas = applyExtensions<FieldSchemaDefinition, string>(
    FIELD_SCHEMA_DEFINITIONS,
    extensions,
    (extension) => extension.fieldSchemas,
    (entry) => entry.schemaId,
    "field schema",
  );
  const traitSchemas = applyExtensions<TraitSchemaDefinition, TraitSchemaDefinition["traitKind"]>(
    TRAIT_SCHEMA_DEFINITIONS,
    extensions,
    (extension) => extension.traitSchemas,
    (entry) => entry.traitKind,
    "trait schema",
  );
  const governedFamilies = applyExtensions<GovernedFamilyDefinition, string>(
    GOVERNED_FAMILY_DEFINITIONS,
    extensions,
    (extension) => extension.governedFamilies,
    (entry) => entry.familyId,
    "governed family",
  );
  const declarationSurfaces = applyExtensions<DeclarationSurfaceDefinition, string>(
    DECLARATION_SURFACE_DEFINITIONS,
    extensions,
    (extension) => extension.declarationSurfaces,
    (entry) => entry.surfaceId,
    "declaration surface",
  );
  const vocabularies = applyExtensions<VocabularyCatalogDefinition, string>(
    SUBJECT_MODEL_VOCABULARIES,
    extensions,
    (extension) => extension.vocabularies,
    (entry) => entry.catalogId,
    "vocabulary catalog",
  );
  const grammarShapes = applyExtensions<GrammarShapeDefinition, string>(
    GRAMMAR_SHAPE_DEFINITIONS,
    extensions,
    (extension) => extension.grammarShapes,
    (entry) => entry.classificationFamilyId,
    "grammar shape",
  );
  const positionFamilies = applyExtensions<PositionFamilyDefinition, PositionFamilyDefinition["family"]>(
    POSITION_FAMILY_DEFINITIONS,
    extensions,
    (extension) => extension.positionFamilies,
    (entry) => entry.family,
    "position family",
  );
  const witnessFamilies = applyExtensions<WitnessFamilyDefinition, WitnessFamilyDefinition["family"]>(
    WITNESS_FAMILY_DEFINITIONS,
    extensions,
    (extension) => extension.witnessFamilies,
    (entry) => entry.family,
    "witness family",
  );
  const scopeFamilies = applyExtensions<ScopeFamilyDefinition, ScopeFamilyDefinition["scopeId"]>(
    SCOPE_FAMILY_DEFINITIONS,
    extensions,
    (extension) => extension.scopeFamilies,
    (entry) => entry.scopeId,
    "scope family",
  );
  const closureContracts = applyExtensions<ClosureContractDefinition, string>(
    CLOSURE_CONTRACT_DEFINITIONS,
    extensions,
    (extension) => extension.closureContracts,
    (entry) => entry.contractId,
    "closure contract",
  );

  return {
    claimFamilies,
    claimFamiliesById: indexBy(claimFamilies, (entry) => entry.familyId, "claim family"),
    claimFamiliesByNodeKind: groupBy(claimFamilies, (entry) => entry.nodeKind),
    claimFamiliesByEvaluatorGroup: groupClaimFamiliesByEvaluatorGroup(claimFamilies),
    claimFamiliesByCategory: groupBy(claimFamilies, (entry) => entry.category),
    resourceKinds,
    resourceKindsByKind: indexBy(resourceKinds, (entry) => entry.kind, "resource kind"),
    fieldSchemas,
    fieldSchemasById: indexBy(fieldSchemas, (entry) => entry.schemaId, "field schema"),
    fieldSchemasByResourceKind: groupBy(fieldSchemas, (entry) => entry.resourceKind),
    traitSchemas,
    traitSchemasByKind: indexBy(traitSchemas, (entry) => entry.traitKind, "trait schema"),
    governedFamilies,
    governedFamiliesById: indexBy(governedFamilies, (entry) => entry.familyId, "governed family"),
    declarationSurfaces,
    declarationSurfacesById: indexBy(
      declarationSurfaces,
      (entry) => entry.surfaceId,
      "declaration surface",
    ),
    vocabularies,
    vocabulariesById: indexBy(vocabularies, (entry) => entry.catalogId, "vocabulary catalog"),
    grammarShapes,
    grammarShapesByClassificationFamilyId: indexBy(
      grammarShapes,
      (entry) => entry.classificationFamilyId,
      "grammar shape",
    ),
    positionFamilies,
    positionFamiliesByFamily: indexBy(positionFamilies, (entry) => entry.family, "position family"),
    witnessFamilies,
    witnessFamiliesByFamily: indexBy(witnessFamilies, (entry) => entry.family, "witness family"),
    scopeFamilies,
    scopeFamiliesById: indexBy(scopeFamilies, (entry) => entry.scopeId, "scope family"),
    closureContracts,
    closureContractsById: indexBy(closureContracts, (entry) => entry.contractId, "closure contract"),
    extensions: Object.freeze([...extensions]),
    extensionFamilies: Object.freeze(extensions.map((extension) => extension.extensionId)),
  };
}

export function createSubjectModelRegistry(
  extensions: readonly SubjectModelExtension[] = [],
): SubjectModelRegistry {
  return buildRegistry(extensions);
}

export function registerSubjectModelExtension(
  registry: SubjectModelRegistry,
  extension: SubjectModelExtension,
): SubjectModelRegistry {
  return buildRegistry([...registry.extensions, extension]);
}

export const SUBJECT_MODEL_REGISTRY = createSubjectModelRegistry();
