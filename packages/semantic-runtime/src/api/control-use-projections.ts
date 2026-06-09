import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  APP_BUILDER_CONTROLS,
  AppBuilderControlId,
  type AppBuilderControlDescriptor,
} from '../app-builder/control-catalog.js';
import {
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
} from '../app-builder/ontology/control.js';
import {
  AppBuilderControlUseActionChannelKind,
} from '../app-builder/ontology/control-use-inventory.js';
import {
  RuntimeBindingValueChannelKind,
  type RuntimeBindingDataFlow,
  type RuntimeBindingValueChannel,
} from '../observation/runtime-binding-observation.js';
import { camelCaseAttributeName } from '../template/attribute-mapper.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import {
  HtmlElement,
  HtmlText,
  type HtmlAttribute,
  type HtmlNodeReference,
} from '../template/html-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type {
  RuntimeBindingSourceOperation,
  RuntimeBindingTargetAccess,
  RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingTargetOperationKind,
} from '../template/runtime-binding.js';
import {
  bindingProjectionResources,
} from './binding-projections.js';
import type {
  SemanticControlUseInventoryRow,
} from './contracts.js';
import {
  SemanticControlUseClassificationKind,
  SemanticControlUseInventorySourceKind,
} from './contracts.js';
import {
  resourceLocalBindingDataFlows,
  resourceLocalBindingSourceOperations,
  resourceLocalBindingTargetAccesses,
  resourceLocalBindingTargetOperations,
  resourceLocalBindingValueChannels,
} from './runtime-resource-ownership.js';
import { describeAddress } from './source-reference.js';

const VALUE_CONTROL_CHANNEL_KINDS = new Set<RuntimeBindingValueChannelKind>([
  RuntimeBindingValueChannelKind.RawProperty,
  RuntimeBindingValueChannelKind.CheckedBoolean,
  RuntimeBindingValueChannelKind.CheckedRadioValue,
  RuntimeBindingValueChannelKind.CheckedCollectionMembership,
  RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean,
  RuntimeBindingValueChannelKind.SelectSingleOptionValue,
  RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
  RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
]);

const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset']);
const VALUE_CONTROL_PREFERRED_ACTION_EVENTS = ['change', 'input'] as const;
const PLAIN_TEXT_INPUT_TYPES = new Set(['text']);

export function readControlUseInventoryRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticControlUseInventoryRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticControlUseInventoryRow[] => {
      const targetAccesses = indexByProductHandle(resourceLocalBindingTargetAccesses(store, resource));
      const targetOperations = indexByProductHandle(resourceLocalBindingTargetOperations(store, resource));
      const sourceOperations = indexByProductHandle(resourceLocalBindingSourceOperations(store, resource));
      const dataFlowsByValueChannel = indexDataFlowsByValueChannel(
        resourceLocalBindingDataFlows(store, resource),
      );
      const valueChannels = resourceLocalBindingValueChannels(store, resource);
      const elementActions = indexDirectElementActions({
        store,
        valueChannels,
        targetOperations,
        dataFlowsByValueChannel,
      });
      const valueChannelRows = valueChannels
        .flatMap((valueChannel): readonly SemanticControlUseInventoryRow[] => {
          const targetAccess = targetAccessForValueChannel(valueChannel, targetAccesses);
          const targetOperation = targetOperationForValueChannel(valueChannel, targetOperations);
          const sourceOperation = sourceOperationForValueChannel(valueChannel, sourceOperations);
          const element = htmlElementForTarget(store, targetAccess, targetOperation, sourceOperation);
          if (element == null) {
            return [];
          }
          const attributes = readElementAttributes(store, element);
          const dataFlow = firstDataFlowForValueChannel(valueChannel, dataFlowsByValueChannel);
          const descriptor = controlDescriptorForElement(valueChannel, targetAccess, targetOperation, sourceOperation, element, attributes);
          if (descriptor != null) {
            return [controlUseInventoryRowForDescriptor({
              definitionName: resource.compilation.definition.name,
              store,
              valueChannel,
              targetAccess,
              targetOperation,
              sourceOperation,
              element,
              attributes,
              dataFlow,
              descriptor,
              action: preferredElementAction(elementActions, element),
              handles,
            })];
          }
          if (isNativeButtonAction(valueChannel, targetOperation, element, attributes)) {
            return [nativeButtonActionRow({
              definitionName: resource.compilation.definition.name,
              store,
              valueChannel,
              targetAccess,
              targetOperation,
              sourceOperation,
              element,
              attributes,
              dataFlow,
              handles,
            })];
          }
          return [];
        });
      return [
        ...valueChannelRows,
        ...containingFormSubmitButtonRows({
          definitionName: resource.compilation.definition.name,
          store,
          valueChannels,
          targetOperations,
          dataFlowsByValueChannel,
          handles,
        }),
        ...staticRouterLoadNavigationRows({
          definitionName: resource.compilation.definition.name,
          store,
          rootNodes: resource.compilation.html.document.rootNodes,
          handles,
        }),
        ...staticFormMessageRows({
          definitionName: resource.compilation.definition.name,
          store,
          rootNodes: resource.compilation.html.document.rootNodes,
          handles,
        }),
      ];
    })
    .sort((left, right) =>
      [
        left.definitionName,
        left.controlPatternId,
        left.controlId ?? '',
        left.bindingExpression ?? '',
        left.source?.path ?? '',
        left.source?.start ?? '',
      ].join('|').localeCompare([
        right.definitionName,
        right.controlPatternId,
        right.controlId ?? '',
        right.bindingExpression ?? '',
        right.source?.path ?? '',
        right.source?.start ?? '',
      ].join('|'))
    );
}

