import {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlFieldLabelContainerKind,
  AppBuilderControlId,
  AppBuilderControlSemanticValueKind,
  appBuilderControlDescriptor,
} from '../control-catalog.js';
import { AppBuilderBindingPartId } from '../binding-part-catalog.js';
import {
  type AppBuilderDomainActionDescriptor,
  AppBuilderDomainActionKind,
  AppBuilderDomainFieldValueKind,
  type AppBuilderDomainFieldDescriptor,
  AppBuilderDomainIdentityValueKind,
  AppBuilderDomainRelationshipKind,
  AppBuilderDomainRelationshipLocalValueKind,
  AppBuilderDomainActionScope,
  type AppBuilderDomainValueSetDescriptor,
} from '../domain-model.js';
import {
  appBuilderDomainFieldSeedLiteral,
  appBuilderDomainFieldSourceModels,
  type AppBuilderDomainFieldSourceModel,
} from '../domain-field-source.js';
import {
  appBuilderDomainEntityConstructionExpressionSource,
} from '../domain-entity-source.js';
import {
  AppBuilderFrameworkComponentId,
} from '../framework-component-catalog.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartSlotKind,
} from '../part-application.js';
import { AppBuilderPartKind } from '../part-catalog.js';
import {
  appendAppBuilderTemplateElementAttributes,
  lowerAppBuilderPartSourceInvocation,
  normalizedAppBuilderTemplateElementAttributes,
  type AppBuilderPartSourceLowering,
} from '../part-source-lowering.js';
import type {
  AppBuilderPartSourceFragment,
  AppBuilderPartSourceInvocation,
  AppBuilderPartSourceLoweringIssue,
  AppBuilderPartSlotAssignment,
  AppBuilderSourceLoweringFragmentOrigin,
  AppBuilderTemplateElementPartSourceFragment,
  AppBuilderTemplateElementSource,
} from '../part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
  AppBuilderSourceFragmentOriginKind,
} from '../part-source-invocation.js';
import {
  uniqueStrings,
} from '../../kernel/collections.js';
import {
  appBuilderKebabCase,
  appBuilderIsTypeScriptIdentifier,
  appBuilderLowerCamelCase,
  appBuilderPascalCase,
  appBuilderSeedRecordLiteral,
  appBuilderTemplateElementFragment,
} from '../source-lowering-helpers.js';
import {
  authoredTemplateAttributeText,
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  authoredTemplateTextContentText,
  type AuthoredTemplateChildSource,
} from '../../template/authored-template-source.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import {
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  AppBuilderControlPatternId,
  appBuilderControlPatternIdForLeafControlId,
  appBuilderLeafControlIdForControlPatternId,
  type AppBuilderControlPatternRow,
} from './control.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import type {
  AppBuilderCollectionFeatureId,
} from './collection.js';
import {
  appBuilderEffectContractIdsForTargetRef,
} from './effect-target.js';
import {
  appBuilderUniqueEffectContractIds,
  type AppBuilderEffectContractId,
} from './effect.js';
import {
  AppBuilderControlUseActionChannelKind,
  appBuilderControlUseInventoryRowsForInvocation,
  type AppBuilderControlUseInventoryRow,
} from './control-use-inventory.js';
import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderSuppliedInputSource,
} from './input.js';
import type {
  AppBuilderSuppliedInput,
  AppBuilderSuppliedInputFacetPayload,
} from './input-readiness.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderUniqueOntologyRowRefs,
} from './row-descriptor.js';
import type {
  AppBuilderSourceLoweringEmissionContext,
} from './source-lowering-context.js';
import {
  AppBuilderSourceLoweringAvailability,
  AppBuilderSourceLoweringInputGateState,
  appBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflightIssue,
  type AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  appBuilderSelectNumericControlConstraints,
  AppBuilderNumericControlConstraintIssueKind,
  type AppBuilderNumericControlConstraintIssue,
} from './source-lowering-numeric-constraints.js';
import {
  appBuilderSourceLoweringAccessibilityHelpErrorPayloads,
  appBuilderSourceLoweringAccessibilityLabelPayloads,
  appBuilderSourceLoweringActionFeedbackPayloads,
  appBuilderSourceLoweringDomainActionPayloads,
  appBuilderSourceLoweringDomainEntityPayloads,
  appBuilderSourceLoweringDomainFieldPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderSourceLoweringStatePolicyPayloads,
  appBuilderSourceLoweringDomainValueSetPayloads,
  appBuilderSourceLoweringVisualHookAttributes,
  appBuilderEntityCompleteMutationFieldName,
  AppBuilderSourceLoweringVisualHookTarget,
  type AppBuilderSourceLoweringActionFeedbackPayload,
  type AppBuilderSourceLoweringAccessibilityHelpErrorPayload,
  type AppBuilderSourceLoweringAccessibilityLabelsPayload,
  type AppBuilderSourceLoweringDomainEntityPayload,
} from './source-lowering-inputs.js';
import {
  appBuilderSuppliedInputsWithDecisionBundlesForTarget,
  appBuilderSuppliedInputsWithDecisionBundles,
  type AppBuilderDecisionBundle,
} from '../policy/decision-bundle.js';
import {
  AppBuilderLocalStatePolicy,
} from '../aurelia-lowering-option.js';
import {
  AppBuilderSourceLoweringActionSelectionState,
  AppBuilderSourceLoweringAsyncDataMemberMutability,
  APP_BUILDER_SOURCE_LOWERING_ASYNC_DATA_MEMBER_MUTABILITIES,
  AppBuilderSourceLoweringBindingExpressionSource,
  AppBuilderSourceLoweringButtonType,
  APP_BUILDER_SOURCE_LOWERING_BUTTON_TYPES,
  AppBuilderSourceLoweringFieldControlIdSource,
  AppBuilderSourceLoweringFieldSelectionState,
  AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringInnerControlSelectionState,
  AppBuilderSourceLoweringInvocationIssueKind,
  AppBuilderSourceLoweringLabelTextSource,
  AppBuilderSourceLoweringMessageKind,
  APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS,
  AppBuilderSourceLoweringMessageSelectionState,
  AppBuilderSourceLoweringMessageTextSource,
  AppBuilderSourceLoweringValueDomainExpressionSource,
  type AppBuilderSourceLoweringInvocation,
  type AppBuilderSourceLoweringInvocationIssue,
  type AppBuilderSourceLoweringInvocationRequest,
  type AppBuilderSourceLoweringSelectedDomainAction,
  type AppBuilderSourceLoweringSelectedDomainField,
  type AppBuilderSourceLoweringTypeScriptMethodParameter,
} from './source-lowering-invocation-contracts.js';

export * from './source-lowering-invocation-contracts.js';

type AppBuilderMessagePayloadTextFieldName = 'helpText' | 'errorText' | 'statusText';
type AppBuilderMessagePayloadIdFieldName = 'helpId' | 'errorId' | 'statusId';
type AppBuilderSourceLoweringRawAttribute = { readonly rawName: string; readonly rawValue?: string | null };

interface AppBuilderSourceLoweringMessageDescriptor {
  /** Message kind that selects text/id payload fields and rendered role attributes. */
  readonly kind: AppBuilderSourceLoweringMessageKind;
  /** Accessibility payload text field used by this message kind. */
  readonly textFieldName: AppBuilderMessagePayloadTextFieldName;
  /** Accessibility payload id field used by this message kind. */
  readonly idFieldName: AppBuilderMessagePayloadIdFieldName;
  /** Native attributes emitted on the generated message element. */
  readonly roleAttributes: readonly AppBuilderSourceLoweringRawAttribute[];
}

const APP_BUILDER_SOURCE_LOWERING_MESSAGE_DESCRIPTORS = {
  [AppBuilderSourceLoweringMessageKind.Help]: {
    kind: AppBuilderSourceLoweringMessageKind.Help,
    textFieldName: 'helpText',
    idFieldName: 'helpId',
    roleAttributes: [],
  },
  [AppBuilderSourceLoweringMessageKind.Error]: {
    kind: AppBuilderSourceLoweringMessageKind.Error,
    textFieldName: 'errorText',
    idFieldName: 'errorId',
    roleAttributes: [{ rawName: 'role', rawValue: 'alert' }],
  },
  [AppBuilderSourceLoweringMessageKind.Status]: {
    kind: AppBuilderSourceLoweringMessageKind.Status,
    textFieldName: 'statusText',
    idFieldName: 'statusId',
    roleAttributes: [{ rawName: 'role', rawValue: 'status' }],
  },
} as const satisfies Record<AppBuilderSourceLoweringMessageKind, AppBuilderSourceLoweringMessageDescriptor>;

/** Whether a leaf control owns its own accessible name or is nested inside a label-owning wrapper. */
enum AppBuilderFieldControlAccessibilityMode {
  /** Direct leaf-control source owns its accessible name through attributes such as aria-label. */
  StandaloneControl = 'standalone-control',
  /** Field-group source owns label/help/error relationships around the inner leaf control. */
  EmbeddedFieldGroupControl = 'embedded-field-group-control',
}

interface AppBuilderSourceLoweringValueDomainSelection {
  readonly expression: string | null;
  readonly source: AppBuilderSourceLoweringValueDomainExpressionSource | null;
  readonly selectedValueSet: AppBuilderDomainValueSetDescriptor | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
}

interface AppBuilderSourceLoweringMessageSelection {
  readonly messageKind: AppBuilderSourceLoweringMessageKind | null;
  readonly selectionState: AppBuilderSourceLoweringMessageSelectionState;
  readonly text: string | null;
  readonly textSource: AppBuilderSourceLoweringMessageTextSource | null;
  readonly messageId: string | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
}

/** Normalized help/error/status message candidate from supplied accessibility payloads. */
interface AppBuilderSourceLoweringMessageCandidate {
  /** Selected generated form-message kind. */
  readonly kind: AppBuilderSourceLoweringMessageKind;
  /** Exact message text supplied by the caller payload. */
  readonly text: string;
  /** Optional DOM id supplied by the caller payload. */
  readonly id: string | null;
}

/** Source-lowering route admitted after target preflight has proven the invocation can spend source. */
enum AppBuilderSourceLoweringInvocationRouteKind {
  /** Application-pattern route that emits a domain action class method. */
  DomainCommandAction = 'domain-command-action',
  /** Application-pattern route that emits an anchor with Aurelia router `load` navigation. */
  RouteNavigationAction = 'route-navigation-action',
  /** Application-pattern route that emits an async data-source class member. */
  AsyncDataSource = 'async-data-source',
  /** Control-pattern route that emits a native button plus event binding. */
  NativeButton = 'native-button',
  /** Control-pattern route that wraps a leaf control with label and message relationships. */
  FieldGroup = 'field-group',
  /** Control-pattern route that emits a standalone help/error/status message. */
  FormMessage = 'form-message',
  /** Control-pattern route that delegates to one leaf control part lowerer. */
  LeafFieldControl = 'leaf-field-control',
}

