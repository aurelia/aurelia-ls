import {
  computeDifference,
  summaryStats,
  type ConfidenceInterval as TachometerConfidenceInterval,
  type SummaryStats,
} from 'tachometer/lib/stats.js';

import type {
  ConfidenceInterval,
  MeasurementResult,
  MeasurementUnit,
  MetricVerdict,
  VariantMeasurement,
} from './contracts.js';
import type { TachometerMeasurement } from './tachometer.js';

export interface TachometerMetricBinding {
  readonly metricId: string;
  readonly unit: MeasurementUnit;
  readonly measurement: TachometerMeasurement;
}

export interface TachometerAbBaResults {
  readonly scenarioId: string;
  /** Output from the config whose first row is JIT and second row is AOT. */
  readonly jitAot: unknown;
  /** Output from the config whose first row is AOT and second row is JIT. */
  readonly aotJit: unknown;
  readonly metrics: readonly TachometerMetricBinding[];
}

interface ParsedRow {
  readonly samples: readonly number[];
}

interface ParsedMetricRows {
  readonly base: ParsedRow;
  readonly candidate: ParsedRow;
}

/**
 * Normalizes two counterbalanced Tachometer files into the statistical shape
 * owned by `PerformanceResult`. Tachometer's emitted cross-result differences
 * are deliberately ignored: with multiple measurements they compare unlike
 * units. Same-metric candidate-minus-control intervals are recomputed from the
 * retained raw samples with Tachometer 0.7.1's own statistical functions.
 */
export function normalizeTachometerAbBaMeasurements(
  input: TachometerAbBaResults,
): readonly MeasurementResult[] {
  assertMetricBindings(input.metrics);
  const jitAot = parseOutput(input.jitAot, input.scenarioId, input.metrics, 'jit-aot');
  const aotJit = parseOutput(input.aotJit, input.scenarioId, input.metrics, 'aot-jit');

  return input.metrics.map((metric) => {
    const ab = readMetric(jitAot, metric.metricId, 'jit-aot');
    const ba = readMetric(aotJit, metric.metricId, 'aot-jit');
    const counts = [
      ab.base.samples.length,
      ab.candidate.samples.length,
      ba.base.samples.length,
      ba.candidate.samples.length,
    ];
    if (new Set(counts).size !== 1) {
      throw new Error(
        `Tachometer metric "${metric.metricId}" has unbalanced AB/BA sample counts `
        + `(${counts.join(', ')}); a counterbalanced result requires equal order-block weight.`,
      );
    }

    // In jit-aot, base=JIT and candidate=AOT. In aot-jit, those semantic
    // lanes are reversed even though Tachometer still calls them base/candidate.
    const controlSamples = [...ab.base.samples, ...ba.candidate.samples];
    const candidateSamples = [...ab.candidate.samples, ...ba.base.samples];
    const controlStats = summaryStats(controlSamples);
    const candidateStats = summaryStats(candidateSamples);
    const difference = computeDifference(controlStats, candidateStats);
    const absolute = interval(difference.absolute);
    const percent = interval(difference.relative, 100);

    return {
      scenarioId: input.scenarioId,
      metricId: metric.metricId,
      unit: metric.unit,
      control: measurement(controlStats),
      candidate: measurement(candidateStats),
      absoluteDifferenceConfidenceInterval95: absolute,
      percentDifferenceConfidenceInterval95: percent,
      verdict: verdict(absolute, percent, metric.metricId),
    };
  });
}

