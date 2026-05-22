import { uniqueValues } from '../collections.js';
import type { AuthoringRecipeKey } from '../authoring/recipe.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  pluralizeLastSourceNameWord,
  singularizeSourceNameWord,
  sourceNameWords,
  titleSourceName,
} from '../authoring/source-name.js';
import {
  guidanceFeatureSignals,
  guidanceRecipeSpecializationSignalKeysByRecipe,
} from './authoring-guidance-catalog.js';
import type {
  SemanticAuthoringGuidanceFeatureSignalRow,
  SemanticAuthoringGuidanceRecipePlanRow,
  SemanticAuthoringSourceParameterValueInput,
} from './contracts.js';

const MAX_GUIDANCE_RECIPE_PLAN_SEQUENCE_ROWS = 5;

export function featureGoalSignalsForGoal(
  featureGoal: string,
): readonly SemanticAuthoringGuidanceFeatureSignalRow[] {
  const featureGoalTokens = featureGoalSignalTokens(featureGoal);
  const hasSectionedNavigationSignal = featureGoalHasSectionedNavigationSignal(featureGoalTokens);
  return guidanceFeatureSignals
    .map((signal): SemanticAuthoringGuidanceFeatureSignalRow | null => {
      // Keep this deterministic: exact token sequences plus authored token conjunctions, not fuzzy ranking.
      const matchedTerms = [
        ...signal.terms.filter((term) => featureGoalHasSignalTerm(featureGoalTokens, term)),
        ...(signal.tokenCombos ?? [])
          .filter((combo) => combo.tokens.every((token) => featureGoalTokens.includes(token)))
          .map((combo) => combo.label),
      ];
      if (signal.key === 'catalog-product' && catalogProductSignalIsAdminTableNoise(featureGoalTokens, matchedTerms)) {
        return null;
      }
      if (signal.key === 'state-plugin' && statePluginSignalIsOptional(featureGoalTokens)) {
        return null;
      }
      if (
        signal.key === 'form-entry'
        && hasSectionedNavigationSignal
        && formEntrySignalIsOnlySectionNavigationLabels(featureGoalTokens)
      ) {
        return null;
      }
      return matchedTerms.length === 0
        ? null
        : {
          key: signal.key,
          planningLayer: signal.planningLayer,
          matchedTerms: uniqueValues(matchedTerms),
          primaryWeight: signal.primaryWeight,
          recipeKeys: signal.recipeKeys,
        };
    })
    .filter((signal): signal is SemanticAuthoringGuidanceFeatureSignalRow => signal != null);
}

export function rankRecipeKeysForFeatureGoal(
  recipeKeys: readonly AuthoringRecipeKey[],
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): readonly AuthoringRecipeKey[] {
  if (recipeKeys.length < 2 || featureGoalSignals.length === 0) {
    return recipeKeys;
  }
  return recipeKeys
    .map((recipeKey, index) => guidanceRecipeCoverageRow(recipeKey, index, featureGoalSignals))
    .sort(compareFeatureGoalRecipeCoverage)
    .map((row) => row.recipeKey);
}

export function guidanceRecipePlanSequence(
  candidateRecipeKeys: readonly AuthoringRecipeKey[],
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  featureGoal: string | null = null,
): readonly SemanticAuthoringGuidanceRecipePlanRow[] {
  if (featureGoalSignals.length === 0 || candidateRecipeKeys.length === 0) {
    return [];
  }
  const coverageRows = candidateRecipeKeys
    .map((recipeKey, index) => guidanceRecipeCoverageRow(recipeKey, index, featureGoalSignals))
    .filter((row) => row.coveredFeatureSignals.length > 0);
  if (coverageRows.length === 0) {
    return [];
  }

  const primary = coverageRows
    .slice()
    .sort(comparePrimaryRecipeCoverage)[0];
  if (primary == null) {
    return [];
  }

  const selectedRows = [guidanceRecipePlanRow(primary, 'primary', primary.coveredFeatureSignals, featureGoalSignals, featureGoal)];
  const covered = new Set(primary.coveredFeatureSignals);
  for (const row of coverageRows
    .filter((candidate) => candidate.recipeKey !== primary.recipeKey)
    .sort((left, right) => compareCompanionRecipeCoverage(left, right, covered))
  ) {
    const newCoverage = row.coveredFeatureSignals.filter((signalKey) => !covered.has(signalKey));
    if (newCoverage.length === 0) {
      continue;
    }
    selectedRows.push(guidanceRecipePlanRow(row, 'companion', newCoverage, featureGoalSignals, featureGoal));
    for (const signalKey of row.coveredFeatureSignals) {
      covered.add(signalKey);
    }
    if (covered.size >= featureGoalSignals.length || selectedRows.length >= MAX_GUIDANCE_RECIPE_PLAN_SEQUENCE_ROWS) {
      break;
    }
  }

  return guidanceRecipePlanSequenceWithRepeatedFeatureSurfaces(selectedRows, featureGoal, featureGoalSignals);
}

export function featureGoalComparisonRecipeKeys(
  candidateRecipeKeys: readonly AuthoringRecipeKey[],
  plannedRecipeKeys: readonly AuthoringRecipeKey[],
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): readonly AuthoringRecipeKey[] {
  if (featureGoalSignals.length === 0) {
    return candidateRecipeKeys;
  }
  // The plan sequence is the source choreography; comparison rows are context. Keep context relevant and small
  // by allowing only recipes that cover requested signals without adding unrequested feature specializations.
  const relevantUnspecializedRecipeKeys = candidateRecipeKeys
    .map((recipeKey, index) => guidanceRecipeCoverageRow(recipeKey, index, featureGoalSignals))
    .filter((row) =>
      row.coveredFeatureSignals.length > 0
      && row.unrequestedSpecializationCount === 0
    )
    .map((row) => row.recipeKey);
  return uniqueValues([
    ...plannedRecipeKeys,
    ...relevantUnspecializedRecipeKeys,
  ]);
}

function featureGoalHasSignalTerm(
  featureGoalTokens: readonly string[],
  term: string,
): boolean {
  const termTokens = featureGoalSignalTokens(term);
  if (termTokens.length === 0 || termTokens.length > featureGoalTokens.length) {
    return false;
  }
  for (let index = 0; index <= featureGoalTokens.length - termTokens.length; index += 1) {
    if (termTokens.every((termToken, termIndex) => featureGoalTokens[index + termIndex] === termToken)) {
      return true;
    }
  }
  return false;
}

function featureGoalSignalTokens(
  text: string,
): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[@/_-]+/gu, ' ')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
}

function featureGoalHasSectionedNavigationSignal(
  featureGoalTokens: readonly string[],
): boolean {
  const sectionedSignal = guidanceFeatureSignals.find((signal) => signal.key === 'sectioned-navigation');
  if (sectionedSignal == null) {
    return false;
  }
  return sectionedSignal.terms.some((term) => featureGoalHasSignalTerm(featureGoalTokens, term))
    || (sectionedSignal.tokenCombos ?? []).some((combo) => combo.tokens.every((token) => featureGoalTokens.includes(token)));
}

function formEntrySignalIsOnlySectionNavigationLabels(
  featureGoalTokens: readonly string[],
): boolean {
  const explicitFormEntryTokens = new Set([
    'checkbox',
    'checkboxes',
    'create',
    'dropdown',
    'dropdowns',
    'edit',
    'editable',
    'editing',
    'editor',
    'field',
    'fields',
    'form',
    'forms',
    'input',
    'inputs',
    'password',
    'radio',
    'registration',
    'save',
    'saving',
    'select',
    'submit',
    'submission',
    'switch',
    'switches',
    'toggle',
    'toggles',
    'validated',
    'validation',
  ]);
  return !featureGoalTokens.some((token) => explicitFormEntryTokens.has(token));
}

interface GuidanceRecipeCoverageRow {
  readonly recipeKey: AuthoringRecipeKey;
  readonly candidateIndex: number;
  readonly coveredFeatureSignals: readonly string[];
  readonly uncoveredFeatureSignals: readonly string[];
  readonly featureSurfaceCount: number;
  readonly featureSurfaceWeight: number;
  readonly architectureChoiceCount: number;
  readonly navigationFrameCount: number;
  readonly frameworkCapabilityCount: number;
  readonly integrationBoundaryCount: number;
  readonly appShellCount: number;
  readonly coveredSignalWeight: number;
  readonly primaryWeight: number;
  readonly unrequestedSpecializationCount: number;
}

function compareFeatureGoalRecipeCoverage(
  left: GuidanceRecipeCoverageRow,
  right: GuidanceRecipeCoverageRow,
): number {
  const leftHasCoverage = left.coveredFeatureSignals.length > 0;
  const rightHasCoverage = right.coveredFeatureSignals.length > 0;
  if (leftHasCoverage !== rightHasCoverage) {
    return leftHasCoverage ? -1 : 1;
  }
  return left.unrequestedSpecializationCount - right.unrequestedSpecializationCount
    || right.architectureChoiceCount - left.architectureChoiceCount
    || right.featureSurfaceCount - left.featureSurfaceCount
    // Keep the main app surface ahead of framework capability bundles that happen to cover more total signals.
    || right.featureSurfaceWeight - left.featureSurfaceWeight
    || right.navigationFrameCount - left.navigationFrameCount
    || right.coveredSignalWeight - left.coveredSignalWeight
    || right.primaryWeight - left.primaryWeight
    || right.coveredFeatureSignals.length - left.coveredFeatureSignals.length
    || right.integrationBoundaryCount - left.integrationBoundaryCount
    || right.frameworkCapabilityCount - left.frameworkCapabilityCount
    || right.appShellCount - left.appShellCount
    || left.candidateIndex - right.candidateIndex;
}

function guidanceRecipeCoverageRow(
  recipeKey: AuthoringRecipeKey,
  candidateIndex: number,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): GuidanceRecipeCoverageRow {
  const coveredSignals = featureGoalSignals.filter((signal) => signal.recipeKeys.includes(recipeKey));
  const coveredFeatureSignals = coveredSignals.map((signal) => signal.key);
  const requestedSignals = new Set(featureGoalSignals.map((signal) => signal.key));
  const specializationSignals = guidanceRecipeSpecializationSignalKeysByRecipe[recipeKey] ?? [];
  return {
    recipeKey,
    candidateIndex,
    coveredFeatureSignals,
    uncoveredFeatureSignals: featureGoalSignals
      .filter((signal) => !coveredFeatureSignals.includes(signal.key))
      .map((signal) => signal.key),
    featureSurfaceCount: coveredSignals.filter((signal) => signal.planningLayer === 'feature-surface').length,
    featureSurfaceWeight: coveredSignals
      .filter((signal) => signal.planningLayer === 'feature-surface')
      .reduce((total, signal) => total + signal.primaryWeight, 0),
    architectureChoiceCount: coveredSignals.filter((signal) => signal.planningLayer === 'architecture-choice').length,
    navigationFrameCount: coveredSignals.filter((signal) => signal.planningLayer === 'navigation-frame').length,
    frameworkCapabilityCount: coveredSignals.filter((signal) => signal.planningLayer === 'framework-capability').length,
    integrationBoundaryCount: coveredSignals.filter((signal) => signal.planningLayer === 'integration-boundary').length,
    appShellCount: coveredSignals.filter((signal) => signal.planningLayer === 'app-shell').length,
    coveredSignalWeight: coveredSignals.reduce((total, signal) => total + signal.primaryWeight, 0),
    primaryWeight: Math.max(0, ...coveredSignals.map((signal) => signal.primaryWeight)),
    unrequestedSpecializationCount: specializationSignals
      .filter((signalKey) => !featureSignalIsRequestedOrImplied(signalKey, requestedSignals))
      .length,
  };
}

