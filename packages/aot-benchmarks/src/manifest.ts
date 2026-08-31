import { createHash } from 'node:crypto';

import {
  PERFORMANCE_CONTRACT_VERSION,
  assertSha256,
  type InputAuthority,
  type MeasurementUnit,
  type Sha256,
} from './contracts.js';

export const PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_PORTFOLIO_VERSION = '0.1' as const;

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type ScenarioPreset = 'baseline-promotion' | 'targeted';
export type ScenarioMetricKind =
  | 'activation-render'
  | 'settled-duration'
  | 'immediate-used-js-heap'
  | 'forced-gc-live-js-heap'
  | 'forced-gc-post-teardown-js-heap'
  | 'artifact-bytes';

export interface AuthoredSourceIdentity {
  readonly path: string;
  readonly sha256: Sha256;
}

export interface EntryNomination {
  readonly modulePath: string;
  readonly exportName: string | null;
  readonly arguments: readonly JsonValue[];
  readonly authority: InputAuthority;
}

export interface ScenarioMetricContract {
  readonly metricId: string;
  readonly kind: ScenarioMetricKind;
  readonly unit: MeasurementUnit;
  readonly timedBoundary: string;
  readonly primary: boolean;
}

export interface ScenarioOracleContract {
  readonly oracleId: string;
  readonly description: string;
}

export interface ScenarioQuiescenceContract {
  readonly kind: 'synchronous' | 'tasks-settled' | 'router-settled' | 'major-gc' | 'raf-layout' | 'custom';
  readonly description: string;
}

export interface ScenarioManifestEntry {
  readonly scenarioId: string;
  readonly workloadId: string;
  readonly role: 'runtime' | 'size-closure';
  readonly presets: readonly ScenarioPreset[];
  readonly authoredSources: readonly AuthoredSourceIdentity[];
  readonly harnessFiles: readonly AuthoredSourceIdentity[];
  readonly harnessSha256: Sha256;
  readonly entry: EntryNomination;
  readonly runtimeInputs: readonly {
    readonly inputId: string;
    readonly source: 'authored-application' | 'deterministic-harness';
    readonly descriptor: JsonValue;
  }[];
  readonly scales: readonly { readonly name: string; readonly value: string | number | boolean }[];
  readonly metrics: readonly ScenarioMetricContract[];
  readonly oracle: ScenarioOracleContract;
  readonly quiescence: ScenarioQuiescenceContract;
  readonly artifact: {
    readonly chunking: 'single-minified-esm' | 'natural-production';
    readonly initialEagerFiles: readonly string[];
  };
}

export function computeManifestFileSetSha256(files: readonly AuthoredSourceIdentity[]): Sha256 {
  const canonical = [...files]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(file => ({ path: file.path, sha256: file.sha256 }));
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex') as Sha256;
}

export interface PerformanceScenarioManifest {
  readonly schemaVersion: typeof PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION;
  readonly contractVersion: typeof PERFORMANCE_CONTRACT_VERSION;
  readonly portfolioVersion: typeof PERFORMANCE_PORTFOLIO_VERSION;
  readonly manifestId: string;
  readonly authoredAt: string;
  readonly scenarios: readonly ScenarioManifestEntry[];
}

export function assertPerformanceScenarioManifest(value: unknown): asserts value is PerformanceScenarioManifest {
  const manifest = requireRecord(value, 'scenario manifest');
  if (manifest.schemaVersion !== PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION
    || manifest.contractVersion !== PERFORMANCE_CONTRACT_VERSION
    || manifest.portfolioVersion !== PERFORMANCE_PORTFOLIO_VERSION) {
    throw new Error('Unsupported performance scenario manifest schema or contract version.');
  }
  requireNonEmpty(manifest.manifestId, 'manifest id');
  assertIsoDate(manifest.authoredAt, 'manifest authored time');
  if (!Array.isArray(manifest.scenarios) || manifest.scenarios.length === 0) throw new Error('Scenario manifest contains no scenarios.');
  const scenarioIds = new Set<string>();
  for (const scenario of manifest.scenarios) {
    assertScenarioManifestEntry(scenario);
    if (scenarioIds.has(scenario.scenarioId)) throw new Error(`Scenario manifest repeats "${scenario.scenarioId}".`);
    scenarioIds.add(scenario.scenarioId);
  }
}

