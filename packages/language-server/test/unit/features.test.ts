import { describe, test, expect, vi } from "vitest";
import {
  CompletionItemKind,
  LSPErrorCodes,
  ResponseError,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleCodeAction,
  handleCodeActionResolve,
  handleCompletion,
  handleDefinition,
  handleHover,
  handleDocumentHighlight,
  handlePrepareRename,
  handleReferences,
  handleRename,
  registerFeatureHandlers,
} from "../../src/handlers/features.js";
import { SemanticRuntimeLspRequestAbortedError } from "../../src/runtime/semantic-runtime-session.js";
import { workspaceEditChanges } from "../../src/mapping/lsp-types.js";
import {
  createContextTestOperation,
  createTestOperation,
} from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const testText = "<template>\n  <my-el></my-el>\n</template>";
const documentUris = testWorkspaceDocumentUris("/app");
const templateUri = documentUris.uriForWorkspaceRelativePath("src/my-app.html")!;
const renameText = "<template>${title}</template>";
const renameStart = renameText.indexOf("title");
const definitionLspUri = documentUris.uriForWorkspaceRelativePath("src/my-app.ts")!;
const definitionUri = documentUris.resolve(definitionLspUri).uri;
const definitionText = 'export class MyApp {\n  message = "hello";\n}';
const renameDefinitionText =
  'export class MyApp {\n  title = "hello";\n  summary() { return this.title; }\n}';
const renameDefinitionStart = renameDefinitionText.indexOf("title");
const codeActionText = "<template>${titel}</template>";
const codeActionStart = codeActionText.indexOf("titel");
const codeActionInsertionOffset = definitionText.lastIndexOf("\n}");

function createInlayRegistrationHarness(operationOverrides: Record<string, unknown> = {}) {
  let inlayHandler: ((params: unknown, token: unknown) => Promise<unknown>) | null = null;
  let semanticTokensHandler: ((params: unknown, token: unknown) => Promise<unknown>) | null = null;
  let codeActionHandler: ((params: unknown, token: unknown) => Promise<unknown>) | null = null;
  const managedAdmission = vi.fn();
  const getConfiguration = vi.fn(async () => false);
  const semanticRuntime = {
    runRequest: vi.fn(async (
      isCancellationRequested: (() => boolean) | null,
      request: (operation: unknown) => unknown,
    ) => {
      if (isCancellationRequested?.() === true) {
        throw new SemanticRuntimeLspRequestAbortedError("cancelled");
      }
      managedAdmission();
      return await request(createTestOperation({
        authoredSourceOwnership: vi.fn(async () => ({
          value: { owners: [{ projectKey: "app" }] },
        })),
        ...operationOverrides,
      }));
    }),
  };
  const connection = {
    onCompletion: vi.fn(),
    onHover: vi.fn(),
    onDefinition: vi.fn(),
    onReferences: vi.fn(),
    onDocumentHighlight: vi.fn(),
    onPrepareRename: vi.fn(),
    onRenameRequest: vi.fn(),
    onCodeAction: vi.fn((handler: (params: unknown, token: unknown) => Promise<unknown>) => {
      codeActionHandler = handler;
    }),
    onCodeActionResolve: vi.fn(),
    onDocumentSymbol: vi.fn(),
    onWorkspaceSymbol: vi.fn(),
    onSelectionRanges: vi.fn(),
    onFoldingRanges: vi.fn(),
    onRequest: vi.fn((
      _type: unknown,
      handler: (params: unknown, token: unknown) => Promise<unknown>,
    ) => {
      semanticTokensHandler = handler;
    }),
    sendNotification: vi.fn(async () => undefined),
    workspace: { getConfiguration },
    languages: {
      onLinkedEditingRange: vi.fn(),
      inlayHint: {
        on: vi.fn((handler: (params: unknown, token: unknown) => Promise<unknown>) => {
          inlayHandler = handler;
        }),
      },
    },
  };
  const ctx = {
    connection,
    semanticRuntime,
    clientSupport: { configurationPull: true },
    documentUris,
    logger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ownsDocument: vi.fn(() => true),
  };
  registerFeatureHandlers(ctx as never);
  if (inlayHandler == null) throw new Error("Inlay-hint registration was not captured.");
  if (semanticTokensHandler == null) throw new Error("Semantic-token registration was not captured.");
  if (codeActionHandler == null) throw new Error("Code-action registration was not captured.");
  return {
    ctx,
    getConfiguration,
    managedAdmission,
    semanticRuntime,
    inlayHandler,
    semanticTokensHandler,
    codeActionHandler,
  };
}

