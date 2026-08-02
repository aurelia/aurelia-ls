import path from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect, describe, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  canonicalDocumentUri,
  handleGetDiagnostics,
  handleRenameFromTs,
  handleWorkspaceStatus,
} from "@aurelia-ls/language-server/api";
import { testRequestGuard } from "./test-request-guard.js";

function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
}

function snapshot(
  uri: string,
  text: string,
  version: number | null = null,
  languageId = uri.endsWith(".ts") ? "typescript" : "html",
) {
  return {
    uri: canonicalDocumentUri(uri).uri,
    languageId,
    version,
    text,
  };
}

function createMockContext(overrides: Record<string, unknown> = {}) {
  const logger = createMockLogger();
  return {
    logger,
    ensureProgramDocument: vi.fn(() => ({ offsetAt: vi.fn(() => 0) })),
    lookupText: vi.fn(() => null),
    lookupDocumentSnapshot: vi.fn(() => null),
    workspaceRoot: "/test/workspace",
    documents: {
      all: vi.fn(() => []),
    },
    semanticRuntime: {
      appDiagnostics: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock",
          value: {
            displayText: "mock",
            typeScript: null,
            rows: [],
            presentation: {
              rawRowCount: 0,
              primaryCount: 0,
              contextualCount: 0,
              complete: true,
              groups: [],
            },
          },
          page: null,
        }),
      ),
      templateRenameFromTypeScript: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock",
          value: {
            displayText: "mock",
            status: "available",
            reason: null,
            selectedMemberName: "title",
            placeholder: "title",
            targetSource: null,
            activeSource: null,
            edits: [],
            candidateRows: [],
            templateReferenceCount: 0,
            typeScriptReferenceCount: 0,
          },
          page: null,
        }),
      ),
      workspaceSummary: vi.fn(() => Promise.resolve({
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: "workspace summary",
        value: {
          workspaceRoot: "/test/workspace",
          workspaceKey: "workspace",
          displayText: "one app",
          projectShapeCounts: [{ shapeKind: "aurelia-app", count: 1 }],
          projectAnalysisCounts: [{ analysisKind: "app-world", count: 1 }],
          defaultAppProjectKey: "app",
          appCandidates: [],
          projects: [],
        },
        page: null,
      })),
    },
    ...overrides,
  };
}

describe("handleWorkspaceStatus", () => {
  test("returns the semantic-runtime summary envelope without reclassifying project shape", async () => {
    const ctx = createMockContext();
    const guard = testRequestGuard;

    const response = await handleWorkspaceStatus(ctx as never, guard);

    expect(ctx.semanticRuntime.workspaceSummary).toHaveBeenCalledWith(guard);
    expect(response?.value.projectAnalysisCounts).toEqual([{ analysisKind: "app-world", count: 1 }]);
    expect(response?.coverage).toBe("complete");
  });
});

