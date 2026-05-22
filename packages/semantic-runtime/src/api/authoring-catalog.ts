import {
  AuthoringOntology,
  type AuthoringCapabilityKey,
  AuthoringCapabilityDescriptors,
  type AuthoringOpenReasonKind,
  AuthoringOperationFamilies,
  type AuthoringPreference,
  AuthoringProfiles,
  AuthoringTasteAxes,
  type AuthoringTasteAxisDescriptor,
  type AuthoringTasteAxisLayer,
  type AuthoringTasteValueKey,
  type AuthoringTasteValueDescriptor,
  AuthoringTasteValueDescriptors,
} from '../authoring/ontology.js';
import {
  AuthoringRecipeDescriptors,
  baseRecipeKeysForRecipe,
  expectedSemanticEffectsForRecipe,
  preferencesForRecipe,
  recipeLineageKeysForRecipe,
  recipeSpecificityRankForRecipe,
  sourcePlanForRecipe,
} from '../authoring/recipe.js';
import type { AuthoringSourceEditPlan } from '../authoring/source-plan.js';
import type { AuthoringProjectToolingPlan } from '../authoring/package-tooling.js';
import { uniqueValues } from '../collections.js';
import { SemanticRuntimeAnswerOutcome } from './contracts.js';
import type {
  SemanticAuthoringAmbiguityCatalogRow,
  SemanticAuthoringCatalogResult,
  SemanticAuthoringCatalogViewKind,
  SemanticAuthoringCatalogViewRequest,
  SemanticAuthoringCatalogViewResult,
  SemanticAuthoringCatalogOperationSummaryRow,
  SemanticAuthoringCatalogRecipeSummaryRow,
  SemanticAuthoringOperationCatalogRow,
  SemanticAuthoringPreferenceCatalogRow,
  SemanticAuthoringProjectToolingCatalogRow,
  SemanticAuthoringProjectToolingFileCatalogRow,
  SemanticAuthoringProfileCatalogRow,
  SemanticAuthoringRecipeCatalogRow,
  SemanticAuthoringPackageDependencyCatalogRow,
  SemanticAuthoringPackageScriptCatalogRow,
  SemanticAuthoringSourceFileCatalogRow,
  SemanticAuthoringSourcePlanCatalogRow,
  SemanticAuthoringTasteAxisCatalogRow,
  SemanticAuthoringTasteAxisValueLayerCount,
  SemanticRuntimeAnswer,
} from './contracts.js';
import { semanticAuthoringExpectedEffectContractRow } from './authoring-effect-contracts.js';
import { semanticAuthoringSourcePatternRow } from './authoring-source-pattern-row.js';
import { answer } from './answer-helpers.js';

export function readSemanticAuthoringCatalog(): SemanticAuthoringCatalogResult {
  const tasteValues = Object.values(AuthoringTasteValueDescriptors);
  const tasteValuesByKey = new Map<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>(
    tasteValues.map((value) => [value.key as AuthoringTasteValueKey, value]),
  );
  const capabilitiesByKey = new Map<AuthoringCapabilityKey, typeof AuthoringCapabilityDescriptors[keyof typeof AuthoringCapabilityDescriptors]>(
    Object.values(AuthoringCapabilityDescriptors).map((capability) => [capability.key, capability]),
  );
  return {
    operationFamilies: Object.values(AuthoringOperationFamilies).map((family) => ({
      familyKey: family.key,
      title: family.title,
      summary: family.summary,
    })),
    tasteAxes: Object.values(AuthoringTasteAxes).map((axis) =>
      authoringTasteAxisCatalogRow(axis, tasteValuesByKey)
    ),
    tasteValues: tasteValues.map((value) => ({
      valueKey: value.key,
      axisKey: value.axisKey,
      layer: value.layer,
      summary: value.summary,
    })),
    profiles: Object.values(AuthoringProfiles).map((profile) =>
      authoringProfileCatalogRow(profile, tasteValuesByKey)
    ),
    capabilities: Object.values(AuthoringCapabilityDescriptors).map((capability) => ({
      capabilityKey: capability.key,
      title: capability.title,
      summary: capability.summary,
      productOpenReasonKinds: capability.productOpenReasonKinds,
    })),
    operations: AuthoringOntology.operations.map((operation) => ({
      operationKind: operation.operationKind,
      familyKey: operation.familyKey,
      action: operation.action,
      targetKind: operation.targetKind,
      summary: operation.summary,
      requiredCapabilityKeys: operation.requiredCapabilities,
      productOpenReasonKinds: productOpenReasonsForCapabilities(
        operation.requiredCapabilities,
        capabilitiesByKey,
      ),
      commonAmbiguities: operation.commonAmbiguities.map(authoringAmbiguityCatalogRow),
    })),
    recipes: Object.values(AuthoringRecipeDescriptors).map((recipe) =>
      authoringRecipeCatalogRow(recipe, tasteValuesByKey)
    ),
  };
}

