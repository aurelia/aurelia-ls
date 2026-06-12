import type ts from 'typescript';
import {
  mapExpressionPrimitiveLiteralValue,
  type ExpressionPrimitiveLiteralValue,
} from '../expression/ast.js';
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
  /** String-shaped value with known static text parts and dynamic boundary holes. */
  StringPattern = 'string-pattern',
  /** RegExp object produced by a regular-expression literal. */
  RegularExpression = 'regular-expression',
  /** Date object produced by a deterministic Date constructor form. */
  Date = 'date',
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
  /** Runtime binding-scope value such as a repeat local or runtime-only view-model slot. */
  BindingScope = 'binding-scope',
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

/** Date object with a deterministic UTC epoch value. */
export class EvaluationDateValue {
  readonly kind = EvaluationValueKind.Date;

  constructor(
    /** ECMAScript time value in milliseconds since the epoch. */
    readonly epochMilliseconds: number,
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

export const enum EvaluationArrayUncertaintyKind {
  /** Array membership depends on a boundary value such as host environment, external module, or binding scope state. */
  BoundarySpread = 'boundary-spread',
  /** Array membership depends on a dynamic conditional branch whose chosen lane is not statically known. */
  ConditionalBranch = 'conditional-branch',
  /** Array membership includes an elision hole, so the evaluator cannot treat every slot as an authored element. */
  OmittedElement = 'omitted-element',
  /** Array membership depends on a spread value that did not reduce to an evaluator-local Array. */
  NonArraySpread = 'non-array-spread',
  /** Array order depends on an operation that could not be reduced to exact static ordering. */
  UnknownOrder = 'unknown-order',
}

export interface EvaluationArrayUncertainty {
  readonly kind: EvaluationArrayUncertaintyKind;
  readonly node: ts.Node | null;
  readonly boundaryKind?: EvaluationBoundaryKind;
  readonly boundaryPath?: string;
}

const emptyEvaluationArrayUncertainties: readonly EvaluationArrayUncertainty[] = [];

/** Array value with element-level evaluator values. */
export class EvaluationArrayValue {
  readonly kind = EvaluationValueKind.Array;
  readonly elements: EvaluationArrayElement[];
  uncertainties: readonly EvaluationArrayUncertainty[];

  constructor(
    /** Concrete element values in array order. */
    elements: readonly EvaluationArrayElement[],
    /** Whether a spread or hole prevented exact element closure. */
    public mayHaveUnknownElements: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Whether membership is known but order was affected by an unclosed ordering operation. */
    public mayHaveUnknownOrder: boolean = false,
    /** Compact local reasons for unknown membership/order, kept out of durable kernel records. */
    uncertainties: readonly EvaluationArrayUncertainty[] = emptyEvaluationArrayUncertainties,
  ) {
    this.elements = [...elements];
    this.uncertainties = uncertainties.length === 0
      ? emptyEvaluationArrayUncertainties
      : uniqueEvaluationArrayUncertainties(uncertainties);
  }

  /** Mark the array as having element membership or values that static evaluation could not close. */
  markUnknownElements(uncertainty: EvaluationArrayUncertainty | null = null): void {
    this.mayHaveUnknownElements = true;
    if (uncertainty != null) {
      this.appendUncertainty(uncertainty);
    }
  }

  /** Mark the array as having an ordering operation that static evaluation could not close. */
  markUnknownOrder(uncertainty: EvaluationArrayUncertainty | null = null): void {
    this.mayHaveUnknownOrder = true;
    if (uncertainty != null) {
      this.appendUncertainty(uncertainty);
    }
  }

  /** Replace known element order after a mutating array operation such as sort. */
  replaceElementOrder(
    elements: readonly EvaluationArrayElement[],
    mayHaveUnknownOrder: boolean,
  ): void {
    this.elements.splice(0, this.elements.length, ...elements);
    this.mayHaveUnknownOrder ||= mayHaveUnknownOrder;
  }

  private appendUncertainty(
    uncertainty: EvaluationArrayUncertainty,
  ): void {
    if (this.uncertainties === emptyEvaluationArrayUncertainties) {
      this.uncertainties = [];
    }
    appendEvaluationArrayUncertainty(this.uncertainties as EvaluationArrayUncertainty[], uncertainty);
  }
}

export function evaluationArrayBoundarySpreadUncertainty(
  value: EvaluationBoundaryValue,
  node: ts.Node | null,
): EvaluationArrayUncertainty {
  return {
    kind: EvaluationArrayUncertaintyKind.BoundarySpread,
    node,
    boundaryKind: value.boundaryKind,
    boundaryPath: value.path,
  };
}

export function evaluationArrayUncertaintySummaries(
  value: EvaluationArrayValue,
): readonly string[] {
  return value.uncertainties.map((uncertainty) => {
    switch (uncertainty.kind) {
      case EvaluationArrayUncertaintyKind.BoundarySpread:
        return uncertainty.boundaryPath == null
          ? 'membership depends on a boundary spread'
          : `membership depends on boundary spread ${uncertainty.boundaryPath}`;
      case EvaluationArrayUncertaintyKind.ConditionalBranch:
        return uncertainty.boundaryPath == null
          ? 'membership depends on a dynamic conditional branch'
          : `membership depends on conditional branch ${uncertainty.boundaryPath}`;
      case EvaluationArrayUncertaintyKind.OmittedElement:
        return 'membership includes an elision hole';
      case EvaluationArrayUncertaintyKind.NonArraySpread:
        return 'membership depends on a spread value that did not reduce to an array';
      case EvaluationArrayUncertaintyKind.UnknownOrder:
        return 'ordering depends on an operation the evaluator could not close';
    }
  });
}

export function mergeEvaluationArrayUncertainties(
  ...sources: readonly (EvaluationArrayValue | readonly EvaluationArrayUncertainty[])[]
): readonly EvaluationArrayUncertainty[] {
  const uncertainties: EvaluationArrayUncertainty[] = [];
  for (const source of sources) {
    const sourceUncertainties = source instanceof EvaluationArrayValue
      ? source.uncertainties
      : source;
    for (const uncertainty of sourceUncertainties) {
      appendEvaluationArrayUncertainty(uncertainties, uncertainty);
    }
  }
  return uncertainties;
}

function uniqueEvaluationArrayUncertainties(
  uncertainties: readonly EvaluationArrayUncertainty[],
): EvaluationArrayUncertainty[] {
  const unique: EvaluationArrayUncertainty[] = [];
  for (const uncertainty of uncertainties) {
    appendEvaluationArrayUncertainty(unique, uncertainty);
  }
  return unique;
}

function appendEvaluationArrayUncertainty(
  target: EvaluationArrayUncertainty[],
  uncertainty: EvaluationArrayUncertainty,
): void {
  const key = evaluationArrayUncertaintyKey(uncertainty);
  if (target.some((entry) => evaluationArrayUncertaintyKey(entry) === key)) {
    return;
  }
  target.push(uncertainty);
}

function evaluationArrayUncertaintyKey(
  uncertainty: EvaluationArrayUncertainty,
): string {
  return [
    uncertainty.kind,
    uncertainty.boundaryKind ?? '',
    uncertainty.boundaryPath ?? '',
    uncertainty.node?.pos ?? '',
    uncertainty.node?.end ?? '',
  ].join(':');
}

export const enum EvaluationObjectUncertaintyKind {
  /** Object properties include a spread from a host, external-module, async, or binding-scope boundary. */
  BoundarySpread = 'boundary-spread',
  /** Object properties include a computed key whose property name did not close statically. */
  ComputedProperty = 'computed-property',
  /** Object properties depend on a spread value that did not reduce to an evaluator-local Object. */
  NonObjectSpread = 'non-object-spread',
  /** Object properties include a member shape the evaluator has not modeled yet. */
  UnsupportedMember = 'unsupported-member',
}

export interface EvaluationObjectUncertainty {
  readonly kind: EvaluationObjectUncertaintyKind;
  readonly node: ts.Node | null;
  readonly boundaryKind?: EvaluationBoundaryKind;
  readonly boundaryPath?: string;
}

const emptyEvaluationObjectUncertainties: readonly EvaluationObjectUncertainty[] = [];

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
    readonly node: ts.Node | null,
  ) {}
}

