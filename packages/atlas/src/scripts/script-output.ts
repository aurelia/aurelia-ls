import { OutcomeKind, type Answer } from "../inquiry/answer.js";
import type { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { Api } from "../session/api.js";
import { groupByDefined } from "../collections.js";

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
  readonly bodyFingerprint?: string;
  readonly bodyShapeFingerprint?: string;
  readonly source?: ScriptSourceRef;
}

export interface DuplicateFunctionNameGroup {
  readonly name: string;
  readonly functionCount: number;
  readonly fileCount: number;
  readonly lineCount: number;
  readonly distinctBodyFingerprintCount: number | null;
  readonly repeatedBodyFingerprintCount: number;
  readonly distinctBodyShapeFingerprintCount: number | null;
  readonly repeatedBodyShapeFingerprintCount: number;
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
    throw new Error(answerOutcomeMessage(label, answer));
  }
}

/** Assert that a pressure inquiry returned either rows or an honest miss. */
export function assertHitOrMissAnswer(
  label: string,
  answer: Answer<unknown>,
): void {
  if (answer.outcome !== OutcomeKind.Hit && answer.outcome !== OutcomeKind.Miss) {
    throw new Error(answerOutcomeMessage(label, answer));
  }
}

function answerOutcomeMessage(
  label: string,
  answer: Answer<unknown>,
): string {
  const continuationLines = answer.continuations
    .slice(0, 6)
    .map((continuation) => {
      const inquiry = continuation.inquiry;
      return `  - ${continuation.id ?? "<unnamed>"}: ${inquiry.lens}:${inquiry.projection ?? "<default>"}`;
    });
  return [
    `${label} returned ${answer.outcome}.`,
    answer.summary,
    continuationLines.length === 0
      ? undefined
      : `Suggested continuations:\n${continuationLines.join("\n")}`,
  ].filter((part): part is string => part !== undefined && part.length > 0).join("\n");
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
      filters: options.filters,
      budget: { rows: pageSize, evidencePerSubject: 0 },
      page: cursor === undefined ? undefined : { size: pageSize, cursor },
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

/** Print a row-section header that makes compact display slices explicit. */
export function printRowSectionHeader(
  label: string,
  rows: readonly unknown[],
  limit: number,
): void {
  console.log("");
  const shown = Math.min(rows.length, limit);
  console.log(rows.length > shown ? `${label} (showing ${shown} of ${rows.length})` : label);
}

/** Compact singular/plural label helper for script output. */
export function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Read the value following a prefix-style script argument such as `--query=`. */
export function scriptArgumentValue(
  prefix: string,
  args: readonly string[] = process.argv,
): string | undefined {
  return scriptArgumentValues(prefix, args)[0];
}

/** Read all values following a prefix-style or separated script argument such as `--domain=x` or `--domain x`. */
export function scriptArgumentValues(
  prefix: string,
  args: readonly string[] = process.argv,
): readonly string[] {
  const values: string[] = [];
  for (const entry of args) {
    if (entry.startsWith(prefix)) {
      const value = entry.slice(prefix.length);
      if (value.length > 0) {
        values.push(value);
      }
    }
  }
  if (!prefix.endsWith("=")) {
    return values;
  }
  const separatedFlag = prefix.slice(0, -1);
  for (let index = 0; index < args.length - 1; index += 1) {
    if (args[index] !== separatedFlag) {
      continue;
    }
    const value = args[index + 1];
    if (value !== undefined && value.length > 0 && !value.startsWith("--")) {
      values.push(value);
    }
  }
  return values;
}

/** Read a positive integer prefix-style script argument. */
export function scriptNumberArgumentValue(
  prefix: string,
  args: readonly string[] = process.argv,
): number | undefined {
  const value = scriptArgumentValue(prefix, args);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

/** Fail fast when a human-oriented script receives an unsupported `--flag`. */
export function assertKnownScriptArguments(
  label: string,
  knownArguments: readonly string[],
  args: readonly string[] = process.argv,
): void {
  const unknown = args
    .slice(2)
    .filter((entry) => entry.startsWith("--") && entry !== "--")
    .filter((entry) => !knownArguments.some((known) => scriptArgumentMatchesKnown(entry, known)));
  if (unknown.length > 0) {
    console.error(`${label} received unknown argument(s): ${unknown.join(", ")}`);
    process.exit(1);
  }
}

function scriptArgumentMatchesKnown(argument: string, known: string): boolean {
  if (known.endsWith("=")) {
    const flag = known.slice(0, -1);
    return argument === flag || argument.startsWith(known);
  }
  return argument === known;
}

/** Build an object-spreadable string filter from a prefix-style script argument. */
export function scriptOptionalStringFilter(
  name: string,
  args: readonly string[] = process.argv,
): Record<string, string> {
  const value = scriptArgumentValue(`--${name}=`, args);
  return value === undefined ? {} : { [name]: value };
}

/** Build an object-spreadable boolean filter from a `--name=true|false` script argument. */
export function scriptOptionalBooleanFilter(
  name: string,
  args: readonly string[] = process.argv,
): Record<string, boolean> {
  const value = scriptArgumentValue(`--${name}=`, args);
  if (value === "true") {
    return { [name]: true };
  }
  if (value === "false") {
    return { [name]: false };
  }
  return {};
}

/** Format script filters consistently across human-oriented Atlas CLI wrappers. */
export function scriptFilterSummary(
  filters: Readonly<Record<string, unknown>>,
): string | undefined {
  const parts = Object.entries(filters).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}=[${value.join(",")}]`;
    }
    return `${key}=${String(value)}`;
  });
  return parts.length === 0 ? undefined : parts.join("; ");
}

/** Require a prefix-style script argument. */
export function requiredScriptArgumentValue(
  prefix: string,
  args: readonly string[] = process.argv,
): string {
  const value = scriptArgumentValue(prefix, args);
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required ${prefix} argument.`);
  }
  return value;
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
      const rowsByBodyFingerprint = groupByDefined(group, (row) => row.bodyFingerprint);
      const repeatedBodyFingerprintCount = [...rowsByBodyFingerprint.values()]
        .filter((rows) => new Set(rows.map((row) => row.filePath)).size > 1)
        .length;
      const rowsByBodyShapeFingerprint = groupByDefined(group, (row) => row.bodyShapeFingerprint);
      const repeatedBodyShapeFingerprintCount = [...rowsByBodyShapeFingerprint.values()]
        .filter((rows) => new Set(rows.map((row) => row.filePath)).size > 1)
        .length;
      return {
        name,
        functionCount: group.length,
        fileCount,
        lineCount: group.reduce((total, row) => total + row.lineCount, 0),
        distinctBodyFingerprintCount: rowsByBodyFingerprint.size === 0
          ? null
          : rowsByBodyFingerprint.size,
        repeatedBodyFingerprintCount,
        distinctBodyShapeFingerprintCount: rowsByBodyShapeFingerprint.size === 0
          ? null
          : rowsByBodyShapeFingerprint.size,
        repeatedBodyShapeFingerprintCount,
        samples: group.slice(0, 3).map((row) => sourceLabel(row)),
      };
    })
    .filter((group) => group.fileCount > 1)
    .sort((left, right) =>
      right.repeatedBodyShapeFingerprintCount - left.repeatedBodyShapeFingerprintCount ||
      right.repeatedBodyFingerprintCount - left.repeatedBodyFingerprintCount ||
      right.functionCount - left.functionCount ||
      right.lineCount - left.lineCount ||
      left.name.localeCompare(right.name)
    );
}
