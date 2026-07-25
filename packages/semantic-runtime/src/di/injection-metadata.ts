import ts from 'typescript';

import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import type {
  EvaluationArgumentList,
} from '../evaluation/argument-list.js';
import {
  hasAccessorModifier,
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type {
  EvaluationValueEvidence,
} from '../evaluation/value-pressure.js';
import type {
  TypeSystemProject,
} from '../type-system/project.js';
import {
  AURELIA_RESOLVER_KEY_KIND_BY_EXPORT,
  type DiAureliaResolverExportName,
} from './resolver-wrapper-recognition.js';

const AURELIA_INJECTION_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const AURELIA_INJECTION_DECORATOR_EXPORTS = new Set([
  'inject',
  ...Object.keys(AURELIA_RESOLVER_KEY_KIND_BY_EXPORT)
    .filter((name) => name !== 'last'),
]);

const BARE_INJECTION_DECORATOR_EXPORTS = new Set([
  'ignore',
]);

export const enum DiInjectionDecoratorKind {
  /** `@inject(...)` writes its evaluated arguments into positional annotation metadata. */
  Inject,
  /** A callable resolver value such as `@optional(...)` writes itself as one dependency. */
  Resolver,
}

/** Closure of one DI decorator expression evaluated at JavaScript class-definition time. */
export const enum DiEvaluatedInjectionDecoratorKind {
  /** `inject(...)` reached the intrinsic factory and retained its exact runtime argument list. */
  Inject,
  /** A built-in callable resolver value became the dependency written by decorator application. */
  Resolver,
  /** The intrinsic was recognized, but expression evaluation did not close to its decorator value. */
  Open,
}

/** TypeScript decorator transform whose runtime metadata rules apply to one project. */
export const enum DiClassDecoratorMode {
  /** TC39 decorator expressions receive standard decorator contexts and `Symbol.metadata`. */
  Standard,
  /** TypeScript's `experimentalDecorators` transform invokes the legacy decorator ABI. */
  Legacy,
}

/** Runtime presence of TypeScript's legacy `design:paramtypes` metadata on one class. */
export const enum DiDesignParamTypesMetadataState {
  /** TypeScript does not emit class constructor metadata for this declaration. */
  Absent,
  /** TypeScript emits an own empty array, which suppresses Aurelia dependency inheritance. */
  Empty,
  /** TypeScript emits one or more serialized constructor parameter runtime values. */
  Present,
}

/** One import-grounded decorator that writes Aurelia DI annotation metadata. */
export class DiInjectionDecoratorMetadata {
  constructor(
    readonly kind: DiInjectionDecoratorKind,
    readonly exportName: string,
    readonly decorator: ts.Decorator,
    /** Expressions whose runtime values are written as positional constructor dependencies. */
    readonly dependencyExpressions: readonly ts.Expression[],
  ) {}
}

/** One reached `@inject(...)` expression before reverse-order decorator application. */
export class DiEvaluatedInjectDecorator {
  readonly kind = DiEvaluatedInjectionDecoratorKind.Inject;

  constructor(
    readonly decorator: ts.Decorator,
    readonly argumentList: EvaluationArgumentList,
  ) {}
}

/** One reached callable resolver decorator such as `@optional(Key)` or bare `@ignore`. */
export class DiEvaluatedResolverDecorator {
  readonly kind = DiEvaluatedInjectionDecoratorKind.Resolver;

  constructor(
    readonly decorator: ts.Decorator,
    /** The resolver object itself is written into annotation metadata as the dependency key. */
    readonly resolver: EvaluationValueEvidence,
  ) {}
}

/** One recognized Aurelia DI decorator whose definition-time evaluation remained open. */
export class DiOpenEvaluatedInjectionDecorator {
  readonly kind = DiEvaluatedInjectionDecoratorKind.Open;

  constructor(
    readonly decorator: ts.Decorator,
    readonly reason: string,
    readonly evidence: EvaluationValueEvidence,
  ) {}
}

export type DiEvaluatedInjectionDecorator =
  | DiEvaluatedInjectDecorator
  | DiEvaluatedResolverDecorator
  | DiOpenEvaluatedInjectionDecorator;

/** One field decorator retained in actual decorator-application order. */
export class DiEvaluatedNamedInjectionDecorator {
  constructor(
    readonly fieldName: string | null,
    readonly evaluation: DiEvaluatedInjectionDecorator,
  ) {}
}

/**
 * Evaluator-retained Aurelia annotation writes for one class value.
 *
 * Class decorators remain in expression-evaluation order because Aurelia applies that list in
 * reverse. Field decorators are already stored in application order after every expression on the
 * field has evaluated, matching TypeScript's standard decorator lowering.
 */
export class DiClassInjectionEvaluation {
  constructor(
    readonly classDecorators: readonly DiEvaluatedInjectionDecorator[],
    readonly fieldDecorators: readonly DiEvaluatedNamedInjectionDecorator[],
  ) {}

  get ownsAnnotationMetadata(): boolean {
    return this.classDecorators.length > 0 || this.fieldDecorators.length > 0;
  }
}

/**
 * Source-visible part of Aurelia's `di:paramtypes` annotation metadata.
 *
 * `ownsAnnotationMetadata` is deliberately independent from positional dependencies: a field
 * decorator creates class-local metadata and therefore suppresses inherited constructor metadata.
 */
export class DiClassInjectionMetadata {
  constructor(
    readonly ownsAnnotationMetadata: boolean,
    /** Class decorators in authored evaluation order; runtime application consumes them in reverse. */
    readonly classDecorators: readonly DiInjectionDecoratorMetadata[],
    /** Field decorators in authored order; these write named metadata, not constructor positions. */
    readonly fieldDecorators: readonly DiNamedInjectionDecoratorMetadata[],
  ) {}
}

/** One class field whose decorator writes a named `di:paramtypes` metadata entry. */
export class DiNamedInjectionDecoratorMetadata {
  constructor(
    readonly fieldName: string | null,
    readonly metadata: DiInjectionDecoratorMetadata,
  ) {}
}

/** Import bindings shared by DI metadata readers and invalid-decorator diagnostics. */
export function readAureliaInjectionBindings(
  sourceFile: ts.SourceFile,
): SourceImportBindings {
  return readSourceImportBindings(
    sourceFile,
    AURELIA_INJECTION_MODULES,
    AURELIA_INJECTION_DECORATOR_EXPORTS,
  );
}

/** Recognize one decorator that delegates to Aurelia's `inject(...)` metadata writer. */
export function readAureliaInjectionDecorator(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
  typeSystem: TypeSystemProject | null = null,
): DiInjectionDecoratorMetadata | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    const exportName = readImportedExportName(expression.expression, bindings, true)
      ?? readAureliaInjectionExportFromTypeSystem(expression.expression, typeSystem);
    if (exportName == null) {
      return null;
    }
    return exportName === 'inject'
      ? new DiInjectionDecoratorMetadata(
          DiInjectionDecoratorKind.Inject,
          exportName,
          decorator,
          expression.arguments,
        )
      : isCallableInjectionResolverExport(exportName)
        ? new DiInjectionDecoratorMetadata(
            DiInjectionDecoratorKind.Resolver,
            exportName,
            decorator,
            [expression],
          )
        : null;
  }
  const exportName = readImportedExportName(
    expression,
    bindings,
    BARE_INJECTION_DECORATOR_EXPORTS,
  ) ?? readAureliaInjectionExportFromTypeSystem(
    expression,
    typeSystem,
    BARE_INJECTION_DECORATOR_EXPORTS,
  );
  return exportName == null
    ? null
    : new DiInjectionDecoratorMetadata(
        DiInjectionDecoratorKind.Resolver,
        exportName,
        decorator,
        [expression],
      );
}