function mockMissingMemberDiagnostic() {
  const source = {
    kind: "source-span-address",
    label: `src/my-app.html@${codeActionStart}..${
      codeActionStart + "titel".length
    }`,
    path: templateUri,
    start: codeActionStart,
    end: codeActionStart + "titel".length,
  };
  return {
    diagnosticKind: "missing-expression-member",
    diagnosticAuthority: "semantic-authoring-policy",
    frameworkErrorCode: null,
    severity: "error",
    summary: "Member 'titel' does not exist on MyApp.",
    missingInput: "titel",
    missingInputs: ["titel"],
    source,
    relatedInformation: [],
    selectedMemberName: "titel",
    ownerTypeDisplay: "MyApp",
    ownerTypeShapeKind: "class",
    ownerTypeOrigin: "typescript",
    suggestion: {
      suggestionKind: "declare-explicit-member",
      actionKind: "declare-member",
      actionTarget: null,
      summary: "Declare member 'titel' on MyApp.",
      targetMemberName: "titel",
      ownerTypeDisplay: "MyApp",
      valueTypeDisplay: "unknown",
      valueTypeSource: null,
    },
    phase: "binding",
    siteKind: "interpolation",
    valueSiteKind: null,
    template: {
      compilationLane: "html",
      source,
    },
  };
}

function mockMissingMemberRepair() {
  return {
    actionKind: "declare-missing-member",
    planKind: "source-member-declaration",
    changeDomain: "app-source",
    readiness: "ready-to-plan",
    targetSourceCoverage: "all",
    actionability: "guided",
  };
}

function snapshot(
  uri: string,
  text: string,
  version: number | null = null,
  languageId = uri.endsWith(".ts") ? "typescript" : "html",
) {
  return {
    uri: documentUris.resolve(uri).uri,
    languageId,
    version,
    text,
  };
}

function createMockRenameContext(value: Record<string, unknown>) {
  const document = {
    uri: templateUri,
    languageId: "html",
    version: 3,
    offsetAt: vi.fn(() => renameStart + 1),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    getText: vi.fn(() => renameText),
  };
  return {
    workspaceRoot: documentUris.workspaceRoot,
    documentUris,
    connection: { sendNotification: vi.fn() },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    trace: {
      spanAsync: vi.fn((_name: string, run: () => Promise<unknown>) => run()),
    },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateRename: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "exact",
          coverage: "complete",
          summary: "mock semantic-runtime rename answer",
          value: { candidateRows: [], ...value },
        }),
      ),
    },
    lookupText: vi.fn((uri: string) =>
      uri === definitionUri ? renameDefinitionText : null,
    ),
    lookupDocumentSnapshot: vi.fn((uri: string) =>
      documentUris.resolve(uri).uri === definitionUri
        ? snapshot(definitionUri, renameDefinitionText, 8, "typescript")
        : null,
    ),
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
  const document = TextDocument.create(templateUri, "html", 1, testText);
  return {
    workspaceRoot: documentUris.workspaceRoot,
    documentUris,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateCompletions: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "exact",
          coverage: input.isIncomplete ? "open" : "complete",
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
              edit: {
                source: {
                  kind: "source-span-address",
                  label: `${templateUri}@5..5`,
                  path: templateUri,
                  start: 5,
                  end: 5,
                },
                newText: completion.name,
              },
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
        }),
      ),
    },
    lookupText: vi.fn(() => testText),
  };
}

function createMockHoverContext() {
  const text = "<template>${message}</template>";
  const start = text.indexOf("message");
  const document = TextDocument.create(templateUri, "html", 1, text);
  return {
    documentUris,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateCursorInfo: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock semantic-runtime cursor answer",
          value: {
            displayText: "mock",
            siteKind: "expression",
            activeSource: {
              kind: "source-span-address",
              label: `src/my-app.html@${start}..${start + "message".length}`,
              path: "src/my-app.html",
              start,
              end: start + "message".length,
            },
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
        }),
      ),
    },
  };
}

