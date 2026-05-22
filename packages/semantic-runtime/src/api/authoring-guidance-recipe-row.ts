import { uniqueValues } from '../collections.js';
import {
  buildAuthoringRecipePlan,
  defaultAuthoringRecipeAppName,
  expectedSemanticEffectsForPlan,
  isAuthoringRecipeKey,
  type AuthoringRecipeKey,
} from '../authoring/recipe.js';
import { authoringSourceParameterApplications } from '../authoring/source-parameter-application.js';
import { recipeGuidanceByKey } from './authoring-guidance-catalog.js';
import { semanticAuthoringPreferenceCatalogRows } from './authoring-catalog.js';
import {
  semanticAuthoringSourceParameterApplicationsHaveAppliedSourceText,
  semanticAuthoringSourcePatternUseSummary,
} from './authoring-source-pattern-display.js';
import { semanticAuthoringSourcePatternRow } from './authoring-source-pattern-row.js';
import {
  type SemanticAuthoringGuidanceRecipePlanRow,
  type SemanticAuthoringGuidanceRecipeRow,
  type SemanticAuthoringGuidanceSourceParameterContractRow,
  type SemanticAuthoringPreferenceCatalogRow,
  type SemanticAuthoringRecipeCatalogRow,
  type SemanticAuthoringSourceParameterValueInput,
  type SemanticAuthoringSourcePatternRow,
} from './contracts.js';

const COMPACT_GUIDANCE_SOURCE_PATTERN_MODULE_LIMIT = 10;
const COMPACT_GUIDANCE_SOURCE_PATTERN_PARAMETER_LIMIT = 8;
const COMPACT_GUIDANCE_SOURCE_PATTERN_ADAPTATION_GROUP_LIMIT = 3;
const COMPACT_GUIDANCE_SOURCE_PATTERN_NOTE_LIMIT = 1;

export function guidanceRecipePlanSequenceWithSourceParameterContracts(
  sequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
  recipes: readonly SemanticAuthoringRecipeCatalogRow[],
): readonly SemanticAuthoringGuidanceRecipePlanRow[] {
  if (sequence.length === 0) {
    return sequence;
  }
  return sequence.map((row) => ({
    ...row,
    suggestedSourceParameterContracts: guidanceSourceParameterContracts(row, recipes),
  }));
}

function guidanceSourceParameterContracts(
  row: SemanticAuthoringGuidanceRecipePlanRow,
  recipes: readonly SemanticAuthoringRecipeCatalogRow[],
): readonly SemanticAuthoringGuidanceSourceParameterContractRow[] {
  if (row.suggestedSourceParameterValues.length === 0) {
    return [];
  }
  const recipe = recipes.find((candidate) => candidate.key === row.recipeKey);
  const pattern = guidanceSourceParameterContractPattern(row, recipes) ?? recipe?.sourcePlan?.pattern ?? null;
  return row.suggestedSourceParameterValues.map((value) => {
    const parameter = pattern?.parameters.find((candidate) => candidate.key === value.key);
    if (parameter == null) {
      return {
        key: value.key,
        value: value.value,
        parameterKind: null,
        applicationPolicy: null,
        valueShape: null,
        summary: 'No source-pattern parameter with this key exists on the selected recipe.',
      };
    }
    return {
      key: value.key,
      value: value.value,
      parameterKind: parameter.kind,
      applicationPolicy: parameter.applicationPolicy,
      valueShape: parameter.valueShape,
      summary: parameter.summary,
    };
  });
}

function guidanceSourceParameterContractPattern(
  row: SemanticAuthoringGuidanceRecipePlanRow,
  recipes: readonly SemanticAuthoringRecipeCatalogRow[],
): SemanticAuthoringSourcePatternRow | null {
  if (!isAuthoringRecipeKey(row.recipeKey)) {
    return null;
  }
  const recipe = recipes.find((candidate) => candidate.key === row.recipeKey);
  if (recipe == null) {
    return null;
  }
  return semanticAuthoringSourcePatternRow(buildAuthoringRecipePlan(
    row.recipeKey,
    '.',
    defaultAuthoringRecipeAppName(row.recipeKey),
    { sourceParameterValues: row.suggestedSourceParameterValues },
  ).sourcePlan?.pattern ?? null);
}

