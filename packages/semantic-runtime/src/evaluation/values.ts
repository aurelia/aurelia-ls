import type ts from 'typescript';
import {
  mapExpressionPrimitiveLiteralValue,
  type ExpressionPrimitiveLiteralValue,
} from '../expression/ast.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import type { EvaluationValueEvidence } from './value-pressure.js';

const noEvaluationOpenSeams: readonly EvaluationOpenSeam[] = [];

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
  /** Promise-like value with explicit fulfilled, rejected, or open settlement evidence. */
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

/** Describe why one evaluator value remains owned by a boundary outside local static evaluation. */
export function evaluationBoundaryReason(
  boundaryKind: EvaluationBoundaryKind,
  path: string,
): string {
  switch (boundaryKind) {
    case EvaluationBoundaryKind.HostEnvironment:
      return `${path} is provided by the host environment.`;
    case EvaluationBoundaryKind.ExternalModule:
      return `${path} is provided by an external module boundary.`;
    case EvaluationBoundaryKind.AsyncExecution:
      return `${path} is produced by async execution outside synchronous static evaluation.`;
    case EvaluationBoundaryKind.BindingScope:
      return `${path} is supplied by the runtime binding scope.`;
  }
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
    /** Best-known value retained for semantic projection but forbidden from evaluator execution. */
    readonly retainedCandidate: EvaluationValue | null = null,
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
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Element value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source expression that produced this element, when one exists. */
    readonly expression: ts.Expression | null,
    /** Exact evaluator pressure produced while computing this element. */
    openSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
    /** Runtime array index for this retained present element, or null when position is not statically known. */
    readonly runtimeIndex: number | null = null,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }

  withRuntimeIndex(runtimeIndex: number | null): EvaluationArrayElement {
    return this.runtimeIndex === runtimeIndex
      ? this
      : new EvaluationArrayElement(this.value, this.expression, this.openSeams, runtimeIndex);
  }
}

export const enum EvaluationArrayUncertaintyKind {
  /** Array membership depends on a boundary value such as host environment, external module, or binding scope state. */
  BoundarySpread = 'boundary-spread',
  /** Array membership depends on a dynamic conditional branch whose chosen lane is not statically known. */
  ConditionalBranch = 'conditional-branch',
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

export interface EvaluationArrayShapeInit {
  /** Exact runtime `length`, or null when unknown insertion/removal can change it. */
  readonly exactLength: number | null;
  /** Whether every present element and every hole is known, independently of their final order. */
  readonly hasExactElements: boolean;
  /** Whether retained elements remain in their exact runtime order. */
  readonly hasExactOrder: boolean;
  /** Compact local reasons for any open array axis. */
  readonly uncertainties: readonly EvaluationArrayUncertainty[];
  /** Pressure that prevents runtime `length` from closing. */
  readonly extentOpenSeams: readonly EvaluationOpenSeam[];
  /** Pressure that prevents retained elements from closing to exact positions. */
  readonly elementOpenSeams: readonly EvaluationOpenSeam[];
  /** Pressure that prevents retained elements from closing to exact order. */
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];
}

