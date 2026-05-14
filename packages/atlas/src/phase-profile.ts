import { performance } from "node:perf_hooks";

/** One measured phase row for Atlas substrate profiling. */
export interface PhaseProfileRow {
  /** Stable phase id; use it as a cache/split-point handle, not display prose. */
  readonly phase: string;
  /** Wall-clock milliseconds spent inside this phase for the current source epoch. */
  readonly milliseconds: number;
  /** Optional number of source rows, checker calls, or products covered by the phase. */
  readonly itemCount?: number;
  /** Human-readable explanation of what the phase did. */
  readonly summary: string;
}

/** Small phase profiler for cold substrate builds and repeated checker-call groups. */
export class PhaseProfiler<TRow extends PhaseProfileRow = PhaseProfileRow> {
  readonly #rows: PhaseProfileRow[] = [];
  readonly #repeated = new Map<string, {
    milliseconds: number;
    count: number;
    summary: string;
  }>();

  time<T>(
    phase: string,
    itemCount: number | undefined,
    summary: string,
    read: () => T,
  ): T {
    const started = performance.now();
    const value = read();
    const milliseconds = performance.now() - started;
    this.#rows.push({
      phase,
      milliseconds,
      itemCount,
      summary,
    });
    return value;
  }

  measureRepeated<T>(
    phase: string,
    summary: string,
    read: () => T,
  ): T {
    const started = performance.now();
    try {
      return read();
    } finally {
      const milliseconds = performance.now() - started;
      const current = this.#repeated.get(phase) ?? {
        milliseconds: 0,
        count: 0,
        summary,
      };
      this.#repeated.set(phase, {
        milliseconds: current.milliseconds + milliseconds,
        count: current.count + 1,
        summary,
      });
    }
  }

  countRepeated(
    phase: string,
    summary: string,
    count = 1,
  ): void {
    const current = this.#repeated.get(phase) ?? {
      milliseconds: 0,
      count: 0,
      summary,
    };
    this.#repeated.set(phase, {
      milliseconds: current.milliseconds,
      count: current.count + count,
      summary,
    });
  }

  addNestedRows(
    prefix: string,
    rows: readonly PhaseProfileRow[],
  ): void {
    for (const row of rows) {
      this.#rows.push({
        phase: `${prefix}.${row.phase}`,
        milliseconds: row.milliseconds,
        itemCount: row.itemCount,
        summary: row.summary,
      });
    }
  }

  rows(): readonly TRow[] {
    const rows = [
      ...this.#rows,
      ...[...this.#repeated.entries()].map(([phase, row]) => ({
        phase,
        milliseconds: row.milliseconds,
        itemCount: row.count,
        summary: row.summary,
      })),
    ];
    return rows as unknown as readonly TRow[];
  }
}