function controlUseInventoryRowForDescriptor(input: ControlUseInventoryRowInput): SemanticControlUseInventoryRow {
  const dataFlow = input.dataFlow;
  return {
    definitionName: input.definitionName,
    sourceKind: SemanticControlUseInventorySourceKind.AuthoredRuntimeBinding,
    classificationKind: SemanticControlUseClassificationKind.NativeValueChannel,
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.ExistingAppControl,
      AppBuilderControlRealizationPolicyId.InlineNative,
    ],
    controlPatternId: controlPatternForControlId(input.descriptor.id),
    controlId: input.descriptor.id,
    semanticValueKind: input.descriptor.semanticValueKind,
    transportKind: input.descriptor.transportKind,
    tagName: input.element.tagName,
    staticType: staticAttributeValue(input.attributes, 'type'),
    hasMultiple: hasStaticAttribute(input.attributes, 'multiple'),
    actionChannelKind: input.action?.actionChannelKind ?? null,
    routeInstruction: null,
    linkText: null,
    buttonText: null,
    buttonType: null,
    bindingKind: input.valueChannel.binding.bindingKind,
    targetProperty: targetProperty(input.targetAccess, input.targetOperation, input.sourceOperation),
    targetAttribute: input.targetOperation?.targetAttribute ?? null,
    targetOperationKind: input.targetOperation?.operationKind ?? null,
    sourceOperationKind: input.sourceOperation?.operationKind ?? null,
    valueChannelKind: input.valueChannel.channelKind,
    eventName: input.action?.eventName ?? (input.targetOperation?.operationKind === RuntimeBindingTargetOperationKind.EventListenerAdd
      ? input.targetOperation.targetAttribute
      : null),
    bindingExpression: bindingExpression(input.store, dataFlow),
    handlerExpression: input.action == null ? null : bindingExpression(input.store, input.action.dataFlow),
    handlerRootName: input.action?.dataFlow?.sourceRootName ?? null,
    sourceName: dataFlow?.sourceName ?? null,
    sourceRootName: dataFlow?.sourceRootName ?? null,
    sourceType: dataFlow?.sourceType?.display ?? null,
    targetValueType: dataFlow?.targetValueType?.display ?? input.valueChannel.runtimeValueType?.display ?? null,
    sourceWritable: dataFlow?.sourceWritable ?? null,
    sourceAssignmentKind: dataFlow?.sourceAssignmentKind ?? null,
    sourceToTargetAssignable: dataFlow?.sourceToTargetAssignable ?? null,
    targetToSourceAssignable: dataFlow?.targetToSourceAssignable ?? null,
    source: describeAddress(input.store, controlUseSourceAddressHandle(input)),
    ...(input.handles ? handlesForControlUse(input) : {}),
  };
}

