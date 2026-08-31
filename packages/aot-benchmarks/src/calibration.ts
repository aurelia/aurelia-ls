import {
  assertSha256,
  type HashedFileIdentity,
} from './contracts.js';
import {
  normalizeTachometerAbBaMeasurements,
  type TachometerMetricBinding,
} from './tachometer-result.js';

export const PERFORMANCE_CALIBRATION_MANIFEST_SCHEMA_VERSION = 1 as const;

export interface ScenarioCalibrationIdentity {
  readonly scenarioId: string;
  readonly fixedSamplesPerVariant: number;
  readonly rawResult: HashedFileIdentity;
}

export interface PerformanceCalibrationManifest {
  readonly schemaVersion: typeof PERFORMANCE_CALIBRATION_MANIFEST_SCHEMA_VERSION;
  readonly calibrationKind: 'identical-lane';
  readonly scenarios: readonly ScenarioCalibrationIdentity[];
}

/**
 * Validate one JIT/JIT Tachometer file through the production AB/BA parser.
 * Reusing the same file for both order positions makes both normalized lanes
 * contain the same base+candidate multiset while preserving every row check.
 */
export function validateIdenticalLaneSampleCount(input: {
  readonly scenarioId: string;
  readonly output: unknown;
  readonly metrics: readonly TachometerMetricBinding[];
}): number {
  requireIdentifier(input.scenarioId, 'calibration scenario id');
  const normalized = normalizeTachometerAbBaMeasurements({
    scenarioId: input.scenarioId,
    jitAot: input.output,
    aotJit: input.output,
    metrics: input.metrics,
  });
  const pooledCounts = normalized.flatMap(measurement => [
    measurement.control!.samples,
    measurement.candidate!.samples,
  ]);
  if (new Set(pooledCounts).size !== 1) {
    throw new Error(
      `Identical-lane scenario "${input.scenarioId}" has unequal sample counts across roles or metrics `
      + `(${pooledCounts.join(', ')}).`,
    );
  }
  const pooledCount = pooledCounts[0]!;
  if (pooledCount % 2 !== 0) {
    throw new Error(`Identical-lane scenario "${input.scenarioId}" produced an invalid pooled sample count.`);
  }
  return pooledCount / 2;
}

/** Produce a timestamp-free, scenario-sorted manifest suitable for deterministic JSON persistence. */
export function createPerformanceCalibrationManifest(
  entries: readonly ScenarioCalibrationIdentity[],
): PerformanceCalibrationManifest {
  if (entries.length === 0) throw new Error('Calibration manifest requires at least one scenario.');
  const scenarioIds = new Set<string>();
  const rawPaths = new Set<string>();
  const scenarios = entries.map((entry) => {
    requireIdentifier(entry.scenarioId, 'calibration scenario id');
    if (scenarioIds.has(entry.scenarioId)) {
      throw new Error(`Calibration manifest repeats scenario "${entry.scenarioId}".`);
    }
    scenarioIds.add(entry.scenarioId);
    if (!Number.isSafeInteger(entry.fixedSamplesPerVariant) || entry.fixedSamplesPerVariant <= 0) {
      throw new Error(`Calibration scenario "${entry.scenarioId}" has an invalid fixed sample count.`);
    }
    assertHashedFile(entry.rawResult, `${entry.scenarioId} raw result`);
    if (rawPaths.has(entry.rawResult.path)) {
      throw new Error(`Calibration manifest repeats raw result "${entry.rawResult.path}".`);
    }
    rawPaths.add(entry.rawResult.path);
    return {
      scenarioId: entry.scenarioId,
      fixedSamplesPerVariant: entry.fixedSamplesPerVariant,
      rawResult: { ...entry.rawResult },
    };
  }).sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));
  return {
    schemaVersion: PERFORMANCE_CALIBRATION_MANIFEST_SCHEMA_VERSION,
    calibrationKind: 'identical-lane',
    scenarios,
  };
}

function assertHashedFile(value: HashedFileIdentity, label: string): void {
  if (
    value.path.length === 0
    || value.path.includes('\\')
    || value.path.startsWith('/')
    || /^[A-Za-z]:/u.test(value.path)
    || value.path.split('/').some(part => part === '' || part === '.' || part === '..')
  ) {
    throw new Error(`${label} path must be a normalized relative path.`);
  }
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 0) {
    throw new Error(`${label} byte count must be a non-negative integer.`);
  }
  assertSha256(value.sha256, label);
}

function requireIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)) throw new Error(`${label} is not a stable identifier.`);
}
