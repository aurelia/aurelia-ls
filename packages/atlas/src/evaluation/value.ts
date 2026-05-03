import type ts from "typescript";

/** Evaluator-local value category. */
export const enum EvaluationValueKind {
  /** Value that could not be reduced without guessing. */
  Unknown = "unknown",
  /** ECMAScript undefined. */
  Undefined = "undefined",
  /** ECMAScript null. */
  Null = "null",
  /** Boolean primitive. */
  Boolean = "boolean",
  /** Number primitive. */
  Number = "number",
  /** BigInt literal represented as source text. */
  BigInt = "bigint",
  /** String primitive. */
  String = "string",
  /** Array value with evaluator-local element values. */
  Array = "array",
  /** Object value with evaluator-local properties. */
  Object = "object",
  /** Function-like value that can be called by the local evaluator. */
  Function = "function",
  /** Class-like value; constructor execution is intentionally outside this substrate. */
  Class = "class",
  /** Module namespace value assembled from a linked module record. */
  ModuleNamespace = "module-namespace",
}

/** Unknown value carrying why evaluation stayed open. */
export class EvaluationUnknownValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Unknown;

  constructor(
    /** Short reason the value could not close. */
    readonly reason: string,
    /** Syntax node whose evaluation produced the unknown value. */
    readonly node: ts.Node | null = null,
    /** True when an explicit open seam has already been recorded. */
    readonly hasOpenSeam: boolean = false,
  ) {}
}

/** Undefined primitive value. */
export class EvaluationUndefinedValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Undefined;

  constructor(
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Null primitive value. */
export class EvaluationNullValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Null;

  constructor(
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Boolean primitive value. */
export class EvaluationBooleanValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Boolean;

  constructor(
    /** Concrete boolean value. */
    readonly value: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Number primitive value. */
export class EvaluationNumberValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Number;

  constructor(
    /** Concrete numeric value. */
    readonly value: number,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** BigInt literal value represented without host BigInt coercion. */
export class EvaluationBigIntValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.BigInt;

  constructor(
    /** BigInt literal text as authored. */
    readonly text: string,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** String primitive value. */
export class EvaluationStringValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.String;

  constructor(
    /** Concrete string value. */
    readonly value: string,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** One array element and its source expression. */
export class EvaluationArrayElement {
  constructor(
    /** Element value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source expression that produced this element, when one exists. */
    readonly expression: ts.Expression | null,
  ) {}
}

/** Array value with known elements and explicit openness for spread/hole pressure. */
export class EvaluationArrayValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Array;

  constructor(
    /** Concrete element values in array order. */
    readonly elements: readonly EvaluationArrayElement[],
    /** True when spread or holes prevented exact element closure. */
    readonly mayHaveUnknownElements: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** One object property and its source node. */
export class EvaluationObjectProperty {
  constructor(
    /** Property name after local key evaluation. */
    readonly name: string,
    /** Property value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source node that produced the property. */
    readonly node: ts.Node,
  ) {}
}

/** Object value with known own properties and explicit spread/computed openness. */
export class EvaluationObjectValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Object;

  constructor(
    /** Known own properties by string key. */
    readonly properties: ReadonlyMap<string, EvaluationObjectProperty>,
    /** True when spread or computed keys prevented exact property closure. */
    readonly mayHaveUnknownProperties: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Function-like value with its captured evaluator environment. */
export class EvaluationFunctionValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Function;

  constructor(
    /** Function-like declaration captured by this value. */
    readonly declaration: ts.FunctionLikeDeclaration,
    /** Captured environment used for simple local calls. */
    readonly environment: import("./environment.js").EvaluationEnvironment,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Class-like value; class bodies are not executed by static evaluation. */
export class EvaluationClassValue {
  /** Value category discriminator. */
  readonly kind = EvaluationValueKind.Class;

  constructor(
    /** Class declaration or expression represented by this value. */
    readonly declaration: ts.ClassLikeDeclaration,
    /** Captured environment available to later class-aware readers. */
    readonly environment: import("./environment.js").EvaluationEnvironment,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Module namespace assembled from linked exports. */
export class EvaluationModuleNamespaceValue {
  /** Value category discriminator. */
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

/** Evaluator-local value union. */
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

/** Shared undefined value for missing expression results. */
export const EvaluationUndefined = new EvaluationUndefinedValue();

/** Return concrete truthiness when it is statically knowable. */
export function readEvaluationTruthiness(
  /** Evaluator-local value to inspect. */
  value: EvaluationValue,
): boolean | null {
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
      return value.text !== "0n";
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

/** Return a property key string when a value can serve as a static property name. */
export function readEvaluationPropertyKey(
  /** Evaluator-local value to convert. */
  value: EvaluationValue,
): string | null {
  switch (value.kind) {
    case EvaluationValueKind.String:
      return value.value;
    case EvaluationValueKind.Number:
      return String(value.value);
    case EvaluationValueKind.Boolean:
      return String(value.value);
    default:
      return null;
  }
}
