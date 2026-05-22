import { uniqueValues } from '../collections.js';
import { isAuthoringRecipeKey, type AuthoringRecipeKey } from '../authoring/recipe.js';
import {
  followUps,
  guidanceDecisionKeysByFocus,
  guidanceDecisions,
  guidanceFeatureSignals,
  guidancePrincipleKeysByFocus,
  guidancePrinciples,
  guidanceRecipeKeysByFocus,
  selectedRecipeDecisionKeysByRecipe,
  selectedRecipePrincipleKeysByRecipe,
} from './authoring-guidance-catalog.js';
import {
  SEMANTIC_AUTHORING_GUIDANCE_DETAILS,
  SEMANTIC_AUTHORING_GUIDANCE_FOCI,
  type SemanticAuthoringGuidanceDecisionRow,
  type SemanticAuthoringGuidanceDetail,
  type SemanticAuthoringGuidanceFeatureSignalRow,
  type SemanticAuthoringGuidanceFocus,
  type SemanticAuthoringGuidanceFollowUpRow,
  type SemanticAuthoringGuidancePrincipleRow,
} from './contracts.js';

const DEFAULT_GUIDANCE_FOCUS: SemanticAuthoringGuidanceFocus = 'app-building';
const DEFAULT_GUIDANCE_DETAIL: SemanticAuthoringGuidanceDetail = 'compact';
const DEFAULT_APP_BUILDING_RECIPE_LIMIT = 4;
const DEFAULT_FOCUSED_RECIPE_LIMIT = 6;
const DEFAULT_FEATURE_GOAL_RECIPE_LIMIT = 3;
const DEFAULT_COMPACT_APP_BUILDING_PRINCIPLE_LIMIT = 4;
const DEFAULT_COMPACT_RECIPE_PRINCIPLE_LIMIT = 3;
const DEFAULT_COMPACT_GUIDANCE_DECISION_LIMIT = 4;
const DEFAULT_COMPACT_RECIPE_DECISION_LIMIT = 4;
const DEFAULT_FEATURE_GOAL_PRINCIPLE_LIMIT = 3;
const DEFAULT_FEATURE_GOAL_DECISION_LIMIT = 4;
const APP_QUERY_BATCH_SURFACE = 'app-query-batch';
const APP_QUERY_BATCH_FOLLOW_UP_SURFACES = new Set([
  'app-topology',
  'binding-data-flow-summary',
  'binding-value-channel-summary',
  'binding-observed-dependency-summary',
  'binding-data-flows',
  'binding-value-channels',
  'binding-observed-dependencies',
  'component-agents',
  'computed-observer-sources',
  'computed-observer-observed-dependencies',
  'proxy-observable-escapes',
  'resource-definitions',
  'route-contexts',
  'router-options',
  'state-issues',
  'state-stores',
  'viewport-instruction-trees',
]);

export function normalizeGuidanceFocus(
  focus: SemanticAuthoringGuidanceFocus | null | undefined,
): SemanticAuthoringGuidanceFocus {
  return focus != null && SEMANTIC_AUTHORING_GUIDANCE_FOCI.includes(focus)
    ? focus
    : DEFAULT_GUIDANCE_FOCUS;
}

export function normalizeGuidanceDetail(
  detail: SemanticAuthoringGuidanceDetail | string | null | undefined,
): SemanticAuthoringGuidanceDetail {
  return detail != null && SEMANTIC_AUTHORING_GUIDANCE_DETAILS.includes(detail as SemanticAuthoringGuidanceDetail)
    ? detail as SemanticAuthoringGuidanceDetail
    : DEFAULT_GUIDANCE_DETAIL;
}