/** Object value with evaluator-local property values. */
export class EvaluationObjectValue {
  readonly kind = EvaluationValueKind.Object;
  readonly uncertainties: readonly EvaluationObjectUncertainty[];

  constructor(
    /** Known own properties by string key. */
    readonly properties: Map<string, EvaluationObjectProperty>,
    /** Whether a spread or computed key prevented exact property closure. */
    readonly mayHaveUnknownProperties: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Compact local reasons for unknown property membership, kept out of durable kernel records. */
    uncertainties: readonly EvaluationObjectUncertainty[] = emptyEvaluationObjectUncertainties,
  ) {
    this.uncertainties = uncertainties.length === 0
      ? emptyEvaluationObjectUncertainties
      : uniqueEvaluationObjectUncertainties(uncertainties);
  }
}

export function evaluationObjectBoundarySpreadUncertainty(
  value: EvaluationBoundaryValue | EvaluationBoundaryObjectValue,
  node: ts.Node | null,
): EvaluationObjectUncertainty {
  return {
    kind: EvaluationObjectUncertaintyKind.BoundarySpread,
    node,
    boundaryKind: value.boundaryKind,
    boundaryPath: value.path,
  };
}

export function evaluationObjectUncertaintySummaries(
  value: EvaluationObjectValue,
): readonly string[] {
  return value.uncertainties.map((uncertainty) => {
    switch (uncertainty.kind) {
      case EvaluationObjectUncertaintyKind.BoundarySpread:
        return uncertainty.boundaryPath == null
          ? 'properties depend on a boundary spread'
          : `properties depend on boundary spread ${uncertainty.boundaryPath}`;
      case EvaluationObjectUncertaintyKind.ComputedProperty:
        return 'properties include a computed key that did not close statically';
      case EvaluationObjectUncertaintyKind.NonObjectSpread:
        return 'properties depend on a spread value that did not reduce to an object';
      case EvaluationObjectUncertaintyKind.UnsupportedMember:
        return 'properties include an object member the evaluator has not modeled yet';
    }
  });
}

