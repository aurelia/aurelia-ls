import type { Position } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  createSemanticRuntime,
  semanticWorkspaceDescriptorForRuntimeOptions,
  semanticWorkspaceDescriptorKey,
  appDiagnosticPresentation,
  canonicalTypeSystemPath,
  InquiryContinuationKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticAppQueryKind,
  type SemanticApplicationTopologyResult,
  type SemanticRuntime,
  type SemanticRuntimeProjectInputHost,
  type SemanticRuntimeProjectInputCurrentnessPolicy,
  type SemanticAppDiagnosticsResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceInventoryResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimeSummary,
  type SemanticNativeProjectConfigurationsResult,
  type SemanticAuthoredSourceOwnershipResult,
  type SemanticProjectCandidateSummary,
  type SemanticProjectConfigurationDiagnosticsResult,
  type SemanticSourceFilesResult,
  type SemanticTemplateResourceAvailabilityResult,
  type SemanticTemplateInlayHintsResult,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateCodeActionsResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateFoldingRangesResult,
  type SemanticTemplateReferencesResult,
  type SemanticTemplateRenameResult,
  type SemanticTemplateSemanticTokensResult,
} from "@aurelia-ls/semantic-runtime";
import type { DocumentUri, WorkspaceDocumentUris } from "../utils/document-uri.js";

export interface SemanticRuntimeLspSessionOptions {
  readonly documentUris: WorkspaceDocumentUris;
  readonly projectInputHost: SemanticRuntimeProjectInputHost;
  /** Exact host reads whose mutations are completely covered by this LSP session's event stream. */
  readonly projectInputCurrentnessPolicy?: SemanticRuntimeProjectInputCurrentnessPolicy | null;
}

export interface SemanticRuntimeLspGeneration {
  readonly requestEpoch: number;
  readonly workspaceGeneration: number;
  readonly sourceWorldRevision: string;
  readonly fingerprint: string;
}

export interface SemanticRuntimeLspRequestGuard {
  readonly requestEpoch: number;
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
    const rowCollection: unknown = pageRows;
    if (!Array.isArray(rowCollection)) {
      throw new Error(
        `Semantic runtime returned ${options.label} without a row collection `
        + `(result=${answer.result}; selection=${answer.selection}; coverage=${answer.coverage}): ${answer.summary}`,
      );
    }
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
  private readonly sessionIdentity = randomUUID();
  private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority;
  private readonly documentUris: WorkspaceDocumentUris;
  private readonly analysisGenerationByGuard = new WeakMap<SemanticRuntimeLspRequestGuard, SemanticRuntimeLspGeneration>();
  private runtime: Promise<SemanticRuntime> | null = null;
  private workspaceRoot: string | null;
  private projectRootHints: readonly string[] = [];
  private workspaceBoundaryKey: string;
  private workspaceGeneration = 0;
  private requestEpoch = 0;

  constructor(
    options: SemanticRuntimeLspSessionOptions,
  ) {
    this.documentUris = options.documentUris;
    this.workspaceRoot = options.documentUris.workspaceRoot;
    const boundary = semanticWorkspaceBoundary(options.documentUris, this.projectRootHints);
    this.projectRootHints = boundary.projectRootHints;
    this.workspaceBoundaryKey = boundary.key;
    // Only reads explicitly proved by the host policy may trust document/event push. Every other mutable input remains
    // pull-validated, including dependencies and filesystem structure outside complete watcher coverage.
    this.projectInputAuthority = new SemanticRuntimeProjectInputAuthority(
      options.projectInputHost,
      options.projectInputCurrentnessPolicy,
    );
  }

  configureWorkspace(projectRootHints: readonly string[] = []): void {
    const workspaceRoot = this.documentUris.workspaceRoot;
    const boundary = semanticWorkspaceBoundary(this.documentUris, projectRootHints);
    if (this.workspaceRoot === workspaceRoot && this.workspaceBoundaryKey === boundary.key) {
      return;
    }
    this.workspaceRoot = workspaceRoot;
    this.projectRootHints = boundary.projectRootHints;
    this.workspaceBoundaryKey = boundary.key;
    this.recordProjectTopologyChanged();
  }

  recordProjectTopologyChanged(filePaths: readonly string[] = []): void {
    this.requestEpoch += 1;
    this.workspaceGeneration += 1;
    this.projectInputAuthority.advance(filePaths.length === 0
      ? null
      : filePaths.map((filePath) => new SemanticRuntimeProjectInputChange(
          SemanticRuntimeProjectInputChangeKind.StructuralMembership,
          filePath,
        )));
    this.runtime = null;
  }

