import type { AppBuilderDomainActionDescriptor } from '../domain-model.js';
import {
  appBuilderDomainFieldSourceModels,
  type AppBuilderDomainFieldSourceModel,
} from '../domain-field-source.js';
import { AppBuilderPartKind } from '../part-catalog.js';
import {
  lowerAppBuilderPartSourceInvocation,
  type AppBuilderPartSourceLowering,
} from '../part-source-lowering.js';
import type {
  AppBuilderPartSlotAssignment,
  AppBuilderPartSourceFragment,
  AppBuilderPartSourceInvocation,
  AppBuilderTemplateAttributePartSourceFragment,
  AppBuilderTemplateElementPartSourceFragment,
} from '../part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
  AppBuilderSourceFragmentOriginKind,
} from '../part-source-invocation.js';
import {
  appBuilderStructuralPartApplicationSite,
  appBuilderIsTypeScriptIdentifier,
  appBuilderTemplateElementFragment,
} from '../source-lowering-helpers.js';
import { AppBuilderStructuralPartId } from '../structural-part-catalog.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import { AppBuilderApplicationPatternId } from './application-pattern.js';
import { AppBuilderControlPatternId } from './control.js';
import { appBuilderEffectContractIdsForTargetRef } from './effect-target.js';
import {
  appBuilderUniqueEffectContractIds,
} from './effect.js';
import type { AppBuilderControlUseInventoryRow } from './control-use-inventory.js';
import type { AppBuilderSuppliedInput } from './input-readiness.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderOntologyRowRefKey,
  appBuilderUniqueOntologyRowRefs,
} from './row-descriptor.js';
import {
  appBuilderSourceLoweringDomainActionPayloads,
  appBuilderSourceLoweringDomainFieldPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderSourceLoweringDomainValueSetPayloads,
  appBuilderSourceLoweringVisualHookAttributes,
  AppBuilderSourceLoweringVisualHookTarget,
} from './source-lowering-inputs.js';
import {
  AppBuilderSourceLoweringAvailability,
  AppBuilderSourceLoweringInputGateState,
  appBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  AppBuilderSourceLoweringSurfaceKind,
  appBuilderTargetSupportsSourceLoweringSurface,
} from './source-lowering-surface.js';
import {
  appBuilderSuppliedInputsWithDecisionBundlesForTarget,
  appBuilderSuppliedInputsWithDecisionBundles,
} from '../policy/decision-bundle.js';
import {
  lowerCollectionCardComposition,
  lowerCollectionListComposition,
  lowerCollectionTableComposition,
} from './source-lowering-composition-collection.js';
import { lowerActionFeedbackStatusComposition } from './source-lowering-composition-action-feedback-status.js';
import { lowerNativeSubmitFormComposition } from './source-lowering-composition-native-submit-form.js';
import { lowerLoadingEmptyErrorStateComposition } from './source-lowering-composition-loading-empty-error.js';
import { appBuilderSourceLoweringInvocation } from './source-lowering-invocation.js';

import {
  APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS,
  AppBuilderSourceLoweringCompositionIssueKind,
  AppBuilderSourceLoweringCompositionKind,
  type AppBuilderSourceLoweringComposition,
  type AppBuilderSourceLoweringCompositionChild,
  type AppBuilderSourceLoweringCompositionIssue,
  type AppBuilderSourceLoweringCompositionRequest,
} from './source-lowering-composition-contracts.js';
export * from './source-lowering-composition-contracts.js';

/** App-builder ontology target that can be spent by source-lowering composition. */
export interface AppBuilderSourceLoweringCompositionTargetRow {
  /** Exact application-pattern target selected from the app-builder ontology. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Composition kind that owns the selected target. */
  readonly compositionKind: AppBuilderSourceLoweringCompositionKind;
}

/** Composition-target registry; keep synchronized with FragmentComposition source-lowering surfaces. */
export const APP_BUILDER_SOURCE_LOWERING_COMPOSITION_TARGET_ROWS: readonly AppBuilderSourceLoweringCompositionTargetRow[] = [
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.AppSection,
    AppBuilderSourceLoweringCompositionKind.AppSection,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.CollectionList,
    AppBuilderSourceLoweringCompositionKind.CollectionList,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.CollectionCard,
    AppBuilderSourceLoweringCompositionKind.CollectionCard,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.CollectionTable,
    AppBuilderSourceLoweringCompositionKind.CollectionTable,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.LoadingEmptyErrorState,
    AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.ActionFeedbackStatus,
    AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.NativeSubmitForm,
    AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
  ),
  sourceLoweringCompositionTarget(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.DomainBackedSubmitForm,
    AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
  ),
] as const;

