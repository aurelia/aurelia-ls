import { assertArtifactSetMetrics, type ArtifactSetMetrics } from './artifact-metrics.js';

export const PERFORMANCE_CONTRACT_VERSION = '0.1' as const;
export const PERFORMANCE_RUN_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_RESULT_SCHEMA_VERSION = 1 as const;

export type Sha256 = string & { readonly __sha256: unique symbol };
export type GitObjectId = string & { readonly __gitObjectId: unique symbol };
export type GroundingStatus = 'aligned' | 'forward-probe';
export type BuildMode = 'jit' | 'aot';
export type InputAuthority = 'product-derived' | 'user-declared' | 'harness-only-ceiling';
export type MetricVerdict = 'improved' | 'regressed' | 'unresolved' | 'unmeasured';
export type MeasurementUnit = 'milliseconds' | 'bytes';

export interface HashedFileIdentity {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: Sha256;
}

export interface GroundingEpoch {
  readonly epochId: string;
  readonly frameworkUnderTestRevision: GitObjectId;
  readonly semanticRuntimeFrameworkBasis: GitObjectId;
  readonly atlasFrameworkBasis: GitObjectId;
  readonly groundingStatus: GroundingStatus;
}

export interface RepositorySourceIdentity {
  readonly repositoryId: string;
  readonly revision: GitObjectId;
  readonly tree: GitObjectId;
  readonly dirty: false;
  readonly lockSha256: Sha256;
  readonly sourceSha256: Sha256;
  readonly builtOutputSha256: Sha256;
}

export interface FrameworkPackageIdentity {
  readonly packageName: string;
  readonly integrity: string;
  readonly runtimeEntries: readonly HashedFileIdentity[];
}

export interface FrameworkGraphIdentity {
  readonly sourceRevision: GitObjectId;
  readonly sourceTree: GitObjectId;
  readonly dirty: false;
  readonly packageGraphSha256: Sha256;
  readonly packages: readonly FrameworkPackageIdentity[];
}

export interface SourceWorldIdentity {
  readonly framework: FrameworkGraphIdentity;
  readonly semanticRuntime: RepositorySourceIdentity;
  readonly aot: RepositorySourceIdentity;
  readonly aotVite: RepositorySourceIdentity;
  readonly harness: RepositorySourceIdentity;
}

export interface ToolVersionIdentity {
  readonly name: string;
  readonly version: string;
  readonly entry?: HashedFileIdentity;
}

export interface ToolchainIdentity {
  readonly node: string;
  readonly vite: ToolVersionIdentity;
  readonly rolldown: ToolVersionIdentity;
  readonly oxc: ToolVersionIdentity;
  readonly officialConventionsProvider: ToolVersionIdentity;
  readonly buildMode: 'production';
  readonly sourceMap: false;
  readonly target: string;
  readonly defineSha256: Sha256;
  readonly optionsSha256: Sha256;
}

export interface AotProfileCoordinates {
  readonly authorityScope: 'app-root' | 'final-link';
  readonly fallback: 'ordinary' | 'local' | 'none';
  readonly runtimeConfiguration: 'preserve' | 'strict-groups' | 'exact-leaves';
  readonly runtimeRealization: 'generic' | 'linked' | 'generated-binding' | 'generated-rendering' | 'closed-flow';
  readonly objective: 'control' | 'size' | 'startup' | 'update' | 'memory' | 'balanced' | 'debug';
  readonly debugPosture: 'performance-no-map' | 'mapped' | 'map-incomplete';
  readonly frameworkRewrite: 'none' | 'additive-seam' | 'exact-fingerprinted';
  readonly inputAuthority: InputAuthority;
}

export type VariantProfile =
  | { readonly buildMode: 'jit'; readonly profileId: 'official-jit' }
  | { readonly buildMode: 'aot'; readonly profileId: string; readonly coordinates: AotProfileCoordinates };

export interface BuildIdentity {
  readonly durationMs: number;
  readonly entryGraphSha256: Sha256;
  readonly receipt: HashedFileIdentity | null;
  readonly artifacts: ArtifactSetMetrics;
  readonly browserLoadedAssets: readonly HashedFileIdentity[];
}

export interface BuildVariantIdentity {
  readonly variantId: string;
  readonly profile: VariantProfile;
  readonly build: BuildIdentity;
}

export interface BrowserIdentity {
  readonly name: string;
  readonly version: string;
  readonly executableSha256: Sha256;
  readonly flags: readonly string[];
  readonly viewport: { readonly width: number; readonly height: number; readonly deviceScaleFactor: number };
  readonly headless: boolean;
}

export interface ExecutorIdentity {
  readonly executorId: string;
  readonly platform: typeof process.platform;
  readonly architecture: string;
  readonly osRelease: string;
  readonly osBuild: string;
  readonly cpuModel: string;
  readonly logicalCpuCount: number;
  readonly totalMemoryBytes: number;
  readonly nodeVersion: string;
  readonly powerPosture: string;
}

