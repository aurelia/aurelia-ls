import { test, expect, describe } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { spanToRange, spanToRangeOrNull, diagnosticToRange } from "../../out/services/spans.js";
import type { CompilerDiagnostic } from "@aurelia-ls/compiler";

function createDoc(content: string): TextDocument {
  return TextDocument.create("file:///test.html", "html", 1, content);
}

describe("spanToRange", () => {
  test("converts span with start/end to Range", () => {
    const doc = createDoc("hello world");
    const range = spanToRange(doc, { start: 0, end: 5 });

    expect(range.start.line).toBe(0);
    expect(range.start.character).toBe(0);
    expect(range.end.line).toBe(0);
    expect(range.end.character).toBe(5);
  });

  test("handles multi-line spans", () => {
    const doc = createDoc("line1\nline2\nline3");
    const range = spanToRange(doc, { start: 6, end: 11 }); // "line2"

    expect(range.start.line).toBe(1);
    expect(range.start.character).toBe(0);
    expect(range.end.line).toBe(1);
    expect(range.end.character).toBe(5);
  });

  test("handles span crossing lines", () => {
    const doc = createDoc("abc\ndefg\nhij");
    const range = spanToRange(doc, { start: 2, end: 10 }); // "c\ndefg\nh"

    expect(range.start.line).toBe(0);
    expect(range.start.character).toBe(2);
    expect(range.end.line).toBe(2);
    expect(range.end.character).toBe(1);
  });

  test("handles zero-width span", () => {
    const doc = createDoc("hello");
    const range = spanToRange(doc, { start: 3, end: 3 });

    expect(range.start.line).toBe(0);
    expect(range.start.character).toBe(3);
    expect(range.end.line).toBe(0);
    expect(range.end.character).toBe(3);
  });
});

describe("spanToRangeOrNull", () => {
  test("returns null for null span", () => {
    const doc = createDoc("hello");
    expect(spanToRangeOrNull(doc, null)).toBe(null);
  });

  test("returns null for undefined span", () => {
    const doc = createDoc("hello");
    expect(spanToRangeOrNull(doc, undefined)).toBe(null);
  });

  test("returns range for valid span", () => {
    const doc = createDoc("hello world");
    const range = spanToRangeOrNull(doc, { start: 6, end: 11 });

    expect(range).not.toBe(null);
    expect(range!.start.character).toBe(6);
    expect(range!.end.character).toBe(11);
  });
});

describe("diagnosticToRange", () => {
  test("extracts span from diagnostic and converts to range", () => {
    const doc = createDoc("<div>${name}</div>");
    const diag: CompilerDiagnostic = {
      code: "TEST001",
      message: "Test error",
      severity: "error",
      span: { start: 5, end: 12 },
    };

    const range = diagnosticToRange(doc, diag);

    expect(range).not.toBe(null);
    expect(range!.start.character).toBe(5);
    expect(range!.end.character).toBe(12);
  });

  test("returns null for diagnostic without span", () => {
    const doc = createDoc("hello");
    const diag: CompilerDiagnostic = {
      code: "TEST002",
      message: "No span",
      severity: "warning",
    };

    const range = diagnosticToRange(doc, diag);
    expect(range).toBe(null);
  });
});