function nativeButtonActionRow(input: ControlUseInventoryRowInputWithoutDescriptor): SemanticControlUseInventoryRow {
  const dataFlow = input.dataFlow;
  return {
    definitionName: input.definitionName,
    sourceKind: SemanticControlUseInventorySourceKind.AuthoredRuntimeBinding,
    classificationKind: SemanticControlUseClassificationKind.NativeButtonAction,
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.ExistingAppControl,
      AppBuilderControlRealizationPolicyId.InlineNative,
    ],
    controlPatternId: AppBuilderControlPatternId.NativeButton,
    controlId: null,
    semanticValueKind: null,
    transportKind: null,
    tagName: input.element.tagName,
    staticType: staticAttributeValue(input.attributes, 'type'),
    hasMultiple: hasStaticAttribute(input.attributes, 'multiple'),
    actionChannelKind: input.actionChannelKind ?? AppBuilderControlUseActionChannelKind.DirectControlEvent,
    routeInstruction: null,
    linkText: null,
    buttonText: nativeButtonText(input.store, input.element, input.attributes),
    buttonType: nativeButtonType(input.element, input.attributes, input.actionChannelKind ?? null),
    bindingKind: input.valueChannel.binding.bindingKind,
    targetProperty: targetProperty(input.targetAccess, input.targetOperation, input.sourceOperation),
    targetAttribute: input.targetOperation?.targetAttribute ?? null,
    targetOperationKind: input.targetOperation?.operationKind ?? null,
    sourceOperationKind: input.sourceOperation?.operationKind ?? null,
    valueChannelKind: input.valueChannel.channelKind,
    eventName: input.targetOperation?.targetAttribute ?? null,
    bindingExpression: bindingExpression(input.store, dataFlow),
    handlerExpression: bindingExpression(input.store, dataFlow),
    handlerRootName: dataFlow?.sourceRootName ?? null,
    sourceName: dataFlow?.sourceName ?? null,
    sourceRootName: dataFlow?.sourceRootName ?? null,
    sourceType: dataFlow?.sourceType?.display ?? null,
    targetValueType: dataFlow?.targetValueType?.display ?? input.valueChannel.runtimeValueType?.display ?? null,
    sourceWritable: dataFlow?.sourceWritable ?? null,
    sourceAssignmentKind: dataFlow?.sourceAssignmentKind ?? null,
    sourceToTargetAssignable: dataFlow?.sourceToTargetAssignable ?? null,
    targetToSourceAssignable: dataFlow?.targetToSourceAssignable ?? null,
    source: describeAddress(input.store, controlUseSourceAddressHandle(input)),
    ...(input.handles ? handlesForControlUse(input) : {}),
  };
}

interface StaticRouterLoadNavigationRowsInput {
  readonly definitionName: string;
  readonly store: KernelStore;
  readonly rootNodes: readonly HtmlNodeReference[];
  readonly handles: boolean;
}

function staticRouterLoadNavigationRows(
  input: StaticRouterLoadNavigationRowsInput,
): readonly SemanticControlUseInventoryRow[] {
  return elementsForNodeReferences(input.store, input.rootNodes)
    .flatMap((element): readonly SemanticControlUseInventoryRow[] => {
      if (normalizeTagName(element.tagName) !== 'a') {
        return [];
      }
      const attributes = readElementAttributes(input.store, element);
      const routeInstruction = staticAttributeValue(attributes, 'load');
      if (routeInstruction == null) {
        return [];
      }
      return [staticRouterLoadNavigationRow({
        definitionName: input.definitionName,
        store: input.store,
        element,
        attributes,
        routeInstruction,
        handles: input.handles,
      })];
    });
}

interface StaticRouterLoadNavigationRowInput {
  readonly definitionName: string;
  readonly store: KernelStore;
  readonly element: HtmlElement;
  readonly attributes: readonly HtmlAttribute[];
  readonly routeInstruction: string;
  readonly handles: boolean;
}

function staticRouterLoadNavigationRow(input: StaticRouterLoadNavigationRowInput): SemanticControlUseInventoryRow {
  const linkText = textContentForElement(input.store, input.element).replace(/\s+/g, ' ').trim() || null;
  return {
    definitionName: input.definitionName,
    sourceKind: SemanticControlUseInventorySourceKind.AuthoredStaticTemplate,
    classificationKind: SemanticControlUseClassificationKind.NativeLinkNavigation,
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.ExistingAppControl,
      AppBuilderControlRealizationPolicyId.InlineNative,
    ],
    controlPatternId: AppBuilderControlPatternId.NativeLinkNavigation,
    controlId: null,
    semanticValueKind: null,
    transportKind: null,
    tagName: input.element.tagName,
    staticType: staticAttributeValue(input.attributes, 'type'),
    hasMultiple: hasStaticAttribute(input.attributes, 'multiple'),
    actionChannelKind: AppBuilderControlUseActionChannelKind.RouterLoadNavigation,
    routeInstruction: input.routeInstruction,
    linkText,
    buttonText: null,
    buttonType: null,
    bindingKind: null,
    targetProperty: null,
    targetAttribute: 'load',
    targetOperationKind: null,
    sourceOperationKind: null,
    valueChannelKind: null,
    eventName: null,
    bindingExpression: null,
    handlerExpression: null,
    handlerRootName: null,
    sourceName: null,
    sourceRootName: null,
    sourceType: null,
    targetValueType: null,
    sourceWritable: null,
    sourceAssignmentKind: null,
    sourceToTargetAssignable: null,
    targetToSourceAssignable: null,
    source: describeAddress(input.store, input.element.sourceAddressHandle),
    ...(input.handles ? staticRouterLoadNavigationHandles(input) : {}),
  };
}

