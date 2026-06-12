import type { AppBuilderDomainActionDescriptor } from '../domain-model.js';
import type { AppBuilderDomainFieldSourceModel } from '../domain-field-source.js';
import { AppBuilderPartSlotKind } from '../part-application.js';
import { AppBuilderPartKind } from '../part-catalog.js';
import type { AppBuilderPartSlotAssignment } from '../part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
  type AppBuilderPartSourceFragment,
  type AppBuilderTemplateElementPartSourceFragment,
} from '../part-source-invocation.js';
import {
  appBuilderIsTypeScriptIdentifier,
  appBuilderTemplateElementFragment,
} from '../source-lowering-helpers.js';
import { AppBuilderStructuralPartId } from '../structural-part-catalog.js';
import { authoredTemplateTextContentText } from '../../template/authored-template-source.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import type { AppBuilderSuppliedInput } from './input-readiness.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import {
  appBuilderSourceLoweringVisualHookAttributes,
  AppBuilderSourceLoweringVisualHookTarget,
} from './source-lowering-inputs.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  appBuilderSourceLoweringComposition,
  lowerStructuralTemplateControllerAttribute,
  sourceLoweringCompositionChildSuppliedInputs,
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

export function lowerLoadingEmptyErrorStateComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderSourceLoweringComposition {
  const suppliedInputs = sourceLoweringCompositionSuppliedInputs(request);
  const selection = selectLoadingEmptyErrorState(request, targetRef);
  const fulfilledContentComposition = lowerFulfilledContentComposition(request, targetRef);
  const structuralLowerings = lowerLoadingEmptyErrorStructuralParts(selection, fulfilledContentComposition);
  const issues = loadingEmptyErrorIssues(targetRef, selection, fulfilledContentComposition, structuralLowerings);
  const readyFrame = loadingEmptyErrorReadyFrame(selection, fulfilledContentComposition, structuralLowerings, issues);
  const resultBase = {
    request,
    targetRef,
    preflight,
    preflightRow,
    fields,
    actions,
    fulfilledContentComposition: fulfilledContentComposition.composition,
  };
  if (readyFrame == null) {
    return loadingEmptyErrorCompositionResult({
      ...resultBase,
      selection,
      contributingFragments: loadingEmptyErrorStructuralContributingFragments(structuralLowerings),
      issues,
    });
  }
  const rendered = loadingEmptyErrorRenderedFragments(suppliedInputs, targetRef, readyFrame, fulfilledContentComposition);
  return loadingEmptyErrorCompositionResult({
    ...resultBase,
    selection: readyFrame.selection,
    fragments: [rendered.regionFragment],
    contributingFragments: rendered.contributingFragments,
    issues: [],
  });
}

type LoadingEmptyErrorSelectedInputs = {
  readonly promiseExpression: string | null;
  readonly pendingText: string | null;
  readonly fulfilledLocalName: string | null;
  readonly emptyStateText: string | null;
  readonly emptyStateConditionExpression: string | null;
  readonly rejectedLocalName: string | null;
  readonly rejectedText: string | null;
};

type LoadingEmptyErrorRequiredTextFieldName =
  | 'promiseExpression'
  | 'pendingText'
  | 'emptyStateText'
  | 'emptyStateConditionExpression'
  | 'rejectedText';

type LoadingEmptyErrorRequiredTextFieldDescriptor = {
  readonly fieldName: LoadingEmptyErrorRequiredTextFieldName;
  readonly issueKind: AppBuilderSourceLoweringCompositionIssueKind;
  readonly summary: string;
};

const LOADING_EMPTY_ERROR_REQUIRED_TEXT_FIELDS: readonly LoadingEmptyErrorRequiredTextFieldDescriptor[] = [
  {
    fieldName: 'promiseExpression',
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingPromiseExpression,
    summary: 'Loading/empty/error source lowering needs explicit promiseExpression; app-builder will not invent an async data source.',
  },
  {
    fieldName: 'pendingText',
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingPendingText,
    summary: 'Loading/empty/error source lowering needs explicit pendingText before it can emit the pending branch.',
  },
  {
    fieldName: 'emptyStateText',
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateText,
    summary: 'Loading/empty/error source lowering needs explicit emptyStateText before it can emit the fulfilled empty branch.',
  },
  {
    fieldName: 'emptyStateConditionExpression',
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateConditionExpression,
    summary: 'Loading/empty/error source lowering needs explicit emptyStateConditionExpression; app-builder will not guess emptiness semantics.',
  },
  {
    fieldName: 'rejectedText',
    issueKind: AppBuilderSourceLoweringCompositionIssueKind.MissingRejectedText,
    summary: 'Loading/empty/error source lowering needs explicit rejectedText before it can emit the rejected branch.',
  },
];

