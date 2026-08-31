import {
  benchmarkPortfolioApplications,
  type BenchmarkPortfolioApplication,
} from './applications.js';
import {
  KEYED_TABLE_CORE_OPERATIONS,
  KEYED_TABLE_PUBLIC_OPERATIONS,
  keyedTableScenarioPages,
  type KeyedTableScenarioPageDescriptor,
} from './keyed-table-scenarios.js';
import {
  PERFORMANCE_CONTRACT_VERSION,
  type Sha256,
} from './contracts.js';
import {
  PERFORMANCE_PORTFOLIO_VERSION,
  PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION,
  assertPerformanceScenarioManifest,
  type AuthoredSourceIdentity,
  type PerformanceScenarioManifest,
} from './manifest.js';
import {
  repeatScenarioDescriptors,
  type RepeatScenarioDescriptor,
} from './repeat-scenarios.js';
import {
  storefrontScenarioPages,
  type StorefrontScenarioPageDescriptor,
} from './storefront-scenarios.js';

export const LOCKED_PERFORMANCE_PORTFOLIO_ID = 'aot-performance-portfolio-v0.1' as const;
export const LOCKED_PERFORMANCE_PORTFOLIO_AUTHORED_AT = '2026-08-31T00:00:00.000Z' as const;

export type PortfolioRuntimeScenario =
  | { readonly family: 'repeat'; readonly descriptor: RepeatScenarioDescriptor }
  | { readonly family: 'keyed-table'; readonly descriptor: KeyedTableScenarioPageDescriptor }
  | { readonly family: 'storefront'; readonly descriptor: StorefrontScenarioPageDescriptor };

export interface LockedPerformancePortfolio {
  readonly manifest: PerformanceScenarioManifest;
  readonly runtimeScenarios: readonly PortfolioRuntimeScenario[];
  readonly applications: readonly BenchmarkPortfolioApplication[];
  readonly keyedTablePresets: {
    readonly opticsCore: readonly string[];
    readonly opticsPublicFull: readonly string[];
  };
}

const repeatScenarios: readonly PortfolioRuntimeScenario[] = repeatScenarioDescriptors.map(
  descriptor => ({ family: 'repeat', descriptor }),
);
const keyedTableScenarios: readonly PortfolioRuntimeScenario[] = keyedTableScenarioPages.map(
  descriptor => ({ family: 'keyed-table', descriptor }),
);
const storefrontScenarios: readonly PortfolioRuntimeScenario[] = storefrontScenarioPages.map(
  descriptor => ({ family: 'storefront', descriptor }),
);

export const lockedRuntimeScenarios: readonly PortfolioRuntimeScenario[] = [
  ...repeatScenarios,
  ...keyedTableScenarios,
  ...storefrontScenarios,
];

export const LOCKED_BASELINE_PROMOTION_SCENARIO_IDS: readonly string[] = lockedRuntimeScenarios
  .filter(scenario => scenario.descriptor.manifest.presets.includes('baseline-promotion'))
  .map(scenario => scenario.descriptor.manifest.scenarioId);

export const LOCKED_TARGETED_SCENARIO_IDS: readonly string[] = lockedRuntimeScenarios
  .filter(scenario => scenario.descriptor.manifest.presets.includes('targeted'))
  .map(scenario => scenario.descriptor.manifest.scenarioId);

export const lockedPerformanceScenarioManifest: PerformanceScenarioManifest = {
  schemaVersion: PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION,
  contractVersion: PERFORMANCE_CONTRACT_VERSION,
  portfolioVersion: PERFORMANCE_PORTFOLIO_VERSION,
  manifestId: LOCKED_PERFORMANCE_PORTFOLIO_ID,
  authoredAt: LOCKED_PERFORMANCE_PORTFOLIO_AUTHORED_AT,
  scenarios: lockedRuntimeScenarios.map(scenario => scenario.descriptor.manifest),
};

export function createLockedPerformancePortfolio(repositoryRoot: string): LockedPerformancePortfolio {
  const portfolio: LockedPerformancePortfolio = {
    manifest: lockedPerformanceScenarioManifest,
    runtimeScenarios: lockedRuntimeScenarios,
    applications: benchmarkPortfolioApplications(repositoryRoot),
    keyedTablePresets: {
      opticsCore: KEYED_TABLE_CORE_OPERATIONS.map(operation => operation.id),
      opticsPublicFull: KEYED_TABLE_PUBLIC_OPERATIONS.map(operation => operation.id),
    },
  };
  assertLockedPerformancePortfolio(portfolio);
  return portfolio;
}

