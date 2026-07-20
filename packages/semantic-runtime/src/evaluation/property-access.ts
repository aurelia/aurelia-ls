import ts from 'typescript';
import {
  aureliaArrayMethodSemanticsFor,
} from '../expression/array-method-semantics.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { openSeamReasonKindsForEvaluationValue } from './boundary-open-reason.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  staticStringPrototypeBoundaryMethods,
} from './intrinsics/string-intrinsics.js';
import {
  hasQuestionDotToken,
  isNullishEvaluationValue,
} from './nullish-expression.js';
import {
  evaluationPropertyKeyString,
} from './operators.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationFunctionValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationRegularExpressionValue,
  EvaluationStringValue,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  evaluationArrayUncertaintySummaries,
  type EvaluationValue,
} from './values.js';
import { EvaluationValueEvidence } from './value-pressure.js';
import { unretainedEvaluationOpenSeams } from './value-pressure.js';

export const enum StaticValueMemberReadKind {
  /** Member read proved an exact evaluator-local value. */
  Value = 'value',
  /** Member read retained a useful candidate that open pressure prevents evaluator execution from trusting. */
  Candidate = 'candidate',
  /** Member read selected a getter function that needs evaluator-host invocation with the receiver as `this`. */
  Getter = 'getter',
  /** Member read needs host open-seam publication before it can become an evaluator value. */
  Open = 'open',
}

export type StaticValueMemberRead =
  | {
    readonly kind: StaticValueMemberReadKind.Value;
    readonly value: EvaluationValue;
    readonly openSeams: readonly EvaluationOpenSeam[];
  }
  | {
    readonly kind: StaticValueMemberReadKind.Candidate;
    readonly value: EvaluationValue;
    readonly openSeams: readonly EvaluationOpenSeam[];
  }
  | {
    readonly kind: StaticValueMemberReadKind.Getter;
    readonly getter: EvaluationFunctionValue;
    readonly thisValue: EvaluationValue;
    readonly openSeams: readonly EvaluationOpenSeam[];
  }
  | {
    readonly kind: StaticValueMemberReadKind.Open;
    readonly reason: string;
    readonly seamKind: EvaluationOpenSeamKind;
    readonly reasonKinds: readonly OpenSeamReasonKind[];
    readonly openSeams: readonly EvaluationOpenSeam[];
  };

export interface StaticValueMemberReadHandlers<TValue> {
  /** Handles a concrete evaluator-local member value. */
  readonly value: (value: EvaluationValue, openSeams: readonly EvaluationOpenSeam[]) => TValue;
  /** Handles a retained candidate that is useful for projection but unsafe for evaluator execution. */
  readonly candidate: (value: EvaluationValue, openSeams: readonly EvaluationOpenSeam[]) => TValue;
  /** Handles a getter that must be invoked by the active evaluator with the receiver as `this`. */
  readonly getter: (
    getter: EvaluationFunctionValue,
    thisValue: EvaluationValue,
    openSeams: readonly EvaluationOpenSeam[],
  ) => TValue;
  /** Handles a member read that must stay open until a host/runtime consumer resolves it. */
  readonly open: (
    reason: string,
    seamKind: EvaluationOpenSeamKind,
    reasonKinds: readonly OpenSeamReasonKind[],
    openSeams: readonly EvaluationOpenSeam[],
  ) => TValue;
}

/** Folds static member-read outcomes so evaluator and binding-source consumers cannot drift on new read kinds. */
export function foldStaticValueMemberRead<TValue>(
  read: StaticValueMemberRead,
  handlers: StaticValueMemberReadHandlers<TValue>,
): TValue {
  switch (read.kind) {
    case StaticValueMemberReadKind.Value:
      return handlers.value(read.value, read.openSeams);
    case StaticValueMemberReadKind.Candidate:
      return handlers.candidate(read.value, read.openSeams);
    case StaticValueMemberReadKind.Getter:
      return handlers.getter(read.getter, read.thisValue, read.openSeams);
    case StaticValueMemberReadKind.Open:
      return handlers.open(read.reason, read.seamKind, read.reasonKinds, read.openSeams);
  }
}

/** Returns a member value only when the read retained no unresolved evaluator pressure. */
export function closedStaticValueMemberValue(
  read: StaticValueMemberRead,
): EvaluationValue | null {
  return read.kind === StaticValueMemberReadKind.Value
    ? read.value
    : null;
}

export interface StaticPropertyAccessEvaluationHost {
  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    argumentValues: readonly EvaluationValueEvidence[],
    moduleKey: string,
    depth: number,
    thisValue?: EvaluationValueEvidence | null,
  ): EvaluationValue;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
    reasonKinds: readonly OpenSeamReasonKind[],
  ): EvaluationUnknownValue;

  materializeUnknownUse(
    value: EvaluationUnknownValue,
    node: ts.Node,
    moduleKey: string,
    summary: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  replayOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void;

  openSeamCheckpoint(): number;

  consumeOpenSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[];
}

