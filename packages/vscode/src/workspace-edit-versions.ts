import type { VscodeApi } from "./vscode-api.js";
import type { WorkspaceEdit } from "vscode-languageclient/node";

/**
 * LSP `TextDocumentEdit` carries `textDocument.version`; VS Code's public
 * `WorkspaceEdit` does not retain it after protocol conversion.
 *
 * vscode-languageclient 10.1 validates standard rename responses after
 * conversion and validates server-initiated `workspace/applyEdit` immediately
 * before application. Custom edit composition and code-action resolution must
 * perform the same check themselves, after their final asynchronous conversion
 * and before returning or merging the converted edit.
 *
 * Provenance:
 * - LSP 3.17 `TextDocumentEdit` / `OptionalVersionedTextDocumentIdentifier`
 *   https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocumentEdit
 * - VS Code `TextDocument.version`, `CodeAction`, and `WorkspaceEdit`
 *   https://code.visualstudio.com/api/references/vscode-api
 * - vscode-languageclient 10.1 `RenameFeature`, `CodeActionFeature`, and
 *   `BaseLanguageClient.validateWorkspaceEdit`
 *   https://github.com/microsoft/vscode-languageserver-node
 */
export function workspaceEditVersionMismatches(
  vscode: Pick<VscodeApi, "workspace" | "Uri">,
  workspaceEdit: WorkspaceEdit,
): string[] {
  const openDocuments = new Map(vscode.workspace.textDocuments.map((document) => [document.uri.toString(), document]));
  const mismatches: string[] = [];
  for (const change of workspaceEdit.documentChanges ?? []) {
    if (!("textDocument" in change)) {
      continue;
    }
    const version = change.textDocument.version;
    if (version == null || version < 0) {
      continue;
    }
    const uri = vscode.Uri.parse(change.textDocument.uri).toString();
    const document = openDocuments.get(uri);
    if (document != null && document.version !== version) {
      mismatches.push(`${uri} expected version ${version} but editor has ${document.version}`);
    }
  }
  return mismatches;
}

export function assertWorkspaceEditVersionsCurrent(
  vscode: Pick<VscodeApi, "workspace" | "Uri">,
  workspaceEdit: WorkspaceEdit,
  messagePrefix: string,
): void {
  const mismatches = workspaceEditVersionMismatches(vscode, workspaceEdit);
  if (mismatches.length > 0) {
    throw new Error(`${messagePrefix}: ${mismatches.join("; ")}`);
  }
}
