import type {
  SemanticAuthoringGuidanceDecisionRow,
  SemanticAuthoringGuidanceFeatureSignalRow,
  SemanticAuthoringGuidanceFocus,
  SemanticAuthoringGuidancePrincipleRow,
  SemanticAuthoringGuidanceRecipePlanRow,
  SemanticAuthoringGuidanceRecipeRow,
} from './contracts.js';
import {
  semanticAuthoringSourcePatternAdaptationGroupSummary,
  semanticAuthoringSourcePatternHostAdaptedSlotSummary,
  semanticAuthoringSourcePatternModuleSummary,
  semanticAuthoringSourcePatternNeedsCallerAdaptation,
  semanticAuthoringSourcePatternParameterSummary,
} from './authoring-source-pattern-display.js';

const DEFAULT_APP_BUILDING_RECIPE_DISPLAY_LIMIT = 4;

export function guidanceDisplayText(
  focus: SemanticAuthoringGuidanceFocus,
  hasFeatureGoal: boolean,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  selectedRecipeKey: string | null,
  candidateRecipeCount: number,
  principles: readonly SemanticAuthoringGuidancePrincipleRow[],
  decisions: readonly SemanticAuthoringGuidanceDecisionRow[],
  recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
  recipes: readonly SemanticAuthoringGuidanceRecipeRow[],
): string {
  const recipeDisplayLimit = guidanceRecipeDisplayLimit(focus, selectedRecipeKey, recipes.length);
  const lines = [
    selectedRecipeKey == null
      ? `Focus: ${focus}. Start from recipe-backed guidance before emitting source.`
      : `Recipe: ${selectedRecipeKey}. Use this as source-plan guidance, not a one-off scaffold.`,
    featureGoalSignals.length === 0
      ? hasFeatureGoal
        ? 'Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.'
        : null
      : `Feature goal signals: ${featureGoalSignals.map(guidanceFeatureSignalDisplay).join(', ')}.`,
    selectedRecipeKey == null
      ? guidanceRecipeCountDisplayLine(
        candidateRecipeCount,
        recipes.length,
        recipeDisplayLimit,
        featureGoalSignals.length > 0,
      )
      : null,
    recipePlanSequence.length === 0
      ? null
      : guidanceRecipePlanSequenceDisplayLine(recipePlanSequence),
    recipePlanSequence.length === 0
      ? null
      : guidanceSuggestedSourceParameterDisplayLine(recipePlanSequence),
    recipePlanSequence.length === 0
      ? null
      : guidanceSuggestedSourceParameterContractDisplayLine(recipePlanSequence),
    ...principles.map(guidancePrincipleDisplayLine),
    ...decisions.map(guidanceDecisionDisplayLine),
    ...recipes.slice(0, recipeDisplayLimit).flatMap((recipe) => guidanceRecipeDisplayLines(recipe, selectedRecipeKey != null)),
    selectedRecipeKey == null
      ? guidanceNextDisplayLine(recipePlanSequence, hasFeatureGoal, featureGoalSignals.length > 0)
      : `Next: call aurelia_authoring_recipe_plan with recipeKey=${selectedRecipeKey}; keep includeText=false until concrete source text is needed.`,
  ];
  return lines.filter((line): line is string => line != null).join('\n');
}

function guidanceNextDisplayLine(
  recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
  hasFeatureGoal: boolean,
  hasFeatureGoalSignalMatch: boolean,
): string {
  if (recipePlanSequence.length === 0) {
    if (hasFeatureGoal && !hasFeatureGoalSignalMatch) {
      return 'Next: no confident recipe path was selected; refine the feature goal, compare catalog rows, or inspect an existing app before requesting recipe source text.';
    }
    return 'Next: choose a recipeKey and call aurelia_authoring_recipe_plan; for existing apps, pair aurelia_app_overview with aurelia_authoring_orientation.';
  }
  if (recipePlanSequence.length === 1) {
    const row = recipePlanSequence[0];
    if (row == null) {
      return 'Next: choose a recipeKey and call aurelia_authoring_recipe_plan; for existing apps, pair aurelia_app_overview with aurelia_authoring_orientation.';
    }
    const sourceParameterSuffix = row.suggestedSourceParameterValues.length === 0
      ? ''
      : ' and pass the suggested sourceParameterValues when they match the caller domain';
    return `Next: call aurelia_authoring_recipe_plan with recipeKey=${row.recipeKey} and usage=${row.usage}${sourceParameterSuffix}; for existing apps, pair aurelia_app_overview with aurelia_authoring_orientation.`;
  }
  return 'Next: call aurelia_authoring_recipe_plan for the recipe path rows in order, passing each row usage; for existing apps, pair aurelia_app_overview with aurelia_authoring_orientation.';
}

