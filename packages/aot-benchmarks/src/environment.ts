import { cpus, freemem, platform, release, totalmem, version } from 'node:os';

import {
  assertLatencySamplingPolicy,
  assertSha256,
  type BrowserIdentity,
  type ExecutorIdentity,
  type HashedFileIdentity,
  type SamplingIdentity,
} from './contracts.js';

export interface BrowserIdentityInput {
  readonly name: string;
  readonly version: string;
  readonly executableSha256: string;
  readonly flags: readonly string[];
  readonly viewport: { readonly width: number; readonly height: number; readonly deviceScaleFactor: number };
  readonly headless: boolean;
}

export interface SamplingIdentityInput {
  readonly producerVersion: string;
  readonly orderPolicy: SamplingIdentity['orderPolicy'];
  readonly latencySamples: SamplingIdentity['latencySamples'];
  readonly rawResultFiles: readonly HashedFileIdentity[];
}

export function captureExecutorIdentity(executorId: string, powerPosture = 'unknown'): ExecutorIdentity {
  if (executorId.trim().length === 0) throw new Error('Executor id must be non-empty.');
  const processors = cpus();
  if (processors.length === 0) throw new Error('Executor exposes no logical CPUs.');
  const memory = totalmem();
  if (!Number.isSafeInteger(memory) || memory <= 0) throw new Error('Executor total memory is unavailable.');
  // freemem is intentionally sampled to force an OS query here without recording a volatile value.
  // The result contract owns machine capacity, not incidental availability at capture time.
  void freemem();
  return {
    executorId,
    platform: process.platform,
    architecture: process.arch,
    osRelease: release(),
    osBuild: `${platform()} ${version()}`,
    cpuModel: processors[0]!.model,
    logicalCpuCount: processors.length,
    totalMemoryBytes: memory,
    nodeVersion: process.version,
    powerPosture,
  };
}

export function createBrowserIdentity(input: BrowserIdentityInput): BrowserIdentity {
  if (input.name.trim().length === 0 || input.version.trim().length === 0) throw new Error('Browser name and version are required.');
  assertSha256(input.executableSha256, 'browser executable');
  if (!Number.isSafeInteger(input.viewport.width) || input.viewport.width <= 0
    || !Number.isSafeInteger(input.viewport.height) || input.viewport.height <= 0
    || !Number.isFinite(input.viewport.deviceScaleFactor) || input.viewport.deviceScaleFactor <= 0) {
    throw new Error('Browser viewport is invalid.');
  }
  if (input.flags.some(flag => flag.length === 0)) throw new Error('Browser flags cannot be empty.');
  return {
    name: input.name,
    version: input.version,
    executableSha256: input.executableSha256,
    flags: input.flags,
    viewport: input.viewport,
    headless: input.headless,
  };
}

export function createSamplingIdentity(input: SamplingIdentityInput): SamplingIdentity {
  if (input.producerVersion.trim().length === 0) throw new Error('Tachometer version is required.');
  if (input.orderPolicy !== 'ab-ba' && input.orderPolicy !== 'randomized-blocks') throw new Error('Sampling order policy is unsupported.');
  assertLatencySamplingPolicy(input.latencySamples);
  if (input.rawResultFiles.length === 0) throw new Error('Sampling identity requires raw result files.');
  for (const result of input.rawResultFiles) {
    if (result.path.length === 0 || !Number.isSafeInteger(result.bytes) || result.bytes < 0) throw new Error('Raw result file identity is invalid.');
    assertSha256(result.sha256, `raw result ${result.path}`);
  }
  return {
    producer: 'tachometer',
    producerVersion: input.producerVersion,
    confidenceLevel: 0.95,
    differenceDirection: 'candidate-minus-control',
    orderPolicy: input.orderPolicy,
    latencySamples: input.latencySamples,
    forcedGcHeapSamplesPerVariant: 20,
    rawResultFiles: input.rawResultFiles,
  };
}
