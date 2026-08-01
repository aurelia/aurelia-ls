import path from "node:path";
import type { TextDocument, Uri, WorkspaceFolder } from "vscode";
import type { WorkspaceStatusResponse } from "@aurelia-ls/language-server/protocol";
import type { VscodeApi } from "./vscode-api.js";

export const enum AureliaActivationMode {
  /** Admit cheap Aurelia candidates, then require semantic-runtime project-shape confirmation. */
  Auto = "auto",
  /** Retain a workspace session even when automatic project-shape confirmation is unavailable. */
  On = "on",
  /** Do not create a language-server session for this workspace ownership root. */
  Off = "off",
}

export const enum WorkspaceActivationEvidenceKind {
  ExplicitOverride = "explicit-override",
  PackageManifest = "package-manifest",
  OpenSourceDocument = "open-source-document",
}

export interface WorkspaceActivationAdmission {
  readonly folder: WorkspaceFolder;
  readonly mode: AureliaActivationMode;
  readonly evidence: WorkspaceActivationEvidenceKind;
}

const PACKAGE_MANIFEST_GLOB = "**/package.json";
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
): Promise<WorkspaceActivationAdmission | null> {
  const mode = readWorkspaceActivationMode(vscode, folder);
  if (mode === AureliaActivationMode.Off) {
    return null;
  }
  if (mode === AureliaActivationMode.On) {
    return { folder, mode, evidence: WorkspaceActivationEvidenceKind.ExplicitOverride };
  }
  if (await workspaceHasAureliaManifest(vscode, folder)) {
    return { folder, mode, evidence: WorkspaceActivationEvidenceKind.PackageManifest };
  }
  if (workspaceHasOpenAureliaSource(vscode, folder)) {
    return { folder, mode, evidence: WorkspaceActivationEvidenceKind.OpenSourceDocument };
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

export function workspaceStatusConfirmsAurelia(status: WorkspaceStatusResponse | null): boolean {
  return status?.value.projectAnalysisCounts.some((row) =>
    row.analysisKind !== "outside-aurelia" && row.count > 0
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

/** True for authored workspace/project manifests that may change project shape. */
export function isWorkspaceProjectManifestUri(uri: Uri): boolean {
  const segments = uri.path.toLowerCase().split("/").filter(Boolean);
  return segments.at(-1) === "package.json"
    && segments.every((segment) => !PACKAGE_MANIFEST_EXCLUDED_DIRECTORIES.has(segment));
}

function workspacePathLength(folder: WorkspaceFolder): number {
  return path.resolve(folder.uri.fsPath).length;
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
