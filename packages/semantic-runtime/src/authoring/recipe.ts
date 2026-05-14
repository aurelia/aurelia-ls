import type {
  AuthoringOpenReasonKind,
  AuthoringOperationKind,
  AuthoringPreference,
  AuthoringSupportState,
} from './ontology.js';
import { buildMinimalAppPlan } from './minimal-app-recipe.js';
import { buildRoutedStateBackedFormPlan } from './routed-state-backed-form-recipe.js';
import { buildServiceBackedFormPlan } from './service-backed-form-recipe.js';
import { buildStateBackedFormPlan, buildValidatedStateBackedFormPlan } from './state-backed-form-recipe.js';
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
  /** State-backed form plus validation-html configuration, validate bindings, and validation service ownership. */
  | 'validated-state-backed-form'
  /** DI-owned state plus an injected service layer mediating native form mutation/submission. */
  | 'service-backed-form'
  /** State-backed form with route admission and routeable component ownership; waits on router substrate. */
  | 'routed-state-backed-form';

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
  ValidatedStateBackedForm: new AuthoringRecipeDescriptor(
    'validated-state-backed-form',
    'Validated State-Backed Form',
    ['create-project-files', 'configure-plugin', 'create-state-model', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Validated state-backed form extends the generated form lane through validation-html configuration, validation services, validate bindings, recipe-baseline package/typecheck tooling, and verification effects; build-tool emission remains open.',
  ),
  ServiceBackedForm: new AuthoringRecipeDescriptor(
    'service-backed-form',
    'Service-Backed Form',
    ['create-project-files', 'create-state-model', 'create-service', 'create-entrypoint', 'create-root-component', 'create-external-template', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'editable',
    ['package-tooling-policy-open'],
    'Service-backed form has a concrete plan builder, source edit plan, recipe-baseline package/typecheck tooling, and expected effects for DI-owned state plus an injected service layer; build-tool emission remains open.',
  ),
  RoutedStateBackedForm: new AuthoringRecipeDescriptor(
    'routed-state-backed-form',
    'Routed State-Backed Form',
    ['configure-router', 'add-route', 'create-state-model', 'create-form-component', 'add-template-binding', 'verify-app'],
    ['state-backed-form'],
    'partial',
    ['framework-grounding-missing', 'semantic-fact-partial', 'package-tooling-policy-open'],
    'Routed form has a concrete plan, source edit plan, recipe-baseline package/typecheck tooling, and effects, but still waits for deeper router, viewport, and routeable component semantics before becoming fully supportable.',
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
    case 'validated-state-backed-form':
      return buildValidatedStateBackedFormPlan({ rootDir, appName });
    case 'service-backed-form':
      return buildServiceBackedFormPlan({ rootDir, appName });
    case 'routed-state-backed-form':
      return buildRoutedStateBackedFormPlan({ rootDir, appName });
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
  for (const descriptor of Object.values(AuthoringRecipeDescriptors)) {
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
export { buildRoutedStateBackedFormPlan, type RoutedStateBackedFormRecipeRequest } from './routed-state-backed-form-recipe.js';
export { buildServiceBackedFormPlan, type ServiceBackedFormRecipeRequest } from './service-backed-form-recipe.js';
export { buildStateBackedFormPlan, buildValidatedStateBackedFormPlan, type StateBackedFormRecipeRequest } from './state-backed-form-recipe.js';
