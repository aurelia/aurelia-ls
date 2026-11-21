import { TextDocument } from "vscode-languageserver-textdocument";
import type { Position, Range } from "vscode-languageserver/node";
import type { SemanticRuntimeLspDocumentSnapshot } from "./semantic-runtime-session.js";

/** A semantic source snapshot uses raw UTF-16 offsets. LSP positions refer to the editor's decoded text. */
export class SourceDocument implements TextDocument {
  private readonly editor: TextDocument;
  private readonly prefixLength: number;

  constructor(readonly snapshot: SemanticRuntimeLspDocumentSnapshot) {
    // An open buffer has already consumed any file BOM. A leading U+FEFF in that buffer is authored text.
    this.prefixLength = snapshot.version === null && snapshot.text.startsWith("\uFEFF") ? 1 : 0;
    this.editor = TextDocument.create(snapshot.uri, snapshot.languageId, snapshot.version ?? 0,
      snapshot.text.slice(this.prefixLength));
  }

  get uri(): string { return this.editor.uri; }
  get languageId(): string { return this.editor.languageId; }
  get version(): number { return this.editor.version; }
  get lineCount(): number { return this.editor.lineCount; }
  getLineRange(line: number): Range { return this.editor.getLineRange(line); }
  getEOLCharacters(line: number): string { return this.editor.getEOLCharacters(line); }

  /** Unranged reads authenticate the source snapshot. Ranges select characters from the editor model. */
  getText(range?: Range): string {
    return range === undefined ? this.snapshot.text : this.editor.getText(range);
  }

  positionAt(sourceOffset: number): Position {
    return this.editor.positionAt(sourceOffset - this.prefixLength);
  }

  offsetAt(editorPosition: Position): number {
    return this.editor.offsetAt(editorPosition) + this.prefixLength;
  }

  /** Semantic facts can also publish precomputed line/character pairs in the original source. */
  editorRange(sourceRange: Range): Range {
    if (this.prefixLength === 0 || sourceRange.start.line > 0) return sourceRange;
    const position = (p: Position): Position => p.line === 0
      ? { line: 0, character: Math.max(0, p.character - this.prefixLength) }
      : p;
    return { start: position(sourceRange.start), end: position(sourceRange.end) };
  }
}
