import type ts from 'typescript';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import { normalizeConfigurationSourceFileName } from '../configuration/source-file-names.js';
import { StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import type { EvaluatedProjectSource } from '../evaluation/project-evaluation.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { AddressHandle } from '../kernel/handles.js';
import { AuthoredSourceTextCache } from '../kernel/authored-source-text.js';
import {
  KernelStoreBatch,
  type KernelStore,
} from '../kernel/store.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  type ConfigurationOptionContributionObservation,
  type ConfigurationSequenceObservation,
} from '../configuration/configuration-observation.js';
import { I18nTranslationKey } from './model.js';
import { I18nProductDetails } from './product-details.js';
import {
  i18nTranslationKeyProductEmission,
  type I18nTranslationKeyProductSeed,
} from './translation-key-product-records.js';

interface TranslationKeyPath {
  readonly key: string;
  readonly sourceNode: ts.Node;
}

/** Translation-key catalog materialized from static I18nConfiguration init resources. */
export class I18nTranslationCatalogProjectResult {
  constructor(
    readonly configuration: ConfigurationRecognitionProjectResult,
    readonly translationKeys: readonly I18nTranslationKey[],
  ) {}

  readTranslationKeys(): readonly I18nTranslationKey[] {
    return this.translationKeys;
  }
}

/** Read static i18n resource object values into translation-key products for analysis. */
export class I18nTranslationCatalogMaterializationProjectPass {
  private readonly sourceTextCache = new AuthoredSourceTextCache('');

  materializeAndEmit(
    store: KernelStore,
    configuration: ConfigurationRecognitionProjectResult,
  ): I18nTranslationCatalogProjectResult {
    const seeds = uniqueTranslationKeySeeds(readTranslationKeySeeds(configuration));
    const emissions = seeds.map((seed, index) =>
      i18nTranslationKeyProductEmission(store, configuration.project.projectKey, seed, index, this.sourceTextCache)
    );
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `i18n-translation-catalog:${configuration.project.projectKey}`));
    }
    for (const emission of emissions) {
      store.productDetails.add(I18nProductDetails.TranslationKey, emission.key.productHandle, emission.key);
    }
    return new I18nTranslationCatalogProjectResult(
      configuration,
      emissions.map((emission) => emission.key),
    );
  }
}

function readTranslationKeySeeds(
  configuration: ConfigurationRecognitionProjectResult,
): readonly I18nTranslationKeyProductSeed[] {
  const sourceFileAddressHandles = sourceFileAddressHandlesByFileName(configuration);
  const evaluatedSources = evaluatedSourcesByAdmission(configuration);
  const seeds = configuration.sources.flatMap((source) =>
    translationKeySeedsForSource(source, evaluatedSources)
  );

  return seeds.map((seed) => ({
    ...seed,
    sourceFileAddressHandle: sourceFileAddressHandles.get(normalizeConfigurationSourceFileName(seed.sourceFile.fileName))
      ?? seed.sourceFileAddressHandle,
  }));
}

function translationKeySeedsForSource(
  source: ConfigurationRecognitionProjectResult['sources'][number],
  evaluatedSources: ReadonlyMap<AddressHandle, EvaluatedProjectSource>,
): readonly I18nTranslationKeyProductSeed[] {
  const evaluated = evaluatedSources.get(source.admission.addressHandle);
  if (evaluated == null) {
    return [];
  }
  const reader = new StaticEvaluationExpressionReader(
    evaluated.evaluation.environment,
    evaluated.moduleKey,
    evaluated.evaluation.policy,
    evaluated.evaluation.runtimeHost,
  );
  return optionContributions(source.observations).flatMap((contribution) =>
    translationKeySeedsForOptionContribution(source, evaluated, reader, contribution)
  );
}

function translationKeySeedsForOptionContribution(
  source: ConfigurationRecognitionProjectResult['sources'][number],
  evaluated: EvaluatedProjectSource,
  reader: StaticEvaluationExpressionReader,
  contribution: ConfigurationOptionContributionObservation,
): readonly I18nTranslationKeyProductSeed[] {
  if (contribution.configurationKind !== FrameworkRegistrationKind.I18nConfiguration) {
    return [];
  }
  const valueExpression = contribution.value.node;
  if (valueExpression == null) {
    return [];
  }
  const value = reader.evaluateExpression(valueExpression).value;
  return value == null
    ? []
    : translationKeySeedsForContribution(
      value,
      contribution.optionPath,
      evaluated.sourceFile,
      source.admission.addressHandle,
      contribution.value.node ?? contribution.sourceNode,
    );
}

function evaluatedSourcesByAdmission(
  configuration: ConfigurationRecognitionProjectResult,
): ReadonlyMap<AddressHandle, EvaluatedProjectSource> {
  const sources = new Map<AddressHandle, EvaluatedProjectSource>();
  for (const source of configuration.evaluation.sources) {
    if (source.sourceFile == null || source.evaluation == null) {
      continue;
    }
    sources.set(source.admission.addressHandle, source as EvaluatedProjectSource);
  }
  return sources;
}

