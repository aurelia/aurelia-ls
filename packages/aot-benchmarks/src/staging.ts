import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { BenchmarkLaneBuild, BenchmarkBuildMode } from './build.js';
import type { Sha256 } from './contracts.js';
import { lockedRuntimeScenarios } from './portfolio.js';

export const BROWSER_STAGING_MANIFEST_SCHEMA_VERSION = 2 as const;

export type BenchmarkLaneOrder = 'jit-aot' | 'aot-jit' | 'jit-jit' | 'aot-aot';
export type StagedVariant = 'base' | 'candidate';

export interface BrowserStagingLaneIdentity {
  readonly mode: BenchmarkBuildMode;
  readonly outputLabel: string | null;
}

export interface BrowserStagingVariants {
  readonly base: BrowserStagingLaneIdentity;
  readonly candidate: BrowserStagingLaneIdentity;
}

export interface BrowserStagingFileIdentity {
  readonly kind: 'authored' | 'built-variant';
  readonly sourcePath: string;
  readonly destinationPath: string;
  readonly bytes: number;
  readonly sourceSha256: Sha256;
  readonly destinationSha256: Sha256;
}

export interface StagedScenarioPage {
  readonly scenarioId: string;
  readonly pagePath: string;
}

export interface BrowserStagingManifest {
  readonly schemaVersion: typeof BROWSER_STAGING_MANIFEST_SCHEMA_VERSION;
  readonly order: BenchmarkLaneOrder;
  readonly variants: BrowserStagingVariants;
  readonly scenarioPages: readonly StagedScenarioPage[];
  readonly files: readonly BrowserStagingFileIdentity[];
  readonly manifestSha256: Sha256;
}

export interface StagedBrowserRoot {
  readonly browserRoot: string;
  readonly manifest: BrowserStagingManifest;
}

interface BrowserStagingRequestBase {
  readonly packageRoot: string;
  readonly browserRoot: string;
  readonly builds: readonly BenchmarkLaneBuild[];
}

export type StageLockedBrowserWorkloadsRequest = BrowserStagingRequestBase & (
  | {
      readonly order: 'jit-aot' | 'aot-jit' | 'jit-jit';
      readonly variants?: undefined;
    }
  | {
      readonly order: 'aot-aot';
      readonly variants: BrowserStagingVariants;
    }
);

export async function stageLockedBrowserWorkloads(
  request: StageLockedBrowserWorkloadsRequest,
): Promise<StagedBrowserRoot> {
  const packageRoot = path.resolve(request.packageRoot);
  const browserRoot = path.resolve(request.browserRoot);
  assertLaneOrder(request.order);
  const variants = variantsForRequest(request);
  const builds = indexBuilds(request.builds, variants);
  await mkdir(path.dirname(browserRoot), { recursive: true });
  await mkdir(browserRoot);

  const fixtureCopies = [
    {
      sourceRoot: path.join(packageRoot, 'fixtures', 'repeat', 'benchmarks'),
      sourceLabel: 'fixtures/repeat/benchmarks',
      destinationRoot: path.join(browserRoot, 'benchmarks'),
      destinationLabel: 'benchmarks',
    },
    {
      sourceRoot: path.join(packageRoot, 'fixtures', 'keyed-table', 'pages'),
      sourceLabel: 'fixtures/keyed-table/pages',
      destinationRoot: path.join(browserRoot, 'keyed-table', 'pages'),
      destinationLabel: 'keyed-table/pages',
    },
    {
      sourceRoot: path.join(packageRoot, 'fixtures', 'storefront', 'pages'),
      sourceLabel: 'fixtures/storefront/pages',
      destinationRoot: path.join(browserRoot, 'storefront', 'pages'),
      destinationLabel: 'storefront/pages',
    },
  ] as const;

  const files: BrowserStagingFileIdentity[] = [];
  for (const copy of fixtureCopies) {
    await cp(copy.sourceRoot, copy.destinationRoot, { recursive: true, errorOnExist: true });
    const relativeFiles = await listFiles(copy.sourceRoot);
    for (const relativeFile of relativeFiles) {
      files.push(await readCopiedIdentity({
        kind: 'authored',
        source: path.join(copy.sourceRoot, relativeFile),
        sourcePath: `${copy.sourceLabel}/${toPosixPath(relativeFile)}`,
        destination: path.join(copy.destinationRoot, relativeFile),
        destinationPath: `${copy.destinationLabel}/${toPosixPath(relativeFile)}`,
      }));
    }
  }

  for (const application of STAGED_APPLICATIONS) {
    for (const variant of ['base', 'candidate'] as const) {
      const identity = variants[variant];
      const build = builds.get(buildKey(application.applicationId, identity))!;
      const source = path.join(build.outDir, 'app.js');
      const destinationPath = `${application.destinationFamily}/results/variants/${variant}/${application.destinationApplicationId}/app.js`;
      const destination = path.join(browserRoot, ...destinationPath.split('/'));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
      files.push(await readCopiedIdentity({
        kind: 'built-variant',
        source,
        sourcePath: `build:${application.applicationId}/${lanePath(identity)}/app.js`,
        destination,
        destinationPath,
      }));
    }
  }

  files.sort((left, right) => left.destinationPath.localeCompare(right.destinationPath));
  const body = {
    schemaVersion: BROWSER_STAGING_MANIFEST_SCHEMA_VERSION,
    order: request.order,
    variants,
    scenarioPages: stagedScenarioPages(),
    files,
  } as const;
  const manifest: BrowserStagingManifest = {
    ...body,
    manifestSha256: sha256(canonicalJson(body)),
  };
  assertBrowserStagingManifest(manifest);
  await verifyStagedBrowserRoot(browserRoot, manifest);
  return { browserRoot, manifest };
}

