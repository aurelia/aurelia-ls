/**
 * LSP lifecycle handlers: initialize, document events, configuration changes
 */
import {
  isSemanticRuntimeAnalysisCurrentnessError,
  ManagedSemanticWorkspaceOperationStaleError,
  SemanticSourceWorldCurrentnessKind,
} from "@aurelia-ls/semantic-runtime";
import {
  CodeActionKind,
  TextDocumentSyncKind,
  FileChangeType,
  DidChangeConfigurationNotification,
  ErrorCodes,
  ResponseError,
  type InitializeParams,
  type InitializeResult,
  type DidChangeWatchedFilesParams,
  type FileEvent,
} from "vscode-languageserver/node";
import path from "node:path";
import type { ServerContext } from "../context.js";
import { AureliaProtocolNotification } from "../protocol.js";
import type {
  AnalysisChangedPayload,
  AureliaInitializeOptions,
  AureliaSupportLifecycleSnapshot,
} from "../protocol.js";
import { isAnalyzedSourceDocumentUri } from "../utils/document-kind.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspGeneration,
} from "../runtime/semantic-runtime-session.js";
import { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";

/** Quiet period before publishing workspace-wide derived analysis. */
const ANALYSIS_REFRESH_DEBOUNCE_MS = 300;

interface LifecycleRefreshState {
  readonly tasks: Set<Promise<unknown>>;
  readonly openDocumentEffectiveValues: Map<string, { readonly text: string | undefined }>;
  readonly pendingAnalysisChangedSourceUris: Map<string, string>;
  lifecycleRegistered: boolean;
  pendingAnalysisRefresh: ReturnType<typeof setTimeout> | null;
  pendingAnalysisChangeKind: AnalysisChangedPayload["changeKind"] | null;
  shutdown: Promise<void> | null;
  readonly supportCounters: MutableLifecycleSupportCounters;
}

type MutableLifecycleSupportCounters = {
  -readonly [Key in keyof AureliaSupportLifecycleSnapshot["counters"]]: number;
};

const lifecycleRefreshStates = new WeakMap<ServerContext, LifecycleRefreshState>();

function sourceFileStructuralChangePaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    if (!isAnalyzedSourceDocumentUri(change.uri)) continue;
    const filePath = ctx.documentUris.workspaceHostPath(change.uri);
    if (filePath != null) filePaths.push(filePath);
  }
  return filePaths;
}

function closedAnalyzedSourceContentPaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    if (!isAnalyzedSourceDocumentUri(change.uri)) continue;
    // Open-document text is already authoritative through didChange. Replaying
    // the ensuing filesystem save would invalidate the same source generation
    // twice and enqueue a second all-document diagnostics wave.
    if (ctx.openWorkspaceDocument(change.uri) != null) continue;
    const filePath = ctx.documentUris.workspaceHostPath(change.uri);
    if (filePath == null || isProjectTopologyConfigurationPath(filePath)) continue;
    filePaths.push(filePath);
  }
  return filePaths;
}

function projectTopologyConfigurationChangePaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    const hostPath = ctx.documentUris.workspaceHostPath(change.uri);
    if (hostPath == null) continue;
    if (!isProjectTopologyConfigurationPath(hostPath)) continue;
    filePaths.push(hostPath);
  }
  return filePaths;
}

function projectConfigurationValueChangePaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    const hostPath = ctx.documentUris.workspaceHostPath(change.uri);
    if (hostPath == null || !isProjectTopologyConfigurationPath(hostPath)) continue;
    // Synchronized open text is already the project-input authority. Replaying
    // the filesystem save would invalidate the same exact value twice.
    if (ctx.openWorkspaceDocument(change.uri) != null) continue;
    filePaths.push(hostPath);
  }
  return filePaths;
}

function isProjectTopologyConfigurationPath(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  // Project shape reads dependency scope and workspace membership from package
  // and TypeScript manifests. Native Aurelia configuration contributes authored
  // membership directly, so every authority transition for these files is topology.
  return base === "package.json"
    || base === "jsconfig.json"
    || base === "tsconfig.json"
    || (base.startsWith("tsconfig.") && base.endsWith(".json"))
    || base === "aurelia.project.json";
}

