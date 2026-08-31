import { describe, expect, test } from 'vitest';
import { summaryStats } from 'tachometer/lib/stats.js';

import {
  normalizeTachometerAbBaMeasurements,
  type TachometerMetricBinding,
} from '../src/tachometer-result.js';

const scenarioId = 'realistic-mixed-reconciliation-1k';
const metrics: readonly TachometerMetricBinding[] = [
  {
    metricId: 'settled-duration',
    unit: 'milliseconds',
    measurement: { name: 'duration', mode: 'performance', entryName: 'realistic-mixed-1000' },
  },
  {
    metricId: 'immediate-heap',
    unit: 'bytes',
    measurement: { name: 'immediate used JS heap', mode: 'expression', expression: 'window.usedJSHeapSizeBytes' },
  },
];

describe('Tachometer AB/BA result normalization', () => {
  test('normalizes semantic lanes, pools balanced blocks, and recomputes same-unit differences', () => {
    const jitAot = output([
      row('base', metrics[0]!, [10, 11, 12]),
      row('base', metrics[1]!, [100, 110, 120]),
      row('candidate', metrics[0]!, [7, 8, 9]),
      row('candidate', metrics[1]!, [70, 80, 90]),
    ]);
    const aotJit = output([
      row('base', metrics[0]!, [8, 9, 10]),
      row('base', metrics[1]!, [80, 90, 100]),
      row('candidate', metrics[0]!, [11, 12, 13]),
      row('candidate', metrics[1]!, [110, 120, 130]),
    ]);

    // These are deliberately absurd cross-result differences. The normalizer
    // must use the raw samples instead of Tachometer's all-against-all matrix.
    for (const benchmark of jitAot.benchmarks) benchmark.differences.fill({
      absolute: { low: 1_000_000, high: 2_000_000 },
      percentChange: { low: 3_000_000, high: 4_000_000 },
    });
    jitAot.benchmarks.forEach((benchmark, index) => { benchmark.differences[index] = null; });

    const normalized = normalizeTachometerAbBaMeasurements({ scenarioId, jitAot, aotJit, metrics });
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      scenarioId,
      metricId: 'settled-duration',
      unit: 'milliseconds',
      verdict: 'improved',
      control: { samples: 6, mean: 11.5 },
      candidate: { samples: 6, mean: 8.5 },
    });
    expect(normalized[1]).toMatchObject({
      metricId: 'immediate-heap',
      unit: 'bytes',
      verdict: 'improved',
      control: { samples: 6, mean: 115 },
      candidate: { samples: 6, mean: 85 },
    });
    expect(normalized[0]!.absoluteDifferenceConfidenceInterval95!.upper).toBeLessThan(0);
    expect(normalized[0]!.percentDifferenceConfidenceInterval95!.upper).toBeLessThan(0);
  });

  test('classifies overlap as unresolved and positive candidate differences as regressions', () => {
    const unresolvedMetric = [metrics[0]!] as const;
    const unresolved = normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: unresolvedMetric,
      jitAot: output([
        row('base', unresolvedMetric[0], [9, 10, 11, 12]),
        row('candidate', unresolvedMetric[0], [9, 10, 11, 12]),
      ]),
      aotJit: output([
        row('base', unresolvedMetric[0], [10, 11, 12, 13]),
        row('candidate', unresolvedMetric[0], [10, 11, 12, 13]),
      ]),
    });
    expect(unresolved[0]!.verdict).toBe('unresolved');
    expect(unresolved[0]!.absoluteDifferenceConfidenceInterval95).toMatchObject({ lower: expect.any(Number), upper: expect.any(Number) });

    const regressed = normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: unresolvedMetric,
      jitAot: output([
        row('base', unresolvedMetric[0], [7, 8, 9]),
        row('candidate', unresolvedMetric[0], [12, 13, 14]),
      ]),
      aotJit: output([
        row('base', unresolvedMetric[0], [13, 14, 15]),
        row('candidate', unresolvedMetric[0], [8, 9, 10]),
      ]),
    });
    expect(regressed[0]!.verdict).toBe('regressed');
    expect(regressed[0]!.absoluteDifferenceConfidenceInterval95!.lower).toBeGreaterThan(0);
  });

  test('keeps a one-resolved one-crossing comparison conservatively unresolved', () => {
    const metric = metrics[0]!;
    const normalized = normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: [metric],
      jitAot: output([
        row('base', metric, [92, 83]),
        row('candidate', metric, [45, 3]),
      ]),
      aotJit: output([
        row('base', metric, [43, 34]),
        row('candidate', metric, [79, 34]),
      ]),
    });

    expect(normalized[0]!.absoluteDifferenceConfidenceInterval95).toMatchObject({
      lower: expect.any(Number),
      upper: expect.any(Number),
    });
    expect(normalized[0]!.absoluteDifferenceConfidenceInterval95!.lower).toBeLessThan(0);
    expect(normalized[0]!.absoluteDifferenceConfidenceInterval95!.upper).toBeGreaterThan(0);
    expect(normalized[0]!.percentDifferenceConfidenceInterval95!.upper).toBeLessThan(0);
    expect(normalized[0]!.verdict).toBe('unresolved');
  });

  test('rejects unbalanced order blocks instead of silently weighting one ordering more', () => {
    const metric = metrics[0]!;
    expect(() => normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: [metric],
      jitAot: output([
        row('base', metric, [10, 11, 12]),
        row('candidate', metric, [8, 9, 10]),
      ]),
      aotJit: output([
        row('base', metric, [8, 9, 10, 11]),
        row('candidate', metric, [10, 11, 12, 13]),
      ]),
    })).toThrow(/unbalanced AB\/BA sample counts/u);
  });

  test('rejects stale statistics, duplicate rows, and unbound measurement identities', () => {
    const metric = metrics[0]!;
    const validBa = output([
      row('base', metric, [8, 9, 10]),
      row('candidate', metric, [10, 11, 12]),
    ]);
    const stale = output([
      row('base', metric, [10, 11, 12]),
      row('candidate', metric, [8, 9, 10]),
    ]);
    stale.benchmarks[0]!.mean.low += 1;
    expect(() => normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: [metric],
      jitAot: stale,
      aotJit: validBa,
    })).toThrow(/does not match its raw samples/u);

    const duplicate = output([
      row('base', metric, [10, 11, 12]),
      row('base', metric, [8, 9, 10]),
    ]);
    expect(() => normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: [metric],
      jitAot: duplicate,
      aotJit: validBa,
    })).toThrow(/repeats base metric/u);

    const unbound = output([
      row('base', metric, [10, 11, 12]),
      row('candidate', metric, [8, 9, 10]),
    ]);
    unbound.benchmarks[0]!.measurement.entryName = 'other-entry';
    expect(() => normalizeTachometerAbBaMeasurements({
      scenarioId,
      metrics: [metric],
      jitAot: unbound,
      aotJit: validBa,
    })).toThrow(/unbound measurement/u);
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
      differences: [] as ({
        absolute: { low: number; high: number };
        percentChange: { low: number; high: number };
      } | null)[],
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
