import ts from 'typescript';

import {
  initializeStaticFunctionParameters,
  type StaticBindingPatternHost,
} from './binding-patterns.js';
import {
  EvaluationCompletionKind,
  type EvaluationExpressionAbruptCompletion,
  type EvaluationCompletion,
} from './completion.js';
import {
  EvaluationBindingKind,
  type ModuleEnvironmentRecord,
} from './environment.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationValueEvidence,
} from './value-pressure.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationFunctionValue,
  EvaluationPromiseValue,
  EvaluationUndefined,
  type EvaluationUnknownValue,
  type EvaluationValue,
} from './values.js';

export interface StaticFunctionEvaluationHost {
  readonly bindingHost: StaticBindingPatternHost;

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

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  replayOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void;
}

export function evaluateStaticFunctionWithArguments(
  callee: EvaluationFunctionValue,
  call: ts.Node,
  argumentValues: readonly EvaluationValueEvidence[],
  moduleKey: string,
  depth: number,
  host: StaticFunctionEvaluationHost,
  thisValue: EvaluationValueEvidence | null,
): EvaluationValue {
  if (callee.declaration.asteriskToken != null) {
    return host.unknown('Generator functions are not evaluated.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (isAsyncFunctionLike(callee.declaration)) {
    return EvaluationPromiseValue.open(
      new EvaluationValueEvidence(new EvaluationBoundaryValue(
        EvaluationBoundaryKind.AsyncExecution,
        asyncFunctionBoundaryPath(callee.declaration),
        call,
      ), []),
      call,
    );
  }

  const callEnvironment = callee.environment.createChild(`${moduleKey}:call:${call.getStart()}`);
  if (!ts.isArrowFunction(callee.declaration)) {
    const callThis = thisValue ?? new EvaluationValueEvidence(EvaluationUndefined, []);
    callEnvironment.initializeBinding(
      'this',
      callThis.value,
      EvaluationBindingKind.Parameter,
      true,
      call,
      callThis.openSeams,
    );
  }
  initializeStaticFunctionParameters(callee.declaration, argumentValues, callEnvironment, moduleKey, call, depth + 1, host.bindingHost);

  const body = callee.declaration.body;
  if (body == null) {
    return host.unknown('Function body is not available to static evaluation.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (ts.isExpression(body)) {
    return host.evaluateExpression(body, callEnvironment, moduleKey, depth + 1);
  }

  const completion = host.evaluateBlock(body, callEnvironment, moduleKey, depth + 1);
  if (completion.kind === EvaluationCompletionKind.Return) {
    host.replayOpenSeams(completion.openSeams);
    return completion.value;
  }
  if (completion.kind === EvaluationCompletionKind.Normal) {
    return EvaluationUndefined;
  }
  if (completion.kind === EvaluationCompletionKind.Throw) {
    host.replayOpenSeams(completion.openSeams);
    return host.raise(completion);
  }
  return host.unknown('Function body did not complete with a static return value.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

function isAsyncFunctionLike(declaration: ts.FunctionLikeDeclaration): boolean {
  return declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true;
}

function asyncFunctionBoundaryPath(declaration: ts.FunctionLikeDeclaration): string {
  const name = ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)
    ? declaration.name?.getText(declaration.getSourceFile())
    : null;
  return name == null
    ? 'async function fulfillment'
    : `async function '${name}' fulfillment`;
}
