import type { CompilerDiagnostic } from "../compiler/diagnostics.js";
import type { DocumentUri } from "./primitives.js";
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

export interface CompletionItem {
  label: string;
  detail?: string;
  documentation?: string;
}

export interface TemplateLanguageService {
  getDiagnostics(uri: DocumentUri): CompilerDiagnostic[];
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
  constructor(private readonly program: TemplateProgram) {}

  getDiagnostics(uri: DocumentUri): CompilerDiagnostic[] {
    return this.program.getDiagnostics(uri).all;
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
}
