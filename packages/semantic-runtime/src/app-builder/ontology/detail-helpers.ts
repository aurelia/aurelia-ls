/** Deduplicate selected ontology ids while preserving caller/catalog order. */
export function appBuilderUniqueIds<TKey>(
  ids: readonly TKey[],
): readonly TKey[] {
  return [...new Set(ids)];
}

/** Read string enum values for ontology schema/value-set projection without duplicating enum-object casts. */
export function appBuilderEnumValues<TValue extends string>(
  value: Record<string, TValue>,
): readonly TValue[] {
  return Object.values(value);
}

/** Return true when a detail request carries an explicit row-family selector. */
export function appBuilderHasExplicitSelection(
  ...selections: readonly (readonly unknown[] | null | undefined)[]
): boolean {
  return selections.some((selection) => selection != null && selection.length > 0);
}

/** Default rich detail only for selected rows; unscoped detail needs an explicit include flag. */
export function appBuilderIncludeDetail(
  include: boolean | null | undefined,
  hasExplicitSelection: boolean,
): boolean {
  return hasExplicitSelection ? include !== false : include === true;
}

/** Resolve selected ontology ids against a row catalog map, dropping unknown ids. */
export function appBuilderSelectRows<TKey, TRow>(
  ids: readonly TKey[],
  rowsById: ReadonlyMap<TKey, TRow>,
): readonly TRow[] {
  return ids
    .map((id) => rowsById.get(id))
    .filter((row): row is TRow => row != null);
}

/** Deduplicate ontology rows by a stable id while preserving first occurrence order. */
export function appBuilderUniqueRowsById<TRow, TKey>(
  rows: readonly TRow[],
  idForRow: (row: TRow) => TKey,
): readonly TRow[] {
  const seen = new Set<TKey>();
  return rows.filter((row) => {
    const id = idForRow(row);
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}
