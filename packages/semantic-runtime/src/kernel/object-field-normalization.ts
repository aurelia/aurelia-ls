/** One reversible own-property rewrite prepared without mutating its target object. */
export class PreparedObjectFieldNormalization {
  constructor(
    private readonly target: object,
    private readonly field: string,
    private readonly previous: PropertyDescriptor,
    private readonly next: PropertyDescriptor,
  ) {}

  apply(): void {
    Object.defineProperty(this.target, this.field, this.next);
  }

  restore(): void {
    Object.defineProperty(this.target, this.field, this.previous);
  }
}

/** Describe an exact handle echo rewrite while leaving the candidate object untouched. */
export function prepareObjectFieldNormalization<TValue>(
  target: object,
  field: string,
  expectedValue: TValue,
  next: PropertyDescriptor,
  ownerLabel: string,
): PreparedObjectFieldNormalization | null {
  const previous = Object.getOwnPropertyDescriptor(target, field);
  if (previous == null || previous.get === next.get) {
    return null;
  }
  const currentValue = Object.prototype.hasOwnProperty.call(previous, 'value')
    ? previous.value
    : Reflect.get(target, field);
  if (currentValue !== expectedValue) {
    return null;
  }
  if (previous.configurable === false) {
    throw new Error(`${ownerLabel} field ${field} cannot be normalized to its owner-backed handle.`);
  }
  return new PreparedObjectFieldNormalization(target, field, previous, next);
}

/** Apply one descriptor transaction, restoring every earlier candidate if a later rewrite fails. */
export function applyObjectFieldNormalizations(
  normalizations: readonly PreparedObjectFieldNormalization[],
): void {
  const applied: PreparedObjectFieldNormalization[] = [];
  try {
    for (const normalization of normalizations) {
      normalization.apply();
      applied.push(normalization);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const normalization of applied.reverse()) {
      try {
        normalization.restore();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        'Kernel detail field normalization failed and could not fully restore its candidate objects.',
      );
    }
    throw error;
  }
}