/** Immutable closure state for the independent axes of one evaluator-local array. */
export class EvaluationArrayShape {
  readonly uncertainties: readonly EvaluationArrayUncertainty[];
  readonly extentOpenSeams: readonly EvaluationOpenSeam[];
  readonly elementOpenSeams: readonly EvaluationOpenSeam[];
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly exactLength: number | null,
    readonly hasExactElements: boolean,
    readonly hasExactOrder: boolean,
    uncertainties: readonly EvaluationArrayUncertainty[],
    extentOpenSeams: readonly EvaluationOpenSeam[],
    elementOpenSeams: readonly EvaluationOpenSeam[],
    orderOpenSeams: readonly EvaluationOpenSeam[],
  ) {
    if (exactLength != null && (!Number.isInteger(exactLength) || exactLength < 0)) {
      throw new Error('An exact evaluator array length must be a non-negative integer.');
    }
    if (hasExactElements && exactLength == null) {
      throw new Error('Exact evaluator array elements require an exact runtime length.');
    }
    this.uncertainties = uncertainties.length === 0
      ? emptyEvaluationArrayUncertainties
      : uniqueEvaluationArrayUncertainties(uncertainties);
    this.extentOpenSeams = compactEvaluationOpenSeams(extentOpenSeams);
    this.elementOpenSeams = compactEvaluationOpenSeams(elementOpenSeams);
    this.orderOpenSeams = compactEvaluationOpenSeams(orderOpenSeams);
  }

  static exact(length: number): EvaluationArrayShape {
    return new EvaluationArrayShape(length, true, true, [], [], [], []);
  }

  static from(init: EvaluationArrayShapeInit): EvaluationArrayShape {
    return new EvaluationArrayShape(
      init.exactLength,
      init.hasExactElements,
      init.hasExactOrder,
      init.uncertainties,
      init.extentOpenSeams,
      init.elementOpenSeams,
      init.orderOpenSeams,
    );
  }

  get hasExactPositions(): boolean {
    return this.hasExactElements && this.hasExactOrder;
  }

  get aggregateOpenSeams(): readonly EvaluationOpenSeam[] {
    return compactEvaluationOpenSeams([
      ...this.extentOpenSeams,
      ...this.elementOpenSeams,
      ...this.orderOpenSeams,
    ]);
  }

  withUnknownExtent(
    openSeams: readonly EvaluationOpenSeam[],
    uncertainty: EvaluationArrayUncertainty | null = null,
  ): EvaluationArrayShape {
    return EvaluationArrayShape.from({
      exactLength: null,
      hasExactElements: false,
      hasExactOrder: this.hasExactOrder,
      uncertainties: appendArrayShapeUncertainty(this.uncertainties, uncertainty),
      extentOpenSeams: [...this.extentOpenSeams, ...openSeams],
      elementOpenSeams: [...this.elementOpenSeams, ...openSeams],
      orderOpenSeams: this.orderOpenSeams,
    });
  }

  withUnknownElements(
    openSeams: readonly EvaluationOpenSeam[],
    uncertainty: EvaluationArrayUncertainty | null = null,
  ): EvaluationArrayShape {
    return EvaluationArrayShape.from({
      exactLength: this.exactLength,
      hasExactElements: false,
      hasExactOrder: this.hasExactOrder,
      uncertainties: appendArrayShapeUncertainty(this.uncertainties, uncertainty),
      extentOpenSeams: this.extentOpenSeams,
      elementOpenSeams: [...this.elementOpenSeams, ...openSeams],
      orderOpenSeams: this.orderOpenSeams,
    });
  }

  withUnknownOrder(
    openSeams: readonly EvaluationOpenSeam[],
    uncertainty: EvaluationArrayUncertainty | null = null,
  ): EvaluationArrayShape {
    return EvaluationArrayShape.from({
      exactLength: this.exactLength,
      hasExactElements: this.hasExactElements,
      hasExactOrder: false,
      uncertainties: appendArrayShapeUncertainty(this.uncertainties, uncertainty),
      extentOpenSeams: this.extentOpenSeams,
      elementOpenSeams: this.elementOpenSeams,
      orderOpenSeams: [...this.orderOpenSeams, ...openSeams],
    });
  }

  withExactLengthDelta(delta: number): EvaluationArrayShape {
    if (this.exactLength == null) {
      return this;
    }
    const exactLength = this.exactLength + delta;
    if (!Number.isInteger(delta) || exactLength < 0) {
      throw new Error('An evaluator array length delta must preserve a non-negative integer length.');
    }
    return EvaluationArrayShape.from({
      exactLength,
      hasExactElements: this.hasExactElements,
      hasExactOrder: this.hasExactOrder,
      uncertainties: this.uncertainties,
      extentOpenSeams: this.extentOpenSeams,
      elementOpenSeams: this.elementOpenSeams,
      orderOpenSeams: this.orderOpenSeams,
    });
  }
}

/** Array value with element-level evaluator values. */
export class EvaluationArrayValue {
  readonly kind = EvaluationValueKind.Array;
  readonly elements: EvaluationArrayElement[];
  private _shape: EvaluationArrayShape;

