import { AppBuilderBindingPartId } from '../binding-part-catalog.js';
import {
  AppBuilderControlId,
} from '../control-catalog.js';
import type {
  AppBuilderDomainActionDescriptor,
  AppBuilderDomainRelationshipDescriptor,
} from '../domain-model.js';
import {
  AppBuilderDomainActionScope,
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainRelationshipKind,
} from '../domain-model.js';
import type {
  AppBuilderDomainFieldSourceModel,
} from '../domain-field-source.js';
import { AppBuilderPartSlotKind } from '../part-application.js';
import { AppBuilderPartKind } from '../part-catalog.js';
import type {
  AppBuilderPartSourceFragment,
  AppBuilderPartSourceInvocation,
  AppBuilderTemplateAttributePartSourceFragment,
  AppBuilderTemplateElementPartSourceFragment,
} from '../part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
} from '../part-source-invocation.js';
import {
  appBuilderRepeatAttributeFragment,
  appBuilderIsTypeScriptIdentifier,
  appBuilderAttributeBindingAttributeFragment,
  appBuilderAttributeToViewBindingAttributeFragment,
  appBuilderTemplateElementFragment,
  appBuilderTextInterpolationFragment,
} from '../source-lowering-helpers.js';
import { lowerAppBuilderEventAttribute } from '../source-lowering-event-attribute.js';
import {
  appBuilderLocalViewModelRelationshipLabelMethodName,
} from '../local-view-model-state-source.js';
import {
  AppBuilderStructuralPartId,
} from '../structural-part-catalog.js';
import {
  authoredTemplatePlainTextChildSource,
  authoredTemplateTextContentText,
} from '../../template/authored-template-source.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import {
  AppBuilderCollectionFeatureId,
} from './collection.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  type AppBuilderCollectionDisplayFieldPayload,
  AppBuilderCollectionDisplayRole,
  type AppBuilderCollectionTableColumnPayload,
  AppBuilderCollectionTableColumnDisplayKind,
} from './collection-projection.js';
import {
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
  type AppBuilderSuppliedInput,
} from './input-readiness.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderSourceLoweringCollectionDisplayFieldPayloads,
  appBuilderSourceLoweringCollectionQueryFeaturePayloads,
  appBuilderSourceLoweringCollectionTableColumnPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderSourceLoweringVisualHookAttributes,
  AppBuilderSourceLoweringVisualHookTarget,
} from './source-lowering-inputs.js';
import {
  type AppBuilderSourceLoweringInvocation,
  AppBuilderSourceLoweringBindingExpressionSource,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringLabelTextSource,
  appBuilderSourceLoweringInvocation,
} from './source-lowering-invocation.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  defaultBindingExpressionForField,
  lowerStructuralTemplateControllerAttribute,
  optionalControlUseInventoryRow,
  sourceLoweringCompositionResult,
  sourceLoweringCompositionSuppliedInputs,
  structuralPartLoweringIssues,
  withCompositionOrigin,
} from './source-lowering-composition.js';
import {
  AppBuilderSourceLoweringCompositionIssueKind,
  AppBuilderSourceLoweringCompositionKind,
  type AppBuilderSourceLoweringCollectionDisplayField,
  type AppBuilderSourceLoweringCollectionBatchAction,
  type AppBuilderSourceLoweringCollectionTableColumn,
  type AppBuilderSourceLoweringComposition,
  type AppBuilderSourceLoweringCompositionIssue,
  type AppBuilderSourceLoweringCompositionRequest,
} from './source-lowering-composition-contracts.js';

interface AppBuilderCollectionProjectionFrame {
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly bindingContext: {
    readonly collectionExpression: string | null;
    readonly itemLocalName: string | null;
  };
  readonly emptyState: {
    readonly fragment: AppBuilderTemplateElementPartSourceFragment | null;
    readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  };
  readonly collectionElse: {
    readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
    readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  };
  readonly availableFieldNames: readonly string[];
  readonly availableActionNames: readonly string[];
  readonly availableRelationshipNames: readonly string[];
  readonly availableCollectionDisplayFieldNames: readonly string[];
  readonly availableCollectionTableColumnHeaders: readonly string[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
}

type AppBuilderCollectionProjectionReadyFrame =
  Omit<AppBuilderCollectionProjectionFrame, 'bindingContext'> & {
    readonly bindingContext: {
      readonly collectionExpression: string;
      readonly itemLocalName: string;
    };
  };

interface AppBuilderCollectionTemplateElementLowering {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
}

interface AppBuilderCollectionTableRenderedFrame {
  readonly repeatAttribute: AppBuilderTemplateAttributePartSourceFragment;
  readonly headerFragments: readonly AppBuilderCollectionTemplateElementLowering[];
  readonly cellFragments: readonly AppBuilderCollectionTemplateElementLowering[];
  readonly headerRowFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly bodyRowFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly batchToolbarFragment: AppBuilderTemplateElementPartSourceFragment | null;
  readonly tableFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly elseContentFragment: AppBuilderTemplateElementPartSourceFragment | null;
  readonly paginationFooterFragment: AppBuilderTemplateElementPartSourceFragment | null;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
}

/** Normalized caller-supplied table-column payload after structural validation. */
interface AppBuilderSelectedCollectionTableColumnPayload {
  /** Original caller-supplied table-column payload. */
  readonly column: AppBuilderCollectionTableColumnPayload;
  /** Selected field name for field-backed columns. */
  readonly fieldName: string | null;
  /** Selected action name for action-backed columns. */
  readonly actionName: string | null;
  /** Selected relationship name for relationship-backed columns. */
  readonly relationshipName: string | null;
  /** Exact column header text to render. */
  readonly header: string;
  /** Stable duplicate key for selected field/action/relationship ownership. */
  readonly duplicateKey: string;
}

interface AppBuilderCollectionTablePaginationControls {
  readonly previousHandlerExpression: string;
  readonly nextHandlerExpression: string;
  readonly currentPageExpression: string;
  readonly pageCountExpression: string;
  readonly previousButtonText: string;
  readonly nextButtonText: string;
  readonly previousEventAttribute: AppBuilderTemplateAttributePartSourceFragment;
  readonly nextEventAttribute: AppBuilderTemplateAttributePartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
}

interface AppBuilderCollectionTableRowSelectionControls {
  readonly checkedExpression: string;
  readonly toggleHandlerExpression: string;
  readonly columnHeaderText: string;
  readonly checkboxLabelExpression: string;
  readonly toggleEventAttribute: AppBuilderTemplateAttributePartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
}

interface AppBuilderCollectionTableBatchActionControls {
  readonly actions: readonly AppBuilderSourceLoweringCollectionBatchAction[];
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
}

export function lowerCollectionListComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderSourceLoweringComposition {
  const frame = selectCollectionProjectionFrame(request, targetRef, fields, actions);
  const selectedDisplayFields = frame.bindingContext.itemLocalName == null
    ? { fields: [], issues: [] }
    : selectCollectionDisplayFields(fields, request, targetRef, frame.bindingContext.itemLocalName, frame.suppliedInputs);
  const issues = [...frame.issues, ...selectedDisplayFields.issues];
  if (
    issues.length > 0
    || frame.bindingContext.collectionExpression == null
    || frame.bindingContext.itemLocalName == null
  ) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      availableFieldNames: frame.availableFieldNames,
      availableActionNames: frame.availableActionNames,
      collectionExpression: frame.bindingContext.collectionExpression,
      itemLocalName: frame.bindingContext.itemLocalName,
      selectedCollectionDisplayFields: selectedDisplayFields.fields,
      availableCollectionDisplayFieldNames: frame.availableCollectionDisplayFieldNames,
      issues,
    });
  }

  const repeatAttribute = appBuilderRepeatAttributeFragment(frame.bindingContext.itemLocalName, frame.bindingContext.collectionExpression);
  const displayFragments = selectedDisplayFields.fields.map((field) =>
    collectionDisplayFieldElement(
      field,
      frame.suppliedInputs,
      targetRef,
      AppBuilderSourceLoweringCompositionKind.CollectionList,
    )
  );
  const itemFragment = appBuilderTemplateElementFragment(
    'li',
    [
      repeatAttribute.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        frame.suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.CollectionItem,
      ),
    ],
    null,
    displayFragments.map((fragment) => fragment.elementFragment.templateElement),
  );
  const collectionFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'ul',
      [
        ...(frame.collectionElse.attributeFragment == null ? [] : [frame.collectionElse.attributeFragment.templateAttribute]),
        ...appBuilderSourceLoweringVisualHookAttributes(
          frame.suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.Collection,
        ),
      ],
      null,
      [itemFragment.templateElement],
    ),
    AppBuilderSourceLoweringCompositionKind.CollectionList,
    targetRef,
    collectionCompositionMemberTargetIds(frame.emptyState.fragment != null),
  );
  const emptyFragment = frame.emptyState.fragment == null
    ? null
    : withCompositionOrigin(
        frame.emptyState.fragment,
        AppBuilderSourceLoweringCompositionKind.CollectionList,
        targetRef,
        collectionCompositionMemberTargetIds(true),
      );
  const fragments = [
    ...(emptyFragment == null ? [] : [emptyFragment]),
    collectionFragment,
  ];
  return sourceLoweringCompositionResult({
    targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    availableFieldNames: frame.availableFieldNames,
    availableActionNames: frame.availableActionNames,
    collectionExpression: frame.bindingContext.collectionExpression,
    itemLocalName: frame.bindingContext.itemLocalName,
    selectedCollectionDisplayFields: selectedDisplayFields.fields,
    availableCollectionDisplayFieldNames: frame.availableCollectionDisplayFieldNames,
    fragments,
    contributingFragments: [
      ...frame.emptyState.contributingFragments,
      ...frame.collectionElse.contributingFragments,
      repeatAttribute,
      ...displayFragments.flatMap((fragment) => fragment.contributingFragments),
      itemFragment,
      ...fragments,
    ],
    controlUseInventoryRows: displayFragments.flatMap((fragment) => fragment.controlUseInventoryRows),
    issues: [],
  });
}

