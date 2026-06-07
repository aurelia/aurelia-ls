import { AppBuilderBindingPartId } from '../binding-part-catalog.js';
import {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
} from '../control-catalog.js';
import {
  APP_BUILDER_CONTROL_PATTERN_IDS,
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
} from './control.js';
import {
  appBuilderControlUseInventoryRow,
  AppBuilderControlUseActionChannelKind,
  AppBuilderControlUseInventorySourceKind,
  type AppBuilderControlUseInventoryRow,
} from './control-use-inventory.js';
import {
  AppBuilderDomainRelationshipKind,
  AppBuilderDomainRelationshipLocalValueKind,
  type AppBuilderDomainActionDescriptor,
  type AppBuilderDomainRelationshipDescriptor,
} from '../domain-model.js';
import type {
  AppBuilderDomainFieldSourceModel,
} from '../domain-field-source.js';
import {
  type AppBuilderSuppliedInput,
} from './input-readiness.js';
import { AppBuilderApplicationPatternId } from './application-pattern.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appendAppBuilderTemplateElementAttributes,
  type AppBuilderPartSourceLowering,
} from '../part-source-lowering.js';
import { AppBuilderPartKind } from '../part-catalog.js';
import type {
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
  appBuilderChoiceControlElementFragment,
  appBuilderIsTypeScriptIdentifier,
  appBuilderKebabCase,
  appBuilderLowerCamelCase,
  appBuilderTemplateElementFragment,
} from '../source-lowering-helpers.js';
import { lowerAppBuilderEventAttribute } from '../source-lowering-event-attribute.js';
import {
  authoredTemplateTextContentText,
} from '../../template/authored-template-source.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import {
  appBuilderSourceLoweringAccessibilityHelpErrorPayloads,
  appBuilderSourceLoweringDomainEntityPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderSourceLoweringVisualClassHookPayloads,
  appBuilderSourceLoweringVisualHookAttributes,
  AppBuilderSourceLoweringVisualHookTarget,
  type AppBuilderSourceLoweringDomainEntityPayload,
} from './source-lowering-inputs.js';
import {
  type AppBuilderSourceLoweringInvocation,
  AppBuilderSourceLoweringBindingExpressionSource,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringFieldControlIdSource,
  AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringLabelTextSource,
  AppBuilderSourceLoweringValueDomainExpressionSource,
  appBuilderSourceLoweringInvocation,
} from './source-lowering-invocation.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  type AppBuilderSourceLoweringComposition,
  type AppBuilderSourceLoweringCompositionIssue,
  type AppBuilderSourceLoweringCompositionRequest,
} from './source-lowering-composition-contracts.js';
import {
  AppBuilderSourceLoweringCompositionIssueKind,
  AppBuilderSourceLoweringCompositionKind,
  type AppBuilderSourceLoweringCompositionAction,
  type AppBuilderSourceLoweringCompositionField,
  type AppBuilderSourceLoweringCompositionFieldControlSelection,
  type AppBuilderSourceLoweringCompositionRelationshipControl,
  type AppBuilderSourceLoweringCompositionRelationshipControlSelection,
} from './source-lowering-composition-contracts.js';

/** Shared composition services supplied by the registry owner to keep the native form lowerer cycle-free at runtime. */
export interface AppBuilderNativeSubmitFormCompositionLowererServices {
  /** Expand request-local supplied inputs with any decision-bundle payloads. */
  readonly sourceLoweringCompositionSuppliedInputs: (
    request: AppBuilderSourceLoweringCompositionRequest,
  ) => readonly AppBuilderSuppliedInput[];
  /** Attach source-lowering composition provenance to a fragment. */
  readonly withCompositionOrigin: <TFragment extends AppBuilderPartSourceFragment>(
    fragment: TFragment,
    compositionKind: AppBuilderSourceLoweringCompositionKind,
    targetRef: AppBuilderOntologyRowRef,
    memberTargetIds: readonly string[],
  ) => TFragment;
  /** Derive a field binding expression when the field can be referenced directly. */
  readonly defaultBindingExpressionForField: (
    fieldName: string,
    bindingRootExpression: string | null | undefined,
  ) => string | null;
  /** Normalize optional control-use inventory rows into the public result shape. */
  readonly optionalControlUseInventoryRow: (
    row: AppBuilderControlUseInventoryRow | null,
  ) => readonly AppBuilderControlUseInventoryRow[];
  /** Build the normalized public composition answer. */
  readonly sourceLoweringCompositionResult: (
    input: Partial<AppBuilderSourceLoweringComposition> & {
      readonly targetRef: AppBuilderOntologyRowRef | null;
      readonly compositionKind: AppBuilderSourceLoweringCompositionKind | null;
      readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
    },
  ) => AppBuilderSourceLoweringComposition;
}

