// Model imports (via barrel)
import type { NormalizedPath, SourceFileId, SourceSpan, Position, TextRange } from "../model/index.js";
import {
  offsetAtPosition,
  positionAtOffset,
  resolveSourceSpan,
  spanContainsOffset,
  spanLength,
  spanToRange,
} from "../model/index.js";

// Shared imports (via barrel)
import { diagnosticSpan, type CompilerDiagnostic, type DiagnosticSeverity } from "../shared/index.js";

// Pipeline imports (via barrel)
import { stableHash } from "../pipeline/index.js";

// Analysis imports (via barrel)
import type { TypecheckDiagnostic } from "../analysis/index.js";

// Language imports (via barrel)
import {
  buildTemplateSyntaxRegistry,
  materializeResourcesForScope,
  prepareSemantics,
  type AttrRes,
  type Bindable,
  type ElementRes,
  type ResourceCollections,
  type SemanticsWithCaches,
  type TemplateSyntaxRegistry,
  type TypeRef,
} from "../language/index.js";

// Parsing imports (via barrel)
import { analyzeAttributeName, createAttributeParserFromRegistry, type AttributeParser } from "../parsing/index.js";

// Synthesis imports (via barrel)
import type { TemplateQueryFacade, TemplateMappingArtifact } from "../synthesis/index.js";

// Compiler facade
import type { TemplateCompilation } from "../facade.js";

// Program layer imports
import type { DocumentSnapshot, DocumentUri, TemplateExprId } from "./primitives.js";
import { canonicalDocumentUri, deriveTemplatePaths, type CanonicalDocumentUri } from "./paths.js";
import {
  provenanceHitToDocumentSpan,
  projectGeneratedOffsetToDocumentSpan,
  projectGeneratedSpanToDocumentSpan,
  type DocumentSpan,
  type OverlayProvenanceHit,
  type ProvenanceIndex,
  type TemplateProvenanceHit,
} from "./provenance.js";
import type { TemplateProgram } from "./program.js";

/**
 * TODO(provenance-refactor)
 * - Treat ProvenanceIndex as the single source-map layer between generated artifacts and templates.
 * - Migrate remaining overlay offset/member heuristics in this file into ProvenanceIndex projection APIs.
 * - Stop scanning TemplateMappingArtifact directly in services once provenance has full projection coverage.
 * - Keep this in sync with docs/agents/appendix-provenance.md and docs/provenance-refactor-milestones.md.
 */

export type { DocumentSpan } from "./provenance.js";
export type { Position, TextRange } from "../model/index.js";

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

export interface HoverInfo {
  contents: string;
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

export type LanguageDiagnosticSource = CompilerDiagnostic["source"] | "typescript";

export interface TemplateLanguageDiagnostic {
  code: string | number;
  message: string;
  source: LanguageDiagnosticSource;
  severity: DiagnosticSeverity;
  location: DocumentSpan | null;
  related?: readonly DiagnosticRelatedInfo[];
  tags?: readonly string[];
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

export interface CompletionItem {
  label: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  range?: TextRange;
  source: "template" | "typescript";
}

export interface TemplateLanguageService {
  getDiagnostics(uri: DocumentUri): TemplateLanguageDiagnostics;
  getHover(uri: DocumentUri, position: Position): HoverInfo | null;
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
    const vmRootTypeExpr = getVmRootTypeExpr(this.program.options.vm);
    const typeNames = this.typeNamesFor(canonical);
    const overlayDoc = this.overlaySnapshot(canonical.uri);
    const compiler = this.program
      .getDiagnostics(canonical.uri)
      .all
      .map((diag) =>
        mapCompilerDiagnostic(diag, canonical.uri, canonical.file, {
          vmDisplayName,
          vmRootTypeExpr,
          overlay: overlayDoc,
          provenance: this.program.provenance,
          typescript: this.options.typescript,
          typeNames,
        }),
      )
      .filter((diag): diag is TemplateLanguageDiagnostic => diag != null);

    const typescript = this.collectTypeScriptDiagnostics(canonical.uri, overlayDoc, vmDisplayName, typeNames);
    const all = [...compiler, ...typescript];

    return { all, compiler, typescript };
  }

  getOverlay(uri: DocumentUri): OverlayBuildArtifact {
    return this.build.getOverlay(uri);
  }

  getHover(uri: DocumentUri, position: Position): HoverInfo | null {
    const canonical = canonicalDocumentUri(uri);
    const query = this.program.getQuery(canonical.uri);
    const snapshot = this.requireSnapshot(canonical);
    const offset = offsetAtPosition(snapshot.text, position);
    if (offset == null) return null;

    const expr = query.exprAt(offset);
    const node = query.nodeAt(offset);
    const controller = query.controllerAt(offset);

    const contents: string[] = [];
    if (expr) {
      const type = query.expectedTypeOf(expr);
      const member = expr.memberPath ? `${expr.memberPath}` : "expression";
      contents.push(type ? `${member}: ${type}` : member);
    }
    if (node) {
      const host = node.hostKind !== "none" ? ` (${node.hostKind})` : "";
      contents.push(`node: ${node.kind}${host}`);
    }
    if (controller) contents.push(`controller: ${controller.kind}`);

    const tsHover = this.collectTypeScriptHover(canonical, snapshot, offset);
    if (tsHover) contents.push(tsHover.text);

    if (!contents.length) return null;

    const span =
      tsHover?.span ??
      expr?.span ??
      node?.span ??
      controller?.span ??
      resolveSourceSpan({ start: offset, end: offset }, snapshot.uri);

    return {
      contents: contents.join("\n\n"),
      range: spanToRange(span, snapshot.text),
    };
  }

