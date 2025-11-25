import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  DiagnosticSeverity as LspDiagnosticSeverity,
  DiagnosticTag,
  type InitializeParams,
  type InitializeResult,
  type CompletionItem,
  type Hover,
  type Definition,
  type Location,
  type WorkspaceEdit,
  type ReferenceParams,
  type RenameParams,
  type TextDocumentPositionParams,
  type CodeAction,
  type CodeActionParams,
  type Position,
  type Diagnostic,
  type Range,
  type DidChangeWatchedFilesParams,
  type FileEvent,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import fs from "node:fs";
import {
  PRELUDE_TS,
  canonicalDocumentUri,
  deriveTemplatePaths,
  type DocumentSpan,
  type DocumentUri,
  type OverlayBuildArtifact,
  type SsrBuildArtifact,
  type TemplateLanguageDiagnostic,
  type TemplateLanguageDiagnostics,
  type TemplateLanguageService,
  type Location as TemplateLocation,
  type TextEdit as TemplateTextEdit,
  type TextRange as TemplateTextRange,
  type HoverInfo,
} from "@aurelia-ls/domain";
import { createPathUtils } from "./services/paths.js";
import { OverlayFs } from "./services/overlay-fs.js";
import { TsService } from "./services/ts-service.js";
import { TsServicesAdapter } from "./services/typescript-services.js";
import { AureliaProjectIndex } from "./services/project-index.js";
import { TemplateWorkspace } from "./services/template-workspace.js";
import { VmReflectionService } from "./services/vm-reflection.js";
import type { Logger } from "./services/types.js";

/* =============================================================================
 * Logging + LSP wiring
 * ========================================================================== */
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
let workspaceRoot: string | null = null;

const logger: Logger = {
  log: (m: string) => connection.console.log(`[aurelia-ls] ${m}`),
  info: (m: string) => connection.console.info(`[aurelia-ls] ${m}`),
  warn: (m: string) => connection.console.warn(`[aurelia-ls] ${m}`),
  error: (m: string) => connection.console.error(`[aurelia-ls] ${m}`),
};

/* =============================================================================
 * Core services
 * ========================================================================== */
const paths = createPathUtils();
const overlayFs = new OverlayFs(paths);
const tsService = new TsService(overlayFs, paths, logger);
const tsAdapter = new TsServicesAdapter(tsService, paths);
const vmReflection = new VmReflectionService(tsService, paths, logger);

let projectIndex: AureliaProjectIndex;
let workspace: TemplateWorkspace;

/* =============================================================================
 * Helpers
 * ========================================================================== */
function ensurePrelude() {
  const root = workspaceRoot ?? process.cwd();
  const preludePath = path.join(root, ".aurelia", "__prelude.d.ts");
  tsService.ensurePrelude(preludePath, PRELUDE_TS);
}

function workspaceProgramOptions() {
  const semantics = projectIndex.currentSemantics();
  const resourceGraph = projectIndex.currentResourceGraph();
  const options: {
    vm: VmReflectionService;
    isJs: boolean;
    semantics: typeof semantics;
    resourceGraph: typeof resourceGraph;
    resourceScope?: typeof resourceGraph.root | null;
  } = {
    vm: vmReflection,
    isJs: false,
    semantics,
    resourceGraph,
  };
  const resourceScope = semantics.defaultScope ?? resourceGraph.root ?? null;
  if (resourceScope !== null) options.resourceScope = resourceScope;
  return options;
}

function createWorkspaceFromIndex(): TemplateWorkspace {
  return new TemplateWorkspace({
    program: workspaceProgramOptions(),
    language: { typescript: tsAdapter },
    fingerprint: projectIndex.currentFingerprint(),
  });
}

function syncWorkspaceWithIndex(): void {
  projectIndex.refresh();
  const updated = workspace.reconfigure({
    program: workspaceProgramOptions(),
    language: { typescript: tsAdapter },
    fingerprint: projectIndex.currentFingerprint(),
  });
  if (updated) {
    logger.info(`[workspace] reconfigured fingerprint=${workspace.fingerprint}`);
  }
}

async function refreshAllOpenDocuments(reason: "open" | "change", options?: { skipSync?: boolean }): Promise<void> {
  const openDocs = documents.all();
  for (const doc of openDocs) {
    await refreshDocument(doc, reason, options);
  }
}

function shouldReloadForFileChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    const fsPath = URI.parse(change.uri).fsPath;
    const base = path.basename(fsPath).toLowerCase();
    if (base === "tsconfig.json") return true;
    if (base === "jsconfig.json") return true;
    if (base.startsWith("tsconfig.") && base.endsWith(".json")) return true;
  }
  return false;
}

