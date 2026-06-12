/** App-builder-owned fallback copy that generated source may emit only when no caller text owns the slot. */
export enum AppBuilderGeneratedFallbackCopyId {
  /** Display label for a missing nullable Date value in generated domain display helpers. */
  DateEmpty = 'date-empty',
  /** Display label for an empty finite choice-set in generated domain display helpers. */
  ChoiceSetEmpty = 'choice-set-empty',
}

/** Review row for app-builder-owned fallback copy emitted only when caller text cannot own the slot. */
export interface AppBuilderGeneratedFallbackCopyRow {
  /** Stable fallback-copy id used by generated source helpers. */
  readonly id: AppBuilderGeneratedFallbackCopyId;
  /** Concrete text emitted into generated source. */
  readonly text: string;
  /** Why app-builder, rather than caller input, owns this narrow copy slot. */
  readonly summary: string;
}

/** Complete reviewable inventory of app-builder-owned generated fallback copy. */
export const APP_BUILDER_GENERATED_FALLBACK_COPY_ROWS: readonly AppBuilderGeneratedFallbackCopyRow[] = [
  {
    id: AppBuilderGeneratedFallbackCopyId.DateEmpty,
    text: 'No date',
    summary: 'Generated domain display helpers need a stable fallback when a nullable Date has no value and no caller display text exists.',
  },
  {
    id: AppBuilderGeneratedFallbackCopyId.ChoiceSetEmpty,
    text: 'None',
    summary: 'Generated domain display helpers need a stable fallback when a finite choice-set has no selected values and no caller display text exists.',
  },
];

/** Return source-owned fallback copy text for generated domain display helpers. */
export function appBuilderGeneratedFallbackCopyText(
  id: AppBuilderGeneratedFallbackCopyId,
): string {
  const row = APP_BUILDER_GENERATED_FALLBACK_COPY_ROWS.find((candidate) => candidate.id === id);
  if (row == null) {
    throw new Error(`Unknown app-builder generated fallback copy id: ${id}`);
  }
  return row.text;
}
