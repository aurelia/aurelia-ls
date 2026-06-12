import ts from 'typescript';

import {
  hasAccessorModifier,
  readPropertyName,
} from '../evaluation/ts-syntax.js';

export type SourceDecoratorTargetKind =
  | 'class'
  | 'field'
  | 'method'
  | 'getter'
  | 'setter'
  | 'accessor'
  | 'unknown';

export function sourceDecoratorTargetKind(
  node: ts.Node,
): SourceDecoratorTargetKind | null {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    return 'class';
  }
  if (ts.isPropertyDeclaration(node)) {
    return hasAccessorModifier(node) ? 'accessor' : 'field';
  }
  if (ts.isMethodDeclaration(node)) {
    return 'method';
  }
  if (ts.isGetAccessorDeclaration(node)) {
    return 'getter';
  }
  if (ts.isSetAccessorDeclaration(node)) {
    return 'setter';
  }
  return ts.canHaveDecorators(node) && !ts.isParameter(node)
    ? 'unknown'
    : null;
}

export function decoratedTargetName(node: ts.Node): string | null {
  if (
    ts.isClassDeclaration(node)
    || ts.isClassExpression(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isPropertyDeclaration(node)
  ) {
    return node.name == null ? null : readPropertyName(node.name);
  }
  return null;
}
