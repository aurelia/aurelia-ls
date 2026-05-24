import type {
  AccessKeyedExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  ArrowFunction,
  CallMemberExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  expressionSourceName,
  expressionSourceRootName,
  primitiveExpressionDisplay,
} from '../expression/expression-source-name.js';
import { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';

export interface RuntimeConnectableObservedDependencyDraft {
  readonly dependencyKind: RuntimeObservedDependencyKind;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly memberNameSpanStart: number | null;
  readonly scopeLookupAncestor: number | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
}

interface ObservedDependencyCollectionContext {
  readonly callbackLocalNames: ReadonlySet<string>;
  readonly collectTemplateReads: boolean;
  readonly rootExpression: ExpressionAstNode;
  readonly canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null;
}

export type RuntimeTemplateArrayMethodPolicy = (
  expression: CallMemberExpression,
  rootExpression: ExpressionAstNode,
) => boolean;

export function collectRuntimeConnectableObservedDependencyDrafts(
  expression: ExpressionAstNode,
  canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null = null,
): readonly RuntimeConnectableObservedDependencyDraft[] {
  const rows: RuntimeConnectableObservedDependencyDraft[] = [];
  collectObservedDependencies(expression, rows, {
    callbackLocalNames: new Set<string>(),
    collectTemplateReads: true,
    rootExpression: expression,
    canUseRuntimeArrayMethod,
  });
  return rows;
}

function collectObservedDependencies(
  expression: ExpressionAstNode,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  switch (expression.$kind) {
    case 'Identifier':
    case 'PrimitiveLiteral':
    case 'AccessGlobal':
    case 'AccessThis':
    case 'AccessBoundary':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return;
    case 'AccessScope':
      collectAccessScopeObservedDependency(expression, rows, context);
      return;
    case 'AccessMember':
      collectObservedDependencies(expression.object, rows, context);
      collectAccessMemberObservedDependency(expression, rows, context);
      return;
    case 'AccessKeyed':
      collectObservedDependencies(expression.object, rows, context);
      collectObservedDependencies(expression.key, rows, context);
      collectAccessKeyedObservedDependency(expression, rows, context);
      return;
    case 'Paren':
    case 'Unary':
      collectObservedDependencies(expression.expression, rows, context);
      return;
    case 'BindingBehavior':
      collectObservedDependencies(expression.expression, rows, context);
      return;
    case 'ValueConverter':
      collectObservedDependencies(expression.expression, rows, context);
      expression.args.forEach((arg) => collectObservedDependencies(arg, rows, context));
      return;
    case 'Assign':
      collectObservedDependencies(expression.target, rows, context);
      collectObservedDependencies(expression.value, rows, context);
      return;
    case 'Conditional':
      collectObservedDependencies(expression.condition, rows, context);
      collectObservedDependencies(expression.yes, rows, context);
      collectObservedDependencies(expression.no, rows, context);
      return;
    case 'Binary':
      collectObservedDependencies(expression.left, rows, context);
      collectObservedDependencies(expression.right, rows, context);
      return;
    case 'ArrayLiteral':
      expression.elements.forEach((element) => collectObservedDependencies(element, rows, context));
      return;
    case 'ObjectLiteral':
      expression.values.forEach((value) => collectObservedDependencies(value, rows, context));
      return;
    case 'Template':
    case 'Interpolation':
      expression.expressions.forEach((part) => collectObservedDependencies(part, rows, context));
      return;
    case 'TaggedTemplate':
      collectObservedDependencies(expression.func, rows, context);
      expression.expressions.forEach((part) => collectObservedDependencies(part, rows, context));
      return;
    case 'New':
      collectObservedDependencies(expression.func, rows, context);
      expression.args.forEach((arg) => collectObservedDependencies(arg, rows, context));
      return;
    case 'CallScope':
      if (context.collectTemplateReads && !context.callbackLocalNames.has(expression.name.name)) {
        rows.push(observedDependencyDraft(
          RuntimeObservedDependencyKind.TemplateExpressionRead,
          expression.$kind,
          expression.name.name,
          expression.name.name,
          null,
          null,
          expression.name.name,
          expression,
        ));
      }
      expression.args.forEach((arg) => collectObservedDependencies(arg, rows, context));
      return;
    case 'CallMember':
      collectCallMemberObservedDependencies(expression, rows, context);
      return;
    case 'CallFunction':
      collectObservedDependencies(expression.func, rows, context);
      expression.args.forEach((arg) => collectObservedDependencies(arg, rows, context));
      return;
    case 'CallGlobal':
      expression.args.forEach((arg) => collectObservedDependencies(arg, rows, context));
      return;
    case 'ForOfStatement':
      collectObservedDependencies(expression.iterable, rows, context);
      collectBindingPatternObservedDependencies(expression.declaration, rows, context);
      return;
    case 'BindingPatternDefault':
      collectBindingPatternObservedDependencies(expression.target, rows, context);
      collectObservedDependencies(expression.default, rows, context);
      return;
    case 'ArrayBindingPattern':
      expression.elements.forEach((element) => collectBindingPatternObservedDependencies(element, rows, context));
      if (expression.rest != null) {
        collectBindingPatternObservedDependencies(expression.rest, rows, context);
      }
      return;
    case 'ObjectBindingPattern':
      expression.properties.forEach((property) => collectBindingPatternObservedDependencies(property.value, rows, context));
      if (expression.rest != null) {
        collectBindingPatternObservedDependencies(expression.rest, rows, context);
      }
      return;
    case 'DestructuringAssignment':
      collectBindingPatternObservedDependencies(expression.pattern, rows, context);
      collectObservedDependencies(expression.source, rows, context);
      return;
    case 'ArrowFunction':
      return;
  }
  const exhaustive: never = expression;
  return exhaustive;
}

function collectBindingPatternObservedDependencies(
  expression: ExpressionAstNode,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  collectObservedDependencies(expression, rows, context);
}

function collectAccessScopeObservedDependency(
  expression: AccessScopeExpression,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  if (context.callbackLocalNames.has(expression.name.name)) {
    return;
  }
  if (!context.collectTemplateReads) {
    return;
  }
  rows.push(observedDependencyDraft(
    RuntimeObservedDependencyKind.TemplateExpressionRead,
    expression.$kind,
    expression.name.name,
    expression.name.name,
    null,
    null,
    null,
    expression,
  ));
}

function collectAccessMemberObservedDependency(
  expression: AccessMemberExpression,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  if (expression.accessGlobal) {
    return;
  }
  const rootName = rootAccessScopeName(expression);
  if (!context.collectTemplateReads) {
    return;
  }
  rows.push(observedDependencyDraft(
    RuntimeObservedDependencyKind.TemplateExpressionRead,
    expression.$kind,
    expressionSourceName(expression),
    rootName ?? expressionSourceRootName(expression),
    expression.name.name,
    null,
    null,
    expression,
  ));
}

function collectAccessKeyedObservedDependency(
  expression: AccessKeyedExpression,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  if (expression.accessGlobal) {
    return;
  }
  const rootName = rootAccessScopeName(expression);
  if (!context.collectTemplateReads) {
    return;
  }
  rows.push(observedDependencyDraft(
    RuntimeObservedDependencyKind.TemplateExpressionRead,
    expression.$kind,
    expressionSourceName(expression),
    rootName ?? expressionSourceRootName(expression),
    null,
    expressionSourceName(expression.key) ?? primitiveExpressionDisplay(expression.key),
    null,
    expression,
  ));
}

function collectCallMemberObservedDependencies(
  expression: CallMemberExpression,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  collectObservedDependencies(expression.object, rows, context);
  const canUseRuntimeArrayMethod = (
    isAutoObservedArrayMethod(expression.name.name)
    || isArrayCallbackExecutionMethod(expression.name.name)
  ) && (context.canUseRuntimeArrayMethod?.(expression, context.rootExpression) ?? true);
  const shouldObserveCollectionMethod = isAutoObservedArrayMethod(expression.name.name) && canUseRuntimeArrayMethod;
  const shouldObserveCallbackBody = isArrayCallbackExecutionMethod(expression.name.name) && canUseRuntimeArrayMethod;
  if (shouldObserveCollectionMethod) {
    rows.push(observedDependencyDraft(
      RuntimeObservedDependencyKind.TemplateCollectionRead,
      expression.$kind,
      expressionSourceName(expression.object),
      expressionSourceRootName(expression.object),
      observedCollectionOwnerMemberName(expression.object),
      null,
      expression.name.name,
      expression,
      expression.object,
    ));
  }
  expression.args.forEach((arg) => {
    if (arg.$kind === 'ArrowFunction' && shouldObserveCallbackBody) {
      collectArrowFunctionCallbackDependencies(arg, rows, context);
      return;
    }
    collectObservedDependencies(arg, rows, context);
  });
}

function collectArrowFunctionCallbackDependencies(
  expression: ArrowFunction,
  rows: RuntimeConnectableObservedDependencyDraft[],
  context: ObservedDependencyCollectionContext,
): void {
  const callbackLocalNames = new Set([
    ...context.callbackLocalNames,
    ...expression.args.map((arg) => arg.name.name),
  ]);
  collectObservedDependencies(expression.body, rows, {
    callbackLocalNames,
    collectTemplateReads: true,
    rootExpression: context.rootExpression,
    canUseRuntimeArrayMethod: context.canUseRuntimeArrayMethod,
  });
}

function observedDependencyDraft(
  dependencyKind: RuntimeObservedDependencyKind,
  expressionKind: string,
  sourceName: string | null,
  sourceRootName: string | null,
  memberName: string | null,
  keyExpression: string | null,
  methodName: string | null,
  expression: ExpressionAstNode,
  observedExpression: ExpressionAstNode = expression,
): RuntimeConnectableObservedDependencyDraft {
  return {
    dependencyKind,
    expressionKind,
    sourceName,
    sourceRootName,
    memberName,
    keyExpression,
    methodName,
    memberNameSpanStart: observedMemberNameSpanStart(observedExpression),
    scopeLookupAncestor: observedScopeLookupAncestor(observedExpression),
    spanStart: expression.span.start,
    spanEnd: expression.span.end,
  };
}

function observedCollectionOwnerMemberName(
  expression: ExpressionAstNode,
): string | null {
  switch (expression.$kind) {
    case 'AccessMember':
      return expression.accessGlobal ? null : expression.name.name;
    case 'Paren':
      return observedCollectionOwnerMemberName(expression.expression);
    case 'BindingBehavior':
    case 'ValueConverter':
      return observedCollectionOwnerMemberName(expression.expression);
    default:
      return null;
  }
}

function observedMemberNameSpanStart(
  expression: ExpressionAstNode,
): number | null {
  switch (expression.$kind) {
    case 'AccessMember':
    case 'CallMember':
      return expression.name.span.start;
    default:
      return null;
  }
}

function observedScopeLookupAncestor(
  expression: ExpressionAstNode,
): number | null {
  switch (expression.$kind) {
    case 'AccessScope':
    case 'CallScope':
      return expression.ancestor;
    case 'AccessMember':
    case 'AccessKeyed':
      return observedScopeLookupAncestor(expression.object);
    case 'CallMember':
      return observedScopeLookupAncestor(expression.object);
    case 'Paren':
    case 'BindingBehavior':
    case 'ValueConverter':
      return observedScopeLookupAncestor(expression.expression);
    default:
      return null;
  }
}

function rootAccessScopeName(expression: ExpressionAstNode): string | null {
  switch (expression.$kind) {
    case 'AccessScope':
      return expression.name.name;
    case 'AccessMember':
      return rootAccessScopeName(expression.object);
    case 'AccessKeyed':
      return rootAccessScopeName(expression.object);
    case 'Paren':
      return rootAccessScopeName(expression.expression);
    case 'BindingBehavior':
    case 'ValueConverter':
      return rootAccessScopeName(expression.expression);
    default:
      return null;
  }
}

function isAutoObservedArrayMethod(name: string): boolean {
  return AUTO_OBSERVED_ARRAY_METHODS.has(name);
}

function isArrayCallbackExecutionMethod(name: string): boolean {
  return ARRAY_CALLBACK_EXECUTION_METHODS.has(name);
}

// Mirrors Aurelia runtime/src/ast.eval.ts autoObserveArrayMethods for ordinary template bindings and expression
// watchers. Before changing this, compare Atlas `framework.observation:collection-methods` ast-evaluator rows.
const AUTO_OBSERVED_ARRAY_METHODS = new Set([
  'at',
  'every',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'includes',
  'indexOf',
  'join',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'sort',
]);

// Array callbacks execute the returned Aurelia arrow function with the same connectable, but not every auto-observed
// array method accepts a callback and not every callback-executing array method is in autoObserveArrayMethods.
const ARRAY_CALLBACK_EXECUTION_METHODS = new Set([
  'every',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'flatMap',
  'forEach',
  'map',
  'reduce',
  'reduceRight',
  'some',
  'sort',
  'toSorted',
]);