export function lowerCollectionCardComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderSourceLoweringComposition {
  const frame = selectCollectionProjectionFrame(request, targetRef, fields, actions);
  const selectedDisplayFields = frame.bindingContext.itemLocalName == null
    ? { fields: [], issues: [] }
    : selectCollectionDisplayFields(fields, request, targetRef, frame.bindingContext.itemLocalName, frame.suppliedInputs);
  const issues = [...frame.issues, ...selectedDisplayFields.issues];
  if (
    issues.length > 0
    || frame.bindingContext.collectionExpression == null
    || frame.bindingContext.itemLocalName == null
  ) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      availableFieldNames: frame.availableFieldNames,
      availableActionNames: frame.availableActionNames,
      collectionExpression: frame.bindingContext.collectionExpression,
      itemLocalName: frame.bindingContext.itemLocalName,
      selectedCollectionDisplayFields: selectedDisplayFields.fields,
      availableCollectionDisplayFieldNames: frame.availableCollectionDisplayFieldNames,
      issues,
    });
  }

  const repeatAttribute = appBuilderRepeatAttributeFragment(frame.bindingContext.itemLocalName, frame.bindingContext.collectionExpression);
  const displayFragments = selectedDisplayFields.fields.map((field) =>
    collectionCardDisplayFieldElement(
      field,
      frame.suppliedInputs,
      targetRef,
      AppBuilderSourceLoweringCompositionKind.CollectionCard,
    )
  );
  const cardFragment = appBuilderTemplateElementFragment(
    'article',
    [
      repeatAttribute.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        frame.suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.CollectionItem,
      ),
    ],
    null,
    displayFragments.map((fragment) => fragment.elementFragment.templateElement),
  );
  const collectionFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'section',
      [
        ...(frame.collectionElse.attributeFragment == null ? [] : [frame.collectionElse.attributeFragment.templateAttribute]),
        ...appBuilderSourceLoweringVisualHookAttributes(
          frame.suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.Collection,
        ),
      ],
      null,
      [cardFragment.templateElement],
    ),
    AppBuilderSourceLoweringCompositionKind.CollectionCard,
    targetRef,
    collectionCompositionMemberTargetIds(frame.emptyState.fragment != null),
  );
  const emptyFragment = frame.emptyState.fragment == null
    ? null
    : withCompositionOrigin(
        frame.emptyState.fragment,
        AppBuilderSourceLoweringCompositionKind.CollectionCard,
        targetRef,
        collectionCompositionMemberTargetIds(true),
      );
  const fragments = [
    ...(emptyFragment == null ? [] : [emptyFragment]),
    collectionFragment,
  ];
  return sourceLoweringCompositionResult({
    targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    availableFieldNames: frame.availableFieldNames,
    availableActionNames: frame.availableActionNames,
    collectionExpression: frame.bindingContext.collectionExpression,
    itemLocalName: frame.bindingContext.itemLocalName,
    selectedCollectionDisplayFields: selectedDisplayFields.fields,
    availableCollectionDisplayFieldNames: frame.availableCollectionDisplayFieldNames,
    fragments,
    contributingFragments: [
      ...frame.emptyState.contributingFragments,
      ...frame.collectionElse.contributingFragments,
      repeatAttribute,
      ...displayFragments.flatMap((fragment) => fragment.contributingFragments),
      cardFragment,
      ...fragments,
    ],
    controlUseInventoryRows: displayFragments.flatMap((fragment) => fragment.controlUseInventoryRows),
    issues: [],
  });
}

export function lowerCollectionTableComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderSourceLoweringComposition {
  const frame = selectCollectionProjectionFrame(request, targetRef, fields, actions);
  const selectedColumns = frame.bindingContext.itemLocalName == null
    ? { columns: [], issues: [] }
    : selectCollectionTableColumns(fields, actions, request, targetRef, frame.bindingContext.itemLocalName, frame.suppliedInputs);
  const paginationControls = selectCollectionTablePaginationControls(request, targetRef, frame.suppliedInputs);
  const rowSelectionControls = selectCollectionTableRowSelectionControls(request, targetRef, frame.suppliedInputs);
  const batchActionControls = selectCollectionTableBatchActionControls(request, targetRef, frame.suppliedInputs, actions);
  const issues = [
    ...frame.issues,
    ...selectedColumns.issues,
    ...paginationControls.issues,
    ...rowSelectionControls.issues,
    ...batchActionControls.issues,
  ];
  const readyFrame = collectionProjectionReadyFrame(frame, issues);
  if (readyFrame == null) {
    return sourceLoweringCompositionResult({
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      availableFieldNames: frame.availableFieldNames,
      availableActionNames: frame.availableActionNames,
      collectionExpression: frame.bindingContext.collectionExpression,
      itemLocalName: frame.bindingContext.itemLocalName,
      selectedCollectionTableColumns: selectedColumns.columns,
      selectedCollectionBatchActions: batchActionControls.value?.actions ?? [],
      availableCollectionDisplayFieldNames: frame.availableCollectionDisplayFieldNames,
      availableCollectionTableColumnHeaders: frame.availableCollectionTableColumnHeaders,
      issues,
    });
  }

  const rendered = collectionTableRenderedFrame(
    readyFrame,
    selectedColumns.columns,
    targetRef,
    paginationControls.value,
    rowSelectionControls.value,
    batchActionControls.value,
  );
  return sourceLoweringCompositionResult({
    targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    availableFieldNames: frame.availableFieldNames,
    availableActionNames: frame.availableActionNames,
    collectionExpression: frame.bindingContext.collectionExpression,
    itemLocalName: frame.bindingContext.itemLocalName,
    selectedCollectionTableColumns: selectedColumns.columns,
    selectedCollectionBatchActions: batchActionControls.value?.actions ?? [],
    availableCollectionDisplayFieldNames: frame.availableCollectionDisplayFieldNames,
    availableCollectionTableColumnHeaders: frame.availableCollectionTableColumnHeaders,
    fragments: rendered.fragments,
    contributingFragments: rendered.contributingFragments,
    controlUseInventoryRows: rendered.controlUseInventoryRows,
    issues: [],
  });
}


function selectCollectionProjectionFrame(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderCollectionProjectionFrame {
  const suppliedInputs = sourceLoweringCompositionSuppliedInputs(request);
  const bindingContext = selectCollectionBindingContext(request, targetRef);
  const emptyState = lowerOptionalCollectionEmptyState(request, targetRef, suppliedInputs);
  const collectionElse = lowerOptionalCollectionContentElseBranch(emptyState.fragment, targetRef);
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  return {
    suppliedInputs,
    bindingContext: {
      collectionExpression: bindingContext.collectionExpression,
      itemLocalName: bindingContext.itemLocalName,
    },
    emptyState: {
      fragment: emptyState.fragment,
      contributingFragments: emptyState.contributingFragments,
    },
    collectionElse: {
      attributeFragment: collectionElse.attributeFragment,
      contributingFragments: collectionElse.contributingFragments,
    },
    availableFieldNames: fields.map((field) => field.memberName),
    availableActionNames: actions.map((action) => action.name),
    availableRelationshipNames: relationships.map((relationship) => relationship.name),
    availableCollectionDisplayFieldNames: collectionDisplayFieldPayloadNames(suppliedInputs),
    availableCollectionTableColumnHeaders: collectionTableColumnHeaders(suppliedInputs),
    issues: [
      ...bindingContext.issues,
      ...emptyState.issues,
      ...collectionElse.issues,
    ],
  };
}

function collectionProjectionReadyFrame(
  frame: AppBuilderCollectionProjectionFrame,
  issues: readonly AppBuilderSourceLoweringCompositionIssue[],
): AppBuilderCollectionProjectionReadyFrame | null {
  if (
    issues.length > 0
    || frame.bindingContext.collectionExpression == null
    || frame.bindingContext.itemLocalName == null
  ) {
    return null;
  }
  return {
    ...frame,
    bindingContext: {
      collectionExpression: frame.bindingContext.collectionExpression,
      itemLocalName: frame.bindingContext.itemLocalName,
    },
  };
}

function selectCollectionBindingContext(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly collectionExpression: string | null;
  readonly itemLocalName: string | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const collectionExpression = normalizedSourceInputText(request.collectionExpression);
  const itemLocalName = normalizedSourceInputText(request.itemLocalName);
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  if (collectionExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionExpression,
      targetRef,
      collectionExpression,
      summary: 'Collection projection source lowering needs explicit collectionExpression; app-builder will not invent a data source.',
    });
  }
  if (itemLocalName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingItemLocalName,
      targetRef,
      itemLocalName,
      summary: 'Collection projection source lowering needs explicit itemLocalName for repeat.for scope.',
    });
  } else if (!appBuilderIsTypeScriptIdentifier(itemLocalName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidItemLocalName,
      targetRef,
      itemLocalName,
      summary: `Collection projection itemLocalName '${itemLocalName}' is not a TypeScript identifier.`,
    });
  }
  return {
    collectionExpression,
    itemLocalName,
    issues,
  };
}