  getCompletions(uri: DocumentUri, position: Position): CompletionItem[] {
    const canonical = canonicalDocumentUri(uri);
    const snapshot = this.requireSnapshot(canonical);
    const offset = offsetAtPosition(snapshot.text, position);
    if (offset == null) return [];

    const query = this.program.getQuery(canonical.uri);
    const compilation = this.program.getCompilation(canonical.uri);
    const template = this.collectTemplateCompletions(query, snapshot, offset, compilation);
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
    compilation: TemplateCompilation | null,
  ): CompletionItem[] {
    const { sem, resources, syntax } = resolveCompletionContext(this.program);
    const attrParser = createAttributeParserFromRegistry(syntax);

    const exprInfo = query.exprAt(offset);
    if (exprInfo) {
      const exprSpan = findExpressionSpan(compilation?.mapping ?? null, offset) ?? exprInfo.span;
      return collectExpressionCompletions(snapshot.text, offset, exprSpan, resources);
    }

    const context = findTagContext(snapshot.text, offset);
    if (!context) return [];

    if (context.kind === "tag-name") {
      return collectTagNameCompletions(snapshot.text, context, resources, sem);
    }

    if (context.kind === "attr-name") {
      return collectAttributeNameCompletions(snapshot.text, context, resources, sem, syntax, attrParser);
    }

    if (context.kind === "attr-value") {
      return collectAttributeValueCompletions(snapshot.text, context, resources, syntax, attrParser);
    }

    return [];
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

    const fallbackSpan = overlayHit.edge.to.span ?? resolveSourceSpan({ start: offset, end: offset }, canonical.file);
    const results: CompletionItem[] = [];
    for (const entry of entries) {
      const overlaySpan = entry.replacementSpan
        ? resolveSourceSpan(
          { start: entry.replacementSpan.start, end: entry.replacementSpan.start + entry.replacementSpan.length },
          overlay.file,
        )
        : null;
      const mapped = overlaySpan
        ? projectGeneratedSpanToDocumentSpan(this.program.provenance, overlay.uri, overlaySpan)
        : null;
      const span = mapped?.span ?? fallbackSpan;
      const detail = entry.detail ?? entry.kind;
      const range = spanToRange(span, snapshot.text);
      results.push({
        label: entry.name,
        source: "typescript",
        range,
        ...(detail ? { detail } : {}),
        ...(entry.documentation ? { documentation: entry.documentation } : {}),
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

    const results: TemplateCodeAction[] = [];
    for (const action of actions) {
      const mapped = this.mapTypeScriptEdits(action.edits, overlay, true);
      if (!mapped?.length) continue;
      results.push({
        title: action.title,
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

  private collectTypeScriptHover(
    canonical: CanonicalDocumentUri,
    snapshot: DocumentSnapshot,
    offset: number,
  ): { text: string; span?: SourceSpan } | null {
    const ts = this.options.typescript;
    if (!ts?.getQuickInfo) return null;

    const overlayHit = this.projectTemplateOffsetToOverlay(canonical, offset);
    if (!overlayHit) return null;

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = overlayHit.edge.from.span.start;
    const info = ts.getQuickInfo(overlay, overlayOffset);
    if (!info) return null;
    const typeNames = this.typeNamesFor(canonical);

    const overlaySpan = resolveSourceSpan(
      { start: info.start ?? overlayOffset, end: (info.start ?? overlayOffset) + (info.length ?? 0) },
      overlay.file,
    );
    const mapped = projectGeneratedSpanToDocumentSpan(this.program.provenance, overlay.uri, overlaySpan);
    const hoverSpan =
      mapped?.span && spanLength(mapped.span) > 0
        ? mapped.span
        : overlayHit.edge.to.span ?? resolveSourceSpan({ start: offset, end: offset }, snapshot.uri);
    const rewrittenText = rewriteTypeNames(info.text, typeNames);
    const text = info.documentation ? `${rewrittenText}\n\n${info.documentation}` : rewrittenText;
    return { text, span: hoverSpan };
  }

  private mapTypeScriptLocations(locations: readonly TsLocation[], overlay: OverlayDocumentSnapshot): Location[] {
    const results: Location[] = [];
    const seen = new Set<string>();
    for (const loc of locations ?? []) {
      const locUri = canonicalDocumentUri(loc.fileName).uri;
      let mapped: Location | null = null;
      if (locUri !== overlay.uri) {
        const span = tsSpan(loc, canonicalDocumentUri(loc.fileName).file);
        if (span) {
          const projected = projectGeneratedSpanToDocumentSpan(this.program.provenance, locUri, span);
          if (projected) {
            const snap = this.program.sources.get(projected.uri);
            if (snap) {
              mapped = { uri: projected.uri, range: spanToRange(projected.span, snap.text) };
            }
          }
        }
      }
      if (!mapped) mapped = this.mapProvenanceLocation(loc, overlay);
      const range = mapped?.range ?? normalizeRange(loc.range);
      if (!range) continue;
      const target = mapped ?? { uri: locUri, range };
      const key = locationKey(target);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(target);
    }
    return results;
  }

  private mapProvenanceLocation(loc: TsLocation, overlay: OverlayDocumentSnapshot): Location | null {
    const canonical = canonicalDocumentUri(loc.fileName).uri;
    const overlaySpan = this.overlaySpanForLocation(loc, overlay);
    if (overlaySpan) {
      const mapped = projectGeneratedSpanToDocumentSpan(this.program.provenance, canonical, overlaySpan);
      if (mapped) {
        const snap = this.program.sources.get(mapped.uri);
        if (snap) return { uri: mapped.uri, range: spanToRange(mapped.span, snap.text) };
      }
    }
    const overlayOffset = this.overlayOffsetForLocation(loc, overlay);
    if (overlayOffset == null) return null;
    return mapOverlayOffsetToTemplate(canonical, overlayOffset, this.program.provenance, this.program.sources);
  }

  private mapTypeScriptEdits(
    edits: readonly TsTextEdit[],
    overlay: OverlayDocumentSnapshot,
    requireOverlayMapping: boolean,
  ): TextEdit[] | null {
    const results: TextEdit[] = [];
    const overlayUri = overlay ? canonicalDocumentUri(overlay.uri).uri : null;
    const overlayKey = overlayUri ? canonicalDocumentUri(overlayUri).path.toLowerCase() : null;
    const overlayKeys = new Set<string>();
    if (overlayKey) overlayKeys.add(overlayKey);
    for (const uri of collectOverlayUris(this.program.provenance)) {
      overlayKeys.add(canonicalDocumentUri(uri).path.toLowerCase());
    }
    let mappedOverlayEdits = 0;
    let unmappedOverlayEdits = 0;
    let overlayEdits = 0;

    for (const edit of edits) {
      const normalized = canonicalDocumentUri(edit.fileName);
      const normalizedUri = normalized.uri;
      const normalizedKey = normalized.path.toLowerCase();
      const range = normalizeRange(edit.range);
      const isOverlayEdit = overlayKeys.has(normalizedKey);
      if (isOverlayEdit) {
        overlayEdits += 1;
        const mapped = this.mapOverlayEdit(edit, normalizedUri, overlayKey !== null && normalizedKey === overlayKey ? overlay : null);
        if (!mapped) {
          unmappedOverlayEdits += 1;
          continue;
        }
        results.push(mapped);
        mappedOverlayEdits += 1;
        continue;
      }

      if (!range) continue;
      results.push({ uri: normalizedUri, range, newText: edit.newText });
    }

    if (requireOverlayMapping && overlayEdits > 0 && (unmappedOverlayEdits > 0 || mappedOverlayEdits === 0)) {
      return null;
    }
    return results.length ? dedupeTextEdits(results) : null;
  }

  private mapOverlayEdit(
    edit: TsTextEdit,
    overlayUri: DocumentUri,
    overlay: OverlayDocumentSnapshot | null,
  ): TextEdit | null {
    const overlaySpan = this.overlaySpanForEdit(edit, overlayUri, overlay);
    if (!overlaySpan) return null;
    const mapped = projectGeneratedSpanToDocumentSpan(this.program.provenance, overlayUri, overlaySpan);
    if (!mapped) return null;
    const snap = this.program.sources.get(mapped.uri);
    if (!snap) return null;
    return { uri: mapped.uri, range: spanToRange(mapped.span, snap.text), newText: edit.newText };
  }

  private projectTemplateOffsetToOverlay(uri: CanonicalDocumentUri, offset: number): OverlayProvenanceHit | null {
    const hit = this.program.provenance.projectTemplateOffset(uri.uri, offset);
    if (hit) return hit;
    try {
      this.build.getOverlay(uri.uri);
    } catch {
      return null;
    }
    return this.program.provenance.projectTemplateOffset(uri.uri, offset);
  }

  private projectTemplateSpanToOverlay(
    uri: CanonicalDocumentUri,
    start: number,
    end: number,
  ): OverlayProvenanceHit | null {
    const span = resolveSourceSpan({ start, end }, uri.file);
    const hit = this.program.provenance.projectTemplateSpan(uri.uri, span);
    if (hit) return hit;
    try {
      this.build.getOverlay(uri.uri);
    } catch {
      return null;
    }
    return this.program.provenance.projectTemplateSpan(uri.uri, span);
  }

  private overlayOffsetForLocation(
    loc: Pick<TsLocation, "start" | "range" | "fileName">,
    overlay: OverlayDocumentSnapshot,
  ): number | null {
    if (loc.start != null) return loc.start;
    const normalizedUri = canonicalDocumentUri(loc.fileName).uri;
    if (normalizedUri !== overlay.uri || !loc.range) return null;
    return offsetAtPosition(overlay.text, loc.range.start);
  }

  private overlaySpanForEdit(
    edit: Pick<TsTextEdit, "start" | "length" | "range">,
    overlayUri: DocumentUri,
    overlay: OverlayDocumentSnapshot | null,
  ): SourceSpan | null {
    if (edit.start != null) {
      const len = edit.length ?? 0;
      const file = overlay?.file ?? canonicalDocumentUri(overlayUri).file;
      return resolveSourceSpan({ start: edit.start, end: edit.start + len }, file);
    }
    if (!edit.range || !overlay || overlay.uri !== overlayUri) return null;
    const start = offsetAtPosition(overlay.text, edit.range.start);
    const end = offsetAtPosition(overlay.text, edit.range.end);
    if (start == null || end == null) return null;
    return resolveSourceSpan({ start, end }, overlay.file);
  }

  private overlaySpanForLocation(
    loc: Pick<TsLocation, "start" | "length" | "range" | "fileName">,
    overlay: OverlayDocumentSnapshot,
  ): SourceSpan | null {
    if (loc.start != null) {
      const len = loc.length ?? 0;
      return resolveSourceSpan({ start: loc.start, end: loc.start + len }, overlay.file);
    }
    if (!loc.range || canonicalDocumentUri(loc.fileName).uri !== overlay.uri) return null;
    const start = offsetAtPosition(overlay.text, loc.range.start);
    const end = offsetAtPosition(overlay.text, loc.range.end);
    if (start == null || end == null) return null;
    return resolveSourceSpan({ start, end }, overlay.file);
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

function getVmRootTypeExpr(vm: TemplateProgram["options"]["vm"]): string {
  if (!vm) return "Component";
  if (typeof vm.getQualifiedRootVmTypeExpr === "function") {
    const qualified = vm.getQualifiedRootVmTypeExpr();
    if (qualified) return qualified;
  }
  return vm.getRootVmTypeExpr();
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

type TagContext =
  | {
      kind: "tag-name";
      tagName: string;
      nameStart: number;
      nameEnd: number;
      prefix: string;
    }
  | {
      kind: "attr-name";
      tagName: string;
      attrName: string;
      attrStart: number;
      attrEnd: number;
      prefix: string;
    }
  | {
      kind: "attr-value";
      tagName: string;
      attrName: string;
      valueStart: number;
      valueEnd: number;
      prefix: string;
    };

function resolveCompletionContext(
  program: TemplateProgram,
): { sem: SemanticsWithCaches; resources: ResourceCollections; syntax: TemplateSyntaxRegistry } {
  const base = prepareSemantics(program.options.semantics, {
    catalog: program.options.catalog,
  });
  const graph = program.options.resourceGraph ?? base.resourceGraph ?? null;
  const scope = program.options.resourceScope ?? base.defaultScope ?? null;
  const { resources } = materializeResourcesForScope(base, graph, scope);
  const catalogResources = program.options.catalog?.resources;
  const mergedResources = catalogResources ? mergeResourceCollections(resources, catalogResources) : resources;
  const sem = prepareSemantics(
    { ...base, resourceGraph: graph ?? undefined, defaultScope: scope ?? undefined },
    { resources: mergedResources },
  );
  const syntax = program.options.syntax ?? buildTemplateSyntaxRegistry(sem);
  return { sem, resources: mergedResources, syntax };
}

function mergeResourceCollections(
  base: ResourceCollections,
  extra: ResourceCollections,
): ResourceCollections {
  return {
    elements: { ...extra.elements, ...base.elements },
    attributes: { ...extra.attributes, ...base.attributes },
    controllers: { ...extra.controllers, ...base.controllers },
    valueConverters: { ...extra.valueConverters, ...base.valueConverters },
    bindingBehaviors: { ...extra.bindingBehaviors, ...base.bindingBehaviors },
  };
}

function collectExpressionCompletions(
  text: string,
  offset: number,
  exprSpan: SourceSpan,
  resources: ResourceCollections,
): CompletionItem[] {
  if (!spanContainsOffset(exprSpan, offset)) return [];
  const exprText = text.slice(exprSpan.start, exprSpan.end);
  const relativeOffset = offset - exprSpan.start;
  const hit = findPipeContext(exprText, relativeOffset);
  if (!hit) return [];
  const range = rangeFromOffsets(text, exprSpan.start + hit.nameStart, exprSpan.start + hit.nameEnd);
  const prefix = hit.prefix.toLowerCase();
  const labels = hit.kind === "value-converter"
    ? Object.keys(resources.valueConverters ?? {})
    : Object.keys(resources.bindingBehaviors ?? {});
  const detail = hit.kind === "value-converter" ? "Value Converter" : "Binding Behavior";
  return labels
    .filter((label) => label.toLowerCase().startsWith(prefix))
    .sort()
    .map((label) => ({ label, source: "template", range, detail }));
}

function collectTagNameCompletions(
  text: string,
  context: Extract<TagContext, { kind: "tag-name" }>,
  resources: ResourceCollections,
  sem: SemanticsWithCaches,
): CompletionItem[] {
  const range = rangeFromOffsets(text, context.nameStart, context.nameEnd);
  const prefix = context.prefix.toLowerCase();
  const items: CompletionItem[] = [];
  const seen = new Set<string>();

  for (const [key, element] of Object.entries(resources.elements)) {
    const names = new Set(
      [key, element.name, ...(element.aliases ?? [])].filter((name): name is string => !!name),
    );
    for (const name of names) {
      if (!name.toLowerCase().startsWith(prefix)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      items.push({ label: name, source: "template", range, detail: "Custom Element" });
    }
  }

  for (const name of Object.keys(sem.dom.elements ?? {})) {
    if (!name.toLowerCase().startsWith(prefix)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    items.push({ label: name, source: "template", range, detail: "HTML Element" });
  }

  return items;
}

function collectAttributeNameCompletions(
  text: string,
  context: Extract<TagContext, { kind: "attr-name" }>,
  resources: ResourceCollections,
  sem: SemanticsWithCaches,
  syntax: TemplateSyntaxRegistry,
  attrParser: AttributeParser,
): CompletionItem[] {
  const typed = context.prefix;
  const command = parseBindingCommandContext(typed, context.attrName, syntax);
  if (command) {
    return collectBindingCommandCompletions(
      syntax,
      typed.slice(command.commandOffset),
      rangeFromOffsets(text, context.attrStart + command.rangeStart, context.attrStart + command.rangeEnd),
    );
  }

  const analysis = analyzeAttributeName(context.attrName, syntax, attrParser);
  let targetSpan = analysis.targetSpan;
  if (!targetSpan && !analysis.syntax.command) {
    const symbol = leadingAttributeSymbol(context.attrName, syntax);
    targetSpan = symbol
      ? { start: symbol.length, end: context.attrName.length }
      : { start: 0, end: context.attrName.length };
  }
  if (!targetSpan) return [];
  if (typed.length > targetSpan.end) return [];
  const range = rangeFromOffsets(text, context.attrStart + targetSpan.start, context.attrStart + targetSpan.end);
  const lowerPrefix = typed.slice(targetSpan.start, Math.min(typed.length, targetSpan.end)).toLowerCase();

  const items: CompletionItem[] = [];
  const seen = new Set<string>();
  const push = (label: string, detail?: string, documentation?: string) => {
    if (!label.toLowerCase().startsWith(lowerPrefix)) return;
    if (seen.has(label)) return;
    seen.add(label);
    items.push({
      label,
      source: "template",
      range,
      ...(detail ? { detail } : {}),
      ...(documentation ? { documentation } : {}),
    });
  };

  const element = context.tagName ? resolveElement(resources, context.tagName) : null;
  if (element) {
    for (const bindable of Object.values(element.bindables ?? {})) {
      const label = (bindable.attribute ?? bindable.name).trim();
      if (!label) continue;
      push(label, "Bindable", typeRefToString(bindable.type));
    }
  }

  for (const [key, attr] of Object.entries(resources.attributes ?? {})) {
    const detail = attr.isTemplateController ? "Template Controller" : "Custom Attribute";
    const names = new Set(
      [key, attr.name, ...(attr.aliases ?? [])].filter((name): name is string => !!name),
    );
    for (const name of names) {
      push(name, detail);
    }
  }

  const dom = context.tagName ? sem.dom.elements[context.tagName] : null;
  if (dom) {
    for (const name of Object.keys(dom.props ?? {})) {
      push(name, "Native Attribute");
    }
    for (const name of Object.keys(dom.attrToProp ?? {})) {
      push(name, "Native Attribute");
    }
    for (const name of Object.keys(sem.naming.attrToPropGlobal ?? {})) {
      push(name, "Native Attribute");
    }
    const perTag = sem.naming.perTag?.[context.tagName];
    if (perTag) {
      for (const name of Object.keys(perTag)) {
        push(name, "Native Attribute");
      }
    }
  }

  return items;
}

function collectAttributeValueCompletions(
  text: string,
  context: Extract<TagContext, { kind: "attr-value" }>,
  resources: ResourceCollections,
  syntax: TemplateSyntaxRegistry,
  attrParser: AttributeParser,
): CompletionItem[] {
  const attrTarget = normalizeAttributeTarget(context.attrName, syntax, attrParser);
  if (!attrTarget) return [];

  const range = rangeFromOffsets(text, context.valueStart, context.valueEnd);
  const prefix = context.prefix.toLowerCase();

  const element = context.tagName ? resolveElement(resources, context.tagName) : null;
  const elementBindable = element ? findBindableForAttribute(element.bindables, attrTarget) : null;

  const attribute = resolveAttribute(resources, attrTarget);
  const attributeBindable = attribute ? findPrimaryBindable(attribute) : null;

  const bindable = elementBindable ?? attributeBindable;
  if (!bindable) return [];

  const literals = extractStringLiteralUnion(bindable.type);
  if (!literals.length) return [];

  return literals
    .filter((value) => value.toLowerCase().startsWith(prefix))
    .sort()
    .map((value) => ({ label: value, source: "template", range }));
}

function collectBindingCommandCompletions(
  syntax: TemplateSyntaxRegistry,
  prefix: string,
  range: TextRange,
): CompletionItem[] {
  const lowerPrefix = prefix.toLowerCase();
  return Object.entries(syntax.bindingCommands ?? {})
    .filter(([name, cmd]) => !name.includes(".") && cmd.kind !== "translation")
    .map(([name, cmd]) => ({
      name,
      detail: cmd.kind,
    }))
    .filter((entry) => entry.name.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      label: entry.name,
      source: "template",
      range,
      ...(entry.detail ? { detail: entry.detail } : {}),
    }));
}

function findExpressionSpan(mapping: TemplateMappingArtifact | null, offset: number): SourceSpan | null {
  if (!mapping) return null;
  let best: SourceSpan | null = null;
  for (const entry of mapping.entries ?? []) {
    if (!spanContainsOffset(entry.htmlSpan, offset)) continue;
    if (!best || spanLength(entry.htmlSpan) < spanLength(best)) best = entry.htmlSpan;
  }
  return best;
}

function findPipeContext(
  text: string,
  offset: number,
): { kind: "value-converter" | "binding-behavior"; nameStart: number; nameEnd: number; prefix: string } | null {
  if (offset <= 0) return null;
  for (let i = Math.min(offset - 1, text.length - 1); i >= 0; i -= 1) {
    const code = text.charCodeAt(i);
    if (code === 124 /* | */) {
      if (text.charCodeAt(i - 1) === 124 || text.charCodeAt(i + 1) === 124) continue;
      return resolvePipeName(text, offset, i, "value-converter");
    }
    if (code === 38 /* & */) {
      if (text.charCodeAt(i - 1) === 38 || text.charCodeAt(i + 1) === 38) continue;
      return resolvePipeName(text, offset, i, "binding-behavior");
    }
  }
  return null;
}

function resolvePipeName(
  text: string,
  offset: number,
  operatorIndex: number,
  kind: "value-converter" | "binding-behavior",
): { kind: "value-converter" | "binding-behavior"; nameStart: number; nameEnd: number; prefix: string } | null {
  let i = operatorIndex + 1;
  while (i < text.length && isWhitespace(text.charCodeAt(i))) i += 1;
  const nameStart = i;
  while (i < text.length && isResourceNameChar(text.charCodeAt(i))) i += 1;
  const nameEnd = i;
  if (offset < nameStart || offset > nameEnd) return null;
  const prefix = text.slice(nameStart, Math.min(offset, nameEnd));
  return { kind, nameStart, nameEnd, prefix };
}

function findTagContext(text: string, offset: number): TagContext | null {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const tagStart = text.lastIndexOf("<", clamped);
  if (tagStart < 0) return null;
  const lastClose = text.lastIndexOf(">", clamped);
  if (lastClose > tagStart) return null;

  let i = tagStart + 1;
  const first = text.charCodeAt(i);
  if (first === 47 /* / */ || first === 33 /* ! */ || first === 63 /* ? */) return null;

  while (i < text.length && isWhitespace(text.charCodeAt(i))) i += 1;
  const nameStart = i;
  while (i < text.length && isTagNameChar(text.charCodeAt(i))) i += 1;
  const nameEnd = i;
  const rawTagName = text.slice(nameStart, nameEnd);
  const tagName = rawTagName.toLowerCase();

  if (clamped <= nameEnd) {
    return {
      kind: "tag-name",
      tagName,
      nameStart,
      nameEnd,
      prefix: text.slice(nameStart, clamped),
    };
  }

  const tagEnd = text.indexOf(">", tagStart + 1);
  const limit = tagEnd === -1 ? text.length : tagEnd;

  while (i < limit) {
    while (i < limit && isWhitespace(text.charCodeAt(i))) {
      if (clamped <= i) {
        return { kind: "attr-name", tagName, attrName: "", attrStart: clamped, attrEnd: clamped, prefix: "" };
      }
      i += 1;
    }
    if (i >= limit) break;
    if (text.charCodeAt(i) === 47 /* / */) {
      if (clamped <= i) {
        return { kind: "attr-name", tagName, attrName: "", attrStart: clamped, attrEnd: clamped, prefix: "" };
      }
      i += 1;
      continue;
    }

    const attrStart = i;
    while (i < limit && isAttrNameChar(text.charCodeAt(i))) i += 1;
    const attrEnd = i;
    const attrName = text.slice(attrStart, attrEnd);

    if (clamped <= attrEnd) {
      return {
        kind: "attr-name",
        tagName,
        attrName,
        attrStart,
        attrEnd,
        prefix: text.slice(attrStart, Math.min(clamped, attrEnd)),
      };
    }

    while (i < limit && isWhitespace(text.charCodeAt(i))) i += 1;
    if (i >= limit) break;
    if (text.charCodeAt(i) !== 61 /* = */) continue;
    i += 1;
    while (i < limit && isWhitespace(text.charCodeAt(i))) i += 1;
    if (i >= limit) break;

    const valueStart = i;
    const quote = text.charCodeAt(i);
    if (quote === 34 /* " */ || quote === 39 /* ' */) {
      i += 1;
      const contentStart = i;
      while (i < limit && text.charCodeAt(i) !== quote) i += 1;
      const contentEnd = i;
      if (clamped >= contentStart && clamped <= contentEnd) {
        return {
          kind: "attr-value",
          tagName,
          attrName,
          valueStart: contentStart,
          valueEnd: contentEnd,
          prefix: text.slice(contentStart, Math.min(clamped, contentEnd)),
        };
      }
      if (i < limit) i += 1;
      continue;
    }

    while (i < limit && !isWhitespace(text.charCodeAt(i)) && text.charCodeAt(i) !== 62 /* > */) i += 1;
    const contentEnd = i;
    if (clamped >= valueStart && clamped <= contentEnd) {
      return {
        kind: "attr-value",
        tagName,
        attrName,
        valueStart,
        valueEnd: contentEnd,
        prefix: text.slice(valueStart, Math.min(clamped, contentEnd)),
      };
    }
  }

  return { kind: "attr-name", tagName, attrName: "", attrStart: clamped, attrEnd: clamped, prefix: "" };
}

function parseBindingCommandContext(
  typed: string,
  attrName: string,
  syntax: TemplateSyntaxRegistry,
): { commandOffset: number; rangeStart: number; rangeEnd: number } | null {
  const candidates = commandDelimitersForPatterns(syntax);
  let best: { commandOffset: number; rangeStart: number; rangeEnd: number } | null = null;

  for (const candidate of candidates) {
    const { delimiter, symbols } = candidate;
    const typedIndex = typed.lastIndexOf(delimiter);
    if (typedIndex < 0) continue;

    const afterTyped = typed.slice(typedIndex + delimiter.length);
    if (containsSymbol(afterTyped, symbols)) continue;

    const fullIndex = attrName.lastIndexOf(delimiter);
    if (fullIndex < 0) continue;

    const rangeStart = fullIndex + delimiter.length;
    const rangeEnd = findNextSymbol(attrName, symbols, rangeStart) ?? attrName.length;
    const commandOffset = typedIndex + delimiter.length;

    if (!best || commandOffset > best.commandOffset) {
      best = { commandOffset, rangeStart, rangeEnd };
    }
  }

  return best;
}

function commandDelimitersForPatterns(
  syntax: TemplateSyntaxRegistry,
): Array<{ delimiter: string; symbols: string }> {
  const results: Array<{ delimiter: string; symbols: string }> = [];
  const seen = new Set<string>();
  for (const pattern of syntax.attributePatterns ?? []) {
    if (pattern.interpret.kind !== "target-command") continue;
    const delimiter = commandDelimiter(pattern.pattern);
    if (!delimiter) continue;
    const key = `${delimiter}|${pattern.symbols}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ delimiter, symbols: pattern.symbols });
  }
  return results;
}

function commandDelimiter(pattern: string): string | null {
  const positions: number[] = [];
  let idx = 0;
  while (idx < pattern.length) {
    const found = pattern.indexOf("PART", idx);
    if (found < 0) break;
    positions.push(found);
    idx = found + 4;
  }
  if (positions.length < 2) return null;
  const prevEnd = positions[positions.length - 2]! + 4;
  const lastStart = positions[positions.length - 1]!;
  const delimiter = pattern.slice(prevEnd, lastStart);
  return delimiter.length ? delimiter : null;
}

function containsSymbol(text: string, symbols: string): boolean {
  if (!symbols) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (symbols.includes(text[i]!)) return true;
  }
  return false;
}

function findNextSymbol(text: string, symbols: string, start: number): number | null {
  if (!symbols) return null;
  for (let i = start; i < text.length; i += 1) {
    if (symbols.includes(text[i]!)) return i;
  }
  return null;
}

function leadingAttributeSymbol(attrName: string, syntax: TemplateSyntaxRegistry): string | null {
  for (const pattern of syntax.attributePatterns ?? []) {
    const isSymbolPattern = pattern.interpret.kind === "fixed-command"
      || (pattern.interpret.kind === "event-modifier" && pattern.interpret.injectCommand);
    if (!isSymbolPattern) continue;
    const symbol = leadingPatternSymbol(pattern.pattern, pattern.symbols);
    if (symbol && attrName.startsWith(symbol)) return symbol;
  }
  return null;
}

function leadingPatternSymbol(pattern: string, symbols: string): string | null {
  const partIndex = pattern.indexOf("PART");
  if (partIndex <= 0) return null;
  const prefix = pattern.slice(0, partIndex);
  if (!prefix) return null;
  if (symbols) {
    for (let i = 0; i < prefix.length; i += 1) {
      if (!symbols.includes(prefix[i]!)) return null;
    }
  }
  return prefix;
}

function normalizeAttributeTarget(
  attrName: string,
  syntax: TemplateSyntaxRegistry,
  attrParser: AttributeParser,
): string {
  const trimmed = attrName.trim();
  if (!trimmed) return "";
  const analysis = analyzeAttributeName(trimmed, syntax, attrParser);
  const targetSpan = analysis.targetSpan ?? (analysis.syntax.command ? null : { start: 0, end: trimmed.length });
  if (!targetSpan) return "";
  return trimmed.slice(targetSpan.start, targetSpan.end).toLowerCase();
}

function resolveElement(resources: ResourceCollections, tagName: string): ElementRes | null {
  const normalized = tagName.toLowerCase();
  const direct = resources.elements[normalized];
  if (direct) return direct;
  for (const el of Object.values(resources.elements)) {
    if (!el.aliases) continue;
    if (el.aliases.some((alias) => alias.toLowerCase() === normalized)) return el;
  }
  return null;
}

function resolveAttribute(resources: ResourceCollections, name: string): AttrRes | null {
  const normalized = name.toLowerCase();
  const direct = resources.attributes[normalized];
  if (direct) return direct;
  for (const attr of Object.values(resources.attributes)) {
    if (!attr.aliases) continue;
    if (attr.aliases.some((alias) => alias.toLowerCase() === normalized)) return attr;
  }
  return null;
}

function findBindableForAttribute(
  bindables: Readonly<Record<string, Bindable>> | undefined,
  attrName: string,
): Bindable | null {
  if (!bindables) return null;
  const normalized = attrName.toLowerCase();
  for (const bindable of Object.values(bindables)) {
    const attr = (bindable.attribute ?? bindable.name).toLowerCase();
    if (attr === normalized) return bindable;
  }
  return null;
}

function findPrimaryBindable(attr: AttrRes): Bindable | null {
  const key = attr.primary ?? Object.keys(attr.bindables ?? {})[0];
  if (!key) return null;
  return attr.bindables[key] ?? null;
}

function extractStringLiteralUnion(type: TypeRef | undefined): string[] {
  if (!type || type.kind !== "ts") return [];
  const values: string[] = [];
  const regex = /(['"])([^'"]+)\1/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(type.name)) !== null) {
    const value = match[2];
    if (value) values.push(value);
  }
  return Array.from(new Set(values));
}

function typeRefToString(type: TypeRef | undefined): string | undefined {
  if (!type) return undefined;
  switch (type.kind) {
    case "ts":
      return type.name;
    case "any":
      return "any";
    case "unknown":
      return "unknown";
    default:
      return undefined;
  }
}

function rangeFromOffsets(text: string, start: number, end: number): TextRange {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  return {
    start: positionAtOffset(text, safeStart),
    end: positionAtOffset(text, safeEnd),
  };
}

function isWhitespace(code: number): boolean {
  return code === 32 /* space */ || code === 9 /* tab */ || code === 10 /* lf */ || code === 13 /* cr */;
}

function isTagNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 /* - */ ||
    code === 58 /* : */
  );
}

function isAttrNameChar(code: number): boolean {
  return (
    isTagNameChar(code) ||
    code === 46 /* . */ ||
    code === 64 /* @ */ ||
    code === 95 /* _ */
  );
}

function isResourceNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 /* - */ ||
    code === 95 /* _ */
  );
}

type CompilerDiagnosticContext = {
  vmDisplayName?: string;
  vmRootTypeExpr?: string;
  overlay?: OverlayDocumentSnapshot | null | undefined;
  provenance?: ProvenanceIndex | undefined;
  typescript?: TypeScriptServices | undefined;
  typeNames?: TypeNameMap | undefined;
};

function mapCompilerDiagnostic(
  diag: CompilerDiagnostic,
  templateUri: DocumentUri,
  templateFile: SourceFileId,
  context?: CompilerDiagnosticContext,
): TemplateLanguageDiagnostic | null {
  const targetSpan = diagnosticSpan(diag);
  const location = targetSpan ? { uri: templateUri, span: resolveSourceSpan(targetSpan, templateFile) } : null;
  const related = (diag.related ?? []).map((rel) => ({
    message: rel.message,
    location: rel.span ? { uri: templateUri, span: resolveSourceSpan(rel.span, templateFile) } : null,
  }));

  if (isTypecheckMismatch(diag)) {
    const vmDisplayName = context?.vmDisplayName ?? "Component";
    const hit =
      targetSpan && context?.provenance
        ? context.provenance.lookupSource(templateUri, targetSpan.start)
        : null;
    const overlaySpan = hit?.edge.from.span ?? null;
    const quickInfoType = lookupQuickInfoType(
      context?.typescript,
      context?.overlay ?? null,
      overlaySpan,
      hit,
      context?.typeNames ?? EMPTY_TYPE_NAMES,
    );
    const expected = diag.expected ?? null;
    const actual = quickInfoType ?? diag.actual ?? null;

    if (quickInfoType && expected && typeTextMatches(expected, quickInfoType)) {
      return null;
    }

    const subject = hit?.memberPath ? `${vmDisplayName}.${hit.memberPath}` : vmDisplayName;
    return {
      code: diag.code,
      message: hit?.memberPath
        ? `Type mismatch on ${subject}: expected ${expected ?? "unknown"}, got ${actual ?? "unknown"}`
        : `Type mismatch: expected ${expected ?? "unknown"}, got ${actual ?? "unknown"}`,
      source: diag.source,
      severity: diag.severity,
      location,
      ...(related.length ? { related } : {}),
    };
  }

  return {
    code: diag.code,
    message: diag.message,
    source: diag.source,
    severity: diag.severity,
    location,
    ...(related.length ? { related } : {}),
  };
}

function isTypecheckMismatch(diag: CompilerDiagnostic): diag is TypecheckDiagnostic {
  // AU1301 = error, AU1302 = warning, AU1303 = info (all are type mismatches)
  return (diag.code === "AU1301" || diag.code === "AU1302" || diag.code === "AU1303") && diag.source === "typecheck";
}

function lookupQuickInfoType(
  ts: TypeScriptServices | undefined,
  overlay: OverlayDocumentSnapshot | null,
  overlaySpan: SourceSpan | null,
  hit: TemplateProvenanceHit | null,
  typeNames: TypeNameMap,
): string | null {
  if (!ts?.getQuickInfo || !overlay || !overlaySpan) return null;
  // Prefer the exact member segment when available; otherwise sample the span center.
  const probe = hit?.edge.from.span ?? overlaySpan;
  const center = probe.start + Math.max(0, Math.floor(spanLength(probe) / 2));
  const info = ts.getQuickInfo(overlay, center);
  if (!info?.text) return null;
  const parsed = parseQuickInfoType(info.text);
  return parsed ? rewriteTypeNames(parsed, typeNames) : null;
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

function typeTextMatches(expected: string, actual: string): boolean {
  const norm = (t: string) => t.replace(/\s+/g, "").replace(/^\(+/, "").replace(/\)+$/, "");
  if (norm(expected) === norm(actual)) return true;
  if (expected.trim() === "Function") {
    return /=>/.test(actual) || /\bFunction\b/.test(actual) || /\bfunction\b/.test(actual);
  }
  return false;
}

function mapOverlayOffsetToTemplate(
  overlayUri: DocumentUri,
  overlayOffset: number,
  provenance: ProvenanceIndex,
  sources: { get(uri: DocumentUri): DocumentSnapshot | null },
): Location | null {
  const mapped = projectGeneratedOffsetToDocumentSpan(provenance, overlayUri, overlayOffset);
  if (!mapped) return null;
  const snap = sources.get(mapped.uri);
  if (!snap) return null;
  return { uri: mapped.uri, range: spanToRange(mapped.span, snap.text) };
}

function collectOverlayUris(provenance: ProvenanceIndex): Set<DocumentUri> {
  const overlayUris = new Set<DocumentUri>();
  const stats = provenance.stats();
  for (const doc of stats.documents) {
    const overlayUri = provenance.templateStats(doc.uri).overlayUri;
    if (overlayUri) overlayUris.add(overlayUri);
  }
  return overlayUris;
}

function mapTypeScriptDiagnostic(
  diag: TsDiagnostic,
  overlay: OverlayDocumentSnapshot,
  provenance: ProvenanceIndex,
  vmDisplayName: string,
  typeNames: TypeNameMap,
): TemplateLanguageDiagnostic {
  const overlaySpan = tsSpan(diag, overlay.file);
  // Note: We intentionally do NOT use overlayLocation - the overlay file is an internal implementation detail.
  const _overlayLocation = overlaySpan ? { uri: overlay.uri, span: overlaySpan } : null;
  const provenanceHit = overlaySpan ? provenance.projectGeneratedSpan(overlay.uri, overlaySpan) : null;
  const mappedLocation = provenanceHit ? provenanceHitToDocumentSpan(provenanceHit) : null;

  const related: DiagnosticRelatedInfo[] = [];
  // Note: We intentionally do NOT add the overlay location as related info.
  // The overlay file is an internal implementation detail and should not be exposed to users.

  for (const rel of diag.relatedInformation ?? []) {
    const relCanonical = rel.fileName ? canonicalDocumentUri(rel.fileName) : canonicalDocumentUri(overlay.uri);
    const relSpan = tsSpan(rel, relCanonical.file);
    const relUri = relCanonical.uri;
    const relHit = relSpan ? provenance.projectGeneratedSpan(relUri, relSpan) : null;
    const relMapped = relHit ? provenanceHitToDocumentSpan(relHit) : null;

    // If provenance mapping succeeded, use the mapped location.
    // If it failed but the location is in an overlay file, fall back to template URI.
    // This ensures we never expose internal overlay file paths to users.
    const isOverlayFile = relUri === overlay.uri || isOverlayPath(relCanonical.path);
    const fallbackLocation = isOverlayFile && relSpan
      ? { uri: overlay.templateUri, span: relSpan }
      : relSpan ? { uri: relUri, span: relSpan } : null;

    related.push({
      message: rewriteTypeNames(flattenTsMessage(rel.messageText), typeNames),
      location: relMapped ?? fallbackLocation,
    });
  }

  const severity = tsCategoryToSeverity(diag.category);
  const message = formatTypeScriptMessage(diag, vmDisplayName, provenanceHit, typeNames);

  // If provenance mapping failed, fall back to template URI instead of overlay URI.
  // This ensures we never expose internal overlay file paths to users.
  const fallbackLocation = overlaySpan
    ? { uri: overlay.templateUri, span: overlaySpan }
    : null;

  return {
    code: diag.code ?? "TS",
    message,
    source: "typescript",
    severity,
    location: mappedLocation ?? fallbackLocation,
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
    if (!alias || !friendly || alias === friendly) continue;
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
  for (const tpl of compilation.overlayPlan.templates ?? []) {
    if (tpl.vmType?.alias) {
      const friendly = tpl.vmType.displayName ?? tpl.vmType.typeExpr;
      if (friendly && friendly !== tpl.vmType.alias) {
        map.set(tpl.vmType.alias, friendly);
      }
    }
    const frameLabelBase = tpl.vmType?.displayName ?? "frame";
    for (const frame of tpl.frames ?? []) {
      if (!frame.typeName) continue;
      const label = `${frameLabelBase} ${frame.frame}`;
      if (label !== frame.typeName) map.set(frame.typeName, label);
    }
  }
  return map;
}

function formatTypeScriptMessage(
  diag: TsDiagnostic,
  vmDisplayName: string,
  hit: TemplateProvenanceHit | null,
  typeNames: TypeNameMap,
): string {
  if (hit?.memberPath) {
    return `Property '${hit.memberPath}' does not exist on ${vmDisplayName}`;
  }
  return rewriteTypeNames(flattenTsMessage(diag.messageText), typeNames);
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

/**
 * Checks if a path looks like an overlay file path.
 * Overlay files have patterns like `.__au.ttc.overlay.ts` or similar.
 */
function isOverlayPath(path: string): boolean {
  return path.includes(".__au.") && path.includes(".overlay.");
}