function createMockDefinitionContext(
  options: {
    readonly selectedMemberSource?: unknown;
    readonly selectedRouteTarget?: unknown;
    readonly readableDefinition?: boolean;
  } = {},
) {
  const messageStart = definitionText.indexOf("message");
  const selectedMemberSource =
    options.selectedMemberSource === undefined
      ? {
          kind: "typescript-node",
          label: `${definitionLspUri}@${messageStart}..${
            messageStart + "message".length
          }`,
          path: definitionLspUri,
          start: messageStart,
          end: messageStart + "message".length,
        }
      : options.selectedMemberSource;
  const document = {
    uri: templateUri,
    languageId: "html",
    offsetAt: vi.fn(() => 14),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    getText: vi.fn(() => testText),
  };
  return {
    workspaceRoot: documentUris.workspaceRoot,
    documentUris,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateCursorInfo: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
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
            selectedRouteTarget: options.selectedRouteTarget ?? null,
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
        }),
      ),
    },
    lookupText: vi.fn((uri: string) =>
      uri === definitionUri && options.readableDefinition !== false ? definitionText : null,
    ),
  };
}

function createMockReferencesContext(options: {
  readonly candidateRows?: readonly unknown[];
  readonly coverage?: "complete" | "open";
  readonly readableDefinition?: boolean;
} = {}) {
  const messageStart = testText.indexOf("my-el");
  const declarationStart = definitionText.indexOf("message");
  const document = {
    uri: templateUri,
    languageId: "html",
    offsetAt: vi.fn(() => messageStart),
    positionAt: vi.fn((offset: number) => {
      const prefix = testText.slice(0, offset);
      const lines = prefix.split("\n");
      return { line: lines.length - 1, character: lines.at(-1)?.length ?? 0 };
    }),
    getText: vi.fn(() => testText),
  };
  return {
    workspaceRoot: documentUris.workspaceRoot,
    documentUris,
    connection: { sendNotification: vi.fn() },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateReferences: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: options.coverage ?? (options.candidateRows?.length ? "open" : "complete"),
          summary: "mock semantic-runtime references answer",
          value: {
            displayText: "mock",
            selectedMemberName: "message",
            targetSource: {
              kind: "typescript-node",
              label: `src/my-app.ts@${declarationStart}..${
                declarationStart + "message".length
              }`,
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
                dependencyKinds: ["template-expression-read"],
                source: {
                  kind: "source-span-address",
                  label: `src/my-app.html@${messageStart}..${
                    messageStart + "my-el".length
                  }`,
                  path: templateUri,
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
                dependencyKinds: [],
                source: {
                  kind: "typescript-node",
                  label: `src/my-app.ts@${declarationStart}..${
                    declarationStart + "message".length
                  }`,
                  path: definitionLspUri,
                  start: declarationStart,
                  end: declarationStart + "message".length,
                },
                targetSource: null,
              },
            ],
            candidateRows: options.candidateRows ?? [],
          },
          page: null,
        }),
      ),
    },
    lookupText: vi.fn((uri: string) =>
      uri === definitionUri && options.readableDefinition !== false ? definitionText : null,
    ),
  };
}

function createMockCodeActionContext(input: { actions?: unknown[] } = {}) {
  const document = {
    uri: templateUri,
    languageId: "html",
    version: 5,
    offsetAt: vi.fn(() => codeActionStart + 1),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    getText: vi.fn(() => codeActionText),
  };
  const actions = input.actions ?? [
    {
      title: "Declare member 'titel' on MyApp",
      kind: "quickfix",
      diagnostics: [mockMissingMemberDiagnostic()],
      repair: mockMissingMemberRepair(),
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
    workspaceRoot: documentUris.workspaceRoot,
    documentUris,
    clientSupportsCodeActionResolveEdit: true,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      templateCodeActions: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock semantic-runtime code actions answer",
          value: {
            displayText: `${actions.length} template code action(s).`,
            rows: actions,
          },
        }),
      ),
    },
    lookupText: vi.fn((uri: string) =>
      uri === definitionUri ? definitionText : null,
    ),
    lookupDocumentSnapshot: vi.fn((uri: string) =>
      documentUris.resolve(uri).uri === definitionUri
        ? snapshot(definitionUri, definitionText, 9, "typescript")
        : null,
    ),
  };
}

