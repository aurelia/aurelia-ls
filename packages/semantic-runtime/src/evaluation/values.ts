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
  /** RegExp object produced by a regular-expression literal. */
  RegularExpression = 'regular-expression',
  /** Array value with evaluator-local element values. */
  Array = 'array',
  /** Set value with evaluator-local membership. */
  Set = 'set',
  /** Map value with evaluator-local key/value entries. */
  Map = 'map',
  /** Object value with evaluator-local property values. */
  Object = 'object',
  /** Boundary object whose identity is known but whose property values belong outside local static evaluation. */
  BoundaryObject = 'boundary-object',
  /** Boundary value whose static value is intentionally unavailable to local static evaluation. */
  BoundaryValue = 'boundary-value',
  /** Function-like value whose body may be evaluated by the local evaluator. */
  Function = 'function',
  /** Class-like value; class bodies are not executed by this substrate. */
  Class = 'class',
  /** Instance value produced by evaluator-local class construction. */
  Instance = 'instance',
  /** Module namespace value assembled from a linked module record. */
  ModuleNamespace = 'module-namespace',
  /** Promise-like value with a statically known fulfillment lane. */
  Promise = 'promise',
}

export const enum EvaluationBoundaryKind {
  /** Browser, Node, or bundler host state such as `window` or `process.env`. */
  HostEnvironment = 'host-environment',
  /** Package import that remains outside the local authored-source graph. */
  ExternalModule = 'external-module',
  /** Fulfillment value produced by async control flow the synchronous evaluator did not execute. */
  AsyncExecution = 'async-execution',
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

/** Regular-expression object produced by a literal. */
export class EvaluationRegularExpressionValue {
  readonly kind = EvaluationValueKind.RegularExpression;

  constructor(
    /** Literal pattern text without the surrounding slashes. */
    readonly pattern: string,
    /** Literal flags text after the closing slash. */
    readonly flags: string,
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
  readonly elements: EvaluationArrayElement[];

  constructor(
    /** Concrete element values in array order. */
    elements: readonly EvaluationArrayElement[],
    /** Whether a spread or hole prevented exact element closure. */
    readonly mayHaveUnknownElements: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Whether membership is known but order was affected by an unclosed ordering operation. */
    public mayHaveUnknownOrder: boolean = false,
  ) {
    this.elements = [...elements];
  }

  /** Replace known element order after a mutating array operation such as sort. */
  replaceElementOrder(
    elements: readonly EvaluationArrayElement[],
    mayHaveUnknownOrder: boolean,
  ): void {
    this.elements.splice(0, this.elements.length, ...elements);
    this.mayHaveUnknownOrder ||= mayHaveUnknownOrder;
  }
}

/** Set value with evaluator-local element membership. */
export class EvaluationSetValue {
  readonly kind = EvaluationValueKind.Set;
  readonly elements: EvaluationArrayElement[];

  constructor(
    /** Concrete element values in insertion order. */
    elements: readonly EvaluationArrayElement[],
    /** Whether a spread, non-array iterable, or weak collection prevented exact membership closure. */
    readonly mayHaveUnknownElements: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Whether this represents a WeakSet constructor, where membership cannot be enumerated at runtime. */
    readonly weak: boolean = false,
  ) {
    this.elements = [...elements];
  }
}

/** One Map entry and the expression that produced it. */
export class EvaluationMapEntry {
  constructor(
    /** Entry key after local evaluation. */
    readonly key: EvaluationValue,
    /** Entry value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source expression that produced this entry, when one exists. */
    readonly expression: ts.Expression | null,
  ) {}
}

/** Map value with evaluator-local key/value entries. */
export class EvaluationMapValue {
  readonly kind = EvaluationValueKind.Map;
  readonly entries: EvaluationMapEntry[];

  constructor(
    /** Concrete entries in insertion order. */
    entries: readonly EvaluationMapEntry[],
    /** Whether a spread, malformed entry, non-array iterable, or weak collection prevented exact entry closure. */
    readonly mayHaveUnknownEntries: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Whether this represents a WeakMap constructor, where entries cannot be enumerated at runtime. */
    readonly weak: boolean = false,
  ) {
    this.entries = [...entries];
  }
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

/** Boundary object whose property identities are static while unknown values belong outside local evaluation. */
export class EvaluationBoundaryObjectValue {
  readonly kind = EvaluationValueKind.BoundaryObject;
  readonly properties: Map<string, EvaluationObjectProperty>;

  constructor(
    /** Boundary category that explains why unknown values cannot be reduced locally. */
    readonly boundaryKind: EvaluationBoundaryKind,
    /** Stable boundary path such as `process` or an external module import name. */
    readonly path: string,
    /** Known boundary properties by string key. */
    properties: ReadonlyMap<string, EvaluationObjectProperty> = new Map(),
    /** Source node that introduced the boundary object. */
    readonly node: ts.Node | null = null,
  ) {
    this.properties = new Map(properties);
  }
}

/** Dynamic value provided by a boundary outside local static evaluation. */
export class EvaluationBoundaryValue {
  readonly kind = EvaluationValueKind.BoundaryValue;

  constructor(
    /** Boundary category that explains why the value cannot be reduced locally. */
    readonly boundaryKind: EvaluationBoundaryKind,
    /** Stable boundary path such as `process.env.NODE_ENV` or an external import. */
    readonly path: string,
    /** Source node whose evaluation requested the value. */
    readonly node: ts.Node | null = null,
  ) {}

  get reason(): string {
    switch (this.boundaryKind) {
      case EvaluationBoundaryKind.HostEnvironment:
        return `${this.path} is provided by the host environment.`;
      case EvaluationBoundaryKind.ExternalModule:
        return `${this.path} is provided by an external module boundary.`;
      case EvaluationBoundaryKind.AsyncExecution:
        return `${this.path} is produced by async execution outside synchronous static evaluation.`;
    }
  }
}

/** Function-like value that can be interpreted when its body is simple enough. */
export class EvaluationFunctionValue {
  readonly kind = EvaluationValueKind.Function;
  readonly properties: Map<string, EvaluationObjectProperty>;

  constructor(
    /** Function-like declaration captured by this value. */
    readonly declaration: ts.FunctionLikeDeclaration,
    /** Captured environment record used for local calls. */
    readonly environment: EvaluationEnvironmentRecordReference,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Evaluator-local own properties assigned to the function object. */
    properties: ReadonlyMap<string, EvaluationObjectProperty> = new Map(),
  ) {
    this.properties = new Map(properties);
  }
}

/** Class value with evaluator-local static properties. */
export class EvaluationClassValue {
  readonly kind = EvaluationValueKind.Class;
  readonly properties: Map<string, EvaluationObjectProperty>;

  constructor(
    /** Class declaration or expression represented by this value. */
    readonly declaration: ts.ClassLikeDeclaration,
    /** Captured environment record available to later class-aware materializers. */
    readonly environment: EvaluationEnvironmentRecordReference,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Evaluator-local own/static properties assigned to the class object. */
    properties: ReadonlyMap<string, EvaluationObjectProperty> = new Map(),
  ) {
    this.properties = new Map(properties);
  }
}

/** Instance value produced by `new` over an evaluator-local class value. */
export class EvaluationInstanceValue {
  readonly kind = EvaluationValueKind.Instance;
  readonly properties: Map<string, EvaluationObjectProperty>;

  constructor(
    /** Class value whose constructor/prototype shape produced this instance. */
    readonly classValue: EvaluationClassValue,
    /** Evaluator-local own and prototype-visible instance properties. */
    properties: ReadonlyMap<string, EvaluationObjectProperty> = new Map(),
    /** Whether constructor or field execution left additional instance shape unknown. */
    readonly mayHaveUnknownProperties: boolean = false,
    /** Syntax node that produced the instance, when one exists. */
    readonly node: ts.Node | null = null,
  ) {
    this.properties = new Map(properties);
  }
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

/** Promise-shaped value such as `import(...)` with a statically known fulfillment value. */
export class EvaluationPromiseValue {
  readonly kind = EvaluationValueKind.Promise;

  constructor(
    /** Value that would be observed by promise fulfillment when static evaluation can close it. */
    readonly fulfilledValue: EvaluationValue,
    /** Syntax node that produced the promise, when one exists. */
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
  | EvaluationRegularExpressionValue
  | EvaluationArrayValue
  | EvaluationSetValue
  | EvaluationMapValue
  | EvaluationObjectValue
  | EvaluationBoundaryObjectValue
  | EvaluationBoundaryValue
  | EvaluationFunctionValue
  | EvaluationClassValue
  | EvaluationInstanceValue
  | EvaluationModuleNamespaceValue
  | EvaluationPromiseValue;

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
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    case EvaluationValueKind.BoundaryValue:
      return null;
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
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
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

/** Compare evaluator values using ECMAScript primitive value equality and identity for object-like values. */
export function evaluationValuesEqual(left: EvaluationValue, right: EvaluationValue): boolean {
  if (isEvaluationPrimitiveValue(left) && isEvaluationPrimitiveValue(right)) {
    return readEvaluationPrimitive(left) === readEvaluationPrimitive(right);
  }
  return left === right;
}
