import { URI } from "vscode-uri";
import type { Position } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  createSemanticRuntime,
  appDiagnosticPresentation,
  SemanticAppQueryKind,
  type SemanticRouteNodesResult,
  type SemanticRuntime,
  type SemanticAppDiagnosticsResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceVisibilityResult,
  type SemanticRuntimeControllerResult,
  type SemanticRuntimeAnswer,
  type SemanticBindingBehaviorApplicationResult,
  type SemanticTemplateCompilationResult,
  type SemanticTemplateInlayHintsResult,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateCodeActionsResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateFoldingRangesResult,
  type SemanticTemplateReferencesResult,
  type SemanticTemplateRenameResult,
  type SemanticTemplateSemanticTokensResult,
  type SemanticValueConverterApplicationResult,
} from "@aurelia-ls/semantic-runtime";
import {
  OpenDocumentSourceTextProvider,
  type OpenTextDocumentStore,
} from "./open-document-source-text-provider.js";

export interface SemanticRuntimeLspSessionOptions {
  readonly workspaceRoot: string | null;
  readonly documents: OpenTextDocumentStore;
}

export class SemanticRuntimeLspSession {
  private readonly sourceTextProvider: OpenDocumentSourceTextProvider;
  private runtime: Promise<SemanticRuntime> | null = null;
  private workspaceRoot: string | null;
  private epoch = 0;

  constructor(
    options: SemanticRuntimeLspSessionOptions,
  ) {
    this.workspaceRoot = options.workspaceRoot;
    this.sourceTextProvider = new OpenDocumentSourceTextProvider(options.documents);
  }

  configureWorkspace(workspaceRoot: string | null): void {
    if (this.workspaceRoot === workspaceRoot) {
      return;
    }
    this.workspaceRoot = workspaceRoot;
    this.invalidate();
  }

  invalidate(): void {
    this.epoch += 1;
    this.runtime = null;
  }