interface AppBuilderSourceLoweringInvocationReadyPreflightFrame {
  readonly ready: true;
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly preflight: AppBuilderSourceLoweringPreflight;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderSourceLoweringInvocationBlockedPreflightFrame {
  readonly ready: false;
  readonly targetRef: AppBuilderOntologyRowRef | null;
  readonly preflight: AppBuilderSourceLoweringPreflight | null;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

type AppBuilderSourceLoweringInvocationPreflightFrame =
  | AppBuilderSourceLoweringInvocationReadyPreflightFrame
  | AppBuilderSourceLoweringInvocationBlockedPreflightFrame;

interface AppBuilderSourceLoweringInvocationApplicationPatternFrame extends AppBuilderSourceLoweringInvocationReadyPreflightFrame {
  readonly routeKind:
    | AppBuilderSourceLoweringInvocationRouteKind.DomainCommandAction
    | AppBuilderSourceLoweringInvocationRouteKind.RouteNavigationAction
    | AppBuilderSourceLoweringInvocationRouteKind.AsyncDataSource;
  readonly controlPattern: null;
  readonly controlId: null;
}

interface AppBuilderSourceLoweringInvocationControlPatternFrame extends AppBuilderSourceLoweringInvocationReadyPreflightFrame {
  readonly routeKind:
    | AppBuilderSourceLoweringInvocationRouteKind.NativeButton
    | AppBuilderSourceLoweringInvocationRouteKind.FieldGroup
    | AppBuilderSourceLoweringInvocationRouteKind.FormMessage;
  readonly controlPattern: AppBuilderControlPatternRow;
  readonly controlId: null;
}

interface AppBuilderSourceLoweringInvocationLeafControlFrame extends AppBuilderSourceLoweringInvocationReadyPreflightFrame {
  readonly routeKind: AppBuilderSourceLoweringInvocationRouteKind.LeafFieldControl;
  readonly controlPattern: AppBuilderControlPatternRow;
  readonly controlId: AppBuilderControlId;
}

type AppBuilderSourceLoweringInvocationReadyTargetFrame =
  | AppBuilderSourceLoweringInvocationApplicationPatternFrame
  | AppBuilderSourceLoweringInvocationControlPatternFrame
  | AppBuilderSourceLoweringInvocationLeafControlFrame;

interface AppBuilderSourceLoweringInvocationBlockedTargetFrame {
  readonly ready: false;
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly preflight: AppBuilderSourceLoweringPreflight;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow;
  readonly routeKind: null;
  readonly controlPattern: AppBuilderControlPatternRow | null;
  readonly controlId: null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

type AppBuilderSourceLoweringInvocationTargetFrame =
  | AppBuilderSourceLoweringInvocationReadyTargetFrame
  | AppBuilderSourceLoweringInvocationBlockedTargetFrame;

interface AppBuilderFieldControlSourceLowering {
  readonly controlId: AppBuilderControlId;
  readonly selectedField: AppBuilderSourceLoweringSelectedDomainField | null;
  readonly fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState;
  readonly bindingExpression: string | null;
  readonly bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource | null;
  readonly labelText: string | null;
  readonly labelTextSource: AppBuilderSourceLoweringLabelTextSource | null;
  readonly describedByIds: readonly string[];
  readonly valueDomainExpression: string | null;
  readonly valueDomainExpressionSource: AppBuilderSourceLoweringValueDomainExpressionSource | null;
  readonly selectedValueSet: AppBuilderDomainValueSetDescriptor | null;
  readonly partInvocation: AppBuilderPartSourceInvocation | null;
  readonly partSourceLowering: AppBuilderPartSourceLowering | null;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderFieldControlSourceSelectionFrame {
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly bindingExpression: string;
  readonly bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource;
  readonly valueDomainExpression: string | null;
  readonly valueDomainExpressionSource: AppBuilderSourceLoweringValueDomainExpressionSource | null;
  readonly selectedValueSet: AppBuilderDomainValueSetDescriptor | null;
  readonly slotAssignments: readonly AppBuilderPartSlotAssignment[];
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderFieldControlAccessibilitySelection {
  readonly labelText: string | null;
  readonly labelTextSource: AppBuilderSourceLoweringLabelTextSource | null;
  readonly describedByIds: readonly string[];
  readonly attributes: readonly AppBuilderSourceLoweringRawAttribute[];
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderFieldControlRenderedFrame {
  readonly partInvocation: AppBuilderPartSourceInvocation;
  readonly partSourceLowering: AppBuilderPartSourceLowering;
  readonly accessibility: AppBuilderFieldControlAccessibilitySelection;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

type AppBuilderNativeButtonSelectionFrame =
  | AppBuilderNativeButtonReadySelectionFrame
  | AppBuilderNativeButtonBlockedSelectionFrame;

interface AppBuilderNativeButtonReadySelectionFrame {
  readonly ready: true;
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly selectedAction: AppBuilderSourceLoweringSelectedDomainAction;
  readonly actionSelectionState: AppBuilderSourceLoweringActionSelectionState;
  readonly handlerExpression: string;
  readonly handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource;
  readonly eventName: string;
  readonly buttonText: string;
  readonly buttonType: AppBuilderSourceLoweringButtonType;
  readonly issues: readonly [];
}

interface AppBuilderNativeButtonBlockedSelectionFrame {
  readonly ready: false;
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly selectedAction: AppBuilderSourceLoweringSelectedDomainAction | null;
  readonly actionSelectionState: AppBuilderSourceLoweringActionSelectionState;
  readonly handlerExpression: string | null;
  readonly handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource | null;
  readonly eventName: string | null;
  readonly buttonText: string | null;
  readonly buttonType: AppBuilderSourceLoweringButtonType | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderNativeButtonRenderedFrame {
  readonly partInvocation: AppBuilderPartSourceInvocation;
  readonly partSourceLowering: AppBuilderPartSourceLowering;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

type AppBuilderRouteNavigationActionSelectionFrame =
  | AppBuilderRouteNavigationActionReadySelectionFrame
  | AppBuilderRouteNavigationActionBlockedSelectionFrame;

interface AppBuilderRouteNavigationActionReadySelectionFrame {
  readonly ready: true;
  readonly selectedAction: AppBuilderSourceLoweringSelectedDomainAction;
  readonly actionSelectionState: AppBuilderSourceLoweringActionSelectionState;
  readonly routeInstruction: string;
  readonly routeParamsExpression: string | null;
  readonly routeContextExpression: string | null;
  readonly routeActiveExpression: string | null;
  readonly routeTargetAttributeName: string | null;
  readonly linkText: string;
  readonly issues: readonly [];
}

interface AppBuilderRouteNavigationActionBlockedSelectionFrame {
  readonly ready: false;
  readonly selectedAction: AppBuilderSourceLoweringSelectedDomainAction | null;
  readonly actionSelectionState: AppBuilderSourceLoweringActionSelectionState;
  readonly routeInstruction: string | null;
  readonly routeParamsExpression: string | null;
  readonly routeContextExpression: string | null;
  readonly routeActiveExpression: string | null;
  readonly routeTargetAttributeName: string | null;
  readonly linkText: string | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderFieldGroupLabelSelection {
  readonly text: string | null;
  readonly source: AppBuilderSourceLoweringLabelTextSource | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
}

interface AppBuilderFieldGroupControlIdSelection {
  readonly value: string;
  readonly source: AppBuilderSourceLoweringFieldControlIdSource;
}

interface AppBuilderFieldGroupMessageRow {
  readonly messageKind: AppBuilderSourceLoweringMessageKind;
  readonly text: string;
  readonly messageId: string;
}

interface AppBuilderFieldGroupSelectionFrame {
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly controlId: AppBuilderControlId | null;
  readonly selectedField: AppBuilderSourceLoweringSelectedDomainField | null;
  readonly fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState;
  readonly fieldControlLowering: AppBuilderFieldControlSourceLowering | null;
  readonly innerControlPatternId: AppBuilderControlPatternId | null;
  readonly innerControlSelectionState: AppBuilderSourceLoweringInnerControlSelectionState;
  readonly labelText: string | null;
  readonly labelTextSource: AppBuilderSourceLoweringLabelTextSource | null;
  readonly fieldControlId: string | null;
  readonly fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource | null;
  readonly controlFragment: AppBuilderTemplateElementPartSourceFragment | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}

interface AppBuilderFieldGroupRenderedFragments {
  readonly describedByIds: readonly string[];
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly additionalSourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
}

/** Lower one app-builder ontology target to source fragments through existing part-source callbacks. */
export function appBuilderSourceLoweringInvocation(
  request: AppBuilderSourceLoweringInvocationRequest = {},
): AppBuilderSourceLoweringInvocation {
  const preflightFrame = sourceLoweringInvocationPreflightFrame(request);
  if (!preflightFrame.ready) {
    return sourceLoweringInvocationBlockedPreflightResult(request, preflightFrame);
  }

  const targetFrame = sourceLoweringInvocationTargetFrame(preflightFrame);
  if (!targetFrame.ready) {
    return sourceLoweringInvocationBlockedTargetResult(request, targetFrame);
  }

  return lowerSourceLoweringInvocationTarget(request, targetFrame);
}

function sourceLoweringInvocationPreflightFrame(
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringInvocationPreflightFrame {
  const targetRef = request.targetRef ?? null;
  if (targetRef == null) {
    return {
      ready: false,
      targetRef: null,
      preflight: null,
      preflightRow: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingTargetRef,
        summary: 'App-builder source-lowering invocation requires an exact targetRef selected from target-catalog or source-lowering-preflight.',
      }],
    };
  }

  const preflight = appBuilderSourceLoweringPreflight({
    targetRefs: [targetRef],
    suppliedInputs: sourceLoweringExplicitSuppliedInputs(request),
    decisionBundles: request.decisionBundles ?? [],
    includeInputDependencies: request.includePreflight === true,
  });
  const preflightRow = preflight.rows[0] ?? null;
  if (preflightRow == null) {
    return {
      ready: false,
      targetRef,
      preflight,
      preflightRow: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownTarget,
        targetRef,
        summary: `App-builder source-lowering invocation does not know target '${targetRef.kind}:${targetRef.id}'.`,
      }],
    };
  }

  const gateIssues = sourceGateIssues(preflightRow);
  if (gateIssues.length > 0) {
    return {
      ready: false,
      targetRef,
      preflight,
      preflightRow,
      issues: gateIssues,
    };
  }

  return {
    ready: true,
    targetRef,
    preflight,
    preflightRow,
    issues: [],
  };
}

function sourceLoweringInvocationTargetFrame(
  preflightFrame: AppBuilderSourceLoweringInvocationReadyPreflightFrame,
): AppBuilderSourceLoweringInvocationTargetFrame {
  const { targetRef, preflight, preflightRow } = preflightFrame;

  if (targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.DomainCommandAction) {
    return {
      ...preflightFrame,
      routeKind: AppBuilderSourceLoweringInvocationRouteKind.DomainCommandAction,
      controlPattern: null,
      controlId: null,
    };
  }
  if (targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.RouteNavigationAction) {
    return {
      ...preflightFrame,
      routeKind: AppBuilderSourceLoweringInvocationRouteKind.RouteNavigationAction,
      controlPattern: null,
      controlId: null,
    };
  }
  if (targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.AsyncDataSource) {
    return {
      ...preflightFrame,
      routeKind: AppBuilderSourceLoweringInvocationRouteKind.AsyncDataSource,
      controlPattern: null,
      controlId: null,
    };
  }

  if (targetRef.kind !== AppBuilderOntologyRowKind.ControlPattern) {
    return {
      ready: false,
      targetRef,
      preflight,
      preflightRow,
      routeKind: null,
      controlPattern: null,
      controlId: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnsupportedTargetKind,
        targetRef,
        summary: `App-builder source-lowering invocation currently supports control-pattern targets, DomainCommandAction, RouteNavigationAction, and AsyncDataSource application-pattern targets; received '${targetRef.kind}:${targetRef.id}'.`,
      }],
    };
  }

  const controlPattern = APP_BUILDER_CONTROL_PATTERN_ROWS.find((row) => row.id === targetRef.id);
  if (controlPattern == null) {
    return {
      ready: false,
      targetRef,
      preflight,
      preflightRow,
      routeKind: null,
      controlPattern: null,
      controlId: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownControlPattern,
        targetRef,
        summary: `App-builder source-lowering invocation does not know control pattern '${targetRef.id}'.`,
      }],
    };
  }

  if (controlPattern.id === AppBuilderControlPatternId.NativeButton) {
    return {
      ...preflightFrame,
      routeKind: AppBuilderSourceLoweringInvocationRouteKind.NativeButton,
      controlPattern,
      controlId: null,
    };
  }
  if (controlPattern.id === AppBuilderControlPatternId.FieldGroup) {
    return {
      ...preflightFrame,
      routeKind: AppBuilderSourceLoweringInvocationRouteKind.FieldGroup,
      controlPattern,
      controlId: null,
    };
  }
  if (controlPattern.id === AppBuilderControlPatternId.FormMessage) {
    return {
      ...preflightFrame,
      routeKind: AppBuilderSourceLoweringInvocationRouteKind.FormMessage,
      controlPattern,
      controlId: null,
    };
  }

  const controlId = appBuilderLeafControlIdForControlPatternId(controlPattern.id);
  if (controlId == null) {
    return {
      ready: false,
      targetRef,
      preflight,
      preflightRow,
      routeKind: null,
      controlPattern,
      controlId: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.SourceLoweringNotImplemented,
        targetRef,
        summary: `Control pattern '${controlPattern.id}' is modeled but does not have source-lowering-implemented source lowering yet.`,
      }],
    };
  }

  return {
    ...preflightFrame,
    routeKind: AppBuilderSourceLoweringInvocationRouteKind.LeafFieldControl,
    controlPattern,
    controlId,
  };
}

function sourceLoweringInvocationBlockedPreflightResult(
  request: AppBuilderSourceLoweringInvocationRequest,
  frame: AppBuilderSourceLoweringInvocationBlockedPreflightFrame,
): AppBuilderSourceLoweringInvocation {
  return sourceLoweringInvocationResult({
    targetRef: frame.targetRef,
    preflightRow: frame.preflightRow,
    preflight: request.includePreflight === true && frame.preflight != null ? frame.preflight : undefined,
    fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
    issues: frame.issues,
  });
}

function sourceLoweringInvocationBlockedTargetResult(
  request: AppBuilderSourceLoweringInvocationRequest,
  frame: AppBuilderSourceLoweringInvocationBlockedTargetFrame,
): AppBuilderSourceLoweringInvocation {
  return sourceLoweringInvocationResult({
    targetRef: frame.targetRef,
    preflightRow: frame.preflightRow,
    preflight: request.includePreflight === true ? frame.preflight : undefined,
    controlPattern: frame.controlPattern,
    fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
    issues: frame.issues,
  });
}

function lowerSourceLoweringInvocationTarget(
  request: AppBuilderSourceLoweringInvocationRequest,
  frame: AppBuilderSourceLoweringInvocationReadyTargetFrame,
): AppBuilderSourceLoweringInvocation {
  switch (frame.routeKind) {
    case AppBuilderSourceLoweringInvocationRouteKind.DomainCommandAction:
      return lowerDomainCommandActionSourceInvocation(request, frame.targetRef, frame.preflight, frame.preflightRow);
    case AppBuilderSourceLoweringInvocationRouteKind.RouteNavigationAction:
      return lowerRouteNavigationActionSourceInvocation(request, frame.targetRef, frame.preflight, frame.preflightRow);
    case AppBuilderSourceLoweringInvocationRouteKind.AsyncDataSource:
      return lowerAsyncDataSourceInvocation(request, frame.targetRef, frame.preflight, frame.preflightRow);
    case AppBuilderSourceLoweringInvocationRouteKind.NativeButton:
      return lowerNativeButtonSourceInvocation(request, frame.targetRef, frame.preflight, frame.preflightRow, frame.controlPattern);
    case AppBuilderSourceLoweringInvocationRouteKind.FieldGroup:
      return lowerFieldGroupSourceInvocation(request, frame.targetRef, frame.preflight, frame.preflightRow, frame.controlPattern);
    case AppBuilderSourceLoweringInvocationRouteKind.FormMessage:
      return lowerFormMessageSourceInvocation(request, frame.targetRef, frame.preflight, frame.preflightRow, frame.controlPattern);
    case AppBuilderSourceLoweringInvocationRouteKind.LeafFieldControl: {
      const fieldControlLowering = lowerFieldControlSourceInvocation(frame.targetRef, frame.controlId, request);
      return sourceLoweringInvocationResult({
        targetRef: frame.targetRef,
        preflightRow: frame.preflightRow,
        preflight: request.includePreflight === true ? frame.preflight : undefined,
        controlPattern: frame.controlPattern,
        ...fieldControlLowering,
      });
    }
  }
}

function sourceGateIssues(
  preflightRow: AppBuilderSourceLoweringPreflightRow,
): readonly AppBuilderSourceLoweringInvocationIssue[] {
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [];
  if (preflightRow.sourceLoweringAvailability !== AppBuilderSourceLoweringAvailability.SourceLoweringImplemented) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.SourceLoweringNotImplemented,
      targetRef: preflightRow.targetRef,
      summary: `Target '${preflightRow.targetRef.kind}:${preflightRow.targetRef.id}' has source availability '${preflightRow.sourceLoweringAvailability}', not source-lowering-implemented source lowering.`,
    });
  }
  if (preflightRow.inputGateState === AppBuilderSourceLoweringInputGateState.MissingRequiredInput) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingRequiredInput,
      targetRef: preflightRow.targetRef,
      summary: `Target '${preflightRow.targetRef.kind}:${preflightRow.targetRef.id}' is missing required input facets: ${preflightRow.inputReadiness.missingRequiredInputFacetIds.join(', ')}.`,
    });
  }
  if (preflightRow.inputGateState === AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidSuppliedPayload,
      targetRef: preflightRow.targetRef,
      summary: `Target '${preflightRow.targetRef.kind}:${preflightRow.targetRef.id}' has ${preflightRow.inputReadiness.invalidPayloadCount} invalid supplied payload(s).`,
    });
  }
  issues.push(...preflightRow.targetRequirementIssues.map((issue): AppBuilderSourceLoweringInvocationIssue => ({
    issueKind: AppBuilderSourceLoweringInvocationIssueKind.TargetRequirementIssue,
    targetRef: preflightRow.targetRef,
    fieldNames: issue.fieldNames,
    columnHeaders: issue.columnHeaders,
    collectionFeatureIds: issue.collectionFeatureIds,
    sourceLoweringPreflightIssue: issue,
    summary: issue.summary,
  })));
  return issues;
}

function lowerFieldControlSourceInvocation(
  targetRef: AppBuilderOntologyRowRef,
  controlId: AppBuilderControlId,
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderFieldControlSourceLowering {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const fields = appBuilderDomainFieldSourceModels(appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs), {
    valueSets: appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs),
  });
  if (fields.length === 0) {
    return {
      controlId,
      selectedField: null,
      fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
      bindingExpression: null,
      bindingExpressionSource: null,
      labelText: null,
      labelTextSource: null,
      describedByIds: [],
      valueDomainExpression: null,
      valueDomainExpressionSource: null,
      selectedValueSet: null,
      partInvocation: null,
      partSourceLowering: null,
      fragments: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingDomainFieldsPayload,
        targetRef,
        summary: `Control '${controlId}' needs a modeled domain-fields payload before source can bind a real field.`,
      }],
    };
  }

  const fieldSelection = selectDomainFieldForControl(controlId, fields, request);
  if (fieldSelection.issue != null || fieldSelection.selectedField == null) {
    return {
      controlId,
      selectedField: null,
      fieldSelectionState: fieldSelection.state,
      bindingExpression: null,
      bindingExpressionSource: null,
      labelText: null,
      labelTextSource: null,
      describedByIds: [],
      valueDomainExpression: null,
      valueDomainExpressionSource: null,
      selectedValueSet: null,
      partInvocation: null,
      partSourceLowering: null,
      fragments: [],
      issues: fieldSelection.issue == null ? [] : [fieldSelection.issue],
    };
  }

  return lowerFieldControlSourceForSelectedField(targetRef, controlId, {
    field: fieldSelection.selectedField.field,
    sourceModel: fieldSelection.selectedField,
    selectionState: fieldSelection.state,
  }, request, AppBuilderFieldControlAccessibilityMode.StandaloneControl);
}

function lowerFieldControlSourceForSelectedField(
  targetRef: AppBuilderOntologyRowRef,
  controlId: AppBuilderControlId,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  request: AppBuilderSourceLoweringInvocationRequest,
  accessibilityMode: AppBuilderFieldControlAccessibilityMode,
): AppBuilderFieldControlSourceLowering {
  const selection = fieldControlSourceSelectionFrame(targetRef, controlId, selectedField, request);
  if (selection.issues.length > 0) {
    return {
      controlId,
      selectedField,
      fieldSelectionState: selectedField.selectionState,
      bindingExpression: selection.bindingExpression,
      bindingExpressionSource: selection.bindingExpressionSource,
      labelText: null,
      labelTextSource: null,
      describedByIds: [],
      valueDomainExpression: selection.valueDomainExpression,
      valueDomainExpressionSource: selection.valueDomainExpressionSource,
      selectedValueSet: selection.selectedValueSet,
      partInvocation: null,
      partSourceLowering: null,
      fragments: [],
      issues: selection.issues,
    };
  }

  const rendered = fieldControlRenderedFrame(targetRef, controlId, selectedField, selection, request, accessibilityMode);
  return {
    controlId,
    selectedField,
    fieldSelectionState: selectedField.selectionState,
    bindingExpression: selection.bindingExpression,
    bindingExpressionSource: selection.bindingExpressionSource,
    labelText: rendered.accessibility.labelText,
    labelTextSource: rendered.accessibility.labelTextSource,
    describedByIds: rendered.accessibility.describedByIds,
    valueDomainExpression: selection.valueDomainExpression,
    valueDomainExpressionSource: selection.valueDomainExpressionSource,
    selectedValueSet: selection.selectedValueSet,
    partInvocation: rendered.partInvocation,
    partSourceLowering: rendered.partSourceLowering,
    fragments: rendered.fragments,
    issues: rendered.issues,
  };
}

function fieldControlSourceSelectionFrame(
  targetRef: AppBuilderOntologyRowRef,
  controlId: AppBuilderControlId,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderFieldControlSourceSelectionFrame {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const control = appBuilderControlDescriptor(controlId);
  const valueDomainSelection = control.requiresValueDomain
    ? selectValueDomainForChoiceControl(targetRef, controlId, selectedField, appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs), request)
    : {
        expression: null,
        source: null,
        selectedValueSet: null,
        issue: null,
      };
  const explicitBindingExpression = normalizedSourceInputText(request.bindingExpression);
  const bindingExpression = explicitBindingExpression ?? selectedField.sourceModel.memberName;
  const bindingExpressionSource = explicitBindingExpression == null
    ? AppBuilderSourceLoweringBindingExpressionSource.SelectedFieldName
    : AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest;
  const numericConstraintSelection = appBuilderSelectNumericControlConstraints(controlId, selectedField.sourceModel);
  const numericConstraintIssue = numericConstraintSelection.issue == null
    ? null
    : numericConstraintInvocationIssue(targetRef, numericConstraintSelection.issue);
  const issues = [
    ...optionalIssue(valueDomainSelection.issue),
    ...optionalIssue(numericConstraintIssue),
  ];
  return {
    suppliedInputs,
    bindingExpression,
    bindingExpressionSource,
    valueDomainExpression: valueDomainSelection.expression,
    valueDomainExpressionSource: valueDomainSelection.source,
    selectedValueSet: valueDomainSelection.selectedValueSet,
    slotAssignments: issues.length === 0
      ? [
          ...controlSourceSlotAssignments(controlId, bindingExpression, selectedField, request, valueDomainSelection),
          ...numericConstraintSelection.slotAssignments,
        ]
      : [],
    issues,
  };
}

