import type { AddressHandle, EvidenceHandle, ProvenanceHandle } from '../kernel/handles.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import type {
  ComputationRead,
} from '../kernel/computation-lifecycle.js';
import type { KernelStore } from '../kernel/store.js';
import {
  type SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeProjectInputGeneration,
} from '../kernel/project-input.js';
import type {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import type { SourceDiscoveryOptions } from './source-discovery.js';
import {
  buildProjectCompilerOptionsResult,
  type ProjectCompilerOptionsResult,
} from './project-compiler-options.js';
import {
  buildProjectConfigurationResult,
  type ProjectConfigurationResult,
} from './project-configuration.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import { AuthoredSourceBoundary } from './source-boundary.js';
import { ProjectSourceOwnershipIndex } from './source-ownership.js';
import {
  projectRootAdmissionOriginKey,
  type ProjectRootAdmissionOrigin,
} from './project-root-admission.js';
import type {
  ResolvedSemanticSourceWorld,
  ResolvedSemanticSourceWorldProject,
} from './source-world.js';

/** Input source admitted during boot before Aurelia semantics are interpreted. */
export interface BootSourceFileInput {
  /** Absolute or project-relative path supplied by the host or discovery. */
  readonly path: string;
  /** Source language when the host already knows it; discovery can infer a default from source identity. */
  readonly language?: SourceLanguage;
  /** Source role when the host already knows it; discovery can infer a conservative default from source identity. */
  readonly role?: SourceFileRole;
  /** Optional host-facing note explaining why this source was admitted. */
  readonly note?: string | null;
}

/** Derive the boot-owned project key used when a caller does not supply one. */
export function defaultBootProjectKey(rootDir: string): string {
  const parts = rootDir.split(/[\\/]/);
  return parts.at(-1) || 'project';
}

/** Boot configuration for one project frame inside a workspace. */
export interface BootProjectInput {
  /** Project root directory. */
  readonly rootDir: string;
  /** Stable enough project key for the active store. */
  readonly projectKey?: string;
  /** Source files supplied by the host; omitted means local discovery. */
  readonly sourceFiles?: readonly BootSourceFileInput[];
  /** Discovery options used when source files are not supplied by the host. */
  readonly sourceDiscoveryOptions?: SourceDiscoveryOptions;
  /** Descendant roots excluded from this project's authored source membership. */
  readonly excludedSourceRoots?: readonly string[];
}

/** Boot-owned project input after caller policy and automatic discovery have been resolved. */
export interface ResolvedBootProjectInput extends BootProjectInput {
  /** Complete deterministic cause set for admitting this exact project root. */
  readonly admissionOrigins: readonly ProjectRootAdmissionOrigin[];
}

/** Boot configuration for one active analysis workspace. */
export interface BootWorkspaceInput {
  /** Workspace root directory. */
  readonly rootDir: string;
  /** Store-local key used for handle minting. */
  readonly storeKey?: string;
  /** Existing store to populate; omitted creates a fresh store. */
  readonly store?: KernelStore;
  /** Project frames to boot; omitted discovers exact project-root markers with a workspace-root fallback. */
  readonly projects?: readonly BootProjectInput[];
  /** Project discovery strategy used when `projects` is omitted. */
  readonly projectDiscovery?: BootProjectDiscoveryMode | `${BootProjectDiscoveryMode}`;
  /** Existing workspace project roots known by the host and merged into automatic discovery. */
  readonly projectRootHints?: readonly string[];
  /** Descendant workspace roots excluded from project discovery and authored source admission. */
  readonly excludedWorkspaceRoots?: readonly string[];
  /** Runtime-owned authority for coherent source/config generations. */
  readonly projectInputAuthority?: SemanticRuntimeProjectInputAuthority;
}

export const enum BootProjectDiscoveryMode {
  /** Treat the workspace root as the single project frame. */
  SingleRoot = 'single-root',
  /** Discover package, tsconfig, jsconfig, and native Aurelia configuration roots under the workspace. */
  ProjectMarkers = 'project-markers',
}

/** Source discovery result before TypeScript or Aurelia semantics are interpreted. */
export class SourceDiscoveryResult {
  constructor(
    /** Root directory that was scanned or attempted. */
    readonly rootDir: string,
    /** Source files admitted by the discovery pass. */
    readonly sourceFiles: readonly BootSourceFileInput[],
    /** Whether the root directory existed when discovery ran. */
    readonly rootExists: boolean,
    /** Whether discovery stopped because it reached the configured file limit. */
    readonly truncated: boolean,
    /** Maximum file count used by discovery; null means no explicit file limit. */
    readonly maxFiles: number | null,
  ) {}
}

/** Kernel handles produced when a source file is admitted into the active analysis world. */
export class SourceFileAdmission {
  constructor(
    /** Project key that admitted the source. */
    readonly projectKey: string,
    /** Normalized project-relative path. */
    readonly path: string,
    /** Inferred or host-supplied source language. */
    readonly language: SourceLanguage,
    /** Inferred or host-supplied source role. */
    readonly role: SourceFileRole,
    /** Source-file address handle. */
    readonly addressHandle: AddressHandle,
    /** Evidence handle that explains why this source is in the world. */
    readonly evidenceHandle: EvidenceHandle,
    /** Provenance handle for the admission record. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Booted project frame before TypeScript or Aurelia semantics are interpreted. */
export class ProjectBootFrame {
  /** Host/workspace/structural exclusions before native project configuration is composed. */
  readonly baseExcludedSourceRootDirs: readonly string[];
  /** Native project configuration captured before authored source discovery. */
  readonly projectConfiguration: ProjectConfigurationResult;
  /** One config/compiler-options product derived from this frame's captured input generation. */
  readonly compilerOptions: ProjectCompilerOptionsResult;
  /** Authored project membership; dependency resolution may still read sources outside this boundary. */
  readonly authoredSources: AuthoredSourceBoundary;
  /** Exact boot admissions indexed once by canonical physical source identity. */
  readonly sourceOwnership: ProjectSourceOwnershipIndex;
  readonly observedRevision: string;

  constructor(
    /** Workspace root that owns this project frame. */
    readonly workspaceRootDir: string,
    /** Project root directory. */
    readonly rootDir: string,
    /** Store-local project key. */
    readonly projectKey: string,
    /** Complete boot-owned cause set for admitting this project root. */
    readonly admissionOrigins: readonly ProjectRootAdmissionOrigin[],
    /** Kernel provenance that joins every project-root admission witness. */
    readonly admissionProvenanceHandle: ProvenanceHandle,
    /** Source admissions owned by this project frame. */
    readonly sourceFiles: readonly SourceFileAdmission[],
    /** Discovery result when boot discovered sources itself; null when the host supplied sources. */
    readonly sourceDiscovery: SourceDiscoveryResult | null = null,
    /** Descendant roots that do not belong to this authored project. */
    excludedSourceRoots: readonly string[],
    /** Exact source/config generation consumed by this project frame. */
    readonly inputGeneration: SemanticRuntimeProjectInputGeneration,
    projectConfiguration: ProjectConfigurationResult | null = null,
  ) {
    this.baseExcludedSourceRootDirs = new AuthoredSourceBoundary(rootDir, excludedSourceRoots).excludedRootDirs;
    this.projectConfiguration = projectConfiguration
      ?? buildProjectConfigurationResult(inputGeneration, rootDir);
    this.authoredSources = new AuthoredSourceBoundary(rootDir, [
      ...this.baseExcludedSourceRootDirs,
      ...this.projectConfiguration.excludedSourceRootDirs,
    ]);
    this.sourceOwnership = new ProjectSourceOwnershipIndex(rootDir, sourceFiles);
    this.compilerOptions = buildProjectCompilerOptionsResult(
      inputGeneration,
      rootDir,
      this.authoredSources,
    );
    this.observedRevision = projectBootFrameRevision(this);
  }

  requireCurrent(): void {
    this.inputGeneration.requireCurrent();
  }

  readRegisteredInputs(): readonly ComputationRead[] {
    return [
      ...this.projectConfiguration.readRegisteredInputs(),
      ...this.compilerOptions.readRegisteredInputs(),
    ];
  }

  /** Rebind immutable boot admissions to a newly captured source/config generation. */
  forInputGeneration(inputGeneration: SemanticRuntimeProjectInputGeneration): ProjectBootFrame {
    if (inputGeneration.projectKey !== this.projectKey || inputGeneration.rootDir !== this.inputGeneration.rootDir) {
      throw new Error(`Project-input generation ${inputGeneration.revision} does not belong to ${this.projectKey}.`);
    }
    if (inputGeneration === this.inputGeneration) {
      return this;
    }
    const projectConfiguration = buildProjectConfigurationResult(inputGeneration, this.rootDir);
    const currentAuthoredSources = new AuthoredSourceBoundary(this.rootDir, [
      ...this.baseExcludedSourceRootDirs,
      ...projectConfiguration.excludedSourceRootDirs,
    ]);
    if (!sameExcludedSourceRoots(this.authoredSources.excludedRootDirs, currentAuthoredSources.excludedRootDirs)) {
      throw new Error(
        `Aurelia project configuration changed authored source membership for '${this.projectKey}'; `
        + 'a fresh workspace boot is required.',
      );
    }
    return new ProjectBootFrame(
      this.workspaceRootDir,
      this.rootDir,
      this.projectKey,
      this.admissionOrigins,
      this.admissionProvenanceHandle,
      this.sourceFiles,
      this.sourceDiscovery,
      this.baseExcludedSourceRootDirs,
      inputGeneration,
      projectConfiguration,
    );
  }

  /** Rebind every boot-derived project fact after the shared source-world authority proved an equivalent plan. */
  forEquivalentSourceWorldProject(project: ResolvedSemanticSourceWorldProject): ProjectBootFrame {
    if (
      project.projectKey !== this.projectKey
      || canonicalTypeSystemPath(project.rootDir) !== canonicalTypeSystemPath(this.rootDir)
      || !sameProjectRootAdmissionOrigins(project.admissionOrigins, this.admissionOrigins)
      || !sameExcludedSourceRoots(project.baseExcludedSourceRootDirs, this.baseExcludedSourceRootDirs)
      || !sameExcludedSourceRoots(project.effectiveExcludedSourceRootDirs, this.authoredSources.excludedRootDirs)
      || !sameSourceWorldFiles(project.sourceFiles, this.sourceFiles)
    ) {
      throw new Error(
        `Resolved source world for '${project.projectKey}' is not equivalent to boot frame ${this.observedRevision}.`,
      );
    }
    return new ProjectBootFrame(
      this.workspaceRootDir,
      this.rootDir,
      this.projectKey,
      project.admissionOrigins,
      this.admissionProvenanceHandle,
      this.sourceFiles,
      project.sourceDiscovery,
      project.baseExcludedSourceRootDirs,
      project.inputGeneration,
      project.projectConfiguration,
    );
  }

}

function sameExcludedSourceRoots(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) =>
    canonicalTypeSystemPath(entry) === canonicalTypeSystemPath(right[index]!)
  );
}

function sameProjectRootAdmissionOrigins(
  left: readonly ProjectRootAdmissionOrigin[],
  right: readonly ProjectRootAdmissionOrigin[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    projectRootAdmissionOriginKey(entry) === projectRootAdmissionOriginKey(right[index]!));
}

function sameSourceWorldFiles(
  left: ResolvedSemanticSourceWorldProject['sourceFiles'],
  right: readonly SourceFileAdmission[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const current = right[index]!;
    return entry.path === current.path
      && entry.language === current.language
      && entry.role === current.role;
  });
}

