import {
  DocumentDiagnosticReportKind,
  LSPErrorCodes,
  type CancellationToken,
  type DocumentDiagnosticParams,
  type DocumentDiagnosticReport,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { describe, expect, test, vi } from "vitest";
import { appDiagnosticPresentation } from "@aurelia-ls/semantic-runtime";
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
  const appDiagnostics = vi.fn(async () => ({
    analysisBasis,
    value: {
      rows: [],
      presentation: {
        rawRowCount: 0,
        primaryCount: 0,
        contextualCount: 0,
        withheldCount: 0,
        complete: true,
        groups: [],
        withheld: [],
      },
    },
  }));
  const authoredSourceOwnership = vi.fn(async () => ({
    analysisBasis,
    value: {
      sourceFilePath: "C:\\projects\\app\\src\\my-app.html",
      templateOwned: true,
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
  const ensureProgramDocument = vi.fn((requestedUri: string) =>
    programDocument != null
    && documentUris.ownsDocument(requestedUri)
    && documentUris.sameDocument(requestedUri, programDocument.uri)
      ? programDocument
      : null);
  const operation = {
    documents: {
      ensureProgramDocument,
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
    projectConfigurationParserDiagnostics: "semantic-runtime",
    typeScriptProgramDiagnostics: "semantic-runtime",
  };

  registerDiagnosticHandlers(ctx as never);

  return {
    ctx,
    appDiagnostics,
    authoredSourceOwnership,
    projectConfigurationDiagnostics,
    runDiagnosticRequest,
    logger,
    ensureProgramDocument,
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

  test("delegates only ordinary TypeScript Program diagnostics when the client owns them", async () => {
    const typeScriptUri = "file:///C:/projects/app/src/component.ts";
    const text = "const count: string = 1;";
    const typeScriptDocument = TextDocument.create(typeScriptUri, "typescript", 8, text);
    const start = text.lastIndexOf("1");
    const rows = [{
      projectKey: "app",
      diagnosticDomain: "typescript",
      phase: "semantic",
      diagnosticKind: "TS2322",
      diagnosticAuthority: "typescript",
      typeScriptDiagnosticCode: 2322,
      frameworkErrorCode: null,
      frameworkRawErrorAuthority: null,
      severity: "error",
      summary: "Type 'number' is not assignable to type 'string'.",
      missingInput: "typescript:TS2322",
      missingInputs: ["typescript:TS2322"],
      source: {
        kind: "typescript-diagnostic",
        label: `src/component.ts@${start}..${start + 1}`,
        path: "src/component.ts",
        start,
        end: start + 1,
        role: "line:0:character:22",
      },
      subject: null,
      diagnosticIdentityHandle: null,
      relatedInformation: [],
      suggestion: null,
      sourceRole: "app-source",
      relatedQueryKind: "typescript-diagnostics",
    }];
    const answer = {
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        rows,
        presentation: appDiagnosticPresentation(rows as never, true),
      },
    };
    const semanticRuntimeOwner = createDiagnosticHarness(typeScriptDocument);
    semanticRuntimeOwner.appDiagnostics.mockResolvedValue(answer as never);

    await expect(semanticRuntimeOwner.request()).resolves.toEqual(expect.objectContaining({
      items: [expect.objectContaining({ source: "typescript", code: "TS2322" })],
    }));

    const clientOwner = createDiagnosticHarness(typeScriptDocument);
    clientOwner.ctx.typeScriptProgramDiagnostics = "client";
    clientOwner.appDiagnostics.mockResolvedValue(answer as never);

    await expect(clientOwner.request()).resolves.toEqual(expect.objectContaining({ items: [] }));
  });

  test("fails instead of publishing a partial Problems projection", async () => {
    const harness = createDiagnosticHarness();
    harness.appDiagnostics.mockResolvedValueOnce({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        rows: [],
        presentation: {
          rawRowCount: 0,
          primaryCount: 0,
          contextualCount: 0,
          withheldCount: 0,
          complete: false,
          groups: [],
          withheld: [],
        },
      },
    });

    await expect(harness.request()).rejects.toMatchObject({
      code: LSPErrorCodes.RequestFailed,
      message: expect.stringContaining("requires a complete semantic diagnostic presentation"),
    });
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

  test("returns an empty full report for a project configuration below an excluded workspace root", async () => {
    const configUri = "file:///C:/projects/app/packages/disabled/aurelia.project.json";
    const configDocument = TextDocument.create(configUri, "json", 3, '{"version":3}');
    const harness = createDiagnosticHarness(configDocument);
    harness.ctx.documentUris.configure("file:///C:/projects/app", [
      "file:///C:/projects/app/packages/disabled",
    ]);

    const report = await harness.request();

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "diagnostic:test",
      items: [],
    });
    expect(harness.ensureProgramDocument).toHaveBeenCalledWith(configUri);
    expect(harness.projectConfigurationDiagnostics).not.toHaveBeenCalled();
    expect(harness.authoredSourceOwnership).not.toHaveBeenCalled();
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });

  test("returns an empty full report for ordinary JSON without entering Aurelia app analysis", async () => {
    const jsonDocument = TextDocument.create(
      "file:///C:/projects/app/src/data.json",
      "json",
      2,
      '{"answer":42}',
    );
    const harness = createDiagnosticHarness(jsonDocument);

    const report = await harness.request();

    expect(report).toEqual({
      kind: DocumentDiagnosticReportKind.Full,
      resultId: "diagnostic:test",
      items: [],
    });
    expect(harness.projectConfigurationDiagnostics).not.toHaveBeenCalled();
    expect(harness.authoredSourceOwnership).not.toHaveBeenCalled();
    expect(harness.appDiagnostics).not.toHaveBeenCalled();
  });

  test("returns an empty full report without app analysis for a non-authored dependency", async () => {
    const harness = createDiagnosticHarness();
    harness.authoredSourceOwnership.mockResolvedValue({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        sourceFilePath: "C:\\projects\\app\\golden\\dependency.ts",
        templateOwned: false,
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
    const configText = '{\n  "version": 3\n}';
    const configDocument = TextDocument.create(configUri, "json", 9, configText);
    const harness = createDiagnosticHarness(configDocument);
    const start = configText.indexOf("3");
    harness.projectConfigurationDiagnostics.mockResolvedValue({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        rows: [{
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-unsupported-version",
          severity: "error",
          message: "Only project configuration versions 1 and 2 are supported.",
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

  test("keeps configuration parser diagnostics for clients using semantic-runtime's default authority", async () => {
    const configUri = "file:///C:/projects/app/aurelia.project.json";
    const configText = '{"version":1,,}';
    const configDocument = TextDocument.create(configUri, "jsonc", 10, configText);
    const harness = createDiagnosticHarness(configDocument);
    const start = configText.indexOf(",,") + 1;
    harness.projectConfigurationDiagnostics.mockResolvedValue({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        rows: [{
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-syntax",
          severity: "error",
          message: "Property expected.",
          source: {
            filePath: harness.ctx.documentUris.hostPath(configUri)!,
            start,
            end: start + 1,
            startPosition: { line: 0, character: start },
            endPosition: { line: 0, character: start + 1 },
          },
        }],
      },
    });

    const report = await harness.request();

    expect(report).toEqual(expect.objectContaining({
      kind: DocumentDiagnosticReportKind.Full,
      items: [expect.objectContaining({ code: "aurelia-project-config-syntax" })],
    }));
  });

  test("omits only client-owned parser rows when VS Code delegates configuration parsing", async () => {
    const configUri = "file:///C:/projects/app/aurelia.project.json";
    const configText = '{"version":1,"version":1,"unknown":true}';
    const configDocument = TextDocument.create(configUri, "jsonc", 11, configText);
    const harness = createDiagnosticHarness(configDocument);
    harness.ctx.projectConfigurationParserDiagnostics = "client";
    const source = (start: number, end: number) => ({
      filePath: harness.ctx.documentUris.hostPath(configUri)!,
      start,
      end,
      startPosition: configDocument.positionAt(start),
      endPosition: configDocument.positionAt(end),
    });
    const duplicateStart = configText.indexOf('"version"', 2);
    const unknownStart = configText.indexOf('"unknown"');
    harness.projectConfigurationDiagnostics.mockResolvedValue({
      analysisBasis: { revision: "semantic-runtime-analysis:test" },
      value: {
        rows: [{
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-syntax",
          severity: "error",
          message: "Synthetic parser failure.",
          source: source(0, 1),
        }, {
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-duplicate-property",
          severity: "error",
          message: "Duplicate property.",
          source: source(duplicateStart, duplicateStart + '"version"'.length),
        }, {
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-unknown-property",
          severity: "error",
          message: "Unknown property.",
          source: source(unknownStart, unknownStart + '"unknown"'.length),
        }],
      },
    });

    const report = await harness.request();

    expect(report).toEqual(expect.objectContaining({
      kind: DocumentDiagnosticReportKind.Full,
      items: [expect.objectContaining({ code: "aurelia-project-config-unknown-property" })],
    }));
  });
});

function document(): TextDocument {
  return TextDocument.create(uri, "html", 7, "<template>${missing}</template>");
}
