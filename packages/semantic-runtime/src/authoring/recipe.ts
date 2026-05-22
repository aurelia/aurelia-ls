import type {
  AuthoringOpenReasonKind,
  AuthoringOperationKind,
  AuthoringPreference,
  AuthoringSupportState,
} from './ontology.js';
import { buildCatalogStorefrontPlan } from './catalog-storefront-recipe.js';
import { buildComposedDashboardPlan } from './composed-dashboard-recipe.js';
import { buildConventionMinimalAppPlan } from './convention-minimal-app-recipe.js';
import { buildMinimalAppPlan } from './minimal-app-recipe.js';
import { buildMultiStepStateBackedFormPlan } from './multi-step-state-backed-form-recipe.js';
import { buildRoutedAppShellPlan } from './routed-app-shell-recipe.js';
import { buildRoutedCatalogStorefrontPlan } from './routed-catalog-storefront-recipe.js';
import { buildRoutedSearchableDataTablePlan } from './routed-searchable-data-table-recipe.js';
import { buildRoutedLocalizedValidatedStateBackedFormPlan, buildRoutedServiceBackedFormPlan, buildRoutedServiceValidatedStateBackedFormPlan, buildRoutedStateBackedFormPlan, buildRoutedValidatedStateBackedFormPlan } from './routed-state-backed-form-recipe.js';
import { buildSearchableDataTablePlan } from './searchable-data-table-recipe.js';
import { buildServiceBackedFormPlan } from './service-backed-form-recipe.js';
import {
  buildLocalizedStateBackedFormPlan,
  buildLocalizedValidatedStateBackedFormPlan,
  buildStateBackedFormPlan,
  buildValidatedStateBackedFormPlan,
} from './state-backed-form-recipe.js';
import { buildStateStoreListPlan } from './state-store-list-recipe.js';
import {
  applyCatalogSourceParameterValues,
  applyFormSourceParameterValues,
  applyMultiStepFormSourceParameterValues,
  applyRoutedAppShellSourceParameterValues,
  applyRoutedCatalogSourceParameterValues,
  applyRoutedFormSourceParameterValues,
  applyRoutedTableSourceParameterValues,
  applyServiceBackedFormSourceParameterValues,
  applyStateStoreListSourceParameterValues,
  applyTableSourceParameterValues,
} from './source-parameter-application.js';
import type {
  AuthoringPlan,
} from './plan.js';
import {
  expectedSemanticEffectContractKey,
  type ExpectedSemanticEffect,
} from './expected-effect.js';
import type { AuthoringSourceEditPlan } from './source-plan.js';
import type { AuthoringSourcePatternParameterValue } from './source-plan.js';

export type AuthoringRecipeKey =
  /** Smallest useful app shell recipe with a source plan and reopenable expected effects. */
  | 'minimal-app'
  /** Minimal app shell using the currently modeled Aurelia source/template conventions. */
  | 'convention-minimal-app'
  /** Minimal routed app shell with RouterConfiguration, static route config, navigation links, and au-viewport. */
  | 'routed-app-shell'
  /** DI-owned state plus a native form component; first concrete generated-intent recipe. */
  | 'state-backed-form'
  /** State-backed form plus i18n configuration, translation-key resources, and translated template text. */
  | 'localized-state-backed-form'
  /** State-backed form plus validation-html configuration, validate bindings, and validation service ownership. */
  | 'validated-state-backed-form'
  /** State-backed form plus i18n and validation-html plugin ownership in one common app slice. */
  | 'localized-validated-state-backed-form'
  /** State-backed multi-step form with validation, repeated steps, and class/style progress presentation. */
  | 'multi-step-state-backed-form'
  /** DI-owned state plus an injected service boundary for loading/submission side effects. */
  | 'service-backed-form'
  /** State-backed form with route admission and routeable component ownership; waits on router substrate. */
  | 'routed-state-backed-form'
  /** Routed state-backed form plus validation-html configuration and route-selected validation ownership. */
  | 'routed-validated-state-backed-form'
  /** Routed state-backed form plus an injected service boundary for loading/submission side effects. */
  | 'routed-service-backed-form'
  /** Routed service-backed form plus validation-html ownership over the loaded route-selected record. */
  | 'routed-service-validated-state-backed-form'
  /** Routed state-backed form plus i18n and validation-html plugin ownership in one common app slice. */
  | 'routed-localized-validated-state-backed-form'
  /** DI-owned composed state, service-backed loading, list rendering, and scalar-ID component boundaries. */
  | 'catalog-storefront'
  /** Catalog storefront plus common router admission, item/detail route params, and route-aware state selection. */
  | 'routed-catalog-storefront'
  /** DI-owned data-table state with search, filter, sort, pagination, selection, and native value channels. */
  | 'searchable-data-table'
  /** Searchable data-table state plus common list/detail router admission and route-selected detail state. */
  | 'routed-searchable-data-table'
  /** DI-owned widget state with dynamic AuCompose component composition. */
  | 'composed-dashboard'
  /** Plugin-backed @aurelia/state stores plus state binding commands and behavior usage. */
  | 'state-store-list';

