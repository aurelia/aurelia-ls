import {
  isAuthoringRecipeKey,
  type AuthoringRecipeKey,
} from '../authoring/recipe.js';
import { answer } from './answer-helpers.js';
import { readSemanticAuthoringCatalog } from './authoring-catalog.js';
import { guidanceRecipeKeysByFocus } from './authoring-guidance-catalog.js';
import { guidanceDisplayText } from './authoring-guidance-display.js';
import {
  featureGoalComparisonRecipeKeys,
  featureGoalSignalsForGoal,
  guidanceRecipePlanSequence,
  rankRecipeKeysForFeatureGoal,
} from './authoring-guidance-feature-goals.js';
import {
  guidanceRecipePlanSequenceWithSourceParameterContracts,
  guidanceRecipeRow,
  requiredCatalogRecipe,
} from './authoring-guidance-recipe-row.js';
import {
  candidateGuidanceDecisionRows,
  candidateGuidancePrincipleRows,
  followUpsForGuidance,
  guidanceDecisionLimit,
  guidancePrincipleLimit,
  guidanceRecipeLimit,
  normalizeFeatureGoal,
  normalizeGuidanceDetail,
  normalizeGuidanceFocus,
} from './authoring-guidance-selection.js';
import {
  SemanticRuntimeAnswerOutcome,
  type SemanticAuthoringGuidanceDecisionRow,
  type SemanticAuthoringGuidanceDetail,
  type SemanticAuthoringGuidanceFeatureSignalRow,
  type SemanticAuthoringGuidanceFocus,
  type SemanticAuthoringGuidancePrincipleRow,
  type SemanticAuthoringGuidanceRecipePlanRow,
  type SemanticAuthoringGuidanceRecipeRow,
  type SemanticAuthoringGuidanceRequest,
  type SemanticAuthoringGuidanceResult,
  type SemanticAuthoringRecipeCatalogRow,
  type SemanticAuthoringSourceParameterValueInput,
  type SemanticRuntimeAnswer,
} from './contracts.js';

const MCP_APP_BUILDING_GUIDANCE_PROFILE = {
  key: 'mcp-app-building',
  title: 'MCP App-Building Preview',
  summary: 'Compact public guidance for generating clean Aurelia code through semantic-runtime recipes and app facts.',
  priority: [
    'Low-boilerplate Aurelia code that uses framework observation correctly.',
    'Common forms, state, plugin, and router patterns before fringe API parity.',
    'Expected-effect verification so generated source is meaningful after reopen.',
  ],
  nonGoals: [
    'Full viewport edge-case parity in the first app-building preview.',
    'Using MCP as an Atlas, Work Router, or internal corpus transport.',
    'Choosing package manager or build-tool policy without host input.',
  ],
} as const;

