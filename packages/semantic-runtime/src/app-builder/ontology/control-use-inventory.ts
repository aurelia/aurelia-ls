import type { AppBuilderControlId } from '../control-catalog.js';
import type { AppBuilderPartSourceFragment, AppBuilderPartSourceFragmentKind } from '../part-source-invocation.js';
import {
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
} from './control.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import type {
  AppBuilderSourceLoweringCompositionKind,
} from './source-lowering-composition-contracts.js';
import type {
  AppBuilderSourceLoweringBindingExpressionSource,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringFieldControlIdSource,
  AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringLabelTextSource,
  AppBuilderSourceLoweringMessageKind,
  AppBuilderSourceLoweringMessageTextSource,
  AppBuilderSourceLoweringValueDomainExpressionSource,
} from './source-lowering-invocation.js';

/** Source boundary that produced a concrete control-use inventory row. */
export enum AppBuilderControlUseInventorySourceKind {
  /** One app-builder source-lowering invocation produced the control use. */
  SourceLoweringInvocation = 'source-lowering-invocation',
  /** A app-builder source-lowering composition produced the control use directly. */
  SourceLoweringComposition = 'source-lowering-composition',
  /** A direct SourcePlan lowerer produced the control use while emitting full app/source files. */
  SourceLoweringSourcePlan = 'source-lowering-source-plan',
}

/** Stable value list for control-use inventory source kinds. */
export const APP_BUILDER_CONTROL_USE_INVENTORY_SOURCE_KINDS = [
  AppBuilderControlUseInventorySourceKind.SourceLoweringInvocation,
  AppBuilderControlUseInventorySourceKind.SourceLoweringComposition,
  AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
] as const;

/** How an action-like control use connects to an event or submit workflow. */
export enum AppBuilderControlUseActionChannelKind {
  /** The control element itself carries the event binding. */
  DirectControlEvent = 'direct-control-event',
  /** A containing form owns submit handling while this button triggers native submit. */
  ContainingFormSubmit = 'containing-form-submit',
  /** A native anchor spends Aurelia router load navigation. */
  RouterLoadNavigation = 'router-load-navigation',
}

/** Stable value list for control-use action channel kinds. */
export const APP_BUILDER_CONTROL_USE_ACTION_CHANNEL_KINDS = [
  AppBuilderControlUseActionChannelKind.DirectControlEvent,
  AppBuilderControlUseActionChannelKind.ContainingFormSubmit,
  AppBuilderControlUseActionChannelKind.RouterLoadNavigation,
] as const;

/** Generated-source reference for a concrete control use before file spans exist. */
export interface AppBuilderControlUseSourceReference {
  /** Source boundary that produced this control use. */
  readonly sourceKind: AppBuilderControlUseInventorySourceKind;
  /** Source-lowering ontology target that admitted this generated control use. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Composition kind when the control was produced directly by a composition. */
  readonly compositionKind: AppBuilderSourceLoweringCompositionKind | null;
  /** Fragment kinds attached to the source occurrence. */
  readonly fragmentKinds: readonly AppBuilderPartSourceFragmentKind[];
  /** Number of source fragments associated with this occurrence. */
  readonly fragmentCount: number;
}

