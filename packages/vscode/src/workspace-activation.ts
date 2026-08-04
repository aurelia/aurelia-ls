import path from "node:path";
import type { TextDocument, Uri, WorkspaceFolder } from "vscode";
import type { WorkspaceStatusResponse } from "@aurelia-ls/language-server/protocol";
import type { VscodeApi } from "./vscode-api.js";
import { documentUriIdentityKey, sameDocumentUri } from "./core/uri-identity.js";

export const enum AureliaActivationMode {
  /** Admit cheap Aurelia candidates, then require semantic-runtime project-shape confirmation. */
  Auto = "auto",
  /** Retain a workspace session even when automatic project-shape confirmation is unavailable. */
  On = "on",
  /** Exclude this workspace-folder subtree from Aurelia tooling. */
  Off = "off",
}

export const enum WorkspaceActivationEvidenceKind {
  ExplicitOverride = "explicit-override",
  PackageManifest = "package-manifest",
  NativeProjectConfiguration = "native-project-configuration",
  OpenSourceDocument = "open-source-document",
}

export interface WorkspaceActivationAdmission {
  readonly folder: WorkspaceFolder;
  readonly mode: AureliaActivationMode;
  readonly evidence: WorkspaceActivationEvidenceKind;
  readonly nativeProjectConfigurationUris: readonly Uri[];
}

/** Resource-scoped activation modes interpreted as one non-overlapping workspace topology. */
export class WorkspaceActivationTopology {
  readonly disabledFolders: readonly WorkspaceFolder[];
  private readonly modesByFolderKey: ReadonlyMap<string, AureliaActivationMode>;

  constructor(
    readonly folders: readonly WorkspaceFolder[],
    readMode: (folder: WorkspaceFolder) => AureliaActivationMode,
  ) {
    this.modesByFolderKey = new Map(folders.map((folder) => [workspaceFolderKey(folder), readMode(folder)]));
    this.disabledFolders = orderWorkspaceFolders(
      folders.filter((folder) => this.modeFor(folder) === AureliaActivationMode.Off),
    );
  }

  modeFor(folder: WorkspaceFolder): AureliaActivationMode {
    return this.modesByFolderKey.get(workspaceFolderKey(folder)) ?? AureliaActivationMode.Auto;
  }

  isDisabled(uri: Uri): boolean {
    return this.disabledFolders.some((folder) => workspaceFolderContainsUri(folder, uri));
  }

  owningFolder(uri: Uri): WorkspaceFolder | undefined {
    return [...this.folders]
      .filter((folder) => workspaceFolderContainsUri(folder, uri))
      .sort((left, right) => workspacePathLength(right) - workspacePathLength(left))[0];
  }

  excludedFoldersFor(owner: WorkspaceFolder): readonly WorkspaceFolder[] {
    const descendants = this.disabledFolders.filter((folder) =>
      workspaceFolderKey(folder) !== workspaceFolderKey(owner)
      && workspaceFolderContainsUri(owner, folder.uri)
    );
    const outermost: WorkspaceFolder[] = [];
    for (const folder of descendants) {
      if (outermost.some((candidate) => workspaceFolderContainsUri(candidate, folder.uri))) {
        continue;
      }
      outermost.push(folder);
    }
    return outermost;
  }

  /** Enabled workspace roots offered as topology evidence to the owner's shared semantic runtime. */
  projectRootHintFoldersFor(owner: WorkspaceFolder): readonly WorkspaceFolder[] {
    return orderWorkspaceFolders(this.folders.filter((folder) =>
      workspaceFolderContainsUri(owner, folder.uri)
      && !this.isDisabled(folder.uri)
    ));
  }
}

export function readWorkspaceActivationTopology(vscode: VscodeApi): WorkspaceActivationTopology {
  return new WorkspaceActivationTopology(
    vscode.workspace.workspaceFolders ?? [],
    (folder) => readWorkspaceActivationMode(vscode, folder),
  );
}