/** Lower the Native Submit Form composition family without owning the global composition registry. */
export function lowerNativeSubmitFormComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): AppBuilderSourceLoweringComposition {
  const selection = nativeSubmitFormSelectionFrame(request, targetRef, fields, actions, services);
  const memberFieldLowering = lowerNativeSubmitFormMemberFields(
    selection.selectedFields.fields,
    selection.fieldControlSelections.selectionsByField,
    request,
    targetRef,
    services,
  );
  const memberFields = memberFieldLowering.memberFields;
  const memberRelationshipLowering = lowerNativeSubmitFormMemberRelationships(
    selection.selectedRelationships.relationships,
    selection.relationshipControlSelections.selectionsByRelationship,
    request,
    targetRef,
    services,
  );
  const memberRelationships = memberRelationshipLowering.memberRelationships;
  const submitEvent = lowerNativeSubmitFormSubmitEvent(selection.selectedAction.selectedAction, targetRef);
  const issues = [
    ...selection.issues,
    ...memberFieldLowering.issues,
    ...memberRelationshipLowering.issues,
    ...submitEvent.issues,
  ];
  const readyFrame = nativeSubmitFormReadyFrame(selection, memberFields, memberRelationships, submitEvent, issues);
  if (readyFrame == null) {
    return nativeSubmitFormCompositionResult({
      services,
      request,
      targetRef,
      preflight,
      preflightRow,
      fields,
      actions,
      selectedFields: memberFields,
      selectedRelationships: memberRelationships,
      selectedAction: selection.selectedAction.selectedAction,
      submitEventInvocation: submitEvent.invocation,
      submitEventLowering: submitEvent.lowering,
      fragments: [],
      contributingFragments: nativeSubmitFormContributingFragments(memberFields, memberRelationships, submitEvent),
      controlUseInventoryRows: memberRelationshipLowering.controlUseInventoryRows,
      issues,
    });
  }

  const rendered = nativeSubmitFormRenderedFragments(request, targetRef, services, readyFrame);
  return nativeSubmitFormCompositionResult({
    services,
    request,
    targetRef,
    preflight,
    preflightRow,
    fields,
    actions,
    selectedFields: readyFrame.memberFields,
    selectedRelationships: readyFrame.memberRelationships,
    selectedAction: readyFrame.selectedAction,
    submitEventInvocation: readyFrame.submitEvent.invocation,
    submitEventLowering: readyFrame.submitEvent.lowering,
    fragments: [rendered.formFragmentWithOrigin],
    contributingFragments: [
      ...readyFrame.memberFragments,
      ...readyFrame.relationshipFragments,
      ...readyFrame.submitFragments,
      rendered.submitButton,
      rendered.formFragmentWithOrigin,
    ],
    controlUseInventoryRows: [
      ...memberRelationshipLowering.controlUseInventoryRows,
      ...rendered.submitButtonControlUseRows,
    ],
    issues: [],
  });
}

type NativeSubmitFormSelectionFrame = {
  readonly selectedFields: ReturnType<typeof selectCompositionFields>;
  readonly selectedFieldNames: readonly string[];
  readonly fieldControlSelections: ReturnType<typeof selectCompositionFieldControlSelections>;
  readonly selectedRelationships: ReturnType<typeof selectCompositionRelationships>;
  readonly selectedRelationshipNames: readonly string[];
  readonly relationshipControlSelections: ReturnType<typeof selectCompositionRelationshipControlSelections>;
  readonly selectedAction: ReturnType<typeof selectCompositionAction>;
  readonly submitButtonText: string | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
};

type NativeSubmitFormSubmitEvent = ReturnType<typeof lowerNativeSubmitFormSubmitEvent>;
type NativeSubmitFormReadySubmitEvent = NativeSubmitFormSubmitEvent & {
  readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment;
};

type NativeSubmitFormReadyFrame = {
  readonly selectedAction: AppBuilderSourceLoweringCompositionAction;
  readonly submitButtonText: string;
  readonly memberFields: readonly AppBuilderSourceLoweringCompositionField[];
  readonly memberFragments: readonly AppBuilderPartSourceFragment[];
  readonly memberRelationships: readonly AppBuilderSourceLoweringCompositionRelationshipControl[];
  readonly relationshipFragments: readonly AppBuilderPartSourceFragment[];
  readonly submitEvent: NativeSubmitFormReadySubmitEvent;
  readonly submitFragments: readonly AppBuilderPartSourceFragment[];
};

type NativeSubmitFormRenderedFragments = {
  readonly submitButton: AppBuilderTemplateElementPartSourceFragment;
  readonly formFragmentWithOrigin: AppBuilderPartSourceFragment;
  readonly submitButtonControlUseRows: readonly AppBuilderControlUseInventoryRow[];
};

type NativeSubmitFormRelationshipControlValue =
  Omit<AppBuilderSourceLoweringCompositionRelationshipControl, 'controlFragment'>;

type NativeSubmitFormCompositionResultInput = {
  readonly services: AppBuilderNativeSubmitFormCompositionLowererServices;
  readonly request: AppBuilderSourceLoweringCompositionRequest;
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly preflight: AppBuilderSourceLoweringPreflight;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly actions: readonly AppBuilderDomainActionDescriptor[];
  readonly selectedFields: readonly AppBuilderSourceLoweringCompositionField[];
  readonly selectedRelationships: readonly AppBuilderSourceLoweringCompositionRelationshipControl[];
  readonly selectedAction: AppBuilderSourceLoweringCompositionAction | null;
  readonly submitEventInvocation: AppBuilderPartSourceInvocation | null;
  readonly submitEventLowering: AppBuilderPartSourceLowering | null;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows?: readonly AppBuilderControlUseInventoryRow[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
};

function nativeSubmitFormSelectionFrame(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): NativeSubmitFormSelectionFrame {
  const selectedFields = selectCompositionFields(fields, request, targetRef, services);
  const selectedFieldNames = selectedFields.fields.map((field) => field.field.memberName);
  const fieldControlSelections = selectCompositionFieldControlSelections(request, targetRef, selectedFieldNames);
  const suppliedInputs = services.sourceLoweringCompositionSuppliedInputs(request);
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  const selectedRelationships = selectCompositionRelationships(relationships, request, targetRef);
  const selectedRelationshipNames = selectedRelationships.relationships.map((relationship) => relationship.relationship.name);
  const relationshipControlSelections = selectCompositionRelationshipControlSelections(request, targetRef, selectedRelationshipNames);
  const selectedAction = selectCompositionAction(actions, request, targetRef);
  const submitButtonText = normalizedSourceInputText(request.submitButtonText);
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [
    ...selectedFields.issues,
    ...selectedRelationships.issues,
    ...sourceLoweringCompositionScopedFieldInputIssues(request, targetRef, selectedFieldNames, services),
    ...fieldControlSelections.issues,
    ...relationshipControlSelections.issues,
    ...selectedAction.issues,
    ...domainBackedSubmitFormReadinessIssues(request, targetRef, selectedFields.fields),
    ...sourceLoweringCompositionSubmitButtonVisualHookActionIssues(
      request,
      targetRef,
      selectedAction.selectedAction?.action.name ?? null,
      actions.map((action) => action.name),
      services,
    ),
  ];
  if (submitButtonText == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingSubmitButtonText,
      targetRef,
      summary: 'Native submit form source lowering needs explicit submitButtonText before it can emit visible button text.',
    });
  }
  return {
    selectedFields,
    selectedFieldNames,
    fieldControlSelections,
    selectedRelationships,
    selectedRelationshipNames,
    relationshipControlSelections,
    selectedAction,
    submitButtonText,
    issues,
  };
}

