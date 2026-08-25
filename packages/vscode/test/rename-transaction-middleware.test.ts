import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { afterEach, describe, expect, test, vi } from "vitest";
import {
  AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA,
  aureliaWorkspaceEditContentRevision,
  type ProtocolWorkspaceEdit,
} from "@aurelia-ls/language-server/protocol";
import { createMiddleware } from "../out/client-middleware.js";
import { canonicalWorkspaceHostPath } from "../out/core/uri-identity.js";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

class StubUri {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;
  readonly fsPath: string;
  readonly query = "";
  readonly fragment = "";

  constructor(readonly value: string) {
    const parsed = new URL(value);
    this.scheme = parsed.protocol.slice(0, -1);
    this.authority = parsed.host;
    this.path = decodeURIComponent(parsed.pathname);
    this.fsPath = fileURLToPath(value);
  }

  toString(): string {
    return this.value;
  }
}

describe("rename transaction middleware", () => {
  test("returns one current open-and-closed workspace transaction", async () => {
    const harness = renameHarness();
    const next = vi.fn();

    const edit = await harness.middleware.provideRenameEdits?.(
      harness.originDocument as never,
      { line: 0, character: 3 } as never,
      "heading",
      { isCancellationRequested: false } as never,
      next,
    );

    expect(edit).toBe(harness.convertedEdit);
    expect(next).not.toHaveBeenCalled();
    expect(harness.rawClient.sendRequest).toHaveBeenCalledWith(
      "textDocument/rename",
      {
        textDocument: { uri: harness.originUri },
        position: { line: 0, character: 3 },
        newName: "heading",
      },
      expect.anything(),
    );
  });

  test("retains a closed UTF-8 BOM in the transaction content revision", async () => {
    const harness = renameHarness({ targetText: "\uFEFFexport const title = true;\n" });

    await expect(harness.middleware.provideRenameEdits?.(
      harness.originDocument as never,
      { line: 0, character: 3 } as never,
      "heading",
      { isCancellationRequested: false } as never,
      vi.fn(),
    )).resolves.toBe(harness.convertedEdit);
  });

  test("refuses the whole rename when a closed target mutates after the response", async () => {
    const harness = renameHarness({
      afterConversion: ({ targetPath }) => writeFileSync(targetPath, "export const changed = true;\n", "utf8"),
    });

    await expect(harness.middleware.provideRenameEdits?.(
      harness.originDocument as never,
      { line: 0, character: 3 } as never,
      "heading",
      { isCancellationRequested: false } as never,
      vi.fn(),
    )).rejects.toThrow(/target documents changed.*content changed/iu);

    expect(harness.originDocument.getText()).toBe("<p>title</p>\n");
    expect(readFileSync(harness.targetPath, "utf8")).toBe("export const changed = true;\n");
  });

  test("refuses the whole rename when an open target version mutates during conversion", async () => {
    const harness = renameHarness({ openTarget: true });
    harness.rawClient.protocol2CodeConverter.asWorkspaceEdit.mockImplementationOnce(async () => {
      harness.targetDocument!.version += 1;
      return harness.convertedEdit;
    });

    await expect(harness.middleware.provideRenameEdits?.(
      harness.originDocument as never,
      { line: 0, character: 3 } as never,
      "heading",
      { isCancellationRequested: false } as never,
      vi.fn(),
    )).rejects.toThrow(/target documents changed.*expected version 1.*editor has 2/iu);
  });

  test("refuses the whole rename when its originating client retires during conversion", async () => {
    const harness = renameHarness({ retireDuringConversion: true });

    await expect(harness.middleware.provideRenameEdits?.(
      harness.originDocument as never,
      { line: 0, character: 3 } as never,
      "heading",
      { isCancellationRequested: false } as never,
      vi.fn(),
    )).rejects.toThrow(/workspace session changed/iu);

    expect(harness.originDocument.getText()).toBe("<p>title</p>\n");
    expect(readFileSync(harness.targetPath, "utf8")).toBe(harness.targetText);
  });

  test("leaves a resolved quick fix unapplied when its closed target mutates", async () => {
    const harness = renameHarness();
    const action = {
      title: "Declare member",
      data: { semanticRuntime: { resolve: { schema: "aurelia.template-code-action-resolve/1" } } },
    };
    const resolved = { ...action, edit: harness.protocolEdit };
    harness.rawClient.sendRequest.mockResolvedValueOnce(resolved as never);
    harness.rawClient.protocol2CodeConverter.asCodeAction.mockImplementationOnce(async () => {
      writeFileSync(harness.targetPath, "export const changed = true;\n", "utf8");
      return { ...action, edit: harness.convertedEdit };
    });

    const result = await harness.middleware.resolveCodeAction?.(
      action as never,
      { isCancellationRequested: false } as never,
      vi.fn(),
    );

    expect(result).toBe(action);
    expect(harness.logger.warn).toHaveBeenCalledWith(expect.stringContaining("content changed"));
    expect(harness.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining("Request the code action again"));
  });

  test("refuses a closed symlink target that retargets to identical text", async () => {
    const harness = renameHarness();
    const aliasRoot = path.join(harness.root, "alias-src");
    const replacementRoot = path.join(harness.root, "replacement-src");
    mkdirSync(replacementRoot, { recursive: true });
    writeFileSync(path.join(replacementRoot, path.basename(harness.targetPath)), harness.targetText, "utf8");
    symlinkDirectory(path.dirname(harness.targetPath), aliasRoot);
    const aliasPath = path.join(aliasRoot, path.basename(harness.targetPath));
    const aliasUri = pathToFileURL(aliasPath).toString();
    const targetChange = harness.protocolEdit.documentChanges?.[1];
    if (targetChange == null || !("textDocument" in targetChange)) throw new Error("Expected target edit.");
    (targetChange.textDocument as { uri: string }).uri = aliasUri;
    const targetSnapshot = harness.protocolEdit.aureliaWorkspaceEditTransaction?.documents[1];
    if (targetSnapshot == null) throw new Error("Expected target transaction snapshot.");
    (targetSnapshot as { uri: string }).uri = aliasUri;
    harness.rawClient.protocol2CodeConverter.asWorkspaceEdit.mockImplementationOnce(async () => {
      unlinkSync(aliasRoot);
      symlinkDirectory(replacementRoot, aliasRoot);
      return harness.convertedEdit;
    });

    await expect(harness.middleware.provideRenameEdits?.(
      harness.originDocument as never,
      { line: 0, character: 3 } as never,
      "heading",
      { isCancellationRequested: false } as never,
      vi.fn(),
    )).rejects.toThrow(/target documents changed.*physical identity changed/iu);
  });
});

