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
  const analysisBasis = { revision: "semantic-runtime-analysis:test" };
  const appDiagnostics = vi.fn(async () => ({ analysisBasis, value: { rows: [] } }));
  const authoredSourceOwnership = vi.fn(async () => ({
    analysisBasis,
    value: {
      sourceFilePath: "C:\\projects\\app\\src\\my-app.html",
      owners: [{ projectKey: "app" }],
    },
  }));
  const projectConfigurationDiagnostics = vi.fn(async () => ({ analysisBasis, value: { rows: [] } }));
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure("file:///C:/projects/app");
  const logger = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const operation = {
    documents: {
      ensureProgramDocument: vi.fn(() => programDocument),
      lookupText: vi.fn(() => null),
    },
    deferEffect: vi.fn((effect: { level?: "log" | "info" | "warn"; message: string }) => {
      if (effect.level != null) logger[effect.level](effect.message);
    }),
    appDiagnostics,
    authoredSourceOwnership,
    projectConfigurationDiagnostics,
  };
  const runDiagnosticRequest = vi.fn(async (
    _isCancellationRequested: (() => boolean) | null,
    request: { previousResultId: string | null },
    render: (operation: unknown) => Promise<readonly unknown[]>,
  ) => {
    if (request.previousResultId === "diagnostic:test") {
      return { kind: DocumentDiagnosticReportKind.Unchanged, resultId: "diagnostic:test" };
    }
    const items = [...await render(operation)];
    return {
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "diagnostic:test",
      items,
    };
  });
  const ctx = {
    connection: {
      languages: {
        diagnostics: {
          on: vi.fn((registered: DiagnosticHandler) => { handler = registered; }),
        },
      },
    },
    documentUris,
    semanticRuntime: {
      runDiagnosticRequest,
    },
    logger,
  };

  registerDiagnosticHandlers(ctx as never);

  return {
    ctx,
    appDiagnostics,
    authoredSourceOwnership,
    projectConfigurationDiagnostics,
    runDiagnosticRequest,
    logger,
    request(params: Partial<DocumentDiagnosticParams> = {}) {
      if (handler == null) {
        throw new Error("Diagnostic handler was not registered.");
      }
      return handler({
        textDocument: { uri: programDocument?.uri ?? uri },
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
      resultId: "diagnostic:test",
      items: [],
    });
    expect(harness.appDiagnostics).toHaveBeenCalledOnce();
    expect(harness.appDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ uri, version: 7 }),
    );
    expect(harness.runDiagnosticRequest).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        uri,
        identifier: null,
        previousResultId: null,
        projectionKey: "lsp-document-diagnostics/v2",
      }),
      expect.any(Function),
    );
  });

  test("returns unchanged only after revalidating the exact accepted answer basis", async () => {
    const harness = createDiagnosticHarness();
    const previousResultId = "diagnostic:test";

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
      resultId: "diagnostic:test",
      items: [],
    });
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });

  test("returns an empty full report without app analysis for a non-authored dependency", async () => {
    const harness = createDiagnosticHarness();
    harness.authoredSourceOwnership.mockResolvedValue({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        sourceFilePath: "C:\\projects\\app\\golden\\dependency.ts",
        owners: [],
      },
    });

    const report = await harness.request();

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "diagnostic:test",
      items: [],
    });
    expect(harness.authoredSourceOwnership).toHaveBeenCalledOnce();
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });

  test("projects native configuration diagnostics before authored-source gating", async () => {
    const configUri = "file:///C:/projects/app/aurelia.project.json";
    const configText = '{\n  "version": 2\n}';
    const configDocument = TextDocument.create(configUri, "json", 9, configText);
    const harness = createDiagnosticHarness(configDocument);
    const start = configText.indexOf("2");
    harness.projectConfigurationDiagnostics.mockResolvedValue({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        rows: [{
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-unsupported-version",
          severity: "error",
          message: "Only project configuration version 1 is supported.",
          source: {
            filePath: harness.ctx.documentUris.hostPath(configUri)!,
            start,
            end: start + 1,
            startPosition: { line: 1, character: 13 },
            endPosition: { line: 1, character: 14 },
          },
        }],
      },
    });

    const report = await harness.request();

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "diagnostic:test",
      items: [expect.objectContaining({
        code: "aurelia-project-config-unsupported-version",
        range: {
          start: configDocument.positionAt(start),
          end: configDocument.positionAt(start + 1),
        },
      })],
    });
    expect(harness.projectConfigurationDiagnostics).toHaveBeenCalledOnce();
    expect(harness.authoredSourceOwnership).not.toHaveBeenCalled();
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });
});

function document(): TextDocument {
  return TextDocument.create(uri, "html", 7, "<template>${missing}</template>");
}