describe("handleRename", () => {
  const params = {
    textDocument: { uri: templateUri },
    position: { line: 0, character: 14 },
    newName: "heading",
  };

  test("throws ResponseError with semantic-runtime denial message", async () => {
    const ctx = createMockRenameContext({
      displayText:
        "No source-backed template member is selected at this cursor.",
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

    await expect(
      handleRename(ctx as never, params, createContextTestOperation(ctx)),
    ).rejects.toThrow(ResponseError);
    await expect(
      handleRename(ctx as never, params, createContextTestOperation(ctx)),
    ).rejects.toMatchObject({
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
        label: `src/my-app.html@${renameStart}..${
          renameStart + "title".length
        }`,
        path: templateUri,
        start: renameStart,
        end: renameStart + "title".length,
      },
      edits: [
        {
          editKind: "template-usage",
          source: {
            kind: "source-span-address",
            label: `src/my-app.html@${renameStart}..${
              renameStart + "title".length
            }`,
            path: templateUri,
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
            label: `${definitionLspUri}@${renameDefinitionStart}..${
              renameDefinitionStart + "title".length
            }`,
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

    const result = await handleRename(ctx as never, params, createContextTestOperation(ctx));
    expect(result).not.toBeNull();
    expect(result!.changes).toBeUndefined();
    expect(result!.documentChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          textDocument: { uri: templateUri, version: 3 },
        }),
        expect.objectContaining({
          textDocument: { uri: definitionLspUri, version: 8 },
        }),
      ]),
    );
    const changes = workspaceEditChanges(result!);
    const uris = Object.keys(changes);
    expect(uris.sort()).toEqual(
      [templateUri, definitionLspUri].sort(),
    );
    expect(changes[templateUri]).toEqual([
      expect.objectContaining({ newText: "heading" }),
    ]);
    expect(changes[definitionLspUri]).toEqual([
      expect.objectContaining({ newText: "heading" }),
    ]);
  });
});

describe("inlay-hint request admission", () => {
  const params = {
    textDocument: { uri: templateUri },
    range: {
      start: { line: 0, character: 0 },
      end: { line: 10, character: 0 },
    },
  };

  test("does not admit semantic work when resource presentation is disabled", async () => {
    const harness = createInlayRegistrationHarness();
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    await expect(harness.inlayHandler(params, token)).resolves.toBeNull();

    expect(harness.getConfiguration).toHaveBeenCalledOnce();
    expect(harness.semanticRuntime.runRequest).not.toHaveBeenCalled();
    expect(harness.managedAdmission).not.toHaveBeenCalled();
  });

  test("does not admit semantic work when resource configuration is unavailable", async () => {
    const harness = createInlayRegistrationHarness();
    harness.getConfiguration.mockRejectedValueOnce(new Error("configuration client unavailable"));
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    await expect(harness.inlayHandler(params, token)).resolves.toBeNull();

    expect(harness.semanticRuntime.runRequest).not.toHaveBeenCalled();
    expect(harness.managedAdmission).not.toHaveBeenCalled();
    expect(harness.ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("configuration client unavailable"),
    );
  });

  test("preserves cancellation while configuration is pending without managed admission", async () => {
    const harness = createInlayRegistrationHarness();
    const configuration = deferredValue<boolean>();
    harness.getConfiguration.mockImplementationOnce(async () => await configuration.promise);
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    const response = harness.inlayHandler(params, token);
    expect(harness.getConfiguration).toHaveBeenCalledOnce();
    expect(harness.semanticRuntime.runRequest).not.toHaveBeenCalled();

    token.isCancellationRequested = true;
    configuration.resolve(false);

    await expect(response).rejects.toMatchObject({ code: LSPErrorCodes.RequestCancelled });
    expect(harness.semanticRuntime.runRequest).toHaveBeenCalledOnce();
    expect(harness.managedAdmission).not.toHaveBeenCalled();
  });

  test("preserves an inlay semantic-envelope failure through the registered request boundary", async () => {
    const document = TextDocument.create(templateUri, "html", 1, testText);
    const harness = createInlayRegistrationHarness({
      documents: { ensureProgramDocument: () => document },
      templateInlayHints: vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "failed",
        selection: "not-applicable",
        coverage: "complete",
        summary: "failed test answer",
        value: { displayText: "0 rows", rows: [] },
        page: null,
      })),
    });
    harness.getConfiguration.mockResolvedValueOnce(true);
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    await expect(harness.inlayHandler(params, token)).rejects.toMatchObject({
      code: LSPErrorCodes.RequestFailed,
      message: expect.stringContaining("inlay hint mapping was blocked"),
    });
  });

  test("preserves a semantic-token envelope failure through the registered request boundary", async () => {
    const document = TextDocument.create(templateUri, "html", 1, testText);
    const harness = createInlayRegistrationHarness({
      documents: { ensureProgramDocument: () => document },
      templateSemanticTokens: vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "open",
        summary: "open test answer",
        value: { displayText: "0 rows", rows: [] },
        page: null,
      })),
    });
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    await expect(harness.semanticTokensHandler(
      { textDocument: { uri: templateUri } },
      token,
    )).rejects.toMatchObject({
      code: LSPErrorCodes.RequestFailed,
      message: expect.stringContaining("semantic token mapping was blocked"),
    });
  });
});