const SOURCE_LOWERING_COMPOSITION_TARGET_ROWS_BY_KEY = new Map(
  APP_BUILDER_SOURCE_LOWERING_COMPOSITION_TARGET_ROWS.map((row) => [
    appBuilderOntologyRowRefKey(row.targetRef),
    row,
  ]),
);

const SOURCE_LOWERING_COMPOSITION_TARGET_ROWS_BY_KIND = sourceLoweringCompositionTargetRowsByKind();

type AppBuilderSourceLoweringCompositionLowerer = (
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
) => AppBuilderSourceLoweringComposition;

const SOURCE_LOWERING_COMPOSITION_LOWERERS = new Map<
AppBuilderSourceLoweringCompositionKind,
AppBuilderSourceLoweringCompositionLowerer
>([
  [AppBuilderSourceLoweringCompositionKind.AppSection, lowerAppSectionComposition],
  [AppBuilderSourceLoweringCompositionKind.CollectionList, lowerCollectionListComposition],
  [AppBuilderSourceLoweringCompositionKind.CollectionCard, lowerCollectionCardComposition],
  [AppBuilderSourceLoweringCompositionKind.CollectionTable, lowerCollectionTableComposition],
  [AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState, lowerLoadingEmptyErrorStateComposition],
  [AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus, lowerActionFeedbackStatusComposition],
  [AppBuilderSourceLoweringCompositionKind.NativeSubmitForm, (
    request,
    targetRef,
    preflight,
    preflightRow,
    fields,
    actions,
  ) => lowerNativeSubmitFormComposition(request, targetRef, preflight, preflightRow, fields, actions, {
    defaultBindingExpressionForField,
    optionalControlUseInventoryRow,
    sourceLoweringCompositionResult,
    sourceLoweringCompositionSuppliedInputs,
    withCompositionOrigin,
  })],
]);

assertCompleteSourceLoweringCompositionRegistry();

/** Lower one app-builder source-lowering composition to source fragments without writing files. */
export function appBuilderSourceLoweringComposition(
  request: AppBuilderSourceLoweringCompositionRequest = {},
): AppBuilderSourceLoweringComposition {
  const targetRef = request.targetRef ?? null;
  const suppliedInputs = sourceLoweringCompositionSuppliedInputs(request);
  const fields = appBuilderDomainFieldSourceModels(appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs), {
    valueSets: appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs),
  });
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  if (targetRef == null) {
    return sourceLoweringCompositionResult({
      targetRef: null,
      compositionKind: sourceLoweringCompositionKind(request.compositionKind),
      availableFieldNames: fields.map((field) => field.memberName),
      availableRelationshipNames: relationships.map((relationship) => relationship.name),
      availableActionNames: actions.map((action) => action.name),
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingTargetRef,
        summary: 'App-builder source-lowering composition requires an exact targetRef selected from target-catalog or source-lowering-preflight.',
      }],
    });
  }

  const preflight = appBuilderSourceLoweringPreflight({
    targetRefs: [targetRef],
    suppliedInputs: request.suppliedInputs ?? [],
    decisionBundles: request.decisionBundles ?? [],
    includeInputDependencies: request.includePreflight === true,
  });
  const preflightRow = preflight.rows[0] ?? null;
  if (preflightRow == null) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind: sourceLoweringCompositionKind(request.compositionKind),
      preflight: request.includePreflight === true ? preflight : undefined,
      availableFieldNames: fields.map((field) => field.memberName),
      availableRelationshipNames: relationships.map((relationship) => relationship.name),
      availableActionNames: actions.map((action) => action.name),
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownTarget,
        targetRef,
        summary: `App-builder source-lowering composition does not know target '${targetRef.kind}:${targetRef.id}'.`,
      }],
    });
  }

  const compositionKind = compositionKindForTarget(targetRef, request.compositionKind);
  const targetIssues = [
    ...sourceCompositionKindIssues(targetRef, request.compositionKind),
    ...sourceCompositionTargetIssues(targetRef, compositionKind, preflightRow),
  ];
  if (targetIssues.length > 0 || compositionKind == null) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      availableFieldNames: fields.map((field) => field.memberName),
      availableRelationshipNames: relationships.map((relationship) => relationship.name),
      availableActionNames: actions.map((action) => action.name),
      issues: targetIssues,
    });
  }

  const lowerer = SOURCE_LOWERING_COMPOSITION_LOWERERS.get(compositionKind);
  if (lowerer == null) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      availableFieldNames: fields.map((field) => field.memberName),
      availableRelationshipNames: relationships.map((relationship) => relationship.name),
      availableActionNames: actions.map((action) => action.name),
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.SourceLoweringCompositionNotImplemented,
        targetRef,
        compositionKind,
        summary: `App-builder source-lowering composition kind '${compositionKind}' has no registered lowerer.`,
      }],
    });
  }
  return lowerer(request, targetRef, preflight, preflightRow, fields, actions);
}

