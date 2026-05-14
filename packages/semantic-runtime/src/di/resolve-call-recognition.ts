import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import {
  classElementName,
  isClassMemberWithExpressionChildren,
  type ClassMemberWithExpressionChildren,
} from '../type-system/ts-class-member.js';
import {
  readNullishKeyArguments,
  type DiNullishKeyArgument,
  type DiNullishKeyArgumentKind,
} from './source-key-expression.js';

const AURELIA_RESOLVE_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const AURELIA_RESOLVE_KEY_WRAPPER_EXPORTS = new Set([
  'all',
  'lazy',
  'optional',
  'factory',
  'own',
  'resource',
  'optionalResource',
  'allResources',
  'newInstanceForScope',
  'newInstanceOf',
]);

/** Import-aware source site for Aurelia's ambient `resolve(...)` DI API. */
export class DiResolveCallSite {
  readonly kind = 'di-resolve-call-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly keyExpressionText: string | null,
    readonly argumentCount: number,
    readonly nullishKeyArguments: readonly DiResolveNullishKeyArgument[],
    readonly enclosingClassName: string | null,
    readonly enclosingMemberName: string | null,
    readonly enclosingMemberKind: DiResolveEnclosingMemberKind,
    readonly enclosingMemberStatic: boolean,
    readonly executionContextKind: DiResolveExecutionContextKind,
    readonly activeContainerExpectation: DiResolveActiveContainerExpectation,
    readonly keyName: string | null,
    readonly keyDeclarationKind: DiResolveKeyDeclarationKind,
    readonly keyDeclarationName: string | null,
    readonly keyDeclarationSourcePath: string | null,
    readonly keyImportModuleSpecifier: string | null,
    readonly keyImportName: string | null,
    readonly keyImportKind: DiResolveKeyImportKind,
  ) {}
}

export type DiResolveKeyDeclarationKind =
  | 'class'
  | 'interface'
  | 'variable'
  | 'function'
  | 'type'
  | 'unknown'
  | 'unresolved';

export type DiResolveKeyImportKind =
  | 'named'
  | 'default'
  | 'namespace-member'
  | 'none';

export type DiResolveNullishKeyArgumentKind = DiNullishKeyArgumentKind;

export type DiResolveNullishKeyArgument = DiNullishKeyArgument;

export type DiResolveEnclosingMemberKind =
  | 'constructor'
  | 'property'
  | 'method'
  | 'getter'
  | 'setter'
  | 'static-block'
  | 'unknown'
  | 'none';

export type DiResolveExecutionContextKind =
  /** The call is evaluated while the module or class definition is evaluated. */
  | 'module-evaluation'
  /** The call is evaluated while static class fields or static blocks run. */
  | 'class-static-evaluation'
  /** The call is evaluated while an instance field or constructor body runs. */
  | 'class-instance-activation'
  /** The call is inside a method/getter/setter body and depends on caller timing. */
  | 'class-member-call'
  /** The call is inside a function/arrow body and depends on caller timing. */
  | 'function-call';

export type DiResolveActiveContainerExpectation =
  /** The framework ambient container is absent for this source execution context. */
  | 'definitely-absent'
  /** The framework sets the ambient container when DI constructs this instance. */
  | 'provided-by-container-activation'
  /** Whether an ambient container exists depends on who invokes the function/member. */
  | 'caller-dependent';

interface DiResolveLexicalContext {
  readonly enclosingClassName: string | null;
  readonly enclosingMemberName: string | null;
  readonly enclosingMemberKind: DiResolveEnclosingMemberKind;
  readonly enclosingMemberStatic: boolean;
  readonly executionContextKind: DiResolveExecutionContextKind;
  readonly activeContainerExpectation: DiResolveActiveContainerExpectation;
}

interface DiResolveKeyTarget {
  readonly keyName: string | null;
  readonly declarationKind: DiResolveKeyDeclarationKind;
  readonly declarationName: string | null;
  readonly declarationSourcePath: string | null;
  readonly importModuleSpecifier: string | null;
  readonly importName: string | null;
  readonly importKind: DiResolveKeyImportKind;
}

