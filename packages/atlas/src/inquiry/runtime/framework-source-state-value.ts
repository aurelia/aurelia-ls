/** Shared base value for lenses backed by a framework-source analysis with source-state freshness. */
export function frameworkSourceStateBaseValue<TVersion, TSourceState, TRollup>(
  analysis: {
    readonly version: TVersion;
    readonly sourceState: TSourceState;
    readonly rollup: TRollup;
  },
): {
  readonly version: TVersion;
  readonly sourceState: TSourceState;
  readonly rollup: TRollup;
} {
  return {
    version: analysis.version,
    sourceState: analysis.sourceState,
    rollup: analysis.rollup,
  };
}
