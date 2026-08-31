import { describe, expect, test } from 'vitest';

import type {
  ApplicationResult,
  PerformanceResult,
  PerformanceRun,
} from '../src/contracts.js';
import { renderPerformanceReportMarkdown } from '../src/report.js';

describe('performance Markdown report', () => {
  test('reports independent application byte scopes, build times, and runtime statistics', () => {
    const markdown = renderPerformanceReportMarkdown(
      run(),
      result([
        application('keyed-table', {
          jitInitial: [1_000, 400, 350],
          jitTotal: [1_500, 600, 520],
          aotInitial: [700, 300, 260],
          aotTotal: [900, 380, 330],
          jitBuildMs: 10,
          aotBuildMs: 16,
        }),
      ]),
    );

    expect(markdown).toBe([
      '# Performance report',
      '',
      '- Run: `run-001`',
      '- Execution: `baseline-promotion`',
      '- Grounding: `rc2` (`aligned`)',
      '- Comparison: `official-jit` → `aot-c0` (candidate minus control)',
      '- Completed: `2026-08-31T21:00:00.000Z`',
      '',
      '## Application JavaScript',
      '',
      '| Application | Scope | Encoding | JIT (B) | AOT (B) | Δ (B) | Δ (%) |',
      '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
      '| keyed-table | initial | raw | 1,000 | 700 | -300 | -30.00% |',
      '| keyed-table | initial | gzip-9 | 400 | 300 | -100 | -25.00% |',
      '| keyed-table | initial | brotli-11 | 350 | 260 | -90 | -25.71% |',
      '| keyed-table | total | raw | 1,500 | 900 | -600 | -40.00% |',
      '| keyed-table | total | gzip-9 | 600 | 380 | -220 | -36.67% |',
      '| keyed-table | total | brotli-11 | 520 | 330 | -190 | -36.54% |',
      '',
      '## Build time',
      '',
      '| Application | JIT (ms) | AOT (ms) | Δ (ms) | Δ (%) |',
      '| --- | ---: | ---: | ---: | ---: |',
      '| keyed-table | 10.000 | 16.000 | +6.000 | +60.00% |',
      '',
      '## Runtime measurements',
      '',
      '| Scenario | Metric | Unit | Control mean [95% CI] | Candidate mean [95% CI] | Candidate − control 95% CI | Δ 95% CI | Verdict |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
      '| keyed-update | settled-duration | milliseconds | 10.000 [9.000, 11.000] (n=20) | 8.000 [7.000, 9.000] (n=20) | [-3.000, -1.000] | [-30.00%, -10.00%] | improved |',
      '| keyed-update | optional-heap | bytes | — | — | — | — | unmeasured |',
      '',
    ].join('\n'));
  });

  test('preserves application order, escapes table identities, and states when runtime is absent', () => {
    const value = result([
      application('first|app', {
        jitInitial: [10, 9, 8], jitTotal: [10, 9, 8],
        aotInitial: [10, 9, 8], aotTotal: [10, 9, 8],
        jitBuildMs: 1, aotBuildMs: 1,
      }),
      application('second', {
        jitInitial: [20, 18, 16], jitTotal: [30, 28, 26],
        aotInitial: [21, 19, 17], aotTotal: [33, 31, 29],
        jitBuildMs: 2, aotBuildMs: 3,
      }),
    ], []);
    const markdown = renderPerformanceReportMarkdown(run(), value);

    expect(markdown.indexOf('first\\|app')).toBeLessThan(markdown.indexOf('second'));
    expect(markdown).toContain('| first\\|app | initial | raw | 10 | 10 | 0 | 0.00% |');
    expect(markdown).toContain('| second | total | raw | 30 | 33 | +3 | +10.00% |');
    expect(markdown).toContain('_No runtime scenarios were measured._');
    expect(markdown).not.toMatch(/score|threshold|budget/iu);
  });
});

interface ApplicationNumbers {
  readonly jitInitial: readonly [number, number, number];
  readonly jitTotal: readonly [number, number, number];
  readonly aotInitial: readonly [number, number, number];
  readonly aotTotal: readonly [number, number, number];
  readonly jitBuildMs: number;
  readonly aotBuildMs: number;
}

function run(): PerformanceRun {
  return {
    runId: 'run-001',
    executionProfile: 'baseline-promotion',
    grounding: { epochId: 'rc2', groundingStatus: 'aligned' },
    comparison: { controlVariantId: 'official-jit', candidateVariantId: 'aot-c0' },
  } as PerformanceRun;
}

function result(
  applications: readonly ApplicationResult[],
  scenarios: PerformanceResult['scenarios'] = [{
    scenarioId: 'keyed-update',
    oraclePassed: true,
    measurements: [
      {
        scenarioId: 'keyed-update',
        metricId: 'settled-duration',
        unit: 'milliseconds',
        control: { samples: 20, mean: 10, meanConfidenceInterval95: { lower: 9, upper: 11 } },
        candidate: { samples: 20, mean: 8, meanConfidenceInterval95: { lower: 7, upper: 9 } },
        absoluteDifferenceConfidenceInterval95: { lower: -3, upper: -1 },
        percentDifferenceConfidenceInterval95: { lower: -30, upper: -10 },
        verdict: 'improved',
      },
      {
        scenarioId: 'keyed-update',
        metricId: 'optional-heap',
        unit: 'bytes',
        control: null,
        candidate: null,
        absoluteDifferenceConfidenceInterval95: null,
        percentDifferenceConfidenceInterval95: null,
        verdict: 'unmeasured',
      },
    ],
  }],
): PerformanceResult {
  return {
    completedAt: '2026-08-31T21:00:00.000Z',
    applications,
    scenarios,
  } as PerformanceResult;
}

function application(applicationId: string, values: ApplicationNumbers): ApplicationResult {
  return {
    applicationId,
    lanes: [
      { buildMode: 'jit', semanticEvidence: null, build: build(values.jitBuildMs, values.jitInitial, values.jitTotal) },
      { buildMode: 'aot', semanticEvidence: {} as never, build: build(values.aotBuildMs, values.aotInitial, values.aotTotal) },
    ],
    correctness: {} as never,
  };
}

function build(
  durationMs: number,
  initial: ApplicationNumbers['jitInitial'],
  total: ApplicationNumbers['jitTotal'],
): ApplicationResult['lanes'][number]['build'] {
  return {
    durationMs,
    artifacts: {
      initialEagerJavaScript: aggregate(initial),
      totalJavaScript: aggregate(total),
    },
  } as ApplicationResult['lanes'][number]['build'];
}

function aggregate(values: readonly [number, number, number]) {
  return {
    fileCount: 1,
    rawBytes: values[0],
    gzip9Bytes: values[1],
    brotli11Bytes: values[2],
  };
}
