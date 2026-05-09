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
import { ProvenanceRecord } from '../kernel/provenance.js';
import { KernelStore, KernelStoreBatch } from '../kernel/store.js';
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
  discoverSourceFiles,
  inferSourceFileRole,
  inferSourceLanguage,
} from './source-discovery.js';

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
    readonly addressHandle: ReturnType<KernelStore['handles']['address']>,
    readonly evidenceHandle: ReturnType<KernelStore['handles']['evidence']>,
    readonly provenanceHandle: ReturnType<KernelStore['handles']['provenance']>,
  ) {}
}

/** Boot one workspace into a kernel store without interpreting Aurelia semantics yet. */
export function bootWorkspace(input: BootWorkspaceInput): WorkspaceBootFrame {
  const workspaceKey = input.storeKey ?? `workspace:${input.rootDir}`;
  const store = input.store ?? new KernelStore(workspaceKey);
  const projectInputs = input.projects ?? discoverBootProjects(
    input.rootDir,
    input.projectDiscovery ?? BootProjectDiscoveryMode.PackageTsconfig,
  );
  const projects = projectInputs
    .map((project) => bootProject(store, input.rootDir, project));

  return new WorkspaceBootFrame(input.rootDir, workspaceKey, store, projects);
}

/** Boot one project frame and admit source files into the kernel. */
export function bootProject(
  store: KernelStore,
  workspaceRootDir: string,
  input: BootProjectInput,
): ProjectBootFrame {
  const projectKey = input.projectKey ?? defaultProjectKey(input.rootDir);
  const discovery: SourceDiscoveryResult | null = input.sourceFiles == null
    ? discoverSourceFiles(input.rootDir, input.sourceDiscoveryOptions)
    : null;
  const sources = input.sourceFiles ?? discovery?.sourceFiles ?? [];
  const admissions = sources.map((source) =>
    admitSourceFile(store, workspaceRootDir, input.rootDir, projectKey, source)
  );

  return new ProjectBootFrame(workspaceRootDir, input.rootDir, projectKey, admissions, discovery);
}

/** Admit one source file as an address plus evidence/provenance records. */
export function admitSourceFile(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  projectKey: string,
  source: BootSourceFileInput,
): SourceFileAdmission {
  const paths = sourceFileAdmissionPaths(workspaceRootDir, projectRootDir, source);
  const handles = sourceFileAdmissionHandles(store, projectKey, paths.projectPath);
  store.commit(new KernelStoreBatch(
    recordsForSourceFileAdmission(projectKey, source, paths, handles),
    `boot-source:${projectKey}:${paths.projectPath}`,
  ));

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
  store: KernelStore,
  projectKey: string,
  path: string,
): SourceFileAdmissionHandles {
  return new SourceFileAdmissionHandles(
    store.handles.address(sourceLocalKey(projectKey, path)),
    store.handles.evidence(evidenceLocalKey(projectKey, path)),
    store.handles.provenance(provenanceLocalKey(projectKey, path)),
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
