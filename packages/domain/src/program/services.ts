import { diagnosticSpan, type CompilerDiagnostic, type DiagnosticSeverity } from "../compiler/diagnostics.js";
import { normalizePathForId, type SourceFileId, type NormalizedPath } from "../compiler/model/identity.js";
import { resolveSourceSpan } from "../compiler/model/source.js";
import { spanEquals, spanLength, type SourceSpan, type SpanLike } from "../compiler/model/span.js";
import type { DocumentSnapshot, DocumentUri, TemplateExprId, TemplateNodeId } from "./primitives.js";
import { canonicalDocumentUri, deriveTemplatePaths, normalizeDocumentUri, type CanonicalDocumentUri } from "./paths.js";
import type { TemplateCompilation } from "../compiler/facade.js";
import type { ProvenanceIndex, TemplateProvenanceHit } from "./provenance.js";
import type { TemplateProgram } from "./program.js";
import type { TemplateBindableInfo, TemplateMappingArtifact, TemplateQueryFacade, SsrMappingArtifact } from "../contracts.js";
import { stableHash } from "../compiler/pipeline/hash.js";
import type { TypecheckDiagnostic } from "../compiler/phases/40-typecheck/typecheck.js";

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

export interface DocumentSpan {
  uri: DocumentUri;
  span: SourceSpan;
  exprId?: TemplateExprId;
  nodeId?: TemplateNodeId;
  memberPath?: string;
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

export interface SsrBuildArtifact {
  template: BuildSnapshot;
  baseName: string;
  html: BuildSnapshot & { text: string };
  manifest: BuildSnapshot & { text: string };
  mapping: SsrMappingArtifact;
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
  getSsr(uri: DocumentUri): SsrBuildArtifact;
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

