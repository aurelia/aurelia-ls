import type ts from 'typescript';

import {
  evaluationArrayIteratorElements,
} from './array-value-operations.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationKeyedCollectionEntryState,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationMapEntry,
  type EvaluationMapValue,
  type EvaluationSetElement,
  type EvaluationSetValue,
  type EvaluationValue,
} from './values.js';

/** Positional projection produced by fully draining one modeled built-in iterator. */
export class EvaluationIteratorProjection {
  constructor(
    readonly elements: readonly EvaluationArrayElement[],
    readonly shape: EvaluationArrayShape,
  ) {}
}

export const enum EvaluationIteratorStepKind {
  /** One iterator value is available and advancement may continue. */
  Value = 'value',
  /** The modeled iterator is exhausted. */
  Done = 'done',
  /** Iterator membership, order, or one conditional entry prevents safe advancement. */
  Open = 'open',
}

export class EvaluationIteratorStep {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly kind: EvaluationIteratorStepKind,
    readonly element: EvaluationArrayElement | null = null,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** Live evaluator iterator for built-in Array, Set, Map, and String values. */
export class EvaluationBuiltinIterator {
  private nextIndex = 0;
  private yieldedCount = 0;

  constructor(
    readonly source: EvaluationValue,
    readonly node: ts.Node,
  ) {}

  next(): EvaluationIteratorStep {
    switch (this.source.kind) {
      case EvaluationValueKind.Array:
        return this.nextArray(this.source);
      case EvaluationValueKind.Set:
        return this.nextSet(this.source);
      case EvaluationValueKind.Map:
        return this.nextMap(this.source);
      case EvaluationValueKind.String:
        return this.nextString(this.source.value);
      default:
        return new EvaluationIteratorStep(EvaluationIteratorStepKind.Open);
    }
  }

  private nextArray(source: EvaluationArrayValue): EvaluationIteratorStep {
    if (source.exactLength == null || source.mayHaveUnknownElements || source.mayHaveUnknownOrder) {
      return new EvaluationIteratorStep(
        EvaluationIteratorStepKind.Open,
        null,
        source.aggregateOpenSeams,
      );
    }
    if (this.nextIndex >= source.exactLength) {
      return new EvaluationIteratorStep(EvaluationIteratorStepKind.Done);
    }
    const runtimeIndex = this.nextIndex++;
    const element = source.elementAtRuntimeIndex(runtimeIndex);
    return new EvaluationIteratorStep(
      EvaluationIteratorStepKind.Value,
      new EvaluationArrayElement(
        element?.value ?? EvaluationUndefined,
        element?.expression ?? null,
        element?.openSeams ?? [],
        runtimeIndex,
      ),
    );
  }

