import ts from 'typescript';

import {
  type StaticBindingPatternHost,
  initializeStaticFunctionParameters,
} from './binding-patterns.js';
import {
  EvaluationCompletionKind,
  type EvaluationExpressionAbruptCompletion,
  type EvaluationCompletion,
} from './completion.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import { EvaluationBindingKind } from './environment.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationValueEvidence,
  evaluationValueEvidence,
  unretainedEvaluationOpenSeams,
} from './value-pressure.js';
import {
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationInstanceValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationUndefined,
  EvaluationValueKind,
  openEvaluationLocalPropertyMembership,
  openEvaluationObjectProperties,
  type EvaluationUnknownValue,
  type EvaluationValue,
} from './values.js';
import { hasModifier, isParameterProperty } from './ts-syntax.js';

export interface StaticClassEvaluationHost {
  readonly bindingHost: StaticBindingPatternHost;

  retainProduced<TValue extends EvaluationValue>(value: TValue): TValue;

  raise(completion: EvaluationExpressionAbruptCompletion): never;

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

  openSeamCheckpoint(): number;

  openSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[];

  consumeOpenSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[];

  replayOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void;
}

export class StaticClassPropertyEvaluation {
  readonly shapeOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly properties: Map<string, EvaluationObjectProperty>,
    readonly mayHaveUnknownProperties: boolean,
    shapeOpenSeams: readonly EvaluationOpenSeam[],
  ) {
    this.shapeOpenSeams = compactEvaluationOpenSeams(shapeOpenSeams);
  }
}

export function readStaticClassProperties(
  declaration: ts.ClassLikeDeclaration,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticClassEvaluationHost,
): StaticClassPropertyEvaluation {
  const properties = new Map<string, EvaluationObjectProperty>();
  let mayHaveUnknownProperties = false;
  const shapeOpenSeams: EvaluationOpenSeam[] = [];
  for (const member of declaration.members) {
    if (!hasModifier(member, ts.SyntaxKind.StaticKeyword)) {
      continue;
    }
    if (!isStaticClassPropertyCarrier(member)) {
      continue;
    }
    const checkpoint = host.openSeamCheckpoint();
    const name = host.readPropertyName(member.name, environment, moduleKey, depth + 1);
    if (name == null) {
      const pressure = host.openSeamsSince(checkpoint);
      mayHaveUnknownProperties = true;
      shapeOpenSeams.push(...pressure);
      openEvaluationObjectProperties(properties, pressure);
      continue;
    }
    if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
      properties.set(name, new EvaluationObjectProperty(
        name,
        new EvaluationFunctionValue(member, environment, member),
        member,
        EvaluationObjectPropertyState.Closed,
        host.consumeOpenSeamsSince(checkpoint),
      ));
      continue;
    }
    if (member.initializer != null) {
      const value = host.evaluateExpression(member.initializer, environment, moduleKey, depth + 1);
      const evidence = evaluationValueEvidence(value, host.consumeOpenSeamsSince(checkpoint));
      properties.set(name, new EvaluationObjectProperty(
        name,
        evidence.value,
        member,
        EvaluationObjectPropertyState.Closed,
        evidence.openSeams,
      ));
    }
  }
  return new StaticClassPropertyEvaluation(properties, mayHaveUnknownProperties, shapeOpenSeams);
}