export interface ScenarioLatencySampleCount {
  readonly scenarioId: string;
  readonly samplesPerVariant: number;
}

export type LatencySamplingPolicy =
  | { readonly kind: 'adaptive'; readonly timeoutMinutes: number }
  | { readonly kind: 'fixed'; readonly samplesPerVariant: number }
  | {
      readonly kind: 'fixed-by-scenario';
      readonly calibrationSha256: Sha256;
      readonly scenarios: readonly ScenarioLatencySampleCount[];
    };

export interface SamplingIdentity {
  readonly producer: 'tachometer';
  readonly producerVersion: string;
  readonly confidenceLevel: 0.95;
  readonly differenceDirection: 'candidate-minus-control';
  readonly orderPolicy: 'ab-ba' | 'randomized-blocks';
  readonly latencySamples: LatencySamplingPolicy;
  readonly forcedGcHeapSamplesPerVariant: 20;
  readonly rawResultFiles: readonly HashedFileIdentity[];
}

export interface ComparisonIdentity {
  readonly comparisonKind: 'jit-vs-aot-control' | 'aot-control-vs-candidate';
  readonly controlVariantId: string;
  readonly candidateVariantId: string;
}

export interface DeterminismIdentity {
  readonly firstAotArtifactSetSha256: Sha256;
  readonly secondAotArtifactSetSha256: Sha256;
  readonly firstAotReceiptSha256: Sha256;
  readonly secondAotReceiptSha256: Sha256;
  readonly identical: true;
  readonly identicalLaneCalibration: HashedFileIdentity;
}

export interface ManifestIdentity {
  readonly manifestSchemaVersion: number;
  readonly manifestVersion: string;
  readonly manifestSha256: Sha256;
}

export interface PerformanceRun {
  readonly schemaVersion: typeof PERFORMANCE_RUN_SCHEMA_VERSION;
  readonly contractVersion: typeof PERFORMANCE_CONTRACT_VERSION;
  readonly runId: string;
  readonly createdAt: string;
  readonly executionProfile: 'baseline-promotion' | 'targeted';
  readonly grounding: GroundingEpoch;
  readonly manifest: ManifestIdentity;
  readonly sources: SourceWorldIdentity;
  readonly toolchain: ToolchainIdentity;
  readonly comparison: ComparisonIdentity;
  readonly variants: readonly [BuildVariantIdentity, BuildVariantIdentity];
  readonly executor: ExecutorIdentity;
  readonly browser: BrowserIdentity;
  readonly sampling: SamplingIdentity;
  readonly determinism: DeterminismIdentity | null;
}

export interface ConfidenceInterval {
  readonly lower: number;
  readonly upper: number;
}

export interface VariantMeasurement {
  readonly samples: number;
  readonly mean: number;
  readonly meanConfidenceInterval95: ConfidenceInterval;
}

export interface MeasurementResult {
  readonly scenarioId: string;
  readonly metricId: string;
  readonly unit: MeasurementUnit;
  readonly control: VariantMeasurement | null;
  readonly candidate: VariantMeasurement | null;
  readonly absoluteDifferenceConfidenceInterval95: ConfidenceInterval | null;
  readonly percentDifferenceConfidenceInterval95: ConfidenceInterval | null;
  readonly verdict: MetricVerdict;
}

export interface ScenarioResult {
  readonly scenarioId: string;
  readonly oraclePassed: true;
  readonly measurements: readonly MeasurementResult[];
}

export interface JitApplicationLaneResult {
  readonly buildMode: 'jit';
  readonly build: BuildIdentity;
  readonly semanticEvidence: null;
}

export interface AotApplicationLaneResult {
  readonly buildMode: 'aot';
  readonly build: BuildIdentity;
  /** Persisted semantic-provider evidence whose identity joins the AOT receipt to the claimed closure. */
  readonly semanticEvidence: HashedFileIdentity;
}

export type ApplicationCorrectnessResult =
  | {
      readonly kind: 'runtime-oracle';
      readonly state: 'passed';
      readonly scenarioIds: readonly string[];
      readonly evidence: HashedFileIdentity;
    }
  | {
      readonly kind: 'browser-assurance';
      readonly state: 'passed';
      readonly assuranceScenarioId: string;
      readonly evidence: HashedFileIdentity;
    };

/** One application owns its independent byte denominator, build cost, AOT closure, and correctness proof. */
export interface ApplicationResult {
  readonly applicationId: string;
  readonly lanes: readonly [JitApplicationLaneResult, AotApplicationLaneResult];
  readonly correctness: ApplicationCorrectnessResult;
}