  recordSourceTextChanged(filePaths: readonly string[]): void {
    if (filePaths.length === 0) {
      throw new Error("A source-text change must identify at least one workspace file.");
    }
    this.recordFileValuesChanged(filePaths);
  }

  /**
   * Revoke exact configuration values without claiming that source membership changed.
   * The retained source-world receipt decides whether the new value changes its semantic plan.
   */
  recordProjectConfigurationChanged(filePaths: readonly string[]): void {
    if (filePaths.length === 0) {
      throw new Error("A project-configuration change must identify at least one workspace file.");
    }
    this.recordFileValuesChanged(filePaths);
  }

  private recordFileValuesChanged(filePaths: readonly string[]): void {
    this.projectInputAuthority.advance(filePaths.map((filePath) =>
      new SemanticRuntimeProjectInputChange(SemanticRuntimeProjectInputChangeKind.FileValue, filePath)));
    this.requestEpoch += 1;
  }

  /** Revoke every captured request guard without inventing a source or topology change. */
  invalidateRequests(): void {
    this.requestEpoch += 1;
  }

  async dispose(): Promise<void> {
    this.requestEpoch += 1;
    const activeRuntime = this.runtime;
    this.runtime = null;
    if (activeRuntime != null) {
      (await activeRuntime).clearAnalysisCache();
    }
  }

  /** Validate the shared source world before a consumer accepts cached or `unchanged` presentation state. */
  async preflight(guard: SemanticRuntimeLspRequestGuard): Promise<SemanticRuntimeLspGeneration> {
    await this.openRuntime(guard);
    return this.analysisGeneration(guard);
  }

  /** Exact source-world generation captured for this request after `preflight()` or any runtime query. */
  analysisGeneration(guard: SemanticRuntimeLspRequestGuard): SemanticRuntimeLspGeneration {
    this.assertRequestActive(guard);
    const generation = this.analysisGenerationByGuard.get(guard);
    if (generation == null) {
      throw new Error("Semantic-runtime LSP analysis generation was requested before source-world preflight.");
    }
    return generation;
  }