function collectionTableRenderedFrame(
  frame: AppBuilderCollectionProjectionReadyFrame,
  columns: readonly AppBuilderSourceLoweringCollectionTableColumn[],
  targetRef: AppBuilderOntologyRowRef,
  paginationControls: AppBuilderCollectionTablePaginationControls | null,
  rowSelectionControls: AppBuilderCollectionTableRowSelectionControls | null,
  batchActionControls: AppBuilderCollectionTableBatchActionControls | null,
): AppBuilderCollectionTableRenderedFrame {
  const repeatAttribute = appBuilderRepeatAttributeFragment(
    frame.bindingContext.itemLocalName,
    frame.bindingContext.collectionExpression,
  );
  const headerFragments = columns.map((column) =>
    collectionTableHeaderElement(column, frame.suppliedInputs, targetRef)
  );
  const cellFragments = columns.map((column) =>
    collectionTableCellElement(column, frame.suppliedInputs, targetRef)
  );
  const rowSelectionFragment = rowSelectionControls == null
    ? null
    : collectionTableRowSelectionElements(rowSelectionControls, targetRef);
  const batchActionToolbar = batchActionControls == null
    ? null
    : collectionTableBatchActionToolbar(batchActionControls, targetRef);
  const headerRowFragment = appBuilderTemplateElementFragment(
    'tr',
    [],
    null,
    [
      ...(rowSelectionFragment == null ? [] : [rowSelectionFragment.headerFragment.templateElement]),
      ...headerFragments.map((fragment) => fragment.elementFragment.templateElement),
    ],
  );
  const bodyRowFragment = appBuilderTemplateElementFragment(
    'tr',
    [
      repeatAttribute.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        frame.suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
      ),
    ],
    null,
    [
      ...(rowSelectionFragment == null ? [] : [rowSelectionFragment.cellFragment.templateElement]),
      ...cellFragments.map((fragment) => fragment.elementFragment.templateElement),
    ],
  );
  const hasActionColumns = columns.some((column) => column.action != null);
  const tableColumnCount = columns.length + (rowSelectionFragment == null ? 0 : 1);
  const paginationFooterFragment = paginationControls == null
    ? null
    : collectionTablePaginationElement(paginationControls, targetRef, tableColumnCount);
  const tableElseAttribute = batchActionToolbar == null
    ? frame.collectionElse.attributeFragment
    : null;
  const hasInteractiveControls = hasActionColumns
    || paginationControls != null
    || rowSelectionFragment != null
    || batchActionToolbar != null;
  const tableFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'table',
      [
        ...(tableElseAttribute == null ? [] : [tableElseAttribute.templateAttribute]),
        ...appBuilderSourceLoweringVisualHookAttributes(
          frame.suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
        ),
      ],
      null,
      [
        appBuilderTemplateElementFragment('thead', [], null, [headerRowFragment.templateElement]).templateElement,
        appBuilderTemplateElementFragment('tbody', [], null, [bodyRowFragment.templateElement]).templateElement,
        ...(paginationFooterFragment == null ? [] : [paginationFooterFragment.elementFragment.templateElement]),
      ],
    ),
    AppBuilderSourceLoweringCompositionKind.CollectionTable,
    targetRef,
    collectionCompositionMemberTargetIds(
      frame.emptyState.fragment != null,
      hasInteractiveControls,
    ),
  );
  const elseContentFragment = batchActionToolbar == null || frame.collectionElse.attributeFragment == null
    ? null
    : withCompositionOrigin(
        appBuilderTemplateElementFragment(
          'template',
          [frame.collectionElse.attributeFragment.templateAttribute],
          null,
          [
            batchActionToolbar.elementFragment.templateElement,
            tableFragment.templateElement,
          ],
        ),
        AppBuilderSourceLoweringCompositionKind.CollectionTable,
        targetRef,
        collectionCompositionMemberTargetIds(true, true),
      );
  const emptyFragment = frame.emptyState.fragment == null
    ? null
    : withCompositionOrigin(
        frame.emptyState.fragment,
        AppBuilderSourceLoweringCompositionKind.CollectionTable,
        targetRef,
        collectionCompositionMemberTargetIds(true, hasInteractiveControls),
      );
  return {
    repeatAttribute,
    headerFragments,
    cellFragments,
    headerRowFragment,
    bodyRowFragment,
    batchToolbarFragment: batchActionToolbar?.elementFragment ?? null,
    tableFragment,
    elseContentFragment,
    paginationFooterFragment: paginationFooterFragment?.elementFragment ?? null,
    fragments: [
      ...(emptyFragment == null ? [] : [emptyFragment]),
      ...(elseContentFragment == null
        ? [
            ...(batchActionToolbar == null ? [] : [batchActionToolbar.elementFragment]),
            tableFragment,
          ]
        : [elseContentFragment]),
    ],
    contributingFragments: [
      ...frame.emptyState.contributingFragments,
      ...frame.collectionElse.contributingFragments,
      repeatAttribute,
      ...(rowSelectionFragment?.contributingFragments ?? []),
      ...(batchActionToolbar?.contributingFragments ?? []),
      ...headerFragments.flatMap((fragment) => fragment.contributingFragments),
      ...cellFragments.flatMap((fragment) => fragment.contributingFragments),
      ...(paginationFooterFragment?.contributingFragments ?? []),
      headerRowFragment,
      bodyRowFragment,
      tableFragment,
      ...(elseContentFragment == null ? [] : [elseContentFragment]),
    ],
    controlUseInventoryRows: [
      ...(rowSelectionFragment?.controlUseInventoryRows ?? []),
      ...(batchActionToolbar?.controlUseInventoryRows ?? []),
      ...headerFragments.flatMap((fragment) => fragment.controlUseInventoryRows),
      ...cellFragments.flatMap((fragment) => fragment.controlUseInventoryRows),
      ...(paginationFooterFragment?.controlUseInventoryRows ?? []),
    ],
  };
}

function selectCollectionTablePaginationControls(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderCollectionTablePaginationControls | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const features = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs)
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.LocalPagination);
  if (features.length === 0) {
    return { value: null, issues: [] };
  }
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  if (features.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: `Collection table local pagination received ${features.length} CollectionQueryFeatures rows; supply exactly one local pagination row for this first-ring lowerer.`,
    });
  }
  const previousHandlerExpression = normalizedSourceInputText(request.paginationPreviousHandlerExpression);
  const nextHandlerExpression = normalizedSourceInputText(request.paginationNextHandlerExpression);
  const currentPageExpression = normalizedSourceInputText(request.paginationCurrentPageExpression);
  const pageCountExpression = normalizedSourceInputText(request.paginationPageCountExpression);
  const previousButtonText = normalizedSourceInputText(request.paginationPreviousButtonText);
  const nextButtonText = normalizedSourceInputText(request.paginationNextButtonText);
  if (previousHandlerExpression == null || nextHandlerExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingPaginationHandlerExpression,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: 'Collection table local pagination needs explicit paginationPreviousHandlerExpression and paginationNextHandlerExpression; app-builder will not invent page method names.',
    });
  }
  if (currentPageExpression == null || pageCountExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingPaginationStatusExpression,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: 'Collection table local pagination needs explicit paginationCurrentPageExpression and paginationPageCountExpression for status display.',
    });
  }
  if (previousButtonText == null || nextButtonText == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingPaginationButtonText,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: 'Collection table local pagination needs explicit paginationPreviousButtonText and paginationNextButtonText.',
    });
  }
  if (
    issues.length > 0
    || previousHandlerExpression == null
    || nextHandlerExpression == null
    || currentPageExpression == null
    || pageCountExpression == null
    || previousButtonText == null
    || nextButtonText == null
  ) {
    return { value: null, issues };
  }
  const previousEvent = lowerAppBuilderEventAttribute('click', previousHandlerExpression);
  const nextEvent = lowerAppBuilderEventAttribute('click', nextHandlerExpression);
  if (previousEvent.lowering != null && previousEvent.lowering.issues.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.PaginationEventLoweringIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      paginationEventLowering: previousEvent.lowering,
      summary: `Collection table local pagination previous-page event could not lower cleanly: ${previousEvent.lowering.issues.map((issue) => issue.summary).join(' ')}`,
    });
  }
  if (nextEvent.lowering != null && nextEvent.lowering.issues.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.PaginationEventLoweringIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      paginationEventLowering: nextEvent.lowering,
      summary: `Collection table local pagination next-page event could not lower cleanly: ${nextEvent.lowering.issues.map((issue) => issue.summary).join(' ')}`,
    });
  }
  if (previousEvent.attributeFragment == null && previousEvent.lowering?.issues.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.PaginationEventLoweringIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      paginationEventLowering: previousEvent.lowering ?? undefined,
      summary: 'Collection table local pagination previous-page event expected source lowering to produce a template-attribute fragment.',
    });
  }
  if (nextEvent.attributeFragment == null && nextEvent.lowering?.issues.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.PaginationEventLoweringIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      paginationEventLowering: nextEvent.lowering ?? undefined,
      summary: 'Collection table local pagination next-page event expected source lowering to produce a template-attribute fragment.',
    });
  }
  if (issues.length > 0 || previousEvent.attributeFragment == null || nextEvent.attributeFragment == null) {
    return { value: null, issues };
  }
  return {
    value: {
      previousHandlerExpression,
      nextHandlerExpression,
      currentPageExpression,
      pageCountExpression,
      previousButtonText,
      nextButtonText,
      previousEventAttribute: previousEvent.attributeFragment,
      nextEventAttribute: nextEvent.attributeFragment,
      contributingFragments: [
        ...(previousEvent.lowering?.fragments ?? []),
        ...(nextEvent.lowering?.fragments ?? []),
      ],
    },
    issues: [],
  };
}

function selectCollectionTableRowSelectionControls(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderCollectionTableRowSelectionControls | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const features = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs)
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.RowSelection);
  if (features.length === 0) {
    return { value: null, issues: [] };
  }
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  if (features.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: `Collection table row selection received ${features.length} CollectionQueryFeatures rows; supply exactly one local row-selection row for this first-ring lowerer.`,
    });
  }
  const checkedExpression = normalizedSourceInputText(request.rowSelectionCheckedExpression);
  const toggleHandlerExpression = normalizedSourceInputText(request.rowSelectionToggleHandlerExpression);
  const columnHeaderText = normalizedSourceInputText(request.rowSelectionColumnHeaderText);
  const checkboxLabelExpression = normalizedSourceInputText(request.rowSelectionCheckboxLabelExpression);
  if (checkedExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRowSelectionCheckedExpression,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: 'Collection table row selection needs explicit rowSelectionCheckedExpression; app-builder will not invent selected-state member names.',
    });
  }
  if (toggleHandlerExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRowSelectionToggleHandlerExpression,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: 'Collection table row selection needs explicit rowSelectionToggleHandlerExpression; app-builder will not invent selection handlers.',
    });
  }
  if (columnHeaderText == null || checkboxLabelExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRowSelectionText,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: 'Collection table row selection needs explicit rowSelectionColumnHeaderText and rowSelectionCheckboxLabelExpression.',
    });
  }
  if (
    issues.length > 0
    || checkedExpression == null
    || toggleHandlerExpression == null
    || columnHeaderText == null
    || checkboxLabelExpression == null
  ) {
    return { value: null, issues };
  }
  const toggleEvent = lowerAppBuilderEventAttribute('change', toggleHandlerExpression);
  if (toggleEvent.lowering != null && toggleEvent.lowering.issues.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.RowSelectionEventLoweringIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      rowSelectionEventLowering: toggleEvent.lowering,
      summary: `Collection table row selection event could not lower cleanly: ${toggleEvent.lowering.issues.map((issue) => issue.summary).join(' ')}`,
    });
  }
  if (toggleEvent.attributeFragment == null && toggleEvent.lowering?.issues.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.RowSelectionEventLoweringIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      rowSelectionEventLowering: toggleEvent.lowering ?? undefined,
      summary: 'Collection table row selection expected source lowering to produce a template-attribute fragment.',
    });
  }
  if (issues.length > 0 || toggleEvent.attributeFragment == null) {
    return { value: null, issues };
  }
  return {
    value: {
      checkedExpression,
      toggleHandlerExpression,
      columnHeaderText,
      checkboxLabelExpression,
      toggleEventAttribute: toggleEvent.attributeFragment,
      contributingFragments: toggleEvent.lowering?.fragments ?? [],
    },
    issues: [],
  };
}

