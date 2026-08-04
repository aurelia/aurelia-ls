import path from 'node:path';
import {
  BootProjectDiscoveryMode,
  defaultBootProjectKey,
  type BootSourceFileInput,
} from '../boot/frames.js';
import { isHostPathWithin } from '../boot/host-files.js';
import {
  AuthoredSourceBoundary,
  authoredSourceExclusionsWithin,
} from '../boot/source-boundary.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import {
  SOURCE_FILE_ROLE_VALUES,
  SOURCE_LANGUAGE_VALUES,
} from '../kernel/address.js';
import type {
  SemanticRuntimeOptions,
  SemanticRuntimeProjectInput,
} from './contracts.js';

export const SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION = 'semantic-workspace/1' as const;

/** Serializable, normalized source-world input shared by IDE, MCP, and future AOT consumers. */
export interface SemanticWorkspaceDescriptor {
  readonly schemaVersion: typeof SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION;
  readonly workspaceRoot: string;
  readonly excludedWorkspaceRoots: readonly string[];
  readonly projectTopology: SemanticWorkspaceProjectTopologyDescriptor;
}

export type SemanticWorkspaceProjectTopologyDescriptor =
  | SemanticWorkspaceDiscoveredProjectTopologyDescriptor
  | SemanticWorkspaceExplicitProjectTopologyDescriptor;

export interface SemanticWorkspaceDiscoveredProjectTopologyDescriptor {
  readonly kind: 'discover';
  readonly strategy: BootProjectDiscoveryMode | `${BootProjectDiscoveryMode}`;
  /** Active normalized hints; empty for single-root discovery. */
  readonly projectRootHints: readonly string[];
}

export interface SemanticWorkspaceExplicitProjectTopologyDescriptor {
  readonly kind: 'explicit';
  readonly projects: readonly SemanticWorkspaceExplicitProjectDescriptor[];
}

export interface SemanticWorkspaceExplicitProjectDescriptor {
  readonly rootDir: string;
  /** Effective boot key, including the shared default derived from rootDir. */
  readonly projectKey: string;
  /** Exactly one source-input mode is active for this project. */
  readonly sourceInput: SemanticWorkspaceProjectSourceInputDescriptor;
  readonly excludedSourceRoots: readonly string[];
}

export type SemanticWorkspaceProjectSourceInputDescriptor =
  | SemanticWorkspaceDiscoveredSourcesDescriptor
  | SemanticWorkspaceSuppliedSourcesDescriptor;

export interface SemanticWorkspaceDiscoveredSourcesDescriptor {
  readonly kind: 'discover';
  readonly options: SemanticWorkspaceSourceDiscoveryDescriptor | null;
}

export interface SemanticWorkspaceSuppliedSourcesDescriptor {
  readonly kind: 'supplied';
  /** Effective structurally admitted candidates, normalized to absolute host paths. */
  readonly files: readonly SemanticWorkspaceSourceFileDescriptor[];
}

export interface SemanticWorkspaceSourceFileDescriptor {
  readonly path: string;
  readonly language: BootSourceFileInput['language'] | null;
  readonly role: BootSourceFileInput['role'] | null;
  readonly note: string | null;
}

export interface SemanticWorkspaceSourceDiscoveryDescriptor {
  readonly extensions: readonly string[] | null;
  readonly excludedDirectories: readonly string[] | null;
  readonly maxFiles: number | null;
}

/** Normalize the complete serializable source-world portion of runtime options. */
export function semanticWorkspaceDescriptorForRuntimeOptions(
  options: SemanticRuntimeOptions,
): SemanticWorkspaceDescriptor {
  const workspaceRoot = path.normalize(path.resolve(options.workspaceRoot));
  const workspaceBoundary = new AuthoredSourceBoundary(workspaceRoot, options.excludedWorkspaceRoots);
  const excludedWorkspaceRoots = deterministicHostPaths(workspaceBoundary.excludedRootDirs);
  const projectTopology: SemanticWorkspaceProjectTopologyDescriptor = options.projects == null
    ? discoveredProjectTopologyDescriptor(
        workspaceRoot,
        workspaceBoundary,
        options.projectDiscovery,
        options.projectRootHints,
      )
      : {
          kind: 'explicit',
          projects: options.projects.map((project) =>
            explicitProjectDescriptor(workspaceRoot, workspaceBoundary, project)),
        };
  return {
    schemaVersion: SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION,
    workspaceRoot,
    excludedWorkspaceRoots,
    projectTopology,
  };
}