export function semanticAuthoringPreferenceCatalogRows(
  preferences: readonly AuthoringPreference[],
): readonly SemanticAuthoringPreferenceCatalogRow[] {
  const tasteValuesByKey = new Map<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>(
    Object.values(AuthoringTasteValueDescriptors).map((value) => [value.key as AuthoringTasteValueKey, value]),
  );
  return preferences.map((preference) =>
    authoringPreferenceCatalogRow(preference.axisKey, preference.valueKey, tasteValuesByKey)
  );
}

export function readSemanticAuthoringCatalogAnswer(): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult> {
  const value = readSemanticAuthoringCatalog();
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read authoring catalog with ${value.operations.length} operation(s), ${value.tasteAxes.length} taste axis row(s), and ${value.recipes.length} recipe contract(s).`,
    value,
  );
}

export function readSemanticAuthoringCatalogView(
  request: SemanticAuthoringCatalogViewRequest = {},
): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult | SemanticAuthoringCatalogViewResult> {
  const catalog = readSemanticAuthoringCatalog();
  const view = request.view ?? 'overview';
  const value = view === 'full'
    ? catalog
    : authoringCatalogView(catalog, view);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read ${view} authoring catalog view with ${catalog.operations.length} operation(s), ${catalog.tasteAxes.length} taste axis row(s), and ${catalog.recipes.length} recipe contract(s).`,
    value,
  );
}

function authoringCatalogView(
  catalog: SemanticAuthoringCatalogResult,
  view: Exclude<SemanticAuthoringCatalogViewKind, 'full'>,
): SemanticAuthoringCatalogViewResult {
  const recipeSummaries = catalog.recipes.map((recipe) => authoringCatalogRecipeSummary(recipe, view));
  const operationSummaries = view === 'operations'
    ? catalog.operations.map(authoringCatalogOperationSummary)
    : undefined;
  const counts: SemanticAuthoringCatalogViewResult['counts'] = {
    operationFamilies: catalog.operationFamilies.length,
    tasteAxes: catalog.tasteAxes.length,
    tasteValues: catalog.tasteValues.length,
    profiles: catalog.profiles.length,
    capabilities: catalog.capabilities.length,
    operations: catalog.operations.length,
    recipes: catalog.recipes.length,
  };
  return {
    view,
    counts,
    displayText: authoringCatalogViewDisplayText(view, counts, recipeSummaries, operationSummaries),
    operationFamilies: catalog.operationFamilies,
    tasteAxes: catalog.tasteAxes.map((axis) => ({
      axisKey: axis.axisKey,
      title: axis.title,
      layer: axis.layer,
      summary: axis.summary,
      commonValueKeys: axis.commonValueKeys,
      valueLayerCounts: axis.valueLayerCounts,
    })),
    capabilities: catalog.capabilities.map((capability) => ({
      capabilityKey: capability.capabilityKey,
      title: capability.title,
      summary: capability.summary,
      productOpenReasonKinds: capability.productOpenReasonKinds,
    })),
    recipes: recipeSummaries,
    ...(operationSummaries == null ? {} : { operations: operationSummaries }),
  };
}

