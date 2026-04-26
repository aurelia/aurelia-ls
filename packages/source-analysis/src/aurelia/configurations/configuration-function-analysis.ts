import ts from 'typescript';

import { readReferenceSeed, type BoundedReferenceSeedKind } from '../analysis/index.js';
import type { SourceFileRef } from '../source-address.js';
import { sourceNodeRefFromTsNode, type SourceNodeRef } from '../refs.js';

export type FunctionImplementation =
  | ts.Block
  | ts.Expression;

export const FUNCTION_IMPLEMENTATION_RESOLUTION_KINDS = [
  'inline-function',
  'same-file-function',
  'same-file-binding',
  'same-file-method',
] as const;

export type FunctionImplementationResolutionKind =
  typeof FUNCTION_IMPLEMENTATION_RESOLUTION_KINDS[number];

export interface FunctionImplementationResolution {
  readonly kind: FunctionImplementationResolutionKind;
  readonly referenceName: string | null;
  readonly source: SourceNodeRef;
  readonly implementation: FunctionImplementation;
}

export class BundleSpread {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    // TODO: this is a closed syntactic reference name, not a semantic bundle
    // identity. Real bundle expansion needs a later export/value lookup seam.
    readonly referenceName: string,
    readonly note: string | null = null,
  ) {}
}

export class HelperCall {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    // TODO: this is a syntax witness for a direct call expression seen in the
    // current method body. It is not yet a semantic call-role classification.
    readonly calleeName: string,
    readonly note: string | null = null,
  ) {}
}

export class RegisterArgument {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    readonly seedKind: BoundedReferenceSeedKind,
    // TODO: this remains a syntax witness for a direct register(...) argument.
    // A later reference-ingress seam should replace the raw name with a closed
    // symbol/import provenance result where possible.
    readonly referenceName: string,
    readonly note: string | null = null,
  ) {}
}

export interface FunctionImplementationAnalysis {
  readonly bundleSpreads: readonly BundleSpread[];
  readonly directRegisterArguments: readonly RegisterArgument[];
  readonly helperCalls: readonly HelperCall[];
}

