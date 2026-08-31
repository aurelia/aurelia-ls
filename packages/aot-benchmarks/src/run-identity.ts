import path from 'node:path';

import type { PreparedFrameworkPackageGraph } from './framework-graph.js';
import {
  PERFORMANCE_PORTFOLIO_VERSION,
  PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION,
  type PerformanceScenarioManifest,
} from './manifest.js';
import {
  type FrameworkGraphIdentity,
  type GitObjectId,
  type GroundingEpoch,
  type ManifestIdentity,
  type Sha256,
  type SourceWorldIdentity,
  type ToolchainIdentity,
} from './contracts.js';
import { persistJsonEvidence } from './result-support.js';
import { captureRepositorySourceIdentity } from './source-identity.js';
import {
  captureBenchmarkToolchainIdentity,
  hashedFileIdentity,
} from './toolchain.js';

export const RC2_GROUNDING_REVISION =
  '4ff60906593bdedc9f9dc6003606ba138df87f0e' as GitObjectId;

export const RC2_ALIGNED_GROUNDING_EPOCH: GroundingEpoch = {
  epochId: 'aurelia-2.0.0-rc.2-aligned',
  frameworkUnderTestRevision: RC2_GROUNDING_REVISION,
  semanticRuntimeFrameworkBasis: RC2_GROUNDING_REVISION,
  atlasFrameworkBasis: RC2_GROUNDING_REVISION,
  groundingStatus: 'aligned',
};

export async function captureFrameworkGraphIdentity(
  framework: PreparedFrameworkPackageGraph,
): Promise<FrameworkGraphIdentity> {
  const provenance = framework.provenance;
  if (provenance.framework.commit !== RC2_GROUNDING_REVISION) {
    throw new Error(
      `Baseline framework revision '${provenance.framework.commit}' is not the RC2 grounding epoch.`,
    );
  }
  return {
    sourceRevision: provenance.framework.commit as GitObjectId,
    sourceTree: provenance.framework.tree as GitObjectId,
    dirty: false,
    packageGraphSha256: provenance.graphFingerprint as Sha256,
    packages: await Promise.all(provenance.packages.map(async entry => ({
      packageName: entry.packageName,
      integrity: entry.archive.integrity,
      runtimeEntries: [await hashedFileIdentity(
        framework.entryFor(entry.packageName),
        framework.installRoot,
      )],
    }))),
  };
}

export async function captureAotSourceWorldIdentity(request: {
  readonly repositoryRoot: string;
  readonly framework: PreparedFrameworkPackageGraph;
}): Promise<SourceWorldIdentity> {
  const root = path.resolve(request.repositoryRoot);
  const common = { repositoryRoot: root, lockFile: 'pnpm-lock.yaml' } as const;
  const [framework, semanticRuntime, aot, aotVite, harness] = await Promise.all([
    captureFrameworkGraphIdentity(request.framework),
    captureRepositorySourceIdentity({
      ...common,
      repositoryId: 'aurelia-ls2/semantic-runtime',
      sourceRoots: ['packages/semantic-runtime'],
      builtRoots: ['packages/semantic-runtime/out'],
    }),
    captureRepositorySourceIdentity({
      ...common,
      repositoryId: 'aurelia-ls2/aot',
      sourceRoots: ['packages/aot'],
      builtRoots: ['packages/aot/out'],
    }),
    captureRepositorySourceIdentity({
      ...common,
      repositoryId: 'aurelia-ls2/aot-vite',
      sourceRoots: ['packages/aot-vite'],
      builtRoots: ['packages/aot-vite/out'],
    }),
    captureRepositorySourceIdentity({
      ...common,
      repositoryId: 'aurelia-ls2/aot-benchmark-harness',
      sourceRoots: ['packages/aot-benchmarks', 'packages/aot-assurance'],
      builtRoots: ['packages/aot-benchmarks/out', 'packages/aot-assurance/out'],
    }),
  ]);
  return { framework, semanticRuntime, aot, aotVite, harness };
}

export async function persistScenarioManifestIdentity(request: {
  readonly manifest: PerformanceScenarioManifest;
  readonly runRoot: string;
}): Promise<{ readonly identity: ManifestIdentity; readonly file: Awaited<ReturnType<typeof persistJsonEvidence>> }> {
  const file = await persistJsonEvidence({
    outputPath: path.join(request.runRoot, 'inputs', 'scenario-manifest.json'),
    relativeTo: request.runRoot,
    value: request.manifest,
  });
  return {
    identity: {
      manifestSchemaVersion: PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION,
      manifestVersion: PERFORMANCE_PORTFOLIO_VERSION,
      manifestSha256: file.sha256,
    },
    file,
  };
}

export function captureBaselineToolchainIdentity(packageRoot: string): Promise<ToolchainIdentity> {
  return captureBenchmarkToolchainIdentity({
    packageRoot,
    target: 'es2022',
    define: {},
    options: {
      buildMode: 'production',
      copyPublicDir: false,
      libraryChunking: 'single-minified-esm',
      applicationChunking: 'natural-production',
      minify: 'oxc',
      sourceMap: false,
      target: 'es2022',
      transformStandardDecorators: true,
    },
  });
}
