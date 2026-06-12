import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import { readPropertyName, unwrapExpression } from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  decoratedTargetName,
  sourceDecoratorTargetKind,
} from '../type-system/decorator-target.js';
import {
  ComputedObservationDependencyMode,
  ComputedObservationMemberKind,
} from './computed-observation.js';
import {
  computedDependencyRead,
  isNullishDependencyConfigValue,
  propertyKeyRead,
  type ComputedDependencyKeyRead,
  type ComputedDependencyRead,
} from './computed-dependency-config.js';

export const AURELIA_COMPUTED_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

export const AURELIA_COMPUTED_DECORATOR_EXPORTS = new Set([
  'computed',
]);

export interface ComputedObservationSite {
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly start: number;
  readonly end: number;
  readonly decoratorName: string;
  readonly memberKind: ComputedObservationMemberKind;
  readonly memberName: string | null;
  readonly dependencyMode: ComputedObservationDependencyMode;
  readonly dependencyKeys: readonly string[];
  readonly dependencyFunctionCount: number;
  readonly flush: 'sync' | 'async';
  readonly deep: boolean | null;
}

export interface ComputedDecoratorRead {
  readonly decoratorName: string;
  readonly call: ts.CallExpression | null;
  readonly directDecorator: boolean;
}

export function readComputedObservationSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ComputedObservationSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileComputedObservationSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileComputedObservationSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly ComputedObservationSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_COMPUTED_DECORATOR_MODULES,
    AURELIA_COMPUTED_DECORATOR_EXPORTS,
  );
  const sites: ComputedObservationSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    const memberKind = computedMemberKind(targetKind);
    if (memberKind != null && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const computed = readComputedDecorator(decorator, bindings);
        if (computed == null) {
          continue;
        }
        const dependency = readComputedDependency(computed, memberKind);
        sites.push({
          sourcePath,
          sourceFileAddressHandle,
          start: decorator.getStart(sourceFile),
          end: decorator.end,
          decoratorName: computed.decoratorName,
          memberKind,
          memberName: decoratedTargetName(node),
          dependencyMode: dependency.dependencyMode,
          dependencyKeys: dependency.dependencyKeys,
          dependencyFunctionCount: dependency.dependencyFunctionCount,
          flush: dependency.flush,
          deep: dependency.deep,
        });
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function computedMemberKind(
  targetKind: string | null,
): ComputedObservationMemberKind | null {
  if (targetKind === 'getter') {
    return ComputedObservationMemberKind.Getter;
  }
  if (targetKind === 'method') {
    return ComputedObservationMemberKind.Method;
  }
  return null;
}

export function readComputedDecorator(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): ComputedDecoratorRead | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    return readImportedExportName(expression.expression, bindings, true) === 'computed'
      ? {
        decoratorName: 'computed',
        call: expression,
        directDecorator: false,
      }
      : null;
  }
  return readImportedExportName(expression, bindings, true) === 'computed'
    ? {
      decoratorName: 'computed',
      call: null,
      directDecorator: true,
    }
    : null;
}

export function readComputedDependency(
  decorator: ComputedDecoratorRead,
  memberKind: ComputedObservationMemberKind,
): ComputedDependencyRead {
  if (decorator.directDecorator) {
    return computedDependencyRead(
      memberKind === ComputedObservationMemberKind.Method
        ? ComputedObservationDependencyMode.ProxyAutoTrack
        : ComputedObservationDependencyMode.Open,
      [],
    );
  }

  const args: readonly ts.Expression[] = decorator.call?.arguments ?? [];
  if (args.length === 0) {
    return computedDependencyRead(
      memberKind === ComputedObservationMemberKind.Method
        ? ComputedObservationDependencyMode.ProxyAutoTrack
        : ComputedObservationDependencyMode.Open,
      [],
    );
  }

  const firstArgument = args[0];
  if (firstArgument == null) {
    return computedDependencyRead(ComputedObservationDependencyMode.Disabled, []);
  }
  const first = unwrapExpression(firstArgument);
  if (isNullishDependencyConfigValue(first)) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack, []);
  }
  if (ts.isObjectLiteralExpression(first)) {
    return readComputedObjectConfig(first);
  }
  if (ts.isFunctionExpression(first) || ts.isArrowFunction(first)) {
    return computedDependencyRead(ComputedObservationDependencyMode.DependencyFunction, [], 'async', null, [first]);
  }
  return readComputedPropertyKeyArguments(args);
}