export function analyzeFunctionImplementation(
  file: SourceFileRef,
  implementation: FunctionImplementation,
): FunctionImplementationAnalysis {
  const bundleSpreads = new Map<string, BundleSpread>();
  const directRegisterArguments = new Map<string, RegisterArgument>();
  const helperCalls = new Map<string, HelperCall>();

  const visit = (node: ts.Node): void => {
    if (node !== implementation && isFunctionBoundary(node)) {
      return;
    }

    if (ts.isCallExpression(node)) {
      const callName = readCallName(node.expression);
      if (callName != null) {
        const key = `${node.getStart()}:${callName}`;
        helperCalls.set(
          key,
          new HelperCall(
            `${file.id}:helper-call:${callName}:${node.getStart()}`,
            createNodeRef(file, node),
            callName,
          ),
        );

        if (isRegisterInvocation(callName)) {
          for (const argument of node.arguments) {
            if (ts.isSpreadElement(argument) || ts.isCallExpression(argument)) {
              continue;
            }

            const referenceName = summarizeExpression(argument);
            if (!isRegistrableReferenceExpression(argument) || referenceName.length === 0) {
              continue;
            }

            const argKey = `${argument.getStart()}:${referenceName}`;
            const seed = readReferenceSeed(argument);
            directRegisterArguments.set(
              argKey,
              new RegisterArgument(
                `${file.id}:register-argument:${referenceName}:${argument.getStart()}`,
                createNodeRef(file, argument),
                seed.kind,
                referenceName,
              ),
            );
          }
        }
      }
    } else if (ts.isSpreadElement(node) && isCallArgumentSpread(node)) {
      const name = summarizeExpression(node.expression);
      if (name.length > 0) {
        const key = `${node.getStart()}:${name}`;
        bundleSpreads.set(
          key,
          new BundleSpread(
            `${file.id}:bundle-spread:${name}:${node.getStart()}`,
            createNodeRef(file, node),
            name,
          ),
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(implementation);

  return {
    bundleSpreads: [...bundleSpreads.values()],
    directRegisterArguments: [...directRegisterArguments.values()],
    helperCalls: [...helperCalls.values()],
  };
}

export function createNodeRef(
  file: SourceFileRef,
  node: ts.Node,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node);
}

export function findNodeBySpan<T extends ts.Node>(
  root: ts.Node,
  start: number,
  end: number,
  guard: (node: ts.Node) => node is T,
): T | null {
  let match: T | null = null;

  const visit = (node: ts.Node): void => {
    if (match != null) {
      return;
    }

    if (guard(node) && node.getStart() === start && node.end === end) {
      match = node;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(root);
  return match;
}

export function findReturnedRegistryObject(
  implementation: FunctionImplementation,
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | null {
  if (!ts.isBlock(implementation)) {
    return unwrapRegistryObjectExpression(implementation, sourceFile);
  }

  let match: ts.ObjectLiteralExpression | null = null;

  const visit = (node: ts.Node): void => {
    if (match != null) {
      return;
    }

    if (node !== implementation && isFunctionBoundary(node)) {
      return;
    }

    if (ts.isReturnStatement(node) && node.expression != null) {
      match = unwrapRegistryObjectExpression(node.expression, sourceFile);
      if (match != null) {
        return;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(implementation);
  return match;
}

export function findReturnedRegistryObjectForFunction(
  sourceFile: ts.SourceFile,
  name: string,
): ts.ObjectLiteralExpression | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement) || statement.name?.text !== name || statement.body == null) {
      continue;
    }

    return findReturnedRegistryObject(statement.body, sourceFile);
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || declaration.initializer == null) {
        continue;
      }

      if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
        return findReturnedRegistryObject(declaration.initializer.body, sourceFile);
      }
    }
  }

  return null;
}

export function hasReturnedAppTask(
  implementation: FunctionImplementation,
): boolean {
  if (!ts.isBlock(implementation)) {
    return isAppTaskExpression(implementation);
  }

  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }

    if (node !== implementation && isFunctionBoundary(node)) {
      return;
    }

    if (
      ts.isReturnStatement(node)
      && node.expression != null
      && isAppTaskExpression(node.expression)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(implementation);
  return found;
}

export function readCallName(
  expression: ts.LeftHandSideExpression,
): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return `${readCallName(expression.expression) ?? expression.expression.getText()}.${expression.name.text}`;
  }

  return null;
}

export function readFunctionImplementation(
  property:
    | ts.MethodDeclaration
    | ts.PropertyAssignment
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration
    | ts.ShorthandPropertyAssignment
    | ts.SpreadAssignment,
): FunctionImplementation | null {
  if (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) {
    return property.body ?? null;
  }

  if (ts.isPropertyAssignment(property)) {
    if (ts.isArrowFunction(property.initializer)) {
      return property.initializer.body;
    }

    if (ts.isFunctionExpression(property.initializer)) {
      return property.initializer.body ?? null;
    }
  }

  return null;
}

export function resolveFunctionImplementation(
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): FunctionImplementationResolution | null {
  const current = unwrapExpression(expression);

  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return {
      kind: 'inline-function',
      referenceName: null,
      source: createNodeRef(file, current),
      implementation: current.body,
    };
  }

  if (ts.isIdentifier(current)) {
    const declaration = findTopLevelBinding(sourceFile, current.text);
    if (declaration == null) {
      return null;
    }

    if (ts.isFunctionDeclaration(declaration) && declaration.body != null) {
      return {
        kind: 'same-file-function',
        referenceName: current.text,
        source: createNodeRef(file, declaration),
        implementation: declaration.body,
      };
    }

    if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
      const initializer = unwrapExpression(declaration.initializer);
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        return {
          kind: 'same-file-binding',
          referenceName: current.text,
          source: createNodeRef(file, declaration),
          implementation: initializer.body,
        };
      }
    }

    return null;
  }

  if (ts.isPropertyAccessExpression(current) && ts.isIdentifier(current.expression)) {
    const base = current.expression.text;
    const member = current.name.text;
    const declaration = findTopLevelBinding(sourceFile, base);
    if (declaration == null) {
      return null;
    }

    if (ts.isClassDeclaration(declaration)) {
      for (const memberDeclaration of declaration.members) {
        if (!hasStaticModifier(memberDeclaration) || readDeclarationName(memberDeclaration) !== member) {
          continue;
        }
        const implementation = readDeclarationImplementation(memberDeclaration);
        if (implementation == null) {
          continue;
        }
        return {
          kind: 'same-file-method',
          referenceName: `${base}.${member}`,
          source: createNodeRef(file, memberDeclaration),
          implementation,
        };
      }
    }

    if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
      const initializer = unwrapExpression(declaration.initializer);
      if (ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
          if (readDeclarationName(property) !== member) {
            continue;
          }
          const implementation = readDeclarationImplementation(property);
          if (implementation == null) {
            continue;
          }
          return {
            kind: 'same-file-method',
            referenceName: `${base}.${member}`,
            source: createNodeRef(file, property),
            implementation,
          };
        }
      }
    }
  }

  return null;
}

