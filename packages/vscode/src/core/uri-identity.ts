import type { Uri } from "vscode";
import type { VscodeApi } from "../vscode-api.js";

/** Stable client-side URI identity without decoding an already parsed path a second time. */
export function documentUriIdentityKey(
  vscode: Pick<VscodeApi, "Uri">,
  input: string | Uri,
): string | null {
  try {
    const uri = typeof input === "string" ? vscode.Uri.parse(input) : input;
    return JSON.stringify([
      uri.scheme.toLowerCase(),
      uri.authority.toLowerCase(),
      uri.path,
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