function selectCollectionTableBatchActionControls(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): {
  readonly value: AppBuilderCollectionTableBatchActionControls | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const features = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs)
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.BatchActions);
  if (features.length === 0) {
    return { value: null, issues: [] };
  }
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  if (features.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
      summary: `Collection table batch actions received ${features.length} CollectionQueryFeatures rows; supply exactly one local batch-actions row for this first-ring lowerer.`,
    });
  }
  const rowSelectionFeatureCount = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs)
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.RowSelection)
    .length;
  if (rowSelectionFeatureCount !== 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions, AppBuilderCollectionFeatureId.RowSelection],
      summary: 'Collection table batch actions build on explicit row selection; include exactly one RowSelection feature row before requesting batch action controls.',
    });
  }
  const controlRows = request.batchActionControls ?? [];
  if (controlRows.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingBatchActionControls,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
      actionNames: actions.map((action) => action.name),
      summary: 'Collection table batch actions need explicit batchActionControls rows with actionName, handlerExpression, and buttonText; app-builder will not invent batch behavior or visible copy.',
    });
  }
  const actionsByName = new Map(actions.map((action) => [action.name, action]));
  const seen = new Set<string>();
  const selectedActions: AppBuilderSourceLoweringCollectionBatchAction[] = [];
  for (const controlRow of controlRows) {
    const actionName = normalizedSourceInputText(controlRow.actionName);
    const handlerExpression = normalizedSourceInputText(controlRow.handlerExpression);
    const buttonText = normalizedSourceInputText(controlRow.buttonText);
    if (actionName == null || handlerExpression == null || buttonText == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidBatchActionControl,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
        actionNames: actionName == null ? [] : [actionName],
        summary: 'Collection table batch action control rows need non-empty actionName, handlerExpression, and buttonText fields.',
      });
      continue;
    }
    if (seen.has(actionName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateBatchActionControl,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
        actionNames: [actionName],
        summary: `Collection table batch action control '${actionName}' was supplied more than once.`,
      });
      continue;
    }
    seen.add(actionName);
    const action = actionsByName.get(actionName) ?? null;
    if (action == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownBatchActionControlAction,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
        actionNames: [actionName, ...actions.map((candidate) => candidate.name)],
        summary: `Collection table batch action control '${actionName}' is not present in supplied domain actions. Available actions: ${actions.map((candidate) => candidate.name).join(', ')}.`,
      });
      continue;
    }
    if (action.scope !== AppBuilderDomainActionScope.Collection) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidBatchActionControl,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
        actionNames: [actionName],
        summary: `Collection table batch action control '${actionName}' needs a collection-scoped domain action for this first-ring lowerer; row/entity and service/integration actions remain separate rungs.`,
      });
      continue;
    }
    const actionInvocation = appBuilderSourceLoweringInvocation({
      targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeButton),
      suppliedInputs,
      actionName,
      handlerExpression,
      buttonText,
      includePreflight: request.includePreflight,
      emissionContext: request.emissionContext,
    });
    const actionElementFragment = actionInvocation.fragments.find((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
      fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
    ) ?? null;
    if (actionInvocation.issues.length > 0 || actionElementFragment == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.BatchActionInvocationIssue,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
        actionNames: [actionName],
        batchActionInvocation: actionInvocation,
        summary: actionInvocation.issues.length === 0
          ? `Collection table batch action '${actionName}' expected native-button source lowering to produce a template-element fragment.`
          : `Collection table batch action '${actionName}' could not lower cleanly: ${actionInvocation.issues.map((issue) => issue.summary).join(' ')}`,
      });
      continue;
    }
    selectedActions.push({
      action,
      handlerExpression,
      buttonText,
      actionInvocation,
    });
  }
  if (issues.length > 0 || selectedActions.length === 0) {
    return { value: null, issues };
  }
  return {
    value: {
      actions: selectedActions,
      contributingFragments: selectedActions.flatMap((selectedAction) => [
        ...(selectedAction.actionInvocation.partSourceLowering?.fragments ?? []),
        ...selectedAction.actionInvocation.fragments,
      ]),
    },
    issues: [],
  };
}

function collectionTablePaginationElement(
  controls: AppBuilderCollectionTablePaginationControls,
  targetRef: AppBuilderOntologyRowRef,
  columnCount: number,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} {
  const previousButtonFragment = appBuilderTemplateElementFragment(
    'button',
    [
      { rawName: 'type', rawValue: 'button' },
      controls.previousEventAttribute.templateAttribute,
    ],
    authoredTemplateTextContentText(controls.previousButtonText),
  );
  const currentPage = appBuilderTextInterpolationFragment(controls.currentPageExpression);
  const pageCount = appBuilderTextInterpolationFragment(controls.pageCountExpression);
  const statusFragment = appBuilderTemplateElementFragment(
    'span',
    [],
    `Page ${currentPage.text} of ${pageCount.text}`,
  );
  const nextButtonFragment = appBuilderTemplateElementFragment(
    'button',
    [
      { rawName: 'type', rawValue: 'button' },
      controls.nextEventAttribute.templateAttribute,
    ],
    authoredTemplateTextContentText(controls.nextButtonText),
  );
  const navFragment = appBuilderTemplateElementFragment(
    'nav',
    [{ rawName: 'aria-label', rawValue: 'Pagination' }],
    null,
    [
      previousButtonFragment.templateElement,
      statusFragment.templateElement,
      nextButtonFragment.templateElement,
    ],
  );
  const cellFragment = appBuilderTemplateElementFragment(
    'td',
    [{ rawName: 'colspan', rawValue: String(Math.max(1, columnCount)) }],
    null,
    [navFragment.templateElement],
  );
  const rowFragment = appBuilderTemplateElementFragment(
    'tr',
    [],
    null,
    [cellFragment.templateElement],
  );
  const elementFragment = appBuilderTemplateElementFragment(
    'tfoot',
    [],
    null,
    [rowFragment.templateElement],
  );
  return {
    elementFragment,
    contributingFragments: [
      ...controls.contributingFragments,
      controls.previousEventAttribute,
      controls.nextEventAttribute,
      previousButtonFragment,
      currentPage,
      pageCount,
      statusFragment,
      nextButtonFragment,
      navFragment,
      cellFragment,
      rowFragment,
      elementFragment,
    ],
    controlUseInventoryRows: [
      ...optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
        sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
        targetRef,
        compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
        fragments: [previousButtonFragment],
        realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
        controlPatternId: AppBuilderControlPatternId.NativeButton,
        handlerExpression: controls.previousHandlerExpression,
        handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
        eventName: 'click',
        actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
        buttonText: controls.previousButtonText,
        buttonType: AppBuilderSourceLoweringButtonType.Button,
      })),
      ...optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
        sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
        targetRef,
        compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
        fragments: [nextButtonFragment],
        realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
        controlPatternId: AppBuilderControlPatternId.NativeButton,
        handlerExpression: controls.nextHandlerExpression,
        handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
        eventName: 'click',
        actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
        buttonText: controls.nextButtonText,
        buttonType: AppBuilderSourceLoweringButtonType.Button,
      })),
    ],
  };
}

function collectionTableBatchActionToolbar(
  controls: AppBuilderCollectionTableBatchActionControls,
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderCollectionTemplateElementLowering {
  const buttonFragments = controls.actions.map((selectedAction) => {
    const actionFragment = selectedAction.actionInvocation.fragments.find((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
      fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
    ) ?? null;
    if (actionFragment == null) {
      throw new Error('Internal app-builder source-lowering invariant failed: batch action controls require template-element button fragments.');
    }
    return actionFragment;
  });
  const elementFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'div',
      [
        { rawName: 'role', rawValue: 'toolbar' },
        { rawName: 'aria-label', rawValue: 'Batch actions' },
      ],
      null,
      buttonFragments.map((fragment) => fragment.templateElement),
    ),
    AppBuilderSourceLoweringCompositionKind.CollectionTable,
    targetRef,
    collectionCompositionMemberTargetIds(false, true),
  );
  return {
    elementFragment,
    contributingFragments: [
      ...controls.contributingFragments,
      elementFragment,
    ],
    controlUseInventoryRows: controls.actions.flatMap((selectedAction) =>
      selectedAction.actionInvocation.controlUseInventoryRows
    ),
  };
}

function collectionTableRowSelectionElements(
  controls: AppBuilderCollectionTableRowSelectionControls,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly headerFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly cellFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} {
  const headerFragment = appBuilderTemplateElementFragment(
    'th',
    [],
    authoredTemplateTextContentText(controls.columnHeaderText),
  );
  const checkedAttribute = appBuilderAttributeToViewBindingAttributeFragment('checked', controls.checkedExpression);
  const labelAttribute = appBuilderAttributeBindingAttributeFragment('aria-label', controls.checkboxLabelExpression);
  const checkboxFragment = appBuilderTemplateElementFragment(
    'input',
    [
      { rawName: 'type', rawValue: 'checkbox' },
      checkedAttribute.templateAttribute,
      controls.toggleEventAttribute.templateAttribute,
      labelAttribute.templateAttribute,
    ],
  );
  const cellFragment = appBuilderTemplateElementFragment(
    'td',
    [],
    null,
    [checkboxFragment.templateElement],
  );
  const fragments = [
    ...controls.contributingFragments,
    controls.toggleEventAttribute,
    checkedAttribute,
    labelAttribute,
    headerFragment,
    checkboxFragment,
    cellFragment,
  ];
  return {
    headerFragment,
    cellFragment,
    contributingFragments: fragments,
    controlUseInventoryRows: optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
      sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
      fragments,
      realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
      controlPatternId: AppBuilderControlPatternId.NativeBooleanCheckbox,
      controlId: AppBuilderControlId.Checkbox,
      bindingExpression: controls.checkedExpression,
      bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest,
      handlerExpression: controls.toggleHandlerExpression,
      handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
      eventName: 'change',
      actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
      labelText: controls.checkboxLabelExpression,
      labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
    })),
  };
}