async function reloadProjectConfiguration(reason: string): Promise<void> {
  if (!projectIndex || !workspace) return;
  const beforeVersion = tsService.getProjectVersion();

  tsService.configure({ workspaceRoot });
  syncWorkspaceWithIndex();

  const versionChanged = tsService.getProjectVersion() !== beforeVersion;
  const label = `${reason}; version=${tsService.getProjectVersion()} fingerprint=${workspace.fingerprint}`;

  if (versionChanged) {
    logger.info(`[workspace] tsconfig reload (${label})`);
  } else {
    logger.info(`[workspace] tsconfig reload (${label}) [no host change]`);
  }

  await refreshAllOpenDocuments("change", { skipSync: true });
}

function toLspUri(uri: DocumentUri): string {
  const canonical = canonicalDocumentUri(uri);
  return URI.file(canonical.path).toString();
}

function guessLanguage(uri: DocumentUri): string {
  if (uri.endsWith(".ts") || uri.endsWith(".js")) return "typescript";
  if (uri.endsWith(".json")) return "json";
  return "html";
}

function lookupText(uri: DocumentUri): string | null {
  const canonical = canonicalDocumentUri(uri);
  const snap = workspace.program.sources.get(canonical.uri);
  if (snap) return snap.text;
  const overlay = overlayFs.snapshot(paths.canonical(canonical.path));
  if (overlay) return overlay.text;
  try {
    return fs.readFileSync(canonical.path, "utf8");
  } catch {
    return null;
  }
}

function spanToRange(loc: DocumentSpan): Range | null {
  const text = lookupText(loc.uri);
  if (!text) return null;
  const doc = TextDocument.create(toLspUri(loc.uri), guessLanguage(loc.uri), 0, text);
  return { start: doc.positionAt(loc.span.start), end: doc.positionAt(loc.span.end) };
}

