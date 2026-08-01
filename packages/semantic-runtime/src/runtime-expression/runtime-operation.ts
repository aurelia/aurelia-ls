/**
 * Whether a runtime operation exists for every value admitted by its modeled owner.
 *
 * This axis is independent from lifecycle reachability: a conditional operation can still be reached whenever its
 * guard succeeds, while a direct operation can be blocked by an earlier bind failure.
 */
export const enum RuntimeOperationRealization {
  /** The modeled owner directly owns the operation. */
  Direct = 'direct',
  /** A guarded operation exists for every value admitted by the visible type. */
  Guaranteed = 'guaranteed',
  /** A guarded operation exists only for some values admitted by the visible type. */
  Conditional = 'conditional',
  /** The available facts cannot close whether the operation exists. */
  Open = 'open',
}

/** Whether lifecycle execution reaches a modeled runtime operation. */
export const enum RuntimeOperationReachability {
  /** The framework reaches this operation under the modeled lifecycle. */
  Reached = 'reached',
  /** An outer operation failed before this operation could run. */
  BlockedByOuterFailure = 'blocked-by-outer-failure',
  /** The owning bind step failed before a later operation could run. */
  BlockedByBindFailure = 'blocked-by-bind-failure',
  /** The available lifecycle facts cannot close whether the operation runs. */
  Open = 'open',
}

/** Whether the modeled lifecycle still admits execution, including an unresolved open handoff. */
export function runtimeOperationMayBeReached(
  reachability: RuntimeOperationReachability,
): boolean {
  return reachability === RuntimeOperationReachability.Reached
    || reachability === RuntimeOperationReachability.Open;
}