  constructor(
    /** Concrete element values in array order. */
    elements: readonly EvaluationArrayElement[],
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Independent closure state for extent, element positions, and order. */
    shape: EvaluationArrayShape = EvaluationArrayShape.exact(elements.length),
  ) {
    this.elements = normalizeEvaluationArrayElements(elements, shape);
    this._shape = shape;
  }

  get exactLength(): number | null {
    return this._shape.exactLength;
  }

  get shape(): EvaluationArrayShape {
    return this._shape;
  }

  get hasExactElementPositions(): boolean {
    return this._shape.hasExactPositions;
  }

  get isDense(): boolean {
    return this._shape.hasExactPositions && this._shape.exactLength === this.elements.length;
  }

  elementAtRuntimeIndex(runtimeIndex: number): EvaluationArrayElement | null {
    return this.elements.find((element) => element.runtimeIndex === runtimeIndex) ?? null;
  }

  get mayHaveUnknownElements(): boolean {
    return !this._shape.hasExactElements;
  }

  get mayHaveUnknownOrder(): boolean {
    return !this._shape.hasExactOrder;
  }

  get uncertainties(): readonly EvaluationArrayUncertainty[] {
    return this._shape.uncertainties;
  }

  get extentOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shape.extentOpenSeams;
  }

  get elementOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shape.elementOpenSeams;
  }

  get orderOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shape.orderOpenSeams;
  }

  get aggregateOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shape.aggregateOpenSeams;
  }

  markUnknownExtent(
    openSeams: readonly EvaluationOpenSeam[],
    uncertainty: EvaluationArrayUncertainty | null = null,
  ): void {
    this.setShape(this._shape.withUnknownExtent(openSeams, uncertainty));
  }

  markUnknownElements(
    openSeams: readonly EvaluationOpenSeam[],
    uncertainty: EvaluationArrayUncertainty | null = null,
  ): void {
    this.setShape(this._shape.withUnknownElements(openSeams, uncertainty));
  }

  markUnknownOrder(
    openSeams: readonly EvaluationOpenSeam[],
    uncertainty: EvaluationArrayUncertainty | null = null,
  ): void {
    this.setShape(this._shape.withUnknownOrder(openSeams, uncertainty));
  }

  adjustExactLength(delta: number): void {
    this.setShape(this._shape.withExactLengthDelta(delta));
  }

  /** Replace known element order after a mutating array operation such as sort. */
  replaceElementOrder(
    elements: readonly EvaluationArrayElement[],
    orderIsOpen: boolean,
    orderOpenSeams: readonly EvaluationOpenSeam[],
  ): void {
    if (orderIsOpen) {
      const shape = this._shape.withUnknownOrder(orderOpenSeams, {
        kind: EvaluationArrayUncertaintyKind.UnknownOrder,
        node: this.node,
      });
      this.replaceElements(elements, shape);
      return;
    }
    this.replaceElements(
      elements.map((element, runtimeIndex) => element.withRuntimeIndex(runtimeIndex)),
      this._shape,
    );
  }

  /** Atomically replace retained elements and closure state so positional invariants cannot drift. */
  replaceElements(
    elements: readonly EvaluationArrayElement[],
    shape: EvaluationArrayShape = this._shape,
  ): void {
    const normalized = normalizeEvaluationArrayElements(elements, shape);
    this.elements.splice(0, this.elements.length, ...normalized);
    this._shape = shape;
  }

  private setShape(shape: EvaluationArrayShape): void {
    if (!shape.hasExactPositions) {
      for (let index = 0; index < this.elements.length; index += 1) {
        this.elements[index] = this.elements[index]!.withRuntimeIndex(null);
      }
    }
    this._shape = shape;
  }
}

function normalizeEvaluationArrayElements(
  elements: readonly EvaluationArrayElement[],
  shape: EvaluationArrayShape,
): EvaluationArrayElement[] {
  if (!shape.hasExactPositions) {
    return elements.map((element) => element.withRuntimeIndex(null));
  }
  if (shape.exactLength == null) {
    throw new Error('Exact evaluator array positions require an exact runtime length.');
  }
  if (elements.length === shape.exactLength) {
    return elements.map((element, runtimeIndex) => element.withRuntimeIndex(runtimeIndex));
  }
  const seen = new Set<number>();
  let previous = -1;
  for (const element of elements) {
    const runtimeIndex = element.runtimeIndex;
    if (
      runtimeIndex == null
      || runtimeIndex < 0
      || runtimeIndex >= shape.exactLength
      || runtimeIndex <= previous
      || seen.has(runtimeIndex)
    ) {
      throw new Error('An exact sparse evaluator array requires unique ascending runtime element indices.');
    }
    seen.add(runtimeIndex);
    previous = runtimeIndex;
  }
  return [...elements];
}