/** Read the class-local source writes that participate in Aurelia's annotation dependency array. */
export function readClassInjectionMetadata(
  declaration: ts.ClassLikeDeclaration,
  typeSystem: TypeSystemProject | null = null,
): DiClassInjectionMetadata {
  const bindings = readAureliaInjectionBindings(declaration.getSourceFile());
  const classDecorators = (ts.getDecorators(declaration) ?? [])
    .map((decorator) => readAureliaInjectionDecorator(decorator, bindings, typeSystem))
    .filter((metadata): metadata is DiInjectionDecoratorMetadata => metadata != null);
  const fieldDecorators = declaration.members.flatMap((member) =>
    !ts.isPropertyDeclaration(member) || hasAccessorModifier(member)
      ? []
      : (ts.getDecorators(member) ?? []).flatMap((decorator) => {
          const metadata = readAureliaInjectionDecorator(decorator, bindings, typeSystem);
          return metadata == null
            ? []
            : [new DiNamedInjectionDecoratorMetadata(
                readPropertyName(member.name),
                metadata,
              )];
        })
  );
  return new DiClassInjectionMetadata(
    classDecorators.length > 0 || fieldDecorators.length > 0,
    classDecorators,
    fieldDecorators,
  );
}

/** Read the decorator ABI selected by the owning TypeScript Program. */
export function diClassDecoratorModeForTypeSystem(
  typeSystem: TypeSystemProject,
): DiClassDecoratorMode {
  return typeSystem.program.getCompilerOptions().experimentalDecorators === true
    ? DiClassDecoratorMode.Legacy
    : DiClassDecoratorMode.Standard;
}

