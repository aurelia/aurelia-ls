import ts from 'typescript';
import {
  readReferenceName,
  unwrapExpression,
} from './ts-syntax.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from './evaluator.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';
import type { EvaluationOpenSeam } from './seams.js';
import {
  EvaluationValueKind,
  type EvaluationInstanceValue,
  type EvaluationObjectValue,
  type EvaluationValue,
} from './values.js';

export class EvaluationRead<TValue> {
  constructor(
    /** Value that closed, or null when the read stayed open. */
    readonly value: TValue | null,
    /** Source node that best explains this read. */
    readonly node: ts.Node | null,
    /** Evaluator seams observed while producing this read. */
    readonly openSeams: readonly EvaluationOpenSeam[] = [],
  ) {}
}

export class EvaluationTargetRead {
  constructor(
    readonly localName: string | null,
    readonly node: ts.Node,
    readonly isDeclaration: boolean,
    readonly openSeams: readonly EvaluationOpenSeam[] = [],
  ) {}
}

/** Generic expression reader over an already-built module environment. */
export class StaticEvaluationExpressionReader {
  constructor(
    readonly environment: ModuleEnvironmentRecord,
    readonly moduleKey: string,
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
  ) {}

  evaluateExpression(expression: ts.Expression): EvaluationRead<EvaluationValue> {
    const result = new StaticEvaluator(this.policy, this.runtimeHost).evaluateExpressionInEnvironment(expression, this.environment, this.moduleKey);
    return new EvaluationRead(result.value, expression, result.openSeams);
  }

  readObjectProperty(
    expression: ts.Expression,
    propertyName: string,
  ): EvaluationRead<EvaluationValue> {
    const result = this.evaluateExpression(expression);
    const value = result.value;
    if (
      value?.kind !== EvaluationValueKind.Object
      && value?.kind !== EvaluationValueKind.BoundaryObject
      && value?.kind !== EvaluationValueKind.Instance
    ) {
      return new EvaluationRead<EvaluationValue>(null, expression, result.openSeams);
    }
    const property = value.properties.get(propertyName);
    return property == null
      ? new EvaluationRead<EvaluationValue>(null, value.node, result.openSeams)
      : new EvaluationRead(property.value, property.node, result.openSeams);
  }

  readObjectStringProperty(
    value: EvaluationObjectValue,
    propertyName: string,
  ): EvaluationRead<string> | null {
    const property = value.properties.get(propertyName);
    if (property == null) {
      return null;
    }
    const stringValue = readStaticStringValue(property.value);
    return stringValue == null
      ? null
      : new EvaluationRead(stringValue, property.node);
  }

  readExpressionTarget(expression: ts.Expression): EvaluationTargetRead {
    const result = this.evaluateExpression(expression);
    const value = result.value;
    if (value?.kind === EvaluationValueKind.Class || value?.kind === EvaluationValueKind.Instance) {
      return readClassTarget(classDeclarationForTargetValue(value), result.openSeams);
    }
    return readSyntaxTarget(expression, result.openSeams);
  }
}

export function readClassTarget(
  classNode: ts.ClassLikeDeclarationBase,
  openSeams: readonly EvaluationOpenSeam[] = [],
): EvaluationTargetRead {
  return new EvaluationTargetRead(
    classNode.name?.text ?? null,
    classNode.name ?? classNode,
    true,
    openSeams,
  );
}

export function readSyntaxTarget(
  expression: ts.Expression,
  openSeams: readonly EvaluationOpenSeam[] = [],
): EvaluationTargetRead {
  const current = unwrapExpression(expression);
  return new EvaluationTargetRead(
    readReferenceName(current),
    current,
    false,
    openSeams,
  );
}

export function readStaticStringValue(
  value: EvaluationValue,
): string | null {
  switch (value.kind) {
    case EvaluationValueKind.String:
      return value.value;
    case EvaluationValueKind.StringPattern:
      return null;
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return null;
  }
}

function classDeclarationForTargetValue(value: EvaluationInstanceValue | Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Class }>): ts.ClassLikeDeclarationBase {
  return value.kind === EvaluationValueKind.Instance
    ? value.classValue.declaration
    : value.declaration;
}

export function readStaticStringArrayValue(
  value: EvaluationValue,
): readonly string[] | null {
  if (value.kind !== EvaluationValueKind.Array) {
    return null;
  }
  if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
    return null;
  }
  const result: string[] = [];
  for (const element of value.elements) {
    const stringValue = readStaticStringValue(element.value);
    if (stringValue == null) {
      return null;
    }
    result.push(stringValue);
  }
  return result;
}
