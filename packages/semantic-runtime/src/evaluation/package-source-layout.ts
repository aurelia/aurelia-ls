import path from 'node:path';

import type { BootPackageManifest } from '../boot/host-files.js';
import { normalizeModuleKey } from './module-graph.js';
import { evaluationModuleHostPathKey } from './package-origin.js';

const MODULE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.css',
] as const;

const MODULE_INDEX_FILES = [
  'index.ts',
  'index.tsx',
  'index.mts',
  'index.cts',
  'index.js',
  'index.jsx',
  'index.mjs',
  'index.cjs',
  'index.json',
] as const;

/** Exact read surface needed to classify and map reached package sources. */
export interface EvaluationPackageSourceFileSystem {
  fileExists(fileName: string): boolean;
  realpath(fileName: string): string;
  readPackageManifest(packageRoot: string): BootPackageManifest | null;
}

export interface EvaluationPackageSourceLayoutProfile {
  readonly declarationSourceHits: number;
  readonly declarationSourceMisses: number;
  readonly packagePolicyHits: number;
  readonly packagePolicyMisses: number;
  readonly packageManifestHits: number;
  readonly packageManifestMisses: number;
}

/** Cached legacy declaration layout and external source-admission evidence for one evaluator generation. */
export class EvaluationPackageSourceLayout {
  private readonly declarationSourcePathCache = new Map<string, string | null>();
  private readonly externalPackagePolicyCache = new Map<string, boolean>();
  private readonly packageManifestCache = new Map<string, BootPackageManifest | null>();

  private declarationSourceHits = 0;
  private declarationSourceMisses = 0;
  private packagePolicyHits = 0;
  private packagePolicyMisses = 0;
  private packageManifestHits = 0;
  private packageManifestMisses = 0;

  constructor(
    private readonly fileSystem: EvaluationPackageSourceFileSystem,
    private readonly admitSourceShippedPackageEntrypoints: boolean,
  ) {}

  /** Narrow legacy fallback; a future explicit/source-map link product should precede it. */
  sourceForLegacyDeclaration(declarationFileName: string, packageRoot: string): string | null {
    const cacheKey = `${evaluationModuleHostPathKey(packageRoot)}::${evaluationModuleHostPathKey(declarationFileName)}`;
    if (this.declarationSourcePathCache.has(cacheKey)) {
      this.declarationSourceHits += 1;
      return this.declarationSourcePathCache.get(cacheKey) ?? null;
    }
    this.declarationSourceMisses += 1;
    const relativePath = normalizeModuleKey(path.relative(packageRoot, declarationFileName));
    const declarationBase = stripDeclarationExtension(relativePath);
    if (declarationBase == null) {
      this.declarationSourcePathCache.set(cacheKey, null);
      return null;
    }
    for (const candidateBase of sourceCandidateBasesForDeclarationBase(declarationBase)) {
      for (const candidate of candidateEvaluationModulePaths(path.join(packageRoot, candidateBase))) {
        if (
          isEvaluationModulePath(candidate)
          && this.fileSystem.fileExists(candidate)
          && isAuthoredPackageSourceModule(candidate, packageRoot)
        ) {
          const sourcePath = this.fileSystem.realpath(candidate);
          this.declarationSourcePathCache.set(cacheKey, sourcePath);
          return sourcePath;
        }
      }
    }
    this.declarationSourcePathCache.set(cacheKey, null);
    return null;
  }

  shouldAdmitExternalSource(packageRoot: string): boolean {
    const cacheKey = evaluationModuleHostPathKey(packageRoot);
    const cached = this.externalPackagePolicyCache.get(cacheKey);
    if (cached !== undefined) {
      this.packagePolicyHits += 1;
      return cached;
    }
    this.packagePolicyMisses += 1;
    const manifest = this.readPackageManifest(packageRoot);
    const shouldAdmit = packageManifestParticipatesInAurelia(manifest)
      || (
        this.admitSourceShippedPackageEntrypoints
        && packageManifestPublishesAuthoredSourceEntrypoint(this.fileSystem, packageRoot, manifest)
      );
    this.externalPackagePolicyCache.set(cacheKey, shouldAdmit);
    return shouldAdmit;
  }

  readPackageManifest(packageRoot: string): BootPackageManifest | null {
    const key = evaluationModuleHostPathKey(packageRoot);
    if (this.packageManifestCache.has(key)) {
      this.packageManifestHits += 1;
      return this.packageManifestCache.get(key) ?? null;
    }
    this.packageManifestMisses += 1;
    const manifest = this.fileSystem.readPackageManifest(packageRoot);
    this.packageManifestCache.set(key, manifest);
    return manifest;
  }

  snapshotProfile(): EvaluationPackageSourceLayoutProfile {
    return {
      declarationSourceHits: this.declarationSourceHits,
      declarationSourceMisses: this.declarationSourceMisses,
      packagePolicyHits: this.packagePolicyHits,
      packagePolicyMisses: this.packagePolicyMisses,
      packageManifestHits: this.packageManifestHits,
      packageManifestMisses: this.packageManifestMisses,
    };
  }
}

export function candidateEvaluationModulePaths(base: string): readonly string[] {
  const direct = candidateDirectModulePaths(base);
  if (!shouldProbeIndexModulePaths(base)) {
    return direct;
  }
  return [...direct, ...MODULE_INDEX_FILES.map((file) => path.join(base, file))];
}

export function isEvaluationModulePath(fileName: string): boolean {
  return isEvaluationModuleExtension(path.extname(fileName).toLowerCase());
}

