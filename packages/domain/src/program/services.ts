import { diagnosticSpan, type CompilerDiagnostic, type DiagnosticSeverity } from "../compiler/diagnostics.js";
import type { SourceFileId } from "../compiler/model/identity.js";
import { resolveSourceSpan } from "../compiler/model/source.js";
import { spanEquals, spanLength, type SourceSpan, type SpanLike } from "../compiler/model/span.js";
import type { DocumentSnapshot, DocumentUri, TemplateExprId, TemplateNodeId } from "./primitives.js";
import { canonicalDocumentUri, normalizeDocumentUri, type CanonicalDocumentUri } from "./paths.js";
import type { ProvenanceIndex, TemplateProvenanceHit } from "./provenance.js";
import type { TemplateProgram } from "./program.js";
import type { CompileOverlayResult, CompileSsrResult } from "../compiler/facade.js";
import type { TemplateBindableInfo, TemplateQueryFacade } from "../contracts.js";

export interface Position {
  line: number;
  character: number;
}

export interface TextRange {
  start: Position;
  end: Position;
}

export interface TextEdit {
  uri: DocumentUri;
  range: TextRange;
  newText: string;
}

export interface Location {
  uri: DocumentUri;
  range: TextRange;
}

export interface HoverInfo {
  contents: string;
  range: TextRange;
}

export interface DocumentSpan {
  uri: DocumentUri;
  span: SourceSpan;
  exprId?: TemplateExprId;
  nodeId?: TemplateNodeId;
  memberPath?: string;
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
}

export interface TemplateLanguageServiceOptions {
  typescript?: TypeScriptServices;
}

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
  getCodeActions(uri: DocumentUri, range: TextRange): TextEdit[];
  renameSymbol(uri: DocumentUri, position: Position, newName: string): TextEdit[];
}

export interface TemplateBuildService {
  getOverlay(uri: DocumentUri): CompileOverlayResult;
  getSsr(uri: DocumentUri): CompileSsrResult;
}

export class DefaultTemplateLanguageService implements TemplateLanguageService, TemplateBuildService {
  constructor(private readonly program: TemplateProgram, private readonly options: TemplateLanguageServiceOptions = {}) {}

  getDiagnostics(uri: DocumentUri): TemplateLanguageDiagnostics {
    const canonical = canonicalDocumentUri(uri);
    const compiler = this.program
      .getDiagnostics(canonical.uri)
      .all
      .map((diag) => mapCompilerDiagnostic(diag, canonical.uri, canonical.file));

    const typescript = this.collectTypeScriptDiagnostics(canonical.uri);
    const all = [...compiler, ...typescript];

    return { all, compiler, typescript };
  }

  getOverlay(uri: DocumentUri): CompileOverlayResult {
    return this.program.getOverlay(uri);
  }