function staticRouterLoadNavigationHandles(input: StaticRouterLoadNavigationRowInput): Pick<SemanticControlUseInventoryRow, 'handles'> {
  return {
    handles: {
      bindingProductHandle: null,
      valueChannelProductHandle: null,
      targetAccessProductHandle: null,
      targetOperationProductHandle: null,
      sourceOperationProductHandle: null,
      dataFlowProductHandle: null,
      expressionProductHandle: null,
      htmlNodeProductHandle: input.element.productHandle,
      sourceAddressHandle: input.element.sourceAddressHandle,
    },
  };
}

interface StaticFormMessageRowsInput {
  readonly definitionName: string;
  readonly store: KernelStore;
  readonly rootNodes: readonly HtmlNodeReference[];
  readonly handles: boolean;
}

function staticFormMessageRows(
  input: StaticFormMessageRowsInput,
): readonly SemanticControlUseInventoryRow[] {
  return elementsForNodeReferences(input.store, input.rootNodes)
    .flatMap((element): readonly SemanticControlUseInventoryRow[] => {
      const tagName = normalizeTagName(element.tagName);
      if (tagName !== 'p' && tagName !== 'div' && tagName !== 'span') {
        return [];
      }
      const attributes = readElementAttributes(input.store, element);
      const role = staticAttributeValue(attributes, 'role')?.toLowerCase() ?? null;
      if (role !== 'status' && role !== 'alert') {
        return [];
      }
      return [staticFormMessageRow({
        definitionName: input.definitionName,
        store: input.store,
        element,
        attributes,
        handles: input.handles,
      })];
    });
}

interface StaticFormMessageRowInput {
  readonly definitionName: string;
  readonly store: KernelStore;
  readonly element: HtmlElement;
  readonly attributes: readonly HtmlAttribute[];
  readonly handles: boolean;
}

function staticFormMessageRow(input: StaticFormMessageRowInput): SemanticControlUseInventoryRow {
  return {
    definitionName: input.definitionName,
    sourceKind: SemanticControlUseInventorySourceKind.AuthoredStaticTemplate,
    classificationKind: SemanticControlUseClassificationKind.NativeFormMessage,
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.ExistingAppControl,
      AppBuilderControlRealizationPolicyId.InlineNative,
    ],
    controlPatternId: AppBuilderControlPatternId.FormMessage,
    controlId: null,
    semanticValueKind: null,
    transportKind: null,
    tagName: input.element.tagName,
    staticType: null,
    hasMultiple: false,
    actionChannelKind: null,
    routeInstruction: null,
    linkText: null,
    buttonText: null,
    buttonType: null,
    bindingKind: null,
    targetProperty: null,
    targetAttribute: 'role',
    targetOperationKind: null,
    sourceOperationKind: null,
    valueChannelKind: null,
    eventName: null,
    bindingExpression: null,
    handlerExpression: null,
    handlerRootName: null,
    sourceName: null,
    sourceRootName: null,
    sourceType: null,
    targetValueType: null,
    sourceWritable: null,
    sourceAssignmentKind: null,
    sourceToTargetAssignable: null,
    targetToSourceAssignable: null,
    source: describeAddress(input.store, input.element.sourceAddressHandle),
    ...(input.handles ? staticFormMessageHandles(input) : {}),
  };
}

function staticFormMessageHandles(input: StaticFormMessageRowInput): Pick<SemanticControlUseInventoryRow, 'handles'> {
  return {
    handles: {
      bindingProductHandle: null,
      valueChannelProductHandle: null,
      targetAccessProductHandle: null,
      targetOperationProductHandle: null,
      sourceOperationProductHandle: null,
      dataFlowProductHandle: null,
      expressionProductHandle: null,
      htmlNodeProductHandle: input.element.productHandle,
      sourceAddressHandle: input.element.sourceAddressHandle,
    },
  };
}

function handlesForControlUse(input: ControlUseInventoryRowInputWithoutDescriptor): Pick<SemanticControlUseInventoryRow, 'handles'> {
  return {
    handles: {
      bindingProductHandle: input.valueChannel.binding.productHandle,
      valueChannelProductHandle: input.valueChannel.productHandle,
      targetAccessProductHandle: input.targetAccess?.productHandle ?? null,
      targetOperationProductHandle: input.targetOperation?.productHandle ?? null,
      sourceOperationProductHandle: input.sourceOperation?.productHandle ?? null,
      dataFlowProductHandle: input.dataFlow?.productHandle ?? null,
      expressionProductHandle: input.dataFlow?.expressionProductHandle ?? null,
      htmlNodeProductHandle: input.element.productHandle,
      sourceAddressHandle: controlUseSourceAddressHandle(input),
    },
  };
}

