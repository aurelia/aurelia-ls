import type { AppBuilderDomainActionDescriptor } from '../domain-model.js';
import type { AppBuilderDomainFieldSourceModel } from '../domain-field-source.js';
import { AppBuilderPartSlotKind } from '../part-application.js';
import { AppBuilderPartKind } from '../part-catalog.js';
import {
  type AppBuilderPartSourceFragment,
  AppBuilderPartSourceFragmentKind,
  type AppBuilderTemplateAttributePartSourceFragment,
} from '../part-source-invocation.js';
import {
  appBuilderIsTypeScriptIdentifier,
  appBuilderTemplateElementFragment,
} from '../source-lowering-helpers.js';
import { AppBuilderStructuralPartId } from '../structural-part-catalog.js';
import { textInterpolationSourceText } from '../../template/binding-expression-source.js';
import type { AppBuilderSuppliedInput } from './input-readiness.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import {
  appBuilderSourceLoweringActionFeedbackPayloads,
  appBuilderSourceLoweringVisualHookAttributes,
  type AppBuilderSourceLoweringActionFeedbackPayload,
  AppBuilderSourceLoweringVisualHookTarget,
} from './source-lowering-inputs.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  lowerStructuralTemplateControllerAttribute,
  sourceLoweringCompositionResult,
  sourceLoweringCompositionSuppliedInputs,
  structuralPartLoweringIssues,
  withCompositionOrigin,
} from './source-lowering-composition.js';
import {
  AppBuilderSourceLoweringCompositionIssueKind,
  AppBuilderSourceLoweringCompositionKind,
  type AppBuilderSourceLoweringComposition,
  type AppBuilderSourceLoweringCompositionIssue,
  type AppBuilderSourceLoweringCompositionRequest,
} from './source-lowering-composition-contracts.js';

type ActionFeedbackSelection = {
  readonly selectedActionFeedback: AppBuilderSourceLoweringActionFeedbackPayload | null;
  readonly availableActionFeedbackActionNames: readonly string[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
};

type ActionFeedbackReadyFrame = {
  readonly actionFeedback: AppBuilderSourceLoweringActionFeedbackPayload;
  readonly conditionalAttribute: AppBuilderTemplateAttributePartSourceFragment;
};

export function lowerActionFeedbackStatusComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderSourceLoweringComposition {
  const suppliedInputs = sourceLoweringCompositionSuppliedInputs(request);
  const selection = selectActionFeedbackStatus(request, targetRef, suppliedInputs, actions);
  const conditional = selection.selectedActionFeedback == null
    ? null
    : lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.Conditional, [
        { slotKind: AppBuilderPartSlotKind.BindingExpression, value: selection.selectedActionFeedback.statusMemberName },
      ]);
  const issues = [
    ...selection.issues,
    ...(conditional == null ? [] : structuralPartLoweringIssues(targetRef, [conditional])),
  ];
  const readyFrame = actionFeedbackReadyFrame(selection, conditional, issues);
  if (readyFrame == null) {
    return actionFeedbackStatusResult({
      request,
      targetRef,
      preflight,
      preflightRow,
      fields,
      actions,
      selection,
      contributingFragments: conditional?.attributeFragment == null ? [] : [conditional.attributeFragment],
      issues,
    });
  }
  const statusFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'p',
      [
        readyFrame.conditionalAttribute.templateAttribute,
        { rawName: 'role', rawValue: 'status' },
        ...(readyFrame.actionFeedback.statusId == null
          ? []
          : [{ rawName: 'id', rawValue: readyFrame.actionFeedback.statusId }]),
        ...appBuilderSourceLoweringVisualHookAttributes(
          suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
          { actionName: readyFrame.actionFeedback.actionName },
        ),
      ],
      textInterpolationSourceText({ sourceExpression: readyFrame.actionFeedback.statusMemberName }),
    ),
    AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
    targetRef,
    actionFeedbackStatusCompositionMemberTargetIds(),
  );
  return actionFeedbackStatusResult({
    request,
    targetRef,
    preflight,
    preflightRow,
    fields,
    actions,
    selection,
    fragments: [statusFragment],
    contributingFragments: [
      readyFrame.conditionalAttribute,
      statusFragment,
    ],
    issues: [],
  });
}

