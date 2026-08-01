import { test, expect, describe, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  canonicalDocumentUri,
  handleDumpState,
  handleGetDiagnostics,
  handleCapabilities,
  handleInspectEntity,
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
      templateCursorInfo: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock",
          value: {
            displayText: "mock",
            siteKind: "unknown",
            expressionFrontier: null,
            missingInputs: [],
            template: { compilationLane: "app-runtime", source: null },
            html: {
              nodeKind: null,
              tagName: null,
              attributeName: null,
              attributeValue: null,
              source: null,
              attributeSource: null,
            },
            valueSite: null,
            selectedDefinition: null,
            selectedBindable: null,
            selectedMemberName: null,
            selectedMember: null,
            memberOwnerType: null,
            diagnostics: [],
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

describe("handleInspectEntity", () => {
  test("returns runtime cursor member details", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.templateCursorInfo.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "title member",
        siteKind: "expression-member",
        expressionFrontier: {
          frontierKind: "member",
          expectedContinuationClasses: [],
        },
        missingInputs: [],
        template: { compilationLane: "app-runtime", source: null },
        html: {
          nodeKind: "element",
          tagName: "h1",
          attributeName: null,
          attributeValue: null,
          source: null,
          attributeSource: null,
        },
        valueSite: {
          siteKind: "interpolation",
          rawValue: "title",
          entryFamily: "text",
          bindingCommandName: null,
          bindableName: null,
          bindableAttribute: null,
          source: null,
        },
        selectedDefinition: null,
        selectedBindable: null,
        selectedMemberName: "title",
        selectedMember: {
          name: "title",
          memberKind: "property",
          typeDisplay: "string",
          isOptional: false,
          isReadonly: true,
          source: {
            kind: "source-span-address",
            label: "src/app.ts@10..15",
            path: "src/app.ts",
            start: 10,
            end: 15,
          },
        },
        memberOwnerType: {
          display: "App",
          shapeKind: "object",
          origin: "source",
          source: null,
          declarationSource: {
            kind: "source-span-address",
            label: "src/app.ts@0..3",
            path: "src/app.ts",
            start: 0,
            end: 3,
          },
        },
        diagnostics: [],
      },
      page: null,
    });

    const result = await handleInspectEntity(
      ctx as never,
      {
        uri: "file:///test.html",
        position: { line: 0, character: 3 },
      },
      testRequestGuard,
    );

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      expect.objectContaining({}),
      { line: 0, character: 3 },
      testRequestGuard,
    );
    expect(result).toEqual(
      expect.objectContaining({
        uri: "file:///test.html",
        entityKind: "member",
        expressionLabel: "title",
        confidence: expect.objectContaining({
          type: "projected",
          scope: "source-backed",
          composite: "answered:not-applicable:complete",
        }),
        detail: expect.objectContaining({
          kind: "member",
          name: "title",
          symbolKind: "property",
          symbolType: "string",
          ownerType: "App",
          rawValue: "title",
          htmlTag: "h1",
        }),
      }),
    );
  });

  test("returns null when runtime cursor info has no inspectable fact", async () => {
    const ctx = createMockContext();

    const result = await handleInspectEntity(
      ctx as never,
      {
        uri: "file:///test.html",
        position: { line: 0, character: 3 },
      },
      testRequestGuard,
    );

    expect(result).toBeNull();
  });
});

describe("handleRenameFromTs", () => {
  test("maps semantic-runtime template rename propagation edits", async () => {
    const tsDocument = TextDocument.create(
      "file:///test/workspace/src/app.ts",
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const templateText = "<p>${title}</p>";
    const ctx = createMockContext({
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
      candidateCount: 0,
    });
    if (result.status !== "success") {
      throw new Error("Expected successful rename propagation.");
    }
    const [change] = result.workspaceEdit.documentChanges ?? [];
    expect(change).toMatchObject({
      textDocument: {
        uri: expect.stringContaining("src/app.html"),
        version: 4,
      },
    });
    expect("edits" in change! ? change.edits : []).toEqual([
      {
        range: {
          start: { line: 0, character: 5 },
          end: { line: 0, character: 10 },
        },
        newText: "heading",
      },
    ]);
  });

  test("returns not-applicable when runtime has no template propagation edits", async () => {
    const tsDocument = TextDocument.create(
      "file:///test/workspace/src/app.ts",
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      ensureProgramDocument: vi.fn(() => tsDocument),
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
      reason: "no-template-edits",
      templateReferenceCount: 0,
      candidateCount: 0,
    });
  });

  test("returns blocked when template propagation edits fail old-text validation", async () => {
    const tsDocument = TextDocument.create(
      "file:///test/workspace/src/app.ts",
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
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
      candidateCount: 0,
    });
    expect(result.status === "blocked" ? result.failures?.[0] : "").toContain(
      'expected "title"',
    );
  });
});

describe("handleDumpState", () => {
  test("returns server state summary", () => {
    const ctx = createMockContext();
    ctx.documents.all.mockReturnValue([{}, {}]);

    const result = handleDumpState(ctx as never);

    expect(result).toEqual({
      workspaceRoot: "/test/workspace",
      fingerprint: "semantic-runtime:/test/workspace:2",
      openDocumentCount: 2,
      engine: "semantic-runtime",
    });
  });

  test("returns error object on failure", () => {
    const ctx = createMockContext({
      documents: {
        all: vi.fn(() => {
          throw new Error("document registry crashed");
        }),
      },
    });

    const result = handleDumpState(ctx as never);

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain(
      "document registry crashed",
    );
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("dumpState"),
    );
  });
});

describe("handleCapabilities", () => {
  test("advertises live semantic-runtime contracts without retired custom artifacts", () => {
    const ctx = createMockContext();

    const result = handleCapabilities(ctx as never);

    expect(result.contracts).toEqual(
      expect.objectContaining({
        query: { version: "query/1" },
        diagnostics: {
          version: "diagnostics/1",
          taxonomy: "diagnostics-taxonomy/1",
        },
        semanticTokens: expect.objectContaining({ version: "tokens/1" }),
        presentation: { version: "presentation/1" },
      }),
    );
    expect(result.contracts).not.toHaveProperty("mapping");
    expect(result).not.toHaveProperty("custom");
    expect(result.notifications).toEqual({
      analysisReady: true,
      workspaceChanged: true,
    });
    expect(result.lsp.optional.documentSymbol).toBe(true);
    expect(result.lsp.optional.workspaceSymbol).toBe(true);
    expect(result.lsp.optional.documentHighlight).toBe(true);
    expect(result.lsp.optional.selectionRange).toBe(true);
    expect(result.lsp.optional.linkedEditingRange).toBe(true);
    expect(result.lsp.optional.foldingRange).toBe(true);
    expect(result.lsp.optional.inlayHint).toBe(true);
    expect(result.lsp.optional.codeLens).toBe(true);
  });
});