export const AUTHORING_RECIPE_KEYS = [
  'minimal-app',
  'convention-minimal-app',
  'routed-app-shell',
  'state-backed-form',
  'localized-state-backed-form',
  'validated-state-backed-form',
  'localized-validated-state-backed-form',
  'multi-step-state-backed-form',
  'service-backed-form',
  'routed-state-backed-form',
  'routed-validated-state-backed-form',
  'routed-service-backed-form',
  'routed-service-validated-state-backed-form',
  'routed-localized-validated-state-backed-form',
  'catalog-storefront',
  'routed-catalog-storefront',
  'searchable-data-table',
  'routed-searchable-data-table',
  'composed-dashboard',
  'state-store-list',
] as const satisfies readonly AuthoringRecipeKey[];

export function isAuthoringRecipeKey(value: string): value is AuthoringRecipeKey {
  return AUTHORING_RECIPE_KEYS.some((key) => key === value);
}

/** Named recipe surface the authoring API may advertise before it can emit source text. */
export class AuthoringRecipeDescriptor<TKey extends AuthoringRecipeKey = AuthoringRecipeKey> {
  readonly kind = 'authoring-recipe-descriptor' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    readonly operationKinds: readonly AuthoringOperationKind[],
    /** Direct recipe bases whose source/effect shape this recipe intentionally contains. */
    readonly baseRecipeKeys: readonly AuthoringRecipeKey[],
    /** Whether semantic-runtime can currently plan, edit, and/or verify this recipe family. */
    readonly supportState: AuthoringSupportState,
    /** Open product gaps that remain after the current recipe substrate is accounted for. */
    readonly openReasonKinds: readonly AuthoringOpenReasonKind[],
    readonly summary: string,
  ) {}
}