function selectCollectionDisplayFields(
  fields: readonly AppBuilderDomainFieldSourceModel[],
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  itemLocalName: string,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly fields: readonly AppBuilderSourceLoweringCollectionDisplayField[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  if (fields.length === 0) {
    return {
      fields: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingDomainFieldsPayload,
        targetRef,
        summary: 'Collection source lowering needs modeled domain fields before source can render display fields.',
      }],
    };
  }
  const projections = appBuilderSourceLoweringCollectionDisplayFieldPayloads(suppliedInputs);
  if (projections.length === 0) {
    return {
      fields: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionDisplayFieldsPayload,
        targetRef,
        fieldNames: fields.map((field) => field.memberName),
        summary: `Collection list source lowering needs explicit CollectionDisplayFields payloads. Available fields: ${fields.map((field) => field.memberName).join(', ')}.`,
      }],
    };
  }
  const fieldsByName = new Map(fields.map((field) => [field.memberName, field]));
  const seen = new Set<string>();
  const selected: AppBuilderSourceLoweringCollectionDisplayField[] = [];
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const projection of projections) {
    const fieldName = normalizedSourceInputText(projection.fieldName);
    const role = projection.role;
    if (fieldName == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionDisplayField,
        targetRef,
        fieldNames: fields.map((field) => field.memberName),
        summary: `Collection display field payload has an empty fieldName. Available fields: ${fields.map((field) => field.memberName).join(', ')}.`,
      });
      continue;
    }
    const key = `${fieldName}\0${role}`;
    if (seen.has(key)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateCollectionDisplayField,
        targetRef,
        fieldNames: [fieldName],
        summary: `Collection display field '${fieldName}' with role '${role}' was supplied more than once.`,
      });
      continue;
    }
    seen.add(key);
    if (fieldName == null) {
      continue;
    }
    const field = fieldsByName.get(fieldName) ?? null;
    if (field == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionDisplayField,
        targetRef,
        fieldNames: [fieldName, ...fields.map((candidate) => candidate.memberName)],
        summary: `Collection display field '${fieldName}' is not present in supplied domain fields. Available fields: ${fields.map((candidate) => candidate.memberName).join(', ')}.`,
      });
      continue;
    }
    const bindingExpression = collectionBindingExpressionForField(field.memberName, request, itemLocalName);
    if (bindingExpression == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingFieldBindingExpression,
        targetRef,
        fieldNames: [field.memberName],
        summary: `Collection display field '${field.memberName}' is not a TypeScript identifier; supply fieldBindingExpressions for this field before source lowering can bind it.`,
      });
      continue;
    }
    selected.push({
      projection,
      field,
      bindingExpression,
      label: normalizedSourceInputText(projection.label) ?? field.field.title,
    });
  }
  return {
    fields: selected,
    issues,
  };
}

function selectCollectionTableColumns(
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  itemLocalName: string,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly columns: readonly AppBuilderSourceLoweringCollectionTableColumn[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  if (fields.length === 0) {
    return {
      columns: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingDomainFieldsPayload,
        targetRef,
        summary: 'Collection table source lowering needs modeled domain fields before source can render table columns.',
      }],
    };
  }
  const columnPayloads = appBuilderSourceLoweringCollectionTableColumnPayloads(suppliedInputs);
  if (columnPayloads.length === 0) {
    return {
      columns: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionTableColumnsPayload,
        targetRef,
        fieldNames: fields.map((field) => field.memberName),
        summary: `Collection table source lowering needs explicit CollectionTableColumns payloads. Available fields: ${fields.map((field) => field.memberName).join(', ')}.`,
      }],
    };
  }
  const fieldsByName = new Map(fields.map((field) => [field.memberName, field]));
  const actionsByName = new Map(actions.map((action) => [action.name, action]));
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  const relationshipsByName = new Map(relationships.map((relationship) => [relationship.name, relationship]));
  const seen = new Set<string>();
  const selected: AppBuilderSourceLoweringCollectionTableColumn[] = [];
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const column of columnPayloads) {
    const payload = selectCollectionTableColumnPayload(column, targetRef);
    issues.push(...payload.issues);
    if (payload.selection == null) {
      continue;
    }
    if (seen.has(payload.selection.duplicateKey)) {
      issues.push(duplicateCollectionTableColumnIssue(payload.selection, targetRef));
      continue;
    }
    seen.add(payload.selection.duplicateKey);
    if (payload.selection.actionName != null) {
      const selection = selectCollectionTableActionColumn(
        payload.selection.column,
        payload.selection.actionName,
        payload.selection.header,
        actions,
        actionsByName,
        request,
        targetRef,
        itemLocalName,
        suppliedInputs,
      );
      issues.push(...selection.issues);
      if (selection.column != null) {
        selected.push(selection.column);
      }
      continue;
    }
    if (payload.selection.relationshipName != null) {
      const selection = selectCollectionTableRelationshipColumn(
        payload.selection.column,
        payload.selection.relationshipName,
        payload.selection.header,
        relationships,
        relationshipsByName,
        targetRef,
        itemLocalName,
      );
      issues.push(...selection.issues);
      if (selection.column != null) {
        selected.push(selection.column);
      }
      continue;
    }
    if (payload.selection.fieldName != null) {
      const selection = selectCollectionTableFieldColumn(
        payload.selection.column,
        payload.selection.fieldName,
        payload.selection.header,
        fields,
        fieldsByName,
        request,
        targetRef,
        itemLocalName,
      );
      issues.push(...selection.issues);
      if (selection.column != null) {
        selected.push(selection.column);
      }
    }
  }
  return {
    columns: selected,
    issues,
  };
}

function selectCollectionTableColumnPayload(
  column: AppBuilderCollectionTableColumnPayload,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly selection: AppBuilderSelectedCollectionTableColumnPayload | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const fieldName = normalizedSourceInputText(column.fieldName);
  const actionName = normalizedSourceInputText(column.actionName);
  const relationshipName = normalizedSourceInputText(column.relationshipName);
  const header = normalizedSourceInputText(column.header);
  const selectedKindCount = [
    fieldName,
    actionName,
    relationshipName,
  ].filter((value) => value != null).length;
  if (header == null || selectedKindCount !== 1) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        fieldNames: [fieldName].filter((value): value is string => value != null),
        actionNames: [actionName].filter((value): value is string => value != null),
        relationshipNames: [relationshipName].filter((value): value is string => value != null),
        columnHeaders: header == null ? [] : [header],
        summary: 'Collection table columns must supply a non-empty header and exactly one of fieldName, actionName, or relationshipName.',
      }],
    };
  }
  if (
    actionName != null
    && column.displayKind != null
    && column.displayKind !== AppBuilderCollectionTableColumnDisplayKind.Action
  ) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        actionNames: [actionName],
        columnHeaders: [header],
        summary: `Collection table action column '${actionName}' must use displayKind '${AppBuilderCollectionTableColumnDisplayKind.Action}' when displayKind is supplied.`,
      }],
    };
  }
  if (fieldName != null && column.displayKind === AppBuilderCollectionTableColumnDisplayKind.Action) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        fieldNames: [fieldName],
        columnHeaders: [header],
        summary: `Collection table field column '${fieldName}' cannot use action displayKind; row actions must use actionName plus DomainActions.`,
      }],
    };
  }
  if (
    relationshipName != null
    && column.displayKind != null
    && column.displayKind !== AppBuilderCollectionTableColumnDisplayKind.Relation
  ) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        relationshipNames: [relationshipName],
        columnHeaders: [header],
        summary: `Collection table relationship column '${relationshipName}' must use displayKind '${AppBuilderCollectionTableColumnDisplayKind.Relation}' when displayKind is supplied.`,
      }],
    };
  }
  if (actionName != null && column.sortable === true) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        actionNames: [actionName],
        columnHeaders: [header],
        summary: `Collection table action column '${actionName}' cannot be sortable; sorting requires a field-backed column.`,
      }],
    };
  }
  if (actionName != null && column.filterable === true) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        actionNames: [actionName],
        columnHeaders: [header],
        summary: `Collection table action column '${actionName}' cannot be filterable; filtering requires a field-backed column.`,
      }],
    };
  }
  if (relationshipName != null && column.sortable === true) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        relationshipNames: [relationshipName],
        columnHeaders: [header],
        summary: `Collection table relationship column '${relationshipName}' cannot be sortable in the first-ring table lowerer; relationship sort policy is not modeled yet.`,
      }],
    };
  }
  if (relationshipName != null && column.filterable === true) {
    return {
      selection: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        relationshipNames: [relationshipName],
        columnHeaders: [header],
        summary: `Collection table relationship column '${relationshipName}' cannot be filterable in the first-ring table lowerer; relationship filter policy is not modeled yet.`,
      }],
    };
  }
  return {
    selection: {
      column,
      fieldName,
      actionName,
      relationshipName,
      header,
      duplicateKey: fieldName != null
        ? `field:${fieldName}`
        : actionName != null
          ? `action:${actionName}`
          : `relationship:${relationshipName}`,
    },
    issues: [],
  };
}

