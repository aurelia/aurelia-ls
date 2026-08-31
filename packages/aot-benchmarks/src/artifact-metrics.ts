import { createHash } from 'node:crypto';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

import type { Sha256 } from './contracts.js';

export const ARTIFACT_METRICS_SCHEMA_VERSION = 1 as const;
export const GZIP_LEVEL = 9 as const;
export const BROTLI_QUALITY = 11 as const;

export type ArtifactKind = 'javascript' | 'html' | 'css' | 'other' | 'map' | 'receipt';

export interface ArtifactMetricInput {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly kind: ArtifactKind;
  readonly initialEager: boolean;
  readonly served: boolean;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
}

export interface ArtifactFileMetrics {
  readonly path: string;
  readonly kind: ArtifactKind;
  readonly initialEager: boolean;
  readonly served: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly sha256: Sha256;
  readonly rawBytes: number;
  readonly gzip9Bytes: number;
  readonly brotli11Bytes: number;
}

export interface ArtifactByteAggregate {
  readonly fileCount: number;
  readonly rawBytes: number;
  readonly gzip9Bytes: number;
  readonly brotli11Bytes: number;
}

export interface ArtifactSetMetrics {
  readonly schemaVersion: typeof ARTIFACT_METRICS_SCHEMA_VERSION;
  readonly files: readonly ArtifactFileMetrics[];
  readonly initialEagerJavaScript: ArtifactByteAggregate;
  readonly totalJavaScript: ArtifactByteAggregate;
  readonly nonJavaScript: ArtifactByteAggregate;
  readonly topologySha256: Sha256;
  readonly artifactSetSha256: Sha256;
}

/**
 * Measures an already emitted artifact set. Callers retain ownership of file IO so the bytes
 * measured here are the same bytes they serve to the browser.
 */
export function measureArtifactSet(inputs: readonly ArtifactMetricInput[]): ArtifactSetMetrics {
  const seenPaths = new Set<string>();
  const files = inputs.map(input => {
    assertArtifactPath(input.path, 'artifact path');
    if (seenPaths.has(input.path)) {
      throw new Error(`Artifact set contains duplicate path "${input.path}".`);
    }
    seenPaths.add(input.path);
    if (input.initialEager && input.kind !== 'javascript') {
      throw new Error(`Initial-eager artifact "${input.path}" is not JavaScript.`);
    }
    const imports = [...(input.imports ?? [])];
    const dynamicImports = [...(input.dynamicImports ?? [])];
    for (const importedPath of [...imports, ...dynamicImports]) {
      assertArtifactPath(importedPath, `import of ${input.path}`);
    }
    const bytes = Buffer.from(input.bytes.buffer, input.bytes.byteOffset, input.bytes.byteLength);
    return {
      path: input.path,
      kind: input.kind,
      initialEager: input.initialEager,
      served: input.served,
      imports,
      dynamicImports,
      sha256: sha256(bytes),
      rawBytes: bytes.byteLength,
      gzip9Bytes: gzipSync(bytes, { level: GZIP_LEVEL }).byteLength,
      brotli11Bytes: brotliCompressSync(bytes, {
        params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY },
      }).byteLength,
    } satisfies ArtifactFileMetrics;
  }).sort((left, right) => left.path.localeCompare(right.path));

  const knownPaths = new Set(files.map(file => file.path));
  for (const file of files) {
    for (const importedPath of [...file.imports, ...file.dynamicImports]) {
      if (!knownPaths.has(importedPath)) {
        throw new Error(`Artifact "${file.path}" imports absent artifact "${importedPath}".`);
      }
    }
  }

  const initialEagerJavaScript = aggregate(files.filter(file => file.kind === 'javascript' && file.initialEager));
  if (files.some(file => file.kind === 'javascript') && initialEagerJavaScript.fileCount === 0) {
    throw new Error('A JavaScript artifact set must identify at least one initial-eager JavaScript file.');
  }
  const totalJavaScript = aggregate(files.filter(file => file.kind === 'javascript'));
  const nonJavaScript = aggregate(files.filter(file => file.kind !== 'javascript'));
  const topologySha256 = sha256(canonicalJson(files.map(file => ({
    path: file.path,
    kind: file.kind,
    initialEager: file.initialEager,
    imports: file.imports,
    dynamicImports: file.dynamicImports,
  }))));
  const artifactSetSha256 = sha256(canonicalJson(files.map(file => ({
    path: file.path,
    sha256: file.sha256,
    served: file.served,
  }))));

  return {
    schemaVersion: ARTIFACT_METRICS_SCHEMA_VERSION,
    files,
    initialEagerJavaScript,
    totalJavaScript,
    nonJavaScript,
    topologySha256,
    artifactSetSha256,
  };
}