export const AuthoringRecipeDescriptors = {
  MinimalApp: new AuthoringRecipeDescriptor(
    'minimal-app',
    'Minimal App',
    ['create-project-files', 'create-entrypoint', 'create-root-component', 'create-external-template', 'verify-app'],
    [],
    'editable',
    ['package-tooling-policy-open'],
    'Minimal app has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects; build-tool emission remains open.',
  ),
  ConventionMinimalApp: new AuthoringRecipeDescriptor(
    'convention-minimal-app',
    'Convention Minimal App',
    ['create-project-files', 'create-entrypoint', 'create-root-component', 'create-external-template', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'Convention minimal app has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for the currently modeled convention-derived resource and template pair; build-tool emission remains open.',
  ),
  RoutedAppShell: new AuthoringRecipeDescriptor(
    'routed-app-shell',
    'Routed App Shell',
    ['create-project-files', 'configure-router', 'add-route', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-component', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed app shell has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for RouterConfiguration, static route config, named au-viewport layout, route params, query values, fragments, and routeable components; build-tool emission remains open.',
  ),
  StateBackedForm: new AuthoringRecipeDescriptor(
    'state-backed-form',
    'State-Backed Form',
    ['create-project-files', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'State-backed form has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects; build-tool emission remains open.',
  ),
  LocalizedStateBackedForm: new AuthoringRecipeDescriptor(
    'localized-state-backed-form',
    'Localized State-Backed Form',
    ['create-project-files', 'configure-plugin', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Localized state-backed form extends the generated form lane through @aurelia/i18n configuration, static translation resources, t/t-params bindings, recipe-baseline package/typecheck tooling, and verification effects; build-tool emission remains open.',
  ),
  ValidatedStateBackedForm: new AuthoringRecipeDescriptor(
    'validated-state-backed-form',
    'Validated State-Backed Form',
    ['create-project-files', 'configure-plugin', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Validated state-backed form extends the generated form lane through validation-html configuration, validation services, static blur validate bindings, recipe-baseline package/typecheck tooling, and verification effects; build-tool emission remains open.',
  ),
  LocalizedValidatedStateBackedForm: new AuthoringRecipeDescriptor(
    'localized-validated-state-backed-form',
    'Localized Validated State-Backed Form',
    ['create-project-files', 'configure-plugin', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['localized-state-backed-form', 'validated-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Localized validated state-backed form combines @aurelia/i18n and validation-html around the same DI-owned form state, translated form text, validate bindings, validation-errors targets, recipe-baseline package/typecheck tooling, and verification effects; build-tool emission remains open.',
  ),
  MultiStepStateBackedForm: new AuthoringRecipeDescriptor(
    'multi-step-state-backed-form',
    'Multi-Step State-Backed Form',
    ['create-project-files', 'configure-plugin', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['validated-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Multi-step state-backed form combines DI-owned state, composed profile state, validation-html, repeat/if step rendering, native value/checked/select channels, and class/style progress presentation; build-tool emission remains open.',
  ),
  ServiceBackedForm: new AuthoringRecipeDescriptor(
    'service-backed-form',
    'Service-Backed Form',
    ['create-project-files', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Service-backed form has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for DI-owned state that owns an injected service boundary; build-tool emission remains open.',
  ),
  RoutedStateBackedForm: new AuthoringRecipeDescriptor(
    'routed-state-backed-form',
    'Routed State-Backed Form',
    ['configure-router', 'add-route', 'create-state-model', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed form has a concrete plan, source edit plan, recipe-baseline package/typecheck tooling, and verified effects for route config, viewport layout, route tree, recognizer, and component-agent topology; build-tool emission remains open.',
  ),
  RoutedValidatedStateBackedForm: new AuthoringRecipeDescriptor(
    'routed-validated-state-backed-form',
    'Routed Validated State-Backed Form',
    ['create-project-files', 'configure-plugin', 'configure-router', 'add-route', 'create-state-model', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['routed-state-backed-form', 'validated-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed validated form combines route-owned request selection with validation-html configuration, validation services, validate bindings, validation-errors targets, and route expected effects; build-tool emission remains open.',
  ),
  RoutedServiceBackedForm: new AuthoringRecipeDescriptor(
    'routed-service-backed-form',
    'Routed Service-Backed Form',
    ['create-project-files', 'configure-router', 'add-route', 'create-state-model', 'create-service', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['routed-state-backed-form', 'service-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed service-backed form combines route-owned request selection with DI-owned state and an injected service boundary for background loading and submission side effects; build-tool emission remains open.',
  ),
  RoutedServiceValidatedStateBackedForm: new AuthoringRecipeDescriptor(
    'routed-service-validated-state-backed-form',
    'Routed Service Validated State-Backed Form',
    ['create-project-files', 'configure-plugin', 'configure-router', 'add-route', 'create-state-model', 'create-service', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['routed-service-backed-form', 'routed-validated-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed service validated form combines route-owned request selection with DI-owned service-backed loading/submission and validation-html over the same route-selected request state; build-tool emission remains open.',
  ),
  RoutedLocalizedValidatedStateBackedForm: new AuthoringRecipeDescriptor(
    'routed-localized-validated-state-backed-form',
    'Routed Localized Validated State-Backed Form',
    ['create-project-files', 'configure-plugin', 'configure-router', 'add-route', 'create-state-model', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['routed-state-backed-form', 'localized-validated-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed localized validated form combines common route-owned form composition with @aurelia/i18n and validation-html over the same DI-owned request state; build-tool emission remains open.',
  ),
  CatalogStorefront: new AuthoringRecipeDescriptor(
    'catalog-storefront',
    'Catalog Storefront',
    ['create-project-files', 'create-domain-model', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'create-component', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'Catalog storefront has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for composed DI-owned state, service-backed loading, list rendering, and local typed object component handoff; build-tool emission remains open.',
  ),
  RoutedCatalogStorefront: new AuthoringRecipeDescriptor(
    'routed-catalog-storefront',
    'Routed Catalog Storefront',
    ['create-project-files', 'configure-router', 'add-route', 'create-domain-model', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'create-component', 'add-template-binding', 'verify-app'],
    ['catalog-storefront', 'routed-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed catalog storefront combines the catalog recipe with common router admission, item list/detail route configs, root static detail navigation, data-driven card links, route parameter selected state, and route expected effects; build-tool emission remains open.',
  ),
  SearchableDataTable: new AuthoringRecipeDescriptor(
    'searchable-data-table',
    'Searchable Data Table',
    ['create-project-files', 'create-domain-model', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'create-component', 'add-template-binding', 'verify-app'],
    ['minimal-app', 'service-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Searchable data table combines DI-owned composed state, service-backed loading, direct state/domain template bindings, native value/select/checked channels, debounce, keyed repeats, class/style channels, and source-backed getter observation; build-tool emission remains open.',
  ),
  RoutedSearchableDataTable: new AuthoringRecipeDescriptor(
    'routed-searchable-data-table',
    'Routed Searchable Data Table',
    ['create-project-files', 'configure-router', 'add-route', 'create-domain-model', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'create-component', 'add-template-binding', 'verify-app'],
    ['searchable-data-table', 'routed-state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Routed searchable data table combines the data-table recipe with common router admission, list/detail route configs, root static profile navigation, data-driven row links, route parameter selected detail state, and route expected effects; build-tool emission remains open.',
  ),
  ComposedDashboard: new AuthoringRecipeDescriptor(
    'composed-dashboard',
    'Composed Dashboard',
    ['create-project-files', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-widget-component', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'Composed dashboard has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for DI-owned widget state plus dynamic AuCompose component composition; build-tool emission remains open.',
  ),
  StateStoreList: new AuthoringRecipeDescriptor(
    'state-store-list',
    'State Store List',
    ['create-project-files', 'configure-plugin', 'configure-state-store', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'State Store List has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for @aurelia/state store configuration plus state binding command/behavior usage; build-tool emission remains open.',
  ),
} as const;

const expectedEffectsByRecipe = new Map<AuthoringRecipeKey, readonly ExpectedSemanticEffect[]>();
const preferencesByRecipe = new Map<AuthoringRecipeKey, readonly AuthoringPreference[]>();
const plansByRecipe = new Map<AuthoringRecipeKey, AuthoringPlan>();

validateAuthoringRecipeDescriptors();

export interface AuthoringRecipeBuildOptions {
  readonly sourceParameterValues?: readonly AuthoringSourcePatternParameterValue[] | null;
}

export function buildAuthoringRecipePlan(
  key: AuthoringRecipeKey,
  rootDir: string = '.',
  appName: string = defaultAuthoringRecipeAppName(key),
  options: AuthoringRecipeBuildOptions = {},
): AuthoringPlan {
  const sourceParameterValues = options.sourceParameterValues ?? [];
  switch (key) {
    case 'minimal-app':
      return buildMinimalAppPlan({ rootDir, appName });
    case 'convention-minimal-app':
      return buildConventionMinimalAppPlan({ rootDir, appName });
    case 'routed-app-shell':
      return buildRoutedAppShellPlan(applyRoutedAppShellSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'state-backed-form':
      return buildStateBackedFormPlan(applyFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'localized-state-backed-form':
      return buildLocalizedStateBackedFormPlan(applyFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'validated-state-backed-form':
      return buildValidatedStateBackedFormPlan(applyFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'localized-validated-state-backed-form':
      return buildLocalizedValidatedStateBackedFormPlan(applyFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'multi-step-state-backed-form':
      return buildMultiStepStateBackedFormPlan(applyMultiStepFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'service-backed-form':
      return buildServiceBackedFormPlan(applyServiceBackedFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-state-backed-form':
      return buildRoutedStateBackedFormPlan(applyRoutedFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-validated-state-backed-form':
      return buildRoutedValidatedStateBackedFormPlan(applyRoutedFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-service-backed-form':
      return buildRoutedServiceBackedFormPlan(applyRoutedFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-service-validated-state-backed-form':
      return buildRoutedServiceValidatedStateBackedFormPlan(applyRoutedFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-localized-validated-state-backed-form':
      return buildRoutedLocalizedValidatedStateBackedFormPlan(applyRoutedFormSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'catalog-storefront':
      return buildCatalogStorefrontPlan(applyCatalogSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-catalog-storefront':
      return buildRoutedCatalogStorefrontPlan(applyRoutedCatalogSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'searchable-data-table':
      return buildSearchableDataTablePlan(applyTableSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'routed-searchable-data-table':
      return buildRoutedSearchableDataTablePlan(applyRoutedTableSourceParameterValues({ rootDir, appName }, sourceParameterValues));
    case 'composed-dashboard':
      return buildComposedDashboardPlan({ rootDir, appName });
    case 'state-store-list':
      return buildStateStoreListPlan(applyStateStoreListSourceParameterValues({ rootDir, appName }, sourceParameterValues));
  }
}

export function defaultAuthoringRecipeAppName(
  key: AuthoringRecipeKey,
): string {
  return recipeDescriptorForKey(key).title;
}

export function expectedSemanticEffectsForRecipe(
  key: AuthoringRecipeKey,
): readonly ExpectedSemanticEffect[] {
  const cached = expectedEffectsByRecipe.get(key);
  if (cached != null) {
    return cached;
  }
  const expectedEffects = expectedSemanticEffectsForPlan(cachedAuthoringRecipePlan(key));
  expectedEffectsByRecipe.set(key, expectedEffects);
  return expectedEffects;
}

export function expectedSemanticEffectsForPlan(
  plan: AuthoringPlan,
): readonly ExpectedSemanticEffect[] {
  return dedupeExpectedSemanticEffects(plan.steps.flatMap((step) => step.expectedEffects));
}

export function preferencesForRecipe(
  key: AuthoringRecipeKey,
): readonly AuthoringPreference[] {
  const cached = preferencesByRecipe.get(key);
  if (cached != null) {
    return cached;
  }
  const preferences = cachedAuthoringRecipePlan(key).intent.preferences;
  preferencesByRecipe.set(key, preferences);
  return preferences;
}

export function sourcePlanForRecipe(
  key: AuthoringRecipeKey,
): AuthoringSourceEditPlan | null {
  return cachedAuthoringRecipePlan(key).sourcePlan;
}

export function baseRecipeKeysForRecipe(
  key: AuthoringRecipeKey,
): readonly AuthoringRecipeKey[] {
  return recipeDescriptorForKey(key).baseRecipeKeys;
}

export function recipeLineageKeysForRecipe(
  key: AuthoringRecipeKey,
): readonly AuthoringRecipeKey[] {
  const lineage: AuthoringRecipeKey[] = [];
  appendRecipeLineage(key, new Set(), new Set(), lineage);
  return lineage;
}

export function recipeSpecificityRankForRecipe(
  key: AuthoringRecipeKey,
): number {
  return recipeLineageKeysForRecipe(key).length;
}

function cachedAuthoringRecipePlan(
  key: AuthoringRecipeKey,
): AuthoringPlan {
  const cached = plansByRecipe.get(key);
  if (cached != null) {
    return cached;
  }
  const plan = buildAuthoringRecipePlan(key);
  plansByRecipe.set(key, plan);
  return plan;
}

function recipeDescriptorForKey(
  key: AuthoringRecipeKey,
): typeof AuthoringRecipeDescriptors[keyof typeof AuthoringRecipeDescriptors] {
  const descriptor = Object.values(AuthoringRecipeDescriptors)
    .find((candidate) => candidate.key === key);
  if (descriptor == null) {
    throw new Error(`Unknown authoring recipe key: ${key}`);
  }
  return descriptor;
}

function appendRecipeLineage(
  key: AuthoringRecipeKey,
  seen: Set<AuthoringRecipeKey>,
  visiting: Set<AuthoringRecipeKey>,
  lineage: AuthoringRecipeKey[],
): void {
  if (visiting.has(key)) {
    throw new Error(`Cyclic authoring recipe lineage at ${key}`);
  }
  visiting.add(key);
  for (const baseKey of recipeDescriptorForKey(key).baseRecipeKeys) {
    appendRecipeLineage(baseKey, seen, visiting, lineage);
    if (!seen.has(baseKey)) {
      seen.add(baseKey);
      lineage.push(baseKey);
    }
  }
  visiting.delete(key);
}

function validateAuthoringRecipeDescriptors(): void {
  const descriptorKeys = new Set(Object.values(AuthoringRecipeDescriptors).map((descriptor) => descriptor.key));
  for (const key of AUTHORING_RECIPE_KEYS) {
    if (!descriptorKeys.has(key)) {
      throw new Error(`Missing authoring recipe descriptor for ${key}`);
    }
  }
  for (const descriptor of Object.values(AuthoringRecipeDescriptors)) {
    if (!AUTHORING_RECIPE_KEYS.some((key) => key === descriptor.key)) {
      throw new Error(`Authoring recipe descriptor uses unknown key ${descriptor.key}`);
    }
    recipeLineageKeysForRecipe(descriptor.key);
  }
}

function dedupeExpectedSemanticEffects(
  effects: readonly ExpectedSemanticEffect[],
): readonly ExpectedSemanticEffect[] {
  const byKey = new Map<string, ExpectedSemanticEffect>();
  for (const effect of effects) {
    const key = expectedSemanticEffectContractKey(effect);
    const existing = byKey.get(key);
    if (existing == null || expectedSemanticEffectRoleRank(effect) > expectedSemanticEffectRoleRank(existing)) {
      byKey.set(key, effect);
    }
  }
  return [...byKey.values()];
}

function expectedSemanticEffectRoleRank(effect: ExpectedSemanticEffect): number {
  switch (effect.role) {
    case 'discriminator':
      return 2;
    case 'signature':
      return 1;
    case 'baseline':
      return 0;
  }
}

export { buildMinimalAppPlan, type MinimalAppRecipeRequest } from './minimal-app-recipe.js';
export { buildConventionMinimalAppPlan, type ConventionMinimalAppRecipeRequest } from './convention-minimal-app-recipe.js';
export { buildRoutedAppShellPlan, type RoutedAppShellRecipeRequest } from './routed-app-shell-recipe.js';
export { buildCatalogStorefrontPlan, type CatalogStorefrontRecipeRequest } from './catalog-storefront-recipe.js';
export { buildComposedDashboardPlan, type ComposedDashboardRecipeRequest } from './composed-dashboard-recipe.js';
export { buildMultiStepStateBackedFormPlan, type MultiStepStateBackedFormRecipeRequest } from './multi-step-state-backed-form-recipe.js';
export { buildRoutedCatalogStorefrontPlan, type RoutedCatalogStorefrontRecipeRequest } from './routed-catalog-storefront-recipe.js';
export { buildRoutedSearchableDataTablePlan, type RoutedSearchableDataTableRecipeRequest } from './routed-searchable-data-table-recipe.js';
export { buildRoutedLocalizedValidatedStateBackedFormPlan, buildRoutedServiceBackedFormPlan, buildRoutedServiceValidatedStateBackedFormPlan, buildRoutedStateBackedFormPlan, buildRoutedValidatedStateBackedFormPlan, type RoutedStateBackedFormRecipeRequest } from './routed-state-backed-form-recipe.js';
export { buildSearchableDataTablePlan, type SearchableDataTableRecipeRequest } from './searchable-data-table-recipe.js';
export { buildServiceBackedFormPlan, type ServiceBackedFormRecipeRequest } from './service-backed-form-recipe.js';
export { buildLocalizedStateBackedFormPlan, buildLocalizedValidatedStateBackedFormPlan, buildStateBackedFormPlan, buildValidatedStateBackedFormPlan, type StateBackedFormRecipeRequest } from './state-backed-form-recipe.js';
export { buildStateStoreListPlan, type StateStoreListRecipeRequest } from './state-store-list-recipe.js';
