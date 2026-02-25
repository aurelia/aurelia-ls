import fs from "node:fs";
import {
  DefaultTemplateBuildService,
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  InMemoryOverlaySpanIndex,
  InMemorySourceStore,
  buildResourceGraphFromSemantics,
  canonicalDocumentUri,
  debug,
  offsetAtPosition,
  rangeToSpan,
  spanToRange,
  stableHash,
  stableHashSemantics,
  type CompletionItem as TemplateCompletionItem,
  type DocumentSnapshot,
  type DocumentUri,
  type Location as TemplateLocation,
  type OverlayBuildArtifact,
  type OverlaySpanIndex,
  type SourceSpan,
  type SourceStore,
  type TemplateCodeAction,
  type TemplateCompilation,
  type TemplateLanguageService,
  type TemplateLanguageServiceOptions,
  type TemplateMappingArtifact,
  type TemplateProgram,
  type TemplateProgramOptions,
  type TemplateQueryFacade,
  type TextEdit as TemplateTextEdit,
  type TextRange,
  type ConfidenceLevel,
  type ReferentialIndex,
  InMemoryReferentialIndex,
  extractReferenceSites,
  resolveCursorEntity,
} from "@aurelia-ls/compiler";
import {
  asWorkspaceFingerprint,
  type RefactorEngine,
  type SemanticQuery,
  type SemanticWorkspace,
  type WorkspaceCodeAction,
  type WorkspaceCompletionItem,
  type WorkspaceDiagnostics,
  type WorkspaceEdit,
  type WorkspaceLocation,
  type WorkspaceRefactorResult,
  type WorkspacePrepareRenameRequest,
  type WorkspacePrepareRenameResult,
  type WorkspaceSnapshot,
  type WorkspaceTextEdit,
  type WorkspaceToken,
} from "./types.js";
import { collectTemplateHover, mergeHoverContents } from "./hover.js";

export type WorkspaceProgramOptions = Omit<TemplateProgramOptions, "sourceStore" | "provenance">;

export interface SemanticWorkspaceKernelOptions {
  readonly program: WorkspaceProgramOptions;
  readonly language?: TemplateLanguageServiceOptions;
  readonly sourceStore?: SourceStore;
  readonly provenance?: OverlaySpanIndex;
  readonly configHash?: string;
  readonly fingerprint?: string;
  readonly lookupText?: (uri: DocumentUri) => string | null;
}

const EMPTY_DIAGNOSTICS: WorkspaceDiagnostics = { bySurface: new Map(), suppressed: [] };
const EMPTY_ACTIONS: readonly WorkspaceCodeAction[] = [];
const EMPTY_TOKENS: readonly WorkspaceToken[] = [];
const EMPTY_LOCATIONS: readonly WorkspaceLocation[] = [];
const EMPTY_COMPLETIONS: readonly WorkspaceCompletionItem[] = [];

export class SemanticWorkspaceKernel implements SemanticWorkspace {
  readonly sources: SourceStore;
  readonly referentialIndex: ReferentialIndex;
  provenance: OverlaySpanIndex;
  program: TemplateProgram;
  buildService: DefaultTemplateBuildService;
  languageService: TemplateLanguageService;

  #programOptions: WorkspaceProgramOptions;
  #languageOptions: TemplateLanguageServiceOptions;
  #configHash: string;
  #workspaceFingerprint: string;
  #lookupText: ((uri: DocumentUri) => string | null) | undefined;
  #refactor: RefactorEngine;

  constructor(options: SemanticWorkspaceKernelOptions) {
    this.sources = options.sourceStore ?? new InMemorySourceStore();
    this.referentialIndex = new InMemoryReferentialIndex();
    this.provenance = options.provenance ?? new InMemoryOverlaySpanIndex();
    this.#programOptions = options.program;
    this.#languageOptions = options.language ?? {};
    this.#lookupText = options.lookupText;
    this.program = this.#createProgram(this.provenance, this.#programOptions);
    this.buildService = new DefaultTemplateBuildService(this.program);
    this.languageService = new DefaultTemplateLanguageService(this.program, {
      ...this.#languageOptions,
      buildService: this.#languageOptions.buildService ?? this.buildService,
    });
    this.#configHash = options.configHash ?? computeConfigHash(this.#programOptions);
    this.#workspaceFingerprint = options.fingerprint ?? this.program.optionsFingerprint;
    this.#refactor = new WorkspaceRefactorEngine(this);
  }

  get fingerprint(): string {
    return this.snapshot().meta.fingerprint;
  }

