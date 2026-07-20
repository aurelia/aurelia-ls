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
  EvaluationArrayCallbackRead,
  EvaluationArrayMethodDecision,
  EvaluationArrayMethodDecisionKind,
  evaluationArrayFilterDecision,
  evaluationArrayFindDecision,
  evaluationArrayFindIndexDecision,
  evaluationArrayFlatMapDecision,
  evaluationArrayForEachDecision,
  evaluationArrayMapDecision,
  evaluationArrayQuantifierDecision,
  evaluationArrayReduceDecision,
} from '../evaluation/array-callback-values.js';
import {
  evaluationArrayConcat,
  evaluationExactArrayAt,
  evaluationExactArrayIncludes,
  evaluationExactArrayIndexOf,
  evaluationExactArrayJoin,
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
  EvaluationUnknownValue,
  EvaluationValueKind,
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
import type { KernelStoreReadView } from '../kernel/store.js';
import {
  openBindingSourceNeedsRuntimeValue,
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationClosure,
  bindingSourceValueEvaluationWithPressure,
} from '../configuration/binding-source-value-evaluation.js';
import type { RuntimeBindingSourceValueEvaluationContext } from './binding-source-value-evaluation-context.js';

const maxSourceValueCallbackEvaluations = 1_000;

/** Binding-source reducer for native array methods on closed source-value arrays. */
export class RuntimeBindingSourceArrayMethodEvaluator {
  constructor(
    private readonly store: KernelStoreReadView,
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
    if (indexValue.abruptCompletion != null || indexValue.value == null) {
      return indexValue;
    }
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.at receiver membership or order did not close.'),
        [indexValue],
      );
    }
    const index = readArrayAtIndex(indexValue.value, receiver.elements.length);
    if (index == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.at index did not reduce to a finite number.'),
        [indexValue],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(evaluationExactArrayAt(receiver, index)),
      [indexValue],
    );
  }

  private evaluateConcatCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const argumentValues: EvaluationValue[] = [];
    const pressure: RuntimeBindingSourceValueEvaluation[] = [];
    for (let index = 0; index < expression.args.length; index += 1) {
      const argument = this.evaluateArgument(expression, context, index);
      if (argument.abruptCompletion != null || argument.value == null) {
        return bindingSourceValueEvaluationWithPressure(argument, pressure);
      }
      argumentValues.push(argument.value);
      pressure.push(argument);
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(evaluationArrayConcat(receiver, argumentValues, null)),
      pressure,
    );
  }

  private evaluateIncludesCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const search = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (search.abruptCompletion != null || search.value == null) {
      return search;
    }
    const start = this.evaluateStartIndex(expression, context, receiver.elements.length, false);
    if (start.abruptCompletion != null || start.value?.kind !== EvaluationValueKind.Number) {
      return bindingSourceValueEvaluationWithPressure(start, [search]);
    }
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.includes receiver membership or order did not close.'),
        [search, start],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(
        evaluationExactArrayIncludes(receiver, search.value, start.value.value),
        null,
      )),
      [search, start],
    );
  }

  private evaluateIndexOfCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'lastIndexOf' : 'indexOf';
    const search = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (search.abruptCompletion != null || search.value == null) {
      return search;
    }
    const start = this.evaluateStartIndex(expression, context, receiver.elements.length, rightToLeft);
    if (start.abruptCompletion != null || start.value?.kind !== EvaluationValueKind.Number) {
      return bindingSourceValueEvaluationWithPressure(start, [search]);
    }
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue(`Array.${method} receiver membership or order did not close.`),
        [search, start],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(
        evaluationExactArrayIndexOf(receiver, search.value, start.value.value, rightToLeft),
        null,
      )),
      [search, start],
    );
  }

  private evaluateJoinCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const separatorValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (separatorValue.abruptCompletion != null || separatorValue.value == null) {
      return separatorValue;
    }
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.join receiver membership or order did not close.'),
        [separatorValue],
      );
    }
    const separator = separatorValue.value.kind === EvaluationValueKind.Undefined
      ? ','
      : stringCoercionText(separatorValue.value);
    if (separator == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.join separator did not reduce to a string-coercible value.'),
        [separatorValue],
      );
    }
    const joined = evaluationExactArrayJoin(receiver, separator);
    if (joined == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.join element did not reduce to a string-coercible value.'),
        [separatorValue],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(joined, null)),
      [separatorValue],
    );
  }

  private evaluateSliceCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const startValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    const endValue = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    if (startValue.abruptCompletion != null || startValue.value == null) {
      return startValue;
    }
    if (endValue.abruptCompletion != null || endValue.value == null) {
      return bindingSourceValueEvaluationWithPressure(endValue, [startValue]);
    }
    const start = readSliceBound(startValue.value, receiver.elements.length, 0);
    const end = readSliceBound(endValue.value, receiver.elements.length, receiver.elements.length);
    if (start == null || end == null || receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.slice range or receiver positions did not close.'),
        [startValue, endValue],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(evaluationArraySlice(
        receiver,
        Math.min(Math.max(start, 0), receiver.elements.length),
        Math.min(Math.max(end, 0), receiver.elements.length),
        null,
      )),
      [startValue, endValue],
    );
  }

  private evaluateFlatCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const depthValue = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (depthValue.abruptCompletion != null || depthValue.value == null) {
      return depthValue;
    }
    const depth = depthValue.value.kind === EvaluationValueKind.Undefined
      ? 1
      : depthValue.value.kind === EvaluationValueKind.Number && Number.isFinite(depthValue.value.value)
        ? Math.max(0, Math.trunc(depthValue.value.value))
        : null;
    if (depth == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.flat depth did not reduce to a finite number.'),
        [depthValue],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(evaluationArrayFlat(receiver, depth, null)),
      [depthValue],
    );
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
    const comparatorPressure: RuntimeBindingSourceValueEvaluation[] = [];
    let comparatorBlocker: RuntimeBindingSourceValueEvaluation | null = null;
    const sorted = comparator == null
      ? evaluationArraySortedElements(receiver.elements, defaultEvaluationArraySortCompare)
      : comparator.$kind === 'ArrowFunction'
        ? evaluationArraySortedElements(receiver.elements, (left, right) => {
            if (comparatorBlocker != null) {
              return null;
            }
            const result = this.evaluateArrowFunctionCallback(
              comparator,
              [left.value, right.value],
              context,
              'Array.toSorted comparator',
            );
            if (result.abruptCompletion != null) {
              comparatorBlocker = result;
              return null;
            }
            if (result.closure === RuntimeBindingSourceValueEvaluationClosure.Open) {
              comparatorPressure.push(result);
            }
            const comparatorValue = result.executableValue;
            return comparatorValue?.kind === EvaluationValueKind.Number
              ? comparatorValue.value
              : null;
          })
        : null;
    if (comparatorBlocker != null) {
      return bindingSourceValueEvaluationWithPressure(comparatorBlocker, comparatorPressure);
    }
    if (sorted == null) {
      return openBindingSourceNeedsRuntimeValue('Array.toSorted comparator source-value reduction needs an inline Aurelia arrow function or no comparator.');
    }
    const result = RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(
      sorted.elements,
      receiver.mayHaveUnknownElements,
      null,
      receiver.mayHaveUnknownOrder || sorted.mayHaveUnknownOrder,
      receiver.uncertainties,
    ));
    const methodPressure = receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder || sorted.mayHaveUnknownOrder
      ? [openBindingSourceNeedsRuntimeValue('Array.toSorted result order or membership did not close.')]
      : [];
    return bindingSourceValueEvaluationWithPressure(result, [...comparatorPressure, ...methodPressure]);
  }

  private evaluateToSplicedCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const pressure: RuntimeBindingSourceValueEvaluation[] = [];
    const startArgument = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (startArgument.abruptCompletion != null || startArgument.value == null) {
      return startArgument;
    }
    pressure.push(startArgument);
    const start = readArrayStartIndex(startArgument.value, receiver.elements.length);
    if (start == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.toSpliced start index did not reduce to a finite number.'),
        pressure,
      );
    }
    let deleteCountValue: EvaluationValue | null = null;
    if (expression.args[1] != null) {
      const deleteCountArgument = this.evaluateArgument(expression, context, 1);
      if (deleteCountArgument.abruptCompletion != null || deleteCountArgument.value == null) {
        return bindingSourceValueEvaluationWithPressure(deleteCountArgument, pressure);
      }
      deleteCountValue = deleteCountArgument.value;
      pressure.push(deleteCountArgument);
    }
    const deleteCount = readArraySpliceDeleteCount(
      deleteCountValue,
      start,
      receiver.elements.length,
      expression.args[0] != null,
      expression.args[1] != null,
    );
    if (deleteCount == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.toSpliced delete count did not reduce to a finite number.'),
        pressure,
      );
    }

    const inserted: EvaluationArrayElement[] = [];
    for (let index = 2; index < expression.args.length; index += 1) {
      const argument = this.evaluateArgument(expression, context, index);
      if (argument.abruptCompletion != null || argument.value == null) {
        return bindingSourceValueEvaluationWithPressure(argument, pressure);
      }
      inserted.push(new EvaluationArrayElement(argument.value, null));
      pressure.push(argument);
    }
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.toSpliced receiver membership or order did not close.'),
        pressure,
      );
    }

    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(evaluationArrayToSpliced(
        receiver,
        start,
        deleteCount,
        inserted,
        false,
        false,
        null,
      )),
      pressure,
    );
  }

  private evaluateWithCall(
    receiver: EvaluationArrayValue,
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const indexArgument = this.evaluateOptionalArgument(expression, context, 0, EvaluationUndefined);
    if (indexArgument.abruptCompletion != null || indexArgument.value == null) {
      return indexArgument;
    }
    const index = readArrayWithIndex(indexArgument.value, receiver.elements.length);
    if (index == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.with index did not reduce to an in-range index.'),
        [indexArgument],
      );
    }
    const replacement = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    if (replacement.abruptCompletion != null || replacement.value == null) {
      return bindingSourceValueEvaluationWithPressure(replacement, [indexArgument]);
    }
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Array.with receiver membership or order did not close.'),
        [indexArgument, replacement],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(evaluationArrayWith(receiver, index, replacement.value, null)),
      [indexArgument, replacement],
    );
  }

  private evaluateMapCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.foldDecision(evaluationArrayMapDecision(
      receiver,
      null,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.map callback ${index}`),
    ));
  }

  private evaluateFlatMapCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.foldDecision(evaluationArrayFlatMapDecision(
      receiver,
      null,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.flatMap callback ${index}`),
    ));
  }

  private evaluateFilterCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.foldDecision(evaluationArrayFilterDecision(
      receiver,
      null,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.filter predicate ${index}`),
    ));
  }

  private evaluateFindCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'findLast' : 'find';
    return this.foldDecision(evaluationArrayFindDecision(
      receiver,
      null,
      rightToLeft,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.${method} predicate ${index}`),
    ));
  }

  private evaluateFindIndexCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'findLastIndex' : 'findIndex';
    return this.foldDecision(evaluationArrayFindIndexDecision(
      receiver,
      null,
      rightToLeft,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.${method} predicate ${index}`),
    ));
  }

  private evaluateQuantifierCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    kind: 'some' | 'every',
  ): RuntimeBindingSourceValueEvaluation {
    return this.foldDecision(evaluationArrayQuantifierDecision(
      receiver,
      null,
      kind,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.${kind} predicate ${index}`),
    ));
  }

  private evaluateForEachCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.foldDecision(evaluationArrayForEachDecision(
      receiver,
      null,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.forEach callback ${index}`),
    ));
  }

  private evaluateReduceCall(
    receiver: EvaluationArrayValue,
    callback: ArrowFunction,
    context: RuntimeBindingSourceValueEvaluationContext,
    rightToLeft: boolean,
    initialExpression: CallMemberExpression['args'][number] | null,
  ): RuntimeBindingSourceValueEvaluation {
    const method = rightToLeft ? 'reduceRight' : 'reduce';
    let initialValue: EvaluationValue | null = null;
    let initialPressure: readonly RuntimeBindingSourceValueEvaluation[] = [];
    if (initialExpression != null) {
      const initial = this.evaluateContext(context.child(initialExpression));
      if (initial.abruptCompletion != null) {
        return initial;
      }
      initialValue = initial.executableValue ?? new EvaluationUnknownValue(
        initial.openReason ?? `Array.${method} initial value did not close.`,
      );
      initialPressure = initial.closure === RuntimeBindingSourceValueEvaluationClosure.Open ? [initial] : [];
    }
    return this.foldDecision(evaluationArrayReduceDecision(
      receiver,
      null,
      rightToLeft,
      initialValue,
      initialPressure,
      (arguments_, index) => this.evaluateCallbackRead(callback, arguments_, context, `Array.${method} reducer ${index}`),
    ));
  }

  private evaluateCallbackRead(
    callback: ArrowFunction,
    argumentValues: readonly EvaluationValue[],
    context: RuntimeBindingSourceValueEvaluationContext,
    localKey: string,
  ): EvaluationArrayCallbackRead<RuntimeBindingSourceValueEvaluation, RuntimeBindingSourceValueEvaluation> {
    const result = this.evaluateArrowFunctionCallback(callback, argumentValues, context, localKey);
    if (result.abruptCompletion != null) {
      return EvaluationArrayCallbackRead.blocked(result);
    }
    const value = result.executableValue ?? new EvaluationUnknownValue(
      result.openReason ?? `${localKey} did not produce a source value.`,
    );
    return EvaluationArrayCallbackRead.value(
      value,
      result.closure === RuntimeBindingSourceValueEvaluationClosure.Open ? [result] : [],
    );
  }

  private foldDecision(
    decision: EvaluationArrayMethodDecision<RuntimeBindingSourceValueEvaluation, RuntimeBindingSourceValueEvaluation>,
  ): RuntimeBindingSourceValueEvaluation {
    if (decision.kind === EvaluationArrayMethodDecisionKind.Blocked) {
      return bindingSourceValueEvaluationWithPressure(decision.blocker!, decision.pressure);
    }
    const result = decision.value == null
      ? openBindingSourceNeedsRuntimeValue(decision.openReason ?? 'Array method result did not close.')
      : RuntimeBindingSourceValueEvaluation.value(decision.value);
    const methodPressure = decision.kind === EvaluationArrayMethodDecisionKind.Open
      ? [openBindingSourceNeedsRuntimeValue(decision.openReason!)]
      : [];
    return bindingSourceValueEvaluationWithPressure(result, [...decision.pressure, ...methodPressure]);
  }

  private evaluateArgument(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    index: number,
  ): RuntimeBindingSourceValueEvaluation {
    const argument = expression.args[index] ?? null;
    const evaluated = argument == null
      ? RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined)
      : this.evaluateContext(context.child(argument));
    return evaluated.executableValue != null
      ? evaluated
      : RuntimeBindingSourceValueEvaluation.open(
          evaluated.openReason ?? `Array.${expression.name.name} argument ${index} did not close.`,
          evaluated.openReasonKinds,
          evaluated.abruptCompletion,
          evaluated.openSeams,
        );
  }

  private evaluateOptionalArgument(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    index: number,
    fallback: EvaluationValue,
  ): RuntimeBindingSourceValueEvaluation {
    const argument = expression.args[index] ?? null;
    const evaluated = argument == null
      ? RuntimeBindingSourceValueEvaluation.value(fallback)
      : this.evaluateContext(context.child(argument));
    return evaluated.executableValue != null
      ? evaluated
      : RuntimeBindingSourceValueEvaluation.open(
          evaluated.openReason ?? `Array.${expression.name.name} argument ${index} did not close.`,
          evaluated.openReasonKinds,
          evaluated.abruptCompletion,
          evaluated.openSeams,
        );
  }

  private evaluateStartIndex(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
    length: number,
    rightToLeft: boolean,
  ): RuntimeBindingSourceValueEvaluation {
    const argument = this.evaluateOptionalArgument(expression, context, 1, EvaluationUndefined);
    if (argument.abruptCompletion != null || argument.value == null) {
      return argument;
    }
    const index = rightToLeft
      ? readArrayLastIndexStart(argument.value, length)
      : readArrayStartIndex(argument.value, length);
    const result = index == null
      ? openBindingSourceNeedsRuntimeValue(`Array.${rightToLeft ? 'lastIndexOf' : 'indexOf/includes'} start index did not close.`)
      : RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(index, null));
    return bindingSourceValueEvaluationWithPressure(result, [argument]);
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
        RuntimeBindingSourceValueEvaluation.value(expression.rest && index === lastIndex
          ? new EvaluationArrayValue(
              argumentValues.slice(index).map((value) => new EvaluationArrayElement(value, null)),
              false,
              null,
            )
          : argumentValues[index] ?? EvaluationUndefined),
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
