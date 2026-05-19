import ts from 'typescript';

import { ComputedObservationDependencyMode } from './computed-observation.js';

export interface ComputedDependencyRead {
  readonly dependencyMode: ComputedObservationDependencyMode;
  readonly dependencyKeys: readonly string[];
  readonly dependencyKeyReads: readonly ComputedDependencyKeyRead[];
  readonly dependencyFunctionCount: number;
  readonly dependencyFunctions: readonly ts.FunctionLikeDeclaration[];
  readonly flush: 'sync' | 'async';
  readonly deep: boolean | null;
}

export interface ComputedDependencyKeyRead {
  readonly key: string;
  readonly start: number | null;
  readonly end: number | null;
}

export function computedDependencyRead(
  dependencyMode: ComputedObservationDependencyMode,
  dependencyKeysOrReads: readonly (string | ComputedDependencyKeyRead)[] = [],
  flush: 'sync' | 'async' = 'async',
  deep: boolean | null = null,
  dependencyFunctions: readonly ts.FunctionLikeDeclaration[] = [],
): ComputedDependencyRead {
  const dependencyKeyReads = dependencyKeysOrReads.map((keyOrRead) =>
    typeof keyOrRead === 'string'
      ? { key: keyOrRead, start: null, end: null }
      : keyOrRead
  );
  return {
    dependencyMode,
    dependencyKeys: dependencyKeyReads.map((read) => read.key),
    dependencyKeyReads,
    dependencyFunctionCount: dependencyFunctions.length,
    dependencyFunctions,
    flush,
    deep,
  };
}

export function isNullishDependencyConfigValue(
  expression: ts.Expression,
): boolean {
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.VoidExpression) {
    return true;
  }
  return ts.isIdentifier(expression) && expression.text === 'undefined';
}

export function propertyKeyRead(expression: ts.Expression): ComputedDependencyKeyRead | null {
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return {
      key: expression.text,
      start: expression.getStart(),
      end: expression.end,
    };
  }
  return null;
}