export function sourceLoweringCompositionSuppliedInputs(
  request: AppBuilderSourceLoweringCompositionRequest,
): readonly AppBuilderSuppliedInput[] {
  const targetRef = request.targetRef ?? null;
  return targetRef == null
    ? appBuilderSuppliedInputsWithDecisionBundles(request.suppliedInputs, request.decisionBundles)
    : appBuilderSuppliedInputsWithDecisionBundlesForTarget(request.suppliedInputs, request.decisionBundles, targetRef);
}

function sourceLoweringCompositionAllSuppliedInputs(
  request: AppBuilderSourceLoweringCompositionRequest,
): readonly AppBuilderSuppliedInput[] {
  return appBuilderSuppliedInputsWithDecisionBundles(request.suppliedInputs, request.decisionBundles);
}

function lowerAppSectionComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderSourceLoweringComposition {
  void fields;
  void actions;
  const children = lowerAppSectionChildren(request, targetRef);
  const issues = [...children.issues];
  if (issues.length > 0) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      childContent: children.children,
      childCompositions: children.childCompositions,
      fragments: [],
      contributingFragments: children.contributingFragments,
      issues,
    });
  }

  const sectionFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'section',
      appBuilderSourceLoweringVisualHookAttributes(
        sourceLoweringCompositionSuppliedInputs(request),
        AppBuilderSourceLoweringVisualHookTarget.AppSection,
      ),
      null,
      children.elementFragments.map((fragment) => fragment.templateElement),
    ),
    AppBuilderSourceLoweringCompositionKind.AppSection,
    targetRef,
    children.sourceLoweringTargetRefs.map((ref) => `${ref.kind}:${ref.id}`),
  );
  return sourceLoweringCompositionResult({
    targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    childContent: children.children,
    childCompositions: children.childCompositions,
    fragments: [sectionFragment],
    contributingFragments: [
      ...children.contributingFragments,
      sectionFragment,
    ],
    issues: [],
  });
}

function sourceCompositionKindIssues(
  targetRef: AppBuilderOntologyRowRef,
  requestedCompositionKind: unknown,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  const requested = normalizedCompositionKindInput(requestedCompositionKind);
  if (requested == null || sourceLoweringCompositionKind(requested) != null) {
    return [];
  }
  return [{
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownCompositionKind,
    targetRef,
    compositionKind: null,
    requestedCompositionKind: requested,
    summary: `App-builder source-lowering composition kind '${requested}' is not supported. Supported kinds: ${APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS.join(', ')}.`,
  }];
}

function sourceCompositionTargetIssues(
  targetRef: AppBuilderOntologyRowRef,
  compositionKind: AppBuilderSourceLoweringCompositionKind | null,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  const targetRow = appBuilderSourceLoweringCompositionTargetRowForTarget(targetRef);
  if (targetRow == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnsupportedTarget,
      targetRef,
      compositionKind,
      summary: `App-builder source-lowering composition has no registered target for '${targetRef.kind}:${targetRef.id}'.`,
    });
  }
  if (compositionKind == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.CompositionTargetMismatch,
      targetRef,
      compositionKind,
      summary: `Target '${targetRef.kind}:${targetRef.id}' does not map to a supported app-builder source-lowering composition kind.`,
    });
  }
  if (targetRow != null && compositionKind != null && targetRow.compositionKind !== compositionKind) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.CompositionTargetMismatch,
      targetRef,
      compositionKind,
      summary: `Target '${targetRef.kind}:${targetRef.id}' maps to composition kind '${targetRow.compositionKind}', not '${compositionKind}'.`,
    });
  }
  if (!appBuilderTargetSupportsSourceLoweringSurface(targetRef, AppBuilderSourceLoweringSurfaceKind.FragmentComposition)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.SourceLoweringCompositionNotImplemented,
      targetRef,
      compositionKind,
      summary: `Target '${targetRef.kind}:${targetRef.id}' does not expose the '${AppBuilderSourceLoweringSurfaceKind.FragmentComposition}' source-lowering surface.`,
    });
  }
  if (preflightRow.sourceLoweringAvailability !== AppBuilderSourceLoweringAvailability.SourceLoweringImplemented) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.SourceLoweringCompositionNotImplemented,
      targetRef,
      compositionKind,
      summary: `Target '${targetRef.kind}:${targetRef.id}' has source availability '${preflightRow.sourceLoweringAvailability}', not source-lowering-implemented source lowering.`,
    });
  }
  if (preflightRow.inputGateState === AppBuilderSourceLoweringInputGateState.MissingRequiredInput) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRequiredInput,
      targetRef,
      compositionKind,
      summary: `Target '${targetRef.kind}:${targetRef.id}' is missing required input facets: ${preflightRow.inputReadiness.missingRequiredInputFacetIds.join(', ')}.`,
    });
  }
  if (preflightRow.inputGateState === AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidSuppliedPayload,
      targetRef,
      compositionKind,
      summary: `Target '${targetRef.kind}:${targetRef.id}' has ${preflightRow.inputReadiness.invalidPayloadCount} invalid supplied payload(s).`,
    });
  }
  issues.push(...preflightRow.targetRequirementIssues.map((issue): AppBuilderSourceLoweringCompositionIssue => ({
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue,
    targetRef,
    compositionKind,
    fieldNames: issue.fieldNames,
    columnHeaders: issue.columnHeaders,
    collectionFeatureIds: issue.collectionFeatureIds,
    sourceLoweringPreflightIssue: issue,
    summary: issue.summary,
  })));
  return issues;
}