export interface PerformanceResult {
  readonly schemaVersion: typeof PERFORMANCE_RESULT_SCHEMA_VERSION;
  readonly contractVersion: typeof PERFORMANCE_CONTRACT_VERSION;
  readonly runId: string;
  readonly runSha256: Sha256;
  readonly completedAt: string;
  readonly scenarios: readonly ScenarioResult[];
  readonly applications: readonly ApplicationResult[];
  readonly resultInputs: readonly HashedFileIdentity[];
}

export function assertSha256(value: unknown, label: string): asserts value is Sha256 {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
}

export function assertGitObjectId(value: unknown, label: string): asserts value is GitObjectId {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u.test(value)) throw new Error(`${label} must be a full Git object id.`);
}

export function assertGroundingEpoch(value: unknown): asserts value is GroundingEpoch {
  const record = requireRecord(value, 'grounding epoch');
  requireNonEmpty(record.epochId, 'grounding epoch id');
  assertGitObjectId(record.frameworkUnderTestRevision, 'framework-under-test revision');
  assertGitObjectId(record.semanticRuntimeFrameworkBasis, 'semantic-runtime framework basis');
  assertGitObjectId(record.atlasFrameworkBasis, 'Atlas framework basis');
  if (record.groundingStatus !== 'aligned' && record.groundingStatus !== 'forward-probe') {
    throw new Error('Grounding status must be aligned or forward-probe.');
  }
  if (record.groundingStatus === 'aligned'
    && (record.frameworkUnderTestRevision !== record.semanticRuntimeFrameworkBasis
      || record.frameworkUnderTestRevision !== record.atlasFrameworkBasis)) {
    throw new Error('An aligned grounding epoch requires the framework, semantic-runtime, and Atlas revisions to agree.');
  }
}

export function assertVariantProfile(value: unknown): asserts value is VariantProfile {
  const record = requireRecord(value, 'variant profile');
  if (record.buildMode === 'jit') {
    if (record.profileId !== 'official-jit' || record.coordinates !== undefined) {
      throw new Error('The JIT lane must use the official-jit profile without AOT coordinates.');
    }
    return;
  }
  if (record.buildMode !== 'aot') throw new Error('Variant build mode must be jit or aot.');
  requireNonEmpty(record.profileId, 'AOT profile id');
  assertAotProfileCoordinates(record.coordinates);
}

export function assertPerformanceRun(value: unknown): asserts value is PerformanceRun {
  const run = requireRecord(value, 'performance run');
  if (run.schemaVersion !== PERFORMANCE_RUN_SCHEMA_VERSION || run.contractVersion !== PERFORMANCE_CONTRACT_VERSION) {
    throw new Error('Unsupported performance run schema or contract version.');
  }
  requireNonEmpty(run.runId, 'run id');
  assertIsoDate(run.createdAt, 'run creation time');
  if (run.executionProfile !== 'baseline-promotion' && run.executionProfile !== 'targeted') {
    throw new Error('Execution profile must be baseline-promotion or targeted.');
  }
  assertGroundingEpoch(run.grounding);
  assertManifestIdentity(run.manifest);
  assertSourceWorldIdentity(run.sources, run.grounding);
  assertToolchainIdentity(run.toolchain);
  assertComparisonIdentity(run.comparison);
  assertBuildVariants(run.variants);
  const variantIds = run.variants.map(variant => variant.variantId);
  if (new Set(variantIds).size !== 2
    || !variantIds.includes(run.comparison.controlVariantId)
    || !variantIds.includes(run.comparison.candidateVariantId)) {
    throw new Error('Comparison variants must name the two distinct run variants.');
  }
  assertComparisonProfiles(run.comparison, run.variants);
  assertExecutorIdentity(run.executor);
  assertBrowserIdentity(run.browser);
  assertSamplingIdentity(run.sampling);
  if (run.determinism !== null) assertDeterminismIdentity(run.determinism);
  if (run.executionProfile === 'baseline-promotion' && run.determinism === null) {
    throw new Error('Baseline promotion requires deterministic AOT rebuild and identical-lane calibration evidence.');
  }
  if (run.executionProfile === 'baseline-promotion') {
    if (run.sampling.latencySamples.kind !== 'fixed-by-scenario') {
      throw new Error('Baseline promotion requires calibrated fixed latency samples for each scenario.');
    }
    if (run.sampling.latencySamples.calibrationSha256 !== run.determinism!.identicalLaneCalibration.sha256) {
      throw new Error('Per-scenario latency sample counts do not name the run identical-lane calibration.');
    }
  }
}

