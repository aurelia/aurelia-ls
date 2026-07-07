import { describe, test, expect, vi } from "vitest";
import { CompletionItemKind, ResponseError } from "vscode-languageserver/node.js";
import {
  COMPLETION_GAP_MARKER_LABEL,
  canonicalDocumentUri,
  handleCodeAction,
  handleCompletion,
  handleDefinition,
  handleHover,
  handleDocumentHighlight,
  handlePrepareRename,
  handleReferences,
  handleRename,
} from "@aurelia-ls/language-server/api";

const testText = "<template>\n  <my-el></my-el>\n</template>";
const renameText = "<template>${title}</template>";
const renameStart = renameText.indexOf("title");
const definitionLspUri = "file:///app/src/my-app.ts";
const definitionUri = canonicalDocumentUri(definitionLspUri).uri;
const definitionText = "export class MyApp {\n  message = \"hello\";\n}";
const renameDefinitionText = "export class MyApp {\n  title = \"hello\";\n  summary() { return this.title; }\n}";
const renameDefinitionStart = renameDefinitionText.indexOf("title");
const codeActionText = "<template>${titel}</template>";
const codeActionStart = codeActionText.indexOf("titel");
const codeActionInsertionOffset = definitionText.lastIndexOf("\n}");

function createMockRenameContext(value: Record<string, unknown>) {
  const document = {
    uri: "file:///app/src/my-app.html",
    languageId: "html",
    offsetAt: vi.fn(() => renameStart + 1),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    getText: vi.fn(() => renameText),
  };
  return {
    workspaceRoot: "/app",
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    trace: {
      spanAsync: vi.fn((_name: string, run: () => Promise<unknown>) => run()),
    },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateRename: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: value.status === "available" ? "hit" : "miss",
        closure: "complete",
        summary: "mock semantic-runtime rename answer",
        value: { candidateRows: [], ...value },
      })),
    },
    lookupText: vi.fn((uri: string) => (uri === definitionUri ? renameDefinitionText : null)),
  };
}

function createMockCompletionContext(input: {
  completions: ReadonlyArray<{
    name: string;
    candidateKind?: string;
    sourceKind?: string;
    detail?: string;
    typeDisplay?: string | null;
    memberKind?: string | null;
  }>;
  isIncomplete?: boolean;
}) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => ({
      uri: "file:///app/src/my-app.html",
      offsetAt: vi.fn(() => 0),
    })),
    semanticRuntime: {
      templateCompletions: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: input.isIncomplete ? "partial" : "hit",
        closure: "complete",
        summary: "mock semantic-runtime completion answer",
        value: {
          displayText: "mock",
          siteKind: "expression",
          candidates: input.completions.map((completion) => ({
            candidateKind: completion.candidateKind ?? "binding-context-slot",
            name: completion.name,
            sourceKind: completion.sourceKind ?? "binding-scope",
            summary: completion.detail ?? null,
            typeDisplay: completion.typeDisplay ?? null,
            memberKind: completion.memberKind ?? "property",
            memberVisibility: "public",
            memberIsOptional: false,
            memberIsReadonly: false,
            aureliaHookKind: null,
          })),
          expressionFrontier: null,
          missingInputs: input.isIncomplete ? ["mock-gap"] : [],
          template: {
            compilationLane: "app-runtime",
            source: null,
          },
        },
        page: {
          size: input.completions.length,
          cursor: null,
          nextCursor: null,
          returnedRows: input.completions.length,
          totalRows: input.completions.length,
        },
      })),
    },
    lookupText: vi.fn(() => testText),
  };
}

function createMockHoverContext() {
  const document = {
    uri: "file:///app/src/my-app.html",
    offsetAt: vi.fn(() => 14),
  };
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateCursorInfo: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock semantic-runtime cursor answer",
        value: {
          displayText: "mock",
          siteKind: "expression",
          expressionFrontier: null,
          missingInputs: [],
          template: { compilationLane: "authoring", source: null },
          html: {
            nodeKind: "element",
            tagName: "div",
            attributeName: null,
            attributeValue: null,
            source: null,
            attributeSource: null,
          },
          valueSite: null,
          selectedDefinition: null,
          selectedBindable: null,
          selectedMemberName: "message",
          selectedMember: {
            name: "message",
            memberKind: "property",
            typeDisplay: "string",
            isOptional: false,
            isReadonly: false,
            source: null,
          },
          memberOwnerType: {
            display: "MyApp",
            shapeKind: "object",
            origin: "typescript",
            source: null,
            declarationSource: null,
          },
          diagnostics: [],
        },
      })),
    },
  };
}

