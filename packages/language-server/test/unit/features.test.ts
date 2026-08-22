import { describe, test, expect, vi } from "vitest";
import {
  CodeActionTriggerKind,
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
  templateCodeActionResolveRefusalFromData,
  templateCodeActionResolveRefusalFromValue,
  type TemplateCodeActionResolveRefusal,
} from "../../src/protocol.js";
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
  let codeActionResolveHandler: ((action: unknown, token: unknown) => Promise<unknown>) | null = null;
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
          value: { templateOwned: true, owners: [{ projectKey: "app" }] },
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
    onCodeActionResolve: vi.fn((handler: (action: unknown, token: unknown) => Promise<unknown>) => {
      codeActionResolveHandler = handler;
    }),
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
  if (codeActionResolveHandler == null) throw new Error("Code-action resolve registration was not captured.");
  return {
    ctx,
    getConfiguration,
    managedAdmission,
    semanticRuntime,
    inlayHandler,
    semanticTokensHandler,
    codeActionHandler,
    codeActionResolveHandler,
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
          selection: "exact",
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
              tagNameSource: null,
              closingTagNameSource: null,
              attributeSource: null,
            },
            valueSite: null,
            selectedDefinition: null,
            selectedBindable: null,
            selectedRouteTarget: null,
            selectedMemberName: "message",
            selectedMember: {
              name: "message",
              memberKind: "property",
              typeDisplay: "string",
              isOptional: false,
              isReadonly: false,
              visibilityKind: "public",
              isDeprecated: false,
              documentation: null,
              deprecationReason: null,
              scopeRole: null,
              source: null,
              declarationSource: null,
            },
            selectedExpression: null,
            uncertainty: null,
            memberOwnerType: {
              display: "MyApp",
              shapeKind: "object",
              origin: "typescript",
              source: null,
              declarationSource: null,
            },
            diagnostics: [],
            diagnosticPresentation: null,
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

function createMockCodeActionContext(input: {
  actions?: unknown[];
  bindingExplanationAnswer?: unknown;
  attributeExplanationAnswer?: unknown;
} = {}) {
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
      bindingUncertaintyExplanation: vi.fn(() => Promise.resolve(
        input.bindingExplanationAnswer ?? {
          schemaVersion: "0.2",
          result: "answered",
          selection: "absent",
          coverage: "complete",
          summary: "No binding uncertainty at the cursor.",
          value: {
            displayText: "No binding uncertainty at the cursor.",
            projectKey: "app",
            explanation: null,
            contenders: [],
          },
          page: null,
        },
      )),
      attributeInterpretationExplanation: vi.fn(() => Promise.resolve(
        input.attributeExplanationAnswer ?? {
          schemaVersion: "0.2",
          result: "answered",
          selection: "absent",
          coverage: "complete",
          summary: "No attribute interpretation at the cursor.",
          value: {
            displayText: "No attribute interpretation at the cursor.",
            projectKey: "app",
            explanation: null,
            contenders: [],
          },
          page: null,
        },
      )),
    },
    lookupText: vi.fn((uri: string) =>
      uri === definitionUri
        ? definitionText
        : documentUris.sameDocument(uri, templateUri)
          ? codeActionText
          : null,
    ),
    lookupDocumentSnapshot: vi.fn((uri: string) =>
      documentUris.resolve(uri).uri === definitionUri
        ? snapshot(definitionUri, definitionText, 9, "typescript")
        : null,
    ),
  };
}