function duplicateCollectionTableColumnIssue(
  selection: AppBuilderSelectedCollectionTableColumnPayload,
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderSourceLoweringCompositionIssue {
  return {
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateCollectionTableColumn,
    targetRef,
    fieldNames: [selection.fieldName].filter((value): value is string => value != null),
    actionNames: [selection.actionName].filter((value): value is string => value != null),
    relationshipNames: [selection.relationshipName].filter((value): value is string => value != null),
    columnHeaders: [selection.header],
    summary: `Collection table column '${selection.duplicateKey}' was supplied more than once.`,
  };
}

function selectCollectionTableActionColumn(
  column: AppBuilderCollectionTableColumnPayload,
  actionName: string,
  header: string,
  actions: readonly AppBuilderDomainActionDescriptor[],
  actionsByName: ReadonlyMap<string, AppBuilderDomainActionDescriptor>,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  itemLocalName: string,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly column: AppBuilderSourceLoweringCollectionTableColumn | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const action = actionsByName.get(actionName) ?? null;
  if (action == null) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionTableColumnAction,
        targetRef,
        actionNames: [actionName, ...actions.map((candidate) => candidate.name)],
        columnHeaders: [header],
        summary: `Collection table action column '${actionName}' is not present in supplied domain actions. Available actions: ${actions.map((candidate) => candidate.name).join(', ')}.`,
      }],
    };
  }
  if (action.scope === AppBuilderDomainActionScope.Navigation) {
    return selectCollectionTableNavigationActionColumn(
      column,
      action,
      header,
      request,
      targetRef,
      suppliedInputs,
    );
  }
  const handlerExpression = selectCollectionActionHandlerExpression(action, request, targetRef, itemLocalName, header);
  if (handlerExpression.expression == null) {
    return {
      column: null,
      issues: handlerExpression.issues,
    };
  }
  const actionInvocation = appBuilderSourceLoweringInvocation({
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeButton),
    suppliedInputs,
    actionName: action.name,
    handlerExpression: handlerExpression.expression,
    buttonText: header,
    includePreflight: request.includePreflight,
    emissionContext: request.emissionContext,
  });
  const actionElementFragment = actionInvocation.fragments.find((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
  ) ?? null;
  if (actionInvocation.issues.length > 0 || actionElementFragment == null) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.ActionInvocationIssue,
        targetRef,
        actionNames: [action.name],
        columnHeaders: [header],
        actionInvocation,
        summary: actionInvocation.issues.length === 0
          ? `Collection table action column '${action.name}' expected native-button source lowering to produce a template-element fragment.`
          : `Collection table action column '${action.name}' could not lower cleanly: ${actionInvocation.issues.map((issue) => issue.summary).join(' ')}`,
      }],
    };
  }
  return {
    column: {
      column,
      field: null,
      action,
      relationship: null,
      actionInvocation,
      bindingExpression: null,
      sortHandlerExpression: null,
      sortHandlerExpressionSource: null,
      sortEventInvocation: null,
      sortEventLowering: null,
      sortEventAttributeFragment: null,
      filterBindingExpression: null,
      header,
    },
    issues: [],
  };
}

function selectCollectionTableNavigationActionColumn(
  column: AppBuilderCollectionTableColumnPayload,
  action: AppBuilderDomainActionDescriptor,
  header: string,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly column: AppBuilderSourceLoweringCollectionTableColumn | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const actionInvocation = appBuilderSourceLoweringInvocation({
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.RouteNavigationAction),
    suppliedInputs,
    actionName: action.name,
    routeInstruction: column.routeInstruction,
    routeParamsExpression: column.routeParamsExpression,
    routeContextExpression: column.routeContextExpression,
    routeActiveExpression: column.routeActiveExpression,
    routeTargetAttributeName: column.routeTargetAttributeName,
    linkText: normalizedSourceInputText(column.linkText) ?? header,
    includePreflight: request.includePreflight,
    emissionContext: request.emissionContext,
  });
  const actionElementFragment = actionInvocation.fragments.find((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
  ) ?? null;
  if (actionInvocation.issues.length > 0 || actionElementFragment == null) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.ActionInvocationIssue,
        targetRef,
        actionNames: [action.name],
        columnHeaders: [header],
        routeInstructions: [column.routeInstruction].filter((value): value is string => value != null),
        actionInvocation,
        summary: actionInvocation.issues.length === 0
          ? `Collection table navigation action column '${action.name}' expected route-navigation source lowering to produce a template-element fragment.`
          : `Collection table navigation action column '${action.name}' could not lower cleanly: ${actionInvocation.issues.map((issue) => issue.summary).join(' ')}`,
      }],
    };
  }
  return {
    column: {
      column,
      field: null,
      action,
      relationship: null,
      actionInvocation,
      bindingExpression: null,
      sortHandlerExpression: null,
      sortHandlerExpressionSource: null,
      sortEventInvocation: null,
      sortEventLowering: null,
      sortEventAttributeFragment: null,
      filterBindingExpression: null,
      header,
    },
    issues: [],
  };
}

function selectCollectionTableRelationshipColumn(
  column: AppBuilderCollectionTableColumnPayload,
  relationshipName: string,
  header: string,
  relationships: readonly AppBuilderDomainRelationshipDescriptor[],
  relationshipsByName: ReadonlyMap<string, AppBuilderDomainRelationshipDescriptor>,
  targetRef: AppBuilderOntologyRowRef,
  itemLocalName: string,
): {
  readonly column: AppBuilderSourceLoweringCollectionTableColumn | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const relationship = relationshipsByName.get(relationshipName) ?? null;
  if (relationship == null) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionTableColumnRelationship,
        targetRef,
        relationshipNames: [relationshipName, ...relationships.map((candidate) => candidate.name)],
        columnHeaders: [header],
        summary: `Collection table relationship column '${relationshipName}' is not present in supplied domain relationships. Available relationships: ${relationships.map((candidate) => candidate.name).join(', ')}.`,
      }],
    };
  }
  if (!collectionTableRelationshipColumnCanDisplay(relationship)) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        relationshipNames: [relationship.name],
        columnHeaders: [header],
        summary: `Collection table relationship column '${relationship.name}' can currently display reference-one, reference-many, owns-one, owns-many, or nested-value-object relationships, not '${relationship.kind}'.`,
      }],
    };
  }
  if (relationship.fromEntityName == null || relationship.fromEntityName.trim().length === 0) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
        targetRef,
        relationshipNames: [relationship.name],
        columnHeaders: [header],
        summary: `Collection table relationship column '${relationship.name}' needs fromEntityName so it can call the matching generated relationship label helper.`,
      }],
    };
  }
  return {
    column: {
      column,
      field: null,
      action: null,
      relationship,
      actionInvocation: null,
      bindingExpression: `${appBuilderLocalViewModelRelationshipLabelMethodName(relationship.name, relationship.fromEntityName)}(${itemLocalName})`,
      sortHandlerExpression: null,
      sortHandlerExpressionSource: null,
      sortEventInvocation: null,
      sortEventLowering: null,
      sortEventAttributeFragment: null,
      filterBindingExpression: null,
      header,
    },
    issues: [],
  };
}

function selectCollectionTableFieldColumn(
  column: AppBuilderCollectionTableColumnPayload,
  fieldName: string,
  header: string,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  fieldsByName: ReadonlyMap<string, AppBuilderDomainFieldSourceModel>,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  itemLocalName: string,
): {
  readonly column: AppBuilderSourceLoweringCollectionTableColumn | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const field = fieldsByName.get(fieldName) ?? null;
  if (field == null) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionTableColumnField,
        targetRef,
        fieldNames: [fieldName, ...fields.map((candidate) => candidate.memberName)],
        columnHeaders: [header],
        summary: `Collection table field column '${fieldName}' is not present in supplied domain fields. Available fields: ${fields.map((candidate) => candidate.memberName).join(', ')}.`,
      }],
    };
  }
  const bindingExpression = collectionBindingExpressionForField(field.memberName, request, itemLocalName);
  if (bindingExpression == null) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingFieldBindingExpression,
        targetRef,
        fieldNames: [field.memberName],
        columnHeaders: [header],
        summary: `Collection table field '${field.memberName}' is not a TypeScript identifier; supply fieldBindingExpressions for this field before source lowering can bind it.`,
      }],
    };
  }
  const sortHandlerExpression = column.sortable === true
    ? selectCollectionSortHandlerExpression(field, request, targetRef, header)
    : { expression: null, source: null, issues: [] };
  if (sortHandlerExpression.expression == null && column.sortable === true) {
    return {
      column: null,
      issues: sortHandlerExpression.issues,
    };
  }
  const sortEvent = sortHandlerExpression.expression == null
    ? { invocation: null, lowering: null, attributeFragment: null }
    : lowerAppBuilderEventAttribute('click', sortHandlerExpression.expression);
  if (sortEvent.lowering != null && sortEvent.lowering.issues.length > 0) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.SortEventLoweringIssue,
        targetRef,
        fieldNames: [field.memberName],
        columnHeaders: [header],
        sortEventLowering: sortEvent.lowering,
        summary: `Collection table sortable column '${field.memberName}' could not lower its click event cleanly: ${sortEvent.lowering.issues.map((issue) => issue.summary).join(' ')}`,
      }],
    };
  }
  if (sortEvent.lowering != null && sortEvent.attributeFragment == null && sortEvent.lowering.issues.length === 0) {
    return {
      column: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.SortEventLoweringIssue,
        targetRef,
        fieldNames: [field.memberName],
        columnHeaders: [header],
        sortEventLowering: sortEvent.lowering,
        summary: `Collection table sortable column '${field.memberName}' expected click event source lowering to produce a template-attribute fragment.`,
      }],
    };
  }
  const filterBindingExpression = column.filterable === true
    ? selectCollectionFilterBindingExpression(field, request, targetRef, header)
    : { expression: null, issues: [] };
  if (filterBindingExpression.expression == null && column.filterable === true) {
    return {
      column: null,
      issues: filterBindingExpression.issues,
    };
  }
  return {
    column: {
      column,
      field,
      action: null,
      relationship: null,
      actionInvocation: null,
      bindingExpression,
      sortHandlerExpression: sortHandlerExpression.expression,
      sortHandlerExpressionSource: sortHandlerExpression.source,
      sortEventInvocation: sortEvent.invocation,
      sortEventLowering: sortEvent.lowering,
      sortEventAttributeFragment: sortEvent.attributeFragment,
      filterBindingExpression: filterBindingExpression.expression,
      header,
    },
    issues: [...sortHandlerExpression.issues, ...filterBindingExpression.issues],
  };
}

function collectionTableRelationshipColumnCanDisplay(
  relationship: AppBuilderDomainRelationshipDescriptor,
): boolean {
  switch (relationship.kind) {
    case AppBuilderDomainRelationshipKind.ReferenceOne:
    case AppBuilderDomainRelationshipKind.ReferenceMany:
    case AppBuilderDomainRelationshipKind.OwnsOne:
    case AppBuilderDomainRelationshipKind.OwnsMany:
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      return true;
    case AppBuilderDomainRelationshipKind.OwnsOne:
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      return false;
  }
}

