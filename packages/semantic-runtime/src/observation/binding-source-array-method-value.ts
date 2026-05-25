import {
  BindingContextSlot,
  BindingScope,
  BindingScopeOwnerKind,
} from '../configuration/scope.js';
import { uncommittedScopeFromParent } from '../configuration/uncommitted-binding-scope.js';
import type {
  ArrowFunction,
  CallMemberExpression,
} from '../expression/ast.js';
import {
  aureliaArrayMethodSemanticsFor,
} from '../expression/array-method-semantics.js';
import {
  evaluationArrayElementsInIterationOrder,
  evaluationArrayIterationCallbackArguments,
  evaluationArrayReducerCallbackArguments,
} from '../evaluation/array-callback-values.js';
import {
  evaluationArrayConcat,
  evaluationArrayFlat,
  evaluationArraySlice,
  evaluationArraySortedElements,
  evaluationArrayToReversed,
  evaluationArrayToSpliced,
  evaluationArrayWith,
  defaultEvaluationArraySortCompare,
} from '../evaluation/array-value-operations.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  evaluationValuesEqual,
  readEvaluationTruthiness,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  readArrayStartIndex,
  readArrayAtIndex,
  readArrayLastIndexStart,
  readArraySpliceDeleteCount,
  readArrayWithIndex,
  readSliceBound,
  stringCoercionText,
} from '../evaluation/value-coercion.js';
import type { KernelStore } from '../kernel/store.js';
import {
  openBindingSourceNeedsRuntimeValue,
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationKind,
} from './binding-source-value-evaluation.js';
import type { RuntimeBindingSourceValueEvaluationContext } from './binding-source-value-evaluation-context.js';

const maxSourceValueCallbackEvaluations = 1_000;

/** Binding-source reducer for native array methods on closed source-value arrays. */
export class RuntimeBindingSourceArrayMethodEvaluator {
  constructor(
    private readonly store: KernelStore,
    private readonly evaluateContext: (
      context: RuntimeBindingSourceValueEvaluationContext,
    ) => RuntimeBindingSourceValueEvaluation,
  ) {}

  evaluateMemberCall(
    expression: CallMemberExpression,
    receiver: EvaluationValue,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    if (receiver.kind !== EvaluationValueKind.Array) {
      return null;
    }

    const callbackExpression = expression.args[0];
    if (callbackExpression?.$kind === 'ArrowFunction' && receiver.elements.length > maxSourceValueCallbackEvaluations) {
      return openBindingSourceNeedsRuntimeValue(`Array.${expression.name.name} exceeded the source-value callback budget.`);
    }

    const method = expression.name.name;
    const semantics = aureliaArrayMethodSemanticsFor(method);
    switch (method) {
      case 'at':
        return this.evaluateAtCall(receiver, expression, context);
      case 'concat':
        return this.evaluateConcatCall(receiver, expression, context);
      case 'includes':
        return this.evaluateIncludesCall(receiver, expression, context);
      case 'indexOf':
        return this.evaluateIndexOfCall(receiver, expression, context, false);
      case 'lastIndexOf':
        return this.evaluateIndexOfCall(receiver, expression, context, true);
      case 'join':
        return this.evaluateJoinCall(receiver, expression, context);
      case 'slice':
        return this.evaluateSliceCall(receiver, expression, context);
      case 'flat':
        return this.evaluateFlatCall(receiver, expression, context);
      case 'toReversed':
        return this.evaluateToReversedCall(receiver);
      case 'map':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateMapCall(receiver, callbackExpression, context);
      case 'flatMap':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateFlatMapCall(receiver, callbackExpression, context);
      case 'filter':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateFilterCall(receiver, callbackExpression, context);
      case 'find':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateFindCall(receiver, callbackExpression, context, false);
      case 'findLast':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateFindCall(receiver, callbackExpression, context, true);
      case 'findIndex':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateFindIndexCall(receiver, callbackExpression, context, false);
      case 'findLastIndex':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateFindIndexCall(receiver, callbackExpression, context, true);
      case 'some':
      case 'every':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateQuantifierCall(receiver, callbackExpression, context, method);
      case 'forEach':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateForEachCall(receiver, callbackExpression, context);
      case 'reduce':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateReduceCall(receiver, callbackExpression, context, false, expression.args[1] ?? null);
      case 'reduceRight':
        if (callbackExpression?.$kind !== 'ArrowFunction') {
          return null;
        }
        return this.evaluateReduceCall(receiver, callbackExpression, context, true, expression.args[1] ?? null);
      case 'toSorted':
        return this.evaluateToSortedCall(receiver, expression, context);
      case 'toSpliced':
        return this.evaluateToSplicedCall(receiver, expression, context);
      case 'with':
        return this.evaluateWithCall(receiver, expression, context);
      case 'sort':
        return openBindingSourceNeedsRuntimeValue('Array.sort source-value reduction is intentionally open because it mutates the receiver.');
      default:
        if (semantics?.callbackParameterShape != null) {
          return openBindingSourceNeedsRuntimeValue(`Array.${method} callback source-value reduction is not modeled yet.`);
        }
        return semantics?.typeProjectionKind == null
          ? null
          : openBindingSourceNeedsRuntimeValue(`Array.${method} is type-visible but depends on runtime mutation or unmodeled host array semantics for source-value reduction.`);
    }
  }