function compositionKindForTarget(
  targetRef: AppBuilderOntologyRowRef,
  requestedCompositionKind: unknown,
): AppBuilderSourceLoweringCompositionKind | null {
  if (normalizedCompositionKindInput(requestedCompositionKind) != null && sourceLoweringCompositionKind(requestedCompositionKind) == null) {
    return null;
  }
  const parsedRequestedKind = sourceLoweringCompositionKind(requestedCompositionKind);
  if (parsedRequestedKind != null) {
    return parsedRequestedKind;
  }
  return appBuilderSourceLoweringCompositionTargetRowForTarget(targetRef)?.compositionKind ?? null;
}

function sourceLoweringCompositionKind(
  value: unknown,
): AppBuilderSourceLoweringCompositionKind | null {
  const normalized = normalizedCompositionKindInput(value);
  return APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS.includes(normalized as AppBuilderSourceLoweringCompositionKind)
    ? normalized as AppBuilderSourceLoweringCompositionKind
    : null;
}

function normalizedCompositionKindInput(
  value: unknown,
): string | null {
  return typeof value === 'string'
    ? normalizedSourceInputText(value)
    : null;
}

/** Return the registered composition target row for an exact ontology target. */
export function appBuilderSourceLoweringCompositionTargetRowForTarget(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderSourceLoweringCompositionTargetRow | undefined {
  return SOURCE_LOWERING_COMPOSITION_TARGET_ROWS_BY_KEY.get(appBuilderOntologyRowRefKey(targetRef));
}

/** Return the registered composition target row for a composition kind. */
export function appBuilderSourceLoweringCompositionTargetRowForKind(
  compositionKind: AppBuilderSourceLoweringCompositionKind,
): AppBuilderSourceLoweringCompositionTargetRow | undefined {
  return SOURCE_LOWERING_COMPOSITION_TARGET_ROWS_BY_KIND.get(compositionKind)?.[0];
}

function assertCompleteSourceLoweringCompositionRegistry(): void {
  const seenTargets = new Set<string>();
  const seenKinds = new Set<AppBuilderSourceLoweringCompositionKind>();
  for (const row of APP_BUILDER_SOURCE_LOWERING_COMPOSITION_TARGET_ROWS) {
    const targetKey = appBuilderOntologyRowRefKey(row.targetRef);
    if (seenTargets.has(targetKey)) {
      throw new Error(`Duplicate app-builder source-lowering composition target '${row.targetRef.kind}:${row.targetRef.id}'.`);
    }
    seenTargets.add(targetKey);
    seenKinds.add(row.compositionKind);
    if (!appBuilderTargetSupportsSourceLoweringSurface(row.targetRef, AppBuilderSourceLoweringSurfaceKind.FragmentComposition)) {
      throw new Error(`Composition target '${row.targetRef.kind}:${row.targetRef.id}' is missing the FragmentComposition source-lowering surface.`);
    }
    if (!SOURCE_LOWERING_COMPOSITION_LOWERERS.has(row.compositionKind)) {
      throw new Error(`Composition kind '${row.compositionKind}' has no registered lowerer.`);
    }
  }
  for (const kind of APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS) {
    if (!seenKinds.has(kind)) {
      throw new Error(`Composition kind '${kind}' has no registered target.`);
    }
  }
  for (const kind of SOURCE_LOWERING_COMPOSITION_LOWERERS.keys()) {
    if (!seenKinds.has(kind)) {
      throw new Error(`Composition lowerer '${kind}' has no registered target.`);
    }
  }
}

function sourceLoweringCompositionTargetRowsByKind(): ReadonlyMap<AppBuilderSourceLoweringCompositionKind, readonly AppBuilderSourceLoweringCompositionTargetRow[]> {
  const grouped = new Map<AppBuilderSourceLoweringCompositionKind, AppBuilderSourceLoweringCompositionTargetRow[]>();
  for (const row of APP_BUILDER_SOURCE_LOWERING_COMPOSITION_TARGET_ROWS) {
    grouped.set(row.compositionKind, [
      ...(grouped.get(row.compositionKind) ?? []),
      row,
    ]);
  }
  return new Map(grouped);
}

function sourceLoweringCompositionTarget(
  kind: AppBuilderOntologyRowKind,
  id: string,
  compositionKind: AppBuilderSourceLoweringCompositionKind,
): AppBuilderSourceLoweringCompositionTargetRow {
  return {
    targetRef: appBuilderOntologyRowRef(kind, id),
    compositionKind,
  };
}

interface AppBuilderAppSectionChildLoweringFrame {
  readonly children: readonly AppBuilderSourceLoweringCompositionChild[];
  readonly childCompositions: readonly AppBuilderSourceLoweringComposition[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
  readonly elementFragments: readonly AppBuilderTemplateElementPartSourceFragment[];
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
}

function lowerAppSectionChildren(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderAppSectionChildLoweringFrame {
  const childContentRequests = request.childContent ?? [];
  const childCompositionRequests = request.childCompositions ?? [];
  const hasChildContent = childContentRequests.length > 0;
  const hasChildCompositions = childCompositionRequests.length > 0;
  if (hasChildContent && hasChildCompositions) {
    return {
      children: [],
      childCompositions: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidSectionChildContent,
        targetRef,
        summary: 'App-section source lowering accepts childContent or childCompositions, not both; use childContent when section children mix compositions and direct invocations.',
      }],
      elementFragments: [],
      contributingFragments: [],
      sourceLoweringTargetRefs: [],
    };
  }
  if (!hasChildContent && !hasChildCompositions) {
    return emptyAppSectionChildren(targetRef);
  }
  const parentSuppliedInputs = sourceLoweringCompositionAllSuppliedInputs(request);
  const children = hasChildContent
    ? childContentRequests.flatMap((childRequest, childContentIndex): readonly AppBuilderSourceLoweringCompositionChild[] => {
      const hasComposition = childRequest.composition != null;
      const hasInvocation = childRequest.invocation != null;
      if (hasComposition === hasInvocation) {
        return [];
      }
      if (childRequest.composition != null) {
        return [{
          composition: appBuilderSourceLoweringComposition({
            ...childRequest.composition,
            suppliedInputs: sourceLoweringCompositionChildSuppliedInputsFromParentInputs(
              parentSuppliedInputs,
              childRequest.composition,
            ),
            decisionBundles: childRequest.composition.decisionBundles ?? [],
            includePreflight: childRequest.composition.includePreflight ?? request.includePreflight,
            emissionContext: childRequest.composition.emissionContext ?? request.emissionContext,
          }),
          invocation: null,
        }];
      }
      if (childRequest.invocation != null) {
        return [{
          composition: null,
          invocation: appBuilderSourceLoweringInvocation({
            ...childRequest.invocation,
            suppliedInputs: [
              ...parentSuppliedInputs,
              ...(childRequest.invocation.suppliedInputs ?? []),
            ],
            decisionBundles: childRequest.invocation.decisionBundles ?? [],
            includePreflight: childRequest.invocation.includePreflight ?? request.includePreflight,
            emissionContext: childRequest.invocation.emissionContext ?? request.emissionContext,
          }),
        }];
      }
      void childContentIndex;
      return [];
    })
    : childCompositionRequests.map((nestedRequest): AppBuilderSourceLoweringCompositionChild => ({
      composition: appBuilderSourceLoweringComposition({
      ...nestedRequest,
      suppliedInputs: sourceLoweringCompositionChildSuppliedInputsFromParentInputs(parentSuppliedInputs, nestedRequest),
      decisionBundles: nestedRequest.decisionBundles ?? [],
      includePreflight: nestedRequest.includePreflight ?? request.includePreflight,
      emissionContext: nestedRequest.emissionContext ?? request.emissionContext,
      }),
      invocation: null,
    }));
  const structuralIssues = hasChildContent
    ? childContentRequests.flatMap((childRequest, childContentIndex): readonly AppBuilderSourceLoweringCompositionIssue[] => {
      const hasComposition = childRequest.composition != null;
      const hasInvocation = childRequest.invocation != null;
      if (hasComposition !== hasInvocation) {
        return [];
      }
      return [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidSectionChildContent,
        targetRef,
        childContentIndex,
        summary: hasComposition
          ? `App-section childContent row ${childContentIndex + 1} must choose either composition or invocation, not both.`
          : `App-section childContent row ${childContentIndex + 1} must choose a composition or invocation.`,
      }];
    })
    : [];
  const issues = [
    ...structuralIssues,
    ...children.flatMap((child, childContentIndex): readonly AppBuilderSourceLoweringCompositionIssue[] => {
      if (child.composition != null) {
        return childCompositionIssues(child.composition, targetRef, childContentIndex);
      }
      if (child.invocation != null) {
        return childInvocationIssues(child.invocation, targetRef, childContentIndex);
      }
      return [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidSectionChildContent,
        targetRef,
        childContentIndex,
        summary: `App-section childContent row ${childContentIndex + 1} did not produce a lowered composition or invocation.`,
      }];
    }),
  ];
  const childCompositions = children.flatMap((child) => child.composition == null ? [] : [child.composition]);
  const childInvocations = children.flatMap((child) => child.invocation == null ? [] : [child.invocation]);
  return {
    children,
    childCompositions,
    issues,
    elementFragments: children.flatMap(appSectionChildElementFragments),
    contributingFragments: [
      ...childCompositions.flatMap((composition) => composition.contributingFragments),
      ...childInvocations.flatMap((invocation) => invocation.fragments),
    ],
    sourceLoweringTargetRefs: appBuilderUniqueOntologyRowRefs([
      ...childCompositions.flatMap((composition) => composition.sourceLoweringTargetRefs),
      ...childInvocations.flatMap((invocation) => invocation.sourceLoweringTargetRefs),
    ]),
  };
}

