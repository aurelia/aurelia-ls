import fs from "node:fs";
import {
  DefaultTemplateBuildService,
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  InMemoryProvenanceIndex,
  InMemorySourceStore,
  buildResourceGraphFromSemantics,
  buildTemplateSyntaxRegistry,
  canonicalDocumentUri,
  debug,
  offsetAtPosition,
  rangeToSpan,
  prepareSemantics,
  spanToRange,
  stableHash,
  stableHashSemantics,
  type CompletionItem as TemplateCompletionItem,
  type DocumentSnapshot,
  type DocumentUri,
  type Location as TemplateLocation,
  type OverlayBuildArtifact,
  type ProvenanceIndex,
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
  readonly provenance?: ProvenanceIndex;
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
  provenance: ProvenanceIndex;
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
    this.provenance = options.provenance ?? new InMemoryProvenanceIndex();
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
    const prepared = prepareSemantics(this.#programOptions.semantics, {
      catalog: this.#programOptions.catalog,
    });
    const catalog = this.#programOptions.catalog ?? prepared.catalog;
    const syntax = this.#programOptions.syntax ?? buildTemplateSyntaxRegistry(prepared);
    const resourceGraph = this.#programOptions.resourceGraph
      ?? this.#programOptions.semantics.resourceGraph
      ?? buildResourceGraphFromSemantics(prepared);

    const docs = Array.from(this.sources.all())
      .map((doc) => ({
        uri: doc.uri,
        version: doc.version,
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
      semantics: this.#programOptions.semantics,
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
      const updated = result.changed
        || nextFingerprint !== this.#workspaceFingerprint
        || nextConfigHash !== this.#configHash
        || languageChanged
        || lookupChanged;

      if (!updated) return false;

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

    const preview = this.#createProgram(new InMemoryProvenanceIndex(), next.program);
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
      return this.program.getCompilation(canonical.uri);
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

  #createProgram(provenance: ProvenanceIndex, options: WorkspaceProgramOptions): TemplateProgram {
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

      const base = this.languageService.getHover(uri, pos);
      let detail = null;
      try {
        const compilation = this.program.getCompilation(uri);
        const syntax = this.program.options.syntax
          ?? buildTemplateSyntaxRegistry(prepareSemantics(this.program.options.semantics, {
            ...(this.program.options.catalog ? { catalog: this.program.options.catalog } : {}),
          }));
        detail = collectTemplateHover({
          compilation,
          text,
          offset,
          syntax,
        });
      } catch (error) {
        debug.workspace("hover.collect.error", {
          message: error instanceof Error ? error.message : String(error),
        });
        detail = null;
      }

      const baseSpan = base ? spanFromRange(uri, base.range, this.lookupText.bind(this)) : null;
      const contents = mergeHoverContents(detail?.lines ?? [], base?.contents ?? null);
      if (!contents) return null;

      const span = detail?.span ?? baseSpan ?? null;
      if (!span) return { contents };

      const location: WorkspaceLocation = {
        uri,
        span,
        ...(detail?.exprId ? { exprId: detail.exprId } : {}),
        ...(detail?.nodeId ? { nodeId: detail.nodeId } : {}),
      };
      return { contents, location };
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
    ...(item.detail ? { detail: item.detail } : {}),
    ...(item.documentation ? { documentation: item.documentation } : {}),
    ...(item.sortText ? { sortText: item.sortText } : {}),
    ...(item.insertText ? { insertText: item.insertText } : {}),
    _index: index,
  }));
  mapped.sort((a, b) => {
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
  return stableHash({
    semantics: stableHashSemantics(options.semantics),
    catalog: options.catalog ? stableHash(options.catalog) : null,
    syntax: options.syntax ? stableHash(options.syntax) : null,
    resourceGraph: options.resourceGraph ? stableHash(options.resourceGraph) : null,
    resourceScope: options.resourceScope ?? null,
    isJs: options.isJs,
    overlayBaseName: options.overlayBaseName ?? null,
  });
}
