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
    requestEpoch: 5,
    workspaceGeneration: 3,
    sourceWorldRevision: "semantic-source-world:test",
    fingerprint: "semantic-runtime:test:workspace-3:source-5",
  };
  const requestGuard = vi.fn((isCancellationRequested) => ({
    requestEpoch: generation.requestEpoch,
    isCancellationRequested,
  }));
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
      preflight: vi.fn(async () => generation),
      appDiagnostics,
      authoredSourceOwnership,
      projectConfigurationDiagnostics,
    },
    logger,
  };

  registerDiagnosticHandlers(ctx as never);

  return {
    ctx,
    appDiagnostics,
    authoredSourceOwnership,
    projectConfigurationDiagnostics,
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
      resultId: "semantic-runtime:test:workspace-3:source-5:answer-semantic-runtime-analysis:test:document-7",
      items: [],
    });
    expect(harness.appDiagnostics).toHaveBeenCalledOnce();
    expect(harness.appDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ uri, version: 7 }),
      expect.objectContaining({ requestEpoch: 5 }),
    );
  });

  test("returns unchanged only after revalidating the exact accepted answer basis", async () => {
    const harness = createDiagnosticHarness();
    const previousResultId = "semantic-runtime:test:workspace-3:source-5:answer-semantic-runtime-analysis:test:document-7";

    const report = await harness.request({ previousResultId });

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Unchanged,
      resultId: previousResultId,
    });
    expect(harness.appDiagnostics).toHaveBeenCalledOnce();
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
      resultId: "semantic-runtime:test:workspace-3:source-5:answer-semantic-runtime-analysis:test:document-7",
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
      resultId: "semantic-runtime:test:workspace-3:source-5:answer-semantic-runtime-analysis:test:document-9",
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
