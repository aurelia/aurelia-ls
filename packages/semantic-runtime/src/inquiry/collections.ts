/** Return values in first-seen order with duplicates removed by JavaScript identity. */
export function uniqueValues<TValue>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}
