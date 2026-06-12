import type { ProductKindKey } from '../kernel/vocabulary.js';

export interface SemanticRuntimeCountRow {
  readonly key: string;
  readonly count: number;
}

export interface SemanticRuntimeDetailDensityRow {
  readonly detailKind: string;
  readonly count: number;
  readonly ownPropertyCount: number;
  readonly directArrayItemCount: number;
  readonly directStringCharacterCount: number;
  /** Direct string characters that are not kernel handles. */
  readonly directNonHandleStringCharacterCount: number;
  /** Unique direct string values observed in this detail-kind row; helps distinguish logical payload from repeated references. */
  readonly directUniqueStringCount: number;
  /** Character count of unique direct string values observed in this detail-kind row. */
  readonly directUniqueStringCharacterCount: number;
  readonly directKernelHandleCount: number;
  readonly directKernelHandleCharacterCount: number;
  /** Direct kernel-handle count grouped by handle kind such as address, product, or identity. */
  readonly directKernelHandleKinds: readonly SemanticRuntimeCountRow[];
  /** Direct kernel-handle character count grouped by handle kind. */
  readonly directKernelHandleKindCharacters: readonly SemanticRuntimeCountRow[];
  /** Kernel handles that are not already present on the owning materialized-product envelope. */
  readonly directNonEnvelopeKernelHandleCount: number;
  /** Character count for non-envelope direct kernel handles. */
  readonly directNonEnvelopeKernelHandleCharacterCount: number;
  /** Non-envelope direct kernel-handle count grouped by handle kind. */
  readonly directNonEnvelopeKernelHandleKinds: readonly SemanticRuntimeCountRow[];
  /** Non-envelope direct kernel-handle character count grouped by handle kind. */
  readonly directNonEnvelopeKernelHandleKindCharacters: readonly SemanticRuntimeCountRow[];
  readonly directEnvelopeHandleEchoCount: number;
  readonly directEnvelopeHandleEchoCharacterCount: number;
  /** Product-envelope echo handle count grouped by handle kind. */
  readonly directEnvelopeHandleEchoKinds: readonly SemanticRuntimeCountRow[];
  /** Product-envelope echo handle character count grouped by handle kind. */
  readonly directEnvelopeHandleEchoKindCharacters: readonly SemanticRuntimeCountRow[];
  readonly directLocalKeyCharacterCount: number;
  readonly objectKinds: readonly SemanticRuntimeCountRow[];
  readonly constructors: readonly SemanticRuntimeCountRow[];
  readonly directArrayFields: readonly SemanticRuntimeCountRow[];
  readonly directStringFields: readonly SemanticRuntimeCountRow[];
  readonly directNonHandleStringFields: readonly SemanticRuntimeCountRow[];
  readonly directKernelHandleFields: readonly SemanticRuntimeCountRow[];
  readonly directNonEnvelopeKernelHandleFields: readonly SemanticRuntimeCountRow[];
  readonly directEnvelopeHandleEchoFields: readonly SemanticRuntimeCountRow[];
  readonly directLocalKeyFields: readonly SemanticRuntimeCountRow[];
}

export interface SemanticRuntimeSidecarIndexRow {
  readonly key: string;
  readonly entries: number;
  readonly summary: string;
}

/** Cheap count snapshot for the hot kernel store and its sidecar detail catalog. */
export interface SemanticRuntimeKernelCountSnapshot {
  readonly totalRecords: number;
  readonly addresses: number;
  readonly identities: number;
  readonly evidence: number;
  readonly provenance: number;
  readonly claims: number;
  readonly openSeams: number;
  readonly products: number;
  readonly materializations: number;
  readonly productDetails: number;
  readonly hotDetails: number;
  readonly handleCharacters: number;
}