export function mergeEvaluationObjectUncertainties(
  ...sources: readonly (EvaluationObjectValue | readonly EvaluationObjectUncertainty[])[]
): readonly EvaluationObjectUncertainty[] {
  const uncertainties: EvaluationObjectUncertainty[] = [];
  for (const source of sources) {
    const sourceUncertainties = source instanceof EvaluationObjectValue
      ? source.uncertainties
      : source;
    for (const uncertainty of sourceUncertainties) {
      appendEvaluationObjectUncertainty(uncertainties, uncertainty);
    }
  }
  return uncertainties;
}

function uniqueEvaluationObjectUncertainties(
  uncertainties: readonly EvaluationObjectUncertainty[],
): EvaluationObjectUncertainty[] {
  const unique: EvaluationObjectUncertainty[] = [];
  for (const uncertainty of uncertainties) {
    appendEvaluationObjectUncertainty(unique, uncertainty);
  }
  return unique;
}

function appendEvaluationObjectUncertainty(
  target: EvaluationObjectUncertainty[],
  uncertainty: EvaluationObjectUncertainty,
): void {
  const key = evaluationObjectUncertaintyKey(uncertainty);
  if (target.some((entry) => evaluationObjectUncertaintyKey(entry) === key)) {
    return;
  }
  target.push(uncertainty);
}

function evaluationObjectUncertaintyKey(
  uncertainty: EvaluationObjectUncertainty,
): string {
  return [
    uncertainty.kind,
    uncertainty.boundaryKind ?? '',
    uncertainty.boundaryPath ?? '',
    uncertainty.node?.pos ?? '',
    uncertainty.node?.end ?? '',
  ].join(':');
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
      case EvaluationBoundaryKind.BindingScope:
        return `${this.path} is supplied by the runtime binding scope.`;
    }
  }
}

/** One dynamic hole inside a string pattern. */
export class EvaluationStringPatternHole {
  constructor(
    /** Boundary value that produced this dynamic string hole. */
    readonly value: EvaluationBoundaryValue,
  ) {}
}

/** String-shaped value whose static parts are known while one or more holes are runtime supplied. */
export class EvaluationStringPatternValue {
  readonly kind = EvaluationValueKind.StringPattern;
  readonly parts: readonly string[];
  readonly holes: readonly EvaluationStringPatternHole[];

  constructor(
    /** Static text parts. Length is always one greater than `holes.length`. */
    parts: readonly string[],
    /** Dynamic boundary holes interleaved between the static parts. */
    holes: readonly EvaluationStringPatternHole[],
    /** Syntax node that produced the pattern, when one exists. */
    readonly node: ts.Node | null = null,
  ) {
    this.parts = [...parts];
    this.holes = [...holes];
  }
}

/** Builder for string-shaped values with optional dynamic boundary holes. */
export class EvaluationStringPatternBuilder {
  private readonly parts: string[];
  private readonly holes: EvaluationStringPatternHole[] = [];