function recordProjectTopologyChanged(
  ctx: ServerContext,
  reason: string,
  filePaths: readonly string[],
): void {
  const support = lifecycleRefreshState(ctx).supportCounters;
  support.topologyInvalidations += 1;
  support.topologyInvalidatedFileCount += filePaths.length;
  ctx.semanticRuntime.recordProjectTopologyChanged(filePaths);
  ctx.logger.info(`[workspace] semantic-runtime invalidated (${reason})`);
  scheduleAnalysisRefresh(ctx, reason, "topology");
}

function recordSourceTextChanged(
  ctx: ServerContext,
  reason: string,
  filePaths: readonly string[],
): void {
  const support = lifecycleRefreshState(ctx).supportCounters;
  support.sourceTextInvalidations += 1;
  support.sourceTextInvalidatedFileCount += filePaths.length;
  ctx.semanticRuntime.recordSourceTextChanged(filePaths);
  ctx.logger.log(`${reason}: semantic-runtime source generation advanced for ${filePaths.length} file(s)`);
  scheduleAnalysisRefresh(
    ctx,
    reason,
    "source-text",
    filePaths.map((filePath) => ctx.documentUris.uriForHostPath(filePath)),
  );
}

function recordProjectConfigurationChanged(
  ctx: ServerContext,
  reason: string,
  filePaths: readonly string[],
): void {
  const support = lifecycleRefreshState(ctx).supportCounters;
  support.configurationInvalidations += 1;
  support.configurationInvalidatedFileCount += filePaths.length;
  ctx.semanticRuntime.recordProjectConfigurationChanged(filePaths);
  ctx.logger.log(`${reason}: semantic-runtime configuration value advanced for ${filePaths.length} file(s)`);
  // Configuration remains topology-significant to host presentation (ownership/context may change), while the shared
  // source-world receipt—not the LSP ingress classifier—decides whether this exact value changed source membership.
  scheduleAnalysisRefresh(ctx, reason, "topology");
}

function scheduleAnalysisRefresh(
  ctx: ServerContext,
  reason: string,
  changeKind: AnalysisChangedPayload["changeKind"],
  changedSourceUris: readonly string[] = [],
): void {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) return;
  state.supportCounters.analysisRefreshSchedules += 1;
  if (changeKind === "source-text") {
    for (const uri of changedSourceUris) {
      state.pendingAnalysisChangedSourceUris.set(ctx.documentUris.key(uri), uri);
    }
  }
  state.pendingAnalysisChangeKind = dominantAnalysisChangeKind(
    state.pendingAnalysisChangeKind,
    changeKind,
  );
  if (state.pendingAnalysisRefresh != null) {
    state.supportCounters.analysisRefreshCoalesces += 1;
    clearTimeout(state.pendingAnalysisRefresh);
  }
  state.pendingAnalysisRefresh = setTimeout(() => {
    state.pendingAnalysisRefresh = null;
    const settledChangeKind = state.pendingAnalysisChangeKind ?? changeKind;
    const settledChangedSourceUris = [...state.pendingAnalysisChangedSourceUris.values()]
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    state.pendingAnalysisChangeKind = null;
    state.pendingAnalysisChangedSourceUris.clear();
    state.supportCounters.analysisWavesStarted += 1;
    ctx.logger.log(`[workspace] processing settled analysis (${reason})`);
    runLifecycleTask(ctx, "workspace analysis refresh", () =>
      notifyAnalysisChanged(ctx, settledChangeKind, settledChangedSourceUris));
  }, ANALYSIS_REFRESH_DEBOUNCE_MS);
}

/**
 * Converge every client-owned semantic view when an ordinary request is the
 * first observer of source-world movement outside the synchronized event set.
 *
 * Request-generation staleness is already owned by an editor/watcher event and
 * must not create a duplicate wave. Managed source-world and answer-proof
 * currentness failures are different: without this handoff the individual
 * request fails safely, but no AnalysisChanged notification tells the other
 * providers and custom host caches to re-prove their state.
 */
export function scheduleAnalysisRefreshForRequestCurrentness(
  ctx: ServerContext,
  error: unknown,
): boolean {
  if (!lifecycleRefreshState(ctx).lifecycleRegistered) return false;
  const managedStale = managedOperationStaleCause(error);
  const analysisCurrentness = isSemanticRuntimeLspRequestAborted(error)
    && isSemanticRuntimeAnalysisCurrentnessError(error.cause);
  if (managedStale == null && !analysisCurrentness) return false;
  lifecycleRefreshState(ctx).supportCounters.requestCurrentnessRefreshes += 1;
  scheduleAnalysisRefresh(
    ctx,
    "request-discovered semantic currentness",
    managedStale?.currentnessKind === SemanticSourceWorldCurrentnessKind.FreshBootRequired
      ? "topology"
      : "source-text",
  );
  return true;
}