  open(uri: DocumentUri, text?: string, version?: number): void {
    if (text === undefined) {
      this.ensureFromFile(uri);
      return;
    }
    const canonical = canonicalDocumentUri(uri);
    this.program.upsertTemplate(canonical.uri, text, version);
  }

  update(uri: DocumentUri, text: string, version?: number): void {
    const canonical = canonicalDocumentUri(uri);
    this.program.upsertTemplate(canonical.uri, text, version);
  }

  close(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    this.program.closeTemplate(canonical.uri);
  }

  snapshot(): WorkspaceSnapshot {
    const project = this.#programOptions.query.snapshot();
    const catalog = project.catalog;
    const syntax = project.syntax;
    const resourceGraph = project.resourceGraph ?? buildResourceGraphFromSemantics(project.semantics);

    const docs = Array.from(this.sources.all())
      .map((doc) => ({
        uri: doc.uri,
        textHash: stableHash(doc.text),
      }))
      .sort((a, b) => a.uri.localeCompare(b.uri));

    const fingerprint = asWorkspaceFingerprint(
      stableHash({
        base: this.#workspaceFingerprint,
        configHash: this.#configHash,
        docs,
      }),
    );

    return {
      meta: {
        fingerprint,
        configHash: this.#configHash,
        docCount: docs.length,
      },
      semantics: project.semantics,
      catalog,
      syntax,
      resourceGraph,
      provenance: this.provenance,
    };
  }

  diagnostics(_uri: DocumentUri): WorkspaceDiagnostics {
    return EMPTY_DIAGNOSTICS;
  }

  query(uri: DocumentUri): SemanticQuery {
    const canonical = canonicalDocumentUri(uri);
    return {
      hover: (pos) => this.#hoverAt(canonical.uri, pos),
      definition: (pos) => this.#locationsAt(canonical.uri, pos, "definition"),
      references: (pos) => this.#locationsAt(canonical.uri, pos, "references"),
      completions: (pos) => this.#completionsAt(canonical.uri, pos),
      diagnostics: () => this.diagnostics(canonical.uri),
      semanticTokens: () => EMPTY_TOKENS,
    };
  }

  refactor(): RefactorEngine {
    return this.#refactor;
  }