interface ImportedSymbolReference {
  readonly moduleSpecifier: string;
  readonly importedName: string | null;
  readonly importKind: DiResolveKeyImportKind;
}

/** Read DI resolve calls from admitted project source using the shared TypeChecker source epoch. */
export function readDiResolveCallSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly DiResolveCallSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileDiResolveCallSites(source.path, sourceFile, typeSystem, sourcePathByFileName);
  });
}

function readSourceFileDiResolveCallSites(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly DiResolveCallSite[] {
  const context: DiResolveReadContext = {
    sourcePath,
    sourceFile,
    checker: typeSystem.checker,
    sourcePathByFileName,
    bindings: readAureliaResolveBindings(sourceFile),
    imports: readSourceFileImportBindings(sourceFile),
    sites: [],
  };
  visitDiResolveChildren(context, sourceFile, moduleEvaluationResolveContext());
  return context.sites;
}

interface DiResolveReadContext {
  readonly sourcePath: string;
  readonly sourceFile: ts.SourceFile;
  readonly checker: ts.TypeChecker;
  readonly sourcePathByFileName: ReadonlyMap<string, string>;
  readonly bindings: AureliaResolveBindings;
  readonly imports: SourceFileImportBindings;
  readonly sites: DiResolveCallSite[];
}

function visitSourceFileDiResolveCallNode(
  context: DiResolveReadContext,
  node: ts.Node,
  lexical: DiResolveLexicalContext,
): void {
  if (ts.isClassDeclaration(node) && node.name != null) {
    visitDiResolveChildren(context, node, {
      ...lexical,
      enclosingClassName: node.name.text,
      enclosingMemberName: null,
      enclosingMemberKind: 'none',
      enclosingMemberStatic: false,
    });
    return;
  }
  if (isClassMemberWithExpressionChildren(node)) {
    visitDiResolveChildren(context, node, classMemberResolveContext(context.sourceFile, lexical, node));
    return;
  }
  if (isFunctionResolveBoundary(node)) {
    visitDiResolveChildren(context, node, functionCallResolveContext(lexical));
    return;
  }
  recordDiResolveCallSite(context, node, lexical);
  visitDiResolveChildren(context, node, lexical);
}

function visitDiResolveChildren(
  context: DiResolveReadContext,
  node: ts.Node,
  lexical: DiResolveLexicalContext,
): void {
  ts.forEachChild(node, (child) =>
    visitSourceFileDiResolveCallNode(context, child, lexical)
  );
}

function recordDiResolveCallSite(
  context: DiResolveReadContext,
  node: ts.Node,
  lexical: DiResolveLexicalContext,
): void {
  if (!ts.isCallExpression(node) || !isAureliaResolveExpression(node.expression, context.bindings)) {
    return;
  }
  const keyExpression = resolveKeyExpressionForArgument(node.arguments[0] ?? null, context.bindings);
  const target = resolveKeyTarget(
    context.checker,
    keyExpression,
    context.sourcePathByFileName,
    context.imports,
  );
  context.sites.push(new DiResolveCallSite(
    context.sourcePath,
    node.getStart(context.sourceFile),
    node.end,
    node.arguments[0]?.getText(context.sourceFile) ?? null,
    node.arguments.length,
    readNullishKeyArguments(node, context.sourceFile),
    lexical.enclosingClassName,
    lexical.enclosingMemberName,
    lexical.enclosingMemberKind,
    lexical.enclosingMemberStatic,
    lexical.executionContextKind,
    lexical.activeContainerExpectation,
    target.keyName,
    target.declarationKind,
    target.declarationName,
    target.declarationSourcePath,
    target.importModuleSpecifier,
    target.importName,
    target.importKind,
  ));
}

function moduleEvaluationResolveContext(): DiResolveLexicalContext {
  return {
    enclosingClassName: null,
    enclosingMemberName: null,
    enclosingMemberKind: 'none',
    enclosingMemberStatic: false,
    executionContextKind: 'module-evaluation',
    activeContainerExpectation: 'definitely-absent',
  };
}

function classMemberResolveContext(
  sourceFile: ts.SourceFile,
  lexical: DiResolveLexicalContext,
  member: ClassMemberWithExpressionChildren,
): DiResolveLexicalContext {
  const memberKind = classMemberKind(member);
  const enclosingMemberStatic = isStaticClassMember(member);
  return {
    enclosingClassName: lexical.enclosingClassName,
    enclosingMemberName: classElementName(member, sourceFile),
    enclosingMemberKind: memberKind,
    enclosingMemberStatic,
    executionContextKind: classMemberExecutionContextKind(memberKind, enclosingMemberStatic),
    activeContainerExpectation: classMemberActiveContainerExpectation(memberKind, enclosingMemberStatic),
  };
}

function functionCallResolveContext(
  lexical: DiResolveLexicalContext,
): DiResolveLexicalContext {
  return {
    ...lexical,
    executionContextKind: 'function-call',
    activeContainerExpectation: 'caller-dependent',
  };
}

function classMemberKind(
  member: ClassMemberWithExpressionChildren,
): DiResolveEnclosingMemberKind {
  if (ts.isConstructorDeclaration(member)) {
    return 'constructor';
  }
  if (ts.isPropertyDeclaration(member)) {
    return 'property';
  }
  if (ts.isMethodDeclaration(member)) {
    return 'method';
  }
  if (ts.isGetAccessorDeclaration(member)) {
    return 'getter';
  }
  if (ts.isSetAccessorDeclaration(member)) {
    return 'setter';
  }
  if (ts.isClassStaticBlockDeclaration(member)) {
    return 'static-block';
  }
  return 'unknown';
}

function isStaticClassMember(member: ClassMemberWithExpressionChildren): boolean {
  return ts.isClassStaticBlockDeclaration(member)
    || (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0;
}

function classMemberExecutionContextKind(
  memberKind: DiResolveEnclosingMemberKind,
  isStatic: boolean,
): DiResolveExecutionContextKind {
  if (memberKind === 'static-block' || (memberKind === 'property' && isStatic)) {
    return 'class-static-evaluation';
  }
  if (memberKind === 'constructor' || memberKind === 'property') {
    return 'class-instance-activation';
  }
  return 'class-member-call';
}

function classMemberActiveContainerExpectation(
  memberKind: DiResolveEnclosingMemberKind,
  isStatic: boolean,
): DiResolveActiveContainerExpectation {
  if (memberKind === 'static-block' || (memberKind === 'property' && isStatic)) {
    return 'definitely-absent';
  }
  if (memberKind === 'constructor' || memberKind === 'property') {
    return 'provided-by-container-activation';
  }
  return 'caller-dependent';
}

function isFunctionResolveBoundary(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node);
}

class AureliaResolveBindings {
  readonly identifiers = new Set<string>();
  readonly keyWrapperIdentifiers = new Set<string>();
  readonly namespaces = new Set<string>();
}

class SourceFileImportBindings {
  readonly locals = new Map<string, ImportedSymbolReference>();
  readonly namespaces = new Map<string, string>();
}

function readAureliaResolveBindings(sourceFile: ts.SourceFile): AureliaResolveBindings {
  const bindings = new AureliaResolveBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    if (!AURELIA_RESOLVE_MODULES.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings ?? null;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      bindings.namespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      const exportedName = element.propertyName?.text ?? element.name.text;
      if (exportedName === 'resolve') {
        bindings.identifiers.add(element.name.text);
      } else if (AURELIA_RESOLVE_KEY_WRAPPER_EXPORTS.has(exportedName)) {
        bindings.keyWrapperIdentifiers.add(element.name.text);
      }
    }
  }
  return bindings;
}