export function assertScenarioManifestEntry(value: unknown): asserts value is ScenarioManifestEntry {
  const scenario = requireRecord(value, 'scenario');
  requireIdentifier(scenario.scenarioId, 'scenario id');
  requireIdentifier(scenario.workloadId, 'workload id');
  requireEnum(scenario.role, ['runtime', 'size-closure'], 'scenario role');
  assertPresets(scenario.presets);
  assertAuthoredSources(scenario.authoredSources);
  assertAuthoredSources(scenario.harnessFiles, 'Scenario harness');
  assertSha256(scenario.harnessSha256, 'scenario harness');
  if (computeManifestFileSetSha256(scenario.harnessFiles) !== scenario.harnessSha256) {
    throw new Error(`Scenario "${scenario.scenarioId}" harness digest does not match its files.`);
  }
  assertEntryNomination(scenario.entry);
  assertRuntimeInputs(scenario.runtimeInputs);
  assertScales(scenario.scales);
  if (!Array.isArray(scenario.metrics) || scenario.metrics.length === 0) throw new Error(`Scenario "${scenario.scenarioId}" contains no metrics.`);
  const metricIds = new Set<string>();
  for (const metric of scenario.metrics) {
    assertScenarioMetricContract(metric);
    if (metricIds.has(metric.metricId)) throw new Error(`Scenario "${scenario.scenarioId}" repeats metric "${metric.metricId}".`);
    metricIds.add(metric.metricId);
  }
  const oracle = requireRecord(scenario.oracle, 'scenario oracle');
  requireIdentifier(oracle.oracleId, 'oracle id');
  requireNonEmpty(oracle.description, 'oracle description');
  const quiescence = requireRecord(scenario.quiescence, 'scenario quiescence');
  requireEnum(quiescence.kind, ['synchronous', 'tasks-settled', 'router-settled', 'major-gc', 'raf-layout', 'custom'], 'quiescence kind');
  requireNonEmpty(quiescence.description, 'quiescence description');
  const artifact = requireRecord(scenario.artifact, 'scenario artifact contract');
  requireEnum(artifact.chunking, ['single-minified-esm', 'natural-production'], 'artifact chunking');
  requireStringArray(artifact.initialEagerFiles, 'initial-eager files');
  if (artifact.initialEagerFiles.length === 0) throw new Error('Scenario must nominate at least one initial-eager artifact.');
  for (const file of artifact.initialEagerFiles) assertRelativePath(file, 'initial-eager file');
  if (scenario.role === 'runtime' && !scenario.presets.includes('baseline-promotion')) {
    throw new Error(`Runtime scenario "${scenario.scenarioId}" is absent from baseline promotion.`);
  }
}

function assertEntryNomination(value: unknown): asserts value is EntryNomination {
  const entry = requireRecord(value, 'entry nomination');
  assertRelativePath(entry.modulePath, 'entry module path');
  if (entry.exportName !== null) requireIdentifier(entry.exportName, 'entry export name');
  if (!Array.isArray(entry.arguments) || entry.arguments.some(argument => !isJsonValue(argument))) {
    throw new Error('Entry arguments must be JSON values.');
  }
  requireEnum(entry.authority, ['product-derived', 'user-declared', 'harness-only-ceiling'], 'entry authority');
}