function createMockDefinitionContext(
  routeRows: unknown[] = [],
  options: { readonly selectedMemberSource?: unknown } = {},
) {
  const messageStart = definitionText.indexOf("message");
  const selectedMemberSource = options.selectedMemberSource === undefined
    ? {
        kind: "typescript-node",
        label: `${definitionLspUri}@${messageStart}..${messageStart + "message".length}`,
        path: definitionLspUri,
        start: messageStart,
        end: messageStart + "message".length,
      }
    : options.selectedMemberSource;
  const document = {
    uri: "file:///app/src/my-app.html",
    offsetAt: vi.fn(() => 14),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    getText: vi.fn(() => testText),
  };
  return {
    workspaceRoot: "/app",
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      routeNodes: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock semantic-runtime route-node answer",
        value: { rows: routeRows },
        page: null,
      })),
      templateCursorInfo: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock semantic-runtime cursor answer",
        value: {
          displayText: "mock",
          siteKind: "expression",
          expressionFrontier: null,
          missingInputs: [],
          template: { compilationLane: "authoring", source: null },
          html: {
            nodeKind: "text",
            tagName: null,
            attributeName: null,
            attributeValue: null,
            source: null,
            attributeSource: null,
          },
          valueSite: null,
          selectedDefinition: null,
          selectedBindable: null,
          selectedMemberName: "message",
          selectedMember: {
            name: "message",
            memberKind: "property",
            typeDisplay: "string",
            isOptional: false,
            isReadonly: false,
            source: selectedMemberSource,
          },
          memberOwnerType: null,
          diagnostics: [],
        },
      })),
    },
    lookupText: vi.fn((uri: string) => (uri === definitionUri ? definitionText : null)),
  };
}

function createMockReferencesContext() {
  const messageStart = testText.indexOf("my-el");
  const declarationStart = definitionText.indexOf("message");
  const document = {
    uri: "file:///app/src/my-app.html",
    offsetAt: vi.fn(() => messageStart),
    getText: vi.fn(() => testText),
  };
  return {
    workspaceRoot: "/app",
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateReferences: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock semantic-runtime references answer",
        value: {
          displayText: "mock",
          selectedMemberName: "message",
          targetSource: {
            kind: "typescript-node",
            label: `src/my-app.ts@${declarationStart}..${declarationStart + "message".length}`,
            path: definitionLspUri,
            start: declarationStart,
            end: declarationStart + "message".length,
          },
          rows: [
            {
              referenceKind: "template-usage",
              name: "message",
              definitionName: "my-app",
              bindingKind: "property",
              dependencyKind: "template-expression-read",
              source: {
                kind: "source-span-address",
                label: `src/my-app.html@${messageStart}..${messageStart + "my-el".length}`,
                path: "file:///app/src/my-app.html",
                start: messageStart,
                end: messageStart + "my-el".length,
              },
              targetSource: null,
            },
            {
              referenceKind: "declaration",
              name: "message",
              definitionName: null,
              bindingKind: null,
              dependencyKind: null,
              source: {
                kind: "typescript-node",
                label: `src/my-app.ts@${declarationStart}..${declarationStart + "message".length}`,
                path: definitionLspUri,
                start: declarationStart,
                end: declarationStart + "message".length,
              },
              targetSource: null,
            },
          ],
        },
        page: null,
      })),
    },
    lookupText: vi.fn((uri: string) => (uri === definitionUri ? definitionText : null)),
  };
}

function createMockCodeActionContext(input: { actions?: unknown[] } = {}) {
  const document = {
    uri: "file:///app/src/my-app.html",
    offsetAt: vi.fn(() => codeActionStart + 1),
    getText: vi.fn(() => codeActionText),
  };
  const actions = input.actions ?? [
    {
      title: "Declare member 'titel' on MyApp",
      kind: "quickfix",
      diagnosticKind: "missing-expression-member",
      suggestionKind: "declare-explicit-member",
      actionKind: "declare-member",
      diagnosticSource: {
        kind: "source-span-address",
        label: `src/my-app.html@${codeActionStart}..${codeActionStart + "titel".length}`,
        path: "file:///app/src/my-app.html",
        start: codeActionStart,
        end: codeActionStart + "titel".length,
      },
      actionTarget: null,
      edits: [
        {
          editKind: "declare-view-model-member",
          source: {
            kind: "typescript-node",
            label: `${definitionLspUri}@${codeActionInsertionOffset}..${codeActionInsertionOffset}`,
            path: definitionLspUri,
            start: codeActionInsertionOffset,
            end: codeActionInsertionOffset,
          },
          oldText: null,
          newText: "\n  titel!: unknown;",
        },
      ],
      isPreferred: true,
    },
  ];
  return {
    workspaceRoot: "/app",
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateCodeActions: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock semantic-runtime code actions answer",
        value: {
          displayText: `${actions.length} template code action(s).`,
          rows: actions,
        },
      })),
    },
    lookupText: vi.fn((uri: string) => (uri === definitionUri ? definitionText : null)),
  };
}

