import { uniqueValues } from '../collections.js';
import {
  AUTHORING_RECIPE_KEYS,
  buildAuthoringRecipePlan,
  expectedSemanticEffectsForPlan,
  type AuthoringRecipeKey,
} from '../authoring/recipe.js';
import type { AuthoringSourceEditPlan } from '../authoring/source-plan.js';
import type { AuthoringProjectToolingPlan } from '../authoring/package-tooling.js';
import { answer } from './answer-helpers.js';
import { readSemanticAuthoringCatalog } from './authoring-catalog.js';
import { semanticAuthoringExpectedEffectContractRow } from './authoring-effect-contracts.js';
import {
  SemanticRuntimeAnswerOutcome,
  type SemanticAuthoringRecipeCatalogRow,
  type SemanticAuthoringRecipePlanRequest,
  type SemanticAuthoringRecipePlanResult,
  type SemanticAuthoringRecipePlanStepRow,
  type SemanticAuthoringRecipeProjectToolingFilePlanRow,
  type SemanticAuthoringRecipeProjectToolingPlanRow,
  type SemanticAuthoringRecipeSourceFilePlanRow,
  type SemanticAuthoringRecipeSourcePlanRow,
  type SemanticRuntimeAnswer,
} from './contracts.js';

export function readSemanticAuthoringRecipePlan(
  request: SemanticAuthoringRecipePlanRequest,
): SemanticRuntimeAnswer<SemanticAuthoringRecipePlanResult | null> {
  const recipe = semanticRecipeCatalogRow(request.recipeKey);
  if (recipe == null) {
    return answer(
      SemanticRuntimeAnswerOutcome.Unsupported,
      `Unknown authoring recipe '${request.recipeKey}'.`,
      null,
    );
  }

  const rootDir = request.rootDir ?? '.';
  const appName = request.appName ?? 'Authoring Recipe Probe';
  const includeText = request.includeText === true;
  const plan = buildAuthoringRecipePlan(request.recipeKey as AuthoringRecipeKey, rootDir, appName);
  const steps = plan.steps.map(authoringRecipePlanStepRow);
  const expectedEffects = expectedSemanticEffectsForPlan(plan)
    .map(semanticAuthoringExpectedEffectContractRow);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Built read-only authoring recipe plan '${recipe.key}' with ${steps.length} step(s), ${expectedEffects.length} expected effect(s), and ${plan.sourcePlan?.files.length ?? 0} source file edit(s).`,
    {
      recipe,
      intent: {
        summary: plan.intent.summary,
        profileKey: plan.intent.profile?.key ?? null,
        preferences: recipe.preferences,
      },
      preconditions: plan.preconditions.map((precondition) => ({
        summary: precondition.summary,
        required: precondition.required,
      })),
      steps,
      expectedEffectKinds: uniqueValues(expectedEffects.map((effect) => effect.effectKind)),
      expectedEffectCount: expectedEffects.length,
      expectedEffects,
      sourcePlan: authoringRecipeSourcePlanRow(plan.sourcePlan, includeText),
    },
  );
}

function semanticRecipeCatalogRow(
  recipeKey: string,
): SemanticAuthoringRecipeCatalogRow | null {
  if (!isAuthoringRecipeKey(recipeKey)) {
    return null;
  }
  return readSemanticAuthoringCatalog().recipes.find((recipe) =>
    recipe.key === recipeKey
  ) ?? null;
}

function isAuthoringRecipeKey(value: string): value is AuthoringRecipeKey {
  return AUTHORING_RECIPE_KEYS.some((key) => key === value);
}

function authoringRecipePlanStepRow(
  step: ReturnType<typeof buildAuthoringRecipePlan>['steps'][number],
): SemanticAuthoringRecipePlanStepRow {
  const expectedEffects = step.expectedEffects.map(semanticAuthoringExpectedEffectContractRow);
  return {
    operationKind: step.operation.kind,
    operationSummary: step.operation.summary,
    action: step.operation.descriptor.action,
    targetKind: step.operation.descriptor.targetKind,
    expectedEffectKinds: uniqueValues(expectedEffects.map((effect) => effect.effectKind)),
    expectedEffectCount: expectedEffects.length,
    expectedEffects,
  };
}

function authoringRecipeSourcePlanRow(
  sourcePlan: AuthoringSourceEditPlan | null,
  includeText: boolean,
): SemanticAuthoringRecipeSourcePlanRow | null {
  if (sourcePlan == null) {
    return null;
  }
  return {
    rootDir: sourcePlan.rootDir,
    conflictPolicy: sourcePlan.policy.conflictPolicy,
    formattingPolicy: sourcePlan.policy.formattingPolicy,
    packageToolingPolicy: sourcePlan.policy.packageToolingPolicy,
    hasCompleteFileText: sourcePlan.hasCompleteFileText,
    fileCount: sourcePlan.files.length,
    files: sourcePlan.files.map((file): SemanticAuthoringRecipeSourceFilePlanRow => ({
      path: file.path,
      role: file.role,
      language: file.language,
      editKind: file.editKind,
      operationKind: file.operationKind,
      textAuthority: file.text?.authority ?? null,
      textLength: file.text?.text.length ?? null,
      text: includeText ? file.text?.text ?? null : null,
    })),
    projectTooling: authoringRecipeProjectToolingPlanRow(sourcePlan.projectTooling, includeText),
  };
}

function authoringRecipeProjectToolingPlanRow(
  plan: AuthoringProjectToolingPlan | null,
  includeText: boolean,
): SemanticAuthoringRecipeProjectToolingPlanRow | null {
  if (plan == null) {
    return null;
  }
  const dependencies = plan.dependencies.map((dependency) => ({
    specifier: dependency.specifier,
    versionRange: dependency.versionRange,
    scope: dependency.scope,
  }));
  const scripts = plan.scripts.map((script) => ({
    name: script.name,
    command: script.command,
  }));
  const files = plan.files.map((file): SemanticAuthoringRecipeProjectToolingFilePlanRow => ({
    path: file.path,
    fileKind: file.fileKind,
    language: file.language,
    textAuthority: file.textAuthority,
    textLength: file.text.length,
    text: includeText ? file.text : null,
  }));
  return {
    packageManager: plan.packageManager,
    buildToolPolicy: plan.buildToolPolicy,
    hasCompleteFileText: plan.hasCompleteFileText,
    dependencyCount: dependencies.length,
    dependencySpecifiers: uniqueValues(dependencies.map((dependency) => dependency.specifier)),
    dependencyScopes: uniqueValues(dependencies.map((dependency) => dependency.scope)),
    dependencies,
    scriptCount: scripts.length,
    scriptNames: uniqueValues(scripts.map((script) => script.name)),
    scripts,
    fileCount: files.length,
    fileKinds: uniqueValues(files.map((file) => file.fileKind)),
    fileLanguages: uniqueValues(files.map((file) => file.language)),
    textAuthorities: uniqueValues(files.map((file) => file.textAuthority)),
    files,
  };
}
