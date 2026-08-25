import ts from 'typescript';
import {
  openSeamReasonKindsForEvaluationPressure,
  openSeamReasonKindsForEvaluationRead,
  openSeamReasonKindsForEvaluationValue,
} from '../evaluation/boundary-open-reason.js';
import {
  EvaluationRead,
  readStaticStringArrayValue,
  readStaticStringValue,
  type StaticExpressionEvaluationReader,
} from '../evaluation/expression-reader.js';
import { readEvaluationEnumerableOwnEntries } from '../evaluation/enumerable-own-properties.js';
import {
  EvaluationValueKind,
  EvaluationObjectPropertyState,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import {
  NodeObserverLocatorAccessorOverride,
  NodeObserverLocatorGlobalConfig,
  NodeObserverLocatorNodeConfig,
} from './observer-locator.js';
import {
  RuntimeNodeObserverConfig,
  RuntimeNodeObserverConfigFieldState,
  RuntimeNodeObserverKind,
} from '../template/runtime-binding.js';

/** One source-local node-observer customization that could not be represented as a confident applied value. */
export class NodeObserverCustomizationOpen {
  constructor(
    readonly node: ts.Node,
    readonly summary: string,
    readonly reasonKinds: readonly OpenSeamReasonKind[],
  ) {}
}

/** Known customization values plus the evaluator/domain pressure observed while reading them. */
export class NodeObserverCustomizationRead<TValue> {
  constructor(
    readonly values: readonly TValue[],
    readonly evaluations: readonly EvaluationRead<EvaluationValue>[],
    readonly open: readonly NodeObserverCustomizationOpen[],
  ) {}
}

export function nodeObserverNodeConfigsFromUseConfigCall(
  call: ts.CallExpression,
  reader: StaticExpressionEvaluationReader,
): NodeObserverCustomizationRead<NodeObserverLocatorNodeConfig> {
  const [first, second, third] = call.arguments;
  if (first == null || ts.isSpreadElement(first)) {
    return openNodeObserverCustomization(first ?? call, 'Node-observer useConfig did not expose one direct configuration argument.');
  }
  if (second != null && third != null && !ts.isSpreadElement(second) && !ts.isSpreadElement(third)) {
    const tagName = staticStringFromExpression(first, reader);
    const key = staticStringFromExpression(second, reader);
    const config = nodeObserverConfigFromExpression(third, reader);
    return new NodeObserverCustomizationRead(
      tagName.value != null && key.value != null
        ? [new NodeObserverLocatorNodeConfig(tagName.value, key.value, config.value)]
        : [],
      [
        tagName.evaluation,
        key.evaluation,
        ...nodeObserverConfigPressure(config),
      ],
      [
        ...tagName.open,
        ...key.open,
        ...(config.evaluation.value == null
          ? []
          : nodeObserverConfigOpen(
              third,
              config.value,
              openSeamReasonKindsForEvaluationRead(config.evaluation),
            )),
      ],
    );
  }

  const evaluation = reader.evaluateExpression(first);
  const value = evaluation.value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return new NodeObserverCustomizationRead(
      [],
      [evaluation],
      value == null ? [] : [new NodeObserverCustomizationOpen(
        first,
        'Node-observer useConfig argument did not reduce to an object value.',
        nodeObserverReasonKindsForValue(value, []),
      )],
    );
  }
  const configs: NodeObserverLocatorNodeConfig[] = [];
  const open: NodeObserverCustomizationOpen[] = [];
  const tags = readEvaluationEnumerableOwnEntries(value);
  if (tags == null) {
    return new NodeObserverCustomizationRead([], [evaluation], [
      new NodeObserverCustomizationOpen(
        first,
        'Node-observer useConfig argument did not expose enumerable own entries.',
        openSeamReasonKindsForEvaluationRead(evaluation),
      ),
    ]);
  }
  if (tags.mayHaveUnknownEntries || tags.mayHaveUnknownOrder) {
    open.push(new NodeObserverCustomizationOpen(
      first,
      'Node-observer useConfig may contain additional configuration tags or a runtime-dependent contribution order.',
      nodeObserverReasonKindsForValue(value, []),
    ));
  }
  for (const tagEntry of tags.entries) {
    if (tagEntry.property?.state === EvaluationObjectPropertyState.Open) {
      open.push(new NodeObserverCustomizationOpen(
        tagEntry.property.node ?? first,
        `Node-observer configs for '${tagEntry.name}' may be replaced by an unknown property contribution.`,
        nodeObserverReasonKindsForValue(tagEntry.value, tagEntry.property.openSeams),
      ));
      continue;
    }
    if (tagEntry.value.kind !== EvaluationValueKind.Object) {
      open.push(new NodeObserverCustomizationOpen(
        tagEntry.property?.node ?? first,
        `Node-observer configs for '${tagEntry.name}' did not reduce to an object value.`,
        nodeObserverReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
      continue;
    }
    const properties = readEvaluationEnumerableOwnEntries(tagEntry.value);
    if (properties == null) {
      open.push(new NodeObserverCustomizationOpen(
        tagEntry.property?.node ?? first,
        `Node-observer configs for '${tagEntry.name}' did not expose enumerable own entries.`,
        nodeObserverReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
      continue;
    }
    if (properties.mayHaveUnknownEntries || properties.mayHaveUnknownOrder) {
      open.push(new NodeObserverCustomizationOpen(
        tagEntry.property?.node ?? first,
        `Node-observer configs for '${tagEntry.name}' may contain additional properties or a runtime-dependent contribution order.`,
        nodeObserverReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
    }
    for (const property of properties.entries) {
      if (property.property?.state === EvaluationObjectPropertyState.Open) {
        open.push(new NodeObserverCustomizationOpen(
          property.property.node ?? tagEntry.property?.node ?? first,
          `Node-observer config '${tagEntry.name}.${property.name}' may be replaced by an unknown property contribution.`,
          nodeObserverReasonKindsForValue(property.value, property.property.openSeams),
        ));
        continue;
      }
      const config = nodeObserverConfigFromValue(property.value);
      configs.push(new NodeObserverLocatorNodeConfig(tagEntry.name, property.name, config));
      open.push(...nodeObserverConfigOpen(
        property.property?.node ?? first,
        config,
        nodeObserverReasonKindsForValue(property.value, property.openSeams),
      ));
    }
  }
  return new NodeObserverCustomizationRead(configs, open.length === 0 ? [] : [evaluation], open);
}

export function nodeObserverGlobalConfigsFromUseConfigGlobalCall(
  call: ts.CallExpression,
  reader: StaticExpressionEvaluationReader,
): NodeObserverCustomizationRead<NodeObserverLocatorGlobalConfig> {
  const [first, second] = call.arguments;
  if (first == null || ts.isSpreadElement(first)) {
    return openNodeObserverCustomization(first ?? call, 'Node-observer useConfigGlobal did not expose one direct configuration argument.');
  }
  if (second != null && !ts.isSpreadElement(second)) {
    const key = staticStringFromExpression(first, reader);
    const config = nodeObserverConfigFromExpression(second, reader);
    return new NodeObserverCustomizationRead(
      key.value == null ? [] : [new NodeObserverLocatorGlobalConfig(key.value, config.value)],
      [key.evaluation, ...nodeObserverConfigPressure(config)],
      [
        ...key.open,
        ...(config.evaluation.value == null
          ? []
          : nodeObserverConfigOpen(
              second,
              config.value,
              openSeamReasonKindsForEvaluationRead(config.evaluation),
            )),
      ],
    );
  }

  const evaluation = reader.evaluateExpression(first);
  const value = evaluation.value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return new NodeObserverCustomizationRead(
      [],
      [evaluation],
      value == null ? [] : [new NodeObserverCustomizationOpen(
        first,
        'Node-observer useConfigGlobal argument did not reduce to an object value.',
        nodeObserverReasonKindsForValue(value, []),
      )],
    );
  }
  const configs: NodeObserverLocatorGlobalConfig[] = [];
  const open: NodeObserverCustomizationOpen[] = [];
  const entries = readEvaluationEnumerableOwnEntries(value);
  if (entries == null) {
    return new NodeObserverCustomizationRead([], [evaluation], [
      new NodeObserverCustomizationOpen(
        first,
        'Node-observer useConfigGlobal argument did not expose enumerable own entries.',
        openSeamReasonKindsForEvaluationRead(evaluation),
      ),
    ]);
  }
  if (entries.mayHaveUnknownEntries || entries.mayHaveUnknownOrder) {
    open.push(new NodeObserverCustomizationOpen(
      first,
      'Global node-observer configuration may contain additional properties or a runtime-dependent contribution order.',
      nodeObserverReasonKindsForValue(value, []),
    ));
  }
  for (const property of entries.entries) {
    if (property.property?.state === EvaluationObjectPropertyState.Open) {
      open.push(new NodeObserverCustomizationOpen(
        property.property.node ?? first,
        `Global node-observer config '${property.name}' may be replaced by an unknown property contribution.`,
        nodeObserverReasonKindsForValue(property.value, property.property.openSeams),
      ));
      continue;
    }
    const config = nodeObserverConfigFromValue(property.value);
    configs.push(new NodeObserverLocatorGlobalConfig(property.name, config));
    open.push(...nodeObserverConfigOpen(
      property.property?.node ?? first,
      config,
      nodeObserverReasonKindsForValue(property.value, property.openSeams),
    ));
  }
  return new NodeObserverCustomizationRead(configs, open.length === 0 ? [] : [evaluation], open);
}

export function nodeObserverAccessorOverridesFromCall(
  call: ts.CallExpression,
  reader: StaticExpressionEvaluationReader,
): NodeObserverCustomizationRead<NodeObserverLocatorAccessorOverride> {
  const [first, second] = call.arguments;
  if (first == null || ts.isSpreadElement(first)) {
    return openNodeObserverCustomization(first ?? call, 'Node-observer overrideAccessor did not expose one direct argument.');
  }
  if (second != null && !ts.isSpreadElement(second)) {
    const tagName = staticStringFromExpression(first, reader);
    const key = staticStringFromExpression(second, reader);
    return new NodeObserverCustomizationRead(
      tagName.value != null && key.value != null
        ? [new NodeObserverLocatorAccessorOverride(tagName.value, key.value)]
        : [],
      [tagName.evaluation, key.evaluation],
      [...tagName.open, ...key.open],
    );
  }

  const evaluation = reader.evaluateExpression(first);
  const value = evaluation.value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return new NodeObserverCustomizationRead(
      [],
      [evaluation],
      value == null ? [] : [new NodeObserverCustomizationOpen(
        first,
        'Node-observer overrideAccessor argument did not reduce to an object value.',
        nodeObserverReasonKindsForValue(value, []),
      )],
    );
  }
  const overrides: NodeObserverLocatorAccessorOverride[] = [];
  const open: NodeObserverCustomizationOpen[] = [];
  const entries = readEvaluationEnumerableOwnEntries(value);
  if (entries == null) {
    return new NodeObserverCustomizationRead([], [evaluation], [
      new NodeObserverCustomizationOpen(
        first,
        'Node-observer overrideAccessor argument did not expose enumerable own entries.',
        openSeamReasonKindsForEvaluationRead(evaluation),
      ),
    ]);
  }
  if (entries.mayHaveUnknownEntries || entries.mayHaveUnknownOrder) {
    open.push(new NodeObserverCustomizationOpen(
      first,
      'Node-observer accessor overrides may contain additional tags or a runtime-dependent contribution order.',
      nodeObserverReasonKindsForValue(value, []),
    ));
  }
  for (const tagProperty of entries.entries) {
    if (tagProperty.property?.state === EvaluationObjectPropertyState.Open) {
      open.push(new NodeObserverCustomizationOpen(
        tagProperty.property.node ?? first,
        `Node-observer accessor overrides for '${tagProperty.name}' may be replaced by an unknown property contribution.`,
        nodeObserverReasonKindsForValue(tagProperty.value, tagProperty.property.openSeams),
      ));
      continue;
    }
    const keys = readStaticStringArrayValue(tagProperty.value);
    if (keys == null) {
      open.push(new NodeObserverCustomizationOpen(
        tagProperty.property?.node ?? first,
        `Node-observer accessor overrides for '${tagProperty.name}' did not reduce to a closed string array.`,
        nodeObserverReasonKindsForValue(tagProperty.value, tagProperty.openSeams),
      ));
      continue;
    }
    for (const key of keys) {
      overrides.push(new NodeObserverLocatorAccessorOverride(tagProperty.name, key));
    }
  }
  return new NodeObserverCustomizationRead(overrides, open.length === 0 ? [] : [evaluation], open);
}

export function nodeObserverGlobalAccessorOverridesFromCall(
  call: ts.CallExpression,
  reader: StaticExpressionEvaluationReader,
): NodeObserverCustomizationRead<string> {
  const values: string[] = [];
  const evaluations: EvaluationRead<EvaluationValue>[] = [];
  const open: NodeObserverCustomizationOpen[] = [];
  for (const argument of call.arguments) {
    if (ts.isSpreadElement(argument)) {
      const evaluation = reader.evaluateExpression(argument.expression);
      const spreadValues = evaluation.value == null
        ? null
        : readStaticStringArrayValue(evaluation.value);
      if (spreadValues == null) {
        evaluations.push(evaluation);
        open.push(new NodeObserverCustomizationOpen(
          argument,
          'Global node-observer accessor override spread did not close to a string array.',
          openSeamReasonKindsForEvaluationRead(evaluation),
        ));
      } else {
        values.push(...spreadValues);
      }
      continue;
    }
    const key = staticStringFromExpression(argument, reader);
    evaluations.push(key.evaluation);
    open.push(...key.open);
    if (key.value != null) {
      values.push(key.value);
    }
  }
  return new NodeObserverCustomizationRead(values, evaluations, open);
}

export function nodeObserverConfigFromExpression(
  expression: ts.Expression,
  reader: StaticExpressionEvaluationReader,
): NodeObserverExpressionRead<RuntimeNodeObserverConfig> {
  const evaluation = reader.evaluateExpression(expression);
  return new NodeObserverExpressionRead(
    evaluation.value == null
      ? RuntimeNodeObserverConfig.open('Node observer config expression did not produce a static evaluation value.')
      : nodeObserverConfigFromValue(evaluation.value),
    evaluation,
  );
}

class NodeObserverExpressionRead<TValue> {
  constructor(
    readonly value: TValue,
    readonly evaluation: EvaluationRead<EvaluationValue>,
    readonly open: readonly NodeObserverCustomizationOpen[] = [],
  ) {}
}

function openNodeObserverCustomization<TValue>(
  node: ts.Node,
  summary: string,
): NodeObserverCustomizationRead<TValue> {
  return new NodeObserverCustomizationRead([], [], [new NodeObserverCustomizationOpen(node, summary, [])]);
}

function nodeObserverConfigOpen(
  node: ts.Node,
  config: RuntimeNodeObserverConfig,
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly NodeObserverCustomizationOpen[] {
  return config.openReason == null
    ? []
    : [new NodeObserverCustomizationOpen(node, config.openReason, reasonKinds)];
}

function nodeObserverReasonKindsForValue(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[],
): readonly OpenSeamReasonKind[] {
  return [...new Set([
    ...openSeamReasonKindsForEvaluationValue(value),
    ...openSeamReasonKindsForEvaluationPressure(openSeams, null),
  ])];
}

function nodeObserverConfigPressure(
  read: NodeObserverExpressionRead<RuntimeNodeObserverConfig>,
): readonly EvaluationRead<EvaluationValue>[] {
  return read.value.openReason == null && read.evaluation.abruptCompletion == null
    ? []
    : [read.evaluation];
}

export function nodeObserverConfigFromValue(
  value: EvaluationValue,
): RuntimeNodeObserverConfig {
  if (value.kind !== EvaluationValueKind.Object) {
    return RuntimeNodeObserverConfig.open('Node observer config did not reduce to an object value.');
  }
  const type = nodeObserverTypeFromConfig(value);
  const events = nodeObserverEventsFromConfig(value);
  const readonlyValue = nodeObserverReadonlyFromConfig(value);
  const defaultValue = nodeObserverDefaultFromConfig(value);
  const openReasons = [type.openReason, events.openReason, readonlyValue.openReason, defaultValue.openReason]
    .filter((reason): reason is string => reason != null);
  return new RuntimeNodeObserverConfig(
    type.observerKind,
    type.observerConstructorName,
    events.eventNames,
    readonlyValue.value,
    defaultValue.value,
    {
      type: type.state,
      events: events.state,
      readonly: readonlyValue.state,
      default: defaultValue.state,
    },
    openReasons.length === 0 ? null : openReasons.join(' '),
  );
}

interface NodeObserverTypeRead {
  readonly observerKind: RuntimeNodeObserverKind;
  readonly observerConstructorName: string | null;
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverTypeFromConfig(
  config: EvaluationObjectValue,
): NodeObserverTypeRead {
  const property = config.properties.get('type');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? {
        observerKind: RuntimeNodeObserverKind.Open,
        observerConstructorName: null,
        state: RuntimeNodeObserverConfigFieldState.Open,
        openReason: 'Node observer type may be supplied by an unclosed config property.',
      }
      : {
        observerKind: RuntimeNodeObserverKind.ValueAttribute,
        observerConstructorName: 'ValueAttributeObserver',
        state: RuntimeNodeObserverConfigFieldState.Absent,
        openReason: null,
      };
  }
  if (property.value.kind === EvaluationValueKind.Null || property.value.kind === EvaluationValueKind.Undefined) {
    if (property.state === EvaluationObjectPropertyState.Open) {
      return openNodeObserverType(
        'ValueAttributeObserver',
        'Node observer type may be replaced by a later unknown config property.',
      );
    }
    return {
      observerKind: RuntimeNodeObserverKind.ValueAttribute,
      observerConstructorName: 'ValueAttributeObserver',
      state: RuntimeNodeObserverConfigFieldState.Closed,
      openReason: null,
    };
  }
  const name = nodeObserverConstructorName(property.value, property.node);
  if (name == null) {
    return {
      observerKind: RuntimeNodeObserverKind.Open,
      observerConstructorName: null,
      state: RuntimeNodeObserverConfigFieldState.Open,
      openReason: 'Node observer constructor did not retain a static declaration or import identity.',
    };
  }
  if (property.state === EvaluationObjectPropertyState.Open) {
    return openNodeObserverType(
      name,
      'Node observer type may be replaced by a later unknown config property.',
    );
  }
  switch (name) {
    case 'ValueAttributeObserver':
      return closedNodeObserverType(RuntimeNodeObserverKind.ValueAttribute, name);
    case 'CheckedObserver':
      return closedNodeObserverType(RuntimeNodeObserverKind.Checked, name);
    case 'SelectValueObserver':
      return closedNodeObserverType(RuntimeNodeObserverKind.Select, name);
    default:
      return closedNodeObserverType(RuntimeNodeObserverKind.Custom, name);
  }
}

function openNodeObserverType(
  observerConstructorName: string | null,
  openReason: string,
): NodeObserverTypeRead {
  return {
    observerKind: RuntimeNodeObserverKind.Open,
    observerConstructorName,
    state: RuntimeNodeObserverConfigFieldState.Open,
    openReason,
  };
}

function nodeObserverConstructorName(
  value: EvaluationValue,
  sourceNode: ts.Node | null,
): string | null {
  if (value.kind === EvaluationValueKind.Class) {
    return value.declaration.name?.text ?? nodeObserverConstructorSourceName(sourceNode);
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    const boundaryNode = value.node;
    if (boundaryNode != null && ts.isImportSpecifier(boundaryNode)) {
      return boundaryNode.propertyName?.text ?? boundaryNode.name.text;
    }
    const boundaryName = boundaryNode != null && ts.isExpression(boundaryNode)
      ? readReferenceName(boundaryNode)
      : null;
    return boundaryName ?? nodeObserverConstructorSourceName(sourceNode);
  }
  return nodeObserverConstructorSourceName(sourceNode);
}

function nodeObserverConstructorSourceName(node: ts.Node | null): string | null {
  if (node == null) {
    return null;
  }
  const expression = ts.isPropertyAssignment(node)
    ? node.initializer
    : ts.isShorthandPropertyAssignment(node)
      ? node.name
      : ts.isExpression(node)
        ? node
        : null;
  return expression == null ? null : readReferenceName(expression);
}

function closedNodeObserverType(
  observerKind: RuntimeNodeObserverKind,
  observerConstructorName: string,
): NodeObserverTypeRead {
  return {
    observerKind,
    observerConstructorName,
    state: RuntimeNodeObserverConfigFieldState.Closed,
    openReason: null,
  };
}

interface NodeObserverEventsRead {
  readonly eventNames: readonly string[];
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverEventsFromConfig(config: EvaluationObjectValue): NodeObserverEventsRead {
  const property = config.properties.get('events');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? { eventNames: [], state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer events may be supplied by an unclosed config property.' }
      : { eventNames: [], state: RuntimeNodeObserverConfigFieldState.Absent, openReason: null };
  }
  const eventNames = knownStringArrayValues(property.value);
  const closed = property.state === EvaluationObjectPropertyState.Closed
    && property.value.kind === EvaluationValueKind.Array
    && !property.value.mayHaveUnknownElements
    && !property.value.mayHaveUnknownOrder
    && eventNames.length === property.value.elements.length;
  return closed
    ? { eventNames, state: RuntimeNodeObserverConfigFieldState.Closed, openReason: null }
    : {
      eventNames,
      state: RuntimeNodeObserverConfigFieldState.Open,
      openReason: property.state === EvaluationObjectPropertyState.Open
        ? 'Node observer event names may be replaced by a later unknown config property.'
        : 'Node observer event names did not close to a static string array.',
    };
}

function knownStringArrayValues(value: EvaluationValue): readonly string[] {
  if (value.kind !== EvaluationValueKind.Array) {
    return [];
  }
  return value.elements.flatMap((element) => {
    const stringValue = readStaticStringValue(element.value);
    return stringValue == null ? [] : [stringValue];
  });
}

interface NodeObserverReadonlyRead {
  readonly value: boolean | null;
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverReadonlyFromConfig(config: EvaluationObjectValue): NodeObserverReadonlyRead {
  const property = config.properties.get('readonly');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? { value: null, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer readonly policy may be supplied by an unclosed config property.' }
      : { value: false, state: RuntimeNodeObserverConfigFieldState.Absent, openReason: null };
  }
  return property.value.kind === EvaluationValueKind.Boolean
    ? property.state === EvaluationObjectPropertyState.Closed
      ? { value: property.value.value, state: RuntimeNodeObserverConfigFieldState.Closed, openReason: null }
      : { value: property.value.value, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer readonly policy may be replaced by a later unknown config property.' }
    : { value: null, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer readonly policy did not close to a boolean.' };
}

interface NodeObserverDefaultRead {
  readonly value: RuntimeNodeObserverConfig['defaultValue'];
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverDefaultFromConfig(config: EvaluationObjectValue): NodeObserverDefaultRead {
  const property = config.properties.get('default');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? { value: undefined, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer default may be supplied by an unclosed config property.' }
      : { value: undefined, state: RuntimeNodeObserverConfigFieldState.Absent, openReason: null };
  }
  return isEvaluationPrimitiveValue(property.value)
    ? property.state === EvaluationObjectPropertyState.Closed
      ? { value: readEvaluationPrimitive(property.value), state: RuntimeNodeObserverConfigFieldState.Closed, openReason: null }
      : { value: readEvaluationPrimitive(property.value), state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer default may be replaced by a later unknown config property.' }
    : { value: undefined, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer default did not close to a primitive value.' };
}

function staticStringFromExpression(
  expression: ts.Expression,
  reader: StaticExpressionEvaluationReader,
): NodeObserverExpressionRead<string | null> {
  const evaluation = reader.evaluateExpression(expression);
  const value = evaluation.value == null ? null : readStaticStringValue(evaluation.value);
  return new NodeObserverExpressionRead(
    value,
    evaluation,
    evaluation.value != null && value == null
      ? [new NodeObserverCustomizationOpen(
          expression,
          'Node-observer configuration argument did not reduce to a string.',
          openSeamReasonKindsForEvaluationRead(evaluation),
        )]
      : [],
  );
}
