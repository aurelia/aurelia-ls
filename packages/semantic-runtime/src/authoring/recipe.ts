import type {
  AuthoringOpenReasonKind,
  AuthoringOperationKind,
  AuthoringPreference,
  AuthoringSupportState,
} from './ontology.js';
import { buildCatalogStorefrontPlan } from './catalog-storefront-recipe.js';
import { buildComposedDashboardPlan } from './composed-dashboard-recipe.js';
import { buildMinimalAppPlan } from './minimal-app-recipe.js';
import { buildRoutedStateBackedFormPlan } from './routed-state-backed-form-recipe.js';
import { buildServiceBackedFormPlan } from './service-backed-form-recipe.js';
import { buildLocalizedStateBackedFormPlan, buildStateBackedFormPlan, buildValidatedStateBackedFormPlan } from './state-backed-form-recipe.js';
import { buildStateStoreTodoPlan } from './state-store-todo-recipe.js';
import type {
  AuthoringPlan,
} from './plan.js';
import {
  expectedSemanticEffectContractKey,
  type ExpectedSemanticEffect,
} from './expected-effect.js';
import type { AuthoringSourceEditPlan } from './source-plan.js';

export type AuthoringRecipeKey =
  /** Smallest useful app shell recipe with a source plan and reopenable expected effects. */
  | 'minimal-app'
  /** DI-owned state plus a native form component; first concrete generated-intent recipe. */
  | 'state-backed-form'
  /** State-backed form plus i18n configuration, translation-key resources, and translated template text. */
  | 'localized-state-backed-form'
  /** State-backed form plus validation-html configuration, validate bindings, and validation service ownership. */
  | 'validated-state-backed-form'
  /** DI-owned state plus an injected service boundary for loading/submission side effects. */
  | 'service-backed-form'
  /** State-backed form with route admission and routeable component ownership; waits on router substrate. */
  | 'routed-state-backed-form'
  /** DI-owned composed state, service-backed loading, list rendering, and scalar-ID component boundaries. */
  | 'catalog-storefront'
  /** DI-owned widget state with dynamic AuCompose component composition. */
  | 'composed-dashboard'
  /** Plugin-backed @aurelia/state stores plus state binding commands and behavior usage. */
  | 'state-store-todo';

export const AUTHORING_RECIPE_KEYS = [
  'minimal-app',
  'state-backed-form',
  'localized-state-backed-form',
  'validated-state-backed-form',
  'service-backed-form',
  'routed-state-backed-form',
  'catalog-storefront',
  'composed-dashboard',
  'state-store-todo',
] as const satisfies readonly AuthoringRecipeKey[];

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
  CatalogStorefront: new AuthoringRecipeDescriptor(
    'catalog-storefront',
    'Catalog Storefront',
    ['create-project-files', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'create-component', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'Catalog storefront has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for composed DI-owned state, service-backed loading, list rendering, and scalar-ID component handoff; build-tool emission remains open.',
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
  StateStoreTodo: new AuthoringRecipeDescriptor(
    'state-store-todo',
    'State Store Todo',
    ['create-project-files', 'configure-plugin', 'configure-state-store', 'create-entrypoint', 'create-root-component', 'create-style-asset', 'create-external-template', 'add-template-binding', 'verify-app'],
    ['minimal-app'],
    'editable',
    ['package-tooling-policy-open'],
    'State store todo has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for @aurelia/state store configuration plus state binding command/behavior usage; build-tool emission remains open.',
  ),
} as const;

const expectedEffectsByRecipe = new Map<AuthoringRecipeKey, readonly ExpectedSemanticEffect[]>();
const preferencesByRecipe = new Map<AuthoringRecipeKey, readonly AuthoringPreference[]>();
const plansByRecipe = new Map<AuthoringRecipeKey, AuthoringPlan>();

validateAuthoringRecipeDescriptors();

export function buildAuthoringRecipePlan(
  key: AuthoringRecipeKey,
  rootDir: string = '.',
  appName: string = 'Authoring Recipe Probe',
): AuthoringPlan {
  switch (key) {
    case 'minimal-app':
      return buildMinimalAppPlan({ rootDir, appName });
    case 'state-backed-form':
      return buildStateBackedFormPlan({ rootDir, appName });
    case 'localized-state-backed-form':
      return buildLocalizedStateBackedFormPlan({ rootDir, appName });
    case 'validated-state-backed-form':
      return buildValidatedStateBackedFormPlan({ rootDir, appName });
    case 'service-backed-form':
      return buildServiceBackedFormPlan({ rootDir, appName });
    case 'routed-state-backed-form':
      return buildRoutedStateBackedFormPlan({ rootDir, appName });
    case 'catalog-storefront':
      return buildCatalogStorefrontPlan({ rootDir, appName });
    case 'composed-dashboard':
      return buildComposedDashboardPlan({ rootDir, appName });
    case 'state-store-todo':
      return buildStateStoreTodoPlan({ rootDir, appName });
  }
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
export { buildCatalogStorefrontPlan, type CatalogStorefrontRecipeRequest } from './catalog-storefront-recipe.js';
export { buildComposedDashboardPlan, type ComposedDashboardRecipeRequest } from './composed-dashboard-recipe.js';
export { buildRoutedStateBackedFormPlan, type RoutedStateBackedFormRecipeRequest } from './routed-state-backed-form-recipe.js';
export { buildServiceBackedFormPlan, type ServiceBackedFormRecipeRequest } from './service-backed-form-recipe.js';
export { buildLocalizedStateBackedFormPlan, buildStateBackedFormPlan, buildValidatedStateBackedFormPlan, type StateBackedFormRecipeRequest } from './state-backed-form-recipe.js';
export { buildStateStoreTodoPlan, type StateStoreTodoRecipeRequest } from './state-store-todo-recipe.js';