export function guidanceRecipeRow(
  recipeKey: AuthoringRecipeKey,
  recipe: SemanticAuthoringRecipeCatalogRow,
  detail: 'compact' | 'recipes',
  suggestedSourceParameterValues: readonly SemanticAuthoringSourceParameterValueInput[] = [],
): SemanticAuthoringGuidanceRecipeRow {
  const guidance = recipeGuidanceByKey[recipeKey];
  const includeExpandedRecipeShape = detail === 'recipes';
  const sourceParameterizedPlan = guidanceRecipePlanForSourceParameters(recipeKey, suggestedSourceParameterValues);
  const recipePreferences = sourceParameterizedPlan == null
    ? recipe.preferences
    : semanticAuthoringPreferenceCatalogRows(sourceParameterizedPlan.intent.preferences);
  const tasteValues = compactTasteValues(recipePreferences);
  const sourcePattern = guidanceRecipeSourcePattern(recipe, sourceParameterizedPlan, suggestedSourceParameterValues);
  const sourceAwareGuidance = guidanceRecipeText(recipeKey, guidance, sourcePattern);
  const expectedEffects = sourceParameterizedPlan == null
    ? null
    : expectedSemanticEffectsForPlan(sourceParameterizedPlan);
  const expectedEffectKinds = expectedEffects == null
    ? recipe.expectedEffectKinds
    : uniqueValues(expectedEffects.map((effect) => effect.effectKind));
  const sourcePlan = sourceParameterizedPlan?.sourcePlan ?? null;
  return {
    recipeKey,
    title: recipe.title,
    supportState: recipe.supportState,
    whenToUse: sourceAwareGuidance.whenToUse,
    codeShape: sourceAwareGuidance.codeShape,
    prefer: includeExpandedRecipeShape ? sourceAwareGuidance.prefer : sourceAwareGuidance.prefer.slice(0, 1),
    avoid: includeExpandedRecipeShape ? sourceAwareGuidance.avoid : sourceAwareGuidance.avoid.slice(0, 1),
    operationKinds: includeExpandedRecipeShape ? recipe.operationKinds : [],
    tasteValueKeys: uniqueValues(tasteValues.map((preference) => preference.valueKey)),
    tasteValues: includeExpandedRecipeShape ? tasteValues : [],
    expectedEffectKinds: includeExpandedRecipeShape ? expectedEffectKinds : [],
    expectedEffectCount: expectedEffects?.length ?? recipe.expectedEffectCount,
    sourceFileCount: sourcePlan?.files.length ?? recipe.sourcePlan?.fileCount ?? 0,
    sourcePattern: guidanceSourcePatternRow(sourcePattern, includeExpandedRecipeShape),
    sourceFileRoles: includeExpandedRecipeShape
      ? uniqueValues(sourcePlan?.files.map((file) => file.role) ?? recipe.sourcePlan?.fileRoles ?? [])
      : [],
    projectToolingPolicy: sourcePlan?.policy.packageToolingPolicy ?? recipe.sourcePlan?.packageToolingPolicy ?? null,
    followUpSurfaces: followUpSurfacesForRecipe(recipe),
  };
}

function guidanceRecipePlanForSourceParameters(
  recipeKey: AuthoringRecipeKey,
  suggestedSourceParameterValues: readonly SemanticAuthoringSourceParameterValueInput[],
): ReturnType<typeof buildAuthoringRecipePlan> | null {
  if (suggestedSourceParameterValues.length === 0) {
    return null;
  }
  return buildAuthoringRecipePlan(
    recipeKey,
    '.',
    defaultAuthoringRecipeAppName(recipeKey),
    { sourceParameterValues: suggestedSourceParameterValues },
  );
}