/** Optional high-cardinality breakdowns for explaining why the count snapshot is large. */
export interface SemanticRuntimeKernelDensitySnapshot extends SemanticRuntimeKernelCountSnapshot {
  readonly recordKinds: readonly SemanticRuntimeCountRow[];
  readonly addressKinds: readonly SemanticRuntimeCountRow[];
  readonly sourceSpanRoles: readonly SemanticRuntimeCountRow[];
  readonly sourceFileRoles: readonly SemanticRuntimeCountRow[];
  readonly identityKinds: readonly SemanticRuntimeCountRow[];
  readonly productKinds: readonly SemanticRuntimeCountRow[];
  readonly productDetailKinds: readonly SemanticRuntimeCountRow[];
  readonly hotDetailKinds: readonly SemanticRuntimeCountRow[];
  readonly claimPredicates: readonly SemanticRuntimeCountRow[];
  readonly openSeamKinds: readonly SemanticRuntimeCountRow[];
  readonly recordKindHandleCharacters: readonly SemanticRuntimeCountRow[];
  readonly productKindHandleCharacters: readonly SemanticRuntimeCountRow[];
  readonly sourceSpanRoleHandleCharacters: readonly SemanticRuntimeCountRow[];
  readonly sidecarIndexes: readonly SemanticRuntimeSidecarIndexRow[];
  readonly productDetailDensity?: readonly SemanticRuntimeDetailDensityRow[];
  readonly hotDetailDensity?: readonly SemanticRuntimeDetailDensityRow[];
}

export interface SemanticRuntimeKernelTelemetryOptions {
  readonly includeBreakdowns?: boolean;
  readonly includeDetailDensity?: boolean;
}

export function countSemanticRuntimeRows<TKey extends string>(
  rows: Iterable<TKey>,
): readonly SemanticRuntimeCountRow[] {
  return countSemanticRuntimeRowsBy(rows, (row) => row);
}

export function countSemanticRuntimeRowsBy<TValue>(
  rows: Iterable<TValue>,
  keyOf: (row: TValue) => string | null | undefined,
): readonly SemanticRuntimeCountRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key == null) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return sortedCountRows(counts);
}