function emptyAppSectionChildren(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderAppSectionChildLoweringFrame {
  return {
    children: [],
    childCompositions: [],
    issues: [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingSectionChildren,
      targetRef,
      summary: 'App-section source lowering needs ordered childContent or childCompositions; app-builder will not invent the section contents.',
    }],
    elementFragments: [],
    contributingFragments: [],
    sourceLoweringTargetRefs: [],
  };
}

function appSectionChildElementFragments(
  child: AppBuilderSourceLoweringCompositionChild,
): readonly AppBuilderTemplateElementPartSourceFragment[] {
  const fragments = child.composition?.fragments ?? child.invocation?.fragments ?? [];
  return fragments.filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
  );
}

function childCompositionIssues(
  composition: AppBuilderSourceLoweringComposition,
  targetRef: AppBuilderOntologyRowRef,
  childContentIndex: number,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
    const elementFragments = composition.fragments.filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
      fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
    );
    if (composition.issues.length === 0 && elementFragments.length > 0) {
      return [];
    }
    return [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.ChildCompositionIssue,
      targetRef,
      childComposition: composition,
      childContentIndex,
      childCompositionIndex: childContentIndex,
      summary: composition.issues.length === 0
        ? `App-section child composition ${childContentIndex + 1} must produce at least one template-element fragment.`
        : `App-section child composition ${childContentIndex + 1} could not lower cleanly: ${composition.issues.map((issue) => issue.summary).join(' ')}`,
    }];
}