export function summarizeExpression(
  expression: ts.Expression,
): string {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) {
    return current.text;
  }

  if (ts.isPropertyAccessExpression(current)) {
    return current.getText();
  }

  if (ts.isClassExpression(current) && current.name != null) {
    return current.name.text;
  }

  if (ts.isStringLiteral(current) || ts.isNumericLiteral(current)) {
    return current.text;
  }

  return current.kind === ts.SyntaxKind.NullKeyword
    ? 'null'
    : ts.SyntaxKind[current.kind];
}

export function isRegistrableReferenceExpression(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isIdentifier(current)
    || ts.isPropertyAccessExpression(current)
    || (ts.isClassExpression(current) && current.name != null);
}

function unwrapRegistryObjectExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | null {
  const current = unwrapExpression(expression);

  if (ts.isObjectLiteralExpression(current)) {
    return current;
  }

  if (ts.isCallExpression(current)) {
    const wrapped = unwrapWrappedObjectLiteral(current);
    if (wrapped != null) {
      return wrapped;
    }

    if (ts.isIdentifier(current.expression)) {
      return findReturnedRegistryObjectForFunction(sourceFile, current.expression.text);
    }
  }

  return null;
}

function unwrapWrappedObjectLiteral(
  expression: ts.CallExpression,
): ts.ObjectLiteralExpression | null {
  const firstArg = expression.arguments[0];
  return firstArg != null && ts.isObjectLiteralExpression(firstArg)
    ? firstArg
    : null;
}

function isAppTaskExpression(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isCallExpression(current)
    && ts.isPropertyAccessExpression(current.expression)
    && ts.isIdentifier(current.expression.expression)
    && current.expression.expression.text === 'AppTask';
}

function isFunctionBoundary(
  node: ts.Node,
): boolean {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function isCallArgumentSpread(
  node: ts.SpreadElement,
): boolean {
  return ts.isCallExpression(node.parent)
    || ts.isNewExpression(node.parent);
}

function isRegisterInvocation(
  callName: string,
): boolean {
  return callName === 'register' || callName.endsWith('.register');
}

function unwrapExpression(
  expression: ts.Expression,
): ts.Expression {
  let current = expression;

  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function findTopLevelBinding(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Declaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
          return declaration;
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement))
      && statement.name?.text === name
    ) {
      return statement;
    }
  }

  return null;
}

function hasStaticModifier(
  node: ts.Node,
): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some((current) => current.kind === ts.SyntaxKind.StaticKeyword) ?? false)
    : false;
}

function readDeclarationName(
  node:
    | ts.Node
    | ts.ClassElement
    | ts.ObjectLiteralElementLike,
): string | null {
  const name = 'name' in node ? node.name : undefined;
  if (name == null) {
    return null;
  }

  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : null;
}

function readDeclarationImplementation(
  node: ts.Node,
): FunctionImplementation | null {
  if (
    ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
  ) {
    return node.body ?? null;
  }

  if (ts.isPropertyDeclaration(node) && node.initializer != null) {
    const initializer = unwrapExpression(node.initializer);
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
      return initializer.body;
    }
  }

  if (ts.isPropertyAssignment(node)) {
    const initializer = unwrapExpression(node.initializer);
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
      return initializer.body;
    }
  }

  return null;
}