function parseOutput(
  value: unknown,
  scenarioId: string,
  metrics: readonly TachometerMetricBinding[],
  label: string,
): ReadonlyMap<string, ParsedMetricRows> {
  const output = record(value, `${label} Tachometer output`);
  if (!Array.isArray(output.benchmarks) || output.benchmarks.length !== metrics.length * 2) {
    throw new Error(`${label} Tachometer output must contain exactly two rows for every bound metric.`);
  }

  const rows = new Map<string, Partial<Record<'base' | 'candidate', ParsedRow>>>();
  for (const [index, valueRow] of output.benchmarks.entries()) {
    const row = record(valueRow, `${label} benchmark row ${index}`);
    const role = readRole(row.name, scenarioId, label);
    const binding = readMetricBinding(row.measurement, metrics, label, index);
    const samples = readSamples(row.samples, label, index);
    assertEmittedMean(row.mean, summaryStats(samples), label, index);
    if (!Array.isArray(row.differences)
      || row.differences.length !== output.benchmarks.length
      || row.differences[index] !== null) {
      throw new Error(`${label} benchmark row ${index} is not Tachometer 0.7.1 statistical output.`);
    }

    const metricRows = rows.get(binding.metricId) ?? {};
    if (metricRows[role] !== undefined) {
      throw new Error(`${label} Tachometer output repeats ${role} metric "${binding.metricId}".`);
    }
    metricRows[role] = { samples };
    rows.set(binding.metricId, metricRows);
  }

  const complete = new Map<string, ParsedMetricRows>();
  for (const metric of metrics) {
    const metricRows = rows.get(metric.metricId);
    if (metricRows?.base == null || metricRows.candidate == null) {
      throw new Error(`${label} Tachometer output is missing a base or candidate row for "${metric.metricId}".`);
    }
    complete.set(metric.metricId, { base: metricRows.base, candidate: metricRows.candidate });
  }
  return complete;
}

function readMetric(
  rows: ReadonlyMap<string, ParsedMetricRows>,
  metricId: string,
  label: string,
): ParsedMetricRows {
  const metric = rows.get(metricId);
  if (metric == null) throw new Error(`${label} Tachometer output has no metric "${metricId}".`);
  return metric;
}

function assertMetricBindings(metrics: readonly TachometerMetricBinding[]): void {
  if (metrics.length === 0) throw new Error('Tachometer normalization requires at least one metric binding.');
  const metricIds = new Set<string>();
  const measurementIdentities = new Set<string>();
  for (const metric of metrics) {
    if (metric.metricId.length === 0 || metricIds.has(metric.metricId)) {
      throw new Error(`Tachometer metric id "${metric.metricId}" is empty or repeated.`);
    }
    if (metric.unit !== 'milliseconds' && metric.unit !== 'bytes') {
      throw new Error(`Tachometer metric "${metric.metricId}" has unsupported unit "${String(metric.unit)}".`);
    }
    assertMeasurement(metric.measurement, metric.metricId);
    const identity = measurementIdentity(metric.measurement);
    if (measurementIdentities.has(identity)) {
      throw new Error(`Tachometer measurement identity "${identity}" is bound more than once.`);
    }
    metricIds.add(metric.metricId);
    measurementIdentities.add(identity);
  }
}

function assertMeasurement(measurement: TachometerMeasurement, metricId: string): void {
  if (measurement.name.length === 0) throw new Error(`Tachometer metric "${metricId}" has no measurement name.`);
  if (measurement.mode === 'performance') {
    if (measurement.entryName == null || measurement.entryName.length === 0 || measurement.expression !== undefined) {
      throw new Error(`Performance metric "${metricId}" requires one entryName and no expression.`);
    }
  } else if (measurement.expression == null || measurement.expression.length === 0 || measurement.entryName !== undefined) {
    throw new Error(`Expression metric "${metricId}" requires one expression and no entryName.`);
  }
}

function readMetricBinding(
  value: unknown,
  metrics: readonly TachometerMetricBinding[],
  label: string,
  index: number,
): TachometerMetricBinding {
  const measurement = record(value, `${label} benchmark row ${index} measurement`);
  const identity = measurementIdentityFromUnknown(measurement, label, index);
  const binding = metrics.find((metric) => measurementIdentity(metric.measurement) === identity);
  if (binding == null) throw new Error(`${label} benchmark row ${index} has unbound measurement "${identity}".`);
  return binding;
}