function projectBootFrameRevision(project: ProjectBootFrame): string {
  return stableKernelLocalHash(JSON.stringify({
    workspaceRootDir: project.workspaceRootDir,
    rootDir: project.rootDir,
    projectKey: project.projectKey,
    admissionOrigins: project.admissionOrigins,
    admissionProvenanceHandle: project.admissionProvenanceHandle,
    baseExcludedSourceRoots: project.baseExcludedSourceRootDirs,
    excludedSourceRoots: project.authoredSources.excludedRootDirs,
    projectConfiguration: project.projectConfiguration.revision,
    compilerOptions: project.compilerOptions.revision,
    sourceFiles: project.sourceFiles.map((source) => ({
      path: source.path,
      language: source.language,
      role: source.role,
      addressHandle: source.addressHandle,
      evidenceHandle: source.evidenceHandle,
      provenanceHandle: source.provenanceHandle,
    })),
  }));
}

/** Booted workspace frame and the hot kernel store it populated. */
export class WorkspaceBootFrame {
  constructor(
    /** Workspace root directory. */
    readonly rootDir: string,
    /** Store-local workspace key. */
    readonly workspaceKey: string,
    /** Kernel store populated by boot. */
    readonly store: KernelStore,
    /** Project frames admitted into this workspace. */
    readonly projects: readonly ProjectBootFrame[],
    /** Sole source/config generation authority for every project in this runtime. */
    readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority,
    /** Portable resolved source-admission facts and exact topology/membership receipt used by this boot. */
    readonly sourceWorld: ResolvedSemanticSourceWorld,
  ) {}