/** Concrete generated control occurrence emitted by app-builder source lowering. */
export interface AppBuilderControlUseInventoryRow {
  /** Generated-source reference for this concrete control occurrence. */
  readonly sourceReference: AppBuilderControlUseSourceReference;
  /** Source realization policy proven or selected for this occurrence. */
  readonly realizationPolicyId: AppBuilderControlRealizationPolicyId;
  /** Semantic control pattern represented by this occurrence. */
  readonly controlPatternId: AppBuilderControlPatternId;
  /** Leaf native control id when the occurrence lowers through the control catalog. */
  readonly controlId: AppBuilderControlId | null;
  /** Inner control pattern when a wrapper/group occurrence owns a leaf control. */
  readonly innerControlPatternId: AppBuilderControlPatternId | null;
  /** Domain field represented by this occurrence, when field-backed. */
  readonly fieldName: string | null;
  /** Domain action represented by this occurrence, when action-backed. */
  readonly actionName: string | null;
  /** Binding expression connected to the control value channel. */
  readonly bindingExpression: string | null;
  /** Provenance for the binding expression when present. */
  readonly bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource | null;
  /** Action handler expression connected to the control or containing submit workflow. */
  readonly handlerExpression: string | null;
  /** Provenance for the handler expression when present. */
  readonly handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource | null;
  /** Event name spent by the action channel when present. */
  readonly eventName: string | null;
  /** Action-channel family used by this control occurrence. */
  readonly actionChannelKind: AppBuilderControlUseActionChannelKind | null;
  /** Route instruction or router load expression spent by a navigation control occurrence. */
  readonly routeInstruction: string | null;
  /** Visible link text spent by a navigation control occurrence. */
  readonly linkText: string | null;
  /** Visible button text when this occurrence is a button. */
  readonly buttonText: string | null;
  /** Native button type when this occurrence is a button. */
  readonly buttonType: AppBuilderSourceLoweringButtonType | null;
  /** Label text or standalone accessible-name text associated with this control occurrence. */
  readonly labelText: string | null;
  /** Provenance for label/accessibility text when present. */
  readonly labelTextSource: AppBuilderSourceLoweringLabelTextSource | null;
  /** DOM id assigned to a field control by a wrapper/group. */
  readonly fieldControlId: string | null;
  /** Provenance for the field control id when present. */
  readonly fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource | null;
  /** Help/error/status ids associated through aria-describedby. */
  readonly describedByIds: readonly string[];
  /** Message kind when this occurrence is feedback/status text. */
  readonly messageKind: AppBuilderSourceLoweringMessageKind | null;
  /** Message text when this occurrence is feedback/status text. */
  readonly messageText: string | null;
  /** Provenance for the message text when present. */
  readonly messageTextSource: AppBuilderSourceLoweringMessageTextSource | null;
  /** DOM id for a generated message occurrence. */
  readonly messageId: string | null;
  /** Option/value-domain expression connected to choice controls. */
  readonly valueDomainExpression: string | null;
  /** Provenance for the value-domain expression when present. */
  readonly valueDomainExpressionSource: AppBuilderSourceLoweringValueDomainExpressionSource | null;
}

/** Input facts for producing one control-use inventory row. */
export interface AppBuilderControlUseInventoryRowInput {
  /** Source boundary that produced this control use. */
  readonly sourceKind: AppBuilderControlUseInventorySourceKind;
  /** Source-lowering ontology target that admitted this generated control use. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** Composition kind when the control was produced directly by a composition. */
  readonly compositionKind?: AppBuilderSourceLoweringCompositionKind | null;
  /** Generated fragments attached to this control occurrence. */
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  /** Source realization policy proven or selected for this occurrence. */
  readonly realizationPolicyId?: AppBuilderControlRealizationPolicyId | null;
  /** Semantic control pattern represented by this occurrence. */
  readonly controlPatternId?: AppBuilderControlPatternId | null;
  /** Leaf native control id when the occurrence lowers through the control catalog. */
  readonly controlId?: AppBuilderControlId | null;
  /** Inner control pattern when a wrapper/group occurrence owns a leaf control. */
  readonly innerControlPatternId?: AppBuilderControlPatternId | null;
  /** Domain field represented by this occurrence, when field-backed. */
  readonly fieldName?: string | null;
  /** Domain action represented by this occurrence, when action-backed. */
  readonly actionName?: string | null;
  /** Binding expression connected to the control value channel. */
  readonly bindingExpression?: string | null;
  /** Provenance for the binding expression when present. */
  readonly bindingExpressionSource?: AppBuilderSourceLoweringBindingExpressionSource | null;
  /** Action handler expression connected to the control or containing submit workflow. */
  readonly handlerExpression?: string | null;
  /** Provenance for the handler expression when present. */
  readonly handlerExpressionSource?: AppBuilderSourceLoweringHandlerExpressionSource | null;
  /** Event name spent by the action channel when present. */
  readonly eventName?: string | null;
  /** Action-channel family used by this control occurrence. */
  readonly actionChannelKind?: AppBuilderControlUseActionChannelKind | null;
  /** Route instruction or router load expression spent by a navigation control occurrence. */
  readonly routeInstruction?: string | null;
  /** Visible link text spent by a navigation control occurrence. */
  readonly linkText?: string | null;
  /** Visible button text when this occurrence is a button. */
  readonly buttonText?: string | null;
  /** Native button type when this occurrence is a button. */
  readonly buttonType?: AppBuilderSourceLoweringButtonType | null;
  /** Label text or standalone accessible-name text associated with this control occurrence. */
  readonly labelText?: string | null;
  /** Provenance for label/accessibility text when present. */
  readonly labelTextSource?: AppBuilderSourceLoweringLabelTextSource | null;
  /** DOM id assigned to a field control by a wrapper/group. */
  readonly fieldControlId?: string | null;
  /** Provenance for the field control id when present. */
  readonly fieldControlIdSource?: AppBuilderSourceLoweringFieldControlIdSource | null;
  /** Help/error/status ids associated through aria-describedby. */
  readonly describedByIds?: readonly string[] | null;
  /** Message kind when this occurrence is feedback/status text. */
  readonly messageKind?: AppBuilderSourceLoweringMessageKind | null;
  /** Message text when this occurrence is feedback/status text. */
  readonly messageText?: string | null;
  /** Provenance for the message text when present. */
  readonly messageTextSource?: AppBuilderSourceLoweringMessageTextSource | null;
  /** DOM id for a generated message occurrence. */
  readonly messageId?: string | null;
  /** Option/value-domain expression connected to choice controls. */
  readonly valueDomainExpression?: string | null;
  /** Provenance for the value-domain expression when present. */
  readonly valueDomainExpressionSource?: AppBuilderSourceLoweringValueDomainExpressionSource | null;
}

