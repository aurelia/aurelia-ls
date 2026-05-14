import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import {
  ContainerDefaultResolverPolicy,
} from './container-configuration.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type {
  ContainerLookupKeyKind,
} from './container-key.js';
import {
  containerKeyExpressionIdentityKind,
  containerLookupKeyKindForExpression,
  readNullishKeyArguments,
  type DiContainerKeyExpressionIdentityKind,
  type DiNullishKeyArgument,
} from './source-key-expression.js';
import {
  readAureliaResolverWrapperCall,
  type DiAureliaResolverWrapperKind,
} from './resolver-wrapper-recognition.js';

export const enum DiContainerApiMethodKind {
  Get = 'get',
  GetResolver = 'getResolver',
  GetAll = 'getAll',
  Has = 'has',
  GetFactory = 'getFactory',
  Invoke = 'invoke',
}

/** Import/type-backed source call to an Aurelia container public method. */
export class DiContainerApiCallSite {
  readonly kind = 'di-container-api-call-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly methodKind: DiContainerApiMethodKind,
    readonly keyExpressionText: string | null,
    readonly keyName: string | null,
    readonly keyWrapperKind: DiAureliaResolverWrapperKind | null,
    readonly wrappedKeyName: string | null,
    readonly keyKind: ContainerLookupKeyKind,
    readonly keyIdentityKind: DiContainerKeyExpressionIdentityKind,
    readonly autoRegister: boolean | null,
    readonly receiverDefaultResolverPolicy: ContainerDefaultResolverPolicy | null,
    readonly receiverFreshCreateContainer: boolean,
    readonly nullishKeyArguments: readonly DiNullishKeyArgument[],
    readonly receiverText: string,
  ) {}
}

/** Read direct calls to Aurelia's `IContainer`/`Container` API from admitted project source. */
export function readDiContainerApiCallSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly DiContainerApiCallSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileContainerApiCallSites(source.path, sourceFile, typeSystem.checker, sourcePathByFileName);
  });
}

function readSourceFileContainerApiCallSites(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly DiContainerApiCallSite[] {
  const sites: DiContainerApiCallSite[] = [];
  const visit = (node: ts.Node): void => {
    recordContainerApiCallSite(sites, sourcePath, sourceFile, checker, sourcePathByFileName, node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function recordContainerApiCallSite(
  sites: DiContainerApiCallSite[],
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
  node: ts.Node,
): void {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(unwrapExpression(node.expression))) {
    return;
  }
  const access = unwrapExpression(node.expression) as ts.PropertyAccessExpression;
  const methodKind = containerApiMethodKind(access.name.text);
  if (methodKind == null || !isAureliaContainerReceiver(checker, access.expression, methodKind, sourcePathByFileName)) {
    return;
  }
  const keyExpression = node.arguments[0] ?? null;
  const keyWrapper = keyExpression == null
    ? null
    : readAureliaResolverWrapperCall(checker, keyExpression);
  sites.push(new DiContainerApiCallSite(
    sourcePath,
    node.getStart(sourceFile),
    node.end,
    methodKind,
    keyExpression?.getText(sourceFile) ?? null,
    keyNameForContainerKeyExpression(keyExpression),
    keyWrapper?.wrapperKind ?? null,
    keyNameForContainerKeyExpression(keyWrapper?.innerExpression ?? null),
    containerLookupKeyKindForExpression(checker, keyExpression),
    containerKeyExpressionIdentityKind(keyExpression),
    containerApiAutoRegister(methodKind, node),
    containerDefaultResolverPolicyForReceiver(checker, access.expression),
    isFreshCreateContainerReceiver(checker, access.expression),
    readNullishKeyArguments(node, sourceFile),
    access.expression.getText(sourceFile),
  ));
}

function isFreshCreateContainerReceiver(
  checker: ts.TypeChecker,
  receiver: ts.Expression,
): boolean {
  const current = unwrapExpression(receiver);
  return ts.isCallExpression(current)
    && isAureliaCreateContainerCallee(checker, unwrapExpression(current.expression));
}

function keyNameForContainerKeyExpression(
  expression: ts.Expression | null,
): string | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function containerApiMethodKind(
  name: string,
): DiContainerApiMethodKind | null {
  switch (name) {
    case 'get':
      return DiContainerApiMethodKind.Get;
    case 'getResolver':
      return DiContainerApiMethodKind.GetResolver;
    case 'getAll':
      return DiContainerApiMethodKind.GetAll;
    case 'has':
      return DiContainerApiMethodKind.Has;
    case 'getFactory':
      return DiContainerApiMethodKind.GetFactory;
    case 'invoke':
      return DiContainerApiMethodKind.Invoke;
    default:
      return null;
  }
}

function containerApiAutoRegister(
  methodKind: DiContainerApiMethodKind,
  call: ts.CallExpression,
): boolean | null {
  switch (methodKind) {
    case DiContainerApiMethodKind.Get:
      return true;
    case DiContainerApiMethodKind.GetResolver:
      return booleanArgument(call.arguments[1] ?? null) ?? true;
    case DiContainerApiMethodKind.GetAll:
    case DiContainerApiMethodKind.Has:
    case DiContainerApiMethodKind.GetFactory:
    case DiContainerApiMethodKind.Invoke:
      return null;
  }
}

function booleanArgument(
  expression: ts.Expression | null,
): boolean | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (current.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function isAureliaContainerReceiver(
  checker: ts.TypeChecker,
  receiver: ts.Expression,
  methodKind: DiContainerApiMethodKind,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const type = checker.getTypeAtLocation(receiver);
  const property = checker.getPropertyOfType(type, methodKind);
  const declarations = property?.declarations ?? [];
  return declarations.some((declaration) =>
    isAureliaContainerDeclaration(declaration, sourcePathByFileName)
  );
}

function isAureliaContainerDeclaration(
  declaration: ts.Declaration,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const sourceFileName = normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName);
  const projectSourcePath = sourcePathByFileName.get(sourceFileName) ?? sourceFileName;
  const normalized = projectSourcePath.replace(/\\/g, '/');
  return normalized.includes('/aurelia/packages/kernel/src/di.ts')
    || normalized.includes('/aurelia/packages/kernel/src/di.container.ts')
    || normalized.includes('/aurelia/packages/kernel/dist/types/di.d.ts')
    || normalized.includes('/aurelia/packages/kernel/dist/types/di.container.d.ts')
    || normalized.includes('/@aurelia/kernel/')
    || normalized.includes('/@aurelia+kernel/');
}

function containerDefaultResolverPolicyForReceiver(
  checker: ts.TypeChecker,
  receiver: ts.Expression,
): ContainerDefaultResolverPolicy | null {
  return containerDefaultResolverPolicyForExpression(checker, unwrapExpression(receiver), new Set());
}

function containerDefaultResolverPolicyForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  seenDeclarations: Set<ts.Declaration>,
): ContainerDefaultResolverPolicy | null {
  const current = unwrapExpression(expression);
  if (ts.isCallExpression(current)) {
    return containerDefaultResolverPolicyForCreateContainerCall(checker, current, seenDeclarations);
  }
  const declaration = declarationForReceiverExpression(checker, current);
  if (declaration == null || seenDeclarations.has(declaration)) {
    return null;
  }
  seenDeclarations.add(declaration);
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
    return containerDefaultResolverPolicyForExpression(checker, declaration.initializer, seenDeclarations);
  }
  if (ts.isPropertyDeclaration(declaration) && declaration.initializer != null) {
    return containerDefaultResolverPolicyForExpression(checker, declaration.initializer, seenDeclarations);
  }
  return null;
}

function containerDefaultResolverPolicyForCreateContainerCall(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
  seenDeclarations: Set<ts.Declaration>,
): ContainerDefaultResolverPolicy | null {
  if (!isAureliaCreateContainerCallee(checker, unwrapExpression(call.expression))) {
    return null;
  }
  return containerDefaultResolverPolicyForConfigExpression(checker, call.arguments[0] ?? null, seenDeclarations)
    ?? ContainerDefaultResolverPolicy.Singleton;
}

function containerDefaultResolverPolicyForConfigExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression | null,
  seenDeclarations: Set<ts.Declaration>,
): ContainerDefaultResolverPolicy | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(current)) {
    return containerDefaultResolverPolicyForObjectLiteral(checker, current, seenDeclarations);
  }
  const declaration = declarationForReceiverExpression(checker, current);
  if (declaration == null || seenDeclarations.has(declaration)) {
    return null;
  }
  seenDeclarations.add(declaration);
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
    return containerDefaultResolverPolicyForConfigExpression(checker, declaration.initializer, seenDeclarations);
  }
  return null;
}