  reconfigure(options: SemanticWorkspaceKernelOptions): boolean {
    const next = normalizeOptions(options, this.#languageOptions, this.#lookupText);
    const nextFingerprint = next.fingerprint ?? this.#workspaceFingerprint;
    const nextConfigHash = next.configHash ?? computeConfigHash(next.program);
    const languageChanged = next.language !== this.#languageOptions;
    const lookupChanged = next.lookupText !== this.#lookupText;

    if (this.program.updateOptions) {
      const result = this.program.updateOptions(next.program);
      const configHashChanged = nextConfigHash !== this.#configHash;
      const updated = result.changed
        || nextFingerprint !== this.#workspaceFingerprint
        || configHashChanged
        || languageChanged
        || lookupChanged;

      if (!updated) return false;

      // Config changes (overlayBaseName, etc.) affect compilation output but
      // aren't part of the semantic model. Force full invalidation when the
      // model didn't change but config did.
      if (configHashChanged && !result.changed) {
        this.program.invalidateAll();
      }

      this.#programOptions = next.program;
      this.#languageOptions = next.language;
      this.#lookupText = next.lookupText;
      this.buildService = new DefaultTemplateBuildService(this.program);
      this.languageService = new DefaultTemplateLanguageService(this.program, {
        ...this.#languageOptions,
        buildService: this.#languageOptions.buildService ?? this.buildService,
      });
      this.#configHash = nextConfigHash;
      this.#workspaceFingerprint = nextFingerprint;
      return true;
    }

    const preview = this.#createProgram(new InMemoryOverlaySpanIndex(), next.program);
    const previewFingerprint = next.fingerprint ?? preview.optionsFingerprint;

    if (preview.optionsFingerprint === this.program.optionsFingerprint && previewFingerprint === this.#workspaceFingerprint) {
      return false;
    }

    this.provenance = preview.provenance;
    this.program = preview;
    this.#programOptions = next.program;
    this.#languageOptions = next.language;
    this.#lookupText = next.lookupText;
    this.buildService = new DefaultTemplateBuildService(this.program);
    this.languageService = new DefaultTemplateLanguageService(this.program, {
      ...this.#languageOptions,
      buildService: this.#languageOptions.buildService ?? this.buildService,
    });
    this.#configHash = nextConfigHash;
    this.#workspaceFingerprint = previewFingerprint;
    return true;
  }

  ensureFromFile(uri: DocumentUri): DocumentSnapshot | null {
    const canonical = canonicalDocumentUri(uri);
    const existing = this.sources.get(canonical.uri);
    if (existing) return existing;
    try {
      const text = fs.readFileSync(canonical.path, "utf8");
      this.program.upsertTemplate(canonical.uri, text);
      return this.sources.get(canonical.uri);
    } catch {
      return null;
    }
  }

  getOverlay(uri: DocumentUri): OverlayBuildArtifact {
    const canonical = canonicalDocumentUri(uri);
    return this.buildService.getOverlay(canonical.uri);
  }

  getMapping(uri: DocumentUri): TemplateMappingArtifact | null {
    try {
      const canonical = canonicalDocumentUri(uri);
      return this.program.getMapping(canonical.uri);
    } catch {
      return null;
    }
  }

  getCompilation(uri: DocumentUri): TemplateCompilation | null {
    try {
      const canonical = canonicalDocumentUri(uri);
      const compilation = this.program.getCompilation(canonical.uri);
      if (compilation) {
        // Feed the referential index after each compilation.
        // extractReferenceSites walks the linked module and produces
        // reference sites for every resource reference in this template.
        const sites = extractReferenceSites(canonical.uri as any, compilation);
        this.referentialIndex.updateFromTemplate(canonical.uri as any, sites);
      }
      return compilation;
    } catch {
      return null;
    }
  }

  getQueryFacade(uri: DocumentUri): TemplateQueryFacade | null {
    try {
      const canonical = canonicalDocumentUri(uri);
      return this.program.getQuery(canonical.uri);
    } catch {
      return null;
    }
  }

  getCacheStats(target?: DocumentUri) {
    return this.program.getCacheStats(target);
  }

  lookupText(uri: DocumentUri): string | null {
    const canonical = canonicalDocumentUri(uri);
    const snap = this.sources.get(canonical.uri);
    if (snap) return snap.text;
    if (this.#lookupText) {
      const text = this.#lookupText(canonical.uri);
      if (text != null) return text;
    }
    try {
      return fs.readFileSync(canonical.path, "utf8");
    } catch {
      return null;
    }
  }

  #createProgram(provenance: OverlaySpanIndex, options: WorkspaceProgramOptions): TemplateProgram {
    return new DefaultTemplateProgram({
      ...options,
      sourceStore: this.sources,
      provenance,
    });
  }

  #hoverAt(uri: DocumentUri, pos: { line: number; character: number }) {
    try {
      const text = this.lookupText(uri);
      if (!text) return null;
      const offset = offsetAtPosition(text, pos);
      if (offset == null) return null;

      // CursorEntity is the sole authority for hover content.
      // Identity comes from positional provenance (expression labels,
      // resource names). Type display is NOT included in hover cards —
      // inferredByExpr types are for type checking, not display.
      // No overlay fallback anywhere in this path.
      let detail = null;
      let confidence: ConfidenceLevel = 'high';

      try {
        const compilation = this.getCompilation(uri) ?? this.program.getCompilation(uri);
        const query = this.program.query;

        // 1. Resolve CursorEntity — shared across all features
        const resolution = resolveCursorEntity({
          compilation,
          offset,
          syntax: query.syntax,
          semantics: query.model.semantics,
        });
        if (resolution) {
          confidence = resolution.compositeConfidence;
        }

        // 2. Build structured hover cards (resource metadata, expression labels)
        detail = collectTemplateHover({
          compilation,
          text,
          offset,
          syntax: query.syntax,
          semantics: query.model.semantics,
        });
      } catch (error) {
        debug.workspace("hover.collect.error", {
          message: error instanceof Error ? error.message : String(error),
        });
        detail = null;
      }

      let contents = mergeHoverContents(detail?.lines ?? []);
      if (!contents) return null;

      contents = applyConfidenceTier(contents, confidence);

      const wsConfidence = mapConfidenceToWorkspace(confidence);

      const span = detail?.span ?? null;
      if (!span) return { contents, ...(wsConfidence ? { confidence: wsConfidence } : {}) };

      const location: WorkspaceLocation = {
        uri,
        span,
        ...(detail?.exprId ? { exprId: detail.exprId } : {}),
        ...(detail?.nodeId ? { nodeId: detail.nodeId } : {}),
      };
      return { contents, location, ...(wsConfidence ? { confidence: wsConfidence } : {}) };
    } catch {
      return null;
    }
  }

  #locationsAt(uri: DocumentUri, pos: { line: number; character: number }, kind: "definition" | "references") {
    try {
      const locations = kind === "definition"
        ? this.languageService.getDefinition(uri, pos)
        : this.languageService.getReferences(uri, pos);
      return mapLocations(locations ?? [], this.lookupText.bind(this));
    } catch {
      return EMPTY_LOCATIONS;
    }
  }

  #completionsAt(uri: DocumentUri, pos: { line: number; character: number }) {
    try {
      const items = this.languageService.getCompletions(uri, pos);
      return mapCompletions(items ?? []);
    } catch {
      return EMPTY_COMPLETIONS;
    }
  }
}

