import path from 'node:path';

import type {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import {
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputRead,
  type SemanticRuntimeInputReadScope,
  type SemanticRuntimeProjectInputGeneration,
} from '../kernel/project-input.js';
import { inferSourceFileRole, inferSourceLanguage } from '../kernel/source-classification.js';
import { sourceTextContentRevision } from '../kernel/source-text-revision.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import {
  semanticRuntimeOptionsForWorkspaceDescriptor,
  semanticWorkspaceDescriptorForRuntimeOptions,
  semanticWorkspaceDescriptorKey,
  type SemanticWorkspaceDescriptor,
} from '../api/workspace-descriptor.js';
import type { SemanticRuntimeOptions } from '../api/contracts.js';
import {
  BootProjectDiscoveryMode,
  defaultBootProjectKey,
  type BootProjectInput,
  type BootSourceFileInput,
  type BootWorkspaceInput,
  type ResolvedBootProjectInput,
  type SourceDiscoveryResult,
} from './frames.js';
import { isHostPathWithin } from './host-files.js';
import { discoverBootProjects } from './project-discovery.js';
import {
  buildProjectConfigurationResult,
  type ProjectConfigurationResult,
} from './project-configuration.js';
import {
  projectRootAdmissionOriginKey,
  ProjectRootAdmissionOriginKind,
  type ProjectRootAdmissionOrigin,
} from './project-root-admission.js';
import {
  AuthoredSourceBoundary,
  authoredSourceExclusionsWithin,
} from './source-boundary.js';
import { discoverSourceFiles } from './source-discovery.js';

export const SEMANTIC_SOURCE_WORLD_SCHEMA_VERSION = 'semantic-source-world/1' as const;

/** Boot input relevant to source-world resolution; store-local publication policy is deliberately absent. */
export type SemanticSourceWorldResolutionInput = Pick<
  BootWorkspaceInput,
  | 'rootDir'
  | 'projects'
  | 'projectDiscovery'
  | 'projectRootHints'
  | 'excludedWorkspaceRoots'
  | 'projectInputAuthority'
>;

/** Fully normalized source admission consumed by kernel boot publication. */
export interface ResolvedSemanticSourceWorldFile {
  readonly path: string;
  readonly language: SourceLanguage;
  readonly role: SourceFileRole;
  readonly note: string | null;
}

/** One resolved project before any kernel address, evidence, or provenance handle is minted. */
export interface ResolvedSemanticSourceWorldProject {
  readonly rootDir: string;
  readonly projectKey: string;
  readonly admissionOrigins: readonly ProjectRootAdmissionOrigin[];
  readonly baseExcludedSourceRootDirs: readonly string[];
  readonly effectiveExcludedSourceRootDirs: readonly string[];
  readonly inputGeneration: SemanticRuntimeProjectInputGeneration;
  readonly projectConfiguration: ProjectConfigurationResult;
  readonly sourceDiscovery: SourceDiscoveryResult | null;
  readonly sourceFiles: readonly ResolvedSemanticSourceWorldFile[];
}

export interface SemanticSourceWorldReceiptValidation {
  readonly isCurrent: boolean;
  readonly changedReadKeys: readonly string[];
  readonly changedFacets: readonly string[];
}

/** Frozen exact-read proof for the directory, marker, native exclusion, and source-membership facts in one plan. */
export class SemanticSourceWorldInputReceipt {
  readonly reads: readonly SemanticRuntimeProjectInputRead[];

  constructor(
    private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority,
    reads: readonly SemanticRuntimeProjectInputRead[],
  ) {
    const byKey = new Map<string, SemanticRuntimeProjectInputRead>();
    for (const read of reads) {
      if (!read.belongsTo(projectInputAuthority)) {
        throw new Error('Source-world receipt contains a read from another project-input authority.');
      }
      const existing = byKey.get(read.readKey);
      if (existing != null && existing.observedRevision !== read.observedRevision) {
        throw new Error(
          `Source-world receipt observed conflicting revisions for '${read.readKey}': `
          + `${existing.observedRevision} and ${read.observedRevision}.`,
        );
      }
      byKey.set(read.readKey, read);
    }
    this.reads = Object.freeze([...byKey.values()].sort((left, right) =>
      left.readKey.localeCompare(right.readKey)));
    Object.freeze(this);
  }