  private evaluateAtCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const indexValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (indexValue.kind === RuntimeBindingSourceValueEvaluationKind.Open || indexValue.value == null) {
      return indexValue.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? indexValue
        : openBindingSourceNeedsRuntimeValue('Array.at index did not close.');
    }
    if (receiver.mayHaveUnknownOrder) {
      return openBindingSourceNeedsRuntimeValue('Array.at receiver order did not close.');
    }
    const index = readArrayAtIndex(indexValue.value, receiver.elements.length);
    if (index == null) {
      return openBindingSourceNeedsRuntimeValue('Array.at index did not reduce to a finite number.');
    }
    return RuntimeBindingSourceValueEvaluation.value(receiver.elements[index]?.value ?? EvaluationUndefined);
  }

  private evaluateConcatCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const argumentValues: EvaluationValue[] = [];
    for (let index = 0; index < expression.args.length; index += 1) {
      const argument = this.evaluateArgument(expression, context, index);
      if (argument.kind === RuntimeBindingSourceValueEvaluationKind.Open || argument.value == null) {
        return argument.kind === RuntimeBindingSourceValueEvaluationKind.Open
          ? argument
          : openBindingSourceNeedsRuntimeValue(`Array.concat argument ${index} did not close.`);
      }
      argumentValues.push(argument.value);
    }
    return RuntimeBindingSourceValueEvaluation.value(evaluationArrayConcat(receiver, argumentValues, null));
  }

  private evaluateIncludesCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const search = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (search.kind === RuntimeBindingSourceValueEvaluationKind.Open || search.value == null) {
      return search.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? search
        : openBindingSourceNeedsRuntimeValue('Array.includes search value did not close.');
    }
    const start = this.readStartIndex(expression, context, receiver.elements.length);
    if (start == null || receiver.mayHaveUnknownOrder) {
      return openBindingSourceNeedsRuntimeValue('Array.includes start index or element order did not close.');
    }
    const found = receiver.elements
      .slice(start)
      .some((element) => evaluationValuesEqual(element.value, search.value!));
    return found || !receiver.mayHaveUnknownElements
      ? RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(found, null))
      : openBindingSourceNeedsRuntimeValue('Array.includes search did not match known elements and the array may contain unknown elements.');
  }

  private evaluateIndexOfCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'lastIndexOf' : 'indexOf';
    const search = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (search.kind === RuntimeBindingSourceValueEvaluationKind.Open || search.value == null) {
      return search.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? search
        : openBindingSourceNeedsRuntimeValue(`Array.${method} search value did not close.`);
    }
    const start = rightToLeft
      ? this.readLastIndexStart(expression, context, receiver.elements.length)
      : this.readStartIndex(expression, context, receiver.elements.length);
    if (start == null || receiver.mayHaveUnknownOrder) {
      return openBindingSourceNeedsRuntimeValue(`Array.${method} start index or element order did not close.`);
    }
    const foundIndex = rightToLeft
      ? receiver.elements.slice(0, start + 1).findLastIndex((element) => evaluationValuesEqual(element.value, search.value!))
      : receiver.elements.slice(start).findIndex((element) => evaluationValuesEqual(element.value, search.value!));
    if (foundIndex >= 0) {
      return RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(rightToLeft ? foundIndex : start + foundIndex, null));
    }
    return receiver.mayHaveUnknownElements
      ? openBindingSourceNeedsRuntimeValue(`Array.${method} search did not match known elements and the array may contain unknown elements.`)
      : RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(-1, null));
  }

  private evaluateJoinCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return openBindingSourceNeedsRuntimeValue('Array.join receiver has unknown membership or order.');
    }
    const separatorValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (separatorValue.kind === RuntimeBindingSourceValueEvaluationKind.Open || separatorValue.value == null) {
      return separatorValue.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? separatorValue
        : openBindingSourceNeedsRuntimeValue('Array.join separator did not close.');
    }
    const separator = separatorValue.value.kind === EvaluationValueKind.Undefined
      ? ','
      : stringCoercionText(separatorValue.value);
    if (separator == null) {
      return openBindingSourceNeedsRuntimeValue('Array.join separator did not reduce to a string-coercible value.');
    }

    const parts: string[] = [];
    for (const element of receiver.elements) {
      if (element.value.kind === EvaluationValueKind.Undefined || element.value.kind === EvaluationValueKind.Null) {
        parts.push('');
        continue;
      }
      const text = stringCoercionText(element.value);
      if (text == null) {
        return openBindingSourceNeedsRuntimeValue('Array.join element did not reduce to a string-coercible value.');
      }
      parts.push(text);
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(parts.join(separator), null));
  }

  private evaluateSliceCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const range = this.readSliceRange(expression, context, receiver.elements.length);
    if (range == null) {
      return openBindingSourceNeedsRuntimeValue('Array.slice range did not close.');
    }
    return RuntimeBindingSourceValueEvaluation.value(evaluationArraySlice(receiver, range.start, range.end, null));
  }

  private evaluateFlatCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const depthValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (depthValue.kind === RuntimeBindingSourceValueEvaluationKind.Open || depthValue.value == null) {
      return depthValue.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? depthValue
        : openBindingSourceNeedsRuntimeValue('Array.flat depth did not close.');
    }
    const depth = depthValue.value.kind === EvaluationValueKind.Undefined
      ? 1
      : depthValue.value.kind === EvaluationValueKind.Number && Number.isFinite(depthValue.value.value)
        ? Math.max(0, Math.trunc(depthValue.value.value))
        : null;
    if (depth == null) {
      return openBindingSourceNeedsRuntimeValue('Array.flat depth did not reduce to a finite number.');
    }
    return RuntimeBindingSourceValueEvaluation.value(evaluationArrayFlat(receiver, depth, null));
  }

  private evaluateToReversedCall(receiver: EvaluationArrayValue): RuntimeBindingSourceValueEvaluation {
    return RuntimeBindingSourceValueEvaluation.value(evaluationArrayToReversed(receiver, null));
  }

  private evaluateToSortedCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const comparator = expression.args[0] ?? null;
    const sorted = comparator == null
      ? evaluationArraySortedElements(receiver.elements, defaultEvaluationArraySortCompare)
      : comparator.$kind === 'ArrowFunction'
        ? evaluationArraySortedElements(receiver.elements, (left, right) => {
            const result = this.evaluateArrowFunctionCallback(
              comparator,
              [left.value, right.value],
              context,
              'Array.toSorted comparator',
            );
            return result.kind === RuntimeBindingSourceValueEvaluationKind.Value
              && result.value?.kind === EvaluationValueKind.Number
              ? result.value.value
              : null;
          })
        : null;
    if (sorted == null) {
      return openBindingSourceNeedsRuntimeValue('Array.toSorted comparator source-value reduction needs an inline Aurelia arrow function or no comparator.');
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(
      sorted.elements,
      receiver.mayHaveUnknownElements,
      null,
      receiver.mayHaveUnknownOrder || sorted.mayHaveUnknownOrder,
    ));
  }

  private evaluateToSplicedCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const startArgument = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (startArgument.kind === RuntimeBindingSourceValueEvaluationKind.Open || startArgument.value == null) {
      return startArgument.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? startArgument
        : openBindingSourceNeedsRuntimeValue('Array.toSpliced start index did not close.');
    }
    const start = readArrayStartIndex(startArgument.value, receiver.elements.length);
    if (start == null) {
      return openBindingSourceNeedsRuntimeValue('Array.toSpliced start index did not reduce to a finite number.');
    }
    let deleteCountValue: EvaluationValue | null = null;
    if (expression.args[1] != null) {
      const deleteCountArgument = this.evaluateArgument(expression, context, 1);
      if (deleteCountArgument.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
        return deleteCountArgument;
      }
      deleteCountValue = deleteCountArgument.value;
    }
    const deleteCount = readArraySpliceDeleteCount(
      deleteCountValue,
      start,
      receiver.elements.length,
      expression.args[0] != null,
      expression.args[1] != null,
    );
    if (deleteCount == null) {
      return openBindingSourceNeedsRuntimeValue('Array.toSpliced delete count did not reduce to a finite number.');
    }

    const inserted: EvaluationArrayElement[] = [];
    for (let index = 2; index < expression.args.length; index += 1) {
      const argument = this.evaluateArgument(expression, context, index);
      if (argument.kind === RuntimeBindingSourceValueEvaluationKind.Open || argument.value == null) {
        return argument.kind === RuntimeBindingSourceValueEvaluationKind.Open
          ? argument
          : openBindingSourceNeedsRuntimeValue(`Array.toSpliced inserted value ${index - 2} did not close.`);
      }
      inserted.push(new EvaluationArrayElement(argument.value, null));
    }

    return RuntimeBindingSourceValueEvaluation.value(evaluationArrayToSpliced(
      receiver,
      start,
      deleteCount,
      inserted,
      false,
      false,
      null,
    ));
  }

  private evaluateWithCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const indexArgument = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (indexArgument.kind === RuntimeBindingSourceValueEvaluationKind.Open || indexArgument.value == null) {
      return indexArgument.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? indexArgument
        : openBindingSourceNeedsRuntimeValue('Array.with index did not close.');
    }
    const index = readArrayWithIndex(indexArgument.value, receiver.elements.length);
    if (index == null) {
      return openBindingSourceNeedsRuntimeValue('Array.with index did not reduce to an in-range index.');
    }
    const replacement = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    if (replacement.kind === RuntimeBindingSourceValueEvaluationKind.Open || replacement.value == null) {
      return replacement.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? replacement
        : openBindingSourceNeedsRuntimeValue('Array.with replacement value did not close.');
    }
    return RuntimeBindingSourceValueEvaluation.value(evaluationArrayWith(receiver, index, replacement.value, null));
  }

  private evaluateMapCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const elements: EvaluationArrayElement[] = [];
    for (let index = 0; index < receiver.elements.length; index += 1) {
      const element = receiver.elements[index];
      if (element == null) {
        continue;
      }
      const mapped = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.map callback ${index}`,
      );
      if (mapped.kind === RuntimeBindingSourceValueEvaluationKind.Open || mapped.value == null) {
        return RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue([], true, null, true));
      }
      elements.push(new EvaluationArrayElement(mapped.value, element.expression));
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(
      elements,
      receiver.mayHaveUnknownElements,
      null,
      receiver.mayHaveUnknownOrder,
    ));
  }

  private evaluateFlatMapCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const elements: EvaluationArrayElement[] = [];
    let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
    for (let index = 0; index < receiver.elements.length; index += 1) {
      const element = receiver.elements[index];
      if (element == null) {
        continue;
      }
      const mapped = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.flatMap callback ${index}`,
      );
      if (mapped.kind === RuntimeBindingSourceValueEvaluationKind.Open || mapped.value == null) {
        mayHaveUnknownElements = true;
        continue;
      }
      if (mapped.value.kind === EvaluationValueKind.Array) {
        elements.push(...mapped.value.elements);
        mayHaveUnknownElements ||= mapped.value.mayHaveUnknownElements;
      } else {
        elements.push(new EvaluationArrayElement(mapped.value, element.expression));
      }
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(
      elements,
      mayHaveUnknownElements,
      null,
      receiver.mayHaveUnknownOrder,
    ));
  }

  private evaluateFilterCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const elements: EvaluationArrayElement[] = [];
    let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
    for (let index = 0; index < receiver.elements.length; index += 1) {
      const element = receiver.elements[index];
      if (element == null) {
        continue;
      }
      const predicate = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.filter predicate ${index}`,
      );
      if (predicate.kind === RuntimeBindingSourceValueEvaluationKind.Open || predicate.value == null) {
        mayHaveUnknownElements = true;
        continue;
      }
      const keep = readEvaluationTruthiness(predicate.value);
      if (keep == null) {
        mayHaveUnknownElements = true;
      } else if (keep) {
        elements.push(element);
      }
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(
      elements,
      mayHaveUnknownElements,
      null,
      receiver.mayHaveUnknownOrder,
    ));
  }

  private evaluateFindCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'findLast' : 'find';
    let sawOpenPredicate = receiver.mayHaveUnknownElements;
    for (const { element, index } of evaluationArrayElementsInIterationOrder(receiver, rightToLeft)) {
      if (element == null) {
        continue;
      }
      const predicate = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.${method} predicate ${index}`,
      );
      if (predicate.kind === RuntimeBindingSourceValueEvaluationKind.Open || predicate.value == null) {
        sawOpenPredicate = true;
        continue;
      }
      const keep = readEvaluationTruthiness(predicate.value);
      if (keep == null) {
        sawOpenPredicate = true;
      } else if (keep) {
        return RuntimeBindingSourceValueEvaluation.value(element.value);
      }
    }
    return sawOpenPredicate
      ? openBindingSourceNeedsRuntimeValue(`Array.${method} result depended on an open predicate or unknown element membership.`)
      : RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
  }

  private evaluateFindIndexCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'findLastIndex' : 'findIndex';
    let sawOpenPredicate = receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder;
    for (const { element, index } of evaluationArrayElementsInIterationOrder(receiver, rightToLeft)) {
      if (element == null) {
        continue;
      }
      const predicate = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.${method} predicate ${index}`,
      );
      if (predicate.kind === RuntimeBindingSourceValueEvaluationKind.Open || predicate.value == null) {
        sawOpenPredicate = true;
        continue;
      }
      const keep = readEvaluationTruthiness(predicate.value);
      if (keep == null) {
        sawOpenPredicate = true;
      } else if (keep) {
        return RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(index, null));
      }
    }
    return sawOpenPredicate
      ? openBindingSourceNeedsRuntimeValue(`Array.${method} result depended on an open predicate, unknown order, or unknown membership.`)
      : RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(-1, null));
  }

  private evaluateQuantifierCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    kind: 'some' | 'every',
  ): RuntimeBindingSourceValueEvaluation {
    let sawOpenPredicate = receiver.mayHaveUnknownElements;
    for (let index = 0; index < receiver.elements.length; index += 1) {
      const element = receiver.elements[index];
      if (element == null) {
        continue;
      }
      const predicate = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.${kind} predicate ${index}`,
      );
      if (predicate.kind === RuntimeBindingSourceValueEvaluationKind.Open || predicate.value == null) {
        sawOpenPredicate = true;
        continue;
      }
      const keep = readEvaluationTruthiness(predicate.value);
      if (keep == null) {
        sawOpenPredicate = true;
        continue;
      }
      if (kind === 'some' && keep) {
        return RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(true, null));
      }
      if (kind === 'every' && !keep) {
        return RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(false, null));
      }
    }
    return sawOpenPredicate
      ? openBindingSourceNeedsRuntimeValue(`Array.${kind} result depended on an open predicate or unknown element membership.`)
      : RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(kind === 'every', null));
  }

  private evaluateForEachCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return openBindingSourceNeedsRuntimeValue('Array.forEach receiver has unknown membership or order.');
    }
    for (let index = 0; index < receiver.elements.length; index += 1) {
      const element = receiver.elements[index];
      if (element == null) {
        continue;
      }
      const result = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayIterationCallbackArguments(element, index, receiver, null),
        context,
        `Array.forEach callback ${index}`,
      );
      if (result.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
        return result;
      }
    }
    return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
  }

  private evaluateReduceCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
    initialExpression: CallMemberExpression['args'][number] | null,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'reduceRight' : 'reduce';
    const ordered = evaluationArrayElementsInIterationOrder(receiver, rightToLeft);
    let accumulator: EvaluationValue;
    let start = 0;
    if (initialExpression == null) {
      const first = ordered[0]?.element ?? null;
      if (first == null) {
        return openBindingSourceNeedsRuntimeValue(`Array.${method} had no initial value and no known first element.`);
      }
      accumulator = first.value;
      start = 1;
    } else {
      const initial = this.evaluateContext(context.child(initialExpression));
      if (initial.kind === RuntimeBindingSourceValueEvaluationKind.Open || initial.value == null) {
        return initial.kind === RuntimeBindingSourceValueEvaluationKind.Open
          ? initial
          : openBindingSourceNeedsRuntimeValue(`Array.${method} initial value did not close.`);
      }
      accumulator = initial.value;
    }

    for (let position = start; position < ordered.length; position += 1) {
      const { element, index } = ordered[position]!;
      if (element == null) {
        continue;
      }
      const result = this.evaluateArrowFunctionCallback(
        callback,
        evaluationArrayReducerCallbackArguments(accumulator, element, index, receiver, null),
        context,
        `Array.${method} reducer ${index}`,
      );
      if (result.kind === RuntimeBindingSourceValueEvaluationKind.Open || result.value == null) {
        return result.kind === RuntimeBindingSourceValueEvaluationKind.Open
          ? result
          : openBindingSourceNeedsRuntimeValue(`Array.${method} reducer result did not close.`);
      }
      accumulator = result.value;
    }
    return receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder
      ? openBindingSourceNeedsRuntimeValue(`Array.${method} result depended on unknown element membership or order.`)
      : RuntimeBindingSourceValueEvaluation.value(accumulator);
  }

  private evaluateArgument(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    index: number,
  ): RuntimeBindingSourceValueEvaluation {
    const argument = expression.args[index] ?? null;
    return argument == null
      ? RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined)
      : this.evaluateContext(context.child(argument));
  }

  private evaluateOptionalArgument(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    index: number,
    fallback: EvaluationValue,
  ): RuntimeBindingSourceValueEvaluation {
    const argument = expression.args[index] ?? null;
    return argument == null
      ? RuntimeBindingSourceValueEvaluation.value(fallback)
      : this.evaluateContext(context.child(argument));
  }

  private readStartIndex(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    length: number,
  ): number | null {
    const argument = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    return argument.kind === RuntimeBindingSourceValueEvaluationKind.Open || argument.value == null
      ? null
      : readArrayStartIndex(argument.value, length);
  }

  private readLastIndexStart(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    length: number,
  ): number | null {
    const argument = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    return argument.kind === RuntimeBindingSourceValueEvaluationKind.Open || argument.value == null
      ? null
      : readArrayLastIndexStart(argument.value, length);
  }

  private readSliceRange(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    length: number,
  ): { readonly start: number; readonly end: number } | null {
    const startValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    const endValue = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    if (
      startValue.kind === RuntimeBindingSourceValueEvaluationKind.Open
      || startValue.value == null
      || endValue.kind === RuntimeBindingSourceValueEvaluationKind.Open
      || endValue.value == null
    ) {
      return null;
    }
    const start = readSliceBound(startValue.value, length, 0);
    const end = readSliceBound(endValue.value, length, length);
    return start == null || end == null
      ? null
      : {
        start: Math.min(Math.max(start, 0), length),
        end: Math.min(Math.max(end, 0), length),
      };
  }

  private evaluateArrowFunctionCallback(
    expression: ArrowFunction,
    argumentValues: readonly EvaluationValue[],
    context: RuntimeBindingSourceValueEvaluationContext,
    localKey: string,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateContext(context.child(expression.body, this.arrowFunctionScope(expression, argumentValues, context, localKey)));
  }

  private arrowFunctionScope(
    expression: ArrowFunction,
    argumentValues: readonly EvaluationValue[],
    context: RuntimeBindingSourceValueEvaluationContext,
    localKey: string,
  ): BindingScope {
    const scopeLocalKey = `runtime-binding-source-arrow:${expression.span.start}:${expression.span.end}:${localKey}`;
    const lastIndex = expression.args.length - 1;
    const slots = expression.args.map((param, index) =>
      new BindingContextSlot(
        param.name.name,
        null,
        null,
        null,
        null,
        [],
        expression.rest && index === lastIndex
          ? new EvaluationArrayValue(
              argumentValues.slice(index).map((value) => new EvaluationArrayElement(value, null)),
              false,
              null,
            )
          : argumentValues[index] ?? EvaluationUndefined,
      )
    );
    return uncommittedScopeFromParent(this.store, {
      localKey: scopeLocalKey,
      parent: context.scope,
      bindingContextSlots: slots,
      ownerKind: BindingScopeOwnerKind.SyntheticView,
    });
  }
}
