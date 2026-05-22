import { uniqueValues } from '../collections.js';
import {
  buildAuthoringRecipePlan,
  defaultAuthoringRecipeAppName,
  expectedSemanticEffectsForPlan,
  isAuthoringRecipeKey,
  type AuthoringRecipeKey,
} from '../authoring/recipe.js';
import { authoringSourceParameterApplications } from '../authoring/source-parameter-application.js';
import type {
  AuthoringSourceEditPlan,
  AuthoringSourcePatternParameterValue,
} from '../authoring/source-plan.js';
import type { AuthoringProjectToolingPlan } from '../authoring/package-tooling.js';
import { answer } from './answer-helpers.js';
import {
  readSemanticAuthoringCatalog,
  semanticAuthoringPreferenceCatalogRows,
} from './authoring-catalog.js';
import { semanticAuthoringExpectedEffectContractRow } from './authoring-effect-contracts.js';
import {
  semanticAuthoringSourcePatternAdaptationGroupSummary,
  semanticAuthoringSourcePatternHostAdaptedSlotSummary,
  semanticAuthoringSourcePatternModuleSummary,
  semanticAuthoringSourceParameterApplicationsHaveAppliedSourceText,
  semanticAuthoringSourcePatternNeedsCallerAdaptation,
  semanticAuthoringSourcePatternParameterSummary,
  semanticAuthoringSourcePatternUseSummary,
} from './authoring-source-pattern-display.js';
import { semanticAuthoringSourcePatternRow } from './authoring-source-pattern-row.js';
import {
  SemanticRuntimeAnswerOutcome,
  type SemanticAuthoringRecipePlanUsage,
  type SemanticAuthoringRecipeCatalogRow,
  type SemanticAuthoringExpectedEffectContractRow,
  type SemanticAuthoringExpectedEffectHighlightRow,
  type SemanticAuthoringRecipePlanEffectDetail,
  type SemanticAuthoringRecipePlanRequest,
  type SemanticAuthoringRecipePlanResult,
  type SemanticAuthoringRecipePlanRecipeRow,
  type SemanticAuthoringRecipePlanStepRow,
  type SemanticAuthoringRecipeProjectToolingFilePlanRow,
  type SemanticAuthoringRecipeProjectToolingPlanRow,
  type SemanticAuthoringRecipeSourceFilePlanRow,
  type SemanticAuthoringRecipeSourcePlanRow,
  type SemanticAuthoringRecipeSourceTextRequestHintRow,
  type SemanticAuthoringRecipeSourceTextSelectionRow,
  type SemanticAuthoringSourceParameterApplicationRow,
  type SemanticAuthoringSourcePatternRow,
  type SemanticRuntimeAnswer,
} from './contracts.js';