function containerDefaultResolverPolicyForObjectLiteral(
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression,
  seenDeclarations: Set<ts.Declaration>,
): ContainerDefaultResolverPolicy | null {
  let policy: ContainerDefaultResolverPolicy | null = null;
  for (const property of literal.properties) {
    if (ts.isSpreadAssignment(property)) {
      if (policy != null) {
        return null;
      }
      continue;
    }
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== 'defaultResolver') {
      continue;
    }
    policy = containerDefaultResolverPolicyForResolverExpression(checker, property.initializer, seenDeclarations);
  }
  return policy;
}

function containerDefaultResolverPolicyForResolverExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  seenDeclarations: Set<ts.Declaration>,
): ContainerDefaultResolverPolicy | null {
  const current = unwrapExpression(expression);
  if (ts.isPropertyAccessExpression(current)) {
    switch (current.name.text) {
      case 'none':
        return ContainerDefaultResolverPolicy.None;
      case 'singleton':
        return ContainerDefaultResolverPolicy.Singleton;
      case 'transient':
        return ContainerDefaultResolverPolicy.Transient;
      default:
        return ContainerDefaultResolverPolicy.Custom;
    }
  }
  const declaration = declarationForReceiverExpression(checker, current);
  if (declaration == null || seenDeclarations.has(declaration)) {
    return ContainerDefaultResolverPolicy.Custom;
  }
  seenDeclarations.add(declaration);
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
    return containerDefaultResolverPolicyForResolverExpression(checker, declaration.initializer, seenDeclarations);
  }
  return ContainerDefaultResolverPolicy.Custom;
}

function isAureliaCreateContainerCallee(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): boolean {
  const name = ts.isPropertyAccessExpression(expression)
    ? expression.name
    : ts.isIdentifier(expression)
      ? expression
      : null;
  if (name == null || name.text !== 'createContainer') {
    return false;
  }
  const symbol = checker.getSymbolAtLocation(name);
  if (symbol == null) {
    return false;
  }
  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  return (target.declarations ?? []).some(isAureliaCreateContainerDeclaration);
}

function isAureliaCreateContainerDeclaration(
  declaration: ts.Declaration,
): boolean {
  const sourcePath = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  return sourcePath.includes('/aurelia/packages/kernel/src/di.ts') ||
    sourcePath.includes('/aurelia/packages/kernel/src/di.container.ts') ||
    sourcePath.includes('/aurelia/packages/kernel/dist/types/di.d.ts') ||
    sourcePath.includes('/aurelia/packages/kernel/dist/types/di.container.d.ts') ||
    sourcePath.includes('/@aurelia/kernel/') ||
    sourcePath.includes('/@aurelia+kernel/');
}

function declarationForReceiverExpression(
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
  return target.valueDeclaration ?? target.declarations?.[0] ?? null;
}