  async workspaceSummary(
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticRuntimeSummary>> {
    const runtime = await this.openRuntime(guard);
    const answer = runtime.summary({ projectPage: { size: 0 }, inquiryProfile: "lsp-cursor" });
    this.assertRequestActive(guard);
    return answer;
  }

  async authoredSourceOwnership(
    uri: DocumentUri,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticAuthoredSourceOwnershipResult>> {
    const sourceFilePath = this.documentUriHostPath(uri);
    const runtime = await this.openRuntime(guard);
    const answer = runtime.authoredSourceOwnership({ sourceFilePath, inquiryProfile: "lsp-cursor" });
    this.assertRequestActive(guard);
    return answer;
  }

  async nativeProjectConfigurations(
    sourceUris: readonly DocumentUri[],
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticNativeProjectConfigurationsResult>> {
    const sourceFilePaths = sourceUris.flatMap((uri) => {
      const filePath = this.documentUris.authoredHostPath(uri);
      return filePath == null ? [] : [filePath];
    });
    const runtime = await this.openRuntime(guard);
    return drainSemanticRuntimePages({
      label: "native project configuration",
      assertActive: () => this.assertRequestActive(guard),
      readPage: async (cursor) => runtime.nativeProjectConfigurations({
        sourceFilePaths,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
      }),
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({ ...terminalValue, rows }),
    });
  }

  async projectConfigurationDiagnostics(
    uri: DocumentUri,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticProjectConfigurationDiagnosticsResult>> {
    const sourceFilePath = this.documentUriHostPath(uri);
    const runtime = await this.openRuntime(guard);
    return drainSemanticRuntimePages({
      label: "native project-configuration diagnostic",
      assertActive: () => this.assertRequestActive(guard),
      readPage: async (cursor) => runtime.projectConfigurationDiagnostics({
        sourceFilePaths: [sourceFilePath],
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
      }),
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({ ...terminalValue, rows }),
    });
  }

  isCurrentGeneration(generation: SemanticRuntimeLspGeneration): boolean {
    return generation.requestEpoch === this.requestEpoch;
  }

  requestGuard(isCancellationRequested: (() => boolean) | null): SemanticRuntimeLspRequestGuard {
    return {
      requestEpoch: this.requestEpoch,
      isCancellationRequested,
    };
  }

  async templateCompletions(
    document: TextDocument,
    position: Position,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    return this.collectRows(runtime, SemanticAppQueryKind.ResourceDefinitions, 500, { detail: "handles" }, guard);
  }

  async resourceInventory(
    projectKey: string,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticResourceInventoryResult>> {
    const runtime = await this.openRuntime(guard);
    return drainSemanticRuntimePages({
      label: "resource inventory",
      assertActive: () => this.assertRequestActive(guard),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.ResourceInventory,
        projectKey,
        page: { size: 500, cursor },
        inquiryProfile: "lsp-cursor",
        appRetention: "retain-app",
      }) as Promise<SemanticRuntimeAnswer<SemanticResourceInventoryResult>>,
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({
        ...terminalValue,
        rows,
      }),
    });
  }

  async projectsOwningDocument(
    document: TextDocument,
    projects: readonly SemanticProjectCandidateSummary[],
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<readonly SemanticProjectCandidateSummary[]> {
    const runtime = await this.openRuntime(guard);
    const requested = canonicalTypeSystemPath(this.documentHostPath(document));
    const owners: SemanticProjectCandidateSummary[] = [];
    for (const project of projects) {
      const sourceFiles = await this.collectRows<SemanticSourceFilesResult>(
        runtime,
        SemanticAppQueryKind.SourceFiles,
        500,
        { projectKey: project.projectKey },
        guard,
      );
      if (sourceFiles.value.rows.some((row) => {
        const sourcePath = path.isAbsolute(row.path) ? row.path : path.join(project.rootDir, row.path);
        return canonicalTypeSystemPath(sourcePath) === requested;
      })) {
        owners.push(project);
      }
    }
    return owners;
  }

  async templateResourceAvailability(
    projectKey: string,
    document: TextDocument,
    position: Position,
    templateResourceScopeIdentityKey: string | null,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = this.documentHostPath(document);
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateResourceAvailability,
      projectKey,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        line: position.line,
        character: position.character,
        offset: document.offsetAt(position),
      },
      ...(templateResourceScopeIdentityKey == null ? {} : { templateResourceScopeIdentityKey }),
      inquiryProfile: "lsp-cursor",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async appTopology(
    sourceFilePath: string,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticApplicationTopologyResult>> {
    const runtime = await this.openRuntime(guard);
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppTopology,
      sourceFilePath,
      inquiryProfile: "lsp-cursor",
      analysisDepth: "runtime-topology",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as SemanticRuntimeAnswer<SemanticApplicationTopologyResult>;
    this.assertRequestActive(guard);
    return answer;
  }

  async templateInlayHints(
    document: TextDocument,
    guard: SemanticRuntimeLspRequestGuard,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>> {
    const runtime = await this.openRuntime(guard);
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
    const filePath = this.documentHostPath(document);
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
      projectRootHints: this.projectRootHints,
      excludedWorkspaceRoots: this.documentUris.excludedWorkspaceRoots,
      projectInputAuthority: this.projectInputAuthority,
    });
    const runtime = await this.runtime;
    if (!this.analysisGenerationByGuard.has(guard)) {
      this.assertRequestActive(guard);
      const sourceWorldRevision = runtime.workspace.sourceWorld.sourceWorldRevision;
      this.analysisGenerationByGuard.set(guard, {
        requestEpoch: guard.requestEpoch,
        workspaceGeneration: this.workspaceGeneration,
        sourceWorldRevision,
        fingerprint: `semantic-runtime:${this.sessionIdentity}:workspace-${this.workspaceGeneration}:source-world-${sourceWorldRevision}:request-${guard.requestEpoch}`,
      });
    }
    this.assertRequestActive(guard);
    return runtime;
  }

  private documentHostPath(document: TextDocument): string {
    return this.documentUriHostPath(document.uri);
  }

  private documentUriHostPath(uri: DocumentUri): string {
    const filePath = this.documentUris.authoredHostPath(uri);
    if (filePath == null) {
      throw new Error(`Cannot project document URI into the workspace host: ${uri}`);
    }
    return filePath;
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
    if (guard.requestEpoch !== this.requestEpoch) {
      throw new SemanticRuntimeLspRequestAbortedError("stale");
    }
  }
}

function semanticWorkspaceBoundary(
  documentUris: WorkspaceDocumentUris,
  projectRootHints: readonly string[],
): { readonly key: string; readonly projectRootHints: readonly string[] } {
  if (documentUris.workspaceRoot == null) {
    return { key: 'semantic-workspace:unconfigured', projectRootHints: [] };
  }
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
    workspaceRoot: documentUris.workspaceRoot,
    excludedWorkspaceRoots: documentUris.excludedWorkspaceRoots,
    projectRootHints,
  });
  if (descriptor.projectTopology.kind !== 'discover') {
    throw new Error('LSP workspace topology must use semantic-runtime project discovery.');
  }
  return {
    key: semanticWorkspaceDescriptorKey(descriptor),
    projectRootHints: descriptor.projectTopology.projectRootHints,
  };
}