export function isAuthoredPackageSourceModule(fileName: string, packageRoot: string): boolean {
  const relativePath = normalizeModuleKey(path.relative(packageRoot, fileName));
  if (relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
    return false;
  }
  const segments = relativePath.split('/');
  if (['dist', 'lib', 'umd', 'cjs', 'esm'].some((segment) => segments.includes(segment))) {
    return false;
  }
  const extension = path.extname(fileName).toLowerCase();
  return segments[0] === 'src'
    ? isEvaluationModulePath(fileName)
    : extension === '.ts' || extension === '.tsx' || extension === '.mts' || extension === '.cts';
}

function shouldProbeIndexModulePaths(base: string): boolean {
  const extension = path.extname(base).toLowerCase();
  return extension.length === 0 || !isEvaluationModuleExtension(extension);
}

function candidateDirectModulePaths(base: string): readonly string[] {
  const extension = path.extname(base);
  const withoutExtension = base.slice(0, -extension.length);
  switch (extension) {
    case '.js':
      return [
        `${withoutExtension}.ts`,
        `${withoutExtension}.tsx`,
        `${withoutExtension}.js`,
        `${withoutExtension}.jsx`,
      ];
    case '.jsx':
      return [
        `${withoutExtension}.tsx`,
        `${withoutExtension}.ts`,
        `${withoutExtension}.jsx`,
        `${withoutExtension}.js`,
      ];
    case '.mjs':
      return [`${withoutExtension}.mts`, `${withoutExtension}.mjs`];
    case '.cjs':
      return [`${withoutExtension}.cts`, `${withoutExtension}.cjs`];
  }
  if (extension.length > 0 && isEvaluationModulePath(base)) {
    return [base];
  }
  return MODULE_EXTENSIONS.map((candidateExtension) => `${base}${candidateExtension}`);
}

function isEvaluationModuleExtension(extension: string): boolean {
  return MODULE_EXTENSIONS.includes(extension as typeof MODULE_EXTENSIONS[number]);
}

function packageManifestParticipatesInAurelia(manifest: BootPackageManifest | null): boolean {
  if (manifest == null) {
    return false;
  }
  const name = typeof manifest.name === 'string' ? manifest.name : null;
  if (name === 'aurelia' || name?.startsWith('@aurelia/')) {
    return false;
  }
  return name?.toLowerCase().includes('aurelia') === true
    || dependencyNames(manifest).some((dependency) =>
      dependency === 'aurelia' || dependency.startsWith('@aurelia/')
    );
}

function packageManifestPublishesAuthoredSourceEntrypoint(
  fileSystem: EvaluationPackageSourceFileSystem,
  packageRoot: string,
  manifest: BootPackageManifest | null,
): boolean {
  return manifest != null
    && packageManifestEntrypoints(manifest).some((entrypoint) =>
      packageEntrypointIsAuthoredSource(fileSystem, packageRoot, entrypoint)
    );
}

function packageManifestEntrypoints(manifest: Record<string, unknown>): readonly string[] {
  return uniquePackageEntrypoints([
    ...packageManifestStringField(manifest.main),
    ...packageManifestStringField(manifest.module),
    ...packageManifestStringField(manifest.browser),
    ...packageManifestStringField(manifest.source),
    ...packageManifestExportEntrypoints(manifest.exports),
  ]);
}

function packageManifestStringField(value: unknown): readonly string[] {
  return typeof value === 'string' && value.length > 0 ? [value] : [];
}

function packageManifestExportEntrypoints(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(packageManifestExportEntrypoints);
  }
  if (value != null && typeof value === 'object') {
    return Object.values(value).flatMap(packageManifestExportEntrypoints);
  }
  return [];
}

function uniquePackageEntrypoints(values: readonly string[]): readonly string[] {
  return [...new Set(values
    .map((value) => value.split(/[?#]/u, 1)[0] ?? '')
    .filter((value) => value.length > 0 && !value.startsWith('#'))
  )];
}

function packageEntrypointIsAuthoredSource(
  fileSystem: EvaluationPackageSourceFileSystem,
  packageRoot: string,
  entrypoint: string,
): boolean {
  const base = path.resolve(packageRoot, entrypoint);
  return candidateEvaluationModulePaths(base).some((candidate) =>
    fileSystem.fileExists(candidate) && isAuthoredPackageSourceModule(candidate, packageRoot)
  );
}

function dependencyNames(manifest: Record<string, unknown>): readonly string[] {
  return [
    ...dependencyGroupNames(manifest.dependencies),
    ...dependencyGroupNames(manifest.peerDependencies),
    ...dependencyGroupNames(manifest.devDependencies),
  ];
}

function dependencyGroupNames(value: unknown): readonly string[] {
  return value != null && typeof value === 'object' ? Object.keys(value) : [];
}

function stripDeclarationExtension(relativePath: string): string | null {
  const lower = relativePath.toLowerCase();
  for (const extension of ['.d.ts', '.d.mts', '.d.cts']) {
    if (lower.endsWith(extension)) {
      return relativePath.slice(0, -extension.length);
    }
  }
  return null;
}

function sourceCandidateBasesForDeclarationBase(declarationBase: string): readonly string[] {
  const candidates: string[] = [];
  addSourceCandidateBase(candidates, declarationBase.replace(/^dist\/types\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase.replace(/^dist\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase.replace(/^types\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase);
  if (declarationBase.endsWith('/index')) {
    addSourceCandidateBase(candidates, 'src/index');
  }
  return candidates;
}

function addSourceCandidateBase(candidates: string[], value: string): void {
  if (!candidates.includes(value)) {
    candidates.push(value);
  }
}