function appendArrayShapeUncertainty(
  uncertainties: readonly EvaluationArrayUncertainty[],
  uncertainty: EvaluationArrayUncertainty | null,
): readonly EvaluationArrayUncertainty[] {
  return uncertainty == null
    ? uncertainties
    : mergeEvaluationArrayUncertainties(uncertainties, [uncertainty]);
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

export interface EvaluationKeyedCollectionShapeInit {
  /** Exact active runtime entry count, or null when a keyed mutation can add or remove an entry. */
  readonly exactSize: number | null;
  /** Whether every active runtime key/member identity and presence is known. */
  readonly hasExactMembership: boolean;
  /** Whether retained active entries occupy exact runtime iteration positions. */
  readonly hasExactOrder: boolean;
  /** Pressure that prevents the active entry count from closing. */
  readonly sizeOpenSeams: readonly EvaluationOpenSeam[];
  /** Pressure that prevents member/key identity and presence from closing. */
  readonly membershipOpenSeams: readonly EvaluationOpenSeam[];
  /** Pressure that prevents exact insertion positions from closing. */
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];
}

/** Immutable closure state shared by evaluator-local Set and Map values. */
export class EvaluationKeyedCollectionShape {
  readonly sizeOpenSeams: readonly EvaluationOpenSeam[];
  readonly membershipOpenSeams: readonly EvaluationOpenSeam[];
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly exactSize: number | null,
    readonly hasExactMembership: boolean,
    readonly hasExactOrder: boolean,
    sizeOpenSeams: readonly EvaluationOpenSeam[],
    membershipOpenSeams: readonly EvaluationOpenSeam[],
    orderOpenSeams: readonly EvaluationOpenSeam[],
  ) {
    if (exactSize != null && (!Number.isInteger(exactSize) || exactSize < 0)) {
      throw new Error('An exact evaluator keyed-collection size must be a non-negative integer.');
    }
    if (hasExactMembership && exactSize == null) {
      throw new Error('Exact evaluator keyed-collection membership requires an exact runtime size.');
    }
    this.sizeOpenSeams = compactEvaluationOpenSeams(sizeOpenSeams);
    this.membershipOpenSeams = compactEvaluationOpenSeams(membershipOpenSeams);
    this.orderOpenSeams = compactEvaluationOpenSeams(orderOpenSeams);
  }

  static exact(size: number): EvaluationKeyedCollectionShape {
    return new EvaluationKeyedCollectionShape(size, true, true, [], [], []);
  }

  static from(init: EvaluationKeyedCollectionShapeInit): EvaluationKeyedCollectionShape {
    return new EvaluationKeyedCollectionShape(
      init.exactSize,
      init.hasExactMembership,
      init.hasExactOrder,
      init.sizeOpenSeams,
      init.membershipOpenSeams,
      init.orderOpenSeams,
    );
  }

  get aggregateOpenSeams(): readonly EvaluationOpenSeam[] {
    return compactEvaluationOpenSeams([
      ...this.sizeOpenSeams,
      ...this.membershipOpenSeams,
      ...this.orderOpenSeams,
    ]);
  }

  withOpenMembership(
    openSeams: readonly EvaluationOpenSeam[],
    exactSize: number | null,
    hasExactOrder: boolean,
  ): EvaluationKeyedCollectionShape {
    return EvaluationKeyedCollectionShape.from({
      exactSize,
      hasExactMembership: false,
      hasExactOrder,
      sizeOpenSeams: exactSize == null ? [...this.sizeOpenSeams, ...openSeams] : this.sizeOpenSeams,
      membershipOpenSeams: [...this.membershipOpenSeams, ...openSeams],
      orderOpenSeams: hasExactOrder ? this.orderOpenSeams : [...this.orderOpenSeams, ...openSeams],
    });
  }

  withExactSizeDelta(delta: number): EvaluationKeyedCollectionShape {
    if (this.exactSize == null) {
      return this;
    }
    const exactSize = this.exactSize + delta;
    if (!Number.isInteger(delta) || exactSize < 0) {
      throw new Error('An evaluator keyed-collection size delta must preserve a non-negative integer size.');
    }
    return EvaluationKeyedCollectionShape.from({
      exactSize,
      hasExactMembership: this.hasExactMembership,
      hasExactOrder: this.hasExactOrder,
      sizeOpenSeams: this.sizeOpenSeams,
      membershipOpenSeams: this.membershipOpenSeams,
      orderOpenSeams: this.orderOpenSeams,
    });
  }
}