  getSsr(uri: DocumentUri): SsrBuildArtifact {
    const canonical = canonicalDocumentUri(uri);
    const paths = deriveTemplatePaths(canonical.uri, overlayOptions(this.program));
    const template = this.requireSnapshot(canonical);
    const ssr = this.program.getSsr(canonical.uri);
    const htmlDoc: BuildDocument = {
      uri: paths.ssr.htmlUri,
      path: paths.ssr.htmlPath,
      file: paths.ssr.htmlFile,
    };
    const manifestDoc: BuildDocument = {
      uri: paths.ssr.manifestUri,
      path: paths.ssr.manifestPath,
      file: paths.ssr.manifestFile,
    };

    return {
      template: buildSnapshot(canonical, template.version, stableHash(template.text)),
      baseName: paths.ssr.baseName,
      html: {
        ...buildSnapshot(htmlDoc, template.version, stableHash(ssr.htmlText)),
        text: ssr.htmlText,
      },
      manifest: {
        ...buildSnapshot(manifestDoc, template.version, stableHash(ssr.manifestText)),
        text: ssr.manifestText,
      },
      mapping: ssr.mapping,
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

  getSsr(uri: DocumentUri): SsrBuildArtifact {
    return this.build.getSsr(uri);
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

    const overlayHit = this.lookupOverlayHit(canonical.uri, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = this.overlayOffsetForHit(overlayHit, offset, canonical.uri);
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

    const overlayHit = this.lookupOverlayHit(canonical.uri, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = this.overlayOffsetForHit(overlayHit, offset, canonical.uri);
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

    const overlayHit = this.lookupOverlayHit(canonical.uri, offset);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = overlayOffsetFromHit(overlayHit, offset);
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

    const overlayHit = this.lookupOverlayHit(canonical.uri, offset);
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

    const overlayHit = this.lookupOverlayHit(canonical.uri, start);
    if (!overlayHit) return [];

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayStart = this.overlayOffsetForHit(overlayHit, start, canonical.uri);
    const overlayEnd = this.overlayOffsetForHit(overlayHit, end, canonical.uri);
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

    const overlayHit = this.lookupOverlayHit(canonical.uri, offset);
    if (!overlayHit) return null;

    const overlay = this.overlaySnapshot(canonical.uri);
    const overlayOffset = this.overlayOffsetForHit(overlayHit, offset, canonical.uri);
    const info = ts.getQuickInfo(overlay, overlayOffset);
    if (!info) return null;
    const typeNames = this.typeNamesFor(canonical);

    const overlaySpan = resolveSourceSpan(
      { start: info.start ?? overlayOffset, end: (info.start ?? overlayOffset) + (info.length ?? 0) },
      overlay.file,
    );
    const mapped = mapOverlaySpanToTemplate(overlaySpan, overlay, this.program.provenance);
    const hoverSpan = mapped?.span ?? overlayHit.edge.to.span ?? resolveSourceSpan({ start: offset, end: offset }, snapshot.uri);
    const rewrittenText = rewriteTypeNames(info.text, typeNames);
    const text = info.documentation ? `${rewrittenText}\n\n${info.documentation}` : rewrittenText;
    return { text, span: hoverSpan };
  }

  private mapTypeScriptLocations(locations: readonly TsLocation[], overlay: OverlayDocumentSnapshot): Location[] {
    const results: Location[] = [];
    const seen = new Set<string>();
    for (const loc of locations ?? []) {
      const mapped = this.mapProvenanceLocation(loc, overlay);
      const range = mapped?.range ?? normalizeRange(loc.range);
      if (!range) continue;
      const target = mapped ?? { uri: canonicalDocumentUri(loc.fileName).uri, range };
      const key = locationKey(target);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(target);
    }
    return results;
  }

  private mapProvenanceLocation(loc: TsLocation, overlay: OverlayDocumentSnapshot): Location | null {
    const canonical = canonicalDocumentUri(loc.fileName).uri;
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
    const overlayKey = overlayUri ? normalizePathForId(overlayUri).toLowerCase() : null;
    const overlayKeys = new Set<string>();
    if (overlayKey) overlayKeys.add(overlayKey);
    for (const uri of collectOverlayUris(this.program.provenance)) {
      overlayKeys.add(normalizePathForId(uri).toLowerCase());
    }
    let mappedOverlayEdits = 0;
    let unmappedOverlayEdits = 0;
    let overlayEdits = 0;

    for (const edit of edits) {
      const normalizedUri = canonicalDocumentUri(edit.fileName).uri;
      const normalizedKey = normalizePathForId(normalizedUri).toLowerCase();
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
    const overlayOffset = this.overlayOffsetForEdit(edit, overlayUri, overlay);
    if (overlayOffset == null) return null;
    const mapped = mapOverlayOffsetToTemplate(overlayUri, overlayOffset, this.program.provenance, this.program.sources);
    return mapped ? { uri: mapped.uri, range: mapped.range, newText: edit.newText } : null;
  }

  private lookupOverlayHit(uri: DocumentUri, offset: number): TemplateProvenanceHit | null {
    const hit = this.program.provenance.lookupSource(uri, offset);
    if (hit) return hit;
    try {
      // Ensure overlay + mapping are materialized; the program caches compilation so this is cheap after first call.
      this.build.getOverlay(uri);
    } catch {
      return null;
    }
    return this.program.provenance.lookupSource(uri, offset);
  }

  private overlayOffsetForHit(hit: TemplateProvenanceHit, templateOffset: number, templateUri: DocumentUri): number {
    if (hit.edge.kind === "overlayMember") {
      const span = hit.edge.from.span;
      return span.start + Math.max(0, Math.floor(spanLength(span) / 2));
    }
    if (hit.exprId) {
      const memberSpan = this.overlayMemberSpan(templateUri, hit.exprId);
      if (memberSpan) return memberSpan.start + Math.max(0, Math.floor(spanLength(memberSpan) / 2));
    }
    return projectOverlayOffset(hit, templateOffset);
  }

  private overlayMemberSpan(templateUri: DocumentUri, exprId: TemplateExprId): SourceSpan | null {
    const mapping = this.program.getMapping(templateUri);
    if (!mapping) return null;
    const entry = mapping.entries.find((e) => e.exprId === exprId && e.segments && e.segments.length > 0);
    if (!entry) return null;
    return entry.segments![0]!.overlaySpan;
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

  private overlayOffsetForEdit(
    edit: Pick<TsTextEdit, "start" | "range">,
    overlayUri: DocumentUri,
    overlay: OverlayDocumentSnapshot | null,
  ): number | null {
    if (edit.start != null) return edit.start;
    if (!edit.range || !overlay || overlay.uri !== overlayUri) return null;
    return offsetAtPosition(overlay.text, edit.range.start);
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
  return overlayBaseName === undefined ? { isJs } : { isJs, overlayBaseName };
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
  return diag.code === "AU1301" && diag.source === "typecheck";
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

function mapOverlaySpanToTemplate(
  overlaySpan: SourceSpan,
  overlay: OverlayDocumentSnapshot,
  provenance: ProvenanceIndex,
): DocumentSpan | null {
  const hit = provenance.lookupGenerated(overlay.uri, overlaySpan.start);
  if (!hit) return null;
  return provenanceLocation(hit);
}

function mapOverlayOffsetToTemplate(
  overlayUri: DocumentUri,
  overlayOffset: number,
  provenance: ProvenanceIndex,
  sources: { get(uri: DocumentUri): DocumentSnapshot | null },
): Location | null {
  const hit = provenance.lookupGenerated(overlayUri, overlayOffset);
  if (!hit) return null;
  const snap = sources.get(hit.edge.to.uri);
  if (!snap) return null;
  return { uri: hit.edge.to.uri, range: spanToRange(hit.edge.to.span, snap.text) };
}

function collectOverlayUris(provenance: ProvenanceIndex): Set<DocumentUri> {
  const overlayUris = new Set<DocumentUri>();
  const stats = provenance.stats();
  for (const doc of stats.documents) {
    const overlayUri = provenance.templateStats(doc.uri).overlayUri;
    if (overlayUri) overlayUris.add(canonicalDocumentUri(overlayUri).uri);
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
    related.push({ message: rewriteTypeNames(flattenTsMessage(rel.messageText), typeNames), location: relLocation });
  }

  const severity = tsCategoryToSeverity(diag.category);
  const message = formatTypeScriptMessage(diag, vmDisplayName, provenanceHit, typeNames);
  return {
    code: diag.code ?? "TS",
    message,
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
  hit: ReturnType<ProvenanceIndex["lookupGenerated"]> | null,
  typeNames: TypeNameMap,
): string {
  if (hit?.memberPath) {
    return `Property '${hit.memberPath}' does not exist on ${vmDisplayName}`;
  }
  return rewriteTypeNames(flattenTsMessage(diag.messageText), typeNames);
}

function projectOverlayOffset(hit: TemplateProvenanceHit, templateOffset: number): number {
  const templateSpan = hit.edge.to.span;
  const overlaySpan = hit.edge.from.span;
  const relative = Math.max(0, templateOffset - templateSpan.start);
  const overlayRelative = Math.min(relative, spanLength(overlaySpan));
  return overlaySpan.start + overlayRelative;
}

function overlayOffsetFromHit(hit: TemplateProvenanceHit, templateOffset: number): number {
  if (hit.edge.kind === "overlayMember") {
    const span = hit.edge.from.span;
    return span.start + Math.max(0, Math.floor(spanLength(span) / 2));
  }
  return projectOverlayOffset(hit, templateOffset);
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
