import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  hasAccessorModifier,
} from '../evaluation/ts-syntax.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { decoratedTargetName } from '../type-system/decorator-target.js';
import {
  readAureliaInjectionBindings,
  readAureliaInjectionDecorator,
} from './injection-metadata.js';

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
    const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileInvalidDiInjectDecoratorSites(
          source.path,
          source.addressHandle,
          sourceFile,
          typeSystem,
        );
  });
}

function readSourceFileInvalidDiInjectDecoratorSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
): readonly DiInjectDecoratorSite[] {
  const bindings = readAureliaInjectionBindings(sourceFile);
  const sites: DiInjectDecoratorSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isParameter(node)) {
      return;
    }

    const targetKind = invalidInjectDecoratorTargetKind(node);
    if (targetKind != null && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const metadata = readAureliaInjectionDecorator(decorator, bindings, typeSystem);
        if (metadata == null) {
          continue;
        }
        sites.push(new DiInjectDecoratorSite(
          sourcePath,
          sourceFileAddressHandle,
          decorator.getStart(sourceFile),
          decorator.end,
          metadata.exportName,
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
