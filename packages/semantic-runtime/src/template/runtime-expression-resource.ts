export const enum RuntimeExpressionResourceBindReachability {
  /** `astBind` reaches this authored wrapper and attempts resource resolution/application. */
  Reached = 'reached',
  /** An outer wrapper failed during `astBind`, so this authored wrapper is structurally present but not visited. */
  BlockedByOuterFailure = 'blocked-by-outer-failure',
}
