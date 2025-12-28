/**
 * Unit tests for LSP type mapping utilities.
 *
 * These test pure transformation functions without starting a server.
 */
import { describe, test, expect } from "vitest";
import {
  toLspUri,
  guessLanguage,
  toRange,
  mapCompletions,
  mapHover,
  mapLocations,
  mapWorkspaceEdit,
  mapDiagnostics,
} from "../../src/mapping/lsp-types.js";
import type { HoverInfo } from "@aurelia-ls/compiler";
import { uri, completionItem, diagnostic, diagnostics, span } from "../helpers/test-factories.js";

describe("toLspUri", () => {
  test("converts document URI to proper file:// URI", () => {
    const result = toLspUri(uri("file:///C:/projects/app/src/component.html"));
    // On Windows, vscode-uri normalizes drive letter to lowercase
    expect(result).toMatch(/^file:\/\/\/[Cc]:\/projects\/app\/src\/component\.html$/);
  });

  test("preserves Unix paths correctly", () => {
    const result = toLspUri(uri("file:///home/user/project/src/view.html"));
    expect(result).toBe("file:///home/user/project/src/view.html");
  });
});

describe("guessLanguage", () => {
  test("returns typescript for .ts files", () => {
    expect(guessLanguage(uri("file:///app/src/component.ts"))).toBe("typescript");
  });

  test("returns typescript for .js files", () => {
    expect(guessLanguage(uri("file:///app/src/component.js"))).toBe("typescript");
  });

  test("returns json for .json files", () => {
    expect(guessLanguage(uri("file:///app/package.json"))).toBe("json");
  });

  test("returns html as default", () => {
    expect(guessLanguage(uri("file:///app/src/component.html"))).toBe("html");
    expect(guessLanguage(uri("file:///app/src/view.au"))).toBe("html");
  });
});

describe("toRange", () => {
  test("converts template range to LSP range", () => {
    const range = toRange({
      start: { line: 5, character: 10 },
      end: { line: 5, character: 20 },
    });
    expect(range).toEqual({
      start: { line: 5, character: 10 },
      end: { line: 5, character: 20 },
    });
  });

  test("handles multi-line ranges", () => {
    const range = toRange({
      start: { line: 0, character: 0 },
      end: { line: 10, character: 5 },
    });
    expect(range.start.line).toBe(0);
    expect(range.end.line).toBe(10);
  });
});

describe("mapCompletions", () => {
  test("maps basic completion items", () => {
    const items = [
      completionItem({ label: "message" }),
      completionItem({ label: "count", detail: "number property" }),
    ];
    const result = mapCompletions(items);

    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("message");
    expect(result[1].label).toBe("count");
    expect(result[1].detail).toBe("number property");
  });

  test("maps completion with documentation", () => {
    const items = [
      completionItem({ label: "method", documentation: "This is a method" }),
    ];
    const result = mapCompletions(items);

    expect(result[0].documentation).toBe("This is a method");
  });

  test("maps completion with insertText", () => {
    const items = [
      completionItem({ label: "snippet", insertText: "snippet()" }),
    ];
    const result = mapCompletions(items);

    expect(result[0].insertText).toBe("snippet()");
  });

  test("maps completion with range as textEdit", () => {
    const items = [
      completionItem({
        label: "item",
        insertText: "item",
        range: {
          start: { line: 0, character: 5 },
          end: { line: 0, character: 10 },
        },
      }),
    ];
    const result = mapCompletions(items);

    expect(result[0].textEdit).toEqual({
      newText: "item",
      range: {
        start: { line: 0, character: 5 },
        end: { line: 0, character: 10 },
      },
    });
  });

  test("returns empty array for empty input", () => {
    expect(mapCompletions([])).toEqual([]);
  });
});

describe("mapHover", () => {
  test("maps hover info to LSP hover", () => {
    const hover: HoverInfo = {
      contents: "**message**: string",
      range: {
        start: { line: 0, character: 5 },
        end: { line: 0, character: 12 },
      },
    };
    const result = mapHover(hover);

    expect(result).toEqual({
      contents: { kind: "markdown", value: "**message**: string" },
      range: {
        start: { line: 0, character: 5 },
        end: { line: 0, character: 12 },
      },
    });
  });

  test("returns null for null input", () => {
    expect(mapHover(null)).toBeNull();
  });
});