function dominantAnalysisChangeKind(
  current: AnalysisChangedPayload["changeKind"] | null,
  incoming: AnalysisChangedPayload["changeKind"],
): AnalysisChangedPayload["changeKind"] {
  return current === "topology" || incoming === "topology" ? "topology" : "source-text";
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  lifecycleRefreshState(ctx).supportCounters.initialize += 1;
  const rootUri = initializeRootUri(ctx, params);
  const options = initializeOptions(params.initializationOptions);
  try {
    ctx.configureWorkspace(
      rootUri,
      options.excludedWorkspaceRootUris,
      options.projectRootHintUris,
    );
  } catch (error) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      error instanceof Error ? error.message : String(error),
    );
  }
  ctx.clientSupportsCodeActionResolveEdit = params.capabilities.textDocument?.codeAction?.dataSupport === true
    && params.capabilities.textDocument.codeAction.resolveSupport?.properties.includes("edit") === true;
  ctx.projectConfigurationParserDiagnostics = options.projectConfigurationParserDiagnostics ?? "semantic-runtime";
  ctx.typeScriptProgramDiagnostics = options.typeScriptProgramDiagnostics ?? "semantic-runtime";
  ctx.clientSupport.configurationPull = params.capabilities.workspace?.configuration === true;
  ctx.clientSupport.configurationChangeRegistration =
    params.capabilities.workspace?.didChangeConfiguration?.dynamicRegistration === true;
  ctx.clientSupport.inlayHintRefresh = params.capabilities.workspace?.inlayHint?.refreshSupport === true;
  ctx.clientSupport.semanticTokensRefresh = params.capabilities.workspace?.semanticTokens?.refreshSupport === true;
  ctx.clientSupport.diagnosticRefresh = params.capabilities.workspace?.diagnostics?.refreshSupport === true;
  ctx.logger.info(`initialize: root=${rootUri}`);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["<", " ", ".", ":", "@", "$", "{"] },
      hoverProvider: true,
      definitionProvider: { workDoneProgress: false },
      documentHighlightProvider: true,
      referencesProvider: true,
      renameProvider: { prepareProvider: true },
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix],
        resolveProvider: true,
      },
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      selectionRangeProvider: true,
      linkedEditingRangeProvider: true,
      foldingRangeProvider: true,
      inlayHintProvider: true,
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        full: true,
      },
      diagnosticProvider: {
        identifier: "aurelia",
        interFileDependencies: true,
        workspaceDiagnostics: false,
      },
    },
  };
}

function initializeOptions(value: unknown): AureliaInitializeOptions {
  if (value == null) {
    return {
      excludedWorkspaceRootUris: [],
      projectRootHintUris: [],
      projectConfigurationParserDiagnostics: "semantic-runtime",
      typeScriptProgramDiagnostics: "semantic-runtime",
    };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ResponseError(ErrorCodes.InvalidParams, "Aurelia initialization options must be an object.");
  }
  const options = value as Record<string, unknown>;
  return {
    excludedWorkspaceRootUris: initializeUriArrayOption(options, "excludedWorkspaceRootUris"),
    projectRootHintUris: initializeUriArrayOption(options, "projectRootHintUris"),
    projectConfigurationParserDiagnostics: initializeProjectConfigurationParserDiagnosticsOption(options),
    typeScriptProgramDiagnostics: initializeTypeScriptProgramDiagnosticsOption(options),
  };
}

function initializeTypeScriptProgramDiagnosticsOption(
  options: Readonly<Record<string, unknown>>,
): NonNullable<AureliaInitializeOptions["typeScriptProgramDiagnostics"]> {
  const value = options["typeScriptProgramDiagnostics"];
  if (value == null) return "semantic-runtime";
  if (value === "semantic-runtime" || value === "client") return value;
  throw new ResponseError(
    ErrorCodes.InvalidParams,
    "Aurelia typeScriptProgramDiagnostics must be 'semantic-runtime' or 'client'.",
  );
}