function renameHarness(options: {
  openTarget?: boolean;
  afterConversion?: (paths: { targetPath: string }) => void;
  targetText?: string;
  retireDuringConversion?: boolean;
} = {}) {
  let currentIncarnation: number | null = 1;
  const root = mkdtempSync(path.join(process.cwd(), ".rename-transaction-"));
  temporaryRoots.push(root);
  const sourceRoot = path.join(root, "src");
  mkdirSync(sourceRoot, { recursive: true });
  const originPath = path.join(sourceRoot, "app.html");
  const targetPath = path.join(sourceRoot, "app.ts");
  const originText = "<p>title</p>\n";
  const targetText = options.targetText ?? "export const title = true;\n";
  writeFileSync(originPath, originText, "utf8");
  writeFileSync(targetPath, targetText, "utf8");
  const originUri = pathToFileURL(originPath).toString();
  const targetUri = pathToFileURL(targetPath).toString();
  const originDocument = stubDocument(originUri, "html", 3, originText);
  const targetDocument = options.openTarget
    ? stubDocument(targetUri, "typescript", 1, targetText)
    : null;
  const protocolEdit: ProtocolWorkspaceEdit = {
    documentChanges: [
      textChange(originUri, 3, 3, 8),
      textChange(targetUri, options.openTarget ? 1 : null, 13, 18),
    ],
    aureliaWorkspaceEditTransaction: {
      schema: AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA,
      documents: [
        transactionDocument(originUri, 3, originText, originPath),
        transactionDocument(targetUri, options.openTarget ? 1 : null, targetText, targetPath),
      ],
    },
  };
  const convertedEdit = { entries: () => [[new StubUri(originUri), []], [new StubUri(targetUri), []]] };
  const harness = {
    afterConversion: options.afterConversion ?? (() => {}),
    targetPath,
    targetText,
    root,
    originUri,
    originDocument,
    targetDocument,
    protocolEdit,
    convertedEdit,
  };
  const rawClient = {
    sendRequest: vi.fn(async () => protocolEdit),
    code2ProtocolConverter: { asCodeActionSync: vi.fn() },
    protocol2CodeConverter: {
      asCodeAction: vi.fn(),
      asWorkspaceEdit: vi.fn(async () => {
        harness.afterConversion({ targetPath });
        if (options.retireDuringConversion) currentIncarnation = null;
        return convertedEdit;
      }),
    },
  };
  const showWarningMessage = vi.fn();
  const logger = { debug: vi.fn(), warn: vi.fn() };
  const vscode = {
    Uri: { parse: (value: string) => new StubUri(value) },
    workspace: {
      textDocuments: [originDocument, ...(targetDocument == null ? [] : [targetDocument])],
      workspaceFolders: [],
      getConfiguration: () => ({ get: () => "auto" }),
      fs: { readFile: async (uri: StubUri) => readFile(uri.fsPath) },
    },
    window: { showWarningMessage },
  };
  return {
    ...harness,
    rawClient,
    logger,
    showWarningMessage,
    middleware: createMiddleware(
      vscode as never,
      logger as never,
      {
        client: rawClient,
        currentIncarnation: () => currentIncarnation,
      } as never,
    ),
  };
}

function symlinkDirectory(target: string, link: string): void {
  symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
}

function stubDocument(uri: string, languageId: string, version: number, text: string) {
  return {
    uri: new StubUri(uri),
    languageId,
    version,
    getText: () => text,
  };
}

function textChange(uri: string, version: number | null, start: number, end: number) {
  return {
    textDocument: { uri, version },
    edits: [{
      range: {
        start: { line: 0, character: start },
        end: { line: 0, character: end },
      },
      newText: "heading",
    }],
  };
}

function transactionDocument(
  uri: string,
  version: number | null,
  text: string,
  filePath: string,
) {
  return {
    uri,
    version,
    contentRevision: aureliaWorkspaceEditContentRevision(text),
    physicalPath: canonicalWorkspaceHostPath(
      path.normalize(realpathSync.native(filePath)).replace(/\\/gu, "/"),
    ),
  };
}