function toRange(range: TemplateTextRange): Range {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

function toLspSeverity(sev: TemplateLanguageDiagnostic["severity"]): LspDiagnosticSeverity {
  switch (sev) {
    case "warning":
      return LspDiagnosticSeverity.Warning;
    case "info":
      return LspDiagnosticSeverity.Information;
    default:
      return LspDiagnosticSeverity.Error;
  }
}

function toLspTags(tags: readonly string[] | undefined): DiagnosticTag[] | undefined {
  if (!tags?.length) return undefined;
  const mapped: DiagnosticTag[] = [];
  for (const tag of tags) {
    if (tag === "unnecessary") mapped.push(DiagnosticTag.Unnecessary);
    if (tag === "deprecated") mapped.push(DiagnosticTag.Deprecated);
  }
  return mapped.length ? mapped : undefined;
}

function mapDiagnostics(diags: TemplateLanguageDiagnostics): Diagnostic[] {
  const mapped: Diagnostic[] = [];
  for (const diag of diags.all) {
    const range = diag.location ? spanToRange(diag.location) : null;
    if (!range) continue;
    const tags = diag.tags ? toLspTags(diag.tags) : undefined;
    const related = diag.related
      ?.map((rel) => {
        if (!rel.location) return null;
        const relRange = spanToRange(rel.location);
        return relRange ? { message: rel.message, location: { uri: toLspUri(rel.location.uri), range: relRange } } : null;
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    const base: Diagnostic = {
      range,
      message: diag.message,
      severity: toLspSeverity(diag.severity),
      code: diag.code,
      source: diag.source,
    };

    if (related?.length) base.relatedInformation = related;
    if (tags) base.tags = tags;

    mapped.push(base);
  }
  return mapped;
}

function mapCompletions(items: ReturnType<TemplateLanguageService["getCompletions"]>): CompletionItem[] {
  return items.map((item) => {
    const completion: CompletionItem = { label: item.label };
    if (item.detail) completion.detail = item.detail;
    if (item.documentation) completion.documentation = item.documentation;
    if (item.sortText) completion.sortText = item.sortText;
    if (item.insertText) completion.insertText = item.insertText;
    if (item.range) {
      completion.textEdit = { range: toRange(item.range), newText: item.insertText ?? item.label };
    }
    return completion;
  });
}

function mapHover(hover: HoverInfo | null): Hover | null {
  if (!hover) return null;
  return {
    contents: { kind: "markdown", value: hover.contents },
    range: toRange(hover.range),
  };
}

function mapLocations(locs: readonly TemplateLocation[] | null | undefined): Location[] {
  return (locs ?? []).map((loc) => ({ uri: toLspUri(loc.uri), range: toRange(loc.range) }));
}

function mapWorkspaceEdit(edits: readonly TemplateTextEdit[]): WorkspaceEdit | null {
  if (!edits.length) return null;
  const changes: Record<string, { range: Range; newText: string }[]> = {};
  for (const edit of edits) {
    const uri = toLspUri(edit.uri);
    const lspEdit = { range: toRange(edit.range), newText: edit.newText };
    if (!changes[uri]) changes[uri] = [];
    changes[uri].push(lspEdit);
  }
  return { changes };
}

function overlayPathOptions(): { isJs: boolean; overlayBaseName?: string } {
  return workspace.program.options.overlayBaseName === undefined
    ? { isJs: workspace.program.options.isJs }
    : { isJs: workspace.program.options.isJs, overlayBaseName: workspace.program.options.overlayBaseName };
}

function ensureProgramDocument(uri: string): TextDocument | null {
  const live = documents.get(uri);
  if (live) {
    vmReflection.setActiveTemplate(canonicalDocumentUri(uri).path);
    workspace.change(live);
    return live;
  }
  const snap = workspace.ensureFromFile(uri);
  if (!snap) return null;
  vmReflection.setActiveTemplate(canonicalDocumentUri(uri).path);
  return TextDocument.create(uri, "html", snap.version, snap.text);
}

function materializeOverlay(uri: DocumentUri | string): OverlayBuildArtifact | null {
  const canonical = canonicalDocumentUri(uri);
  vmReflection.setActiveTemplate(canonical.path);
  if (!workspace.snapshot(canonical.uri)) {
    const doc = ensureProgramDocument(uri);
    if (!doc) return null;
  }
  const artifact = workspace.buildService.getOverlay(canonical.uri);
  tsService.upsertOverlay(artifact.overlay.path, artifact.overlay.text);
  return artifact;
}

function materializeSsr(uri: DocumentUri | string): SsrBuildArtifact | null {
  const canonical = canonicalDocumentUri(uri);
  vmReflection.setActiveTemplate(canonical.path);
  if (!workspace.snapshot(canonical.uri)) {
    const doc = ensureProgramDocument(uri);
    if (!doc) return null;
  }
  return workspace.buildService.getSsr(canonical.uri);
}

type MaybeUriParam = { uri?: string } | string | null;

function uriFromParam(params: MaybeUriParam): string | undefined {
  if (typeof params === "string") return params;
  if (params && typeof params === "object" && typeof params.uri === "string") return params.uri;
  return undefined;
}

async function refreshDocument(doc: TextDocument, reason: "open" | "change", options?: { skipSync?: boolean }) {
  try {
    if (!options?.skipSync) {
      syncWorkspaceWithIndex();
    }
    const canonical = canonicalDocumentUri(doc.uri);
    if (reason === "open") {
      workspace.open(doc);
    } else {
      workspace.change(doc);
    }
    const overlay = materializeOverlay(canonical.uri);

    const diagnostics = workspace.languageService.getDiagnostics(canonical.uri);
    const lspDiagnostics = mapDiagnostics(diagnostics);
    await connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiagnostics });

    const compilation = workspace.program.getCompilation(canonical.uri);
    await connection.sendNotification("aurelia/overlayReady", {
      uri: doc.uri,
      overlayPath: overlay?.overlay.path,
      calls: overlay?.calls.length ?? 0,
      overlayLen: overlay?.overlay.text.length ?? 0,
      diags: lspDiagnostics.length,
      meta: compilation.meta,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    logger.error(`refreshDocument failed: ${message}`);
    await connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
  }
}

/* =============================================================================
 * Custom requests (overlay/SSR preview + dump state)
 * ========================================================================== */
connection.onRequest("aurelia/getOverlay", (params: MaybeUriParam) => {
  const uri = uriFromParam(params);
  logger.log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);
  if (!uri) return null;
  syncWorkspaceWithIndex();
  const artifact = materializeOverlay(uri);
  return artifact
    ? { fingerprint: workspace.fingerprint, artifact }
    : null;
});

connection.onRequest("aurelia/getMapping", (params: MaybeUriParam) => {
  const uri = uriFromParam(params);
  if (!uri) return null;
  syncWorkspaceWithIndex();
  const canonical = canonicalDocumentUri(uri);
  const doc = ensureProgramDocument(uri);
  if (!doc) return null;
  const mapping = workspace.program.getMapping(canonical.uri);
  if (!mapping) return null;
  const derived = deriveTemplatePaths(canonical.uri, overlayPathOptions());
  return { overlayPath: derived.overlay.path, mapping };
});

connection.onRequest("aurelia/queryAtPosition", (params: { uri: string; position: Position }) => {
  const uri = params?.uri;
  if (!uri || !params.position) return null;
  syncWorkspaceWithIndex();
  const doc = ensureProgramDocument(uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(uri);
  const query = workspace.program.getQuery(canonical.uri);
  const offset = doc.offsetAt(params.position);
  return {
    expr: query.exprAt(offset),
    node: query.nodeAt(offset),
    controller: query.controllerAt(offset),
    bindables: query.nodeAt(offset) ? query.bindablesFor(query.nodeAt(offset)!) : null,
    mappingSize: workspace.program.getMapping(canonical.uri)?.entries.length ?? 0,
  };
});

connection.onRequest("aurelia/getSsr", (params: MaybeUriParam) => {
  const uri = uriFromParam(params);
  if (!uri) return null;
  syncWorkspaceWithIndex();
  const artifact = materializeSsr(uri);
  if (!artifact) return null;
  return {
    fingerprint: workspace.fingerprint,
    artifact,
  };
});

connection.onRequest("aurelia/dumpState", () => {
  const roots = tsService.getService().getProgram()?.getRootFileNames() ?? [];
  return {
    workspaceRoot,
    caseSensitive: paths.isCaseSensitive(),
    projectVersion: tsService.getProjectVersion(),
    overlayRoots: overlayFs.listScriptRoots(),
    overlays: overlayFs.listOverlays(),
    programRoots: roots,
    programCache: workspace.program.getCacheStats(),
  };
});

/* =============================================================================
 * LSP feature wiring (completions/hover/defs/refs/rename/code actions)
 * ========================================================================== */
connection.onCompletion((params): CompletionItem[] => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return [];
  const canonical = canonicalDocumentUri(doc.uri);
  const completions = workspace.languageService.getCompletions(canonical.uri, params.position);
  return mapCompletions(completions);
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapHover(workspace.languageService.getHover(canonical.uri, params.position));
});

connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapLocations(workspace.languageService.getDefinition(canonical.uri, params.position));
});

