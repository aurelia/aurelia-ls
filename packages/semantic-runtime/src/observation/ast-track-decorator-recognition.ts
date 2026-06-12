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

const AURELIA_AST_TRACK_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_AST_TRACK_DECORATOR_EXPORTS = new Set([
  'astTrack',
]);

/** Source site for an @astTrack decorator form that the runtime decorator rejects with AUR0117. */
export class AstTrackDecoratorSite {
  readonly kind = 'ast-track-decorator-site' as const;

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

/** Read invalid @astTrack decorator sites that match runtime ast-track-decorator.ts method-only checks exactly. */
export function readInvalidAstTrackDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly AstTrackDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileInvalidAstTrackDecoratorSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileInvalidAstTrackDecoratorSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly AstTrackDecoratorSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_AST_TRACK_DECORATOR_MODULES,
    AURELIA_AST_TRACK_DECORATOR_EXPORTS,
  );
  const sites: AstTrackDecoratorSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    if (targetKind != null && targetKind !== 'method' && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const decoratorName = readAstTrackDecoratorName(decorator, bindings);
        if (decoratorName == null) {
          continue;
        }
        sites.push(new AstTrackDecoratorSite(
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

function readAstTrackDecoratorName(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): string | null {
  const expression = unwrapExpression(decorator.expression);
  const candidate = ts.isCallExpression(expression)
    ? expression.expression
    : expression;
  return readImportedExportName(candidate, bindings, true) === 'astTrack'
    ? 'astTrack'
    : null;
}