export function assertPerformanceResult(value: unknown, run?: PerformanceRun): asserts value is PerformanceResult {
  const result = requireRecord(value, 'performance result');
  if (result.schemaVersion !== PERFORMANCE_RESULT_SCHEMA_VERSION || result.contractVersion !== PERFORMANCE_CONTRACT_VERSION) {
    throw new Error('Unsupported performance result schema or contract version.');
  }
  requireNonEmpty(result.runId, 'result run id');
  assertSha256(result.runSha256, 'performance run');
  assertIsoDate(result.completedAt, 'result completion time');
  if (!Array.isArray(result.scenarios)) throw new Error('Performance result scenarios must be an array.');
  const scenarioIds = new Set<string>();
  for (const scenario of result.scenarios) {
    assertScenarioResult(scenario);
    if (scenarioIds.has(scenario.scenarioId)) throw new Error(`Performance result repeats scenario "${scenario.scenarioId}".`);
    scenarioIds.add(scenario.scenarioId);
  }
  if (!Array.isArray(result.applications) || result.applications.length === 0) {
    throw new Error('Performance result contains no application results.');
  }
  const applicationIds = new Set<string>();
  const claimedScenarioIds = new Set<string>();
  const applications: ApplicationResult[] = [];
  const applicationValues = result.applications as unknown[];
  for (const applicationValue of applicationValues) {
    const applicationRecord = requireRecord(applicationValue, 'application result');
    requireNonEmpty(applicationRecord.applicationId, 'application id');
    if (applicationIds.has(applicationRecord.applicationId)) {
      throw new Error(`Performance result repeats application "${applicationRecord.applicationId}".`);
    }
    assertApplicationResult(applicationValue, scenarioIds, claimedScenarioIds);
    const application = applicationValue;
    applicationIds.add(application.applicationId);
    applications.push(application);
  }
  for (const scenarioId of scenarioIds) {
    if (!claimedScenarioIds.has(scenarioId)) {
      throw new Error(`Scenario "${scenarioId}" is not owned by an application result.`);
    }
  }
  assertHashedFiles(result.resultInputs, 'result inputs');
  for (const application of applications) {
    assertResultInputReference(result.resultInputs, application.correctness.evidence, `${application.applicationId} correctness`);
    assertResultInputReference(
      result.resultInputs,
      application.lanes[1].semanticEvidence,
      `${application.applicationId} AOT semantic evidence`,
    );
  }
  if (run !== undefined && result.runId !== run.runId) throw new Error('Performance result does not belong to the supplied run.');
}

function assertAotProfileCoordinates(value: unknown): asserts value is AotProfileCoordinates {
  const record = requireRecord(value, 'AOT profile coordinates');
  requireEnum(record.authorityScope, ['app-root', 'final-link'], 'authority scope');
  requireEnum(record.fallback, ['ordinary', 'local', 'none'], 'fallback');
  requireEnum(record.runtimeConfiguration, ['preserve', 'strict-groups', 'exact-leaves'], 'runtime configuration');
  requireEnum(record.runtimeRealization, ['generic', 'linked', 'generated-binding', 'generated-rendering', 'closed-flow'], 'runtime realization');
  requireEnum(record.objective, ['control', 'size', 'startup', 'update', 'memory', 'balanced', 'debug'], 'objective');
  requireEnum(record.debugPosture, ['performance-no-map', 'mapped', 'map-incomplete'], 'debug posture');
  requireEnum(record.frameworkRewrite, ['none', 'additive-seam', 'exact-fingerprinted'], 'framework rewrite');
  requireEnum(record.inputAuthority, ['product-derived', 'user-declared', 'harness-only-ceiling'], 'input authority');
}

function assertBuildVariants(value: unknown): asserts value is [BuildVariantIdentity, BuildVariantIdentity] {
  if (!Array.isArray(value) || value.length !== 2) throw new Error('A performance run requires exactly two variants.');
  assertBuildVariantIdentity(value[0]);
  assertBuildVariantIdentity(value[1]);
}

function assertManifestIdentity(value: unknown): asserts value is ManifestIdentity {
  const record = requireRecord(value, 'manifest identity');
  requirePositiveInteger(record.manifestSchemaVersion, 'manifest schema version');
  requireNonEmpty(record.manifestVersion, 'manifest version');
  assertSha256(record.manifestSha256, 'manifest');
}

function assertSourceWorldIdentity(value: unknown, grounding: GroundingEpoch): asserts value is SourceWorldIdentity {
  const record = requireRecord(value, 'source world identity');
  assertFrameworkGraphIdentity(record.framework);
  for (const key of ['semanticRuntime', 'aot', 'aotVite', 'harness'] as const) assertRepositorySourceIdentity(record[key], key);
  if (record.framework.sourceRevision !== grounding.frameworkUnderTestRevision) {
    throw new Error('Framework graph revision does not match the grounding epoch.');
  }
}

function assertRepositorySourceIdentity(value: unknown, label: string): asserts value is RepositorySourceIdentity {
  const record = requireRecord(value, label);
  requireNonEmpty(record.repositoryId, `${label} repository id`);
  assertGitObjectId(record.revision, `${label} revision`);
  assertGitObjectId(record.tree, `${label} tree`);
  if (record.dirty !== false) throw new Error(`${label} must be clean.`);
  assertSha256(record.lockSha256, `${label} lock`);
  assertSha256(record.sourceSha256, `${label} source`);
  assertSha256(record.builtOutputSha256, `${label} built output`);
}

