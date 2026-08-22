import {
  join,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import {
  SourceFileAddress,
  type SourceFileRole,
} from '../kernel/address.js';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../kernel/evidence.js';
import type { AddressHandle, EvidenceHandle, ProvenanceHandle } from '../kernel/handles.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
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
  type BootProjectInput,
  type ResolvedBootProjectInput,
  type BootSourceFileInput,
  type BootWorkspaceInput,
} from './frames.js';
import {
  inferSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import {
  isProjectRootMarkerAdmissionOrigin,
  projectRootAdmissionOriginKey,
  ProjectRootAdmissionOriginKind,
  type ProjectRootAdmissionOrigin,
} from './project-root-admission.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import {
  resolveSemanticSourceWorld,
  resolveSemanticSourceWorldProject,
  type ResolvedSemanticSourceWorld,
  type ResolvedSemanticSourceWorldProject,
} from './source-world.js';
import { workspaceSourcePathForHostPath } from './source-path.js';

function normalizePathForProject(rootDir: string, path: string): string {
  const normalized = isAbsolute(path)
    ? relative(rootDir, path)
    : path;
  return normalized.replace(/\\/g, '/');
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

function projectAdmissionProvenanceLocalKey(projectKey: string): string {
  return `project-root-admission:${projectKey}`;
}

function projectAdmissionEvidenceLocalKey(
  projectRootDir: string,
  projectKey: string,
  origin: ProjectRootAdmissionOrigin,
): string {
  return `project-root-admission:${projectKey}:${stableKernelLocalHash([
    canonicalTypeSystemPath(projectRootDir),
    projectRootAdmissionOriginKey(origin),
  ].join('|'))}`;
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
  const sourceWorld = resolveSemanticSourceWorld(input);
  return bootWorkspaceFromSourceWorld(sourceWorld, input.storeKey, input.store);
}

/** Publish one already-resolved semantic source world without repeating discovery or configuration reads. */
export function bootWorkspaceFromSourceWorld(
  sourceWorld: ResolvedSemanticSourceWorld,
  storeKey?: string,
  existingStore?: KernelStore,
): WorkspaceBootFrame {
  const workspaceKey = storeKey ?? `workspace:${sourceWorld.descriptor.workspaceRoot}`;
  const store = existingStore ?? new KernelStore(workspaceKey);
  const projects = sourceWorld.projects.map((project) =>
    publishResolvedSourceWorldProject(store, sourceWorld.descriptor.workspaceRoot, project));
  return new WorkspaceBootFrame(
    sourceWorld.descriptor.workspaceRoot,
    workspaceKey,
    store,
    projects,
    sourceWorld.projectInputAuthority,
    sourceWorld,
  );
}

/** Boot one project frame and admit source files into the kernel. */
export function bootProject(
  store: KernelStore,
  workspaceRootDir: string,
  input: BootProjectInput | ResolvedBootProjectInput,
  projectInputAuthority: SemanticRuntimeProjectInputAuthority = new SemanticRuntimeProjectInputAuthority(),
): ProjectBootFrame {
  const resolvedInput: ResolvedBootProjectInput = 'admissionOrigins' in input
    ? input
    : {
        ...input,
        admissionOrigins: [{ kind: ProjectRootAdmissionOriginKind.ExplicitProject }],
      };
  const project = resolveSemanticSourceWorldProject(
    workspaceRootDir,
    resolvedInput,
    projectInputAuthority,
  );
  return publishResolvedSourceWorldProject(store, workspaceRootDir, project);
}

function publishResolvedSourceWorldProject(
  store: KernelStore,
  workspaceRootDir: string,
  project: ResolvedSemanticSourceWorldProject,
): ProjectBootFrame {
  const admissions = project.sourceFiles.map((source) =>
    admitSourceFile(store, workspaceRootDir, project.rootDir, project.projectKey, source)
  );
  const admissionProvenanceHandle = publishProjectRootAdmission(
    store,
    project.rootDir,
    project.projectKey,
    project.admissionOrigins,
    admissions,
  );

  return new ProjectBootFrame(
    workspaceRootDir,
    project.rootDir,
    project.projectKey,
    project.admissionOrigins,
    admissionProvenanceHandle,
    admissions,
    project.sourceDiscovery,
    project.baseExcludedSourceRootDirs,
    project.inputGeneration,
    project.projectConfiguration,
  );
}

function publishProjectRootAdmission(
  publication: KernelPublicationContext,
  projectRootDir: string,
  projectKey: string,
  origins: readonly ProjectRootAdmissionOrigin[],
  sourceFiles: readonly SourceFileAdmission[],
): ProvenanceHandle {
  if (origins.length === 0) {
    throw new Error(`Project '${projectKey}' has no project-root admission origin.`);
  }
  const provenanceHandle = publication.handles.provenance(projectAdmissionProvenanceLocalKey(projectKey));
  const evidenceHandles = origins.map((origin) =>
    publication.handles.evidence(projectAdmissionEvidenceLocalKey(projectRootDir, projectKey, origin)));
  const existing = publication.read(provenanceHandle);
  if (existing != null) {
    if (
      existing.kind === 'provenance-record'
      && existing.evidenceHandles.length === evidenceHandles.length
      && existing.evidenceHandles.every((handle, index) => handle === evidenceHandles[index])
    ) {
      return provenanceHandle;
    }
    throw new Error(
      `Kernel store already contains a different project-root admission for '${projectKey}'; a fresh workspace boot is required.`,
    );
  }
  const evidence = origins.map((origin, index) => new EvidenceRecord(
    evidenceHandles[index]!,
    projectRootAdmissionEvidenceKind(origin),
    [EvidenceRole.Admission],
    projectRootAdmissionEvidenceSummary(projectRootDir, origin),
    projectRootAdmissionSourceAddress(projectRootDir, origin, sourceFiles),
  ));
  publication.publish(new KernelPublicationPlan(new KernelStoreBatch(
    [
      ...evidence,
      new ProvenanceRecord(provenanceHandle, evidenceHandles),
    ],
    `project-root-admission:${projectKey}`,
  )));
  return provenanceHandle;
}

function projectRootAdmissionEvidenceKind(origin: ProjectRootAdmissionOrigin): EvidenceKind {
  if (isProjectRootMarkerAdmissionOrigin(origin)) {
    return EvidenceKind.SourceObservation;
  }
  return origin.kind === ProjectRootAdmissionOriginKind.WorkspaceRootFallback
    ? EvidenceKind.SemanticObservation
    : EvidenceKind.External;
}

function projectRootAdmissionEvidenceSummary(
  projectRootDir: string,
  origin: ProjectRootAdmissionOrigin,
): string {
  switch (origin.kind) {
    case ProjectRootAdmissionOriginKind.ExplicitProject:
      return `Project root '${projectRootDir}' was supplied through the explicit projects input.`;
    case ProjectRootAdmissionOriginKind.SingleRoot:
      return `Project root '${projectRootDir}' was admitted by single-root discovery policy.`;
    case ProjectRootAdmissionOriginKind.WorkspaceRootFallback:
      return `Workspace root '${projectRootDir}' was retained because ordinary project-marker discovery found no roots.`;
    case ProjectRootAdmissionOriginKind.HostProjectRootHint:
      return `Project root '${projectRootDir}' was supplied as an existing host project-root hint.`;
    case ProjectRootAdmissionOriginKind.PackageJsonMarker:
    case ProjectRootAdmissionOriginKind.TsconfigJsonMarker:
    case ProjectRootAdmissionOriginKind.JsconfigJsonMarker:
    case ProjectRootAdmissionOriginKind.AureliaProjectJsonMarker:
      return origin.viaProjectRootHintDir == null
        ? `Project root '${projectRootDir}' was admitted from exact marker '${origin.sourceFilePath}'.`
        : `Project root '${projectRootDir}' was admitted from exact marker '${origin.sourceFilePath}' after traversal restarted at host hint '${origin.viaProjectRootHintDir}'.`;
  }
}

function projectRootAdmissionSourceAddress(
  projectRootDir: string,
  origin: ProjectRootAdmissionOrigin,
  sourceFiles: readonly SourceFileAdmission[],
): AddressHandle | null {
  if (!isProjectRootMarkerAdmissionOrigin(origin)) {
    return null;
  }
  const markerIdentity = canonicalTypeSystemPath(origin.sourceFilePath);
  return sourceFiles.find((source) =>
    canonicalTypeSystemPath(resolve(projectRootDir, source.path)) === markerIdentity
  )?.addressHandle ?? null;
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
  const sourceHostPath = isAbsolute(source.path)
    ? source.path
    : join(projectRootDir, projectPath);
  const workspacePath = workspaceSourcePathForHostPath(workspaceRootDir, sourceHostPath);
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
