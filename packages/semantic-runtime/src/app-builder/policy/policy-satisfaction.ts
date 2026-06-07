import {
  AppBuilderRecommendationStatus,
} from '../ontology/status.js';

/** Source that satisfied an app-builder contextual source-lowering policy gate. */
export enum AppBuilderPolicySatisfactionSource {
  /** The caller selected the exact ontology target in this inquiry. */
  ExplicitTargetSelection = 'explicit-target-selection',
  /** The caller selected a nested control pattern inside a composition input. */
  ExplicitNestedControlSelection = 'explicit-nested-control-selection',
  /** The caller supplied domain field shape that deterministically selects this control. */
  DomainFieldControlInput = 'domain-field-control-input',
}

/** Stable value list for app-builder policy-satisfaction source transport schemas. */
export const APP_BUILDER_POLICY_SATISFACTION_SOURCES = [
  AppBuilderPolicySatisfactionSource.ExplicitTargetSelection,
  AppBuilderPolicySatisfactionSource.ExplicitNestedControlSelection,
  AppBuilderPolicySatisfactionSource.DomainFieldControlInput,
] as const;

/** Policy gate state for contextual executable app-builder targets. */
export enum AppBuilderPolicySatisfactionState {
  /** The target is not contextual executable terrain, so no policy gate applies. */
  NotRequired = 'not-required',
  /** The caller supplied an accepted explicit source for this contextual policy gate. */
  Satisfied = 'satisfied',
  /** The target is contextual executable terrain, but the inquiry only reached it through a broad/default target set. */
  MissingExplicitSelection = 'missing-explicit-selection',
}

/** Stable value list for app-builder policy-satisfaction state transport schemas. */
export const APP_BUILDER_POLICY_SATISFACTION_STATES = [
  AppBuilderPolicySatisfactionState.NotRequired,
  AppBuilderPolicySatisfactionState.Satisfied,
  AppBuilderPolicySatisfactionState.MissingExplicitSelection,
] as const;

/** Minimal policy subject needed to decide whether contextual source-lowering needs explicit selection. */
export interface AppBuilderPolicySatisfactionSubject {
  /** Current recommendation posture before caller/project policy overrides. */
  readonly recommendationStatus: AppBuilderRecommendationStatus;
  /** Whether an executable source-lowering target exists for the row. */
  readonly sourceLoweringImplemented: boolean;
}

/** Input evidence available when projecting one app-builder policy-satisfaction row. */
export interface AppBuilderPolicySatisfactionContext {
  /** Source that satisfied the policy gate, when explicit enough for this target. */
  readonly sourceId?: AppBuilderPolicySatisfactionSource | null;
}

/** Policy gate projection for one app-builder source-lowering target. */
export interface AppBuilderPolicySatisfactionRow {
  /** Whether this target needs a contextual source-lowering policy gate. */
  readonly required: boolean;
  /** Current policy gate state. */
  readonly state: AppBuilderPolicySatisfactionState;
  /** Source that satisfied the gate, when satisfied. */
  readonly sourceId?: AppBuilderPolicySatisfactionSource;
  /** Compact explanation suitable for preflight and policy review. */
  readonly summary: string;
}

/** Return whether a row is contextual executable terrain that needs policy satisfaction before broad lowering. */
export function appBuilderRequiresPolicySatisfaction(
  subject: AppBuilderPolicySatisfactionSubject,
): boolean {
  return subject.sourceLoweringImplemented
    && subject.recommendationStatus === AppBuilderRecommendationStatus.Contextual;
}

/** Project policy satisfaction from the current explicit policy-satisfaction source shape. */
export function appBuilderPolicySatisfactionForTarget(
  subject: AppBuilderPolicySatisfactionSubject,
  context: AppBuilderPolicySatisfactionContext = {},
): AppBuilderPolicySatisfactionRow {
  if (!appBuilderRequiresPolicySatisfaction(subject)) {
    return {
      required: false,
      state: AppBuilderPolicySatisfactionState.NotRequired,
      summary: 'This target is not contextual executable source-lowering terrain, so no contextual policy gate applies.',
    };
  }
  if (context.sourceId != null) {
    return {
      required: true,
      state: AppBuilderPolicySatisfactionState.Satisfied,
      sourceId: context.sourceId,
      summary: appBuilderPolicySatisfactionSourceSummary(context.sourceId),
    };
  }
  return {
    required: true,
    state: AppBuilderPolicySatisfactionState.MissingExplicitSelection,
    summary: 'This contextual source-lowering target needs an explicit policy-satisfaction source before source lowering should proceed.',
  };
}

function appBuilderPolicySatisfactionSourceSummary(sourceId: AppBuilderPolicySatisfactionSource): string {
  switch (sourceId) {
    case AppBuilderPolicySatisfactionSource.ExplicitTargetSelection:
      return 'The caller explicitly selected this contextual source-lowering target for the inquiry.';
    case AppBuilderPolicySatisfactionSource.ExplicitNestedControlSelection:
      return 'The caller explicitly selected this contextual control pattern inside a composition input.';
    case AppBuilderPolicySatisfactionSource.DomainFieldControlInput:
      return 'The caller supplied domain field shape that deterministically selects this contextual native control.';
  }
}