  validate(): SemanticSourceWorldReceiptValidation {
    const eventSequence = this.projectInputAuthority.currentEventSequence;
    const changedReadKeys = new Set<string>();
    const changedFacets = new Set<string>();
    for (const read of this.reads) {
      const validation = read.validateObservedValue();
      if (!validation.isCurrent) {
        changedReadKeys.add(read.readKey);
        for (const facet of validation.changedFacets) {
          changedFacets.add(facet);
        }
      }
    }
    if (this.projectInputAuthority.currentEventSequence !== eventSequence) {
      for (const read of this.reads) {
        if (this.projectInputAuthority.mayHaveChanged(read.descriptor, eventSequence)) {
          changedReadKeys.add(read.readKey);
          changedFacets.add(read.kind);
        }
      }
    }
    return Object.freeze({
      isCurrent: changedReadKeys.size === 0,
      changedReadKeys: Object.freeze([...changedReadKeys].sort()),
      changedFacets: Object.freeze([...changedFacets].sort()),
    });
  }
}

export const enum SemanticSourceWorldCurrentnessKind {
  Current = 'current',
  EquivalentPlan = 'equivalent-plan',
  FreshBootRequired = 'fresh-boot-required',
}

export interface CurrentSemanticSourceWorldResult {
  readonly kind: SemanticSourceWorldCurrentnessKind.Current;
  readonly sourceWorld: ResolvedSemanticSourceWorld;
  readonly receiptValidation: SemanticSourceWorldReceiptValidation;
}

export interface EquivalentSemanticSourceWorldResult {
  readonly kind: SemanticSourceWorldCurrentnessKind.EquivalentPlan;
  readonly previousSourceWorld: ResolvedSemanticSourceWorld;
  readonly sourceWorld: ResolvedSemanticSourceWorld;
  readonly receiptValidation: SemanticSourceWorldReceiptValidation;
}

export interface FreshBootRequiredSemanticSourceWorldResult {
  readonly kind: SemanticSourceWorldCurrentnessKind.FreshBootRequired;
  readonly previousSourceWorld: ResolvedSemanticSourceWorld;
  readonly sourceWorld: ResolvedSemanticSourceWorld;
  readonly receiptValidation: SemanticSourceWorldReceiptValidation;
}

export type SemanticSourceWorldCurrentnessResult =
  | CurrentSemanticSourceWorldResult
  | EquivalentSemanticSourceWorldResult
  | FreshBootRequiredSemanticSourceWorldResult;

/**
 * Resolved, unpublished source-admission world shared by IDE, MCP, and snapshot/AOT consumers.
 *
 * Its currentness proves boot topology, project-root admission, native Aurelia configuration, and authored source
 * membership. It is deliberately not a complete semantic-analysis receipt: compiler options, dependency reads, source
 * text, and answer products retain their narrower project/computation currentness authorities.
 */
export class ResolvedSemanticSourceWorld {
  /** Compact descriptor-derived logical identity, independent from any kernel-store namespace. */
  readonly semanticWorkspaceKey: string;

  constructor(
    readonly descriptor: SemanticWorkspaceDescriptor,
    readonly descriptorKey: string,
    readonly sourceWorldRevision: string,
    readonly projects: readonly ResolvedSemanticSourceWorldProject[],
    readonly receipt: SemanticSourceWorldInputReceipt,
    readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority,
  ) {
    this.semanticWorkspaceKey = semanticSourceWorldWorkspaceKey(descriptorKey);
    Object.freeze(this.projects);
    Object.freeze(this);
  }