function guidanceRecipeSourcePattern(
  recipe: SemanticAuthoringRecipeCatalogRow,
  sourceParameterizedPlan: ReturnType<typeof buildAuthoringRecipePlan> | null,
  suggestedSourceParameterValues: readonly SemanticAuthoringSourceParameterValueInput[],
): SemanticAuthoringSourcePatternRow | null {
  if (sourceParameterizedPlan == null) {
    return recipe.sourcePlan?.pattern ?? null;
  }
  const sourcePlan = sourceParameterizedPlan.sourcePlan;
  const pattern = semanticAuthoringSourcePatternRow(sourcePlan?.pattern ?? null);
  if (sourcePlan == null || pattern == null) {
    return pattern;
  }
  const sourceParameterApplications = authoringSourceParameterApplications(
    sourcePlan,
    suggestedSourceParameterValues,
  );
  return {
    ...pattern,
    useSummary: semanticAuthoringSourcePatternUseSummary(
      pattern,
      semanticAuthoringSourceParameterApplicationsHaveAppliedSourceText(sourceParameterApplications),
    ),
  };
}

interface RecipeGuidanceText {
  readonly whenToUse: string;
  readonly codeShape: string;
  readonly prefer: readonly string[];
  readonly avoid: readonly string[];
}

function guidanceRecipeText(
  recipeKey: AuthoringRecipeKey,
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow | null,
): RecipeGuidanceText {
  if (sourcePattern == null) {
    return guidance;
  }
  switch (recipeKey) {
    case 'searchable-data-table':
      return searchableTableGuidanceText(guidance, sourcePattern);
    case 'routed-searchable-data-table':
      return routedSearchableTableGuidanceText(guidance, sourcePattern);
    case 'catalog-storefront':
      return catalogGuidanceText(guidance, sourcePattern);
    case 'routed-catalog-storefront':
      return routedCatalogGuidanceText(guidance, sourcePattern);
    case 'state-backed-form':
    case 'validated-state-backed-form':
    case 'localized-state-backed-form':
    case 'localized-validated-state-backed-form':
      return stateBackedFormGuidanceText(guidance, sourcePattern);
    case 'service-backed-form':
      return serviceBackedFormGuidanceText(guidance, sourcePattern);
    default:
      return guidance;
  }
}

function stateBackedFormGuidanceText(
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow,
): RecipeGuidanceText {
  if (!isDraftRequestFormPattern(sourcePattern)) {
    return guidance;
  }
  return {
    ...guidance,
    whenToUse: 'Use for ordinary create/submit form starters whose durable draft state belongs in an injectable app state class.',
    codeShape: 'DI-owned draft domain object, direct draft-object template bindings, native form value channels, a submit-readiness getter on the domain class, and no scalar ID component boundary.',
    prefer: [
      'Bind fields directly to the template-local draft object and let the state/domain class own submit behavior.',
      ...guidance.prefer,
    ],
    avoid: [
      'Do not scaffold selected-object IDs, maps, or route-like lookup state for simple create/submit forms.',
      ...guidance.avoid,
    ],
  };
}

function serviceBackedFormGuidanceText(
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow,
): RecipeGuidanceText {
  if (!isDraftRequestFormPattern(sourcePattern)) {
    return guidance;
  }
  return {
    ...guidance,
    whenToUse: 'Use for API-backed create/submit form starters where durable draft state belongs in an injectable state class and only submission crosses the service boundary.',
    codeShape: 'DI-owned draft domain object, injected service submission boundary, direct draft-object template bindings, native form value channels, a submit-readiness getter on the domain class, and no scalar ID component boundary.',
    prefer: [
      'Let the state own the draft object and service dependency; bind fields to the template-local draft object and submit through the state method.',
      ...guidance.prefer,
    ],
    avoid: [
      'Do not scaffold selected-object IDs, maps, loading collections, or route-like lookup state for API-backed create/submit forms.',
      ...guidance.avoid,
    ],
  };
}

