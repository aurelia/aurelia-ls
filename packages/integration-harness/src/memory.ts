import { performance } from "node:perf_hooks";

export interface MemorySample {
  label: string;
  timeMs: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryDelta {
  from: string;
  to: string;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryTrace {
  samples: MemorySample[];
  deltas: MemoryDelta[];
  peak: MemorySample | null;
}

export interface MemoryTracker {
  mark(label: string): void;
  trace(): MemoryTrace | undefined;
}

export interface MemoryTrackerOptions {
  enabled: boolean;
  logger?: { info(message: string): void };
  logSamples?: boolean;
  logDeltas?: boolean;
}

export function createMemoryTracker(options: MemoryTrackerOptions): MemoryTracker {
  if (!options.enabled) {
    return {
      mark: () => {},
      trace: () => undefined,
    };
  }

  const start = performance.now();
  const samples: MemorySample[] = [];

  const mark = (label: string) => {
    const usage = process.memoryUsage();
    const sample: MemorySample = {
      label,
      timeMs: performance.now() - start,
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers ?? 0,
    };
    const prev = samples[samples.length - 1];
    samples.push(sample);

    if (options.logger && options.logSamples) {
      options.logger.info(formatSample(sample));
    }
    if (options.logger && options.logDeltas && prev) {
      options.logger.info(formatDelta(prev, sample));
    }
  };

  const trace = (): MemoryTrace => {
    const deltas: MemoryDelta[] = [];
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1]!;
      const next = samples[i]!;
      deltas.push({
        from: prev.label,
        to: next.label,
        rss: next.rss - prev.rss,
        heapUsed: next.heapUsed - prev.heapUsed,
        heapTotal: next.heapTotal - prev.heapTotal,
        external: next.external - prev.external,
        arrayBuffers: next.arrayBuffers - prev.arrayBuffers,
      });
    }

    const peak = samples.reduce<MemorySample | null>((current, sample) => {
      if (!current) return sample;
      return sample.heapUsed > current.heapUsed ? sample : current;
    }, null);

    return { samples, deltas, peak };
  };

  return { mark, trace };
}

function formatSample(sample: MemorySample): string {
  return [
    "[memory]",
    sample.label.padEnd(12),
    `heap=${formatBytes(sample.heapUsed)}`,
    `rss=${formatBytes(sample.rss)}`,
    `ext=${formatBytes(sample.external)}`,
    `time=${sample.timeMs.toFixed(1)}ms`,
  ].join(" ");
}

function formatDelta(prev: MemorySample, next: MemorySample): string {
  return [
    "[memory-delta]",
    `${prev.label} -> ${next.label}`.padEnd(28),
    `heap=${formatBytes(next.heapUsed - prev.heapUsed)}`,
    `rss=${formatBytes(next.rss - prev.rss)}`,
    `ext=${formatBytes(next.external - prev.external)}`,
  ].join(" ");
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)}MB`;
}