describe("registered code-action failure boundary", () => {
  test("preserves a semantic non-answer as RequestFailed", async () => {
    const document = TextDocument.create(templateUri, "html", 1, codeActionText);
    const harness = createInlayRegistrationHarness({
      documents: { ensureProgramDocument: () => document },
      templateCodeActions: vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "invalid",
        selection: "not-applicable",
        coverage: "not-applicable",
        summary: "invalid test answer",
        value: { displayText: "0 rows", rows: [] },
        page: null,
      })),
    });
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    await expect(harness.codeActionHandler({
      textDocument: { uri: templateUri },
      range: {
        start: { line: 0, character: codeActionStart },
        end: { line: 0, character: codeActionStart },
      },
      context: { diagnostics: [] },
    }, token)).rejects.toMatchObject({
      code: LSPErrorCodes.RequestFailed,
      message: expect.stringContaining("semantic runtime returned result=invalid"),
    });
  });
});

function deferredValue<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

describe("handlePrepareRename", () => {
  const params = {
    textDocument: { uri: templateUri },
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
        label: `src/my-app.html@${renameStart}..${
          renameStart + "title".length
        }`,
        path: templateUri,
        start: renameStart,
        end: renameStart + "title".length,
      },
      edits: [],
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
    });

    const result = await handlePrepareRename(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateRename).toHaveBeenCalledWith(
      templateUri,
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
    textDocument: { uri: templateUri },
    position: { line: 1, character: 3 },
    context: { includeDeclaration: true },
  };

  test("maps semantic-runtime template references to locations", async () => {
    const ctx = createMockReferencesContext();

    const result = await handleReferences(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateReferences).toHaveBeenCalledWith(
      templateUri,
      params.position,
      true,
    );
    expect(result).toHaveLength(2);
    expect(result?.[0]?.uri).toBe(templateUri);
    expect(result?.[0]?.range.start).toEqual({ line: 1, character: 3 });
    expect(result?.[1]?.uri).toBe(definitionLspUri);
    expect(result?.[1]?.range.start).toEqual({ line: 1, character: 2 });
  });

  test("returns verified references and discloses omitted same-name candidates", async () => {
    const ctx = createMockReferencesContext({
      candidateRows: [{
        referenceKind: "template-candidate",
        name: "message",
        source: null,
      }],
    });

    const result = await handleReferences(ctx as never, params, createContextTestOperation(ctx));

    expect(result).toHaveLength(2);
    expect(ctx.connection.sendNotification).toHaveBeenCalledWith(
      "window/showMessage",
      expect.objectContaining({
        type: 3,
        message: expect.stringContaining("1 same-name usage could not be verified"),
      }),
    );
  });

  test("discloses open semantic coverage without concrete candidate rows", async () => {
    const ctx = createMockReferencesContext({ coverage: "open" });

    const result = await handleReferences(ctx as never, params, createContextTestOperation(ctx));

    expect(result).toHaveLength(2);
    expect(ctx.connection.sendNotification).toHaveBeenCalledWith(
      "window/showMessage",
      expect.objectContaining({
        type: 3,
        message: expect.stringContaining("full reference coverage could not be proven"),
      }),
    );
  });

  test("returns the mapped subset and warns when a source-backed row cannot be transported", async () => {
    const ctx = createMockReferencesContext({ readableDefinition: false });

    const result = await handleReferences(ctx as never, params, createContextTestOperation(ctx));

    expect(result).toHaveLength(1);
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("omitted source-backed rows"),
    );
    expect(ctx.connection.sendNotification).toHaveBeenCalledWith(
      "window/showMessage",
      expect.objectContaining({
        type: 2,
        message: expect.stringContaining("1 source-backed reference could not be mapped"),
      }),
    );
  });

  test("does not disguise a failed semantic answer as no references", async () => {
    const ctx = createMockReferencesContext();
    ctx.semanticRuntime.templateReferences.mockResolvedValue({
      result: "failed",
      value: {},
    } as never);

    const error = await handleReferences(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    ).then(() => null, (failure: unknown) => failure);

    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((error as Error).message).toContain("Semantic runtime returned references result=failed");
    expect(ctx.connection.sendNotification).not.toHaveBeenCalled();
  });
});