export function readSemanticAuthoringGuidance(
  request: SemanticAuthoringGuidanceRequest = {},
): SemanticRuntimeAnswer<SemanticAuthoringGuidanceResult | null> {
  const focus = normalizeGuidanceFocus(request.focus);
  const detail = normalizeGuidanceDetail(request.detail);
  const featureGoal = normalizeFeatureGoal(request.featureGoal);
  const featureGoalSignals = featureGoal == null
    ? []
    : featureGoalSignalsForGoal(featureGoal);
  const selectedRecipeKey = request.recipeKey ?? null;
  if (selectedRecipeKey != null && !isAuthoringRecipeKey(selectedRecipeKey)) {
    return answer(
      SemanticRuntimeAnswerOutcome.Unsupported,
      `Unknown authoring recipe '${selectedRecipeKey}'.`,
      null,
    );
  }

  const catalog = readSemanticAuthoringCatalog();
  const recipeSelection = selectGuidanceRecipes(
    focus,
    detail,
    featureGoal,
    featureGoalSignals,
    selectedRecipeKey,
    request.recipeLimit,
    catalog.recipes,
  );
  const policyRows = selectGuidancePolicyRows(
    focus,
    detail,
    selectedRecipeKey,
    featureGoalSignals,
    recipeSelection.candidateRecipeKeys,
    request.principleLimit,
    request.decisionLimit,
  );
  const value = guidanceResult(
    focus,
    detail,
    featureGoal,
    featureGoalSignals,
    selectedRecipeKey,
    recipeSelection,
    policyRows,
  );

  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read ${focus} authoring guidance (${detail}) with ${value.principles.length} principle row(s), ${value.decisions.length} decision row(s), and ${value.recipes.length} recipe row(s).`,
    value,
  );
}

interface GuidanceRecipeSelection {
  readonly candidateRecipeKeys: readonly AuthoringRecipeKey[];
  readonly recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[];
  readonly recipes: readonly SemanticAuthoringGuidanceRecipeRow[];
}

function selectGuidanceRecipes(
  focus: SemanticAuthoringGuidanceFocus,
  detail: SemanticAuthoringGuidanceDetail,
  featureGoal: string | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  selectedRecipeKey: AuthoringRecipeKey | null,
  requestedRecipeLimit: number | null | undefined,
  catalogRecipes: readonly SemanticAuthoringRecipeCatalogRow[],
): GuidanceRecipeSelection {
  const candidateRecipeKeys = selectedRecipeKey == null
    ? rankRecipeKeysForFeatureGoal(guidanceRecipeKeysByFocus[focus], featureGoalSignals)
    : [selectedRecipeKey];
  const rawRecipePlanSequence = selectedRecipeKey == null
    ? guidanceRecipePlanSequence(candidateRecipeKeys, featureGoalSignals, featureGoal)
    : [];
  const recipePlanSequence = guidanceRecipePlanSequenceWithSourceParameterContracts(
    rawRecipePlanSequence,
    catalogRecipes,
  );
  const plannedRecipeKeys = recipePlanSequence
    .map((row) => row.recipeKey)
    .filter(isAuthoringRecipeKey);
  const returnedCandidateRecipeKeys: readonly AuthoringRecipeKey[] = selectedRecipeKey == null
    ? featureGoalComparisonRecipeKeys(candidateRecipeKeys, plannedRecipeKeys, featureGoalSignals)
    : candidateRecipeKeys;
  const recipeKeys = selectedRecipeKey == null
    ? returnedCandidateRecipeKeys.slice(0, guidanceRecipeLimit(
      requestedRecipeLimit,
      detail,
      focus,
      returnedCandidateRecipeKeys.length,
      featureGoalSignals.length,
    ))
    : returnedCandidateRecipeKeys;
  const sequenceByRecipeKey = new Map(recipePlanSequence.map((row) => [row.recipeKey, row]));
  const primaryRecipePlanRow = recipePlanSequence.find((row) => row.role === 'primary') ?? null;
  const recipes = recipeKeys.map((recipeKey) => {
    const recipe = requiredCatalogRecipe(catalogRecipes, recipeKey);
    const plannedParameterValues = sequenceByRecipeKey.get(recipeKey)?.suggestedSourceParameterValues;
    return guidanceRecipeRow(
      recipeKey,
      recipe,
      detail,
      plannedParameterValues ?? transferableGuidanceSourceParameterValues(recipe, primaryRecipePlanRow),
    );
  });
  return {
    candidateRecipeKeys,
    recipePlanSequence,
    recipes,
  };
}

function transferableGuidanceSourceParameterValues(
  recipe: SemanticAuthoringRecipeCatalogRow,
  primaryRecipePlanRow: SemanticAuthoringGuidanceRecipePlanRow | null,
): readonly SemanticAuthoringSourceParameterValueInput[] {
  if (primaryRecipePlanRow == null) {
    return [];
  }
  const sourceTextParameterKeys = new Set((recipe.sourcePlan?.pattern?.parameters ?? [])
    .filter((parameter) => parameter.applicationPolicy === 'source-text-input')
    .map((parameter) => parameter.key));
  return primaryRecipePlanRow.suggestedSourceParameterValues
    .filter((value) => sourceTextParameterKeys.has(value.key));
}

interface GuidancePolicyRows {
  readonly candidatePrincipleCount: number;
  readonly candidateDecisionCount: number;
  readonly principles: readonly SemanticAuthoringGuidancePrincipleRow[];
  readonly decisions: readonly SemanticAuthoringGuidanceDecisionRow[];
}

function selectGuidancePolicyRows(
  focus: SemanticAuthoringGuidanceFocus,
  detail: SemanticAuthoringGuidanceDetail,
  selectedRecipeKey: AuthoringRecipeKey | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  candidateRecipeKeys: readonly AuthoringRecipeKey[],
  requestedPrincipleLimit: number | null | undefined,
  requestedDecisionLimit: number | null | undefined,
): GuidancePolicyRows {
  const candidatePrinciples = candidateGuidancePrincipleRows(
    focus,
    selectedRecipeKey,
    featureGoalSignals,
    candidateRecipeKeys,
    detail,
  );
  const candidateDecisions = candidateGuidanceDecisionRows(
    focus,
    selectedRecipeKey,
    featureGoalSignals,
    candidateRecipeKeys,
    detail,
  );
  const principles = candidatePrinciples.slice(0, guidancePrincipleLimit(
    requestedPrincipleLimit,
    detail,
    focus,
    selectedRecipeKey,
    candidatePrinciples.length,
    featureGoalSignals.length,
  ));
  const decisions = candidateDecisions.slice(0, guidanceDecisionLimit(
    requestedDecisionLimit,
    detail,
    selectedRecipeKey,
    candidateDecisions.length,
    featureGoalSignals.length,
  ));
  return {
    candidatePrincipleCount: candidatePrinciples.length,
    candidateDecisionCount: candidateDecisions.length,
    principles,
    decisions,
  };
}

function guidanceResult(
  focus: SemanticAuthoringGuidanceFocus,
  detail: SemanticAuthoringGuidanceDetail,
  featureGoal: string | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  selectedRecipeKey: AuthoringRecipeKey | null,
  recipeSelection: GuidanceRecipeSelection,
  policyRows: GuidancePolicyRows,
): SemanticAuthoringGuidanceResult {
  return {
    focus,
    detail,
    featureGoal,
    featureGoalSignals,
    selectedRecipeKey,
    candidateRecipeCount: recipeSelection.candidateRecipeKeys.length,
    returnedRecipeCount: recipeSelection.recipes.length,
    candidatePrincipleCount: policyRows.candidatePrincipleCount,
    returnedPrincipleCount: policyRows.principles.length,
    candidateDecisionCount: policyRows.candidateDecisionCount,
    returnedDecisionCount: policyRows.decisions.length,
    profile: MCP_APP_BUILDING_GUIDANCE_PROFILE,
    displayText: guidanceDisplayText(
      focus,
      featureGoal != null,
      featureGoalSignals,
      selectedRecipeKey,
      recipeSelection.candidateRecipeKeys.length,
      policyRows.principles,
      policyRows.decisions,
      recipeSelection.recipePlanSequence,
      recipeSelection.recipes,
    ),
    principles: policyRows.principles,
    decisions: policyRows.decisions,
    recipePlanSequence: recipeSelection.recipePlanSequence,
    recipes: recipeSelection.recipes,
    followUps: followUpsForGuidance(focus, selectedRecipeKey),
  };
}