  private nextSet(source: EvaluationSetValue): EvaluationIteratorStep {
    if (source.weak || !source.shape.hasExactOrder) {
      return new EvaluationIteratorStep(
        EvaluationIteratorStepKind.Open,
        null,
        source.aggregateOpenSeams,
      );
    }
    while (this.nextIndex < source.elements.length) {
      const element = source.elements[this.nextIndex++]!;
      if (element.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      if (element.state === EvaluationKeyedCollectionEntryState.Conditional) {
        return new EvaluationIteratorStep(
          EvaluationIteratorStepKind.Open,
          setIteratorElement(element, null),
          [...element.presenceOpenSeams, ...source.shape.membershipOpenSeams],
        );
      }
      this.yieldedCount += 1;
      return new EvaluationIteratorStep(
        EvaluationIteratorStepKind.Value,
        setIteratorElement(element, this.yieldedCount - 1),
      );
    }
    return source.exactSize != null
      ? new EvaluationIteratorStep(EvaluationIteratorStepKind.Done)
      : new EvaluationIteratorStep(
          EvaluationIteratorStepKind.Open,
          null,
          source.shape.membershipOpenSeams,
        );
  }

  private nextMap(source: EvaluationMapValue): EvaluationIteratorStep {
    if (source.weak || !source.shape.hasExactOrder) {
      return new EvaluationIteratorStep(
        EvaluationIteratorStepKind.Open,
        null,
        source.aggregateOpenSeams,
      );
    }
    while (this.nextIndex < source.entries.length) {
      const entry = source.entries[this.nextIndex++]!;
      if (entry.state === EvaluationKeyedCollectionEntryState.Deleted) {
        continue;
      }
      if (entry.state === EvaluationKeyedCollectionEntryState.Conditional) {
        return new EvaluationIteratorStep(
          EvaluationIteratorStepKind.Open,
          mapIteratorElement(entry, this.node, null),
          [...entry.presenceOpenSeams, ...source.shape.membershipOpenSeams],
        );
      }
      this.yieldedCount += 1;
      return new EvaluationIteratorStep(
        EvaluationIteratorStepKind.Value,
        mapIteratorElement(entry, this.node, this.yieldedCount - 1),
      );
    }
    return source.exactSize != null
      ? new EvaluationIteratorStep(EvaluationIteratorStepKind.Done)
      : new EvaluationIteratorStep(
          EvaluationIteratorStepKind.Open,
          null,
          source.shape.membershipOpenSeams,
        );
  }

  private nextString(value: string): EvaluationIteratorStep {
    const characters = [...value];
    if (this.nextIndex >= characters.length) {
      return new EvaluationIteratorStep(EvaluationIteratorStepKind.Done);
    }
    const runtimeIndex = this.nextIndex++;
    return new EvaluationIteratorStep(
      EvaluationIteratorStepKind.Value,
      new EvaluationArrayElement(
        new EvaluationStringValue(characters[runtimeIndex]!, this.node),
        null,
        [],
        runtimeIndex,
      ),
    );
  }
}

/** Project one modeled built-in iterable without executing user callbacks between iterator steps. */
export function evaluationIteratorProjection(
  source: EvaluationValue,
  node: ts.Node | null,
): EvaluationIteratorProjection | null {
  switch (source.kind) {
    case EvaluationValueKind.Array: {
      const elements = evaluationArrayIteratorElements(source) ?? source.elements.map((element) =>
        element.withRuntimeIndex(null)
      );
      return new EvaluationIteratorProjection(elements, EvaluationArrayShape.from({
        exactLength: source.exactLength,
        hasExactElements: source.shape.hasExactElements,
        hasExactOrder: source.shape.hasExactOrder,
        uncertainties: source.uncertainties,
        extentOpenSeams: source.extentOpenSeams,
        elementOpenSeams: source.elementOpenSeams,
        orderOpenSeams: source.orderOpenSeams,
      }));
    }
    case EvaluationValueKind.Set:
      return source.weak ? null : keyedIteratorProjection(
        source.elements
          .filter((element) => element.state !== EvaluationKeyedCollectionEntryState.Deleted)
          .map((element, runtimeIndex) => setIteratorElement(
            element,
            element.state === EvaluationKeyedCollectionEntryState.Present
              && source.shape.hasExactOrder
              ? runtimeIndex
              : null,
          )),
        source,
      );
    case EvaluationValueKind.Map:
      return source.weak ? null : keyedIteratorProjection(
        source.entries
          .filter((entry) => entry.state !== EvaluationKeyedCollectionEntryState.Deleted)
          .map((entry, runtimeIndex) => mapIteratorElement(
            entry,
            node,
            entry.state === EvaluationKeyedCollectionEntryState.Present
              && source.shape.hasExactOrder
              ? runtimeIndex
              : null,
          )),
        source,
      );
    case EvaluationValueKind.String: {
      const elements = [...source.value].map((character, runtimeIndex) =>
        new EvaluationArrayElement(
          new EvaluationStringValue(character, node),
          null,
          [],
          runtimeIndex,
        )
      );
      return new EvaluationIteratorProjection(elements, EvaluationArrayShape.exact(elements.length));
    }
    default:
      return null;
  }
}

function keyedIteratorProjection(
  elements: readonly EvaluationArrayElement[],
  source: EvaluationSetValue | EvaluationMapValue,
): EvaluationIteratorProjection {
  const exactMembership = source.exactSize != null
    && source.shape.hasExactMembership
    && elements.length === source.exactSize;
  const exactPositions = exactMembership
    && source.shape.hasExactOrder
    && elements.every((element, index) => element.runtimeIndex === index);
  return new EvaluationIteratorProjection(
    exactPositions ? elements : elements.map((element) => element.withRuntimeIndex(null)),
    EvaluationArrayShape.from({
      exactLength: source.exactSize,
      hasExactElements: exactMembership,
      hasExactOrder: source.shape.hasExactOrder,
      uncertainties: [],
      extentOpenSeams: source.shape.sizeOpenSeams,
      elementOpenSeams: source.shape.membershipOpenSeams,
      orderOpenSeams: source.shape.orderOpenSeams,
    }),
  );
}

function setIteratorElement(
  element: EvaluationSetElement,
  runtimeIndex: number | null,
): EvaluationArrayElement {
  return new EvaluationArrayElement(
    element.value,
    element.expression,
    [...element.openSeams, ...element.presenceOpenSeams],
    runtimeIndex,
  );
}

function mapIteratorElement(
  entry: EvaluationMapEntry,
  node: ts.Node | null,
  runtimeIndex: number | null,
): EvaluationArrayElement {
  return new EvaluationArrayElement(
    new EvaluationArrayValue([
      new EvaluationArrayElement(entry.key, entry.keyExpression, entry.keyOpenSeams, 0),
      new EvaluationArrayElement(entry.value, entry.valueExpression, entry.valueOpenSeams, 1),
    ], node, EvaluationArrayShape.exact(2)),
    entry.keyExpression ?? entry.valueExpression,
    entry.presenceOpenSeams,
    runtimeIndex,
  );
}