function initializeProjectConfigurationParserDiagnosticsOption(
  options: Readonly<Record<string, unknown>>,
): NonNullable<AureliaInitializeOptions["projectConfigurationParserDiagnostics"]> {
  const value = options["projectConfigurationParserDiagnostics"];
  if (value == null) return "semantic-runtime";
  if (value === "semantic-runtime" || value === "client") return value;
  throw new ResponseError(
    ErrorCodes.InvalidParams,
    "Aurelia projectConfigurationParserDiagnostics must be 'semantic-runtime' or 'client'.",
  );
}

function initializeUriArrayOption(
  options: Readonly<Record<string, unknown>>,
  key: "excludedWorkspaceRootUris" | "projectRootHintUris",
): readonly string[] {
  const value = options[key];
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === "string")) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      `Aurelia ${key} must be an array of document URI strings.`,
    );
  }
  return value;
}

function initializeRootUri(ctx: ServerContext, params: InitializeParams): string {
  const rootUri = params.rootUri
    ?? params.workspaceFolders?.[0]?.uri
    ?? (params.rootPath == null ? null : ctx.documentUris.uriForHostPath(params.rootPath));
  if (rootUri == null) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      "Aurelia language server requires a filesystem-backed workspace root.",
    );
  }
  return rootUri;
}

function tracksSynchronizedDocumentValue(uri: string, filePath: string): boolean {
  return isProjectTopologyConfigurationPath(filePath) || isAnalyzedSourceDocumentUri(uri);
}

function editorComparableWorkspaceHostText(
  ctx: ServerContext,
  filePath: string,
): string | undefined {
  const text = ctx.readWorkspaceHostFile(filePath);
  // VS Code consumes the UTF-8 BOM as file encoding metadata and omits it from
  // TextDocument.getText(). Normalize only the host side: a BOM authored in the
  // editor buffer remains a real text change instead of being erased here.
  return text?.startsWith("\uFEFF") === true ? text.slice(1) : text;
}

function rememberOpenDocumentHostValue(
  ctx: ServerContext,
  uri: string,
  filePath: string,
): void {
  lifecycleRefreshState(ctx).openDocumentEffectiveValues.set(
    ctx.documentUris.key(uri),
    { text: editorComparableWorkspaceHostText(ctx, filePath) },
  );
}

function synchronizedDocumentValueChanged(
  ctx: ServerContext,
  uri: string,
  filePath: string,
  text: string,
): boolean {
  const state = lifecycleRefreshState(ctx);
  const key = ctx.documentUris.key(uri);
  const previous = state.openDocumentEffectiveValues.get(key)
    ?? { text: editorComparableWorkspaceHostText(ctx, filePath) };
  state.openDocumentEffectiveValues.set(key, { text });
  return previous.text !== text;
}

function closedDocumentValueChanged(
  ctx: ServerContext,
  uri: string,
  filePath: string,
  synchronizedText: string,
): boolean {
  const state = lifecycleRefreshState(ctx);
  const key = ctx.documentUris.key(uri);
  const previous = state.openDocumentEffectiveValues.get(key)?.text ?? synchronizedText;
  state.openDocumentEffectiveValues.delete(key);
  return previous !== editorComparableWorkspaceHostText(ctx, filePath);
}

/**
 * Registers all lifecycle handlers on the connection and documents.
 */