function assertFrameworkGraphIdentity(value: unknown): asserts value is FrameworkGraphIdentity {
  const record = requireRecord(value, 'framework graph identity');
  assertGitObjectId(record.sourceRevision, 'framework source revision');
  assertGitObjectId(record.sourceTree, 'framework source tree');
  if (record.dirty !== false) throw new Error('Framework source must be clean.');
  assertSha256(record.packageGraphSha256, 'framework package graph');
  if (!Array.isArray(record.packages) || record.packages.length === 0) throw new Error('Framework graph contains no packages.');
  const names = new Set<string>();
  for (const item of record.packages) {
    const packageRecord = requireRecord(item, 'framework package');
    requireNonEmpty(packageRecord.packageName, 'framework package name');
    requireNonEmpty(packageRecord.integrity, 'framework package integrity');
    assertHashedFiles(packageRecord.runtimeEntries, `${packageRecord.packageName} runtime entries`);
    if (names.has(packageRecord.packageName)) throw new Error(`Framework graph repeats package "${packageRecord.packageName}".`);
    names.add(packageRecord.packageName);
  }
}

function assertToolchainIdentity(value: unknown): asserts value is ToolchainIdentity {
  const record = requireRecord(value, 'toolchain identity');
  requireNonEmpty(record.node, 'Node version');
  for (const key of ['vite', 'rolldown', 'oxc', 'officialConventionsProvider'] as const) assertToolVersion(record[key], key);
  if (record.buildMode !== 'production' || record.sourceMap !== false) throw new Error('Baseline toolchain must be a production build without source maps.');
  requireNonEmpty(record.target, 'build target');
  assertSha256(record.defineSha256, 'build defines');
  assertSha256(record.optionsSha256, 'build options');
}

function assertToolVersion(value: unknown, label: string): asserts value is ToolVersionIdentity {
  const record = requireRecord(value, label);
  requireNonEmpty(record.name, `${label} name`);
  requireNonEmpty(record.version, `${label} version`);
  if (record.entry !== undefined) assertHashedFile(record.entry, `${label} entry`);
}

function assertBuildVariantIdentity(value: unknown): asserts value is BuildVariantIdentity {
  const record = requireRecord(value, 'build variant');
  requireNonEmpty(record.variantId, 'variant id');
  assertVariantProfile(record.profile);
  assertBuildIdentity(record.build, 'build identity');
}

function assertBuildIdentity(value: unknown, label: string): asserts value is BuildIdentity {
  const build = requireRecord(value, label);
  requireFiniteNonNegative(build.durationMs, 'build duration');
  assertSha256(build.entryGraphSha256, 'entry graph');
  if (build.receipt !== null) assertHashedFile(build.receipt, 'build receipt');
  assertArtifactSetMetrics(build.artifacts);
  const artifacts = build.artifacts;
  assertHashedFiles(build.browserLoadedAssets, 'browser-loaded assets');
  const emitted = new Map(artifacts.files.map(file => [file.path, file.sha256] as const));
  for (const loaded of build.browserLoadedAssets) {
    if (emitted.get(loaded.path) !== loaded.sha256) throw new Error(`Browser-loaded asset "${loaded.path}" is absent from or differs from the emitted artifact set.`);
  }
}

function assertApplicationResult(
  value: unknown,
  resultScenarioIds: ReadonlySet<string>,
  claimedScenarioIds: Set<string>,
): asserts value is ApplicationResult {
  const application = requireRecord(value, 'application result');
  requireNonEmpty(application.applicationId, 'application id');
  const lanesValue: unknown = application.lanes;
  if (!Array.isArray(lanesValue) || lanesValue.length !== 2) {
    throw new Error(`Application "${application.applicationId}" requires exact JIT and AOT lanes.`);
  }
  const lanes = lanesValue as unknown[];
  const [jit, aot] = lanes;
  assertApplicationLaneResult(jit, 'jit', application.applicationId);
  assertApplicationLaneResult(aot, 'aot', application.applicationId);

  const correctness = requireRecord(application.correctness, `${application.applicationId} correctness`);
  requireEnum(correctness.kind, ['runtime-oracle', 'browser-assurance'], 'application correctness kind');
  if (correctness.state !== 'passed') {
    throw new Error(`Application "${application.applicationId}" did not pass its oracle or assurance.`);
  }
  assertHashedFile(correctness.evidence, `${application.applicationId} correctness evidence`);
  if (correctness.kind === 'runtime-oracle') {
    requireStringArray(correctness.scenarioIds, `${application.applicationId} runtime oracle scenarios`);
    if (correctness.scenarioIds.length === 0) {
      throw new Error(`Application "${application.applicationId}" runtime oracle owns no scenarios.`);
    }
    const local = new Set<string>();
    for (const scenarioId of correctness.scenarioIds) {
      requireNonEmpty(scenarioId, `${application.applicationId} scenario id`);
      if (!resultScenarioIds.has(scenarioId)) {
        throw new Error(`Application "${application.applicationId}" claims absent scenario "${scenarioId}".`);
      }
      if (local.has(scenarioId) || claimedScenarioIds.has(scenarioId)) {
        throw new Error(`Scenario "${scenarioId}" has duplicate application ownership.`);
      }
      local.add(scenarioId);
      claimedScenarioIds.add(scenarioId);
    }
  } else {
    requireNonEmpty(correctness.assuranceScenarioId, `${application.applicationId} assurance scenario id`);
    if (correctness.scenarioIds !== undefined) {
      throw new Error(`Application "${application.applicationId}" browser assurance cannot claim runtime scenarios.`);
    }
  }
}