  /** Validate the retained source-admission plan and, only when needed, resolve its replacement candidate. */
  resolveCurrent(): SemanticSourceWorldCurrentnessResult {
    const receiptValidation = this.receipt.validate();
    if (receiptValidation.isCurrent) {
      return Object.freeze({
        kind: SemanticSourceWorldCurrentnessKind.Current,
        sourceWorld: this,
        receiptValidation,
      });
    }
    const candidate = resolveSemanticSourceWorld(
      semanticRuntimeOptionsForWorkspaceDescriptor(this.descriptor, {
        projectInputAuthority: this.projectInputAuthority,
      }),
    );
    return candidate.sourceWorldRevision === this.sourceWorldRevision
      ? Object.freeze({
          kind: SemanticSourceWorldCurrentnessKind.EquivalentPlan,
          previousSourceWorld: this,
          sourceWorld: candidate,
          receiptValidation,
        })
      : Object.freeze({
          kind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
          previousSourceWorld: this,
          sourceWorld: candidate,
          receiptValidation,
        });
  }
}

/** Resolve the complete project/source admission world without publishing kernel records. */
export function resolveSemanticSourceWorld(
  input: SemanticSourceWorldResolutionInput | SemanticRuntimeOptions,
): ResolvedSemanticSourceWorld {
  const projectInputAuthority = input.projectInputAuthority ?? new SemanticRuntimeProjectInputAuthority();
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions(sourceWorldRuntimeOptions(input));
  const descriptorKey = semanticWorkspaceDescriptorKey(descriptor);
  const normalized = semanticRuntimeOptionsForWorkspaceDescriptor(descriptor, { projectInputAuthority });
  const workspaceBoundary = new AuthoredSourceBoundary(
    normalized.workspaceRoot,
    normalized.excludedWorkspaceRoots,
  );
  const workspaceGeneration = projectInputAuthority.captureWorkspace({
    workspaceInputKey: semanticSourceWorldWorkspaceKey(descriptorKey),
    rootDir: normalized.workspaceRoot,
  });
  const projectDiscoveryScope = workspaceGeneration.createReadScope('semantic-source-world:project-discovery');
  const projectInputs = normalized.projects == null
    ? discoverBootProjects(
        normalized.workspaceRoot,
        projectDiscoveryScope.host,
        normalized.projectDiscovery ?? BootProjectDiscoveryMode.ProjectMarkers,
        workspaceBoundary.excludedRootDirs,
        normalized.projectRootHints,
      )
    : normalized.projects.map((project) =>
        resolveExplicitProjectInputWithinWorkspaceBoundary(project, workspaceBoundary));
  assertUniqueProjectKeys(projectInputs);
  const resolvedProjects = projectInputs.map((project) =>
    resolveSemanticSourceWorldProject(normalized.workspaceRoot, project, projectInputAuthority));
  const receipt = new SemanticSourceWorldInputReceipt(projectInputAuthority, [
    ...projectDiscoveryScope.readRegisteredInputs(),
    ...resolvedProjects.flatMap((project) => sourceWorldProjectReads(project)),
  ]);
  const sourceWorldRevision = semanticSourceWorldRevision(descriptorKey, resolvedProjects);
  return new ResolvedSemanticSourceWorld(
    descriptor,
    descriptorKey,
    sourceWorldRevision,
    Object.freeze(resolvedProjects),
    receipt,
    projectInputAuthority,
  );
}

