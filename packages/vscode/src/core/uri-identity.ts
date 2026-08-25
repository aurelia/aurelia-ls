import { createRequire } from "node:module";
import type ts from "typescript";
import type { Uri } from "vscode";
import type { VscodeApi } from "../vscode-api.js";

const typescript = createRequire(import.meta.url)("typescript") as typeof ts;

/** Stable client-side URI identity without decoding an already parsed path a second time. */
export function documentUriIdentityKey(
  vscode: Pick<VscodeApi, "Uri">,
  input: string | Uri,
): string | null {
  try {
    const uri = typeof input === "string" ? vscode.Uri.parse(input) : input;
    const scheme = uri.scheme.toLowerCase();
    return JSON.stringify([
      scheme,
      uri.authority.toLowerCase(),
      isWorkspaceFilesystemScheme(scheme) ? canonicalWorkspaceHostPath(uri.path) : uri.path,
      uri.query,
      uri.fragment,
    ]);
  } catch {
    return null;
  }
}

export function sameDocumentUri(
  vscode: Pick<VscodeApi, "Uri">,
  left: string | Uri,
  right: string | Uri,
): boolean {
  const leftKey = documentUriIdentityKey(vscode, left);
  return leftKey != null && leftKey === documentUriIdentityKey(vscode, right);
}

/** Canonical filesystem identity shared by client workspace containment and URI comparison. */
export function canonicalWorkspaceHostPath(value: string): string {
  return typescript.sys.useCaseSensitiveFileNames ? value : value.toLowerCase();
}

function isWorkspaceFilesystemScheme(scheme: string): boolean {
  return scheme === "file" || scheme === "vscode-remote";
}