function searchableTableGuidanceText(
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow,
): RecipeGuidanceText {
  if (!isCompactSearchOnlyTablePattern(sourcePattern)) {
    return guidance;
  }
  return {
    ...guidance,
    whenToUse: 'Use for searchable list/table starters where the caller supplied a domain but did not ask for facet filters, sorting, pagination, or selection.',
    codeShape: 'DI-owned table/list state, service-backed loading, direct state/domain template bindings, a native search value channel with debounce, keyed repeats, and getter-observed filtered-list projections.',
    prefer: [
      'Bind search directly to nested state and rows directly to the template-local domain object.',
      'Add facet filters, sort, pagination, and selection only when the caller domain or workflow actually needs them.',
    ],
    avoid: [
      'Do not scaffold checked selection, select filters, sort state, or pagination merely because the full reference table contains them.',
      ...guidance.avoid,
    ],
  };
}

function routedSearchableTableGuidanceText(
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow,
): RecipeGuidanceText {
  if (!isCompactSearchOnlyTablePattern(sourcePattern)) {
    return guidance;
  }
  return {
    ...guidance,
    whenToUse: 'Use for routed searchable list/detail starters where the caller supplied a domain but did not ask for facet filters, sorting, pagination, or selection.',
    codeShape: 'Router admission, list/detail routes, route-context parameter reads, data-driven row links, DI-owned table/list state, a native search value channel with debounce, keyed repeats, and getter-observed filtered-list projections.',
    prefer: [
      'Let routing own selected identity while the table state owns loading and search filtering.',
      'Add richer table controls only when the route-owned workflow genuinely needs them.',
    ],
    avoid: [
      'Do not scaffold selection, sort, pagination, or facet controls merely because the full routed reference table contains them.',
      ...guidance.avoid,
    ],
  };
}

function catalogGuidanceText(
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow,
): RecipeGuidanceText {
  if (!isCompactCatalogPattern(sourcePattern)) {
    return guidance;
  }
  return {
    ...guidance,
    whenToUse: 'Use for searchable catalog/list starters where the caller supplied a domain and did not ask for selection actions, separate card components, pricing, availability, or merchandising presentation.',
    codeShape: 'DI-owned catalog state, service-backed loading, direct search bindings, inline list-card markup, direct state/domain template reads, template-controller flow, and getter-observed collection projection.',
    prefer: [
      'Keep caller-domain catalog state small until stock, badge/category, pricing, or selection behavior is actually requested.',
      ...guidance.prefer,
    ],
    avoid: [
      'Do not scaffold checked/select filters, merchandising presentation, or action-state extras merely because the full catalog reference contains them.',
      ...guidance.avoid,
    ],
  };
}

function routedCatalogGuidanceText(
  guidance: RecipeGuidanceText,
  sourcePattern: SemanticAuthoringSourcePatternRow,
): RecipeGuidanceText {
  if (!isCompactCatalogPattern(sourcePattern)) {
    return guidance;
  }
  return {
    ...guidance,
    whenToUse: 'Use for routed catalog/list-detail starters where route-owned identity, DI state, loading, direct item cards, and search filtering should be planned together before richer merchandising controls.',
    codeShape: 'Router admission, catalog list/detail routes, route-parameter selected state, DI-owned composed catalog state, service-backed loading, direct search bindings, state-owned selection/action methods, class/style presentation channels, and local object card handoff.',
    prefer: [
      'Keep route-owned identity and local object card boundaries explicit while leaving richer catalog controls out until requested.',
      ...guidance.prefer,
    ],
    avoid: [
      'Do not scaffold checked/select filters, merchandising presentation, or action-state extras merely because the full routed catalog reference contains them.',
      ...guidance.avoid,
    ],
  };
}

function isCompactSearchOnlyTablePattern(sourcePattern: SemanticAuthoringSourcePatternRow): boolean {
  return hasPatternModule(sourcePattern, 'collection-search-filter-controls')
    && !hasPatternModule(sourcePattern, 'collection-sort-controls')
    && !hasPatternModule(sourcePattern, 'collection-pagination-controls')
    && !hasPatternModule(sourcePattern, 'collection-selection-set-controls')
    && !hasPatternModule(sourcePattern, 'checked-collection-channel')
    && !hasPatternModule(sourcePattern, 'select-option-model-channel');
}