function childInvocationIssues(
  invocation: ReturnType<typeof appBuilderSourceLoweringInvocation>,
  targetRef: AppBuilderOntologyRowRef,
  childContentIndex: number,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  const elementFragments = invocation.fragments.filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
  );
  if (invocation.issues.length === 0 && elementFragments.length > 0) {
    return [];
  }
  return [{
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.ChildInvocationIssue,
    targetRef,
    childInvocation: invocation,
    childContentIndex,
    summary: invocation.issues.length === 0
      ? `App-section child invocation ${childContentIndex + 1} must produce at least one template-element fragment.`
      : `App-section child invocation ${childContentIndex + 1} could not lower cleanly: ${invocation.issues.map((issue) => issue.summary).join(' ')}`,
  }];
}

export function sourceLoweringCompositionChildSuppliedInputs(
  parentRequest: AppBuilderSourceLoweringCompositionRequest,
  childRequest: AppBuilderSourceLoweringCompositionRequest,
): readonly AppBuilderSuppliedInput[] {
  return sourceLoweringCompositionChildSuppliedInputsFromParentInputs(
    sourceLoweringCompositionAllSuppliedInputs(parentRequest),
    childRequest,
  );
}

function sourceLoweringCompositionChildSuppliedInputsFromParentInputs(
  parentSuppliedInputs: readonly AppBuilderSuppliedInput[],
  childRequest: AppBuilderSourceLoweringCompositionRequest,
): readonly AppBuilderSuppliedInput[] {
  return [
    ...parentSuppliedInputs,
    ...(childRequest.suppliedInputs ?? []),
  ];
}