export function evaluateStaticPropertyAccess(
  expression: ts.PropertyAccessExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  const receiverCheckpoint = host.openSeamCheckpoint();
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  const receiverPressure = host.consumeOpenSeamsSince(receiverCheckpoint);
  const receiverEdgePressure = unretainedEvaluationOpenSeams(receiver, receiverPressure);
  if (receiverEdgePressure.length > 0) {
    host.replayOpenSeams(receiverEdgePressure);
    return new EvaluationUnknownValue(
      `Property access '${expression.name.text}' depended on a retained receiver candidate.`,
      expression,
      true,
    );
  }
  if (hasQuestionDotToken(expression) && isNullishEvaluationValue(receiver)) {
    return new EvaluationUndefinedValue(expression);
  }
  if (receiver.kind === EvaluationValueKind.Unknown) {
    host.replayOpenSeams(receiverPressure);
    return host.materializeUnknownUse(
      receiver,
      expression,
      moduleKey,
      `Property access '${expression.name.text}' depended on an open receiver.`,
      EvaluationOpenSeamKind.UnresolvedIdentifier,
    );
  }
  return evaluateStaticPropertyValue(receiver, expression.name.text, expression, moduleKey, depth + 1, host);
}

export function evaluateStaticPropertyValue(
  receiver: EvaluationValue,
  propertyName: string,
  node: ts.Node,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  return evaluateStaticValueMemberRead(
    readStaticValueProperty(receiver, propertyName, node),
    node,
    moduleKey,
    depth,
    host,
  );
}

export function evaluateStaticElementValue(
  receiver: EvaluationValue,
  argument: EvaluationValue,
  node: ts.Node,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  return evaluateStaticValueMemberRead(
    readStaticValueElement(receiver, argument, node),
    node,
    moduleKey,
    depth,
    host,
  );
}

function evaluateStaticValueMemberRead(
  read: StaticValueMemberRead,
  node: ts.Node,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  return foldStaticValueMemberRead(read, {
    value: (value, openSeams) => {
      host.replayOpenSeams(openSeams);
      return value;
    },
    candidate: (value, openSeams) => {
      host.replayOpenSeams(openSeams);
      return new EvaluationUnknownValue(
        'Member read retained a best-known value qualified by open evaluation pressure.',
        node,
        true,
        value,
      );
    },
    getter: (getter, thisValue, openSeams) => {
      host.replayOpenSeams(openSeams);
      return host.evaluateFunctionWithArguments(
        getter,
        node,
        [],
        moduleKey,
        depth + 1,
        new EvaluationValueEvidence(thisValue, []),
      );
    },
    open: (reason, seamKind, reasonKinds, openSeams) => {
      host.replayOpenSeams(openSeams);
      return openSeams.length === 0
        ? host.unknown(reason, node, moduleKey, seamKind, reasonKinds)
        : new EvaluationUnknownValue(reason, node, true);
    },
  });
}

function staticValueMemberValue(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[] = [],
): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Value, value, openSeams };
}

function staticValueMemberCandidate(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[],
): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Candidate, value, openSeams };
}

function staticValueMemberGetter(
  getter: EvaluationFunctionValue,
  thisValue: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[] = [],
): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Getter, getter, thisValue, openSeams };
}

function staticValueMemberOpen(
  reason: string,
  seamKind: EvaluationOpenSeamKind,
  reasonKinds: readonly OpenSeamReasonKind[] = [],
  openSeams: readonly EvaluationOpenSeam[] = [],
): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Open, reason, seamKind, reasonKinds, openSeams };
}