describe("handleGetDiagnostics", () => {
  test("returns semantic-runtime diagnostics in the report snapshot envelope", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.appDiagnostics.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        typeScript: null,
        rows: [
          {
            projectKey: "app",
            diagnosticDomain: "template",
            phase: null,
            diagnosticKind: "missing-expression-member",
            diagnosticAuthority: "semantic-runtime-product",
            frameworkErrorCode: null,
            frameworkRawErrorAuthority: null,
            severity: "warning",
            summary: "Cannot find member title.",
            missingInput: null,
            missingInputs: [],
            source: {
              kind: "source-span-address",
              label: "src/app.html@4..9",
              path: "src/app.html",
              start: 4,
              end: 9,
              role: "range",
            },
            subject: {
              subjectKind: "template-member-access",
              subjectName: "title",
              source: null,
            },
            diagnosticIdentityHandle: 41,
            diagnosticRelations: [{
              relationKind: "same-operation-evidence",
              relatedDiagnosticIdentityHandle: 42,
            }],
            relatedInformation: [
              {
                message: "Subject declaration.",
                source: {
                  kind: "source-span-address",
                  label: "src/app.ts@10..15",
                  path: "src/app.ts",
                  start: 10,
                  end: 15,
                  role: "range",
                },
                relationKind: "subject-declaration",
                code: null,
                sourceRole: "app-source",
              },
            ],
            suggestion: null,
            sourceRole: "template",
            relatedQueryKind: "template-diagnostics",
          },
        ],
        presentation: {
          rawRowCount: 1,
          primaryCount: 1,
          contextualCount: 0,
          complete: true,
          groups: [
            {
              groupKey: "member-title",
              subject: {
                subjectKind: "template-member-access",
                subjectName: "title",
                source: null,
              },
              primary: {
                rowId: "diagnostic-title",
                rowIndex: 0,
                role: "primary",
                relation: null,
              },
              related: [],
              rawRowCount: 1,
              primarySeverity: "warning",
              maxRawSeverity: "warning",
            },
          ],
        },
      },
      page: null,
    });

    const result = await handleGetDiagnostics(
      ctx as never,
      { uri: "file:///test.html" },
      testRequestGuard,
    );

    expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({}),
      testRequestGuard,
    );
    expect(result).toEqual({
      uri: canonicalDocumentUri("file:///test.html").uri,
      answer: {
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: "mock",
        page: null,
      },
      diagnostics: {
        bySurface: {
          lsp: [
            expect.objectContaining({
              code: "missing-expression-member",
              message: "Cannot find member title.",
              severity: "warning",
              impact: "degraded",
              actionability: "manual",
              category: "template-syntax",
              source: "semantic-runtime:template",
              uri: expect.stringContaining("src/app.html"),
              span: { start: 4, end: 9 },
              surfaces: ["lsp", "vscode-panel"],
            }),
          ],
        },
        raw: [
          expect.objectContaining({
            code: "missing-expression-member",
            message: "Cannot find member title.",
            severity: "warning",
            impact: "degraded",
            actionability: "manual",
            category: "template-syntax",
            source: "semantic-runtime:template",
            uri: expect.stringContaining("src/app.html"),
            span: { start: 4, end: 9 },
            surfaces: ["lsp", "vscode-panel"],
          }),
        ],
        presentation: expect.objectContaining({
          groups: [
            expect.objectContaining({
              subject: {
                subjectKind: "template-member-access",
                subjectName: "title",
              },
            }),
          ],
        }),
      },
    });
    expect(result?.diagnostics.bySurface.lsp[0]?.data).toEqual(
      expect.objectContaining({
        semanticRuntime: expect.objectContaining({
          phase: null,
          diagnosticKind: "missing-expression-member",
          relatedQueryKind: "template-diagnostics",
          diagnosticIdentityHandle: 41,
          diagnosticRelations: [{
            relationKind: "same-operation-evidence",
            relatedDiagnosticIdentityHandle: 42,
          }],
        }),
      }),
    );
    expect(result?.diagnostics.raw[0]?.related).toEqual([
      {
        message: "Subject declaration.",
        uri: expect.stringContaining("src/app.ts"),
        span: { start: 10, end: 15 },
        sourceRole: "app-source",
        relationKind: "subject-declaration",
      },
    ]);
  });

  test("maps runtime informational severity to report info severity", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.appDiagnostics.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        typeScript: null,
        rows: [
          {
            projectKey: "app",
            diagnosticDomain: "typescript",
            phase: "semantic",
            diagnosticKind: "TS1234",
            diagnosticAuthority: "typescript",
            frameworkErrorCode: null,
            frameworkRawErrorAuthority: null,
            severity: "information",
            summary: "Info diagnostic.",
            missingInput: null,
            missingInputs: [],
            source: null,
            subject: null,
            relatedInformation: [],
            suggestion: null,
            sourceRole: null,
            relatedQueryKind: "typescript-diagnostics",
          },
        ],
        presentation: {
          rawRowCount: 1,
          primaryCount: 1,
          contextualCount: 0,
          complete: true,
          groups: [
            {
              groupKey: "typescript-TS1234",
              subject: null,
              primary: {
                rowId: "diagnostic-TS1234",
                rowIndex: 0,
                role: "primary",
                relation: null,
              },
              related: [],
              rawRowCount: 1,
              primarySeverity: "information",
              maxRawSeverity: "information",
            },
          ],
        },
      },
      page: null,
    });

    const result = await handleGetDiagnostics(
      ctx as never,
      { uri: "file:///test.html" },
      testRequestGuard,
    );

    expect(result?.diagnostics.bySurface.lsp[0]).toEqual(
      expect.objectContaining({
        code: "TS1234",
        severity: "info",
        impact: "informational",
        category: "expression",
        uri: undefined,
        span: undefined,
      }),
    );
  });

  test("uses TypeScript display codes for template overlay diagnostics in the report envelope", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.appDiagnostics.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        typeScript: null,
        rows: [
          {
            projectKey: "app",
            diagnosticDomain: "template",
            phase: null,
            diagnosticKind: "template-expression-typescript-diagnostic",
            diagnosticAuthority: "typescript",
            frameworkErrorCode: null,
            frameworkRawErrorAuthority: null,
            severity: "error",
            summary:
              "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
            missingInput: "typescript:TS2345",
            missingInputs: ["typescript:TS2345"],
            source: {
              kind: "source-span-address",
              label: "src/app.html@4..9",
              path: "src/app.html",
              start: 4,
              end: 9,
              role: "range",
            },
            subject: null,
            relatedInformation: [],
            suggestion: null,
            sourceRole: "template",
            relatedQueryKind: "template-diagnostics",
          },
        ],
        presentation: {
          rawRowCount: 1,
          primaryCount: 1,
          contextualCount: 0,
          complete: true,
          groups: [
            {
              groupKey: "template-TS2345",
              subject: null,
              primary: {
                rowId: "diagnostic-TS2345",
                rowIndex: 0,
                role: "primary",
                relation: null,
              },
              related: [],
              rawRowCount: 1,
              primarySeverity: "error",
              maxRawSeverity: "error",
            },
          ],
        },
      },
      page: null,
    });

    const result = await handleGetDiagnostics(
      ctx as never,
      { uri: "file:///test.html" },
      testRequestGuard,
    );
    const item = result?.diagnostics.bySurface.lsp[0];

    expect(item).toEqual(
      expect.objectContaining({
        code: "TS2345",
        source: "semantic-runtime:template",
        uri: expect.stringContaining("src/app.html"),
        span: { start: 4, end: 9 },
      }),
    );
    expect(item?.issues?.[0]).toEqual(
      expect.objectContaining({
        kind: "template-expression-typescript-diagnostic",
        code: "TS2345",
      }),
    );
    expect(item?.data).toEqual(
      expect.objectContaining({
        semanticRuntime: expect.objectContaining({
          diagnosticKind: "template-expression-typescript-diagnostic",
          diagnosticAuthority: "typescript",
          missingInput: "typescript:TS2345",
        }),
      }),
    );
  });
});