function guidanceRecipeDisplayLimit(
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: string | null,
  recipeCount: number,
): number {
  if (selectedRecipeKey != null) {
    return Math.min(1, recipeCount);
  }
  const defaultLimit = focus === 'plugins'
    ? 5
    : DEFAULT_APP_BUILDING_RECIPE_DISPLAY_LIMIT;
  return Math.min(defaultLimit, recipeCount);
}

function guidanceRecipeCountDisplayLine(
  candidateRecipeCount: number,
  returnedRecipeCount: number,
  displayedRecipeCount: number,
  hasFeatureGoalSignalMatch: boolean,
): string | null {
  if (returnedRecipeCount === 0) {
    return null;
  }
  if (hasFeatureGoalSignalMatch) {
    const text =
      displayedRecipeCount < returnedRecipeCount
        ? `; text highlights ${displayedRecipeCount}, and structured rows include all returned comparison recipes`
        : '';
    const followUp =
      returnedRecipeCount < candidateRecipeCount
        ? '; call aurelia_authoring_catalog when comparing the full recipe set'
        : '';
    return `Returned ${returnedRecipeCount} compact comparison recipe row${returnedRecipeCount === 1 ? '' : 's'} from ${candidateRecipeCount} ranked recipe candidate${candidateRecipeCount === 1 ? '' : 's'}${text}${followUp}.`;
  }
  const returned =
    returnedRecipeCount < candidateRecipeCount
      ? `Returned ${returnedRecipeCount} of ${candidateRecipeCount} structured recipe candidates`
      : `Returned ${returnedRecipeCount} structured recipe candidate${returnedRecipeCount === 1 ? '' : 's'}`;
  const text =
    displayedRecipeCount < returnedRecipeCount
      ? `; text highlights ${displayedRecipeCount}, and structured rows include all returned recipes`
      : '';
  const followUp =
    returnedRecipeCount < candidateRecipeCount
      ? '; pass recipeLimit or call aurelia_authoring_catalog when comparing the full set'
      : '';
  return `${returned}${text}${followUp}.`;
}

function guidanceFeatureSignalDisplay(
  signal: SemanticAuthoringGuidanceFeatureSignalRow,
): string {
  return `${signal.key} (${signal.planningLayer})`;
}

function guidanceRecipePlanSequenceDisplayLine(
  recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
): string {
  return `Recipe path: ${recipePlanSequence.map(guidanceRecipePlanStepDisplay).join('; then ')}.`;
}

function guidanceSuggestedSourceParameterDisplayLine(
  recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
): string | null {
  const suggestions = recipePlanSequence
    .filter((row) => row.suggestedSourceParameterValues.length > 0)
    .map((row) =>
      `${guidanceRecipePlanRowLabel(row)}: ${row.suggestedSourceParameterValues
        .map((value) => `${value.key}=${value.value}`)
        .join(', ')}`
    );
  const hasHostAdaptedSlot = recipePlanSequence.some((row) =>
    row.suggestedSourceParameterContracts.some((contract) => contract.applicationPolicy !== 'source-text-input')
  );
  return suggestions.length === 0
    ? null
    : `Suggested sourceParameterValues: ${suggestions.join('; ')}. ${hasHostAdaptedSlot ? 'Review before applying; advisory-only slots still require host/source adaptation.' : 'Review values before applying.'}`;
}

function guidanceSuggestedSourceParameterContractDisplayLine(
  recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[],
): string | null {
  const contracts = recipePlanSequence
    .filter((row) => row.suggestedSourceParameterContracts.length > 0)
    .map((row) => {
      const parameterContracts = row.suggestedSourceParameterContracts
        .map((contract) => `${contract.key}{${contract.valueShape ?? 'unknown'}/${contract.applicationPolicy ?? 'unknown'}}`)
        .join(', ');
      return `${guidanceRecipePlanRowLabel(row)}: ${parameterContracts}`;
    });
  return contracts.length === 0
    ? null
    : `Suggested sourceParameterValue contracts: ${contracts.join('; ')}.`;
}