/** Reconstitute runtime boot options from one normalized semantic workspace descriptor. */
export function semanticRuntimeOptionsForWorkspaceDescriptor(
  descriptor: SemanticWorkspaceDescriptor,
  runtime: Pick<SemanticRuntimeOptions, 'storeKey' | 'projectInputAuthority'> = {},
): SemanticRuntimeOptions {
  return runtimeOptionsForNormalizedWorkspaceDescriptor(
    parseSemanticWorkspaceDescriptor(descriptor),
    runtime,
  );
}

function runtimeOptionsForNormalizedWorkspaceDescriptor(
  descriptor: SemanticWorkspaceDescriptor,
  runtime: Pick<SemanticRuntimeOptions, 'storeKey' | 'projectInputAuthority'> = {},
): SemanticRuntimeOptions {
  return {
    workspaceRoot: descriptor.workspaceRoot,
    excludedWorkspaceRoots: descriptor.excludedWorkspaceRoots,
    ...(descriptor.projectTopology.kind === 'discover'
      ? {
          projectDiscovery: descriptor.projectTopology.strategy,
          projectRootHints: descriptor.projectTopology.projectRootHints,
        }
      : {
          projects: descriptor.projectTopology.projects.map(runtimeProjectInputForDescriptor),
        }),
    ...(runtime.storeKey == null ? {} : { storeKey: runtime.storeKey }),
    ...(runtime.projectInputAuthority == null ? {} : { projectInputAuthority: runtime.projectInputAuthority }),
  };
}

/** Normalize runtime options through the shared descriptor while preserving runtime-only policy. */
export function normalizeSemanticRuntimeOptions(options: SemanticRuntimeOptions): SemanticRuntimeOptions {
  return semanticRuntimeOptionsForWorkspaceDescriptor(
    semanticWorkspaceDescriptorForRuntimeOptions(options),
    options,
  );
}

/** Stable semantic identity; runtime-only store and authority policy are deliberately excluded. */
export function semanticWorkspaceDescriptorKey(descriptor: SemanticWorkspaceDescriptor): string {
  const normalized = parseSemanticWorkspaceDescriptor(descriptor);
  return JSON.stringify({
    schemaVersion: normalized.schemaVersion,
    workspaceRoot: canonicalTypeSystemPath(normalized.workspaceRoot),
    excludedWorkspaceRoots: normalized.excludedWorkspaceRoots.map(canonicalTypeSystemPath),
    projectTopology: normalized.projectTopology.kind === 'discover'
      ? {
          kind: normalized.projectTopology.kind,
          strategy: normalized.projectTopology.strategy,
          projectRootHints: normalized.projectTopology.projectRootHints.map(canonicalTypeSystemPath),
        }
      : {
          kind: normalized.projectTopology.kind,
          projects: normalized.projectTopology.projects.map((project) => ({
            rootDir: canonicalTypeSystemPath(project.rootDir),
            projectKey: project.projectKey,
            sourceInput: project.sourceInput.kind === 'supplied'
              ? {
                  kind: project.sourceInput.kind,
                  files: project.sourceInput.files.map((source) => ({
                    ...source,
                    path: canonicalTypeSystemPath(source.path),
                  })),
                }
              : project.sourceInput,
            excludedSourceRoots: project.excludedSourceRoots.map(canonicalTypeSystemPath),
          })),
        },
  });
}

export function semanticRuntimeWorkspaceDescriptorKey(options: SemanticRuntimeOptions): string {
  return semanticWorkspaceDescriptorKey(semanticWorkspaceDescriptorForRuntimeOptions(options));
}

/** Parse one untrusted JSON-like descriptor and require the exact normalized v1 transport shape. */
export function parseSemanticWorkspaceDescriptor(value: unknown): SemanticWorkspaceDescriptor {
  const candidate = readSemanticWorkspaceDescriptor(value);
  const normalized = semanticWorkspaceDescriptorForRuntimeOptions(
    runtimeOptionsForNormalizedWorkspaceDescriptor(candidate),
  );
  if (JSON.stringify(candidate) !== JSON.stringify(normalized)) {
    throw new Error(
      `Semantic workspace descriptor '${SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION}' must use normalized absolute `
      + 'paths, deterministic sets, effective project keys, and effective structural source boundaries.',
    );
  }
  return normalized;
}