describe("mapLocations", () => {
  test("maps template locations to LSP locations", () => {
    const locs = [
      {
        uri: uri("file:///app/component.ts"),
        range: {
          start: { line: 10, character: 2 },
          end: { line: 10, character: 10 },
        },
      },
    ];
    const result = mapLocations(locs);

    expect(result).toEqual([
      {
        uri: "file:///app/component.ts",
        range: {
          start: { line: 10, character: 2 },
          end: { line: 10, character: 10 },
        },
      },
    ]);
  });

  test("returns empty array for null input", () => {
    expect(mapLocations(null)).toEqual([]);
  });

  test("returns empty array for undefined input", () => {
    expect(mapLocations(undefined)).toEqual([]);
  });

  test("maps multiple locations", () => {
    const locs = [
      {
        uri: uri("file:///app/a.ts"),
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
      },
      {
        uri: uri("file:///app/b.ts"),
        range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
      },
    ];
    const result = mapLocations(locs);

    expect(result).toHaveLength(2);
  });
});

describe("mapWorkspaceEdit", () => {
  test("maps text edits to workspace edit", () => {
    const edits = [
      {
        uri: uri("file:///app/component.ts"),
        range: {
          start: { line: 5, character: 2 },
          end: { line: 5, character: 9 },
        },
        newText: "renamed",
      },
    ];
    const result = mapWorkspaceEdit(edits);

    expect(result).toEqual({
      changes: {
        "file:///app/component.ts": [
          {
            range: {
              start: { line: 5, character: 2 },
              end: { line: 5, character: 9 },
            },
            newText: "renamed",
          },
        ],
      },
    });
  });

  test("groups edits by URI", () => {
    const edits = [
      {
        uri: uri("file:///app/a.ts"),
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
        newText: "foo",
      },
      {
        uri: uri("file:///app/a.ts"),
        range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
        newText: "bar",
      },
      {
        uri: uri("file:///app/b.ts"),
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
        newText: "baz",
      },
    ];
    const result = mapWorkspaceEdit(edits);

    expect(result).toEqual({
      changes: {
        "file:///app/a.ts": [
          { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } }, newText: "foo" },
          { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } }, newText: "bar" },
        ],
        "file:///app/b.ts": [
          { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } }, newText: "baz" },
        ],
      },
    });
  });

  test("returns null for empty edits", () => {
    expect(mapWorkspaceEdit([])).toBeNull();
  });
});

describe("mapDiagnostics", () => {
  const testUri = uri("file:///app/component.ts");
  const lookupText = (): string | null => "const x = 1;";

  test("maps diagnostic with location", () => {
    const diags = diagnostics([
      diagnostic({
        message: "Property not found",
        severity: "error",
        code: "TS2339",
        source: "typecheck",
        location: span(testUri, 6, 7),
      }),
    ]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe("Property not found");
    expect(result[0].code).toBe("TS2339");
    expect(result[0].source).toBe("typecheck");
  });

  test("maps warning severity", () => {
    const diags = diagnostics([
      diagnostic({
        message: "Unused variable",
        severity: "warning",
        location: span(testUri, 0, 5),
      }),
    ]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result).toHaveLength(1);
    // DiagnosticSeverity.Warning = 2
    expect(result[0].severity).toBe(2);
  });

  test("maps info severity", () => {
    const diags = diagnostics([
      diagnostic({
        message: "Info message",
        severity: "info",
        location: span(testUri, 0, 5),
      }),
    ]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result).toHaveLength(1);
    // DiagnosticSeverity.Information = 3
    expect(result[0].severity).toBe(3);
  });

  test("maps unnecessary tag", () => {
    const diags = diagnostics([
      diagnostic({
        message: "Unused import",
        severity: "warning",
        tags: ["unnecessary"],
        location: span(testUri, 0, 5),
      }),
    ]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result[0].tags).toContain(1); // DiagnosticTag.Unnecessary = 1
  });

  test("maps deprecated tag", () => {
    const diags = diagnostics([
      diagnostic({
        message: "Deprecated API",
        severity: "warning",
        tags: ["deprecated"],
        location: span(testUri, 0, 5),
      }),
    ]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result[0].tags).toContain(2); // DiagnosticTag.Deprecated = 2
  });

  test("skips diagnostics without location", () => {
    const diags = diagnostics([
      diagnostic({ message: "No location", severity: "error" }),
    ]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result).toHaveLength(0);
  });

  test("returns empty array for no diagnostics", () => {
    const diags = diagnostics([]);
    const result = mapDiagnostics(diags, lookupText);

    expect(result).toEqual([]);
  });
});