function measurementIdentity(measurement: TachometerMeasurement): string {
  if (measurement.mode === 'performance') {
    if (measurement.entryName == null) throw new Error('A performance measurement identity requires an entry name.');
    return `performance\0${measurement.name}\0${measurement.entryName}`;
  }
  if (measurement.expression == null) throw new Error('An expression measurement identity requires an expression.');
  return `expression\0${measurement.name}\0${measurement.expression}`;
}

function measurementIdentityFromUnknown(
  measurement: Record<string, unknown>,
  label: string,
  index: number,
): string {
  const name = nonEmptyString(measurement.name, `${label} benchmark row ${index} measurement name`);
  if (measurement.mode === 'performance') {
    const entryName = nonEmptyString(measurement.entryName, `${label} benchmark row ${index} entry name`);
    return `performance\0${name}\0${entryName}`;
  }
  if (measurement.mode === 'expression') {
    const expression = nonEmptyString(measurement.expression, `${label} benchmark row ${index} expression`);
    return `expression\0${name}\0${expression}`;
  }
  throw new Error(`${label} benchmark row ${index} has an unsupported measurement mode.`);
}

function readRole(value: unknown, scenarioId: string, label: string): 'base' | 'candidate' {
  const name = nonEmptyString(value, `${label} benchmark name`);
  for (const role of ['base', 'candidate'] as const) {
    const prefix = `${scenarioId} ${role}`;
    if (name === prefix || (name.startsWith(`${prefix} [`) && name.endsWith(']'))) return role;
  }
  throw new Error(`${label} benchmark name "${name}" does not belong to scenario "${scenarioId}".`);
}

function readSamples(value: unknown, label: string, index: number): number[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error(`${label} benchmark row ${index} must retain at least two raw samples.`);
  }
  const samples: number[] = [];
  for (const sample of value) {
    if (typeof sample !== 'number' || !Number.isFinite(sample) || sample < 0) {
      throw new Error(`${label} benchmark row ${index} contains an invalid raw sample.`);
    }
    samples.push(sample);
  }
  return samples;
}

function assertEmittedMean(value: unknown, stats: SummaryStats, label: string, index: number): void {
  const mean = record(value, `${label} benchmark row ${index} emitted mean`);
  const low = finite(mean.low, `${label} benchmark row ${index} emitted mean low`);
  const high = finite(mean.high, `${label} benchmark row ${index} emitted mean high`);
  if (!nearlyEqual(low, stats.meanCI.low) || !nearlyEqual(high, stats.meanCI.high)) {
    throw new Error(`${label} benchmark row ${index} emitted mean interval does not match its raw samples.`);
  }
}

function measurement(stats: SummaryStats): VariantMeasurement {
  return {
    samples: stats.size,
    mean: stats.mean,
    meanConfidenceInterval95: interval(stats.meanCI),
  };
}

function interval(value: TachometerConfidenceInterval, scale = 1): ConfidenceInterval {
  const lower = value.low * scale;
  const upper = value.high * scale;
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
    throw new Error('Tachometer produced a non-finite or inverted confidence interval.');
  }
  return { lower, upper };
}

function verdict(
  absolute: ConfidenceInterval,
  percent: ConfidenceInterval,
  metricId: string,
): MetricVerdict {
  const absoluteSign = intervalSign(absolute);
  const percentSign = intervalSign(percent);
  if (absoluteSign === -1 && percentSign === -1) return 'improved';
  if (absoluteSign === 1 && percentSign === 1) return 'regressed';
  if (absoluteSign === 0 || percentSign === 0) return 'unresolved';
  throw new Error(
    `Tachometer metric "${metricId}" has contradictory nonzero absolute and percent intervals; `
    + 'it cannot satisfy the PerformanceResult verdict contract.',
  );
}

function intervalSign(value: ConfidenceInterval): -1 | 0 | 1 {
  if (value.upper < 0) return -1;
  if (value.lower > 0) return 1;
  return 0;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a record.`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= Number.EPSILON * 32 * Math.max(1, Math.abs(left), Math.abs(right));
}