export function assertBrowserStagingManifest(value: unknown): asserts value is BrowserStagingManifest {
  const manifest = requireRecord(value, 'browser staging manifest');
  if (manifest.schemaVersion !== BROWSER_STAGING_MANIFEST_SCHEMA_VERSION) {
    throw new Error('Unsupported browser staging manifest schema.');
  }
  assertLaneOrder(manifest.order);
  const variants = requireRecord(manifest.variants, 'staging variants');
  const normalizedVariants = assertManifestVariants(manifest.order, variants);
  assertScenarioPages(manifest.scenarioPages);
  assertStagingFiles(manifest.files);
  assertDigest(manifest.manifestSha256, 'staging manifest');
  const body = {
    schemaVersion: manifest.schemaVersion,
    order: manifest.order,
    variants: normalizedVariants,
    scenarioPages: manifest.scenarioPages,
    files: manifest.files,
  };
  if (manifest.manifestSha256 !== sha256(canonicalJson(body))) {
    throw new Error('Browser staging manifest digest does not match its records.');
  }
}

export async function verifyStagedBrowserRoot(
  browserRoot: string,
  manifest: BrowserStagingManifest,
): Promise<void> {
  assertBrowserStagingManifest(manifest);
  const actualFiles = await listFiles(browserRoot);
  const expectedFiles = manifest.files.map(file => file.destinationPath);
  if (actualFiles.length !== expectedFiles.length
    || actualFiles.some((file, index) => toPosixPath(file) !== expectedFiles[index])) {
    throw new Error('Staged browser root file set does not match its manifest.');
  }
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(browserRoot, ...file.destinationPath.split('/')));
    if (bytes.byteLength !== file.bytes || sha256(bytes) !== file.destinationSha256) {
      throw new Error(`Staged browser file "${file.destinationPath}" no longer matches its manifest.`);
    }
  }
}

const STAGED_APPLICATIONS = [
  {
    applicationId: 'app-repeat-view',
    destinationFamily: 'benchmarks',
    destinationApplicationId: 'app-repeat-view',
  },
  {
    applicationId: 'app-repeat-realistic',
    destinationFamily: 'benchmarks',
    destinationApplicationId: 'app-repeat-realistic',
  },
  {
    applicationId: 'keyed-table-optics',
    destinationFamily: 'keyed-table',
    destinationApplicationId: 'keyed-table',
  },
  {
    applicationId: 'routed-storefront-benchmark',
    destinationFamily: 'storefront',
    destinationApplicationId: 'storefront',
  },
] as const;

function indexBuilds(
  builds: readonly BenchmarkLaneBuild[],
  variants: BrowserStagingManifest['variants'],
): Map<string, BenchmarkLaneBuild> {
  const required = new Set(STAGED_APPLICATIONS.flatMap(application => [
    buildKey(application.applicationId, variants.base),
    buildKey(application.applicationId, variants.candidate),
  ]));
  const result = new Map<string, BenchmarkLaneBuild>();
  for (const build of builds) {
    const key = buildKey(build.applicationId, build);
    if (!required.has(key)) throw new Error(`Browser staging received unexpected build "${key}".`);
    if (result.has(key)) throw new Error(`Browser staging received duplicate build "${key}".`);
    if (build.entryFiles.length !== 1 || build.entryFiles[0] !== 'app.js'
      || build.chunks.length !== 1 || build.chunks[0]?.fileName !== 'app.js') {
      throw new Error(`Browser staging requires one app.js entry from "${key}".`);
    }
    result.set(key, build);
  }
  const missing = [...required].filter(key => !result.has(key));
  if (missing.length > 0) throw new Error(`Browser staging is missing builds: ${missing.join(', ')}.`);
  return result;
}

