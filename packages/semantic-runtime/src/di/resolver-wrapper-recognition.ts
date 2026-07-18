import ts from 'typescript';

import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { symbolForExpression } from '../type-system/checker-node-helpers.js';

export const AURELIA_RESOLVER_WRAPPER_KINDS = [
  'all',
  'last',
  'lazy',
  'optional',
  'factory',
  'own',
  'resource',
  'optionalResource',
  'allResources',
  'newInstanceForScope',
  'newInstanceOf',
] as const;

export type DiAureliaResolverWrapperKind =
  typeof AURELIA_RESOLVER_WRAPPER_KINDS[number];

const AURELIA_RESOLVER_WRAPPER_KIND_SET = new Set<string>(AURELIA_RESOLVER_WRAPPER_KINDS);

export interface DiAureliaResolverWrapperCall {
  readonly call: ts.CallExpression;
  readonly wrapperKind: DiAureliaResolverWrapperKind;
  readonly innerExpression: ts.Expression | null;
  readonly argumentExpressions: readonly ts.Expression[];
  readonly hasSpreadArgument: boolean;
}

export function readAureliaResolverWrapperCall(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): DiAureliaResolverWrapperCall | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const wrapperKind = aureliaResolverWrapperKindForCallee(checker, unwrapExpression(current.expression));
  if (wrapperKind == null) {
    return null;
  }
  return {
    call: current,
    wrapperKind,
    innerExpression: current.arguments[0] ?? null,
    argumentExpressions: current.arguments.filter((argument): argument is ts.Expression => !ts.isSpreadElement(argument)),
    hasSpreadArgument: current.arguments.some(ts.isSpreadElement),
  };
}

function aureliaResolverWrapperKindForCallee(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): DiAureliaResolverWrapperKind | null {
  const name = ts.isPropertyAccessExpression(expression)
    ? expression.name
    : ts.isIdentifier(expression)
      ? expression
      : null;
  if (name == null || !isAureliaResolverWrapperKind(name.text)) {
    const exportedName = symbolForExpression(checker, name ?? expression)?.getName() ?? null;
    if (exportedName == null || !isAureliaResolverWrapperKind(exportedName)) {
      return null;
    }
    return (symbolForExpression(checker, name ?? expression)?.declarations ?? [])
      .some(isAureliaResolverWrapperDeclaration)
      ? exportedName
      : null;
  }
  return (symbolForExpression(checker, name)?.declarations ?? []).some(isAureliaResolverWrapperDeclaration)
    ? name.text
    : null;
}

/** Whether an expression is Aurelia's built-in resolver that intentionally injects `undefined`. */
export function isAureliaIgnoreResolverExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  const symbol = symbolForExpression(checker, current);
  return symbol?.getName() === 'ignore'
    && (symbol.declarations ?? []).some(isAureliaResolverWrapperDeclaration);
}

function isAureliaResolverWrapperKind(
  value: string,
): value is DiAureliaResolverWrapperKind {
  return AURELIA_RESOLVER_WRAPPER_KIND_SET.has(value);
}

function isAureliaResolverWrapperDeclaration(
  declaration: ts.Declaration,
): boolean {
  const sourcePath = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  return sourcePath.includes('/aurelia/packages/kernel/src/di.resolvers.ts')
    || sourcePath.includes('/aurelia/packages/kernel/dist/types/di.resolvers.d.ts')
    || sourcePath.includes('/@aurelia/kernel/')
    || sourcePath.includes('/@aurelia+kernel/');
}