export function registerLifecycleHandlers(ctx: ServerContext): void {
  lifecycleRefreshState(ctx).lifecycleRegistered = true;
  ctx.connection.onInitialize((params) => handleInitialize(ctx, params));
  ctx.connection.onShutdown(() => shutdownLifecycle(ctx));

  ctx.connection.onInitialized(() => {
    runLifecycleTask(ctx, "configuration registration", () => registerInlayHintConfigurationChanges(ctx));
  });

  ctx.documents.onDidOpen((e) => {
    lifecycleRefreshState(ctx).supportCounters.documentOpen += 1;
    const filePath = ctx.documentUris.workspaceHostPath(e.document.uri);
    if (filePath == null || !tracksSynchronizedDocumentValue(e.document.uri, filePath)) return;
    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    rememberOpenDocumentHostValue(ctx, e.document.uri, filePath);
    ctx.logger.log(`didOpen ${e.document.uri}`);
  });

  ctx.connection.onDidChangeConfiguration(() => {
    if (!ctx.clientSupport.inlayHintRefresh) return;
    requestClientRefresh(ctx, "inlay hints", () =>
      ctx.connection.languages.inlayHint.refresh());
  });

  ctx.connection.onDidChangeWatchedFiles((e: DidChangeWatchedFilesParams) => {
    if (!e.changes?.length) return;
    lifecycleRefreshState(ctx).supportCounters.watchedFileBatches += 1;
    const changes = e.changes.filter((change) => ctx.documentUris.workspaceHostPath(change.uri) != null);
    if (changes.length === 0) return;

    const structuralPaths = [...new Set([
      ...projectTopologyConfigurationChangePaths(ctx, changes),
      // Source create/delete is deliberately a broad structural event. Semantic-runtime owns whether the refreshed
      // source world admits it; coarse watcher eligibility never grants authored ownership by itself.
      ...sourceFileStructuralChangePaths(ctx, changes),
    ])];
    if (structuralPaths.length > 0) {
      ctx.logger.log("didChangeWatchedFiles: structural workspace input changed, reloading project");
      recordProjectTopologyChanged(ctx, "watched files", structuralPaths);
      return;
    }

    const configurationFilePaths = projectConfigurationValueChangePaths(ctx, changes);
    if (configurationFilePaths.length > 0) {
      ctx.logger.log("didChangeWatchedFiles: project configuration value changed");
      recordProjectConfigurationChanged(ctx, "watched files", configurationFilePaths);
    }

    const changedFilePaths = closedAnalyzedSourceContentPaths(ctx, changes);
    if (changedFilePaths.length > 0) {
      ctx.logger.log("didChangeWatchedFiles: analyzed source content changed");
      recordSourceTextChanged(ctx, "watched files", changedFilePaths);
    }
  });

  ctx.documents.onDidChangeContent((e) => {
    lifecycleRefreshState(ctx).supportCounters.documentSynchronizations += 1;
    const uri = e.document.uri;
    const filePath = ctx.documentUris.workspaceHostPath(uri);
    if (filePath == null) return;
    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    // TextDocuments emits this event for both didOpen and didChange. It is the
    // single point where the synchronized client text becomes authoritative.
    ctx.logger.log(`document text synchronized ${uri}@${e.document.version}`);
    if (!tracksSynchronizedDocumentValue(uri, filePath)) return;
    if (!synchronizedDocumentValueChanged(ctx, uri, filePath, e.document.getText())) {
      ctx.logger.log(`document text synchronization retained host value ${uri}`);
      return;
    }
    if (isProjectTopologyConfigurationPath(filePath)) {
      recordProjectConfigurationChanged(ctx, "project configuration text synchronization", [filePath]);
      return;
    }
    recordSourceTextChanged(ctx, "document text synchronization", [filePath]);
  });

  ctx.documents.onDidClose((e) => {
    lifecycleRefreshState(ctx).supportCounters.documentClose += 1;
    const uri = e.document.uri;
    const filePath = ctx.documentUris.workspaceHostPath(uri);
    if (filePath == null) return;
    ctx.logger.log(`didClose ${uri}`);

    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    // Closing returns source-text authority to the workspace host. Diagnostic
    // pull owns editor collection cleanup; invalidate only when that authority
    // transfer actually changes the effective file value.
    if (!tracksSynchronizedDocumentValue(uri, filePath)) return;
    if (!closedDocumentValueChanged(ctx, uri, filePath, e.document.getText())) {
      ctx.logger.log(`document close retained host value ${uri}`);
      return;
    }
    if (isProjectTopologyConfigurationPath(filePath)) {
      recordProjectConfigurationChanged(ctx, "project configuration close", [filePath]);
      return;
    }
    recordSourceTextChanged(ctx, "document close", [filePath]);
  });
}

async function registerInlayHintConfigurationChanges(ctx: ServerContext): Promise<void> {
  if (!ctx.clientSupport.configurationChangeRegistration) return;
  // vscode-languageclient's configurationSection push is deprecated. Register only the
  // invalidation signal, then pull the effective value for each document URI on request.
  await ctx.connection.client.register(DidChangeConfigurationNotification.type, {
    section: "aurelia.inlayHints",
  });
}

