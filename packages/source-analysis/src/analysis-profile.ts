import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

export interface PackageDiscoveryRoot {
  readonly root: string;
  readonly mode: 'children-with-package-json';
}

export interface PathMappingRule {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface PartitionTemplateRule {
  readonly pattern: string;
  readonly partitionTemplate: string;
  readonly labelTemplate?: string;
}

export interface PartitionScheme {
  readonly id: string;
  readonly summary: string;
  readonly rules: readonly PartitionTemplateRule[];
}

export interface AnalysisProfile {
  readonly profileId: string;
  readonly profilePath: string | null;
  readonly repoPath: string;
  readonly snapshotTarget: string;
  readonly excludedRepoRelativePrefixes: readonly string[];
  readonly packageDiscoveryRoots: readonly PackageDiscoveryRoot[];
  readonly includeRepoRootPackage: boolean;
  readonly pathMappings: readonly PathMappingRule[];
  readonly exercisePatterns: readonly string[];
  readonly partitionSchemes: readonly PartitionScheme[];
}

export interface ResolveAnalysisProfileOptions {
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
  readonly excludedRepoRelativePrefixes?: readonly string[] | null;
}

interface AnalysisProfileDocument {
  readonly id?: unknown;
  readonly target?: unknown;
  readonly excludedRepoRelativePrefixes?: unknown;
  readonly packageDiscoveryRoots?: unknown;
  readonly includeRepoRootPackage?: unknown;
  readonly pathMappings?: unknown;
  readonly exercisePatterns?: unknown;
  readonly partitionSchemes?: unknown;
}

const DEFAULT_PATH_MAPPINGS: readonly PathMappingRule[] = [
  { id: 'out-to-src', from: 'out', to: 'src' },
  { id: 'dist-types-to-src', from: 'dist/types', to: 'src' },
  { id: 'dist-to-src', from: 'dist', to: 'src' },
  { id: 'build-to-src', from: 'build', to: 'src' },
] as const;

const DEFAULT_EXERCISE_PATTERNS = [
  'test/**',
  '**/test/**',
  'tests/**',
  '**/tests/**',
  '*.test.*',
  '**/*.test.*',
  '*.spec.*',
  '**/*.spec.*',
] as const;

const PROFILE_CANDIDATES = [
  '.source-analysis/profile.json',
  'source-analysis.profile.json',
] as const;

export function resolveAnalysisProfile(
  options: ResolveAnalysisProfileOptions = {},
): AnalysisProfile {
  const repoPath = options.repoPath
    ? resolve(options.repoPath)
    : resolveDefaultRepoPath(process.cwd());
  const profilePath = resolveProfilePath(repoPath, options.profilePath);
  const document = profilePath ? readProfileDocument(profilePath) : {};
  const snapshotTarget = options.target
    ?? asNonEmptyString(document.target)
    ?? deriveSnapshotTargetFromRepoPath(repoPath);
  const excludedRepoRelativePrefixes = (
    options.excludedRepoRelativePrefixes
    ?? parseStringList(document.excludedRepoRelativePrefixes)
  ).map((value) => normalizeRepoRelativePath(value));
  const packageDiscoveryRoots = resolvePackageDiscoveryRoots(repoPath, document);
  const includeRepoRootPackage = resolveIncludeRepoRootPackage(repoPath, document, packageDiscoveryRoots);
  const partitionSchemes = resolvePartitionSchemes(repoPath, document, includeRepoRootPackage);

  return {
    profileId: asNonEmptyString(document.id) ?? deriveProfileIdFromRepoPath(repoPath),
    profilePath,
    repoPath,
    snapshotTarget,
    excludedRepoRelativePrefixes,
    packageDiscoveryRoots,
    includeRepoRootPackage,
    pathMappings: resolvePathMappings(document),
    exercisePatterns: resolveExercisePatterns(document),
    partitionSchemes,
  };
}

export function deriveSnapshotTargetFromRepoPath(repoPath: string): string {
  const repoName = basename(resolve(repoPath));
  const sanitized = repoName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'repo';
}

export function deriveProfileIdFromRepoPath(repoPath: string): string {
  return deriveSnapshotTargetFromRepoPath(repoPath);
}

export function normalizeRepoRelativePath(pathValue: string): string {
  return pathValue.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

export function expandMappedRepoRelativePathCandidates(
  profile: AnalysisProfile,
  repoRelativePath: string,
): readonly string[] {
  const normalized = normalizeRepoRelativePath(repoRelativePath);
  const mapped = profile.pathMappings.flatMap((mapping) =>
    applyPathMapping(normalized, mapping),
  );
  return dedupeStrings([...mapped, normalized]);
}

export function isExercisePath(
  profile: AnalysisProfile,
  repoRelativePath: string,
): boolean {
  const normalized = normalizeRepoRelativePath(repoRelativePath);
  return profile.exercisePatterns.some((pattern) => matchesGlobPattern(normalized, pattern));
}

function resolveProfilePath(
  repoPath: string,
  explicitProfilePath: string | undefined,
): string | null {
  if (explicitProfilePath) {
    const resolved = resolve(repoPath, explicitProfilePath);
    return existsSync(resolved) ? resolved : null;
  }

  for (const candidate of PROFILE_CANDIDATES) {
    const candidatePath = join(repoPath, candidate);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function resolveDefaultRepoPath(
  startPath: string,
): string {
  let currentPath = resolve(startPath);

  while (true) {
    if (PROFILE_CANDIDATES.some((candidate) => existsSync(join(currentPath, candidate)))) {
      return currentPath;
    }
    if (existsSync(join(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath;
    }
    if (existsSync(join(currentPath, '.git')) && existsSync(join(currentPath, 'package.json'))) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return resolve(startPath);
    }
    currentPath = parentPath;
  }
}

function readProfileDocument(
  profilePath: string,
): AnalysisProfileDocument {
  return JSON.parse(readFileSync(profilePath, 'utf-8')) as AnalysisProfileDocument;
}

function resolvePackageDiscoveryRoots(
  repoPath: string,
  document: AnalysisProfileDocument,
): readonly PackageDiscoveryRoot[] {
  const configured = Array.isArray(document.packageDiscoveryRoots)
    ? document.packageDiscoveryRoots
    : null;
  if (configured) {
    return configured
      .map((value) => {
        const root = asNonEmptyString(value);
        return root
          ? {
            root: normalizeRepoRelativePath(root),
            mode: 'children-with-package-json' as const,
          }
          : null;
      })
      .filter((value): value is PackageDiscoveryRoot => value !== null);
  }

  const defaults: PackageDiscoveryRoot[] = [];
  if (existsSync(join(repoPath, 'packages'))) {
    defaults.push({
      root: 'packages',
      mode: 'children-with-package-json',
    });
  }
  return defaults;
}

function resolveIncludeRepoRootPackage(
  repoPath: string,
  document: AnalysisProfileDocument,
  packageDiscoveryRoots: readonly PackageDiscoveryRoot[],
): boolean {
  if (typeof document.includeRepoRootPackage === 'boolean') {
    return document.includeRepoRootPackage;
  }
  return existsSync(join(repoPath, 'package.json')) && packageDiscoveryRoots.length === 0;
}

function resolvePathMappings(
  document: AnalysisProfileDocument,
): readonly PathMappingRule[] {
  if (!Array.isArray(document.pathMappings)) {
    return DEFAULT_PATH_MAPPINGS;
  }

  const mappings = document.pathMappings
    .map((value) => parsePathMapping(value))
    .filter((value): value is PathMappingRule => value !== null);

  return mappings.length > 0 ? mappings : DEFAULT_PATH_MAPPINGS;
}

function parsePathMapping(
  value: unknown,
): PathMappingRule | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const from = asNonEmptyString(record.from);
  const to = asNonEmptyString(record.to);
  if (!from || !to) {
    return null;
  }
  return {
    id: asNonEmptyString(record.id) ?? `${normalizeRepoRelativePath(from)}->${normalizeRepoRelativePath(to)}`,
    from: normalizeRepoRelativePath(from),
    to: normalizeRepoRelativePath(to),
  };
}

function resolveExercisePatterns(
  document: AnalysisProfileDocument,
): readonly string[] {
  const patterns = parseStringList(document.exercisePatterns)
    .map((value) => value.replace(/\\/g, '/'));
  return patterns.length > 0 ? patterns : DEFAULT_EXERCISE_PATTERNS;
}

function resolvePartitionSchemes(
  repoPath: string,
  document: AnalysisProfileDocument,
  includeRepoRootPackage: boolean,
): readonly PartitionScheme[] {
  if (Array.isArray(document.partitionSchemes)) {
    const configured = document.partitionSchemes
      .map((value) => parsePartitionScheme(value))
      .filter((value): value is PartitionScheme => value !== null);
    if (configured.length > 0) {
      return configured;
    }
  }

  return buildDefaultPartitionSchemes(repoPath, includeRepoRootPackage);
}

function parsePartitionScheme(
  value: unknown,
): PartitionScheme | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = asNonEmptyString(record.id);
  const summary = asNonEmptyString(record.summary);
  const rules = Array.isArray(record.rules)
    ? record.rules
      .map((rule) => parsePartitionRule(rule))
      .filter((rule): rule is PartitionTemplateRule => rule !== null)
    : [];
  if (!id || !summary || rules.length === 0) {
    return null;
  }
  return {
    id,
    summary,
    rules,
  };
}

function parsePartitionRule(
  value: unknown,
): PartitionTemplateRule | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const pattern = asNonEmptyString(record.pattern);
  const partitionTemplate = asNonEmptyString(record.partitionTemplate);
  if (!pattern || !partitionTemplate) {
    return null;
  }
  const labelTemplate = asNonEmptyString(record.labelTemplate);
  return {
    pattern: pattern.replace(/\\/g, '/'),
    partitionTemplate: partitionTemplate.replace(/\\/g, '/'),
    ...(labelTemplate ? { labelTemplate: labelTemplate.replace(/\\/g, '/') } : {}),
  };
}

function buildDefaultPartitionSchemes(
  repoPath: string,
  includeRepoRootPackage: boolean,
): readonly PartitionScheme[] {
  const schemes: PartitionScheme[] = [];
  const hasPackagesRoot = existsSync(join(repoPath, 'packages'));
  const hasRootSrc = existsSync(join(repoPath, 'src'));

  const packageRules: PartitionTemplateRule[] = [];
  const sourceAreaRules: PartitionTemplateRule[] = [];

  if (hasPackagesRoot) {
    packageRules.push({
      pattern: 'packages/{package}/**',
      partitionTemplate: 'packages/{package}',
      labelTemplate: '{package}',
    });
    sourceAreaRules.push({
      pattern: 'packages/{package}/src/{area}/**',
      partitionTemplate: 'packages/{package}/src/{area}',
      labelTemplate: '{package}:{area}',
    });
  }

  if (includeRepoRootPackage && hasRootSrc) {
    packageRules.push({
      pattern: 'src/**',
      partitionTemplate: 'repo-root',
      labelTemplate: 'repo-root',
    });
    sourceAreaRules.push({
      pattern: 'src/{area}/**',
      partitionTemplate: 'src/{area}',
      labelTemplate: '{area}',
    });
  }

  if (packageRules.length > 0) {
    schemes.push({
      id: 'package',
      summary: 'Package-level structural partitions inferred from workspace layout.',
      rules: packageRules,
    });
  }

  if (sourceAreaRules.length > 0) {
    schemes.push({
      id: 'source-area',
      summary: 'Top-level source areas inside each package or root src tree.',
      rules: sourceAreaRules,
    });
  }

  return schemes;
}

function applyPathMapping(
  pathValue: string,
  mapping: PathMappingRule,
): readonly string[] {
  const inputSegments = pathValue.split('/');
  const fromSegments = mapping.from.split('/').filter(Boolean);
  const toSegments = mapping.to.split('/').filter(Boolean);
  if (fromSegments.length === 0) {
    return [];
  }

  const results: string[] = [];
  for (let index = 0; index <= inputSegments.length - fromSegments.length; index += 1) {
    const matches = fromSegments.every((segment, offset) => inputSegments[index + offset] === segment);
    if (!matches) {
      continue;
    }
    const candidate = [
      ...inputSegments.slice(0, index),
      ...toSegments,
      ...inputSegments.slice(index + fromSegments.length),
    ].join('/');
    results.push(candidate);
  }

  return dedupeStrings(results);
}

function matchesGlobPattern(
  pathValue: string,
  pattern: string,
): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::double-star::')
    .replace(/\*/g, '[^/]*')
    .replace(/::double-star::/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(pathValue);
}

function parseStringList(
  value: unknown,
): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

function asNonEmptyString(
  value: unknown,
): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function dedupeStrings(
  values: readonly string[],
): readonly string[] {
  return [...new Set(values)];
}