export function lowerStructuralTemplateControllerAttribute(
  structuralPartId: AppBuilderStructuralPartId,
  slotAssignments: readonly AppBuilderPartSlotAssignment[] = [],
): {
  readonly structuralPartId: AppBuilderStructuralPartId;
  readonly invocation: AppBuilderPartSourceInvocation;
  readonly lowering: AppBuilderPartSourceLowering;
  readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
} {
  const invocation: AppBuilderPartSourceInvocation = {
    partKind: AppBuilderPartKind.StructuralPart,
    partId: structuralPartId,
    applicationSite: appBuilderStructuralPartApplicationSite(structuralPartId),
    slotAssignments,
  };
  const lowering = lowerAppBuilderPartSourceInvocation(invocation);
  return {
    structuralPartId,
    invocation,
    lowering,
    attributeFragment: lowering.fragments.find((fragment): fragment is AppBuilderTemplateAttributePartSourceFragment =>
      fragment.kind === AppBuilderPartSourceFragmentKind.TemplateAttribute
    ) ?? null,
  };
}

export function structuralPartLoweringIssues(
  targetRef: AppBuilderOntologyRowRef,
  lowerings: readonly {
    readonly structuralPartId: AppBuilderStructuralPartId;
    readonly lowering: AppBuilderPartSourceLowering;
    readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
  }[],
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  return lowerings.flatMap((row): readonly AppBuilderSourceLoweringCompositionIssue[] => {
    if (row.lowering.issues.length === 0 && row.attributeFragment != null) {
      return [];
    }
    return [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.StructuralPartLoweringIssue,
      targetRef,
      structuralPartId: row.structuralPartId,
      structuralPartLowering: row.lowering,
      summary: row.lowering.issues.length === 0
        ? `Structural part '${row.structuralPartId}' did not produce a template-attribute fragment.`
        : `Structural part '${row.structuralPartId}' could not lower cleanly: ${row.lowering.issues.map((issue) => issue.summary).join(' ')}`,
    }];
  });
}


export function withCompositionOrigin<TFragment extends AppBuilderPartSourceFragment>(
  fragment: TFragment,
  compositionKind: AppBuilderSourceLoweringCompositionKind,
  targetRef: AppBuilderOntologyRowRef,
  memberTargetIds: readonly string[],
): TFragment {
  return {
    ...fragment,
    origin: {
      kind: AppBuilderSourceFragmentOriginKind.SourceLoweringComposition,
      compositionKind,
      targetKind: targetRef.kind,
      targetId: targetRef.id,
      memberTargetIds,
    },
  };
}


export function defaultBindingExpressionForField(
  fieldName: string,
  bindingRootExpression: string | null | undefined,
): string | null {
  if (!appBuilderIsTypeScriptIdentifier(fieldName)) {
    return null;
  }
  const root = normalizedSourceInputText(bindingRootExpression);
  return root == null ? fieldName : `${root}.${fieldName}`;
}