function featureSignalIsRequestedOrImplied(
  signalKey: string,
  requestedSignals: ReadonlySet<string>,
): boolean {
  return requestedSignals.has(signalKey)
    || (signalKey === 'routing' && requestedSignals.has('sectioned-navigation'))
    || (signalKey === 'service-boundary' && requestedSignals.has('service-write-boundary'))
    || (signalKey === 'service-write-boundary' && requestedSignals.has('service-boundary'));
}

function comparePrimaryRecipeCoverage(
  left: GuidanceRecipeCoverageRow,
  right: GuidanceRecipeCoverageRow,
): number {
  return compareFeatureGoalRecipeCoverage(left, right);
}

function compareCompanionRecipeCoverage(
  left: GuidanceRecipeCoverageRow,
  right: GuidanceRecipeCoverageRow,
  alreadyCovered: ReadonlySet<string>,
): number {
  const leftNewCoverage = left.coveredFeatureSignals.filter((signalKey) => !alreadyCovered.has(signalKey)).length;
  const rightNewCoverage = right.coveredFeatureSignals.filter((signalKey) => !alreadyCovered.has(signalKey)).length;
  return rightNewCoverage - leftNewCoverage
    || left.unrequestedSpecializationCount - right.unrequestedSpecializationCount
    || right.architectureChoiceCount - left.architectureChoiceCount
    || right.featureSurfaceCount - left.featureSurfaceCount
    // Companion selection uses the same surface-first bias as primary selection.
    || right.featureSurfaceWeight - left.featureSurfaceWeight
    || right.navigationFrameCount - left.navigationFrameCount
    || right.coveredSignalWeight - left.coveredSignalWeight
    || right.primaryWeight - left.primaryWeight
    || right.integrationBoundaryCount - left.integrationBoundaryCount
    || right.frameworkCapabilityCount - left.frameworkCapabilityCount
    || right.coveredFeatureSignals.length - left.coveredFeatureSignals.length
    || left.candidateIndex - right.candidateIndex;
}

function guidanceRecipePlanRow(
  row: GuidanceRecipeCoverageRow,
  role: SemanticAuthoringGuidanceRecipePlanRow['role'],
  newFeatureSignals: readonly string[],
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  featureGoal: string | null,
): SemanticAuthoringGuidanceRecipePlanRow {
  const ownsNavigation = recipePlanRowOwnsNavigation(newFeatureSignals, featureGoalSignals);
  const suggestedSourceParameterValues = suggestedSourceParameterValuesForRecipe(
    row.recipeKey,
    featureGoal,
    ownsNavigation,
  );
  const recipeKey = recipePlanRowRecipeKey(
    row.recipeKey,
    role,
    ownsNavigation,
    suggestedSourceParameterValues,
  );
  return {
    recipeKey,
    role,
    instanceLabel: null,
    usage: role === 'primary' ? 'source-plan-start' : 'pattern-reference',
    suggestedSourceParameterValues,
    suggestedSourceParameterContracts: [],
    newFeatureSignals,
    coveredFeatureSignals: recipeKey === row.recipeKey ? row.coveredFeatureSignals : newFeatureSignals,
    uncoveredFeatureSignals: row.uncoveredFeatureSignals,
    reason: guidanceRecipePlanReason(role, newFeatureSignals, featureGoalSignals),
    followUpSurface: 'authoring-recipe-plan',
  };
}

function recipePlanRowRecipeKey(
  recipeKey: AuthoringRecipeKey,
  role: SemanticAuthoringGuidanceRecipePlanRow['role'],
  ownsNavigation: boolean,
  suggestedSourceParameterValues: readonly SemanticAuthoringSourceParameterValueInput[],
): AuthoringRecipeKey {
  if (
    role !== 'companion'
    || ownsNavigation
    || sourceParameterValuesIncludeAny(suggestedSourceParameterValues, ['request-route-parameter', 'request-selection-id'])
  ) {
    return recipeKey;
  }
  return nonRoutedCompanionFormRecipeKey(recipeKey) ?? recipeKey;
}

function nonRoutedCompanionFormRecipeKey(
  recipeKey: AuthoringRecipeKey,
): AuthoringRecipeKey | null {
  switch (recipeKey) {
    case 'routed-state-backed-form':
      return 'state-backed-form';
    case 'routed-validated-state-backed-form':
      return 'validated-state-backed-form';
    case 'routed-service-backed-form':
      return 'service-backed-form';
    case 'routed-localized-validated-state-backed-form':
      return 'localized-validated-state-backed-form';
    default:
      return null;
  }
}

function sourceParameterValuesIncludeAny(
  values: readonly SemanticAuthoringSourceParameterValueInput[],
  keys: readonly string[],
): boolean {
  return values.some((value) => keys.includes(value.key));
}

function guidanceRecipePlanSequenceWithRepeatedFeatureSurfaces(
  sequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
  featureGoal: string | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): readonly SemanticAuthoringGuidanceRecipePlanRow[] {
  if (
    featureGoal == null
    || sequence.length >= MAX_GUIDANCE_RECIPE_PLAN_SEQUENCE_ROWS
    || !featureGoalSignals.some((signal) => signal.key === 'searchable-list')
    || !sequence.some((row) => row.recipeKey === 'searchable-data-table' || row.recipeKey === 'routed-searchable-data-table')
  ) {
    return sequence;
  }
  const collectionDomains = inferCollectionFeatureGoalDomains(featureGoal);
  if (collectionDomains.length <= 1) {
    return sequence;
  }
  const existingTableEntityKeys = new Set(sequence
    .filter((row) => row.recipeKey === 'searchable-data-table' || row.recipeKey === 'routed-searchable-data-table')
    .flatMap((row) => row.suggestedSourceParameterValues)
    .filter((value) => value.key === 'table-entity')
    .map((value) => featureGoalDomainKey(value.value)));
  const repeatedCollectionRows = collectionDomains
    .filter((domain) => !existingTableEntityKeys.has(featureGoalDomainKey(domain.entityTitle)))
    .map((domain) => repeatedSearchableListRecipePlanRow(domain, featureGoalSignals));
  if (repeatedCollectionRows.length === 0) {
    return sequence;
  }
  return [
    ...sequence,
    ...repeatedCollectionRows,
  ].slice(0, MAX_GUIDANCE_RECIPE_PLAN_SEQUENCE_ROWS);
}

function repeatedSearchableListRecipePlanRow(
  domain: FeatureGoalDomainSuggestion,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): SemanticAuthoringGuidanceRecipePlanRow {
  const searchableSignal = featureGoalSignals.find((signal) => signal.key === 'searchable-list');
  return {
    recipeKey: 'searchable-data-table',
    role: 'companion',
    instanceLabel: domain.entityTitle,
    usage: 'pattern-reference',
    suggestedSourceParameterValues: [
      sourceParameterValue('table-entity', domain.entityTitle),
      sourceParameterValue('table-collection', domain.collectionLowerCamel),
    ],
    suggestedSourceParameterContracts: [],
    newFeatureSignals: ['searchable-list'],
    coveredFeatureSignals: ['searchable-list'],
    uncoveredFeatureSignals: featureGoalSignals
      .filter((signal) => signal.key !== 'searchable-list')
      .map((signal) => signal.key),
    reason: searchableSignal == null
      ? `Use as an additional ${domain.entityTitle} collection pattern; merge relevant steps instead of applying a second full scaffold.`
      : `Use as an additional ${domain.entityTitle} collection pattern for ${searchableSignal.planningLayer}: searchable-list; merge relevant steps instead of applying a second full scaffold.`,
    followUpSurface: 'authoring-recipe-plan',
  };
}

function suggestedSourceParameterValuesForRecipe(
  recipeKey: AuthoringRecipeKey,
  featureGoal: string | null,
  ownsNavigation: boolean,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  if (recipeKey === 'routed-app-shell') {
    return routedAppShellSourceParameterValues(featureGoal);
  }
  const genericDomain = inferFeatureGoalDomain(featureGoal);
  switch (recipeKey) {
    case 'routed-searchable-data-table': {
      const domain = inferTableFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : routedSearchableTableSourceParameterValues(domain, ownsNavigation, featureGoal);
    }
    case 'searchable-data-table': {
      const domain = inferTableFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : searchableTableSourceParameterValues(domain, featureGoal);
    }
    case 'routed-catalog-storefront': {
      const domain = inferCatalogFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : catalogSourceParameterValues(domain, ownsNavigation, featureGoal);
    }
    case 'catalog-storefront': {
      const domain = inferCatalogFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : catalogSourceParameterValues(domain, false, featureGoal);
    }
    case 'multi-step-state-backed-form':
      return genericDomain == null ? [] : multiStepSourceParameterValues(genericDomain, featureGoal);
    case 'routed-state-backed-form':
    case 'routed-validated-state-backed-form':
    case 'routed-service-backed-form':
    case 'routed-service-validated-state-backed-form':
    case 'routed-localized-validated-state-backed-form':
    {
      const domain = inferRequestFormFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : standardRequestFormSourceParameterValues(domain, ownsNavigation, featureGoal);
    }
    case 'state-store-list': {
      const domain = inferStateStoreFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : stateStoreListSourceParameterValues(domain);
    }
    case 'state-backed-form':
    case 'service-backed-form':
    case 'validated-state-backed-form':
    case 'localized-state-backed-form':
    case 'localized-validated-state-backed-form':
    {
      const domain = inferRequestFormFeatureGoalDomain(featureGoal) ?? genericDomain;
      return domain == null ? [] : standardRequestFormSourceParameterValues(domain, false, featureGoal);
    }
    default:
      return [];
  }
}

function routedSearchableTableSourceParameterValues(
  domain: FeatureGoalDomainSuggestion,
  ownsNavigation: boolean,
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  return [
    ...(ownsNavigation
      ? [
        sourceParameterValue('detail-route-parameter', `${domain.entityLowerCamel}Id`),
        sourceParameterValue('list-route-path', domain.collectionPath),
        sourceParameterValue('list-route-title', domain.collectionTitle),
      ]
      : []),
    ...searchableTableSourceParameterValues(domain, featureGoal),
  ];
}

function searchableTableSourceParameterValues(
  domain: FeatureGoalDomainSuggestion,
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  return [
    sourceParameterValue('table-entity', domain.entityTitle),
    sourceParameterValue('table-collection', domain.collectionLowerCamel),
    ...tableSchemaSourceParameterValues(featureGoal),
  ];
}

