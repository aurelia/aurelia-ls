import ts from 'typescript';

import {
  initializeStaticFunctionParameters,
  type StaticBindingPatternHost,
} from './binding-patterns.js';
import {
  EvaluationCompletionKind,
  type EvaluationCompletion,
} from './completion.js';
import {
  EvaluationBindingKind,
  type ModuleEnvironmentRecord,
} from './environment.js';
import { EvaluationOpenSeamKind } from './seams.js';
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
}

export function evaluateStaticFunctionCall(
  callee: EvaluationFunctionValue,
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticFunctionEvaluationHost,
): EvaluationValue {
  return evaluateStaticFunctionWithArguments(
    callee,
    call,
    call.arguments.map((argument) => host.evaluateExpression(argument, environment, moduleKey, depth + 1)),
    moduleKey,
    depth + 1,
    host,
  );
}

export function evaluateStaticFunctionWithArguments(
  callee: EvaluationFunctionValue,
  call: ts.Node,
  argumentValues: readonly EvaluationValue[],
  moduleKey: string,
  depth: number,
  host: StaticFunctionEvaluationHost,
  thisValue: EvaluationValue | null = null,
): EvaluationValue {
  if (callee.declaration.asteriskToken != null) {
    return host.unknown('Generator functions are not evaluated.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (isAsyncFunctionLike(callee.declaration)) {
    return new EvaluationPromiseValue(
      new EvaluationBoundaryValue(
        EvaluationBoundaryKind.AsyncExecution,
        asyncFunctionBoundaryPath(callee.declaration),
        call,
      ),
      call,
    );
  }

  const callEnvironment = callee.environment.clone(`${moduleKey}:call:${call.getStart()}`) as ModuleEnvironmentRecord;
  if (thisValue != null) {
    callEnvironment.initializeBinding('this', thisValue, EvaluationBindingKind.Parameter, true, call);
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
    return completion.value;
  }
  if (completion.kind === EvaluationCompletionKind.Normal) {
    return EvaluationUndefined;
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