function authoringCatalogViewDisplayText(
  view: Exclude<SemanticAuthoringCatalogViewKind, 'full'>,
  counts: SemanticAuthoringCatalogViewResult['counts'],
  recipes: readonly SemanticAuthoringCatalogRecipeSummaryRow[],
  operations: readonly SemanticAuthoringCatalogOperationSummaryRow[] | undefined,
): string {
  const lines = [
    `Catalog: ${counts.recipes} recipe(s), ${counts.operations} operation(s), ${counts.tasteAxes} taste axis row(s), ${counts.capabilities} capability row(s).`,
  ];
  if (view === 'overview') {
    lines.push('View: overview keeps recipe summaries and scalar counts; use catalogView=recipes for expanded recipe comparison fields.');
  } else if (view === 'recipes') {
    lines.push('View: recipes expands operation kinds, lineage, taste keys, source-plan summaries, and expected-effect kind sets; use recipe plan for selected source text or row-level contracts.');
    const patternSummary = catalogRecipePatternRoleSummary(recipes);
    if (patternSummary.length > 0) {
      lines.push(`Source pattern roles: ${patternSummary}.`);
    }
    const useSummary = catalogRecipePatternUsePolicySummary(recipes);
    if (useSummary.length > 0) {
      lines.push(`Source use policies: ${useSummary}.`);
    }
    const moduleKindSummary = catalogRecipePatternModuleKindSummary(recipes);
    if (moduleKindSummary.length > 0) {
      lines.push(`Source module kind coverage: ${moduleKindSummary}.`);
    }
  } else {
    lines.push('View: operations adds operation rows; use this when choosing the semantic operation family before selecting a recipe.');
  }
  lines.push(`Recipe keys: ${recipes.map((recipe) => recipe.key).join(', ')}.`);
  const previewRecipeRows = recipes.slice(0, 8).map((recipe) =>
    `${recipe.key} (${recipe.supportState}, ${recipe.sourceFileCount}+${recipe.projectToolingFileCount} file(s), ${recipe.expectedEffectCount} effect(s))`
  );
  lines.push(`Recipes: ${previewRecipeRows.join('; ')}${recipes.length > previewRecipeRows.length ? `; plus ${recipes.length - previewRecipeRows.length} more` : ''}.`);
  if (operations != null) {
    const previewOperations = operations.slice(0, 8).map((operation) =>
      `${operation.operationKind} -> ${operation.targetKind}`
    );
    lines.push(`Operations: ${previewOperations.join('; ')}${operations.length > previewOperations.length ? `; plus ${operations.length - previewOperations.length} more` : ''}.`);
  }
  lines.push('Next: use aurelia_app_building_guidance for public code-shape decisions, then aurelia_authoring_recipe_plan for a chosen recipe.');
  return lines.join('\n');
}

function catalogRecipePatternUsePolicySummary(
  recipes: readonly SemanticAuthoringCatalogRecipeSummaryRow[],
): string {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    const usePolicy = recipe.sourcePlan?.pattern?.usePolicy;
    if (usePolicy == null) {
      continue;
    }
    counts.set(usePolicy, (counts.get(usePolicy) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([usePolicy, count]) => `${usePolicy}=${count}`)
    .join(', ');
}

function catalogRecipePatternRoleSummary(
  recipes: readonly SemanticAuthoringCatalogRecipeSummaryRow[],
): string {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    const role = recipe.sourcePlan?.pattern?.role;
    if (role == null) {
      continue;
    }
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([role, count]) => `${role}=${count}`)
    .join(', ');
}

function catalogRecipePatternModuleKindSummary(
  recipes: readonly SemanticAuthoringCatalogRecipeSummaryRow[],
): string {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    const kinds = uniqueValues(recipe.sourcePlan?.pattern?.modules.map((module) => module.kind) ?? []);
    for (const kind of kinds) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  const rows = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const preview = rows.slice(0, 10)
    .map(([kind, count]) => `${kind}=${count}`)
    .join(', ');
  return rows.length > 10
    ? `${preview}, +${rows.length - 10} more`
    : preview;
}