export function createSemanticWorkspaceKernel(options: SemanticWorkspaceKernelOptions): SemanticWorkspaceKernel {
  return new SemanticWorkspaceKernel(options);
}

class WorkspaceRefactorEngine implements RefactorEngine {
  constructor(private readonly workspace: SemanticWorkspaceKernel) {}

  prepareRename(_request: WorkspacePrepareRenameRequest): WorkspacePrepareRenameResult {
    // The inner (TS-based) refactor engine does not support prepareRename.
    // PrepareRename is handled by the semantic workspace engine's proxy layer.
    return {
      error: {
        kind: "refactor-policy-denied",
        message: "Rename is not available at this position.",
        retryable: false,
      },
    };
  }

  rename(request: { uri: DocumentUri; position: { line: number; character: number }; newName: string }): WorkspaceRefactorResult {
    try {
      const canonical = canonicalDocumentUri(request.uri);
      const edits = this.workspace.languageService.renameSymbol(canonical.uri, request.position, request.newName);
      const mapped = mapTextEdits(edits, this.workspace.lookupText.bind(this.workspace));
      if (!mapped.length) {
        return {
          error: {
            kind: "pipeline-failure",
            message: "Rename produced no edits.",
            retryable: false,
          },
        };
      }
      return { edit: { edits: mapped } };
    } catch (e) {
      return {
        error: {
          kind: "pipeline-failure",
          message: e instanceof Error ? e.message : String(e),
          retryable: false,
        },
      };
    }
  }

  codeActions(request: { uri: DocumentUri; position?: { line: number; character: number }; range?: SourceSpan; kinds?: readonly string[] }): readonly WorkspaceCodeAction[] {
    try {
      const canonical = canonicalDocumentUri(request.uri);
      const text = this.workspace.lookupText(canonical.uri);
      if (!text) return EMPTY_ACTIONS;
      const range = request.range
        ? spanToRange(request.range, text)
        : request.position
          ? { start: request.position, end: request.position }
          : null;
      if (!range) return EMPTY_ACTIONS;

      const actions = this.workspace.languageService.getCodeActions(canonical.uri, range);
      return mapCodeActions(actions ?? [], this.workspace.lookupText.bind(this.workspace));
    } catch {
      return EMPTY_ACTIONS;
    }
  }
}

function normalizeOptions(
  options: SemanticWorkspaceKernelOptions,
  fallbackLanguage: TemplateLanguageServiceOptions,
  lookupText: ((uri: DocumentUri) => string | null) | undefined,
): { program: WorkspaceProgramOptions; language: TemplateLanguageServiceOptions; configHash?: string; fingerprint?: string; lookupText?: (uri: DocumentUri) => string | null } {
  return {
    program: options.program,
    language: options.language ?? fallbackLanguage,
    configHash: options.configHash,
    fingerprint: options.fingerprint,
    lookupText: options.lookupText ?? lookupText,
  };
}

function mapCompletions(items: readonly TemplateCompletionItem[]): WorkspaceCompletionItem[] {
  const mapped = items.map((item, index) => ({
    label: item.label,
    ...(item.kind ? { kind: item.kind } : {}),
    ...(item.detail ? { detail: item.detail } : {}),
    ...(item.documentation ? { documentation: item.documentation } : {}),
    ...(item.sortText ? { sortText: item.sortText } : {}),
    ...(item.confidence ? { confidence: item.confidence } : {}),
    ...(item.origin ? { origin: item.origin } : {}),
    ...(item.insertText ? { insertText: item.insertText } : {}),
    _index: index,
  }));
  mapped.sort((a, b) => {
    const confidenceDelta = completionConfidenceRank(a.confidence) - completionConfidenceRank(b.confidence);
    if (confidenceDelta !== 0) return confidenceDelta;
    const originDelta = completionOriginRank(a.origin) - completionOriginRank(b.origin);
    if (originDelta !== 0) return originDelta;
    const aKey = a.sortText ?? a.label;
    const bKey = b.sortText ?? b.label;
    const keyDelta = aKey.localeCompare(bKey);
    if (keyDelta !== 0) return keyDelta;
    const labelDelta = a.label.localeCompare(b.label);
    if (labelDelta !== 0) return labelDelta;
    return a._index - b._index;
  });
  return mapped.map(({ _index: _unused, ...item }) => item);
}

