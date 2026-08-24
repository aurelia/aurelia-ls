import ts from 'typescript';

import { EvaluationBindingState } from './environment.js';
import {
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationObjectProperty,
  type EvaluationValue,
} from './values.js';
import { evaluationValuesShareLineage } from './value-relation.js';

const referencedIdentifierNamesByDeclaration = new WeakMap<ts.Node, ReadonlySet<string>>();
const declarationsWithUnsupportedLexicalMeta = new WeakSet<ts.Node>();

/**
 * Whether two immutable evaluator snapshots carry the same closed execution state.
 *
 * Runtime lineage alone is insufficient: the same object can be mutated between two invocation occurrences. This
 * comparison is deliberately conservative and follows only exact local state reachable from a callable's captured
 * bindings. Unsupported or pressured shapes compare unequal.
 */
export function evaluationValueSnapshotsHaveEqualExecutionState(
  left: EvaluationValue,
  right: EvaluationValue,
): boolean {
  return new EvaluationSnapshotStateComparator().valuesEqual(left, right);
}

class EvaluationSnapshotStateComparator {
  private readonly valuePairs = new WeakMap<object, WeakSet<object>>();
  private remainingPairs = 10_000;
  private depth = 0;

  valuesEqual(left: EvaluationValue, right: EvaluationValue): boolean {
    if (this.depth >= 256) {
      return false;
    }
    this.depth += 1;
    try {
      if (
        left.kind === EvaluationValueKind.Unknown
        || left.kind === EvaluationValueKind.BoundaryValue
        || left.kind === EvaluationValueKind.BoundaryObject
        || left.kind === EvaluationValueKind.StringPattern
        || left.kind === EvaluationValueKind.RegularExpression
        || left.kind === EvaluationValueKind.Date
        || left.kind === EvaluationValueKind.Array
        || left.kind === EvaluationValueKind.Set
        || left.kind === EvaluationValueKind.Map
      ) {
        return false;
      }
      if (left === right) {
        return true;
      }
      if (left.kind !== right.kind || !this.spendPair()) {
        return false;
      }

      switch (left.kind) {
      case EvaluationValueKind.Undefined:
      case EvaluationValueKind.Null: {
        const other = sameKindValue(left, right);
        return left.node === other.node;
      }
      case EvaluationValueKind.Boolean:
      case EvaluationValueKind.String: {
        const other = sameKindValue(left, right);
        return left.value === other.value && left.node === other.node;
      }
      case EvaluationValueKind.Number: {
        const other = sameKindValue(left, right);
        return Object.is(left.value, other.value) && left.node === other.node;
      }
      case EvaluationValueKind.BigInt: {
        const other = sameKindValue(left, right);
        return left.text === other.text && left.node === other.node;
      }
      case EvaluationValueKind.Object: {
        const other = sameKindValue(left, right);
        if (!evaluationValuesShareLineage(left, other)) {
          return false;
        }
        if (this.valuePairWasSeen(left, other)) return true;
        return left.node === other.node
          && left.mayHaveUnknownProperties === false
          && other.mayHaveUnknownProperties === false
          && left.uncertainties.length === 0
          && other.uncertainties.length === 0
          && left.shapeOpenSeams.length === 0
          && other.shapeOpenSeams.length === 0
          && left.propertyOrderOpenSeams.length === 0
          && other.propertyOrderOpenSeams.length === 0
          && this.propertiesEqual(left.properties, other.properties);
      }
      case EvaluationValueKind.Function: {
        const other = sameKindValue(left, right);
        if (!evaluationValuesShareLineage(left, other)) {
          return false;
        }
        if (this.valuePairWasSeen(left, other)) return true;
        return left.declaration === other.declaration
          && left.node === other.node
          && this.localPropertyCarrierStateEqual(left, other)
          && this.capturedBindingsEqual(left, other);
      }
      case EvaluationValueKind.Class: {
        const other = sameKindValue(left, right);
        if (!evaluationValuesShareLineage(left, other)) {
          return false;
        }
        if (this.valuePairWasSeen(left, other)) return true;
        return left.declaration === other.declaration
          && left.node === other.node
          && this.localPropertyCarrierStateEqual(left, other)
          && this.nullableValuesEqual(left.baseClass, other.baseClass);
      }
      case EvaluationValueKind.Instance: {
        const other = sameKindValue(left, right);
        if (!evaluationValuesShareLineage(left, other)) {
          return false;
        }
        if (this.valuePairWasSeen(left, other)) return true;
        return left.node === other.node
          && left.mayHaveUnknownProperties === false
          && other.mayHaveUnknownProperties === false
          && left.constructionOpenSeams.length === 0
          && other.constructionOpenSeams.length === 0
          && left.shapeOpenSeams.length === 0
          && other.shapeOpenSeams.length === 0
          && left.propertyOrderOpenSeams.length === 0
          && other.propertyOrderOpenSeams.length === 0
          && this.valuesEqual(left.classValue, other.classValue)
          && this.propertiesEqual(left.properties, other.properties);
      }
      case EvaluationValueKind.ModuleNamespace: {
        const other = sameKindValue(left, right);
        if (!evaluationValuesShareLineage(left, other)) {
          return false;
        }
        if (this.valuePairWasSeen(left, other)) return true;
        if (
          left.moduleKey !== other.moduleKey
          || left.mayHaveUnknownExports
          || other.mayHaveUnknownExports
          || left.node !== other.node
          || left.exportEntries.size !== other.exportEntries.size
        ) {
          return false;
        }
        for (const [name, entry] of left.exportEntries) {
          const otherEntry = other.exportEntries.get(name);
          if (
            otherEntry == null
            || entry.sourceNode !== otherEntry.sourceNode
            || entry.openSeams.length > 0
            || otherEntry.openSeams.length > 0
            || !this.valuesEqual(entry.value, otherEntry.value)
          ) {
            return false;
          }
        }
        return true;
      }
      case EvaluationValueKind.Promise: {
        const other = sameKindValue(left, right);
        if (!evaluationValuesShareLineage(left, other)) {
          return false;
        }
        if (this.valuePairWasSeen(left, other)) return true;
        return left.node === other.node
          && left.settlement.kind === other.settlement.kind
          && left.settlement.evidence.openSeams.length === 0
          && other.settlement.evidence.openSeams.length === 0
          && this.valuesEqual(left.settlement.evidence.value, other.settlement.evidence.value);
      }
      }
    } finally {
      this.depth -= 1;
    }
  }