function stagedScenarioPages(): readonly StagedScenarioPage[] {
  return lockedRuntimeScenarios.map(scenario => {
    const pagePath = scenario.descriptor.pagePath;
    const stagedPath = scenario.family === 'repeat'
      ? removePrefix(pagePath, 'fixtures/repeat/')
      : removePrefix(pagePath, 'fixtures/');
    return { scenarioId: scenario.descriptor.manifest.scenarioId, pagePath: stagedPath };
  });
}

function assertScenarioPages(value: unknown): asserts value is StagedScenarioPage[] {
  if (!Array.isArray(value)) throw new Error('Staging manifest has no scenario pages.');
  const expected = stagedScenarioPages();
  if (value.length !== expected.length) throw new Error('Staging scenario-page count has drifted.');
  for (let index = 0; index < value.length; index++) {
    const row = requireRecord(value[index], `scenarioPages[${index}]`);
    if (row.scenarioId !== expected[index]!.scenarioId || row.pagePath !== expected[index]!.pagePath) {
      throw new Error('Staging scenario-page identity has drifted.');
    }
  }
}

function assertStagingFiles(value: unknown): asserts value is BrowserStagingFileIdentity[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Staging manifest has no files.');
  const destinations = new Set<string>();
  let prior = '';
  for (const item of value) {
    const file = requireRecord(item, 'staging file');
    if (file.kind !== 'authored' && file.kind !== 'built-variant') throw new Error('Staging file kind is unsupported.');
    assertRelativePath(file.sourcePath, 'staging source path', file.kind === 'built-variant');
    assertRelativePath(file.destinationPath, 'staging destination path', false);
    if (!Number.isSafeInteger(file.bytes) || (file.bytes as number) < 0) throw new Error('Staging file byte count is invalid.');
    assertDigest(file.sourceSha256, 'staging source');
    assertDigest(file.destinationSha256, 'staging destination');
    if (file.sourceSha256 !== file.destinationSha256) throw new Error(`Staged file "${file.destinationPath}" differs from its source.`);
    if (file.destinationPath.localeCompare(prior) < 0) throw new Error('Staging file records are not deterministically ordered.');
    prior = file.destinationPath;
    if (destinations.has(file.destinationPath)) throw new Error(`Staging destination "${file.destinationPath}" is duplicated.`);
    destinations.add(file.destinationPath);
  }
  for (const required of expectedVariantDestinations()) {
    if (!destinations.has(required)) throw new Error(`Staging manifest is missing expected variant "${required}".`);
  }
}

function expectedVariantDestinations(): readonly string[] {
  return STAGED_APPLICATIONS.flatMap(application => ['base', 'candidate'].map(variant =>
    `${application.destinationFamily}/results/variants/${variant}/${application.destinationApplicationId}/app.js`
  ));
}

async function readCopiedIdentity(request: {
  readonly kind: BrowserStagingFileIdentity['kind'];
  readonly source: string;
  readonly sourcePath: string;
  readonly destination: string;
  readonly destinationPath: string;
}): Promise<BrowserStagingFileIdentity> {
  const [source, destination] = await Promise.all([readFile(request.source), readFile(request.destination)]);
  return {
    kind: request.kind,
    sourcePath: request.sourcePath,
    destinationPath: request.destinationPath,
    bytes: source.byteLength,
    sourceSha256: sha256(source),
    destinationSha256: sha256(destination),
  };
}

async function listFiles(root: string, relativeRoot = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relativeRoot), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(toPosixPath(relative));
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function removePrefix(value: string, prefix: string): string {
  if (!value.startsWith(prefix)) throw new Error(`Scenario page "${value}" is outside "${prefix}".`);
  return value.slice(prefix.length);
}

function buildKey(
  applicationId: string,
  identity: Pick<BrowserStagingLaneIdentity, 'mode' | 'outputLabel'>,
): string {
  return `${applicationId}/${lanePath(identity)}`;
}

function lanePath(identity: Pick<BrowserStagingLaneIdentity, 'mode' | 'outputLabel'>): string {
  return `${identity.mode}/${identity.outputLabel ?? '@unlabeled'}`;
}

