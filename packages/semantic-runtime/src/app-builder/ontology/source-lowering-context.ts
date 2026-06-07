/** Stateful source-lowering scope for names that must be unique across composed generated source. */
export class AppBuilderSourceLoweringEmissionContext {
  private readonly domIdCounts = new Map<string, number>();

  /** Allocate a DOM id that remains stable for the first use and receives numeric suffixes for later siblings. */
  public allocateDomId(baseId: string): string {
    const normalizedBaseId = baseId.trim();
    if (normalizedBaseId.length === 0) {
      throw new Error('App-builder source-lowering DOM id allocation requires a non-empty base id.');
    }
    const current = this.domIdCounts.get(normalizedBaseId) ?? 0;
    const next = current + 1;
    this.domIdCounts.set(normalizedBaseId, next);
    return next === 1 ? normalizedBaseId : `${normalizedBaseId}-${next}`;
  }
}

/** Create a new stateful source-lowering scope for one generated template/source-plan boundary. */
export function appBuilderSourceLoweringEmissionContext(): AppBuilderSourceLoweringEmissionContext {
  return new AppBuilderSourceLoweringEmissionContext();
}
