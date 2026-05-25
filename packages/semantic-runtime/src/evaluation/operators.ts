import ts from 'typescript';

import {
  EvaluationBooleanValue,
  EvaluationBoundaryKind,
  EvaluationValueKind,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  evaluationValuesEqual,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationValue,
} from './values.js';

export type StaticBinaryOperation =
  | '=='
  | '==='
  | '!='
  | '!=='
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '**'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'in'
  | 'instanceof';

export type StaticUnaryOperation =
  | '!'
  | '+'
  | '-'
  | '~'
  | 'typeof'
  | 'void';

export function evaluateStaticBinaryOperator(
  operator: ts.SyntaxKind,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node,
): EvaluationValue | null {
  const operation = staticBinaryOperationForToken(operator);
  return operation == null ? null : evaluateStaticBinaryOperation(operation, left, right, node);
}

export function evaluateStaticBinaryOperation(
  operation: StaticBinaryOperation,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node | null,
): EvaluationValue | null {
  switch (operation) {
    case '==':
      return new EvaluationBooleanValue(evaluationValuesLooselyEqual(left, right), node);
    case '===':
      return new EvaluationBooleanValue(evaluationValuesEqual(left, right), node);
    case '!=':
      return new EvaluationBooleanValue(!evaluationValuesLooselyEqual(left, right), node);
    case '!==':
      return new EvaluationBooleanValue(!evaluationValuesEqual(left, right), node);
    case 'in':
      return evaluateStaticInOperation(left, right, node);
    case 'instanceof':
      return evaluateStaticInstanceOfOperation(left, right, node);
  }

  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return null;
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);

  switch (operation) {
    case '+':
      if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
        return new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), node);
      }
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive + rightPrimitive, node)
        : null;
    case '-':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive - rightPrimitive, node)
        : null;
    case '*':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive * rightPrimitive, node)
        : null;
    case '/':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive / rightPrimitive, node)
        : null;
    case '%':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive % rightPrimitive, node)
        : null;
    case '**':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive ** rightPrimitive, node)
        : null;
    case '<':
      return evaluateStaticRelationalOperation('<', leftPrimitive, rightPrimitive, node);
    case '<=':
      return evaluateStaticRelationalOperation('<=', leftPrimitive, rightPrimitive, node);
    case '>':
      return evaluateStaticRelationalOperation('>', leftPrimitive, rightPrimitive, node);
    case '>=':
      return evaluateStaticRelationalOperation('>=', leftPrimitive, rightPrimitive, node);
    default:
      return null;
  }
}

/** Reduces the deterministic numeric/string subset of ECMAScript relational comparison. */
function evaluateStaticRelationalOperation(
  operation: '<' | '<=' | '>' | '>=',
  left: string | number | boolean | null | undefined,
  right: string | number | boolean | null | undefined,
  node: ts.Node | null,
): EvaluationBooleanValue | null {
  const comparable = relationalComparableValues(left, right);
  if (comparable == null) {
    return null;
  }
  switch (operation) {
    case '<':
      return new EvaluationBooleanValue(comparable.left < comparable.right, node);
    case '<=':
      return new EvaluationBooleanValue(comparable.left <= comparable.right, node);
    case '>':
      return new EvaluationBooleanValue(comparable.left > comparable.right, node);
    case '>=':
      return new EvaluationBooleanValue(comparable.left >= comparable.right, node);
  }
}

/** Selects the relational comparison lane that does not require open coercion modeling. */
function relationalComparableValues(
  left: string | number | boolean | null | undefined,
  right: string | number | boolean | null | undefined,
): { readonly left: string | number; readonly right: string | number } | null {
  if (typeof left === 'string' && typeof right === 'string') {
    return { left, right };
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return { left, right };
  }
  return null;
}

function evaluateStaticInOperation(
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node | null,
): EvaluationBooleanValue | null {
  const key = evaluationPropertyKeyString(left);
  if (key == null) {
    return null;
  }
  switch (right.kind) {
    case EvaluationValueKind.Object:
      return right.properties.has(key)
        ? new EvaluationBooleanValue(true, node)
        : right.mayHaveUnknownProperties ? null : new EvaluationBooleanValue(false, node);
    case EvaluationValueKind.Array:
      if (key === 'length') {
        return new EvaluationBooleanValue(true, node);
      }
      if (!isArrayIndexKey(key)) {
        return null;
      }
      return right.mayHaveUnknownElements || right.mayHaveUnknownOrder
        ? null
        : new EvaluationBooleanValue(Number(key) >= 0 && Number(key) < right.elements.length, node);
    case EvaluationValueKind.ModuleNamespace:
      return new EvaluationBooleanValue(right.exports.has(key), node);
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Instance:
      return null;
    default:
      return null;
  }
}

function evaluateStaticInstanceOfOperation(
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node | null,
): EvaluationBooleanValue | null {
  if (right.kind === EvaluationValueKind.Class) {
    return left.kind === EvaluationValueKind.Instance
      ? new EvaluationBooleanValue(left.classValue === right, node)
      : new EvaluationBooleanValue(false, node);
  }
  if (
    (right.kind !== EvaluationValueKind.BoundaryObject && right.kind !== EvaluationValueKind.BoundaryValue)
    || right.boundaryKind !== EvaluationBoundaryKind.HostEnvironment
  ) {
    return null;
  }
  switch (right.path) {
    case 'Object':
      return new EvaluationBooleanValue(isObjectInstanceValue(left), node);
    case 'Array':
      return new EvaluationBooleanValue(left.kind === EvaluationValueKind.Array, node);
    case 'Map':
      return new EvaluationBooleanValue(left.kind === EvaluationValueKind.Map, node);
    case 'Set':
      return new EvaluationBooleanValue(left.kind === EvaluationValueKind.Set, node);
    case 'RegExp':
      return new EvaluationBooleanValue(left.kind === EvaluationValueKind.RegularExpression, node);
    case 'Promise':
      return new EvaluationBooleanValue(left.kind === EvaluationValueKind.Promise, node);
    case 'String':
    case 'Number':
    case 'Boolean':
    case 'BigInt':
      return new EvaluationBooleanValue(false, node);
    default:
      return null;
  }
}