function fieldControlRenderedFrame(
  targetRef: AppBuilderOntologyRowRef,
  controlId: AppBuilderControlId,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  selection: AppBuilderFieldControlSourceSelectionFrame,
  request: AppBuilderSourceLoweringInvocationRequest,
  accessibilityMode: AppBuilderFieldControlAccessibilityMode,
): AppBuilderFieldControlRenderedFrame {
  const control = appBuilderControlDescriptor(controlId);
  const partInvocation: AppBuilderPartSourceInvocation = {
    partKind: AppBuilderPartKind.Control,
    partId: controlId,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateElement,
    slotAssignments: selection.slotAssignments,
  };
  const partSourceLowering = lowerAppBuilderPartSourceInvocation(partInvocation);
  const partIssues = partSourceLowering.issues.map((issue): AppBuilderSourceLoweringInvocationIssue => ({
    issueKind: AppBuilderSourceLoweringInvocationIssueKind.PartSourceLoweringIssue,
    targetRef,
    partSourceLoweringIssue: issue,
    summary: issue.summary,
  }));
  const visualAttributes = appBuilderSourceLoweringVisualHookAttributes(
    selection.suppliedInputs,
    AppBuilderSourceLoweringVisualHookTarget.FieldControl,
    { fieldName: selectedField.sourceModel.memberName },
  );
  const standaloneAccessibility = accessibilityMode === AppBuilderFieldControlAccessibilityMode.StandaloneControl
    ? selectStandaloneFieldControlAccessibility(targetRef, selectedField, request)
    : emptyFieldControlAccessibilitySelection();
  const visuallyHookedFragments = partSourceLowering.fragments.map((fragment) =>
    control.visualHookDescendantTagName == null
      ? appendVisualAttributesToTemplateElement(fragment, visualAttributes)
      : appendVisualAttributesToTemplateElementDescendants(fragment, control.visualHookDescendantTagName, visualAttributes)
  );
  const accessibleFragments = accessibilityMode === AppBuilderFieldControlAccessibilityMode.StandaloneControl
    && control.fieldLabelContainerKind === AppBuilderControlFieldLabelContainerKind.FieldsetLegend
    && standaloneAccessibility.labelText != null
    ? visuallyHookedFragments.map((fragment) =>
        fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
          ? appBuilderStandaloneFieldsetControlFragment(
              selection.suppliedInputs,
              { fieldName: selectedField.sourceModel.memberName },
              standaloneAccessibility.labelText!,
              fragment,
              standaloneAccessibility.describedByIds,
            )
          : fragment
      )
    : visuallyHookedFragments.map((fragment) =>
        appendVisualAttributesToTemplateElement(fragment, standaloneAccessibility.attributes)
      );
  return {
    partInvocation,
    partSourceLowering,
    accessibility: standaloneAccessibility,
    fragments: accessibleFragments,
    issues: [
      ...partIssues,
      ...standaloneAccessibility.issues,
    ],
  };
}

function emptyFieldControlAccessibilitySelection(): AppBuilderFieldControlAccessibilitySelection {
  return {
    labelText: null,
    labelTextSource: null,
    describedByIds: [],
    attributes: [],
    issues: [],
  };
}

function appendVisualAttributesToTemplateElement(
  fragment: AppBuilderPartSourceFragment,
  attributes: readonly AppBuilderSourceLoweringRawAttribute[],
): AppBuilderPartSourceFragment {
  return attributes.length === 0 || fragment.kind !== AppBuilderPartSourceFragmentKind.TemplateElement
    ? fragment
    : appendAppBuilderTemplateElementAttributes(fragment, attributes);
}

function appendVisualAttributesToTemplateElementDescendants(
  fragment: AppBuilderPartSourceFragment,
  tagName: string,
  attributes: readonly AppBuilderSourceLoweringRawAttribute[],
): AppBuilderPartSourceFragment {
  if (attributes.length === 0 || fragment.kind !== AppBuilderPartSourceFragmentKind.TemplateElement) {
    return fragment;
  }
  const templateElement = appendAttributesToTemplateElementDescendants(
    fragment.templateElement,
    tagName.toLowerCase(),
    attributes,
  );
  return {
    ...fragment,
    text: authoredTemplateElementSourceText(templateElement),
    templateElement,
  };
}

function appendAttributesToTemplateElementDescendants(
  source: AppBuilderTemplateElementSource,
  normalizedTagName: string,
  attributes: readonly AppBuilderSourceLoweringRawAttribute[],
): AppBuilderTemplateElementSource {
  return authoredTemplateElementSource(
    source.tagName,
    source.tagName.toLowerCase() === normalizedTagName
      ? normalizedAppBuilderTemplateElementAttributes([...source.attributes, ...attributes])
      : source.attributes,
    source.childText,
    (source.children ?? []).map((child) =>
      isAppBuilderTemplateElementSource(child)
        ? appendAttributesToTemplateElementDescendants(child, normalizedTagName, attributes)
        : child
    ),
  );
}

function isAppBuilderTemplateElementSource(
  source: AuthoredTemplateChildSource,
): source is AppBuilderTemplateElementSource {
  return 'tagName' in source;
}

function selectStandaloneFieldControlAccessibility(
  targetRef: AppBuilderOntologyRowRef,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderFieldControlAccessibilitySelection {
  const accessibilityInputs = sourceLoweringSuppliedInputs(request);
  const labelSelection = selectFieldControlLabel(
    targetRef,
    selectedField,
    appBuilderSourceLoweringAccessibilityLabelPayloads(accessibilityInputs),
    request,
    'Standalone field-control source lowering',
  );
  const describedByIds = standaloneFieldControlDescribedByIds(
    appBuilderSourceLoweringAccessibilityHelpErrorPayloads(accessibilityInputs),
  );
  return {
    labelText: labelSelection.text,
    labelTextSource: labelSelection.source,
    describedByIds,
    attributes: [
      ...optionalRawAttribute('aria-label', labelSelection.text),
      ...optionalRawAttribute('aria-describedby', describedByIds.length === 0 ? null : describedByIds.join(' ')),
    ],
    issues: labelSelection.issue == null ? [] : [labelSelection.issue],
  };
}

function lowerFieldGroupSourceInvocation(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  controlPattern: AppBuilderControlPatternRow,
): AppBuilderSourceLoweringInvocation {
  const selection = fieldGroupSelectionFrame(request, targetRef, controlPattern);
  if (
    selection.issues.length > 0
    || selection.selectedField == null
    || selection.controlId == null
    || selection.fieldControlLowering == null
    || selection.controlFragment == null
    || selection.labelText == null
    || selection.fieldControlId == null
  ) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      controlPattern,
      ...(selection.fieldControlLowering ?? {}),
      controlId: selection.controlId,
      selectedField: selection.selectedField,
      fieldSelectionState: selection.fieldSelectionState,
      innerControlPatternId: selection.innerControlPatternId,
      innerControlSelectionState: selection.innerControlSelectionState,
      labelText: selection.labelText,
      labelTextSource: selection.labelTextSource,
      fieldControlId: selection.fieldControlId,
      fieldControlIdSource: selection.fieldControlIdSource,
      issues: selection.issues,
    });
  }

  const readySelection = {
    ...selection,
    selectedField: selection.selectedField,
    controlId: selection.controlId,
    labelText: selection.labelText,
    fieldControlId: selection.fieldControlId,
    controlFragment: selection.controlFragment,
  };
  const rendered = fieldGroupRenderedFragments(readySelection);
  return sourceLoweringInvocationResult({
    targetRef,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    controlPattern,
    ...selection.fieldControlLowering,
    innerControlPatternId: selection.innerControlPatternId,
    innerControlSelectionState: selection.innerControlSelectionState,
    labelText: selection.labelText,
    labelTextSource: selection.labelTextSource,
    fieldControlId: selection.fieldControlId,
    fieldControlIdSource: selection.fieldControlIdSource,
    describedByIds: rendered.describedByIds,
    fragments: rendered.fragments,
    additionalSourceLoweringTargetRefs: rendered.additionalSourceLoweringTargetRefs,
    issues: [],
  });
}

function fieldGroupSelectionFrame(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  controlPattern: AppBuilderControlPatternRow,
): AppBuilderFieldGroupSelectionFrame {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const fields = appBuilderDomainFieldSourceModels(appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs), {
    valueSets: appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs),
  });
  if (fields.length === 0) {
    return {
      suppliedInputs,
      controlId: null,
      selectedField: null,
      fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
      fieldControlLowering: null,
      innerControlPatternId: null,
      innerControlSelectionState: AppBuilderSourceLoweringInnerControlSelectionState.NotEvaluated,
      labelText: null,
      labelTextSource: null,
      fieldControlId: null,
      fieldControlIdSource: null,
      controlFragment: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingDomainFieldsPayload,
        targetRef,
        summary: `Control pattern '${controlPattern.id}' needs a modeled domain-fields payload before source can wrap a real field.`,
      }],
    };
  }

  const innerControlSelection = selectFieldGroupInnerControl(targetRef, fields, request);
  if (innerControlSelection.issue != null || innerControlSelection.controlId == null || innerControlSelection.selectedField == null) {
    return {
      suppliedInputs,
      controlId: innerControlSelection.controlId,
      selectedField: null,
      fieldSelectionState: innerControlSelection.fieldSelectionState,
      fieldControlLowering: null,
      innerControlPatternId: innerControlSelection.controlPatternId,
      innerControlSelectionState: innerControlSelection.state,
      labelText: null,
      labelTextSource: null,
      fieldControlId: null,
      fieldControlIdSource: null,
      controlFragment: null,
      issues: innerControlSelection.issue == null ? [] : [innerControlSelection.issue],
    };
  }

  const selectedField: AppBuilderSourceLoweringSelectedDomainField = {
    field: innerControlSelection.selectedField.field,
    sourceModel: innerControlSelection.selectedField,
    selectionState: innerControlSelection.fieldSelectionState,
  };
  const fieldControlLowering = lowerFieldControlSourceForSelectedField(
    targetRef,
    innerControlSelection.controlId,
    selectedField,
    request,
    AppBuilderFieldControlAccessibilityMode.EmbeddedFieldGroupControl,
  );
  const selectionIssues = [...fieldControlLowering.issues];
  const controlFragment = fieldControlLowering.fragments.find((fragment) =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement
  ) ?? null;
  const controlIdSelection = selectFieldGroupControlId(selectedField, request);
  const labelSelection = selectFieldGroupLabel(targetRef, selectedField, appBuilderSourceLoweringAccessibilityLabelPayloads(suppliedInputs), request);
  selectionIssues.push(...optionalIssue(labelSelection.issue));
  if (controlFragment == null && fieldControlLowering.issues.length === 0) {
    selectionIssues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.PartSourceLoweringIssue,
      targetRef,
      summary: `Field group expected inner control '${innerControlSelection.controlId}' to produce a template-element fragment.`,
    });
  }
  return {
    suppliedInputs,
    controlId: innerControlSelection.controlId,
    selectedField,
    fieldSelectionState: innerControlSelection.fieldSelectionState,
    fieldControlLowering,
    innerControlPatternId: innerControlSelection.controlPatternId,
    innerControlSelectionState: innerControlSelection.state,
    labelText: labelSelection.text,
    labelTextSource: labelSelection.source,
    fieldControlId: controlIdSelection.value,
    fieldControlIdSource: controlIdSelection.source,
    controlFragment,
    issues: selectionIssues,
  };
}

function fieldGroupRenderedFragments(
  selection: AppBuilderFieldGroupSelectionFrame & {
    readonly selectedField: AppBuilderSourceLoweringSelectedDomainField;
    readonly controlId: AppBuilderControlId;
    readonly labelText: string;
    readonly fieldControlId: string;
    readonly controlFragment: AppBuilderTemplateElementPartSourceFragment;
  },
): AppBuilderFieldGroupRenderedFragments {
  const messageRows = fieldGroupMessageRows(
    fieldGroupAccessibilityMessages(
      appBuilderSourceLoweringAccessibilityHelpErrorPayloads(selection.suppliedInputs),
      selection.selectedField.sourceModel.memberName,
    ),
    selection.fieldControlId,
  );
  const describedByIds = messageRows.map((row) => row.messageId);
  const visualFilter = { fieldName: selection.selectedField.sourceModel.memberName };
  const messageFragments = messageRows.map((message) =>
    appBuilderTemplateElementFragment(
      'p',
      [
        ...messageAttributes(message.messageKind, message.messageId),
        ...appBuilderSourceLoweringVisualHookAttributes(
          selection.suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.FieldMessage,
          visualFilter,
        ),
      ],
      authoredTemplateTextContentText(message.text),
    )
  );
  const innerControl = appBuilderControlDescriptor(selection.controlId);
  const wrapperFragment = innerControl.fieldLabelContainerKind === AppBuilderControlFieldLabelContainerKind.FieldsetLegend
    ? appBuilderFieldsetGroupFragment(
      selection.suppliedInputs,
      visualFilter,
      selection.labelText,
      selection.controlFragment,
      messageFragments,
      describedByIds,
    )
    : appBuilderLabelledFieldGroupFragment(
      selection.suppliedInputs,
      visualFilter,
      selection.labelText,
      selection.fieldControlId,
      selection.controlFragment,
      messageFragments,
      describedByIds,
    );
  const formMessageTargetRef = appBuilderOntologyRowRef(
    AppBuilderOntologyRowKind.ControlPattern,
    AppBuilderControlPatternId.FormMessage,
  );
  return {
    describedByIds,
    fragments: [wrapperFragment],
    additionalSourceLoweringTargetRefs: messageRows.length === 0 ? [] : [formMessageTargetRef],
  };
}

function appBuilderLabelledFieldGroupFragment(
  accessibilityInputs: readonly AppBuilderSuppliedInput[],
  visualFilter: { readonly fieldName: string },
  labelText: string,
  controlId: string,
  controlFragment: AppBuilderTemplateElementPartSourceFragment,
  messageFragments: readonly AppBuilderTemplateElementPartSourceFragment[],
  describedByIds: readonly string[],
): AppBuilderTemplateElementPartSourceFragment {
  const controlWithRelationships = appendAppBuilderTemplateElementAttributes(controlFragment, [
    { rawName: 'id', rawValue: controlId },
    ...optionalRawAttribute('aria-describedby', describedByIds.length === 0 ? null : describedByIds.join(' ')),
  ]);
  const labelFragment = appBuilderTemplateElementFragment(
    'label',
    [
      { rawName: 'for', rawValue: controlId },
      ...appBuilderSourceLoweringVisualHookAttributes(
        accessibilityInputs,
        AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
        visualFilter,
      ),
    ],
    authoredTemplateTextContentText(labelText),
  );
  return appBuilderTemplateElementFragment('div', appBuilderSourceLoweringVisualHookAttributes(
    accessibilityInputs,
    AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
    visualFilter,
  ), null, [
    labelFragment.templateElement,
    controlWithRelationships.templateElement,
    ...messageFragments.map((fragment) => fragment.templateElement),
  ]);
}

function appBuilderStandaloneFieldsetControlFragment(
  accessibilityInputs: readonly AppBuilderSuppliedInput[],
  visualFilter: { readonly fieldName: string },
  labelText: string,
  controlFragment: AppBuilderTemplateElementPartSourceFragment,
  describedByIds: readonly string[],
): AppBuilderTemplateElementPartSourceFragment {
  const legendFragment = appBuilderTemplateElementFragment(
    'legend',
    appBuilderSourceLoweringVisualHookAttributes(
      accessibilityInputs,
      AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
      visualFilter,
    ),
    authoredTemplateTextContentText(labelText),
  );
  return appBuilderTemplateElementFragment('fieldset', [
    ...optionalRawAttribute('aria-describedby', describedByIds.length === 0 ? null : describedByIds.join(' ')),
  ], null, [
    legendFragment.templateElement,
    controlFragment.templateElement,
  ]);
}

function appBuilderFieldsetGroupFragment(
  accessibilityInputs: readonly AppBuilderSuppliedInput[],
  visualFilter: { readonly fieldName: string },
  labelText: string,
  controlFragment: AppBuilderTemplateElementPartSourceFragment,
  messageFragments: readonly AppBuilderTemplateElementPartSourceFragment[],
  describedByIds: readonly string[],
): AppBuilderTemplateElementPartSourceFragment {
  const legendFragment = appBuilderTemplateElementFragment(
    'legend',
    appBuilderSourceLoweringVisualHookAttributes(
      accessibilityInputs,
      AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
      visualFilter,
    ),
    authoredTemplateTextContentText(labelText),
  );
  return appBuilderTemplateElementFragment('fieldset', [
    ...appBuilderSourceLoweringVisualHookAttributes(
      accessibilityInputs,
      AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
      visualFilter,
    ),
    ...optionalRawAttribute('aria-describedby', describedByIds.length === 0 ? null : describedByIds.join(' ')),
  ], null, [
    legendFragment.templateElement,
    controlFragment.templateElement,
    ...messageFragments.map((fragment) => fragment.templateElement),
  ]);
}

function selectFieldGroupInnerControl(
  targetRef: AppBuilderOntologyRowRef,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  request: AppBuilderSourceLoweringInvocationRequest,
): {
  readonly controlPatternId: AppBuilderControlPatternId | null;
  readonly controlId: AppBuilderControlId | null;
  readonly selectedField: AppBuilderDomainFieldSourceModel | null;
  readonly fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState;
  readonly state: AppBuilderSourceLoweringInnerControlSelectionState;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const requestedInnerControlPatternId = normalizedSourceLoweringSelectorInput(request.innerControlPatternId);
  if (requestedInnerControlPatternId != null) {
    const controlPattern = APP_BUILDER_CONTROL_PATTERN_ROWS.find((row) => row.id === requestedInnerControlPatternId) ?? null;
    if (controlPattern == null) {
      return {
        controlPatternId: null,
        controlId: null,
        selectedField: null,
        fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
        state: AppBuilderSourceLoweringInnerControlSelectionState.ExplicitInnerControlPattern,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownInnerControlPattern,
          targetRef,
          requestedInnerControlPatternId,
          summary: `Field group source lowering does not know inner control pattern '${requestedInnerControlPatternId}'.`,
        },
      };
    }
    const controlId = appBuilderLeafControlIdForControlPatternId(controlPattern.id);
    if (controlId == null) {
      return {
        controlPatternId: controlPattern.id,
        controlId: null,
        selectedField: null,
        fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
        state: AppBuilderSourceLoweringInnerControlSelectionState.ExplicitInnerControlPattern,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnsupportedInnerControlPattern,
          targetRef,
          controlPatternIds: [controlPattern.id],
          summary: `Field group source lowering cannot use inner control pattern '${controlPattern.id}' because it is not a source-lowering-implemented field control lowerer.`,
        },
      };
    }
    const fieldSelection = selectDomainFieldForControl(controlId, fields, request);
    return {
      controlPatternId: controlPattern.id,
      controlId,
      selectedField: fieldSelection.selectedField,
      fieldSelectionState: fieldSelection.state,
      state: AppBuilderSourceLoweringInnerControlSelectionState.ExplicitInnerControlPattern,
      issue: fieldSelection.issue,
    };
  }

  const fieldSelection = selectAnyDomainField(fields, request.fieldName);
  if (fieldSelection.issue != null || fieldSelection.selectedField == null) {
    return {
      controlPatternId: null,
      controlId: null,
      selectedField: null,
      fieldSelectionState: fieldSelection.state,
      state: AppBuilderSourceLoweringInnerControlSelectionState.SelectedFieldValueKind,
      issue: fieldSelection.issue,
    };
  }
  const controlId = fieldSelection.selectedField.controlId;
  const controlPatternId = appBuilderControlPatternIdForLeafControlId(controlId);
  return {
    controlPatternId,
    controlId,
    selectedField: fieldSelection.selectedField,
    fieldSelectionState: fieldSelection.state,
    state: AppBuilderSourceLoweringInnerControlSelectionState.SelectedFieldValueKind,
    issue: null,
  };
}