interface ControlUseInventoryRowInputWithoutDescriptor {
  readonly definitionName: string;
  readonly store: KernelStore;
  readonly valueChannel: RuntimeBindingValueChannel;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly element: HtmlElement;
  readonly attributes: readonly HtmlAttribute[];
  readonly dataFlow: RuntimeBindingDataFlow | null;
  readonly actionChannelKind?: AppBuilderControlUseActionChannelKind | null;
  readonly sourceAddressHandle?: AddressHandle | null;
  readonly handles: boolean;
}

interface ControlUseInventoryRowInput extends ControlUseInventoryRowInputWithoutDescriptor {
  readonly descriptor: AppBuilderControlDescriptor;
  readonly action: ControlElementAction | null;
}

interface ControlElementAction {
  readonly valueChannel: RuntimeBindingValueChannel;
  readonly targetOperation: RuntimeBindingTargetOperation;
  readonly dataFlow: RuntimeBindingDataFlow | null;
  readonly eventName: string;
  readonly actionChannelKind: AppBuilderControlUseActionChannelKind;
}

function controlDescriptorForElement(
  valueChannel: RuntimeBindingValueChannel,
  targetAccess: RuntimeBindingTargetAccess | null,
  targetOperation: RuntimeBindingTargetOperation | null,
  sourceOperation: RuntimeBindingSourceOperation | null,
  element: HtmlElement,
  attributes: readonly HtmlAttribute[],
): AppBuilderControlDescriptor | null {
  if (!VALUE_CONTROL_CHANNEL_KINDS.has(valueChannel.channelKind)) {
    return null;
  }
  const property = targetProperty(targetAccess, targetOperation, sourceOperation);
  if (property == null) {
    return null;
  }
  return APP_BUILDER_CONTROLS.find((descriptor) =>
    descriptorMatchesElement(descriptor, valueChannel.channelKind, property, element, attributes)
  ) ?? null;
}

function descriptorMatchesElement(
  descriptor: AppBuilderControlDescriptor,
  channelKind: RuntimeBindingValueChannelKind,
  targetPropertyName: string,
  element: HtmlElement,
  attributes: readonly HtmlAttribute[],
): boolean {
  if (targetPropertyName !== runtimeTargetNameForDescriptor(descriptor)) {
    return false;
  }
  if (!descriptor.valueChannels.includes(channelKind)) {
    return false;
  }
  if (normalizeTagName(element.tagName) !== normalizeTagName(descriptor.sourceElement.tagName)) {
    return false;
  }
  if (!descriptor.sourceElement.staticAttributes.every((attribute) =>
    descriptorStaticAttributeMatches(attribute.rawName, attribute.rawValue ?? null, attributes)
  )) {
    return false;
  }
  switch (descriptor.id) {
    case AppBuilderControlId.TextInput: {
      const type = staticAttributeValue(attributes, 'type');
      return type == null || PLAIN_TEXT_INPUT_TYPES.has(type.toLowerCase());
    }
    case AppBuilderControlId.SingleSelect:
      return !hasStaticAttribute(attributes, 'multiple')
        && channelKind !== RuntimeBindingValueChannelKind.SelectMultipleOptionValues;
    case AppBuilderControlId.MultiSelect:
      return hasStaticAttribute(attributes, 'multiple')
        || channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues;
    default:
      return true;
  }
}

function isNativeButtonAction(
  valueChannel: RuntimeBindingValueChannel,
  targetOperation: RuntimeBindingTargetOperation | null,
  element: HtmlElement,
  attributes: readonly HtmlAttribute[],
): boolean {
  if (
    valueChannel.channelKind !== RuntimeBindingValueChannelKind.EventHandlerInvocation
    || targetOperation?.operationKind !== RuntimeBindingTargetOperationKind.EventListenerAdd
  ) {
    return false;
  }
  const tagName = normalizeTagName(element.tagName);
  if (tagName === 'button') {
    return true;
  }
  if (tagName !== 'input') {
    return false;
  }
  const type = staticAttributeValue(attributes, 'type')?.toLowerCase() ?? '';
  return BUTTON_INPUT_TYPES.has(type);
}

interface DirectElementActionsInput {
  readonly store: KernelStore;
  readonly valueChannels: readonly RuntimeBindingValueChannel[];
  readonly targetOperations: ReadonlyMap<ProductHandle, RuntimeBindingTargetOperation>;
  readonly dataFlowsByValueChannel: ReadonlyMap<ProductHandle, readonly RuntimeBindingDataFlow[]>;
}

