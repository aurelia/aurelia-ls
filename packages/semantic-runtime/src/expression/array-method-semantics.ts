/**
 * Framework `astEvaluate` array methods that observe collection membership after invocation.
 *
 * This mirrors runtime-html's `autoObserveArrayMethods` list exactly. It is not the full native Array
 * method surface and should not be expanded just because semantic-runtime can type or reduce more methods.
 * Missing web-standard methods here are Aurelia framework update candidates, not product-owned
 * observation divergence.
 */
export const aureliaAstEvaluateAutoObservedArrayMethods: ReadonlySet<string> = new Set([
  'at',
  'every',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'includes',
  'indexOf',
  'join',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'sort',
]);

export const enum AureliaArrayCallbackParameterShape {
  /** Callback receives value, index, and receiver array arguments. */
  Iteration = 'iteration',
  /** Callback receives accumulator, value, index, and receiver array arguments. */
  Reducer = 'reducer',
  /** Callback receives left and right element arguments for pair comparison. */
  Comparator = 'comparator',
}

export const enum AureliaArrayMethodTypeProjectionKind {
  /** Method returns one receiver element or undefined. */
  ElementOrUndefined = 'element-or-undefined',
  /** Method returns a number primitive. */
  Number = 'number',
  /** Method returns a boolean primitive. */
  Boolean = 'boolean',
  /** Method returns a string primitive. */
  String = 'string',
  /** Method returns undefined. */
  Undefined = 'undefined',
  /** Method returns an array with the receiver element type. */
  ReceiverElementArray = 'receiver-element-array',
  /** Method returns the receiver element array after a predicate/comparator callback is present. */
  ReceiverElementArrayWithCallbackPresence = 'receiver-element-array-with-callback-presence',
  /** Method returns the receiver element array after optionally evaluating a comparator callback. */
  ReceiverElementArrayWithComparator = 'receiver-element-array-with-comparator',
  /** Method returns an array with the callback return type. */
  CallbackReturnArray = 'callback-return-array',
  /** Method returns an array with the flattened callback return type. */
  FlattenedCallbackReturnArray = 'flattened-callback-return-array',
  /** Method returns an array with the flattened receiver element type. */
  FlattenedReceiverElementArray = 'flattened-receiver-element-array',
  /** Method returns the reducer callback return type. */
  ReducerReturn = 'reducer-return',
  /** Method returns an array whose element type comes from receiver plus concatenated arguments. */
  ConcatElementArray = 'concat-element-array',
}

export interface AureliaArrayMethodSemantics {
  /** Native Array method name. */
  readonly name: string;
  /** Whether framework astEvaluate observes collection membership after this method call. */
  readonly astEvaluateAutoObserved: boolean;
  /** Callback parameter shape when framework astEvaluate executes an inline Aurelia ArrowFunction callback. */
  readonly callbackParameterShape: AureliaArrayCallbackParameterShape | null;
  /** Product-owned type projection category for synthetic Array values with no checker carrier. */
  readonly typeProjectionKind: AureliaArrayMethodTypeProjectionKind | null;
}

// Native Array callback support can outpace collection observation while the framework awaits updates.
const aureliaNativeArrayCallbackParameterShapeByMethod = new Map<string, AureliaArrayCallbackParameterShape>([
  ['every', AureliaArrayCallbackParameterShape.Iteration],
  ['filter', AureliaArrayCallbackParameterShape.Iteration],
  ['find', AureliaArrayCallbackParameterShape.Iteration],
  ['findIndex', AureliaArrayCallbackParameterShape.Iteration],
  ['findLast', AureliaArrayCallbackParameterShape.Iteration],
  ['findLastIndex', AureliaArrayCallbackParameterShape.Iteration],
  ['flatMap', AureliaArrayCallbackParameterShape.Iteration],
  ['forEach', AureliaArrayCallbackParameterShape.Iteration],
  ['map', AureliaArrayCallbackParameterShape.Iteration],
  ['some', AureliaArrayCallbackParameterShape.Iteration],
  ['reduce', AureliaArrayCallbackParameterShape.Reducer],
  ['reduceRight', AureliaArrayCallbackParameterShape.Reducer],
  ['sort', AureliaArrayCallbackParameterShape.Comparator],
  ['toSorted', AureliaArrayCallbackParameterShape.Comparator],
]);