function selectAnyDomainField(
  fields: readonly AppBuilderDomainFieldSourceModel[],
  requestedFieldName: string | null | undefined,
): {
  readonly state: AppBuilderSourceLoweringFieldSelectionState;
  readonly selectedField: AppBuilderDomainFieldSourceModel | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const requestedName = normalizedSourceInputText(requestedFieldName);
  if (requestedName != null) {
    const selectedField = fields.find((field) => field.memberName === requestedName) ?? null;
    if (selectedField == null) {
      return {
        state: AppBuilderSourceLoweringFieldSelectionState.UnknownRequestedField,
        selectedField: null,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedField,
          fieldNames: [requestedName],
          summary: `Requested field '${requestedName}' is not present in the supplied domain-fields payload.`,
        },
      };
    }
    return {
      state: AppBuilderSourceLoweringFieldSelectionState.ExplicitFieldName,
      selectedField,
      issue: null,
    };
  }
  if (fields.length === 0) {
    return {
      state: AppBuilderSourceLoweringFieldSelectionState.NoCompatibleField,
      selectedField: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.NoCompatibleDomainField,
        summary: 'No supplied domain field is available for field-group source lowering.',
      },
    };
  }
  if (fields.length > 1) {
    return {
      state: AppBuilderSourceLoweringFieldSelectionState.AmbiguousCompatibleField,
      selectedField: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainField,
        fieldNames: fields.map((field) => field.memberName),
        summary: `Field group source lowering has ${fields.length} candidate fields; supply fieldName to choose one: ${fields.map((field) => field.memberName).join(', ')}.`,
      },
    };
  }
  return {
    state: AppBuilderSourceLoweringFieldSelectionState.SingleCompatibleField,
    selectedField: fields[0]!,
    issue: null,
  };
}

function selectFieldGroupLabel(
  targetRef: AppBuilderOntologyRowRef,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  accessibilityLabels: readonly AppBuilderSourceLoweringAccessibilityLabelsPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderFieldGroupLabelSelection {
  return selectFieldControlLabel(
    targetRef,
    selectedField,
    accessibilityLabels,
    request,
    'Field group source lowering',
  );
}

function selectFieldControlLabel(
  targetRef: AppBuilderOntologyRowRef,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  accessibilityLabels: readonly AppBuilderSourceLoweringAccessibilityLabelsPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
  sourceLabel: string,
): AppBuilderFieldGroupLabelSelection {
  const explicitText = normalizedSourceInputText(request.labelText);
  if (explicitText != null) {
    return {
      text: explicitText,
      source: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
      issue: null,
    };
  }
  const labels = accessibilityLabels
    .map((row) => normalizedSourceInputText(row.label))
    .filter((value): value is string => value != null);
  if (labels.length === 1) {
    return {
      text: labels[0]!,
      source: AppBuilderSourceLoweringLabelTextSource.AccessibilityLabelPayload,
      issue: null,
    };
  }
  if (labels.length > 1) {
    return {
      text: null,
      source: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousLabelText,
        targetRef,
        fieldNames: [selectedField.sourceModel.memberName],
        summary: `${sourceLabel} saw ${labels.length} accessibility labels; supply labelText to choose one.`,
      },
    };
  }
  const fieldTitle = normalizedSourceInputText(selectedField.field.title);
  if (fieldTitle != null) {
    return {
      text: fieldTitle,
      source: AppBuilderSourceLoweringLabelTextSource.SelectedFieldTitle,
      issue: null,
    };
  }
  return {
    text: null,
    source: null,
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingLabelText,
      targetRef,
      fieldNames: [selectedField.sourceModel.memberName],
      summary: `${sourceLabel} needs labelText, one accessibility label, or a non-empty title on field '${selectedField.sourceModel.memberName}'.`,
    },
  };
}

function standaloneFieldControlDescribedByIds(
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
): readonly string[] {
  return uniqueStrings(helpErrorPayloads.flatMap((payload) => [
    normalizedSourceInputText(payload.helpId),
    normalizedSourceInputText(payload.errorId),
    normalizedSourceInputText(payload.statusId),
  ].filter((value): value is string => value != null)));
}

function selectFieldGroupControlId(
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderFieldGroupControlIdSelection {
  const explicitId = normalizedSourceInputText(request.fieldControlId);
  if (explicitId != null) {
    return {
      value: explicitId,
      source: AppBuilderSourceLoweringFieldControlIdSource.ExplicitRequest,
    };
  }
  const baseId = `${appBuilderKebabCase(selectedField.sourceModel.memberName)}-field`;
  return {
    value: request.emissionContext?.allocateDomId(baseId) ?? baseId,
    source: AppBuilderSourceLoweringFieldControlIdSource.SelectedFieldName,
  };
}

function fieldGroupMessageRows(
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
  fieldControlId: string,
): readonly AppBuilderFieldGroupMessageRow[] {
  return messageCandidates(helpErrorPayloads).map((candidate) => ({
    messageKind: candidate.kind,
    text: candidate.text,
    messageId: candidate.id ?? `${fieldControlId}-${candidate.kind}`,
  }));
}

function fieldGroupAccessibilityMessages(
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
  fieldName: string,
): readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[] {
  return helpErrorPayloads.filter((payload) =>
    payload.fieldName == null || payload.fieldName === fieldName
  );
}

function lowerDomainCommandActionSourceInvocation(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
): AppBuilderSourceLoweringInvocation {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  if (actions.length === 0) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingDomainActionsPayload,
        targetRef,
        summary: 'Domain command action source lowering needs a modeled domain-actions payload before it can emit a class member.',
      }],
    });
  }

  const actionSelection = selectExplicitDomainAction(actions, request.actionName, targetRef);
  const methodParameters = selectTypeScriptMethodParameters(request.methodParameters, targetRef);
  const explicitMethodBodyStatements = normalizedSourceInputText(request.methodBodyStatements);
  const queryStateEffect = explicitMethodBodyStatements == null
    ? selectServiceQueryStateEffectForCommand(request, targetRef)
    : { value: null, issues: [] };
  const serviceCall = explicitMethodBodyStatements == null
    ? selectServiceCallForCommand(request, targetRef)
    : { value: null, issues: [] };
  const actionFeedback = explicitMethodBodyStatements == null && actionSelection.selectedAction != null
    ? selectActionFeedbackForCommand(targetRef, actionSelection.selectedAction, suppliedInputs)
    : { value: null, issues: [] };
  const derivedMethodBodyStatements = explicitMethodBodyStatements == null && actionSelection.selectedAction != null
    ? derivedDomainCommandActionMethodBodyStatements(
        actionSelection.selectedAction,
        methodParameters.parameters,
        suppliedInputs,
        actionFeedback.value,
        queryStateEffect.value,
        serviceCall.value,
      )
    : null;
  const methodBodyStatements = explicitMethodBodyStatements ?? derivedMethodBodyStatements;
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [
    ...optionalIssue(actionSelection.issue),
    ...methodParameters.issues,
    ...queryStateEffect.issues,
    ...serviceCall.issues,
    ...actionFeedback.issues,
  ];
  if (methodBodyStatements == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingMethodBodyStatements,
      targetRef,
      actionNames: actionSelection.selectedAction == null ? actions.map((action) => action.name) : [actionSelection.selectedAction.name],
      summary: 'Domain command action source lowering needs explicit methodBodyStatements unless the selected action is a narrow first-ring local create or entity-complete action with complete domain and local-collection input.',
    });
  }
  if (actionSelection.selectedAction != null && !appBuilderIsTypeScriptIdentifier(actionSelection.selectedAction.name)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidActionMethodName,
      targetRef,
      actionNames: [actionSelection.selectedAction.name],
      summary: `Domain action '${actionSelection.selectedAction.name}' cannot be emitted as a TypeScript class method; choose an identifier-safe action name before source lowering.`,
    });
  }
  const selectedAction = actionSelection.selectedAction == null
    ? null
    : {
        action: actionSelection.selectedAction,
        selectionState: actionSelection.state,
      };
  if (issues.length > 0 || selectedAction == null || methodBodyStatements == null) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      selectedAction,
      actionSelectionState: actionSelection.state,
      methodParameters: methodParameters.parameters,
      serviceMemberName: serviceCall.value?.serviceMemberName ?? null,
      serviceMethodName: serviceCall.value?.serviceMethodName ?? null,
      serviceCallResultMemberName: serviceCall.value?.resultMemberName ?? null,
      serviceCallArgumentExpressions: serviceCall.value?.argumentExpressions ?? [],
      serviceQueryStateMemberName: queryStateEffect.value?.stateMemberName ?? null,
      serviceQueryStateValueExpression: queryStateEffect.value?.valueExpression ?? null,
      serviceQueryReloadMethodName: queryStateEffect.value?.reloadMethodName ?? null,
      serviceCallRefreshMethodName: serviceCall.value?.refreshMethodName ?? null,
      issues,
    });
  }

  return sourceLoweringInvocationResult({
    targetRef,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    selectedAction,
    actionSelectionState: actionSelection.state,
    methodParameters: methodParameters.parameters,
    serviceMemberName: serviceCall.value?.serviceMemberName ?? null,
    serviceMethodName: serviceCall.value?.serviceMethodName ?? null,
    serviceCallResultMemberName: serviceCall.value?.resultMemberName ?? null,
    serviceCallArgumentExpressions: serviceCall.value?.argumentExpressions ?? [],
    serviceQueryStateMemberName: queryStateEffect.value?.stateMemberName ?? null,
    serviceQueryStateValueExpression: queryStateEffect.value?.valueExpression ?? null,
    serviceQueryReloadMethodName: queryStateEffect.value?.reloadMethodName ?? null,
    serviceCallRefreshMethodName: serviceCall.value?.refreshMethodName ?? null,
    fragments: [{
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: domainCommandActionMethodSourceText(selectedAction.action.name, methodParameters.parameters, methodBodyStatements, {
        isAsync: serviceCall.value?.refreshMethodName != null,
      }),
      requiredImports: [],
    }],
    issues: [],
  });
}

function lowerRouteNavigationActionSourceInvocation(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
): AppBuilderSourceLoweringInvocation {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  if (actions.length === 0) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingDomainActionsPayload,
        targetRef,
        summary: 'Route-navigation action source lowering needs a modeled domain-actions payload before it can emit router source.',
      }],
    });
  }

  const selection = selectRouteNavigationActionSource(request, targetRef, actions);
  if (!selection.ready) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      selectedAction: selection.selectedAction,
      actionSelectionState: selection.actionSelectionState,
      routeInstruction: selection.routeInstruction,
      routeParamsExpression: selection.routeParamsExpression,
      routeContextExpression: selection.routeContextExpression,
      routeActiveExpression: selection.routeActiveExpression,
      routeTargetAttributeName: selection.routeTargetAttributeName,
      linkText: selection.linkText,
      issues: selection.issues,
    });
  }

  const partInvocation = routeNavigationLoadPartInvocation(selection);
  const partSourceLowering = lowerAppBuilderPartSourceInvocation(partInvocation);
  const partIssues = partSourceLowering.issues.map((issue): AppBuilderSourceLoweringInvocationIssue => ({
    issueKind: AppBuilderSourceLoweringInvocationIssueKind.PartSourceLoweringIssue,
    targetRef,
    actionNames: [selection.selectedAction.action.name],
    routeInstructions: [selection.routeInstruction],
    partSourceLoweringIssue: issue,
    summary: issue.summary,
  }));
  const loadAttributeFragment = partSourceLowering.fragments.find((fragment) =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateAttribute
  ) ?? null;
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [...partIssues];
  if (loadAttributeFragment == null && partIssues.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.PartSourceLoweringIssue,
      targetRef,
      actionNames: [selection.selectedAction.action.name],
      routeInstructions: [selection.routeInstruction],
      summary: 'Route-navigation action expected the router load part to produce a template-attribute fragment.',
    });
  }
  const fragments = loadAttributeFragment == null || issues.length > 0
    ? []
    : [appBuilderTemplateElementFragment(
        'a',
        [loadAttributeFragment.templateAttribute],
        authoredTemplateTextContentText(selection.linkText),
      )];
  const routeNavigationControlUseInventoryRows = appBuilderControlUseInventoryRowsForInvocation({
    targetRef,
    fragments,
    controlPatternId: AppBuilderControlPatternId.NativeLinkNavigation,
    controlId: null,
    actionName: selection.selectedAction.action.name,
    actionChannelKind: AppBuilderControlUseActionChannelKind.RouterLoadNavigation,
    routeInstruction: loadAttributeFragment == null
      ? selection.routeInstruction
      : loadAttributeFragment.templateAttribute.rawValue ?? authoredTemplateAttributeText(loadAttributeFragment.templateAttribute),
    linkText: selection.linkText,
    labelText: selection.linkText,
  });

  return sourceLoweringInvocationResult({
    targetRef,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    selectedAction: selection.selectedAction,
    actionSelectionState: selection.actionSelectionState,
    routeInstruction: selection.routeInstruction,
    routeParamsExpression: selection.routeParamsExpression,
    routeContextExpression: selection.routeContextExpression,
    routeActiveExpression: selection.routeActiveExpression,
    routeTargetAttributeName: selection.routeTargetAttributeName,
    linkText: selection.linkText,
    partInvocation,
    partSourceLowering,
    fragments,
    additionalControlUseInventoryRows: routeNavigationControlUseInventoryRows,
    issues,
  });
}

function selectRouteNavigationActionSource(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  actions: readonly AppBuilderDomainActionDescriptor[],
): AppBuilderRouteNavigationActionSelectionFrame {
  const actionSelection = selectExplicitDomainAction(actions, request.actionName, targetRef);
  const selectedAction = actionSelection.selectedAction == null
    ? null
    : {
        action: actionSelection.selectedAction,
        selectionState: actionSelection.state,
      };
  const routeInstruction = normalizedSourceInputText(request.routeInstruction);
  const routeParamsExpression = normalizedSourceInputText(request.routeParamsExpression);
  const routeContextExpression = normalizedSourceInputText(request.routeContextExpression);
  const routeActiveExpression = normalizedSourceInputText(request.routeActiveExpression);
  const routeTargetAttributeName = normalizedSourceInputText(request.routeTargetAttributeName);
  const linkText = normalizedSourceInputText(request.linkText);
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [...optionalIssue(actionSelection.issue)];

  if (selectedAction != null && selectedAction.action.scope !== AppBuilderDomainActionScope.Navigation) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.IncompatibleNavigationAction,
      targetRef,
      actionNames: [selectedAction.action.name],
      summary: `Route-navigation action source lowering needs action '${selectedAction.action.name}' to have scope '${AppBuilderDomainActionScope.Navigation}'.`,
    });
  }
  if (routeInstruction == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingRouteInstruction,
      targetRef,
      actionNames: selectedAction == null ? [] : [selectedAction.action.name],
      summary: 'Route-navigation action source lowering needs routeInstruction; app-builder will not invent route names or topology.',
    });
  }
  if (linkText == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingLinkText,
      targetRef,
      actionNames: selectedAction == null ? [] : [selectedAction.action.name],
      routeInstructions: routeInstruction == null ? [] : [routeInstruction],
      summary: 'Route-navigation action source lowering needs explicit linkText; app-builder will not invent visible copy.',
    });
  }

  if (issues.length > 0 || selectedAction == null || routeInstruction == null || linkText == null) {
    return {
      ready: false,
      selectedAction,
      actionSelectionState: actionSelection.state,
      routeInstruction,
      routeParamsExpression,
      routeContextExpression,
      routeActiveExpression,
      routeTargetAttributeName,
      linkText,
      issues,
    };
  }

  return {
    ready: true,
    selectedAction,
    actionSelectionState: actionSelection.state,
    routeInstruction,
    routeParamsExpression,
    routeContextExpression,
    routeActiveExpression,
    routeTargetAttributeName,
    linkText,
    issues: [],
  };
}

function routeNavigationLoadPartInvocation(
  selection: AppBuilderRouteNavigationActionReadySelectionFrame,
): AppBuilderPartSourceInvocation {
  const optionalSlots: AppBuilderPartSlotAssignment[] = [];
  if (selection.routeParamsExpression != null) {
    optionalSlots.push({ slotKind: AppBuilderPartSlotKind.RouteParamsExpression, value: selection.routeParamsExpression });
  }
  if (selection.routeContextExpression != null) {
    optionalSlots.push({ slotKind: AppBuilderPartSlotKind.RouteContextExpression, value: selection.routeContextExpression });
  }
  if (selection.routeActiveExpression != null) {
    optionalSlots.push({ slotKind: AppBuilderPartSlotKind.RouteActiveExpression, value: selection.routeActiveExpression });
  }
  if (selection.routeTargetAttributeName != null) {
    optionalSlots.push({ slotKind: AppBuilderPartSlotKind.RouteTargetAttributeName, value: selection.routeTargetAttributeName });
  }
  return {
    partKind: AppBuilderPartKind.FrameworkComponent,
    partId: AppBuilderFrameworkComponentId.Load,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.RouteInstruction, value: selection.routeInstruction },
      ...optionalSlots,
    ],
  };
}