function selectActionFeedbackStatus(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): ActionFeedbackSelection {
  const feedbacks = appBuilderSourceLoweringActionFeedbackPayloads(suppliedInputs);
  const availableActionNames = actions.map((action) => action.name);
  const availableActionFeedbackActionNames = feedbacks.map((feedback) => feedback.actionName);
  if (feedbacks.length === 0) {
    return {
      selectedActionFeedback: null,
      availableActionFeedbackActionNames,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingActionFeedbackPayload,
        targetRef,
        actionNames: availableActionNames,
        summary: 'Action feedback status source lowering needs explicit ActionFeedback input; app-builder will not invent success copy or status member names.',
      }],
    };
  }
  const selectedActionName = request.actionName ?? null;
  const candidates = selectedActionName == null
    ? feedbacks
    : feedbacks.filter((feedback) => feedback.actionName === selectedActionName);
  if (selectedActionName != null && candidates.length === 0) {
    return {
      selectedActionFeedback: null,
      availableActionFeedbackActionNames,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownActionFeedbackAction,
        targetRef,
        actionNames: [selectedActionName],
        summary: `Action feedback status requested action '${selectedActionName}', but no ActionFeedback payload targets that action.`,
      }],
    };
  }
  if (candidates.length !== 1) {
    return {
      selectedActionFeedback: null,
      availableActionFeedbackActionNames,
      issues: [{
        issueKind: candidates.length === 0
          ? AppBuilderSourceLoweringCompositionIssueKind.MissingActionSelection
          : AppBuilderSourceLoweringCompositionIssueKind.DuplicateActionFeedback,
        targetRef,
        actionNames: availableActionFeedbackActionNames,
        summary: candidates.length === 0
          ? 'Action feedback status source lowering needs an explicit actionName when no single feedback payload can be selected.'
          : `Action feedback status received ${candidates.length} matching payloads; supply exactly one feedback row per action.`,
      }],
    };
  }
  const selected = candidates[0]!;
  const actionNames = new Set(availableActionNames);
  if (!actionNames.has(selected.actionName)) {
    return {
      selectedActionFeedback: selected,
      availableActionFeedbackActionNames,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownActionFeedbackAction,
        targetRef,
        actionFeedback: selected,
        actionNames: [selected.actionName],
        summary: `Action feedback status payload targets action '${selected.actionName}', but that action is absent from supplied DomainActions input.`,
      }],
    };
  }
  if (!appBuilderIsTypeScriptIdentifier(selected.statusMemberName)) {
    return {
      selectedActionFeedback: selected,
      availableActionFeedbackActionNames,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidActionFeedbackStatusMember,
        targetRef,
        actionFeedback: selected,
        statusMemberNames: [selected.statusMemberName],
        summary: `Action feedback status member '${selected.statusMemberName}' cannot be emitted as a TypeScript-safe member access.`,
      }],
    };
  }
  return {
    selectedActionFeedback: selected,
    availableActionFeedbackActionNames,
    issues: [],
  };
}

function actionFeedbackReadyFrame(
  selection: ActionFeedbackSelection,
  conditional: ReturnType<typeof lowerStructuralTemplateControllerAttribute> | null,
  issues: readonly AppBuilderSourceLoweringCompositionIssue[],
): ActionFeedbackReadyFrame | null {
  if (selection.selectedActionFeedback == null || conditional?.attributeFragment == null || issues.length > 0) {
    return null;
  }
  return {
    actionFeedback: selection.selectedActionFeedback,
    conditionalAttribute: conditional.attributeFragment,
  };
}

function actionFeedbackStatusResult(input: {
  readonly request: AppBuilderSourceLoweringCompositionRequest;
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly preflight: AppBuilderSourceLoweringPreflight;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly actions: readonly AppBuilderDomainActionDescriptor[];
  readonly selection: ActionFeedbackSelection;
  readonly fragments?: readonly AppBuilderPartSourceFragment[];
  readonly contributingFragments?: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
}): AppBuilderSourceLoweringComposition {
  return sourceLoweringCompositionResult({
    targetRef: input.targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
    preflightRow: input.preflightRow,
    preflight: input.request.includePreflight === true ? input.preflight : undefined,
    availableFieldNames: input.fields.map((field) => field.memberName),
    availableActionNames: input.actions.map((action) => action.name),
    selectedActionFeedback: input.selection.selectedActionFeedback,
    availableActionFeedbackActionNames: input.selection.availableActionFeedbackActionNames,
    fragments: input.fragments,
    contributingFragments: input.contributingFragments,
    issues: input.issues,
  });
}

function actionFeedbackStatusCompositionMemberTargetIds(): readonly string[] {
  return [
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.Conditional}`,
  ];
}
