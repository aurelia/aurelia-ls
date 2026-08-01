import { URI } from "vscode-uri";
import type { Position } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  createSemanticRuntime,
  appDiagnosticPresentation,
  InquiryContinuationKind,
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticAppQueryKind,
  type SemanticRouteNodesResult,
  type SemanticRuntime,
  type SemanticAppDiagnosticsResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceVisibilityResult,
  type SemanticRuntimeControllerResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
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
  OpenDocumentSourceTextOverlay,
  type OpenTextDocumentStore,
} from "./open-document-source-text-overlay.js";

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

interface SemanticRuntimePageDrainOptions<
  TPageValue,
  TRow,
  TResultValue,
> {
  readonly label: string;
  readonly readPage: (
    cursor: string | null | undefined,
  ) => Promise<SemanticRuntimeAnswer<TPageValue>>;
  readonly rowsForValue: (value: TPageValue) => readonly TRow[];
  readonly mergeValue: (
    terminalValue: TPageValue,
    rows: readonly TRow[],
  ) => TResultValue;
  readonly assertActive: () => void;
}

/** Drain one semantic result family without weakening its answer envelope. */
export async function drainSemanticRuntimePages<
  TPageValue,
  TRow,
  TResultValue,
>(
  options: SemanticRuntimePageDrainOptions<TPageValue, TRow, TResultValue>,
): Promise<SemanticRuntimeAnswer<TResultValue>> {
  const rows: TRow[] = [];
  const semanticContinuations = new Map<string, SemanticRuntimeContinuationRow>();
  const seenCursors = new Set<string>();
  let cursor: string | null | undefined;
  let totalRows: number | null = null;
  let firstAnswer: SemanticRuntimeAnswer<TPageValue> | null = null;
  let terminalAnswer: SemanticRuntimeAnswer<TPageValue> | null = null;

  while (terminalAnswer == null) {
    options.assertActive();
    const answer = await options.readPage(cursor);
    options.assertActive();

    if (firstAnswer == null) {
      firstAnswer = answer;
    } else {
      assertSemanticRuntimePageAxis(options.label, "result", firstAnswer.result, answer.result);
      assertSemanticRuntimePageAxis(options.label, "selection", firstAnswer.selection, answer.selection);
      assertSemanticRuntimePageAxis(options.label, "coverage", firstAnswer.coverage, answer.coverage);
    }

    const pageRows = options.rowsForValue(answer.value);
    const page = answer.page;
    if (page == null) {
      if (cursor != null) {
        throw new Error(`Semantic runtime omitted ${options.label} page metadata after a page cursor.`);
      }
    } else {
      const requestedCursor = cursor ?? null;
      if (page.cursor !== requestedCursor) {
        throw new Error(`Semantic runtime returned ${options.label} page metadata for a different cursor.`);
      }
      if (page.cursorProblem != null) {
        throw new Error(`Semantic runtime rejected a server-issued ${options.label} page cursor: ${page.cursorProblem.message}`);
      }
      if (page.returnedRows !== pageRows.length) {
        throw new Error(
          `Semantic runtime reported ${page.returnedRows} ${options.label} row(s) but returned ${pageRows.length}.`,
        );
      }
      if (totalRows == null) {
        totalRows = page.totalRows;
      } else if (page.totalRows !== totalRows) {
        throw new Error(
          `Semantic runtime changed ${options.label} total rows while paging: expected ${totalRows}, received ${page.totalRows}.`,
        );
      }
    }

    rows.push(...pageRows);
    for (const continuation of answer.continuations ?? []) {
      if (continuation.kind === InquiryContinuationKind.NextPage) {
        continue;
      }
      semanticContinuations.set(
        semanticRuntimeContinuationTransportIdentity(continuation),
        continuation,
      );
    }

    const nextCursor = answer.page?.nextCursor ?? null;
    if (nextCursor == null) {
      if (answer.page != null && !answer.page.exhausted) {
        throw new Error(
          `Semantic runtime ended ${options.label} paging before reporting exhaustion.`,
        );
      }
      terminalAnswer = answer;
      continue;
    }

    if (answer.page?.exhausted === true) {
      throw new Error(
        `Semantic runtime reported an exhausted ${options.label} page with a next cursor.`,
      );
    }
    if (seenCursors.has(nextCursor)) {
      throw new Error(
        `Semantic runtime repeated a ${options.label} page cursor.`,
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  if (totalRows != null && rows.length !== totalRows) {
    throw new Error(
      `Semantic runtime exhausted ${options.label} paging after ${rows.length} of ${totalRows} row(s).`,
    );
  }

  const continuations = [...semanticContinuations.values()];
  return {
    ...terminalAnswer,
    summary: `Returned ${rows.length} ${options.label}(s).`,
    value: options.mergeValue(terminalAnswer.value, rows),
    page: null,
    continuations: continuations.length === 0 ? undefined : continuations,
  };
}

function assertSemanticRuntimePageAxis(
  label: string,
  axis: "result" | "selection" | "coverage",
  expected: string,
  received: string,
): void {
  if (received !== expected) {
    throw new Error(
      `Semantic runtime changed ${label} ${axis} while paging: expected ${expected}, received ${received}.`,
    );
  }
}

function semanticRuntimeContinuationTransportIdentity(
  continuation: SemanticRuntimeContinuationRow,
): string {
  const serialized = JSON.stringify(continuation);
  if (serialized == null) {
    throw new Error("Semantic runtime returned a continuation that cannot be serialized.");
  }
  return serialized;
}

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
  private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority;
  private runtime: Promise<SemanticRuntime> | null = null;
  private workspaceRoot: string | null;
  private workspaceGeneration = 0;

  constructor(
    options: SemanticRuntimeLspSessionOptions,
  ) {
    this.workspaceRoot = options.workspaceRoot;
    this.projectInputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(new OpenDocumentSourceTextOverlay(options.documents)),
    );
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
    this.projectInputAuthority.advance();
    this.runtime = null;
    return this.currentGeneration();
  }

  async recordSourceTextChanged(): Promise<SemanticRuntimeLspGeneration> {
    this.projectInputAuthority.advance();
    return this.currentGeneration();
  }

  currentGeneration(): SemanticRuntimeLspGeneration {
    return {
      workspaceGeneration: this.workspaceGeneration,
      sourceGeneration: this.projectInputAuthority.currentEventSequence,
      fingerprint: `semantic-runtime:${this.workspaceRoot ?? "no-root"}:workspace-${this.workspaceGeneration}:source-${this.projectInputAuthority.currentEventSequence}`,
    };
  }

  isCurrentGeneration(generation: SemanticRuntimeLspGeneration): boolean {
    return generation.workspaceGeneration === this.workspaceGeneration
      && generation.sourceGeneration === this.projectInputAuthority.currentEventSequence;
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
    return drainSemanticRuntimePages({
      label: "template completion",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateCompletions,
        sourceFilePath: filePath,
        cursor: {
          filePath,
          line: position.line,
          character: position.character,
          offset: document.offsetAt(position),
        },
        page: { size: 100, cursor },
        inquiryProfile: "lsp-cursor",
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>>,
      rowsForValue: (value) => value.candidates,
      mergeValue: (terminalValue, candidates) => ({
        ...terminalValue,
        candidates,
      }),
    });
  }

  async appDiagnostics(
    document: TextDocument,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    return drainSemanticRuntimePages({
      label: "app diagnostic",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.AppDiagnostics,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-diagnostics",
        diagnosticProjection: "type-projection",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({
        ...terminalValue,
        displayText: `${rows.length} app diagnostic row(s).`,
        rows,
        presentation: appDiagnosticPresentation(rows, true),
      }),
    });
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
    return drainSemanticRuntimePages({
      label: "template reference",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
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
      }) as Promise<SemanticRuntimeAnswer<SemanticTemplateReferencesResult>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({
        ...terminalValue,
        displayText: `${rows.length} template reference row(s).`,
        rows,
      }),
    });
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
    return drainSemanticRuntimePages({
      label: "template inlay hint",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateInlayHints,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({
        displayText: `${rows.length} template inlay hint row(s).`,
        rows,
      }),
    });
  }

  async templateSemanticTokens(
    document: TextDocument,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    return drainSemanticRuntimePages({
      label: "template semantic token",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateSemanticTokens,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 500, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "runtime-topology",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({
        displayText: `${rows.length} template semantic token row(s).`,
        rows,
      }),
    });
  }

  async templateFoldingRanges(
    document: TextDocument,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = URI.parse(document.uri).fsPath;
    return drainSemanticRuntimePages({
      label: "template folding range",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateFoldingRanges,
        sourceFile: { filePath },
        sourceFilePath: filePath,
        page: { size: 500, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "runtime-topology",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({
        displayText: `${rows.length} template folding range row(s).`,
        rows,
      }),
    });
  }

  private async openRuntime(guard: SemanticRuntimeLspRequestGuard): Promise<SemanticRuntime> {
    this.assertRequestActive(guard);
    if (this.workspaceRoot == null) {
      throw new Error("Cannot open semantic-runtime LSP session before workspace root is configured.");
    }
    this.runtime ??= createSemanticRuntime({
      workspaceRoot: this.workspaceRoot,
      storeKey: `lsp:${this.workspaceGeneration}:${this.workspaceRoot}`,
      projectInputAuthority: this.projectInputAuthority,
    });
    const runtime = await this.runtime;
    this.assertRequestActive(guard);
    return runtime;
  }

  private async collectRows<T extends { readonly rows: readonly unknown[] }>(
    runtime: SemanticRuntime,
    kind: SemanticAppQueryKind,
    pageSize: number,
    extraRequest: Record<string, unknown> = {},
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<T>> {
    return drainSemanticRuntimePages({
      label: kind,
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind,
        ...extraRequest,
        page: { size: pageSize, cursor },
        inquiryProfile: "lsp-cursor",
        analysisDepth: "binding-observation",
        includeAuthoringTemplates: true,
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<T>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows): T => ({
        ...terminalValue,
        rows,
      }),
    });
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