export const enum EvaluationKeyedCollectionEntryState {
  /** The retained entry is definitely active in the collection. */
  Present = 'present',
  /** The retained candidate may or may not occupy one active collection entry. */
  Conditional = 'conditional',
  /** An exact delete or clear removed the entry while preserving iterator lineage. */
  Deleted = 'deleted',
}

/** One Set member candidate with independent identity and presence evidence. */
export class EvaluationSetElement {
  readonly openSeams: readonly EvaluationOpenSeam[];
  readonly presenceOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly value: EvaluationValue,
    readonly expression: ts.Expression | null,
    openSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
    readonly state: EvaluationKeyedCollectionEntryState = EvaluationKeyedCollectionEntryState.Present,
    presenceOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
    this.presenceOpenSeams = compactEvaluationOpenSeams(presenceOpenSeams);
  }

  withState(
    state: EvaluationKeyedCollectionEntryState,
    additionalOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ): EvaluationSetElement {
    return state === this.state && additionalOpenSeams.length === 0
      ? this
      : new EvaluationSetElement(
          this.value,
          this.expression,
          this.openSeams,
          state,
          state === EvaluationKeyedCollectionEntryState.Conditional
            ? [...this.presenceOpenSeams, ...additionalOpenSeams]
            : additionalOpenSeams,
        );
  }
}

/** Set value with evaluator-local keyed membership and independent iteration capability. */
export class EvaluationSetValue {
  readonly kind = EvaluationValueKind.Set;
  readonly elements: EvaluationSetElement[];
  private _shape: EvaluationKeyedCollectionShape;

  constructor(
    elements: readonly EvaluationSetElement[],
    readonly node: ts.Node | null = null,
    shape: EvaluationKeyedCollectionShape = EvaluationKeyedCollectionShape.exact(elements.length),
    /** WeakSet retains keyed membership but deliberately exposes neither iteration nor size. */
    readonly weak: boolean = false,
  ) {
    this.elements = [...elements];
    this._shape = shape;
  }

  get shape(): EvaluationKeyedCollectionShape {
    return this._shape;
  }

  get exactSize(): number | null {
    return this._shape.exactSize;
  }

  get mayHaveUnknownElements(): boolean {
    return !this._shape.hasExactMembership;
  }

  get mayHaveUnknownOrder(): boolean {
    return !this._shape.hasExactOrder;
  }

  get aggregateOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shape.aggregateOpenSeams;
  }

  replaceShape(shape: EvaluationKeyedCollectionShape): void {
    this._shape = shape;
  }
}