const DEFAULT_RECIPE_PLAN_EFFECT_DETAIL: SemanticAuthoringRecipePlanEffectDetail = 'compact';
const DEFAULT_RECIPE_PLAN_USAGE: SemanticAuthoringRecipePlanUsage = 'source-plan-start';
const RECIPE_PLAN_EXPECTED_EFFECT_HIGHLIGHT_LIMIT = 12;
const RECIPE_PLAN_DISPLAY_EXPECTED_EFFECT_HIGHLIGHT_LIMIT = 5;
const RECIPE_PLAN_STEP_EXPECTED_EFFECT_HIGHLIGHT_LIMIT = 4;

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
  const recipeKey = request.recipeKey as AuthoringRecipeKey;
  const appName = request.appName ?? defaultAuthoringRecipeAppName(recipeKey);
  const usage = normalizeRecipePlanUsage(request.usage);
  const effectDetail = request.effectDetail === 'contracts'
    ? 'contracts'
    : DEFAULT_RECIPE_PLAN_EFFECT_DETAIL;
  const sourceParameterValues = normalizeSourceParameterValues(request.sourceParameterValues);
  const plan = buildAuthoringRecipePlan(recipeKey, rootDir, appName, { sourceParameterValues });
  const selectedText = recipeSourceTextSelection(plan.sourcePlan, request.sourceFilePaths, request.sourceTextRequestHintKeys);
  const includeText = request.includeText === true
    || (request.includeText !== false && selectedText.includedTextPaths != null);
  const steps = plan.steps.map((step) => authoringRecipePlanStepRow(step, effectDetail));
  const expectedEffects = expectedSemanticEffectsForPlan(plan)
    .map(semanticAuthoringExpectedEffectContractRow);
  const sourcePlan = authoringRecipeSourcePlanRow(plan.sourcePlan, includeText, selectedText, sourceParameterValues);
  const expectedEffectHighlights = authoringExpectedEffectHighlights(expectedEffects, RECIPE_PLAN_EXPECTED_EFFECT_HIGHLIGHT_LIMIT);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Built read-only authoring recipe plan '${recipe.key}' with ${steps.length} step(s), ${expectedEffects.length} expected effect(s), and ${plan.sourcePlan?.files.length ?? 0} source file edit(s).`,
    {
      recipe: authoringRecipePlanRecipeRow(recipe, plan, expectedEffects.length),
      usage,
      intent: {
        summary: plan.intent.summary,
        profileKey: plan.intent.profile?.key ?? null,
        preferenceCount: plan.intent.preferences.length,
        tasteValueKeys: uniqueValues(plan.intent.preferences.map((preference) => preference.valueKey)),
        preferences: effectDetail === 'contracts'
          ? semanticAuthoringPreferenceCatalogRows(plan.intent.preferences)
          : [],
      },
      displayText: authoringRecipePlanDisplayText(recipe, plan, usage, steps, sourcePlan, expectedEffects.length, expectedEffectHighlights, includeText, effectDetail),
      preconditions: plan.preconditions.map((precondition) => ({
        summary: precondition.summary,
        required: precondition.required,
      })),
      steps,
      expectedEffectDetail: effectDetail,
      expectedEffectKinds: uniqueValues(expectedEffects.map((effect) => effect.effectKind)),
      expectedEffectCount: expectedEffects.length,
      expectedEffectHighlights,
      expectedEffects: effectDetail === 'contracts' ? expectedEffects : [],
      sourcePlan,
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

function normalizeRecipePlanUsage(
  usage: SemanticAuthoringRecipePlanRequest['usage'],
): SemanticAuthoringRecipePlanUsage {
  return usage === 'pattern-reference'
    ? 'pattern-reference'
    : DEFAULT_RECIPE_PLAN_USAGE;
}

function authoringRecipePlanRecipeRow(
  recipe: SemanticAuthoringRecipeCatalogRow,
  plan: ReturnType<typeof buildAuthoringRecipePlan>,
  expectedEffectCount: number,
): SemanticAuthoringRecipePlanRecipeRow {
  return {
    key: recipe.key,
    title: recipe.title,
    operationKinds: uniqueValues(plan.steps.map((step) => step.operation.kind)),
    baseRecipeKeys: recipe.baseRecipeKeys,
    lineageRecipeKeys: recipe.lineageRecipeKeys,
    specificityRank: recipe.specificityRank,
    supportState: recipe.supportState,
    summary: plan.intent.summary,
    openReasonKinds: recipe.openReasonKinds,
    preferenceCount: plan.intent.preferences.length,
    expectedEffectCount,
    sourceFileCount: plan.sourcePlan?.files.length ?? 0,
    packageToolingPolicy: plan.sourcePlan?.policy.packageToolingPolicy ?? null,
  };
}

function authoringRecipePlanStepRow(
  step: ReturnType<typeof buildAuthoringRecipePlan>['steps'][number],
  effectDetail: SemanticAuthoringRecipePlanEffectDetail,
): SemanticAuthoringRecipePlanStepRow {
  const expectedEffects = dedupeExpectedEffectContractRows(
    step.expectedEffects.map(semanticAuthoringExpectedEffectContractRow),
  );
  return {
    operationKind: step.operation.kind,
    operationSummary: step.operation.summary,
    action: step.operation.descriptor.action,
    targetKind: step.operation.descriptor.targetKind,
    expectedEffectKinds: uniqueValues(expectedEffects.map((effect) => effect.effectKind)),
    expectedEffectCount: expectedEffects.length,
    expectedEffectHighlights: effectDetail === 'contracts'
      ? authoringExpectedEffectHighlights(expectedEffects, RECIPE_PLAN_STEP_EXPECTED_EFFECT_HIGHLIGHT_LIMIT)
      : [],
    expectedEffects: effectDetail === 'contracts' ? expectedEffects : [],
  };
}

function dedupeExpectedEffectContractRows(
  effects: readonly SemanticAuthoringExpectedEffectContractRow[],
): readonly SemanticAuthoringExpectedEffectContractRow[] {
  const byKey = new Map<string, SemanticAuthoringExpectedEffectContractRow>();
  for (const effect of effects) {
    const key = expectedEffectContractRowKey(effect);
    const existing = byKey.get(key);
    if (existing == null || expectedEffectRolePriority(effect.role) < expectedEffectRolePriority(existing.role)) {
      byKey.set(key, effect);
    }
  }
  return [...byKey.values()];
}

function expectedEffectContractRowKey(effect: SemanticAuthoringExpectedEffectContractRow): string {
  return [
    effect.effectKind,
    effect.scope,
    effect.topologyNodeKind ?? 'none',
    effect.cardinality,
    effect.count ?? 'count:none',
    effect.capabilityKey ?? 'capability:none',
    effect.minimumSupportState ?? 'support:none',
    effect.tasteAxisKey ?? 'taste-axis:none',
    effect.tasteValueKey ?? 'taste-value:none',
    expectedEffectFilterRowKey(effect),
  ].join('|');
}

function expectedEffectFilterRowKey(effect: SemanticAuthoringExpectedEffectContractRow): string {
  if (effect.filters.length === 0) {
    return 'filters:none';
  }
  return effect.filters
    .slice()
    .sort(compareExpectedEffectFilterRows)
    .map((filter) => JSON.stringify([filter.field, filter.value]))
    .join('&');
}

function compareExpectedEffectFilterRows(
  left: SemanticAuthoringExpectedEffectContractRow['filters'][number],
  right: SemanticAuthoringExpectedEffectContractRow['filters'][number],
): number {
  const fieldOrder = left.field.localeCompare(right.field);
  return fieldOrder === 0
    ? expectedEffectFilterValueKey(left.value).localeCompare(expectedEffectFilterValueKey(right.value))
    : fieldOrder;
}

function expectedEffectFilterValueKey(value: string | number | boolean | null): string {
  return value == null ? 'null' : String(value);
}

function authoringExpectedEffectHighlights(
  effects: readonly SemanticAuthoringExpectedEffectContractRow[],
  limit: number,
): readonly SemanticAuthoringExpectedEffectHighlightRow[] {
  const selected: SemanticAuthoringExpectedEffectContractRow[] = [];
  const seen = new Set<string>();
  const seenEffectKinds = new Set<string>();
  const sortedEffects = effects.slice().sort(compareExpectedEffectHighlightPriority);
  for (const effect of sortedEffects) {
    if (seenEffectKinds.has(effect.effectKind)) {
      continue;
    }
    if (pushExpectedEffectHighlight(selected, seen, effect, limit)) {
      seenEffectKinds.add(effect.effectKind);
    }
    if (selected.length >= limit) {
      break;
    }
  }
  for (const effect of sortedEffects) {
    if (selected.length >= limit) {
      break;
    }
    pushExpectedEffectHighlight(selected, seen, effect, limit);
  }
  return selected.map((effect) => ({
    effectKind: effect.effectKind,
    scope: effect.scope,
    role: effect.role,
    semanticTargetKey: effect.semanticTargetKey,
    filterFields: effect.filterFields,
    summary: effect.summary,
  }));
}

function pushExpectedEffectHighlight(
  selected: SemanticAuthoringExpectedEffectContractRow[],
  seen: Set<string>,
  effect: SemanticAuthoringExpectedEffectContractRow,
  limit: number,
): boolean {
  const key = `${effect.role}:${effect.semanticTargetKey}`;
  if (seen.has(key) || selected.length >= limit) {
    return false;
  }
  selected.push(effect);
  seen.add(key);
  return true;
}

function compareExpectedEffectHighlightPriority(
  left: SemanticAuthoringExpectedEffectContractRow,
  right: SemanticAuthoringExpectedEffectContractRow,
): number {
  const kindOrder = expectedEffectHighlightPriority(left) - expectedEffectHighlightPriority(right);
  if (kindOrder !== 0) {
    return kindOrder;
  }
  const detailOrder = expectedEffectWithinKindPriority(left) - expectedEffectWithinKindPriority(right);
  if (detailOrder !== 0) {
    return detailOrder;
  }
  const roleOrder = expectedEffectRolePriority(left.role) - expectedEffectRolePriority(right.role);
  if (roleOrder !== 0) {
    return roleOrder;
  }
  const scopeOrder = expectedEffectScopePriority(left.scope) - expectedEffectScopePriority(right.scope);
  if (scopeOrder !== 0) {
    return scopeOrder;
  }
  return left.summary.localeCompare(right.summary);
}

function expectedEffectHighlightPriority(effect: SemanticAuthoringExpectedEffectContractRow): number {
  switch (effect.effectKind) {
    case 'computed-observer-source':
      return 0;
    case 'binding-observed-dependency':
      return effect.role === 'baseline' ? 5 : 1;
    case 'computed-observer-observed-dependency':
      return 2;
    case 'route':
      return 3;
    case 'binding-value-channel':
      return 4;
    case 'service-interaction-binding':
      return 5;
    case 'binding-data-flow':
      return 6;
    case 'state-composition':
      return 7;
    case 'service-interaction':
      return 8;
    case 'service-class':
      return 9;
    case 'runtime-controller':
      return 11;
    case 'authoring-taste':
      return 12;
    case 'authoring-capability':
      return 13;
    default:
      return 20;
  }
}

function expectedEffectWithinKindPriority(effect: SemanticAuthoringExpectedEffectContractRow): number {
  switch (effect.effectKind) {
    case 'binding-value-channel':
      return bindingValueChannelHighlightPriority(effect);
    case 'binding-data-flow':
      return bindingDataFlowHighlightPriority(effect);
    default:
      return 0;
  }
}

function bindingValueChannelHighlightPriority(effect: SemanticAuthoringExpectedEffectContractRow): number {
  if (expectedEffectHasFilterValue(effect, 'usesCustomMatcher', true)) {
    return 0;
  }
  if (expectedEffectHasFilterField(effect, 'observerCouplings')) {
    return 1;
  }
  if (expectedEffectHasFilterField(effect, 'primitiveValueDomainDisplays')) {
    return 2;
  }
  if (expectedEffectHasFilterValue(effect, 'targetProperty', 'checked')) {
    return 3;
  }
  if (expectedEffectHasFilterValue(effect, 'targetProperty', 'value')) {
    return 4;
  }
  if (expectedEffectHasFilterValue(effect, 'targetProperty', 'model')) {
    return 5;
  }
  if (expectedEffectHasFilterValue(effect, 'channelKind', 'event-handler-invocation')) {
    return 6;
  }
  if (expectedEffectHasAnyFilterValue(effect, 'targetProperty', ['class', 'style'])) {
    return 8;
  }
  return 7;
}

function bindingDataFlowHighlightPriority(effect: SemanticAuthoringExpectedEffectContractRow): number {
  if (expectedEffectHasFilterValue(effect, 'valueChannelKind', 'checked-collection-membership')) {
    return 0;
  }
  if (expectedEffectHasFilterValue(effect, 'valueChannelKind', 'select-single-option-value')
    || expectedEffectHasFilterValue(effect, 'valueChannelKind', 'select-multiple-option-values')) {
    return 1;
  }
  if (expectedEffectHasFilterValue(effect, 'valueChannelKind', 'checked-radio-value')) {
    return 2;
  }
  if (expectedEffectHasFilterValue(effect, 'targetProperty', 'checked')) {
    return 3;
  }
  if (expectedEffectHasFilterValue(effect, 'targetProperty', 'value')) {
    return 4;
  }
  if (expectedEffectHasAnyFilterValue(effect, 'targetProperty', ['class', 'style'])) {
    return 8;
  }
  return 6;
}

function expectedEffectHasFilterField(
  effect: SemanticAuthoringExpectedEffectContractRow,
  field: string,
): boolean {
  return effect.filters.some((filter) => filter.field === field);
}

function expectedEffectHasFilterValue(
  effect: SemanticAuthoringExpectedEffectContractRow,
  field: string,
  value: string | number | boolean | null,
): boolean {
  return effect.filters.some((filter) => filter.field === field && filter.value === value);
}

function expectedEffectHasAnyFilterValue(
  effect: SemanticAuthoringExpectedEffectContractRow,
  field: string,
  values: readonly (string | number | boolean | null)[],
): boolean {
  return effect.filters.some((filter) => filter.field === field && values.includes(filter.value));
}

function expectedEffectRolePriority(role: SemanticAuthoringExpectedEffectContractRow['role']): number {
  switch (role) {
    case 'discriminator':
      return 0;
    case 'signature':
      return 1;
    case 'baseline':
      return 2;
  }
}

function expectedEffectScopePriority(scope: SemanticAuthoringExpectedEffectContractRow['scope']): number {
  switch (scope) {
    case 'authoring':
      return 0;
    case 'di':
      return 1;
    case 'template':
      return 2;
    case 'route':
      return 3;
    case 'resource':
      return 4;
    case 'style':
      return 5;
    case 'project':
      return 6;
    case 'app':
      return 7;
  }
}

function authoringRecipePlanDisplayText(
  recipe: SemanticAuthoringRecipeCatalogRow,
  plan: ReturnType<typeof buildAuthoringRecipePlan>,
  usage: SemanticAuthoringRecipePlanUsage,
  steps: readonly SemanticAuthoringRecipePlanStepRow[],
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow | null,
  expectedEffectCount: number,
  expectedEffectHighlights: readonly SemanticAuthoringExpectedEffectHighlightRow[],
  includeText: boolean,
  effectDetail: SemanticAuthoringRecipePlanEffectDetail,
): string {
  const lines = [
    `Recipe ${recipe.key}: ${recipe.title}.`,
    recipePlanUsageDisplayLine(usage, sourcePlan),
    `Intent: ${plan.intent.summary}`,
    `Plan: ${steps.length} operation step(s), ${expectedEffectCount} expected effect(s), ${sourcePlan?.fileCount ?? 0} source file edit(s).`,
  ];
  const requiredPreconditions = plan.preconditions.filter((precondition) => precondition.required);
  if (requiredPreconditions.length > 0) {
    lines.push(`Required: ${requiredPreconditions.map((precondition) => precondition.summary).join(' ')}`);
  }
  const stepSummaries = recipePlanStepSummaries(steps, sourcePlan?.pattern ?? null).slice(0, 6);
  if (stepSummaries.length > 0) {
    lines.push(`${recipePlanStepSummaryLabel(sourcePlan?.pattern ?? null)}: ${stepSummaries.join(' ')}`);
  }
  if (steps.length > stepSummaries.length) {
    lines.push(`More steps: ${steps.length - stepSummaries.length} additional operation(s) are present in the structured response.`);
  }
  if (sourcePlan != null) {
    if (sourcePlan.pattern != null) {
      lines.push(recipeSourcePatternDisplayLine(sourcePlan.pattern, sourcePlan, usage));
    }
    const parameterApplicationLine = recipeSourceParameterApplicationDisplayLine(sourcePlan.sourceParameterApplications);
    if (parameterApplicationLine != null) {
      lines.push(parameterApplicationLine);
    }
    lines.push(recipeSourcePlanFileDisplayLine(sourcePlan, usage));
    lines.push(recipeToolingDisplayLine(sourcePlan, includeText));
  }
  const highlights = expectedEffectHighlights
    .slice(0, RECIPE_PLAN_DISPLAY_EXPECTED_EFFECT_HIGHLIGHT_LIMIT)
    .map((effect) => effect.summary);
  if (highlights.length > 0) {
    lines.push(`Semantic promises: ${highlights.join(' ')}`);
  }
  lines.push(effectDetail === 'contracts'
    ? 'Expected effects: row-level verification contracts are included.'
    : 'Expected effects: compact counts only; use effectDetail=contracts for verification rows.');
  return lines.join('\n');
}

function recipeSourcePatternDisplayLine(
  pattern: SemanticAuthoringSourcePatternRow,
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow | null,
  usage: SemanticAuthoringRecipePlanUsage,
): string {
  const firstAdaptationNote = pattern.adaptationNotes[0];
  const adaptation = semanticAuthoringSourcePatternNeedsCallerAdaptation(pattern)
    ? sourcePlanHasAppliedSourceParameters(sourcePlan)
      ? ''
      : ' Adapt advisory slots before emitting caller-specific source.'
    : firstAdaptationNote == null
      ? ''
      : ` ${firstAdaptationNote}`;
  const modules = recipeSourcePatternModuleSummary(pattern);
  const slots = recipeSourcePatternParameterSummary(pattern);
  const groups = recipeSourcePatternAdaptationGroupSummary(pattern);
  const hostAdaptedSlots = recipeSourcePatternHostAdaptedSlotSummary(pattern);
  const usageOverride = usage === 'pattern-reference'
    ? ' Requested usage is pattern-reference, so treat this as source-shape evidence and merge selectively even when the intrinsic source pattern can start a standalone app.'
    : '';
  return `Source pattern: ${pattern.title}; role ${pattern.role}; use ${pattern.usePolicy}; domain policy ${pattern.domainModelPolicy}; data policy ${pattern.dataPolicy}; style policy ${pattern.stylePolicy}; code economy ${pattern.codeEconomyPolicy}${modules}${slots}${groups}${hostAdaptedSlots}. ${pattern.summary} ${recipeSourcePatternUseSummary(pattern, sourcePlan)}${adaptation}${usageOverride}`;
}

function recipeSourcePatternUseSummary(
  pattern: SemanticAuthoringSourcePatternRow,
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow | null,
): string {
  return semanticAuthoringSourcePatternUseSummary(pattern, sourcePlanHasAppliedSourceParameters(sourcePlan));
}

function recipeSourcePatternModuleSummary(
  pattern: SemanticAuthoringSourcePatternRow,
): string {
  if (pattern.modules.length === 0) {
    return '';
  }
  return `; modules ${semanticAuthoringSourcePatternModuleSummary(pattern, 8)}`;
}

function recipeSourcePatternParameterSummary(
  pattern: SemanticAuthoringSourcePatternRow,
): string {
  if (pattern.parameters.length === 0) {
    return '';
  }
  const sourceTextLegend = pattern.parameters.some((parameter) => parameter.applicationPolicy === 'source-text-input')
    ? ' (*=source-text input)'
    : '';
  return `; adaptation slots ${semanticAuthoringSourcePatternParameterSummary(pattern, 6)}${sourceTextLegend}`;
}

function recipeSourcePatternAdaptationGroupSummary(
  pattern: SemanticAuthoringSourcePatternRow,
): string {
  if (pattern.adaptationGroups.length === 0) {
    return '';
  }
  return `; adaptation groups ${semanticAuthoringSourcePatternAdaptationGroupSummary(pattern, 3)}`;
}

function recipeSourcePatternHostAdaptedSlotSummary(
  pattern: SemanticAuthoringSourcePatternRow,
): string {
  const summary = semanticAuthoringSourcePatternHostAdaptedSlotSummary(pattern, 4);
  return summary.length === 0
    ? ''
    : `; host-adapted slots ${summary}`;
}

function recipeSourceParameterApplicationDisplayLine(
  applications: readonly SemanticAuthoringSourceParameterApplicationRow[],
): string | null {
  if (applications.length === 0) {
    return null;
  }
  const applied = applications.filter((application) => application.applicationState === 'applied-to-source-plan');
  const notApplied = applications.filter((application) => application.applicationState === 'not-applied-to-source-plan');
  const advisory = applications.filter((application) => application.applicationState === 'advisory-only');
  const unknown = applications.filter((application) => application.applicationState === 'unknown-parameter');
  const parts: string[] = [];
  if (applied.length > 0) {
    parts.push(`applied ${applied.map((application) => `${application.key}=${application.requestedValue}`).join(', ')}`);
  }
  if (notApplied.length > 0) {
    parts.push(`not-applied ${notApplied.map((application) => `${application.key}=${application.requestedValue}`).join(', ')}`);
  }
  if (advisory.length > 0) {
    parts.push(`advisory ${advisory.map((application) => `${application.key}=${application.requestedValue}`).join(', ')}`);
  }
  if (unknown.length > 0) {
    parts.push(`unknown ${unknown.map((application) => application.key).join(', ')}`);
  }
  return `Source parameters: ${parts.join('; ')}.`;
}

function recipeSourcePlanFileDisplayLine(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
  usage: SemanticAuthoringRecipePlanUsage,
): string {
  if (sourcePlan.pattern != null && semanticAuthoringSourcePatternNeedsCallerAdaptation(sourcePlan.pattern) && usage !== 'pattern-reference') {
    if (sourcePlanHasAppliedSourceParameters(sourcePlan)) {
      return `Source file roles: ${recipeSourcePlanRoleCounts(sourcePlan)}. Source text includes applied source parameters; review host-adapted slots before emitting caller-specific code.`;
    }
    return `Reference file roles: ${recipeSourcePlanRoleCounts(sourcePlan)}. Structured response contains concrete reference paths; adapt before emitting caller-specific code.`;
  }
  const roleSummary = sourcePlan.files
    .slice(0, 8)
    .map((file) => `${file.path} (${recipePlanFileRoleDisplay(file.role, usage)})`)
    .join('; ');
  const more = sourcePlan.files.length > 8
    ? `; plus ${sourcePlan.files.length - 8} more`
    : '';
  return usage === 'pattern-reference'
    ? `Pattern file shapes: ${roleSummary}${more}. Full sourcePlan still lists the complete scaffold; merge selectively.`
    : `Files: ${roleSummary}${more}.`;
}

function recipeSourcePlanRoleCounts(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
): string {
  const counts = new Map<SemanticAuthoringRecipeSourceFilePlanRow['role'], number>();
  for (const file of sourcePlan.files) {
    counts.set(file.role, (counts.get(file.role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => recipePlanFileRoleRank(left[0]) - recipePlanFileRoleRank(right[0])
      || left[0].localeCompare(right[0]))
    .map(([role, count]) => `${count} ${role}`)
    .join(', ');
}

function recipePlanFileRoleRank(
  role: SemanticAuthoringRecipeSourceFilePlanRow['role'],
): number {
  switch (role) {
    case 'entrypoint':
      return 0;
    case 'root-component':
      return 1;
    case 'template':
      return 2;
    case 'component':
      return 3;
    case 'state-model':
      return 4;
    case 'domain-model':
      return 5;
    case 'service':
      return 6;
    case 'component-style':
      return 7;
    case 'global-style':
      return 8;
    case 'project-config':
      return 9;
    case 'other':
      return 10;
  }
}

function recipePlanFileRoleDisplay(
  role: SemanticAuthoringRecipeSourceFilePlanRow['role'],
  usage: SemanticAuthoringRecipePlanUsage,
): string {
  if (usage !== 'pattern-reference') {
    return role;
  }
  switch (role) {
    case 'entrypoint':
      return 'entrypoint/config pattern';
    case 'root-component':
      return 'root component pattern';
    case 'template':
      return 'template pattern';
    case 'component':
      return 'component pattern';
    case 'state-model':
      return 'state/domain pattern';
    case 'domain-model':
      return 'domain model pattern';
    case 'component-style':
      return 'style pattern';
    default:
      return `${role} pattern`;
  }
}

function recipePlanUsageDisplayLine(
  usage: SemanticAuthoringRecipePlanUsage,
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow | null,
): string {
  if (usage === 'pattern-reference') {
    return 'Usage: pattern reference. Borrow relevant steps, semantic promises, and source shapes; merge them into the primary app plan rather than applying this full scaffold wholesale.';
  }
  const pattern = sourcePlan?.pattern ?? null;
  return pattern != null && semanticAuthoringSourcePatternNeedsCallerAdaptation(pattern)
    ? sourcePlanHasAppliedSourceParameters(sourcePlan)
      ? 'Usage: source-plan start. Use this recipe as the baseline architecture; applied source parameters are already caller-shaped, while host-adapted data, copy, and presentation still need review.'
      : 'Usage: source-plan start. Use this recipe as the baseline architecture, then adapt its reference domain names, data defaults, and presentation before emitting caller-specific app code.'
    : 'Usage: source-plan start. Use this recipe as the baseline source edit plan unless an existing app already provides that structure.';
}

function recipePlanStepSummaryLabel(
  pattern: SemanticAuthoringSourcePatternRow | null,
): string {
  return pattern != null && semanticAuthoringSourcePatternNeedsCallerAdaptation(pattern)
    ? 'Reference operation kinds'
    : 'Steps';
}

function recipePlanStepSummaries(
  steps: readonly SemanticAuthoringRecipePlanStepRow[],
  pattern: SemanticAuthoringSourcePatternRow | null,
): readonly string[] {
  return pattern != null && semanticAuthoringSourcePatternNeedsCallerAdaptation(pattern)
    ? uniqueValues(steps.map((step) => step.operationKind))
    : steps.map((step) => step.operationSummary);
}

function sourcePlanHasAppliedSourceParameters(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow | null | undefined,
): boolean {
  return sourcePlan != null
    && semanticAuthoringSourceParameterApplicationsHaveAppliedSourceText(sourcePlan.sourceParameterApplications);
}

function recipeToolingDisplayLine(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
  includeText: boolean,
): string {
  const buildToolPolicy = sourcePlan.projectTooling?.buildToolPolicy ?? 'not-modeled';
  return `Tooling: ${sourcePlan.packageToolingPolicy} package/typecheck artifacts; build-tool policy ${buildToolPolicy}; ${recipeSourceTextDisplayLine(sourcePlan, includeText)}`;
}

function recipeSourceTextDisplayLine(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
  includeText: boolean,
): string {
  const selection = sourcePlan.textSelection;
  const selectionSummary = recipeSourceTextSelectionSummary(sourcePlan, selection);
  const requestHintSummary = recipeSourceTextRequestHintSummary(sourcePlan);
  if (!includeText) {
    return selectionSummary == null
      ? `source/project-tooling text omitted; ${requestHintSummary}; pass includeText=true when concrete file contents are needed.`
      : `source/project-tooling text omitted; ${selectionSummary}; ${requestHintSummary}; pass includeText=true when concrete file contents are needed.`;
  }
  const sourceFileCount = sourcePlan.files.length;
  const toolingFileCount = sourcePlan.projectTooling?.files.length ?? 0;
  const sourceFileTextCount = sourcePlan.files.filter((file) => file.text != null).length;
  const toolingFileTextCount = sourcePlan.projectTooling?.files.filter((file) => file.text != null).length ?? 0;
  const totalFileCount = sourceFileCount + toolingFileCount;
  const totalTextCount = sourceFileTextCount + toolingFileTextCount;
  return selectionSummary == null
    ? `source/project-tooling text included for ${totalTextCount} of ${totalFileCount} generated source/tooling artifact(s).`
    : `source/project-tooling text included for ${totalTextCount} of ${totalFileCount} generated source/tooling artifact(s); ${selectionSummary}.`;
}

function recipeSourceTextRequestHintSummary(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
): string {
  if (sourcePlan.textRequestHints.length === 0) {
    return 'no sourceFilePaths request hints';
  }
  const summary = sourcePlan.textRequestHints
    .map((hint) => `${hint.key}(${hint.sourceFilePaths.length + hint.projectToolingPaths.length})`)
    .join(', ');
  return `sourceFilePaths request hints ${summary}`;
}

function recipeSourceTextSelectionSummary(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
  selection: SemanticAuthoringRecipeSourceTextSelectionRow,
): string | null {
  if (selection.requestedHintKeys.length === 0 && selection.requestedPaths.length === 0) {
    return null;
  }
  const parts: string[] = [];
  if (selection.requestedHintKeys.length > 0) {
    parts.push(`requested ${selection.requestedHintKeys.length} hint(s), matched ${selection.matchedHintKeys.length}, unmatched ${selection.unmatchedHintKeys.length}`);
  }
  if (selection.requestedPaths.length > 0) {
    parts.push(`requested ${selection.requestedPaths.length} path(s), matched ${selection.matchedPaths.length}, unmatched ${selection.unmatchedPaths.length}`);
  }
  const summary = parts.join('; ');
  if (selection.unmatchedPaths.length === 0 && selection.unmatchedHintKeys.length === 0) {
    return summary;
  }
  const availablePaths = recipeSourceTextAvailablePathPreview(sourcePlan);
  return availablePaths.length === 0
    ? summary
    : `${summary}; available paths include ${availablePaths.join(', ')}`;
}

function recipeSourceTextAvailablePathPreview(
  sourcePlan: SemanticAuthoringRecipeSourcePlanRow,
): readonly string[] {
  const paths = [
    ...sourcePlan.files.map((file) => file.path),
    ...(sourcePlan.projectTooling?.files.map((file) => file.path) ?? []),
  ].sort();
  return paths.length <= 8
    ? paths
    : [...paths.slice(0, 8), `+${paths.length - 8} more`];
}

function authoringRecipeSourcePlanRow(
  sourcePlan: AuthoringSourceEditPlan | null,
  includeText: boolean,
  selectedText: RecipeSourceTextSelection,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): SemanticAuthoringRecipeSourcePlanRow | null {
  if (sourcePlan == null) {
    return null;
  }
  const files = sourcePlan.files.map((file): SemanticAuthoringRecipeSourceFilePlanRow => ({
    path: file.path,
    role: file.role,
    language: file.language,
    editKind: file.editKind,
    operationKind: file.operationKind,
    textAuthority: file.text?.authority ?? null,
    textLength: file.text?.text.length ?? null,
    text: shouldIncludeRecipeSourceText(file.path, includeText, selectedText.includedTextPaths)
      ? file.text?.text ?? null
      : null,
  }));
  const projectTooling = authoringRecipeProjectToolingPlanRow(sourcePlan.projectTooling, includeText, selectedText.includedTextPaths);
  return {
    rootDir: sourcePlan.rootDir,
    conflictPolicy: sourcePlan.policy.conflictPolicy,
    formattingPolicy: sourcePlan.policy.formattingPolicy,
    packageToolingPolicy: sourcePlan.policy.packageToolingPolicy,
    pattern: semanticAuthoringSourcePatternRow(sourcePlan.pattern),
    sourceParameterApplications: authoringSourceParameterApplicationRows(sourcePlan, sourceParameterValues),
    hasCompleteFileText: sourcePlan.hasCompleteFileText,
    fileCount: sourcePlan.files.length,
    textRequestHints: recipeSourceTextRequestHints(files, projectTooling),
    textSelection: recipeSourceTextSelectionRow(files, projectTooling, selectedText),
    files,
    projectTooling,
  };
}

function recipeSourceTextRequestHints(
  files: readonly SemanticAuthoringRecipeSourceFilePlanRow[],
  projectTooling: SemanticAuthoringRecipeProjectToolingPlanRow | null,
): readonly SemanticAuthoringRecipeSourceTextRequestHintRow[] {
  return recipeSourceTextRequestHintsForArtifacts(files, projectTooling?.files ?? []);
}

interface RecipeSourceTextHintSourceFile {
  readonly path: string;
  readonly role: SemanticAuthoringRecipeSourceFilePlanRow['role'];
}

interface RecipeSourceTextHintToolingFile {
  readonly path: string;
}

function recipeSourceTextRequestHintsForArtifacts(
  files: readonly RecipeSourceTextHintSourceFile[],
  projectToolingFiles: readonly RecipeSourceTextHintToolingFile[],
): readonly SemanticAuthoringRecipeSourceTextRequestHintRow[] {
  const hints = [
    sourceTextRequestHint(
      'implementation-source',
      'Implementation source without reference presentation',
      'Use when emitting or adapting the main application source while omitting reference CSS/presentation; pair with project-tooling when starting a new project.',
      files,
      ['entrypoint', 'root-component', 'component', 'template', 'state-model', 'domain-model', 'service'],
    ),
    sourceTextRequestHint(
      'entry-shell',
      'Entrypoint and component shell',
      'Use when checking root admission, component registration, and app-shell wiring before opening the whole plan.',
      files,
      ['entrypoint', 'root-component', 'component'],
    ),
    sourceTextRequestHint(
      'templates',
      'Templates',
      'Use when adapting bindings, route links, value channels, or template-controller structure.',
      files,
      ['template'],
    ),
    sourceTextRequestHint(
      'state-domain-service',
      'State, domain, and service model',
      'Use when adapting caller data shape, DI-owned state, service boundaries, derived getters, and source-backed behavior.',
      files,
      ['state-model', 'domain-model', 'service'],
    ),
    sourceTextRequestHint(
      'presentation',
      'Presentation files',
      'Use only when adapting or intentionally adopting reference presentation; omit for low-boilerplate domain work.',
      files,
      ['component-style', 'global-style'],
    ),
    {
      key: 'project-tooling',
      title: 'Project tooling files',
      summary: 'Use when package, dependency, tsconfig, or build-tool setup is needed.',
      sourceFilePaths: files
        .filter((file) => file.role === 'project-config')
        .map((file) => file.path),
      projectToolingPaths: projectToolingFiles.map((file) => file.path),
    },
  ];
  return hints.filter((hint) => hint.sourceFilePaths.length + hint.projectToolingPaths.length > 0);
}

function sourceTextRequestHint(
  key: string,
  title: string,
  summary: string,
  files: readonly RecipeSourceTextHintSourceFile[],
  roles: readonly RecipeSourceTextHintSourceFile['role'][],
): SemanticAuthoringRecipeSourceTextRequestHintRow {
  return {
    key,
    title,
    summary,
    sourceFilePaths: files
      .filter((file) => roles.includes(file.role))
      .map((file) => file.path),
    projectToolingPaths: [],
  };
}

function authoringSourceParameterApplicationRows(
  sourcePlan: AuthoringSourceEditPlan,
  sourceParameterValues: readonly AuthoringSourcePatternParameterValue[],
): readonly SemanticAuthoringSourceParameterApplicationRow[] {
  return authoringSourceParameterApplications(sourcePlan, sourceParameterValues);
}

function authoringRecipeProjectToolingPlanRow(
  plan: AuthoringProjectToolingPlan | null,
  includeText: boolean,
  includedTextPaths: ReadonlySet<string> | null,
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
    text: shouldIncludeRecipeSourceText(file.path, includeText, includedTextPaths) ? file.text : null,
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

interface RecipeSourceTextSelection {
  readonly includedTextPaths: ReadonlySet<string> | null;
  readonly requestedPathSelection: ReadonlySet<string> | null;
  readonly requestedHintKeys: readonly string[];
  readonly matchedHintKeys: readonly string[];
  readonly unmatchedHintKeys: readonly string[];
}

function recipeSourceTextSelection(
  sourcePlan: AuthoringSourceEditPlan | null,
  paths: readonly string[] | null | undefined,
  hintKeys: readonly string[] | null | undefined,
): RecipeSourceTextSelection {
  const requestedPaths = recipeSourcePathSelection(paths);
  const requestedHintKeys = recipeSourceHintKeySelection(hintKeys);
  const hintSelection = recipeSourceHintPathSelection(sourcePlan, requestedHintKeys);
  return {
    includedTextPaths: mergeRecipeSourcePathSelections(requestedPaths, hintSelection.paths),
    requestedPathSelection: requestedPaths,
    requestedHintKeys,
    matchedHintKeys: hintSelection.matchedHintKeys,
    unmatchedHintKeys: hintSelection.unmatchedHintKeys,
  };
}

function recipeSourcePathSelection(paths: readonly string[] | null | undefined): ReadonlySet<string> | null {
  if (paths == null || paths.length === 0) {
    return null;
  }
  return new Set(paths.map(normalizeRecipeSourcePath).filter((path) => path.length > 0));
}

function recipeSourceHintKeySelection(keys: readonly string[] | null | undefined): readonly string[] {
  if (keys == null || keys.length === 0) {
    return [];
  }
  return uniqueValues(keys
    .map((key) => normalizeRecipeSourceHintKey(key))
    .filter((key) => key.length > 0))
    .slice()
    .sort();
}

function recipeSourceHintPathSelection(
  sourcePlan: AuthoringSourceEditPlan | null,
  requestedHintKeys: readonly string[],
): {
  readonly paths: ReadonlySet<string> | null;
  readonly matchedHintKeys: readonly string[];
  readonly unmatchedHintKeys: readonly string[];
} {
  if (requestedHintKeys.length === 0 || sourcePlan == null) {
    return {
      paths: null,
      matchedHintKeys: [],
      unmatchedHintKeys: requestedHintKeys,
    };
  }
  const hintsByKey = new Map(recipeSourceTextRequestHintsForArtifacts(
    sourcePlan.files,
    sourcePlan.projectTooling?.files ?? [],
  ).map((hint) => [hint.key, hint]));
  const selectedPaths: string[] = [];
  const matchedHintKeys: string[] = [];
  const unmatchedHintKeys: string[] = [];
  for (const hintKey of requestedHintKeys) {
    const hint = hintsByKey.get(hintKey);
    if (hint == null) {
      unmatchedHintKeys.push(hintKey);
      continue;
    }
    matchedHintKeys.push(hintKey);
    selectedPaths.push(...hint.sourceFilePaths, ...hint.projectToolingPaths);
  }
  return {
    paths: recipeSourcePathSelection(selectedPaths),
    matchedHintKeys,
    unmatchedHintKeys,
  };
}

function mergeRecipeSourcePathSelections(
  left: ReadonlySet<string> | null,
  right: ReadonlySet<string> | null,
): ReadonlySet<string> | null {
  if (left == null) {
    return right;
  }
  if (right == null) {
    return left;
  }
  return new Set([...left, ...right]);
}

function normalizeSourceParameterValues(
  values: readonly { readonly key: string; readonly value: string }[] | null | undefined,
): readonly AuthoringSourcePatternParameterValue[] {
  if (values == null || values.length === 0) {
    return [];
  }
  const byKey = new Map<string, AuthoringSourcePatternParameterValue>();
  for (const value of values) {
    const key = value.key.trim();
    const requestedValue = value.value.trim();
    if (key.length === 0 || requestedValue.length === 0) {
      continue;
    }
    byKey.set(key, {
      key,
      value: requestedValue,
    });
  }
  return [...byKey.values()];
}

function shouldIncludeRecipeSourceText(
  filePath: string,
  includeText: boolean,
  includedTextPaths: ReadonlySet<string> | null,
): boolean {
  return includeText && (includedTextPaths == null || includedTextPaths.has(normalizeRecipeSourcePath(filePath)));
}

function recipeSourceTextSelectionRow(
  files: readonly SemanticAuthoringRecipeSourceFilePlanRow[],
  projectTooling: SemanticAuthoringRecipeProjectToolingPlanRow | null,
  selectedText: RecipeSourceTextSelection,
): SemanticAuthoringRecipeSourcePlanRow['textSelection'] {
  const requestedPathSelection = selectedText.requestedPathSelection;
  const allPaths = [
    ...files.map((file) => file.path),
    ...(projectTooling?.files.map((file) => file.path) ?? []),
  ];
  const normalizedAllPaths = new Map(allPaths.map((path) => [normalizeRecipeSourcePath(path), path]));
  const requestedPaths = requestedPathSelection == null ? [] : [...requestedPathSelection].sort();
  const matchedPaths = requestedPaths
    .filter((path) => normalizedAllPaths.has(path))
    .map((path) => normalizedAllPaths.get(path) ?? path);
  const unmatchedPaths = requestedPaths.filter((path) => !normalizedAllPaths.has(path));
  const includedPaths = [
    ...files.filter((file) => file.text != null).map((file) => file.path),
    ...(projectTooling?.files.filter((file) => file.text != null).map((file) => file.path) ?? []),
  ];
  return {
    requestedHintKeys: selectedText.requestedHintKeys,
    matchedHintKeys: selectedText.matchedHintKeys,
    unmatchedHintKeys: selectedText.unmatchedHintKeys,
    requestedPaths,
    matchedPaths: matchedPaths.sort(),
    unmatchedPaths,
    includedPaths: includedPaths.sort(),
  };
}

function normalizeRecipeSourcePath(filePath: string): string {
  return filePath.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizeRecipeSourceHintKey(key: string): string {
  return key.trim().toLowerCase();
}