function assertApplicationLaneResult(
  value: unknown,
  expectedMode: BuildMode,
  applicationId: string,
): asserts value is JitApplicationLaneResult | AotApplicationLaneResult {
  const lane = requireRecord(value, `${applicationId} ${expectedMode} lane`);
  if (lane.buildMode !== expectedMode) {
    throw new Error(`Application "${applicationId}" requires JIT then AOT lane order.`);
  }
  assertBuildIdentity(lane.build, `${applicationId} ${expectedMode} build`);
  const build = lane.build;
  if (
    build.artifacts.initialEagerJavaScript.fileCount === 0
    || build.artifacts.totalJavaScript.fileCount === 0
  ) {
    throw new Error(`Application "${applicationId}" ${expectedMode} lane has no executable JavaScript bytes.`);
  }
  const receiptFiles = build.artifacts.files.filter((file) => file.kind === 'receipt');
  if (expectedMode === 'jit') {
    if (build.receipt !== null || lane.semanticEvidence !== null || receiptFiles.length > 0) {
      throw new Error(`Application "${applicationId}" JIT lane cannot carry AOT receipt or semantic evidence.`);
    }
    return;
  }
  if (build.receipt === null) {
    throw new Error(`Application "${applicationId}" AOT lane has no Vite receipt identity.`);
  }
  assertHashedFile(lane.semanticEvidence, `${applicationId} AOT semantic evidence`);
  if (receiptFiles.length !== 1) {
    throw new Error(`Application "${applicationId}" AOT artifacts must contain exactly one receipt.`);
  }
  const receipt = receiptFiles[0]!;
  if (
    receipt.path !== build.receipt.path
    || receipt.rawBytes !== build.receipt.bytes
    || receipt.sha256 !== build.receipt.sha256
  ) {
    throw new Error(`Application "${applicationId}" AOT receipt identity differs from its artifact.`);
  }
}

function assertResultInputReference(
  inputs: readonly HashedFileIdentity[],
  expected: HashedFileIdentity,
  label: string,
): void {
  const actual = inputs.find((file) => file.path === expected.path);
  if (actual == null || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(`${label} is absent from or differs from result inputs.`);
  }
}

function assertComparisonIdentity(value: unknown): asserts value is ComparisonIdentity {
  const record = requireRecord(value, 'comparison identity');
  requireEnum(record.comparisonKind, ['jit-vs-aot-control', 'aot-control-vs-candidate'], 'comparison kind');
  requireNonEmpty(record.controlVariantId, 'control variant id');
  requireNonEmpty(record.candidateVariantId, 'candidate variant id');
  if (record.controlVariantId === record.candidateVariantId) throw new Error('Comparison variants must be distinct.');
}

function assertComparisonProfiles(comparison: ComparisonIdentity, variants: readonly BuildVariantIdentity[]): void {
  const control = variants.find(variant => variant.variantId === comparison.controlVariantId)!;
  const candidate = variants.find(variant => variant.variantId === comparison.candidateVariantId)!;
  if (comparison.comparisonKind === 'jit-vs-aot-control') {
    if (control.profile.buildMode !== 'jit' || candidate.profile.buildMode !== 'aot'
      || candidate.profile.coordinates.objective !== 'control') {
      throw new Error('JIT/AOT-control comparison roles do not match their variant profiles.');
    }
    return;
  }
  if (control.profile.buildMode !== 'aot' || candidate.profile.buildMode !== 'aot'
    || control.profile.coordinates.objective !== 'control') {
    throw new Error('AOT-control/candidate comparison roles do not match their variant profiles.');
  }
  for (const key of ['authorityScope', 'fallback', 'runtimeConfiguration', 'debugPosture', 'inputAuthority'] as const) {
    if (control.profile.coordinates[key] !== candidate.profile.coordinates[key]) {
      throw new Error(`Competing AOT profiles have unequal ${key} envelopes.`);
    }
  }
}