export function assertLockedPerformancePortfolio(value: unknown): asserts value is LockedPerformancePortfolio {
  const portfolio = requireRecord(value, 'locked performance portfolio');
  assertPerformanceScenarioManifest(portfolio.manifest);
  if (portfolio.manifest.manifestId !== LOCKED_PERFORMANCE_PORTFOLIO_ID
    || portfolio.manifest.authoredAt !== LOCKED_PERFORMANCE_PORTFOLIO_AUTHORED_AT) {
    throw new Error('Locked performance portfolio identity has drifted.');
  }
  if (!Array.isArray(portfolio.runtimeScenarios)) throw new Error('Locked performance portfolio has no runtime descriptors.');
  const runtimeScenarioIds = portfolio.runtimeScenarios.map((value, index) => {
    const row = requireRecord(value, `runtimeScenarios[${index}]`);
    requireEnum(row.family, ['repeat', 'keyed-table', 'storefront'], `runtimeScenarios[${index}].family`);
    const descriptor = requireRecord(row.descriptor, `runtimeScenarios[${index}].descriptor`);
    const manifest = requireRecord(descriptor.manifest, `runtimeScenarios[${index}].manifest`);
    if (typeof manifest.scenarioId !== 'string') throw new Error(`Runtime descriptor ${index} has no scenario id.`);
    return manifest.scenarioId;
  });
  const manifestScenarioIds = portfolio.manifest.scenarios.map(scenario => scenario.scenarioId);
  assertExactSequence(runtimeScenarioIds, manifestScenarioIds, 'runtime descriptors and manifest scenarios');
  assertExactSequence(manifestScenarioIds, EXPECTED_BASELINE_SCENARIO_IDS, 'locked baseline scenarios');
  assertSourceIdentity(portfolio.manifest);

  const presets = requireRecord(portfolio.keyedTablePresets, 'keyed-table presets');
  assertStringArray(presets.opticsCore, 'optics-core preset');
  assertStringArray(presets.opticsPublicFull, 'optics-public-full preset');
  assertExactSequence(presets.opticsCore, EXPECTED_KEYED_CORE_IDS, 'optics-core preset');
  assertExactSequence(presets.opticsPublicFull, EXPECTED_KEYED_FULL_IDS, 'optics-public-full preset');

  if (!Array.isArray(portfolio.applications)) throw new Error('Locked performance portfolio has no build applications.');
  const applicationIds = portfolio.applications.map((value, index) => {
    const application = requireRecord(value, `applications[${index}]`);
    if (typeof application.id !== 'string') throw new Error(`Build application ${index} has no id.`);
    requireEnum(application.role, ['runtime', 'size-closure'], `application ${application.id} role`);
    if (typeof application.headlineSize !== 'boolean') throw new Error(`Application ${application.id} has no headline-size posture.`);
    return application.id;
  });
  assertExactSequence(applicationIds, EXPECTED_APPLICATION_IDS, 'locked build applications');
}

const EXPECTED_REPEAT_IDS = [
  'simple-activation-render-10k',
  'simple-empty-to-10k-rerender',
  'simple-member-update-1k',
  'realistic-activation-render-1k',
  'realistic-keyed-refresh-1k',
  'realistic-mixed-reconciliation-1k',
  'realistic-heap-lifecycle-500',
] as const;

const EXPECTED_KEYED_CORE_IDS = [
  'keyed-create-1k',
  'keyed-update-tenth-10k',
  'keyed-select-1k',
  'keyed-swap-1k',
  'keyed-remove-1k',
] as const;

const EXPECTED_KEYED_FULL_IDS = [
  'keyed-create-1k',
  'keyed-replace-1k',
  'keyed-update-tenth-10k',
  'keyed-select-1k',
  'keyed-swap-1k',
  'keyed-remove-1k',
  'keyed-create-10k',
  'keyed-append-1k-to-10k',
  'keyed-clear-10k',
] as const;

const EXPECTED_STOREFRONT_IDS = [
  'storefront-activation-render-500',
  'storefront-badge-filter-500',
  'storefront-list-to-detail-500',
  'storefront-heap-lifecycle-500',
] as const;

const EXPECTED_BASELINE_SCENARIO_IDS = [
  ...EXPECTED_REPEAT_IDS,
  ...EXPECTED_KEYED_FULL_IDS,
  ...EXPECTED_STOREFRONT_IDS,
] as const;

const EXPECTED_APPLICATION_IDS = [
  'app-repeat-view',
  'app-repeat-realistic',
  'keyed-table-optics',
  'routed-storefront-benchmark',
  'hello-world',
  'state-backed-form',
  'projects-and-milestones',
  'routed-storefront',
] as const;

function assertSourceIdentity(manifest: PerformanceScenarioManifest): void {
  const digestByPath = new Map<string, Sha256>();
  const authoredSetByWorkload = new Map<string, string>();
  for (const scenario of manifest.scenarios) {
    const authoredSet = sourceSetIdentity(scenario.authoredSources);
    const priorAuthoredSet = authoredSetByWorkload.get(scenario.workloadId);
    if (priorAuthoredSet !== undefined && priorAuthoredSet !== authoredSet) {
      throw new Error(`Workload "${scenario.workloadId}" has divergent authored-source identity.`);
    }
    authoredSetByWorkload.set(scenario.workloadId, authoredSet);
    for (const source of [...scenario.authoredSources, ...scenario.harnessFiles]) {
      const priorDigest = digestByPath.get(source.path);
      if (priorDigest !== undefined && priorDigest !== source.sha256) {
        throw new Error(`Source "${source.path}" has conflicting digests in the locked portfolio.`);
      }
      digestByPath.set(source.path, source.sha256);
    }
  }
}

function sourceSetIdentity(sources: readonly AuthoredSourceIdentity[]): string {
  return JSON.stringify([...sources]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(source => [source.path, source.sha256]));
}

function assertExactSequence(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${label} do not match the locked v0.1 sequence.`);
  }
  if (new Set(actual).size !== actual.length) throw new Error(`${label} contain duplicate ids.`);
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} must be a string array.`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be a record.`);
  return value as Record<string, unknown>;
}

function requireEnum<const T extends string>(value: unknown, values: readonly T[], label: string): asserts value is T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new Error(`${label} is unsupported.`);
}
