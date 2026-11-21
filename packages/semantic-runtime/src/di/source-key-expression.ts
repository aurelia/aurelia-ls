import ts from 'typescript';

import {
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  nullishExpressionKind,
  type NullishExpressionKind,
} from '../evaluation/nullish-expression.js';
import {
  ContainerLookupKeyKind,
  intrinsicTypeNames,
} from './container-key.js';
import {
  isAureliaInterfaceKeyDeclaration,
} from './interface-key-recognition.js';
import {
  readAureliaResolverWrapperCall,
} from './resolver-wrapper-recognition.js';
import {
  firstSymbolDeclaration,
} from '../type-system/checker-node-helpers.js';
import type { TypeSystemProject } from '../type-system/project.js';

export type DiNullishKeyArgumentKind = NullishExpressionKind;

export interface DiNullishKeyArgument {
  readonly index: number;
  readonly kind: DiNullishKeyArgumentKind;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const enum DiContainerKeyExpressionIdentityKind {
  /** The expression is missing or too dynamic to make a runtime identity claim. */
  Unknown = 'unknown',
  /** The expression denotes a stable value or reference that may have been registered elsewhere. */
  Stable = 'stable',
  /** The expression is a primitive literal whose identity is its value. */
  LiteralValue = 'literal-value',
  /** The expression creates a fresh object identity at the call site. */
  EphemeralObject = 'ephemeral-object',
  /** The expression creates a fresh symbol identity at the call site. */
  EphemeralSymbol = 'ephemeral-symbol',
}

export function readNullishKeyArguments(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): readonly DiNullishKeyArgument[] {
  return node.arguments.flatMap((argument, index) => {
    const current = unwrapExpression(argument);
    const kind = nullishExpressionKind(current);
    return kind == null
      ? []
      : [{
        index,
        kind,
        text: argument.getText(sourceFile),
        start: argument.getStart(sourceFile),
        end: argument.end,
      }];
  });
}

export function containerLookupKeyKindForExpression(
  typeSystem: TypeSystemProject,
  expression: ts.Expression | null,
): ContainerLookupKeyKind {
  if (expression == null) {
    return ContainerLookupKeyKind.Unknown;
  }
  const current = unwrapExpression(expression);
  if (nullishExpressionKind(current) != null) {
    return ContainerLookupKeyKind.Nullish;
  }
  if (ts.isStringLiteralLike(current)) {
    return ContainerLookupKeyKind.String;
  }
  if (
    ts.isNumericLiteral(current)
    || current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || ts.isBigIntLiteral(current)
  ) {
    return ContainerLookupKeyKind.Primitive;
  }
  if (ts.isObjectLiteralExpression(current) || ts.isArrayLiteralExpression(current)) {
    return ContainerLookupKeyKind.Object;
  }
  if (ts.isClassExpression(current)) {
    return containerLookupKeyKindForDeclaration(typeSystem, current);
  }
  if (readAureliaResolverWrapperCall(typeSystem, current) != null) {
    return ContainerLookupKeyKind.Resolver;
  }

  // Follow immutable value aliases to the constructor declaration, including globalThis.Date.
  let target: ts.Expression = current;
  const seen = new Set<ts.Declaration>();
  let declaration: ts.Declaration | null;
  for (;;) {
    const symbol = typeSystem.readProgramAliasedSymbolAtLocation(ts.isPropertyAccessExpression(target) ? target.name : target);
    declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
    if (declaration == null || !ts.isVariableDeclaration(declaration) || !declaration.initializer
      || !(declaration.parent.flags & ts.NodeFlags.Const) || seen.has(declaration)) break;
    const initializer = unwrapExpression(declaration.initializer);
    if (!ts.isIdentifier(initializer) && !ts.isPropertyAccessExpression(initializer)) break;
    seen.add(declaration);
    target = initializer;
  }
  if (declaration == null) {
    return ContainerLookupKeyKind.Unknown;
  }
  return containerLookupKeyKindForDeclaration(typeSystem, declaration);
}

/** Classify a canonical runtime value declaration through the same branches as an authored key expression. */
export function containerLookupKeyKindForDeclaration(
  typeSystem: TypeSystemProject,
  declaration: ts.Declaration,
): ContainerLookupKeyKind {
  const name = ts.getNameOfDeclaration(declaration);
  if (name != null && ts.isIdentifier(name) && intrinsicTypeNames.has(name.text)) {
    if (typeSystem.program.isSourceFileDefaultLibrary(declaration.getSourceFile()) && ts.isVariableDeclaration(declaration)) {
      return ContainerLookupKeyKind.IntrinsicConstructable;
    }
    if (ts.isClassLike(declaration) || ts.isFunctionDeclaration(declaration) || ts.isFunctionExpression(declaration)) {
      return ContainerLookupKeyKind.IntrinsicNamedConstructable;
    }
  }
  if (isAureliaInterfaceKeyDeclaration(typeSystem, declaration)) {
    return ContainerLookupKeyKind.Interface;
  }
  if (isRegistryKeyDeclaration(declaration)) {
    return ContainerLookupKeyKind.Registry;
  }
  if (
    ts.isClassDeclaration(declaration)
    || ts.isClassExpression(declaration)
    || ts.isFunctionDeclaration(declaration)
    || ts.isFunctionExpression(declaration)
  ) {
    return ContainerLookupKeyKind.Constructable;
  }
  return ContainerLookupKeyKind.Unknown;
}

function isRegistryKeyDeclaration(
  declaration: ts.Declaration,
): boolean {
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
    return objectLiteralHasRegisterMethod(unwrapExpression(declaration.initializer));
  }
  if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
    return declaration.members.some((member) =>
      ts.isMethodDeclaration(member)
      && readPropertyName(member.name) === 'register'
    );
  }
  return false;
}

function objectLiteralHasRegisterMethod(
  expression: ts.Expression,
): boolean {
  if (!ts.isObjectLiteralExpression(expression)) {
    return false;
  }
  return expression.properties.some((property) =>
    (ts.isMethodDeclaration(property) || ts.isPropertyAssignment(property))
    && readPropertyName(property.name) === 'register'
  );
}

export function containerKeyExpressionIdentityKind(
  expression: ts.Expression | null,
): DiContainerKeyExpressionIdentityKind {
  if (expression == null) {
    return DiContainerKeyExpressionIdentityKind.Unknown;
  }
  const current = unwrapExpression(expression);
  if (nullishExpressionKind(current) != null || ts.isStringLiteralLike(current)) {
    return DiContainerKeyExpressionIdentityKind.LiteralValue;
  }
  if (
    ts.isNumericLiteral(current)
    || current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || ts.isBigIntLiteral(current)
  ) {
    return DiContainerKeyExpressionIdentityKind.LiteralValue;
  }
  if (ts.isObjectLiteralExpression(current) || ts.isArrayLiteralExpression(current)) {
    return DiContainerKeyExpressionIdentityKind.EphemeralObject;
  }
  if (ts.isCallExpression(current) && ts.isIdentifier(unwrapExpression(current.expression))) {
    const callee = unwrapExpression(current.expression) as ts.Identifier;
    if (callee.text === 'Symbol') {
      return DiContainerKeyExpressionIdentityKind.EphemeralSymbol;
    }
  }
  return DiContainerKeyExpressionIdentityKind.Stable;
}