async function notifyAnalysisChanged(
  ctx: ServerContext,
  changeKind: AnalysisChangedPayload["changeKind"],
  changedSourceUris: readonly string[],
): Promise<void> {
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  let generation: SemanticRuntimeLspGeneration;
  try {
    generation = await ctx.semanticRuntime.runRequest(
      null,
      (operation) => operation.generation,
    );
  } catch (error) {
    if (lifecycleRefreshState(ctx).shutdown != null) return;
    if (!isSettledAnalysisStale(error)) throw error;
    lifecycleRefreshState(ctx).supportCounters.analysisWaveStaleRetries += 1;
    // A pull can discover source-world movement which did not arrive through the
    // editor event stream. Retry from a new managed ingress instead of publishing
    // or logging a generation which failed egress currentness.
    scheduleAnalysisRefresh(
      ctx,
      "managed analysis currentness retry",
      retryAnalysisChangeKind(error, changeKind),
      changedSourceUris,
    );
    return;
  }
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  const analysisChanged: AnalysisChangedPayload = changeKind === "source-text"
    ? {
        fingerprint: generation.fingerprint,
        changeKind,
        changedSourceUris,
      }
    : {
        fingerprint: generation.fingerprint,
        changeKind,
      };
  await ctx.connection.sendNotification(AureliaProtocolNotification.AnalysisChanged, analysisChanged);
  lifecycleRefreshState(ctx).supportCounters.analysisWavesPublished += 1;
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  // This is the single post-change diagnostic scheduler. The client deliberately
  // disables pull-on-change: starting a speculative pull before this semantic
  // generation settles would race this refresh and repeat the same expensive
  // analysis. One source can invalidate diagnostics owned by any visible file,
  // so the standard workspace refresh remains project-wide.
  if (ctx.clientSupport.diagnosticRefresh) {
    lifecycleRefreshState(ctx).supportCounters.diagnosticRefreshRequests += 1;
    requestClientRefresh(ctx, "diagnostics", () =>
      ctx.connection.languages.diagnostics.refresh());
  }
  if (ctx.clientSupport.inlayHintRefresh) {
    lifecycleRefreshState(ctx).supportCounters.inlayHintRefreshRequests += 1;
    requestClientRefresh(ctx, "inlay hints", () =>
      ctx.connection.languages.inlayHint.refresh());
  }
  if (ctx.clientSupport.semanticTokensRefresh) {
    lifecycleRefreshState(ctx).supportCounters.semanticTokenRefreshRequests += 1;
    requestClientRefresh(ctx, "semantic tokens", () =>
      ctx.connection.languages.semanticTokens.refresh());
  }
}

function isSettledAnalysisStale(error: unknown): boolean {
  return error instanceof ManagedSemanticWorkspaceOperationStaleError
    || (isSemanticRuntimeLspRequestAborted(error) && error.reason === "stale");
}

function retryAnalysisChangeKind(
  error: unknown,
  fallback: AnalysisChangedPayload["changeKind"],
): AnalysisChangedPayload["changeKind"] {
  const managedStale = managedOperationStaleCause(error);
  return managedStale?.currentnessKind === SemanticSourceWorldCurrentnessKind.FreshBootRequired
    ? "topology"
    : fallback;
}

function managedOperationStaleCause(
  error: unknown,
): ManagedSemanticWorkspaceOperationStaleError | null {
  if (error instanceof ManagedSemanticWorkspaceOperationStaleError) return error;
  if (isSemanticRuntimeLspRequestAborted(error)
      && error.cause instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return error.cause;
  }
  return null;
}

/**
 * LSP refresh methods are server-to-client requests despite their command-like API.
 * Their response only acknowledges client scheduling; it is not semantic work. Joining
 * that response to the shutdown drain deadlocks when a client waits for `shutdown`
 * while retiring the providers that would answer the refresh request.
 */
function requestClientRefresh(
  ctx: ServerContext,
  label: string,
  request: () => Promise<void>,
): void {
  void Promise.resolve().then(request).catch((error: unknown) => {
    if (lifecycleRefreshState(ctx).shutdown != null) return;
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    ctx.logger.warn(`[workspace] ${label} refresh request failed: ${message}`);
  });
}

