import {
  DocumentDiagnosticReportKind,
  type CancellationToken,
  type DocumentDiagnosticParams,
  type DocumentDiagnosticReport,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { describe, expect, test, vi } from "vitest";
import { registerDiagnosticHandlers } from "../../src/handlers/diagnostics.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const uri = "file:///C:/projects/app/src/my-app.html";
const token = {
  isCancellationRequested: false,
  onCancellationRequested: vi.fn(),
} as unknown as CancellationToken;

type DiagnosticHandler = (
  params: DocumentDiagnosticParams,
  token: CancellationToken,
) => Promise<DocumentDiagnosticReport>;

function createDiagnosticHarness(programDocument: TextDocument | null = document()) {
  let handler: DiagnosticHandler | undefined;
  const generation = {
    workspaceGeneration: 3,
    sourceGeneration: 5,
    fingerprint: "semantic-runtime:test:workspace-3:source-5",
  };
  const requestGuard = vi.fn((isCancellationRequested) => ({
    generation,
    isCancellationRequested,
  }));
  const appDiagnostics = vi.fn(async () => ({ value: { rows: [] } }));
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure("file:///C:/projects/app");
  const logger = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const ctx = {
    connection: {
      languages: {
        diagnostics: {
          on: vi.fn((registered: DiagnosticHandler) => { handler = registered; }),
        },
      },
    },
    documentUris,
    ensureProgramDocument: vi.fn(() => programDocument),
    lookupText: vi.fn(() => null),
    semanticRuntime: {
      requestGuard,
      appDiagnostics,
    },
    logger,
  };

  registerDiagnosticHandlers(ctx as never);

  return {
    ctx,
    appDiagnostics,
    logger,
    request(params: Partial<DocumentDiagnosticParams> = {}) {
      if (handler == null) {
        throw new Error("Diagnostic handler was not registered.");
      }
      return handler({
        textDocument: { uri },
        ...params,
      } as DocumentDiagnosticParams, token);
    },
  };
}

describe("document diagnostics handler", () => {
  test("pulls the semantic-runtime diagnostic product for the current document generation", async () => {
    const harness = createDiagnosticHarness();

    const report = await harness.request();

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "semantic-runtime:test:workspace-3:source-5:document-7",
      items: [],
    });
    expect(harness.appDiagnostics).toHaveBeenCalledOnce();
    expect(harness.appDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ uri, version: 7 }),
      expect.objectContaining({ generation: expect.objectContaining({ fingerprint: "semantic-runtime:test:workspace-3:source-5" }) }),
    );
  });

  test("returns unchanged without recomputing an accepted result identity", async () => {
    const harness = createDiagnosticHarness();
    const previousResultId = "semantic-runtime:test:workspace-3:source-5:document-7";

    const report = await harness.request({ previousResultId });

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Unchanged,
      resultId: previousResultId,
    });
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });

  test("returns an empty full report when the document no longer exists", async () => {
    const harness = createDiagnosticHarness(null);

    const report = await harness.request();

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "semantic-runtime:test:workspace-3:source-5:document-closed",
      items: [],
    });
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });
});

function document(): TextDocument {
  return TextDocument.create(uri, "html", 7, "<template>${missing}</template>");
}