export function evaluateStaticClassInstantiation(
  callee: EvaluationClassValue,
  expression: ts.Node,
  argumentValues: readonly EvaluationValueEvidence[],
  moduleKey: string,
  depth: number,
  host: StaticClassEvaluationHost,
): EvaluationValue {
  const instance = host.retainProduced(new EvaluationInstanceValue(callee, new Map(), false, expression));
  const instanceEnvironment = callee.environment.createChild(`${moduleKey}:new:${expression.getStart()}`);
  instanceEnvironment.initializeBinding('this', instance, EvaluationBindingKind.Parameter, false, expression, []);

  const constructor = callee.declaration.members.find(ts.isConstructorDeclaration) ?? null;
  if (constructor != null) {
    const checkpoint = host.openSeamCheckpoint();
    initializeStaticFunctionParameters(constructor, argumentValues, instanceEnvironment, moduleKey, expression, depth + 1, host.bindingHost);
    instance.retainConstructionOpenSeams(host.consumeOpenSeamsSince(checkpoint));
  }

  readInstanceClassProperties(
    callee.declaration,
    instanceEnvironment,
    callee.environment,
    moduleKey,
    depth + 1,
    instance,
    host,
  );

  if (constructor != null) {
    applyConstructorParameterProperties(constructor, argumentValues, instance, expression);
    if (constructor.body != null) {
      const checkpoint = host.openSeamCheckpoint();
      const completion = host.evaluateBlock(constructor.body, instanceEnvironment, moduleKey, depth + 1);
      const constructorPressure = unretainedEvaluationOpenSeams(
        instance,
        host.consumeOpenSeamsSince(checkpoint),
      );
      instance.retainConstructionOpenSeams(constructorPressure);
      if (constructorPressure.length > 0) {
        openEvaluationLocalPropertyMembership(instance, constructorPressure);
      }
      host.replayOpenSeams(constructorPressure);
      if (completion.kind === EvaluationCompletionKind.Return && isObjectReturningConstructorValue(completion.value)) {
        host.replayOpenSeams(completion.openSeams);
        return completion.value;
      }
      if (completion.kind === EvaluationCompletionKind.Throw) {
        host.replayOpenSeams(completion.openSeams);
        return host.raise(completion);
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
  initializerEnvironment: ModuleEnvironmentRecord,
  methodEnvironment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  instance: EvaluationInstanceValue,
  host: StaticClassEvaluationHost,
): void {
  for (const member of declaration.members) {
    if (hasModifier(member, ts.SyntaxKind.StaticKeyword) || hasModifier(member, ts.SyntaxKind.DeclareKeyword)) {
      continue;
    }
    if (!isStaticClassPropertyCarrier(member)) {
      continue;
    }
    const checkpoint = host.openSeamCheckpoint();
    const name = host.readPropertyName(member.name, initializerEnvironment, moduleKey, depth + 1);
    if (name == null) {
      const pressure = host.consumeOpenSeamsSince(checkpoint);
      instance.mayHaveUnknownProperties = true;
      instance.retainShapeOpenSeams(pressure);
      openEvaluationObjectProperties(instance.properties, pressure);
      host.replayOpenSeams(pressure);
      continue;
    }
    if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
      instance.properties.set(name, new EvaluationObjectProperty(
        name,
        new EvaluationFunctionValue(member, methodEnvironment, member),
        member,
        EvaluationObjectPropertyState.Closed,
        host.consumeOpenSeamsSince(checkpoint),
      ));
      continue;
    }
    const value = member.initializer == null
      ? EvaluationUndefined
      : host.evaluateExpression(member.initializer, initializerEnvironment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, host.consumeOpenSeamsSince(checkpoint));
    instance.properties.set(name, new EvaluationObjectProperty(
      name,
      evidence.value,
      member,
      EvaluationObjectPropertyState.Closed,
      evidence.openSeams,
    ));
  }
}

function applyConstructorParameterProperties(
  declaration: ts.ConstructorDeclaration,
  argumentValues: readonly EvaluationValueEvidence[],
  instance: EvaluationInstanceValue,
  node: ts.Node,
): void {
  for (let index = 0; index < declaration.parameters.length; index++) {
    const parameter = declaration.parameters[index];
    if (parameter == null || !ts.isIdentifier(parameter.name) || !isParameterProperty(parameter)) {
      continue;
    }
    const name = parameter.name.text;
    const argument = argumentValues[index] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
    instance.properties.set(name, new EvaluationObjectProperty(
      name,
      argument.value,
      node,
      EvaluationObjectPropertyState.Closed,
      argument.openSeams,
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
    case EvaluationValueKind.Date:
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