function discoveredProjectTopologyDescriptor(
  workspaceRoot: string,
  workspaceBoundary: AuthoredSourceBoundary,
  requestedStrategy: SemanticRuntimeOptions['projectDiscovery'],
  requestedHints: readonly string[] | undefined,
): SemanticWorkspaceDiscoveredProjectTopologyDescriptor {
  const strategy = requestedStrategy ?? BootProjectDiscoveryMode.ProjectMarkers;
  if (strategy !== BootProjectDiscoveryMode.SingleRoot && strategy !== BootProjectDiscoveryMode.ProjectMarkers) {
    throw new Error(`Unknown boot project discovery mode '${String(strategy)}'.`);
  }
  const projectRootHints = strategy === BootProjectDiscoveryMode.SingleRoot
    ? []
    : deterministicHostPaths((requestedHints ?? []).flatMap((hint) => {
        const absoluteHint = path.normalize(path.resolve(workspaceRoot, hint));
        if (!isHostPathWithin(absoluteHint, workspaceRoot)) {
          throw new Error(
            `Project root hint '${absoluteHint}' must be inside semantic-runtime workspace '${workspaceRoot}'.`,
          );
        }
        return workspaceBoundary.contains(absoluteHint) ? [absoluteHint] : [];
      }));
  return { kind: 'discover', strategy, projectRootHints };
}

function explicitProjectDescriptor(
  workspaceRoot: string,
  workspaceBoundary: AuthoredSourceBoundary,
  project: SemanticRuntimeProjectInput,
): SemanticWorkspaceExplicitProjectDescriptor {
  const rootDir = path.normalize(path.resolve(workspaceRoot, project.rootDir));
  if (isHostPathWithin(rootDir, workspaceBoundary.rootDir) && !workspaceBoundary.contains(rootDir)) {
    throw new Error(`Explicit project root '${rootDir}' is excluded from workspace '${workspaceBoundary.rootDir}'.`);
  }
  const sourceBoundary = new AuthoredSourceBoundary(rootDir, [
    ...(project.excludedSourceRoots ?? []),
    ...authoredSourceExclusionsWithin(rootDir, workspaceBoundary.excludedRootDirs),
  ]);
  const sourceInput: SemanticWorkspaceProjectSourceInputDescriptor = project.sourceFiles == null
    ? {
        kind: 'discover',
        options: sourceDiscoveryDescriptor(project.sourceDiscoveryOptions),
      }
    : {
        kind: 'supplied',
        files: project.sourceFiles
          .map((source) => sourceFileDescriptor(rootDir, source))
          .filter((source) => sourceBoundary.contains(source.path)),
      };
  return {
    rootDir,
    projectKey: project.projectKey == null
      ? defaultBootProjectKey(rootDir)
      : descriptorString(project.projectKey, 'explicit project projectKey'),
    sourceInput,
    excludedSourceRoots: deterministicHostPaths(sourceBoundary.excludedRootDirs),
  };
}

function sourceFileDescriptor(
  rootDir: string,
  source: BootSourceFileInput,
): SemanticWorkspaceSourceFileDescriptor {
  return {
    path: path.normalize(path.resolve(rootDir, source.path)),
    language: descriptorNullableVocabulary(
      source.language ?? null,
      `source file '${source.path}' language`,
      SOURCE_LANGUAGE_VALUES,
    ),
    role: descriptorNullableVocabulary(
      source.role ?? null,
      `source file '${source.path}' role`,
      SOURCE_FILE_ROLE_VALUES,
    ),
    note: descriptorNullableString(source.note ?? null, `source file '${source.path}' note`),
  };
}

function sourceDiscoveryDescriptor(
  options: SemanticRuntimeProjectInput['sourceDiscoveryOptions'],
): SemanticWorkspaceSourceDiscoveryDescriptor | null {
  if (options == null) return null;
  const extensions = options.extensions == null ? null : sortedUniqueStrings(options.extensions);
  const excludedDirectories = options.excludedDirectories == null
    ? null
    : sortedUniqueStrings(options.excludedDirectories);
  const maxFiles = options.maxFiles ?? null;
  if (maxFiles != null && (!Number.isSafeInteger(maxFiles) || maxFiles < 0)) {
    throw new Error(`Source discovery maxFiles must be a non-negative safe integer or null; received '${maxFiles}'.`);
  }
  return extensions == null && excludedDirectories == null && maxFiles == null
    ? null
    : { extensions, excludedDirectories, maxFiles };
}