function stateStoreListSourceParameterValues(
  domain: FeatureGoalDomainSuggestion,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  return [
    sourceParameterValue('store-item', domain.entityTitle),
    sourceParameterValue('store-collection', domain.collectionLowerCamel),
  ];
}

function inferTableFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  if (featureGoal == null) {
    return null;
  }
  const forClauseDomain = inferForClauseFeatureGoalDomain(featureGoal);
  const collectionDomain = inferCollectionFeatureGoalDomains(featureGoal)[0] ?? null;
  return domainWithForClauseOverride(collectionDomain, forClauseDomain)
    ?? forClauseDomain;
}

function inferStateStoreFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  if (featureGoal == null) {
    return null;
  }
  const forClauseDomain = inferForClauseFeatureGoalDomain(featureGoal);
  if (forClauseDomain != null) {
    return forClauseDomain;
  }
  const tokens = featureGoalSignalTokens(featureGoal);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (!/^(?:todo|todos|task|tasks|item|items|record|records)$/u.test(token)) {
      continue;
    }
    const previous = tokens[index - 1];
    if (
      previous != null
      && !DOMAIN_BOUNDARY_TOKENS.has(previous)
      && !DOMAIN_SURFACE_TOKENS.has(previous)
      && !FOR_CLAUSE_DOMAIN_NOISE_TOKENS.has(previous)
    ) {
      return domainSuggestionFromTokens([previous, token]);
    }
    return domainSuggestionFromTokens([token]);
  }
  return null;
}

function inferCatalogFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  if (featureGoal == null) {
    return null;
  }
  const tokens = featureGoalSignalTokens(featureGoal);
  const specialCatalogDomain = specialCatalogFeatureGoalDomainSuggestion(tokens);
  if (specialCatalogDomain != null) {
    return specialCatalogDomain;
  }
  return inferFeatureGoalDomainWithSurfaceWeights(featureGoal, catalogDomainSurfaceTokenWeight, false);
}

function routedAppShellSourceParameterValues(
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const sectionRoutes = sectionRouteLabelsForFeatureGoal(featureGoal);
  return sectionRoutes.length >= 2
    ? [sourceParameterValue('section-routes', sectionRoutes.join(', '))]
    : [];
}

function recipePlanRowOwnsNavigation(
  newFeatureSignals: readonly string[],
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): boolean {
  return featureGoalSignals.some((signal) =>
    newFeatureSignals.includes(signal.key)
    && signal.planningLayer === 'navigation-frame'
  );
}

function multiStepSourceParameterValues(
  domain: FeatureGoalDomainSuggestion,
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const wizardDomain = inferMultiStepFeatureGoalDomain(featureGoal) ?? domain;
  const steps = wizardStepLabelsForFeatureGoal(featureGoal);
  const sectionFields = wizardSectionFieldSchemaSummary(featureGoal);
  return [
    sourceParameterValue('wizard-entity', wizardDomain.entityTitle),
    ...(steps.length === 0 ? [] : [sourceParameterValue('wizard-steps', steps.join(', '))]),
    ...(sectionFields == null ? [] : [
      sourceParameterValue('wizard-section-fields', sectionFields),
      ...wizardOptionSchemaSourceParameterValues(featureGoal, sectionFields),
    ]),
  ];
}

function inferMultiStepFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  return inferFeatureGoalDomainWithSurfaceWeights(featureGoal, multiStepDomainSurfaceTokenWeight);
}

function inferRequestFormFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  const forClauseDomain = featureGoal == null ? null : inferForClauseFeatureGoalDomain(featureGoal);
  const surfaceDomain = inferFeatureGoalDomainWithSurfaceWeights(featureGoal, requestFormDomainSurfaceTokenWeight);
  const settingsDomain = inferSettingsRequestFormDomain(featureGoal);
  if (requestFormSurfaceDomainShouldYieldToSettings(featureGoal, surfaceDomain, settingsDomain)) {
    return settingsDomain;
  }
  return domainWithForClauseOverride(
    surfaceDomain,
    forClauseDomain,
  )
    ?? inferRequestFormActionFeatureGoalDomain(featureGoal)
    ?? settingsDomain
    ?? forClauseDomain;
}

function requestFormSurfaceDomainShouldYieldToSettings(
  featureGoal: string | null,
  surfaceDomain: FeatureGoalDomainSuggestion | null,
  settingsDomain: FeatureGoalDomainSuggestion | null,
): settingsDomain is FeatureGoalDomainSuggestion {
  if (featureGoal == null || surfaceDomain == null || settingsDomain == null) {
    return false;
  }
  const collectionDomain = inferCollectionFeatureGoalDomains(featureGoal)[0] ?? null;
  return collectionDomain != null
    && featureGoalDomainKey(collectionDomain.entityTitle) === featureGoalDomainKey(surfaceDomain.entityTitle)
    && !featureGoalHasQualifiedSettingsSurface(featureGoal)
    && !featureGoalHasExistingRecordSettingsIntent(featureGoal);
}

function featureGoalHasQualifiedSettingsSurface(
  featureGoal: string,
): boolean {
  const tokens = featureGoalSignalTokens(featureGoal);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token !== 'settings' && token !== 'preferences' && token !== 'preference') {
      continue;
    }
    const previous = tokens[index - 1];
    if (
      previous != null
      && !DOMAIN_BOUNDARY_TOKENS.has(previous)
      && !DOMAIN_SURFACE_TOKENS.has(previous)
    ) {
      return true;
    }
  }
  return false;
}

function featureGoalHasExistingRecordSettingsIntent(
  featureGoal: string,
): boolean {
  const tokens = featureGoalSignalTokens(featureGoal);
  return tokens.some((token) => [
    'account',
    'detail',
    'details',
    'edit',
    'editable',
    'editing',
    'editor',
    'existing',
    'profile',
    'selected',
    'update',
  ].includes(token));
}

function inferSettingsRequestFormDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  if (featureGoal == null || requestFieldSchemaSummary(featureGoal) == null) {
    return null;
  }
  const tokenSet = new Set(featureGoalSignalTokens(featureGoal));
  return tokenSet.has('settings') || tokenSet.has('preferences') || tokenSet.has('preference')
    ? settingsLikeRequestFormDomain(tokenSet)
    : null;
}

function settingsLikeRequestFormDomain(
  tokenSet: ReadonlySet<string>,
): FeatureGoalDomainSuggestion {
  const title = tokenSet.has('preferences') || tokenSet.has('preference')
    ? 'Preferences'
    : 'Settings';
  const sourceName = title.toLowerCase();
  return {
    entityTitle: title,
    entityLowerCamel: sourceName,
    collectionTitle: title,
    collectionLowerCamel: sourceName,
    collectionPath: sourceName,
  };
}

function wizardStepLabelsForFeatureGoal(
  featureGoal: string | null,
): readonly string[] {
  if (featureGoal == null) {
    return [];
  }
  const tokens = new Set(featureGoalSignalTokens(featureGoal));
  const steps: string[] = [];
  for (const [token, label] of [
    ['cart', 'cart'],
    ['profile', 'profile'],
    ['details', 'details'],
    ['shipping', 'shipping'],
    ['billing', 'billing'],
    ['payment', 'payment'],
    ['preferences', 'preferences'],
    ['plan', 'plan'],
    ['review', 'review'],
    ['confirmation', 'confirmation'],
  ] as const) {
    if (tokens.has(token)) {
      steps.push(label);
    }
  }
  return uniqueValues(steps);
}

function wizardSectionFieldSchemaSummary(
  featureGoal: string | null,
): string | null {
  if (featureGoal == null) {
    return null;
  }
  const tokens = new Set(featureGoalSignalTokens(featureGoal));
  const groups: string[] = [];
  if (tokens.has('account') || tokens.has('profile') || tokens.has('details')) {
    groups.push('details: name, email');
  }
  if (tokens.has('shipping')) {
    groups.push('shipping: shipping address');
  }
  if (tokens.has('billing')) {
    groups.push('billing: billing contact');
  }
  if (tokens.has('payment')) {
    groups.push('payment: payment method select');
  }
  if (tokens.has('notification') || tokens.has('notifications')) {
    groups.push('preferences: notification checkboxes');
  }
  if (tokens.has('role') || tokens.has('roles')) {
    groups.push('preferences: role select');
  }
  return groups.length === 0
    ? null
    : uniqueValues(groups).join('; ');
}

function wizardOptionSchemaSourceParameterValues(
  featureGoal: string | null,
  wizardSectionFields: string,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const optionSchema = optionSchemaSummaryForFieldSchema(featureGoal, wizardSectionFields);
  return optionSchema == null
    ? []
    : [sourceParameterValue('wizard-options', optionSchema)];
}

function sectionRouteLabelsForFeatureGoal(
  featureGoal: string | null,
): readonly string[] {
  if (featureGoal == null) {
    return [];
  }
  const sectionTail = sectionRouteTailForFeatureGoal(featureGoal);
  if (sectionTail == null) {
    return [];
  }
  return uniqueValues(sectionTail
    .split(/[,;]|\band\b/iu)
    .map((item) => sectionRouteLabel(item))
    .filter((label): label is string => label != null));
}

function sectionRouteTailForFeatureGoal(
  featureGoal: string,
): string | null {
  const match = /\b(?:tabs?|sections?|routes?)\b\s+(?:for|with|including)\s+(.+)$/iu.exec(featureGoal)
    ?? /\broutes?\s+for\s+(.+)$/iu.exec(featureGoal)
    ?? /\b(?:with|for|including)\s+(.+?)\s+(?:routes?|screens?|pages?|tabs?|sections?)\b/iu.exec(featureGoal);
  return match?.[1] == null
    ? null
    : sectionRouteTailBeforeCompanionFeature(match[1]);
}

function sectionRouteTailBeforeCompanionFeature(
  value: string,
): string {
  return value
    .replace(/\s+(?:plus\s+(?:a|an|the)?|and\s+(?:a|an|the)\s+)\s*[a-z0-9\s-]*?\b(?:form|forms|editor|edit|table|tables|list|lists|wizard|flow)\b.*$/iu, '')
    .trim();
}

