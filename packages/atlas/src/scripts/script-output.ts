import { OutcomeKind, type Answer } from "../inquiry/answer.js";
import type { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { Api } from "../session/api.js";

export interface ScriptSourceRef {
  readonly filePath?: string;
  readonly startLine?: number;
  readonly start?: {
    readonly line: number;
  };
}

export interface ScriptFunctionNameRow {
  readonly name: string;
  readonly functionKind?: string;
  readonly filePath: string;
  readonly lineCount: number;
  readonly source?: ScriptSourceRef;
}

export interface DuplicateFunctionNameGroup {
  readonly name: string;
  readonly functionCount: number;
  readonly fileCount: number;
  readonly lineCount: number;
  readonly samples: readonly string[];
}

export interface ReadAllPagedRowsOptions<TValue, TRow> {
  readonly label: string;
  readonly lens: LensId;
  readonly projection: string;
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly pageSize?: number;
  readonly rowsFromValue: (value: TValue | undefined) => readonly TRow[];
}

/** Assert that a script inquiry returned a hit with a value payload. */
export function assertHitAnswer<TValue>(
  label: string,
  answer: Answer<unknown>,
): asserts answer is Answer<TValue> & { readonly value: TValue } {
  if (answer.outcome !== OutcomeKind.Hit || answer.value == null) {
    throw new Error(`${label} returned ${answer.outcome}.`);
  }
}

/** Assert that a pressure inquiry returned either rows or an honest miss. */
export function assertHitOrMissAnswer(
  label: string,
  answer: Answer<unknown>,
): void {
  if (answer.outcome !== OutcomeKind.Hit && answer.outcome !== OutcomeKind.Miss) {
    throw new Error(`${label} returned ${answer.outcome}.`);
  }
}

/** Read a value payload from an optional pressure answer. */
export function answerValue<TValue>(answer: Answer<unknown>): TValue | undefined {
  return answer.value as TValue | undefined;
}

/** Read every page for one row projection through the daemon-backed script API. */
export async function readAllPagedRows<TValue, TRow>(
  api: Pick<Api, "ask">,
  options: ReadAllPagedRowsOptions<TValue, TRow>,
): Promise<readonly TRow[]> {
  const pageSize = options.pageSize ?? 1_000;
  const rows: TRow[] = [];
  let cursor: string | undefined;
  do {
    const answer = await api.ask({
      lens: options.lens,
      locus: RepoRootLocus,
      projection: options.projection,
      ...(options.filters === undefined ? {} : { filters: options.filters }),
      budget: { rows: pageSize, evidencePerSubject: 0 },
      ...(cursor === undefined ? {} : { page: { size: pageSize, cursor } }),
    });
    assertHitOrMissAnswer(options.label, answer);
    rows.push(...options.rowsFromValue(answerValue<TValue>(answer)));
    cursor = answer.page?.nextCursor;
  } while (cursor !== undefined);
  return rows;
}

/** Print a stable descending count map with an empty marker. */
export function printCounts(
  label: string,
  counts: Readonly<Record<string, number>>,
  limit = 20,
): void {
  const entries = Object.entries(counts)
    .sort(
      ([leftKey, leftValue], [rightKey, rightValue]) =>
        rightValue - leftValue || leftKey.localeCompare(rightKey),
    )
    .slice(0, limit);

  console.log("");
  console.log(label);
  if (entries.length === 0) {
    console.log("- none");
    return;
  }
  for (const [key, count] of entries) {
    console.log(`- ${key}: ${count}`);
  }
}

/** Return a count map narrowed to keys that match one script-local predicate. */
export function filterCounts(
  counts: Readonly<Record<string, number>>,
  keep: (key: string) => boolean,
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(counts).filter(([key]) => keep(key)),
  );
}

/** Count script-local rows by a compact display key. */
export function countRows<TRow>(
  rows: readonly TRow[],
  keyOf: (row: TRow) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyOf(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Print an empty marker for row-oriented pressure sections. */
export function printEmptyRows(rows: readonly unknown[], message = "no rows at the default pressure threshold"): void {
  if (rows.length === 0) {
    console.log(`- ${message}`);
  }
}

/** Compact singular/plural label helper for script output. */
export function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Compact source label for rows that carry filePath directly or through source. */
export function sourceLabel(row: {
  readonly filePath?: string;
  readonly source?: ScriptSourceRef;
}): string {
  const filePath = row.source?.filePath ?? row.filePath;
  if (filePath === undefined) {
    return "<missing-source>";
  }
  const line = row.source?.startLine ?? (
    row.source?.start?.line === undefined ? undefined : row.source.start.line + 1
  );
  return line === undefined ? filePath : `${filePath}:${line}`;
}

/** Group top-level functions with the same name across multiple files. */
export function duplicateTopLevelFunctionNameGroups(
  rows: readonly ScriptFunctionNameRow[],
): readonly DuplicateFunctionNameGroup[] {
  const byName = new Map<string, ScriptFunctionNameRow[]>();
  for (const row of rows) {
    if (row.name.length < 5 || row.functionKind !== "top-level") {
      continue;
    }
    const group = byName.get(row.name) ?? [];
    group.push(row);
    byName.set(row.name, group);
  }

  return [...byName.entries()]
    .map(([name, group]) => {
      const fileCount = new Set(group.map((row) => row.filePath)).size;
      return {
        name,
        functionCount: group.length,
        fileCount,
        lineCount: group.reduce((total, row) => total + row.lineCount, 0),
        samples: group.slice(0, 3).map((row) => sourceLabel(row)),
      };
    })
    .filter((group) => group.fileCount > 1)
    .sort((left, right) =>
      right.functionCount - left.functionCount ||
      right.lineCount - left.lineCount ||
      left.name.localeCompare(right.name)
    );
}
