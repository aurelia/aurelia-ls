import ts from "typescript";
import {
  canonicalDocumentUri,
  type OverlayDocumentSnapshot,
  type TextRange,
  type TsCompletionEntry,
  type TsDiagnostic,
  type TsLocation,
  type TsMessageChain,
  type TsQuickInfo,
  type TsDiagnosticRelated,
  type TsTextEdit,
  type TsCodeAction,
  type TypeScriptServices,
} from "@aurelia-ls/domain";
import { TsService } from "./ts-service.js";
import { PathUtils } from "./paths.js";

function asMessageChain(msg: string | ts.DiagnosticMessageChain | undefined): string | TsMessageChain {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  const next = msg.next?.map(asMessageChain).filter(Boolean) as TsMessageChain[] | undefined;
  return next && next.length > 0
    ? { messageText: msg.messageText, next }
    : { messageText: msg.messageText };
}

export class TsServicesAdapter implements TypeScriptServices {
  constructor(
    private readonly tsService: TsService,
    private readonly paths: PathUtils,
  ) {}

  getDiagnostics(overlay: OverlayDocumentSnapshot): readonly TsDiagnostic[] {
    const path = this.syncOverlay(overlay);
    const service = this.tsService.getService();
    const program = service.getProgram();
    const source = program?.getSourceFile(path);
    const diagnostics = source && program
      ? ts.getPreEmitDiagnostics(program, source)
      : service.getSemanticDiagnostics(path);
    return (diagnostics ?? []).map((d) => this.toDiagnostic(d, path));
  }

  getQuickInfo(overlay: OverlayDocumentSnapshot, offset: number): TsQuickInfo | null {
    const path = this.syncOverlay(overlay);
    const info = this.tsService.getService().getQuickInfoAtPosition(path, offset);
    if (!info) return null;
    const documentation = info.documentation && info.documentation.length > 0
      ? ts.displayPartsToString(info.documentation)
      : undefined;
    return {
      text: ts.displayPartsToString(info.displayParts ?? []),
      ...(documentation ? { documentation } : {}),
      ...(info.textSpan ? { start: info.textSpan.start, length: info.textSpan.length } : {}),
    };
  }

  getDefinition(overlay: OverlayDocumentSnapshot, offset: number): readonly TsLocation[] | null {
    const path = this.syncOverlay(overlay);
    const defs = this.tsService.getService().getDefinitionAtPosition(path, offset) ?? [];
    return this.mapLocations(defs.map((d) => ({
      fileName: d.fileName,
      textSpan: d.textSpan,
    })));
  }

  getReferences(overlay: OverlayDocumentSnapshot, offset: number): readonly TsLocation[] | null {
    const path = this.syncOverlay(overlay);
    const refs = this.tsService.getService().getReferencesAtPosition(path, offset) ?? [];
    return this.mapLocations(refs.map((r) => ({
      fileName: r.fileName,
      textSpan: r.textSpan,
    })));
  }

  getCompletions(overlay: OverlayDocumentSnapshot, offset: number): readonly TsCompletionEntry[] | null {
    const path = this.syncOverlay(overlay);
    const completions = this.tsService.getService().getCompletionsAtPosition(path, offset, {}) ?? null;
    if (!completions?.entries?.length) return [];
    return completions.entries.map((entry) => {
      const mapped: TsCompletionEntry = {
        name: entry.name,
      };
      if (entry.kind) mapped.kind = entry.kind;
      if (entry.sortText) mapped.sortText = entry.sortText;
      if (entry.insertText) mapped.insertText = entry.insertText;
      if (entry.kindModifiers) mapped.detail = entry.kindModifiers;
      if (entry.replacementSpan) {
        mapped.replacementSpan = { start: entry.replacementSpan.start, length: entry.replacementSpan.length };
      }
      return mapped;
    });
  }