const PACKAGE_MANIFEST_GLOB = "**/package.json";
const NATIVE_PROJECT_CONFIGURATION_GLOB = "**/aurelia.project.json";
const PACKAGE_MANIFEST_EXCLUDE_GLOB = "**/{node_modules,dist,out,coverage,.git}/**";
const PACKAGE_MANIFEST_EXCLUDED_DIRECTORIES = new Set(["node_modules", "dist", "out", "coverage", ".git"]);
const AURELIA_FACADE_IMPORT = /(?:from\s*|import\s*(?:\(\s*)?|require\s*\()\s*["'](?:aurelia|@aurelia\/runtime-html)["']/;
const SOURCE_LANGUAGE_IDS = new Set([
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
]);

export async function readWorkspaceActivationAdmission(
  vscode: VscodeApi,
  folder: WorkspaceFolder,
  excludedFolders: readonly WorkspaceFolder[] = [],
): Promise<WorkspaceActivationAdmission | null> {
  const mode = readWorkspaceActivationMode(vscode, folder);
  if (mode === AureliaActivationMode.Off) {
    return null;
  }
  if (mode === AureliaActivationMode.On) {
    return {
      folder,
      mode,
      evidence: WorkspaceActivationEvidenceKind.ExplicitOverride,
      nativeProjectConfigurationUris: [],
    };
  }
  const nativeProjectConfigurationUris = await readWorkspaceNativeProjectConfigurationUris(
    vscode,
    folder,
    excludedFolders,
  );
  if (nativeProjectConfigurationUris.length > 0) {
    return {
      folder,
      mode,
      evidence: WorkspaceActivationEvidenceKind.NativeProjectConfiguration,
      nativeProjectConfigurationUris,
    };
  }
  if (await workspaceHasAureliaManifest(vscode, folder)) {
    return {
      folder,
      mode,
      evidence: WorkspaceActivationEvidenceKind.PackageManifest,
      nativeProjectConfigurationUris,
    };
  }
  if (workspaceHasOpenAureliaSource(vscode, folder)) {
    return {
      folder,
      mode,
      evidence: WorkspaceActivationEvidenceKind.OpenSourceDocument,
      nativeProjectConfigurationUris,
    };
  }
  return null;
}

export function readWorkspaceActivationMode(
  vscode: VscodeApi,
  folder: WorkspaceFolder,
): AureliaActivationMode {
  const value = vscode.workspace
    .getConfiguration("aurelia", folder.uri)
    .get<unknown>("activationMode", AureliaActivationMode.Auto);
  return value === AureliaActivationMode.On || value === AureliaActivationMode.Off
    ? value
    : AureliaActivationMode.Auto;
}

export function workspaceStatusConfirmsSessionRetention(
  vscode: Pick<VscodeApi, "Uri">,
  status: WorkspaceStatusResponse | null,
  nativeProjectConfigurationUris: readonly Uri[],
): boolean {
  if (status?.projectAnalysisCounts.some((row) =>
    row.analysisKind !== "outside-aurelia" && row.count > 0
  ) === true) {
    return true;
  }
  return status?.nativeProjectConfigurations.rows.some((configuration) =>
    nativeProjectConfigurationUris.some((candidate) =>
      sameDocumentUri(vscode, configuration.sourceUri, candidate)
    )
  ) === true;
}

export function orderWorkspaceAdmissions(
  admissions: readonly WorkspaceActivationAdmission[],
): readonly WorkspaceActivationAdmission[] {
  return [...admissions].sort((left, right) =>
    workspacePathLength(left.folder) - workspacePathLength(right.folder)
    || left.folder.uri.toString().localeCompare(right.folder.uri.toString())
  );
}

function orderWorkspaceFolders(folders: readonly WorkspaceFolder[]): readonly WorkspaceFolder[] {
  return [...folders].sort((left, right) =>
    workspacePathLength(left) - workspacePathLength(right)
    || left.uri.toString().localeCompare(right.uri.toString())
  );
}

export function workspaceFolderContainsUri(folder: WorkspaceFolder, uri: Uri): boolean {
  if (folder.uri.scheme !== uri.scheme) {
    return false;
  }
  const folderAuthority = (folder.uri as Uri & { authority?: string }).authority ?? "";
  const uriAuthority = (uri as Uri & { authority?: string }).authority ?? "";
  if (folderAuthority !== uriAuthority) {
    return false;
  }
  const folderPath = process.platform === "win32" ? folder.uri.fsPath.toLowerCase() : folder.uri.fsPath;
  const uriPath = process.platform === "win32" ? uri.fsPath.toLowerCase() : uri.fsPath;
  const relative = path.relative(folderPath, uriPath);
  return relative === ""
    || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function workspaceFolderKey(folder: WorkspaceFolder): string {
  return folder.uri.toString();
}

/** True for an authored project manifest below one exact workspace folder. */
export function isWorkspaceProjectManifestUri(folder: WorkspaceFolder, uri: Uri): boolean {
  const segments = workspaceRelativeUriSegments(folder, uri);
  if (segments == null) return false;
  return segments.at(-1) === "package.json"
    && segments.slice(0, -1).every((segment) => !PACKAGE_MANIFEST_EXCLUDED_DIRECTORIES.has(segment));
}

/** True for an exact native Aurelia project config outside generated/dependency trees. */
export function isWorkspaceNativeProjectConfigurationUri(folder: WorkspaceFolder, uri: Uri): boolean {
  const segments = workspaceRelativeUriSegments(folder, uri);
  if (segments == null) return false;
  return segments.at(-1) === "aurelia.project.json"
    && segments.slice(0, -1).every((segment) => !PACKAGE_MANIFEST_EXCLUDED_DIRECTORIES.has(segment));
}

/** Topology files whose global activation watcher is the sole client-to-server delivery owner. */
export function isWorkspaceActivationTopologyUri(folder: WorkspaceFolder, uri: Uri): boolean {
  return isWorkspaceProjectManifestUri(folder, uri)
    || isWorkspaceNativeProjectConfigurationUri(folder, uri);
}

/** Deepest enabled workspace root whose lifecycle watcher owns this topology event. */
export function globalActivationTopologyOwner(
  topology: WorkspaceActivationTopology,
  uri: Uri,
): WorkspaceFolder | null {
  if (topology.isDisabled(uri)) return null;
  const folder = topology.owningFolder(uri);
  return folder != null && isWorkspaceActivationTopologyUri(folder, uri)
    ? folder
    : null;
}

function workspacePathLength(folder: WorkspaceFolder): number {
  return path.resolve(folder.uri.fsPath).length;
}

function workspaceRelativeUriSegments(folder: WorkspaceFolder, uri: Uri): readonly string[] | null {
  if (!workspaceFolderContainsUri(folder, uri)) return null;
  return path.relative(folder.uri.fsPath, uri.fsPath)
    .split(/[\\/]/u)
    .filter((segment) => segment.length > 0)
    .map((segment) => process.platform === "win32" ? segment.toLowerCase() : segment);
}

async function workspaceHasAureliaManifest(vscode: VscodeApi, folder: WorkspaceFolder): Promise<boolean> {
  const manifests = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, PACKAGE_MANIFEST_GLOB),
    new vscode.RelativePattern(folder, PACKAGE_MANIFEST_EXCLUDE_GLOB),
  );
  for (const manifestUri of manifests) {
    try {
      const bytes = await vscode.workspace.fs.readFile(manifestUri);
      const manifest = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
      if (manifestDeclaresAurelia(manifest)) {
        return true;
      }
    } catch {
      // Malformed or transient manifests are not activation proof; semantic diagnostics own their reporting.
    }
  }
  return false;
}

async function readWorkspaceNativeProjectConfigurationUris(
  vscode: VscodeApi,
  folder: WorkspaceFolder,
  excludedFolders: readonly WorkspaceFolder[],
): Promise<readonly Uri[]> {
  // Presence is cheap activation evidence only. Parsing and validity belong to
  // semantic-runtime so the client cannot become a second config authority.
  const diskConfigurations = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, NATIVE_PROJECT_CONFIGURATION_GLOB),
    new vscode.RelativePattern(folder, PACKAGE_MANIFEST_EXCLUDE_GLOB),
  );
  const openConfigurations = vscode.workspace.textDocuments
    .map((document) => document.uri)
    .filter((uri) => isWorkspaceNativeProjectConfigurationUri(folder, uri));
  const configurations = [...openConfigurations, ...diskConfigurations]
    .filter((uri) => isWorkspaceNativeProjectConfigurationUri(folder, uri))
    .filter((uri) => !excludedFolders.some((excluded) => workspaceFolderContainsUri(excluded, uri)));
  const byIdentity = new Map<string, Uri>();
  for (const uri of configurations) {
    const key = documentUriIdentityKey(vscode, uri);
    if (key != null && !byIdentity.has(key)) {
      byIdentity.set(key, uri);
    }
  }
  return [...byIdentity.values()].sort((left, right) => left.toString().localeCompare(right.toString()));
}

function manifestDeclaresAurelia(manifest: unknown): boolean {
  if (manifest == null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return false;
  }
  const record = manifest as Record<string, unknown>;
  return ["dependencies", "peerDependencies", "devDependencies"].some((field) => {
    const dependencies = record[field];
    return dependencies != null
      && typeof dependencies === "object"
      && !Array.isArray(dependencies)
      && Object.keys(dependencies).some(isAureliaPackageName);
  });
}

function isAureliaPackageName(name: string): boolean {
  return name === "aurelia" || name.startsWith("@aurelia/");
}

function workspaceHasOpenAureliaSource(vscode: VscodeApi, folder: WorkspaceFolder): boolean {
  return vscode.workspace.textDocuments.some((document) =>
    isCandidateSourceDocument(document)
    && workspaceFolderContainsUri(folder, document.uri)
    && AURELIA_FACADE_IMPORT.test(document.getText())
  );
}

function isCandidateSourceDocument(document: TextDocument): boolean {
  return document.uri.scheme !== "untitled" && SOURCE_LANGUAGE_IDS.has(document.languageId);
}