function assertExecutorIdentity(value: unknown): asserts value is ExecutorIdentity {
  const record = requireRecord(value, 'executor identity');
  for (const key of ['executorId', 'platform', 'architecture', 'osRelease', 'osBuild', 'cpuModel', 'nodeVersion', 'powerPosture'] as const) {
    requireNonEmpty(record[key], `executor ${key}`);
  }
  requirePositiveInteger(record.logicalCpuCount, 'logical CPU count');
  requirePositiveInteger(record.totalMemoryBytes, 'total memory');
}

function assertBrowserIdentity(value: unknown): asserts value is BrowserIdentity {
  const record = requireRecord(value, 'browser identity');
  requireNonEmpty(record.name, 'browser name');
  requireNonEmpty(record.version, 'browser version');
  assertSha256(record.executableSha256, 'browser executable');
  requireStringArray(record.flags, 'browser flags');
  const viewport = requireRecord(record.viewport, 'browser viewport');
  requirePositiveInteger(viewport.width, 'viewport width');
  requirePositiveInteger(viewport.height, 'viewport height');
  requireFinitePositive(viewport.deviceScaleFactor, 'viewport device scale factor');
  if (typeof record.headless !== 'boolean') throw new Error('Browser headless posture is missing.');
}

function assertSamplingIdentity(value: unknown): asserts value is SamplingIdentity {
  const record = requireRecord(value, 'sampling identity');
  if (record.producer !== 'tachometer' || record.confidenceLevel !== 0.95
    || record.differenceDirection !== 'candidate-minus-control') {
    throw new Error('Sampling identity does not use the frozen statistical contract.');
  }
  requireNonEmpty(record.producerVersion, 'Tachometer version');
  requireEnum(record.orderPolicy, ['ab-ba', 'randomized-blocks'], 'sampling order policy');
  assertLatencySamplingPolicy(record.latencySamples);
  if (record.forcedGcHeapSamplesPerVariant !== 20) throw new Error('Forced-GC heap sampling requires 20 samples per variant in contract v0.1.');
  assertHashedFiles(record.rawResultFiles, 'raw sampling results');
}

export function assertLatencySamplingPolicy(value: unknown): asserts value is LatencySamplingPolicy {
  const latency = requireRecord(value, 'latency sampling policy');
  if (latency.kind === 'adaptive') {
    requireFinitePositive(latency.timeoutMinutes, 'adaptive sampling timeout');
    return;
  }
  if (latency.kind === 'fixed') {
    requirePositiveInteger(latency.samplesPerVariant, 'fixed latency sample count per variant');
    return;
  }
  if (latency.kind !== 'fixed-by-scenario') {
    throw new Error('Latency sampling policy must be adaptive, fixed, or fixed-by-scenario.');
  }
  assertSha256(latency.calibrationSha256, 'latency calibration');
  if (!Array.isArray(latency.scenarios) || latency.scenarios.length === 0) {
    throw new Error('Per-scenario latency sampling requires scenario count rows.');
  }
  let priorScenarioId = '';
  const scenarioIds = new Set<string>();
  for (const item of latency.scenarios) {
    const scenario = requireRecord(item, 'per-scenario latency sample count');
    requireNonEmpty(scenario.scenarioId, 'latency scenario id');
    requirePositiveInteger(scenario.samplesPerVariant, `latency samples for ${scenario.scenarioId}`);
    if (scenario.samplesPerVariant % 2 !== 0) {
      throw new Error(`Latency samples for ${scenario.scenarioId} must be even for equal AB/BA weighting.`);
    }
    if (scenarioIds.has(scenario.scenarioId)) {
      throw new Error(`Per-scenario latency sampling repeats "${scenario.scenarioId}".`);
    }
    if (scenario.scenarioId.localeCompare(priorScenarioId) <= 0) {
      throw new Error('Per-scenario latency sample rows must use deterministic scenario-id order.');
    }
    priorScenarioId = scenario.scenarioId;
    scenarioIds.add(scenario.scenarioId);
  }
}

function assertDeterminismIdentity(value: unknown): asserts value is DeterminismIdentity {
  const record = requireRecord(value, 'determinism identity');
  for (const key of ['firstAotArtifactSetSha256', 'secondAotArtifactSetSha256', 'firstAotReceiptSha256', 'secondAotReceiptSha256'] as const) {
    assertSha256(record[key], key);
  }
  if (record.identical !== true
    || record.firstAotArtifactSetSha256 !== record.secondAotArtifactSetSha256
    || record.firstAotReceiptSha256 !== record.secondAotReceiptSha256) {
    throw new Error('AOT/AOT deterministic rebuild evidence is not identical.');
  }
  assertHashedFile(record.identicalLaneCalibration, 'identical-lane calibration');
}