function authoringCatalogRecipeSummary(
  recipe: SemanticAuthoringRecipeCatalogRow,
  view: Exclude<SemanticAuthoringCatalogViewKind, 'full'>,
): SemanticAuthoringCatalogRecipeSummaryRow {
  const includeExpandedRecipeShape = view === 'recipes';
  const row: SemanticAuthoringCatalogRecipeSummaryRow = {
    key: recipe.key,
    title: recipe.title,
    operationKindCount: recipe.operationKinds.length,
    baseRecipeCount: recipe.baseRecipeKeys.length,
    lineageRecipeCount: recipe.lineageRecipeKeys.length,
    specificityRank: recipe.specificityRank,
    supportState: recipe.supportState,
    summary: recipe.summary,
    openReasonKinds: recipe.openReasonKinds,
    preferenceCount: recipe.preferences.length,
    expectedEffectCount: recipe.expectedEffectCount,
    sourceFileCount: recipe.sourcePlan?.fileCount ?? 0,
    projectToolingFileCount: recipe.sourcePlan?.projectTooling?.fileCount ?? 0,
  };
  if (!includeExpandedRecipeShape) {
    return row;
  }
  return {
    ...row,
    operationKinds: recipe.operationKinds,
    baseRecipeKeys: recipe.baseRecipeKeys,
    lineageRecipeKeys: recipe.lineageRecipeKeys,
    tasteValueKeys: uniqueValues(recipe.preferences.map((preference) => preference.valueKey)),
    expectedEffectKinds: recipe.expectedEffectKinds,
    sourcePlan: recipe.sourcePlan == null ? null : {
      conflictPolicy: recipe.sourcePlan.conflictPolicy,
      formattingPolicy: recipe.sourcePlan.formattingPolicy,
      packageToolingPolicy: recipe.sourcePlan.packageToolingPolicy,
      pattern: recipe.sourcePlan.pattern,
      hasCompleteFileText: recipe.sourcePlan.hasCompleteFileText,
      fileCount: recipe.sourcePlan.fileCount,
      fileRoles: recipe.sourcePlan.fileRoles,
      languages: recipe.sourcePlan.languages,
      editKinds: recipe.sourcePlan.editKinds,
      textAuthorities: recipe.sourcePlan.textAuthorities,
      projectTooling: recipe.sourcePlan.projectTooling == null ? null : {
        packageManager: recipe.sourcePlan.projectTooling.packageManager,
        buildToolPolicy: recipe.sourcePlan.projectTooling.buildToolPolicy,
        dependencyCount: recipe.sourcePlan.projectTooling.dependencies.length,
        scriptCount: recipe.sourcePlan.projectTooling.scripts.length,
        fileCount: recipe.sourcePlan.projectTooling.files.length,
      },
    },
  };
}

function authoringCatalogOperationSummary(
  operation: SemanticAuthoringOperationCatalogRow,
): SemanticAuthoringCatalogOperationSummaryRow {
  return {
    operationKind: operation.operationKind,
    familyKey: operation.familyKey,
    action: operation.action,
    targetKind: operation.targetKind,
    requiredCapabilityKeys: operation.requiredCapabilityKeys,
    productOpenReasonKinds: operation.productOpenReasonKinds,
    summary: operation.summary,
  };
}

function productOpenReasonsForCapabilities(
  capabilityKeys: readonly AuthoringCapabilityKey[],
  capabilitiesByKey: ReadonlyMap<
    AuthoringCapabilityKey,
    typeof AuthoringCapabilityDescriptors[keyof typeof AuthoringCapabilityDescriptors]
  >,
): readonly AuthoringOpenReasonKind[] {
  return uniqueValues(capabilityKeys.flatMap((capabilityKey) =>
    capabilitiesByKey.get(capabilityKey)?.productOpenReasonKinds ?? []
  ));
}

function authoringProfileCatalogRow(
  profile: typeof AuthoringProfiles[keyof typeof AuthoringProfiles],
  tasteValuesByKey: ReadonlyMap<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>,
): SemanticAuthoringProfileCatalogRow {
  return {
    profileKey: profile.key,
    title: profile.title,
    summary: profile.summary,
    ambiguitySummary: profile.ambiguitySummary,
    preferences: profile.preferences.map((preference) =>
      authoringPreferenceCatalogRow(preference.axisKey, preference.valueKey, tasteValuesByKey)
    ),
  };
}

