import { URI } from "vscode-uri";
import type { Position } from "vscode-languageserver/node";
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

export interface SemanticRuntimeLspGeneration {
  readonly workspaceGeneration: number;
  readonly sourceGeneration: number;
  readonly fingerprint: string;
}

export interface SemanticRuntimeLspRequestGuard {
  readonly generation: SemanticRuntimeLspGeneration;
  readonly isCancellationRequested: (() => boolean) | null;
}

export type SemanticRuntimeLspRequestAbortReason = "cancelled" | "stale";

export class SemanticRuntimeLspRequestAbortedError extends Error {
  constructor(readonly reason: SemanticRuntimeLspRequestAbortReason) {
    super(`Semantic runtime LSP request ${reason}.`);
    this.name = "SemanticRuntimeLspRequestAbortedError";
  }
}

export function isSemanticRuntimeLspRequestAborted(
  error: unknown,
): error is SemanticRuntimeLspRequestAbortedError {
  return error instanceof SemanticRuntimeLspRequestAbortedError;
}

export class SemanticRuntimeLspSession {
  private readonly sourceTextProvider: OpenDocumentSourceTextProvider;
  private runtime: Promise<SemanticRuntime> | null = null;
  private workspaceRoot: string | null;
  private workspaceGeneration = 0;
  private sourceGeneration = 0;
  private pendingAppWorldClear: Promise<void> | null = null;

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
    this.recordProjectTopologyChanged();
  }

  recordProjectTopologyChanged(): SemanticRuntimeLspGeneration {
    this.workspaceGeneration += 1;
    this.sourceGeneration += 1;
    this.runtime = null;
    this.pendingAppWorldClear = null;
    return this.currentGeneration();
  }

  async recordSourceTextChanged(): Promise<SemanticRuntimeLspGeneration> {
    this.sourceGeneration += 1;
    const runtime = this.runtime;
    if (runtime != null) {
      await this.queueAppWorldClear(runtime);
    }
    return this.currentGeneration();
  }

  currentGeneration(): SemanticRuntimeLspGeneration {
    return {
      workspaceGeneration: this.workspaceGeneration,
      sourceGeneration: this.sourceGeneration,
      fingerprint: `semantic-runtime:${this.workspaceRoot ?? "no-root"}:workspace-${this.workspaceGeneration}:source-${this.sourceGeneration}`,
    };
  }

  isCurrentGeneration(generation: SemanticRuntimeLspGeneration): boolean {
    return generation.workspaceGeneration === this.workspaceGeneration
      && generation.sourceGeneration === this.sourceGeneration;
  }

  requestGuard(isCancellationRequested: (() => boolean) | null): SemanticRuntimeLspRequestGuard {
    return {
      generation: this.currentGeneration(),
      isCancellationRequested,
    };
  }

  async templateCompletions(
    document: TextDocument,
    position: Position,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const answer = await runtime.answerAppQuery({
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
    }) as SemanticRuntimeAnswer<SemanticTemplateCompletionResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async appDiagnostics(
    document: TextDocument,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const rows: SemanticAppDiagnosticsResult["rows"][number][] = [];
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticAppDiagnosticsResult> | null = null;
    do {
      this.assertRequestActive(guard);
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
      this.assertRequestActive(guard);
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
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const answer = await runtime.answerAppQuery({
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
    }) as SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async templateReferences(
    document: TextDocument,
    position: Position,
    includeDeclaration: boolean,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateReferencesResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const rows: SemanticTemplateReferencesResult["rows"][number][] = [];
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateReferencesResult> | null = null;
    do {
      this.assertRequestActive(guard);
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
      this.assertRequestActive(guard);
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
    guard: SemanticRuntimeLspRequestGuard,
    newName?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const answer = await runtime.answerAppQuery({
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
    }) as SemanticRuntimeAnswer<SemanticTemplateRenameResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async templateRenameFromTypeScript(
    document: TextDocument,
    position: Position,
    guard: SemanticRuntimeLspRequestGuard,
    newName?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const answer = await runtime.answerAppQuery({
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
    }) as SemanticRuntimeAnswer<SemanticTemplateRenameResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async templateCodeActions(
    document: TextDocument,
    position: Position,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    const answer = await runtime.answerAppQuery({
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
    }) as SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async resourceDefinitions(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>> {
    const runtime = await this.openRuntime(guard);
    return this.collectRows(runtime, SemanticAppQueryKind.ResourceDefinitions, 500, {}, guard);
  }

  async resourceVisibility(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticResourceVisibilityResult>> {
    const runtime = await this.openRuntime(guard);
    return this.collectRows(runtime, SemanticAppQueryKind.ResourceVisibility, 500, {}, guard);
  }

  async runtimeControllers(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticRuntimeControllerResult>> {
    const runtime = await this.openRuntime(guard);
    return this.collectRows(runtime, SemanticAppQueryKind.RuntimeControllers, 500, {}, guard);
  }

  async bindingBehaviorApplications(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticBindingBehaviorApplicationResult>> {
    const runtime = await this.openRuntime(guard);
    return this.collectRows(runtime, SemanticAppQueryKind.BindingBehaviorApplications, 500, {}, guard);
  }

  async valueConverterApplications(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticValueConverterApplicationResult>> {
    const runtime = await this.openRuntime(guard);
    return this.collectRows(runtime, SemanticAppQueryKind.ValueConverterApplications, 500, {}, guard);
  }

  async templateCompilations(
    guard: SemanticRuntimeLspRequestGuard,
    sourceFilePath?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompilationResult>> {
    const runtime = await this.openRuntime(guard);
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
      guard,
    );
  }

  async routeNodes(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticRouteNodesResult>> {
    const runtime = await this.openRuntime(guard);
    return this.collectRows(runtime, SemanticAppQueryKind.RouteNodes, 500, {}, guard);
  }

  async templateInlayHints(
    document: TextDocument,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult> | null = null;
    const rows: SemanticTemplateInlayHintsResult["rows"][number][] = [];
    do {
      this.assertRequestActive(guard);
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
      this.assertRequestActive(guard);
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    if (answer == null) {
      throw new Error("Semantic runtime returned no template inlay hint answer.");
    }
    return {
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
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult> | null = null;
    const rows: SemanticTemplateSemanticTokensResult["rows"][number][] = [];
    do {
      this.assertRequestActive(guard);
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
      this.assertRequestActive(guard);
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    if (answer == null) {
      throw new Error("Semantic runtime returned no template semantic token answer.");
    }
    return {
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
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult> | null = null;
    const rows: SemanticTemplateFoldingRangesResult["rows"][number][] = [];
    do {
      this.assertRequestActive(guard);
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
      this.assertRequestActive(guard);
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);

    if (answer == null) {
      throw new Error("Semantic runtime returned no template folding range answer.");
    }
    return {
      ...answer,
      value: {
        displayText: `${rows.length} template folding range row(s).`,
        rows,
      },
      page: null,
    };
  }

  private async openRuntime(guard: SemanticRuntimeLspRequestGuard): Promise<SemanticRuntime> {
    this.assertRequestActive(guard);
    if (this.workspaceRoot == null) {
      throw new Error("Cannot open semantic-runtime LSP session before workspace root is configured.");
    }
    this.runtime ??= createSemanticRuntime({
      workspaceRoot: this.workspaceRoot,
      storeKey: `lsp:${this.workspaceGeneration}:${this.workspaceRoot}`,
      sourceTextProvider: this.sourceTextProvider,
    });
    const runtime = this.pendingAppWorldClear == null
      ? await this.runtime
      : await this.pendingAppWorldClear.then(() => this.openRuntime(guard));
    this.assertRequestActive(guard);
    return runtime;
  }

  private queueAppWorldClear(runtime: Promise<SemanticRuntime>): Promise<void> {
    if (this.pendingAppWorldClear != null) {
      return this.pendingAppWorldClear;
    }
    const clear = (async () => {
      try {
        const openedRuntime = await runtime;
        if (this.runtime !== runtime) {
          return;
        }
        openedRuntime.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: "preserve" });
      } catch (error) {
        if (this.runtime === runtime) {
          this.runtime = null;
        }
        throw error;
      }
    })();
    this.pendingAppWorldClear = clear;
    void clear.then(
      () => {
        if (this.pendingAppWorldClear === clear) {
          this.pendingAppWorldClear = null;
        }
      },
      () => {
        if (this.pendingAppWorldClear === clear) {
          this.pendingAppWorldClear = null;
        }
      },
    );
    return clear;
  }

  private async collectRows<T extends { readonly rows: readonly unknown[] }>(
    runtime: SemanticRuntime,
    kind: SemanticAppQueryKind,
    pageSize: number,
    extraRequest: Record<string, unknown> = {},
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<T>> {
    const rows: unknown[] = [];
    let cursor: string | null | undefined;
    let answer: SemanticRuntimeAnswer<T> | null = null;
    do {
      this.assertRequestActive(guard);
      answer = await runtime.answerAppQuery({
        kind,
        ...extraRequest,
        page: { size: pageSize, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as SemanticRuntimeAnswer<T>;
      this.assertRequestActive(guard);
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
        rows,
      },
      page: null,
    };
  }

  private assertRequestActive(guard: SemanticRuntimeLspRequestGuard): void {
    if (guard.isCancellationRequested?.() === true) {
      throw new SemanticRuntimeLspRequestAbortedError("cancelled");
    }
    if (!this.isCurrentGeneration(guard.generation)) {
      throw new SemanticRuntimeLspRequestAbortedError("stale");
    }
  }
}