function nativeSubmitFormReadyFrame(
  selection: NativeSubmitFormSelectionFrame,
  memberFields: readonly AppBuilderSourceLoweringCompositionField[],
  memberRelationships: readonly AppBuilderSourceLoweringCompositionRelationshipControl[],
  submitEvent: NativeSubmitFormSubmitEvent,
  issues: readonly AppBuilderSourceLoweringCompositionIssue[],
): NativeSubmitFormReadyFrame | null {
  const memberFragments = memberFields.flatMap((field) => field.memberInvocation?.fragments ?? []);
  const relationshipFragments = memberRelationships.flatMap((relationship) =>
    relationship.controlFragment == null ? [] : [relationship.controlFragment]
  );
  const submitFragments = submitEvent.lowering?.fragments ?? [];
  const selectedAction = selection.selectedAction.selectedAction;
  const submitButtonText = selection.submitButtonText;
  const submitAttribute = submitEvent.attributeFragment;
  if (
    issues.length > 0
    || selectedAction == null
    || submitButtonText == null
    || submitAttribute == null
    || memberFragments.length !== memberFields.length
    || relationshipFragments.length !== memberRelationships.length
  ) {
    return null;
  }
  return {
    selectedAction,
    submitButtonText,
    memberFields,
    memberFragments,
    memberRelationships,
    relationshipFragments,
    submitEvent: {
      ...submitEvent,
      attributeFragment: submitAttribute,
    },
    submitFragments,
  };
}

function nativeSubmitFormRenderedFragments(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
  readyFrame: NativeSubmitFormReadyFrame,
): NativeSubmitFormRenderedFragments {
  const suppliedInputs = services.sourceLoweringCompositionSuppliedInputs(request);
  const submitButton = services.withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'button',
      [
        { rawName: 'type', rawValue: 'submit' },
        ...domainBackedSubmitButtonReadinessAttributes(request, targetRef, readyFrame.memberFields),
        ...appBuilderSourceLoweringVisualHookAttributes(
          suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.Button,
          { actionName: readyFrame.selectedAction.action.name },
        ),
      ],
      authoredTemplateTextContentText(readyFrame.submitButtonText),
    ),
    AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    targetRef,
    [`${AppBuilderOntologyRowKind.ControlPattern}:${AppBuilderControlPatternId.NativeButton}`],
  );
  const submitButtonControlUseRows = services.optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
    sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
    targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    fragments: [submitButton],
    realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
    controlPatternId: AppBuilderControlPatternId.NativeButton,
    actionName: readyFrame.selectedAction.action.name,
    handlerExpression: readyFrame.selectedAction.handlerExpression,
    handlerExpressionSource: readyFrame.selectedAction.handlerExpressionSource,
    eventName: 'submit',
    actionChannelKind: AppBuilderControlUseActionChannelKind.ContainingFormSubmit,
    buttonText: readyFrame.submitButtonText,
    buttonType: AppBuilderSourceLoweringButtonType.Submit,
  }));
  const formFragment = appBuilderTemplateElementFragment(
    'form',
    [
      readyFrame.submitEvent.attributeFragment.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.Form,
      ),
    ],
    null,
    [
      ...readyFrame.memberFragments
        .filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
          fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
        )
        .map((fragment) => fragment.templateElement),
      ...readyFrame.relationshipFragments
        .filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
          fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
        )
        .map((fragment) => fragment.templateElement),
      submitButton.templateElement,
    ],
  );
  return {
    submitButton,
    submitButtonControlUseRows,
    formFragmentWithOrigin: {
      ...formFragment,
      origin: {
        kind: AppBuilderSourceFragmentOriginKind.SourceLoweringComposition,
        compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
        targetKind: targetRef.kind,
        targetId: targetRef.id,
        memberTargetIds: [
          `${AppBuilderOntologyRowKind.ControlPattern}:${AppBuilderControlPatternId.FieldGroup}`,
          `${AppBuilderPartKind.BindingPart}:${AppBuilderBindingPartId.EventListener}`,
        ],
      },
    },
  };
}

function nativeSubmitFormCompositionResult(
  input: NativeSubmitFormCompositionResultInput,
): AppBuilderSourceLoweringComposition {
  return input.services.sourceLoweringCompositionResult({
    targetRef: input.targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    preflightRow: input.preflightRow,
    preflight: input.request.includePreflight === true ? input.preflight : undefined,
    selectedFields: input.selectedFields,
    availableFieldNames: input.fields.map((field) => field.memberName),
    selectedRelationships: input.selectedRelationships,
    availableRelationshipNames: appBuilderSourceLoweringDomainRelationshipPayloads(input.services.sourceLoweringCompositionSuppliedInputs(input.request))
      .map((relationship) => relationship.name),
    selectedAction: input.selectedAction,
    availableActionNames: input.actions.map((action) => action.name),
    submitEventInvocation: input.submitEventInvocation,
    submitEventLowering: input.submitEventLowering,
    fragments: input.fragments,
    contributingFragments: input.contributingFragments,
    controlUseInventoryRows: input.controlUseInventoryRows,
    issues: input.issues,
  });
}

