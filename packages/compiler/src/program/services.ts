// Model imports (via barrel)
import type { NormalizedPath, SourceFileId, SourceSpan, Position, TextRange, Origin } from "../model/index.js";
import {
  offsetAtPosition,
  resolveSourceSpan,
  spanToRange,
} from "../model/index.js";

// Shared imports (via barrel)
import { diagnosticSpan, type CompilerDiagnostic, type DiagnosticSeverity } from "../shared/index.js";

// Pipeline imports (via barrel)
import { stableHash } from "../pipeline/index.js";

// Synthesis imports (via barrel)
import type { TemplateQueryFacade, TemplateMappingArtifact } from "../synthesis/index.js";

// Compiler facade
import type { TemplateCompilation } from "../facade.js";

// Analysis imports (for binding contract validation)
import { checkTypeCompatibility } from "../analysis/index.js";

// Program layer imports
import type { CompletionItem } from "./completion-contracts.js";
import type { DocumentSnapshot, DocumentUri, TemplateExprId } from "./primitives.js";
import { canonicalDocumentUri, deriveTemplatePaths, type CanonicalDocumentUri } from "./paths.js";
import { collectTemplateCompletionsForProgram } from "./completions.js";
import {
  projectGeneratedLocationToDocumentSpanWithOffsetFallback,
  projectGeneratedSpanToDocumentSpanWithOffsetFallback,
  overlayHitToDocumentSpan,
  resolveGeneratedLocationSpan,
  resolveTemplateUriForGenerated,
  type DocumentSpan,
  type OverlaySpanHit,
  type OverlaySpanIndex,
  type TemplateSpanHit,
} from "./overlay-span-index.js";
import type { TemplateProgram } from "./program.js";
import {
  DEFAULT_PROVENANCE_PROJECTION_POLICY,
  projectTemplateOffsetToOverlayWithPolicy,
  projectTemplateSpanToOverlayWithPolicy,
  resolveGeneratedReferenceLocationWithPolicy,
  resolveOverlayDiagnosticLocationWithPolicy,
  resolveRelatedDiagnosticLocationWithPolicy,
  shouldRejectOverlayEditBatch,
} from "./overlay-span-policy.js";

export type { DocumentSpan } from "./overlay-span-index.js";
export type { Position, TextRange } from "../model/index.js";
export type { CompletionConfidence, CompletionItem, CompletionOrigin } from "./completion-contracts.js";

const PROVENANCE_POLICY = DEFAULT_PROVENANCE_PROJECTION_POLICY;

export interface TextEdit {
  uri: DocumentUri;
  range: TextRange;
  newText: string;
}

export interface TemplateCodeAction {
  title: string;
  edits: readonly TextEdit[];
  kind?: string;
  source: "template" | "typescript";
}

export interface Location {
  uri: DocumentUri;
  range: TextRange;
}

export interface CompileCallSite {
  exprId: TemplateExprId;
  overlayStart: number;
  overlayEnd: number;
  htmlSpan: SourceSpan;
}

export interface BuildDocument {
  uri: DocumentUri;
  path: NormalizedPath;
  file: SourceFileId;
}

export interface BuildSnapshot extends BuildDocument {
  version: number;
  contentHash: string;
}

export interface OverlayBuildArtifact {
  template: BuildSnapshot;
  overlay: BuildSnapshot & {
    baseName: string;
    text: string;
  };
  mapping: TemplateMappingArtifact;
  calls: readonly CompileCallSite[];
}

export interface DiagnosticRelatedInfo {
  message: string;
  location: DocumentSpan | null;
}

export type LanguageDiagnosticStage = CompilerDiagnostic["stage"] | "typescript";

export interface TemplateLanguageDiagnostic {
  code: string | number;
  message: string;
  stage: LanguageDiagnosticStage;
  severity?: DiagnosticSeverity;
  location: DocumentSpan | null;
  related?: readonly DiagnosticRelatedInfo[];
  tags?: readonly string[];
  data?: Readonly<Record<string, unknown>>;
  origin?: Origin | null;
}

export interface TemplateLanguageDiagnostics {
  all: readonly TemplateLanguageDiagnostic[];
  compiler: readonly TemplateLanguageDiagnostic[];
  typescript: readonly TemplateLanguageDiagnostic[];
}

export type TsDiagnosticCategory = "error" | "warning" | "suggestion" | "message" | number | undefined;

export interface TsMessageChain {
  messageText: string;
  next?: readonly TsMessageChain[];
}

export interface TsDiagnosticRelated {
  messageText: string | TsMessageChain;
  start?: number;
  length?: number;
  fileName?: string;
}

export interface TsDiagnostic {
  messageText: string | TsMessageChain;
  code?: string | number;
  category?: TsDiagnosticCategory;
  start?: number;
  length?: number;
  fileName?: string;
  relatedInformation?: readonly TsDiagnosticRelated[];
  tags?: readonly string[];
}

export interface TsQuickInfo {
  text: string;
  documentation?: string;
  start?: number;
  length?: number;
}

export interface TsLocation {
  fileName: string;
  range: TextRange;
  start?: number;
  length?: number;
}

export interface TsCompletionEntry {
  name: string;
  kind?: string;
  sortText?: string;
  insertText?: string;
  replacementSpan?: { start: number; length: number };
  detail?: string;
  documentation?: string;
}

export interface TsTextEdit {
  fileName: string;
  range: TextRange;
  newText: string;
  start?: number;
  length?: number;
}