/** Resolve one already-admitted project through captured native-configuration and source-discovery scopes. */
export function resolveSemanticSourceWorldProject(
  workspaceRootDir: string,
  input: ResolvedBootProjectInput,
  projectInputAuthority: SemanticRuntimeProjectInputAuthority,
): ResolvedSemanticSourceWorldProject {
  const rootDir = path.normalize(path.resolve(input.rootDir));
  const projectKey = input.projectKey ?? defaultBootProjectKey(rootDir);
  const inputGeneration = projectInputAuthority.capture({ projectKey, rootDir });
  const projectConfiguration = buildProjectConfigurationResult(inputGeneration, rootDir);
  const baseBoundary = new AuthoredSourceBoundary(rootDir, input.excludedSourceRoots);
  const authoredSources = new AuthoredSourceBoundary(rootDir, [
    ...baseBoundary.excludedRootDirs,
    ...projectConfiguration.excludedSourceRootDirs,
  ]);
  const sourceDiscoveryScope = input.sourceFiles == null
    ? inputGeneration.createReadScope('semantic-source-world:source-discovery')
    : null;
  const sourceDiscovery = sourceDiscoveryScope == null
    ? null
    : discoverSourceFiles(
        sourceDiscoveryScope.host,
        rootDir,
        authoredSources,
        input.sourceDiscoveryOptions,
      );
  const sourceFiles = (input.sourceFiles ?? sourceDiscovery?.sourceFiles ?? [])
    .filter((source) => authoredSources.contains(source.path))
    .map((source) => resolveSourceWorldFile(rootDir, source));
  const project = {
    rootDir,
    projectKey,
    admissionOrigins: Object.freeze([...input.admissionOrigins]),
    baseExcludedSourceRootDirs: Object.freeze([...baseBoundary.excludedRootDirs]),
    effectiveExcludedSourceRootDirs: Object.freeze([...authoredSources.excludedRootDirs]),
    inputGeneration,
    projectConfiguration,
    sourceDiscovery,
    sourceFiles: Object.freeze(sourceFiles),
  } satisfies ResolvedSemanticSourceWorldProject & {
    readonly sourceDiscoveryScope?: SemanticRuntimeInputReadScope;
  };
  sourceWorldProjectReadScopes.set(project, sourceDiscoveryScope);
  return Object.freeze(project);
}

const sourceWorldProjectReadScopes = new WeakMap<
  ResolvedSemanticSourceWorldProject,
  SemanticRuntimeInputReadScope | null
>();

function sourceWorldProjectReads(
  project: ResolvedSemanticSourceWorldProject,
): readonly SemanticRuntimeProjectInputRead[] {
  const configurationReads = project.projectConfiguration.readRegisteredInputs()
    .filter((read): read is SemanticRuntimeProjectInputRead => read instanceof SemanticRuntimeProjectInputRead);
  return [
    ...configurationReads,
    ...(sourceWorldProjectReadScopes.get(project)?.readRegisteredInputs() ?? []),
  ];
}

function sourceWorldRuntimeOptions(
  input: SemanticSourceWorldResolutionInput | SemanticRuntimeOptions,
): SemanticRuntimeOptions {
  if ('workspaceRoot' in input) {
    return input;
  }
  return {
    workspaceRoot: input.rootDir,
    projects: input.projects,
    projectDiscovery: input.projectDiscovery,
    projectRootHints: input.projectRootHints,
    excludedWorkspaceRoots: input.excludedWorkspaceRoots,
    projectInputAuthority: input.projectInputAuthority,
  };
}

function resolveExplicitProjectInputWithinWorkspaceBoundary(
  project: BootProjectInput,
  workspaceBoundary: AuthoredSourceBoundary,
): ResolvedBootProjectInput {
  if (isHostPathWithin(project.rootDir, workspaceBoundary.rootDir) && !workspaceBoundary.contains(project.rootDir)) {
    throw new Error(`Explicit project root '${project.rootDir}' is excluded from workspace '${workspaceBoundary.rootDir}'.`);
  }
  return {
    ...project,
    excludedSourceRoots: [
      ...(project.excludedSourceRoots ?? []),
      ...authoredSourceExclusionsWithin(project.rootDir, workspaceBoundary.excludedRootDirs),
    ],
    admissionOrigins: [{ kind: ProjectRootAdmissionOriginKind.ExplicitProject }],
  };
}

function assertUniqueProjectKeys(projects: readonly BootProjectInput[]): void {
  const rootsByKey = new Map<string, string>();
  for (const project of projects) {
    const projectKey = project.projectKey ?? defaultBootProjectKey(project.rootDir);
    const existingRoot = rootsByKey.get(projectKey) ?? null;
    if (existingRoot != null) {
      throw new Error(
        `Cannot boot projects '${existingRoot}' and '${project.rootDir}' with duplicate project key '${projectKey}'.`,
      );
    }
    rootsByKey.set(projectKey, project.rootDir);
  }
}