function lowerAsyncDataSourceInvocation(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
): AppBuilderSourceLoweringInvocation {
  const memberName = normalizedSourceInputText(request.asyncDataMemberName);
  const promiseType = normalizedSourceInputText(request.asyncDataPromiseType);
  const initializerExpression = normalizedSourceInputText(request.asyncDataInitializerExpression);
  const requestedMutability = normalizedSourceInputText(request.asyncDataMemberMutability);
  const memberMutability = requestedMutability ?? AppBuilderSourceLoweringAsyncDataMemberMutability.Readonly;
  const selectedMutability = APP_BUILDER_SOURCE_LOWERING_ASYNC_DATA_MEMBER_MUTABILITIES.includes(memberMutability as AppBuilderSourceLoweringAsyncDataMemberMutability)
    ? memberMutability as AppBuilderSourceLoweringAsyncDataMemberMutability
    : null;
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [];

  if (memberName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingAsyncDataMemberName,
      targetRef,
      summary: 'Async data-source source lowering needs explicit asyncDataMemberName so the template can bind to a stable promise-valued member.',
    });
  } else if (!appBuilderIsTypeScriptIdentifier(memberName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidAsyncDataMemberName,
      targetRef,
      asyncDataMemberNames: [memberName],
      summary: `Async data-source member name '${memberName}' is not a TypeScript identifier.`,
    });
  }

  if (promiseType == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingAsyncDataPromiseType,
      targetRef,
      asyncDataMemberNames: memberName == null ? [] : [memberName],
      summary: 'Async data-source source lowering needs explicit asyncDataPromiseType so the emitted member remains type-checkable.',
    });
  }

  if (initializerExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingAsyncDataInitializerExpression,
      targetRef,
      asyncDataMemberNames: memberName == null ? [] : [memberName],
      summary: 'Async data-source source lowering needs explicit asyncDataInitializerExpression; app-builder will not invent fetching or loading behavior.',
    });
  }

  if (selectedMutability == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownAsyncDataMemberMutability,
      targetRef,
      asyncDataMemberNames: memberName == null ? [] : [memberName],
      requestedAsyncDataMemberMutability: requestedMutability,
      summary: `Async data-source member mutability '${requestedMutability}' is outside the source-lowering vocabulary.`,
    });
  }

  if (issues.length > 0 || memberName == null || promiseType == null || initializerExpression == null || selectedMutability == null) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      asyncDataMemberName: memberName,
      asyncDataPromiseType: promiseType,
      asyncDataInitializerExpression: initializerExpression,
      asyncDataMemberMutability: selectedMutability,
      issues,
    });
  }

  return sourceLoweringInvocationResult({
    targetRef,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    asyncDataMemberName: memberName,
    asyncDataPromiseType: promiseType,
    asyncDataInitializerExpression: initializerExpression,
    asyncDataMemberMutability: selectedMutability,
    fragments: [{
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: asyncDataSourceMemberSourceText(memberName, promiseType, initializerExpression, selectedMutability),
      requiredImports: [],
    }],
    issues: [],
  });
}

function lowerNativeButtonSourceInvocation(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  controlPattern: AppBuilderControlPatternRow,
): AppBuilderSourceLoweringInvocation {
  const selection = nativeButtonSelectionFrame(request, targetRef, controlPattern);
  if (!selection.ready) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      controlPattern,
      selectedAction: selection.selectedAction,
      actionSelectionState: selection.actionSelectionState,
      handlerExpression: selection.handlerExpression,
      handlerExpressionSource: selection.handlerExpressionSource,
      eventName: selection.eventName,
      buttonText: selection.buttonText,
      buttonType: selection.buttonType,
      issues: selection.issues,
    });
  }

  const rendered = nativeButtonRenderedFrame(targetRef, selection);
  return sourceLoweringInvocationResult({
    targetRef,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    controlPattern,
    selectedAction: selection.selectedAction,
    actionSelectionState: selection.actionSelectionState,
    handlerExpression: selection.handlerExpression,
    handlerExpressionSource: selection.handlerExpressionSource,
    eventName: selection.eventName,
    buttonText: selection.buttonText,
    buttonType: selection.buttonType,
    partInvocation: rendered.partInvocation,
    partSourceLowering: rendered.partSourceLowering,
    fragments: rendered.fragments,
    issues: rendered.issues,
  });
}

function nativeButtonSelectionFrame(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  controlPattern: AppBuilderControlPatternRow,
): AppBuilderNativeButtonSelectionFrame {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  if (actions.length === 0) {
    return {
      ready: false,
      suppliedInputs,
      selectedAction: null,
      actionSelectionState: AppBuilderSourceLoweringActionSelectionState.NoCompatibleAction,
      handlerExpression: null,
      handlerExpressionSource: null,
      eventName: null,
      buttonText: null,
      buttonType: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingDomainActionsPayload,
        targetRef,
        summary: `Control pattern '${controlPattern.id}' needs a modeled domain-actions payload before source can bind a real action.`,
      }],
    };
  }

  const actionSelection = selectDomainAction(actions, request.actionName);
  if (actionSelection.issue != null || actionSelection.selectedAction == null) {
    return {
      ready: false,
      suppliedInputs,
      selectedAction: null,
      actionSelectionState: actionSelection.state,
      handlerExpression: null,
      handlerExpressionSource: null,
      eventName: null,
      buttonText: null,
      buttonType: null,
      issues: actionSelection.issue == null ? [] : [actionSelection.issue],
    };
  }

  const selectedAction: AppBuilderSourceLoweringSelectedDomainAction = {
    action: actionSelection.selectedAction,
    selectionState: actionSelection.state,
  };
  const handlerSelection = selectHandlerExpression(targetRef, selectedAction, request);
  const buttonTextSelection = selectButtonText(
    targetRef,
    selectedAction,
    appBuilderSourceLoweringAccessibilityLabelPayloads(suppliedInputs),
    request,
  );
  const buttonTypeSelection = selectButtonType(targetRef, request);
  const issues = [
    ...optionalIssue(handlerSelection.issue),
    ...optionalIssue(buttonTextSelection.issue),
    ...optionalIssue(buttonTypeSelection.issue),
  ];
  if (issues.length > 0
    || handlerSelection.expression == null
    || handlerSelection.source == null
    || buttonTextSelection.text == null
    || buttonTypeSelection.buttonType == null) {
    return {
      ready: false,
      suppliedInputs,
      selectedAction,
      actionSelectionState: actionSelection.state,
      handlerExpression: handlerSelection.expression,
      handlerExpressionSource: handlerSelection.source,
      eventName: handlerSelection.eventName,
      buttonText: buttonTextSelection.text,
      buttonType: buttonTypeSelection.buttonType,
      issues,
    };
  }
  return {
    ready: true,
    suppliedInputs,
    selectedAction,
    actionSelectionState: actionSelection.state,
    handlerExpression: handlerSelection.expression,
    handlerExpressionSource: handlerSelection.source,
    eventName: handlerSelection.eventName,
    buttonText: buttonTextSelection.text,
    buttonType: buttonTypeSelection.buttonType,
    issues: [],
  };
}

function nativeButtonRenderedFrame(
  targetRef: AppBuilderOntologyRowRef,
  selection: AppBuilderNativeButtonReadySelectionFrame,
): AppBuilderNativeButtonRenderedFrame {
  const partInvocation: AppBuilderPartSourceInvocation = {
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.EventListener,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.EventName, value: selection.eventName },
      { slotKind: AppBuilderPartSlotKind.HandlerExpression, value: selection.handlerExpression },
    ],
  };
  const partSourceLowering = lowerAppBuilderPartSourceInvocation(partInvocation);
  const eventAttributeFragment = partSourceLowering.fragments.find((fragment) =>
    fragment.kind === AppBuilderPartSourceFragmentKind.TemplateAttribute
  );
  const partIssues = partSourceLowering.issues.map((issue): AppBuilderSourceLoweringInvocationIssue => ({
    issueKind: AppBuilderSourceLoweringInvocationIssueKind.PartSourceLoweringIssue,
    targetRef,
    actionNames: [selection.selectedAction.action.name],
    partSourceLoweringIssue: issue,
    summary: issue.summary,
  }));
  const fragments = eventAttributeFragment?.templateAttribute == null || partIssues.length > 0
    ? []
    : [appBuilderTemplateElementFragment(
      'button',
      [
        { rawName: 'type', rawValue: selection.buttonType },
        eventAttributeFragment.templateAttribute,
        ...appBuilderSourceLoweringVisualHookAttributes(
          selection.suppliedInputs,
          AppBuilderSourceLoweringVisualHookTarget.Button,
          { actionName: selection.selectedAction.action.name },
        ),
      ],
      authoredTemplateTextContentText(selection.buttonText),
    )];
  return {
    partInvocation,
    partSourceLowering,
    fragments,
    issues: partIssues,
  };
}

function sourceLoweringSuppliedInputs(
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderSuppliedInput[] {
  const targetRef = request.targetRef ?? null;
  return targetRef == null
    ? appBuilderSuppliedInputsWithDecisionBundles(
        sourceLoweringExplicitSuppliedInputs(request),
        request.decisionBundles,
      )
    : appBuilderSuppliedInputsWithDecisionBundlesForTarget(
        sourceLoweringExplicitSuppliedInputs(request),
        request.decisionBundles,
        targetRef,
      );
}

function sourceLoweringExplicitSuppliedInputs(
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderSuppliedInput[] {
  const suppliedInputs = request.suppliedInputs ?? [];
  const directInputs = directSourceLoweringSuppliedInputs(request);
  return directInputs.length === 0 ? suppliedInputs : [...suppliedInputs, ...directInputs];
}

function directSourceLoweringSuppliedInputs(
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderSuppliedInput[] {
  const facetPayloads = [
    ...directButtonAccessibilityPayloads(request),
    ...directLabelAccessibilityPayloads(request),
    ...directMessageAccessibilityPayloads(request),
  ];
  if (facetPayloads.length === 0) {
    return [];
  }
  return [{
    inputContractId: AppBuilderInputContractId.ControlAccessibility,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    ...(request.targetRef == null ? {} : { targetRefs: [request.targetRef] }),
    facetPayloads,
    label: 'Direct source-lowering accessibility input',
    summary: 'Accessibility facts derived from source-lowering invocation fields such as buttonText, labelText, messageKind, messageText, or messageId.',
  }];
}

function directButtonAccessibilityPayloads(
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderSuppliedInputFacetPayload[] {
  const buttonText = normalizedSourceInputText(request.buttonText);
  if (buttonText == null) {
    return [];
  }
  return [{
    inputFacetId: AppBuilderInputFacetId.AccessibilityLabels,
    value: { label: buttonText },
    label: 'Button Text',
    summary: 'Direct buttonText request field treated as an explicit accessibility label for preflight gating.',
  }];
}

function directLabelAccessibilityPayloads(
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderSuppliedInputFacetPayload[] {
  const labelText = normalizedSourceInputText(request.labelText);
  if (labelText == null) {
    return [];
  }
  return [{
    inputFacetId: AppBuilderInputFacetId.AccessibilityLabels,
    value: { label: labelText },
    label: 'Label Text',
    summary: 'Direct labelText request field treated as an explicit accessibility label for preflight gating.',
  }];
}

function directMessageAccessibilityPayloads(
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderSuppliedInputFacetPayload[] {
  const messageKindText = normalizedSourceLoweringSelectorInput(request.messageKind);
  const messageText = normalizedSourceInputText(request.messageText);
  if (messageKindText == null || messageText == null) {
    return [];
  }
  const messageKind = sourceLoweringMessageKind(messageKindText);
  if (messageKind == null) {
    return [];
  }
  return [{
    inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
    value: accessibilityHelpErrorPayloadForMessage(messageKind, messageText, normalizedSourceInputText(request.messageId)),
    label: 'Message Text',
    summary: 'Direct messageKind/messageText request fields treated as explicit accessibility help/error/status input for preflight gating.',
  }];
}

function accessibilityHelpErrorPayloadForMessage(
  messageKind: AppBuilderSourceLoweringMessageKind,
  messageText: string,
  messageId: string | null,
): AppBuilderSourceLoweringAccessibilityHelpErrorPayload {
  const descriptor = messageDescriptorForKind(messageKind);
  return {
    [descriptor.textFieldName]: messageText,
    ...(messageId == null ? {} : { [descriptor.idFieldName]: messageId }),
  };
}

function lowerFormMessageSourceInvocation(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
  preflight: AppBuilderSourceLoweringPreflight,
  preflightRow: AppBuilderSourceLoweringPreflightRow,
  controlPattern: AppBuilderControlPatternRow,
): AppBuilderSourceLoweringInvocation {
  const suppliedInputs = sourceLoweringSuppliedInputs(request);
  const messageSelection = selectAccessibilityMessage(
    targetRef,
    appBuilderSourceLoweringAccessibilityHelpErrorPayloads(suppliedInputs),
    request,
  );
  if (messageSelection.issue != null || messageSelection.messageKind == null || messageSelection.text == null) {
    return sourceLoweringInvocationResult({
      targetRef,
      preflightRow,
      preflight: request.includePreflight === true ? preflight : undefined,
      controlPattern,
      messageKind: messageSelection.messageKind,
      messageSelectionState: messageSelection.selectionState,
      messageText: messageSelection.text,
      messageTextSource: messageSelection.textSource,
      messageId: messageSelection.messageId,
      issues: messageSelection.issue == null ? [] : [messageSelection.issue],
    });
  }

  const fragments = [appBuilderTemplateElementFragment(
    'p',
    [
      ...messageAttributes(messageSelection.messageKind, messageSelection.messageId),
      ...appBuilderSourceLoweringVisualHookAttributes(
        suppliedInputs,
        AppBuilderSourceLoweringVisualHookTarget.FieldMessage,
      ),
    ],
    authoredTemplateTextContentText(messageSelection.text),
  )];
  return sourceLoweringInvocationResult({
    targetRef,
    preflightRow,
    preflight: request.includePreflight === true ? preflight : undefined,
    controlPattern,
    messageKind: messageSelection.messageKind,
    messageSelectionState: messageSelection.selectionState,
    messageText: messageSelection.text,
    messageTextSource: messageSelection.textSource,
    messageId: messageSelection.messageId,
    fragments,
    issues: [],
  });
}

function optionalIssue(
  issue: AppBuilderSourceLoweringInvocationIssue | null,
): readonly AppBuilderSourceLoweringInvocationIssue[] {
  return issue == null ? [] : [issue];
}

function selectDomainAction(
  actions: readonly AppBuilderDomainActionDescriptor[],
  requestedActionName: string | null | undefined,
): {
  readonly state: AppBuilderSourceLoweringActionSelectionState;
  readonly selectedAction: AppBuilderDomainActionDescriptor | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const requestedName = normalizedSourceInputText(requestedActionName);
  if (requestedName != null) {
    const selectedAction = actions.find((action) => action.name === requestedName) ?? null;
    if (selectedAction == null) {
      return {
        state: AppBuilderSourceLoweringActionSelectionState.UnknownRequestedAction,
        selectedAction: null,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedAction,
          actionNames: [requestedName],
          summary: `Requested action '${requestedName}' is not present in the supplied domain-actions payload.`,
        },
      };
    }
    return {
      state: AppBuilderSourceLoweringActionSelectionState.ExplicitActionName,
      selectedAction,
      issue: null,
    };
  }

  if (actions.length === 0) {
    return {
      state: AppBuilderSourceLoweringActionSelectionState.NoCompatibleAction,
      selectedAction: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.NoCompatibleDomainAction,
        summary: 'No supplied domain action is available for native button source lowering.',
      },
    };
  }
  if (actions.length > 1) {
    return {
      state: AppBuilderSourceLoweringActionSelectionState.AmbiguousCompatibleAction,
      selectedAction: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainAction,
        actionNames: actions.map((action) => action.name),
        summary: `Native button source lowering has ${actions.length} candidate actions; supply actionName to choose one: ${actions.map((action) => action.name).join(', ')}.`,
      },
    };
  }
  return {
    state: AppBuilderSourceLoweringActionSelectionState.SingleCompatibleAction,
    selectedAction: actions[0]!,
    issue: null,
  };
}

function selectExplicitDomainAction(
  actions: readonly AppBuilderDomainActionDescriptor[],
  requestedActionName: string | null | undefined,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly state: AppBuilderSourceLoweringActionSelectionState;
  readonly selectedAction: AppBuilderDomainActionDescriptor | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const requestedName = normalizedSourceInputText(requestedActionName);
  if (requestedName == null) {
    return {
      state: AppBuilderSourceLoweringActionSelectionState.NotEvaluated,
      selectedAction: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingActionSelection,
        targetRef,
        actionNames: actions.map((action) => action.name),
        summary: `Domain command action source lowering needs explicit actionName before it can emit behavior source. Available actions: ${actions.map((action) => action.name).join(', ')}.`,
      },
    };
  }
  const selectedAction = actions.find((action) => action.name === requestedName) ?? null;
  if (selectedAction == null) {
    return {
      state: AppBuilderSourceLoweringActionSelectionState.UnknownRequestedAction,
      selectedAction: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedAction,
        targetRef,
        actionNames: [requestedName, ...actions.map((action) => action.name)],
        summary: `Requested action '${requestedName}' is not present in the supplied domain-actions payload. Available actions: ${actions.map((action) => action.name).join(', ')}.`,
      },
    };
  }
  return {
    state: AppBuilderSourceLoweringActionSelectionState.ExplicitActionName,
    selectedAction,
    issue: null,
  };
}

function selectHandlerExpression(
  targetRef: AppBuilderOntologyRowRef,
  selectedAction: AppBuilderSourceLoweringSelectedDomainAction,
  request: AppBuilderSourceLoweringInvocationRequest,
): {
  readonly expression: string;
  readonly source: AppBuilderSourceLoweringHandlerExpressionSource;
  readonly eventName: string;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const eventName = normalizedSourceInputText(request.eventName) ?? 'click';
  const explicitExpression = normalizedSourceInputText(request.handlerExpression);
  if (explicitExpression != null) {
    return {
      expression: explicitExpression,
      source: AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
      eventName,
      issue: null,
    };
  }
  if (appBuilderIsTypeScriptIdentifier(selectedAction.action.name)) {
    return {
      expression: `${selectedAction.action.name}()`,
      source: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
      eventName,
      issue: null,
    };
  }
  return {
    expression: '',
    source: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
    eventName,
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingHandlerExpression,
      targetRef,
      actionNames: [selectedAction.action.name],
      summary: `Action '${selectedAction.action.name}' is not a TypeScript identifier; supply handlerExpression before lowering native button source.`,
    },
  };
}

