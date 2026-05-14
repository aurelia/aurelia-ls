import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  decoratedTargetName,
  sourceDecoratorTargetKind,
  type SourceDecoratorTargetKind,
} from '../type-system/decorator-target.js';

const AURELIA_OBSERVABLE_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_OBSERVABLE_DECORATOR_EXPORTS = new Set([
  'observable',
]);

export type ObservableDecoratorTargetKind = SourceDecoratorTargetKind;

export type ObservableDecoratorInvalidForm =
  | 'empty-call'
  | 'object-configuration-call';

/** Source site for an @observable decorator form that the runtime decorator rejects with AUR0224. */
export class ObservableDecoratorSite {
  readonly kind = 'observable-decorator-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    readonly decoratorName: string,
    readonly targetKind: ObservableDecoratorTargetKind,
    readonly targetName: string | null,
    readonly invalidForm: ObservableDecoratorInvalidForm,
  ) {}
}

/** Read invalid @observable decorator sites that match runtime observable.ts invalid-context throws exactly. */
export function readInvalidObservableDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ObservableDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileInvalidObservableDecoratorSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileInvalidObservableDecoratorSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly ObservableDecoratorSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_OBSERVABLE_DECORATOR_MODULES,
    AURELIA_OBSERVABLE_DECORATOR_EXPORTS,
  );
  const sites: ObservableDecoratorSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    if (targetKind != null && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const invalidForm = readInvalidObservableDecoratorForm(decorator, bindings, targetKind);
        if (invalidForm == null) {
          continue;
        }
        sites.push(new ObservableDecoratorSite(
          sourcePath,
          sourceFileAddressHandle,
          decorator.getStart(sourceFile),
          decorator.end,
          'observable',
          targetKind,
          decoratedTargetName(node),
          invalidForm,
        ));
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function readInvalidObservableDecoratorForm(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
  targetKind: ObservableDecoratorTargetKind,
): ObservableDecoratorInvalidForm | null {
  const expression = unwrapExpression(decorator.expression);
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  const decoratorName = readImportedExportName(expression.expression, bindings, true);
  if (decoratorName !== 'observable') {
    return null;
  }
  if (expression.arguments.length === 0) {
    return targetKind === 'field'
      ? null
      : 'empty-call';
  }
  const firstArgumentExpression = expression.arguments[0] ?? null;
  if (firstArgumentExpression == null) {
    return null;
  }
  const firstArgument = unwrapExpression(firstArgumentExpression);
  return ts.isObjectLiteralExpression(firstArgument) && targetKind !== 'field' && targetKind !== 'class'
    ? 'object-configuration-call'
    : null;
}
