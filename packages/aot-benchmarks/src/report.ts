import type { ArtifactByteAggregate } from './artifact-metrics.js';
import type {
  ApplicationResult,
  ConfidenceInterval,
  MeasurementResult,
  MeasurementUnit,
  PerformanceResult,
  PerformanceRun,
  VariantMeasurement,
} from './contracts.js';

interface ByteEncoding {
  readonly label: string;
  readonly read: (aggregate: ArtifactByteAggregate) => number;
}

const byteEncodings: readonly ByteEncoding[] = [
  { label: 'raw', read: aggregate => aggregate.rawBytes },
  { label: 'gzip-9', read: aggregate => aggregate.gzip9Bytes },
  { label: 'brotli-11', read: aggregate => aggregate.brotli11Bytes },
];

/** Render one validated run/result pair without adding scores or policy thresholds. */
export function renderPerformanceReportMarkdown(
  run: PerformanceRun,
  result: PerformanceResult,
): string {
  const lines = [
    '# Performance report',
    '',
    `- Run: \`${escapeInline(run.runId)}\``,
    `- Execution: \`${run.executionProfile}\``,
    `- Grounding: \`${escapeInline(run.grounding.epochId)}\` (\`${run.grounding.groundingStatus}\`)`,
    `- Comparison: \`${escapeInline(run.comparison.controlVariantId)}\` → \`${escapeInline(run.comparison.candidateVariantId)}\` (candidate minus control)`,
    `- Completed: \`${result.completedAt}\``,
    '',
    '## Application JavaScript',
    '',
    '| Application | Scope | Encoding | JIT (B) | AOT (B) | Δ (B) | Δ (%) |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const application of result.applications) {
    lines.push(...applicationByteRows(application));
  }

  lines.push(
    '',
    '## Build time',
    '',
    '| Application | JIT (ms) | AOT (ms) | Δ (ms) | Δ (%) |',
    '| --- | ---: | ---: | ---: | ---: |',
  );
  for (const application of result.applications) {
    const jit = application.lanes[0].build.durationMs;
    const aot = application.lanes[1].build.durationMs;
    lines.push(
      `| ${escapeCell(application.applicationId)} | ${fixed(jit, 3)} | ${fixed(aot, 3)} | ${signed(aot - jit, 3)} | ${signedPercent(percentDelta(jit, aot))} |`,
    );
  }

  lines.push('', '## Runtime measurements', '');
  if (result.scenarios.length === 0) {
    lines.push('_No runtime scenarios were measured._');
  } else {
    lines.push(
      '| Scenario | Metric | Unit | Control mean [95% CI] | Candidate mean [95% CI] | Candidate − control 95% CI | Δ 95% CI | Verdict |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
    );
    for (const scenario of result.scenarios) {
      for (const measurement of scenario.measurements) {
        lines.push(measurementRow(measurement));
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function applicationByteRows(application: ApplicationResult): string[] {
  const jit = application.lanes[0].build.artifacts;
  const aot = application.lanes[1].build.artifacts;
  const rows: string[] = [];
  for (const scope of [
    { label: 'initial', jit: jit.initialEagerJavaScript, aot: aot.initialEagerJavaScript },
    { label: 'total', jit: jit.totalJavaScript, aot: aot.totalJavaScript },
  ] as const) {
    for (const encoding of byteEncodings) {
      const jitBytes = encoding.read(scope.jit);
      const aotBytes = encoding.read(scope.aot);
      rows.push(
        `| ${escapeCell(application.applicationId)} | ${scope.label} | ${encoding.label} | ${integer(jitBytes)} | ${integer(aotBytes)} | ${signedInteger(aotBytes - jitBytes)} | ${signedPercent(percentDelta(jitBytes, aotBytes))} |`,
      );
    }
  }
  return rows;
}

function measurementRow(measurement: MeasurementResult): string {
  return [
    `| ${escapeCell(measurement.scenarioId)}`,
    escapeCell(measurement.metricId),
    measurement.unit,
    formatVariantMeasurement(measurement.control, measurement.unit),
    formatVariantMeasurement(measurement.candidate, measurement.unit),
    formatInterval(measurement.absoluteDifferenceConfidenceInterval95, measurement.unit),
    formatPercentInterval(measurement.percentDifferenceConfidenceInterval95),
    `${measurement.verdict} |`,
  ].join(' | ');
}

function formatVariantMeasurement(
  measurement: VariantMeasurement | null,
  unit: MeasurementUnit,
): string {
  if (measurement == null) return '—';
  return `${scalar(measurement.mean, unit)} ${formatInterval(measurement.meanConfidenceInterval95, unit)} (n=${measurement.samples})`;
}

function formatInterval(value: ConfidenceInterval | null, unit: MeasurementUnit): string {
  if (value == null) return '—';
  return `[${scalar(value.lower, unit)}, ${scalar(value.upper, unit)}]`;
}

function formatPercentInterval(value: ConfidenceInterval | null): string {
  if (value == null) return '—';
  return `[${signedPercent(value.lower)}, ${signedPercent(value.upper)}]`;
}

function scalar(value: number, unit: MeasurementUnit): string {
  return unit === 'bytes' ? integer(Math.round(value)) : fixed(value, 3);
}

function percentDelta(control: number, candidate: number): number {
  return (candidate - control) / control * 100;
}

function signedPercent(value: number): string {
  return `${signed(value, 2)}%`;
}

function signedInteger(value: number): string {
  if (value > 0) return `+${integer(value)}`;
  return integer(value);
}

function signed(value: number, digits: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized > 0 ? `+${fixed(normalized, digits)}` : fixed(normalized, digits);
}

function fixed(value: number, digits: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized.toFixed(digits);
}

function integer(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  const sign = normalized < 0 ? '-' : '';
  const digits = String(Math.abs(normalized));
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/gu, ',')}`;
}

function escapeCell(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/[\r\n]+/gu, ' ');
}

function escapeInline(value: string): string {
  return value.replaceAll('`', '\\`').replace(/[\r\n]+/gu, ' ');
}