/** Build one generated control-use inventory row when a source occurrence exists. */
export function appBuilderControlUseInventoryRow(
  input: AppBuilderControlUseInventoryRowInput,
): AppBuilderControlUseInventoryRow | null {
  if (input.targetRef == null || input.fragments.length === 0 || input.controlPatternId == null) {
    return null;
  }
  return {
    sourceReference: {
      sourceKind: input.sourceKind,
      targetRef: input.targetRef,
      compositionKind: input.compositionKind ?? null,
      fragmentKinds: uniqueFragmentKinds(input.fragments),
      fragmentCount: input.fragments.length,
    },
    realizationPolicyId: input.realizationPolicyId ?? AppBuilderControlRealizationPolicyId.InlineNative,
    controlPatternId: input.controlPatternId,
    controlId: input.controlId ?? null,
    innerControlPatternId: input.innerControlPatternId ?? null,
    fieldName: input.fieldName ?? null,
    actionName: input.actionName ?? null,
    bindingExpression: input.bindingExpression ?? null,
    bindingExpressionSource: input.bindingExpressionSource ?? null,
    handlerExpression: input.handlerExpression ?? null,
    handlerExpressionSource: input.handlerExpressionSource ?? null,
    eventName: input.eventName ?? null,
    actionChannelKind: input.actionChannelKind ?? null,
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
  };
}

/** Build generated control-use inventory rows from source-lowering invocation facts. */
export function appBuilderControlUseInventoryRowsForInvocation(
  input: Omit<AppBuilderControlUseInventoryRowInput, 'sourceKind' | 'compositionKind'>,
): readonly AppBuilderControlUseInventoryRow[] {
  const row = appBuilderControlUseInventoryRow({
    ...input,
    sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringInvocation,
    actionChannelKind: input.eventName == null
      ? input.actionChannelKind ?? null
      : input.actionChannelKind ?? AppBuilderControlUseActionChannelKind.DirectControlEvent,
  });
  return row == null ? [] : [row];
}

function uniqueFragmentKinds(
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderPartSourceFragmentKind[] {
  const seen = new Set<AppBuilderPartSourceFragmentKind>();
  const rows: AppBuilderPartSourceFragmentKind[] = [];
  for (const fragment of fragments) {
    if (seen.has(fragment.kind)) {
      continue;
    }
    seen.add(fragment.kind);
    rows.push(fragment.kind);
  }
  return rows;
}
