import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import {
  checkerPropertySymbol,
  symbolForExpression,
} from '../type-system/checker-node-helpers.js';
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
    readonly sourceFileAddressHandle: AddressHandle,
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
    readonly receiverFreshCreateContainer: boolean,
    readonly nullishKeyArguments: readonly DiNullishKeyArgument[],
    readonly receiverText: string,
    /** Program-owned call node used by checker-backed source recognition. */
    readonly sourceNode: ts.CallExpression,
    /** Program-owned receiver expression proven to be an Aurelia container. */
    readonly receiverExpression: ts.Expression,
    /** Program-owned key expression, when directly authored. */
    readonly keyExpression: ts.Expression | null,
  ) {}
}

/** Read direct calls to Aurelia's `IContainer`/`Container` API from admitted project source. */
export function readDiContainerApiCallSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly DiContainerApiCallSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileContainerApiCallSites(
        source.path,
        source.addressHandle,
        sourceFile,
        typeSystem,
        sourcePathByFileName,
      );
  });
}

function readSourceFileContainerApiCallSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly DiContainerApiCallSite[] {
  const sites: DiContainerApiCallSite[] = [];
  const visit = (node: ts.Node): void => {
    recordContainerApiCallSite(sites, sourcePath, sourceFileAddressHandle, sourceFile, typeSystem, sourcePathByFileName, node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function recordContainerApiCallSite(
  sites: DiContainerApiCallSite[],
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
  node: ts.Node,
): void {
  const checker = typeSystem.checker;
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(unwrapExpression(node.expression))) {
    return;
  }
  const access = unwrapExpression(node.expression) as ts.PropertyAccessExpression;
  const methodKind = containerApiMethodKind(access.name.text);
  if (methodKind == null || !isAureliaContainerReceiver(typeSystem, access.expression, methodKind, sourcePathByFileName)) {
    return;
  }
  const keyExpression = node.arguments[0] ?? null;
  const keyWrapper = keyExpression == null
    ? null
    : readAureliaResolverWrapperCall(typeSystem, keyExpression);
  sites.push(new DiContainerApiCallSite(
    sourcePath,
    sourceFileAddressHandle,
    node.getStart(sourceFile),
    node.end,
    methodKind,
    keyExpression?.getText(sourceFile) ?? null,
    keyNameForContainerKeyExpression(keyExpression),
    keyWrapper?.wrapperKind ?? null,
    keyNameForContainerKeyExpression(keyWrapper?.innerExpression ?? null),
    containerLookupKeyKindForExpression(typeSystem, keyExpression),
    containerKeyExpressionIdentityKind(keyExpression),
    containerApiAutoRegister(methodKind, node),
    isFreshCreateContainerReceiver(checker, access.expression),
    readNullishKeyArguments(node, sourceFile),
    access.expression.getText(sourceFile),
    node,
    access.expression,
    keyExpression,
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

export function isAureliaContainerReceiver(
  typeSystem: TypeSystemProject,
  receiver: ts.Expression,
  methodKind: DiContainerApiMethodKind,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const checker = typeSystem.checker;
  const type = typeSystem.readProgramTypeAtLocation(receiver);
  if (type == null) {
    return false;
  }
  const property = checkerPropertySymbol(checker, type, methodKind);
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
  return (symbolForExpression(checker, name)?.declarations ?? []).some(isAureliaCreateContainerDeclaration);
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
