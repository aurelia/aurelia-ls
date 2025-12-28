/**
 * Test factory functions and type helpers.
 *
 * Provides:
 * 1. Branded type constructors for DocumentUri, etc.
 * 2. Factory functions for creating test data with sensible defaults
 * 3. Type definitions for LSP response shapes
 */
import {
  asDocumentUri,
  type CompletionItem,
  type DocumentUri,
  type TemplateLanguageDiagnostic,
  type TemplateLanguageDiagnostics,
  type DocumentSpan,
} from "@aurelia-ls/compiler";

// =============================================================================
// Branded Type Helpers
// =============================================================================

/** Create a DocumentUri from a string. Prefer file:// URIs. */
export const uri = asDocumentUri;

// =============================================================================
// Factory Functions
// =============================================================================

/** Create a CompletionItem with defaults. Only `label` is required. */
export function completionItem(
  overrides: Partial<CompletionItem> & { label: string }
): CompletionItem {
  return { source: "template", ...overrides };
}

/** Create a TemplateLanguageDiagnostic with defaults. Only `message` is required. */
export function diagnostic(
  overrides: Partial<TemplateLanguageDiagnostic> & { message: string }
): TemplateLanguageDiagnostic {
  return {
    code: "TEST",
    source: "lower", // Valid DiagnosticSource
    severity: "error",
    location: null,
    ...overrides,
  };
}

/** Create a TemplateLanguageDiagnostics container from an array of diagnostics. */
export function diagnostics(all: TemplateLanguageDiagnostic[]): TemplateLanguageDiagnostics {
  return {
    all,
    compiler: all.filter((d) => d.source !== "typescript"),
    typescript: all.filter((d) => d.source === "typescript"),
  };
}

/** Create a DocumentSpan for use in diagnostic locations. */
export function span(docUri: DocumentUri, start: number, end: number): DocumentSpan {
  return { uri: docUri, span: { start, end } };
}

// =============================================================================
// LSP Response Types (for integration tests)
// =============================================================================

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

// =============================================================================
// Type Guards and Assertions
// =============================================================================

/** Assert that a value is defined and return it typed. */
export function defined<T>(value: T | null | undefined, message = "Expected value to be defined"): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/** Type guard for checking if response is an array of locations. */
export function isLocationArray(value: unknown): value is LspLocation[] {
  return Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null && "uri" in v && "range" in v);
}