function guidanceRecipePlanStepDisplay(
  row: SemanticAuthoringGuidanceRecipePlanRow,
): string {
  const label = guidanceRecipePlanRowLabel(row);
  const covered = row.instanceLabel == null
    ? row.newFeatureSignals.join(', ')
    : `${row.instanceLabel} collection`;
  return row.role === 'primary'
    ? `start with ${label} for ${covered}`
    : `borrow ${label} patterns for ${covered}`;
}

function guidanceRecipePlanRowLabel(
  row: SemanticAuthoringGuidanceRecipePlanRow,
): string {
  return row.instanceLabel == null || row.instanceLabel.length === 0
    ? row.recipeKey
    : `${row.recipeKey}[${row.instanceLabel}]`;
}

function guidancePrincipleDisplayLine(
  principle: SemanticAuthoringGuidancePrincipleRow,
): string {
  const prefer = principle.prefer[0];
  return prefer == null
    ? `Principle: ${principle.summary}`
    : `Principle: ${principle.summary} Prefer: ${prefer}`;
}

function guidanceDecisionDisplayLine(
  decision: SemanticAuthoringGuidanceDecisionRow,
): string {
  return `Decision ${decision.key}: ${decision.question} ${decision.recommendation}`;
}

function guidanceRecipeDisplayLines(
  recipe: SemanticAuthoringGuidanceRecipeRow,
  includePreferAvoid: boolean,
): readonly string[] {
  return [
    `Recipe ${recipe.recipeKey}: ${recipe.whenToUse}`,
    `Shape: ${recipe.codeShape}`,
    ...guidanceRecipeSourcePatternDisplayLines(recipe, includePreferAvoid),
    ...(includePreferAvoid
      ? [
        ...recipe.prefer.slice(0, 2).map((line) => `Prefer: ${line}`),
        ...recipe.avoid.slice(0, 2).map((line) => `Avoid: ${line}`),
      ]
      : []),
  ];
}

function guidanceRecipeSourcePatternDisplayLines(
  recipe: SemanticAuthoringGuidanceRecipeRow,
  includeDetail: boolean,
): readonly string[] {
  const pattern = recipe.sourcePattern;
  if (pattern == null || !semanticAuthoringSourcePatternNeedsCallerAdaptation(pattern)) {
    return [];
  }
  if (!includeDetail) {
    return [guidanceRecipeSourcePatternCompactDisplayLine(pattern)];
  }
  const modules = pattern.modules.length === 0
    ? ''
    : ` Modules: ${semanticAuthoringSourcePatternModuleSummary(pattern, 8)}.`;
  const slots = pattern.parameters.length === 0
    ? ''
    : ` Adaptation slots: ${semanticAuthoringSourcePatternParameterSummary(pattern, 6)}${pattern.parameters.some((parameter) => parameter.applicationPolicy === 'source-text-input') ? ' (*=source-text input)' : ''}.`;
  const groups = pattern.adaptationGroups.length === 0
    ? ''
    : ` Adaptation groups: ${semanticAuthoringSourcePatternAdaptationGroupSummary(pattern, 3)}.`;
  const hostAdaptedSlots = guidanceRecipeSourcePatternHostAdaptedSlotLine(pattern);
  return [
    `Source pattern: ${pattern.title}; role ${pattern.role}; use ${pattern.usePolicy}; data policy ${pattern.dataPolicy}; code economy ${pattern.codeEconomyPolicy}. ${pattern.useSummary}${modules}${slots}${groups}${hostAdaptedSlots}`,
  ];
}

function guidanceRecipeSourcePatternCompactDisplayLine(
  pattern: SemanticAuthoringGuidanceRecipeRow['sourcePattern'] & {},
): string {
  switch (pattern.usePolicy) {
    case 'adapt-before-emitting':
      return 'Source pattern: adapt-before-emitting reference material; adapt nouns, data, copy, and presentation into the caller domain before emitting source.';
    case 'merge-selectively':
      return 'Source pattern: merge-selectively companion material; borrow only the relevant pieces when combining recipes.';
    case 'analysis-pressure-only':
      return 'Source pattern: analysis-pressure-only; do not emit this source as user app code.';
    case 'apply-as-source-start':
      return 'Source pattern: apply-as-source-start scaffold.';
  }
}

function guidanceRecipeSourcePatternHostAdaptedSlotLine(
  pattern: SemanticAuthoringGuidanceRecipeRow['sourcePattern'] & {},
): string {
  const summary = semanticAuthoringSourcePatternHostAdaptedSlotSummary(pattern, 4);
  return summary.length === 0
    ? ''
    : ` Host-adapted slots: ${summary}.`;
}
