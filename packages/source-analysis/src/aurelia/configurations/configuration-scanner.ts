import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import type { Export, Exports } from '../exports/index.js';
import { SourceNodeRef, SourceSpan, type SourceFileRef } from '../refs.js';
import { BundleArray } from './bundle-array.js';
import {
  BundleSpread,
  HelperCall,
  RegistryFactoryMethod,
  RegistryMethod,
  RegistryObject,
  type RegistryFactoryMethodRoleKind,
  type RegistryObjectOriginKind,
} from './registry-object.js';

export interface ConfigurationScannerOptions {
  readonly exports: Exports;
}

export interface ConfigurationScannerState {
  readonly exportOwnerLabel: string;
  readonly parsedFileCount: number;
}

type ConfigurationSubject =
  | BundleArray
  | RegistryObject;

type FunctionImplementation =
  | ts.Block
  | ts.Expression;

type RegistryObjectOrigin = {
  readonly helperName: string | null;
  readonly kind: RegistryObjectOriginKind;
  readonly note: string | null;
  readonly objectLiteral: ts.ObjectLiteralExpression;
};

export class ConfigurationScanner {
  private readonly exportsValue: Exports;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: ConfigurationScannerOptions,
  ) {
    this.exportsValue = options.exports;
  }

  scanAll(): readonly ConfigurationSubject[] {
    return this.exportsValue.readAll().flatMap((current) => this.scanExport(current));
  }

  inspectState(): ConfigurationScannerState {
    return {
      exportOwnerLabel: this.exportsValue.ownerLabel,
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private scanExport(
    current: Export,
  ): readonly ConfigurationSubject[] {
    // TODO: Aurelia uses the same IRegistry surface for plugin configuration
    // objects, helper registries, and smaller feature registration objects.
    // This scanner currently groups those under one syntax-first layer. A later
    // pass should split "plugin configuration" from "generic registry-valued
    // export" once we have stronger value-shape and provenance recovery.
    const declaration = current.symbol?.declaration;
    if (declaration == null || declaration.nodeKind !== 'VariableDeclaration') {
      return [];
    }

    const file = declaration.file;
    const sourceFile = this.readParsedSourceFile(file);
    if (sourceFile == null) {
      return [];
    }

    const variableDeclaration = findNodeBySpan(
      sourceFile,
      declaration.span.start,
      declaration.span.end,
      ts.isVariableDeclaration,
    );
    if (variableDeclaration == null || variableDeclaration.initializer == null) {
      return [];
    }

    if (
      ts.isArrayLiteralExpression(variableDeclaration.initializer)
      && isRegistryBundleArray(variableDeclaration.initializer)
    ) {
      return [
        new BundleArray(
          `${current.id}:bundle-array`,
          current,
          createNodeRef(file, variableDeclaration.initializer),
          variableDeclaration.initializer.elements.length,
          variableDeclaration.initializer.elements.map(summarizeExpression),
          'Recovered directly from exported array-literal initializer.',
        ),
      ];
    }

    const registryObject = this.tryReadRegistryObject(
      current,
      file,
      sourceFile,
      variableDeclaration.initializer,
    );
    return registryObject == null ? [] : [registryObject];
  }

  private tryReadRegistryObject(
    current: Export,
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
    initializer: ts.Expression,
  ): RegistryObject | null {
    const origin = this.readRegistryObjectOrigin(file, sourceFile, initializer);
    if (origin == null) {
      return null;
    }

    const registerMethod = this.readRegisterMethod(file, origin.objectLiteral);
    const factoryMethods = this.readFactoryMethods(
      file,
      sourceFile,
      origin.objectLiteral,
    );

    if (registerMethod == null && factoryMethods.length === 0) {
      return null;
    }

    return new RegistryObject(
      `${current.id}:registry-object`,
      current,
      createNodeRef(file, origin.objectLiteral),
      origin.kind,
      registerMethod,
      factoryMethods,
      origin.note,
    );
  }

  private readFactoryMethods(
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
    objectLiteral: ts.ObjectLiteralExpression,
  ): readonly RegistryFactoryMethod[] {
    const methods: RegistryFactoryMethod[] = [];

    for (const property of objectLiteral.properties) {
      const name = readPropertyName(property.name);
      if (name == null || name === 'register') {
        continue;
      }

      const implementation = readFunctionImplementation(property);
      if (implementation == null) {
        continue;
      }

      const returned = findReturnedRegistryObject(implementation, sourceFile);
      const returnsRegistry = returned != null || hasReturnedAppTask(implementation);
      if (!returnsRegistry) {
        continue;
      }

      const role: RegistryFactoryMethodRoleKind = name === 'customize'
        ? 'configuration-customizer'
        : 'registry-factory';
      const analysis = analyzeFunctionImplementation(file, implementation);
      methods.push(
        new RegistryFactoryMethod(
          `${file.id}:factory-method:${name}:${methods.length}`,
          name,
          role,
          createNodeRef(file, property),
          true,
          analysis.bundleSpreads,
          analysis.helperCalls,
          returned == null
            ? 'Returns a registry-like value through AppTask or another known registry-producing call.'
            : 'Returns a registry-like object surface from method body syntax.',
        ),
      );
    }

    return methods;
  }

  private readParsedSourceFile(
    file: SourceFileRef,
  ): ts.SourceFile | null {
    const resolvedPath = path.isAbsolute(file.path)
      ? file.path
      : path.join(file.program.repoRoot, file.path);
    const cached = this.parsedFiles.get(resolvedPath);
    if (cached !== void 0) {
      return cached;
    }

    if (!fs.existsSync(resolvedPath)) {
      this.parsedFiles.set(resolvedPath, null);
      return null;
    }

    const text = fs.readFileSync(resolvedPath, 'utf8');
    const sourceFile = ts.createSourceFile(
      resolvedPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    this.parsedFiles.set(resolvedPath, sourceFile);
    return sourceFile;
  }

  private readRegisterMethod(
    file: SourceFileRef,
    objectLiteral: ts.ObjectLiteralExpression,
  ): RegistryMethod | null {
    for (const property of objectLiteral.properties) {
      if (readPropertyName(property.name) !== 'register') {
        continue;
      }

      const implementation = readFunctionImplementation(property);
      if (implementation == null) {
        continue;
      }

      const analysis = analyzeFunctionImplementation(file, implementation);
      return new RegistryMethod(
        `${file.id}:register-method:${property.pos}`,
        'register',
        createNodeRef(file, property),
        analysis.bundleSpreads,
        analysis.helperCalls,
        'Recovered from an object-literal register(container) surface.',
      );
    }

    return null;
  }

  private readRegistryObjectOrigin(
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
    initializer: ts.Expression,
  ): RegistryObjectOrigin | null {
    if (ts.isObjectLiteralExpression(initializer)) {
      return {
        helperName: null,
        kind: 'object-literal',
        note: 'Recovered directly from exported object-literal initializer.',
        objectLiteral: initializer,
      };
    }

    if (ts.isCallExpression(initializer)) {
      const wrapped = unwrapWrappedObjectLiteral(initializer);
      if (wrapped != null) {
        return {
          helperName: readCallName(initializer.expression),
          kind: 'wrapped-object-literal',
          note: 'Recovered from a wrapped object-literal initializer.',
          objectLiteral: wrapped,
        };
      }

      if (ts.isIdentifier(initializer.expression)) {
        // TODO: this only follows same-file named factory helpers for now.
        // Cross-file helpers and richer initializer indirection need a deeper
        // value-shape layer instead of more syntax-only guessing here.
        const returned = findReturnedRegistryObjectForFunction(
          sourceFile,
          initializer.expression.text,
        );
        if (returned != null) {
          return {
            helperName: initializer.expression.text,
            kind: 'factory-return',
            note: `Recovered through same-file factory function "${initializer.expression.text}".`,
            objectLiteral: returned,
          };
        }
      }
    }

    void file;
    return null;
  }
}

function analyzeFunctionImplementation(
  file: SourceFileRef,
  implementation: FunctionImplementation,
): {
  readonly bundleSpreads: readonly BundleSpread[];
  readonly helperCalls: readonly HelperCall[];
} {
  const bundleSpreads = new Map<string, BundleSpread>();
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
    helperCalls: [...helperCalls.values()],
  };
}

function createNodeRef(
  file: SourceFileRef,
  node: ts.Node,
): SourceNodeRef {
  return new SourceNodeRef(
    `${file.id}:${ts.SyntaxKind[node.kind]}:${node.pos}-${node.end}`,
    file,
    ts.SyntaxKind[node.kind],
    new SourceSpan(node.getStart(), node.end),
  );
}

function findNodeBySpan<T extends ts.Node>(
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

function findReturnedRegistryObject(
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

function findReturnedRegistryObjectForFunction(
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

function hasReturnedAppTask(
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

function readCallName(
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

function readFunctionImplementation(
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

function readPropertyName(
  name: ts.PropertyName | undefined,
): string | null {
  if (name == null) {
    return null;
  }

  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return null;
}

function summarizeExpression(
  expression: ts.Expression,
): string {
  if (
    ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isParenthesizedExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return summarizeExpression(expression.expression);
  }

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.getText();
  }

  if (ts.isClassExpression(expression) && expression.name != null) {
    return expression.name.text;
  }

  if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression)) {
    return expression.text;
  }

  return expression.kind === ts.SyntaxKind.NullKeyword
    ? 'null'
    : ts.SyntaxKind[expression.kind];
}

function unwrapRegistryObjectExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | null {
  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }

  if (ts.isCallExpression(expression)) {
    const wrapped = unwrapWrappedObjectLiteral(expression);
    if (wrapped != null) {
      return wrapped;
    }

    if (ts.isIdentifier(expression.expression)) {
      return findReturnedRegistryObjectForFunction(sourceFile, expression.expression.text);
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
  return ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && ts.isIdentifier(expression.expression.expression)
    && expression.expression.expression.text === 'AppTask';
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

function isRegistryBundleArray(
  array: ts.ArrayLiteralExpression,
): boolean {
  if (array.elements.length === 0) {
    return false;
  }

  // TODO: this currently only admits arrays of direct registrable references.
  // If Aurelia starts exporting bundle arrays with helper calls or richer value
  // shapes, that needs a deeper initializer/value recovery layer instead of
  // broadening this with ad-hoc syntax guesses.
  return array.elements.every((element) => isRegistrableReferenceExpression(element));
}

function isRegistrableReferenceExpression(
  expression: ts.Expression,
): boolean {
  if (
    ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isParenthesizedExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return isRegistrableReferenceExpression(expression.expression);
  }

  return ts.isIdentifier(expression)
    || ts.isPropertyAccessExpression(expression)
    || (ts.isClassExpression(expression) && expression.name != null);
}

function isCallArgumentSpread(
  node: ts.SpreadElement,
): boolean {
  return ts.isCallExpression(node.parent)
    || ts.isNewExpression(node.parent);
}