function isObjectInstanceValue(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
    case EvaluationValueKind.BoundaryValue:
      return false;
  }
}

/** JavaScript property-key coercion used by static value operations that can only accept primitive keys. */
export function evaluationPropertyKeyString(value: EvaluationValue): string | null {
  return isEvaluationPrimitiveValue(value) ? String(readEvaluationPrimitive(value)) : null;
}

function isArrayIndexKey(key: string): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) {
    return false;
  }
  const value = Number(key);
  return Number.isSafeInteger(value);
}

export function evaluateStaticUnaryOperation(
  operation: StaticUnaryOperation,
  operand: EvaluationValue,
  node: ts.Node | null,
): EvaluationValue | null {
  switch (operation) {
    case '!': {
      const truthy = readEvaluationTruthiness(operand);
      return truthy == null ? null : new EvaluationBooleanValue(!truthy, node);
    }
    case '+':
      return isEvaluationPrimitiveValue(operand)
        ? new EvaluationNumberValue(Number(readEvaluationPrimitive(operand)), node)
        : null;
    case '-':
      return isEvaluationPrimitiveValue(operand)
        ? new EvaluationNumberValue(-Number(readEvaluationPrimitive(operand)), node)
        : null;
    case '~':
      return operand.kind === EvaluationValueKind.Number
        ? new EvaluationNumberValue(~operand.value, node)
        : null;
    case 'typeof':
      return evaluateStaticTypeOfValue(operand, node);
    case 'void':
      return node == null ? EvaluationUndefined : new EvaluationUndefinedValue(node);
  }
}

function evaluateStaticTypeOfValue(
  operand: EvaluationValue,
  node: ts.Node | null,
): EvaluationStringValue | null {
  switch (operand.kind) {
    case EvaluationValueKind.Undefined:
      return new EvaluationStringValue('undefined', node);
    case EvaluationValueKind.Boolean:
      return new EvaluationStringValue('boolean', node);
    case EvaluationValueKind.Number:
      return new EvaluationStringValue('number', node);
    case EvaluationValueKind.BigInt:
      return new EvaluationStringValue('bigint', node);
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
      return new EvaluationStringValue('string', node);
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
      return new EvaluationStringValue('function', node);
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return new EvaluationStringValue('object', node);
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Unknown:
      return null;
  }
}

function evaluationValuesLooselyEqual(
  left: EvaluationValue,
  right: EvaluationValue,
): boolean {
  if (left.kind === EvaluationValueKind.Null || left.kind === EvaluationValueKind.Undefined) {
    return right.kind === EvaluationValueKind.Null || right.kind === EvaluationValueKind.Undefined;
  }
  if (right.kind === EvaluationValueKind.Null || right.kind === EvaluationValueKind.Undefined) {
    return false;
  }
  if (left.kind === EvaluationValueKind.Boolean) {
    return evaluationValuesLooselyEqual(new EvaluationNumberValue(left.value ? 1 : 0, left.node), right);
  }
  if (right.kind === EvaluationValueKind.Boolean) {
    return evaluationValuesLooselyEqual(left, new EvaluationNumberValue(right.value ? 1 : 0, right.node));
  }
  if (left.kind === EvaluationValueKind.String && right.kind === EvaluationValueKind.Number) {
    return Number(left.value) === right.value;
  }
  if (left.kind === EvaluationValueKind.Number && right.kind === EvaluationValueKind.String) {
    return left.value === Number(right.value);
  }
  return evaluationValuesEqual(left, right);
}

function staticBinaryOperationForToken(operator: ts.SyntaxKind): StaticBinaryOperation | null {
  switch (operator) {
    case ts.SyntaxKind.EqualsEqualsToken:
      return '==';
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return '===';
    case ts.SyntaxKind.ExclamationEqualsToken:
      return '!=';
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return '!==';
    case ts.SyntaxKind.PlusToken:
      return '+';
    case ts.SyntaxKind.MinusToken:
      return '-';
    case ts.SyntaxKind.AsteriskToken:
      return '*';
    case ts.SyntaxKind.SlashToken:
      return '/';
    case ts.SyntaxKind.PercentToken:
      return '%';
    case ts.SyntaxKind.AsteriskAsteriskToken:
      return '**';
    case ts.SyntaxKind.LessThanToken:
      return '<';
    case ts.SyntaxKind.LessThanEqualsToken:
      return '<=';
    case ts.SyntaxKind.GreaterThanToken:
      return '>';
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return '>=';
    case ts.SyntaxKind.InKeyword:
      return 'in';
    case ts.SyntaxKind.InstanceOfKeyword:
      return 'instanceof';
    default:
      return null;
  }
}

export function staticUnaryOperationForToken(operator: ts.SyntaxKind): StaticUnaryOperation | null {
  switch (operator) {
    case ts.SyntaxKind.ExclamationToken:
      return '!';
    case ts.SyntaxKind.PlusToken:
      return '+';
    case ts.SyntaxKind.MinusToken:
      return '-';
    case ts.SyntaxKind.TildeToken:
      return '~';
    default:
      return null;
  }
}

export function staticTokenName(kind: ts.SyntaxKind): string {
  return ts.tokenToString(kind) ?? ts.SyntaxKind[kind] ?? String(kind);
}