function authoringPreferenceCatalogRow(
  axisKey: string,
  valueKey: AuthoringTasteValueKey,
  tasteValuesByKey: ReadonlyMap<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>,
): SemanticAuthoringPreferenceCatalogRow {
  const descriptor = requiredTasteValueDescriptorForKey(
    tasteValuesByKey,
    valueKey,
    `Authoring profile preference ${axisKey}`,
  );
  if (descriptor.axisKey !== axisKey) {
    throw new Error(`Authoring profile preference ${axisKey}:${valueKey} points at value owned by ${descriptor.axisKey}`);
  }
  return {
    axisKey: descriptor.axisKey,
    valueKey: descriptor.key,
    valueLayer: descriptor.layer,
    valueOntologySummary: descriptor.summary,
  };
}

function authoringTasteAxisCatalogRow(
  axis: AuthoringTasteAxisDescriptor,
  tasteValuesByKey: ReadonlyMap<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>,
): SemanticAuthoringTasteAxisCatalogRow {
  const commonValues = axis.commonValues.map((valueKey) =>
    requiredTasteValueDescriptor(axis, tasteValuesByKey, valueKey)
  );
  const primitivePolicyValueKeys = tasteValueKeysForLayer(commonValues, 'primitive-policy');
  const observedShapeValueKeys = tasteValueKeysForLayer(commonValues, 'observed-shape');
  const derivedReadingValueKeys = tasteValueKeysForLayer(commonValues, 'derived-reading');
  return {
    axisKey: axis.key,
    title: axis.title,
    layer: axis.layer,
    summary: axis.summary,
    commonValueKeys: axis.commonValues,
    primitivePolicyValueKeys,
    observedShapeValueKeys,
    derivedReadingValueKeys,
    valueLayerCounts: [
      tasteAxisValueLayerCount('primitive-policy', primitivePolicyValueKeys.length),
      tasteAxisValueLayerCount('observed-shape', observedShapeValueKeys.length),
      tasteAxisValueLayerCount('derived-reading', derivedReadingValueKeys.length),
    ].filter((row) => row.count > 0),
  };
}

function requiredTasteValueDescriptor(
  axis: AuthoringTasteAxisDescriptor,
  tasteValuesByKey: ReadonlyMap<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>,
  valueKey: AuthoringTasteValueKey,
): AuthoringTasteValueDescriptor {
  return requiredTasteValueDescriptorForKey(
    tasteValuesByKey,
    valueKey,
    `Authoring taste axis ${axis.key}`,
  );
}

function requiredTasteValueDescriptorForKey(
  tasteValuesByKey: ReadonlyMap<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>,
  valueKey: AuthoringTasteValueKey,
  ownerDescription: string = 'Authoring catalog',
): AuthoringTasteValueDescriptor {
  const value = tasteValuesByKey.get(valueKey);
  if (value == null) {
    throw new Error(`${ownerDescription} references unknown authoring taste value ${valueKey}`);
  }
  return value;
}

function tasteValueKeysForLayer(
  values: readonly AuthoringTasteValueDescriptor[],
  layer: AuthoringTasteAxisLayer,
): readonly AuthoringTasteValueKey[] {
  return values.filter((value) => value.layer === layer).map((value) => value.key);
}

function tasteAxisValueLayerCount(
  layer: AuthoringTasteAxisLayer,
  count: number,
): SemanticAuthoringTasteAxisValueLayerCount {
  return { layer, count };
}

function authoringRecipeCatalogRow(
  recipe: typeof AuthoringRecipeDescriptors[keyof typeof AuthoringRecipeDescriptors],
  tasteValuesByKey: ReadonlyMap<AuthoringTasteValueKey, AuthoringTasteValueDescriptor>,
): SemanticAuthoringRecipeCatalogRow {
  const expectedEffects = expectedSemanticEffectsForRecipe(recipe.key)
    .map(semanticAuthoringExpectedEffectContractRow);
  return {
    key: recipe.key,
    title: recipe.title,
    operationKinds: recipe.operationKinds,
    baseRecipeKeys: baseRecipeKeysForRecipe(recipe.key),
    lineageRecipeKeys: recipeLineageKeysForRecipe(recipe.key),
    specificityRank: recipeSpecificityRankForRecipe(recipe.key),
    supportState: recipe.supportState,
    summary: recipe.summary,
    openReasonKinds: recipe.openReasonKinds,
    preferences: preferencesForRecipe(recipe.key).map((preference) =>
      authoringPreferenceCatalogRow(
        preference.axisKey,
        preference.valueKey,
        tasteValuesByKey,
      )
    ),
    sourcePlan: authoringSourcePlanCatalogRow(sourcePlanForRecipe(recipe.key)),
    expectedEffectKinds: uniqueValues(expectedEffects.map((effect) => effect.effectKind)),
    expectedEffects,
    expectedEffectCount: expectedEffects.length,
  };
}

