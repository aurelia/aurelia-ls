/**
 * LSP response shapes used by integration tests.
 */
export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspDiagnostic {
  range: LspRange;
  message: string;
  severity?: number;
  code?: string | number;
  source?: string;
  tags?: number[];
}

export interface LspHover {
  contents: string | { kind: string; value: string } | Array<string | { language: string; value: string }>;
  range?: LspRange;
}

export interface LspCompletionItem {
  label: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
  textEdit?: { range: LspRange; newText: string };
}

export interface LspTextEdit {
  range: LspRange;
  newText: string;
}

export interface LspWorkspaceEdit {
  changes?: Record<string, LspTextEdit[]>;
  documentChanges?: Array<{
    textDocument: { uri: string };
    edits: LspTextEdit[];
  }>;
}