describe("handleDocumentHighlight", () => {
  const params = {
    textDocument: { uri: templateUri },
    position: { line: 1, character: 3 },
  };

  test("maps same-document semantic-runtime references to document highlights", async () => {
    const ctx = createMockReferencesContext();

    const result = await handleDocumentHighlight(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateReferences).toHaveBeenCalledWith(
      templateUri,
      params.position,
      true,
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

  test("does not disguise an unsupported semantic answer as no highlights", async () => {
    const ctx = createMockReferencesContext();
    ctx.semanticRuntime.templateReferences.mockResolvedValue({
      result: "unsupported",
      value: {},
    } as never);

    const error = await handleDocumentHighlight(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    ).then(() => null, (failure: unknown) => failure);

    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((error as Error).message).toContain("Semantic runtime returned references result=unsupported");
  });
});

describe("handleCodeAction", () => {
  const params = {
    textDocument: { uri: templateUri },
    range: {
      start: { line: 0, character: codeActionStart + 1 },
      end: { line: 0, character: codeActionStart + 1 },
    },
    context: { diagnostics: [] },
  };

  test("maps semantic-runtime template code actions to unresolved LSP quickfixes", async () => {
    const ctx = createMockCodeActionContext();

    const result = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateCodeActions).toHaveBeenCalledWith(
      templateUri,
      params.range.start,
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]).toEqual(
      expect.objectContaining({
        title: "Declare member 'titel' on MyApp",
        kind: "quickfix",
        isPreferred: true,
        data: expect.objectContaining({
          semanticRuntime: expect.objectContaining({
            repairAffordance: expect.objectContaining({
              actionability: "guided",
            }),
          }),
        }),
      }),
    );
    expect(result?.[0]?.edit).toBeUndefined();
    expect(result?.[0]?.data).not.toHaveProperty("semanticRuntime.sourceDiagnostics");
    expect(result?.[0]?.data).toEqual(
      expect.objectContaining({
        semanticRuntime: expect.objectContaining({
          resolve: expect.objectContaining({
            schema: "aurelia.template-code-action-resolve/1",
            textDocument: { uri: templateUri },
            position: params.range.start,
            actionIdentity: expect.any(String),
          }),
        }),
      }),
    );
  });

  test("re-plans and resolves a selected code action with current document versions", async () => {
    const ctx = createMockCodeActionContext();
    const actions = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateCodeActions).toHaveBeenCalledTimes(2);
    expect(resolved.edit?.changes).toBeUndefined();
    expect(resolved.edit?.documentChanges).toEqual([
      expect.objectContaining({
        textDocument: { uri: definitionLspUri, version: 9 },
      }),
    ]);
    expect(workspaceEditChanges(resolved.edit!)[definitionLspUri]).toEqual([
      expect.objectContaining({ newText: "\n  titel!: unknown;" }),
    ]);
  });

  test("keeps eager versioned edits for clients that cannot resolve CodeAction.edit", async () => {
    const ctx = createMockCodeActionContext();
    ctx.clientSupportsCodeActionResolveEdit = false;

    const actions = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(actions?.[0]?.edit?.documentChanges).toEqual([
      expect.objectContaining({
        textDocument: { uri: definitionLspUri, version: 9 },
      }),
    ]);
    expect(actions?.[0]?.data.semanticRuntime.resolve).toBeUndefined();
  });

  test("leaves a prepared action unresolved when its semantic plan is no longer applicable", async () => {
    const ctx = createMockCodeActionContext();
    const actions = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );
    ctx.semanticRuntime.templateCodeActions.mockResolvedValueOnce({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock semantic-runtime code actions answer",
      value: { displayText: "0 template code action(s).", rows: [] },
    });

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("no longer uniquely applicable"),
    );
  });

  test("returns null when semantic-runtime has no applicable code actions", async () => {
    const ctx = createMockCodeActionContext({ actions: [] });

    await expect(
      handleCodeAction(ctx as never, params, createContextTestOperation(ctx)),
    ).resolves.toBeNull();
  });

  test("does not disguise a non-answer as no applicable code actions", async () => {
    const ctx = createMockCodeActionContext({ actions: [] });
    ctx.semanticRuntime.templateCodeActions.mockResolvedValueOnce({
      schemaVersion: "0.2",
      result: "failed",
      selection: "not-applicable",
      coverage: "not-applicable",
      summary: "failed test answer",
      value: { displayText: "0 template code action(s).", rows: [] },
    });

    await expect(
      handleCodeAction(ctx as never, params, createContextTestOperation(ctx)),
    ).rejects.toMatchObject({
      code: LSPErrorCodes.RequestFailed,
      message: expect.stringContaining("semantic runtime returned result=failed"),
    });
  });

  test("does not query semantic-runtime when context.only excludes exact quickfixes", async () => {
    const ctx = createMockCodeActionContext();

    await expect(
      handleCodeAction(
        ctx as never,
        { ...params, context: { diagnostics: [], only: ["refactor"] } },
        createContextTestOperation(ctx),
      ),
    ).resolves.toBeNull();
    expect(ctx.semanticRuntime.templateCodeActions).not.toHaveBeenCalled();
  });

  test("does not offer a code action when any edit row cannot be mapped", async () => {
    const ctx = createMockCodeActionContext({
      actions: [
        {
          title: "Declare member 'titel' on MyApp",
          kind: "quickfix",
          diagnostics: [mockMissingMemberDiagnostic()],
          repair: mockMissingMemberRepair(),
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
        },
      ],
    });

    const result = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(result).toBeNull();
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("skipped unsafe code action"),
    );
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("has no exact authored source span"),
    );
  });

  test("does not offer a code action when oldText validation fails", async () => {
    const ctx = createMockCodeActionContext({
      actions: [
        {
          title: "Rewrite stale member",
          kind: "quickfix",
          diagnostics: [mockMissingMemberDiagnostic()],
          repair: mockMissingMemberRepair(),
          edits: [
            {
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
            },
          ],
          isPreferred: true,
        },
      ],
    });

    const result = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(result).toBeNull();
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('expected "class"'),
    );
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('document contains "export"'),
    );
  });
});

