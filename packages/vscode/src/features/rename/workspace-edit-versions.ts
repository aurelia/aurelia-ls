import type { VscodeApi } from "../../vscode-api.js";
import type { ProtocolWorkspaceEdit } from "../../types.js";

/**
 * LSP `TextDocumentEdit` carries `textDocument.version` so a client can reject
 * stale edits. VS Code's public `WorkspaceEdit` carrier, returned from rename
 * and code-action providers, does not retain that version after
 * `vscode-languageclient` converts the protocol edit. Upstream compensates for
 * server-initiated `workspace/applyEdit` with a pre-apply validation step; for
 * provider-returned edits we must do the same before conversion.
 *
 * Provenance:
 * - LSP 3.17 `TextDocumentEdit` / `OptionalVersionedTextDocumentIdentifier`
 *   https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocumentEdit
 * - VS Code `TextDocument.version` and provider `WorkspaceEdit` APIs
 *   https://code.visualstudio.com/api/references/vscode-api
 * - vscode-languageclient 10.x `protocolConverter.asWorkspaceEdit` and
 *   `BaseLanguageClient.validateWorkspaceEdit`
 *   https://github.com/microsoft/vscode-languageserver-node
 */
export function workspaceEditVersionMismatches(
  vscode: Pick<VscodeApi, "workspace" | "Uri">,
  workspaceEdit: ProtocolWorkspaceEdit,
): string[] {
  const openDocuments = new Map(vscode.workspace.textDocuments.map((document) => [document.uri.toString(), document]));
  const mismatches: string[] = [];
  for (const change of workspaceEdit.documentChanges ?? []) {
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
  workspaceEdit: ProtocolWorkspaceEdit,
  messagePrefix: string,
): void {
  const mismatches = workspaceEditVersionMismatches(vscode, workspaceEdit);
  if (mismatches.length > 0) {
    throw new Error(`${messagePrefix}: ${mismatches.join("; ")}`);
  }
}