type LoadingEmptyErrorSelection = LoadingEmptyErrorSelectedInputs & {
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
};

type LoadingEmptyErrorReadySelection =
  Omit<LoadingEmptyErrorSelection, 'promiseExpression' | 'pendingText' | 'emptyStateText' | 'emptyStateConditionExpression' | 'rejectedText'> & {
    readonly promiseExpression: string;
    readonly pendingText: string;
    readonly emptyStateText: string;
    readonly emptyStateConditionExpression: string;
    readonly rejectedText: string;
  };

type LoadingEmptyErrorFulfilledContent = ReturnType<typeof lowerFulfilledContentComposition>;
type StructuralTemplateControllerLowering = ReturnType<typeof lowerStructuralTemplateControllerAttribute>;
type StructuralTemplateControllerAttributeFragment = NonNullable<StructuralTemplateControllerLowering['attributeFragment']>;
type ReadyStructuralTemplateControllerLowering = StructuralTemplateControllerLowering & {
  readonly attributeFragment: StructuralTemplateControllerAttributeFragment;
};

type LoadingEmptyErrorStructuralLowerings = {
  readonly promise: StructuralTemplateControllerLowering;
  readonly pending: StructuralTemplateControllerLowering;
  readonly fulfilled: StructuralTemplateControllerLowering;
  readonly rejected: StructuralTemplateControllerLowering;
  readonly emptyConditional: StructuralTemplateControllerLowering;
  readonly fulfilledContentElse: StructuralTemplateControllerLowering | null;
};

type LoadingEmptyErrorReadyStructuralLowerings = {
  readonly promise: ReadyStructuralTemplateControllerLowering;
  readonly pending: ReadyStructuralTemplateControllerLowering;
  readonly fulfilled: ReadyStructuralTemplateControllerLowering;
  readonly rejected: ReadyStructuralTemplateControllerLowering;
  readonly emptyConditional: ReadyStructuralTemplateControllerLowering;
  readonly fulfilledContentElse: ReadyStructuralTemplateControllerLowering | null;
};

type LoadingEmptyErrorReadyFrame = {
  readonly selection: LoadingEmptyErrorReadySelection;
  readonly structuralLowerings: LoadingEmptyErrorReadyStructuralLowerings;
};

type LoadingEmptyErrorRenderedFragments = {
  readonly regionFragment: AppBuilderTemplateElementPartSourceFragment;
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
};

type LoadingEmptyErrorCompositionResultInput = {
  readonly request: AppBuilderSourceLoweringCompositionRequest;
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly preflight: AppBuilderSourceLoweringPreflight;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly actions: readonly AppBuilderDomainActionDescriptor[];
  readonly selection: LoadingEmptyErrorSelection;
  readonly fulfilledContentComposition: AppBuilderSourceLoweringComposition | null;
  readonly fragments?: readonly AppBuilderPartSourceFragment[];
  readonly contributingFragments?: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
};

function lowerLoadingEmptyErrorStructuralParts(
  selection: LoadingEmptyErrorSelection,
  fulfilledContentComposition: LoadingEmptyErrorFulfilledContent,
): LoadingEmptyErrorStructuralLowerings | null {
  if (selection.issues.length > 0) {
    return null;
  }
  return {
    promise: lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.Promise, [
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: selection.promiseExpression as string },
    ]),
    pending: lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.PromisePending),
    fulfilled: lowerStructuralTemplateControllerAttribute(
      AppBuilderStructuralPartId.PromiseFulfilled,
      optionalCompositionPartSlot(AppBuilderPartSlotKind.LocalName, selection.fulfilledLocalName),
    ),
    rejected: lowerStructuralTemplateControllerAttribute(
      AppBuilderStructuralPartId.PromiseRejected,
      optionalCompositionPartSlot(AppBuilderPartSlotKind.LocalName, selection.rejectedLocalName),
    ),
    emptyConditional: lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.Conditional, [
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: selection.emptyStateConditionExpression as string },
    ]),
    fulfilledContentElse: fulfilledContentComposition.composition == null
      ? null
      : lowerStructuralTemplateControllerAttribute(AppBuilderStructuralPartId.ConditionalElse),
  };
}