describe("handleRename", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 14 },
    newName: "heading",
  };

  test("throws ResponseError with semantic-runtime denial message", async () => {
    const ctx = createMockRenameContext({
      displayText: "No source-backed template member is selected at this cursor.",
      status: "not-available",
      reason: "no-source-backed-member",
      selectedMemberName: null,
      placeholder: null,
      targetSource: null,
      activeSource: null,
      edits: [],
      templateReferenceCount: 0,
      typeScriptReferenceCount: 0,
    });

    await expect(handleRename(ctx as never, params)).rejects.toThrow(ResponseError);
    await expect(handleRename(ctx as never, params)).rejects.toMatchObject({
      message: "No source-backed template member is selected at this cursor.",
    });
  });

  test("returns mapped WorkspaceEdit on semantic-runtime rename success", async () => {
    const ctx = createMockRenameContext({
      displayText: "2 rename edit(s) for title.",
      status: "available",
      reason: null,
      selectedMemberName: "title",
      placeholder: "title",
      targetSource: null,
      activeSource: {
        kind: "source-span-address",
        label: `src/my-app.html@${renameStart}..${renameStart + "title".length}`,
        path: "file:///app/src/my-app.html",
        start: renameStart,
        end: renameStart + "title".length,
      },
      edits: [
        {
          editKind: "template-usage",
          source: {
            kind: "source-span-address",
            label: `src/my-app.html@${renameStart}..${renameStart + "title".length}`,
            path: "file:///app/src/my-app.html",
            start: renameStart,
            end: renameStart + "title".length,
          },
          oldText: "title",
          newText: "heading",
        },
        {
          editKind: "typescript-reference",
          source: {
            kind: "typescript-node",
            label: `${definitionLspUri}@${renameDefinitionStart}..${renameDefinitionStart + "title".length}`,
            path: definitionLspUri,
            start: renameDefinitionStart,
            end: renameDefinitionStart + "title".length,
          },
          oldText: "title",
          newText: "heading",
        },
      ],
      templateReferenceCount: 1,
      typeScriptReferenceCount: 1,
    });

    const result = await handleRename(ctx as never, params);
    expect(result).not.toBeNull();
    const uris = Object.keys(result!.changes ?? {});
    expect(uris.sort()).toEqual(["file:///app/src/my-app.html", definitionLspUri].sort());
    expect(result!.changes!["file:///app/src/my-app.html"]).toEqual([
      expect.objectContaining({ newText: "heading" }),
    ]);
    expect(result!.changes![definitionLspUri]).toEqual([
      expect.objectContaining({ newText: "heading" }),
    ]);
  });
});

describe("handlePrepareRename", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 14 },
  };

  test("maps semantic-runtime rename preflight to range and placeholder", async () => {
    const ctx = createMockRenameContext({
      displayText: "Rename is available for title.",
      status: "available",
      reason: null,
      selectedMemberName: "title",
      placeholder: "title",
      targetSource: null,
      activeSource: {
        kind: "source-span-address",
        label: `src/my-app.html@${renameStart}..${renameStart + "title".length}`,
        path: "file:///app/src/my-app.html",
        start: renameStart,
        end: renameStart + "title".length,
      },
      edits: [],
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
    });

    const result = await handlePrepareRename(ctx as never, params);

    expect(ctx.semanticRuntime.templateRename).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///app/src/my-app.html" }),
      params.position,
    );
    expect(result).toEqual({
      range: {
        start: { line: 0, character: renameStart },
        end: { line: 0, character: renameStart + "title".length },
      },
      placeholder: "title",
    });
  });
});