function sectionRouteLabel(
  value: string,
): string | null {
  const cleaned = value
    .replace(/\b(?:a|an|the|route|routes|screen|page|tab|tabs|section|sections)\b/giu, ' ')
    .replace(/\b(?:validation|api-backed|save|saving|form|forms|table|tables|list|lists)\b/giu, ' ')
    .replace(/\b(?:field|fields|input|inputs|select|selects|dropdown|dropdowns|checkbox|checkboxes|toggle|toggles|switch|switches)\b/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (cleaned.length === 0) {
    return null;
  }
  return titleSourceName(sourceNameWords(cleaned));
}

function standardRequestFormSourceParameterValues(
  domain: FeatureGoalDomainSuggestion,
  includeRouteIdentity: boolean,
  featureGoal: string | null = null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const requestFieldSchema = requestFieldSchemaSummary(featureGoal);
  const includeSelectionIdentity = includeRouteIdentity || requestFormFeatureGoalUsesSelectionIdentity(featureGoal);
  const requestFieldValues = requestFieldSchema == null
    ? []
    : [sourceParameterValue('request-fields', requestFieldSchema)];
  return [
    ...(includeRouteIdentity
      ? [
        sourceParameterValue('request-route-parameter', `${domain.entityLowerCamel}Id`),
        sourceParameterValue('request-route-title', domain.entityTitle),
      ]
      : []),
    sourceParameterValue('request-entity', domain.entityTitle),
    ...(includeSelectionIdentity ? [sourceParameterValue('request-selection-id', `${domain.entityLowerCamel}Id`)] : []),
    ...requestFieldValues,
    ...(requestFieldSchema == null ? [] : requestOptionSchemaSourceParameterValues(featureGoal, requestFieldSchema)),
  ];
}

function requestFormFeatureGoalUsesSelectionIdentity(
  featureGoal: string | null,
): boolean {
  if (featureGoal == null) {
    return true;
  }
  const tokens = featureGoalSignalTokens(featureGoal);
  const tokenSet = new Set(tokens);
  if (
    (tokenSet.has('settings') || tokenSet.has('preferences') || tokenSet.has('preference'))
    && !tokens.some((token) => [
      'account',
      'detail',
      'details',
      'edit',
      'editable',
      'editing',
      'editor',
      'existing',
      'profile',
      'selected',
      'update',
    ].includes(token))
  ) {
    return false;
  }
  if (
    (tokenSet.has('settings') || tokenSet.has('preferences') || tokenSet.has('preference'))
    && settingsFeatureGoalUsesSelectionIdentity(featureGoal)
  ) {
    return true;
  }
  if (
    tokenSet.has('contact')
    && tokenSet.has('form')
    && (tokenSet.has('message') || tokenSet.has('email'))
    && !tokenSet.has('edit')
    && !tokenSet.has('editor')
    && !tokenSet.has('settings')
    && !tokenSet.has('profile')
  ) {
    return false;
  }
  if (
    (tokenSet.has('onboarding') || tokenSet.has('signup') || tokenSet.has('registration'))
    && !tokens.some((token) => [
      'admin',
      'detail',
      'details',
      'edit',
      'editable',
      'editing',
      'editor',
      'existing',
      'management',
      'manage',
      'profile',
      'selected',
      'update',
    ].includes(token))
  ) {
    return false;
  }
  return tokens.some((token) => [
    'admin',
    'detail',
    'details',
    'edit',
    'editable',
    'editing',
    'existing',
    'management',
    'manage',
    'selected',
    'update',
  ].includes(token));
}

function settingsFeatureGoalUsesSelectionIdentity(
  featureGoal: string,
): boolean {
  if (featureGoalHasQualifiedSettingsSurface(featureGoal)) {
    return true;
  }
  return featureGoalSignalTokens(featureGoal).some((token) => [
    'admin',
    'detail',
    'details',
    'edit',
    'editable',
    'editing',
    'existing',
    'management',
    'manage',
    'selected',
    'update',
  ].includes(token));
}

function catalogSourceParameterValues(
  domain: FeatureGoalDomainSuggestion,
  includeRouteIdentity: boolean,
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  if (!isProductLikeCatalogDomain(domain)) {
    return [];
  }
  return [
    ...(includeRouteIdentity
      ? [
        sourceParameterValue('detail-route-parameter', `${domain.entityLowerCamel}Id`),
        sourceParameterValue('list-route-path', domain.collectionPath),
        sourceParameterValue('list-route-title', domain.collectionTitle),
      ]
      : []),
    sourceParameterValue('catalog-entity', domain.entityTitle),
    sourceParameterValue('catalog-collection', domain.collectionLowerCamel),
    ...catalogFieldSchemaSourceParameterValues(featureGoal),
  ];
}

function isProductLikeCatalogDomain(domain: FeatureGoalDomainSuggestion): boolean {
  // Catalog source is currently a product-commerce scenario reference. Keep suggestions conservative
  // so unrelated domains do not receive confident source parameters for product-shaped source text.
  const entity = domain.entityLowerCamel.toLowerCase();
  return entity === 'product'
    || entity === 'item'
    || entity.includes('product')
    || entity.includes('item')
    || entity.includes('tier');
}

function sourceParameterValue(
  key: string,
  value: string,
): SemanticAuthoringSourceParameterValueInput {
  return { key, value };
}

function requestOptionSchemaSourceParameterValues(
  featureGoal: string | null,
  requestFieldSchema: string | null = null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const optionSchema = requestOptionSchemaSummary(featureGoal, requestFieldSchema);
  return optionSchema == null
    ? []
    : [sourceParameterValue('request-options', optionSchema)];
}

function tableSchemaSourceParameterValues(
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const fieldSchema = collectionFieldSchemaSummary(featureGoal, 'table');
  return fieldSchema == null
    ? []
    : [
      sourceParameterValue('table-filter-fields', fieldSchema),
      ...tableOptionSchemaSourceParameterValues(featureGoal, fieldSchema),
    ];
}

function tableOptionSchemaSourceParameterValues(
  featureGoal: string | null,
  tableFieldSchema: string,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const optionSchema = optionSchemaSummaryForFieldSchema(featureGoal, tableFieldSchema);
  return optionSchema == null
    ? []
    : [sourceParameterValue('table-options', optionSchema)];
}

function catalogFieldSchemaSourceParameterValues(
  featureGoal: string | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const fieldSchema = collectionFieldSchemaSummary(featureGoal, 'catalog');
  return fieldSchema == null
    ? []
    : [
      sourceParameterValue('catalog-fields', fieldSchema),
      ...catalogOptionSchemaSourceParameterValues(featureGoal, fieldSchema),
    ];
}

function catalogOptionSchemaSourceParameterValues(
  featureGoal: string | null,
  catalogFieldSchema: string,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  const optionSchema = optionSchemaSummaryForFieldSchema(featureGoal, catalogFieldSchema);
  return optionSchema == null
    ? []
    : [sourceParameterValue('catalog-options', optionSchema)];
}

type CollectionFieldSchemaTarget =
  | 'table'
  | 'catalog';

function collectionFieldSchemaSummary(
  featureGoal: string | null,
  target: CollectionFieldSchemaTarget,
): string | null {
  const descriptors = collectionFieldSchemaDescriptors(featureGoal, target);
  if (descriptors.length === 0) {
    return null;
  }
  return descriptors.join(', ');
}

function collectionFieldSchemaDescriptors(
  featureGoal: string | null,
  target: CollectionFieldSchemaTarget,
): readonly string[] {
  if (featureGoal == null) {
    return [];
  }
  const chunks = collectionFieldSchemaScopedChunks(featureGoalFieldSchemaChunks(featureGoal));
  const collectionIdentityKeys = collectionFieldSchemaIdentityKeys(featureGoal);
  const descriptors = uniqueValues(chunks
    .map((chunk) => collectionFieldDescriptorForChunk(
      chunk.text,
      target,
      target !== 'table' || chunk.collectionContext,
    ))
    .filter((descriptor): descriptor is string => descriptor != null)
    .filter((descriptor) => !collectionFieldDescriptorIsCollectionIdentity(descriptor, collectionIdentityKeys)));
  if (descriptors.length === 0) {
    return [];
  }
  const baseline = target === 'catalog'
    ? ['name', 'description']
    : ['name'];
  return uniqueValues([...baseline, ...descriptors]);
}

function collectionFieldSchemaIdentityKeys(
  featureGoal: string,
): ReadonlySet<string> {
  // Search/detail wording often repeats the collection noun itself ("ticket search", "ticket detail route").
  // That noun selects the route/table identity; it is not a field control unless another descriptor adds shape.
  return new Set(inferCollectionFeatureGoalDomains(featureGoal).flatMap((domain) => [
    featureGoalDomainKey(domain.entityTitle),
    featureGoalDomainKey(domain.collectionTitle),
  ]));
}

function collectionFieldDescriptorIsCollectionIdentity(
  descriptor: string,
  collectionIdentityKeys: ReadonlySet<string>,
): boolean {
  if (collectionIdentityKeys.size === 0) {
    return false;
  }
  const descriptorKey = featureGoalDomainKey(descriptor.replace(/\s+(?:select|number|toggle)$/iu, ''));
  return collectionIdentityKeys.has(descriptorKey);
}

interface FieldSchemaScopedChunk {
  readonly text: string;
  readonly collectionContext: boolean;
}

function collectionFieldSchemaScopedChunks(
  chunks: readonly string[],
): readonly FieldSchemaScopedChunk[] {
  let collectionContext = false;
  let requestContext = false;
  return chunks.map((text, index) => {
    const normalized = text.toLowerCase();
    const nextNormalized = chunks[index + 1]?.toLowerCase();
    const opensCollection = collectionFieldSchemaContextChunkIncludes(normalized);
    const opensRequest = requestFieldSchemaSurfaceChunkIncludes(normalized);
    const borrowsCollectionContextFromNextChunk = !opensCollection
      && !opensRequest
      && nextNormalized != null
      && tableFieldSchemaChunkIncludes(nextNormalized)
      && explicitCollectionControlChunkIncludes(normalized);
    if (opensCollection) {
      collectionContext = true;
      requestContext = false;
    } else if (opensRequest) {
      requestContext = true;
      collectionContext = false;
    }
    return {
      text,
      collectionContext: opensCollection
        || borrowsCollectionContextFromNextChunk
        || (collectionContext && !requestContext),
    };
  });
}

function collectionFieldDescriptorForChunk(
  chunk: string,
  target: CollectionFieldSchemaTarget,
  hasCollectionFieldSchemaContext: boolean,
): string | null {
  if (nonFieldSchemaChunkIncludes(chunk)) {
    return null;
  }
  const fieldChunk = fieldSchemaChunkBeforeInlineOptions(chunk);
  const label = collectionFieldLabel(fieldChunk);
  const normalized = fieldChunk.toLowerCase();
  if (label.length === 0 || collectionSurfaceOnlyLabel(label)) {
    return null;
  }
  if (/\b(?:badge|badges)\b/u.test(normalized) && !tableFieldSchemaChunkIncludes(normalized)) {
    return null;
  }
  if (
    target === 'table'
    && !tableFieldSchemaChunkIncludes(normalized)
    && !(hasCollectionFieldSchemaContext && explicitCollectionControlChunkIncludes(normalized))
  ) {
    return null;
  }
  if (/\b(?:category|type|status|role|priority|stage|state|tier|segment|department|assignee|branch)\b/u.test(normalized)) {
    return `${collectionFieldKeywordLabel(normalized, [
      'category',
      'type',
      'status',
      'role',
      'priority',
      'stage',
      'state',
      'tier',
      'segment',
      'department',
      'assignee',
      'branch',
    ]) ?? label} select`;
  }
  if (/\b(?:number|numeric|price|pricing|cost|amount|total|rate|percent|percentage|score|rating|points|stock|quantity|qty|count)\b/u.test(normalized)) {
    return `${collectionFieldKeywordLabel(normalized, [
      'seat count',
      'total amount',
      'price',
      'pricing',
      'cost',
      'amount',
      'total',
      'rate',
      'percent',
      'percentage',
      'score',
      'rating',
      'points',
      'stock',
      'quantity',
      'qty',
      'count',
    ]) ?? label} number`;
  }
  if (/\b(?:date|time|day|login|created|updated|opened|closed|due)\b/u.test(normalized)) {
    return collectionFieldKeywordLabel(normalized, [
      'due date',
      'last login',
      'login',
      'created',
      'updated',
      'opened',
      'closed',
      'date',
      'time',
      'day',
    ]) ?? label;
  }
  if (/\b(?:email|e mail)\b/u.test(normalized)) {
    return label === 'e mail' ? 'email' : label;
  }
  if (/\b(?:available|availability|stocked|in stock|instock|active|enabled|published|paid|flagged|archived|starred|favorite|favorites|toggle|toggles|switch|switches|checkbox|checkboxes|checked)\b/u.test(normalized)) {
    return `${collectionFieldKeywordLabel(normalized, [
      'available',
      'availability',
      'stocked',
      'in stock',
      'active',
      'enabled',
      'published',
      'paid',
      'flagged',
      'archived',
      'starred',
      'favorite',
      'favorites',
    ]) ?? label} toggle`;
  }
  if (target === 'table' && /\bsearch\b/u.test(normalized)) {
    return label;
  }
  if (target === 'table' && /\b(?:filter|filters|select|dropdown)\b/u.test(normalized)) {
    return `${label} select`;
  }
  return null;
}

function tableFieldSchemaChunkIncludes(
  chunk: string,
): boolean {
  return /\b(?:filter|filters|search|searchable|sort|sorting|sortable|field|fields|column|columns)\b/u.test(chunk);
}

function collectionFieldSchemaContextChunkIncludes(
  chunk: string,
): boolean {
  return tableFieldSchemaChunkIncludes(chunk)
    || /\b(?:table|tables|grid|list|lists|directory|browser|catalog|collection|collections|rows?|cards?)\b/u.test(chunk);
}

function requestFieldSchemaSurfaceChunkIncludes(
  chunk: string,
): boolean {
  return /\b(?:form|forms|settings|preferences|preference|editor|edit|editable|profile|address|payment|api\s*keys?|apikey|notifications?|save|saving|submit|submission)\b/u.test(chunk);
}

function explicitCollectionControlChunkIncludes(
  chunk: string,
): boolean {
  return /\b(?:select|dropdown|choice|choices|option|options|toggle|toggles|switch|switches|checkbox|checkboxes|checked|number|numeric|stock|quantity|qty|count|amount|total|price|rate|percent|percentage|date|time|email|e mail|category|type|status|role|priority|stage|state|tier|segment|department|assignee|branch)\b/u.test(chunk);
}

function collectionSurfaceOnlyLabel(
  label: string,
): boolean {
  return [
    'catalog',
    'data grid',
    'directory',
    'grid',
    'list',
    'table',
  ].includes(label.toLowerCase());
}

function collectionFieldKeywordLabel(
  normalizedChunk: string,
  candidates: readonly string[],
): string | null {
  for (const candidate of candidates) {
    const pattern = new RegExp(`\\b${candidate.replaceAll(' ', '\\s+')}\\b`, 'u');
    if (pattern.test(normalizedChunk)) {
      return candidate === 'pricing'
        ? 'price'
        : candidate === 'availability'
          ? 'available'
          : candidate === 'qty'
            ? 'quantity'
            : candidate;
    }
  }
  return null;
}

function collectionFieldLabel(
  chunk: string,
): string {
  const cleaned = chunk
    .replace(/\b(?:field|fields|input|inputs|control|controls|filter|filters|filterable|search|searchable|sort|sorting|sortable|select|dropdown|choice|choices|option|options|toggle|toggles|switch|switches|checkbox|checkboxes|checked|number|numeric)\b/giu, ' ')
    .replace(/\b(?:a|an|the|with|for|by|of|and|or)\b/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return cleaned.length === 0 ? '' : cleaned;
}

function featureGoalFieldSchemaChunks(
  featureGoal: string,
): readonly string[] {
  return featureGoal
    .toLowerCase()
    .replace(/[@/_-]+/gu, ' ')
    .replace(/[^a-z0-9,;]+/gu, ' ')
    .split(/\b(?:with|including|and)\b|[,;]/u)
    .map((chunk) => chunk.trim().replace(/\s+/gu, ' '))
    .filter((chunk) => chunk.length > 0);
}

function fieldSchemaChunkBeforeInlineOptions(
  chunk: string,
): string {
  const match = /\b(?:select|dropdown|checkboxes|checked\s+(?:collection|list))\b\s+(?:for|with|including|options?\s*:?)\s+/iu.exec(chunk);
  return match == null
    ? chunk
    : chunk.slice(0, match.index + match[0].replace(/\s+(?:for|with|including|options?\s*:?)\s+$/iu, '').length).trim();
}

function requestFieldSchemaChunkIncludes(
  chunk: string,
): boolean {
  return /\b(?:field|fields|input|inputs|select|dropdown|checkbox|checkboxes|radio|radios|toggle|toggles|switch|switches|textarea|name|email|e\s*mail|address|password|api keys?|contact method|preferred contact method|avatar|url|uri|notes|note|description|comments|comment|message|notifications?|number|numeric|stock|quantity|qty|count|hours|hour|amount|total|price|rate|percent|percentage|date|time|day|due|start|end)\b/u.test(chunk);
}

function requestFieldSchemaSummary(
  featureGoal: string | null,
): string | null {
  if (featureGoal == null) {
    return null;
  }
  const descriptors = uniqueValues([
    ...editableDetailCompanionFieldDescriptors(featureGoal),
    ...requestFieldSchemaChunksForFeatureGoal(featureGoal)
      .filter(requestFieldSchemaChunkIncludes)
      .flatMap(requestFieldDescriptorsForChunk),
  ]);
  return descriptors.length === 0 ? null : descriptors.join(', ');
}

function requestFieldSchemaChunksForFeatureGoal(
  featureGoal: string,
): readonly string[] {
  const scopedText = explicitRequestFieldSchemaTail(featureGoal) ?? featureGoal;
  return featureGoalFieldSchemaChunks(scopedText);
}

function explicitRequestFieldSchemaTail(
  featureGoal: string,
): string | null {
  const match = /\b(?:form|forms|editor|edit|editable|editing)\b\s+(?:for|with|including)\s+(.+)$/iu.exec(featureGoal);
  return match?.[1] == null
    ? null
    : match[1].trim();
}

function editableDetailCompanionFieldDescriptors(
  featureGoal: string,
): readonly string[] {
  const tokens = featureGoalSignalTokens(featureGoal);
  if (!hasEditableDetailIntent(tokens)) {
    return [];
  }
  // A list/detail management request often states table fields once ("status filters",
  // "category select") and expects the detail editor to use the same caller-domain
  // vocabulary. Reuse the table schema descriptors only for explicit editable-detail
  // goals so ordinary filter UIs do not become request-form fields.
  return collectionFieldSchemaDescriptors(featureGoal, 'table');
}

function hasEditableDetailIntent(
  tokens: readonly string[],
): boolean {
  const tokenSet = new Set(tokens);
  const hasEditable = tokenSet.has('edit')
    || tokenSet.has('editable')
    || tokenSet.has('editing');
  const hasDetail = tokenSet.has('detail')
    || tokenSet.has('details')
    || tokenSet.has('profile');
  return hasEditable && hasDetail;
}

function requestFieldDescriptorForChunk(
  chunk: string,
): string | null {
  const fieldChunk = fieldSchemaChunkBeforeInlineOptions(chunk);
  const normalized = fieldChunk.toLowerCase();
  if (requestOnlyNonFieldSchemaChunkIncludes(normalized)) {
    return null;
  }
  const label = requestFieldLabel(fieldChunk);
  if (label.length === 0 || collectionSurfaceOnlyLabel(label)) {
    return null;
  }
  if (/\b(?:detail|details)\b/u.test(normalized) && !/\b(?:description|notes|note|comments|comment|message)\b/u.test(normalized)) {
    return null;
  }
  if (/\b(?:select|dropdown|choice|choices|option|options|language|status|category|type|role|priority|stage|state|department|assignee|contact method|preferred contact method)\b/u.test(normalized)) {
    return `${requestFieldKeywordLabel(normalized, [
      'account type',
      'preferred contact method',
      'contact method',
      'preferred language',
      'language',
      'role',
      'priority',
      'stage',
      'state',
      'department',
      'assignee',
      'status',
      'category',
      'type',
    ]) ?? label} select`;
  }
  if (/\b(?:notifications?\s+preferences?|preferences?)\s+forms?\b/u.test(normalized)) {
    return null;
  }
  if (/\b(?:toggle|toggles|switch|switches|checkbox|checkboxes|checked|enabled|active|notification|notifications)\b/u.test(normalized)) {
    if (/\b(?:checkboxes|checked\s+(?:collection|list))\b/u.test(normalized)) {
      return `${requestFieldKeywordLabel(normalized, [
        'permission',
        'permissions',
        'role',
        'roles',
      ]) ?? label} checkboxes`;
    }
    const keywordLabel = requestFieldKeywordLabel(normalized, [
      'email notifications',
      'notifications',
      'notification',
      'enabled',
      'active',
    ]);
    const base = keywordLabel == null || labelPreservesMoreSpecificFieldContext(label, keywordLabel)
      ? label
      : keywordLabel;
    return `${base} toggle`;
  }
  if (/\b(?:number|numeric|stock|quantity|qty|count|hours|hour|amount|total|price|rate|percent|percentage)\b/u.test(normalized)) {
    return requestFieldDescriptorWithControlSuffix(label, requestFieldKeywordLabel(normalized, [
      'weekly hours',
      'hours',
      'hour',
      'stock',
      'quantity',
      'qty',
      'count',
      'amount',
      'total',
      'price',
      'rate',
      'percent',
      'percentage',
    ]), 'number');
  }
  if (/\b(?:date|time|day|due|start|end)\b/u.test(normalized)) {
    return requestFieldDescriptorWithControlSuffix(label, requestFieldKeywordLabel(normalized, [
      'start date',
      'end date',
      'due date',
      'date',
      'time',
      'day',
    ]), 'date');
  }
  if (/\b(?:api\s*keys?|apikey|access key|password|secret|token)\b/u.test(normalized)) {
    return /\bapi\s*keys?\b/u.test(normalized)
      ? 'api key'
      : requestFieldKeywordLabel(normalized, ['access key', 'password', 'secret', 'token']) ?? label;
  }
  if (/\b(?:avatar|image|url|uri)\b/u.test(normalized)) {
    return requestFieldKeywordLabel(normalized, ['avatar url', 'image url', 'profile image', 'url', 'uri']) ?? label;
  }
  if (/\b(?:email|e mail)\b/u.test(normalized)) {
    return label === 'e mail'
      ? 'email'
      : labelPreservesMoreSpecificFieldContext(label, 'email')
        ? label
        : 'email';
  }
  return label;
}

function requestFieldDescriptorsForChunk(
  chunk: string,
): readonly string[] {
  const compactDescriptors = compactRequestFieldDescriptorsForChunk(chunk);
  if (compactDescriptors.length > 1) {
    return compactDescriptors;
  }
  const descriptor = requestFieldDescriptorForChunk(chunk);
  return descriptor == null ? [] : [descriptor];
}

function compactRequestFieldDescriptorsForChunk(
  chunk: string,
): readonly string[] {
  const fieldChunk = fieldSchemaChunkBeforeInlineOptions(chunk);
  const normalized = fieldChunk.toLowerCase();
  const credentialDescriptors = compactCredentialFieldDescriptorsForChunk(fieldChunk);
  if (credentialDescriptors.length > 1) {
    return credentialDescriptors;
  }
  if (
    requestFieldChunkHasExplicitControlSyntax(normalized)
    || requestFieldChunkHasCompoundFieldLabel(normalized)
  ) {
    return [];
  }
  const descriptors: string[] = [];
  for (const token of featureGoalSignalTokens(fieldChunk)) {
    const descriptor = compactRequestFieldDescriptorForToken(token);
    if (descriptor != null) {
      descriptors.push(descriptor);
    }
  }
  return uniqueValues(descriptors);
}

function compactCredentialFieldDescriptorsForChunk(
  chunk: string,
): readonly string[] {
  const tokens = featureGoalSignalTokens(chunk);
  if (!tokens.includes('email') || tokens.length > 3) {
    return [];
  }
  const descriptors: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token === 'email') {
      descriptors.push('email');
    } else if (token === 'password') {
      descriptors.push('password');
    } else if (token === 'secret') {
      descriptors.push('secret');
    } else if (token === 'token') {
      descriptors.push('token');
    }
  }
  return uniqueValues(descriptors);
}

