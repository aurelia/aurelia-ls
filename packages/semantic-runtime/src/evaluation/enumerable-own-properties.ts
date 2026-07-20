import ts from 'typescript';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';

import {
  EvaluationObjectPropertyState,
  EvaluationArrayShape,
  EvaluationStringValue,
  EvaluationValueKind,
  type EvaluationObjectProperty,
  type EvaluationValue,
} from './values.js';

/** One statically known enumerable own entry in ECMAScript property-key order. */
export class EvaluationEnumerableOwnEntry {
  constructor(
    readonly name: string,
    readonly value: EvaluationValue,
    /** Property, element, or export source retained by the evaluator, when available. */
    readonly sourceNode: ts.Node | null,
    /** Value-producing expression suitable for a nested semantic admission, when available. */
    readonly expression: ts.Expression | null,
    /** Original object-property record when this entry came from a property map. */
    readonly property: EvaluationObjectProperty | null,
    /** Exact pressure that qualifies this entry's retained value. */
    readonly openSeams: readonly EvaluationOpenSeam[] = [],
  ) {}
}

/** Known enumerable-own entries plus the closure state needed by structural consumers. */
export class EvaluationEnumerableOwnEntries {
  readonly membershipOpenSeams: readonly EvaluationOpenSeam[];
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly entries: readonly EvaluationEnumerableOwnEntry[],
    /** Exact runtime enumerable-own entry count, independent of retained key/value identity. */
    readonly exactLength: number | null,
    /** Additional enumerable keys or values may exist. */
    readonly mayHaveUnknownEntries: boolean,
    /** The relative position of known entries may differ at runtime. */
    readonly mayHaveUnknownOrder: boolean,
    /** Exact pressure that prevents enumerable membership from closing. */
    membershipOpenSeams: readonly EvaluationOpenSeam[] = [],
    /** Exact pressure that prevents enumerable key order from closing. */
    orderOpenSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.membershipOpenSeams = compactEvaluationOpenSeams(membershipOpenSeams);
    this.orderOpenSeams = compactEvaluationOpenSeams(orderOpenSeams);
  }

  /** Project enumeration closure into the independent axes of an evaluator-local result array. */
  toArrayShape(): EvaluationArrayShape {
    return this.mayHaveUnknownEntries || this.mayHaveUnknownOrder
      ? EvaluationArrayShape.from({
          exactLength: this.exactLength,
          hasExactElements: !this.mayHaveUnknownEntries,
          hasExactOrder: !this.mayHaveUnknownOrder,
          uncertainties: [],
          extentOpenSeams: this.membershipOpenSeams,
          elementOpenSeams: this.membershipOpenSeams,
          orderOpenSeams: this.orderOpenSeams,
        })
      : EvaluationArrayShape.exact(this.entries.length);
  }
}

/**
 * Project one evaluator value through ECMAScript enumerable-own-property semantics.
 *
 * A null result means enumeration itself is unavailable or would throw. An open result retains every known entry while
 * carrying incomplete membership/order separately; consumers must not turn that partial knowledge into false closure.
 */
export function readEvaluationEnumerableOwnEntries(
  source: EvaluationValue | null | undefined,
): EvaluationEnumerableOwnEntries | null {
  if (source == null) {
    return null;
  }
  switch (source.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Instance:
      return entriesFromProperties(
        source.properties,
        source.mayHaveUnknownProperties,
        source.shapeOpenSeams,
      );
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
      return entriesFromProperties(source.properties, false);
    case EvaluationValueKind.BoundaryObject:
      return entriesFromProperties(source.properties, true);
    case EvaluationValueKind.Array:
      return new EvaluationEnumerableOwnEntries(
        source.elements.flatMap((element) => element.runtimeIndex == null
          ? []
          : [new EvaluationEnumerableOwnEntry(
              String(element.runtimeIndex),
              element.value,
              element.expression,
              element.expression,
              null,
              element.openSeams,
            )]),
        source.mayHaveUnknownElements ? null : source.elements.length,
        source.mayHaveUnknownElements || source.elements.some((element) => element.runtimeIndex == null),
        source.mayHaveUnknownOrder,
        [
          ...source.extentOpenSeams,
          ...source.elementOpenSeams,
          ...(source.elements.some((element) => element.runtimeIndex == null) ? source.orderOpenSeams : []),
        ],
        source.orderOpenSeams,
      );
    case EvaluationValueKind.ModuleNamespace:
      return new EvaluationEnumerableOwnEntries(
        [...source.exportEntries.values()].map((entry) => new EvaluationEnumerableOwnEntry(
          entry.name,
          entry.value,
          entry.sourceNode,
          null,
          null,
          entry.openSeams,
        )),
        source.mayHaveUnknownExports ? null : source.exportEntries.size,
        source.mayHaveUnknownExports,
        false,
      );
    case EvaluationValueKind.String:
      return new EvaluationEnumerableOwnEntries(
        source.value.split('').map((part, index) => new EvaluationEnumerableOwnEntry(
          String(index),
          new EvaluationStringValue(part, source.node),
          source.node,
          null,
          null,
        )),
        source.value.length,
        false,
        false,
      );
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Promise:
      return new EvaluationEnumerableOwnEntries([], 0, false, false);
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.StringPattern:
    case EvaluationValueKind.BoundaryValue:
      return null;
  }
}

function entriesFromProperties(
  properties: ReadonlyMap<string, EvaluationObjectProperty>,
  mayHaveUnknownProperties: boolean,
  shapeOpenSeams: readonly EvaluationOpenSeam[] = [],
): EvaluationEnumerableOwnEntries {
  const entries = [...properties.values()]
    .map((property) => new EvaluationEnumerableOwnEntry(
      property.name,
      property.value,
      property.node,
      propertyValueExpression(property.node),
      property,
      property.openSeams,
    ));
  entries.sort(compareEnumerablePropertyKeys);
  const hasOpenProperty = entries.some((entry) => entry.property?.state === EvaluationObjectPropertyState.Open);
  const open = mayHaveUnknownProperties || hasOpenProperty;
  const openSeams = compactEvaluationOpenSeams([
    ...shapeOpenSeams,
    ...entries.flatMap((entry) =>
      entry.property?.state === EvaluationObjectPropertyState.Open ? entry.openSeams : []
    ),
  ]);
  return new EvaluationEnumerableOwnEntries(
    entries,
    open ? null : entries.length,
    open,
    open,
    openSeams,
    openSeams,
  );
}

function propertyValueExpression(node: ts.Node | null): ts.Expression | null {
  if (node == null) {
    return null;
  }
  if (ts.isPropertyAssignment(node)) {
    return node.initializer;
  }
  if (ts.isShorthandPropertyAssignment(node)) {
    return node.name;
  }
  if (ts.isPropertyDeclaration(node) && node.initializer != null) {
    return node.initializer;
  }
  return ts.isExpression(node) ? node : null;
}

function compareEnumerablePropertyKeys(
  left: EvaluationEnumerableOwnEntry,
  right: EvaluationEnumerableOwnEntry,
): number {
  const leftIndex = arrayIndexForPropertyKey(left.name);
  const rightIndex = arrayIndexForPropertyKey(right.name);
  if (leftIndex == null) {
    return rightIndex == null ? 0 : 1;
  }
  return rightIndex == null ? -1 : leftIndex - rightIndex;
}

function arrayIndexForPropertyKey(name: string): number | null {
  const value = Number(name);
  return Number.isInteger(value)
      && value >= 0
      && value < 0xffff_ffff
      && String(value) === name
    ? value
    : null;
}
