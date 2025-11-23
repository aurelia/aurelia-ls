import { diagnosticSpan, type CompilerDiagnostic, type DiagnosticSeverity } from "../compiler/diagnostics.js";
import type { SourceFileId } from "../compiler/model/identity.js";
import { resolveSourceSpan } from "../compiler/model/source.js";
import { spanEquals, type SourceSpan, type SpanLike } from "../compiler/model/span.js";
import type { DocumentUri, TemplateExprId, TemplateNodeId } from "./primitives.js";
import { canonicalDocumentUri, normalizeDocumentUri } from "./paths.js";
import type { ProvenanceIndex } from "./provenance.js";
import type { TemplateProgram } from "./program.js";
import type { CompileOverlayResult, CompileSsrResult } from "../compiler/facade.js";

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

export interface OverlayDocumentSnapshot {
  uri: DocumentUri;
  file: SourceFileId;
  text: string;
  templateUri: DocumentUri;
}

export interface TypeScriptServices {
  getDiagnostics(overlay: OverlayDocumentSnapshot): readonly TsDiagnostic[];
}

export interface TemplateLanguageServiceOptions {
  typescript?: TypeScriptServices;
}

export interface CompletionItem {
  label: string;
  detail?: string;
  documentation?: string;
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

  getHover(_uri: DocumentUri, _position: Position): HoverInfo | null {
    // TODO: wire TemplateProgram.getQuery + provenance to surface expression info.
    return null;
  }

  getCompletions(_uri: DocumentUri, _position: Position): CompletionItem[] {
    // TODO: drive completions from scope graph + VM reflection.
    return [];
  }

  getDefinition(_uri: DocumentUri, _position: Position): Location[] {
    // TODO: combine provenance + VM reflection for template <-> overlay jumps.
    return [];
  }

  getReferences(_uri: DocumentUri, _position: Position): Location[] {
    // TODO: add symbol index + provenance for cross-file references.
    return [];
  }

  getCodeActions(_uri: DocumentUri, _range: TextRange): TextEdit[] {
    // TODO: add quick-fix providers once diagnostics stabilize.
    return [];
  }

  renameSymbol(_uri: DocumentUri, _position: Position, _newName: string): TextEdit[] {
    // TODO: combine provenance + TS/VM symbol info for safe renames.
    return [];
  }

  private collectTypeScriptDiagnostics(uri: DocumentUri): TemplateLanguageDiagnostic[] {
    const ts = this.options.typescript;
    if (!ts) return [];

    const overlay = this.program.getOverlay(uri);
    const overlayCanonical = canonicalDocumentUri(overlay.overlayPath);
    const overlayDoc: OverlayDocumentSnapshot = {
      uri: overlayCanonical.uri,
      file: overlayCanonical.file,
      text: overlay.text,
      templateUri: canonicalDocumentUri(uri).uri,
    };

    const raw = ts.getDiagnostics(overlayDoc) ?? [];
    return raw.map((diag) => mapTypeScriptDiagnostic(diag, overlayDoc, this.program.provenance));
  }
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
