import { realpath } from "node:fs/promises";
import path from "node:path";
import {
  AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA,
  aureliaWorkspaceEditContentRevision,
  type AureliaWorkspaceEditTransaction,
  type AureliaWorkspaceEditTransactionDocument,
  type ProtocolWorkspaceEdit,
} from "@aurelia-ls/language-server/protocol";
import type { VscodeApi } from "./vscode-api.js";
import type { TextDocument, Uri } from "vscode";
import {
  canonicalWorkspaceHostPath,
  documentUriIdentityKey,
} from "./core/uri-identity.js";

/**
 * LSP `TextDocumentEdit` carries `textDocument.version`; VS Code's public
 * `WorkspaceEdit` does not retain it after protocol conversion.
 *
 * vscode-languageclient 10.1 validates standard rename responses after
 * conversion and validates server-initiated `workspace/applyEdit` immediately
 * before application. Custom edit composition and code-action resolution must
 * perform the same check themselves, after their final asynchronous conversion
 * and before returning or merging the converted edit. Aurelia's transaction
 * snapshot extends that check to closed targets and physical aliases.
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
export async function workspaceEditTransactionMismatches(
  vscode: Pick<VscodeApi, "workspace" | "Uri">,
  workspaceEdit: ProtocolWorkspaceEdit,
): Promise<string[]> {
  const transaction: unknown = workspaceEdit.aureliaWorkspaceEditTransaction;
  if (!isAureliaWorkspaceEditTransaction(transaction)) {
    return ["workspace edit has no supported Aurelia transaction snapshot"];
  }

  const mismatches: string[] = [];
  const editUris = workspaceEditDocumentUris(vscode, workspaceEdit, mismatches);
  const transactionByKey = new Map<string, AureliaWorkspaceEditTransactionDocument>();
  const uriByPhysicalPath = new Map<string, string>();
  for (const document of transaction.documents) {
    const key = documentUriIdentityKey(vscode, document.uri);
    if (key == null) {
      mismatches.push(`transaction document URI is invalid: ${document.uri}`);
      continue;
    }
    if (transactionByKey.has(key)) {
      mismatches.push(`transaction contains duplicate document identity ${document.uri}`);
      continue;
    }
    if (document.version == null && document.physicalPath == null) {
      mismatches.push(`closed transaction document ${document.uri} has no physical identity`);
    }
    if (!/^sha256:[0-9a-f]{64}$/u.test(document.contentRevision)) {
      mismatches.push(`transaction document ${document.uri} has an invalid content revision`);
    }
    transactionByKey.set(key, document);
    if (document.physicalPath != null) {
      const existingUri = uriByPhysicalPath.get(document.physicalPath);
      if (existingUri != null && existingUri !== document.uri) {
        mismatches.push(`${existingUri} and ${document.uri} alias the same physical source`);
      } else {
        uriByPhysicalPath.set(document.physicalPath, document.uri);
      }
    }
  }

  for (const [key, uri] of editUris) {
    if (!transactionByKey.has(key)) {
      mismatches.push(`edit target ${uri} has no transaction snapshot`);
    }
  }
  for (const [key, document] of transactionByKey) {
    if (!editUris.has(key)) {
      mismatches.push(`transaction snapshot ${document.uri} has no edit target`);
    }
  }
  if (mismatches.length > 0) return mismatches;

  const openDocuments = new Map<string, TextDocument>();
  for (const document of vscode.workspace.textDocuments) {
    const key = documentUriIdentityKey(vscode, document.uri);
    if (key != null) openDocuments.set(key, document);
  }
  const openPhysicalPaths = new Map<string, string>();
  for (const [key, document] of openDocuments) {
    const physicalPath = await physicalPathForUri(vscode, document.uri);
    if (physicalPath != null) openPhysicalPaths.set(key, physicalPath);
  }

  for (const [key, expected] of transactionByKey) {
    const uri = vscode.Uri.parse(expected.uri);
    const open = openDocuments.get(key);
    let text: string | null = null;
    if (open != null) {
      if (expected.version != null && open.version !== expected.version) {
        mismatches.push(`${expected.uri} expected version ${expected.version} but editor has ${open.version}`);
      }
      text = open.getText();
    } else {
      try {
        text = decodeWorkspaceText(await vscode.workspace.fs.readFile(uri));
      } catch {
        mismatches.push(`${expected.uri} is no longer readable`);
      }
    }
    if (text != null && aureliaWorkspaceEditContentRevision(text) !== expected.contentRevision) {
      mismatches.push(`${expected.uri} content changed after the rename was planned`);
    }

    if (expected.physicalPath != null) {
      const physicalPath = openPhysicalPaths.get(key) ?? await physicalPathForUri(vscode, uri);
      if (physicalPath == null) {
        mismatches.push(`${expected.uri} physical identity is no longer readable`);
      } else if (physicalPath !== expected.physicalPath) {
        mismatches.push(`${expected.uri} physical identity changed after the rename was planned`);
      }
      for (const [openKey, openPhysicalPath] of openPhysicalPaths) {
        if (openKey !== key && openPhysicalPath === expected.physicalPath) {
          mismatches.push(`${expected.uri} aliases an open document through a different URI`);
        }
      }
    }
  }
  return mismatches;
}

export async function assertWorkspaceEditTransactionCurrent(
  vscode: Pick<VscodeApi, "workspace" | "Uri">,
  workspaceEdit: ProtocolWorkspaceEdit,
  messagePrefix: string,
): Promise<void> {
  const mismatches = await workspaceEditTransactionMismatches(vscode, workspaceEdit);
  if (mismatches.length > 0) {
    throw new Error(`${messagePrefix}: ${mismatches.join("; ")}`);
  }
}

function isAureliaWorkspaceEditTransaction(value: unknown): value is AureliaWorkspaceEditTransaction {
  if (value == null || typeof value !== "object") return false;
  const transaction = value as Partial<AureliaWorkspaceEditTransaction>;
  return transaction.schema === AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA
    && Array.isArray(transaction.documents)
    && transaction.documents.every(isAureliaWorkspaceEditTransactionDocument);
}

function isAureliaWorkspaceEditTransactionDocument(
  value: unknown,
): value is AureliaWorkspaceEditTransactionDocument {
  if (value == null || typeof value !== "object") return false;
  const document = value as Partial<AureliaWorkspaceEditTransactionDocument>;
  return typeof document.uri === "string"
    && (document.version == null || (Number.isInteger(document.version) && document.version >= 0))
    && typeof document.contentRevision === "string"
    && (document.physicalPath == null || typeof document.physicalPath === "string");
}

function workspaceEditDocumentUris(
  vscode: Pick<VscodeApi, "Uri">,
  workspaceEdit: ProtocolWorkspaceEdit,
  failures: string[],
): Map<string, string> {
  const uris = new Map<string, string>();
  for (const change of workspaceEdit.documentChanges ?? []) {
    if (!("textDocument" in change)) {
      failures.push("Aurelia text transaction contains a resource operation");
      continue;
    }
    const key = documentUriIdentityKey(vscode, change.textDocument.uri);
    if (key == null) {
      failures.push(`edit target URI is invalid: ${change.textDocument.uri}`);
      continue;
    }
    const existing = uris.get(key);
    if (existing != null) {
      failures.push(`${existing} and ${change.textDocument.uri} duplicate one edit target identity`);
    } else {
      uris.set(key, change.textDocument.uri);
    }
  }
  if (workspaceEdit.changes != null) {
    failures.push("Aurelia text transaction must use versioned documentChanges");
  }
  return uris;
}

function decodeWorkspaceText(bytes: Uint8Array): string {
  // Match semantic-runtime's Node UTF-8 source host exactly, including a leading UTF-8 BOM in a closed file.
  return Buffer.from(bytes).toString("utf8");
}

async function physicalPathForUri(
  vscode: Pick<VscodeApi, "Uri">,
  input: string | Uri,
): Promise<string | null> {
  const uri = typeof input === "string" ? vscode.Uri.parse(input) : input;
  try {
    const resolved = await realpath(uri.fsPath);
    const normalized = path.normalize(resolved).replace(/\\/gu, "/");
    return canonicalWorkspaceHostPath(normalized);
  } catch {
    return null;
  }
}
