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
} from './container-key.js';
import {
  isAureliaCreateInterfaceCallee,
} from './interface-key-recognition.js';
import {
  readAureliaResolverWrapperCall,
} from './resolver-wrapper-recognition.js';

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
  checker: ts.TypeChecker,
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
    return ContainerLookupKeyKind.Constructable;
  }
  if (readAureliaResolverWrapperCall(checker, current) != null) {
    return ContainerLookupKeyKind.Resolver;
  }
  if (ts.isIdentifier(current) && intrinsicTypeNames.has(current.text)) {
    return ContainerLookupKeyKind.IntrinsicConstructable;
  }

  const declaration = declarationForExpression(checker, current);
  if (declaration == null) {
    return ContainerLookupKeyKind.Unknown;
  }
  if (isAureliaInterfaceKeyDeclaration(checker, declaration)) {
    return ContainerLookupKeyKind.Interface;
  }
  if (isRegistryKeyDeclaration(declaration)) {
    return ContainerLookupKeyKind.Registry;
  }
  if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
    return ContainerLookupKeyKind.Constructable;
  }
  if (ts.isFunctionDeclaration(declaration) || ts.isFunctionExpression(declaration)) {
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

function declarationForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Declaration | null {
  const symbol = checker.getSymbolAtLocation(expression);
  if (symbol == null) {
    return null;
  }
  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  return target.declarations?.[0] ?? null;
}

function isAureliaInterfaceKeyDeclaration(
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
): boolean {
  if (!ts.isVariableDeclaration(declaration)) {
    return false;
  }
  const initializer = declaration.initializer == null
    ? null
    : unwrapExpression(declaration.initializer);
  return initializer != null &&
    ts.isCallExpression(initializer) &&
    isAureliaCreateInterfaceCallee(checker, unwrapExpression(initializer.expression));
}

const intrinsicTypeNames = new Set<string>([
  'Array',
  'ArrayBuffer',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Map',
  'Number',
  'Object',
  'Promise',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'SyntaxError',
  'TypeError',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'URIError',
  'WeakMap',
  'WeakSet',
]);