function isCompactCatalogPattern(sourcePattern: SemanticAuthoringSourcePatternRow): boolean {
  return hasPatternModule(sourcePattern, 'collection-search-filter-controls')
    && !hasPatternModule(sourcePattern, 'collection-selection-set-controls')
    && !hasPatternModule(sourcePattern, 'local-object-component-boundary')
    && !hasPatternModule(sourcePattern, 'class-style-channels')
    && !hasPatternModule(sourcePattern, 'checked-boolean-channel')
    && !hasPatternModule(sourcePattern, 'select-option-model-channel');
}

function isDraftRequestFormPattern(sourcePattern: SemanticAuthoringSourcePatternRow): boolean {
  return sourcePattern.parameters.some((parameter) => parameter.key === 'request-fields')
    && !sourcePattern.parameters.some((parameter) => parameter.key === 'request-selection-id');
}

function hasPatternModule(
  sourcePattern: SemanticAuthoringSourcePatternRow,
  key: string,
): boolean {
  return sourcePattern.modules.some((module) => module.key === key);
}

function guidanceSourcePatternRow(
  pattern: SemanticAuthoringSourcePatternRow | null,
  includeExpandedRecipeShape: boolean,
): SemanticAuthoringSourcePatternRow | null {
  if (pattern == null || includeExpandedRecipeShape) {
    return pattern;
  }
  return {
    ...pattern,
    adaptationNotes: pattern.adaptationNotes.slice(0, COMPACT_GUIDANCE_SOURCE_PATTERN_NOTE_LIMIT),
    modules: pattern.modules.slice(0, COMPACT_GUIDANCE_SOURCE_PATTERN_MODULE_LIMIT),
    parameters: pattern.parameters.slice(0, COMPACT_GUIDANCE_SOURCE_PATTERN_PARAMETER_LIMIT),
    adaptationGroups: pattern.adaptationGroups.slice(0, COMPACT_GUIDANCE_SOURCE_PATTERN_ADAPTATION_GROUP_LIMIT),
  };
}

function compactTasteValues(
  preferences: readonly SemanticAuthoringPreferenceCatalogRow[],
): readonly SemanticAuthoringPreferenceCatalogRow[] {
  const priorityValues = new Set([
    'di-owned-state-class',
    'di-owned-service-layer',
    'direct-state-domain-template-binding',
    'meaningful-viewmodel-adaptation',
    'source-backed-getter-observation',
    'scalar-id-inputs',
    'object-inputs',
    'native-control-value-binding',
    'checked-model-binding',
    'select-model-binding',
    'custom-matcher-comparison',
    'validation-controller-usage',
    'static-route-config',
    'route-parameter-selected-state',
    'viewport-layout-navigation',
    'plugin-registration-admission',
    'class-token-binding',
    'style-property-binding',
  ]);
  const selected = preferences.filter((preference) => priorityValues.has(String(preference.valueKey)));
  return selected.length > 0 ? selected : preferences.slice(0, 10);
}

function followUpSurfacesForRecipe(recipe: SemanticAuthoringRecipeCatalogRow): readonly string[] {
  const surfaces = [
    'authoring-recipe-plan',
    'app-overview',
    'authoring-orientation',
  ];
  if (recipe.expectedEffectKinds.some((kind) => String(kind).startsWith('route') || String(kind).includes('viewport'))) {
    surfaces.push('router-overview');
  }
  if (recipe.key.includes('validated')) {
    surfaces.push('template-diagnostics');
  }
  if (recipe.expectedEffectKinds.some((kind) => String(kind).startsWith('binding-'))) {
    surfaces.push('app-query-batch');
    surfaces.push('binding-data-flow-summary');
    surfaces.push('binding-value-channel-summary');
    surfaces.push('binding-observed-dependency-summary');
    surfaces.push('binding-data-flows');
    surfaces.push('binding-observed-dependencies');
  }
  return uniqueValues(surfaces);
}

export function requiredCatalogRecipe(
  recipes: readonly SemanticAuthoringRecipeCatalogRow[],
  recipeKey: AuthoringRecipeKey,
): SemanticAuthoringRecipeCatalogRow {
  const recipe = recipes.find((candidate) => candidate.key === recipeKey);
  if (recipe == null) {
    throw new Error(`Missing authoring catalog recipe ${recipeKey}.`);
  }
  return recipe;
}
