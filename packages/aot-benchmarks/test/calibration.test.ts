import { createHash } from 'node:crypto';

import { summaryStats } from 'tachometer/lib/stats.js';
import { describe, expect, test } from 'vitest';

import {
  PERFORMANCE_CALIBRATION_MANIFEST_SCHEMA_VERSION,
  createPerformanceCalibrationManifest,
  validateIdenticalLaneSampleCount,
} from '../src/calibration.js';
import type { HashedFileIdentity, Sha256 } from '../src/contracts.js';
import type { TachometerMetricBinding } from '../src/tachometer-result.js';

const scenarioId = 'simple-member-update-1k';
const metrics: readonly TachometerMetricBinding[] = [
  {
    metricId: 'settled-duration',
    unit: 'milliseconds',
    measurement: { name: 'duration', mode: 'performance', entryName: 'update-1k' },
  },
  {
    metricId: 'immediate-heap',
    unit: 'bytes',
    measurement: { name: 'used JS heap', mode: 'expression', expression: 'window.usedJSHeapSizeBytes' },
  },
];

describe('identical-lane calibration', () => {
  test('validates parser-grade rows and returns one common samples-per-variant count', () => {
    const result = output([
      row('base', metrics[0]!, [10, 11, 12, 13]),
      row('base', metrics[1]!, [100, 110, 120, 130]),
      row('candidate', metrics[0]!, [11, 12, 13, 14]),
      row('candidate', metrics[1]!, [110, 120, 130, 140]),
    ]);
    expect(validateIdenticalLaneSampleCount({ scenarioId, output: result, metrics })).toBe(4);
  });

  test('rejects unequal role or cross-metric sample counts', () => {
    expect(() => validateIdenticalLaneSampleCount({
      scenarioId,
      metrics: [metrics[0]!],
      output: output([
        row('base', metrics[0]!, [10, 11, 12]),
        row('candidate', metrics[0]!, [10, 11, 12, 13]),
      ]),
    })).toThrow(/unbalanced AB\/BA sample counts/u);

    expect(() => validateIdenticalLaneSampleCount({
      scenarioId,
      metrics,
      output: output([
        row('base', metrics[0]!, [10, 11, 12]),
        row('candidate', metrics[0]!, [10, 11, 12]),
        row('base', metrics[1]!, [100, 110, 120, 130]),
        row('candidate', metrics[1]!, [100, 110, 120, 130]),
      ]),
    })).toThrow(/unequal sample counts across roles or metrics/u);
  });

  test('inherits stale-statistic and exact-measurement rejection from the result parser', () => {
    const stale = output([
      row('base', metrics[0]!, [10, 11, 12]),
      row('candidate', metrics[0]!, [10, 11, 12]),
    ]);
    stale.benchmarks[0]!.mean.low += 1;
    expect(() => validateIdenticalLaneSampleCount({
      scenarioId,
      output: stale,
      metrics: [metrics[0]!],
    })).toThrow(/does not match its raw samples/u);

    const unbound = output([
      row('base', metrics[0]!, [10, 11, 12]),
      row('candidate', metrics[0]!, [10, 11, 12]),
    ]);
    unbound.benchmarks[1]!.measurement.entryName = 'another-entry';
    expect(() => validateIdenticalLaneSampleCount({
      scenarioId,
      output: unbound,
      metrics: [metrics[0]!],
    })).toThrow(/unbound measurement/u);
  });

  test('creates one timestamp-free deterministic manifest over counts and raw identities', () => {
    const alpha = raw('raw/alpha.json', 'alpha');
    const zeta = raw('raw/zeta.json', 'zeta');
    const forward = createPerformanceCalibrationManifest([
      { scenarioId: 'zeta', fixedSamplesPerVariant: 20, rawResult: zeta },
      { scenarioId: 'alpha', fixedSamplesPerVariant: 12, rawResult: alpha },
    ]);
    const reverse = createPerformanceCalibrationManifest([
      { scenarioId: 'alpha', fixedSamplesPerVariant: 12, rawResult: alpha },
      { scenarioId: 'zeta', fixedSamplesPerVariant: 20, rawResult: zeta },
    ]);

    expect(forward).toEqual(reverse);
    expect(forward).toEqual({
      schemaVersion: PERFORMANCE_CALIBRATION_MANIFEST_SCHEMA_VERSION,
      calibrationKind: 'identical-lane',
      scenarios: [
        { scenarioId: 'alpha', fixedSamplesPerVariant: 12, rawResult: alpha },
        { scenarioId: 'zeta', fixedSamplesPerVariant: 20, rawResult: zeta },
      ],
    });
    expect(() => createPerformanceCalibrationManifest([
      { scenarioId: 'alpha', fixedSamplesPerVariant: 12, rawResult: alpha },
      { scenarioId: 'alpha', fixedSamplesPerVariant: 20, rawResult: zeta },
    ])).toThrow(/repeats scenario/u);
    expect(() => createPerformanceCalibrationManifest([
      { scenarioId: 'alpha', fixedSamplesPerVariant: 0, rawResult: alpha },
    ])).toThrow(/invalid fixed sample count/u);
    expect(() => createPerformanceCalibrationManifest([
      { scenarioId: 'alpha', fixedSamplesPerVariant: 12, rawResult: alpha },
      { scenarioId: 'zeta', fixedSamplesPerVariant: 20, rawResult: alpha },
    ])).toThrow(/repeats raw result/u);
  });
});

interface TestRow {
  readonly role: 'base' | 'candidate';
  readonly metric: TachometerMetricBinding;
  readonly samples: readonly number[];
}

function row(
  role: TestRow['role'],
  metric: TachometerMetricBinding,
  samples: readonly number[],
): TestRow {
  return { role, metric, samples };
}

function output(rows: readonly TestRow[]) {
  const benchmarks = rows.map((value) => {
    const stats = summaryStats([...value.samples]);
    return {
      name: `${scenarioId} ${value.role} [${value.metric.measurement.name}]`,
      bytesSent: 1,
      measurement: { ...value.metric.measurement },
      mean: { low: stats.meanCI.low, high: stats.meanCI.high },
      differences: [] as (unknown | null)[],
      samples: [...value.samples],
    };
  });
  for (const [index, benchmark] of benchmarks.entries()) {
    benchmark.differences = benchmarks.map((_, differenceIndex) => differenceIndex === index
      ? null
      : {
          absolute: { low: -1, high: 1 },
          percentChange: { low: -1, high: 1 },
        });
  }
  return { benchmarks };
}

function raw(filePath: string, seed: string): HashedFileIdentity {
  const bytes = Buffer.from(seed);
  return {
    path: filePath,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex') as Sha256,
  };
}