/** One Map entry with independent key, value, and active-presence evidence. */
export class EvaluationMapEntry {
  readonly keyOpenSeams: readonly EvaluationOpenSeam[];
  private _value: EvaluationValue;
  private _valueExpression: ts.Expression | null;
  private _valueOpenSeams: readonly EvaluationOpenSeam[];
  private _state: EvaluationKeyedCollectionEntryState;
  private _presenceOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly key: EvaluationValue,
    value: EvaluationValue,
    readonly keyExpression: ts.Expression | null,
    valueExpression: ts.Expression | null,
    keyOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
    valueOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
    state: EvaluationKeyedCollectionEntryState = EvaluationKeyedCollectionEntryState.Present,
    presenceOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ) {
    this._value = value;
    this._valueExpression = valueExpression;
    this.keyOpenSeams = compactEvaluationOpenSeams(keyOpenSeams);
    this._valueOpenSeams = compactEvaluationOpenSeams(valueOpenSeams);
    this._state = state;
    this._presenceOpenSeams = compactEvaluationOpenSeams(presenceOpenSeams);
  }

  get value(): EvaluationValue {
    return this._value;
  }

  get valueExpression(): ts.Expression | null {
    return this._valueExpression;
  }

  get valueOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._valueOpenSeams;
  }

  get state(): EvaluationKeyedCollectionEntryState {
    return this._state;
  }

  get presenceOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._presenceOpenSeams;
  }

  replaceValue(
    value: EvaluationValue,
    expression: ts.Expression | null,
    openSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ): void {
    this._value = value;
    this._valueExpression = expression;
    this._valueOpenSeams = compactEvaluationOpenSeams(openSeams);
    this._state = EvaluationKeyedCollectionEntryState.Present;
    this._presenceOpenSeams = noEvaluationOpenSeams;
  }

  retainValueOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void {
    this._valueOpenSeams = compactEvaluationOpenSeams([...this._valueOpenSeams, ...openSeams]);
  }

  setState(
    state: EvaluationKeyedCollectionEntryState,
    additionalOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ): void {
    this._state = state;
    this._presenceOpenSeams = compactEvaluationOpenSeams(
      state === EvaluationKeyedCollectionEntryState.Conditional
        ? [...this._presenceOpenSeams, ...additionalOpenSeams]
        : additionalOpenSeams,
    );
  }
}

/** Map value with evaluator-local keyed membership and independent iteration capability. */
export class EvaluationMapValue {
  readonly kind = EvaluationValueKind.Map;
  readonly entries: EvaluationMapEntry[];
  private _shape: EvaluationKeyedCollectionShape;

  constructor(
    entries: readonly EvaluationMapEntry[],
    readonly node: ts.Node | null = null,
    shape: EvaluationKeyedCollectionShape = EvaluationKeyedCollectionShape.exact(entries.length),
    /** WeakMap retains keyed membership but deliberately exposes neither iteration nor size. */
    readonly weak: boolean = false,
  ) {
    this.entries = [...entries];
    this._shape = shape;
  }

  get shape(): EvaluationKeyedCollectionShape {
    return this._shape;
  }

  get exactSize(): number | null {
    return this._shape.exactSize;
  }

  get mayHaveUnknownEntries(): boolean {
    return !this._shape.hasExactMembership;
  }

  get mayHaveUnknownOrder(): boolean {
    return !this._shape.hasExactOrder;
  }

  get aggregateOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shape.aggregateOpenSeams;
  }

  replaceShape(shape: EvaluationKeyedCollectionShape): void {
    this._shape = shape;
  }
}

/** One object property and the expression or method that produced it. */
export const enum EvaluationObjectPropertyState {
  /** No later unknown-key write can replace the retained value. */
  Closed,
  /** A later unknown computed key or spread may replace the retained value. */
  Open,
}

export class EvaluationObjectProperty {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Property name after local key evaluation. */
    readonly name: string,
    /** Property value after local evaluation. */
    readonly value: EvaluationValue,
    /** Source node that produced this property. */
    readonly node: ts.Node | null,
    /** Whether the retained value is the effective final write for this property. */
    readonly state: EvaluationObjectPropertyState,
    /** Exact evaluator pressure produced by this value or a later write that may replace it. */
    openSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }

  withState(
    state: EvaluationObjectPropertyState,
    additionalOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ): EvaluationObjectProperty {
    return state === this.state && additionalOpenSeams.length === 0
      ? this
      : new EvaluationObjectProperty(
          this.name,
          this.value,
          this.node,
          state,
          [...this.openSeams, ...additionalOpenSeams],
        );
  }
}

/** Mark retained property values open when a later unknown-key write may replace them. */
export function openEvaluationObjectProperties(
  properties: Map<string, EvaluationObjectProperty>,
  openSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
): void {
  for (const [name, property] of properties) {
    properties.set(name, property.withState(EvaluationObjectPropertyState.Open, openSeams));
  }
}