  /** Descriptor-derived semantic workspace identity, independent from the kernel-store namespace. */
  get semanticWorkspaceKey(): string {
    return this.sourceWorld.semanticWorkspaceKey;
  }

  /** Refresh boot-static frames without publishing or replacing the warm kernel store. */
  forEquivalentSourceWorld(sourceWorld: ResolvedSemanticSourceWorld): WorkspaceBootFrame {
    if (sourceWorld.projectInputAuthority !== this.projectInputAuthority) {
      throw new Error('Cannot rebind an equivalent source world captured by another project-input authority.');
    }
    if (sourceWorld.sourceWorldRevision !== this.sourceWorld.sourceWorldRevision) {
      throw new Error(
        `Cannot rebind source world ${this.sourceWorld.sourceWorldRevision} to non-equivalent `
        + `${sourceWorld.sourceWorldRevision}; a fresh workspace boot is required.`,
      );
    }
    const projectsByKey = new Map(this.projects.map((project) => [project.projectKey, project]));
    const projects = sourceWorld.projects.map((project) => {
      const current = projectsByKey.get(project.projectKey);
      if (current == null) {
        throw new Error(`Equivalent source world is missing boot frame '${project.projectKey}'.`);
      }
      return current.forEquivalentSourceWorldProject(project);
    });
    if (projects.length !== this.projects.length) {
      throw new Error('Equivalent source world changed the number of boot project frames.');
    }
    return new WorkspaceBootFrame(
      this.rootDir,
      this.workspaceKey,
      this.store,
      projects,
      this.projectInputAuthority,
      sourceWorld,
    );
  }
}