export function readStaticValueProperty(
  receiver: EvaluationValue,
  propertyName: string,
  node: ts.Node | null,
): StaticValueMemberRead {
  const ownProperty = readStaticOwnProperty(receiver, propertyName);
  if (ownProperty != null) {
    const openSeams = compactEvaluationOpenSeams([
      ...(receiver.kind === EvaluationValueKind.Instance ? receiver.constructionOpenSeams : []),
      ...ownProperty.openSeams,
    ]);
    if (ownProperty.state === EvaluationObjectPropertyState.Open && openSeams.length === 0) {
      return staticValueMemberOpen(
        `Object property '${propertyName}' may be replaced by an unknown computed key or spread.`,
        EvaluationOpenSeamKind.UnresolvedIdentifier,
        openSeamReasonKindsForEvaluationValue(receiver),
      );
    }
    if (ownProperty.node != null && ts.isGetAccessorDeclaration(ownProperty.node) && ownProperty.value.kind === EvaluationValueKind.Function) {
      return openSeams.length === 0 && ownProperty.state === EvaluationObjectPropertyState.Closed
        ? staticValueMemberGetter(ownProperty.value, receiver)
        : staticValueMemberOpen(
            `Getter '${propertyName}' is qualified by open property pressure and cannot be invoked speculatively.`,
            EvaluationOpenSeamKind.DynamicCall,
            openSeamReasonKindsForEvaluationValue(receiver),
            openSeams,
          );
    }
    return openSeams.length > 0 || ownProperty.state === EvaluationObjectPropertyState.Open
      ? staticValueMemberCandidate(ownProperty.value, openSeams)
      : staticValueMemberValue(ownProperty.value);
  }
  if (receiver.kind === EvaluationValueKind.BoundaryObject) {
    return staticValueMemberValue(new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.BoundaryValue) {
    return staticValueMemberValue(new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node));
  }
  if ((receiver.kind === EvaluationValueKind.Object || receiver.kind === EvaluationValueKind.Instance)
    && !receiver.mayHaveUnknownProperties) {
    return staticValueMemberValue(new EvaluationUndefinedValue(node));
  }
  if (
    receiver.kind === EvaluationValueKind.Object
    || receiver.kind === EvaluationValueKind.Function
    || receiver.kind === EvaluationValueKind.Class
    || receiver.kind === EvaluationValueKind.Instance
  ) {
    const openSeams = receiver.kind === EvaluationValueKind.Object
      ? receiver.shapeOpenSeams
      : receiver.kind === EvaluationValueKind.Instance
        ? compactEvaluationOpenSeams([
            ...receiver.constructionOpenSeams,
            ...receiver.shapeOpenSeams,
          ])
        : [];
    return staticValueMemberOpen(
      `Object property '${propertyName}' was not known.`,
      EvaluationOpenSeamKind.UnresolvedIdentifier,
      openSeamReasonKindsForEvaluationValue(receiver),
      openSeams,
    );
  }
  if (receiver.kind === EvaluationValueKind.ModuleNamespace) {
    const entry = receiver.exportEntries.get(propertyName) ?? null;
    return entry == null
      ? staticValueMemberOpen(
          `Module namespace export '${propertyName}' was not known.`,
          EvaluationOpenSeamKind.UnresolvedIdentifier,
        )
      : entry.openSeams.length === 0
        ? staticValueMemberValue(entry.value)
        : staticValueMemberCandidate(entry.value, entry.openSeams);
  }
  if (receiver.kind === EvaluationValueKind.Array && isKnownArrayPrototypeFunction(propertyName)) {
    return staticValueMemberValue(new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `Array.prototype.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.String && isKnownStringPrototypeFunction(propertyName)) {
    return staticValueMemberValue(new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `String.prototype.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.Array && propertyName === 'length') {
    return receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder
      ? staticValueMemberOpen(
          ['Array length depends on unknown membership or order.', ...evaluationArrayUncertaintySummaries(receiver)].join(' '),
          EvaluationOpenSeamKind.UnresolvedIdentifier,
          [],
          receiver.shapeOpenSeams,
        )
      : staticValueMemberValue(new EvaluationNumberValue(receiver.elements.length, node));
  }
  if (receiver.kind === EvaluationValueKind.Set && propertyName === 'size' && !receiver.weak) {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.elements.length, node));
  }
  if (receiver.kind === EvaluationValueKind.Map && propertyName === 'size' && !receiver.weak) {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.entries.length, node));
  }
  if (receiver.kind === EvaluationValueKind.String && propertyName === 'length') {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.value.length, node));
  }
  return staticValueMemberOpen(
    `Property access '${propertyName}' did not close over a known receiver.`,
    EvaluationOpenSeamKind.UnresolvedIdentifier,
  );
}

export function readStaticValueElement(
  receiver: EvaluationValue,
  argument: EvaluationValue,
  node: ts.Node | null,
): StaticValueMemberRead {
  if (receiver.kind === EvaluationValueKind.Array && argument.kind === EvaluationValueKind.Number) {
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return staticValueMemberOpen(
        [`Array index ${argument.value} depends on unknown membership or order.`, ...evaluationArrayUncertaintySummaries(receiver)].join(' '),
        EvaluationOpenSeamKind.UnresolvedIdentifier,
        [],
        receiver.shapeOpenSeams,
      );
    }
    const index = Number.isInteger(argument.value) && argument.value >= 0
      ? argument.value
      : null;
    const element = index == null ? null : receiver.elements[index] ?? null;
    if (element != null) {
      return element.openSeams.length === 0
        ? staticValueMemberValue(element.value)
        : staticValueMemberCandidate(element.value, element.openSeams);
    }
    return staticValueMemberValue(new EvaluationUndefinedValue(node));
  }

  const propertyName = evaluationPropertyKeyString(argument);
  if (propertyName != null) {
    return readStaticValueProperty(receiver, propertyName, node);
  }

  return staticValueMemberOpen(
    'Element access did not close over a known receiver and key.',
    EvaluationOpenSeamKind.UnsupportedExpression,
  );
}

