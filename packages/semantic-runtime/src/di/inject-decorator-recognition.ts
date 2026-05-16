import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  hasAccessorModifier,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { decoratedTargetName } from '../type-system/decorator-target.js';

const AURELIA_INJECTION_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const AURELIA_INJECTION_DECORATOR_EXPORTS = new Set([
  'inject',
  'all',
  'lazy',
  'optional',
  'ignore',
  'factory',
  'own',
  'resource',
  'optionalResource',
  'allResources',
  'newInstanceForScope',
  'newInstanceOf',
]);

const BARE_INJECTION_DECORATOR_EXPORTS = new Set([
  'ignore',
]);

export type DiInjectDecoratorTargetKind =
  | 'method'
  | 'getter'
  | 'setter'
  | 'accessor'
  | 'unknown';

/** Source site for a decorator that delegates to Aurelia's `inject(...)` and is used on an unsupported target. */
export class DiInjectDecoratorSite {
  readonly kind = 'di-inject-decorator-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    readonly decoratorName: string,
    readonly targetKind: DiInjectDecoratorTargetKind,
    readonly targetName: string | null,
  ) {}
}

/** Read `@inject`-family decorator sites that match the kernel invalid decorator-context path exactly. */
export function readInvalidDiInjectDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly DiInjectDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileInvalidDiInjectDecoratorSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileInvalidDiInjectDecoratorSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly DiInjectDecoratorSite[] {
  const bindings = readInjectionDecoratorBindings(sourceFile);
  const sites: DiInjectDecoratorSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isParameter(node)) {
      return;
    }

    const targetKind = invalidInjectDecoratorTargetKind(node);
    if (targetKind != null && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const decoratorName = readInjectionDecoratorName(decorator, bindings);
        if (decoratorName == null) {
          continue;
        }
        sites.push(new DiInjectDecoratorSite(
          sourcePath,
          sourceFileAddressHandle,
          decorator.getStart(sourceFile),
          decorator.end,
          decoratorName,
          targetKind,
          decoratedTargetName(node),
        ));
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function readInjectionDecoratorBindings(sourceFile: ts.SourceFile): SourceImportBindings {
  return readSourceImportBindings(
    sourceFile,
    AURELIA_INJECTION_DECORATOR_MODULES,
    AURELIA_INJECTION_DECORATOR_EXPORTS,
  );
}

function readInjectionDecoratorName(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): string | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    return readImportedExportName(expression.expression, bindings, true);
  }
  return readImportedExportName(expression, bindings, BARE_INJECTION_DECORATOR_EXPORTS);
}

function invalidInjectDecoratorTargetKind(
  node: ts.Node,
): DiInjectDecoratorTargetKind | null {
  if (ts.isMethodDeclaration(node)) {
    return 'method';
  }
  if (ts.isGetAccessorDeclaration(node)) {
    return 'getter';
  }
  if (ts.isSetAccessorDeclaration(node)) {
    return 'setter';
  }
  if (ts.isPropertyDeclaration(node) && hasAccessorModifier(node)) {
    return 'accessor';
  }
  return ts.canHaveDecorators(node) && !ts.isClassDeclaration(node) && !ts.isClassExpression(node) && !ts.isPropertyDeclaration(node)
    ? 'unknown'
    : null;
}