/** Object value with evaluator-local property values. */
export class EvaluationObjectValue {
  readonly kind = EvaluationValueKind.Object;
  readonly uncertainties: readonly EvaluationObjectUncertainty[];
  private _shapeOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Known own properties by string key. */
    readonly properties: Map<string, EvaluationObjectProperty>,
    /** Whether a spread or computed key prevented exact property closure. */
    public mayHaveUnknownProperties: boolean,
    /** Syntax node that produced the value, when one exists. */
    readonly node: ts.Node | null = null,
    /** Compact local reasons for unknown property membership, kept out of durable kernel records. */
    uncertainties: readonly EvaluationObjectUncertainty[] = emptyEvaluationObjectUncertainties,
    /** Exact pressure that prevents the object's property membership from closing. */
    shapeOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ) {
    this.uncertainties = uncertainties.length === 0
      ? emptyEvaluationObjectUncertainties
      : uniqueEvaluationObjectUncertainties(uncertainties);
    this._shapeOpenSeams = compactEvaluationOpenSeams(shapeOpenSeams);
  }

  get shapeOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shapeOpenSeams;
  }

  retainShapeOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void {
    if (openSeams.length === 0) {
      return;
    }
    this._shapeOpenSeams = compactEvaluationOpenSeams([
      ...this._shapeOpenSeams,
      ...openSeams,
    ]);
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
    /** Whether the boundary object retains a runtime callable identity. */
    readonly callable: boolean = false,
  ) {
    this.properties = new Map(properties);
  }

  get reason(): string {
    return evaluationBoundaryReason(this.boundaryKind, this.path);
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
    return evaluationBoundaryReason(this.boundaryKind, this.path);
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
    readonly environment: ModuleEnvironmentRecord,
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
    readonly environment: ModuleEnvironmentRecord,
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
  private _constructionOpenSeams: readonly EvaluationOpenSeam[];
  private _shapeOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Class value whose constructor/prototype shape produced this instance. */
    readonly classValue: EvaluationClassValue,
    /** Evaluator-local own and prototype-visible instance properties. */
    properties: ReadonlyMap<string, EvaluationObjectProperty> = new Map(),
    /** Whether constructor or field execution left additional instance shape unknown. */
    public mayHaveUnknownProperties: boolean = false,
    /** Syntax node that produced the instance, when one exists. */
    readonly node: ts.Node | null = null,
    /** Constructor-wide pressure that can affect every member read. */
    constructionOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
    /** Pressure from unknown property names that affects membership without qualifying later exact writes. */
    shapeOpenSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ) {
    this.properties = new Map(properties);
    this._constructionOpenSeams = compactEvaluationOpenSeams(constructionOpenSeams);
    this._shapeOpenSeams = compactEvaluationOpenSeams(shapeOpenSeams);
  }

  get constructionOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._constructionOpenSeams;
  }

  retainConstructionOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void {
    if (openSeams.length === 0) {
      return;
    }
    this._constructionOpenSeams = compactEvaluationOpenSeams([
      ...this._constructionOpenSeams,
      ...openSeams,
    ]);
  }

  get shapeOpenSeams(): readonly EvaluationOpenSeam[] {
    return this._shapeOpenSeams;
  }

  retainShapeOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void {
    if (openSeams.length === 0) {
      return;
    }
    this._shapeOpenSeams = compactEvaluationOpenSeams([
      ...this._shapeOpenSeams,
      ...openSeams,
    ]);
  }
}

/** One named export retained by a statically assembled module namespace. */
export class EvaluationModuleNamespaceExport {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly name: string,
    readonly value: EvaluationValue,
    /** Export specifier or ultimate declaration that exposes this name, when known. */
    readonly sourceNode: ts.Node | null,
    /** Exact pressure qualifying the exported value while namespace membership remains known. */
    openSeams: readonly EvaluationOpenSeam[] = noEvaluationOpenSeams,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** Module namespace assembled from linked exports. */
export class EvaluationModuleNamespaceValue {
  readonly kind = EvaluationValueKind.ModuleNamespace;