export function evaluateStaticElementAccess(
  expression: ts.ElementAccessExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  const receiverCheckpoint = host.openSeamCheckpoint();
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  const receiverPressure = host.consumeOpenSeamsSince(receiverCheckpoint);
  const receiverEdgePressure = unretainedEvaluationOpenSeams(receiver, receiverPressure);
  if (hasQuestionDotToken(expression) && isNullishEvaluationValue(receiver)) {
    return new EvaluationUndefinedValue(expression);
  }
  const argumentCheckpoint = host.openSeamCheckpoint();
  const argument = expression.argumentExpression == null
    ? null
    : host.evaluateExpression(expression.argumentExpression, environment, moduleKey, depth + 1);
  const argumentPressure = host.consumeOpenSeamsSince(argumentCheckpoint);
  const argumentEdgePressure = argument == null
    ? []
    : unretainedEvaluationOpenSeams(argument, argumentPressure);
  if (receiverEdgePressure.length > 0 || argumentEdgePressure.length > 0) {
    host.replayOpenSeams([...receiverEdgePressure, ...argumentEdgePressure]);
    return new EvaluationUnknownValue(
      'Element access depended on a retained receiver or key candidate.',
      expression,
      true,
    );
  }
  if (receiver.kind === EvaluationValueKind.Unknown) {
    host.replayOpenSeams(receiverPressure);
    return host.materializeUnknownUse(receiver, expression, moduleKey, 'Element access depended on an open receiver.', EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (argument?.kind === EvaluationValueKind.Unknown) {
    host.replayOpenSeams(argumentPressure);
    return host.materializeUnknownUse(argument, expression, moduleKey, 'Element access depended on an open key.', EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (argument == null) {
    return host.unknown(
      'Element access had no argument expression.',
      expression,
      moduleKey,
      EvaluationOpenSeamKind.UnsupportedExpression,
      [OpenSeamReasonKind.StaticEvaluationUnsupportedExpression],
    );
  }
  return evaluateStaticElementValue(receiver, argument, expression, moduleKey, depth + 1, host);
}

export function readStaticOwnProperty(
  receiver: EvaluationValue,
  name: string,
): EvaluationObjectProperty | null {
  switch (receiver.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      return receiver.properties.get(name) ?? null;
    case EvaluationValueKind.RegularExpression:
      return readStaticRegularExpressionProperty(receiver, name);
    default:
      return null;
  }
}

export function writeStaticOwnProperty(
  receiver: EvaluationValue,
  name: string,
  value: EvaluationValue,
  node: ts.Node,
  openSeams: readonly EvaluationOpenSeam[],
): boolean {
  switch (receiver.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      receiver.properties.set(name, new EvaluationObjectProperty(
        name,
        value,
        node,
        EvaluationObjectPropertyState.Closed,
        openSeams,
      ));
      return true;
    case EvaluationValueKind.BoundaryValue:
      return false;
    default:
      return false;
  }
}

function readStaticRegularExpressionProperty(
  receiver: EvaluationRegularExpressionValue,
  name: string,
): EvaluationObjectProperty | null {
  const node = receiver.node;
  if (node == null) {
    return null;
  }
  switch (name) {
    case 'source':
      return new EvaluationObjectProperty(name, new EvaluationStringValue(receiver.pattern, node), node, EvaluationObjectPropertyState.Closed);
    case 'flags':
      return new EvaluationObjectProperty(name, new EvaluationStringValue(receiver.flags, node), node, EvaluationObjectPropertyState.Closed);
    case 'global':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('g'), node), node, EvaluationObjectPropertyState.Closed);
    case 'ignoreCase':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('i'), node), node, EvaluationObjectPropertyState.Closed);
    case 'multiline':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('m'), node), node, EvaluationObjectPropertyState.Closed);
    case 'dotAll':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('s'), node), node, EvaluationObjectPropertyState.Closed);
    case 'unicode':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('u'), node), node, EvaluationObjectPropertyState.Closed);
    case 'unicodeSets':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('v'), node), node, EvaluationObjectPropertyState.Closed);
    case 'sticky':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('y'), node), node, EvaluationObjectPropertyState.Closed);
    case 'hasIndices':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('d'), node), node, EvaluationObjectPropertyState.Closed);
    case 'lastIndex':
      return new EvaluationObjectProperty(name, new EvaluationNumberValue(0, node), node, EvaluationObjectPropertyState.Closed);
    default:
      return null;
  }
}

function isKnownArrayPrototypeFunction(name: string): boolean {
  return aureliaArrayMethodSemanticsFor(name) != null;
}

function isKnownStringPrototypeFunction(name: string): boolean {
  return staticStringPrototypeBoundaryMethods.has(name);
}
