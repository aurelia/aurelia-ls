import { performance } from "node:perf_hooks";

/** One measured phase row for Atlas substrate profiling. */
export interface PhaseProfileRow {
  /** Stable phase id; use it as a cache/split-point handle, not display prose. */
  readonly phase: string;
  /** Inclusive wall-clock milliseconds spent inside this phase for the current source epoch. */
  readonly milliseconds: number;
  /** Wall-clock milliseconds spent inside this phase excluding nested profiler measurements. */
  readonly exclusiveMilliseconds?: number;
  /** Wall-clock milliseconds attributed to nested profiler measurements under this phase. */
  readonly childMilliseconds?: number;
  /** Optional number of source rows, checker calls, or products covered by the phase. */
  readonly itemCount?: number;
  /** Human-readable explanation of what the phase did. */
  readonly summary: string;
}

interface PhaseProfilerFrame {
  childMilliseconds: number;
}

/** Small phase profiler for cold substrate builds and repeated checker-call groups. */
export class PhaseProfiler<TRow extends PhaseProfileRow = PhaseProfileRow> {
  readonly #rows: PhaseProfileRow[] = [];
  readonly #repeated = new Map<string, {
    milliseconds: number;
    exclusiveMilliseconds: number;
    childMilliseconds: number;
    count: number;
    summary: string;
  }>();
  readonly #stack: PhaseProfilerFrame[] = [];

  time<T>(
    phase: string,
    itemCount: number | undefined,
    summary: string,
    read: () => T,
  ): T {
    const started = performance.now();
    const frame = this.#enterFrame();
    try {
      return read();
    } finally {
      const milliseconds = performance.now() - started;
      const childMilliseconds = frame.childMilliseconds;
      this.#leaveFrame(milliseconds);
      this.#rows.push({
        phase,
        milliseconds,
        exclusiveMilliseconds: exclusiveMilliseconds(milliseconds, childMilliseconds),
        childMilliseconds,
        itemCount,
        summary,
      });
    }
  }

  measureRepeated<T>(
    phase: string,
    summary: string,
    read: () => T,
  ): T {
    const started = performance.now();
    const frame = this.#enterFrame();
    try {
      return read();
    } finally {
      const milliseconds = performance.now() - started;
      const childMilliseconds = frame.childMilliseconds;
      this.#leaveFrame(milliseconds);
      const current = this.#repeated.get(phase) ?? {
        milliseconds: 0,
        exclusiveMilliseconds: 0,
        childMilliseconds: 0,
        count: 0,
        summary,
      };
      this.#repeated.set(phase, {
        milliseconds: current.milliseconds + milliseconds,
        exclusiveMilliseconds:
          current.exclusiveMilliseconds + exclusiveMilliseconds(milliseconds, childMilliseconds),
        childMilliseconds: current.childMilliseconds + childMilliseconds,
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
      exclusiveMilliseconds: 0,
      childMilliseconds: 0,
      count: 0,
      summary,
    };
    this.#repeated.set(phase, {
      milliseconds: current.milliseconds,
      exclusiveMilliseconds: current.exclusiveMilliseconds,
      childMilliseconds: current.childMilliseconds,
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
        exclusiveMilliseconds: row.exclusiveMilliseconds,
        childMilliseconds: row.childMilliseconds,
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
        exclusiveMilliseconds: row.exclusiveMilliseconds,
        childMilliseconds: row.childMilliseconds,
        itemCount: row.count,
        summary: row.summary,
      })),
    ];
    return rows as unknown as readonly TRow[];
  }

  #enterFrame(): PhaseProfilerFrame {
    const frame = { childMilliseconds: 0 };
    this.#stack.push(frame);
    return frame;
  }

  #leaveFrame(milliseconds: number): void {
    this.#stack.pop();
    const parent = this.#stack[this.#stack.length - 1];
    if (parent !== undefined) {
      parent.childMilliseconds += milliseconds;
    }
  }
}

function exclusiveMilliseconds(
  milliseconds: number,
  childMilliseconds: number,
): number {
  return Math.max(0, milliseconds - childMilliseconds);
}