export function normalizeFeatureGoal(
  featureGoal: string | null | undefined,
): string | null {
  const trimmed = featureGoal?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

export function guidanceRecipeLimit(
  requestedLimit: number | null | undefined,
  detail: SemanticAuthoringGuidanceDetail,
  focus: SemanticAuthoringGuidanceFocus,
  candidateCount: number,
  featureGoalSignalCount: number,
): number {
  if (requestedLimit != null && Number.isFinite(requestedLimit)) {
    return Math.max(0, Math.min(candidateCount, Math.trunc(requestedLimit)));
  }
  if (detail !== 'compact') {
    return candidateCount;
  }
  if (featureGoalSignalCount > 0) {
    return Math.min(DEFAULT_FEATURE_GOAL_RECIPE_LIMIT, candidateCount);
  }
  if (focus === 'app-building') {
    return Math.min(DEFAULT_APP_BUILDING_RECIPE_LIMIT, candidateCount);
  }
  if (focus === 'plugins') {
    return Math.min(5, candidateCount);
  }
  return Math.min(DEFAULT_FOCUSED_RECIPE_LIMIT, candidateCount);
}

export function guidancePrincipleLimit(
  requestedLimit: number | null | undefined,
  detail: SemanticAuthoringGuidanceDetail,
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: string | null,
  candidateCount: number,
  featureGoalSignalCount: number,
): number {
  if (requestedLimit != null && Number.isFinite(requestedLimit)) {
    return Math.max(0, Math.min(candidateCount, Math.trunc(requestedLimit)));
  }
  if (detail !== 'compact') {
    return candidateCount;
  }
  if (selectedRecipeKey != null) {
    return Math.min(DEFAULT_COMPACT_RECIPE_PRINCIPLE_LIMIT, candidateCount);
  }
  if (featureGoalSignalCount > 0) {
    return Math.min(DEFAULT_FEATURE_GOAL_PRINCIPLE_LIMIT, candidateCount);
  }
  return focus === 'app-building'
    ? Math.min(DEFAULT_COMPACT_APP_BUILDING_PRINCIPLE_LIMIT, candidateCount)
    : Math.min(DEFAULT_COMPACT_RECIPE_PRINCIPLE_LIMIT, candidateCount);
}

export function guidanceDecisionLimit(
  requestedLimit: number | null | undefined,
  detail: SemanticAuthoringGuidanceDetail,
  selectedRecipeKey: string | null,
  candidateCount: number,
  featureGoalSignalCount: number,
): number {
  if (requestedLimit != null && Number.isFinite(requestedLimit)) {
    return Math.max(0, Math.min(candidateCount, Math.trunc(requestedLimit)));
  }
  if (detail !== 'compact') {
    return candidateCount;
  }
  if (selectedRecipeKey == null && featureGoalSignalCount > 0) {
    return Math.min(DEFAULT_FEATURE_GOAL_DECISION_LIMIT, candidateCount);
  }
  return selectedRecipeKey == null
    ? Math.min(DEFAULT_COMPACT_GUIDANCE_DECISION_LIMIT, candidateCount)
    : Math.min(DEFAULT_COMPACT_RECIPE_DECISION_LIMIT, candidateCount);
}

export function candidateGuidancePrincipleRows(
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: AuthoringRecipeKey | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  candidateRecipeKeys: readonly AuthoringRecipeKey[],
  detail: SemanticAuthoringGuidanceDetail,
): readonly SemanticAuthoringGuidancePrincipleRow[] {
  const selectedPrincipleKeys = selectedRecipeKey == null
    ? null
    : selectedRecipePrincipleKeysByRecipe[selectedRecipeKey] as readonly string[];
  const matchingPrinciples = guidancePrinciples
    .filter((principle) =>
      selectedRecipeKey == null
        ? principleMatchesFocus(principle, focus)
        : selectedPrincipleKeys?.includes(principle.key) === true
    );
  return rankGuidanceRowsForRequest(
    matchingPrinciples,
    focus,
    selectedRecipeKey,
    guidanceOrderWithFeatureSignals(
      guidanceOrderForRequest(focus, selectedRecipeKey, guidancePrincipleKeysByFocus, selectedRecipePrincipleKeysByRecipe),
      featureGoalSignals,
      'principleKeys',
      2,
    ),
    candidateRecipeKeys,
  )
    .map((principle) => guidancePrincipleRow(principle, detail));
}

export function candidateGuidanceDecisionRows(
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: AuthoringRecipeKey | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  candidateRecipeKeys: readonly AuthoringRecipeKey[],
  detail: SemanticAuthoringGuidanceDetail,
): readonly SemanticAuthoringGuidanceDecisionRow[] {
  const selectedDecisionKeys = selectedRecipeKey == null
    ? null
    : selectedRecipeDecisionKeysByRecipe[selectedRecipeKey] as readonly string[];
  const matchingDecisions = guidanceDecisions
    .filter((decision) =>
      selectedRecipeKey == null
        ? decisionMatchesFocus(decision, focus)
        : selectedDecisionKeys?.includes(decision.key) === true
    );
  return rankGuidanceRowsForRequest(
    matchingDecisions,
    focus,
    selectedRecipeKey,
    guidanceOrderWithFeatureSignals(
      guidanceOrderForRequest(focus, selectedRecipeKey, guidanceDecisionKeysByFocus, selectedRecipeDecisionKeysByRecipe),
      featureGoalSignals,
      'decisionKeys',
      3,
    ),
    candidateRecipeKeys,
  )
    .map((decision) => guidanceDecisionRow(decision, detail));
}

function guidancePrincipleRow(
  principle: SemanticAuthoringGuidancePrincipleRow,
  detail: SemanticAuthoringGuidanceDetail,
): SemanticAuthoringGuidancePrincipleRow {
  return detail === 'recipes'
    ? principle
    : {
      ...principle,
      prefer: principle.prefer.slice(0, 1),
      avoid: principle.avoid.slice(0, 1),
      recipeKeys: [],
    };
}

function guidanceDecisionRow(
  decision: SemanticAuthoringGuidanceDecisionRow,
  detail: SemanticAuthoringGuidanceDetail,
): SemanticAuthoringGuidanceDecisionRow {
  const followUpSurfaces = guidanceDecisionFollowUpSurfaces(decision.followUpSurfaces);
  return detail === 'recipes'
    ? {
      ...decision,
      followUpSurfaces,
    }
    : {
      ...decision,
      chooseWhen: decision.chooseWhen.slice(0, 1),
      avoidWhen: decision.avoidWhen.slice(0, 1),
      recipeKeys: [],
      followUpSurfaces,
    };
}

function guidanceDecisionFollowUpSurfaces(
  surfaces: readonly string[],
): readonly string[] {
  const normalized: string[] = [];
  for (const surface of surfaces) {
    if (
      surface !== APP_QUERY_BATCH_SURFACE
      && APP_QUERY_BATCH_FOLLOW_UP_SURFACES.has(surface)
      && !normalized.includes(APP_QUERY_BATCH_SURFACE)
    ) {
      normalized.push(APP_QUERY_BATCH_SURFACE);
    }
    normalized.push(surface);
  }
  return uniqueValues(normalized);
}

export function followUpsForGuidance(
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: string | null,
): readonly SemanticAuthoringGuidanceFollowUpRow[] {
  if (isRoutedGuidanceRecipe(selectedRecipeKey) || focus === 'routing') {
    return followUps;
  }
  if (focus === 'diagnostics') {
    return followUps.filter((row) =>
      row.surface !== 'router-overview'
      || isRoutedGuidanceRecipe(selectedRecipeKey)
    );
  }
  return followUps.filter((row) => row.surface !== 'router-overview');
}

function isRoutedGuidanceRecipe(recipeKey: string | null): boolean {
  return recipeKey === 'routed-app-shell'
    || recipeKey === 'routed-state-backed-form'
    || recipeKey === 'routed-validated-state-backed-form'
    || recipeKey === 'routed-service-backed-form'
    || recipeKey === 'routed-service-validated-state-backed-form'
    || recipeKey === 'routed-localized-validated-state-backed-form'
    || recipeKey === 'routed-catalog-storefront'
    || recipeKey === 'routed-searchable-data-table';
}

interface GuidanceRecipeKeyedRow {
  readonly key: string;
  readonly recipeKeys: readonly string[];
}

function guidanceOrderForRequest(
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: string | null,
  orderByFocus: Record<SemanticAuthoringGuidanceFocus, readonly string[]>,
  orderByRecipe: Record<AuthoringRecipeKey, readonly string[]>,
): readonly string[] | null {
  if (selectedRecipeKey != null && isAuthoringRecipeKey(selectedRecipeKey)) {
    return orderByRecipe[selectedRecipeKey];
  }
  return orderByFocus[focus];
}

function guidanceOrderWithFeatureSignals(
  baseOrder: readonly string[] | null,
  featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[],
  signalKeyField: 'decisionKeys' | 'principleKeys',
  stablePrefixCount: number,
): readonly string[] | null {
  if (baseOrder == null || featureGoalSignals.length === 0) {
    return baseOrder;
  }
  const signalOrder = uniqueValues(featureGoalSignals.flatMap((signal) => {
    const definition = guidanceFeatureSignals.find((candidate) => candidate.key === signal.key);
    return definition?.[signalKeyField] ?? [];
  }));
  if (signalOrder.length === 0) {
    return baseOrder;
  }
  return uniqueValues([
    ...baseOrder.slice(0, stablePrefixCount),
    ...signalOrder,
    ...baseOrder.slice(stablePrefixCount),
  ]);
}

function rankGuidanceRowsForRequest<TRow extends GuidanceRecipeKeyedRow>(
  rows: readonly TRow[],
  focus: SemanticAuthoringGuidanceFocus,
  selectedRecipeKey: string | null,
  selectedRecipeKeyOrder: readonly string[] | null,
  candidateRecipeKeys: readonly string[] | null = null,
): readonly TRow[] {
  if (rows.length < 2) {
    return rows;
  }
  const focusRecipeKeys = selectedRecipeKey == null
    ? candidateRecipeKeys ?? guidanceRecipeKeysByFocus[focus]
    : [selectedRecipeKey];
  const focusIndexByRecipeKey = new Map(focusRecipeKeys.map((recipeKey, index) => [recipeKey, index]));
  const selectedKeyOrder = new Map((selectedRecipeKeyOrder ?? []).map((key, index) => [key, index]));
  return rows
    .map((row, index) => ({
      row,
      index,
      score: guidanceRowRelevanceScore(row, focusRecipeKeys, focusIndexByRecipeKey),
      selectedRecipeRank: selectedKeyOrder.get(row.key) ?? Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => {
      const leftHasSelectedRank = Number.isFinite(left.selectedRecipeRank);
      const rightHasSelectedRank = Number.isFinite(right.selectedRecipeRank);
      if (leftHasSelectedRank || rightHasSelectedRank) {
        if (leftHasSelectedRank !== rightHasSelectedRank) {
          return leftHasSelectedRank ? -1 : 1;
        }
        const selectedRank = left.selectedRecipeRank - right.selectedRecipeRank;
        if (selectedRank !== 0) {
          return selectedRank;
        }
      }
      return right.score - left.score
        || left.index - right.index;
    })
    .map(({ row }) => row);
}

function guidanceRowRelevanceScore(
  row: GuidanceRecipeKeyedRow,
  focusRecipeKeys: readonly string[],
  focusIndexByRecipeKey: ReadonlyMap<string, number>,
): number {
  const matchedRecipeKeys = row.recipeKeys.filter((recipeKey) => focusIndexByRecipeKey.has(recipeKey));
  if (matchedRecipeKeys.length === 0) {
    return 0;
  }
  const coverageScore = matchedRecipeKeys.length / Math.max(1, focusRecipeKeys.length);
  const specificityScore = matchedRecipeKeys.length / Math.max(1, row.recipeKeys.length);
  const earliestFocusRecipeIndex = Math.min(...matchedRecipeKeys.map((recipeKey) => focusIndexByRecipeKey.get(recipeKey) ?? focusRecipeKeys.length));
  const recipeOrderScore = 1 - earliestFocusRecipeIndex / Math.max(1, focusRecipeKeys.length);
  return coverageScore * 1000
    + specificityScore * 100
    + recipeOrderScore;
}

function principleMatchesFocus(
  principle: SemanticAuthoringGuidancePrincipleRow,
  focus: SemanticAuthoringGuidanceFocus,
): boolean {
  if (focus === 'app-building') {
    return true;
  }
  const focusedRecipeKeys = guidanceRecipeKeysByFocus[focus];
  return principle.recipeKeys.some((recipeKey) =>
    focusedRecipeKeys.some((focusedRecipeKey) => focusedRecipeKey === recipeKey)
  );
}

function decisionMatchesFocus(
  decision: SemanticAuthoringGuidanceDecisionRow,
  focus: SemanticAuthoringGuidanceFocus,
): boolean {
  if (focus === 'app-building') {
    return true;
  }
  const focusedRecipeKeys = guidanceRecipeKeysByFocus[focus];
  return decision.recipeKeys.some((recipeKey) =>
    focusedRecipeKeys.some((focusedRecipeKey) => focusedRecipeKey === recipeKey)
  );
}