function selectButtonText(
  targetRef: AppBuilderOntologyRowRef,
  selectedAction: AppBuilderSourceLoweringSelectedDomainAction,
  accessibilityLabels: readonly AppBuilderSourceLoweringAccessibilityLabelsPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
): {
  readonly text: string;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const explicitText = normalizedSourceInputText(request.buttonText);
  if (explicitText != null) {
    return { text: explicitText, issue: null };
  }
  const labels = accessibilityLabels
    .map((row) => normalizedSourceInputText(row.label))
    .filter((value): value is string => value != null);
  if (labels.length === 1) {
    return { text: labels[0]!, issue: null };
  }
  if (labels.length > 1) {
    return {
      text: '',
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousButtonText,
        targetRef,
        actionNames: [selectedAction.action.name],
        summary: `Native button source lowering saw ${labels.length} accessibility labels; supply buttonText to choose visible button text.`,
      },
    };
  }
  return {
    text: '',
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingButtonText,
      targetRef,
      actionNames: [selectedAction.action.name],
      summary: `Native button source lowering needs buttonText or a supplied accessibility label for action '${selectedAction.action.name}'.`,
    },
  };
}

function selectButtonType(
  targetRef: AppBuilderOntologyRowRef,
  request: AppBuilderSourceLoweringInvocationRequest,
): {
  readonly buttonType: AppBuilderSourceLoweringButtonType;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const requestedTypeText = normalizedSourceLoweringSelectorInput(request.buttonType);
  if (requestedTypeText == null) {
    return { buttonType: AppBuilderSourceLoweringButtonType.Button, issue: null };
  }
  const buttonType = sourceLoweringButtonType(requestedTypeText);
  if (buttonType != null) {
    return { buttonType, issue: null };
  }
  return {
    buttonType: AppBuilderSourceLoweringButtonType.Button,
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownButtonType,
      targetRef,
      requestedButtonType: requestedTypeText,
      summary: `Native button source lowering does not know buttonType '${requestedTypeText}'. Use one of: ${APP_BUILDER_SOURCE_LOWERING_BUTTON_TYPES.join(', ')}.`,
    },
  };
}

function selectAccessibilityMessage(
  targetRef: AppBuilderOntologyRowRef,
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringMessageSelection {
  const requestedKindText = normalizedSourceLoweringSelectorInput(request.messageKind);
  const explicitMessageText = normalizedSourceInputText(request.messageText);
  if (requestedKindText != null) {
    const messageKind = sourceLoweringMessageKind(requestedKindText);
    return messageKind == null
      ? unknownRequestedAccessibilityMessageSelection(targetRef, requestedKindText, explicitMessageText, request)
      : selectRequestedAccessibilityMessageKind(
        targetRef,
        messageKind,
        explicitMessageText,
        helpErrorPayloads,
        request,
      );
  }

  return selectInferredAccessibilityMessageKind(targetRef, explicitMessageText, helpErrorPayloads, request);
}

function unknownRequestedAccessibilityMessageSelection(
  targetRef: AppBuilderOntologyRowRef,
  requestedKindText: string,
  explicitMessageText: string | null,
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringMessageSelection {
  return {
    messageKind: null,
    selectionState: AppBuilderSourceLoweringMessageSelectionState.UnknownRequestedMessageKind,
    text: explicitMessageText,
    textSource: explicitMessageText == null ? null : AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
    messageId: normalizedSourceInputText(request.messageId),
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedMessageKind,
      targetRef,
      requestedMessageKind: requestedKindText,
      summary: `Form message source lowering does not know message kind '${requestedKindText}'. Use one of: ${APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS.join(', ')}.`,
    },
  };
}

function selectRequestedAccessibilityMessageKind(
  targetRef: AppBuilderOntologyRowRef,
  messageKind: AppBuilderSourceLoweringMessageKind,
  explicitMessageText: string | null,
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringMessageSelection {
  const selectedId = selectMessageId(messageKind, helpErrorPayloads, request);
  if (explicitMessageText != null) {
    return {
      messageKind,
      selectionState: AppBuilderSourceLoweringMessageSelectionState.ExplicitMessageKind,
      text: explicitMessageText,
      textSource: AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
      messageId: selectedId,
      issue: null,
    };
  }
  const candidates = messageCandidates(helpErrorPayloads).filter((candidate) => candidate.kind === messageKind);
  if (candidates.length === 1) {
    return {
      messageKind,
      selectionState: AppBuilderSourceLoweringMessageSelectionState.ExplicitMessageKind,
      text: candidates[0]!.text,
      textSource: AppBuilderSourceLoweringMessageTextSource.AccessibilityHelpErrorPayload,
      messageId: selectedId ?? candidates[0]!.id,
      issue: null,
    };
  }
  return {
    messageKind,
    selectionState: AppBuilderSourceLoweringMessageSelectionState.ExplicitMessageKind,
    text: null,
    textSource: null,
    messageId: selectedId,
    issue: {
      issueKind: candidates.length === 0
        ? AppBuilderSourceLoweringInvocationIssueKind.MissingMessageText
        : AppBuilderSourceLoweringInvocationIssueKind.AmbiguousMessageText,
      targetRef,
      messageKinds: [messageKind],
      summary: candidates.length === 0
        ? `Form message source lowering needs messageText or a supplied '${messageKind}' accessibility help/error payload.`
        : `Form message source lowering saw ${candidates.length} '${messageKind}' payload texts; supply messageText to choose one.`,
    },
  };
}

function selectInferredAccessibilityMessageKind(
  targetRef: AppBuilderOntologyRowRef,
  explicitMessageText: string | null,
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringMessageSelection {
  const candidates = messageCandidates(helpErrorPayloads);
  if (explicitMessageText != null) {
    if (candidates.length === 1) {
      return {
        messageKind: candidates[0]!.kind,
        selectionState: AppBuilderSourceLoweringMessageSelectionState.SinglePayloadMessage,
        text: explicitMessageText,
        textSource: AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
        messageId: selectMessageId(candidates[0]!.kind, helpErrorPayloads, request) ?? candidates[0]!.id,
        issue: null,
      };
    }
    return {
      messageKind: null,
      selectionState: AppBuilderSourceLoweringMessageSelectionState.MissingMessageKind,
      text: explicitMessageText,
      textSource: AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
      messageId: normalizedSourceInputText(request.messageId),
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingMessageKind,
        targetRef,
        messageKinds: candidates.map((candidate) => candidate.kind),
        summary: 'Form message source lowering needs messageKind when messageText is supplied without exactly one accessibility payload message to infer the kind.',
      },
    };
  }
  if (candidates.length === 1) {
    return {
      messageKind: candidates[0]!.kind,
      selectionState: AppBuilderSourceLoweringMessageSelectionState.SinglePayloadMessage,
      text: candidates[0]!.text,
      textSource: AppBuilderSourceLoweringMessageTextSource.AccessibilityHelpErrorPayload,
      messageId: selectMessageId(candidates[0]!.kind, helpErrorPayloads, request) ?? candidates[0]!.id,
      issue: null,
    };
  }
  if (candidates.length > 1) {
    return {
      messageKind: null,
      selectionState: AppBuilderSourceLoweringMessageSelectionState.AmbiguousPayloadMessage,
      text: null,
      textSource: null,
      messageId: normalizedSourceInputText(request.messageId),
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousMessageText,
        targetRef,
        messageKinds: candidates.map((candidate) => candidate.kind),
        summary: `Form message source lowering saw ${candidates.length} help/error/status payload texts; supply messageKind or messageText to choose one: ${candidates.map((candidate) => candidate.kind).join(', ')}.`,
      },
    };
  }
  return {
    messageKind: null,
    selectionState: AppBuilderSourceLoweringMessageSelectionState.NoPayloadMessage,
    text: null,
    textSource: null,
    messageId: normalizedSourceInputText(request.messageId),
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingMessageText,
      targetRef,
      summary: 'Form message source lowering needs messageText or a supplied accessibility help/error/status payload before source can be lowered.',
    },
  };
}

function messageAttributes(
  messageKind: AppBuilderSourceLoweringMessageKind,
  messageId: string | null,
): readonly AppBuilderSourceLoweringRawAttribute[] {
  return [
    ...optionalRawAttribute('id', messageId),
    ...messageDescriptorForKind(messageKind).roleAttributes,
  ];
}

function optionalRawAttribute(
  rawName: string,
  rawValue: string | null,
): readonly AppBuilderSourceLoweringRawAttribute[] {
  return rawValue == null ? [] : [{ rawName, rawValue }];
}

function selectMessageId(
  messageKind: AppBuilderSourceLoweringMessageKind,
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
  request: AppBuilderSourceLoweringInvocationRequest,
): string | null {
  const explicitMessageId = normalizedSourceInputText(request.messageId);
  if (explicitMessageId != null) {
    return explicitMessageId;
  }
  const ids = helpErrorPayloads
    .map((payload) => messageIdForKind(payload, messageKind))
    .filter((value): value is string => value != null);
  return ids.length === 1 ? ids[0]! : null;
}

function messageCandidates(
  helpErrorPayloads: readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[],
): readonly AppBuilderSourceLoweringMessageCandidate[] {
  return helpErrorPayloads.flatMap((payload) =>
    APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS.flatMap((kind) => {
      const text = messageTextForKind(payload, kind);
      return text == null ? [] : [{ kind, text, id: messageIdForKind(payload, kind) }];
    })
  );
}

function numericConstraintInvocationIssue(
  targetRef: AppBuilderOntologyRowRef,
  issue: AppBuilderNumericControlConstraintIssue,
): AppBuilderSourceLoweringInvocationIssue {
  return {
    issueKind: issue.issueKind === AppBuilderNumericControlConstraintIssueKind.MissingRangeConstraints
      ? AppBuilderSourceLoweringInvocationIssueKind.MissingNumericRangeConstraints
      : AppBuilderSourceLoweringInvocationIssueKind.InvalidNumericConstraints,
    targetRef,
    fieldNames: issue.fieldNames,
    summary: issue.summary,
  };
}

function messageTextForKind(
  payload: AppBuilderSourceLoweringAccessibilityHelpErrorPayload,
  messageKind: AppBuilderSourceLoweringMessageKind,
): string | null {
  return normalizedSourceInputText(payload[messageDescriptorForKind(messageKind).textFieldName]);
}

function messageIdForKind(
  payload: AppBuilderSourceLoweringAccessibilityHelpErrorPayload,
  messageKind: AppBuilderSourceLoweringMessageKind,
): string | null {
  return normalizedSourceInputText(payload[messageDescriptorForKind(messageKind).idFieldName]);
}

function messageDescriptorForKind(
  messageKind: AppBuilderSourceLoweringMessageKind,
): AppBuilderSourceLoweringMessageDescriptor {
  return APP_BUILDER_SOURCE_LOWERING_MESSAGE_DESCRIPTORS[messageKind];
}

function sourceLoweringMessageKind(
  value: unknown,
): AppBuilderSourceLoweringMessageKind | null {
  const normalized = normalizedSourceLoweringSelectorInput(value);
  return APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS.includes(normalized as AppBuilderSourceLoweringMessageKind)
    ? normalized as AppBuilderSourceLoweringMessageKind
    : null;
}

function sourceLoweringButtonType(
  value: unknown,
): AppBuilderSourceLoweringButtonType | null {
  const normalized = normalizedSourceLoweringSelectorInput(value);
  return APP_BUILDER_SOURCE_LOWERING_BUTTON_TYPES.includes(normalized as AppBuilderSourceLoweringButtonType)
    ? normalized as AppBuilderSourceLoweringButtonType
    : null;
}

function normalizedSourceLoweringSelectorInput(
  value: unknown,
): string | null {
  return typeof value === 'string' ? normalizedSourceInputText(value) : null;
}

function controlSourceSlotAssignments(
  controlId: AppBuilderControlId,
  bindingExpression: string,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  request: AppBuilderSourceLoweringInvocationRequest,
  valueDomainSelection: AppBuilderSourceLoweringValueDomainSelection,
): readonly AppBuilderPartSlotAssignment[] {
  const base = [
    { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
  ];
  if (!appBuilderControlDescriptor(controlId).requiresValueDomain) {
    return base;
  }
  const optionLocalName = normalizedSourceInputText(request.optionLocalName) ?? 'option';
  const valueDomainExpression = valueDomainSelection.expression;
  if (valueDomainExpression == null) {
    return base;
  }
  const optionDomainHasObjectRows = valueDomainSelection.source !== AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitRequest;
  const optionValueExpression = normalizedSourceInputText(request.optionValueExpression)
    ?? (optionDomainHasObjectRows ? `${optionLocalName}.value` : optionLocalName);
  const optionLabelExpression = normalizedSourceInputText(request.optionLabelExpression)
    ?? (optionDomainHasObjectRows ? `${optionLocalName}.title` : optionLocalName);
  return [
    ...base,
    ...optionalPartSlot(AppBuilderPartSlotKind.RadioGroupName, radioGroupNameSlotValue(controlId, selectedField)),
    { slotKind: AppBuilderPartSlotKind.ValueDomainExpression, value: valueDomainExpression },
    { slotKind: AppBuilderPartSlotKind.LocalName, value: optionLocalName },
    { slotKind: AppBuilderPartSlotKind.OptionValueExpression, value: optionValueExpression },
    { slotKind: AppBuilderPartSlotKind.OptionBindingKind, value: request.optionBindingKind ?? AppBuilderChoiceOptionBindingKind.Model },
    { slotKind: AppBuilderPartSlotKind.OptionLabelExpression, value: optionLabelExpression },
    ...optionalPartSlot(AppBuilderPartSlotKind.MatcherExpression, request.matcherExpression),
  ];
}

function radioGroupNameSlotValue(
  controlId: AppBuilderControlId,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
): string | null {
  return controlId === AppBuilderControlId.RadioGroup
    ? appBuilderKebabCase(selectedField.sourceModel.memberName)
    : null;
}

function selectValueDomainForChoiceControl(
  targetRef: AppBuilderOntologyRowRef,
  controlId: AppBuilderControlId,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringValueDomainSelection {
  const explicitExpression = normalizedSourceInputText(request.valueDomainExpression);
  if (explicitExpression != null) {
    return {
      expression: explicitExpression,
      source: AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitRequest,
      selectedValueSet: null,
      issue: null,
    };
  }

  const explicitValueSetName = normalizedSourceInputText(request.valueSetName);
  const fieldValueSetName = normalizedSourceInputText(selectedField.field.valueSetName);
  const requestedValueSetName = explicitValueSetName ?? fieldValueSetName;
  if (requestedValueSetName != null) {
    const selectedValueSet = valueSets.find((valueSet) => valueSet.name === requestedValueSetName) ?? null;
    if (selectedValueSet == null) {
      return {
        expression: null,
        source: explicitValueSetName == null
          ? AppBuilderSourceLoweringValueDomainExpressionSource.FieldValueSetName
          : AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitValueSetName,
        selectedValueSet: null,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedValueSet,
          targetRef,
          fieldNames: [selectedField.sourceModel.memberName],
          summary: `Choice control '${controlId}' needs value set '${requestedValueSetName}', but that value set is absent from the supplied domain-value-sets payload.`,
        },
      };
    }
    return {
      expression: selectedValueSet.name,
      source: explicitValueSetName == null
        ? AppBuilderSourceLoweringValueDomainExpressionSource.FieldValueSetName
        : AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitValueSetName,
      selectedValueSet,
      issue: null,
    };
  }

  if (selectedField.sourceModel.options.length > 0 && selectedField.sourceModel.optionMemberName != null) {
    return {
      expression: selectedField.sourceModel.optionMemberName,
      source: AppBuilderSourceLoweringValueDomainExpressionSource.FieldOptions,
      selectedValueSet: null,
      issue: null,
    };
  }

  const compatibleValueSets = valueSets.filter((valueSet) => valueSetCompatibleWithField(valueSet, selectedField));
  if (compatibleValueSets.length === 1) {
    return {
      expression: compatibleValueSets[0]!.name,
      source: AppBuilderSourceLoweringValueDomainExpressionSource.SingleCompatibleValueSet,
      selectedValueSet: compatibleValueSets[0]!,
      issue: null,
    };
  }
  if (compatibleValueSets.length > 1) {
    return {
      expression: null,
      source: null,
      selectedValueSet: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainValueSet,
        targetRef,
        fieldNames: [selectedField.sourceModel.memberName, ...compatibleValueSets.map((valueSet) => valueSet.name)],
        summary: `Choice control '${controlId}' has ${compatibleValueSets.length} compatible value sets; supply valueSetName or valueDomainExpression to choose one: ${compatibleValueSets.map((valueSet) => valueSet.name).join(', ')}.`,
      },
    };
  }

  return {
    expression: null,
    source: null,
    selectedValueSet: null,
    issue: {
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.MissingValueDomainExpression,
      targetRef,
      fieldNames: [selectedField.sourceModel.memberName],
      summary: `Choice control '${controlId}' needs valueDomainExpression, field options, or one compatible supplied domain value set before source can repeat finite choices.`,
    },
  };
}