function optionContributions(
  observations: readonly ConfigurationSequenceObservation[],
): readonly ConfigurationOptionContributionObservation[] {
  return observations.flatMap((sequence) =>
    sequence.steps.flatMap((step) => step.optionContributions)
  );
}

function translationKeySeedsForContribution(
  value: EvaluationValue,
  optionPath: readonly string[],
  sourceFile: ts.SourceFile,
  sourceFileAddressHandle: AddressHandle,
  sourceNode: ts.Node,
): readonly I18nTranslationKeyProductSeed[] {
  if (optionPath[0] !== 'initOptions') {
    return [];
  }
  if (optionPath.length === 1) {
    const resources = objectPropertyValue(value, 'resources');
    return resources == null
      ? []
      : translationKeySeedsFromResources(resources, [], sourceFile, sourceFileAddressHandle, sourceNode);
  }
  if (optionPath[1] !== 'resources') {
    return [];
  }
  return translationKeySeedsFromResources(
    value,
    optionPath.slice(2),
    sourceFile,
    sourceFileAddressHandle,
    sourceNode,
  );
}

function translationKeySeedsFromResources(
  value: EvaluationValue,
  resourcePath: readonly string[],
  sourceFile: ts.SourceFile,
  sourceFileAddressHandle: AddressHandle,
  sourceNode: ts.Node,
): readonly I18nTranslationKeyProductSeed[] {
  if (resourcePath.length >= 2) {
    return translationKeySeedsFromNamespace(
      value,
      resourcePath[0] ?? null,
      resourcePath[1] ?? null,
      resourcePath.slice(2),
      sourceFile,
      sourceFileAddressHandle,
      sourceNode,
    );
  }
  if (value.kind !== EvaluationValueKind.Object) {
    return [];
  }
  if (resourcePath.length === 1) {
    return [...value.properties.entries()].flatMap(([namespace, property]) =>
      translationKeySeedsFromNamespace(
        property.value,
        resourcePath[0] ?? null,
        namespace,
        [],
        sourceFile,
        sourceFileAddressHandle,
        sourceNode,
      )
    );
  }
  return [...value.properties.entries()].flatMap(([locale, property]) =>
    translationKeySeedsFromResources(
      property.value,
      [locale],
      sourceFile,
      sourceFileAddressHandle,
      sourceNode,
    )
  );
}

function translationKeySeedsFromNamespace(
  value: EvaluationValue,
  locale: string | null,
  namespace: string | null,
  keyPrefix: readonly string[],
  sourceFile: ts.SourceFile,
  sourceFileAddressHandle: AddressHandle,
  sourceNode: ts.Node,
): readonly I18nTranslationKeyProductSeed[] {
  return translationKeyPaths(value, keyPrefix, sourceNode).map((path) => ({
    key: path.key,
    locale,
    namespace,
    sourceFile: path.sourceNode.getSourceFile() ?? sourceFile,
    sourceFileAddressHandle,
    sourceNode: path.sourceNode,
  }));
}

function translationKeyPaths(
  value: EvaluationValue,
  prefix: readonly string[] = [],
  sourceNode: ts.Node | null = null,
): readonly TranslationKeyPath[] {
  if (value.kind !== EvaluationValueKind.Object) {
    return prefix.length === 0 || sourceNode == null
      ? []
      : [{ key: prefix.join('.'), sourceNode }];
  }
  if (value.mayHaveUnknownProperties) {
    const node = value.node ?? sourceNode;
    return prefix.length === 0 || node == null
      ? []
      : [{ key: prefix.join('.'), sourceNode: node }];
  }
  return [...value.properties.entries()].flatMap(([name, property]) =>
    translationKeyPaths(property.value, [...prefix, name], property.node)
  );
}

function objectPropertyValue(
  value: EvaluationValue,
  propertyName: string,
): EvaluationValue | null {
  return value.kind === EvaluationValueKind.Object
    ? value.properties.get(propertyName)?.value ?? null
    : null;
}

function uniqueTranslationKeySeeds(
  seeds: readonly I18nTranslationKeyProductSeed[],
): readonly I18nTranslationKeyProductSeed[] {
  const seen = new Set<string>();
  const unique: I18nTranslationKeyProductSeed[] = [];
  for (const seed of seeds) {
    const key = `${seed.locale ?? ''}\0${seed.namespace ?? ''}\0${seed.key}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(seed);
  }
  return unique.sort((left, right) =>
    (left.locale ?? '').localeCompare(right.locale ?? '')
    || (left.namespace ?? '').localeCompare(right.namespace ?? '')
    || left.key.localeCompare(right.key)
  );
}

function sourceFileAddressHandlesByFileName(
  configuration: ConfigurationRecognitionProjectResult,
): ReadonlyMap<string, AddressHandle> {
  const handles = new Map<string, AddressHandle>();
  for (const source of configuration.evaluation.sources) {
    if (source.sourceFile == null) {
      continue;
    }
    handles.set(normalizeConfigurationSourceFileName(source.sourceFile.fileName), source.admission.addressHandle);
  }
  return handles;
}
