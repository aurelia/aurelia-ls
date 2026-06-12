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

const AURELIA_COMPUTED_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_COMPUTED_DECORATOR_EXPORTS = new Set([
  'computed',
]);

/** Source site for an @computed(...) decorator form that runtime computed-decorators.ts rejects with AUR0228. */
export class ComputedDecoratorSite {
  readonly kind = 'computed-decorator-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    readonly decoratorName: string,
    readonly targetKind: SourceDecoratorTargetKind,
    readonly targetName: string | null,
  ) {}
}

/** Read invalid @computed(...) sites where the universal decorator receives neither a getter nor a method context. */
export function readInvalidComputedDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ComputedDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileInvalidComputedDecoratorSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileInvalidComputedDecoratorSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly ComputedDecoratorSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_COMPUTED_DECORATOR_MODULES,
    AURELIA_COMPUTED_DECORATOR_EXPORTS,
  );
  const sites: ComputedDecoratorSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    if (targetKind != null && targetKind !== 'getter' && targetKind !== 'method' && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const decoratorName = readComputedCallDecoratorName(decorator, bindings);
        if (decoratorName == null) {
          continue;
        }
        sites.push(new ComputedDecoratorSite(
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

function readComputedCallDecoratorName(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): string | null {
  const expression = unwrapExpression(decorator.expression);
  return ts.isCallExpression(expression)
    && readImportedExportName(expression.expression, bindings, true) === 'computed'
    ? 'computed'
    : null;
}