function nativeSubmitFormContributingFragments(
  memberFields: readonly AppBuilderSourceLoweringCompositionField[],
  memberRelationships: readonly AppBuilderSourceLoweringCompositionRelationshipControl[],
  submitEvent: NativeSubmitFormSubmitEvent,
): readonly AppBuilderPartSourceFragment[] {
  return [
    ...memberFields.flatMap((field) => field.memberInvocation?.fragments ?? []),
    ...memberRelationships.flatMap((relationship) => relationship.controlFragment == null ? [] : [relationship.controlFragment]),
    ...(submitEvent.lowering?.fragments ?? []),
  ];
}

function domainBackedSubmitFormReadinessIssues(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  selectedFields: readonly {
    readonly field: AppBuilderDomainFieldSourceModel;
    readonly bindingExpression: string | null;
  }[],
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  if (!isDomainBackedSubmitFormTarget(targetRef)) {
    return [];
  }
  const bindingRootExpression = normalizedSourceInputText(request.bindingRootExpression);
  const requiredFieldNames = selectedFields
    .filter((field) => field.field.field.required === true)
    .map((field) => field.field.memberName);
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  if (bindingRootExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingDomainBackedBindingRoot,
      targetRef,
      summary: 'Domain-backed submit form source lowering needs bindingRootExpression so generated fields bind through one local domain object.',
    });
  }
  if (selectedFields.length > 0 && requiredFieldNames.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingDomainBackedReadinessField,
      targetRef,
      fieldNames: selectedFields.map((field) => field.field.memberName),
      summary: 'Domain-backed submit form source lowering currently derives submit readiness from selected fields marked required; mark at least one selected domain field as required or use Native Submit Form.',
    });
  }
  return issues;
}

function domainBackedSubmitButtonReadinessAttributes(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  selectedFields: readonly AppBuilderSourceLoweringCompositionField[],
): readonly AppBuilderTemplateAttributePartSourceFragment['templateAttribute'][] {
  if (!isDomainBackedSubmitFormTarget(targetRef)) {
    return [];
  }
  const bindingRootExpression = normalizedSourceInputText(request.bindingRootExpression);
  const hasRequiredField = selectedFields.some((field) => field.field.field.required === true);
  if (bindingRootExpression == null || !hasRequiredField) {
    return [];
  }
  return [{ rawName: 'disabled.bind', rawValue: `!${bindingRootExpression}.canSubmit` }];
}

function isDomainBackedSubmitFormTarget(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.DomainBackedSubmitForm;
}

function lowerNativeSubmitFormMemberFields(
  selectedFields: readonly {
    readonly field: AppBuilderDomainFieldSourceModel;
    readonly bindingExpression: string | null;
  }[],
  fieldControlSelectionsByField: ReadonlyMap<string, AppBuilderSourceLoweringCompositionFieldControlSelection>,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): {
  readonly memberFields: readonly AppBuilderSourceLoweringCompositionField[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const memberFields = selectedFields.map((field): AppBuilderSourceLoweringCompositionField => {
    if (field.bindingExpression == null) {
      return {
        field: field.field,
        bindingExpression: '',
        memberInvocation: null,
      };
    }
    const fieldControlSelection = fieldControlSelectionsByField.get(field.field.memberName) ?? null;
    const memberInvocation = appBuilderSourceLoweringInvocation({
      targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.FieldGroup),
      suppliedInputs: services.sourceLoweringCompositionSuppliedInputs(request),
      fieldName: field.field.memberName,
      bindingExpression: field.bindingExpression,
      innerControlPatternId: fieldControlSelection?.innerControlPatternId ?? undefined,
      fieldControlId: fieldControlSelection?.fieldControlId,
      labelText: fieldControlSelection?.labelText ?? field.field.field.title,
      messageKind: fieldControlSelection?.messageKind,
      messageText: fieldControlSelection?.messageText,
      messageId: fieldControlSelection?.messageId,
      valueDomainExpression: fieldControlSelection?.valueDomainExpression,
      valueSetName: fieldControlSelection?.valueSetName,
      optionLocalName: fieldControlSelection?.optionLocalName,
      optionValueExpression: fieldControlSelection?.optionValueExpression,
      optionBindingKind: fieldControlSelection?.optionBindingKind,
      optionLabelExpression: fieldControlSelection?.optionLabelExpression,
      matcherExpression: fieldControlSelection?.matcherExpression,
      includePreflight: request.includePreflight,
      emissionContext: request.emissionContext,
    });
    return {
      field: field.field,
      bindingExpression: field.bindingExpression,
      memberInvocation,
    };
  });
  const issues = memberFields.flatMap((field): readonly AppBuilderSourceLoweringCompositionIssue[] => {
    if (field.memberInvocation == null) {
      return [];
    }
    if (field.memberInvocation.issues.length === 0 && field.memberInvocation.fragments.length > 0) {
      return [];
    }
    return [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MemberInvocationIssue,
      targetRef,
      fieldNames: [field.field.memberName],
      memberInvocation: field.memberInvocation,
      summary: `Native submit form member field '${field.field.memberName}' could not lower cleanly: ${field.memberInvocation.issues.map((issue) => issue.summary).join(' ')}`,
    }];
  });
  return {
    memberFields,
    issues,
  };
}