function readSourceFileImportBindings(sourceFile: ts.SourceFile): SourceFileImportBindings {
  const bindings = new SourceFileImportBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    const importClause = statement.importClause;
    if (importClause == null) {
      continue;
    }
    if (importClause.name != null) {
      bindings.locals.set(importClause.name.text, {
        moduleSpecifier,
        importedName: 'default',
        importKind: 'default',
      });
    }
    const namedBindings = importClause.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      bindings.namespaces.set(namedBindings.name.text, moduleSpecifier);
      continue;
    }
    for (const element of namedBindings.elements) {
      bindings.locals.set(element.name.text, {
        moduleSpecifier,
        importedName: element.propertyName?.text ?? element.name.text,
        importKind: 'named',
      });
    }
  }
  return bindings;
}

function isAureliaResolveExpression(
  expression: ts.Expression,
  bindings: AureliaResolveBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.identifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'resolve'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.namespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function resolveKeyExpressionForArgument(
  expression: ts.Expression | null,
  bindings: AureliaResolveBindings,
): ts.Expression | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current) || current.arguments.length === 0) {
    return current;
  }
  const firstArgument = current.arguments[0];
  if (firstArgument == null) {
    return current;
  }
  return isAureliaResolveKeyWrapperExpression(current.expression, bindings)
    ? unwrapExpression(firstArgument)
    : current;
}