describe("handleReferences", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 1, character: 3 },
    context: { includeDeclaration: true },
  };

  test("maps semantic-runtime template references to locations", async () => {
    const ctx = createMockReferencesContext();

    const result = await handleReferences(ctx as never, params);

    expect(ctx.semanticRuntime.templateReferences).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///app/src/my-app.html" }),
      params.position,
      true,
    );
    expect(result).toHaveLength(2);
    expect(result?.[0]?.uri).toBe("file:///app/src/my-app.html");
    expect(result?.[0]?.range.start).toEqual({ line: 1, character: 3 });
    expect(result?.[1]?.uri).toBe(definitionLspUri);
    expect(result?.[1]?.range.start).toEqual({ line: 1, character: 2 });
  });
});

describe("handleDocumentHighlight", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 1, character: 3 },
  };

  test("maps same-document semantic-runtime references to document highlights", async () => {
    const ctx = createMockReferencesContext();

    const result = await handleDocumentHighlight(ctx as never, params);

    expect(ctx.semanticRuntime.templateReferences).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///app/src/my-app.html" }),
      params.position,
      false,
    );
    expect(result).toEqual([
      {
        range: {
          start: { line: 1, character: 3 },
          end: { line: 1, character: 8 },
        },
        kind: 1,
      },
    ]);
  });
});