function lowerNativeSubmitFormMemberRelationships(
  selectedRelationships: readonly {
    readonly relationship: AppBuilderDomainRelationshipDescriptor;
  }[],
  relationshipControlSelectionsByRelationship: ReadonlyMap<string, AppBuilderSourceLoweringCompositionRelationshipControlSelection>,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): {
  readonly memberRelationships: readonly AppBuilderSourceLoweringCompositionRelationshipControl[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const suppliedInputs = services.sourceLoweringCompositionSuppliedInputs(request);
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  const memberRelationships: AppBuilderSourceLoweringCompositionRelationshipControl[] = [];
  const controlUseInventoryRows: AppBuilderControlUseInventoryRow[] = [];
  for (const selectedRelationship of selectedRelationships) {
    const relationship = selectedRelationship.relationship;
    const controlSelection = relationshipControlSelectionsByRelationship.get(relationship.name) ?? null;
    const frame = nativeSubmitFormRelationshipControlFrame(relationship, controlSelection, entities, targetRef);
    issues.push(...frame.issues);
    if (frame.value == null) {
      continue;
    }
    const controlFragment = appBuilderChoiceControlElementFragment(
      AppBuilderControlId.SingleSelect,
      frame.value.bindingExpression,
      {
        optionDomainExpression: frame.value.valueDomainExpression,
        optionLocalName: frame.value.optionLocalName,
        optionValueExpression: frame.value.optionValueExpression,
        optionBindingKind: frame.value.optionBindingKind,
        optionLabelExpression: frame.value.optionLabelExpression,
        matcherExpression: frame.value.matcherExpression ?? undefined,
      },
    );
    const controlFragmentWithAttributes = appendAppBuilderTemplateElementAttributes(
      controlFragment,
      [
        { rawName: 'id', rawValue: frame.value.fieldControlId },
        ...appBuilderSourceLoweringVisualHookAttributes(
          suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.FieldControl,
          { relationshipName: relationship.name },
        ),
      ],
    );
    const labelFragment = appBuilderTemplateElementFragment(
      'label',
      [
        { rawName: 'for', rawValue: frame.value.fieldControlId },
        ...appBuilderSourceLoweringVisualHookAttributes(
          suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
          { relationshipName: relationship.name },
        ),
      ],
      authoredTemplateTextContentText(frame.value.labelText),
    );
    const groupFragment = services.withCompositionOrigin(
      appBuilderTemplateElementFragment(
        'div',
        appBuilderSourceLoweringVisualHookAttributes(
          suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
          { relationshipName: relationship.name },
        ),
        null,
        [
          labelFragment.templateElement,
          controlFragmentWithAttributes.templateElement,
        ],
      ),
      AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      targetRef,
      [`${AppBuilderOntologyRowKind.ControlPattern}:${AppBuilderControlPatternId.NativeSingleSelect}`],
    );
    memberRelationships.push({
      ...frame.value,
      controlFragment: groupFragment,
    });
    controlUseInventoryRows.push(...services.optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
      sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      fragments: [groupFragment],
      realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
      controlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
      controlId: AppBuilderControlId.SingleSelect,
      bindingExpression: frame.value.bindingExpression,
      bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest,
      labelText: frame.value.labelText,
      labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
      fieldControlId: frame.value.fieldControlId,
      fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource.ExplicitRequest,
      valueDomainExpression: frame.value.valueDomainExpression,
      valueDomainExpressionSource: AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitRequest,
    })));
  }
  return {
    memberRelationships,
    controlUseInventoryRows,
    issues,
  };
}

function lowerNativeSubmitFormSubmitEvent(
  selectedAction: AppBuilderSourceLoweringCompositionAction | null,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly invocation: AppBuilderPartSourceInvocation | null;
  readonly lowering: AppBuilderPartSourceLowering | null;
  readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  if (selectedAction == null) {
    return {
      invocation: null,
      lowering: null,
      attributeFragment: null,
      issues: [],
    };
  }
  const submitEvent = lowerSubmitEventAttribute(selectedAction.handlerExpression);
  if (submitEvent.lowering.issues.length > 0) {
    return {
      ...submitEvent,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.SubmitEventLoweringIssue,
        targetRef,
        actionNames: [selectedAction.action.name],
        submitEventLowering: submitEvent.lowering,
        summary: `Native submit form submit listener could not lower cleanly: ${submitEvent.lowering.issues.map((issue) => issue.summary).join(' ')}`,
      }],
    };
  }
  if (submitEvent.attributeFragment == null) {
    return {
      ...submitEvent,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.SubmitEventLoweringIssue,
        targetRef,
        submitEventLowering: submitEvent.lowering,
        summary: 'Native submit form expected submit event source lowering to produce a template-attribute fragment.',
      }],
    };
  }
  return {
    ...submitEvent,
    issues: [],
  };
}