function runtimeProjectInputForDescriptor(
  project: SemanticWorkspaceExplicitProjectDescriptor,
): SemanticRuntimeProjectInput {
  return {
    rootDir: project.rootDir,
    projectKey: project.projectKey,
    ...(project.sourceInput.kind === 'supplied'
      ? {
          sourceFiles: project.sourceInput.files.map((source) => ({
            path: source.path,
            ...(source.language == null ? {} : { language: source.language }),
            ...(source.role == null ? {} : { role: source.role }),
            ...(source.note == null ? {} : { note: source.note }),
          })),
        }
      : project.sourceInput.options == null
        ? {}
        : {
          sourceDiscoveryOptions: {
            ...(project.sourceInput.options.extensions == null
              ? {}
              : { extensions: new Set(project.sourceInput.options.extensions) }),
            ...(project.sourceInput.options.excludedDirectories == null
              ? {}
              : { excludedDirectories: new Set(project.sourceInput.options.excludedDirectories) }),
            maxFiles: project.sourceInput.options.maxFiles,
          },
        }),
    excludedSourceRoots: project.excludedSourceRoots,
  };
}

function deterministicHostPaths(values: readonly string[]): readonly string[] {
  const pathsByIdentity = new Map<string, string>();
  for (const value of values) {
    const absolute = path.normalize(path.resolve(value));
    const identity = canonicalTypeSystemPath(absolute);
    const existing = pathsByIdentity.get(identity);
    if (existing == null || absolute.localeCompare(existing) < 0) {
      pathsByIdentity.set(identity, absolute);
    }
  }
  return [...pathsByIdentity.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}

function sortedUniqueStrings(values: ReadonlySet<string>): readonly string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function readSemanticWorkspaceDescriptor(value: unknown): SemanticWorkspaceDescriptor {
  const record = exactDescriptorObject(
    value,
    'semantic workspace descriptor',
    ['schemaVersion', 'workspaceRoot', 'excludedWorkspaceRoots', 'projectTopology'],
  );
  if (record.schemaVersion !== SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported semantic workspace descriptor schema '${String(record.schemaVersion)}'; `
      + `expected '${SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION}'.`,
    );
  }
  return {
    schemaVersion: SEMANTIC_WORKSPACE_DESCRIPTOR_SCHEMA_VERSION,
    workspaceRoot: descriptorString(record.workspaceRoot, 'workspaceRoot'),
    excludedWorkspaceRoots: descriptorStringArray(record.excludedWorkspaceRoots, 'excludedWorkspaceRoots'),
    projectTopology: readProjectTopologyDescriptor(record.projectTopology),
  };
}

function readProjectTopologyDescriptor(value: unknown): SemanticWorkspaceProjectTopologyDescriptor {
  const discriminator = descriptorDiscriminator(value, 'projectTopology');
  if (discriminator === 'discover') {
    const record = exactDescriptorObject(
      value,
      'projectTopology',
      ['kind', 'strategy', 'projectRootHints'],
    );
    const strategy = record.strategy;
    if (strategy !== BootProjectDiscoveryMode.SingleRoot && strategy !== BootProjectDiscoveryMode.ProjectMarkers) {
      throw new Error(`projectTopology.strategy must be 'single-root' or 'project-markers'.`);
    }
    return {
      kind: 'discover',
      strategy,
      projectRootHints: descriptorStringArray(record.projectRootHints, 'projectTopology.projectRootHints'),
    };
  }
  if (discriminator === 'explicit') {
    const record = exactDescriptorObject(value, 'projectTopology', ['kind', 'projects']);
    return {
      kind: 'explicit',
      projects: descriptorArray(record.projects, 'projectTopology.projects')
        .map((project, index) => readExplicitProjectDescriptor(project, index)),
    };
  }
  throw new Error(`projectTopology.kind must be 'discover' or 'explicit'.`);
}

function readExplicitProjectDescriptor(
  value: unknown,
  index: number,
): SemanticWorkspaceExplicitProjectDescriptor {
  const label = `projectTopology.projects[${index}]`;
  const record = exactDescriptorObject(
    value,
    label,
    ['rootDir', 'projectKey', 'sourceInput', 'excludedSourceRoots'],
  );
  return {
    rootDir: descriptorString(record.rootDir, `${label}.rootDir`),
    projectKey: descriptorString(record.projectKey, `${label}.projectKey`),
    sourceInput: readProjectSourceInputDescriptor(record.sourceInput, `${label}.sourceInput`),
    excludedSourceRoots: descriptorStringArray(record.excludedSourceRoots, `${label}.excludedSourceRoots`),
  };
}

function readProjectSourceInputDescriptor(
  value: unknown,
  label: string,
): SemanticWorkspaceProjectSourceInputDescriptor {
  const discriminator = descriptorDiscriminator(value, label);
  if (discriminator === 'discover') {
    const record = exactDescriptorObject(value, label, ['kind', 'options']);
    return {
      kind: 'discover',
      options: record.options === null ? null : readSourceDiscoveryDescriptor(record.options, `${label}.options`),
    };
  }
  if (discriminator === 'supplied') {
    const record = exactDescriptorObject(value, label, ['kind', 'files']);
    return {
      kind: 'supplied',
      files: descriptorArray(record.files, `${label}.files`)
        .map((source, index) => readSourceFileDescriptor(source, `${label}.files[${index}]`)),
    };
  }
  throw new Error(`${label}.kind must be 'discover' or 'supplied'.`);
}

function readSourceFileDescriptor(
  value: unknown,
  label: string,
): SemanticWorkspaceSourceFileDescriptor {
  const record = exactDescriptorObject(value, label, ['path', 'language', 'role', 'note']);
  return {
    path: descriptorString(record.path, `${label}.path`),
    language: descriptorNullableVocabulary(
      record.language,
      `${label}.language`,
      SOURCE_LANGUAGE_VALUES,
    ),
    role: descriptorNullableVocabulary(record.role, `${label}.role`, SOURCE_FILE_ROLE_VALUES),
    note: descriptorNullableString(record.note, `${label}.note`),
  };
}

function readSourceDiscoveryDescriptor(
  value: unknown,
  label: string,
): SemanticWorkspaceSourceDiscoveryDescriptor {
  const record = exactDescriptorObject(
    value,
    label,
    ['extensions', 'excludedDirectories', 'maxFiles'],
  );
  const maxFiles = record.maxFiles;
  if (maxFiles !== null && (!Number.isSafeInteger(maxFiles) || (maxFiles as number) < 0)) {
    throw new Error(`${label}.maxFiles must be a non-negative safe integer or null.`);
  }
  return {
    extensions: record.extensions === null
      ? null
      : descriptorStringArray(record.extensions, `${label}.extensions`),
    excludedDirectories: record.excludedDirectories === null
      ? null
      : descriptorStringArray(record.excludedDirectories, `${label}.excludedDirectories`),
    maxFiles: maxFiles as number | null,
  };
}

function exactDescriptorObject(
  value: unknown,
  label: string,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  const unknown = keys.find((key) => !expectedKeys.includes(key));
  if (unknown != null) {
    throw new Error(`${label} contains unknown property '${unknown}'.`);
  }
  const missing = expectedKeys.find((key) => !Object.hasOwn(record, key));
  if (missing != null) {
    throw new Error(`${label} is missing required property '${missing}'.`);
  }
  return record;
}

function descriptorDiscriminator(value: unknown, label: string): unknown {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return (value as Readonly<Record<string, unknown>>).kind;
}

function descriptorArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

function descriptorString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }
  return value;
}

function descriptorNullableString(value: unknown, label: string): string | null {
  return value === null ? null : descriptorString(value, label);
}

function descriptorStringArray(value: unknown, label: string): readonly string[] {
  return descriptorArray(value, label).map((entry, index) =>
    descriptorString(entry, `${label}[${index}]`));
}

function descriptorNullableVocabulary<TValue extends string>(
  value: unknown,
  label: string,
  vocabulary: readonly TValue[],
): TValue | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !vocabulary.includes(value as TValue)) {
    throw new Error(`${label} must be null or one of: ${vocabulary.join(', ')}.`);
  }
  return value as TValue;
}