export function shutdownLifecycle(ctx: ServerContext): Promise<void> {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) {
    return state.shutdown;
  }
  state.supportCounters.shutdown += 1;
  const shutdown = Promise.resolve().then(() => {
    if (state.pendingAnalysisRefresh != null) {
      clearTimeout(state.pendingAnalysisRefresh);
      state.pendingAnalysisRefresh = null;
    }
    state.pendingAnalysisChangeKind = null;
    state.pendingAnalysisChangedSourceUris.clear();
    state.openDocumentEffectiveValues.clear();
    ctx.semanticRuntime.invalidateRequests();

    // LSP shutdown retires this dedicated server process. Waiting for obsolete
    // requests here deadlocks with clients that wait for the shutdown response
    // before cancelling providers and their in-flight requests. Revoke guards,
    // answer shutdown, and retain task settlement only as deferred cleanup for
    // hosts that do not immediately follow with the standard `exit` notification.
    const tasks = [...state.tasks];
    void Promise.allSettled(tasks)
      .then(() => ctx.semanticRuntime.dispose())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        ctx.logger.error(`semantic session retirement failed: ${message}`);
      });
  });
  state.shutdown = shutdown;
  return shutdown;
}

function runLifecycleTask(
  ctx: ServerContext,
  label: string,
  operation: () => Promise<void>,
): void {
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  void runServerOperation(ctx, operation).then(
    () => undefined,
    (error: unknown) => {
      lifecycleRefreshState(ctx).supportCounters.backgroundTaskFailures += 1;
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      ctx.logger.error(`${label} failed: ${message}`);
    },
  );
}

/** Own one foreground or background operation until it settles so shutdown can drain it. */
export async function runServerOperation<T>(
  ctx: ServerContext,
  operation: () => T | Promise<T>,
): Promise<T> {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) {
    throw new Error("Aurelia language server is shutting down.");
  }
  const task = Promise.resolve().then(operation);
  state.tasks.add(task);
  try {
    return await task;
  } finally {
    state.tasks.delete(task);
  }
}

function lifecycleRefreshState(ctx: ServerContext): LifecycleRefreshState {
  const existing = lifecycleRefreshStates.get(ctx);
  if (existing != null) {
    return existing;
  }
  const state: LifecycleRefreshState = {
    tasks: new Set(),
    openDocumentEffectiveValues: new Map(),
    pendingAnalysisChangedSourceUris: new Map(),
    lifecycleRegistered: false,
    pendingAnalysisRefresh: null,
    pendingAnalysisChangeKind: null,
    shutdown: null,
    supportCounters: createLifecycleSupportCounters(),
  };
  lifecycleRefreshStates.set(ctx, state);
  return state;
}

/** Detached count-only lifecycle view; no source values or identities cross this boundary. */
export function readLifecycleSupportSnapshot(ctx: ServerContext): AureliaSupportLifecycleSnapshot {
  const state = lifecycleRefreshState(ctx);
  return Object.freeze({
    registered: state.lifecycleRegistered,
    shuttingDown: state.shutdown != null,
    trackedTaskCount: state.tasks.size,
    trackedOpenDocumentCount: state.openDocumentEffectiveValues.size,
    pendingAnalysisRefresh: state.pendingAnalysisRefresh != null,
    pendingAnalysisChangeKind: state.pendingAnalysisChangeKind,
    pendingChangedSourceCount: state.pendingAnalysisChangedSourceUris.size,
    counters: Object.freeze({ ...state.supportCounters }),
  });
}

function createLifecycleSupportCounters(): MutableLifecycleSupportCounters {
  return {
    initialize: 0,
    shutdown: 0,
    documentOpen: 0,
    documentSynchronizations: 0,
    documentClose: 0,
    watchedFileBatches: 0,
    topologyInvalidations: 0,
    topologyInvalidatedFileCount: 0,
    sourceTextInvalidations: 0,
    sourceTextInvalidatedFileCount: 0,
    configurationInvalidations: 0,
    configurationInvalidatedFileCount: 0,
    requestCurrentnessRefreshes: 0,
    analysisRefreshSchedules: 0,
    analysisRefreshCoalesces: 0,
    analysisWavesStarted: 0,
    analysisWavesPublished: 0,
    analysisWaveStaleRetries: 0,
    backgroundTaskFailures: 0,
    diagnosticRefreshRequests: 0,
    inlayHintRefreshRequests: 0,
    semanticTokenRefreshRequests: 0,
  };
}