export function sourceLoweringCompositionResult(
  input: Partial<AppBuilderSourceLoweringComposition> & {
    readonly targetRef: AppBuilderOntologyRowRef | null;
    readonly compositionKind: AppBuilderSourceLoweringCompositionKind | null;
    readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
  },
): AppBuilderSourceLoweringComposition {
  const fragments = input.fragments ?? [];
  const selectedFields = input.selectedFields ?? [];
  const selectedRelationships = input.selectedRelationships ?? [];
  const selectedAction = input.selectedAction ?? null;
  const selectedActionFeedback = input.selectedActionFeedback ?? null;
  const selectedCollectionDisplayFields = input.selectedCollectionDisplayFields ?? [];
  const selectedCollectionTableColumns = input.selectedCollectionTableColumns ?? [];
  const selectedCollectionBatchActions = input.selectedCollectionBatchActions ?? [];
  const fulfilledContentComposition = input.fulfilledContentComposition ?? null;
  const explicitChildCompositions = input.childCompositions ?? [];
  const childContent = input.childContent ?? explicitChildCompositions.map((composition): AppBuilderSourceLoweringCompositionChild => ({
    composition,
    invocation: null,
  }));
  const childCompositions = explicitChildCompositions.length > 0
    ? explicitChildCompositions
    : childContent.flatMap((child) => child.composition == null ? [] : [child.composition]);
  const childInvocations = childContent.flatMap((child) => child.invocation == null ? [] : [child.invocation]);
  const controlUseInventoryRows = [
    ...(input.controlUseInventoryRows ?? []),
    ...selectedFields.flatMap((field) => field.memberInvocation?.controlUseInventoryRows ?? []),
    ...selectedCollectionTableColumns.flatMap((column) => column.actionInvocation?.controlUseInventoryRows ?? []),
    ...selectedCollectionBatchActions.flatMap((action) => action.actionInvocation.controlUseInventoryRows),
    ...(fulfilledContentComposition?.controlUseInventoryRows ?? []),
    ...childCompositions.flatMap((composition) => composition.controlUseInventoryRows),
    ...childInvocations.flatMap((invocation) => invocation.controlUseInventoryRows),
  ];
  const inferredSourceLoweringTargetRefs = [
    ...(input.targetRef == null ? [] : [input.targetRef]),
    ...selectedFields.flatMap((field) => field.memberInvocation?.sourceLoweringTargetRefs ?? []),
    ...selectedRelationships.map(() => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeSingleSelect)),
    ...selectedCollectionTableColumns.flatMap((column) => column.actionInvocation?.sourceLoweringTargetRefs ?? []),
    ...selectedCollectionBatchActions.flatMap((action) => action.actionInvocation.sourceLoweringTargetRefs),
  ];
  const sourceLoweringTargetRefs = appBuilderUniqueOntologyRowRefs([
    ...(input.sourceLoweringTargetRefs ?? inferredSourceLoweringTargetRefs),
    ...(fulfilledContentComposition?.sourceLoweringTargetRefs ?? []),
    ...childCompositions.flatMap((composition) => composition.sourceLoweringTargetRefs),
    ...childInvocations.flatMap((invocation) => invocation.sourceLoweringTargetRefs),
  ]);
  return {
    displayText: `App-builder source-lowering composition: target=${input.targetRef == null ? 'none' : `${input.targetRef.kind}:${input.targetRef.id}`}, composition=${input.compositionKind ?? 'none'}, fields=${selectedFields.length}, relationships=${selectedRelationships.length}, actionFeedback=${selectedActionFeedback == null ? 'none' : selectedActionFeedback.actionName}, collectionFields=${selectedCollectionDisplayFields.length}, tableColumns=${selectedCollectionTableColumns.length}, batchActions=${selectedCollectionBatchActions.length}, fulfilledContent=${fulfilledContentComposition == null ? 'none' : fulfilledContentComposition.compositionKind ?? 'unknown'}, childCompositions=${childCompositions.length}, childContent=${childContent.length}, fragments=${fragments.length}, issues=${input.issues.length}.`,
    targetRef: input.targetRef,
    compositionKind: input.compositionKind,
    sourceLoweringTargetRefs,
    effectContractIds: appBuilderUniqueEffectContractIds(sourceLoweringTargetRefs.flatMap(appBuilderEffectContractIdsForTargetRef)),
    preflightRow: input.preflightRow ?? null,
    ...(input.preflight == null ? {} : { preflight: input.preflight }),
    selectedFields,
    availableFieldNames: input.availableFieldNames ?? [],
    selectedRelationships,
    availableRelationshipNames: input.availableRelationshipNames ?? [],
    selectedAction,
    availableActionNames: input.availableActionNames ?? [],
    selectedActionFeedback,
    availableActionFeedbackActionNames: input.availableActionFeedbackActionNames ?? [],
    collectionExpression: input.collectionExpression ?? null,
    itemLocalName: input.itemLocalName ?? null,
    promiseExpression: input.promiseExpression ?? null,
    pendingText: input.pendingText ?? null,
    fulfilledLocalName: input.fulfilledLocalName ?? null,
    emptyStateText: input.emptyStateText ?? null,
    emptyStateConditionExpression: input.emptyStateConditionExpression ?? null,
    rejectedLocalName: input.rejectedLocalName ?? null,
    rejectedText: input.rejectedText ?? null,
    fulfilledContentComposition,
    childCompositions,
    childContent,
    selectedCollectionDisplayFields,
    selectedCollectionTableColumns,
    selectedCollectionBatchActions,
    availableCollectionDisplayFieldNames: input.availableCollectionDisplayFieldNames ?? [],
    availableCollectionTableColumnHeaders: input.availableCollectionTableColumnHeaders ?? [],
    submitEventInvocation: input.submitEventInvocation ?? null,
    submitEventLowering: input.submitEventLowering ?? null,
    controlUseInventoryRows,
    fragments,
    contributingFragments: input.contributingFragments ?? fragments,
    issues: input.issues,
  };
}

export function optionalControlUseInventoryRow(
  row: AppBuilderControlUseInventoryRow | null,
): readonly AppBuilderControlUseInventoryRow[] {
  return row == null ? [] : [row];
}
