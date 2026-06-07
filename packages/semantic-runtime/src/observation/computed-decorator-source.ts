/** Source request for Aurelia's `@computed` decorator. */
export interface ComputedDecoratorSourceRequest {
  /** Optional decorator argument expression such as `{ deps: ['firstName', 'lastName'] }`. */
  readonly argumentExpression?: string | null;
}

/** Serialize Aurelia's `@computed` decorator without implying proxy observation is required. */
export function computedDecoratorSourceText(
  request: ComputedDecoratorSourceRequest = {},
): string {
  const argumentExpression = request.argumentExpression?.trim();
  return argumentExpression == null || argumentExpression.length === 0
    ? '@computed'
    : `@computed(${argumentExpression})`;
}