function valueSetCompatibleWithField(
  valueSet: AppBuilderDomainValueSetDescriptor,
  selectedField: AppBuilderSourceLoweringSelectedDomainField,
): boolean {
  return valueSet.valueKind == null || valueSet.valueKind === selectedField.sourceModel.valueKind;
}

function optionalPartSlot(
  slotKind: AppBuilderPartSlotKind,
  value: string | null | undefined,
): readonly AppBuilderPartSlotAssignment[] {
  const trimmed = normalizedSourceInputText(value);
  return trimmed == null ? [] : [{ slotKind, value: trimmed }];
}

function selectTypeScriptMethodParameters(
  methodParameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[] | null | undefined,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly parameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[];
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
} {
  if (methodParameters == null) {
    return { parameters: [], issues: [] };
  }
  if (!Array.isArray(methodParameters)) {
    return {
      parameters: [],
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidMethodParameter,
        targetRef,
        summary: 'Domain command action methodParameters must be an array of explicit name/typeText entries.',
      }],
    };
  }
  const parameters: AppBuilderSourceLoweringTypeScriptMethodParameter[] = [];
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [];
  for (const parameter of methodParameters) {
    if (parameter == null || typeof parameter !== 'object') {
      issues.push({
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidMethodParameter,
        targetRef,
        summary: 'Domain command action methodParameters entries must be objects with explicit name and typeText fields.',
      });
      continue;
    }
    const name = normalizedSourceInputText(parameter.name);
    const typeText = normalizedSourceInputText(parameter.typeText);
    if (name == null || !appBuilderIsTypeScriptIdentifier(name) || typeText == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidMethodParameter,
        targetRef,
        methodParameterNames: name == null ? [] : [name],
        summary: 'Domain command action methodParameters need a TypeScript-safe name and explicit typeText before source lowering can emit the method signature.',
      });
      continue;
    }
    parameters.push({ name, typeText });
  }
  return { parameters, issues };
}

interface DomainCommandServiceCallSource {
  readonly serviceMemberName: string;
  readonly serviceMethodName: string;
  readonly resultMemberName: string | null;
  readonly argumentExpressions: readonly string[];
  readonly refreshMethodName: string | null;
}

interface DomainCommandQueryStateEffectSource {
  readonly stateMemberName: string;
  readonly valueExpression: string | null;
  readonly reloadMethodName: string;
}

function selectServiceQueryStateEffectForCommand(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly value: DomainCommandQueryStateEffectSource | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
} {
  const stateMemberName = normalizedSourceInputText(request.serviceQueryStateMemberName);
  const valueExpression = normalizedSourceInputText(request.serviceQueryStateValueExpression);
  const reloadMethodName = normalizedSourceInputText(request.serviceQueryReloadMethodName);
  const hasAnyQueryStateField = stateMemberName != null
    || valueExpression != null
    || reloadMethodName != null;
  if (!hasAnyQueryStateField) {
    return { value: null, issues: [] };
  }
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [];
  if (stateMemberName == null || reloadMethodName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.IncompleteServiceQueryStateFields,
      targetRef,
      serviceQueryStateMemberNames: stateMemberName == null ? [] : [stateMemberName],
      serviceQueryReloadMethodNames: reloadMethodName == null ? [] : [reloadMethodName],
      summary: 'Domain command action query-state derivation needs serviceQueryStateMemberName and serviceQueryReloadMethodName; serviceQueryStateValueExpression is optional when the template already binds the state member.',
    });
  }
  if (stateMemberName != null && !appBuilderIsTypeScriptIdentifier(stateMemberName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceQueryStateMemberName,
      targetRef,
      serviceQueryStateMemberNames: [stateMemberName],
      summary: `Domain command action query-state member '${stateMemberName}' is not a TypeScript-safe member name.`,
    });
  }
  if (request.serviceQueryStateValueExpression != null && valueExpression == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceQueryStateValueExpression,
      targetRef,
      summary: 'Domain command action serviceQueryStateValueExpression must be a non-empty TypeScript expression string.',
    });
  }
  if (reloadMethodName != null && !appBuilderIsTypeScriptIdentifier(reloadMethodName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceQueryReloadMethodName,
      targetRef,
      serviceQueryReloadMethodNames: [reloadMethodName],
      summary: `Domain command action query reload method '${reloadMethodName}' is not a TypeScript-safe method name.`,
    });
  }
  if (issues.length > 0 || stateMemberName == null || reloadMethodName == null) {
    return { value: null, issues };
  }
  return {
    value: {
      stateMemberName,
      valueExpression,
      reloadMethodName,
    },
    issues: [],
  };
}

function selectServiceCallForCommand(
  request: AppBuilderSourceLoweringInvocationRequest,
  targetRef: AppBuilderOntologyRowRef,
): {
  readonly value: DomainCommandServiceCallSource | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
} {
  const serviceMemberName = normalizedSourceInputText(request.serviceMemberName);
  const serviceMethodName = normalizedSourceInputText(request.serviceMethodName);
  const resultMemberName = normalizedSourceInputText(request.serviceCallResultMemberName);
  const refreshMethodName = normalizedSourceInputText(request.serviceCallRefreshMethodName);
  const argumentExpressionsInput = request.serviceCallArgumentExpressions;
  const hasArgumentExpressions = argumentExpressionsInput != null;
  const hasAnyServiceCallField = serviceMemberName != null
    || serviceMethodName != null
    || resultMemberName != null
    || refreshMethodName != null
    || hasArgumentExpressions;
  if (!hasAnyServiceCallField) {
    return { value: null, issues: [] };
  }
  const issues: AppBuilderSourceLoweringInvocationIssue[] = [];
  if (serviceMemberName == null || serviceMethodName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.IncompleteServiceCallFields,
      targetRef,
      serviceMemberNames: serviceMemberName == null ? [] : [serviceMemberName],
      serviceMethodNames: serviceMethodName == null ? [] : [serviceMethodName],
      summary: 'Domain command action service-call derivation needs both serviceMemberName and serviceMethodName; app-builder will not infer service topology.',
    });
  }
  if (serviceMemberName != null && !appBuilderIsTypeScriptIdentifier(serviceMemberName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceMemberName,
      targetRef,
      serviceMemberNames: [serviceMemberName],
      summary: `Domain command action service member '${serviceMemberName}' is not a TypeScript-safe member name.`,
    });
  }
  if (serviceMethodName != null && !appBuilderIsTypeScriptIdentifier(serviceMethodName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceMethodName,
      targetRef,
      serviceMethodNames: [serviceMethodName],
      summary: `Domain command action service method '${serviceMethodName}' is not a TypeScript-safe method name.`,
    });
  }
  if (resultMemberName != null && !appBuilderIsTypeScriptIdentifier(resultMemberName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallResultMemberName,
      targetRef,
      serviceCallResultMemberNames: [resultMemberName],
      summary: `Domain command action service-call result member '${resultMemberName}' is not a TypeScript-safe member name.`,
    });
  }
  if (refreshMethodName != null && !appBuilderIsTypeScriptIdentifier(refreshMethodName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallRefreshMethodName,
      targetRef,
      serviceCallRefreshMethodNames: [refreshMethodName],
      summary: `Domain command action service-call refresh method '${refreshMethodName}' is not a TypeScript-safe method name.`,
    });
  }
  if (resultMemberName != null && refreshMethodName != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.ConflictingServiceCallResultAndRefresh,
      targetRef,
      serviceCallResultMemberNames: [resultMemberName],
      serviceCallRefreshMethodNames: [refreshMethodName],
      summary: 'Domain command action service-call derivation cannot both assign serviceCallResultMemberName and refresh through serviceCallRefreshMethodName.',
    });
  }
  const argumentExpressions = normalizeServiceCallArgumentExpressions(argumentExpressionsInput, targetRef, issues);
  if (issues.length > 0 || serviceMemberName == null || serviceMethodName == null) {
    return { value: null, issues };
  }
  return {
    value: {
      serviceMemberName,
      serviceMethodName,
      resultMemberName,
      argumentExpressions,
      refreshMethodName,
    },
    issues: [],
  };
}

function normalizeServiceCallArgumentExpressions(
  value: readonly string[] | null | undefined,
  targetRef: AppBuilderOntologyRowRef,
  issues: AppBuilderSourceLoweringInvocationIssue[],
): readonly string[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallArgumentExpressions,
      targetRef,
      summary: 'Domain command action serviceCallArgumentExpressions must be an array of exact TypeScript expression strings.',
    });
    return [];
  }
  const argumentExpressions: string[] = [];
  for (const argumentExpression of value) {
    const normalized = normalizedSourceInputText(argumentExpression);
    if (normalized == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallArgumentExpressions,
        targetRef,
        summary: 'Domain command action serviceCallArgumentExpressions entries must be non-empty TypeScript expression strings.',
      });
      continue;
    }
    argumentExpressions.push(normalized);
  }
  return argumentExpressions;
}

function derivedDomainCommandActionMethodBodyStatements(
  action: AppBuilderDomainActionDescriptor,
  methodParameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  actionFeedback: AppBuilderSourceLoweringActionFeedbackPayload | null,
  queryStateEffect: DomainCommandQueryStateEffectSource | null,
  serviceCall: DomainCommandServiceCallSource | null,
): string | null {
  const derivedStatements = ((): string | null => {
    const commandStatements = [
      ...(queryStateEffect == null ? [] : [queryStateEffectMethodBodyStatements(queryStateEffect)]),
      ...(serviceCall == null ? [] : [serviceCallMethodBodyStatements(serviceCall)]),
    ];
    if (commandStatements.length > 0) {
      return commandStatements.join('\n');
    }
    switch (action.kind) {
      case AppBuilderDomainActionKind.Create:
        return derivedLocalCreateMethodBodyStatements(action, methodParameters, suppliedInputs);
      case AppBuilderDomainActionKind.Complete:
        return derivedLocalEntityCompleteMethodBodyStatements(action, methodParameters, suppliedInputs);
      case AppBuilderDomainActionKind.Update:
      case AppBuilderDomainActionKind.Save:
      case AppBuilderDomainActionKind.Delete:
      case AppBuilderDomainActionKind.Archive:
      case AppBuilderDomainActionKind.Assign:
      case AppBuilderDomainActionKind.Submit:
      case AppBuilderDomainActionKind.Refresh:
      case AppBuilderDomainActionKind.Custom:
        return null;
    }
  })();
  return appendActionFeedbackStatement(derivedStatements, actionFeedback);
}

function queryStateEffectMethodBodyStatements(
  queryStateEffect: DomainCommandQueryStateEffectSource,
): string {
  return [
    ...(queryStateEffect.valueExpression == null ? [] : [
      `this.${queryStateEffect.stateMemberName} = ${queryStateEffect.valueExpression};`,
    ]),
    `this.${queryStateEffect.reloadMethodName}();`,
  ].join('\n');
}

function serviceCallMethodBodyStatements(
  serviceCall: DomainCommandServiceCallSource,
): string {
  const callExpression = `this.${serviceCall.serviceMemberName}.${serviceCall.serviceMethodName}(${serviceCall.argumentExpressions.join(', ')})`;
  if (serviceCall.refreshMethodName != null) {
    return [
      `await ${callExpression};`,
      `this.${serviceCall.refreshMethodName}();`,
    ].join('\n');
  }
  return serviceCall.resultMemberName == null
    ? `${callExpression};`
    : `this.${serviceCall.resultMemberName} = ${callExpression};`;
}

function appendActionFeedbackStatement(
  bodyStatements: string | null,
  actionFeedback: AppBuilderSourceLoweringActionFeedbackPayload | null,
): string | null {
  if (bodyStatements == null || actionFeedback == null) {
    return bodyStatements;
  }
  return [
    bodyStatements,
    `this.${actionFeedback.statusMemberName} = ${appBuilderSeedRecordLiteral(actionFeedback.statusText)};`,
  ].join('\n');
}

function selectActionFeedbackForCommand(
  targetRef: AppBuilderOntologyRowRef,
  action: AppBuilderDomainActionDescriptor,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderSourceLoweringActionFeedbackPayload | null;
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
} {
  const matches = appBuilderSourceLoweringActionFeedbackPayloads(suppliedInputs)
    .filter((feedback) => feedback.actionName === action.name);
  if (matches.length === 0) {
    return { value: null, issues: [] };
  }
  if (matches.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.DuplicateActionFeedback,
        targetRef,
        actionNames: [action.name],
        statusMemberNames: matches.map((feedback) => feedback.statusMemberName),
        summary: `Domain command action '${action.name}' received ${matches.length} action-feedback payloads; supply at most one feedback row per action.`,
      }],
    };
  }
  const feedback = matches[0]!;
  if (!appBuilderIsTypeScriptIdentifier(feedback.statusMemberName)) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.InvalidActionFeedbackStatusMember,
        targetRef,
        actionNames: [action.name],
        statusMemberNames: [feedback.statusMemberName],
        summary: `Domain command action '${action.name}' cannot assign action feedback member '${feedback.statusMemberName}' because it is not a TypeScript-safe identifier.`,
      }],
    };
  }
  return { value: feedback, issues: [] };
}

function derivedLocalCreateMethodBodyStatements(
  action: AppBuilderDomainActionDescriptor,
  methodParameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): string | null {
  if (methodParameters.length > 0) {
    return null;
  }
  if (action.scope != null
    && action.scope !== AppBuilderDomainActionScope.Form
    && action.scope !== AppBuilderDomainActionScope.Collection) {
    return null;
  }
  if (!sourceLoweringUsesLocalCollectionState(suppliedInputs)) {
    return null;
  }
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const entity = selectedActionDomainEntityPayload(action, entities, suppliedInputs);
  if (entity == null
    || entity.entityTypeName == null
    || entity.collectionMemberName == null
    || entity.identityMemberName == null
    || entity.identityValueKind !== AppBuilderDomainIdentityValueKind.Number
    || !appBuilderIsTypeScriptIdentifier(entity.entityTypeName)
    || !appBuilderIsTypeScriptIdentifier(entity.collectionMemberName)
    || !appBuilderIsTypeScriptIdentifier(entity.identityMemberName)) {
    return null;
  }
  const fields = appBuilderDomainFieldSourceModels(domainFieldPayloadsForActionEntity(
    appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs),
    entity.entityTypeName,
    entities.length,
  ), {
    entityTypeName: entity.entityTypeName,
    valueSets: appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs),
  });
  const objectReferenceRelationships = derivedLocalCreateObjectReferenceRelationships(action, entities, suppliedInputs);
  if (fields.length === 0) {
    return null;
  }
  const inputFieldNameSet = selectedCreateInputFieldNames(action, fields, objectReferenceRelationships.map((relationship) => relationship.localFieldName));
  if (inputFieldNameSet == null) {
    return null;
  }
  const itemLocalName = appBuilderLowerCamelCase(entity.entityTypeName);
  const constructionExpression = appBuilderDomainEntityConstructionExpressionSource({
    entityTypeName: entity.entityTypeName,
    fields,
  }, [
    {
      memberName: entity.identityMemberName,
      expression: 'nextId',
    },
    ...fields.map((field) => ({
      memberName: field.memberName,
      expression: inputFieldNameSet.has(field.memberName)
        ? createActionFieldInputExpression(field)
        : appBuilderDomainFieldSeedLiteral(undefined, field),
    })),
    ...objectReferenceRelationships.map((relationship) => ({
      memberName: relationship.localFieldName,
      expression: inputFieldNameSet.has(relationship.localFieldName)
        ? `this.${relationship.localFieldName}`
        : createActionObjectReferenceDefaultExpression(relationship),
    })),
  ]);
  const resetStatements = fields
    .filter((field) => inputFieldNameSet.has(field.memberName))
    .map((field) => `this.${field.memberName} = ${appBuilderDomainFieldSeedLiteral(undefined, field)};`);
  const relationshipResetStatements = objectReferenceRelationships
    .filter((relationship) => inputFieldNameSet.has(relationship.localFieldName))
    .map((relationship) => `this.${relationship.localFieldName} = ${createActionObjectReferenceDefaultExpression(relationship)};`);
  return [
    `const nextId = this.${entity.collectionMemberName}.length === 0 ? 1 : Math.max(...this.${entity.collectionMemberName}.map((${itemLocalName}) => ${itemLocalName}.${entity.identityMemberName})) + 1;`,
    `this.${entity.collectionMemberName}.push(${constructionExpression});`,
    ...resetStatements,
    ...relationshipResetStatements,
  ].join('\n');
}

interface DerivedLocalCreateObjectReferenceRelationship {
  readonly localFieldName: string;
  readonly collectionMemberName: string;
}

function derivedLocalCreateObjectReferenceRelationships(
  action: AppBuilderDomainActionDescriptor,
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly DerivedLocalCreateObjectReferenceRelationship[] {
  const targetEntityName = normalizedSourceInputText(action.targetEntityName);
  return appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs)
    .filter((relationship) =>
      relationship.kind === AppBuilderDomainRelationshipKind.ReferenceOne
      && (relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity) === AppBuilderDomainRelationshipLocalValueKind.Object
      && normalizedSourceInputText(relationship.localFieldName) != null
      && (targetEntityName == null || relationship.fromEntityName === targetEntityName))
    .flatMap((relationship): readonly DerivedLocalCreateObjectReferenceRelationship[] => {
      const relatedEntity = entities.find((entity) => domainEntityPayloadName(entity) === relationship.toEntityName) ?? null;
      const localFieldName = normalizedSourceInputText(relationship.localFieldName);
      if (relatedEntity?.collectionMemberName == null || localFieldName == null) {
        return [];
      }
      return [{
        localFieldName,
        collectionMemberName: relatedEntity.collectionMemberName,
      }];
    });
}