function requestFieldChunkHasExplicitControlSyntax(
  normalizedChunk: string,
): boolean {
  return /\b(?:select|dropdown|choice|choices|option|options|checkbox|checkboxes|radio|radios|toggle|toggles|switch|switches|number|numeric|date|time|day|textarea|input|field|control|password|secret|token|api\s*key|apikey|access\s+key)\b/u.test(normalizedChunk);
}

function requestFieldChunkHasCompoundFieldLabel(
  normalizedChunk: string,
): boolean {
  return /\b(?:first|last|full|display|customer|account|contact|billing|shipping|postal|profile)\s+(?:name|email|e\s*mail|address|message|notes?|comments?|description)\b/u.test(normalizedChunk)
    || /\b(?:address|message|notes?|comments?|description)\s+(?:line|body|text)\b/u.test(normalizedChunk);
}

function compactRequestFieldDescriptorForToken(
  token: string,
): string | null {
  switch (token) {
    case 'name':
      return 'name';
    case 'email':
      return 'email';
    case 'message':
      return 'message';
    case 'note':
    case 'notes':
      return 'notes';
    case 'comment':
    case 'comments':
      return 'comments';
    case 'description':
      return 'description';
    default:
      return null;
  }
}

function requestOptionSchemaSummary(
  featureGoal: string | null,
  requestFieldSchema: string | null = null,
): string | null {
  return optionSchemaSummaryForFieldSchema(featureGoal, requestFieldSchema ?? requestFieldSchemaSummary(featureGoal));
}