function resolveSourceWorldFile(
  projectRootDir: string,
  source: BootSourceFileInput,
): ResolvedSemanticSourceWorldFile {
  const absolutePath = path.isAbsolute(source.path)
    ? path.resolve(source.path)
    : path.resolve(projectRootDir, source.path);
  const projectPath = path.relative(projectRootDir, absolutePath).replace(/\\/g, '/');
  return Object.freeze({
    path: projectPath,
    language: source.language ?? inferSourceLanguage(projectPath),
    role: source.role ?? inferSourceFileRole(projectPath),
    note: source.note ?? null,
  });
}

function semanticSourceWorldRevision(
  descriptorKey: string,
  projects: readonly ResolvedSemanticSourceWorldProject[],
): string {
  const facts = {
    schemaVersion: SEMANTIC_SOURCE_WORLD_SCHEMA_VERSION,
    descriptorKey,
    projects: projects
      .map((project) => ({
        rootDir: canonicalTypeSystemPath(project.rootDir),
        projectKey: project.projectKey,
        admissionOrigins: project.admissionOrigins.map(projectRootAdmissionOriginKey).sort(),
        baseExcludedSourceRoots: project.baseExcludedSourceRootDirs.map(canonicalTypeSystemPath).sort(),
        effectiveExcludedSourceRoots: project.effectiveExcludedSourceRootDirs.map(canonicalTypeSystemPath).sort(),
        projectConfiguration: semanticProjectConfigurationFacts(project.projectConfiguration),
        sourceDiscovery: project.sourceDiscovery == null
          ? null
          : {
              rootExists: project.sourceDiscovery.rootExists,
              truncated: project.sourceDiscovery.truncated,
              maxFiles: project.sourceDiscovery.maxFiles,
            },
        sourceFiles: project.sourceFiles
          .map((source) => ({
            path: source.path,
            language: source.language,
            role: source.role,
            note: source.note,
          }))
          .sort((left, right) =>
            left.path.localeCompare(right.path)
            || left.language.localeCompare(right.language)
            || left.role.localeCompare(right.role)
            || (left.note ?? '').localeCompare(right.note ?? '')),
      }))
      .sort((left, right) =>
        left.rootDir.localeCompare(right.rootDir)
        || left.projectKey.localeCompare(right.projectKey)),
  };
  return `${SEMANTIC_SOURCE_WORLD_SCHEMA_VERSION}:${sourceTextContentRevision(JSON.stringify(facts))}`;
}

function semanticSourceWorldWorkspaceKey(descriptorKey: string): string {
  return `semantic-workspace:${sourceTextContentRevision(descriptorKey)}`;
}

function semanticProjectConfigurationFacts(configuration: ProjectConfigurationResult) {
  return {
    filePath: canonicalTypeSystemPath(configuration.filePath),
    exists: configuration.exists,
    excludedSourceRoots: configuration.excludedSourceRootDirs.map(canonicalTypeSystemPath).sort(),
    findingPolicy: configuration.findingPolicy.rules.map((rule) => ({
      ruleId: rule.ruleId,
      disposition: rule.disposition,
      authority: rule.authority,
      source: {
        filePath: canonicalTypeSystemPath(rule.source.filePath),
        start: rule.source.start,
        end: rule.source.end,
        startPosition: rule.source.startPosition,
        endPosition: rule.source.endPosition,
      },
    })),
    diagnostics: configuration.diagnostics.map((diagnostic) => ({
      projectKey: diagnostic.projectKey,
      diagnosticKind: diagnostic.diagnosticKind,
      severity: diagnostic.severity,
      message: diagnostic.message,
      source: {
        filePath: canonicalTypeSystemPath(diagnostic.source.filePath),
        start: diagnostic.source.start,
        end: diagnostic.source.end,
        startPosition: diagnostic.source.startPosition,
        endPosition: diagnostic.source.endPosition,
      },
    })),
  };
}