function readComputedObjectConfig(
  expression: ts.ObjectLiteralExpression,
): ComputedDependencyRead {
  const deps = readPropertyInitializer(expression, 'deps');
  const flush = readFlush(expression);
  const deep = readDeep(expression);
  if (deps == null) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack, [], flush, deep);
  }
  const unwrapped = unwrapExpression(deps);
  if (isNullishDependencyConfigValue(unwrapped)) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack, [], flush, deep);
  }
  if (ts.isArrayLiteralExpression(unwrapped)) {
    return readComputedDependencyArray(unwrapped, flush, deep);
  }
  if (ts.isFunctionExpression(unwrapped) || ts.isArrowFunction(unwrapped)) {
    return computedDependencyRead(ComputedObservationDependencyMode.DependencyFunction, [], flush, deep, [unwrapped]);
  }
  return computedDependencyRead(ComputedObservationDependencyMode.Open, [], flush, deep);
}

function readComputedPropertyKeyArguments(
  args: readonly ts.Expression[],
): ComputedDependencyRead {
  return readComputedDependencyExpressions(args.map((arg) => unwrapExpression(arg)));
}

function readComputedDependencyArray(
  expression: ts.ArrayLiteralExpression,
  flush: 'sync' | 'async',
  deep: boolean | null,
): ComputedDependencyRead {
  return readComputedDependencyExpressions(
    expression.elements.map((element) => unwrapExpression(element)),
    flush,
    deep,
  );
}

function readComputedDependencyExpressions(
  expressions: readonly ts.Expression[],
  flush: 'sync' | 'async' = 'async',
  deep: boolean | null = null,
): ComputedDependencyRead {
  const keyReads: ComputedDependencyKeyRead[] = [];
  const dependencyFunctions: ts.FunctionLikeDeclaration[] = [];
  let sawOpen = false;
  for (const expression of expressions) {
    const keyRead = propertyKeyRead(expression);
    if (keyRead != null) {
      keyReads.push(keyRead);
      continue;
    }
    if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
      dependencyFunctions.push(expression);
      continue;
    }
    sawOpen = true;
  }
  if (sawOpen) {
    return computedDependencyRead(ComputedObservationDependencyMode.Open, keyReads, flush, deep, dependencyFunctions);
  }
  if (keyReads.length === 0 && dependencyFunctions.length === 0) {
    return computedDependencyRead(ComputedObservationDependencyMode.Disabled, [], flush, deep);
  }
  return computedDependencyRead(
    dependencyFunctions.length > 0
      ? ComputedObservationDependencyMode.DependencyFunction
      : ComputedObservationDependencyMode.ExplicitPropertyKeys,
    keyReads,
    flush,
    deep,
    dependencyFunctions,
  );
}

function readPropertyInitializer(
  expression: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | null {
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (readPropertyName(property.name) === name) {
      return property.initializer;
    }
  }
  return null;
}

function readFlush(
  expression: ts.ObjectLiteralExpression,
): 'sync' | 'async' {
  const value = readPropertyInitializer(expression, 'flush');
  const text = value == null ? null : propertyKeyText(unwrapExpression(value));
  return text === 'sync' ? 'sync' : 'async';
}

function readDeep(
  expression: ts.ObjectLiteralExpression,
): boolean | null {
  const value = readPropertyInitializer(expression, 'deep');
  if (value == null) {
    return null;
  }
  const unwrapped = unwrapExpression(value);
  if (unwrapped.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (unwrapped.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function propertyKeyText(expression: ts.Expression): string | null {
  return propertyKeyRead(expression)?.key ?? null;
}

function compactKeyReads(values: readonly (ComputedDependencyKeyRead | null)[]): readonly ComputedDependencyKeyRead[] {
  return values.filter((value): value is ComputedDependencyKeyRead => value != null);
}