function authoringSourcePlanCatalogRow(
  sourcePlan: AuthoringSourceEditPlan | null,
): SemanticAuthoringSourcePlanCatalogRow | null {
  if (sourcePlan == null) {
    return null;
  }
  const files = sourcePlan.files.map(authoringSourceFileCatalogRow);
  return {
    conflictPolicy: sourcePlan.policy.conflictPolicy,
    formattingPolicy: sourcePlan.policy.formattingPolicy,
    packageToolingPolicy: sourcePlan.policy.packageToolingPolicy,
    pattern: semanticAuthoringSourcePatternRow(sourcePlan.pattern),
    projectTooling: authoringProjectToolingCatalogRow(sourcePlan.projectTooling),
    hasCompleteFileText: sourcePlan.hasCompleteFileText,
    fileCount: files.length,
    fileRoles: uniqueValues(files.map((file) => file.role)),
    languages: uniqueValues(files.map((file) => file.language)),
    editKinds: uniqueValues(files.map((file) => file.editKind)),
    textAuthorities: uniqueValues(files.flatMap((file) =>
      file.textAuthority == null ? [] : [file.textAuthority]
    )),
    files,
  };
}

function authoringProjectToolingCatalogRow(
  projectTooling: AuthoringProjectToolingPlan | null,
): SemanticAuthoringProjectToolingCatalogRow | null {
  if (projectTooling == null) {
    return null;
  }
  const dependencies = projectTooling.dependencies.map(authoringPackageDependencyCatalogRow);
  const scripts = projectTooling.scripts.map(authoringPackageScriptCatalogRow);
  const files = projectTooling.files.map(authoringProjectToolingFileCatalogRow);
  return {
    packageManager: projectTooling.packageManager,
    buildToolPolicy: projectTooling.buildToolPolicy,
    hasCompleteFileText: projectTooling.hasCompleteFileText,
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

function authoringPackageDependencyCatalogRow(
  dependency: AuthoringProjectToolingPlan['dependencies'][number],
): SemanticAuthoringPackageDependencyCatalogRow {
  return {
    specifier: dependency.specifier,
    versionRange: dependency.versionRange,
    scope: dependency.scope,
  };
}

function authoringPackageScriptCatalogRow(
  script: AuthoringProjectToolingPlan['scripts'][number],
): SemanticAuthoringPackageScriptCatalogRow {
  return {
    name: script.name,
    command: script.command,
  };
}

function authoringProjectToolingFileCatalogRow(
  file: AuthoringProjectToolingPlan['files'][number],
): SemanticAuthoringProjectToolingFileCatalogRow {
  return {
    path: file.path,
    fileKind: file.fileKind,
    language: file.language,
    textAuthority: file.textAuthority,
  };
}

function authoringSourceFileCatalogRow(
  file: AuthoringSourceEditPlan['files'][number],
): SemanticAuthoringSourceFileCatalogRow {
  return {
    path: file.path,
    role: file.role,
    language: file.language,
    editKind: file.editKind,
    operationKind: file.operationKind,
    textAuthority: file.text?.authority ?? null,
  };
}

function authoringAmbiguityCatalogRow(
  ambiguity: typeof AuthoringOntology.operations[number]['commonAmbiguities'][number],
): SemanticAuthoringAmbiguityCatalogRow {
  return {
    key: ambiguity.key,
    summary: ambiguity.summary,
    resolution: ambiguity.resolution,
    options: ambiguity.options,
  };
}
