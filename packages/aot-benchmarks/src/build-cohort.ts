import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  measureArtifactSet,
  type ArtifactSetMetrics,
} from './artifact-metrics.js';
import { measureLaneBuild } from './build-metrics.js';
import type { BenchmarkBuildMode, BenchmarkLaneBuild } from './build.js';
import type { HashedFileIdentity } from './contracts.js';
import { hashedFileIdentity, hashJson } from './toolchain.js';

export interface MeasuredBenchmarkLane {
  readonly build: BenchmarkLaneBuild;
  readonly artifacts: ArtifactSetMetrics;
}

export interface MeasuredBuildCohort {
  readonly mode: BenchmarkBuildMode;
  readonly applications: readonly MeasuredBenchmarkLane[];
  readonly durationMs: number;
  readonly entryGraphSha256: ReturnType<typeof hashJson>;
  readonly artifacts: ArtifactSetMetrics;
  readonly browserLoadedAssets: readonly HashedFileIdentity[];
}

/** Join independently built applications without erasing their artifact paths or byte denominators. */
export async function measureBuildCohort(
  builds: readonly BenchmarkLaneBuild[],
): Promise<MeasuredBuildCohort> {
  if (builds.length === 0) throw new Error('A benchmark build cohort cannot be empty.');
  const mode = builds[0]!.mode;
  const applicationIds = new Set<string>();
  for (const build of builds) {
    if (build.mode !== mode) throw new Error('A benchmark build cohort cannot mix JIT and AOT lanes.');
    if (applicationIds.has(build.applicationId)) {
      throw new Error(`Benchmark build cohort repeats '${build.applicationId}/${mode}'.`);
    }
    applicationIds.add(build.applicationId);
  }

  const orderedBuilds = [...builds].sort((left, right) => left.applicationId.localeCompare(right.applicationId));
  const applications = await Promise.all(orderedBuilds.map(async build => ({
    build,
    artifacts: await measureLaneBuild(build),
  })));
  const inputs = (await Promise.all(applications.flatMap(application =>
    application.artifacts.files.map(async file => ({
      path: `${application.build.applicationId}/${file.path}`,
      bytes: await readFile(path.join(application.build.outDir, ...file.path.split('/'))),
      kind: file.kind,
      initialEager: file.initialEager,
      served: file.served,
      imports: file.imports.map(value => `${application.build.applicationId}/${value}`),
      dynamicImports: file.dynamicImports.map(value => `${application.build.applicationId}/${value}`),
    }))
  ))).flat();
  const artifacts = measureArtifactSet(inputs);
  return {
    mode,
    applications,
    durationMs: Number(applications.reduce((sum, application) =>
      sum + application.build.durationMs, 0).toFixed(3)),
    entryGraphSha256: hashJson(applications.map(application => ({
      applicationId: application.build.applicationId,
      entryFiles: application.build.entryFiles,
      topologySha256: application.artifacts.topologySha256,
    }))),
    artifacts,
    browserLoadedAssets: artifacts.files
      .filter(file => file.kind === 'javascript' && file.initialEager)
      .map(file => ({ path: file.path, bytes: file.rawBytes, sha256: file.sha256 })),
  };
}

/** Persist the AOT plugin receipts as one deterministic cohort receipt used by rebuild checks. */
export async function writeJoinedAotReceipt(request: {
  readonly cohort: MeasuredBuildCohort;
  readonly outputPath: string;
  readonly relativeTo: string;
}): Promise<HashedFileIdentity> {
  if (request.cohort.mode !== 'aot') throw new Error('Only an AOT cohort can publish a joined AOT receipt.');
  const receipts = [...request.cohort.applications]
    .sort((left, right) => left.build.applicationId.localeCompare(right.build.applicationId))
    .map(application => {
      if (application.build.aotReceipt == null) {
        throw new Error(`AOT build '${application.build.applicationId}' has no Vite receipt.`);
      }
      return {
        applicationId: application.build.applicationId,
        receipt: application.build.aotReceipt,
      };
    });
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  await writeFile(request.outputPath, `${JSON.stringify({ version: 1, receipts }, null, 2)}\n`, 'utf8');
  return hashedFileIdentity(request.outputPath, request.relativeTo);
}