function selectCompositionFields(
  fields: readonly AppBuilderDomainFieldSourceModel[],
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): {
  readonly fields: readonly {
    readonly field: AppBuilderDomainFieldSourceModel;
    readonly bindingExpression: string | null;
  }[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  if (fields.length === 0) {
    return {
      fields: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingDomainFieldsPayload,
        targetRef,
        summary: 'Native submit form source lowering needs a modeled domain-fields payload before source can render fields.',
      }],
    };
  }
  const fieldNames = request.fieldNames?.map(normalizedSourceInputText).filter((name): name is string => name != null) ?? [];
  if (fieldNames.length === 0) {
    return {
      fields: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingFieldSelection,
        targetRef,
        fieldNames: fields.map((field) => field.memberName),
        summary: `Native submit form source lowering needs explicit fieldNames to establish field order. Available fields: ${fields.map((field) => field.memberName).join(', ')}.`,
      }],
    };
  }
  const fieldsByName = new Map(fields.map((field) => [field.memberName, field]));
  const bindingExpressionsByField = new Map((request.fieldBindingExpressions ?? [])
    .map((entry) => [entry.fieldName, normalizedSourceInputText(entry.bindingExpression)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] != null));
  const seen = new Set<string>();
  const selected: {
    readonly field: AppBuilderDomainFieldSourceModel;
    readonly bindingExpression: string | null;
  }[] = [];
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const fieldName of fieldNames) {
    if (seen.has(fieldName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateFieldSelection,
        targetRef,
        fieldNames: [fieldName],
        summary: `Native submit form field '${fieldName}' was selected more than once.`,
      });
      continue;
    }
    seen.add(fieldName);
    const field = fieldsByName.get(fieldName) ?? null;
    if (field == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownRequestedField,
        targetRef,
        fieldNames: [fieldName, ...fields.map((candidate) => candidate.memberName)],
        summary: `Requested field '${fieldName}' is not present in the supplied domain-fields payload. Available fields: ${fields.map((candidate) => candidate.memberName).join(', ')}.`,
      });
      continue;
    }
    selected.push({
      field,
      bindingExpression: bindingExpressionsByField.get(fieldName) ?? services.defaultBindingExpressionForField(field.memberName, request.bindingRootExpression),
    });
  }
  for (const field of selected) {
    if (field.bindingExpression == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingFieldBindingExpression,
        targetRef,
        fieldNames: [field.field.memberName],
        summary: `Field '${field.field.memberName}' is not a TypeScript identifier; supply fieldBindingExpressions for this field before source lowering can bind it.`,
      });
    }
  }
  return {
    fields: selected,
    issues,
  };
}

function selectCompositionFieldControlSelections(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  selectedFieldNames: readonly string[],
): {
  readonly selectionsByField: ReadonlyMap<string, AppBuilderSourceLoweringCompositionFieldControlSelection>;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const selectedFieldNameSet = new Set(selectedFieldNames);
  const seenFieldNames = new Set<string>();
  const selectionsByField = new Map<string, AppBuilderSourceLoweringCompositionFieldControlSelection>();
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const selection of request.fieldControlSelections ?? []) {
    const fieldName = normalizedSourceInputText(selection.fieldName);
    if (fieldName == null || !selectedFieldNameSet.has(fieldName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldControlSelectionField,
        targetRef,
        fieldNames: [
          ...(fieldName == null ? [] : [fieldName]),
          ...selectedFieldNames,
        ],
        summary: fieldName == null
          ? `Native submit form fieldControlSelections entries need a fieldName. Selected fields: ${selectedFieldNames.join(', ')}.`
          : `Native submit form fieldControlSelections named field '${fieldName}', but selected fields are: ${selectedFieldNames.join(', ')}.`,
      });
      continue;
    }
    if (seenFieldNames.has(fieldName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateFieldControlSelection,
        targetRef,
        fieldNames: [fieldName],
        summary: `Native submit form field '${fieldName}' has more than one fieldControlSelections entry.`,
      });
      continue;
    }
    seenFieldNames.add(fieldName);
    const innerControlPatternId = normalizedSourceInputText(selection.innerControlPatternId);
    if (!isAppBuilderControlPatternId(innerControlPatternId)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldControlSelectionControlPattern,
        targetRef,
        fieldNames: [fieldName],
        controlPatternIds: [...APP_BUILDER_CONTROL_PATTERN_IDS],
        summary: innerControlPatternId == null
          ? `Native submit form field '${fieldName}' needs an innerControlPatternId in fieldControlSelections. Available control patterns: ${APP_BUILDER_CONTROL_PATTERN_IDS.join(', ')}.`
          : `Native submit form field '${fieldName}' requested unknown innerControlPatternId '${innerControlPatternId}'. Available control patterns: ${APP_BUILDER_CONTROL_PATTERN_IDS.join(', ')}.`,
      });
      continue;
    }
    selectionsByField.set(fieldName, {
      ...selection,
      fieldName,
      innerControlPatternId,
    });
  }
  return { selectionsByField, issues };
}

function selectCompositionRelationships(
  relationships: readonly AppBuilderDomainRelationshipDescriptor[],
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly relationships: readonly {
    readonly relationship: AppBuilderDomainRelationshipDescriptor;
  }[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const relationshipNames = request.relationshipNames?.map(normalizedSourceInputText).filter((name): name is string => name != null) ?? [];
  if (relationshipNames.length === 0) {
    return { relationships: [], issues: [] };
  }
  const relationshipsByName = new Map(relationships.map((relationship) => [relationship.name, relationship]));
  const seen = new Set<string>();
  const selected: {
    readonly relationship: AppBuilderDomainRelationshipDescriptor;
  }[] = [];
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const relationshipName of relationshipNames) {
    if (seen.has(relationshipName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateRelationshipSelection,
        targetRef,
        relationshipNames: [relationshipName],
        summary: `Native submit form relationship '${relationshipName}' was selected more than once.`,
      });
      continue;
    }
    seen.add(relationshipName);
    const relationship = relationshipsByName.get(relationshipName) ?? null;
    if (relationship == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownRequestedRelationship,
        targetRef,
        relationshipNames: [relationshipName, ...relationships.map((candidate) => candidate.name)],
        summary: `Requested relationship '${relationshipName}' is not present in the supplied domain-relationships payload. Available relationships: ${relationships.map((candidate) => candidate.name).join(', ')}.`,
      });
      continue;
    }
    selected.push({ relationship });
  }
  return { relationships: selected, issues };
}