  private localPropertyCarrierStateEqual(
    left: EvaluationFunctionValue | EvaluationClassValue,
    right: EvaluationFunctionValue | EvaluationClassValue,
  ): boolean {
    return left.mayHaveUnknownProperties === false
      && right.mayHaveUnknownProperties === false
      && left.shapeOpenSeams.length === 0
      && right.shapeOpenSeams.length === 0
      && left.propertyOrderOpenSeams.length === 0
      && right.propertyOrderOpenSeams.length === 0
      && this.propertiesEqual(left.properties, right.properties);
  }

  private capturedBindingsEqual(left: EvaluationFunctionValue, right: EvaluationFunctionValue): boolean {
    const names = referencedIdentifierNames(left.declaration);
    if (declarationsWithUnsupportedLexicalMeta.has(left.declaration)) {
      return false;
    }
    for (const name of names) {
      const leftBinding = left.environment.readBinding(name);
      const rightBinding = right.environment.readBinding(name);
      if (leftBinding == null && rightBinding == null) {
        continue;
      }
      if (
        leftBinding == null
        || rightBinding == null
        || leftBinding.bindingKind !== rightBinding.bindingKind
        || leftBinding.mutable !== rightBinding.mutable
        || leftBinding.declaration !== rightBinding.declaration
        || leftBinding.state !== EvaluationBindingState.Initialized
        || rightBinding.state !== EvaluationBindingState.Initialized
        || leftBinding.openSeams.length > 0
        || rightBinding.openSeams.length > 0
        || !this.valuesEqual(leftBinding.value, rightBinding.value)
      ) {
        return false;
      }
    }
    return true;
  }

  private propertiesEqual(
    left: ReadonlyMap<string, EvaluationObjectProperty>,
    right: ReadonlyMap<string, EvaluationObjectProperty>,
  ): boolean {
    if (left.size !== right.size || !sameStrings([...left.keys()], [...right.keys()])) {
      return false;
    }
    for (const [name, property] of left) {
      const other = right.get(name);
      if (
        other == null
        || property.name !== other.name
        || property.node !== other.node
        || property.state !== EvaluationObjectPropertyState.Closed
        || other.state !== EvaluationObjectPropertyState.Closed
        || property.presence !== EvaluationObjectPropertyPresence.Present
        || other.presence !== EvaluationObjectPropertyPresence.Present
        || property.openSeams.length > 0
        || other.openSeams.length > 0
        || property.presenceOpenSeams.length > 0
        || other.presenceOpenSeams.length > 0
        || !this.valuesEqual(property.value, other.value)
      ) {
        return false;
      }
    }
    return true;
  }

  private nullableValuesEqual(left: EvaluationValue | null, right: EvaluationValue | null): boolean {
    return left == null || right == null ? left === right : this.valuesEqual(left, right);
  }

  private valuePairWasSeen(left: EvaluationValue, right: EvaluationValue): boolean {
    if (typeof left !== 'object' || typeof right !== 'object') {
      return true;
    }
    let rights = this.valuePairs.get(left);
    if (rights == null) {
      rights = new WeakSet();
      this.valuePairs.set(left, rights);
    }
    if (rights.has(right)) {
      return true;
    }
    rights.add(right);
    return false;
  }

  private spendPair(): boolean {
    this.remainingPairs -= 1;
    return this.remainingPairs >= 0;
  }
}

function referencedIdentifierNames(node: ts.Node): ReadonlySet<string> {
  const cached = referencedIdentifierNamesByDeclaration.get(node);
  if (cached != null) {
    return cached;
  }
  const names = new Set<string>();
  let hasUnsupportedLexicalMeta = false;
  const visit = (current: ts.Node): void => {
    if (ts.isTypeNode(current)) {
      return;
    }
    if (current.kind === ts.SyntaxKind.ThisKeyword) {
      names.add('this');
    }
    if (current.kind === ts.SyntaxKind.SuperKeyword || ts.isMetaProperty(current)) {
      hasUnsupportedLexicalMeta = true;
    }
    if (ts.isIdentifier(current)) {
      names.add(current.text);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  if (hasUnsupportedLexicalMeta) {
    declarationsWithUnsupportedLexicalMeta.add(node);
  }
  referencedIdentifierNamesByDeclaration.set(node, names);
  return names;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameKindValue<TValue extends EvaluationValue>(
  _left: TValue,
  right: EvaluationValue,
): TValue {
  return right as TValue;
}