function indexDirectElementActions(
  input: DirectElementActionsInput,
): ReadonlyMap<ProductHandle, readonly ControlElementAction[]> {
  const map = new Map<ProductHandle, ControlElementAction[]>();
  for (const valueChannel of input.valueChannels) {
    const targetOperation = targetOperationForValueChannel(valueChannel, input.targetOperations);
    if (
      valueChannel.channelKind !== RuntimeBindingValueChannelKind.EventHandlerInvocation
      || targetOperation?.operationKind !== RuntimeBindingTargetOperationKind.EventListenerAdd
    ) {
      continue;
    }
    const element = htmlElementForTarget(input.store, null, targetOperation, null);
    if (element?.productHandle == null) {
      continue;
    }
    const bucket = map.get(element.productHandle) ?? [];
    bucket.push({
      valueChannel,
      targetOperation,
      dataFlow: firstDataFlowForValueChannel(valueChannel, input.dataFlowsByValueChannel),
      eventName: targetOperation.targetAttribute,
      actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
    });
    map.set(element.productHandle, bucket);
  }
  return map;
}

function preferredElementAction(
  actionsByElement: ReadonlyMap<ProductHandle, readonly ControlElementAction[]>,
  element: HtmlElement,
): ControlElementAction | null {
  if (element.productHandle == null) {
    return null;
  }
  const actions = actionsByElement.get(element.productHandle) ?? [];
  const preferred = VALUE_CONTROL_PREFERRED_ACTION_EVENTS
    .flatMap((eventName) => actions.filter((action) => action.eventName === eventName))[0] ?? null;
  return preferred ?? actions[0] ?? null;
}

interface ContainingFormSubmitButtonRowsInput {
  readonly definitionName: string;
  readonly store: KernelStore;
  readonly valueChannels: readonly RuntimeBindingValueChannel[];
  readonly targetOperations: ReadonlyMap<ProductHandle, RuntimeBindingTargetOperation>;
  readonly dataFlowsByValueChannel: ReadonlyMap<ProductHandle, readonly RuntimeBindingDataFlow[]>;
  readonly handles: boolean;
}

function containingFormSubmitButtonRows(
  input: ContainingFormSubmitButtonRowsInput,
): readonly SemanticControlUseInventoryRow[] {
  const rows: SemanticControlUseInventoryRow[] = [];
  for (const valueChannel of input.valueChannels) {
    const targetOperation = targetOperationForValueChannel(valueChannel, input.targetOperations);
    const form = htmlElementForTarget(input.store, null, targetOperation, null);
    if (!isContainingFormSubmitChannel(valueChannel, targetOperation, form)) {
      continue;
    }
    const dataFlow = firstDataFlowForValueChannel(valueChannel, input.dataFlowsByValueChannel);
    for (const button of submitButtonsForForm(input.store, form)) {
      const attributes = readElementAttributes(input.store, button);
      rows.push(nativeButtonActionRow({
        definitionName: input.definitionName,
        store: input.store,
        valueChannel,
        targetAccess: null,
        targetOperation,
        sourceOperation: null,
        element: button,
        attributes,
        dataFlow,
        actionChannelKind: AppBuilderControlUseActionChannelKind.ContainingFormSubmit,
        sourceAddressHandle: button.sourceAddressHandle,
        handles: input.handles,
      }));
    }
  }
  return rows;
}

function isContainingFormSubmitChannel(
  valueChannel: RuntimeBindingValueChannel,
  targetOperation: RuntimeBindingTargetOperation | null,
  element: HtmlElement | null,
): element is HtmlElement {
  return valueChannel.channelKind === RuntimeBindingValueChannelKind.EventHandlerInvocation
    && targetOperation?.operationKind === RuntimeBindingTargetOperationKind.EventListenerAdd
    && targetOperation.targetAttribute === 'submit'
    && element != null
    && normalizeTagName(element.tagName) === 'form';
}

function submitButtonsForForm(
  store: KernelStore,
  form: HtmlElement,
): readonly HtmlElement[] {
  return descendantElements(store, form).filter((element) => {
    const attributes = readElementAttributes(store, element);
    const tagName = normalizeTagName(element.tagName);
    if (tagName === 'button') {
      const type = staticAttributeValue(attributes, 'type')?.toLowerCase() ?? 'submit';
      return type === 'submit';
    }
    if (tagName !== 'input') {
      return false;
    }
    return staticAttributeValue(attributes, 'type')?.toLowerCase() === 'submit';
  });
}

function elementsForNodeReferences(
  store: KernelStore,
  nodes: readonly HtmlNodeReference[],
): readonly HtmlElement[] {
  const rows: HtmlElement[] = [];
  for (const nodeReference of nodes) {
    const node = htmlNodeForReference(store, nodeReference);
    if (node instanceof HtmlElement) {
      rows.push(node, ...descendantElements(store, node));
    }
  }
  return rows;
}

function descendantElements(
  store: KernelStore,
  element: HtmlElement,
): readonly HtmlElement[] {
  const rows: HtmlElement[] = [];
  for (const child of element.children) {
    const node = htmlNodeForReference(store, child);
    if (node instanceof HtmlElement) {
      rows.push(node, ...descendantElements(store, node));
    }
  }
  return rows;
}