function collectionDisplayFieldElement(
  field: AppBuilderSourceLoweringCollectionDisplayField,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetRef: AppBuilderOntologyRowRef,
  compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} {
  const prefix = field.projection.role === AppBuilderCollectionDisplayRole.Title
    ? ''
    : `${authoredTemplateTextContentText(field.label)}:`;
  const attributes = appBuilderSourceLoweringVisualHookAttributes(
    suppliedInputs,
    AppBuilderSourceLoweringVisualHookTarget.CollectionField,
    { fieldName: field.field.memberName },
  );
  if (field.field.valueKind === AppBuilderDomainFieldValueKind.Boolean) {
    const booleanDisplay = collectionBooleanDisplayElement(
      field.bindingExpression,
      field.label,
      field.projection.role === AppBuilderCollectionDisplayRole.Title ? 'strong' : 'span',
      attributes,
      prefix,
    );
    return {
      elementFragment: booleanDisplay.elementFragment,
      contributingFragments: booleanDisplay.contributingFragments,
      controlUseInventoryRows: collectionBooleanDisplayControlUseRows(
        targetRef,
        compositionKind,
        field.field.memberName,
        field.bindingExpression,
        field.label,
        booleanDisplay.contributingFragments,
      ),
    };
  }
  const textInterpolationFragment = appBuilderTextInterpolationFragment(field.bindingExpression);
  const elementFragment = appBuilderTemplateElementFragment(
    field.projection.role === AppBuilderCollectionDisplayRole.Title ? 'strong' : 'span',
    attributes,
    `${prefix}${textInterpolationFragment.text}`,
  );
  return {
    elementFragment,
    contributingFragments: [textInterpolationFragment, elementFragment],
    controlUseInventoryRows: [],
  };
}

function collectionTableHeaderElement(
  column: AppBuilderSourceLoweringCollectionTableColumn,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} {
  const attributes = appBuilderSourceLoweringVisualHookAttributes(
    suppliedInputs,
    AppBuilderSourceLoweringVisualHookTarget.CollectionTableHeader,
    collectionColumnVisualFilter(column),
  );
  const filterControl = collectionTableHeaderFilterControl(column, targetRef);
  if (column.sortEventAttributeFragment == null && filterControl == null) {
    const elementFragment = appBuilderTemplateElementFragment(
      'th',
      attributes,
      authoredTemplateTextContentText(column.header),
    );
    return {
      elementFragment,
      contributingFragments: [elementFragment],
      controlUseInventoryRows: [],
    };
  }
  const labelFragment = column.sortEventAttributeFragment == null
    ? appBuilderTemplateElementFragment('span', [], authoredTemplateTextContentText(column.header))
    : null;
  const buttonFragment = column.sortEventAttributeFragment == null
    ? null
    : appBuilderTemplateElementFragment(
        'button',
        [
          { rawName: 'type', rawValue: 'button' },
          column.sortEventAttributeFragment.templateAttribute,
        ],
        authoredTemplateTextContentText(column.header),
      );
  const elementFragment = appBuilderTemplateElementFragment(
    'th',
    attributes,
    null,
    [
      ...(labelFragment == null ? [] : [labelFragment.templateElement]),
      ...(buttonFragment == null ? [] : [buttonFragment.templateElement]),
      ...(filterControl == null ? [] : [filterControl.elementFragment.templateElement]),
    ],
  );
  return {
    elementFragment,
    contributingFragments: [
      ...(column.sortEventLowering?.fragments ?? []),
      ...(labelFragment == null ? [] : [labelFragment]),
      ...(buttonFragment == null ? [] : [buttonFragment]),
      ...(filterControl?.contributingFragments ?? []),
      elementFragment,
    ],
    controlUseInventoryRows: [
      ...optionalControlUseInventoryRow(buttonFragment == null ? null : appBuilderControlUseInventoryRow({
        sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
        targetRef,
        compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
        fragments: [buttonFragment],
        realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
        controlPatternId: AppBuilderControlPatternId.NativeButton,
        fieldName: column.field?.memberName ?? null,
        handlerExpression: column.sortHandlerExpression,
        handlerExpressionSource: column.sortHandlerExpressionSource,
        eventName: 'click',
        actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
        buttonText: column.header,
        buttonType: AppBuilderSourceLoweringButtonType.Button,
      })),
      ...(filterControl?.controlUseInventoryRows ?? []),
    ],
  };
}

function collectionTableHeaderFilterControl(
  column: AppBuilderSourceLoweringCollectionTableColumn,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} | null {
  if (column.filterBindingExpression == null) {
    return null;
  }
  const bindingFragment = appBuilderAttributeBindingAttributeFragment('value', column.filterBindingExpression);
  const elementFragment = appBuilderTemplateElementFragment(
    'input',
    [
      { rawName: 'type', rawValue: 'search' },
      { rawName: 'aria-label', rawValue: `Filter ${column.header}` },
      bindingFragment.templateAttribute,
    ],
  );
  return {
    elementFragment,
    contributingFragments: [bindingFragment, elementFragment],
    controlUseInventoryRows: optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
      sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
      targetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
      fragments: [elementFragment],
      realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
      controlPatternId: AppBuilderControlPatternId.NativeTextInput,
      controlId: AppBuilderControlId.TextInput,
      fieldName: column.field?.memberName ?? null,
      bindingExpression: column.filterBindingExpression,
      bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest,
      labelText: `Filter ${column.header}`,
      labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
    })),
  };
}

function collectionTableCellElement(
  column: AppBuilderSourceLoweringCollectionTableColumn,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} {
  if (column.actionInvocation != null) {
    const actionFragment = column.actionInvocation.fragments.find((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
      fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
    );
    if (actionFragment == null) {
      throw new Error('Internal app-builder source-lowering invariant failed: action-backed table cells require a template-element action fragment.');
    }
    const elementFragment = appBuilderTemplateElementFragment(
      'td',
      appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
        collectionColumnVisualFilter(column),
      ),
      null,
      [actionFragment.templateElement],
    );
    return {
      elementFragment,
      contributingFragments: [
        ...(column.actionInvocation.partSourceLowering?.fragments ?? []),
        ...column.actionInvocation.fragments,
        elementFragment,
      ],
      controlUseInventoryRows: [],
    };
  }
  if (column.bindingExpression == null) {
    throw new Error('Internal app-builder source-lowering invariant failed: collection table cells require field-backed binding expressions.');
  }
  const attributes = appBuilderSourceLoweringVisualHookAttributes(
    suppliedInputs,
    AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
    collectionColumnVisualFilter(column),
  );
  if (column.field?.valueKind === AppBuilderDomainFieldValueKind.Boolean) {
    const booleanDisplay = collectionBooleanDisplayElement(
      column.bindingExpression,
      column.header,
      'td',
      attributes,
      '',
    );
    return {
      elementFragment: booleanDisplay.elementFragment,
      contributingFragments: booleanDisplay.contributingFragments,
      controlUseInventoryRows: collectionBooleanDisplayControlUseRows(
        targetRef,
        AppBuilderSourceLoweringCompositionKind.CollectionTable,
        column.field.memberName,
        column.bindingExpression,
        column.header,
        booleanDisplay.contributingFragments,
      ),
    };
  }
  const textInterpolationFragment = appBuilderTextInterpolationFragment(column.bindingExpression);
  const elementFragment = appBuilderTemplateElementFragment(
    'td',
    attributes,
    textInterpolationFragment.text,
  );
  return {
    elementFragment,
    contributingFragments: [textInterpolationFragment, elementFragment],
    controlUseInventoryRows: [],
  };
}

function collectionCardDisplayFieldElement(
  field: AppBuilderSourceLoweringCollectionDisplayField,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetRef: AppBuilderOntologyRowRef,
  compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} {
  const prefix = collectionCardDisplayFieldLabelPrefix(field);
  const attributes = appBuilderSourceLoweringVisualHookAttributes(
    suppliedInputs,
    AppBuilderSourceLoweringVisualHookTarget.CollectionField,
    { fieldName: field.field.memberName },
  );
  if (field.field.valueKind === AppBuilderDomainFieldValueKind.Boolean) {
    const booleanDisplay = collectionBooleanDisplayElement(
      field.bindingExpression,
      field.label,
      collectionCardDisplayFieldTag(field.projection.role),
      attributes,
      prefix,
    );
    return {
      elementFragment: booleanDisplay.elementFragment,
      contributingFragments: booleanDisplay.contributingFragments,
      controlUseInventoryRows: collectionBooleanDisplayControlUseRows(
        targetRef,
        compositionKind,
        field.field.memberName,
        field.bindingExpression,
        field.label,
        booleanDisplay.contributingFragments,
      ),
    };
  }
  const textInterpolationFragment = appBuilderTextInterpolationFragment(field.bindingExpression);
  const elementFragment = appBuilderTemplateElementFragment(
    collectionCardDisplayFieldTag(field.projection.role),
    attributes,
    `${prefix}${textInterpolationFragment.text}`,
  );
  return {
    elementFragment,
    contributingFragments: [textInterpolationFragment, elementFragment],
    controlUseInventoryRows: [],
  };
}

function collectionBooleanDisplayElement(
  bindingExpression: string,
  label: string,
  tagName: string,
  attributes: readonly { readonly rawName: string; readonly rawValue?: string | null }[],
  prefix: string,
): {
  readonly elementFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
} {
  const checkedAttribute = appBuilderAttributeToViewBindingAttributeFragment('checked', bindingExpression);
  const checkboxFragment = appBuilderTemplateElementFragment(
    'input',
    [
      { rawName: 'type', rawValue: 'checkbox' },
      checkedAttribute.templateAttribute,
      { rawName: 'disabled' },
      { rawName: 'aria-label', rawValue: label },
    ],
  );
  const elementFragment = appBuilderTemplateElementFragment(
    tagName,
    attributes,
    null,
    [
      ...(prefix.length === 0 ? [] : [authoredTemplatePlainTextChildSource(prefix)]),
      checkboxFragment.templateElement,
    ],
  );
  return {
    elementFragment,
    contributingFragments: [checkedAttribute, checkboxFragment, elementFragment],
  };
}