function loadingEmptyErrorIssues(
  targetRef: AppBuilderOntologyRowRef,
  selection: LoadingEmptyErrorSelection,
  fulfilledContentComposition: LoadingEmptyErrorFulfilledContent,
  structuralLowerings: LoadingEmptyErrorStructuralLowerings | null,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  return [
    ...selection.issues,
    ...fulfilledContentComposition.issues,
    ...(structuralLowerings == null
      ? []
      : structuralPartLoweringIssues(targetRef, loadingEmptyErrorStructuralLoweringRows(structuralLowerings))),
  ];
}

function loadingEmptyErrorReadyFrame(
  selection: LoadingEmptyErrorSelection,
  fulfilledContentComposition: LoadingEmptyErrorFulfilledContent,
  structuralLowerings: LoadingEmptyErrorStructuralLowerings | null,
  issues: readonly AppBuilderSourceLoweringCompositionIssue[],
): LoadingEmptyErrorReadyFrame | null {
  if (issues.length > 0 || structuralLowerings == null) {
    return null;
  }
  const promiseExpression = selection.promiseExpression;
  const pendingText = selection.pendingText;
  const emptyStateText = selection.emptyStateText;
  const emptyStateConditionExpression = selection.emptyStateConditionExpression;
  const rejectedText = selection.rejectedText;
  const promiseAttribute = structuralLowerings.promise.attributeFragment;
  const pendingAttribute = structuralLowerings.pending.attributeFragment;
  const fulfilledAttribute = structuralLowerings.fulfilled.attributeFragment;
  const rejectedAttribute = structuralLowerings.rejected.attributeFragment;
  const emptyConditionalAttribute = structuralLowerings.emptyConditional.attributeFragment;
  const fulfilledContentElseAttribute = fulfilledContentComposition.composition == null
    ? null
    : structuralLowerings.fulfilledContentElse?.attributeFragment ?? null;
  if (
    promiseExpression == null
    || pendingText == null
    || emptyStateText == null
    || emptyStateConditionExpression == null
    || rejectedText == null
    || promiseAttribute == null
    || pendingAttribute == null
    || fulfilledAttribute == null
    || rejectedAttribute == null
    || emptyConditionalAttribute == null
    || (fulfilledContentComposition.composition != null && fulfilledContentElseAttribute == null)
  ) {
    return null;
  }
  return {
    selection: {
      ...selection,
      promiseExpression,
      pendingText,
      emptyStateText,
      emptyStateConditionExpression,
      rejectedText,
    },
    structuralLowerings: {
      promise: { ...structuralLowerings.promise, attributeFragment: promiseAttribute },
      pending: { ...structuralLowerings.pending, attributeFragment: pendingAttribute },
      fulfilled: { ...structuralLowerings.fulfilled, attributeFragment: fulfilledAttribute },
      rejected: { ...structuralLowerings.rejected, attributeFragment: rejectedAttribute },
      emptyConditional: { ...structuralLowerings.emptyConditional, attributeFragment: emptyConditionalAttribute },
      fulfilledContentElse: fulfilledContentElseAttribute == null || structuralLowerings.fulfilledContentElse == null
        ? null
        : { ...structuralLowerings.fulfilledContentElse, attributeFragment: fulfilledContentElseAttribute },
    },
  };
}