  getSsr(uri: DocumentUri): CompileSsrResult {
    return this.program.getSsr(uri);
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

    const overlayHit = this.program.provenance.lookupSource(canonical.uri, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = projectOverlayOffset(overlayHit, offset);
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

    const overlayHit = this.program.provenance.lookupSource(canonical.uri, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = projectOverlayOffset(overlayHit, offset);
    const results = ts.getReferences(overlay, overlayOffset) ?? [];
    return this.mapTypeScriptLocations(results, overlay);
  }

  getCodeActions(_uri: DocumentUri, _range: TextRange): TextEdit[] {
    // TODO: add quick-fix providers once diagnostics stabilize.
    return [];
  }

  renameSymbol(_uri: DocumentUri, _position: Position, _newName: string): TextEdit[] {
    // TODO: combine provenance + TS/VM symbol info for safe renames.
    return [];
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

    const overlayHit = this.program.provenance.lookupSource(canonical.uri, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = projectOverlayOffset(overlayHit, offset);
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
      const mapped = overlaySpan ? mapOverlaySpanToTemplate(overlaySpan, overlay, this.program.provenance) : null;
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

  private requireSnapshot(canonical: CanonicalDocumentUri): DocumentSnapshot {
    const snap = this.program.sources.get(canonical.uri);
    if (!snap) {
      throw new Error(`TemplateLanguageService: no snapshot for document ${String(canonical.uri)}. Call upsertTemplate(...) first.`);
    }
    return snap;
  }

  private overlaySnapshot(templateUri: DocumentUri): OverlayDocumentSnapshot {
    const overlay = this.program.getOverlay(templateUri);
    const overlayCanonical = canonicalDocumentUri(overlay.overlayPath);
    const templateCanonical = canonicalDocumentUri(templateUri);
    return {
      uri: overlayCanonical.uri,
      file: overlayCanonical.file,
      text: overlay.text,
      templateUri: templateCanonical.uri,
    };
  }

  private collectTypeScriptHover(
    canonical: CanonicalDocumentUri,
    snapshot: DocumentSnapshot,
    offset: number,
  ): { text: string; span?: SourceSpan } | null {
    const ts = this.options.typescript;
    if (!ts?.getQuickInfo) return null;

    const overlayHit = this.program.provenance.lookupSource(canonical.uri, offset);
    if (!overlayHit) return null;

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = projectOverlayOffset(overlayHit, offset);
    const info = ts.getQuickInfo(overlay, overlayOffset);
    if (!info) return null;

    const overlaySpan = resolveSourceSpan(
      { start: info.start ?? overlayOffset, end: (info.start ?? overlayOffset) + (info.length ?? 0) },
      overlay.file,
    );
    const mapped = mapOverlaySpanToTemplate(overlaySpan, overlay, this.program.provenance);
    const hoverSpan = mapped?.span ?? overlayHit.edge.to.span ?? resolveSourceSpan({ start: offset, end: offset }, snapshot.uri);
    const text = info.documentation ? `${info.text}\n\n${info.documentation}` : info.text;
    return { text, span: hoverSpan };
  }

  private mapTypeScriptLocations(locations: readonly TsLocation[], overlay: OverlayDocumentSnapshot): Location[] {
    const results: Location[] = [];
    const seen = new Set<string>();
    for (const loc of locations ?? []) {
      const range = normalizeRange(loc.range);
      if (!range) continue;
      const normalizedUri = canonicalDocumentUri(loc.fileName).uri;
      const mapped = normalizedUri === overlay.uri
        ? mapOverlayLocationToTemplate(range, overlay, this.program.provenance, this.program.sources)
        : null;
      const target = mapped ?? { uri: normalizedUri, range };
      const key = locationKey(target);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(target);
    }
    return results;
  }

  private collectTypeScriptDiagnostics(uri: DocumentUri): TemplateLanguageDiagnostic[] {
    const ts = this.options.typescript;
    if (!ts) return [];

    const overlayDoc = this.overlaySnapshot(uri);
    const raw = ts.getDiagnostics(overlayDoc) ?? [];
    return raw.map((diag) => mapTypeScriptDiagnostic(diag, overlayDoc, this.program.provenance));
  }
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

function mapCompilerDiagnostic(
  diag: CompilerDiagnostic,
  templateUri: DocumentUri,
  templateFile: SourceFileId,
): TemplateLanguageDiagnostic {
  const targetSpan = diagnosticSpan(diag);
  const location = targetSpan ? { uri: templateUri, span: resolveSourceSpan(targetSpan, templateFile) } : null;
  const related = (diag.related ?? []).map((rel) => ({
    message: rel.message,
    location: rel.span ? { uri: templateUri, span: resolveSourceSpan(rel.span, templateFile) } : null,
  }));

  return {
    code: diag.code,
    message: diag.message,
    source: diag.source,
    severity: diag.severity,
    location,
    ...(related.length ? { related } : {}),
  };
}

function mapOverlaySpanToTemplate(
  overlaySpan: SourceSpan,
  overlay: OverlayDocumentSnapshot,
  provenance: ProvenanceIndex,
): DocumentSpan | null {
  const hit = provenance.lookupGenerated(overlay.uri, overlaySpan.start);
  if (!hit) return null;
  return provenanceLocation(hit);
}

function mapOverlayLocationToTemplate(
  range: TextRange,
  overlay: OverlayDocumentSnapshot,
  provenance: ProvenanceIndex,
  sources: { get(uri: DocumentUri): DocumentSnapshot | null },
): Location | null {
  const overlayOffset = offsetAtPosition(overlay.text, range.start);
  if (overlayOffset == null) return null;
  const hit = provenance.lookupGenerated(overlay.uri, overlayOffset);
  if (!hit) return null;
  const snap = sources.get(hit.edge.to.uri);
  if (!snap) return null;
  return { uri: hit.edge.to.uri, range: spanToRange(hit.edge.to.span, snap.text) };
}

function mapTypeScriptDiagnostic(
  diag: TsDiagnostic,
  overlay: OverlayDocumentSnapshot,
  provenance: ProvenanceIndex,
): TemplateLanguageDiagnostic {
  const overlaySpan = tsSpan(diag, overlay.file);
  const overlayLocation = overlaySpan ? { uri: overlay.uri, span: overlaySpan } : null;
  const provenanceHit = overlaySpan ? provenance.lookupGenerated(overlay.uri, overlaySpan.start) : null;
  const mappedLocation = provenanceHit ? provenanceLocation(provenanceHit) : null;

  const related: DiagnosticRelatedInfo[] = [];
  if (overlayLocation && mappedLocation && !sameLocation(overlayLocation, mappedLocation)) {
    related.push({ message: "overlay", location: overlayLocation });
  }

  for (const rel of diag.relatedInformation ?? []) {
    const relSpan = tsSpan(rel, rel.fileName ? canonicalDocumentUri(rel.fileName).file : overlay.file);
    const relUri = normalizeDocumentUri(rel.fileName ?? overlay.uri);
    const relLocation = relSpan ? { uri: relUri, span: relSpan } : null;
    related.push({ message: flattenTsMessage(rel.messageText), location: relLocation });
  }

  const severity = tsCategoryToSeverity(diag.category);
  return {
    code: diag.code ?? "TS",
    message: flattenTsMessage(diag.messageText),
    source: "typescript",
    severity,
    location: mappedLocation ?? overlayLocation,
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

function provenanceLocation(hit: ReturnType<ProvenanceIndex["lookupGenerated"]>): DocumentSpan | null {
  if (!hit) return null;
  const span = hit.edge.to.span;
  return {
    uri: hit.edge.to.uri,
    span,
    ...(hit.edge.to.nodeId ? { nodeId: hit.edge.to.nodeId } : {}),
    ...(hit.exprId ? { exprId: hit.exprId } : {}),
    ...(hit.memberPath ? { memberPath: hit.memberPath } : {}),
  };
}

function sameLocation(a: DocumentSpan, b: DocumentSpan): boolean {
  if (a.uri !== b.uri) return false;
  return spanEquals(stripMetadata(a.span), stripMetadata(b.span));
}

function stripMetadata(span: SpanLike): SpanLike {
  return { start: span.start, end: span.end };
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

function projectOverlayOffset(hit: TemplateProvenanceHit, templateOffset: number): number {
  const templateSpan = hit.edge.to.span;
  const overlaySpan = hit.edge.from.span;
  const relative = Math.max(0, templateOffset - templateSpan.start);
  const overlayRelative = Math.min(relative, spanLength(overlaySpan));
  return overlaySpan.start + overlayRelative;
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

function spanToRange(span: SourceSpan, text: string): TextRange {
  return {
    start: positionAtOffset(text, span.start),
    end: positionAtOffset(text, span.end),
  };
}

function positionAtOffset(text: string, offset: number): Position {
  const length = text.length;
  const clamped = Math.max(0, Math.min(offset, length));
  const lineStarts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) line += 1;
  const lineStart = lineStarts[line] ?? 0;
  const character = clamped - lineStart;
  return { line, character };
}

function offsetAtPosition(text: string, position: Position): number | null {
  if (position.line < 0 || position.character < 0) return null;
  const lineStarts = computeLineStarts(text);
  if (position.line >= lineStarts.length) return null;
  const lineStart = lineStarts[position.line];
  if (lineStart === undefined) return null;
  const nextLine = lineStarts[position.line + 1];
  const lineEnd = nextLine ?? text.length;
  return Math.min(lineEnd, lineStart + position.character);
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
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