function assertScenarioResult(value: unknown): asserts value is ScenarioResult {
  const record = requireRecord(value, 'scenario result');
  requireNonEmpty(record.scenarioId, 'scenario result id');
  if (record.oraclePassed !== true) throw new Error(`Scenario "${record.scenarioId}" did not pass its authored oracle.`);
  if (!Array.isArray(record.measurements) || record.measurements.length === 0) throw new Error(`Scenario "${record.scenarioId}" has no measurements.`);
  const metricIds = new Set<string>();
  for (const measurement of record.measurements) {
    assertMeasurementResult(measurement, record.scenarioId);
    if (metricIds.has(measurement.metricId)) throw new Error(`Scenario "${record.scenarioId}" repeats metric "${measurement.metricId}".`);
    metricIds.add(measurement.metricId);
  }
}

function assertMeasurementResult(value: unknown, expectedScenarioId: string): asserts value is MeasurementResult {
  const record = requireRecord(value, 'measurement result');
  if (record.scenarioId !== expectedScenarioId) throw new Error('Measurement scenario id does not match its owner.');
  requireNonEmpty(record.metricId, 'metric id');
  requireEnum(record.unit, ['milliseconds', 'bytes'], 'measurement unit');
  requireEnum(record.verdict, ['improved', 'regressed', 'unresolved', 'unmeasured'], 'measurement verdict');
  if (record.verdict === 'unmeasured') {
    if (record.control !== null || record.candidate !== null
      || record.absoluteDifferenceConfidenceInterval95 !== null || record.percentDifferenceConfidenceInterval95 !== null) {
      throw new Error('An unmeasured metric cannot contain statistical values.');
    }
    return;
  }
  assertVariantMeasurement(record.control, 'control measurement');
  assertVariantMeasurement(record.candidate, 'candidate measurement');
  assertConfidenceInterval(record.absoluteDifferenceConfidenceInterval95, 'absolute difference');
  assertConfidenceInterval(record.percentDifferenceConfidenceInterval95, 'percent difference');
  const interval = record.absoluteDifferenceConfidenceInterval95;
  const percentInterval = record.percentDifferenceConfidenceInterval95;
  const absoluteExcludesZero = interval.lower > 0 || interval.upper < 0;
  const percentExcludesZero = percentInterval.lower > 0 || percentInterval.upper < 0;
  if (record.verdict === 'unresolved' && absoluteExcludesZero && percentExcludesZero) {
    throw new Error('An unresolved verdict requires difference intervals containing zero.');
  }
  if (record.verdict === 'improved'
    && (interval.upper >= 0 || percentInterval.upper >= 0)) {
    throw new Error('An improved verdict requires negative candidate-minus-control difference intervals.');
  }
  if (record.verdict === 'regressed'
    && (interval.lower <= 0 || percentInterval.lower <= 0)) {
    throw new Error('A regressed verdict requires positive candidate-minus-control difference intervals.');
  }
}

function assertVariantMeasurement(value: unknown, label: string): asserts value is VariantMeasurement {
  const record = requireRecord(value, label);
  requirePositiveInteger(record.samples, `${label} samples`);
  requireFiniteNonNegative(record.mean, `${label} mean`);
  assertConfidenceInterval(record.meanConfidenceInterval95, `${label} mean confidence interval`);
}

function assertConfidenceInterval(value: unknown, label: string): asserts value is ConfidenceInterval {
  const record = requireRecord(value, label);
  requireFinite(record.lower, `${label} lower`);
  requireFinite(record.upper, `${label} upper`);
  if (record.lower > record.upper) throw new Error(`${label} is inverted.`);
}

function assertHashedFiles(value: unknown, label: string): asserts value is HashedFileIdentity[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must contain at least one file.`);
  const paths = new Set<string>();
  for (const [index, item] of value.entries()) {
    assertHashedFile(item, `${label}[${index}]`);
    if (paths.has(item.path)) throw new Error(`${label} repeats path "${item.path}".`);
    paths.add(item.path);
  }
}

function assertHashedFile(value: unknown, label: string): asserts value is HashedFileIdentity {
  const record = requireRecord(value, label);
  requireNonEmpty(record.path, `${label} path`);
  requireNonNegativeInteger(record.bytes, `${label} bytes`);
  assertSha256(record.sha256, `${label} sha256`);
}

function assertIsoDate(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || new Date(value).toISOString() !== value) throw new Error(`${label} must be an ISO timestamp.`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be a record.`);
  return value as Record<string, unknown>;
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

function requireFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}

function requireFiniteNonNegative(value: unknown, label: string): asserts value is number {
  requireFinite(value, label);
  if (value < 0) throw new Error(`${label} must not be negative.`);
}

function requireFinitePositive(value: unknown, label: string): asserts value is number {
  requireFinite(value, label);
  if (value <= 0) throw new Error(`${label} must be positive.`);
}

function requirePositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw new Error(`${label} must be a positive integer.`);
}

function requireNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative integer.`);
}