function assertScenarioMetricContract(value: unknown): asserts value is ScenarioMetricContract {
  const metric = requireRecord(value, 'scenario metric');
  requireIdentifier(metric.metricId, 'metric id');
  requireEnum(metric.kind, [
    'activation-render',
    'settled-duration',
    'immediate-used-js-heap',
    'forced-gc-live-js-heap',
    'forced-gc-post-teardown-js-heap',
    'artifact-bytes',
  ], 'metric kind');
  requireEnum(metric.unit, ['milliseconds', 'bytes'], 'metric unit');
  requireNonEmpty(metric.timedBoundary, 'metric timed boundary');
  if (typeof metric.primary !== 'boolean') throw new Error('Metric primary posture is missing.');
  if ((metric.kind.endsWith('heap') || metric.kind === 'artifact-bytes') && metric.unit !== 'bytes') {
    throw new Error(`Metric "${metric.metricId}" must use bytes.`);
  }
  if ((metric.kind === 'activation-render' || metric.kind === 'settled-duration') && metric.unit !== 'milliseconds') {
    throw new Error(`Metric "${metric.metricId}" must use milliseconds.`);
  }
}

function assertAuthoredSources(value: unknown, label = 'Scenario authored sources'): asserts value is AuthoredSourceIdentity[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must identify at least one file.`);
  const paths = new Set<string>();
  for (const source of value) {
    const record = requireRecord(source, 'authored source');
    assertRelativePath(record.path, 'authored source path');
    assertSha256(record.sha256, `authored source ${record.path}`);
    if (paths.has(record.path)) throw new Error(`Authored source "${record.path}" is repeated.`);
    paths.add(record.path);
  }
}

function assertRuntimeInputs(value: unknown): asserts value is ScenarioManifestEntry['runtimeInputs'] {
  if (!Array.isArray(value)) throw new Error('Scenario runtime inputs must be an array.');
  const ids = new Set<string>();
  for (const item of value) {
    const input = requireRecord(item, 'runtime input');
    requireIdentifier(input.inputId, 'runtime input id');
    requireEnum(input.source, ['authored-application', 'deterministic-harness'], 'runtime input source');
    if (!isJsonValue(input.descriptor)) throw new Error(`Runtime input "${input.inputId}" descriptor is not JSON.`);
    if (ids.has(input.inputId)) throw new Error(`Runtime input "${input.inputId}" is repeated.`);
    ids.add(input.inputId);
  }
}

function assertPresets(value: unknown): asserts value is ScenarioPreset[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Scenario must belong to an execution preset.');
  for (const preset of value) requireEnum(preset, ['baseline-promotion', 'targeted'], 'scenario preset');
  if (new Set(value).size !== value.length) throw new Error('Scenario execution presets must be unique.');
}

function assertScales(value: unknown): asserts value is ScenarioManifestEntry['scales'] {
  if (!Array.isArray(value)) throw new Error('Scenario scales must be an array.');
  const names = new Set<string>();
  for (const scale of value) {
    const record = requireRecord(scale, 'scenario scale');
    requireIdentifier(record.name, 'scenario scale name');
    if (typeof record.value !== 'string' && typeof record.value !== 'number' && typeof record.value !== 'boolean') {
      throw new Error(`Scenario scale "${record.name}" has an unsupported value.`);
    }
    if (typeof record.value === 'number' && !Number.isFinite(record.value)) throw new Error(`Scenario scale "${record.name}" is not finite.`);
    if (names.has(record.name)) throw new Error(`Scenario scale "${record.name}" is repeated.`);
    names.add(record.name);
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

function assertRelativePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/u.test(value)) {
    throw new Error(`${label} must be a normalized relative path.`);
  }
  if (value.split('/').some(part => part === '' || part === '.' || part === '..')) throw new Error(`${label} is not canonical.`);
}

function assertIsoDate(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || new Date(value).toISOString() !== value) throw new Error(`${label} must be an ISO timestamp.`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be a record.`);
  return value as Record<string, unknown>;
}

function requireIdentifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)) throw new Error(`${label} is not a stable identifier.`);
}

function requireNonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
}

function requireStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} must be a string array.`);
}

function requireEnum<const T extends string>(value: unknown, values: readonly T[], label: string): asserts value is T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new Error(`${label} is unsupported.`);
}