  constructor(
    /** Module key whose exports are represented by this namespace. */
    readonly moduleKey: string,
    /** Export rows by exported name in ECMAScript module-namespace key order. */
    readonly exportEntries: ReadonlyMap<string, EvaluationModuleNamespaceExport>,
    /** Whether unresolved star edges or ambiguous exports prevented exact namespace membership. */
    readonly mayHaveUnknownExports: boolean,
    /** Syntax node that produced the namespace, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}
}

/** Settlement authority retained by an evaluator Promise without claiming when it becomes observable. */
export const enum EvaluationPromiseSettlementKind {
  /** The Promise is known to fulfill with the retained value evidence. */
  Fulfilled = 'fulfilled',
  /** The Promise is known to reject with the retained reason evidence. */
  Rejected = 'rejected',
  /** Fulfillment versus rejection cannot be selected without runtime execution. */
  Open = 'open',
}

/** One Promise settlement lane with exact evidence for its value or best-known candidate. */
export class EvaluationPromiseSettlement {
  constructor(
    readonly kind: EvaluationPromiseSettlementKind,
    readonly evidence: EvaluationValueEvidence,
  ) {}
}

/** Promise-shaped value such as `import(...)` with explicit settlement evidence. */
export class EvaluationPromiseValue {
  readonly kind = EvaluationValueKind.Promise;

  private forkShell = false;

  private constructor(
    private settlementState: EvaluationPromiseSettlement | null,
    /** Syntax node that produced the promise, when one exists. */
    readonly node: ts.Node | null = null,
  ) {}

  get settlement(): EvaluationPromiseSettlement {
    if (this.settlementState == null) {
      throw new Error('Evaluation Promise graph-fork shell has not been completed.');
    }
    return this.settlementState;
  }

  static fromSettlement(
    settlement: EvaluationPromiseSettlement,
    node: ts.Node | null = null,
  ): EvaluationPromiseValue {
    return new EvaluationPromiseValue(settlement, node);
  }

  static fulfilled(
    evidence: EvaluationValueEvidence,
    node: ts.Node | null = null,
  ): EvaluationPromiseValue {
    return EvaluationPromiseValue.fromSettlement(
      new EvaluationPromiseSettlement(EvaluationPromiseSettlementKind.Fulfilled, evidence),
      node,
    );
  }

  static rejected(
    evidence: EvaluationValueEvidence,
    node: ts.Node | null = null,
  ): EvaluationPromiseValue {
    return EvaluationPromiseValue.fromSettlement(
      new EvaluationPromiseSettlement(EvaluationPromiseSettlementKind.Rejected, evidence),
      node,
    );
  }

  static open(
    evidence: EvaluationValueEvidence,
    node: ts.Node | null = null,
  ): EvaluationPromiseValue {
    return EvaluationPromiseValue.fromSettlement(
      new EvaluationPromiseSettlement(EvaluationPromiseSettlementKind.Open, evidence),
      node,
    );
  }

  /** Create an unpublished shell so graph-preserving session forks can close Promise back-edges. */
  static forkShell(node: ts.Node | null): EvaluationPromiseValue {
    const shell = new EvaluationPromiseValue(null, node);
    shell.forkShell = true;
    return shell;
  }

  /** Complete a graph-fork shell exactly once before the session graph is exposed. */
  completeFork(settlement: EvaluationPromiseSettlement): void {
    if (!this.forkShell) {
      throw new Error('Evaluation Promise value is not an incomplete graph-fork shell.');
    }
    this.settlementState = settlement;
    this.forkShell = false;
  }
}

/** Return a Promise fulfillment only when both settlement selection and fulfillment evidence are closed. */
export function closedEvaluationPromiseFulfillment(
  promise: EvaluationPromiseValue,
): EvaluationValue | null {
  return promise.settlement.kind === EvaluationPromiseSettlementKind.Fulfilled
    && promise.settlement.evidence.openSeams.length === 0
    ? promise.settlement.evidence.value
    : null;
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

/** Canonicalize the only keyed-collection key whose retained representation differs from SameValueZero identity. */
export function canonicalEvaluationKeyedCollectionKey(value: EvaluationValue): EvaluationValue {
  return value.kind === EvaluationValueKind.Number && Object.is(value.value, -0)
    ? new EvaluationNumberValue(0, value.node)
    : value;
}