function nativeButtonText(
  store: KernelStore,
  element: HtmlElement,
  attributes: readonly HtmlAttribute[],
): string | null {
  const tagName = normalizeTagName(element.tagName);
  if (tagName === 'input') {
    return staticAttributeValue(attributes, 'value');
  }
  if (tagName !== 'button') {
    return null;
  }
  const text = textContentForElement(store, element).replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

function nativeButtonType(
  element: HtmlElement,
  attributes: readonly HtmlAttribute[],
  actionChannelKind: AppBuilderControlUseActionChannelKind | null,
): string | null {
  const tagName = normalizeTagName(element.tagName);
  const type = staticAttributeValue(attributes, 'type')?.toLowerCase() ?? null;
  if (tagName === 'input') {
    return type;
  }
  if (tagName !== 'button') {
    return null;
  }
  return type ?? (actionChannelKind === AppBuilderControlUseActionChannelKind.ContainingFormSubmit ? 'submit' : null);
}

function textContentForElement(
  store: KernelStore,
  element: HtmlElement,
): string {
  return element.children
    .map((child) => {
      const node = htmlNodeForReference(store, child);
      if (node instanceof HtmlText) {
        return node.text;
      }
      if (node instanceof HtmlElement) {
        return textContentForElement(store, node);
      }
      return '';
    })
    .join('');
}

function controlPatternForControlId(id: AppBuilderControlId): AppBuilderControlPatternId {
  switch (id) {
    case AppBuilderControlId.TextInput:
      return AppBuilderControlPatternId.NativeTextInput;
    case AppBuilderControlId.EmailInput:
      return AppBuilderControlPatternId.NativeEmailInput;
    case AppBuilderControlId.UrlInput:
      return AppBuilderControlPatternId.NativeUrlInput;
    case AppBuilderControlId.TelInput:
      return AppBuilderControlPatternId.NativeTelInput;
    case AppBuilderControlId.PasswordInput:
      return AppBuilderControlPatternId.NativePasswordInput;
    case AppBuilderControlId.SearchInput:
      return AppBuilderControlPatternId.NativeSearchInput;
    case AppBuilderControlId.TimeInput:
      return AppBuilderControlPatternId.NativeTimeInput;
    case AppBuilderControlId.DateTimeLocalInput:
      return AppBuilderControlPatternId.NativeDateTimeLocalInput;
    case AppBuilderControlId.MonthInput:
      return AppBuilderControlPatternId.NativeMonthInput;
    case AppBuilderControlId.WeekInput:
      return AppBuilderControlPatternId.NativeWeekInput;
    case AppBuilderControlId.NumberInput:
      return AppBuilderControlPatternId.NativeNumberInput;
    case AppBuilderControlId.DateInput:
      return AppBuilderControlPatternId.NativeDateInput;
    case AppBuilderControlId.RangeInput:
      return AppBuilderControlPatternId.NativeRangeInput;
    case AppBuilderControlId.TextArea:
      return AppBuilderControlPatternId.NativeTextarea;
    case AppBuilderControlId.Checkbox:
      return AppBuilderControlPatternId.NativeBooleanCheckbox;
    case AppBuilderControlId.CheckboxList:
      return AppBuilderControlPatternId.NativeCheckboxList;
    case AppBuilderControlId.RadioGroup:
      return AppBuilderControlPatternId.NativeRadioGroup;
    case AppBuilderControlId.SingleSelect:
      return AppBuilderControlPatternId.NativeSingleSelect;
    case AppBuilderControlId.MultiSelect:
      return AppBuilderControlPatternId.NativeMultiSelect;
  }
}

function indexByProductHandle<T extends { readonly productHandle: ProductHandle }>(
  rows: readonly T[],
): ReadonlyMap<ProductHandle, T> {
  return new Map(rows.map((row) => [row.productHandle, row]));
}

function indexDataFlowsByValueChannel(
  rows: readonly RuntimeBindingDataFlow[],
): ReadonlyMap<ProductHandle, readonly RuntimeBindingDataFlow[]> {
  const map = new Map<ProductHandle, RuntimeBindingDataFlow[]>();
  for (const row of rows) {
    const productHandle = row.valueChannel?.productHandle;
    if (productHandle == null) {
      continue;
    }
    const bucket = map.get(productHandle) ?? [];
    bucket.push(row);
    map.set(productHandle, bucket);
  }
  return map;
}

function firstDataFlowForValueChannel(
  valueChannel: RuntimeBindingValueChannel,
  dataFlowsByValueChannel: ReadonlyMap<ProductHandle, readonly RuntimeBindingDataFlow[]>,
): RuntimeBindingDataFlow | null {
  return dataFlowsByValueChannel.get(valueChannel.productHandle)?.[0] ?? null;
}

function targetAccessForValueChannel(
  valueChannel: RuntimeBindingValueChannel,
  targetAccesses: ReadonlyMap<ProductHandle, RuntimeBindingTargetAccess>,
): RuntimeBindingTargetAccess | null {
  const handle = valueChannel.targetAccess?.productHandle;
  return handle == null ? null : targetAccesses.get(handle) ?? null;
}

function targetOperationForValueChannel(
  valueChannel: RuntimeBindingValueChannel,
  targetOperations: ReadonlyMap<ProductHandle, RuntimeBindingTargetOperation>,
): RuntimeBindingTargetOperation | null {
  const handle = valueChannel.targetOperation?.productHandle;
  return handle == null ? null : targetOperations.get(handle) ?? null;
}

function sourceOperationForValueChannel(
  valueChannel: RuntimeBindingValueChannel,
  sourceOperations: ReadonlyMap<ProductHandle, RuntimeBindingSourceOperation>,
): RuntimeBindingSourceOperation | null {
  const handle = valueChannel.sourceOperation?.productHandle;
  return handle == null ? null : sourceOperations.get(handle) ?? null;
}

function htmlElementForTarget(
  store: KernelStore,
  targetAccess: RuntimeBindingTargetAccess | null,
  targetOperation: RuntimeBindingTargetOperation | null,
  sourceOperation: RuntimeBindingSourceOperation | null,
): HtmlElement | null {
  return htmlElementForNode(store, targetAccess?.targetNode)
    ?? htmlElementForNode(store, targetOperation?.targetNode)
    ?? htmlElementForNode(store, sourceOperation?.targetNode);
}

function htmlElementForNode(
  store: KernelStore,
  node: HtmlNodeReference | null | undefined,
): HtmlElement | null {
  if (node?.productHandle == null) {
    return null;
  }
  const detail = store.productDetails.read(TemplateProductDetails.HtmlNode, node.productHandle);
  return detail instanceof HtmlElement ? detail : null;
}

function htmlNodeForReference(
  store: KernelStore,
  node: HtmlNodeReference,
): HtmlElement | HtmlText | null {
  if (node.productHandle == null) {
    return null;
  }
  const detail = store.productDetails.read(TemplateProductDetails.HtmlNode, node.productHandle);
  return detail instanceof HtmlElement || detail instanceof HtmlText ? detail : null;
}

function controlUseSourceAddressHandle(
  input: ControlUseInventoryRowInputWithoutDescriptor,
): AddressHandle | null {
  return input.sourceAddressHandle ?? input.valueChannel.sourceAddressHandle;
}

function readElementAttributes(
  store: KernelStore,
  element: HtmlElement,
): readonly HtmlAttribute[] {
  return element.attributes
    .map((attribute) => {
      if (attribute.productHandle == null) {
        return null;
      }
      return store.productDetails.read(TemplateProductDetails.HtmlAttribute, attribute.productHandle);
    })
    .filter((attribute): attribute is HtmlAttribute => attribute != null);
}

function descriptorStaticAttributeMatches(
  rawName: string,
  rawValue: string | null,
  attributes: readonly HtmlAttribute[],
): boolean {
  const existing = staticAttributeValue(attributes, rawName);
  if (existing == null) {
    return false;
  }
  return rawValue == null || existing.toLowerCase() === rawValue.toLowerCase();
}

function staticAttributeValue(
  attributes: readonly HtmlAttribute[],
  rawName: string,
): string | null {
  const attribute = attributes.find((candidate) =>
    candidate.rawName.toLowerCase() === rawName.toLowerCase()
  );
  return attribute?.rawValue ?? null;
}

function hasStaticAttribute(
  attributes: readonly HtmlAttribute[],
  rawName: string,
): boolean {
  return attributes.some((candidate) =>
    candidate.rawName.toLowerCase() === rawName.toLowerCase()
  );
}

function targetProperty(
  targetAccess: RuntimeBindingTargetAccess | null,
  targetOperation: RuntimeBindingTargetOperation | null,
  sourceOperation: RuntimeBindingSourceOperation | null,
): string | null {
  return targetAccess?.targetProperty
    ?? targetOperation?.targetProperty
    ?? sourceOperation?.targetName
    ?? null;
}

function runtimeTargetNameForDescriptor(descriptor: AppBuilderControlDescriptor): string {
  return camelCaseAttributeName(descriptor.bindingTargetName);
}

function bindingExpression(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow | null,
): string | null {
  if (dataFlow == null) {
    return null;
  }
  const parse = readTemplateExpressionParse(store, dataFlow.expressionProductHandle);
  if (parse == null) {
    return null;
  }
  const site = store.productDetails.read(TemplateProductDetails.ValueSite, parse.site.productHandle);
  return site?.rawValue ?? null;
}

function normalizeTagName(value: string): string {
  return value.toLowerCase();
}
