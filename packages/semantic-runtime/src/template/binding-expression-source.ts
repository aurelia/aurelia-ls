/** Source request for applying a binding behavior to an authored binding expression. */
export interface BindingBehaviorExpressionSourceRequest {
  /** Authored expression before the behavior is appended. */
  readonly sourceExpression: string;
  /** Registered binding-behavior resource name. */
  readonly behaviorName: string;
  /** Optional raw behavior arguments after the `:` separator. */
  readonly rawArguments?: string;
}

/** Source request for applying a value converter to an authored binding expression. */
export interface ValueConverterExpressionSourceRequest {
  /** Authored expression before the converter is appended. */
  readonly sourceExpression: string;
  /** Registered value-converter resource name. */
  readonly converterName: string;
  /** Optional raw converter arguments after the `:` separator. */
  readonly rawArguments?: string;
}

/** Source request for an authored text interpolation hole. */
export interface TextInterpolationSourceRequest {
  /** Authored expression inside the interpolation hole. */
  readonly sourceExpression: string;
}

/** Source request for an authored iterator binding header. */
export interface IteratorBindingExpressionSourceRequest {
  /** Local binding-context name introduced by the iterator header. */
  readonly localName: string;
  /** Authored iterable expression after the `of` separator. */
  readonly iterableExpression: string;
}

/** Serialize an authored text interpolation. */
export function textInterpolationSourceText(
  request: TextInterpolationSourceRequest,
): string {
  return `\${${request.sourceExpression}}`;
}

/** Serialize an authored repeat-like iterator binding header. */
export function iteratorBindingExpressionSourceText(
  request: IteratorBindingExpressionSourceRequest,
): string {
  return `${request.localName} of ${request.iterableExpression}`;
}

/** Serialize an authored binding-behavior modifier expression. */
export function bindingBehaviorExpressionSourceText(
  request: BindingBehaviorExpressionSourceRequest,
): string {
  return `${request.sourceExpression} & ${request.behaviorName}${expressionModifierArgumentSuffix(request.rawArguments)}`;
}

/** Serialize an authored value-converter modifier expression. */
export function valueConverterExpressionSourceText(
  request: ValueConverterExpressionSourceRequest,
): string {
  return `${request.sourceExpression} | ${request.converterName}${expressionModifierArgumentSuffix(request.rawArguments)}`;
}

function expressionModifierArgumentSuffix(rawArguments: string | undefined): string {
  return rawArguments == null || rawArguments.length === 0 ? '' : `:${rawArguments}`;
}