export interface TsCodeAction {
  title: string;
  edits: readonly TsTextEdit[];
}

export interface OverlayDocumentSnapshot {
  uri: DocumentUri;
  file: SourceFileId;
  text: string;
  templateUri: DocumentUri;
}

export interface TypeScriptServices {
  getDiagnostics(overlay: OverlayDocumentSnapshot): readonly TsDiagnostic[];
  syncOverlay?(overlay: OverlayDocumentSnapshot): void;
  getQuickInfo?(overlay: OverlayDocumentSnapshot, offset: number): TsQuickInfo | null;
  getDefinition?(overlay: OverlayDocumentSnapshot, offset: number): readonly TsLocation[] | null;
  getReferences?(overlay: OverlayDocumentSnapshot, offset: number): readonly TsLocation[] | null;
  getCompletions?(overlay: OverlayDocumentSnapshot, offset: number): readonly TsCompletionEntry[] | null;
  getRenameEdits?(overlay: OverlayDocumentSnapshot, offset: number, newName: string): readonly TsTextEdit[] | null;
  getCodeActions?(overlay: OverlayDocumentSnapshot, start: number, end: number): readonly TsCodeAction[] | null;
}

export interface TemplateLanguageServiceOptions {
  typescript?: TypeScriptServices;
  buildService?: TemplateBuildService;
}

type TypeNameMap = ReadonlyMap<string, string>;

export interface TemplateLanguageService {
  getDiagnostics(uri: DocumentUri): TemplateLanguageDiagnostics;
  getCompletions(uri: DocumentUri, position: Position): CompletionItem[];
  getDefinition(uri: DocumentUri, position: Position): Location[];
  getReferences(uri: DocumentUri, position: Position): Location[];
  getCodeActions(uri: DocumentUri, range: TextRange): TemplateCodeAction[];
  renameSymbol(uri: DocumentUri, position: Position, newName: string): TextEdit[];
}

export interface TemplateBuildService {
  getOverlay(uri: DocumentUri): OverlayBuildArtifact;
}

export class DefaultTemplateBuildService implements TemplateBuildService {
  constructor(private readonly program: TemplateProgram) {}

  getOverlay(uri: DocumentUri): OverlayBuildArtifact {
    const canonical = canonicalDocumentUri(uri);
    const paths = deriveTemplatePaths(canonical.uri, overlayOptions(this.program));
    const template = this.requireSnapshot(canonical);
    const overlayProduct = this.program.getOverlay(canonical.uri);
    const overlayContentHash = stableHash(overlayProduct.text);
    const mapping = overlayProduct.mapping ?? this.program.getMapping(canonical.uri);
    if (!mapping) {
      throw new Error(`TemplateBuildService: missing mapping for ${String(canonical.uri)}; call TemplateProgram.getOverlay first.`);
    }

    const overlayDoc: BuildDocument = {
      uri: paths.overlay.uri,
      path: paths.overlay.path,
      file: paths.overlay.file,
    };

    return {
      template: buildSnapshot(canonical, template.version, stableHash(template.text)),
      overlay: {
        ...buildSnapshot(overlayDoc, template.version, overlayContentHash),
        baseName: paths.overlay.baseName,
        text: overlayProduct.text,
      },
      mapping,
      calls: overlayProduct.calls,
    };
  }

  private requireSnapshot(canonical: CanonicalDocumentUri): DocumentSnapshot {
    const snap = this.program.sources.get(canonical.uri);
    if (!snap) {
      throw new Error(`TemplateBuildService: no snapshot for ${String(canonical.uri)}. Call upsertTemplate(...) first.`);
    }
    return snap;
  }
}

export class DefaultTemplateLanguageService implements TemplateLanguageService, TemplateBuildService {
  private readonly build: TemplateBuildService;

  constructor(
    private readonly program: TemplateProgram,
    private readonly options: TemplateLanguageServiceOptions = {},
  ) {
    this.build = options.buildService ?? new DefaultTemplateBuildService(program);
  }

  getDiagnostics(uri: DocumentUri): TemplateLanguageDiagnostics {
    const canonical = canonicalDocumentUri(uri);
    const vmDisplayName = getVmDisplayName(this.program.options.vm);
    const typeNames = this.typeNamesFor(canonical);
    const overlayDoc = this.overlaySnapshot(canonical.uri);
    const pipelineDiags = this.program
      .getDiagnostics(canonical.uri)
      .all
      .map((diag) =>
        mapCompilerDiagnostic(diag, canonical.uri, canonical.file),
      )
      .filter((diag): diag is TemplateLanguageDiagnostic => diag != null);

    const binding = this.collectBindingDiagnostics(canonical, overlayDoc, vmDisplayName, typeNames);
    const compiler = [...pipelineDiags, ...binding];
    const typescript = this.collectTypeScriptDiagnostics(canonical.uri, overlayDoc, vmDisplayName, typeNames);
    const all = [...compiler, ...typescript];

    return { all, compiler, typescript };
  }

  getOverlay(uri: DocumentUri): OverlayBuildArtifact {
    return this.build.getOverlay(uri);
  }

  getCompletions(uri: DocumentUri, position: Position): CompletionItem[] {
    const canonical = canonicalDocumentUri(uri);
    const snapshot = this.requireSnapshot(canonical);
    const offset = offsetAtPosition(snapshot.text, position);
    if (offset == null) return [];

    const query = this.program.getQuery(canonical.uri);
    const template = this.collectTemplateCompletions(query, snapshot, offset);
    const typescript = this.collectTypeScriptCompletions(canonical, snapshot, offset);
    return dedupeCompletions([...template, ...typescript]);
  }

