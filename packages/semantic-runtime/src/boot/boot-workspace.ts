import {
  join,
  isAbsolute,
  relative,
} from 'node:path';
import {
  SourceFileAddress,
  type SourceFileRole,
} from '../kernel/address.js';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../kernel/evidence.js';
import type { AddressHandle, EvidenceHandle, ProvenanceHandle } from '../kernel/handles.js';
import { KernelPublicationPlan, type KernelPublicationContext } from '../kernel/publication.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import { KernelStore, KernelStoreBatch } from '../kernel/store.js';
import {
  SemanticRuntimeProjectInputAuthority,
} from '../kernel/project-input.js';
import {
  ProjectBootFrame,
  SourceFileAdmission,
  WorkspaceBootFrame,
  BootProjectDiscoveryMode,
  type BootProjectInput,
  type BootSourceFileInput,
  type BootWorkspaceInput,
  type SourceDiscoveryResult,
} from './frames.js';
import { discoverBootProjects } from './project-discovery.js';
import {
  inferSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import { discoverSourceFiles } from './source-discovery.js';
import { isHostPathWithin } from './host-files.js';
import {
  AuthoredSourceBoundary,
  authoredSourceExclusionsWithin,
} from './source-boundary.js';

function normalizePathForProject(rootDir: string, path: string): string {
  const normalized = isAbsolute(path)
    ? relative(rootDir, path)
    : path;
  return normalized.replace(/\\/g, '/');
}

function defaultProjectKey(rootDir: string): string {
  const parts = rootDir.split(/[\\/]/);
  return parts.at(-1) || 'project';
}

function sourceLocalKey(projectKey: string, path: string): string {
  return `source-file:${projectKey}:${path}`;
}

function evidenceLocalKey(projectKey: string, path: string): string {
  return `source-admission:${projectKey}:${path}`;
}

function provenanceLocalKey(projectKey: string, path: string): string {
  return `source-admission:${projectKey}:${path}`;
}

class SourceFileAdmissionPaths {
  constructor(
    readonly projectPath: string,
    readonly workspacePath: string,
    readonly language: ReturnType<typeof inferSourceLanguage>,
    readonly role: SourceFileRole,
  ) {}
}

class SourceFileAdmissionHandles {
  constructor(
    readonly addressHandle: AddressHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Boot one workspace into a kernel store without interpreting Aurelia semantics yet. */
export function bootWorkspace(input: BootWorkspaceInput): WorkspaceBootFrame {
  const workspaceKey = input.storeKey ?? `workspace:${input.rootDir}`;
  const store = input.store ?? new KernelStore(workspaceKey);
  const projectInputAuthority = input.projectInputAuthority ?? new SemanticRuntimeProjectInputAuthority();
  const workspaceBoundary = new AuthoredSourceBoundary(input.rootDir, input.excludedWorkspaceRoots);
  const projectInputs = input.projects == null
    ? discoverBootProjects(
        input.rootDir,
        projectInputAuthority.host,
        input.projectDiscovery ?? BootProjectDiscoveryMode.PackageTsconfig,
        workspaceBoundary.excludedRootDirs,
      )
    : input.projects.map((project) => projectInputWithinWorkspaceBoundary(project, workspaceBoundary));
  assertUniqueProjectKeys(projectInputs);
  const projects = projectInputs
    .map((project) => bootProject(store, input.rootDir, project, projectInputAuthority));

  return new WorkspaceBootFrame(input.rootDir, workspaceKey, store, projects, projectInputAuthority);
}

function assertUniqueProjectKeys(projects: readonly BootProjectInput[]): void {
  const rootsByKey = new Map<string, string>();
  for (const project of projects) {
    const projectKey = project.projectKey ?? defaultProjectKey(project.rootDir);
    const existingRoot = rootsByKey.get(projectKey) ?? null;
    if (existingRoot != null) {
      throw new Error(
        `Cannot boot projects '${existingRoot}' and '${project.rootDir}' with duplicate project key '${projectKey}'.`,
      );
    }
    rootsByKey.set(projectKey, project.rootDir);
  }
}

/** Boot one project frame and admit source files into the kernel. */
export function bootProject(
  store: KernelStore,
  workspaceRootDir: string,
  input: BootProjectInput,
  projectInputAuthority: SemanticRuntimeProjectInputAuthority = new SemanticRuntimeProjectInputAuthority(),
): ProjectBootFrame {
  const projectKey = input.projectKey ?? defaultProjectKey(input.rootDir);
  const inputGeneration = projectInputAuthority.capture({ projectKey, rootDir: input.rootDir });
  const authoredSources = new AuthoredSourceBoundary(input.rootDir, input.excludedSourceRoots);
  const discovery: SourceDiscoveryResult | null = input.sourceFiles == null
    ? discoverSourceFiles(inputGeneration.host, input.rootDir, authoredSources, input.sourceDiscoveryOptions)
    : null;
  const sources = (input.sourceFiles ?? discovery?.sourceFiles ?? [])
    .filter((source) => authoredSources.contains(source.path));
  const admissions = sources.map((source) =>
    admitSourceFile(store, workspaceRootDir, input.rootDir, projectKey, source)
  );

  return new ProjectBootFrame(
    workspaceRootDir,
    input.rootDir,
    projectKey,
    admissions,
    discovery,
    authoredSources.excludedRootDirs,
    inputGeneration,
  );
}

function projectInputWithinWorkspaceBoundary(
  project: BootProjectInput,
  workspaceBoundary: AuthoredSourceBoundary,
): BootProjectInput {
  if (isHostPathWithin(project.rootDir, workspaceBoundary.rootDir) && !workspaceBoundary.contains(project.rootDir)) {
    throw new Error(`Explicit project root '${project.rootDir}' is excluded from workspace '${workspaceBoundary.rootDir}'.`);
  }
  return {
    ...project,
    excludedSourceRoots: [
      ...(project.excludedSourceRoots ?? []),
      ...authoredSourceExclusionsWithin(project.rootDir, workspaceBoundary.excludedRootDirs),
    ],
  };
}

/** Admit one source file as an address plus evidence/provenance records. */
export function admitSourceFile(
  publication: KernelPublicationContext,
  workspaceRootDir: string,
  projectRootDir: string,
  projectKey: string,
  source: BootSourceFileInput,
): SourceFileAdmission {
  const paths = sourceFileAdmissionPaths(workspaceRootDir, projectRootDir, source);
  const handles = sourceFileAdmissionHandles(publication, projectKey, paths.projectPath);
  const existing = existingSourceFileAdmission(publication, projectKey, paths, handles);
  if (existing != null) {
    return existing;
  }
  publication.publish(new KernelPublicationPlan(new KernelStoreBatch(
    recordsForSourceFileAdmission(projectKey, source, paths, handles),
    `source-admission:${projectKey}:${paths.projectPath}`,
  )));
  return sourceFileAdmission(projectKey, paths, handles);
}

function existingSourceFileAdmission(
  publication: KernelPublicationContext,
  projectKey: string,
  paths: SourceFileAdmissionPaths,
  handles: SourceFileAdmissionHandles,
): SourceFileAdmission | null {
  const existing = publication.read(handles.addressHandle);
  return existing?.kind === 'source-file-address'
    ? sourceFileAdmission(projectKey, new SourceFileAdmissionPaths(
      paths.projectPath,
      paths.workspacePath,
      existing.language,
      existing.role,
    ), handles)
    : null;
}

function sourceFileAdmission(
  projectKey: string,
  paths: SourceFileAdmissionPaths,
  handles: SourceFileAdmissionHandles,
): SourceFileAdmission {
  return new SourceFileAdmission(
    projectKey,
    paths.projectPath,
    paths.language,
    paths.role,
    handles.addressHandle,
    handles.evidenceHandle,
    handles.provenanceHandle,
  );
}

function sourceFileAdmissionPaths(
  workspaceRootDir: string,
  projectRootDir: string,
  source: BootSourceFileInput,
): SourceFileAdmissionPaths {
  const projectPath = normalizePathForProject(projectRootDir, source.path);
  const language = source.language ?? inferSourceLanguage(projectPath);
  const role = source.role ?? inferSourceFileRole(projectPath);
  const workspacePath = normalizePathForProject(workspaceRootDir, isAbsolute(source.path)
    ? source.path
    : join(projectRootDir, projectPath));
  return new SourceFileAdmissionPaths(projectPath, workspacePath, language, role);
}

function sourceFileAdmissionHandles(
  publication: KernelPublicationContext,
  projectKey: string,
  path: string,
): SourceFileAdmissionHandles {
  return new SourceFileAdmissionHandles(
    publication.handles.address(sourceLocalKey(projectKey, path)),
    publication.handles.evidence(evidenceLocalKey(projectKey, path)),
    publication.handles.provenance(provenanceLocalKey(projectKey, path)),
  );
}

function recordsForSourceFileAdmission(
  projectKey: string,
  source: BootSourceFileInput,
  paths: SourceFileAdmissionPaths,
  handles: SourceFileAdmissionHandles,
): readonly (SourceFileAddress | EvidenceRecord | ProvenanceRecord)[] {
  return [
    new SourceFileAddress(
      handles.addressHandle,
      projectKey,
      paths.workspacePath,
      paths.language,
      paths.role,
    ),
    new EvidenceRecord(
      handles.evidenceHandle,
      EvidenceKind.SourceObservation,
      [EvidenceRole.Admission],
      source.note ?? `Source file admitted during boot as ${paths.role}.`,
      handles.addressHandle,
    ),
    new ProvenanceRecord(
      handles.provenanceHandle,
      [handles.evidenceHandle],
    ),
  ];
}