  constructor(
    head: string,
  ) {
    this.parts = [head];
  }

  appendStatic(text: string): void {
    this.parts[this.parts.length - 1] = `${this.parts[this.parts.length - 1] ?? ''}${text}`;
  }

  appendBoundary(value: EvaluationBoundaryValue, tail: string): void {
    this.holes.push(new EvaluationStringPatternHole(value));
    this.parts.push(tail);
  }

  appendPattern(value: EvaluationStringPatternValue, tail: string): void {
    this.appendStatic(value.parts[0] ?? '');
    for (let index = 0; index < value.holes.length; index += 1) {
      this.holes.push(value.holes[index]!);
      this.parts.push(value.parts[index + 1] ?? '');
    }
    this.appendStatic(tail);
  }

  build(node: ts.Node | null): EvaluationStringValue | EvaluationStringPatternValue {
    return this.holes.length === 0
      ? new EvaluationStringValue(this.parts.join(''), node)
      : new EvaluationStringPatternValue(this.parts, this.holes, node);
  }
}

/** Append a value into a string-pattern builder when ECMAScript string interpolation/concatenation can consume it. */
export function appendEvaluationStringLikePart(
  builder: EvaluationStringPatternBuilder,
  value: EvaluationValue,
  tail: string,
): boolean {
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    builder.appendBoundary(value, tail);
    return true;
  }
  if (value.kind === EvaluationValueKind.StringPattern) {
    builder.appendPattern(value, tail);
    return true;
  }
  if (!isEvaluationPrimitiveValue(value)) {
    return false;
  }
  builder.appendStatic(String(readEvaluationPrimitive(value)) + tail);
  return true;
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

export type EvaluationExpressionPrimitiveValue = ExpressionPrimitiveLiteralValue;

export function evaluationPrimitiveValueFromExpressionValue(
  value: EvaluationExpressionPrimitiveValue,
  node: ts.Node | null = null,
): EvaluationPrimitiveValue {
  return mapExpressionPrimitiveLiteralValue<EvaluationPrimitiveValue>(value, {
    string: (stringValue) => new EvaluationStringValue(stringValue, node),
    number: (numberValue) => new EvaluationNumberValue(numberValue, node),
    boolean: (booleanValue) => new EvaluationBooleanValue(booleanValue, node),
    null: () => new EvaluationNullValue(node),
    undefined: () => node == null ? EvaluationUndefined : new EvaluationUndefinedValue(node),
  });
}

/** Evaluator-local value union. These values are not kernel records. */
export type EvaluationValue =
  | EvaluationUnknownValue
  | EvaluationUndefinedValue
  | EvaluationNullValue
  | EvaluationBooleanValue
  | EvaluationNumberValue
  | EvaluationBigIntValue
  | EvaluationStringValue
  | EvaluationStringPatternValue
  | EvaluationRegularExpressionValue
  | EvaluationDateValue
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

/** Return parts for values that can participate in string-pattern concatenation. */
export function readEvaluationStringLikeParts(
  value: EvaluationValue,
): { readonly parts: readonly string[]; readonly holes: readonly EvaluationStringPatternHole[] } | null {
  if (value.kind === EvaluationValueKind.String) {
    return { parts: [value.value], holes: [] };
  }
  if (value.kind === EvaluationValueKind.StringPattern) {
    return { parts: value.parts, holes: value.holes };
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return { parts: ['', ''], holes: [new EvaluationStringPatternHole(value)] };
  }
  return null;
}

/** Build a string-pattern concatenation when at least one side has a dynamic hole. */
export function evaluationStringPatternFromConcatenation(
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node | null,
): EvaluationStringPatternValue | null {
  const leftParts = readEvaluationStringLikeParts(left);
  const rightParts = readEvaluationStringLikeParts(right);
  if (leftParts == null || rightParts == null) {
    return null;
  }
  const holes = [...leftParts.holes, ...rightParts.holes];
  if (holes.length === 0) {
    return null;
  }
  const parts = [...leftParts.parts];
  parts[parts.length - 1] = `${parts.at(-1) ?? ''}${rightParts.parts[0] ?? ''}`;
  parts.push(...rightParts.parts.slice(1));
  return new EvaluationStringPatternValue(parts, holes, node);
}

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
    case EvaluationValueKind.StringPattern:
      return value.parts.some((part) => part.length > 0) ? true : null;
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
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
    case EvaluationValueKind.StringPattern:
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