describe("handleCompletion", () => {
  const params = {
    textDocument: { uri: templateUri },
    position: { line: 0, character: 5 },
  };

  test("maps semantic-runtime completion candidates and returns CompletionList", async () => {
    const ctx = createMockCompletionContext({
      completions: [
        {
          name: "message",
          candidateKind: "binding-context-slot",
          detail: "Name visible in current view-model.",
          typeDisplay: "string",
        },
        {
          name: "productId",
          candidateKind: "router-route-parameter",
          sourceKind: "router",
          detail: "Required route parameter.",
        },
      ],
    });

    const result = await handleCompletion(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );
    expect(ctx.semanticRuntime.templateCompletions).toHaveBeenCalledWith(
      templateUri,
      params.position,
    );
    expect(result.isIncomplete).toBe(false);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        label: "message",
        kind: CompletionItemKind.Property,
        detail: "binding-context-slot | string | public",
        textEdit: {
          range: {
            start: { line: 0, character: 5 },
            end: { line: 0, character: 5 },
          },
          newText: "message",
        },
      }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        label: "productId",
        kind: CompletionItemKind.Property,
        documentation: "Required route parameter.",
      }),
    );
  });

  test("keeps semantic incompleteness out of the LSP transport paging flag", async () => {
    const ctx = createMockCompletionContext({
      completions: [{ name: "summary-panel", candidateKind: "custom-element" }],
      isIncomplete: true,
    });

    const result = await handleCompletion(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );
    expect(result.isIncomplete).toBe(false);
    expect(result.items.map((item) => item.label)).toEqual(["summary-panel"]);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringContaining("semantic coverage is open"),
    );
  });

  test("does not add a synthetic completion candidate for an open answer", async () => {
    const ctx = createMockCompletionContext({
      completions: [{ name: "summary-panel", candidateKind: "custom-element" }],
      isIncomplete: true,
    });

    const result = await handleCompletion(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );
    expect(result.isIncomplete).toBe(false);
    expect(result.items.map((item) => item.label)).toEqual(["summary-panel"]);
  });

  test("returns empty CompletionList when document is unavailable", async () => {
    const ctx = createMockCompletionContext({ completions: [] });
    ctx.ensureProgramDocument = vi.fn(() => null);
    const result = await handleCompletion(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );
    expect(result).toEqual({ isIncomplete: false, items: [] });
  });

  test("does not disguise a completion failure as a narrowed list", async () => {
    const ctx = createMockCompletionContext({ completions: [] });
    ctx.semanticRuntime.templateCompletions = vi.fn(() => Promise.reject(new Error("completion failed")));

    await expect(handleCompletion(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    )).rejects.toThrow("completion failed");
  });

  test("does not read completion payload fields from an unsupported answer", async () => {
    const ctx = createMockCompletionContext({ completions: [] });
    ctx.semanticRuntime.templateCompletions.mockResolvedValue({
      result: "unsupported",
      value: {},
    } as never);

    const error = await handleCompletion(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    ).then(() => null, (failure: unknown) => failure);

    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((error as Error).message).toContain("Semantic runtime returned completion result=unsupported");
  });
});