// Synthetic Array type projection owns product-level static semantics for Array calls without checker carriers.
const aureliaArrayMethodTypeProjectionKindByMethod = new Map<string, AureliaArrayMethodTypeProjectionKind>([
  ['at', AureliaArrayMethodTypeProjectionKind.ElementOrUndefined],
  ['pop', AureliaArrayMethodTypeProjectionKind.ElementOrUndefined],
  ['shift', AureliaArrayMethodTypeProjectionKind.ElementOrUndefined],
  ['find', AureliaArrayMethodTypeProjectionKind.ElementOrUndefined],
  ['findLast', AureliaArrayMethodTypeProjectionKind.ElementOrUndefined],
  ['findIndex', AureliaArrayMethodTypeProjectionKind.Number],
  ['findLastIndex', AureliaArrayMethodTypeProjectionKind.Number],
  ['indexOf', AureliaArrayMethodTypeProjectionKind.Number],
  ['lastIndexOf', AureliaArrayMethodTypeProjectionKind.Number],
  ['push', AureliaArrayMethodTypeProjectionKind.Number],
  ['unshift', AureliaArrayMethodTypeProjectionKind.Number],
  ['some', AureliaArrayMethodTypeProjectionKind.Boolean],
  ['every', AureliaArrayMethodTypeProjectionKind.Boolean],
  ['includes', AureliaArrayMethodTypeProjectionKind.Boolean],
  ['join', AureliaArrayMethodTypeProjectionKind.String],
  ['forEach', AureliaArrayMethodTypeProjectionKind.Undefined],
  ['filter', AureliaArrayMethodTypeProjectionKind.ReceiverElementArrayWithCallbackPresence],
  ['map', AureliaArrayMethodTypeProjectionKind.CallbackReturnArray],
  ['flatMap', AureliaArrayMethodTypeProjectionKind.FlattenedCallbackReturnArray],
  ['flat', AureliaArrayMethodTypeProjectionKind.FlattenedReceiverElementArray],
  ['concat', AureliaArrayMethodTypeProjectionKind.ConcatElementArray],
  ['slice', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['reverse', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['toReversed', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['copyWithin', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['fill', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['splice', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['toSpliced', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['with', AureliaArrayMethodTypeProjectionKind.ReceiverElementArray],
  ['sort', AureliaArrayMethodTypeProjectionKind.ReceiverElementArrayWithComparator],
  ['toSorted', AureliaArrayMethodTypeProjectionKind.ReceiverElementArrayWithComparator],
  ['reduce', AureliaArrayMethodTypeProjectionKind.ReducerReturn],
  ['reduceRight', AureliaArrayMethodTypeProjectionKind.ReducerReturn],
]);

/** Native Array method names whose calls have product-owned synthetic type projections. */
export const aureliaArrayMethodTypeProjectionNames: readonly string[] = [...aureliaArrayMethodTypeProjectionKindByMethod.keys()];

/** Whether synthetic Array type projection must evaluate callback body return shape for the whole-call result. */
export function aureliaArrayMethodTypeProjectionUsesCallbackReturn(
  kind: AureliaArrayMethodTypeProjectionKind | null,
): boolean {
  return kind === AureliaArrayMethodTypeProjectionKind.CallbackReturnArray
    || kind === AureliaArrayMethodTypeProjectionKind.FlattenedCallbackReturnArray
    || kind === AureliaArrayMethodTypeProjectionKind.ReducerReturn;
}

/** Shared method descriptor for Array semantics that cross observation, type projection, and source-value reduction. */
export function aureliaArrayMethodSemanticsFor(name: string): AureliaArrayMethodSemantics | null {
  const astEvaluateAutoObserved = aureliaAstEvaluateAutoObservedArrayMethods.has(name);
  const callbackParameterShape = aureliaNativeArrayCallbackParameterShapeByMethod.get(name) ?? null;
  const typeProjectionKind = aureliaArrayMethodTypeProjectionKindByMethod.get(name) ?? null;
  return astEvaluateAutoObserved || callbackParameterShape != null || typeProjectionKind != null
    ? {
      name,
      astEvaluateAutoObserved,
      callbackParameterShape,
      typeProjectionKind,
    }
    : null;
}