function optionSchemaSummaryForFieldSchema(
  featureGoal: string | null,
  fieldSchema: string | null = null,
): string | null {
  if (featureGoal == null) {
    return null;
  }
  const fieldDescriptors = (fieldSchema ?? '')
    .split(',')
    .map((descriptor) => descriptor.trim())
    .filter((descriptor) => descriptor.length > 0);
  const groups = explicitRequestOptionGroups(featureGoal, fieldDescriptors);
  return groups.length === 0 ? null : groups.join('; ');
}

function explicitRequestOptionGroups(
  featureGoal: string,
  fieldDescriptors: readonly string[],
): readonly string[] {
  const source = featureGoal
    .toLowerCase()
    .replace(/[@/_-]+/gu, ' ')
    .replace(/\s+/gu, ' ');
  const optionMarkers = explicitRequestOptionMarkers(source, fieldDescriptors);
  const groups: string[] = [];
  for (let index = 0; index < optionMarkers.length; index += 1) {
    const marker = optionMarkers[index]!;
    const nextMarker = optionMarkers[index + 1];
    const optionsEnd = Math.min(
      nextMarker?.start ?? source.length,
      requestOptionDescriptorBoundaryIndex(source, marker.optionsStart, fieldDescriptors, marker.descriptor),
      requestOptionFeatureBoundaryIndex(source, marker.optionsStart),
    );
    const options = cleanRequestOptionValues(source.slice(marker.optionsStart, optionsEnd));
    if (options.length > 0) {
      groups.push(`${marker.key}: ${options}`);
    }
  }
  return uniqueValues(groups);
}

function requestOptionFeatureBoundaryIndex(
  source: string,
  fromIndex: number,
): number {
  const match = /(?:[,;]|\band\b)\s+(?:editable|editing|edit|validated?|validation|api(?:\s+backed)?|service(?:\s+backed)?|loading|saving|save|persist|routed?|routes?|detail|details|forms?|editor|settings|workspace|screen|page)\b/iu.exec(source.slice(fromIndex));
  return match == null ? source.length : fromIndex + match.index;
}

interface RequestOptionMarker {
  readonly descriptor: string;
  readonly key: string;
  readonly start: number;
  readonly optionsStart: number;
}

function explicitRequestOptionMarkers(
  source: string,
  fieldDescriptors: readonly string[],
): readonly RequestOptionMarker[] {
  return fieldDescriptors
    .filter(requestFieldDescriptorHasOptionDomain)
    .map((descriptor): RequestOptionMarker | null => {
      const key = requestOptionGroupKey(descriptor);
      if (key == null) {
        return null;
      }
      const match = requestOptionDescriptorPattern(descriptor).exec(source);
      return match == null
        ? null
        : {
          descriptor,
          key,
          start: match.index,
          optionsStart: match.index + match[0].length,
        };
    })
    .filter((marker): marker is RequestOptionMarker => marker != null)
    .sort((left, right) => left.start - right.start);
}

function requestFieldDescriptorHasOptionDomain(
  descriptor: string,
): boolean {
  return /\b(?:select|dropdown|checkboxes|checked\s+(?:collection|list))\b/u.test(descriptor);
}

function requestOptionDescriptorPattern(
  descriptor: string,
): RegExp {
  const label = requestOptionGroupKey(descriptor) ?? descriptor;
  const controlPattern = /\b(?:checkboxes|checked\s+(?:collection|list))\b/u.test(descriptor)
    ? String.raw`(?:checkboxes|checked\s+(?:collection|list))`
    : String.raw`(?:select|dropdown)`;
  return new RegExp(
    String.raw`\b${sourceLabelWordsPattern(label)}\s+${controlPattern}\s+(?:for|with|including|options?\s*:?)\s+`,
    'iu',
  );
}

function requestOptionDescriptorBoundaryIndex(
  source: string,
  fromIndex: number,
  fieldDescriptors: readonly string[],
  currentDescriptor: string,
): number {
  let boundaryIndex = source.length;
  for (const descriptor of fieldDescriptors) {
    if (descriptor === currentDescriptor) {
      continue;
    }
    const match = requestFieldDescriptorBoundaryPattern(descriptor).exec(source.slice(fromIndex));
    if (match != null) {
      boundaryIndex = Math.min(boundaryIndex, fromIndex + match.index);
    }
  }
  return boundaryIndex;
}

function requestFieldDescriptorBoundaryPattern(
  descriptor: string,
): RegExp {
  const label = requestOptionGroupKey(descriptor) ?? descriptor;
  const controlBoundary = String.raw`(?:select|dropdown|checkbox|checkboxes|checked|toggle|toggles|switch|switches|number|numeric|date|time|email|e\s+mail|field|fields)`;
  const flexibleLabelBoundary = String.raw`(?:[a-z0-9]+\s+){0,2}${sourceLabelWordsPattern(label)}(?:\s+${controlBoundary})?`;
  return new RegExp(
    String.raw`(?:[,;]|\band\b)\s+(?:${sourceLabelWordsPattern(descriptor)}|${flexibleLabelBoundary})\b`,
    'iu',
  );
}

function sourceLabelWordsPattern(
  label: string,
): string {
  const words = label
    .toLowerCase()
    .split(/\s+/u)
    .filter((word) => word.length > 0)
    .map(escapeRegExp);
  if (words.length === 0) {
    return '';
  }
  const lastWord = words[words.length - 1]!;
  const lastWordPattern = lastWord.endsWith('s') ? lastWord : `${lastWord}s?`;
  return [
    ...words.slice(0, -1),
    lastWordPattern,
  ].join(String.raw`\s+`);
}

function escapeRegExp(
  value: string,
): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