function loadingEmptyErrorRenderedFragments(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetRef: AppBuilderOntologyRowRef,
  readyFrame: LoadingEmptyErrorReadyFrame,
  fulfilledContentComposition: LoadingEmptyErrorFulfilledContent,
): LoadingEmptyErrorRenderedFragments {
  const { selection, structuralLowerings } = readyFrame;
  const pendingFragment = appBuilderTemplateElementFragment(
    'p',
    [
      structuralLowerings.pending.attributeFragment.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.StatusPending,
      ),
    ],
    authoredTemplateTextContentText(selection.pendingText),
  );
  const emptyFragment = appBuilderTemplateElementFragment(
    'p',
    [
      structuralLowerings.emptyConditional.attributeFragment.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.StatusEmpty,
      ),
    ],
    authoredTemplateTextContentText(selection.emptyStateText),
  );
  const fulfilledContentElements = fulfilledContentComposition.composition == null
    ? []
    : fulfilledContentComposition.composition.fragments.filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
        fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
      ).map((fragment) => fragment.templateElement);
  const fulfilledContentFragment = fulfilledContentElements.length === 0
    || structuralLowerings.fulfilledContentElse == null
    ? null
    : appBuilderTemplateElementFragment(
        'template',
        [structuralLowerings.fulfilledContentElse.attributeFragment.templateAttribute],
        null,
        fulfilledContentElements,
      );
  const fulfilledFragment = appBuilderTemplateElementFragment(
    'template',
    [structuralLowerings.fulfilled.attributeFragment.templateAttribute],
    null,
    [
      emptyFragment.templateElement,
      ...(fulfilledContentFragment == null ? [] : [fulfilledContentFragment.templateElement]),
    ],
  );
  const rejectedFragment = appBuilderTemplateElementFragment(
    'p',
    [
      structuralLowerings.rejected.attributeFragment.templateAttribute,
      ...appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.StatusError,
      ),
    ],
    authoredTemplateTextContentText(selection.rejectedText),
  );
  const regionFragment = withCompositionOrigin(
    appBuilderTemplateElementFragment(
      'section',
      [
        structuralLowerings.promise.attributeFragment.templateAttribute,
        ...appBuilderSourceLoweringVisualHookAttributes(
          suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
        ),
      ],
      null,
      [
        pendingFragment.templateElement,
        fulfilledFragment.templateElement,
        rejectedFragment.templateElement,
      ],
    ),
    AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
    targetRef,
    loadingEmptyErrorStateCompositionMemberTargetIds(),
  );
  return {
    regionFragment,
    contributingFragments: [
      structuralLowerings.promise.attributeFragment,
      structuralLowerings.pending.attributeFragment,
      structuralLowerings.fulfilled.attributeFragment,
      structuralLowerings.rejected.attributeFragment,
      structuralLowerings.emptyConditional.attributeFragment,
      ...(structuralLowerings.fulfilledContentElse == null ? [] : [structuralLowerings.fulfilledContentElse.attributeFragment]),
      pendingFragment,
      emptyFragment,
      ...(fulfilledContentComposition.composition?.contributingFragments ?? []),
      ...(fulfilledContentFragment == null ? [] : [fulfilledContentFragment]),
      fulfilledFragment,
      rejectedFragment,
      regionFragment,
    ],
  };
}

function loadingEmptyErrorCompositionResult(
  input: LoadingEmptyErrorCompositionResultInput,
): AppBuilderSourceLoweringComposition {
  return sourceLoweringCompositionResult({
    targetRef: input.targetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
    preflightRow: input.preflightRow,
    preflight: input.request.includePreflight === true ? input.preflight : undefined,
    availableFieldNames: input.fields.map((field) => field.memberName),
    availableActionNames: input.actions.map((action) => action.name),
    promiseExpression: input.selection.promiseExpression,
    pendingText: input.selection.pendingText,
    fulfilledLocalName: input.selection.fulfilledLocalName,
    emptyStateText: input.selection.emptyStateText,
    emptyStateConditionExpression: input.selection.emptyStateConditionExpression,
    rejectedLocalName: input.selection.rejectedLocalName,
    rejectedText: input.selection.rejectedText,
    fulfilledContentComposition: input.fulfilledContentComposition,
    fragments: input.fragments,
    contributingFragments: input.contributingFragments,
    issues: input.issues,
  });
}

function loadingEmptyErrorStructuralContributingFragments(
  structuralLowerings: LoadingEmptyErrorStructuralLowerings | null,
): readonly AppBuilderPartSourceFragment[] {
  return structuralLowerings == null
    ? []
    : loadingEmptyErrorStructuralLoweringRows(structuralLowerings)
        .flatMap((row) => row.lowering.fragments);
}

function loadingEmptyErrorStructuralLoweringRows(
  structuralLowerings: LoadingEmptyErrorStructuralLowerings,
): readonly StructuralTemplateControllerLowering[] {
  return [
    structuralLowerings.promise,
    structuralLowerings.pending,
    structuralLowerings.fulfilled,
    structuralLowerings.rejected,
    structuralLowerings.emptyConditional,
    ...(structuralLowerings.fulfilledContentElse == null ? [] : [structuralLowerings.fulfilledContentElse]),
  ];
}

