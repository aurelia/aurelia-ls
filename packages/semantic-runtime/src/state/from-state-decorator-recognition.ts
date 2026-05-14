import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  decoratedTargetName,
  sourceDecoratorTargetKind,
  type SourceDecoratorTargetKind,
} from '../type-system/decorator-target.js';
import type { TypeSystemProject } from '../type-system/project.js';

const AURELIA_FROM_STATE_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/state',
]);

const AURELIA_FROM_STATE_DECORATOR_EXPORTS = new Set([
  'fromState',
]);

export type FromStateDecoratorTargetKind = SourceDecoratorTargetKind;

/** Source site for a @fromState(...) decorator target that @aurelia/state rejects during decoration. */
export class FromStateDecoratorSite {
  readonly kind = 'from-state-decorator-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    readonly decoratorName: string,
    readonly targetKind: FromStateDecoratorTargetKind,
    readonly targetName: string | null,
  ) {}
}

/** Source site for a literal named-store argument passed to @fromState('name', ...). */
export class FromStateStoreReferenceSite {
  readonly kind = 'from-state-store-reference-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    readonly storeName: string,
    readonly targetKind: FromStateDecoratorTargetKind,
    readonly targetName: string | null,
  ) {}
}

/** Read invalid @fromState(...) sites that match state-decorator.ts field/setter-only checks. */
export function readInvalidFromStateDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FromStateDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileInvalidFromStateDecoratorSites(source.path, source.addressHandle, sourceFile);
  });
}

/** Read valid @fromState('name', ...) decorator store references that will ask IStoreRegistry for a named store. */
export function readFromStateStoreReferenceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FromStateStoreReferenceSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileFromStateStoreReferenceSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileInvalidFromStateDecoratorSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly FromStateDecoratorSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_FROM_STATE_DECORATOR_MODULES,
    AURELIA_FROM_STATE_DECORATOR_EXPORTS,
  );
  const sites: FromStateDecoratorSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    if (targetKind != null && targetKind !== 'field' && targetKind !== 'setter' && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const decoratorName = readFromStateCallDecoratorName(decorator, bindings);
        if (decoratorName == null) {
          continue;
        }
        sites.push(new FromStateDecoratorSite(
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

function readSourceFileFromStateStoreReferenceSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly FromStateStoreReferenceSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_FROM_STATE_DECORATOR_MODULES,
    AURELIA_FROM_STATE_DECORATOR_EXPORTS,
  );
  const sites: FromStateStoreReferenceSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    if ((targetKind === 'field' || targetKind === 'setter') && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const site = readFromStateStoreReferenceSite(
          sourcePath,
          sourceFileAddressHandle,
          sourceFile,
          node,
          decorator,
          bindings,
          targetKind,
        );
        if (site != null) {
          sites.push(site);
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function readFromStateCallDecoratorName(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): string | null {
  const expression = unwrapExpression(decorator.expression);
  return ts.isCallExpression(expression)
    && readImportedExportName(expression.expression, bindings, true) === 'fromState'
    ? 'fromState'
    : null;
}

function readFromStateStoreReferenceSite(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  target: ts.Node,
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
  targetKind: FromStateDecoratorTargetKind,
): FromStateStoreReferenceSite | null {
  const expression = unwrapExpression(decorator.expression);
  if (!ts.isCallExpression(expression) || readImportedExportName(expression.expression, bindings, true) !== 'fromState') {
    return null;
  }
  const first = expression.arguments[0] ?? null;
  if (first == null || !ts.isStringLiteralLike(first)) {
    return null;
  }
  return new FromStateStoreReferenceSite(
    sourcePath,
    sourceFileAddressHandle,
    first.getStart(sourceFile),
    first.end,
    first.text,
    targetKind,
    decoratedTargetName(target),
  );
}