function cleanRequestOptionValues(value: string): string {
  return value
    .replace(/\s+\band\s+(?:validation|routing|routes?|save|saving|api|api-backed|table|tables|form|forms|editor|settings|screen|page|area)\b.*$/iu, '')
    .replace(/[,;]\s+(?:editable|editing|edit|validated?|validation|api(?:\s+backed)?|service(?:\s+backed)?|loading|saving|save|persist|routed?|routes?|detail|details|forms?|editor|settings|workspace|screen|page)\b.*$/iu, '')
    .replace(/\b(?:option|options|values|choices)\b/giu, ' ')
    .replace(/[,;]\s*$/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function requestOptionGroupKey(descriptor: string): string | null {
  const key = requestFieldLabel(descriptor);
  return key.length === 0 ? null : key;
}

function requestFieldLabel(
  chunk: string,
): string {
  const cleaned = chunk
    .toLowerCase()
    .replace(/\b(?:field|fields|input|inputs|control|controls|edit|editable|editing|select|dropdown|choice|choices|option|options|toggle|toggles|switch|switches|checkbox|checkboxes|checked|number|numeric)\b/giu, ' ')
    .replace(/\b(?:build|create|validated?|validation|api-backed|service-backed|form|forms|settings|preferences|preference|profile|page|screen|area|app|application)\b/giu, ' ')
    .replace(/\b(?:a|an|the|with|for|by|of|and|or)\b/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return cleaned.length === 0 ? chunk.trim() : cleaned;
}

function requestFieldKeywordLabel(
  normalizedChunk: string,
  candidates: readonly string[],
): string | null {
  for (const candidate of candidates) {
    const pattern = new RegExp(`\\b${candidate.replaceAll(' ', '\\s+')}\\b`, 'u');
    if (pattern.test(normalizedChunk)) {
      return candidate === 'qty'
        ? 'quantity'
        : candidate === 'notifications'
          ? 'notification'
          : candidate === 'permissions'
            ? 'permission'
            : candidate === 'roles'
              ? 'role'
          : candidate;
    }
  }
  return null;
}

function requestFieldDescriptorWithControlSuffix(
  label: string,
  keywordLabel: string | null,
  suffix: 'date' | 'number',
): string {
  const base = keywordLabel == null || labelPreservesMoreSpecificFieldContext(label, keywordLabel)
    ? label
    : keywordLabel;
  return sourceFieldDescriptorAlreadyCarriesControl(base, suffix)
    ? base
    : `${base} ${suffix}`;
}

function labelPreservesMoreSpecificFieldContext(
  label: string,
  keywordLabel: string,
): boolean {
  const labelWords = label.split(/\s+/u).filter((word) => word.length > 0);
  const keywordWords = keywordLabel.split(/\s+/u).filter((word) => word.length > 0);
  return labelWords.length > keywordWords.length
    && keywordWords.every((word) => labelWords.includes(word));
}

function sourceFieldDescriptorAlreadyCarriesControl(
  label: string,
  suffix: 'date' | 'number',
): boolean {
  const suffixPattern = suffix === 'date'
    ? /\b(?:date|time|day)\b/u
    : /\b(?:number|numeric)\b/u;
  return suffixPattern.test(label);
}

function nonFieldSchemaChunkIncludes(
  chunk: string,
): boolean {
  return /\b(?:button|submit|save|route|routes|routing|page|screen|area|app|application|build|create|list|tree|browser|viewer|download)\b/u.test(chunk);
}

function requestOnlyNonFieldSchemaChunkIncludes(
  chunk: string,
): boolean {
  return /\b(?:filter|filters|filterable|search|searchable|sort|sorting|sortable|column|columns|badge|badges)\b/u.test(chunk);
}

interface FeatureGoalDomainSuggestion {
  readonly entityTitle: string;
  readonly entityLowerCamel: string;
  readonly collectionTitle: string;
  readonly collectionLowerCamel: string;
  readonly collectionPath: string;
}

const DOMAIN_SURFACE_TOKENS = new Set([
  'board',
  'browser',
  'catalog',
  'card',
  'cards',
  'checkout',
  'dashboard',
  'detail',
  'details',
  'directory',
  'editor',
  'filter',
  'filters',
  'flow',
  'form',
  'grid',
  'inbox',
  'list',
  'management',
  'page',
  'pages',
  'pagination',
  'route',
  'routes',
  'search',
  'searchable',
  'section',
  'sections',
  'settings',
  'sort',
  'sortable',
  'storefront',
  'table',
  'tree',
  'view',
  'viewer',
  'wizard',
]);

const DOMAIN_BOUNDARY_TOKENS = new Set([
  'a',
  'an',
  'and',
  'api',
  'app',
  'application',
  'backed',
  'by',
  'build',
  'compare',
  'create',
  'edit',
  'editable',
  'editing',
  'existing',
  'for',
  'large',
  'larger',
  'new',
  'reply',
  'route',
  'routed',
  'routes',
  'save',
  'saved',
  'selected',
  'select',
  'dropdown',
  'checkbox',
  'radio',
  'toggle',
  'switch',
  'localized',
  'localization',
  'translated',
  'translation',
  'submit',
  'summary',
  'through',
  'the',
  'validated',
  'validation',
  'with',
]);

const POSTFIX_DOMAIN_SURFACE_TOKENS = new Set([
  'catalog',
  'directory',
  'grid',
  'list',
  'search',
  'searchable',
  'table',
]);

const COLLECTION_DOMAIN_SURFACE_TOKENS = new Set([
  'directory',
  'grid',
  'list',
  'search',
  'searchable',
  'table',
]);

const POSTFIX_FIELD_CONTROL_DOMAIN_NOISE_TOKENS = new Set([
  'assignee',
  'branch',
  'category',
  'department',
  'priority',
  'role',
  'stage',
  'state',
  'status',
  'tier',
  'type',
]);

const FOR_CLAUSE_OPTION_VALUE_PRECEDING_TOKENS = new Set([
  'checkbox',
  'checkboxes',
  'dropdown',
  'field',
  'fields',
  'option',
  'options',
  'radio',
  'select',
  'switch',
  'toggle',
  'value',
  'values',
]);

const FOR_CLAUSE_DOMAIN_NOISE_TOKENS = new Set([
  'aurelia',
  'state',
  'store',
  'stores',
  'backed',
  'app',
  'application',
]);

const FOR_CLAUSE_OVERRIDE_CONTEXT_TOKENS = new Set([
  'admin',
  'area',
  'dashboard',
  'management',
  'operations',
  'panel',
  'portal',
  'workspace',
]);

const REQUEST_FORM_ACTION_SURFACE_TOKENS = new Set([
  'create',
  'edit',
  'editing',
  'editor',
]);

const REQUEST_FORM_ACTION_DOMAIN_NOISE_TOKENS = new Set([
  'data',
  'detail',
  'details',
  'field',
  'fields',
  'form',
  'forms',
  'page',
  'screen',
  'view',
]);

function inferForClauseFeatureGoalDomain(
  featureGoal: string,
): FeatureGoalDomainSuggestion | null {
  const tokens = featureGoalSignalTokens(featureGoal);
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] !== 'for' || forClauseLooksLikeOptionValues(tokens, index)) {
      continue;
    }
    const domainTokens = domainTokensAfterForClause(tokens, index);
    if (domainTokens.length > 0) {
      return domainSuggestionFromTokens(domainTokens);
    }
  }
  return null;
}

function inferRequestFormActionFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  if (featureGoal == null) {
    return null;
  }
  const tokens = featureGoalSignalTokens(featureGoal);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!REQUEST_FORM_ACTION_SURFACE_TOKENS.has(tokens[index]!)) {
      continue;
    }
    const domainTokens = domainTokensAroundRequestFormAction(tokens, index);
    if (domainTokens.length > 0) {
      return domainSuggestionFromTokens(domainTokens);
    }
  }
  return null;
}

function domainTokensAroundRequestFormAction(
  tokens: readonly string[],
  actionIndex: number,
): readonly string[] {
  const before = domainTokensBeforeSurface(tokens, actionIndex);
  return before.length > 0
    ? before
    : domainTokensAfterRequestFormAction(tokens, actionIndex);
}

function domainTokensAfterRequestFormAction(
  tokens: readonly string[],
  actionIndex: number,
): readonly string[] {
  const result: string[] = [];
  for (let index = actionIndex + 1; index < tokens.length && result.length < 2; index += 1) {
    const token = tokens[index]!;
    if (
      REQUEST_FORM_ACTION_DOMAIN_NOISE_TOKENS.has(token)
      || DOMAIN_BOUNDARY_TOKENS.has(token)
      || DOMAIN_SURFACE_TOKENS.has(token)
    ) {
      break;
    }
    result.push(token);
    if (result.length === 1 && tokenLooksPluralDomainHead(token)) {
      break;
    }
  }
  return result;
}

function forClauseLooksLikeOptionValues(
  tokens: readonly string[],
  forIndex: number,
): boolean {
  const previous = tokens[forIndex - 1];
  return previous != null && FOR_CLAUSE_OPTION_VALUE_PRECEDING_TOKENS.has(previous);
}

function inferFeatureGoalDomain(
  featureGoal: string | null,
): FeatureGoalDomainSuggestion | null {
  return featureGoal == null
    ? null
    : inferFeatureGoalDomainWithSurfaceWeights(featureGoal, domainSurfaceTokenWeight)
      ?? inferForClauseFeatureGoalDomain(featureGoal);
}

function inferFeatureGoalDomainWithSurfaceWeights(
  featureGoal: string | null,
  surfaceWeight: (token: string) => number,
  includeSpecialDomain = true,
): FeatureGoalDomainSuggestion | null {
  if (featureGoal == null) {
    return null;
  }
  const tokens = featureGoalSignalTokens(featureGoal);
  if (includeSpecialDomain) {
    const specialDomain = specialFeatureGoalDomainSuggestion(tokens);
    if (specialDomain != null) {
      return specialDomain;
    }
  }
  const candidates: FeatureGoalDomainCandidate[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const surfaceToken = tokens[index]!;
    if (!DOMAIN_SURFACE_TOKENS.has(surfaceToken)) {
      continue;
    }
    const domainTokens = domainTokensBeforeSurface(tokens, index);
    if (domainTokens.length > 0) {
      candidates.push({
        domainTokens,
        surfaceIndex: index,
        score: surfaceWeight(surfaceToken) + domainTokens.length,
      });
    }
    // Postfix extraction is for source-shaped phrases like "searchable projects" or "table products".
    // When the same surface already has a leading domain phrase ("audit log table"), the following
    // token is usually the next feature/capability clause rather than a better domain candidate.
    if (domainTokens.length === 0 && POSTFIX_DOMAIN_SURFACE_TOKENS.has(surfaceToken)) {
      const postfixDomainTokens = domainTokensAfterSurface(tokens, index);
      if (postfixDomainTokens.length > 0) {
        candidates.push({
          domainTokens: postfixDomainTokens,
          surfaceIndex: index,
          score: surfaceWeight(surfaceToken) + postfixDomainTokens.length + 2,
        });
      }
    }
  }
  const selected = candidates
    .sort((left, right) =>
      right.score - left.score
      || right.domainTokens.length - left.domainTokens.length
      || left.surfaceIndex - right.surfaceIndex
    )[0];
  return selected == null ? null : domainSuggestionFromTokens(selected.domainTokens);
}

function domainWithForClauseOverride(
  domain: FeatureGoalDomainSuggestion | null,
  forClauseDomain: FeatureGoalDomainSuggestion | null,
): FeatureGoalDomainSuggestion | null {
  if (domain == null || forClauseDomain == null || !domainCanBeOverriddenByForClause(domain)) {
    return domain;
  }
  return forClauseDomain;
}

function domainCanBeOverriddenByForClause(
  domain: FeatureGoalDomainSuggestion,
): boolean {
  const tokens = sourceNameWords(domain.entityTitle).map((token) => token.toLowerCase());
  return tokens.length > 0
    && tokens.every((token) =>
      FOR_CLAUSE_OVERRIDE_CONTEXT_TOKENS.has(token)
      || POSTFIX_FIELD_CONTROL_DOMAIN_NOISE_TOKENS.has(token)
    );
}

function inferCollectionFeatureGoalDomains(
  featureGoal: string,
): readonly FeatureGoalDomainSuggestion[] {
  const tokens = featureGoalSignalTokens(featureGoal);
  const candidates: FeatureGoalDomainCandidate[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const surfaceToken = tokens[index]!;
    if (!COLLECTION_DOMAIN_SURFACE_TOKENS.has(surfaceToken)) {
      continue;
    }
    const domainTokens = domainTokensBeforeSurface(tokens, index);
    if (domainTokens.length > 0) {
      candidates.push({
        domainTokens,
        surfaceIndex: index,
        score: domainSurfaceTokenWeight(surfaceToken) + domainTokens.length,
      });
    }
    if (domainTokens.length === 0 && POSTFIX_DOMAIN_SURFACE_TOKENS.has(surfaceToken)) {
      const postfixDomainTokens = domainTokensAfterSurface(tokens, index);
      if (postfixDomainTokens.length > 0) {
        candidates.push({
          domainTokens: postfixDomainTokens,
          surfaceIndex: index,
          score: domainSurfaceTokenWeight(surfaceToken) + postfixDomainTokens.length + 2,
        });
      }
    }
  }
  const domains: FeatureGoalDomainSuggestion[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates.sort((left, right) => left.surfaceIndex - right.surfaceIndex)) {
    const domain = domainSuggestionFromTokens(candidate.domainTokens);
    const key = featureGoalDomainKey(domain.entityTitle);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    domains.push(domain);
  }
  return domains;
}

