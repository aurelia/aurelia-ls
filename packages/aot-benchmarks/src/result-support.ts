import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ArtifactFileMetrics, ArtifactSetMetrics } from './artifact-metrics.js';
import type { MeasuredBenchmarkLane } from './build-cohort.js';
import type {
  ApplicationCorrectnessResult,
  ApplicationResult,
  BuildIdentity,
  HashedFileIdentity,
} from './contracts.js';
import type { JsonValue } from './manifest.js';
import { hashedFileIdentity } from './toolchain.js';

export type ApplicationCorrectnessAdmission =
  | {
      readonly kind: 'runtime-oracle';
      readonly scenarioIds: readonly string[];
    }
  | {
      readonly kind: 'browser-assurance';
      readonly assuranceScenarioId: string;
    };

/** Persist one canonical JSON value and return the exact identity consumed by the result contract. */
export async function persistJsonEvidence(request: {
  readonly outputPath: string;
  readonly relativeTo: string;
  readonly value: unknown;
}): Promise<HashedFileIdentity> {
  const outputPath = path.resolve(request.outputPath);
  const relativeTo = path.resolve(request.relativeTo);
  const relative = path.relative(relativeTo, outputPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Evidence output '${outputPath}' is outside '${relativeTo}'.`);
  }
  const value = canonicalJsonValue(request.value, new Set<object>());
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return hashedFileIdentity(outputPath, relativeTo);
}

/** Join one already measured application pair without introducing scenario or orchestration policy. */
export function createMeasuredApplicationResult(request: {
  readonly jit: MeasuredBenchmarkLane;
  readonly aot: MeasuredBenchmarkLane;
  readonly semanticEvidence: HashedFileIdentity;
  readonly correctness: ApplicationCorrectnessAdmission;
  readonly correctnessEvidence: HashedFileIdentity;
}): ApplicationResult {
  const applicationId = request.jit.build.applicationId;
  assertMeasuredLane(request.jit, applicationId, 'jit');
  assertMeasuredLane(request.aot, applicationId, 'aot');
  const correctness: ApplicationCorrectnessResult = request.correctness.kind === 'runtime-oracle'
    ? {
        kind: request.correctness.kind,
        state: 'passed',
        scenarioIds: request.correctness.scenarioIds,
        evidence: request.correctnessEvidence,
      }
    : {
        kind: request.correctness.kind,
        state: 'passed',
        assuranceScenarioId: request.correctness.assuranceScenarioId,
        evidence: request.correctnessEvidence,
      };
  return {
    applicationId,
    lanes: [
      {
        buildMode: 'jit',
        build: buildIdentity(request.jit, null),
        semanticEvidence: null,
      },
      {
        buildMode: 'aot',
        build: buildIdentity(request.aot, aotReceiptIdentity(request.aot.artifacts, applicationId)),
        semanticEvidence: request.semanticEvidence,
      },
    ],
    correctness,
  };
}

function assertMeasuredLane(
  lane: MeasuredBenchmarkLane,
  applicationId: string,
  expectedMode: 'jit' | 'aot',
): void {
  if (lane.build.applicationId !== applicationId || lane.build.mode !== expectedMode) {
    throw new Error(`Measured application pair requires matching ${expectedMode.toUpperCase()} lane '${applicationId}'.`);
  }
  if (expectedMode === 'jit') {
    if (lane.build.aotReceipt != null || lane.build.semanticEvidence != null) {
      throw new Error(`Measured JIT lane '${applicationId}' contains AOT evidence.`);
    }
    if (lane.artifacts.files.some((file) => file.kind === 'receipt')) {
      throw new Error(`Measured JIT lane '${applicationId}' contains an AOT receipt artifact.`);
    }
    return;
  }
  if (lane.build.aotReceipt == null || lane.build.semanticEvidence == null) {
    throw new Error(`Measured AOT lane '${applicationId}' has no joined semantic/Vite evidence.`);
  }
}

function buildIdentity(
  lane: MeasuredBenchmarkLane,
  receipt: HashedFileIdentity | null,
): BuildIdentity {
  return {
    durationMs: lane.build.durationMs,
    entryGraphSha256: lane.artifacts.topologySha256,
    receipt,
    artifacts: lane.artifacts,
    browserLoadedAssets: initialEagerJavaScript(lane.artifacts),
  };
}

function initialEagerJavaScript(artifacts: ArtifactSetMetrics): readonly HashedFileIdentity[] {
  return artifacts.files
    .filter((file) => file.kind === 'javascript' && file.initialEager)
    .map((file) => {
      if (!file.served) throw new Error(`Initial-eager JavaScript '${file.path}' is not served.`);
      return artifactIdentity(file);
    });
}

function aotReceiptIdentity(artifacts: ArtifactSetMetrics, applicationId: string): HashedFileIdentity {
  const receipts = artifacts.files.filter((file) => file.kind === 'receipt');
  if (receipts.length !== 1) {
    throw new Error(`Measured AOT lane '${applicationId}' requires exactly one receipt artifact.`);
  }
  return artifactIdentity(receipts[0]!);
}

function artifactIdentity(file: ArtifactFileMetrics): HashedFileIdentity {
  return { path: file.path, bytes: file.rawBytes, sha256: file.sha256 };
}

function canonicalJsonValue(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('JSON evidence contains a non-finite number.');
    return value;
  }
  if (typeof value !== 'object') throw new Error(`JSON evidence contains unsupported '${typeof value}' value.`);
  if (ancestors.has(value)) throw new Error('JSON evidence contains a cycle.');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => canonicalJsonValue(item, ancestors));
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('JSON evidence must contain only plain records and arrays.');
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalJsonValue(item, ancestors)]),
    );
  } finally {
    ancestors.delete(value);
  }
}
