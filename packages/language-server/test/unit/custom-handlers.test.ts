import { test, expect, describe, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  canonicalDocumentUri,
  handleDumpState,
  handleGetDiagnostics,
  handleCapabilities,
  handleInspectEntity,
  handleRenameFromTs,
} from "@aurelia-ls/language-server/api";

function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
}

function createMockContext(overrides: Record<string, unknown> = {}) {
  const logger = createMockLogger();
  return {
    logger,
    ensureProgramDocument: vi.fn(() => ({ offsetAt: vi.fn(() => 0) })),
    lookupText: vi.fn(() => null),
    workspaceRoot: "/test/workspace",
    documents: {
      all: vi.fn(() => []),
    },
    semanticRuntime: {
      appDiagnostics: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock",
        value: { displayText: "mock", typeScript: null, rows: [] },
        page: null,
      })),
      templateCursorInfo: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
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
      })),
      templateRenameFromTypeScript: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
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
          templateReferenceCount: 0,
          typeScriptReferenceCount: 0,
        },
        page: null,
      })),
    },
    ...overrides,
  };
}

describe("handleGetDiagnostics", () => {
  test("returns semantic-runtime diagnostics in the report snapshot envelope", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.appDiagnostics.mockResolvedValue({
      schemaVersion: "0.1",
      outcome: "hit",
      closure: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        typeScript: null,
        rows: [
          {
            projectKey: "app",
            diagnosticDomain: "template",
            diagnosticKind: "missing-expression-member",
            diagnosticAuthority: "semantic-runtime-product",
            frameworkErrorCode: null,
            severity: "warning",
            summary: "Cannot find member title.",
            source: {
              kind: "source-span-address",
              label: "src/app.html@4..9",
              path: "src/app.html",
              start: 4,
              end: 9,
              role: "range",
            },
            relatedQueryKind: "template-diagnostics",
          },
        ],
      },
      page: null,
    });

    const result = await handleGetDiagnostics(ctx as never, { uri: "file:///test.html" });

    expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(result).toEqual({
      uri: canonicalDocumentUri("file:///test.html").uri,
      fingerprint: "semantic-runtime:hit",
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
        suppressed: [],
      },
    });
    expect(result?.diagnostics.bySurface.lsp[0]?.data).toEqual(expect.objectContaining({
      semanticRuntime: true,
      diagnosticKind: "missing-expression-member",
      relatedQueryKind: "template-diagnostics",
    }));
  });

  test("maps runtime informational severity to report info severity", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.appDiagnostics.mockResolvedValue({
      schemaVersion: "0.1",
      outcome: "hit",
      closure: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        typeScript: null,
        rows: [
          {
            projectKey: "app",
            diagnosticDomain: "typescript",
            diagnosticKind: "ts-info",
            diagnosticAuthority: "typescript",
            frameworkErrorCode: "TS1234",
            severity: "information",
            summary: "Info diagnostic.",
            source: null,
            relatedQueryKind: "app-diagnostics",
          },
        ],
      },
      page: null,
    });

    const result = await handleGetDiagnostics(ctx as never, { uri: "file:///test.html" });

    expect(result?.diagnostics.bySurface.lsp[0]).toEqual(expect.objectContaining({
      code: "TS1234",
      severity: "info",
      impact: "informational",
      category: "expression",
      uri: undefined,
      span: undefined,
    }));
  });
});

describe("handleInspectEntity", () => {
  test("returns runtime cursor member details", async () => {
    const ctx = createMockContext();
    ctx.semanticRuntime.templateCursorInfo.mockResolvedValue({
      schemaVersion: "0.1",
      outcome: "hit",
      closure: "complete",
      summary: "mock",
      value: {
        displayText: "title member",
        siteKind: "expression-member",
        expressionFrontier: { frontierKind: "member", expectedContinuationClasses: [] },
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

    const result = await handleInspectEntity(ctx as never, {
      uri: "file:///test.html",
      position: { line: 0, character: 3 },
    });

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      expect.objectContaining({}),
      { line: 0, character: 3 },
    );
    expect(result).toEqual(expect.objectContaining({
      uri: "file:///test.html",
      entityKind: "member",
      expressionLabel: "title",
      confidence: expect.objectContaining({
        type: "projected",
        scope: "source-backed",
        composite: "hit",
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
    }));
  });

  test("returns null when runtime cursor info has no inspectable fact", async () => {
    const ctx = createMockContext();

    const result = await handleInspectEntity(ctx as never, {
      uri: "file:///test.html",
      position: { line: 0, character: 3 },
    });

    expect(result).toBeNull();
  });
});

describe("handleRenameFromTs", () => {
  test("maps semantic-runtime template rename propagation edits", async () => {
    const tsDocument = TextDocument.create("file:///test/workspace/src/app.ts", "typescript", 1, "class App { title = ''; }");
    const templateText = "<p>${title}</p>";
    const ctx = createMockContext({
      ensureProgramDocument: vi.fn(() => tsDocument),
      lookupText: vi.fn(() => templateText),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.1",
      outcome: "hit",
      closure: "complete",
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
        templateReferenceCount: 1,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(ctx as never, {
      uri: tsDocument.uri,
      position: { line: 0, character: 12 },
      newName: "heading",
    });

    expect(ctx.semanticRuntime.templateRenameFromTypeScript).toHaveBeenCalledWith(
      tsDocument,
      { line: 0, character: 12 },
      "heading",
    );
    const [templateUri, edits] = Object.entries(result?.changes ?? {})[0] ?? [];
    expect(templateUri).toContain("src/app.html");
    expect(edits).toEqual([
      {
        range: {
          start: { line: 0, character: 5 },
          end: { line: 0, character: 10 },
        },
        newText: "heading",
      },
    ]);
  });

  test("returns null when runtime has no template propagation edits", async () => {
    const tsDocument = TextDocument.create("file:///test/workspace/src/app.ts", "typescript", 1, "class App { title = ''; }");
    const ctx = createMockContext({
      ensureProgramDocument: vi.fn(() => tsDocument),
    });

    const result = await handleRenameFromTs(ctx as never, {
      uri: tsDocument.uri,
      position: { line: 0, character: 12 },
      newName: "heading",
    });

    expect(result).toBeNull();
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
        all: vi.fn(() => { throw new Error("document registry crashed"); }),
      },
    });

    const result = handleDumpState(ctx as never);

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("document registry crashed");
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("dumpState"));
  });
});

describe("handleCapabilities", () => {
  test("advertises live semantic-runtime contracts without retired custom artifacts", () => {
    const ctx = createMockContext();

    const result = handleCapabilities(ctx as never);

    expect(result.contracts).toEqual(expect.objectContaining({
      query: { version: "query/1" },
      diagnostics: { version: "diagnostics/1", taxonomy: "diagnostics-taxonomy/1" },
      semanticTokens: expect.objectContaining({ version: "tokens/1" }),
      presentation: { version: "presentation/1" },
    }));
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
