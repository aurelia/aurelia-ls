import { AppBuilderControlPatternId } from './control.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from './relation.js';

/** Public app-builder source-lowering surface that can spend a target row. */
export enum AppBuilderSourceLoweringSurfaceKind {
  /** One exact ontology target lowers through `source-lowering-invocation`. */
  TargetInvocation = 'target-invocation',
  /** Several exact target invocations are composed through `source-lowering-composition`. */
  FragmentComposition = 'fragment-composition',
  /** Composed source-lowering fragments can be wrapped in a SourcePlan preview when explicit source placement is supplied. */
  SourcePlanPreview = 'source-plan-preview',
}

/** Stable value list for source-lowering surface transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_SURFACE_KINDS = [
  AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
  AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
] as const;

/** Ontology row with executable source-lowering surfaces. */
export interface AppBuilderSourceLoweringTargetRow {
  /** Exact ontology target that can be spent by one or more source-lowering surfaces. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Public source-lowering surfaces registered for this exact target. */
  readonly sourceLoweringSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
}

/** Surfaces for one-target lowerers whose fragments can be wrapped in template SourcePlan previews. */
const TARGET_INVOCATION_TEMPLATE_SURFACES = [
  AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
] as const;

/** Source-lowering target registry; row status must stay synchronized with this table. */
export const APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS: readonly AppBuilderSourceLoweringTargetRow[] = [
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.AppShell,
    [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.ApplicationAssembly,
    [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.RouterBackedListDetail,
    [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.ServiceBackedLoadSave,
    [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.DiStateClass,
    [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.LocalViewModelState,
    [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.DomainCommandAction,
    [AppBuilderSourceLoweringSurfaceKind.TargetInvocation],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.RouteNavigationAction,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.AsyncDataSource,
    [AppBuilderSourceLoweringSurfaceKind.TargetInvocation],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.AppSection,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeTextInput,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeNumberInput,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeDateInput,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeRangeInput,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeTextarea,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeBooleanCheckbox,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeCheckboxList,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeRadioGroup,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeSingleSelect,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeMultiSelect,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.NativeButton,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.FieldGroup,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.FormMessage,
    TARGET_INVOCATION_TEMPLATE_SURFACES,
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.CollectionList,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.CollectionCard,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.CollectionTable,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.LoadingEmptyErrorState,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.ActionFeedbackStatus,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.NativeSubmitForm,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
  sourceLoweringTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.DomainBackedSubmitForm,
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
  ),
] as const;

const SOURCE_LOWERING_TARGET_ROWS_BY_KEY = new Map(
  APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS.map((row) => [
    sourceLoweringTargetKey(row.targetRef),
    row,
  ]),
);

/** Return app-builder source-lowering surfaces that can spend a modeled target row. */
export function appBuilderSourceLoweringSurfaceKindsForTarget(
  targetRef: AppBuilderOntologyRowRef,
): readonly AppBuilderSourceLoweringSurfaceKind[] {
  return appBuilderSourceLoweringTargetRowForTarget(targetRef)?.sourceLoweringSurfaceKinds ?? [];
}

/** Return whether a target row is spendable by the requested app-builder source-lowering surface. */
export function appBuilderTargetSupportsSourceLoweringSurface(
  targetRef: AppBuilderOntologyRowRef,
  surfaceKind: AppBuilderSourceLoweringSurfaceKind,
): boolean {
  return appBuilderSourceLoweringSurfaceKindsForTarget(targetRef).includes(surfaceKind);
}

/** Return the registered source-lowering target row for an exact ontology target. */
export function appBuilderSourceLoweringTargetRowForTarget(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderSourceLoweringTargetRow | undefined {
  return SOURCE_LOWERING_TARGET_ROWS_BY_KEY.get(sourceLoweringTargetKey(targetRef));
}

function sourceLoweringTarget(
  kind: AppBuilderOntologyRowKind,
  id: string,
  sourceLoweringSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[],
): AppBuilderSourceLoweringTargetRow {
  return {
    targetRef: appBuilderOntologyRowRef(kind, id),
    sourceLoweringSurfaceKinds,
  };
}

function sourceLoweringTargetKey(
  targetRef: AppBuilderOntologyRowRef,
): string {
  return `${targetRef.kind}\0${targetRef.domain}\0${targetRef.id}`;
}
