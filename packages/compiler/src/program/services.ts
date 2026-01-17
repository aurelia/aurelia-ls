// Model imports (via barrel)
import type { NormalizedPath, SourceFileId, SourceSpan, Position, TextRange } from "../model/index.js";
import {
  offsetAtPosition,
  positionAtOffset,
  resolveSourceSpan,
  spanLength,
  spanToRange,
} from "../model/index.js";

// Shared imports (via barrel)
import { diagnosticSpan, type CompilerDiagnostic, type DiagnosticSeverity } from "../shared/index.js";

// Pipeline imports (via barrel)
import { stableHash } from "../pipeline/index.js";

// Analysis imports (via barrel)
import type { TypecheckDiagnostic } from "../analysis/index.js";

// Synthesis imports (via barrel)
import type { TemplateBindableInfo, TemplateQueryFacade, TemplateMappingArtifact } from "../synthesis/index.js";

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

    const mapped = this.mapTypeScriptEdits(edits, overlay, true);
    return mapped ?? [];
  }

  private collectTemplateCompletions(query: TemplateQueryFacade, snapshot: DocumentSnapshot, offset: number): CompletionItem[] {
    // If we're inside an expression, lean on TypeScript completions instead of guesswork.
    if (query.exprAt(offset)) return [];
    const node = query.nodeAt(offset);
    if (!node) return [];
    const bindables = query.bindablesFor(node);
    if (!bindables?.length) return [];

    const range = wordRangeAtOffset(snapshot.text, offset);
    return bindables.map((bindable) => {
      const detail = describeBindable(bindable);
      return {
        label: bindable.name,
        source: "template" as const,
        range,
        ...(detail ? { detail } : {}),
        ...(bindable.type ? { documentation: bindable.type } : {}),
      };
    });
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

function describeBindable(bindable: TemplateBindableInfo): string | undefined {
  const mode = bindable.mode ? `[${bindable.mode}]` : null;
  const source = bindable.source;
  const type = bindable.type ? `: ${bindable.type}` : "";
  const parts: string[] = [source];
  if (mode) parts.push(mode);
  if (!parts.length && !type) return undefined;
  return `${parts.join(" ")}${type}`;
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

function wordRangeAtOffset(text: string, offset: number): TextRange {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let start = clamped;
  while (start > 0 && isIdentifierChar(text.charCodeAt(start - 1))) start -= 1;
  let end = clamped;
  while (end < text.length && isIdentifierChar(text.charCodeAt(end))) end += 1;
  return {
    start: positionAtOffset(text, start),
    end: positionAtOffset(text, end),
  };
}

function isIdentifierChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 /* _ */ ||
    code === 36 /* $ */ ||
    code === 45 /* - */ ||
    code === 46 /* . */ ||
    code === 58 /* : */
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