function selectCompositionRelationshipControlSelections(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  selectedRelationshipNames: readonly string[],
): {
  readonly selectionsByRelationship: ReadonlyMap<string, AppBuilderSourceLoweringCompositionRelationshipControlSelection>;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const selectedRelationshipNameSet = new Set(selectedRelationshipNames);
  const seenRelationshipNames = new Set<string>();
  const selectionsByRelationship = new Map<string, AppBuilderSourceLoweringCompositionRelationshipControlSelection>();
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const selection of request.relationshipControlSelections ?? []) {
    const relationshipName = normalizedSourceInputText(selection.relationshipName);
    if (relationshipName == null || !selectedRelationshipNameSet.has(relationshipName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownRelationshipControlSelectionRelationship,
        targetRef,
        relationshipNames: [
          ...(relationshipName == null ? [] : [relationshipName]),
          ...selectedRelationshipNames,
        ],
        summary: relationshipName == null
          ? `Native submit form relationshipControlSelections entries need a relationshipName. Selected relationships: ${selectedRelationshipNames.join(', ')}.`
          : `Native submit form relationshipControlSelections named relationship '${relationshipName}', but selected relationships are: ${selectedRelationshipNames.join(', ')}.`,
      });
      continue;
    }
    if (seenRelationshipNames.has(relationshipName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateRelationshipControlSelection,
        targetRef,
        relationshipNames: [relationshipName],
        summary: `Native submit form relationship '${relationshipName}' has more than one relationshipControlSelections entry.`,
      });
      continue;
    }
    seenRelationshipNames.add(relationshipName);
    const innerControlPatternId = normalizedSourceInputText(selection.innerControlPatternId);
    if (innerControlPatternId != null && (!isAppBuilderControlPatternId(innerControlPatternId) || innerControlPatternId !== AppBuilderControlPatternId.NativeSingleSelect)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnsupportedRelationshipControlSelection,
        targetRef,
        relationshipNames: [relationshipName],
        controlPatternIds: [AppBuilderControlPatternId.NativeSingleSelect],
        summary: `Native submit form relationship '${relationshipName}' can currently lower through '${AppBuilderControlPatternId.NativeSingleSelect}' only; requested '${innerControlPatternId}'.`,
      });
      continue;
    }
    selectionsByRelationship.set(relationshipName, {
      ...selection,
      relationshipName,
      innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
    });
  }
  return { selectionsByRelationship, issues };
}

function nativeSubmitFormRelationshipControlFrame(
  relationship: AppBuilderDomainRelationshipDescriptor,
  selection: AppBuilderSourceLoweringCompositionRelationshipControlSelection | null,
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly value: NativeSubmitFormRelationshipControlValue | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
  if (relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne || localValueKind !== AppBuilderDomainRelationshipLocalValueKind.Object) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnsupportedRelationshipControlSelection,
        targetRef,
        relationshipNames: [relationship.name],
        controlPatternIds: [AppBuilderControlPatternId.NativeSingleSelect],
        summary: `Native submit form relationship '${relationship.name}' can currently lower object-valued reference-one controls only; got kind='${relationship.kind}', localValueKind='${localValueKind}'.`,
      }],
    };
  }
  const bindingExpression = normalizedSourceInputText(selection?.bindingExpression)
    ?? defaultBindingExpressionForRelationship(relationship);
  if (bindingExpression == null) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRelationshipBindingExpression,
        targetRef,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' cannot derive a safe binding expression from localFieldName; supply relationshipControlSelections.bindingExpression.`,
      }],
    };
  }
  const relatedEntity = relatedEntityForRelationship(relationship, entities);
  const valueDomainExpression = normalizedSourceInputText(selection?.valueDomainExpression)
    ?? defaultValueDomainExpressionForRelationship(relatedEntity);
  if (valueDomainExpression == null) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRelationshipValueDomainExpression,
        targetRef,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' cannot derive a related collection expression; supply relationshipControlSelections.valueDomainExpression.`,
      }],
    };
  }
  const optionLocalName = normalizedSourceInputText(selection?.optionLocalName)
    ?? defaultRelationshipOptionLocalName(relationship, relatedEntity);
  const optionBindingKind = selection?.optionBindingKind ?? AppBuilderChoiceOptionBindingKind.Model;
  const optionValueExpression = normalizedSourceInputText(selection?.optionValueExpression) ?? optionLocalName;
  const optionLabelExpression = normalizedSourceInputText(selection?.optionLabelExpression)
    ?? defaultRelationshipOptionLabelExpression(relationship, optionLocalName);
  return {
    value: {
      relationship,
      bindingExpression,
      controlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
      fieldControlId: normalizedSourceInputText(selection?.fieldControlId) ?? `${appBuilderKebabCase(relationship.name)}-control`,
      labelText: normalizedSourceInputText(selection?.labelText) ?? relationship.title ?? relationship.name,
      valueDomainExpression,
      optionLocalName,
      optionValueExpression,
      optionBindingKind,
      optionLabelExpression,
      matcherExpression: normalizedSourceInputText(selection?.matcherExpression),
    },
    issues: [],
  };
}

function defaultBindingExpressionForRelationship(
  relationship: AppBuilderDomainRelationshipDescriptor,
): string | null {
  const localFieldName = normalizedSourceInputText(relationship.localFieldName);
  return localFieldName != null && appBuilderIsTypeScriptIdentifier(localFieldName)
    ? localFieldName
    : null;
}

function relatedEntityForRelationship(
  relationship: AppBuilderDomainRelationshipDescriptor,
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
): AppBuilderSourceLoweringDomainEntityPayload | null {
  return entities.find((entity) => domainEntityPayloadName(entity) === relationship.toEntityName) ?? null;
}

function defaultValueDomainExpressionForRelationship(
  relatedEntity: AppBuilderSourceLoweringDomainEntityPayload | null,
): string | null {
  const collectionMemberName = normalizedSourceInputText(relatedEntity?.collectionMemberName);
  return collectionMemberName != null && appBuilderIsTypeScriptIdentifier(collectionMemberName)
    ? collectionMemberName
    : null;
}