connection.onReferences((params: ReferenceParams): Location[] | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapLocations(workspace.languageService.getReferences(canonical.uri, params.position));
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  const edits = workspace.languageService.renameSymbol(canonical.uri, params.position, params.newName);
  return mapWorkspaceEdit(edits);
});

connection.onCodeAction((params: CodeActionParams): CodeAction[] | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  const actions = workspace.languageService.getCodeActions(canonical.uri, params.range);
  const mapped: CodeAction[] = [];
  for (const action of actions) {
    const edit = mapWorkspaceEdit(action.edits);
    if (!edit) continue;
    const mappedAction: CodeAction = { title: action.title, edit };
    if (action.kind) mappedAction.kind = action.kind;
    mapped.push(mappedAction);
  }
  return mapped.length ? mapped : null;
});

/* =============================================================================
 * LSP lifecycle
 * ========================================================================== */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  logger.info(`initialize: root=${workspaceRoot ?? "<cwd>"} caseSensitive=${paths.isCaseSensitive()}`);
  tsService.configure({ workspaceRoot });
  ensurePrelude();
  projectIndex = new AureliaProjectIndex({ ts: tsService, logger });
  projectIndex.refresh();
  workspace = createWorkspaceFromIndex();
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["<", " ", ".", ":", "@", "$", "{"] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: true,
      codeActionProvider: true,
    },
  };
});

documents.onDidOpen((e) => {
  logger.log(`didOpen ${e.document.uri}`);
  void refreshDocument(e.document, "open");
});

connection.onDidChangeConfiguration(() => {
  logger.log("didChangeConfiguration: reloading tsconfig and project index");
  void reloadProjectConfiguration("configuration change");
});

connection.onDidChangeWatchedFiles((e: DidChangeWatchedFilesParams) => {
  if (!e.changes?.length) return;
  if (!shouldReloadForFileChange(e.changes)) return;
  logger.log("didChangeWatchedFiles: tsconfig/jsconfig changed, reloading project");
  void reloadProjectConfiguration("watched files");
});

documents.onDidChangeContent((e) => {
  logger.log(`didChange ${e.document.uri}`);
  void refreshDocument(e.document, "change");
});

documents.onDidClose((e) => {
  logger.log(`didClose ${e.document.uri}`);
  const canonical = canonicalDocumentUri(e.document.uri);
  workspace.close(canonical.uri);
  const derived = deriveTemplatePaths(canonical.uri, overlayPathOptions());
  tsService.deleteOverlay(derived.overlay.path);
  void connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

documents.listen(connection);
connection.listen();
