import type ts from 'typescript';
import type { EvaluationEnvironmentRecordReference } from './environment-reference.js';

export const enum EvaluationValueKind {
  /** Value that could not be reduced without guessing. */
  Unknown = 'unknown',
  /** ECMAScript undefined value. */
  Undefined = 'undefined',
  /** ECMAScript null value. */
  Null = 'null',
  /** ECMAScript boolean primitive. */
  Boolean = 'boolean',
  /** ECMAScript number primitive. */
  Number = 'number',
  /** ECMAScript bigint primitive. */
  BigInt = 'bigint',
  /** ECMAScript string primitive. */
  String = 'string',
  /** Array value with evaluator-local element values. */
  Array = 'array',
  /** Object value with evaluator-local property values. */
  Object = 'object',
  /** Function-like value whose body may be evaluated by the local evaluator. */
  Function = 'function',
  /** Class-like value; class bodies are not executed by this substrate. */
  Class = 'class',
  /** Module namespace value assembled from a linked module record. */
  ModuleNamespace = 'module-namespace',
}

/** Unknown value carrying the reason evaluation stayed open. */
export class EvaluationUnknownValue {
  readonly kind = EvaluationValueKind.Unknown;

  constructor(
    /** Explanation of why this value could not be reduced. */
    readonly reason: string,
    /** Syntax node whose evaluation produced the unknown value. */
    readonly node: ts.Node | null = null,
    /** Whether an explicit open seam has already been recorded for this unknown. */
    readonly hasOpenSeam: boolean = false,
  ) {}
}

/** Undefined primitive. */
export class EvaluationUndefinedValue {
  readonly kind = EvaluationValueKind.Undefined;

  constructor(
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Null primitive. */
export class EvaluationNullValue {
  readonly kind = EvaluationValueKind.Null;

  constructor(
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Boolean primitive. */
export class EvaluationBooleanValue {
  readonly kind = EvaluationValueKind.Boolean;

  constructor(
    /** Concrete boolean value. */
    readonly value: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Number primitive. */
export class EvaluationNumberValue {
  readonly kind = EvaluationValueKind.Number;

  constructor(
    /** Concrete numeric value. */
    readonly value: number,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** BigInt primitive represented as text to avoid host BigInt serialization pressure. */
export class EvaluationBigIntValue {
  readonly kind = EvaluationValueKind.BigInt;

  constructor(
    /** Literal bigint text without interpretation by downstream kernel records. */
    readonly text: string,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** String primitive. */
export class EvaluationStringValue {
  readonly kind = EvaluationValueKind.String;

  constructor(
    /** Concrete string value. */
    readonly value: string,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** One array element and the expression that produced it. */
export class EvaluationArrayElement {
  constructor(
    /** Element value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source expression that produced this element, when one exists. */
    readonly expression: ts.Expression | null,
  ) {}
}

/** Array value with element-level evaluator values. */
export class EvaluationArrayValue {
  readonly kind = EvaluationValueKind.Array;

  constructor(
    /** Concrete element values in array order. */
    readonly elements: readonly EvaluationArrayElement[],
    /** Whether a spread or hole prevented exact element closure. */
    readonly mayHaveUnknownElements: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** One object property and the expression or method that produced it. */
export class EvaluationObjectProperty {
  constructor(
    /** Property name after local key evaluation. */
    readonly name: string,
    /** Property value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source node that produced this property. */
    readonly node: ts.Node,
  ) {}
}

/** Object value with evaluator-local property values. */
export class EvaluationObjectValue {
  readonly kind = EvaluationValueKind.Object;

  constructor(
    /** Known own properties by string key. */
    readonly properties: Map<string, EvaluationObjectProperty>,
    /** Whether a spread or computed key prevented exact property closure. */
    readonly mayHaveUnknownProperties: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Function-like value that can be interpreted when its body is simple enough. */
export class EvaluationFunctionValue {
  readonly kind = EvaluationValueKind.Function;

  constructor(
    /** Function-like declaration captured by this value. */
    readonly declaration: ts.FunctionLikeDeclaration,
    /** Captured environment record used for local calls. */
    readonly environment: EvaluationEnvironmentRecordReference,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Class value; static fields, decorators, and constructors are not executed here. */
export class EvaluationClassValue {
  readonly kind = EvaluationValueKind.Class;

  constructor(
    /** Class declaration or expression represented by this value. */
    readonly declaration: ts.ClassLikeDeclaration,
    /** Captured environment record available to later class-aware materializers. */
    readonly environment: EvaluationEnvironmentRecordReference,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Module namespace assembled from linked exports. */
export class EvaluationModuleNamespaceValue {
  readonly kind = EvaluationValueKind.ModuleNamespace;

  constructor(
    /** Module key whose exports are represented by this namespace. */
    readonly moduleKey: string,
    /** Export values by exported name. */
    readonly exports: ReadonlyMap<string, EvaluationValue>,
    /** Syntax node that produced the namespace, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Concrete primitive value classes that can be safely converted to JS primitive values. */
export type EvaluationPrimitiveValue =
  | EvaluationUndefinedValue
  | EvaluationNullValue
  | EvaluationBooleanValue
  | EvaluationNumberValue
  | EvaluationStringValue;

/** Evaluator-local value union. These values are not kernel records. */
export type EvaluationValue =
  | EvaluationUnknownValue
  | EvaluationUndefinedValue
  | EvaluationNullValue
  | EvaluationBooleanValue
  | EvaluationNumberValue
  | EvaluationBigIntValue
  | EvaluationStringValue
  | EvaluationArrayValue
  | EvaluationObjectValue
  | EvaluationFunctionValue
  | EvaluationClassValue
  | EvaluationModuleNamespaceValue;

/** Shared undefined value for statement completions without a source expression. */
export const EvaluationUndefined = new EvaluationUndefinedValue();

/** Return concrete boolean truthiness when the value is statically knowable. */
export function readEvaluationTruthiness(value: EvaluationValue): boolean | null {
  switch (value.kind) {
    case EvaluationValueKind.Unknown:
      return null;
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
      return false;
    case EvaluationValueKind.Boolean:
      return value.value;
    case EvaluationValueKind.Number:
      return value.value !== 0 && !Number.isNaN(value.value);
    case EvaluationValueKind.BigInt:
      return value.text !== '0n';
    case EvaluationValueKind.String:
      return value.value.length > 0;
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.ModuleNamespace:
      return true;
  }
}

/** Return whether this value is a concrete primitive. */
export function isEvaluationPrimitiveValue(value: EvaluationValue): value is EvaluationPrimitiveValue {
  switch (value.kind) {
    case EvaluationValueKind.String:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Undefined:
      return true;
    default:
      return false;
  }
}

/** Return primitive values for operators that only accept concrete primitives in this evaluator. */
export function readEvaluationPrimitive(value: EvaluationPrimitiveValue): string | number | boolean | null | undefined {
  switch (value.kind) {
    case EvaluationValueKind.String:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.Boolean:
      return value.value;
    case EvaluationValueKind.Null:
      return null;
    case EvaluationValueKind.Undefined:
      return undefined;
  }
}