  getRenameEdits(overlay: OverlayDocumentSnapshot, offset: number, newName: string): readonly TsTextEdit[] | null {
    const path = this.syncOverlay(overlay);
    const locations = this.tsService
      .getService()
      .findRenameLocations(path, offset, false, false, { providePrefixAndSuffixTextForRename: true }) ?? [];
    const edits: TsTextEdit[] = [];
    for (const loc of locations) {
      const range = this.toRange(loc.fileName, loc.textSpan);
      if (!range) continue;
      const prefix = loc.prefixText ?? "";
      const suffix = loc.suffixText ?? "";
      edits.push({ fileName: loc.fileName, range, newText: `${prefix}${newName}${suffix}` });
    }
    return edits;
  }

  getCodeActions(overlay: OverlayDocumentSnapshot, start: number, end: number): readonly TsCodeAction[] | null {
    const path = this.syncOverlay(overlay);
    const codes = this.collectErrorCodes(path, start, end);
    if (!codes.length) return [];

    const fixes = this.tsService.getService().getCodeFixesAtPosition(
      path,
      start,
      end,
      codes,
      this.formatSettings(),
      {},
    );
    if (!fixes?.length) return [];

    const results: TsCodeAction[] = [];
    for (const fix of fixes) {
      const edits: TsTextEdit[] = [];
      for (const change of fix.changes ?? []) {
        for (const textChange of change.textChanges ?? []) {
          const range = this.toRange(change.fileName, textChange.span);
          if (!range) continue;
          edits.push({ fileName: change.fileName, range, newText: textChange.newText });
        }
      }
      if (edits.length) {
        results.push({ title: fix.description, edits });
      }
    }
    return results;
  }

  private syncOverlay(overlay: OverlayDocumentSnapshot): string {
    const canonical = canonicalDocumentUri(overlay.uri);
    const path = this.paths.canonical(canonical.path);
    this.tsService.upsertOverlay(path, overlay.text);
    return path;
  }

  private collectErrorCodes(path: string, start: number, end: number): number[] {
    const service = this.tsService.getService();
    const diagnostics = [
      ...service.getSyntacticDiagnostics(path),
      ...service.getSemanticDiagnostics(path),
      ...service.getSuggestionDiagnostics(path),
    ];
    const codes = new Set<number>();
    for (const diag of diagnostics) {
      if (typeof diag.code !== "number") continue;
      if (diag.start === undefined || diag.length === undefined) {
        codes.add(diag.code);
        continue;
      }
      const diagEnd = diag.start + diag.length;
      if (diagEnd >= start && diag.start <= end) codes.add(diag.code);
    }
    return [...codes];
  }

  private formatSettings(): ts.FormatCodeSettings {
    return { ...ts.getDefaultFormatCodeSettings(), convertTabsToSpaces: true };
  }

  private toDiagnostic(diag: ts.Diagnostic, fallbackFile: string): TsDiagnostic {
    const fileName = diag.file?.fileName ?? fallbackFile;
    const related = diag.relatedInformation?.map((rel) => {
      const base: TsDiagnosticRelated = { messageText: asMessageChain(rel.messageText) };
      if (rel.start !== undefined) base.start = rel.start;
      if (rel.length !== undefined) base.length = rel.length;
      if (rel.file?.fileName) base.fileName = rel.file.fileName;
      return base;
    });
    const tags: string[] = [];
    if (diag.reportsUnnecessary) tags.push("unnecessary");
    if (diag.reportsDeprecated) tags.push("deprecated");
    const mapped: TsDiagnostic = {
      messageText: asMessageChain(diag.messageText),
      code: diag.code,
      category: diag.category,
      fileName,
    };
    if (diag.start !== undefined) mapped.start = diag.start;
    if (diag.length !== undefined) mapped.length = diag.length;
    if (related && related.length) mapped.relatedInformation = related;
    if (tags.length) mapped.tags = tags;
    return mapped;
  }

  private mapLocations(entries: Array<{ fileName: string; textSpan: ts.TextSpan }>): TsLocation[] {
    const results: TsLocation[] = [];
    for (const entry of entries) {
      const range = this.toRange(entry.fileName, entry.textSpan);
      if (!range) continue;
      results.push({ fileName: entry.fileName, range });
    }
    return results;
  }

  private toRange(fileName: string, span: ts.TextSpan): TextRange | null {
    return this.tsService.tsSpanToRange(fileName, span.start, span.length);
  }
}