function specialCatalogFeatureGoalDomainSuggestion(
  tokens: readonly string[],
): FeatureGoalDomainSuggestion | null {
  const tokenSet = new Set(tokens);
  if (
    (tokenSet.has('product') || tokenSet.has('products'))
    && (tokenSet.has('tier') || tokenSet.has('tiers'))
  ) {
    return domainSuggestionFromTokens(['product', 'tier']);
  }
  if (
    (tokenSet.has('pricing') || tokenSet.has('price'))
    && (tokenSet.has('tier') || tokenSet.has('tiers'))
  ) {
    return domainSuggestionFromTokens(['pricing', 'tier']);
  }
  if (tokenSet.has('product') || tokenSet.has('products')) {
    return domainSuggestionFromTokens(['product']);
  }
  if (
    (tokenSet.has('item') || tokenSet.has('items'))
    && (
      tokenSet.has('catalog')
      || tokenSet.has('storefront')
      || tokenSet.has('card')
      || tokenSet.has('cards')
    )
  ) {
    return domainSuggestionFromTokens(['item']);
  }
  return null;
}

function specialFeatureGoalDomainSuggestion(
  tokens: readonly string[],
): FeatureGoalDomainSuggestion | null {
  const tokenSet = new Set(tokens);
  if (
    (tokenSet.has('product') || tokenSet.has('products'))
    && (tokenSet.has('tier') || tokenSet.has('tiers'))
  ) {
    return domainSuggestionFromTokens(['product', 'tier']);
  }
  if (
    (tokenSet.has('pricing') || tokenSet.has('price'))
    && (tokenSet.has('tier') || tokenSet.has('tiers'))
  ) {
    return domainSuggestionFromTokens(['pricing', 'tier']);
  }
  if (tokenSet.has('checkout')) {
    return domainSuggestionFromTokens(['checkout']);
  }
  return null;
}

function catalogProductSignalIsAdminTableNoise(
  tokens: readonly string[],
  matchedTerms: readonly string[],
): boolean {
  if (matchedTerms.length === 0) {
    return false;
  }
  const tokenSet = new Set(tokens);
  if (
    tokenSet.has('storefront')
    || tokenSet.has('catalog')
    || tokenSet.has('cart')
    || tokenSet.has('checkout')
    || tokenSet.has('pricing')
    || tokenSet.has('compare')
    || tokenSet.has('card')
    || tokenSet.has('cards')
  ) {
    return false;
  }
  if (matchedTerms.some((term) => term.includes('tier') || term.includes('pricing'))) {
    return false;
  }
  const hasAdminIntent = tokenSet.has('admin')
    || tokenSet.has('management')
    || tokenSet.has('crud');
  const hasEditableIntent = tokenSet.has('edit')
    || tokenSet.has('editable')
    || tokenSet.has('editing')
    || tokenSet.has('create');
  const hasTableIntent = tokenSet.has('table')
    || tokenSet.has('grid')
    || tokenSet.has('directory')
    || tokenSet.has('list');
  return (hasAdminIntent && (hasTableIntent || hasEditableIntent))
    || (hasEditableIntent && hasTableIntent);
}

function domainTokensBeforeSurface(
  tokens: readonly string[],
  surfaceIndex: number,
): readonly string[] {
  const result: string[] = [];
  for (let index = surfaceIndex - 1; index >= 0 && result.length < 2; index -= 1) {
    const token = tokens[index]!;
    if (DOMAIN_BOUNDARY_TOKENS.has(token) || DOMAIN_SURFACE_TOKENS.has(token)) {
      break;
    }
    result.unshift(token);
  }
  return result;
}

function domainTokensAfterSurface(
  tokens: readonly string[],
  surfaceIndex: number,
): readonly string[] {
  const result: string[] = [];
  for (let index = surfaceIndex + 1; index < tokens.length && result.length < 2; index += 1) {
    const token = tokens[index]!;
    if (
      result.length === 0
      && POSTFIX_FIELD_CONTROL_DOMAIN_NOISE_TOKENS.has(token)
      && domainTokenAfterSurfaceIsFieldControl(tokens, index)
    ) {
      break;
    }
    if (DOMAIN_BOUNDARY_TOKENS.has(token) || DOMAIN_SURFACE_TOKENS.has(token)) {
      break;
    }
    result.push(token);
    if (result.length === 1 && tokenLooksPluralDomainHead(token)) {
      break;
    }
  }
  return result;
}

function domainTokensAfterForClause(
  tokens: readonly string[],
  surfaceIndex: number,
): readonly string[] {
  const result: string[] = [];
  for (let index = surfaceIndex + 1; index < tokens.length && result.length < 2; index += 1) {
    const token = tokens[index]!;
    if (DOMAIN_BOUNDARY_TOKENS.has(token) || DOMAIN_SURFACE_TOKENS.has(token)) {
      break;
    }
    if (FOR_CLAUSE_DOMAIN_NOISE_TOKENS.has(token)) {
      continue;
    }
    result.push(token);
    if (result.length === 1 && tokenLooksPluralDomainHead(token)) {
      break;
    }
  }
  return result;
}

function domainTokenAfterSurfaceIsFieldControl(
  tokens: readonly string[],
  tokenIndex: number,
): boolean {
  const nextToken = tokens[tokenIndex + 1];
  return nextToken == null
    || DOMAIN_SURFACE_TOKENS.has(nextToken)
    || /\b(?:filter|filters|select|dropdown|toggle|checkbox|radio|field|fields|column|columns|badge|badges)\b/u.test(nextToken);
}

function tokenLooksPluralDomainHead(token: string): boolean {
  return token.endsWith('s') && !token.endsWith('ss');
}

interface FeatureGoalDomainCandidate {
  readonly domainTokens: readonly string[];
  readonly surfaceIndex: number;
  readonly score: number;
}

function domainSurfaceTokenWeight(token: string): number {
  // Prefer the entity named by a route/detail/form surface over a broad container such as an inbox.
  // This keeps suggestions deterministic without treating the extractor as semantic truth.
  switch (token) {
    case 'route':
    case 'routes':
      return 5;
    case 'board':
    case 'detail':
    case 'details':
      return 4;
    case 'directory':
    case 'editor':
    case 'form':
    case 'grid':
    case 'list':
    case 'management':
    case 'search':
    case 'searchable':
    case 'table':
    case 'tree':
    case 'checkout':
      return 3;
    case 'catalog':
    case 'browser':
    case 'inbox':
    case 'storefront':
      return 2;
    case 'view':
    case 'viewer':
      return 1;
    default:
      return 1;
  }
}

function multiStepDomainSurfaceTokenWeight(token: string): number {
  switch (token) {
    case 'checkout':
    case 'flow':
    case 'wizard':
      return 6;
    case 'route':
    case 'routes':
      return 1;
    default:
      return domainSurfaceTokenWeight(token);
  }
}

function requestFormDomainSurfaceTokenWeight(token: string): number {
  // A mixed feature goal can contain separate collection and form surfaces. For form companions,
  // prefer the domain closest to settings/editor/form/detail wording over broad list/table wording.
  switch (token) {
    case 'form':
    case 'editor':
    case 'settings':
      return 7;
    case 'detail':
    case 'details':
      return 6;
    case 'route':
    case 'routes':
      return 4;
    case 'table':
    case 'grid':
    case 'list':
    case 'directory':
    case 'search':
    case 'searchable':
      return 2;
    default:
      return domainSurfaceTokenWeight(token);
  }
}

function catalogDomainSurfaceTokenWeight(token: string): number {
  switch (token) {
    case 'card':
    case 'cards':
    case 'catalog':
    case 'storefront':
      return 7;
    case 'checkout':
    case 'flow':
    case 'wizard':
      return 1;
    default:
      return domainSurfaceTokenWeight(token);
  }
}

function domainSuggestionFromTokens(
  tokens: readonly string[],
): FeatureGoalDomainSuggestion {
  const singularTokens = deduplicateSingularDomainTokens(tokens.map(singularizeSourceNameWord));
  const pluralTokens = pluralizeLastSourceNameWord(singularTokens);
  return {
    entityTitle: titleSourceName(singularTokens),
    entityLowerCamel: lowerCamelSourceName(singularTokens),
    collectionTitle: titleSourceName(pluralTokens),
    collectionLowerCamel: lowerCamelSourceName(pluralTokens),
    collectionPath: kebabSourceName(pluralTokens),
  };
}

function deduplicateSingularDomainTokens(
  tokens: readonly string[],
): readonly string[] {
  const result: string[] = [];
  for (const token of tokens) {
    if (result[result.length - 1] === token) {
      continue;
    }
    result.push(token);
  }
  return result;
}

function featureGoalDomainKey(
  value: string,
): string {
  return lowerCamelSourceName(sourceNameWords(value));
}

function statePluginSignalIsOptional(
  featureGoalTokens: readonly string[],
): boolean {
  return tokenSequenceIncludes(featureGoalTokens, ['only', 'if', 'it', 'helps'])
    || tokenSequenceIncludes(featureGoalTokens, ['if', 'it', 'helps'])
    || tokenSequenceIncludes(featureGoalTokens, ['if', 'helpful'])
    || tokenSequenceIncludes(featureGoalTokens, ['if', 'useful'])
    || tokenSequenceIncludes(featureGoalTokens, ['if', 'needed'])
    || tokenSequenceIncludes(featureGoalTokens, ['if', 'necessary'])
    || tokenSequenceIncludes(featureGoalTokens, ['when', 'needed']);
}

function tokenSequenceIncludes(
  tokens: readonly string[],
  sequence: readonly string[],
): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }
  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, offset) => tokens[index + offset] === token)) {
      return true;
    }
  }
  return false;
}

function guidanceRecipePlanReason(
  role: SemanticAuthoringGuidanceRecipePlanRow['role'],
  newFeatureSignals: readonly string[],
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
): string {
  const layers = uniqueValues(featureGoalSignals
    .filter((signal) => newFeatureSignals.includes(signal.key))
    .map((signal) => signal.planningLayer));
  const coverage = newFeatureSignals.join(', ');
  const layerText = layers.length === 0 ? 'feature signals' : layers.join(', ');
  return role === 'primary'
    ? `Start here because it covers the main ${layerText}: ${coverage}.`
    : `Use as a companion pattern for remaining ${layerText}: ${coverage}; merge relevant steps instead of applying a second full scaffold.`;
}