/**
 * Determine whether TypeScript emits own legacy constructor-type metadata for one class.
 *
 * This mirrors the transform's `classOrConstructorParameterIsDecorated` and
 * `shouldAddParamTypesMetadata` gates without trying to duplicate TypeScript's runtime type
 * serializer. `Empty` remains distinct because Aurelia treats an own empty metadata array as a
 * local dependency authority rather than inheriting the superclass plan.
 */
export function designParamTypesMetadataState(
  declaration: ts.ClassLikeDeclaration,
  typeSystem: TypeSystemProject,
): DiDesignParamTypesMetadataState {
  const options = typeSystem.program.getCompilerOptions();
  if (
    options.experimentalDecorators !== true
    || options.emitDecoratorMetadata !== true
    || !ts.isClassDeclaration(declaration)
  ) {
    return DiDesignParamTypesMetadataState.Absent;
  }
  const constructor = declaration.members.find((member): member is ts.ConstructorDeclaration =>
    ts.isConstructorDeclaration(member) && member.body != null
  ) ?? null;
  if (constructor == null || !classOrConstructorParameterHasLegacyDecorator(declaration, constructor)) {
    return DiDesignParamTypesMetadataState.Absent;
  }
  return constructor.parameters.length === 0
    ? DiDesignParamTypesMetadataState.Empty
    : DiDesignParamTypesMetadataState.Present;
}

function classOrConstructorParameterHasLegacyDecorator(
  declaration: ts.ClassDeclaration,
  constructor: ts.ConstructorDeclaration,
): boolean {
  return (ts.getDecorators(declaration)?.length ?? 0) > 0
    || constructor.parameters.some((parameter) =>
      (ts.getDecorators(parameter)?.length ?? 0) > 0
    );
}

function isCallableInjectionResolverExport(
  exportName: string,
): exportName is Exclude<DiAureliaResolverExportName, 'last'> {
  return exportName !== 'last'
    && Object.hasOwn(AURELIA_RESOLVER_KEY_KIND_BY_EXPORT, exportName);
}

function readAureliaInjectionExportFromTypeSystem(
  expression: ts.Expression,
  typeSystem: TypeSystemProject | null,
  allowedExports: ReadonlySet<string> = AURELIA_INJECTION_DECORATOR_EXPORTS,
): string | null {
  if (typeSystem == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  const name = ts.isPropertyAccessExpression(current) ? current.name : current;
  // Evaluator/source-discovery nodes are generation-local; only the TypeSystemProject may pair
  // their Program-owned counterparts with its checker.
  const symbol = typeSystem.readProgramAliasedSymbolAtLocation(name);
  const exportName = symbol?.getName() ?? null;
  if (
    exportName == null
    || !allowedExports.has(exportName)
    || !(symbol?.declarations ?? []).some(isAureliaInjectionDeclaration)
  ) {
    return null;
  }
  return exportName;
}

function isAureliaInjectionDeclaration(
  declaration: ts.Declaration,
): boolean {
  const sourcePath = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  return sourcePath.includes('/aurelia/packages/kernel/src/di.ts')
    || sourcePath.includes('/aurelia/packages/kernel/src/di.resolvers.ts')
    || sourcePath.includes('/aurelia/packages/kernel/dist/types/di.d.ts')
    || sourcePath.includes('/aurelia/packages/kernel/dist/types/di.resolvers.d.ts')
    || sourcePath.includes('/@aurelia/kernel/')
    || sourcePath.includes('/@aurelia+kernel/');
}