function completionConfidenceRank(
  confidence: WorkspaceCompletionItem["confidence"],
): number {
  switch (confidence) {
    case "exact":
      return 0;
    case "high":
      return 1;
    case "partial":
      return 2;
    case "low":
      return 3;
    default:
      return 1;
  }
}

function completionOriginRank(
  origin: WorkspaceCompletionItem["origin"],
): number {
  switch (origin) {
    case "source":
      return 0;
    case "config":
      return 1;
    case "builtin":
      return 2;
    case "unknown":
      return 3;
    default:
      return 2;
  }
}

function mapLocations(
  locs: readonly TemplateLocation[],
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceLocation[] {
  const results: WorkspaceLocation[] = [];
  for (const loc of locs) {
    const span = spanFromRange(loc.uri, loc.range, lookupText);
    if (!span) continue;
    results.push({ uri: loc.uri, span });
  }
  return results;
}

function mapTextEdits(
  edits: readonly TemplateTextEdit[],
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceEdit["edits"] {
  const results: WorkspaceTextEdit[] = [];
  for (const edit of edits) {
    const span = spanFromRange(edit.uri, edit.range, lookupText);
    if (!span) continue;
    results.push({ uri: edit.uri, span, newText: edit.newText });
  }
  return results;
}

function mapCodeActions(
  actions: readonly TemplateCodeAction[],
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceCodeAction[] {
  const results: WorkspaceCodeAction[] = [];
  for (const action of actions) {
    const edits = mapTextEdits(action.edits, lookupText);
    results.push({
      id: `workspace:${action.title}`,
      title: action.title,
      ...(action.kind ? { kind: action.kind } : {}),
      ...(edits.length ? { edit: { edits } } : {}),
    });
  }
  return results;
}

/**
 * Apply confidence-tiered rendering to hover content.
 *
 * Per hover spec epistemic contract:
 * - High: definitive, dense. No modification needed.
 * - Medium: hedged. Add gap indicator.
 * - Low: sparse, explicitly uncertain. Prepend uncertainty notice.
 * - None: minimal. Replace with "analysis could not determine" message.
 */
/** Map L2 ConfidenceLevel to workspace hover confidence. Returns undefined for high (the default). */
function mapConfidenceToWorkspace(level: ConfidenceLevel): "exact" | "high" | "partial" | "low" | undefined {
  switch (level) {
    case 'high': return undefined; // default, not set
    case 'medium': return 'partial';
    case 'low': return 'low';
    case 'none': return 'low';
  }
}

function applyConfidenceTier(contents: string, confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return contents;
    case 'medium':
      return contents + "\n\n---\n\n*Confidence: partial — some fields could not be fully resolved*";
    case 'low':
      return "⚠ *Analysis incomplete for this construct*\n\n---\n\n" + contents;
    case 'none':
      return "```\n(dynamic construct — analysis could not determine this)\n```\n\n---\n\n*This construct uses patterns that resist static analysis. Runtime behavior may differ.*";
  }
}

function spanFromRange(
  uri: DocumentUri,
  range: TextRange,
  lookupText: (uri: DocumentUri) => string | null,
): SourceSpan | null {
  const text = lookupText(uri);
  if (!text) return null;
  const canonical = canonicalDocumentUri(uri);
  return rangeToSpan(range, text, canonical.file);
}

function computeConfigHash(options: WorkspaceProgramOptions): string {
  const project = options.query.snapshot();
  return stableHash({
    project: {
      semantics: stableHashSemantics(project.semantics),
      catalog: stableHash(project.catalog),
      syntax: stableHash(project.syntax),
      resourceGraph: project.resourceGraph ? stableHash(project.resourceGraph) : null,
      defaultScope: project.defaultScope ?? null,
    },
    templateContext: options.templateContext ? "custom" : null,
    isJs: options.isJs,
    overlayBaseName: options.overlayBaseName ?? null,
  });
}
