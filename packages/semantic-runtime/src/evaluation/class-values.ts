import ts from 'typescript';

import {
  type StaticBindingPatternHost,
  initializeStaticFunctionParameters,
} from './binding-patterns.js';
import {
  EvaluationCompletionKind,
  type EvaluationCompletion,
} from './completion.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import { EvaluationBindingKind } from './environment.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationInstanceValue,
  EvaluationObjectProperty,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationUnknownValue,
  type EvaluationValue,
} from './values.js';
import { hasModifier, isParameterProperty } from './ts-syntax.js';

export interface StaticClassEvaluationHost {
  readonly bindingHost: StaticBindingPatternHost;

  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  evaluateBlock(
    block: ts.Block,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion;

  readPropertyName(
    name: ts.PropertyName,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): string | null;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;
}

export function readStaticClassProperties(
  declaration: ts.ClassLikeDeclaration,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticClassEvaluationHost,
): Map<string, EvaluationObjectProperty> {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const member of declaration.members) {
    if (!hasModifier(member, ts.SyntaxKind.StaticKeyword)) {
      continue;
    }
    if (!isStaticClassPropertyCarrier(member)) {
      continue;
    }
    const name = host.readPropertyName(member.name, environment, moduleKey, depth + 1);
    if (name == null) {
      continue;
    }
    if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
      properties.set(name, new EvaluationObjectProperty(
        name,
        new EvaluationFunctionValue(member, environment.clone(`${moduleKey}:static:${name}`), member),
        member,
      ));
      continue;
    }
    if (member.initializer != null) {
      properties.set(name, new EvaluationObjectProperty(
        name,
        host.evaluateExpression(member.initializer, environment, moduleKey, depth + 1),
        member,
      ));
    }
  }
  return properties;
}

export function evaluateStaticClassInstantiation(
  callee: EvaluationClassValue,
  expression: ts.Node,
  argumentValues: readonly EvaluationValue[],
  moduleKey: string,
  depth: number,
  host: StaticClassEvaluationHost,
): EvaluationValue {
  const instance = new EvaluationInstanceValue(callee, new Map(), false, expression);
  const instanceEnvironment = callee.environment.clone(`${moduleKey}:new:${expression.getStart()}`) as ModuleEnvironmentRecord;
  instanceEnvironment.initializeBinding('this', instance, EvaluationBindingKind.Parameter, false, expression);

  const constructor = callee.declaration.members.find(ts.isConstructorDeclaration) ?? null;
  if (constructor != null) {
    initializeStaticFunctionParameters(constructor, argumentValues, instanceEnvironment, moduleKey, expression, depth + 1, host.bindingHost);
  }

  readInstanceClassProperties(callee.declaration, instanceEnvironment, moduleKey, depth + 1, instance.properties, host);

  if (constructor != null) {
    applyConstructorParameterProperties(constructor, argumentValues, instance, expression);
    if (constructor.body != null) {
      const completion = host.evaluateBlock(constructor.body, instanceEnvironment, moduleKey, depth + 1);
      if (completion.kind === EvaluationCompletionKind.Return && isObjectReturningConstructorValue(completion.value)) {
        return completion.value;
      }
      if (completion.kind === EvaluationCompletionKind.Throw) {
        return host.unknown('Class constructor threw during static evaluation.', expression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
      }
      if (completion.kind === EvaluationCompletionKind.Break || completion.kind === EvaluationCompletionKind.Continue) {
        return host.unknown('Class constructor control flow did not complete normally.', expression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
      }
    }
  }

  return instance;
}

function readInstanceClassProperties(
  declaration: ts.ClassLikeDeclaration,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  properties: Map<string, EvaluationObjectProperty>,
  host: StaticClassEvaluationHost,
): void {
  for (const member of declaration.members) {
    if (hasModifier(member, ts.SyntaxKind.StaticKeyword) || hasModifier(member, ts.SyntaxKind.DeclareKeyword)) {
      continue;
    }
    if (!isStaticClassPropertyCarrier(member)) {
      continue;
    }
    const name = host.readPropertyName(member.name, environment, moduleKey, depth + 1);
    if (name == null) {
      continue;
    }
    if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
      properties.set(name, new EvaluationObjectProperty(
        name,
        new EvaluationFunctionValue(member, environment.clone(`${moduleKey}:instance:${name}`), member),
        member,
      ));
      continue;
    }
    properties.set(name, new EvaluationObjectProperty(
      name,
      member.initializer == null
        ? EvaluationUndefined
        : host.evaluateExpression(member.initializer, environment, moduleKey, depth + 1),
      member,
    ));
  }
}

function applyConstructorParameterProperties(
  declaration: ts.ConstructorDeclaration,
  argumentValues: readonly EvaluationValue[],
  instance: EvaluationInstanceValue,
  node: ts.Node,
): void {
  for (let index = 0; index < declaration.parameters.length; index++) {
    const parameter = declaration.parameters[index];
    if (parameter == null || !ts.isIdentifier(parameter.name) || !isParameterProperty(parameter)) {
      continue;
    }
    const name = parameter.name.text;
    instance.properties.set(name, new EvaluationObjectProperty(
      name,
      argumentValues[index] ?? EvaluationUndefined,
      node,
    ));
  }
}

function isStaticClassPropertyCarrier(
  member: ts.ClassElement,
): member is ts.MethodDeclaration | ts.PropertyDeclaration | ts.GetAccessorDeclaration {
  return ts.isMethodDeclaration(member)
    || ts.isPropertyDeclaration(member)
    || ts.isGetAccessorDeclaration(member);
}

function isObjectReturningConstructorValue(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
      return false;
  }
}
