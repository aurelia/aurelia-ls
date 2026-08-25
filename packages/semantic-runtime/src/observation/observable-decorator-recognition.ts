import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  readObjectPropertyExpression,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  decoratedTargetName,
  sourceDecoratorTargetKind,
  type SourceDecoratorTargetKind,
} from '../type-system/decorator-target.js';

export const AURELIA_OBSERVABLE_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

export const AURELIA_OBSERVABLE_DECORATOR_EXPORTS = new Set([
  'observable',
]);

export type ObservableDecoratorTargetKind = SourceDecoratorTargetKind;

export type ObservableDecoratorInvalidForm =
  | 'empty-call'
  | 'object-configuration-call';

/** Whether authored decorator syntax proves a getter-owned observable descriptor for one runtime property. */
export const enum ObservableDescriptorRecognitionState {
  /** A valid field or class decorator names this exact runtime property. */
  Exact = 'exact',
  /** Dynamic decorator configuration may install this property but does not close its name. */
  Open = 'open',
  /** No recognized observable decorator installs this runtime property. */
  Absent = 'absent',
}

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

/** Whether an exact checker member declaration installs the framework's getter-owned SetterNotifier. */
export function declarationHasObservableDecorator(
  declaration: ts.Declaration,
): boolean {
  if (sourceDecoratorTargetKind(declaration) !== 'field' || !ts.canHaveDecorators(declaration)) {
    return false;
  }
  const bindings = readSourceImportBindings(
    declaration.getSourceFile(),
    AURELIA_OBSERVABLE_DECORATOR_MODULES,
    AURELIA_OBSERVABLE_DECORATOR_EXPORTS,
  );
  return (ts.getDecorators(declaration) ?? []).some((decorator) =>
    fieldObservableDecoratorState(decorator, bindings) === ObservableDescriptorRecognitionState.Exact
  );
}

/** Exact-symbol counterpart used by source-effect and controller-setup materializers. */
export function symbolHasObservableDecorator(
  symbol: ts.Symbol | null | undefined,
): boolean {
  return (symbol?.declarations ?? []).some(declarationHasObservableDecorator);
}

/**
 * Recognize every valid field- and class-form `@observable` source that can install one property descriptor.
 *
 * Class forms are resolved from the concrete owner declaration rather than joined by property name alone.
 */
export function observableDescriptorRecognitionForMember(
  ownerDeclarations: readonly ts.Declaration[],
  memberDeclarations: readonly ts.Declaration[],
  propertyName: string,
): ObservableDescriptorRecognitionState {
  let open = false;
  for (const declaration of memberDeclarations) {
    if (sourceDecoratorTargetKind(declaration) !== 'field' || !ts.canHaveDecorators(declaration)) {
      continue;
    }
    const bindings = observableImportBindings(declaration.getSourceFile());
    for (const decorator of ts.getDecorators(declaration) ?? []) {
      const state = fieldObservableDecoratorState(decorator, bindings);
      if (state === ObservableDescriptorRecognitionState.Exact) {
        return state;
      }
      open ||= state === ObservableDescriptorRecognitionState.Open;
    }
  }

  const classDeclarations = new Set<ts.ClassLikeDeclarationBase>();
  for (const declaration of ownerDeclarations) {
    if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
      classDeclarations.add(declaration);
    }
  }
  for (const declaration of memberDeclarations) {
    if (ts.isClassLike(declaration.parent)) {
      classDeclarations.add(declaration.parent);
    }
  }
  for (const declaration of classDeclarations) {
    if (!ts.canHaveDecorators(declaration)) {
      continue;
    }
    const bindings = observableImportBindings(declaration.getSourceFile());
    for (const decorator of ts.getDecorators(declaration) ?? []) {
      const state = classObservableDecoratorState(decorator, bindings, propertyName);
      if (state === ObservableDescriptorRecognitionState.Exact) {
        return state;
      }
      open ||= state === ObservableDescriptorRecognitionState.Open;
    }
  }
  return open
    ? ObservableDescriptorRecognitionState.Open
    : ObservableDescriptorRecognitionState.Absent;
}

/** Read invalid @observable decorator sites that match runtime observable.ts invalid-context throws exactly. */
export function readInvalidObservableDecoratorSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ObservableDecoratorSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
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

function observableImportBindings(sourceFile: ts.SourceFile): SourceImportBindings {
  return readSourceImportBindings(
    sourceFile,
    AURELIA_OBSERVABLE_DECORATOR_MODULES,
    AURELIA_OBSERVABLE_DECORATOR_EXPORTS,
  );
}

function fieldObservableDecoratorState(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): ObservableDescriptorRecognitionState {
  const expression = unwrapExpression(decorator.expression);
  if (!ts.isCallExpression(expression)) {
    return readImportedExportName(expression, bindings, true) === 'observable'
      ? ObservableDescriptorRecognitionState.Exact
      : ObservableDescriptorRecognitionState.Absent;
  }
  if (readImportedExportName(expression.expression, bindings, true) !== 'observable') {
    return ObservableDescriptorRecognitionState.Absent;
  }
  const configuration = expression.arguments[0];
  return configuration == null || ts.isObjectLiteralExpression(unwrapExpression(configuration))
    ? ObservableDescriptorRecognitionState.Exact
    : ObservableDescriptorRecognitionState.Open;
}

function classObservableDecoratorState(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
  propertyName: string,
): ObservableDescriptorRecognitionState {
  const expression = unwrapExpression(decorator.expression);
  if (!ts.isCallExpression(expression)
    || readImportedExportName(expression.expression, bindings, true) !== 'observable') {
    return ObservableDescriptorRecognitionState.Absent;
  }
  const configurationExpression = expression.arguments[0];
  if (configurationExpression == null) {
    return ObservableDescriptorRecognitionState.Absent;
  }
  const configuration = unwrapExpression(configurationExpression);
  if (ts.isObjectLiteralExpression(configuration)) {
    const nameExpression = readObjectPropertyExpression(configuration, 'name');
    if (nameExpression == null) {
      return configuration.properties.some(ts.isSpreadAssignment)
        ? ObservableDescriptorRecognitionState.Open
        : ObservableDescriptorRecognitionState.Absent;
    }
    return staticObservablePropertyNameState(nameExpression, propertyName);
  }
  return staticObservablePropertyNameState(configuration, propertyName);
}

function staticObservablePropertyNameState(
  expression: ts.Expression,
  propertyName: string,
): ObservableDescriptorRecognitionState {
  const value = unwrapExpression(expression);
  const staticName = ts.isStringLiteralLike(value)
    ? value.text
    : ts.isNumericLiteral(value)
      ? value.text
      : null;
  return staticName == null
    ? ObservableDescriptorRecognitionState.Open
    : staticName === propertyName
      ? ObservableDescriptorRecognitionState.Exact
      : ObservableDescriptorRecognitionState.Absent;
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