function defaultRelationshipOptionLocalName(
  relationship: AppBuilderDomainRelationshipDescriptor,
  relatedEntity: AppBuilderSourceLoweringDomainEntityPayload | null,
): string {
  const candidate = normalizedSourceInputText(relatedEntity?.entityTypeName)
    ?? normalizedSourceInputText(relationship.toEntityName)
    ?? 'option';
  const localName = appBuilderLowerCamelCase(candidate);
  return appBuilderIsTypeScriptIdentifier(localName) ? localName : 'option';
}

function defaultRelationshipOptionLabelExpression(
  relationship: AppBuilderDomainRelationshipDescriptor,
  optionLocalName: string,
): string {
  const displayFieldName = normalizedSourceInputText(relationship.displayFieldName);
  return displayFieldName != null && appBuilderIsTypeScriptIdentifier(displayFieldName)
    ? `${optionLocalName}.${displayFieldName}`
    : optionLocalName;
}

function domainEntityPayloadName(
  entity: AppBuilderSourceLoweringDomainEntityPayload,
): string {
  return entity.entityTypeName ?? entity.entityTitle;
}

function sourceLoweringCompositionScopedFieldInputIssues(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  selectedFieldNames: readonly string[],
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  if (selectedFieldNames.length === 0) {
    return [];
  }
  const selectedFieldNameSet = new Set(selectedFieldNames);
  const suppliedInputs = services.sourceLoweringCompositionSuppliedInputs(request);
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];

  for (const payload of appBuilderSourceLoweringAccessibilityHelpErrorPayloads(suppliedInputs)) {
    const fieldName = normalizedSourceInputText(payload.fieldName);
    if (fieldName == null || selectedFieldNameSet.has(fieldName)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldAccessibilityMessageField,
      targetRef,
      fieldNames: [fieldName, ...selectedFieldNames],
      summary: `Native submit form ControlAccessibility message payload scoped to field '${fieldName}', but selected fields are: ${selectedFieldNames.join(', ')}.`,
    });
  }

  for (const hook of appBuilderSourceLoweringVisualClassHookPayloads(suppliedInputs)) {
    const fieldName = normalizedSourceInputText(hook.fieldName);
    if (fieldName == null || selectedFieldNameSet.has(fieldName)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldVisualHookField,
      targetRef,
      fieldNames: [fieldName, ...selectedFieldNames],
      summary: `Native submit form VisualClassHooks payload scoped to field '${fieldName}', but selected fields are: ${selectedFieldNames.join(', ')}.`,
    });
  }

  return issues;
}

function sourceLoweringCompositionSubmitButtonVisualHookActionIssues(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  selectedActionName: string | null,
  availableActionNames: readonly string[],
  services: AppBuilderNativeSubmitFormCompositionLowererServices,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  if (selectedActionName == null) {
    return [];
  }
  const suppliedInputs = services.sourceLoweringCompositionSuppliedInputs(request);
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const hook of appBuilderSourceLoweringVisualClassHookPayloads(suppliedInputs)) {
    if (hook.target !== AppBuilderSourceLoweringVisualHookTarget.Button) {
      continue;
    }
    const actionName = normalizedSourceInputText(hook.actionName);
    if (actionName == null || actionName === selectedActionName) {
      continue;
    }
    if (availableActionNames.includes(actionName)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnmatchedSubmitButtonVisualHookAction,
      targetRef,
      actionNames: [actionName, ...availableActionNames],
      summary: `Native submit form VisualClassHooks payload scoped to unknown action '${actionName}', but supplied actions are: ${availableActionNames.join(', ')}.`,
    });
  }
  return issues;
}

function isAppBuilderControlPatternId(
  value: string | null,
): value is AppBuilderControlPatternId {
  return value != null && (APP_BUILDER_CONTROL_PATTERN_IDS as readonly string[]).includes(value);
}

function selectCompositionAction(
  actions: readonly AppBuilderDomainActionDescriptor[],
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly selectedAction: AppBuilderSourceLoweringCompositionAction | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  if (actions.length === 0) {
    return {
      selectedAction: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingDomainActionsPayload,
        targetRef,
        summary: 'Native submit form source lowering needs a modeled domain-actions payload before source can bind a submit action.',
      }],
    };
  }
  const actionName = normalizedSourceInputText(request.actionName);
  if (actionName == null) {
    return {
      selectedAction: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingActionSelection,
        targetRef,
        actionNames: actions.map((action) => action.name),
        summary: `Native submit form source lowering needs explicit actionName to select submit behavior. Available actions: ${actions.map((action) => action.name).join(', ')}.`,
      }],
    };
  }
  const action = actions.find((candidate) => candidate.name === actionName) ?? null;
  if (action == null) {
    return {
      selectedAction: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownRequestedAction,
        targetRef,
        actionNames: [actionName, ...actions.map((candidate) => candidate.name)],
        summary: `Requested action '${actionName}' is not present in the supplied domain-actions payload. Available actions: ${actions.map((candidate) => candidate.name).join(', ')}.`,
      }],
    };
  }
  const handlerExpression = normalizedSourceInputText(request.handlerExpression);
  if (handlerExpression != null) {
    return {
      selectedAction: {
        action,
        handlerExpression,
        handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
      },
      issues: [],
    };
  }
  if (appBuilderIsTypeScriptIdentifier(action.name)) {
    return {
      selectedAction: {
        action,
        handlerExpression: `${action.name}()`,
        handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
      },
      issues: [],
    };
  }
  return {
    selectedAction: null,
    issues: [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingHandlerExpression,
      targetRef,
      actionNames: [action.name],
      summary: `Action '${action.name}' is not a TypeScript identifier; supply handlerExpression before lowering form submit source.`,
    }],
  };
}

function lowerSubmitEventAttribute(
  handlerExpression: string,
): {
  readonly invocation: AppBuilderPartSourceInvocation;
  readonly lowering: AppBuilderPartSourceLowering;
  readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
} {
  return lowerAppBuilderEventAttribute('submit', handlerExpression);
}