function createActionObjectReferenceDefaultExpression(
  relationship: DerivedLocalCreateObjectReferenceRelationship,
): string {
  return `this.${relationship.collectionMemberName}[0] ?? null`;
}

function derivedLocalEntityCompleteMethodBodyStatements(
  action: AppBuilderDomainActionDescriptor,
  methodParameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): string | null {
  if (methodParameters.length !== 1
    || action.mutatesState !== true
    || action.scope !== AppBuilderDomainActionScope.Entity
    || !sourceLoweringUsesLocalCollectionState(suppliedInputs)) {
    return null;
  }
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const entity = selectedActionDomainEntityPayload(action, entities, suppliedInputs);
  const rowParameter = methodParameters[0]!;
  if (entity == null
    || entity.entityTypeName == null
    || (action.targetEntityName != null && action.targetEntityName !== entity.entityTypeName)
    || rowParameter.typeText !== entity.entityTypeName
    || !appBuilderIsTypeScriptIdentifier(rowParameter.name)) {
    return null;
  }
  const fields = appBuilderDomainFieldSourceModels(domainFieldPayloadsForActionEntity(
    appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs),
    entity.entityTypeName,
    entities.length,
  ), {
    entityTypeName: entity.entityTypeName,
    valueSets: appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs),
  });
  const targetField = selectedCompleteBooleanField(action, fields);
  if (targetField == null) {
    return null;
  }
  return `${rowParameter.name}.${targetField.memberName} = true;`;
}

function sourceLoweringUsesLocalCollectionState(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): boolean {
  return appBuilderSourceLoweringStatePolicyPayloads(suppliedInputs).some((payload) =>
    payload.localStatePolicies?.includes(AppBuilderLocalStatePolicy.ViewModelLocalCollection)
  );
}

function selectedActionDomainEntityPayload(
  action: AppBuilderDomainActionDescriptor,
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderSourceLoweringDomainEntityPayload | null {
  const targetEntityName = normalizedSourceInputText(action.targetEntityName);
  if (targetEntityName != null) {
    return entities.find((entity) => domainEntityPayloadName(entity) === targetEntityName) ?? null;
  }
  if (entities.length === 1) {
    return entities[0] ?? null;
  }
  const fromEntityNames = uniqueStrings(appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs)
    .map((relationship) => normalizedSourceInputText(relationship.fromEntityName))
    .filter((value): value is string => value != null));
  if (fromEntityNames.length !== 1) {
    return null;
  }
  const relationshipPrimaryEntityName = fromEntityNames[0]!;
  return entities.find((entity) => domainEntityPayloadName(entity) === relationshipPrimaryEntityName) ?? null;
}

function domainFieldPayloadsForActionEntity(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  entityName: string,
  entityCount: number,
): readonly AppBuilderDomainFieldDescriptor[] {
  if (entityCount === 1 && fields.every((field) => field.entityName == null)) {
    return fields;
  }
  return fields.filter((field) => field.entityName === entityName);
}

function domainEntityPayloadName(
  entity: AppBuilderSourceLoweringDomainEntityPayload,
): string {
  return entity.entityTypeName ?? appBuilderPascalCase(entity.entityTitle);
}

function selectedCreateInputFieldNames(
  action: AppBuilderDomainActionDescriptor,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  extraFieldNames: readonly string[] = [],
): ReadonlySet<string> | null {
  const fieldNames = action.inputFieldNames == null || action.inputFieldNames.length === 0
    ? [...fields.map((field) => field.memberName), ...extraFieldNames]
    : action.inputFieldNames;
  const knownFieldNames = new Set([...fields.map((field) => field.memberName), ...extraFieldNames]);
  for (const fieldName of fieldNames) {
    if (!knownFieldNames.has(fieldName)) {
      return null;
    }
  }
  return new Set(fieldNames);
}

function selectedCompleteBooleanField(
  action: AppBuilderDomainActionDescriptor,
  fields: readonly AppBuilderDomainFieldSourceModel[],
): AppBuilderDomainFieldSourceModel | null {
  const fieldName = appBuilderEntityCompleteMutationFieldName(action, fields.map((field) => field.field));
  return fieldName == null
    ? null
    : fields.find((field) => field.memberName === fieldName) ?? null;
}

function createActionFieldInputExpression(
  field: AppBuilderDomainFieldSourceModel,
): string {
  if (field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet) {
    return `[...this.${field.memberName}]`;
  }
  return `this.${field.memberName}`;
}

function domainCommandActionMethodSourceText(
  methodName: string,
  methodParameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[],
  bodyStatements: string,
  options: {
    readonly isAsync?: boolean;
  } = {},
): string {
  const asyncPrefix = options.isAsync === true ? 'async ' : '';
  return `${asyncPrefix}${methodName}(${methodParameters.map((parameter) => `${parameter.name}: ${parameter.typeText}`).join(', ')}) {\n${indentTypeScriptMethodBodyStatements(bodyStatements)}\n}`;
}

function asyncDataSourceMemberSourceText(
  memberName: string,
  promiseType: string,
  initializerExpression: string,
  memberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability,
): string {
  const prefix = memberMutability === AppBuilderSourceLoweringAsyncDataMemberMutability.Readonly ? 'readonly ' : '';
  return `${prefix}${memberName}: ${promiseType} = ${initializerExpression};`;
}

function indentTypeScriptMethodBodyStatements(
  bodyStatements: string,
): string {
  return bodyStatements
    .trim()
    .split(/\r?\n/)
    .map((line) => line.length === 0 ? '' : `  ${line}`)
    .join('\n');
}

function selectDomainFieldForControl(
  controlId: AppBuilderControlId,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  request: AppBuilderSourceLoweringInvocationRequest,
): {
  readonly state: AppBuilderSourceLoweringFieldSelectionState;
  readonly selectedField: AppBuilderDomainFieldSourceModel | null;
  readonly issue: AppBuilderSourceLoweringInvocationIssue | null;
} {
  const expectedValueKind = expectedDomainValueKindForControl(controlId);
  const requestedName = normalizedSourceInputText(request.fieldName);
  const explicitCompatibleKinds = explicitRequestedDomainValueKindsForControl(controlId, request);
  if (requestedName != null) {
    const selectedField = fields.find((field) => field.memberName === requestedName) ?? null;
    if (selectedField == null) {
      return {
        state: AppBuilderSourceLoweringFieldSelectionState.UnknownRequestedField,
        selectedField: null,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedField,
          fieldNames: [requestedName],
          summary: `Requested field '${requestedName}' is not present in the supplied domain-fields payload.`,
        },
      };
    }
    if (!explicitCompatibleKinds.includes(selectedField.valueKind)) {
      return {
        state: AppBuilderSourceLoweringFieldSelectionState.IncompatibleRequestedField,
        selectedField: null,
        issue: {
          issueKind: AppBuilderSourceLoweringInvocationIssueKind.IncompatibleRequestedField,
          fieldNames: [requestedName],
          summary: `Requested field '${requestedName}' has value kind '${selectedField.valueKind}', but control '${controlId}' needs one of: ${explicitCompatibleKinds.join(', ')}.`,
        },
      };
    }
    return {
      state: AppBuilderSourceLoweringFieldSelectionState.ExplicitFieldName,
      selectedField,
      issue: null,
    };
  }

  // Omitted field selection stays conservative: relationship-style string selects
  // must name the field explicitly so app-builder does not guess relationship intent.
  const compatibleFields = fields.filter((field) => field.valueKind === expectedValueKind);
  if (compatibleFields.length === 0) {
    return {
      state: AppBuilderSourceLoweringFieldSelectionState.NoCompatibleField,
      selectedField: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.NoCompatibleDomainField,
        summary: `No supplied domain field has value kind '${expectedValueKind}' for control '${controlId}'.`,
      },
    };
  }
  if (compatibleFields.length > 1) {
    return {
      state: AppBuilderSourceLoweringFieldSelectionState.AmbiguousCompatibleField,
      selectedField: null,
      issue: {
        issueKind: AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainField,
        fieldNames: compatibleFields.map((field) => field.memberName),
        summary: `Control '${controlId}' has ${compatibleFields.length} compatible fields; supply fieldName to choose one: ${compatibleFields.map((field) => field.memberName).join(', ')}.`,
      },
    };
  }
  return {
    state: AppBuilderSourceLoweringFieldSelectionState.SingleCompatibleField,
    selectedField: compatibleFields[0]!,
    issue: null,
  };
}

function explicitRequestedDomainValueKindsForControl(
  controlId: AppBuilderControlId,
  request: AppBuilderSourceLoweringInvocationRequest,
): readonly AppBuilderDomainFieldValueKind[] {
  const expectedValueKind = expectedDomainValueKindForControl(controlId);
  const hasExplicitValueDomain = normalizedSourceInputText(request.valueDomainExpression) != null;
  if (controlId === AppBuilderControlId.SingleSelect && hasExplicitValueDomain) {
    return [expectedValueKind, AppBuilderDomainFieldValueKind.Text];
  }
  return [expectedValueKind];
}

function expectedDomainValueKindForControl(
  controlId: AppBuilderControlId,
): AppBuilderDomainFieldValueKind {
  const control = appBuilderControlDescriptor(controlId);
  switch (control.semanticValueKind) {
    case AppBuilderControlSemanticValueKind.Text:
      return AppBuilderDomainFieldValueKind.Text;
    case AppBuilderControlSemanticValueKind.Number:
      return AppBuilderDomainFieldValueKind.Number;
    case AppBuilderControlSemanticValueKind.Date:
      return AppBuilderDomainFieldValueKind.Date;
    case AppBuilderControlSemanticValueKind.Boolean:
      return AppBuilderDomainFieldValueKind.Boolean;
    case AppBuilderControlSemanticValueKind.Choice:
      return AppBuilderDomainFieldValueKind.Choice;
    case AppBuilderControlSemanticValueKind.ChoiceSet:
      return AppBuilderDomainFieldValueKind.ChoiceSet;
  }
}

function sourceLoweringInvocationResult(
  input: Partial<AppBuilderSourceLoweringInvocation> & {
    readonly targetRef: AppBuilderOntologyRowRef | null;
    readonly additionalSourceLoweringTargetRefs?: readonly AppBuilderOntologyRowRef[];
    readonly additionalControlUseInventoryRows?: readonly AppBuilderControlUseInventoryRow[];
    readonly fieldSelectionState?: AppBuilderSourceLoweringFieldSelectionState;
    readonly actionSelectionState?: AppBuilderSourceLoweringActionSelectionState;
    readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
  },
): AppBuilderSourceLoweringInvocation {
  const fragmentOrigin = sourceLoweringFragmentOrigin(input);
  const fragments = fragmentOrigin == null
    ? input.fragments ?? []
    : (input.fragments ?? []).map((fragment) =>
      sourceFragmentWithSourceLoweringOrigin(fragment, fragmentOrigin));
  const sourceLoweringTargetRefs = appBuilderUniqueOntologyRowRefs([
    ...(input.targetRef == null ? [] : [input.targetRef]),
    ...(input.additionalSourceLoweringTargetRefs ?? []),
  ]);
  const baseControlUseInventoryRows = input.controlUseInventoryRows ?? appBuilderControlUseInventoryRowsForInvocation({
    targetRef: input.targetRef,
    fragments,
    controlPatternId: input.controlPattern?.id ?? null,
    controlId: input.controlId ?? null,
    innerControlPatternId: input.innerControlPatternId ?? null,
    fieldName: input.selectedField?.sourceModel.memberName ?? null,
    actionName: input.selectedAction?.action.name ?? null,
    bindingExpression: input.bindingExpression ?? null,
    bindingExpressionSource: input.bindingExpressionSource ?? null,
    handlerExpression: input.handlerExpression ?? null,
    handlerExpressionSource: input.handlerExpressionSource ?? null,
    eventName: input.eventName ?? null,
    routeInstruction: input.routeInstruction ?? null,
    linkText: input.linkText ?? null,
    buttonText: input.buttonText ?? null,
    buttonType: input.buttonType ?? null,
    labelText: input.labelText ?? null,
    labelTextSource: input.labelTextSource ?? null,
    fieldControlId: input.fieldControlId ?? null,
    fieldControlIdSource: input.fieldControlIdSource ?? null,
    describedByIds: input.describedByIds ?? [],
    messageKind: input.messageKind ?? null,
    messageText: input.messageText ?? null,
    messageTextSource: input.messageTextSource ?? null,
    messageId: input.messageId ?? null,
    valueDomainExpression: input.valueDomainExpression ?? null,
    valueDomainExpressionSource: input.valueDomainExpressionSource ?? null,
  });
  const controlUseInventoryRows = [
    ...baseControlUseInventoryRows,
    ...(input.additionalControlUseInventoryRows ?? []),
  ];
  return {
    displayText: `App-builder source-lowering invocation: target=${input.targetRef == null ? 'none' : `${input.targetRef.kind}:${input.targetRef.id}`}, control=${input.controlId ?? 'none'}, field=${input.selectedField?.sourceModel.memberName ?? 'none'}, fragments=${fragments.length}, issues=${input.issues.length}.`,
    targetRef: input.targetRef,
    sourceLoweringTargetRefs,
    effectContractIds: appBuilderUniqueEffectContractIds(sourceLoweringTargetRefs.flatMap(appBuilderEffectContractIdsForTargetRef)),
    preflightRow: input.preflightRow ?? null,
    ...(input.preflight == null ? {} : { preflight: input.preflight }),
    controlPattern: input.controlPattern ?? null,
    controlId: input.controlId ?? null,
    selectedField: input.selectedField ?? null,
    fieldSelectionState: input.fieldSelectionState ?? AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
    selectedAction: input.selectedAction ?? null,
    actionSelectionState: input.actionSelectionState ?? AppBuilderSourceLoweringActionSelectionState.NotEvaluated,
    methodParameters: input.methodParameters ?? [],
    serviceMemberName: input.serviceMemberName ?? null,
    serviceMethodName: input.serviceMethodName ?? null,
    serviceCallResultMemberName: input.serviceCallResultMemberName ?? null,
    serviceCallArgumentExpressions: input.serviceCallArgumentExpressions ?? [],
    serviceQueryStateMemberName: input.serviceQueryStateMemberName ?? null,
    serviceQueryStateValueExpression: input.serviceQueryStateValueExpression ?? null,
    serviceQueryReloadMethodName: input.serviceQueryReloadMethodName ?? null,
    serviceCallRefreshMethodName: input.serviceCallRefreshMethodName ?? null,
    asyncDataMemberName: input.asyncDataMemberName ?? null,
    asyncDataPromiseType: input.asyncDataPromiseType ?? null,
    asyncDataInitializerExpression: input.asyncDataInitializerExpression ?? null,
    asyncDataMemberMutability: input.asyncDataMemberMutability ?? null,
    bindingExpression: input.bindingExpression ?? null,
    bindingExpressionSource: input.bindingExpressionSource ?? null,
    handlerExpression: input.handlerExpression ?? null,
    handlerExpressionSource: input.handlerExpressionSource ?? null,
    routeInstruction: input.routeInstruction ?? null,
    routeParamsExpression: input.routeParamsExpression ?? null,
    routeContextExpression: input.routeContextExpression ?? null,
    routeActiveExpression: input.routeActiveExpression ?? null,
    routeTargetAttributeName: input.routeTargetAttributeName ?? null,
    linkText: input.linkText ?? null,
    eventName: input.eventName ?? null,
    buttonText: input.buttonText ?? null,
    buttonType: input.buttonType ?? null,
    messageKind: input.messageKind ?? null,
    messageSelectionState: input.messageSelectionState ?? AppBuilderSourceLoweringMessageSelectionState.NotEvaluated,
    messageText: input.messageText ?? null,
    messageTextSource: input.messageTextSource ?? null,
    messageId: input.messageId ?? null,
    innerControlPatternId: input.innerControlPatternId ?? null,
    innerControlSelectionState: input.innerControlSelectionState ?? AppBuilderSourceLoweringInnerControlSelectionState.NotEvaluated,
    labelText: input.labelText ?? null,
    labelTextSource: input.labelTextSource ?? null,
    fieldControlId: input.fieldControlId ?? null,
    fieldControlIdSource: input.fieldControlIdSource ?? null,
    describedByIds: input.describedByIds ?? [],
    valueDomainExpression: input.valueDomainExpression ?? null,
    valueDomainExpressionSource: input.valueDomainExpressionSource ?? null,
    selectedValueSet: input.selectedValueSet ?? null,
    partInvocation: input.partInvocation ?? null,
    partSourceLowering: input.partSourceLowering ?? null,
    controlUseInventoryRows,
    fragments,
    issues: input.issues,
  };
}

function sourceLoweringFragmentOrigin(
  input: Partial<AppBuilderSourceLoweringInvocation> & {
    readonly targetRef: AppBuilderOntologyRowRef | null;
  },
): AppBuilderSourceLoweringFragmentOrigin | null {
  return input.targetRef == null
    ? null
    : {
        kind: AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
        targetKind: input.targetRef.kind,
        targetId: input.targetRef.id,
        controlPatternId: input.controlPattern?.id ?? null,
        controlId: input.controlId ?? null,
        innerControlPatternId: input.innerControlPatternId ?? null,
      };
}

function sourceFragmentWithSourceLoweringOrigin<TFragment extends AppBuilderPartSourceFragment>(
  fragment: TFragment,
  origin: AppBuilderSourceLoweringFragmentOrigin,
): TFragment {
  return {
    ...fragment,
    origin: fragment.origin ?? origin,
  };
}