function collectionBooleanDisplayControlUseRows(
  targetRef: AppBuilderOntologyRowRef,
  compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList
    | AppBuilderSourceLoweringCompositionKind.CollectionCard
    | AppBuilderSourceLoweringCompositionKind.CollectionTable,
  fieldName: string,
  bindingExpression: string,
  label: string,
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderControlUseInventoryRow[] {
  return optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
    sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
    targetRef,
    compositionKind,
    fragments,
    realizationPolicyId: AppBuilderControlRealizationPolicyId.InlineNative,
    controlPatternId: AppBuilderControlPatternId.NativeBooleanCheckbox,
    controlId: AppBuilderControlId.Checkbox,
    fieldName,
    bindingExpression,
    bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.SelectedCollectionField,
    labelText: label,
    labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
  }));
}

function selectCollectionActionHandlerExpression(
  action: AppBuilderDomainActionDescriptor,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  itemLocalName: string,
  columnHeader: string,
): {
  readonly expression: string | null;
  readonly source: AppBuilderSourceLoweringHandlerExpressionSource | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const overrides = (request.actionHandlerExpressions ?? [])
    .filter((entry) => normalizedSourceInputText(entry.actionName) === action.name)
    .map((entry) => normalizedSourceInputText(entry.handlerExpression))
    .filter((value): value is string => value != null);
  if (overrides.length > 1) {
    return {
      expression: null,
      source: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateActionHandlerExpression,
        targetRef,
        actionNames: [action.name],
        columnHeaders: [columnHeader],
        summary: `Collection table action '${action.name}' has ${overrides.length} handler-expression overrides; supply exactly one actionHandlerExpressions row for this action.`,
      }],
    };
  }
  if (overrides.length === 1) {
    return {
      expression: overrides[0]!,
      source: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
      issues: [],
    };
  }
  if (appBuilderIsTypeScriptIdentifier(action.name)) {
    return {
      expression: `${action.name}(${itemLocalName})`,
      source: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
      issues: [],
    };
  }
  return {
    expression: null,
    source: null,
    issues: [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingHandlerExpression,
      targetRef,
      actionNames: [action.name],
      columnHeaders: [columnHeader],
      summary: `Collection table action '${action.name}' is not a TypeScript identifier; supply actionHandlerExpressions before lowering a row-action button.`,
    }],
  };
}

function selectCollectionSortHandlerExpression(
  field: AppBuilderDomainFieldSourceModel,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  columnHeader: string,
): {
  readonly expression: string | null;
  readonly source: AppBuilderSourceLoweringHandlerExpressionSource | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const overrides = (request.sortHandlerExpressions ?? [])
    .filter((entry) => normalizedSourceInputText(entry.fieldName) === field.memberName)
    .map((entry) => normalizedSourceInputText(entry.handlerExpression))
    .filter((value): value is string => value != null);
  if (overrides.length > 1) {
    return {
      expression: null,
      source: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateSortHandlerExpression,
        targetRef,
        fieldNames: [field.memberName],
        columnHeaders: [columnHeader],
        summary: `Collection table field '${field.memberName}' has ${overrides.length} sort-handler overrides; supply exactly one sortHandlerExpressions row for this field.`,
      }],
    };
  }
  if (overrides.length === 1) {
    return {
      expression: overrides[0]!,
      source: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
      issues: [],
    };
  }
  return {
    expression: null,
    source: null,
    issues: [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingSortHandlerExpression,
      targetRef,
      fieldNames: [field.memberName],
      columnHeaders: [columnHeader],
      summary: `Collection table field '${field.memberName}' is sortable, but source lowering needs an explicit sortHandlerExpressions row; app-builder will not invent sort state or method names.`,
    }],
  };
}

function selectCollectionFilterBindingExpression(
  field: AppBuilderDomainFieldSourceModel,
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  columnHeader: string,
): {
  readonly expression: string | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const overrides = (request.filterBindingExpressions ?? [])
    .filter((entry) => normalizedSourceInputText(entry.fieldName) === field.memberName)
    .map((entry) => normalizedSourceInputText(entry.bindingExpression))
    .filter((value): value is string => value != null);
  if (overrides.length > 1) {
    return {
      expression: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.DuplicateFilterBindingExpression,
        targetRef,
        fieldNames: [field.memberName],
        columnHeaders: [columnHeader],
        summary: `Collection table field '${field.memberName}' has ${overrides.length} filter-binding overrides; supply exactly one filterBindingExpressions row for this field.`,
      }],
    };
  }
  if (overrides.length === 1) {
    return {
      expression: overrides[0]!,
      issues: [],
    };
  }
  return {
    expression: null,
    issues: [{
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingFilterBindingExpression,
      targetRef,
      fieldNames: [field.memberName],
      columnHeaders: [columnHeader],
      summary: `Collection table field '${field.memberName}' is filterable, but source lowering needs an explicit filterBindingExpressions row; app-builder will not invent query state member names.`,
    }],
  };
}

function collectionCardDisplayFieldTag(
  role: AppBuilderCollectionDisplayRole,
): string {
  switch (role) {
    case AppBuilderCollectionDisplayRole.Title:
      return 'h3';
    case AppBuilderCollectionDisplayRole.Summary:
      return 'p';
    case AppBuilderCollectionDisplayRole.Status:
      return 'strong';
    case AppBuilderCollectionDisplayRole.Date:
    case AppBuilderCollectionDisplayRole.Number:
    case AppBuilderCollectionDisplayRole.Boolean:
    case AppBuilderCollectionDisplayRole.Relation:
      return 'p';
  }
}

function collectionCardDisplayFieldLabelPrefix(
  field: AppBuilderSourceLoweringCollectionDisplayField,
): string {
  switch (field.projection.role) {
    case AppBuilderCollectionDisplayRole.Title:
    case AppBuilderCollectionDisplayRole.Summary:
      return '';
    case AppBuilderCollectionDisplayRole.Status:
    case AppBuilderCollectionDisplayRole.Date:
    case AppBuilderCollectionDisplayRole.Number:
    case AppBuilderCollectionDisplayRole.Boolean:
    case AppBuilderCollectionDisplayRole.Relation:
      return `${authoredTemplateTextContentText(field.label)}:`;
  }
}

function lowerOptionalCollectionContentElseBranch(
  emptyStateFragment: AppBuilderTemplateElementPartSourceFragment | null,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  if (emptyStateFragment == null) {
    return {
      attributeFragment: null,
      contributingFragments: [],
      issues: [],
    };
  }
  const elseAttribute = lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.ConditionalElse);
  return {
    attributeFragment: elseAttribute.attributeFragment,
    contributingFragments: elseAttribute.lowering.fragments,
    issues: structuralPartLoweringIssues(targetRef, [elseAttribute]),
  };
}

function lowerOptionalCollectionEmptyState(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly fragment: AppBuilderTemplateElementPartSourceFragment | null;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const text = normalizedSourceInputText(request.emptyStateText);
  if (text == null) {
    return {
      fragment: null,
      contributingFragments: [],
      issues: [],
    };
  }
  const condition = normalizedSourceInputText(request.emptyStateConditionExpression);
  if (condition == null) {
    return {
      fragment: null,
      contributingFragments: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateConditionExpression,
        targetRef,
        summary: 'Collection empty-state text needs explicit emptyStateConditionExpression; app-builder will not guess collection emptiness semantics.',
      }],
    };
  }
  const conditionalAttribute = lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.Conditional, [
    { slotKind: AppBuilderPartSlotKind.BindingExpression, value: condition },
  ]);
  const structuralIssues = structuralPartLoweringIssues(targetRef, [conditionalAttribute]);
  if (structuralIssues.length > 0 || conditionalAttribute.attributeFragment == null) {
    return {
      fragment: null,
      contributingFragments: conditionalAttribute.lowering.fragments,
      issues: structuralIssues,
    };
  }
  const fragment = appBuilderTemplateElementFragment(
    'p',
    [
      conditionalAttribute.attributeFragment.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
      ),
    ],
    authoredTemplateTextContentText(text),
  );
  return {
    fragment,
    contributingFragments: [conditionalAttribute.attributeFragment, fragment],
    issues: [],
  };
}


function collectionBindingExpressionForField(
  fieldName: string,
  request: AppBuilderSourceLoweringCompositionRequest,
  itemLocalName: string,
): string | null {
  const explicit = (request.fieldBindingExpressions ?? [])
    .find((entry) => entry.fieldName === fieldName);
  const explicitExpression = normalizedSourceInputText(explicit?.bindingExpression);
  if (explicitExpression != null) {
    return explicitExpression;
  }
  return defaultBindingExpressionForField(fieldName, itemLocalName);
}

function collectionDisplayFieldPayloadNames(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly string[] {
  return appBuilderSourceLoweringCollectionDisplayFieldPayloads(suppliedInputs)
    .map((payload) => payload.fieldName);
}

function collectionTableColumnHeaders(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly string[] {
  return appBuilderSourceLoweringCollectionTableColumnPayloads(suppliedInputs)
    .map((payload) => payload.header);
}

function collectionColumnVisualFilter(
  column: AppBuilderSourceLoweringCollectionTableColumn,
): {
  readonly fieldName?: string;
  readonly actionName?: string;
  readonly relationshipName?: string;
} {
  if (column.field != null) {
    return { fieldName: column.field.memberName };
  }
  if (column.action != null) {
    return { actionName: column.action.name };
  }
  if (column.relationship != null) {
    return { relationshipName: column.relationship.name };
  }
  throw new Error('Internal app-builder source-lowering invariant failed: collection table visual hooks require a field-backed, action-backed, or relationship-backed column.');
}


function collectionCompositionMemberTargetIds(
  includesEmptyState: boolean,
  includesAction: boolean = false,
): readonly string[] {
  return [
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.Repeat}`,
    `${AppBuilderPartKind.BindingPart}:${AppBuilderBindingPartId.TextInterpolation}`,
    ...(includesAction ? [
      `${AppBuilderOntologyRowKind.ControlPattern}:${AppBuilderControlPatternId.NativeButton}`,
      `${AppBuilderPartKind.BindingPart}:${AppBuilderBindingPartId.EventListener}`,
    ] : []),
    ...(includesEmptyState ? [`${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.Conditional}`] : []),
  ];
}
