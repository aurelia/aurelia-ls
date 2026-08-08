import { MessageType, type Position } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  isSemanticRuntimeAnalysisCurrentnessError,
  ManagedSemanticWorkspaceOperationStaleError,
  ManagedSemanticWorkspaceSession,
  semanticRuntimeOptionsForWorkspaceDescriptor,
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
  type ManagedSemanticWorkspaceOperationContext,
  type ManagedSemanticWorkspaceOperationReceipt,
  type ManagedSemanticWorkspaceRuntimeReadFacade,
  type SemanticRuntimeProjectInputHost,
  type SemanticRuntimeProjectInputCurrentnessPolicy,
  type SemanticAppDiagnosticsResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceInventoryResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimeSessionAnalysisCacheOverviewRequest,
  type SemanticRuntimeSessionAnalysisCacheOverviewResult,
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
  type SemanticWorkspaceDescriptor,
} from "@aurelia-ls/semantic-runtime";
import type { DocumentUri, WorkspaceDocumentUris } from "../utils/document-uri.js";
import { languageIdForSource } from "../utils/document-kind.js";
import { stableDigest } from "../utils/stable-digest.js";

export interface SemanticRuntimeLspOpenDocumentMetadata {
  readonly uri: DocumentUri;
  readonly languageId: string;
  readonly version: number;
}

export interface SemanticRuntimeLspDocumentSnapshot {
  readonly uri: DocumentUri;
  readonly languageId: string;
  readonly version: number | null;
  readonly text: string;
}

export type SemanticRuntimeLspDeferredEffect =
  | {
      readonly kind: "log";
      readonly level: "log" | "info" | "warn";
      readonly message: string;
    }
  | {
      readonly kind: "show-message";
      readonly type: MessageType;
      readonly message: string;
    };

export interface SemanticRuntimeLspOperationDocuments {
  openDocument(uri: DocumentUri): TextDocument | null;
  ensureProgramDocument(uri: DocumentUri): TextDocument | null;
  lookupDocumentSnapshot(uri: DocumentUri): SemanticRuntimeLspDocumentSnapshot | null;
  lookupWorkspaceDocumentSnapshot(uri: DocumentUri): SemanticRuntimeLspDocumentSnapshot | null;
  lookupText(uri: DocumentUri): string | null;
}

export interface SemanticRuntimeLspOperation {
  readonly generation: SemanticRuntimeLspGeneration;
  readonly documents: SemanticRuntimeLspOperationDocuments;