function assertLaneOrder(value: unknown): asserts value is BenchmarkLaneOrder {
  if (value !== 'jit-aot' && value !== 'aot-jit' && value !== 'jit-jit' && value !== 'aot-aot') {
    throw new Error('Browser staging lane order is unsupported.');
  }
}

function variantsForRequest(request: StageLockedBrowserWorkloadsRequest): BrowserStagingVariants {
  if (request.order === 'jit-aot') return defaultVariants('jit', 'aot');
  if (request.order === 'aot-jit') return defaultVariants('aot', 'jit');
  if (request.order === 'jit-jit') return defaultVariants('jit', 'jit');
  const variants = request.variants;
  if (variants === undefined) {
    throw new Error('The aot-aot order requires explicit base and candidate variant identities.');
  }
  assertAotAotVariants(variants);
  return {
    base: { mode: variants.base.mode, outputLabel: variants.base.outputLabel },
    candidate: { mode: variants.candidate.mode, outputLabel: variants.candidate.outputLabel },
  };
}

function defaultVariants(
  base: BenchmarkBuildMode,
  candidate: BenchmarkBuildMode,
): BrowserStagingVariants {
  return {
    base: { mode: base, outputLabel: null },
    candidate: { mode: candidate, outputLabel: null },
  };
}

function assertManifestVariants(
  order: BenchmarkLaneOrder,
  value: Record<string, unknown>,
): BrowserStagingVariants {
  const variants = {
    base: readLaneIdentity(value.base, 'staging base variant'),
    candidate: readLaneIdentity(value.candidate, 'staging candidate variant'),
  };
  if (order === 'aot-aot') {
    assertAotAotVariants(variants);
    return variants;
  }
  const expected = order === 'jit-aot'
    ? defaultVariants('jit', 'aot')
    : order === 'aot-jit'
      ? defaultVariants('aot', 'jit')
      : defaultVariants('jit', 'jit');
  if (!sameLaneIdentity(variants.base, expected.base)
    || !sameLaneIdentity(variants.candidate, expected.candidate)) {
    throw new Error('Staging variants do not agree with lane order.');
  }
  return variants;
}

function assertAotAotVariants(variants: BrowserStagingVariants): void {
  assertLaneIdentity(variants.base, 'staging base variant');
  assertLaneIdentity(variants.candidate, 'staging candidate variant');
  if (variants.base.mode !== 'aot' || variants.candidate.mode !== 'aot') {
    throw new Error('The aot-aot order requires two AOT variant identities.');
  }
  if (sameLaneIdentity(variants.base, variants.candidate)) {
    throw new Error('The aot-aot order requires distinct AOT variant identities.');
  }
}

function readLaneIdentity(value: unknown, label: string): BrowserStagingLaneIdentity {
  const identity = requireRecord(value, label);
  assertLaneIdentity(identity, label);
  return { mode: identity.mode, outputLabel: identity.outputLabel };
}

function assertLaneIdentity(
  identity: { readonly mode?: unknown; readonly outputLabel?: unknown },
  label: string,
): asserts identity is BrowserStagingLaneIdentity {
  if (identity.mode !== 'jit' && identity.mode !== 'aot') {
    throw new Error(`${label} has an unsupported build mode.`);
  }
  if (identity.outputLabel !== null
    && (typeof identity.outputLabel !== 'string' || !isOutputLabel(identity.outputLabel))) {
    throw new Error(`${label} has an invalid output label.`);
  }
}

function sameLaneIdentity(
  left: BrowserStagingLaneIdentity,
  right: BrowserStagingLaneIdentity,
): boolean {
  return left.mode === right.mode && left.outputLabel === right.outputLabel;
}

function isOutputLabel(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u.test(value);
}

function assertRelativePath(value: unknown, label: string, allowBuildPrefix: boolean): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.startsWith('/')
    || (!allowBuildPrefix && value.includes(':')) || /^[A-Za-z]:/u.test(value)) {
    throw new Error(`${label} must be a normalized logical path.`);
  }
  const pathValue = allowBuildPrefix && value.startsWith('build:') ? value.slice('build:'.length) : value;
  if (pathValue.split('/').some(part => part === '' || part === '.' || part === '..')) {
    throw new Error(`${label} contains a non-canonical segment.`);
  }
}

function assertDigest(value: unknown, label: string): asserts value is Sha256 {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) throw new Error(`${label} is not a SHA-256 digest.`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be a record.`);
  return value as Record<string, unknown>;
}

function sha256(value: string | Uint8Array): Sha256 {
  return createHash('sha256').update(value).digest('hex') as Sha256;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