describe("handleCodeAction", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    range: {
      start: { line: 0, character: codeActionStart + 1 },
      end: { line: 0, character: codeActionStart + 1 },
    },
    context: { diagnostics: [] },
  };

  test("maps semantic-runtime template code actions to LSP quickfixes", async () => {
    const ctx = createMockCodeActionContext();

    const result = await handleCodeAction(ctx as never, params);

    expect(ctx.semanticRuntime.templateCodeActions).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///app/src/my-app.html" }),
      params.range.start,
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]).toEqual(expect.objectContaining({
      title: "Declare member 'titel' on MyApp",
      kind: "quickfix",
      isPreferred: true,
    }));
    expect(result?.[0]?.edit?.changes?.[definitionLspUri]).toEqual([
      expect.objectContaining({ newText: "\n  titel!: unknown;" }),
    ]);
  });

  test("returns null when semantic-runtime has no applicable code actions", async () => {
    const ctx = createMockCodeActionContext({ actions: [] });

    await expect(handleCodeAction(ctx as never, params)).resolves.toBeNull();
  });

  test("does not offer a code action when any edit row cannot be mapped", async () => {
    const ctx = createMockCodeActionContext({
      actions: [{
        title: "Declare member 'titel' on MyApp",
        kind: "quickfix",
        diagnosticKind: "missing-expression-member",
        suggestionKind: "declare-explicit-member",
        actionKind: "declare-member",
        diagnosticSource: null,
        actionTarget: null,
        edits: [
          {
            editKind: "declare-view-model-member",
            source: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${codeActionInsertionOffset}..${codeActionInsertionOffset}`,
              path: definitionLspUri,
              start: codeActionInsertionOffset,
              end: codeActionInsertionOffset,
            },
            oldText: null,
            newText: "\n  titel!: unknown;",
          },
          {
            editKind: "declare-view-model-member",
            source: null,
            oldText: null,
            newText: "\n  partial!: unknown;",
          },
        ],
        isPreferred: true,
      }],
    });

    const result = await handleCodeAction(ctx as never, params);

    expect(result).toBeNull();
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining("skipped unsafe code action"));
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining("has no exact authored source span"));
  });

  test("does not offer a code action when oldText validation fails", async () => {
    const ctx = createMockCodeActionContext({
      actions: [{
        title: "Rewrite stale member",
        kind: "quickfix",
        diagnosticKind: "missing-expression-member",
        suggestionKind: "declare-explicit-member",
        actionKind: "declare-member",
        diagnosticSource: null,
        actionTarget: null,
        edits: [{
          editKind: "declare-view-model-member",
          source: {
            kind: "typescript-node",
            label: `${definitionLspUri}@0..6`,
            path: definitionLspUri,
            start: 0,
            end: 6,
          },
          oldText: "class",
          newText: "interface",
        }],
        isPreferred: true,
      }],
    });

    const result = await handleCodeAction(ctx as never, params);

    expect(result).toBeNull();
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining("expected \"class\""));
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining("document contains \"export\""));
  });
});

describe("handleCompletion", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 5 },
  };

  test("maps semantic-runtime completion candidates and returns CompletionList", async () => {
    const ctx = createMockCompletionContext({
      completions: [
        { name: "message", candidateKind: "binding-context-slot", detail: "Name visible in current view-model.", typeDisplay: "string" },
      ],
    });

    const result = await handleCompletion(ctx as never, params);
    expect(result.isIncomplete).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        label: "message",
        kind: CompletionItemKind.Property,
        detail: "binding-context-slot | string | public",
      }),
    );
  });

  test("signals incomplete list and appends a gap marker when semantic-runtime reports missing inputs", async () => {
    const ctx = createMockCompletionContext({
      completions: [
        { name: "summary-panel", candidateKind: "custom-element" },
      ],
      isIncomplete: true,
    });

    const result = await handleCompletion(ctx as never, params);
    expect(result.isIncomplete).toBe(true);
    expect(result.items.some((item) => item.label === "summary-panel")).toBe(true);
    const marker = result.items.find((item) => item.label === COMPLETION_GAP_MARKER_LABEL);
    expect(marker?.kind).toBe(CompletionItemKind.Text);
    expect(marker?.insertText).toBe("");
  });

  test("signals incomplete list when semantic-runtime answer outcome is partial", async () => {
    const ctx = createMockCompletionContext({
      completions: [
        { name: "summary-panel", candidateKind: "custom-element" },
      ],
      isIncomplete: true,
    });

    const result = await handleCompletion(ctx as never, params);
    expect(result.isIncomplete).toBe(true);
    const marker = result.items.find((item) => item.label === COMPLETION_GAP_MARKER_LABEL);
    expect(marker).toBeDefined();
    expect(marker?.insertText).toBe("");
  });

  test("returns empty CompletionList when document is unavailable", async () => {
    const ctx = createMockCompletionContext({ completions: [] });
    ctx.ensureProgramDocument = vi.fn(() => null);
    const result = await handleCompletion(ctx as never, params);
    expect(result).toEqual({ isIncomplete: false, items: [] });
  });
});

describe("handleHover", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 14 },
  };

  test("maps semantic-runtime cursor info to hover markdown", async () => {
    const ctx = createMockHoverContext();

    const result = await handleHover(ctx as never, params);

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///app/src/my-app.html" }),
      params.position,
    );
    const contents = result?.contents as { value?: string };
    expect(contents.value).toContain("message: string");
    expect(contents.value).toContain("owner: `MyApp`");
  });
});

describe("handleDefinition", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 14 },
  };

  test("maps semantic-runtime cursor info to location links", async () => {
    const ctx = createMockDefinitionContext();

    const result = await handleDefinition(ctx as never, params);

    expect(ctx.semanticRuntime.routeNodes).not.toHaveBeenCalled();
    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///app/src/my-app.html" }),
      params.position,
    );
    expect(Array.isArray(result)).toBe(true);
    const [link] = result as Array<{ targetUri: string; targetRange: { start: { line: number; character: number } } }>;
    expect(link.targetUri).toBe(definitionLspUri);
    expect(link.targetRange.start).toEqual({ line: 1, character: 2 });
  });

  test("prefers route-node targets for router instruction definitions", async () => {
    const routeSource = {
      kind: "source-span-address",
      label: "src/my-app.html@12..18",
      path: "file:///app/src/my-app.html",
      start: 12,
      end: 18,
      role: "value",
    };
    const routeTargetSource = {
      kind: "source-span-address",
      label: "src/my-app.ts@0..6",
      path: definitionLspUri,
      start: 0,
      end: 6,
      role: "range",
    };
    const ctx = createMockDefinitionContext(
      [{
        instruction: { source: routeSource },
        originalInstruction: null,
        routeConfig: {
          routeKind: "child-route",
          id: "tasks",
          source: routeTargetSource,
        },
        routeContext: { label: "MyApp/Tasks", source: null },
        source: routeSource,
      }],
      { selectedMemberSource: null },
    );

    const result = await handleDefinition(ctx as never, params);

    expect(ctx.semanticRuntime.routeNodes).toHaveBeenCalled();
    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    const [link] = result as Array<{
      targetUri: string;
      targetRange: { start: { line: number; character: number }; end: { line: number; character: number } };
      originSelectionRange?: { start: { line: number; character: number }; end: { line: number; character: number } };
    }>;
    expect(link.targetUri).toBe(definitionLspUri);
    expect(link.targetRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 6 },
    });
    expect(link.originSelectionRange).toEqual({
      start: { line: 0, character: 12 },
      end: { line: 0, character: 18 },
    });
  });
});