  async templateCompletions(
    document: TextDocument,
    position: Position,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    return runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateCompletions,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        line: position.line,
        character: position.character,
        offset: document.offsetAt(position),
      },
      page: { size: 100 },
      inquiryProfile: "lsp-cursor",
      appRetention: "retain-app",
    }) as Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>>;
  }

  async appDiagnostics(
    document: TextDocument,
  ): Promise<SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    const rows: SemanticAppDiagnosticsResult["rows"][number][] = [];
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticAppDiagnosticsResult> | null = null;
    do {
      answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.AppDiagnostics,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-diagnostics",
        diagnosticProjection: "type-projection",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>;
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    if (answer == null) {
      throw new Error("Semantic runtime returned no app diagnostic answer.");
    }

    return {
      ...answer,
      value: {
        ...answer.value,
        displayText: `${rows.length} app diagnostic row(s).`,
        rows,
        presentation: appDiagnosticPresentation(rows, true),
      },
      page: null,
    };
  }

  async templateCursorInfo(
    document: TextDocument,
    position: Position,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    return runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        line: position.line,
        character: position.character,
        offset: document.offsetAt(position),
      },
      inquiryProfile: "lsp-cursor",
      diagnosticProjection: "type-projection",
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>>;
  }

  async templateReferences(
    document: TextDocument,
    position: Position,
    includeDeclaration: boolean,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateReferencesResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    const rows: SemanticTemplateReferencesResult["rows"][number][] = [];
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateReferencesResult> | null = null;
    do {
      answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateReferences,
        sourceFilePath: filePath,
        cursor: {
          filePath,
          line: position.line,
          character: position.character,
          offset: document.offsetAt(position),
        },
        includeDeclaration,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
        diagnosticProjection: "type-projection",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<SemanticTemplateReferencesResult>;
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    if (answer == null) {
      throw new Error("Semantic runtime returned no template reference answer.");
    }

    return {
      ...answer,
      value: {
        ...answer.value,
        displayText: `${rows.length} template reference row(s).`,
        rows,
      },
      page: null,
    };
  }

  async templateRename(
    document: TextDocument,
    position: Position,
    newName?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    return runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateRename,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        line: position.line,
        character: position.character,
        offset: document.offsetAt(position),
      },
      ...(newName == null ? {} : { newName }),
      inquiryProfile: "lsp-cursor",
      diagnosticProjection: "type-projection",
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>>;
  }

  async templateRenameFromTypeScript(
    document: TextDocument,
    position: Position,
    newName?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    return runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        line: position.line,
        character: position.character,
        offset: document.offsetAt(position),
      },
      ...(newName == null ? {} : { newName }),
      inquiryProfile: "lsp-cursor",
      diagnosticProjection: "type-projection",
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>>;
  }

  async templateCodeActions(
    document: TextDocument,
    position: Position,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    return runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateCodeActions,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        line: position.line,
        character: position.character,
        offset: document.offsetAt(position),
      },
      inquiryProfile: "lsp-cursor",
      diagnosticProjection: "type-projection",
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as Promise<SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>>;
  }

  async resourceDefinitions(): Promise<SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(runtime, SemanticAppQueryKind.ResourceDefinitions, 500);
  }

  async resourceVisibility(): Promise<SemanticRuntimeAnswer<SemanticResourceVisibilityResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(runtime, SemanticAppQueryKind.ResourceVisibility, 500);
  }

  async runtimeControllers(): Promise<SemanticRuntimeAnswer<SemanticRuntimeControllerResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(runtime, SemanticAppQueryKind.RuntimeControllers, 500);
  }

  async bindingBehaviorApplications(): Promise<SemanticRuntimeAnswer<SemanticBindingBehaviorApplicationResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(runtime, SemanticAppQueryKind.BindingBehaviorApplications, 500);
  }

  async valueConverterApplications(): Promise<SemanticRuntimeAnswer<SemanticValueConverterApplicationResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(runtime, SemanticAppQueryKind.ValueConverterApplications, 500);
  }

  async templateCompilations(
    sourceFilePath?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompilationResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(
      runtime,
      SemanticAppQueryKind.TemplateCompilations,
      500,
      sourceFilePath == null
        ? {}
        : {
            sourceFile: { filePath: sourceFilePath },
            sourceFilePath,
          },
    );
  }

  async routeNodes(): Promise<SemanticRuntimeAnswer<SemanticRouteNodesResult>> {
    const runtime = await this.openRuntime();
    return this.collectRows(runtime, SemanticAppQueryKind.RouteNodes, 500);
  }

  async templateInlayHints(
    document: TextDocument,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult> | null = null;
    const rows: SemanticTemplateInlayHintsResult["rows"][number][] = [];
    do {
      answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateInlayHints,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>;
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    return answer == null
      ? await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.TemplateInlayHints,
          sourceFile: { filePath },
          sourceFilePath: filePath,
          page: { size: 200 },
          inquiryProfile: "lsp-cursor",
          analysisDepth: "binding-observation",
          includeAuthoringTemplates: true,
          appRetention: "retain-app",
        }) as SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>
      : {
          ...answer,
          value: {
            displayText: `${rows.length} template inlay hint row(s).`,
            rows,
          },
          page: null,
        };
  }

  async templateSemanticTokens(
    document: TextDocument,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult> | null = null;
    const rows: SemanticTemplateSemanticTokensResult["rows"][number][] = [];
    do {
      answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateSemanticTokens,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 500, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "runtime-topology",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>;
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    return answer == null
      ? await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.TemplateSemanticTokens,
          sourceFile: { filePath },
          sourceFilePath: filePath,
          page: { size: 500 },
          inquiryProfile: "lsp-cursor",
          analysisDepth: "runtime-topology",
          includeAuthoringTemplates: true,
          appRetention: "retain-app",
        }) as SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>
      : {
          ...answer,
          value: {
            displayText: `${rows.length} template semantic token row(s).`,
            rows,
          },
          page: null,
        };
  }

  async templateFoldingRanges(
    document: TextDocument,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>> {
    const runtime = await this.openRuntime();
    const filePath = URI.parse(document.uri).fsPath;
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult> | null = null;
    const rows: SemanticTemplateFoldingRangesResult["rows"][number][] = [];
    do {
      answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateFoldingRanges,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 500, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "runtime-topology",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>;
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    return answer == null
      ? await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.TemplateFoldingRanges,
          sourceFile: { filePath },
          sourceFilePath: filePath,
          page: { size: 500 },
          inquiryProfile: "lsp-cursor",
          analysisDepth: "runtime-topology",
          includeAuthoringTemplates: true,
          appRetention: "retain-app",
        }) as SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>
      : {
          ...answer,
          value: {
            displayText: `${rows.length} template folding range row(s).`,
            rows,
          },
          page: null,
        };
  }

  private openRuntime(): Promise<SemanticRuntime> {
    if (this.workspaceRoot == null) {
      throw new Error("Cannot open semantic-runtime LSP session before workspace root is configured.");
    }
    this.runtime ??= createSemanticRuntime({
      workspaceRoot: this.workspaceRoot,
      storeKey: `lsp:${this.epoch}:${this.workspaceRoot}`,
      sourceTextProvider: this.sourceTextProvider,
    });
    return this.runtime;
  }

  private async collectRows<T extends { readonly rows: readonly unknown[] }>(
    runtime: SemanticRuntime,
    kind: SemanticAppQueryKind,
    pageSize: number,
    extraRequest: Record<string, unknown> = {},
  ): Promise<SemanticRuntimeAnswer<T>> {
    const rows: unknown[] = [];
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<T> | null = null;
    do {
      answer = await runtime.answerAppQuery({
        kind,
        ...extraRequest,
        page: { size: pageSize, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<T>;
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    if (answer == null) {
      throw new Error(`Semantic runtime returned no ${kind} answer.`);
    }

    return {
      ...answer,
      value: {
        ...answer.value,
        rows: rows as T["rows"],
      },
      page: null,
    };
  }
}