function isAureliaResolveKeyWrapperExpression(
  expression: ts.Expression,
  bindings: AureliaResolveBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.keyWrapperIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && AURELIA_RESOLVE_KEY_WRAPPER_EXPORTS.has(current.name.text)
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.namespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function resolveKeyTarget(
  checker: ts.TypeChecker,
  expression: ts.Expression | null,
  sourcePathByFileName: ReadonlyMap<string, string>,
  imports: SourceFileImportBindings,
): DiResolveKeyTarget {
  if (expression == null) {
    return unresolvedKeyTarget(null);
  }
  const current = unwrapExpression(expression);
  const keyName = keyNameForExpression(current);
  const importReference = importReferenceForKeyExpression(current, imports);
  const symbol = symbolForExpression(checker, current);
  if (symbol == null) {
    return unresolvedKeyTarget(keyName, importReference);
  }
  const declaration = symbol.declarations?.[0] ?? null;
  if (declaration == null) {
    return unresolvedKeyTarget(keyName, importReference);
  }
  return {
    keyName,
    declarationKind: declarationKindForNode(declaration),
    declarationName: declarationNameForNode(declaration),
    declarationSourcePath: sourcePathByFileName.get(
      normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName),
    ) ?? null,
    importModuleSpecifier: importReference?.moduleSpecifier ?? null,
    importName: importReference?.importedName ?? null,
    importKind: importReference?.importKind ?? 'none',
  };
}

function unresolvedKeyTarget(
  keyName: string | null,
  importReference: ImportedSymbolReference | null = null,
): DiResolveKeyTarget {
  return {
    keyName,
    declarationKind: 'unresolved',
    declarationName: null,
    declarationSourcePath: null,
    importModuleSpecifier: importReference?.moduleSpecifier ?? null,
    importName: importReference?.importedName ?? null,
    importKind: importReference?.importKind ?? 'none',
  };
}

function importReferenceForKeyExpression(
  expression: ts.Expression,
  imports: SourceFileImportBindings,
): ImportedSymbolReference | null {
  if (ts.isIdentifier(expression)) {
    return imports.locals.get(expression.text) ?? null;
  }
  if (
    ts.isPropertyAccessExpression(expression)
    && ts.isIdentifier(unwrapExpression(expression.expression))
  ) {
    const moduleSpecifier = imports.namespaces.get((unwrapExpression(expression.expression) as ts.Identifier).text);
    return moduleSpecifier == null
      ? null
      : {
        moduleSpecifier,
        importedName: expression.name.text,
        importKind: 'namespace-member',
      };
  }
  return null;
}

function symbolForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(expression);
  if (symbol == null) {
    return null;
  }
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function keyNameForExpression(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

function declarationKindForNode(node: ts.Declaration): DiResolveKeyDeclarationKind {
  if (ts.isClassDeclaration(node)) {
    return 'class';
  }
  if (ts.isInterfaceDeclaration(node)) {
    return 'interface';
  }
  if (ts.isVariableDeclaration(node)) {
    return 'variable';
  }
  if (ts.isFunctionDeclaration(node)) {
    return 'function';
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return 'type';
  }
  return 'unknown';
}

function declarationNameForNode(node: ts.Declaration): string | null {
  if (
    (ts.isClassDeclaration(node)
      || ts.isInterfaceDeclaration(node)
      || ts.isFunctionDeclaration(node)
      || ts.isTypeAliasDeclaration(node))
    && node.name != null
  ) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return null;
}