export function sortedCountRows(
  counts: ReadonlyMap<string, number>,
): readonly SemanticRuntimeCountRow[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

export function diffSemanticRuntimeCountRows(
  after: readonly SemanticRuntimeCountRow[] | null | undefined,
  before: readonly SemanticRuntimeCountRow[] | null | undefined,
): readonly SemanticRuntimeCountRow[] {
  const counts = new Map<string, number>();
  for (const row of before ?? []) {
    counts.set(row.key, (counts.get(row.key) ?? 0) - row.count);
  }
  for (const row of after ?? []) {
    counts.set(row.key, (counts.get(row.key) ?? 0) + row.count);
  }
  return sortedCountRows(new Map([...counts.entries()].filter(([, count]) => count !== 0)));
}

export function diffSemanticRuntimeDetailDensityRows(
  after: readonly SemanticRuntimeDetailDensityRow[] | null | undefined,
  before: readonly SemanticRuntimeDetailDensityRow[] | null | undefined,
): readonly SemanticRuntimeDetailDensityRow[] {
  const rows = new Map<string, MutableSemanticRuntimeDetailDensityRow>();
  for (const row of before ?? []) {
    mergeSemanticRuntimeDetailDensityRow(rows, row, -1);
  }
  for (const row of after ?? []) {
    mergeSemanticRuntimeDetailDensityRow(rows, row, 1);
  }
  return sortSemanticRuntimeDetailDensityRows([...rows.values()]
    .filter(hasNonZeroDetailDensity));
}

export function productKindCountRows(
  counts: ReadonlyMap<ProductKindKey, number>,
): readonly SemanticRuntimeCountRow[] {
  return sortedCountRows(new Map([...counts.entries()].map(([key, count]) => [key, count])));
}

export function diffSemanticRuntimeKernelCounts(
  after: SemanticRuntimeKernelCountSnapshot,
  before: SemanticRuntimeKernelCountSnapshot,
): SemanticRuntimeKernelCountSnapshot {
  return {
    totalRecords: after.totalRecords - before.totalRecords,
    addresses: after.addresses - before.addresses,
    identities: after.identities - before.identities,
    evidence: after.evidence - before.evidence,
    provenance: after.provenance - before.provenance,
    claims: after.claims - before.claims,
    openSeams: after.openSeams - before.openSeams,
    products: after.products - before.products,
    materializations: after.materializations - before.materializations,
    productDetails: after.productDetails - before.productDetails,
    hotDetails: after.hotDetails - before.hotDetails,
    handleCharacters: after.handleCharacters - before.handleCharacters,
  };
}

interface MutableSemanticRuntimeDetailDensityRow {
  detailKind: string;
  count: number;
  ownPropertyCount: number;
  directArrayItemCount: number;
  directStringCharacterCount: number;
  directNonHandleStringCharacterCount: number;
  directUniqueStringCount: number;
  directUniqueStringCharacterCount: number;
  directKernelHandleCount: number;
  directKernelHandleCharacterCount: number;
  directKernelHandleKinds: Map<string, number>;
  directKernelHandleKindCharacters: Map<string, number>;
  directNonEnvelopeKernelHandleCount: number;
  directNonEnvelopeKernelHandleCharacterCount: number;
  directNonEnvelopeKernelHandleKinds: Map<string, number>;
  directNonEnvelopeKernelHandleKindCharacters: Map<string, number>;
  directEnvelopeHandleEchoCount: number;
  directEnvelopeHandleEchoCharacterCount: number;
  directEnvelopeHandleEchoKinds: Map<string, number>;
  directEnvelopeHandleEchoKindCharacters: Map<string, number>;
  directLocalKeyCharacterCount: number;
  objectKinds: Map<string, number>;
  constructors: Map<string, number>;
  directArrayFields: Map<string, number>;
  directStringFields: Map<string, number>;
  directNonHandleStringFields: Map<string, number>;
  directKernelHandleFields: Map<string, number>;
  directNonEnvelopeKernelHandleFields: Map<string, number>;
  directEnvelopeHandleEchoFields: Map<string, number>;
  directLocalKeyFields: Map<string, number>;
}

function mergeSemanticRuntimeDetailDensityRow(
  target: Map<string, MutableSemanticRuntimeDetailDensityRow>,
  row: SemanticRuntimeDetailDensityRow,
  sign: 1 | -1,
): void {
  const current = target.get(row.detailKind) ?? {
    detailKind: row.detailKind,
    count: 0,
    ownPropertyCount: 0,
    directArrayItemCount: 0,
    directStringCharacterCount: 0,
    directNonHandleStringCharacterCount: 0,
    directUniqueStringCount: 0,
    directUniqueStringCharacterCount: 0,
    directKernelHandleCount: 0,
    directKernelHandleCharacterCount: 0,
    directKernelHandleKinds: new Map<string, number>(),
    directKernelHandleKindCharacters: new Map<string, number>(),
    directNonEnvelopeKernelHandleCount: 0,
    directNonEnvelopeKernelHandleCharacterCount: 0,
    directNonEnvelopeKernelHandleKinds: new Map<string, number>(),
    directNonEnvelopeKernelHandleKindCharacters: new Map<string, number>(),
    directEnvelopeHandleEchoCount: 0,
    directEnvelopeHandleEchoCharacterCount: 0,
    directEnvelopeHandleEchoKinds: new Map<string, number>(),
    directEnvelopeHandleEchoKindCharacters: new Map<string, number>(),
    directLocalKeyCharacterCount: 0,
    objectKinds: new Map<string, number>(),
    constructors: new Map<string, number>(),
    directArrayFields: new Map<string, number>(),
    directStringFields: new Map<string, number>(),
    directNonHandleStringFields: new Map<string, number>(),
    directKernelHandleFields: new Map<string, number>(),
    directNonEnvelopeKernelHandleFields: new Map<string, number>(),
    directEnvelopeHandleEchoFields: new Map<string, number>(),
    directLocalKeyFields: new Map<string, number>(),
  };
  current.count += sign * row.count;
  current.ownPropertyCount += sign * row.ownPropertyCount;
  current.directArrayItemCount += sign * row.directArrayItemCount;
  current.directStringCharacterCount += sign * row.directStringCharacterCount;
  current.directNonHandleStringCharacterCount += sign * row.directNonHandleStringCharacterCount;
  current.directUniqueStringCount += sign * row.directUniqueStringCount;
  current.directUniqueStringCharacterCount += sign * row.directUniqueStringCharacterCount;
  current.directKernelHandleCount += sign * row.directKernelHandleCount;
  current.directKernelHandleCharacterCount += sign * row.directKernelHandleCharacterCount;
  addSignedSemanticRuntimeCountRows(current.directKernelHandleKinds, row.directKernelHandleKinds, sign);
  addSignedSemanticRuntimeCountRows(current.directKernelHandleKindCharacters, row.directKernelHandleKindCharacters, sign);
  current.directNonEnvelopeKernelHandleCount += sign * row.directNonEnvelopeKernelHandleCount;
  current.directNonEnvelopeKernelHandleCharacterCount += sign * row.directNonEnvelopeKernelHandleCharacterCount;
  addSignedSemanticRuntimeCountRows(current.directNonEnvelopeKernelHandleKinds, row.directNonEnvelopeKernelHandleKinds, sign);
  addSignedSemanticRuntimeCountRows(current.directNonEnvelopeKernelHandleKindCharacters, row.directNonEnvelopeKernelHandleKindCharacters, sign);
  current.directEnvelopeHandleEchoCount += sign * row.directEnvelopeHandleEchoCount;
  current.directEnvelopeHandleEchoCharacterCount += sign * row.directEnvelopeHandleEchoCharacterCount;
  addSignedSemanticRuntimeCountRows(current.directEnvelopeHandleEchoKinds, row.directEnvelopeHandleEchoKinds, sign);
  addSignedSemanticRuntimeCountRows(current.directEnvelopeHandleEchoKindCharacters, row.directEnvelopeHandleEchoKindCharacters, sign);
  current.directLocalKeyCharacterCount += sign * row.directLocalKeyCharacterCount;
  addSignedSemanticRuntimeCountRows(current.objectKinds, row.objectKinds, sign);
  addSignedSemanticRuntimeCountRows(current.constructors, row.constructors, sign);
  addSignedSemanticRuntimeCountRows(current.directArrayFields, row.directArrayFields, sign);
  addSignedSemanticRuntimeCountRows(current.directStringFields, row.directStringFields, sign);
  addSignedSemanticRuntimeCountRows(current.directNonHandleStringFields, row.directNonHandleStringFields, sign);
  addSignedSemanticRuntimeCountRows(current.directKernelHandleFields, row.directKernelHandleFields, sign);
  addSignedSemanticRuntimeCountRows(current.directNonEnvelopeKernelHandleFields, row.directNonEnvelopeKernelHandleFields, sign);
  addSignedSemanticRuntimeCountRows(current.directEnvelopeHandleEchoFields, row.directEnvelopeHandleEchoFields, sign);
  addSignedSemanticRuntimeCountRows(current.directLocalKeyFields, row.directLocalKeyFields, sign);
  target.set(row.detailKind, current);
}

function addSignedSemanticRuntimeCountRows(
  target: Map<string, number>,
  rows: readonly SemanticRuntimeCountRow[],
  sign: 1 | -1,
): void {
  for (const row of rows) {
    target.set(row.key, (target.get(row.key) ?? 0) + sign * row.count);
  }
}

function hasNonZeroDetailDensity(row: MutableSemanticRuntimeDetailDensityRow): boolean {
  return row.count !== 0
    || row.ownPropertyCount !== 0
    || row.directArrayItemCount !== 0
    || row.directStringCharacterCount !== 0
    || row.directNonHandleStringCharacterCount !== 0
    || row.directUniqueStringCount !== 0
    || row.directUniqueStringCharacterCount !== 0
    || row.directKernelHandleCount !== 0
    || row.directKernelHandleCharacterCount !== 0
    || row.directNonEnvelopeKernelHandleCount !== 0
    || row.directNonEnvelopeKernelHandleCharacterCount !== 0
    || row.directEnvelopeHandleEchoCount !== 0
    || row.directEnvelopeHandleEchoCharacterCount !== 0
    || row.directLocalKeyCharacterCount !== 0;
}

function sortSemanticRuntimeDetailDensityRows(
  rows: readonly MutableSemanticRuntimeDetailDensityRow[],
): readonly SemanticRuntimeDetailDensityRow[] {
  return rows
    .map((row): SemanticRuntimeDetailDensityRow => ({
      ...row,
      objectKinds: sortedCountRows(row.objectKinds).filter((countRow) => countRow.count !== 0),
      constructors: sortedCountRows(row.constructors).filter((countRow) => countRow.count !== 0),
      directArrayFields: sortedCountRows(row.directArrayFields).filter((countRow) => countRow.count !== 0),
      directStringFields: sortedCountRows(row.directStringFields).filter((countRow) => countRow.count !== 0),
      directNonHandleStringFields: sortedCountRows(row.directNonHandleStringFields).filter((countRow) => countRow.count !== 0),
      directKernelHandleFields: sortedCountRows(row.directKernelHandleFields).filter((countRow) => countRow.count !== 0),
      directKernelHandleKinds: sortedCountRows(row.directKernelHandleKinds).filter((countRow) => countRow.count !== 0),
      directKernelHandleKindCharacters: sortedCountRows(row.directKernelHandleKindCharacters).filter((countRow) => countRow.count !== 0),
      directNonEnvelopeKernelHandleFields: sortedCountRows(row.directNonEnvelopeKernelHandleFields).filter((countRow) => countRow.count !== 0),
      directNonEnvelopeKernelHandleKinds: sortedCountRows(row.directNonEnvelopeKernelHandleKinds).filter((countRow) => countRow.count !== 0),
      directNonEnvelopeKernelHandleKindCharacters: sortedCountRows(row.directNonEnvelopeKernelHandleKindCharacters).filter((countRow) => countRow.count !== 0),
      directEnvelopeHandleEchoFields: sortedCountRows(row.directEnvelopeHandleEchoFields).filter((countRow) => countRow.count !== 0),
      directEnvelopeHandleEchoKinds: sortedCountRows(row.directEnvelopeHandleEchoKinds).filter((countRow) => countRow.count !== 0),
      directEnvelopeHandleEchoKindCharacters: sortedCountRows(row.directEnvelopeHandleEchoKindCharacters).filter((countRow) => countRow.count !== 0),
      directLocalKeyFields: sortedCountRows(row.directLocalKeyFields).filter((countRow) => countRow.count !== 0),
    }))
    .sort((left, right) =>
      detailDensityWeight(right) - detailDensityWeight(left)
      || right.count - left.count
      || left.detailKind.localeCompare(right.detailKind)
    );
}

function detailDensityWeight(row: SemanticRuntimeDetailDensityRow): number {
  return Math.abs(row.ownPropertyCount)
    + Math.abs(row.directArrayItemCount)
    + Math.abs(row.directStringCharacterCount)
    + Math.abs(row.directNonHandleStringCharacterCount)
    + Math.abs(row.directUniqueStringCharacterCount)
    + Math.abs(row.directKernelHandleCharacterCount)
    + Math.abs(row.directNonEnvelopeKernelHandleCharacterCount)
    + Math.abs(row.directEnvelopeHandleEchoCharacterCount)
    + Math.abs(row.directLocalKeyCharacterCount);
}