export function assertArtifactSetMetrics(value: unknown): asserts value is ArtifactSetMetrics {
  if (!isRecord(value) || value.schemaVersion !== ARTIFACT_METRICS_SCHEMA_VERSION) {
    throw new Error('Unsupported or malformed artifact metrics schema.');
  }
  assertArtifactFiles(value.files);
  const paths = new Set<string>();
  for (const [index, file] of value.files.entries()) {
    assertArtifactFileMetrics(file, `files[${index}]`);
    if (paths.has(file.path)) throw new Error(`Artifact metrics contains duplicate path "${file.path}".`);
    paths.add(file.path);
  }
  for (const file of value.files) {
    for (const importedPath of [...file.imports, ...file.dynamicImports]) {
      if (!paths.has(importedPath)) throw new Error(`Artifact "${file.path}" imports absent artifact "${importedPath}".`);
    }
  }
  assertAggregate(value.initialEagerJavaScript, 'initialEagerJavaScript');
  assertAggregate(value.totalJavaScript, 'totalJavaScript');
  assertAggregate(value.nonJavaScript, 'nonJavaScript');
  assertDigest(value.topologySha256, 'artifact topology');
  assertDigest(value.artifactSetSha256, 'artifact set');

  const expectedTopology = sha256(canonicalJson(value.files.map(file => ({
    path: file.path,
    kind: file.kind,
    initialEager: file.initialEager,
    imports: file.imports,
    dynamicImports: file.dynamicImports,
  }))));
  const expectedSet = sha256(canonicalJson(value.files.map(file => ({
    path: file.path,
    sha256: file.sha256,
    served: file.served,
  }))));
  if (value.topologySha256 !== expectedTopology || value.artifactSetSha256 !== expectedSet) {
    throw new Error('Artifact aggregate identity does not match its file records.');
  }

  const recomputedInitial = aggregate(value.files.filter(file => file.kind === 'javascript' && file.initialEager));
  const recomputedTotal = aggregate(value.files.filter(file => file.kind === 'javascript'));
  const recomputedOther = aggregate(value.files.filter(file => file.kind !== 'javascript'));
  assertSameAggregate(value.initialEagerJavaScript, recomputedInitial, 'initial-eager JavaScript');
  assertSameAggregate(value.totalJavaScript, recomputedTotal, 'total JavaScript');
  assertSameAggregate(value.nonJavaScript, recomputedOther, 'non-JavaScript');
  if (recomputedTotal.fileCount > 0 && recomputedInitial.fileCount === 0) {
    throw new Error('Artifact metrics contains JavaScript but no initial-eager JavaScript file.');
  }
}

function assertArtifactFiles(value: unknown): asserts value is ArtifactFileMetrics[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Artifact metrics must contain at least one file.');
  for (const [index, file] of value.entries()) assertArtifactFileMetrics(file, `files[${index}]`);
}

function assertArtifactFileMetrics(value: unknown, label: string): asserts value is ArtifactFileMetrics {
  if (!isRecord(value)) throw new Error(`${label} is not an artifact file record.`);
  assertArtifactPath(value.path, `${label}.path`);
  if (!isArtifactKind(value.kind)) throw new Error(`${label}.kind is unsupported.`);
  if (typeof value.initialEager !== 'boolean' || typeof value.served !== 'boolean') {
    throw new Error(`${label} is missing artifact membership flags.`);
  }
  if (value.initialEager && value.kind !== 'javascript') throw new Error(`${label} marks non-JavaScript as initial eager.`);
  assertStringArray(value.imports, `${label}.imports`);
  assertStringArray(value.dynamicImports, `${label}.dynamicImports`);
  for (const importedPath of [...value.imports, ...value.dynamicImports]) assertArtifactPath(importedPath, label);
  assertDigest(value.sha256, `${label}.sha256`);
  for (const key of ['rawBytes', 'gzip9Bytes', 'brotli11Bytes'] as const) {
    assertNonNegativeInteger(value[key], `${label}.${key}`);
  }
}

function aggregate(files: readonly ArtifactFileMetrics[]): ArtifactByteAggregate {
  return files.reduce<ArtifactByteAggregate>((current, file) => ({
    fileCount: current.fileCount + 1,
    rawBytes: current.rawBytes + file.rawBytes,
    gzip9Bytes: current.gzip9Bytes + file.gzip9Bytes,
    brotli11Bytes: current.brotli11Bytes + file.brotli11Bytes,
  }), { fileCount: 0, rawBytes: 0, gzip9Bytes: 0, brotli11Bytes: 0 });
}

function assertAggregate(value: unknown, label: string): asserts value is ArtifactByteAggregate {
  if (!isRecord(value)) throw new Error(`${label} is not an artifact aggregate.`);
  for (const key of ['fileCount', 'rawBytes', 'gzip9Bytes', 'brotli11Bytes'] as const) {
    assertNonNegativeInteger(value[key], `${label}.${key}`);
  }
}

function assertSameAggregate(actual: ArtifactByteAggregate, expected: ArtifactByteAggregate, label: string): void {
  for (const key of ['fileCount', 'rawBytes', 'gzip9Bytes', 'brotli11Bytes'] as const) {
    if (actual[key] !== expected[key]) throw new Error(`Recorded ${label} ${key} does not match its files.`);
  }
}

function assertArtifactPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/u.test(value)) {
    throw new Error(`${label} must be a normalized relative path.`);
  }
  if (value.split('/').some(part => part === '' || part === '.' || part === '..')) {
    throw new Error(`${label} contains a non-canonical path segment.`);
  }
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} must be a string array.`);
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative integer.`);
}

function isArtifactKind(value: unknown): value is ArtifactKind {
  return value === 'javascript' || value === 'html' || value === 'css' || value === 'other' || value === 'map' || value === 'receipt';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertDigest(value: unknown, label: string): asserts value is Sha256 {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
}

function sha256(value: string | Uint8Array): Sha256 {
  return createHash('sha256').update(value).digest('hex') as Sha256;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}
