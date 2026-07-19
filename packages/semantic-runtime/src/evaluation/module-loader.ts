import ts from 'typescript';
import { auLink } from '../kernel/au-link.js';
import { readEvaluationEnumerableOwnEntries } from './enumerable-own-properties.js';
import type {
  EvaluationObjectProperty,
  EvaluationValue,
} from './values.js';
import {
  EvaluationValueKind,
} from './values.js';

export const enum ModuleLoaderTransformStatus {
  Analyzed = 'analyzed',
  InvalidInput = 'invalid-input',
  Open = 'open',
}

export const enum ModuleLoaderInputPosition {
  Direct = 'direct',
  PromiseFulfillment = 'promise-fulfillment',
}

/** One export-like entry discovered by ModuleLoader._analyze. */
@auLink('kernel:ModuleItem')
export class ModuleItem {
  constructor(
    readonly key: string,
    readonly value: EvaluationValue,
    readonly isRegistry: boolean,
    readonly isConstructable: boolean,
    /** ResourceDefinition metadata is not attached until resource-definition convergence owns that handoff. */
    readonly definition: null,
    readonly sourceProperty: EvaluationObjectProperty | null = null,
  ) {}
}

/** Result of ModuleLoader._analyze before an optional transform callback is applied. */
@auLink('kernel:AnalyzedModule')
export class AnalyzedModule {
  constructor(
    readonly raw: EvaluationValue,
    readonly items: readonly ModuleItem[],
    /** Additional enumerable module entries may exist beyond `items`. */
    readonly mayHaveUnknownItems: boolean,
    /** Known entries may not occupy their retained relative positions at runtime. */
    readonly mayHaveUnknownOrder: boolean,
  ) {}
}

export class ModuleLoaderTransformIssue {
  constructor(
    readonly value: EvaluationValue,
    readonly position: ModuleLoaderInputPosition,
    readonly message: string,
  ) {}
}

export class ModuleLoaderTransformResult {
  constructor(
    readonly status: ModuleLoaderTransformStatus,
    readonly analyzedModule: AnalyzedModule | null,
    readonly issue: ModuleLoaderTransformIssue | null,
  ) {}

  static analyzed(analyzedModule: AnalyzedModule): ModuleLoaderTransformResult {
    return new ModuleLoaderTransformResult(ModuleLoaderTransformStatus.Analyzed, analyzedModule, null);
  }

  static invalid(issue: ModuleLoaderTransformIssue): ModuleLoaderTransformResult {
    return new ModuleLoaderTransformResult(ModuleLoaderTransformStatus.InvalidInput, null, issue);
  }

  static open(): ModuleLoaderTransformResult {
    return new ModuleLoaderTransformResult(ModuleLoaderTransformStatus.Open, null, null);
  }
}

/** Static counterpart of Aurelia's kernel IModuleLoader service. */
@auLink('kernel:IModuleLoader')
@auLink('kernel:ModuleLoader')
export class ModuleLoader {
  /** Analyze a module-like object or promise-shaped evaluator value using the framework's input branches. */
  load(value: EvaluationValue): ModuleLoaderTransformResult {
    if (value.kind === EvaluationValueKind.Promise) {
      return this.analyze(value.fulfilledValue, ModuleLoaderInputPosition.PromiseFulfillment);
    }
    if (isDirectModuleTransformObject(value)) {
      return this.analyze(value, ModuleLoaderInputPosition.Direct);
    }
    if (isOpenModuleLoaderInput(value)) {
      return ModuleLoaderTransformResult.open();
    }
    return ModuleLoaderTransformResult.invalid(new ModuleLoaderTransformIssue(
      value,
      ModuleLoaderInputPosition.Direct,
      'ModuleLoader.load(...) received a statically closed value that is neither a promise nor a non-null object.',
    ));
  }

  private analyze(
    value: EvaluationValue,
    position: ModuleLoaderInputPosition,
  ): ModuleLoaderTransformResult {
    if (value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
      return ModuleLoaderTransformResult.invalid(new ModuleLoaderTransformIssue(
        value,
        position,
        'ModuleLoader promise fulfillment resolved to a nullish module input.',
      ));
    }
    if (!isAnalyzableObject(value)) {
      return isOpenModuleLoaderInput(value)
        ? ModuleLoaderTransformResult.open()
        : ModuleLoaderTransformResult.analyzed(new AnalyzedModule(value, [], false, false));
    }
    const enumerable = readEvaluationEnumerableOwnEntries(value);
    return ModuleLoaderTransformResult.analyzed(new AnalyzedModule(
      value,
      moduleItemsForEntries(enumerable?.entries ?? []),
      enumerable?.mayHaveUnknownEntries ?? true,
      enumerable?.mayHaveUnknownOrder ?? true,
    ));
  }
}

function isDirectModuleTransformObject(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
      return true;
    default:
      return false;
  }
}

function isAnalyzableObject(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
      return true;
    default:
      return false;
  }
}

function isOpenModuleLoaderInput(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Unknown
    || value.kind === EvaluationValueKind.BoundaryValue;
}

function moduleItemsForEntries(
  entries: NonNullable<ReturnType<typeof readEvaluationEnumerableOwnEntries>>['entries'],
): readonly ModuleItem[] {
  return entries.flatMap((entry) =>
    moduleItemForProperty(entry.name, entry.value, entry.property)
  );
}

function moduleItemForProperty(
  key: string,
  value: EvaluationValue,
  property: EvaluationObjectProperty | null,
): readonly ModuleItem[] {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Instance:
      return [new ModuleItem(key, value, hasRegisterFunction(value.properties), false, null, property)];
    case EvaluationValueKind.Function:
      return [new ModuleItem(key, value, hasRegisterFunction(value.properties), isConstructableFunction(value), null, property)];
    case EvaluationValueKind.Class:
      return [new ModuleItem(key, value, hasRegisterFunction(value.properties), true, null, property)];
    default:
      return [];
  }
}

function hasRegisterFunction(
  properties: ReadonlyMap<string, EvaluationObjectProperty>,
): boolean {
  const register = properties.get('register')?.value ?? null;
  return register?.kind === EvaluationValueKind.Function;
}

function isConstructableFunction(
  value: Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Function }>,
): boolean {
  return ts.isFunctionDeclaration(value.declaration) || ts.isFunctionExpression(value.declaration);
}