describe("handleRenameFromTs", () => {
  const renameWorkspaceRoot = path.resolve("test-workspace");
  const renameTypeScriptUri = pathToFileURL(path.join(renameWorkspaceRoot, "src/app.ts")).toString();

  test("maps one validated TypeScript and Aurelia rename plan", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const templateText = "<p>${title}</p>";
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
      lookupText: vi.fn(() => templateText),
      lookupDocumentSnapshot: vi.fn((uri: string) =>
        canonicalDocumentUri(uri).uri.endsWith("/src/app.html")
          ? snapshot(uri, templateText, 4, "html")
          : null,
      ),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        status: "available",
        reason: null,
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: {
          kind: "source-span-address",
          label: "src/app.ts@12..17",
          path: "src/app.ts",
          start: 12,
          end: 17,
        },
        activeSource: {
          kind: "source-span-address",
          label: "src/app.ts@12..17",
          path: "src/app.ts",
          start: 12,
          end: 17,
        },
        edits: [
          {
            editKind: "typescript-reference",
            source: {
              kind: "source-span-address",
              label: "src/app.ts@12..17",
              path: "src/app.ts",
              start: 12,
              end: 17,
            },
            oldText: "title",
            newText: "heading",
          },
          {
            editKind: "template-usage",
            source: {
              kind: "source-span-address",
              label: "src/app.html@5..10",
              path: "src/app.html",
              start: 5,
              end: 10,
            },
            oldText: "title",
            newText: "heading",
          },
        ],
        candidateRows: [],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 1,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      {
        uri: tsDocument.uri,
        position: { line: 0, character: 12 },
        newName: "heading",
      },
      testRequestGuard,
    );

    expect(
      ctx.semanticRuntime.templateRenameFromTypeScript,
    ).toHaveBeenCalledWith(
      tsDocument,
      { line: 0, character: 12 },
      testRequestGuard,
      "heading",
    );
    expect(result).toMatchObject({
      status: "success",
      templateReferenceCount: 1,
      typeScriptReferenceCount: 1,
      candidateCount: 0,
    });
    if (result.status !== "success") {
      throw new Error("Expected successful rename propagation.");
    }
    const changes = result.workspaceEdit.documentChanges ?? [];
    expect(changes).toHaveLength(2);
    expect(changes[0]).toMatchObject({
      textDocument: {
        uri: expect.stringContaining("src/app.ts"),
        version: 1,
      },
    });
    expect(changes[1]).toMatchObject({
      textDocument: {
        uri: expect.stringContaining("src/app.html"),
        version: 4,
      },
    });
    expect("edits" in changes[1]! ? changes[1].edits : []).toEqual([
      {
        range: {
          start: { line: 0, character: 5 },
          end: { line: 0, character: 10 },
        },
        newText: "heading",
      },
    ]);
  });

  test("maps semantic-runtime preparation for a cross-domain symbol", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "available",
      value: {
        displayText: "available",
        status: "available",
        reason: null,
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: null,
        activeSource: {
          kind: "source-span-address",
          label: "src/app.ts@12..17",
          path: "src/app.ts",
          start: 12,
          end: 17,
        },
        edits: [],
        candidateRows: [],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      { uri: tsDocument.uri, position: { line: 0, character: 13 } },
      testRequestGuard,
    );

    expect(result).toEqual({
      status: "available",
      range: {
        start: { line: 0, character: 12 },
        end: { line: 0, character: 17 },
      },
      placeholder: "title",
      message: "available",
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
      candidateCount: 0,
    });
    expect(ctx.semanticRuntime.templateRenameFromTypeScript).toHaveBeenCalledWith(
      tsDocument,
      { line: 0, character: 13 },
      testRequestGuard,
      null,
    );
  });

  test("returns not-applicable when a TypeScript symbol has no Aurelia references", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "not applicable",
      value: {
        displayText: "No proven Aurelia references.",
        status: "not-available",
        reason: "no-aurelia-references",
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: null,
        activeSource: null,
        edits: [],
        candidateRows: [],
        templateReferenceCount: 0,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      {
        uri: tsDocument.uri,
        position: { line: 0, character: 12 },
        newName: "heading",
      },
      testRequestGuard,
    );

    expect(result).toMatchObject({
      status: "not-applicable",
      reason: "no-aurelia-references",
      templateReferenceCount: 0,
      typeScriptReferenceCount: 0,
      candidateCount: 0,
    });
  });

  test("returns blocked when any cross-domain edit fails old-text validation", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
      lookupText: vi.fn(() => "<p>${stale}</p>"),
      lookupDocumentSnapshot: vi.fn((uri: string) =>
        canonicalDocumentUri(uri).uri.endsWith("/src/app.html")
          ? snapshot(uri, "<p>${stale}</p>", 4, "html")
          : null,
      ),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        status: "available",
        reason: null,
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: null,
        activeSource: null,
        edits: [
          {
            editKind: "template-usage",
            source: {
              kind: "source-span-address",
              label: "src/app.html@5..10",
              path: "src/app.html",
              start: 5,
              end: 10,
            },
            oldText: "title",
            newText: "heading",
          },
        ],
        candidateRows: [],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      {
        uri: tsDocument.uri,
        position: { line: 0, character: 12 },
        newName: "heading",
      },
      testRequestGuard,
    );

    expect(result).toMatchObject({
      status: "blocked",
      reason: "mapping-failed",
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
      candidateCount: 0,
    });
    expect(result.status === "blocked" ? result.failures?.[0] : "").toContain(
      'expected "title"',
    );
  });
});