  getDefinition(uri: DocumentUri, position: Position): Location[] {
    const canonical = canonicalDocumentUri(uri);
    const snapshot = this.requireSnapshot(canonical);
    const offset = offsetAtPosition(snapshot.text, position);
    if (offset == null) return [];

    const ts = this.options.typescript;
    if (!ts?.getDefinition) return [];

    const overlayHit = this.projectTemplateOffsetToOverlay(canonical, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = overlayHit.edge.from.span.start;
    const results = ts.getDefinition(overlay, overlayOffset) ?? [];
    return this.mapTypeScriptLocations(results, overlay);
  }

  getReferences(uri: DocumentUri, position: Position): Location[] {
    const canonical = canonicalDocumentUri(uri);
    const snapshot = this.requireSnapshot(canonical);
    const offset = offsetAtPosition(snapshot.text, position);
    if (offset == null) return [];

    const ts = this.options.typescript;
    if (!ts?.getReferences) return [];

    const overlayHit = this.projectTemplateOffsetToOverlay(canonical, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = overlayHit.edge.from.span.start;
    const results = ts.getReferences(overlay, overlayOffset) ?? [];
    return this.mapTypeScriptLocations(results, overlay);
  }

  getCodeActions(uri: DocumentUri, range: TextRange): TemplateCodeAction[] {
    const canonical = canonicalDocumentUri(uri);
    const snapshot = this.requireSnapshot(canonical);
    const normalizedRange = normalizeRange(range);
    if (!normalizedRange) return [];

    const actions: TemplateCodeAction[] = [];
    actions.push(...this.collectTypeScriptCodeActions(canonical, snapshot, normalizedRange));
    return actions;
  }

  renameSymbol(uri: DocumentUri, position: Position, newName: string): TextEdit[] {
    const ts = this.options.typescript;
    if (!ts?.getRenameEdits) return [];

    const canonical = canonicalDocumentUri(uri);
    const snapshot = this.requireSnapshot(canonical);
    const offset = offsetAtPosition(snapshot.text, position);
    if (offset == null) return [];

    const overlayHit = this.projectTemplateOffsetToOverlay(canonical, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = overlayHit.edge.from.span.start;
    const edits = ts.getRenameEdits(overlay, overlayOffset, newName) ?? [];
    if (!edits.length) return [];

    const mapped = this.mapTypeScriptEdits(edits, overlay, true) ?? [];
    const refs = ts.getReferences ? ts.getReferences(overlay, overlayOffset) ?? [] : [];
    if (!refs.length) return mapped;

    const locations = this.mapTypeScriptLocations(refs, overlay);
    if (!locations.length) return mapped;

    const seen = new Set(mapped.map((edit) => `${edit.uri}:${rangeKey(edit.range)}`));
    const extras: TextEdit[] = [];
    for (const loc of locations) {
      if (!loc.range) continue;
      if (!this.program.sources.get(loc.uri)) continue;
      const key = `${loc.uri}:${rangeKey(loc.range)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extras.push({ uri: loc.uri, range: loc.range, newText: newName });
    }

    return extras.length ? dedupeTextEdits([...mapped, ...extras]) : mapped;
  }

  private collectTemplateCompletions(
    query: TemplateQueryFacade,
    snapshot: DocumentSnapshot,
    offset: number,
  ): CompletionItem[] {
    return collectTemplateCompletionsForProgram(this.program, query, snapshot, offset);
  }

  private collectTypeScriptCompletions(
    canonical: CanonicalDocumentUri,
    snapshot: DocumentSnapshot,
    offset: number,
  ): CompletionItem[] {
    const ts = this.options.typescript;
    if (!ts?.getCompletions) return [];

    const overlayHit = this.projectTemplateOffsetToOverlay(canonical, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = overlayHit.edge.from.span.start;
    const entries = ts.getCompletions(overlay, overlayOffset) ?? [];
    if (!entries.length) return [];

    const fallbackSpan = overlayHit.edge.to.span;
    const typeNames = this.typeNamesFor(canonical);
    const results: CompletionItem[] = [];
    for (const entry of entries) {
      const overlaySpan = entry.replacementSpan
        ? resolveSourceSpan(
          { start: entry.replacementSpan.start, end: entry.replacementSpan.start + entry.replacementSpan.length },
          overlay.file,
        )
        : null;
      const mapped = overlaySpan
        ? projectGeneratedSpanToDocumentSpanWithOffsetFallback(this.program.provenance, overlay.uri, overlaySpan)
        : null;
      const span = mapped?.span ?? (overlaySpan ? null : fallbackSpan);
      // Clean detail and documentation using the overlay plan's type name
      // map — same vocabulary-based cleaning as diagnostics.
      const rawDetail = entry.detail ?? entry.kind;
      const detail = rawDetail ? rewriteTypeNames(rawDetail, typeNames) : rawDetail;
      const documentation = entry.documentation ? rewriteTypeNames(entry.documentation, typeNames) : entry.documentation;
      const range = span ? spanToRange(span, snapshot.text) : undefined;
      results.push({
        label: entry.name,
        source: "typescript",
        ...(range ? { range } : {}),
        ...(detail ? { detail } : {}),
        ...(documentation ? { documentation } : {}),
        ...(entry.insertText ? { insertText: entry.insertText } : {}),
        ...(entry.sortText ? { sortText: entry.sortText } : {}),
      });
    }
    return results;
  }

  private collectTypeScriptCodeActions(
    canonical: CanonicalDocumentUri,
    snapshot: DocumentSnapshot,
    range: TextRange,
  ): TemplateCodeAction[] {
    const ts = this.options.typescript;
    if (!ts?.getCodeActions) return [];

    const start = offsetAtPosition(snapshot.text, range.start);
    const end = offsetAtPosition(snapshot.text, range.end);
    if (start == null || end == null) return [];

    const overlayHit = this.projectTemplateSpanToOverlay(canonical, start, end);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayStart = overlayHit.edge.from.span.start;
    const overlayEnd = overlayHit.edge.from.span.end;
    const actions = ts.getCodeActions(overlay, overlayStart, overlayEnd) ?? [];
    if (!actions.length) return [];

    const typeNames = this.typeNamesFor(canonical);
    const results: TemplateCodeAction[] = [];
    for (const action of actions) {
      const mapped = this.mapTypeScriptEdits(action.edits, overlay, true);
      if (!mapped?.length) continue;
      results.push({
        title: rewriteTypeNames(action.title, typeNames),
        kind: "quickfix",
        source: "typescript",
        edits: mapped,
      });
    }
    return results;
  }

  private requireSnapshot(canonical: CanonicalDocumentUri): DocumentSnapshot {
    const snap = this.program.sources.get(canonical.uri);
    if (!snap) {
      throw new Error(`TemplateLanguageService: no snapshot for document ${String(canonical.uri)}. Call upsertTemplate(...) first.`);
    }
    return snap;
  }

  private overlaySnapshot(templateUri: DocumentUri): OverlayDocumentSnapshot {
    const overlay = this.build.getOverlay(templateUri);
    return {
      uri: overlay.overlay.uri,
      file: overlay.overlay.file,
      text: overlay.overlay.text,
      templateUri: overlay.template.uri,
    };
  }

  private mapTypeScriptLocations(locations: readonly TsLocation[], overlay: OverlayDocumentSnapshot): Location[] {
    const results: Location[] = [];
    const seen = new Set<string>();
    const overlaySnapshots = new Map<DocumentUri, OverlayDocumentSnapshot>([[overlay.uri, overlay]]);
    for (const loc of locations ?? []) {
      const generated = canonicalDocumentUri(loc.fileName);
      const range = normalizeRange(loc.range);
      const templateUri = resolveTemplateUriForGenerated(this.program.provenance, generated.uri)
        ?? (generated.uri === overlay.uri ? overlay.templateUri : null);
      const generatedOverlay = templateUri
        ? this.getGeneratedOverlaySnapshot(generated.uri, templateUri, overlaySnapshots)
        : null;
      const generatedText = generatedOverlay?.text ?? (generated.uri === overlay.uri ? overlay.text : null);
      const generatedLocation = {
        generatedUri: generated.uri,
        generatedFile: generatedOverlay?.file ?? generated.file,
        generatedText,
        start: loc.start ?? null,
        length: loc.length ?? null,
        range,
      };
      const generatedSpan = resolveGeneratedLocationSpan(generatedLocation, generated.file);
      const projectedHit = generatedSpan
        ? this.program.provenance.projectGeneratedSpan(generated.uri, generatedSpan)
        : null;
      const projectedLocation = projectedHit
        ? overlayHitToDocumentSpan(projectedHit)
        : projectGeneratedLocationToDocumentSpanWithOffsetFallback(this.program.provenance, generatedLocation);
      const projectedEvidence = projectedHit?.edge.evidence?.level ?? (projectedLocation ? "degraded" : null);
      const decision = resolveGeneratedReferenceLocationWithPolicy({
        generatedUri: generated.uri,
        generatedSpan,
        mappedLocation: projectedLocation,
        mappedEvidence: projectedEvidence,
        provenance: this.provenanceForReferenceDecision(generated.uri, templateUri),
        policy: PROVENANCE_POLICY,
      });
      const target = this.locationFromReferenceDecision(
        decision.location,
        generatedLocation.generatedUri,
        range,
        generatedText,
      ) ?? (templateUri == null && range ? { uri: generated.uri, range } : null);
      if (!target) continue;
      const key = locationKey(target);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(target);
    }
    return results;
  }

  private mapTypeScriptEdits(
    edits: readonly TsTextEdit[],
    overlay: OverlayDocumentSnapshot,
    requireOverlayMapping: boolean,
  ): TextEdit[] | null {
    const results: TextEdit[] = [];
    const overlaySnapshots = new Map<DocumentUri, OverlayDocumentSnapshot>([[overlay.uri, overlay]]);
    let mappedOverlayEdits = 0;
    let unmappedOverlayEdits = 0;
    let overlayEdits = 0;

    for (const edit of edits) {
      const generated = canonicalDocumentUri(edit.fileName);
      const range = normalizeRange(edit.range);
      const templateUri = resolveTemplateUriForGenerated(this.program.provenance, generated.uri);
      if (templateUri) {
        overlayEdits += 1;
        const generatedOverlay = this.getGeneratedOverlaySnapshot(generated.uri, templateUri, overlaySnapshots);
        const mapped = this.mapGeneratedEdit(edit, generated, range, generatedOverlay);
        if (!mapped) {
          unmappedOverlayEdits += 1;
          continue;
        }
        results.push(mapped);
        mappedOverlayEdits += 1;
        continue;
      }

      if (!range) continue;
      results.push({ uri: generated.uri, range, newText: edit.newText });
    }

    if (
      shouldRejectOverlayEditBatch(
        {
          requireOverlayMapping,
          overlayEdits,
          mappedOverlayEdits,
          unmappedOverlayEdits,
        },
        PROVENANCE_POLICY,
      )
    ) {
      return null;
    }
    return results.length ? dedupeTextEdits(results) : null;
  }

  private mapGeneratedEdit(
    edit: TsTextEdit,
    generated: CanonicalDocumentUri,
    range: TextRange | null,
    generatedOverlay: OverlayDocumentSnapshot | null,
  ): TextEdit | null {
    const mapped = this.mapGeneratedLocation({
      generatedUri: generated.uri,
      generatedFile: generatedOverlay?.file ?? generated.file,
      generatedText: generatedOverlay?.text ?? null,
      start: edit.start,
      length: edit.length,
      range,
    });
    if (!mapped) return null;
    return { uri: mapped.uri, range: mapped.range, newText: edit.newText };
  }

  private mapGeneratedLocation(args: {
    generatedUri: DocumentUri;
    generatedFile: SourceFileId;
    generatedText: string | null;
    start?: number | null;
    length?: number | null;
    range?: TextRange | null;
  }): Location | null {
    const mapped = projectGeneratedLocationToDocumentSpanWithOffsetFallback(this.program.provenance, {
      generatedUri: args.generatedUri,
      generatedFile: args.generatedFile,
      generatedText: args.generatedText,
      start: args.start ?? null,
      length: args.length ?? null,
      range: args.range ?? null,
    });
    if (!mapped) return null;
    const snap = this.program.sources.get(mapped.uri);
    if (!snap) return null;
    return { uri: mapped.uri, range: spanToRange(mapped.span, snap.text) };
  }

  private locationFromReferenceDecision(
    location: DocumentSpan | null,
    generatedUri: DocumentUri,
    fallbackRange: TextRange | null,
    generatedText: string | null,
  ): Location | null {
    if (!location) return null;
    const snap = this.program.sources.get(location.uri);
    if (snap) {
      return { uri: location.uri, range: spanToRange(location.span, snap.text) };
    }
    if (location.uri !== generatedUri) return null;
    if (fallbackRange) return { uri: location.uri, range: fallbackRange };
    if (!generatedText) return null;
    return { uri: location.uri, range: spanToRange(location.span, generatedText) };
  }

  private provenanceForReferenceDecision(
    generatedUri: DocumentUri,
    templateUri: DocumentUri | null,
  ): Pick<OverlaySpanIndex, "getTemplateUriForGenerated"> {
    if (!templateUri) return this.program.provenance;
    const canonicalGeneratedUri = canonicalDocumentUri(generatedUri).uri;
    return {
      getTemplateUriForGenerated: (candidateUri) => {
        const candidate = canonicalDocumentUri(candidateUri).uri;
        if (candidate === canonicalGeneratedUri) return templateUri;
        return resolveTemplateUriForGenerated(this.program.provenance, candidate);
      },
    };
  }

  private getGeneratedOverlaySnapshot(
    generatedUri: DocumentUri,
    templateUri: DocumentUri,
    cache: Map<DocumentUri, OverlayDocumentSnapshot>,
  ): OverlayDocumentSnapshot | null {
    const cached = cache.get(generatedUri);
    if (cached) return cached;
    try {
      const snapshot = this.overlaySnapshot(templateUri);
      const canonicalOverlayUri = canonicalDocumentUri(snapshot.uri).uri;
      cache.set(canonicalOverlayUri, snapshot);
      return canonicalOverlayUri === generatedUri ? snapshot : null;
    } catch {
      return null;
    }
  }

  private projectTemplateOffsetToOverlay(uri: CanonicalDocumentUri, offset: number): OverlaySpanHit | null {
    const decision = projectTemplateOffsetToOverlayWithPolicy({
      provenance: this.program.provenance,
      uri: uri.uri,
      offset,
      materializeOverlay: () => {
        this.build.getOverlay(uri.uri);
      },
      policy: PROVENANCE_POLICY,
    });
    return decision.hit;
  }

  private projectTemplateSpanToOverlay(
    uri: CanonicalDocumentUri,
    start: number,
    end: number,
  ): OverlaySpanHit | null {
    const span = resolveSourceSpan({ start, end }, uri.file);
    const decision = projectTemplateSpanToOverlayWithPolicy({
      provenance: this.program.provenance,
      uri: uri.uri,
      span,
      materializeOverlay: () => {
        this.build.getOverlay(uri.uri);
      },
      policy: PROVENANCE_POLICY,
    });
    return decision.hit;
  }

  private collectTypeScriptDiagnostics(
    uri: DocumentUri,
    overlayDoc: OverlayDocumentSnapshot | null,
    vmDisplayName?: string,
    typeNames?: TypeNameMap,
  ): TemplateLanguageDiagnostic[] {
    const ts = this.options.typescript;
    if (!ts) return [];

    const overlay = overlayDoc ?? this.overlaySnapshot(uri);
    const raw = ts.getDiagnostics(overlay) ?? [];
    const displayName = vmDisplayName ?? getVmDisplayName(this.program.options.vm);
    return raw.map((diag) => mapTypeScriptDiagnostic(diag, overlay, this.program.provenance, displayName, typeNames ?? EMPTY_TYPE_NAMES));
  }

  /**
   * Validate binding contracts against TS-resolved types.
   *
   * For each binding contract (ExprId → expected type + context), queries the
   * TS language service at the overlay position to get the resolved expression
   * type, then runs the Aurelia coercion model to check compatibility.
   *
   * This replaces the old string-based type inference + reconciliation approach.
   * Types come directly from TypeScript — accurate and always fresh.
   */
  private collectBindingDiagnostics(
    canonical: CanonicalDocumentUri,
    overlayDoc: OverlayDocumentSnapshot,
    vmDisplayName: string,
    typeNames: TypeNameMap,
  ): TemplateLanguageDiagnostic[] {
    const ts = this.options.typescript;

    let compilation: TemplateCompilation;
    try {
      compilation = this.program.getCompilation(canonical.uri);
    } catch {
      return [];
    }

    const contracts = compilation.typecheck?.contracts;
    if (!contracts || contracts.size === 0) return [];
    const config = compilation.typecheck?.config;
    if (!config?.enabled) return [];

    // Build ExprId → overlay position index from the mapping (when available)
    const exprOverlayPositions = new Map<string, { overlayProbe: number; htmlSpan: SourceSpan; memberPath: string | null }>();
    const mapping = compilation.mapping;
    if (mapping) {
      for (const entry of mapping.entries) {
        // Probe at the END of the __au$access call span.
        //
        // __au$access<T, R>(fn: (o: T) => R): R — the call's return type IS
        // the expression result type. Probing at the closing `)` of the call
        // gives TS the outermost expression context, avoiding the subexpression
        // problem (e.g., hitting the condition in a ternary instead of the result).
        //
        // Fallback: end of the lambda span (for overlays without callSpan).
        const probe = entry.callSpan
          ? Math.max(entry.callSpan.start, entry.callSpan.end - 1)
          : Math.max(entry.overlaySpan.start, entry.overlaySpan.end - 1);
        const memberPath = entry.segments?.length
          ? entry.segments[entry.segments.length - 1]!.path
          : null;
        exprOverlayPositions.set(entry.exprId, { overlayProbe: probe, htmlSpan: entry.htmlSpan, memberPath });
      }
    }

    // Expression spans from compilation (fallback for location when mapping unavailable)
    const exprSpans = compilation.exprSpans;

    const diags: TemplateLanguageDiagnostic[] = [];

    for (const [exprId, contract] of contracts.entries()) {
      // Skip contracts that can't be validated via type comparison
      if (contract.type === "unknown" || contract.type === "any") continue;
      // Listener bindings: the overlay calls the method, so TS returns the
      // call's return type (void), not the function type. Skip.
      if (contract.type === "Function") continue;
      // Iterator bindings: structural Iterable check can't be done via quickinfo
      if (contract.type.startsWith("Iterable<")) continue;
      // DOM interface types where Aurelia provides runtime coercion
      // (e.g., style.bind accepts strings that Aurelia parses into CSS)
      if (contract.type === "CSSStyleDeclaration") continue;

      // Resolve the actual expression type:
      // 1. For literals, use the compile-time known type (no TS needed)
      // 2. For non-literals, query TS at the overlay position
      let actualType: string | null = contract.literalType ?? null;

      if (!actualType) {
        // Non-literal: requires TS language service for type resolution
        if (!ts?.getQuickInfo) continue;

        const pos = exprOverlayPositions.get(exprId);
        if (!pos) continue;

        const info = ts.getQuickInfo(overlayDoc, pos.overlayProbe);
        if (!info?.text) continue;

        const resolvedType = parseQuickInfoType(info.text);
        if (!resolvedType) continue;

        actualType = rewriteTypeNames(resolvedType, typeNames);
      }

      // Run the Aurelia coercion model
      const result = checkTypeCompatibility(actualType, contract.type, contract.context, config);

      if (result.compatible || result.severity === "off") continue;

      // Build diagnostic with resolved types
      const pos = exprOverlayPositions.get(exprId);
      const memberPath = pos?.memberPath ?? null;
      const subject = memberPath ? `${vmDisplayName}.${memberPath}` : vmDisplayName;
      const message = memberPath
        ? `Type mismatch on ${subject}: expected ${contract.type}, got ${actualType}`
        : `Type mismatch: expected ${contract.type}, got ${actualType}`;

      // Location: prefer overlay mapping (has member path), fall back to expr spans
      const span = pos?.htmlSpan ?? exprSpans?.get(exprId) ?? null;
      diags.push({
        code: "aurelia/expr-type-mismatch",
        message,
        stage: "typecheck",
        severity: result.severity === "error" ? "error" : "warning",
        location: span ? { uri: canonical.uri, span } : null,
        data: { expected: contract.type, actual: actualType },
      });
    }

    return diags;
  }

  private typeNamesFor(canonical: CanonicalDocumentUri): TypeNameMap {
    try {
      const compilation = this.program.getCompilation(canonical.uri);
      return collectTypeNames(compilation);
    } catch {
      return EMPTY_TYPE_NAMES;
    }
  }
}

function buildSnapshot(doc: BuildDocument, version: number, contentHash: string): BuildSnapshot {
  return { uri: doc.uri, path: doc.path, file: doc.file, version, contentHash };
}

function overlayOptions(program: TemplateProgram): { isJs: boolean; overlayBaseName?: string } {
  const { isJs, overlayBaseName } = program.options;
  const result: { isJs: boolean; overlayBaseName?: string } = { isJs };
  if (overlayBaseName !== undefined) result.overlayBaseName = overlayBaseName;
  return result;
}

function getVmDisplayName(vm: TemplateProgram["options"]["vm"]): string {
  if (!vm) return "Component";
  const withDisplay = vm as { getDisplayName?: () => string };
  if (typeof withDisplay.getDisplayName === "function") {
    const name = withDisplay.getDisplayName();
    if (name) return name;
  }
  return vm.getRootVmTypeExpr ? vm.getRootVmTypeExpr() : "Component";
}

function dedupeCompletions(items: readonly CompletionItem[]): CompletionItem[] {
  const seen = new Set<string>();
  const results: CompletionItem[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.label}:${rangeKey(item.range)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}

function rangeKey(range: TextRange | undefined): string {
  if (!range) return "none";
  return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

/**
 * Map a compiler diagnostic to a template language diagnostic.
 *
 * Typecheck diagnostics (aurelia/expr-type-mismatch) are no longer emitted
 * during compilation — binding type validation happens at diagnostic
 * collection time via collectBindingDiagnostics. This function handles
 * all other compiler diagnostics (link, bind, etc.).
 */
function mapCompilerDiagnostic(
  diag: CompilerDiagnostic,
  templateUri: DocumentUri,
  templateFile: SourceFileId,
): TemplateLanguageDiagnostic | null {
  const targetSpan = diagnosticSpan(diag);
  const location = targetSpan ? { uri: templateUri, span: resolveSourceSpan(targetSpan, templateFile) } : null;
  const related = (diag.related ?? []).map((rel) => ({
    message: rel.message,
    location: rel.span ? { uri: templateUri, span: resolveSourceSpan(rel.span, templateFile) } : null,
  }));
  const code = String(diag.code);
  const data = diag.data ?? null;

  return {
    code,
    message: diag.message,
    stage: diag.stage,
    severity: diag.severity,
    location,
    origin: diag.origin ?? null,
    ...(related.length ? { related } : {}),
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  };
}

function parseQuickInfoType(text: string): string | null {
  const trimmed = text.trim();
  const colon = trimmed.lastIndexOf(":");
  if (colon >= 0 && colon < trimmed.length - 1) {
    const typePart = trimmed.slice(colon + 1).trim();
    if (typePart) return typePart;
  }
  return trimmed || null;
}

function mapTypeScriptDiagnostic(
  diag: TsDiagnostic,
  overlay: OverlayDocumentSnapshot,
  provenance: OverlaySpanIndex,
  vmDisplayName: string,
  typeNames: TypeNameMap,
): TemplateLanguageDiagnostic {
  const overlaySpan = tsSpan(diag, overlay.file);
  // Note: We intentionally do NOT use overlayLocation - the overlay file is an internal implementation detail.
  const _overlayLocation = overlaySpan ? { uri: overlay.uri, span: overlaySpan } : null;
  const provenanceHit = overlaySpan ? provenance.projectGeneratedSpan(overlay.uri, overlaySpan) : null;
  const mappedLocation = overlaySpan
    ? projectGeneratedSpanToDocumentSpanWithOffsetFallback(provenance, overlay.uri, overlaySpan)
    : null;

  const related: DiagnosticRelatedInfo[] = [];
  // Note: We intentionally do NOT add the overlay location as related info.
  // The overlay file is an internal implementation detail and should not be exposed to users.

  for (const rel of diag.relatedInformation ?? []) {
    const relCanonical = rel.fileName ? canonicalDocumentUri(rel.fileName) : canonicalDocumentUri(overlay.uri);
    const relSpan = tsSpan(rel, relCanonical.file);
    const relUri = relCanonical.uri;
    const relMapped = relSpan
      ? projectGeneratedSpanToDocumentSpanWithOffsetFallback(provenance, relUri, relSpan)
      : null;
    const relatedTemplateUri = resolveTemplateUriForGenerated(provenance, relUri);
    const relatedLocation = resolveRelatedDiagnosticLocationWithPolicy({
      relUri,
      relSpan,
      mappedLocation: relMapped,
      overlayUri: overlay.uri,
      templateUri: overlay.templateUri,
      relatedTemplateUri,
      policy: PROVENANCE_POLICY,
    });

    related.push({
      message: rewriteTypeNames(flattenTsMessage(rel.messageText), typeNames),
      location: relatedLocation.location,
    });
  }

  const severity = tsCategoryToSeverity(diag.category);
  const message = formatTypeScriptMessage(diag, vmDisplayName, provenanceHit, typeNames);

  const locationDecision = resolveOverlayDiagnosticLocationWithPolicy({
    overlaySpan,
    mappedLocation,
    templateUri: overlay.templateUri,
    policy: PROVENANCE_POLICY,
  });

  return {
    code: diag.code ?? "TS",
    message,
    stage: "typescript",
    severity,
    location: locationDecision.location,
    ...(related.length ? { related } : {}),
    ...(diag.tags ? { tags: diag.tags } : {}),
  };
}

function tsSpan(
  diag: Pick<TsDiagnostic, "start" | "length">,
  file: SourceFileId,
): SourceSpan | null {
  if (diag.start == null) return null;
  const start = diag.start;
  const len = diag.length ?? 0;
  return resolveSourceSpan({ start, end: start + len }, file);
}

function flattenTsMessage(msg: string | TsMessageChain | undefined): string {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  const parts: string[] = [];
  let current: TsMessageChain | undefined = msg;
  while (current) {
    parts.push(current.messageText);
    current = current.next?.[0];
  }
  return parts.join(" ");
}

const EMPTY_TYPE_NAMES: TypeNameMap = new Map();

function rewriteTypeNames(text: string, typeNames: TypeNameMap): string {
  if (!text || typeNames.size === 0) return text;
  let result = text;
  for (const [alias, friendly] of typeNames) {
    if (!alias || friendly == null || alias === friendly) continue;
    const re = new RegExp(`\\b${escapeRegExp(String(alias))}\\b`, "g");
    result = result.replace(re, friendly);
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectTypeNames(compilation: TemplateCompilation | null | undefined): TypeNameMap {
  const map = new Map<string, string>();
  if (!compilation) return map;

  // Overlay helper types and functions — these are emitted by the overlay
  // emitter and must never appear in user-facing content. The mapping is
  // from the overlay plan's known vocabulary, not regex guessing.
  map.set("__AU_DollarChangedProps", "");
  map.set("__AU_DollarChangedValue", "");
  map.set("__au$access", "");
  map.set("__au_vc", "");
  map.set("__au_bb", "");

  for (const tpl of compilation.overlayPlan.templates ?? []) {
    // VM alias → authored class name
    const vmDisplay = tpl.vmType?.displayName ?? tpl.vmType?.typeExpr ?? null;
    if (tpl.vmType?.alias && vmDisplay && vmDisplay !== tpl.vmType.alias) {
      map.set(tpl.vmType.alias, vmDisplay);
    }

    // Frame aliases → VM display name (not "App 0" — the frame index
    // is an overlay implementation detail). Also map the full typeExpr
    // (Omit<> wrappers, intersections) so that if TS expands the alias
    // in a diagnostic message, the expansion is also cleaned.
    for (const frame of tpl.frames ?? []) {
      if (frame.typeName && vmDisplay && frame.typeName !== vmDisplay) {
        map.set(frame.typeName, vmDisplay);
      }
      if (frame.typeExpr && vmDisplay && frame.typeExpr !== vmDisplay) {
        map.set(frame.typeExpr, vmDisplay);
      }
    }
  }
  return map;
}

/**
 * Construct a diagnostic message from provenance data when possible,
 * falling back to type-name-cleaned TS text for unrecognized codes.
 *
 * For recognized codes, the message is built from the provenance hit's
 * memberPath and the VM display name — never from raw TS display text.
 * The overlay plan's type name map covers all generated identifiers,
 * so the fallback path also produces clean messages.
 */
function formatTypeScriptMessage(
  diag: TsDiagnostic,
  vmDisplayName: string,
  hit: TemplateSpanHit | null,
  typeNames: TypeNameMap,
): string {
  const code = normalizeTsDiagnosticCode(diag.code);
  const member = hit?.memberPath;

  // Property does not exist (TS2339, TS2551)
  if (member && (code === 2339 || code === 2551)) {
    return `Property '${member}' does not exist on ${vmDisplayName}`;
  }

  // Type not assignable (TS2322) — construct from provenance subject
  if (code === 2322 && member) {
    const raw = flattenTsMessage(diag.messageText);
    const cleaned = rewriteTypeNames(raw, typeNames);
    // Replace TS's container type references with the VM display name
    return cleaned.replace(/type '([^']+)'/gi, (_match: string, type: string) => {
      const cleanType = rewriteTypeNames(type, typeNames);
      return `type '${cleanType}'`;
    });
  }

  // Argument type not assignable (TS2345) — same approach
  if (code === 2345) {
    const raw = flattenTsMessage(diag.messageText);
    const cleaned = rewriteTypeNames(raw, typeNames);
    return cleaned.replace(/type '([^']+)'/gi, (_match: string, type: string) => {
      const cleanType = rewriteTypeNames(type, typeNames);
      return `type '${cleanType}'`;
    });
  }

  // All other codes: the type name map (derived from the overlay plan's
  // known vocabulary) covers every generated identifier. Apply it to
  // the full message text.
  return rewriteTypeNames(flattenTsMessage(diag.messageText), typeNames);
}

function normalizeTsDiagnosticCode(code: TsDiagnostic["code"]): number | null {
  if (typeof code === "number") return code;
  if (typeof code !== "string" || code.length === 0) return null;
  const parsed = Number(code);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRange(range: TextRange | null | undefined): TextRange | null {
  if (!range) return null;
  return {
    start: { line: Math.max(0, range.start.line), character: Math.max(0, range.start.character) },
    end: {
      line: Math.max(range.start.line, range.end.line),
      character: Math.max(0, range.end.character),
    },
  };
}

function locationKey(loc: Location): string {
  return `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}-${loc.range.end.line}:${loc.range.end.character}`;
}

function tsCategoryToSeverity(cat: TsDiagnosticCategory): DiagnosticSeverity {
  if (typeof cat === "number") {
    return cat === 1 ? "warning" : cat === 2 || cat === 3 ? "info" : "error";
  }
  switch (cat) {
    case "warning":
      return "warning";
    case "suggestion":
    case "message":
      return "info";
    default:
      return "error";
  }
}

function dedupeTextEdits(edits: readonly TextEdit[]): TextEdit[] {
  const seen = new Set<string>();
  const results: TextEdit[] = [];
  for (const edit of edits) {
    const key = `${edit.uri}:${rangeKey(edit.range)}:${edit.newText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(edit);
  }
  return results;
}
