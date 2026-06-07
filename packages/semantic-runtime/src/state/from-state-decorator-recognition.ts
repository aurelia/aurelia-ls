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
import { auLink } from '../kernel/au-link.js';
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
@auLink('state:fromState')
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
@auLink('state:fromState')
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

/** Source site for a valid @fromState(...) field/setter decorator that creates a StateGetterBinding. */
@auLink('state:fromState')
export class FromStateDecoratorBindingSite {
  readonly kind = 'from-state-decorator-binding-site' as const;

  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    /** Null means the default store; undefined means a non-literal store name expression. */
    readonly storeName: string | null | undefined,
    readonly storeNameStart: number | null,
    readonly storeNameEnd: number | null,
    readonly selectorStart: number,
    readonly selectorEnd: number,
    readonly selectorText: string,
    readonly targetKind: FromStateDecoratorTargetKind,
    readonly targetName: string | null,
    readonly targetStart: number | null,
    readonly targetEnd: number | null,
    readonly targetNameStart: number | null,
    readonly targetNameEnd: number | null,
  ) {}
}

/** Read invalid @fromState(...) sites that match state-decorator.ts field/setter-only checks. */
export function readInvalidFromStateDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FromStateDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
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
  return readFromStateDecoratorBindingSites(project, typeSystem).flatMap((site): readonly FromStateStoreReferenceSite[] => {
    if (site.storeName == null || site.storeNameStart == null || site.storeNameEnd == null) {
      return [];
    }
    return [new FromStateStoreReferenceSite(
      site.sourcePath,
      site.sourceFileAddressHandle,
      site.storeNameStart,
      site.storeNameEnd,
    site.storeName,
    site.targetKind,
    site.targetName,
  )];
  });
}

/** Read valid @fromState(...) field/setter decorator sites that create framework StateGetterBinding instances. */
export function readFromStateDecoratorBindingSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FromStateDecoratorBindingSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileFromStateDecoratorBindingSites(source.path, source.addressHandle, sourceFile);
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

function readSourceFileFromStateDecoratorBindingSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly FromStateDecoratorBindingSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_FROM_STATE_DECORATOR_MODULES,
    AURELIA_FROM_STATE_DECORATOR_EXPORTS,
  );
  const sites: FromStateDecoratorBindingSite[] = [];
  const visit = (node: ts.Node): void => {
    const targetKind = sourceDecoratorTargetKind(node);
    if ((targetKind === 'field' || targetKind === 'setter') && ts.canHaveDecorators(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const site = readFromStateDecoratorBindingSite(
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

function readFromStateDecoratorBindingSite(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  target: ts.Node,
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
  targetKind: FromStateDecoratorTargetKind,
): FromStateDecoratorBindingSite | null {
  const expression = unwrapExpression(decorator.expression);
  if (!ts.isCallExpression(expression) || readImportedExportName(expression.expression, bindings, true) !== 'fromState') {
    return null;
  }
  const selector = fromStateSelectorExpression(expression);
  if (selector == null) {
    return null;
  }
  const storeName = fromStateStoreName(sourceFile, expression);
  const targetName = decoratedTargetName(target);
  const targetNameSpan = decoratedTargetNameSpan(sourceFile, target);
  return new FromStateDecoratorBindingSite(
    sourcePath,
    sourceFileAddressHandle,
    decorator.getStart(sourceFile),
    decorator.end,
    storeName.value,
    storeName.start,
    storeName.end,
    selector.getStart(sourceFile),
    selector.end,
    selector.getText(sourceFile),
    targetKind,
    targetName,
    target.getStart(sourceFile),
    target.end,
    targetNameSpan?.start ?? null,
    targetNameSpan?.end ?? null,
  );
}

function fromStateStoreName(
  sourceFile: ts.SourceFile,
  expression: ts.CallExpression,
): {
  readonly value: string | null | undefined;
  readonly start: number | null;
  readonly end: number | null;
} {
  const first = expression.arguments[0] ?? null;
  if (first == null) {
    return { value: undefined, start: null, end: null };
  }
  if (ts.isStringLiteralLike(first)) {
    return {
      value: first.text,
      start: first.getStart(sourceFile),
      end: first.end,
    };
  }
  return expression.arguments[1] == null
    ? { value: null, start: null, end: null }
    : { value: undefined, start: first.getStart(sourceFile), end: first.end };
}

function fromStateSelectorExpression(
  expression: ts.CallExpression,
): ts.Expression | null {
  const first = expression.arguments[0] ?? null;
  if (first == null) {
    return null;
  }
  if (ts.isStringLiteralLike(first)) {
    return expression.arguments[1] ?? null;
  }
  return expression.arguments[1] == null ? first : expression.arguments[1];
}

function decoratedTargetNameSpan(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): { readonly start: number; readonly end: number } | null {
  if (
    ts.isClassDeclaration(node)
    || ts.isClassExpression(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isPropertyDeclaration(node)
  ) {
    return node.name == null
      ? null
      : { start: node.name.getStart(sourceFile), end: node.name.end };
  }
  return null;
}