  deferEffect(effect: SemanticRuntimeLspDeferredEffect): void;
  workspaceSummary(): Promise<SemanticRuntimeAnswer<SemanticRuntimeSummary>>;
  authoredSourceOwnership(uri: DocumentUri): Promise<SemanticRuntimeAnswer<SemanticAuthoredSourceOwnershipResult>>;
  nativeProjectConfigurations(sourceUris: readonly DocumentUri[]): Promise<SemanticRuntimeAnswer<SemanticNativeProjectConfigurationsResult>>;
  projectConfigurationDiagnostics(uri: DocumentUri): Promise<SemanticRuntimeAnswer<SemanticProjectConfigurationDiagnosticsResult>>;
  templateCompletions(document: TextDocument, position: Position): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>>;
  appDiagnostics(document: TextDocument): Promise<SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>>;
  templateCursorInfo(document: TextDocument, position: Position): Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>>;
  templateReferences(document: TextDocument, position: Position, includeDeclaration: boolean): Promise<SemanticRuntimeAnswer<SemanticTemplateReferencesResult>>;
  templateRename(document: TextDocument, position: Position, newName?: string | null): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>>;
  templateRenameFromTypeScript(document: TextDocument, position: Position, newName?: string | null): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>>;
  templateCodeActions(document: TextDocument, position: Position): Promise<SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>>;
  resourceDefinitions(): Promise<SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>>;
  resourceInventory(projectKey: string, includeTypeSurfaces: boolean): Promise<SemanticRuntimeAnswer<SemanticResourceInventoryResult>>;
  projectsOwningDocument(document: TextDocument, projects: readonly SemanticProjectCandidateSummary[]): Promise<readonly SemanticProjectCandidateSummary[]>;
  templateResourceAvailability(
    projectKey: string,
    document: TextDocument,
    position: Position,
    templateResourceScopeIdentityKey: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>>;
  appTopology(sourceFilePath: string): Promise<SemanticRuntimeAnswer<SemanticApplicationTopologyResult>>;
  templateInlayHints(document: TextDocument): Promise<SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>>;
  templateSemanticTokens(document: TextDocument): Promise<SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>>;
  templateFoldingRanges(document: TextDocument): Promise<SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>>;
}

export interface SemanticRuntimeLspSessionOptions {
  readonly documentUris: WorkspaceDocumentUris;
  readonly projectInputHost: SemanticRuntimeProjectInputHost;
  /** Exact host reads whose mutations are completely covered by this LSP session's event stream. */
  readonly projectInputCurrentnessPolicy?: SemanticRuntimeProjectInputCurrentnessPolicy | null;
  /** Presentation metadata only; operation text always comes from the managed exact-read authority. */
  readonly openDocumentMetadata: (uri: DocumentUri) => SemanticRuntimeLspOpenDocumentMetadata | null;
  /** Publish one typed effect after the managed operation has passed final egress validation. */
  readonly publishEffect: (effect: SemanticRuntimeLspDeferredEffect) => void | PromiseLike<void>;
}

export interface SemanticRuntimeLspGeneration {
  readonly requestEpoch: number;
  readonly workspaceGeneration: number;
  readonly sourceWorldRevision: string;
  readonly fingerprint: string;
}

export interface SemanticRuntimeLspDiagnosticRequest {
  readonly uri: DocumentUri;
  readonly identifier: string | null;
  readonly previousResultId: string | null;
  readonly projectionKey: string;
}

export type SemanticRuntimeLspDiagnosticReport<TItem> =
  | {
      readonly kind: "full";
      readonly resultId: string;
      readonly items: TItem[];
    }
  | {
      readonly kind: "unchanged";
      readonly resultId: string;
    };

export type SemanticRuntimeLspDiagnosticRenderer<TItem> = (
  operation: SemanticRuntimeLspOperation,
) => readonly TItem[] | PromiseLike<readonly TItem[]>;

export type SemanticRuntimeLspRequestAbortReason = "cancelled" | "stale";

interface SemanticRuntimeLspWorkspaceSession {
  readonly descriptorKey: string;
  readonly session: ManagedSemanticWorkspaceSession;
}

interface SemanticRuntimeLspRequestState {
  readonly requestEpoch: number;
  readonly workspaceGeneration: number;
  readonly isCancellationRequested: (() => boolean) | null;
  readonly workspace: SemanticRuntimeLspWorkspaceSession;
}

interface SemanticRuntimeLspRequestToken {
  readonly requestEpoch: number;
  readonly isCancellationRequested: (() => boolean) | null;
  readonly context: ManagedSemanticWorkspaceOperationContext;
  readonly generation: SemanticRuntimeLspGeneration;
  readonly documents: SemanticRuntimeLspOperationDocumentsScope;
  readonly runtime: ManagedSemanticWorkspaceRuntimeReadFacade;
  readonly effects: SemanticRuntimeLspDeferredEffect[];
  active: boolean;
}

interface SemanticRuntimeLspOperationCompletion<TResult> {
  readonly value: TResult;
  readonly effects: readonly SemanticRuntimeLspDeferredEffect[];
}

interface SemanticRuntimeLspDiagnosticCacheEntry {
  readonly documentKey: string;
  readonly presentationKey: string;
  readonly resultId: string;
  readonly receipt: ManagedSemanticWorkspaceOperationReceipt;
  readonly publishOrdinal: number;
}

type SemanticRuntimeLspDiagnosticOperationOutcome<TItem> =
  | {
      readonly kind: "full";
      readonly presentationKey: string;
      readonly items: TItem[];
    }
  | {
      readonly kind: "unchanged";
      readonly presentationKey: string;
      readonly resultId: string;
    };

const MAX_DIAGNOSTIC_CACHE_ENTRIES = 256;
const DIAGNOSTIC_RESULT_ID_SCHEMA = "semantic-runtime-lsp-diagnostic-result/v1";

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
  constructor(
    readonly reason: SemanticRuntimeLspRequestAbortReason,
    cause?: unknown,
  ) {
    super(`Semantic runtime LSP request ${reason}.`, cause === undefined ? undefined : { cause });
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
  private readonly openDocumentMetadata: SemanticRuntimeLspSessionOptions["openDocumentMetadata"];
  private readonly publishEffect: SemanticRuntimeLspSessionOptions["publishEffect"];
  private readonly retiringSessions = new Set<Promise<void>>();
  private readonly retirementFailures: unknown[] = [];
  private readonly diagnosticCache = new Map<string, SemanticRuntimeLspDiagnosticCacheEntry>();
  private workspace: SemanticRuntimeLspWorkspaceSession | null = null;
  private workspaceBoundaryKey: string;
  private workspaceGeneration = 0;
  private requestEpoch = 0;
  private diagnosticPublishOrdinal = 0;
  private closing = false;
  private disposal: Promise<void> | null = null;

  constructor(
    options: SemanticRuntimeLspSessionOptions,
  ) {
    this.documentUris = options.documentUris;
    this.openDocumentMetadata = options.openDocumentMetadata;
    this.publishEffect = options.publishEffect;
    const boundary = semanticWorkspaceBoundary(options.documentUris, []);
    this.workspaceBoundaryKey = boundary.key;
    // Only reads explicitly proved by the host policy may trust document/event push. Every other mutable input remains
    // pull-validated, including dependencies and filesystem structure outside complete watcher coverage.
    this.projectInputAuthority = new SemanticRuntimeProjectInputAuthority(
      options.projectInputHost,
      options.projectInputCurrentnessPolicy,
    );
    this.workspace = this.createManagedWorkspace(boundary);
  }

  configureWorkspace(projectRootHints: readonly string[] = []): void {
    this.assertOpen();
    const boundary = semanticWorkspaceBoundary(this.documentUris, projectRootHints);
    if (this.workspaceBoundaryKey === boundary.key) {
      return;
    }
    const replacement = this.createManagedWorkspace(boundary);
    this.clearDiagnosticCache();
    this.workspaceBoundaryKey = boundary.key;
    this.requestEpoch += 1;
    this.workspaceGeneration += 1;
    this.projectInputAuthority.advance(null);
    const retired = this.workspace;
    this.workspace = replacement;
    if (retired != null) {
      this.retireManagedWorkspace(retired.session);
    }
  }

  recordProjectTopologyChanged(filePaths: readonly string[] = []): void {
    this.assertOpen();
    this.clearDiagnosticCache();
    this.requestEpoch += 1;
    this.workspaceGeneration += 1;
    this.projectInputAuthority.advance(filePaths.length === 0
      ? null
      : filePaths.map((filePath) => new SemanticRuntimeProjectInputChange(
          SemanticRuntimeProjectInputChangeKind.StructuralMembership,
          filePath,
        )));
  }

  recordSourceTextChanged(filePaths: readonly string[]): void {
    if (filePaths.length === 0) {
      throw new Error("A source-text change must identify at least one workspace file.");
    }
    this.evictDiagnosticCacheForFilePaths(filePaths);
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
    this.clearDiagnosticCache();
    this.recordFileValuesChanged(filePaths);
  }

  private recordFileValuesChanged(filePaths: readonly string[]): void {
    this.assertOpen();
    this.projectInputAuthority.advance(filePaths.map((filePath) =>
      new SemanticRuntimeProjectInputChange(SemanticRuntimeProjectInputChangeKind.FileValue, filePath)));
    this.requestEpoch += 1;
  }

  /** Revoke every captured request operation without inventing a source or topology change. */
  invalidateRequests(): void {
    this.requestEpoch += 1;
  }

  dispose(): Promise<void> {
    if (this.disposal != null) {
      return this.disposal;
    }
    this.closing = true;
    this.requestEpoch += 1;
    this.clearDiagnosticCache();
    const activeWorkspace = this.workspace;
    this.workspace = null;
    if (activeWorkspace != null) {
      this.retireManagedWorkspace(activeWorkspace.session);
    }
    const disposal = this.finishDisposal();
    this.disposal = disposal;
    return disposal;
  }

  async runRequest<TResult>(
    isCancellationRequested: (() => boolean) | null,
    callback: (operation: SemanticRuntimeLspOperation) => TResult | PromiseLike<TResult>,
  ): Promise<TResult> {
    if (typeof callback !== "function") {
      throw new TypeError("Semantic-runtime LSP request callback must be a function.");
    }
    const state = this.captureRequestState(isCancellationRequested);
    this.assertRequestStateActive(state);
    let completed: SemanticRuntimeLspOperationCompletion<TResult>;
    try {
      completed = await state.workspace.session.run((context) =>
        this.runOperationCallback(state, context, (operation) => callback(operation)));
    } catch (error) {
      this.throwRequestFailure(state, error);
    }
    this.assertRequestStateActive(state);
    try {
      for (const effect of completed.effects) {
        this.assertRequestStateActive(state);
        await this.publishEffect(effect);
        this.assertRequestStateActive(state);
      }
    } catch (error) {
      this.throwRequestFailure(state, error);
    }
    this.assertRequestStateActive(state);
    return completed.value;
  }

  /** Read detached session-retention telemetry through the managed shared control boundary. */
  async analysisCacheOverview(
    request: SemanticRuntimeSessionAnalysisCacheOverviewRequest = {},
  ): Promise<SemanticRuntimeSessionAnalysisCacheOverviewResult> {
    const state = this.captureRequestState(null);
    this.assertRequestStateActive(state);
    try {
      const value = await state.workspace.session.analysisCacheOverview(
        request,
        (answer) => structuredClone(answer.value),
      );
      this.assertRequestStateActive(state);
      return value;
    } catch (error) {
      this.throwRequestFailure(state, error);
    }
  }

  async runDiagnosticRequest<TItem>(
    isCancellationRequested: (() => boolean) | null,
    request: SemanticRuntimeLspDiagnosticRequest,
    render: SemanticRuntimeLspDiagnosticRenderer<TItem>,
  ): Promise<SemanticRuntimeLspDiagnosticReport<TItem>> {
    if (typeof render !== "function") {
      throw new TypeError("Semantic-runtime LSP diagnostic renderer must be a function.");
    }
    const normalizedRequest = normalizeSemanticRuntimeLspDiagnosticRequest(request);
    const state = this.captureRequestState(isCancellationRequested);
    this.assertRequestStateActive(state);
    const publishOrdinal = ++this.diagnosticPublishOrdinal;
    const documentKey = this.documentUris.key(normalizedRequest.uri);
    const cacheKey = diagnosticCacheKey(documentKey, normalizedRequest);
    const completed = await this.runOperationWithReceipt<
      SemanticRuntimeLspDiagnosticOperationOutcome<TItem>
    >(
      state,
      (operation, context) => {
        const snapshot = operation.documents.lookupDocumentSnapshot(normalizedRequest.uri);
        const presentationKey = diagnosticPresentationKey(
          this.documentUris,
          normalizedRequest.uri,
          snapshot,
        );
        const cached = this.diagnosticCache.get(cacheKey);
        if (
          cached != null
          && cached.resultId === normalizedRequest.previousResultId
          && cached.presentationKey === presentationKey
          && context.tryAbsorbReceipt(cached.receipt)
        ) {
          return {
            kind: "unchanged" as const,
            presentationKey,
            resultId: cached.resultId,
          };
        }
        return Promise.resolve(render(operation)).then((items) => ({
          kind: "full" as const,
          presentationKey,
          items: [...items],
        }));
      },
    );

    let receipt: ManagedSemanticWorkspaceOperationReceipt | null = completed.receipt;
    try {
      this.assertRequestStateActive(state);
      try {
        for (const effect of completed.value.effects) {
          this.assertRequestStateActive(state);
          await this.publishEffect(effect);
          this.assertRequestStateActive(state);
        }
      } catch (error) {
        this.throwRequestFailure(state, error);
      }
      this.assertRequestStateActive(state);
      const outcome = completed.value.value;
      const resultId = outcome.kind === "unchanged"
        ? outcome.resultId
        : diagnosticResultId(
            this.sessionIdentity,
            cacheKey,
            outcome.presentationKey,
            receipt,
            outcome.items,
          );
      const published = this.publishDiagnosticCacheEntry(cacheKey, {
        documentKey,
        presentationKey: outcome.presentationKey,
        resultId,
        receipt,
        publishOrdinal,
      });
      if (published) {
        receipt = null;
      }
      return outcome.kind === "unchanged"
        ? { kind: "unchanged", resultId }
        : { kind: "full", resultId, items: outcome.items };
    } finally {
      receipt?.dispose();
    }
  }

  private async runOperationCallback<TResult>(
    state: SemanticRuntimeLspRequestState,
    context: ManagedSemanticWorkspaceOperationContext,
    callback: (
      operation: SemanticRuntimeLspOperation,
      context: ManagedSemanticWorkspaceOperationContext,
    ) => TResult | PromiseLike<TResult>,
  ): Promise<SemanticRuntimeLspOperationCompletion<TResult>> {
    this.assertRequestStateActive(state);
    const generation = Object.freeze({
      requestEpoch: state.requestEpoch,
      workspaceGeneration: state.workspaceGeneration,
      sourceWorldRevision: context.sourceWorldRevision,
      fingerprint: `semantic-runtime:${this.sessionIdentity}:workspace-${state.workspaceGeneration}:source-world-${context.sourceWorldRevision}:request-${state.requestEpoch}`,
    });
    const token = this.createRequestToken(state, context, generation);
    const operation = this.createOperation(token);
    try {
      const value = await callback(operation, context);
      this.assertRequestTokenActive(token);
      return Object.freeze({
        value,
        effects: Object.freeze([...token.effects]),
      });
    } finally {
      token.active = false;
      token.documents.close();
    }
  }

  private async runOperationWithReceipt<TResult>(
    state: SemanticRuntimeLspRequestState,
    callback: (
      operation: SemanticRuntimeLspOperation,
      context: ManagedSemanticWorkspaceOperationContext,
    ) => TResult | PromiseLike<TResult>,
  ): Promise<{
    readonly value: SemanticRuntimeLspOperationCompletion<TResult>;
    readonly receipt: ManagedSemanticWorkspaceOperationReceipt;
  }> {
    try {
      return await state.workspace.session.runWithReceipt((context) =>
        this.runOperationCallback(state, context, callback));
    } catch (error) {
      this.throwRequestFailure(state, error);
    }
  }

  private publishDiagnosticCacheEntry(
    cacheKey: string,
    entry: SemanticRuntimeLspDiagnosticCacheEntry,
  ): boolean {
    const existing = this.diagnosticCache.get(cacheKey);
    if (existing != null && existing.publishOrdinal > entry.publishOrdinal) {
      return false;
    }
    if (existing != null) {
      this.diagnosticCache.delete(cacheKey);
      existing.receipt.dispose();
    }
    this.diagnosticCache.set(cacheKey, Object.freeze(entry));
    while (this.diagnosticCache.size > MAX_DIAGNOSTIC_CACHE_ENTRIES) {
      const oldestKey = this.diagnosticCache.keys().next().value;
      if (oldestKey == null) break;
      const oldest = this.diagnosticCache.get(oldestKey);
      this.diagnosticCache.delete(oldestKey);
      oldest?.receipt.dispose();
    }
    return true;
  }

  private evictDiagnosticCacheForFilePaths(filePaths: readonly string[]): void {
    const changedDocumentKeys = new Set(filePaths.map((filePath) =>
      this.documentUris.key(filePath)));
    for (const [cacheKey, entry] of this.diagnosticCache) {
      if (!changedDocumentKeys.has(entry.documentKey)) continue;
      this.diagnosticCache.delete(cacheKey);
      entry.receipt.dispose();
    }
  }

  private clearDiagnosticCache(): void {
    for (const entry of this.diagnosticCache.values()) {
      entry.receipt.dispose();
    }
    this.diagnosticCache.clear();
  }

  private createManagedWorkspace(
    boundary: ReturnType<typeof semanticWorkspaceBoundary>,
  ): SemanticRuntimeLspWorkspaceSession | null {
    if (boundary.descriptor == null) {
      return null;
    }
    const runtimeOptions = semanticRuntimeOptionsForWorkspaceDescriptor(boundary.descriptor, {
      projectInputAuthority: this.projectInputAuthority,
    });
    return Object.freeze({
      descriptorKey: boundary.key,
      session: new ManagedSemanticWorkspaceSession(runtimeOptions),
    });
  }

  private retireManagedWorkspace(session: ManagedSemanticWorkspaceSession): void {
    let retirement: Promise<void>;
    try {
      retirement = session.dispose();
    } catch (error) {
      this.retirementFailures.push(error);
      return;
    }
    const tracked = retirement.then(
      () => {
        this.retiringSessions.delete(tracked);
      },
      (error: unknown) => {
        this.retiringSessions.delete(tracked);
        this.retirementFailures.push(error);
      },
    );
    this.retiringSessions.add(tracked);
  }

  private async finishDisposal(): Promise<void> {
    await Promise.all([...this.retiringSessions]);
    if (this.retirementFailures.length === 1) {
      throw this.retirementFailures[0];
    }
    if (this.retirementFailures.length > 1) {
      throw new AggregateError(
        [...this.retirementFailures],
        "Failed to retire one or more managed semantic-runtime LSP workspaces.",
      );
    }
  }

  private captureRequestState(
    isCancellationRequested: (() => boolean) | null,
  ): SemanticRuntimeLspRequestState {
    this.assertOpen();
    const workspace = this.workspace;
    if (workspace == null) {
      throw new Error("Cannot run a semantic-runtime LSP request before the workspace is configured.");
    }
    return Object.freeze({
      requestEpoch: this.requestEpoch,
      workspaceGeneration: this.workspaceGeneration,
      isCancellationRequested,
      workspace,
    });
  }

  private createRequestToken(
    state: SemanticRuntimeLspRequestState,
    context: ManagedSemanticWorkspaceOperationContext,
    generation: SemanticRuntimeLspGeneration,
  ): SemanticRuntimeLspRequestToken {
    // The liveness closures need the fully assembled token but are not invoked by construction.
    // eslint-disable-next-line prefer-const
    let token!: SemanticRuntimeLspRequestToken;
    const documents = new SemanticRuntimeLspOperationDocumentsScope(
      this.documentUris,
      this.openDocumentMetadata,
      context,
      () => this.assertRequestTokenActive(token),
      (error) => this.throwOperationFailure(token, error),
    );
    const runtime = managedSemanticRuntimeReadFacadeForLspOperation(
      context.runtime,
      () => this.assertRequestTokenActive(token),
      (error) => this.throwOperationFailure(token, error),
    );
    token = {
      requestEpoch: state.requestEpoch,
      isCancellationRequested: state.isCancellationRequested,
      context,
      generation,
      effects: [],
      active: true,
      documents,
      runtime,
    };
    return token;
  }

  private createOperation(token: SemanticRuntimeLspRequestToken): SemanticRuntimeLspOperation {
    const operation: SemanticRuntimeLspOperation = {
      generation: token.generation,
      documents: token.documents,
      deferEffect: (effect) => {
        this.assertRequestTokenActive(token);
        token.effects.push(normalizeSemanticRuntimeLspDeferredEffect(effect));
      },
      workspaceSummary: () => this.workspaceSummary(token),
      authoredSourceOwnership: (uri) => this.authoredSourceOwnership(uri, token),
      nativeProjectConfigurations: (sourceUris) => this.nativeProjectConfigurations(sourceUris, token),
      projectConfigurationDiagnostics: (uri) => this.projectConfigurationDiagnostics(uri, token),
      templateCompletions: (document, position) => this.templateCompletions(document, position, token),
      appDiagnostics: (document) => this.appDiagnostics(document, token),
      templateCursorInfo: (document, position) => this.templateCursorInfo(document, position, token),
      templateReferences: (document, position, includeDeclaration) =>
        this.templateReferences(document, position, includeDeclaration, token),
      templateRename: (document, position, newName) => this.templateRename(document, position, token, newName),
      templateRenameFromTypeScript: (document, position, newName) =>
        this.templateRenameFromTypeScript(document, position, token, newName),
      templateCodeActions: (document, position) => this.templateCodeActions(document, position, token),
      resourceDefinitions: () => this.resourceDefinitions(token),
      resourceInventory: (projectKey, includeTypeSurfaces) =>
        this.resourceInventory(projectKey, includeTypeSurfaces, token),
      projectsOwningDocument: (document, projects) => this.projectsOwningDocument(document, projects, token),
      templateResourceAvailability: (projectKey, document, position, templateResourceScopeIdentityKey) =>
        this.templateResourceAvailability(
          projectKey,
          document,
          position,
          templateResourceScopeIdentityKey,
          token,
        ),
      appTopology: (sourceFilePath) => this.appTopology(sourceFilePath, token),
      templateInlayHints: (document) => this.templateInlayHints(document, token),
      templateSemanticTokens: (document) => this.templateSemanticTokens(document, token),
      templateFoldingRanges: (document) => this.templateFoldingRanges(document, token),
    };
    return Object.freeze(operation);
  }

  private assertRequestTokenActive(token: SemanticRuntimeLspRequestToken): void {
    if (!token.active) {
      throw new Error("Cannot use a semantic-runtime LSP operation after its request callback has closed.");
    }
    if (token.isCancellationRequested?.() === true) {
      throw new SemanticRuntimeLspRequestAbortedError("cancelled");
    }
    if (token.requestEpoch !== this.requestEpoch) {
      throw new SemanticRuntimeLspRequestAbortedError("stale");
    }
  }

  private throwOperationFailure(token: SemanticRuntimeLspRequestToken, error: unknown): never {
    this.assertRequestTokenActive(token);
    if (isSemanticRuntimeAnalysisCurrentnessError(error)) {
      throw new SemanticRuntimeLspRequestAbortedError("stale", error);
    }
    throw error;
  }

  private assertRequestStateActive(state: SemanticRuntimeLspRequestState): void {
    if (state.isCancellationRequested?.() === true) {
      throw new SemanticRuntimeLspRequestAbortedError("cancelled");
    }
    if (state.requestEpoch !== this.requestEpoch || state.workspace !== this.workspace) {
      throw new SemanticRuntimeLspRequestAbortedError("stale");
    }
  }

  private throwRequestFailure(state: SemanticRuntimeLspRequestState, error: unknown): never {
    if (state.isCancellationRequested?.() === true) {
      throw new SemanticRuntimeLspRequestAbortedError("cancelled", error);
    }
    if (state.requestEpoch !== this.requestEpoch || state.workspace !== this.workspace) {
      throw new SemanticRuntimeLspRequestAbortedError("stale", error);
    }
    if (
      error instanceof ManagedSemanticWorkspaceOperationStaleError
      || isSemanticRuntimeAnalysisCurrentnessError(error)
    ) {
      throw new SemanticRuntimeLspRequestAbortedError("stale", error);
    }
    throw error;
  }

  private assertOpen(): void {
    if (this.closing) {
      throw new Error("Cannot use a semantic-runtime LSP session after disposal has begun.");
    }
  }

  private workspaceSummary(
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticRuntimeSummary>> {
    const runtime = this.runtimeForOperation(token);
    const answer = runtime.summary({ projectPage: { size: 0 }, inquiryProfile: "lsp-cursor" });
    this.assertRequestTokenActive(token);
    return Promise.resolve(answer);
  }

  private authoredSourceOwnership(
    uri: DocumentUri,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticAuthoredSourceOwnershipResult>> {
    const sourceFilePath = this.documentUriHostPath(uri);
    const runtime = this.runtimeForOperation(token);
    const answer = runtime.authoredSourceOwnership({ sourceFilePath, inquiryProfile: "lsp-cursor" });
    this.assertRequestTokenActive(token);
    return Promise.resolve(answer);
  }

  private async nativeProjectConfigurations(
    sourceUris: readonly DocumentUri[],
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticNativeProjectConfigurationsResult>> {
    const sourceFilePaths = sourceUris.flatMap((uri) => {
      const filePath = this.documentUris.authoredHostPath(uri);
      return filePath == null ? [] : [filePath];
    });
    const runtime = this.runtimeForOperation(token);
    return drainSemanticRuntimePages({
      label: "native project configuration",
      assertActive: () => this.assertRequestTokenActive(token),
      readPage: (cursor) => Promise.resolve(runtime.nativeProjectConfigurations({
        sourceFilePaths,
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
      })),
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({ ...terminalValue, rows }),
    });
  }

  private async projectConfigurationDiagnostics(
    uri: DocumentUri,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticProjectConfigurationDiagnosticsResult>> {
    const sourceFilePath = this.documentUriHostPath(uri);
    const runtime = this.runtimeForOperation(token);
    return drainSemanticRuntimePages({
      label: "native project-configuration diagnostic",
      assertActive: () => this.assertRequestTokenActive(token),
      readPage: (cursor) => Promise.resolve(runtime.projectConfigurationDiagnostics({
        sourceFilePaths: [sourceFilePath],
        page: { size: 200, cursor },
        inquiryProfile: "lsp-cursor",
      })),
      rowsForValue: (value) => value.rows,
      mergeValue: (terminalValue, rows) => ({ ...terminalValue, rows }),
    });
  }

  private async templateCompletions(
    document: TextDocument,
    position: Position,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>> {
    const runtime = this.runtimeForOperation(token);
    const filePath = this.documentHostPath(document);
    return drainSemanticRuntimePages({
      label: "template completion",
      assertActive: () => this.assertRequestTokenActive(token),
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

  private async appDiagnostics(
    document: TextDocument,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>> {
    const runtime = this.runtimeForOperation(token);
    const filePath = this.documentHostPath(document);
    return drainSemanticRuntimePages({
      label: "app diagnostic",
      assertActive: () => this.assertRequestTokenActive(token),
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

  private async templateCursorInfo(
    document: TextDocument,
    position: Position,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>> {
    const runtime = this.runtimeForOperation(token);
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
    this.assertRequestTokenActive(token);
    return answer;
  }

  private async templateReferences(
    document: TextDocument,
    position: Position,
    includeDeclaration: boolean,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateReferencesResult>> {
    const runtime = this.runtimeForOperation(token);
    const filePath = this.documentHostPath(document);
    return drainSemanticRuntimePages({
      label: "template reference",
      assertActive: () => this.assertRequestTokenActive(token),
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

  private async templateRename(
    document: TextDocument,
    position: Position,
    token: SemanticRuntimeLspRequestToken,
    newName?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>> {
    const runtime = this.runtimeForOperation(token);
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
    this.assertRequestTokenActive(token);
    return answer;
  }

  private async templateRenameFromTypeScript(
    document: TextDocument,
    position: Position,
    token: SemanticRuntimeLspRequestToken,
    newName?: string | null,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateRenameResult>> {
    const runtime = this.runtimeForOperation(token);
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
    this.assertRequestTokenActive(token);
    return answer;
  }

  private async templateCodeActions(
    document: TextDocument,
    position: Position,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>> {
    const runtime = this.runtimeForOperation(token);
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
    this.assertRequestTokenActive(token);
    return answer;
  }

  private async resourceDefinitions(
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>> {
    const runtime = this.runtimeForOperation(token);
    return this.collectRows(runtime, SemanticAppQueryKind.ResourceDefinitions, 500, {}, token);
  }

  private async resourceInventory(
    projectKey: string,
    includeTypeSurfaces: boolean,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticResourceInventoryResult>> {
    const runtime = this.runtimeForOperation(token);
    return drainSemanticRuntimePages({
      label: "resource inventory",
      assertActive: () => this.assertRequestTokenActive(token),
      readPage: (cursor) => runtime.answerAppQuery({
        kind: SemanticAppQueryKind.ResourceInventory,
        projectKey,
        includeTypeSurfaces,
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

  private async projectsOwningDocument(
    document: TextDocument,
    projects: readonly SemanticProjectCandidateSummary[],
    token: SemanticRuntimeLspRequestToken,
  ): Promise<readonly SemanticProjectCandidateSummary[]> {
    const runtime = this.runtimeForOperation(token);
    const requested = canonicalTypeSystemPath(this.documentHostPath(document));
    const owners: SemanticProjectCandidateSummary[] = [];
    for (const project of projects) {
      const sourceFiles = await this.collectRows<SemanticSourceFilesResult>(
        runtime,
        SemanticAppQueryKind.SourceFiles,
        500,
        { projectKey: project.projectKey },
        token,
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

  private async templateResourceAvailability(
    projectKey: string,
    document: TextDocument,
    position: Position,
    templateResourceScopeIdentityKey: string | null,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>> {
    const runtime = this.runtimeForOperation(token);
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
    this.assertRequestTokenActive(token);
    return answer;
  }

  private async appTopology(
    sourceFilePath: string,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticApplicationTopologyResult>> {
    const runtime = this.runtimeForOperation(token);
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppTopology,
      sourceFilePath,
      inquiryProfile: "lsp-cursor",
      analysisDepth: "runtime-topology",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    }) as SemanticRuntimeAnswer<SemanticApplicationTopologyResult>;
    this.assertRequestTokenActive(token);
    return answer;
  }

  private async templateInlayHints(
    document: TextDocument,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>> {
    const runtime = this.runtimeForOperation(token);
    const filePath = this.documentHostPath(document);
    return drainSemanticRuntimePages({
      label: "template inlay hint",
      assertActive: () => this.assertRequestTokenActive(token),
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

  private async templateSemanticTokens(
    document: TextDocument,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>> {
    const runtime = this.runtimeForOperation(token);
    const filePath = this.documentHostPath(document);
    return drainSemanticRuntimePages({
      label: "template semantic token",
      assertActive: () => this.assertRequestTokenActive(token),
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

  private async templateFoldingRanges(
    document: TextDocument,
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>> {
    const runtime = this.runtimeForOperation(token);
    const filePath = this.documentHostPath(document);
    return drainSemanticRuntimePages({
      label: "template folding range",
      assertActive: () => this.assertRequestTokenActive(token),
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

  private runtimeForOperation(token: SemanticRuntimeLspRequestToken): ManagedSemanticWorkspaceRuntimeReadFacade {
    this.assertRequestTokenActive(token);
    return token.runtime;
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
    runtime: ManagedSemanticWorkspaceRuntimeReadFacade,
    kind: SemanticAppQueryKind,
    pageSize: number,
    extraRequest: Record<string, unknown> = {},
    token: SemanticRuntimeLspRequestToken,
  ): Promise<SemanticRuntimeAnswer<T>> {
    return drainSemanticRuntimePages({
      label: kind,
      assertActive: () => this.assertRequestTokenActive(token),
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

}

class SemanticRuntimeLspOperationDocumentsScope implements SemanticRuntimeLspOperationDocuments {
  private active = true;
  private readonly workspaceSnapshots = new Map<DocumentUri, SemanticRuntimeLspDocumentSnapshot | null>();
  private readonly openDocuments = new Map<DocumentUri, TextDocument | null>();

  constructor(
    private readonly documentUris: WorkspaceDocumentUris,
    private readonly openDocumentMetadata: SemanticRuntimeLspSessionOptions["openDocumentMetadata"],
    private readonly context: ManagedSemanticWorkspaceOperationContext,
    private readonly assertRequestActive: () => void,
    private readonly throwOperationFailure: (error: unknown) => never,
  ) {}

  openDocument(uri: DocumentUri): TextDocument | null {
    this.assertActive();
    if (!this.documentUris.ownsDocument(uri)) {
      return null;
    }
    const canonical = this.documentUris.resolve(uri).uri;
    if (this.openDocuments.has(canonical)) {
      return this.openDocuments.get(canonical) ?? null;
    }
    const metadata = this.readOpenDocumentMetadata(canonical);
    if (metadata == null) {
      this.openDocuments.set(canonical, null);
      return null;
    }
    const snapshot = this.lookupDocumentSnapshot(canonical);
    const document = snapshot == null
      ? null
      : TextDocument.create(snapshot.uri, metadata.languageId, metadata.version, snapshot.text);
    this.openDocuments.set(canonical, document);
    return document;
  }

  ensureProgramDocument(uri: DocumentUri): TextDocument | null {
    this.assertActive();
    const snapshot = this.lookupDocumentSnapshot(uri);
    return snapshot == null
      ? null
      : TextDocument.create(
          snapshot.uri,
          snapshot.languageId,
          snapshot.version ?? 0,
          snapshot.text,
        );
  }

  lookupDocumentSnapshot(uri: DocumentUri): SemanticRuntimeLspDocumentSnapshot | null {
    this.assertActive();
    return this.documentUris.ownsDocument(uri)
      ? this.lookupWorkspaceDocumentSnapshot(uri)
      : null;
  }

  lookupWorkspaceDocumentSnapshot(uri: DocumentUri): SemanticRuntimeLspDocumentSnapshot | null {
    this.assertActive();
    const resolved = this.documentUris.resolve(uri);
    const canonical = resolved.uri;
    if (this.workspaceSnapshots.has(canonical)) {
      return this.workspaceSnapshots.get(canonical) ?? null;
    }
    const filePath = this.documentUris.workspaceHostPath(canonical);
    if (filePath == null) {
      this.workspaceSnapshots.set(canonical, null);
      return null;
    }
    const metadata = this.readOpenDocumentMetadata(canonical);
    const text = this.readSourceText(filePath);
    const snapshot = text == null
      ? null
      : Object.freeze({
          uri: metadata?.uri ?? canonical,
          languageId: metadata?.languageId ?? languageIdForSource(filePath),
          version: metadata?.version ?? null,
          text,
        });
    this.workspaceSnapshots.set(canonical, snapshot);
    return snapshot;
  }

  lookupText(uri: DocumentUri): string | null {
    this.assertActive();
    return this.lookupWorkspaceDocumentSnapshot(uri)?.text ?? null;
  }

  close(): void {
    this.active = false;
    this.workspaceSnapshots.clear();
    this.openDocuments.clear();
  }

  private readOpenDocumentMetadata(uri: DocumentUri): SemanticRuntimeLspOpenDocumentMetadata | null {
    this.assertActive();
    let metadata: SemanticRuntimeLspOpenDocumentMetadata | null;
    try {
      metadata = this.openDocumentMetadata(uri);
    } catch (error) {
      this.throwOperationFailure(error);
    }
    this.assertActive();
    if (metadata != null && !this.documentUris.sameDocument(metadata.uri, uri)) {
      throw new Error(
        `Open-document metadata for '${metadata.uri}' does not describe requested document '${uri}'.`,
      );
    }
    return metadata;
  }

  private readSourceText(filePath: string): string | undefined {
    this.assertActive();
    let text: string | undefined;
    try {
      text = this.context.readSourceText(filePath);
    } catch (error) {
      this.throwOperationFailure(error);
    }
    this.assertActive();
    return text;
  }

  private assertActive(): void {
    if (!this.active) {
      throw new Error("Cannot use semantic-runtime LSP operation documents after request egress.");
    }
    this.assertRequestActive();
  }
}

function managedSemanticRuntimeReadFacadeForLspOperation(
  runtime: ManagedSemanticWorkspaceRuntimeReadFacade,
  assertActive: () => void,
  throwOperationFailure: (error: unknown) => never,
): ManagedSemanticWorkspaceRuntimeReadFacade {
  const methods = new Map<PropertyKey, (...args: readonly unknown[]) => unknown>();
  return new Proxy(Object.create(null) as ManagedSemanticWorkspaceRuntimeReadFacade, {
    get(_target, property) {
      const value = Reflect.get(runtime, property, runtime) as unknown;
      if (typeof value !== "function") {
        return value;
      }
      const existing = methods.get(property);
      if (existing != null) {
        return existing;
      }
      const method = (...args: readonly unknown[]): unknown => {
        assertActive();
        let result: unknown;
        try {
          result = Reflect.apply(value, runtime, args);
        } catch (error) {
          throwOperationFailure(error);
        }
        if (isPromiseLike(result)) {
          return Promise.resolve(result).then(
            (answer) => {
              assertActive();
              return answer;
            },
            (error: unknown) => throwOperationFailure(error),
          );
        }
        assertActive();
        return result;
      };
      methods.set(property, method);
      return method;
    },
  });
}

function normalizeSemanticRuntimeLspDiagnosticRequest(
  request: SemanticRuntimeLspDiagnosticRequest,
): SemanticRuntimeLspDiagnosticRequest {
  if (request == null || typeof request !== "object") {
    throw new TypeError("Semantic-runtime LSP diagnostic request must be an object.");
  }
  if (typeof request.uri !== "string" || request.uri.length === 0) {
    throw new TypeError("Semantic-runtime LSP diagnostic request URI must be a non-empty string.");
  }
  if (request.identifier !== null && typeof request.identifier !== "string") {
    throw new TypeError("Semantic-runtime LSP diagnostic identifier must be a string or null.");
  }
  if (request.previousResultId !== null && typeof request.previousResultId !== "string") {
    throw new TypeError("Semantic-runtime LSP previous diagnostic result ID must be a string or null.");
  }
  if (typeof request.projectionKey !== "string" || request.projectionKey.length === 0) {
    throw new TypeError("Semantic-runtime LSP diagnostic projection key must be a non-empty string.");
  }
  return Object.freeze({
    uri: request.uri,
    identifier: request.identifier,
    previousResultId: request.previousResultId,
    projectionKey: request.projectionKey,
  });
}

function diagnosticCacheKey(
  documentKey: string,
  request: SemanticRuntimeLspDiagnosticRequest,
): string {
  return stableDigest({
    schema: "semantic-runtime-lsp-diagnostic-cache-key/v1",
    documentKey,
    identifier: request.identifier,
    projectionKey: request.projectionKey,
  });
}

function diagnosticPresentationKey(
  documentUris: WorkspaceDocumentUris,
  requestedUri: DocumentUri,
  snapshot: SemanticRuntimeLspDocumentSnapshot | null,
): string {
  return stableDigest({
    schema: "semantic-runtime-lsp-diagnostic-presentation/v1",
    document: snapshot == null
      ? {
          present: false,
          uri: documentUris.resolve(requestedUri).uri,
        }
      : {
          present: true,
          uri: snapshot.uri,
          languageId: snapshot.languageId,
          version: snapshot.version,
        },
  });
}

function diagnosticResultId(
  sessionIdentity: string,
  cacheKey: string,
  presentationKey: string,
  receipt: ManagedSemanticWorkspaceOperationReceipt,
  items: readonly unknown[],
): string {
  return `${sessionIdentity}:diagnostic-${stableDigest({
    schema: DIAGNOSTIC_RESULT_ID_SCHEMA,
    cacheKey,
    presentationKey,
    analysisBasisRevision: receipt.analysisBasis.revision,
    items,
  })}`;
}

function normalizeSemanticRuntimeLspDeferredEffect(
  effect: SemanticRuntimeLspDeferredEffect,
): SemanticRuntimeLspDeferredEffect {
  if (effect == null || typeof effect !== "object") {
    throw new TypeError("Semantic-runtime LSP deferred effect must be an object.");
  }
  if (effect.kind === "log") {
    if (
      effect.level !== "log"
      && effect.level !== "info"
      && effect.level !== "warn"
    ) {
      throw new TypeError("Semantic-runtime LSP log effect has an unsupported level.");
    }
    if (typeof effect.message !== "string") {
      throw new TypeError("Semantic-runtime LSP log effect message must be a string.");
    }
    return Object.freeze({ kind: effect.kind, level: effect.level, message: effect.message });
  }
  if (effect.kind === "show-message") {
    if (
      effect.type !== MessageType.Error
      && effect.type !== MessageType.Warning
      && effect.type !== MessageType.Info
      && effect.type !== MessageType.Log
    ) {
      throw new TypeError("Semantic-runtime LSP show-message effect has an unsupported message type.");
    }
    if (typeof effect.message !== "string") {
      throw new TypeError("Semantic-runtime LSP show-message effect message must be a string.");
    }
    return Object.freeze({ kind: effect.kind, type: effect.type, message: effect.message });
  }
  throw new TypeError("Semantic-runtime LSP deferred effect has an unsupported kind.");
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" && value != null) || typeof value === "function"
  ) && typeof (value as { readonly then?: unknown }).then === "function";
}

function semanticWorkspaceBoundary(
  documentUris: WorkspaceDocumentUris,
  projectRootHints: readonly string[],
): {
  readonly key: string;
  readonly projectRootHints: readonly string[];
  readonly descriptor: SemanticWorkspaceDescriptor | null;
} {
  if (documentUris.workspaceRoot == null) {
    return {
      key: 'semantic-workspace:unconfigured',
      projectRootHints: [],
      descriptor: null,
    };
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
    descriptor,
  };
}