function mockAttributeExplanationAnswer(
  conclusionKind: "instruction-backed" | "plain-attribute" = "instruction-backed",
) {
  const nameSource = {
    kind: "source-span-address",
    label: `src/my-app.html@${codeActionStart}..${codeActionStart + "titel".length}`,
    path: "src/my-app.html",
    start: codeActionStart,
    end: codeActionStart + "titel".length,
    role: "attribute-name",
  };
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection: "exact",
    coverage: "complete",
    summary: "The selected attribute has an exact interpretation.",
    value: {
      displayText: "The selected attribute has an exact interpretation.",
      projectKey: "app",
      explanation: {
        subject: {
          subjectKey: "attribute:my-app:titel",
          projectKey: "app",
          definitionName: "my-app",
          compilationLane: "app-runtime",
          rawName: "titel",
          source: nameSource,
          nameSource,
          valueSource: null,
          templateSource: null,
        },
        conclusion: {
          kind: conclusionKind,
          title: "Attribute interpretation",
          explanation: "The compiler classified the attribute.",
          action: "Inspect the compiler evidence.",
        },
        evidence: {
          syntax: {
            syntaxKind: "bare",
            target: "titel",
            command: null,
            parts: ["titel"],
            pattern: null,
            nameSource,
            targetSource: nameSource,
            commandSource: null,
          },
          classification: null,
          valueSites: [],
          lowerings: [],
          effects: [],
          issues: [],
          blockers: [],
        },
        uncertainty: { state: "closed", reasons: [], explanation: "Compiler evidence is closed." },
        currentness: { authority: "answer-analysis-basis", explanation: "Current answer basis." },
        nextSteps: [],
      },
      contenders: [],
    },
    page: null,
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

  test("refuses partial rename and preserves candidate locations in error data", async () => {
    const ctx = createMockRenameContext({
      displayText: "Rename for 'title' has one unresolved target.",
      status: "not-available",
      reason: "unresolved-candidates",
      selectedMemberName: "title",
      placeholder: "title",
      targetSource: null,
      activeSource: {
        kind: "source-span-address",
        label: `src/my-app.html@${renameStart}..${renameStart + "title".length}`,
        path: templateUri,
        start: renameStart,
        end: renameStart + "title".length,
      },
      edits: [],
      candidateRows: [{
        referenceKind: "template-usage",
        name: "title",
        definitionName: "my-app",
        bindingKind: "property",
        dependencyKinds: [],
        candidateReason: "target-open",
        source: {
          kind: "source-span-address",
          label: `src/my-app.html@${renameStart}..${renameStart + "title".length}`,
          path: templateUri,
          start: renameStart,
          end: renameStart + "title".length,
        },
        targetSource: null,
      }],
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
    });

    await expect(
      handleRename(ctx as never, params, createContextTestOperation(ctx)),
    ).rejects.toMatchObject({
      message: "Rename for 'title' has one unresolved target.",
      data: {
        reason: "unresolved-candidates",
        candidates: [{
          uri: templateUri,
          range: {
            start: { line: 0, character: renameStart },
            end: { line: 0, character: renameStart + "title".length },
          },
          name: "title",
          reason: "target-open",
        }],
        mappingFailures: [],
      },
    });
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
  test("returns an exact refusal when a listed action loses authored ownership", async () => {
    const harness = createInlayRegistrationHarness();
    harness.ctx.ownsDocument.mockReturnValueOnce(false);
    const action = {
      title: "Declare member",
      kind: "quickfix",
      edit: { changes: {} },
      data: {
        semanticRuntime: {
          resolve: {
            schema: "aurelia.template-code-action-resolve/1",
            textDocument: { uri: templateUri },
            position: { line: 0, character: codeActionStart },
            actionIdentity: "template-code-action:sha256:test",
          },
        },
      },
    };

    const resolved = await harness.codeActionResolveHandler(action, {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    }) as typeof action;

    expect(resolved.edit).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "semanticPlanNoLongerMatches",
      reason: "the current source no longer admits this repair",
    });
  });

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

  test("correlates each typed refusal kind with its authenticated reason", () => {
    const valid: TemplateCodeActionResolveRefusal = {
      kind: "semanticPlanAmbiguous",
      reason: "the current source admits multiple matching repairs",
    };
    // @ts-expect-error A known reason belonging to another kind is not a valid typed refusal.
    const mismatched: TemplateCodeActionResolveRefusal = {
      kind: "semanticPlanAmbiguous",
      reason: "the current source no longer admits this repair",
    };

    expect(templateCodeActionResolveRefusalFromValue(valid)).toEqual(valid);
    expect(templateCodeActionResolveRefusalFromValue(mismatched)).toBeNull();
  });

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

  test("keeps repair actions and adds a command-only explanation at the exact diagnostic locus", async () => {
    const ctx = createMockCodeActionContext();
    const range = {
      start: { line: 0, character: codeActionStart },
      end: { line: 0, character: codeActionStart + "titel".length },
    };
    const diagnostic = {
      range,
      message: "This syntax needs an unavailable Aurelia surface.",
      data: {
        semanticRuntime: {
          queryKind: "app-diagnostics",
          projectKey: "app",
          diagnosticKind: "framework-capability-not-registered",
          diagnosticAuthority: "semantic-authoring-policy",
          missingInput: "i18n.translation-syntax",
          suggestion: {
            actionTarget: {
              targetKind: "framework-capability",
              memberName: "i18n.translation-syntax",
            },
          },
        },
      },
    };

    const result = await handleCodeAction(
      ctx as never,
      { ...params, context: { diagnostics: [diagnostic] } },
      createContextTestOperation(ctx),
    );

    expect(result).toHaveLength(2);
    expect(result?.[0]?.edit).toBeUndefined();
    expect(result?.[1]).toEqual({
      title: "Explain this Aurelia diagnostic",
      kind: "quickfix",
      diagnostics: [diagnostic],
      isPreferred: false,
      command: {
        title: "Explain Aurelia diagnostic",
        command: "aurelia.explainFrameworkCapability",
        arguments: [{
          uri: templateUri,
          position: range.start,
          range,
          documentVersion: 5,
          projectKey: "app",
          frameworkCapability: "i18n.translation-syntax",
        }],
      },
      data: {
        semanticRuntime: {
          queryKind: "framework-capability-explanation",
          explanationSeed: {
            uri: templateUri,
            position: range.start,
            range,
            documentVersion: 5,
            projectKey: "app",
            frameworkCapability: "i18n.translation-syntax",
          },
        },
      },
    });
  });

  test("does not offer explanation commands for detached or mismatched diagnostic data", async () => {
    const ctx = createMockCodeActionContext({ actions: [] });
    const range = {
      start: { line: 0, character: codeActionStart },
      end: { line: 0, character: codeActionStart + "titel".length },
    };
    const result = await handleCodeAction(
      ctx as never,
      {
        ...params,
        context: {
          diagnostics: [{
            range,
            message: "Detached diagnostic",
            data: {
              semanticRuntime: {
                queryKind: "app-diagnostics",
                projectKey: "app",
                diagnosticKind: "framework-capability-configured-out",
                diagnosticAuthority: "semantic-authoring-policy",
                missingInput: "i18n.translation-syntax",
                suggestion: {
                  actionTarget: {
                    targetKind: "framework-capability",
                    memberName: "router.default-resources",
                  },
                },
              },
            },
          }],
        },
      },
      createContextTestOperation(ctx),
    );

    expect(result).toBeNull();
  });

  test("offers one invoked command-only binding explanation with no diagnostics", async () => {
    const bindingSource = {
      kind: "source-span-address",
      label: `src/my-app.html@${codeActionStart}..${codeActionStart + "titel".length}`,
      path: "src/my-app.html",
      start: codeActionStart,
      end: codeActionStart + "titel".length,
      role: "binding",
    };
    const ctx = createMockCodeActionContext({
      actions: [],
      bindingExplanationAnswer: {
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "open",
        summary: "The selected binding remains open.",
        value: {
          displayText: "The selected binding remains open.",
          projectKey: "app",
          explanation: {
            subject: {
              subjectKey: "binding:my-app:titel",
              projectKey: "app",
              definitionName: "my-app",
              compilationLane: "app-runtime",
              bindingKind: "property",
              source: bindingSource,
              expressionSource: bindingSource,
              templateSource: {
                ...bindingSource,
                start: 0,
                end: codeActionText.length,
              },
              targetProperties: ["textContent"],
            },
            conclusion: {
              kind: "flow-partially-proved",
              title: "Binding flow is partially proved",
              explanation: "The source member remains open.",
              action: "Inspect the source member.",
            },
            evidence: { lanes: [], blockers: [] },
            uncertainty: {
              state: "open",
              reasons: ["source-type-open"],
              explanation: "The source type remains open.",
            },
            nextSteps: [],
          },
          contenders: [],
        },
        page: null,
      },
    });

    const result = await handleCodeAction(
      ctx as never,
      {
        ...params,
        context: {
          diagnostics: [],
          triggerKind: CodeActionTriggerKind.Invoked,
        },
      },
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.bindingUncertaintyExplanation).toHaveBeenCalledWith(
      null,
      templateUri,
      params.range.start,
    );
    expect(result).toEqual([{
      title: "Explain this Aurelia binding",
      kind: "quickfix",
      isPreferred: false,
      command: {
        title: "Explain Aurelia binding",
        command: "aurelia.explainBindingUncertainty",
        arguments: [{
          uri: templateUri,
          position: params.range.start,
          range: {
            start: { line: 0, character: codeActionStart },
            end: { line: 0, character: codeActionStart + "titel".length },
          },
          documentVersion: 5,
          projectKey: "app",
        }],
      },
      data: {
        semanticRuntime: {
          queryKind: "binding-uncertainty-explanation",
          explanationSeed: expect.any(Object),
        },
      },
    }]);
    expect(result?.[0]?.edit).toBeUndefined();
    expect(result?.[0]?.diagnostics).toBeUndefined();
  });

  test("does not query binding explanation automatically or offer a freshly proved binding", async () => {
    const automatic = createMockCodeActionContext({ actions: [] });
    const automaticResult = await handleCodeAction(
      automatic as never,
      {
        ...params,
        context: {
          diagnostics: [],
          triggerKind: CodeActionTriggerKind.Automatic,
        },
      },
      createContextTestOperation(automatic),
    );
    expect(automatic.semanticRuntime.bindingUncertaintyExplanation).not.toHaveBeenCalled();
    expect(automaticResult).toBeNull();

    const bindingSource = {
      kind: "source-span-address",
      label: `src/my-app.html@${codeActionStart}..${codeActionStart + "titel".length}`,
      path: "src/my-app.html",
      start: codeActionStart,
      end: codeActionStart + "titel".length,
      role: "binding",
    };
    const proved = createMockCodeActionContext({
      actions: [],
      bindingExplanationAnswer: {
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "complete",
        summary: "The selected binding is proved.",
        value: {
          displayText: "The selected binding is proved.",
          projectKey: "app",
          explanation: {
            subject: {
              subjectKey: "binding:my-app:titel",
              projectKey: "app",
              definitionName: "my-app",
              compilationLane: "app-runtime",
              bindingKind: "property",
              source: bindingSource,
              expressionSource: bindingSource,
              templateSource: null,
              targetProperties: ["textContent"],
            },
            conclusion: {
              kind: "flow-proved",
              title: "Binding flow is proved",
              explanation: "Every material lane is closed.",
              action: "No action is required.",
            },
            evidence: { lanes: [], blockers: [] },
            uncertainty: {
              state: "closed",
              reasons: [],
              explanation: "Every material lane is closed.",
            },
            nextSteps: [],
          },
          contenders: [],
        },
        page: null,
      },
    });
    const provedResult = await handleCodeAction(
      proved as never,
      {
        ...params,
        context: {
          diagnostics: [],
          triggerKind: CodeActionTriggerKind.Invoked,
        },
      },
      createContextTestOperation(proved),
    );
    expect(proved.semanticRuntime.bindingUncertaintyExplanation).toHaveBeenCalledOnce();
    expect(provedResult).toBeNull();
  });

  test("offers an invoked-only command at the exact engine-authored attribute name", async () => {
    const ctx = createMockCodeActionContext({
      actions: [],
      attributeExplanationAnswer: mockAttributeExplanationAnswer(),
    });
    const result = await handleCodeAction(
      ctx as never,
      {
        ...params,
        context: { diagnostics: [], triggerKind: CodeActionTriggerKind.Invoked },
      },
      createContextTestOperation(ctx),
    );

    expect(ctx.semanticRuntime.attributeInterpretationExplanation).toHaveBeenCalledWith(
      null,
      templateUri,
      params.range.start,
    );
    expect(result).toEqual([{
      title: "Explain how Aurelia uses this attribute",
      kind: "quickfix",
      isPreferred: false,
      command: {
        title: "Explain how Aurelia uses this attribute",
        command: "aurelia.explainAttributeInterpretation",
        arguments: [{
          uri: templateUri,
          position: { line: 0, character: codeActionStart },
          range: {
            start: { line: 0, character: codeActionStart },
            end: { line: 0, character: codeActionStart + "titel".length },
          },
          documentVersion: 5,
          projectKey: "app",
        }],
      },
      data: {
        semanticRuntime: {
          queryKind: "attribute-interpretation-explanation",
          explanationSeed: expect.any(Object),
        },
      },
    }]);
    expect(result?.[0]?.edit).toBeUndefined();
    expect(result?.[0]?.diagnostics).toBeUndefined();
  });

  test("does not offer the attribute explanation automatically or for a closed plain row", async () => {
    const automatic = createMockCodeActionContext({
      actions: [],
      attributeExplanationAnswer: mockAttributeExplanationAnswer(),
    });
    expect(await handleCodeAction(
      automatic as never,
      {
        ...params,
        context: { diagnostics: [], triggerKind: CodeActionTriggerKind.Automatic },
      },
      createContextTestOperation(automatic),
    )).toBeNull();
    expect(automatic.semanticRuntime.attributeInterpretationExplanation).not.toHaveBeenCalled();

    const plain = createMockCodeActionContext({
      actions: [],
      attributeExplanationAnswer: mockAttributeExplanationAnswer("plain-attribute"),
    });
    expect(await handleCodeAction(
      plain as never,
      {
        ...params,
        context: { diagnostics: [], triggerKind: CodeActionTriggerKind.Invoked },
      },
      createContextTestOperation(plain),
    )).toBeNull();
    expect(plain.semanticRuntime.attributeInterpretationExplanation).toHaveBeenCalledOnce();
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
      {
        ...actions![0]!,
        edit: { changes: {} },
        command: { title: "stale command", command: "aurelia.stale" },
      },
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(resolved.command).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "semanticPlanNoLongerMatches",
      reason: "the current source no longer admits this repair",
    });
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("no longer uniquely applicable"),
    );
  });

  test("does not attribute an unrelated candidate's mapping failure to the selected plan", async () => {
    const ctx = createMockCodeActionContext();
    const actions = await handleCodeAction(
      ctx as never,
      params,
      createContextTestOperation(ctx),
    );
    const baseRow = (await createMockCodeActionContext().semanticRuntime.templateCodeActions())
      .value.rows[0] as Record<string, unknown>;
    const unrelated = {
      ...baseRow,
      title: "Declare unrelated member",
      edits: [{
        editKind: "declare-view-model-member",
        source: {
          kind: "typescript-node",
          label: "file:///C:/outside.ts@0..0",
          path: "file:///C:/outside.ts",
          start: 0,
          end: 0,
        },
        oldText: null,
        newText: "unrelated",
      }],
    };
    ctx.semanticRuntime.templateCodeActions.mockResolvedValueOnce({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock semantic-runtime code actions answer",
      value: { displayText: "1 template code action(s).", rows: [unrelated] },
    });

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "semanticPlanNoLongerMatches",
      reason: "the current source no longer admits this repair",
    });
  });

  test("returns an exact refusal when the source document disappeared", async () => {
    const ctx = createMockCodeActionContext();
    const actions = await handleCodeAction(ctx as never, params, createContextTestOperation(ctx));
    ctx.ensureProgramDocument.mockReturnValueOnce(null);

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "sourceDocumentUnavailable",
      reason: "the source document is no longer available",
    });
  });

  test("returns an exact refusal when multiple current plans match", async () => {
    const row = createMockCodeActionContext().semanticRuntime.templateCodeActions()
      .then((answer) => answer.value.rows[0]);
    const duplicated = await row;
    const ctx = createMockCodeActionContext({ actions: [duplicated, duplicated] });
    const actions = await handleCodeAction(ctx as never, params, createContextTestOperation(ctx));

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "semanticPlanAmbiguous",
      reason: "the current source admits multiple matching repairs",
    });
  });

  test("counts a matching unmappable plan when deciding late ambiguity", async () => {
    const baseRow = (await createMockCodeActionContext().semanticRuntime.templateCodeActions())
      .value.rows[0] as Record<string, unknown>;
    const badEdits = (baseRow["edits"] as readonly Record<string, unknown>[]).map((edit) => ({
      ...edit,
      source: {
        kind: "typescript-node",
        label: "file:///C:/outside.ts@0..0",
        path: "file:///C:/outside.ts",
        start: 0,
        end: 0,
      },
    }));
    const ctx = createMockCodeActionContext({
      actions: [baseRow, { ...baseRow, edits: badEdits }],
    });
    const actions = await handleCodeAction(ctx as never, params, createContextTestOperation(ctx));

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "semanticPlanAmbiguous",
      reason: "the current source admits multiple matching repairs",
    });
  });

  test("returns an exact refusal when a current edit cannot be mapped safely", async () => {
    const ctx = createMockCodeActionContext();
    const actions = await handleCodeAction(ctx as never, params, createContextTestOperation(ctx));
    ctx.lookupDocumentSnapshot.mockReturnValue(null);

    const resolved = await handleCodeActionResolve(
      ctx as never,
      actions![0]!,
      createContextTestOperation(ctx),
    );

    expect(resolved.edit).toBeUndefined();
    expect(templateCodeActionResolveRefusalFromData(resolved.data)).toEqual({
      kind: "editMappingFailed",
      reason: "the current repair could not be mapped safely",
    });
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
    expect(contents.value).toBe("```ts\nmessage: string\n```");
    expect(contents.value).not.toContain("MyApp");
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
