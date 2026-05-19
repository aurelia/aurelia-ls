import ts from 'typescript';

import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  ComputedObservationDependencyMode,
  ComputedObservationMemberKind,
} from './computed-observation.js';
import {
  AURELIA_COMPUTED_DECORATOR_EXPORTS,
  AURELIA_COMPUTED_DECORATOR_MODULES,
  readComputedDecorator,
  readComputedDependency,
} from './computed-observation-recognition.js';
import {
  computedDependencyRead,
  isNullishDependencyConfigValue,
  propertyKeyRead,
  type ComputedDependencyKeyRead,
  type ComputedDependencyRead,
} from './computed-dependency-config.js';
import {
  collectRuntimeConnectableObservedDependencyDrafts,
  type RuntimeConnectableObservedDependencyDraft,
} from './connectable-observed-dependency.js';

const trackableExpressionParser = new ExpressionParser();

const AURELIA_AST_TRACK_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_AST_TRACK_DECORATOR_EXPORTS = new Set([
  'astTrack',
]);

/**
 * Reads method-level @computed/@astTrack metadata that Aurelia stores under astTrackableMethodMarker.
 *
 * This is the common recognition layer for both template astEvaluate calls and ProxyObservable method calls.
 * Getter-owned @computed stays in computed-observation-recognition because it feeds ObserverLocator instead.
 */
export function readTrackableMethodDependency(
  method: ts.MethodDeclaration,
): ComputedDependencyRead | null {
  if (!ts.canHaveDecorators(method)) {
    return null;
  }
  const computedBindings = readSourceImportBindings(
    method.getSourceFile(),
    AURELIA_COMPUTED_DECORATOR_MODULES,
    AURELIA_COMPUTED_DECORATOR_EXPORTS,
  );
  const astTrackBindings = readSourceImportBindings(
    method.getSourceFile(),
    AURELIA_AST_TRACK_DECORATOR_MODULES,
    AURELIA_AST_TRACK_DECORATOR_EXPORTS,
  );
  let dependency: ComputedDependencyRead | null = null;
  for (const decorator of ts.getDecorators(method) ?? []) {
    dependency = readComputedTrackableDecorator(decorator, computedBindings)
      ?? readAstTrackDecoratorDependency(decorator, astTrackBindings)
      ?? dependency;
  }
  return dependency;
}

export function connectableDraftsForTrackableDependencyKey(
  dependency: ComputedDependencyKeyRead,
): readonly RuntimeConnectableObservedDependencyDraft[] {
  const parse = trackableExpressionParser.parse(dependency.key, 'IsProperty');
  return parse.kind === ExpressionParseResultKind.ExpressionSuccess
    || parse.kind === ExpressionParseResultKind.EmptyExpressionSuccess
    ? collectRuntimeConnectableObservedDependencyDrafts(parse.ast).map((draft) => ({
      ...draft,
      spanStart: dependency.start,
      spanEnd: dependency.end,
    }))
    : [];
}

function readComputedTrackableDecorator(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): ComputedDependencyRead | null {
  const computed = readComputedDecorator(decorator, bindings);
  return computed == null
    ? null
    : readComputedDependency(computed, ComputedObservationMemberKind.Method);
}

function readAstTrackDecoratorDependency(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): ComputedDependencyRead | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    const decoratorName = readImportedExportName(expression.expression, bindings, AURELIA_AST_TRACK_DECORATOR_EXPORTS);
    return decoratorName == null ? null : readAstTrackCallArguments(expression.arguments);
  }
  const decoratorName = readImportedExportName(expression, bindings, AURELIA_AST_TRACK_DECORATOR_EXPORTS);
  return decoratorName == null
    ? null
    : computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
}

function readAstTrackCallArguments(
  args: ts.NodeArray<ts.Expression>,
): ComputedDependencyRead {
  if (args.length === 0) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
  }
  const first = unwrapExpression(args[0]!);
  if (isNullishDependencyConfigValue(first)) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
  }
  if (ts.isObjectLiteralExpression(first)) {
    const deps = readObjectPropertyInitializer(first, 'deps');
    return deps == null || isNullishDependencyConfigValue(unwrapExpression(deps))
      ? computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack)
      : readTrackableDependencyExpression(unwrapExpression(deps));
  }
  return readTrackableDependencyExpressions(args.map((arg) => unwrapExpression(arg)));
}

function readTrackableDependencyExpression(
  expression: ts.Expression,
): ComputedDependencyRead {
  if (isNullishDependencyConfigValue(expression)) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.length === 0
      ? computedDependencyRead(ComputedObservationDependencyMode.Disabled)
      : readTrackableDependencyExpressions(expression.elements.map((element) => unwrapExpression(element)));
  }
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
    return computedDependencyRead(ComputedObservationDependencyMode.DependencyFunction, [], 'async', null, [expression]);
  }
  const keyRead = propertyKeyRead(expression);
  if (keyRead != null) {
    return computedDependencyRead(ComputedObservationDependencyMode.ExplicitPropertyKeys, [keyRead]);
  }
  return computedDependencyRead(ComputedObservationDependencyMode.Open);
}

function readTrackableDependencyExpressions(
  expressions: readonly ts.Expression[],
): ComputedDependencyRead {
  const keyReads: ComputedDependencyKeyRead[] = [];
  const dependencyFunctions: ts.FunctionLikeDeclaration[] = [];
  let sawOpen = false;
  for (const expression of expressions) {
    if (isNullishDependencyConfigValue(expression)) {
      sawOpen = true;
      continue;
    }
    const keyRead = propertyKeyRead(expression);
    if (keyRead != null) {
      keyReads.push(keyRead);
      continue;
    }
    if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
      dependencyFunctions.push(expression);
      continue;
    }
    sawOpen = true;
  }
  if (sawOpen) {
    return computedDependencyRead(ComputedObservationDependencyMode.Open, keyReads, 'async', null, dependencyFunctions);
  }
  if (keyReads.length === 0 && dependencyFunctions.length === 0) {
    return computedDependencyRead(ComputedObservationDependencyMode.Disabled);
  }
  return computedDependencyRead(
    dependencyFunctions.length > 0
      ? ComputedObservationDependencyMode.DependencyFunction
      : ComputedObservationDependencyMode.ExplicitPropertyKeys,
    keyReads,
    'async',
    null,
    dependencyFunctions,
  );
}

function readObjectPropertyInitializer(
  expression: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | null {
  for (const property of expression.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === name) {
      return property.initializer;
    }
  }
  return null;
}