describe("handleHover", () => {
  const params = {
    textDocument: { uri: templateUri },
    position: { line: 0, character: 14 },
  };

  test("maps semantic-runtime cursor info to hover markdown", async () => {
    const ctx = createMockHoverContext();

    const result = await handleHover(ctx as never, params, createContextTestOperation(ctx));

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      templateUri,
      params.position,
    );
    const contents = result?.contents as { value?: string };
    expect(contents.value).toContain("message: string");
    expect(contents.value).toContain("owner: `MyApp`");
    expect(result?.range).toEqual({
      start: { line: 0, character: 12 },
      end: { line: 0, character: 19 },
    });
  });

  test("does not disguise a non-answer as an absent hover", async () => {
    const ctx = createMockHoverContext();
    ctx.semanticRuntime.templateCursorInfo.mockResolvedValue({
      result: "failed",
      value: {},
    } as never);

    const error = await handleHover(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    ).then(() => null, (failure: unknown) => failure);
    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((error as Error).message).toContain("Semantic runtime returned hover result=failed");
  });
});

describe("handleDefinition", () => {
  const params = {
    textDocument: { uri: templateUri },
    position: { line: 0, character: 14 },
  };

  test("maps semantic-runtime cursor info to location links", async () => {
    const ctx = createMockDefinitionContext();

    const result = await handleDefinition(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      templateUri,
      params.position,
    );
    expect(Array.isArray(result)).toBe(true);
    const [link] = result as Array<{
      targetUri: string;
      targetRange: { start: { line: number; character: number } };
    }>;
    expect(link.targetUri).toBe(definitionLspUri);
    expect(link.targetRange.start).toEqual({ line: 1, character: 2 });
  });

  test("maps semantic-runtime route targets without loading a route inventory", async () => {
    const messageStart = definitionText.indexOf("message");
    const routeConfigSource = {
      kind: "typescript-node",
      label: `${definitionLspUri}@0..${definitionText.length}`,
      path: definitionLspUri,
      start: 0,
      end: definitionText.length,
    };
    const routeTargetSource = {
      kind: "typescript-node",
      label: `${definitionLspUri}@${messageStart}..${messageStart + "message".length}`,
      path: definitionLspUri,
      start: messageStart,
      end: messageStart + "message".length,
    };
    const ctx = createMockDefinitionContext({
      selectedMemberSource: null,
      selectedRouteTarget: {
        targetKind: "route-path",
        matchedName: "tasks",
        routeConfigId: "tasks",
        source: routeConfigSource,
        targetSource: routeTargetSource,
      },
    });

    const result = await handleDefinition(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    const [link] = result as Array<{
      targetUri: string;
      targetRange: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      targetSelectionRange: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
    }>;
    expect(link.targetUri).toBe(definitionLspUri);
    expect(link.targetRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 2, character: 1 },
    });
    expect(link.targetSelectionRange).toEqual({
      start: { line: 1, character: 2 },
      end: { line: 1, character: 9 },
    });
  });

  test("reports source-backed mapping failures as deliberate request failures", async () => {
    const ctx = createMockDefinitionContext({ readableDefinition: false });

    const error = await handleDefinition(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    ).then(() => null, (failure: unknown) => failure);

    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((error as Error).message).toContain("no readable document text");
  });

  test("does not interpret an invalid semantic answer as an absent definition", async () => {
    const ctx = createMockDefinitionContext();
    ctx.semanticRuntime.templateCursorInfo.mockResolvedValue({
      result: "invalid",
      value: {
        selectedMember: null,
        selectedBindable: null,
        selectedDefinition: null,
      },
    } as never);

    const error = await handleDefinition(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    ).then(() => null, (failure: unknown) => failure);

    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((error as Error).message).toContain("Semantic runtime returned definition result=invalid");
  });
});