function selectLoadingEmptyErrorState(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
): LoadingEmptyErrorSelection {
  const selectedInputs = loadingEmptyErrorSelectedInputs(request);
  return {
    ...selectedInputs,
    issues: loadingEmptyErrorSelectionIssues(targetRef, selectedInputs),
  };
}

function loadingEmptyErrorSelectedInputs(
  request: AppBuilderSourceLoweringCompositionRequest,
): LoadingEmptyErrorSelectedInputs {
  return {
    promiseExpression: normalizedSourceInputText(request.promiseExpression),
    pendingText: normalizedSourceInputText(request.pendingText),
    fulfilledLocalName: normalizedSourceInputText(request.fulfilledLocalName),
    emptyStateText: normalizedSourceInputText(request.emptyStateText),
    emptyStateConditionExpression: normalizedSourceInputText(request.emptyStateConditionExpression),
    rejectedLocalName: normalizedSourceInputText(request.rejectedLocalName),
    rejectedText: normalizedSourceInputText(request.rejectedText),
  };
}

function loadingEmptyErrorSelectionIssues(
  targetRef: AppBuilderOntologyRowRef,
  selectedInputs: LoadingEmptyErrorSelectedInputs,
): readonly AppBuilderSourceLoweringCompositionIssue[] {
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  for (const field of LOADING_EMPTY_ERROR_REQUIRED_TEXT_FIELDS) {
    if (selectedInputs[field.fieldName] == null) {
      issues.push({
        issueKind: field.issueKind,
        targetRef,
        summary: field.summary,
      });
    }
  }
  if (selectedInputs.fulfilledLocalName != null && !appBuilderIsTypeScriptIdentifier(selectedInputs.fulfilledLocalName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidFulfilledLocalName,
      targetRef,
      localNames: [selectedInputs.fulfilledLocalName],
      summary: `Fulfilled promise branch local name '${selectedInputs.fulfilledLocalName}' is not a TypeScript identifier.`,
    });
  }
  if (selectedInputs.rejectedLocalName != null && !appBuilderIsTypeScriptIdentifier(selectedInputs.rejectedLocalName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.InvalidRejectedLocalName,
      targetRef,
      localNames: [selectedInputs.rejectedLocalName],
      summary: `Rejected promise branch local name '${selectedInputs.rejectedLocalName}' is not a TypeScript identifier.`,
    });
  }
  return issues;
}

function lowerFulfilledContentComposition(
  request: AppBuilderSourceLoweringCompositionRequest,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly composition: AppBuilderSourceLoweringComposition | null;
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
} {
  const nestedRequest = request.fulfilledContentComposition ?? null;
  if (nestedRequest == null) {
    return {
      composition: null,
      issues: [],
    };
  }
  const composition = appBuilderSourceLoweringComposition({
    ...nestedRequest,
    suppliedInputs: sourceLoweringCompositionChildSuppliedInputs(request, nestedRequest),
    decisionBundles: nestedRequest.decisionBundles ?? [],
    includePreflight: nestedRequest.includePreflight ?? request.includePreflight,
    emissionContext: nestedRequest.emissionContext ?? request.emissionContext,
  });
  const elementFragments = composition.fragments.filter((fragment): fragment is AppBuilderTemplateElementPartSourceFragment =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
  );
  const issues: AppBuilderSourceLoweringCompositionIssue[] = [];
  if (composition.issues.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.FulfilledContentCompositionIssue,
      targetRef,
      fulfilledContentComposition: composition,
      summary: `Loading/empty/error fulfilled content composition could not lower cleanly: ${composition.issues.map((issue) => issue.summary).join(' ')}`,
    });
  } else if (elementFragments.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringCompositionIssueKind.FulfilledContentCompositionIssue,
      targetRef,
      fulfilledContentComposition: composition,
      summary: 'Loading/empty/error fulfilled content composition must produce at least one template-element fragment.',
    });
  }
  return {
    composition,
    issues,
  };
}

function optionalCompositionPartSlot(
  slotKind: AppBuilderPartSlotKind,
  value: string | null,
): readonly AppBuilderPartSlotAssignment[] {
  return value == null ? [] : [{ slotKind, value }];
}

function loadingEmptyErrorStateCompositionMemberTargetIds(): readonly string[] {
  return [
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.Promise}`,
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.PromisePending}`,
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.PromiseFulfilled}`,
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.PromiseRejected}`,
    `${AppBuilderPartKind.StructuralPart}:${AppBuilderStructuralPartId.Conditional}`,
  ];
}
