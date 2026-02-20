/**
 * Unit tests for LSP mapping utilities that consume semantic-workspace types.
 */
import { describe, test, expect } from "vitest";
import { CompletionItemKind } from "vscode-languageserver/node.js";
import {
  toLspUri,
  guessLanguage,
  spanToRange,
  mapWorkspaceDiagnostics,
  AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY,
  AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
  mapWorkspaceCompletions,
  mapWorkspaceHover,
  mapWorkspaceLocations,
  mapSemanticWorkspaceEdit,
  type LookupTextFn,
} from "../../src/mapping/lsp-types.js";
import {
  asDocumentUri,
  canonicalDocumentUri,
  type DocumentUri,
  type DiagnosticDataRecord,
  type DiagnosticSpec,
  type DiagnosticSurface,
  type SourceSpan,
} from "@aurelia-ls/compiler";
import type {
  WorkspaceCompletionItem,
  WorkspaceDiagnostic,
  WorkspaceDiagnostics,
  WorkspaceEdit,
  WorkspaceHover,
  WorkspaceLocation,
} from "@aurelia-ls/semantic-workspace";

const spanUri = asDocumentUri("file:///C:/projects/app/src/span.html");
const otherUri = asDocumentUri("file:///C:/projects/app/src/other.html");

const textByUri = new Map<DocumentUri, string>([
  [spanUri, "alpha\nbeta\ngamma"],
  [otherUri, "first line\nsecond line"],
]);

const lookupText: LookupTextFn = (uri) => textByUri.get(uri) ?? null;

function makeSpan(uri: DocumentUri, start: number, end: number): SourceSpan {
  return { start, end, file: canonicalDocumentUri(uri).file };
}

const TEST_SPEC: DiagnosticSpec<DiagnosticDataRecord> = {
  category: "toolchain",
  status: "canonical",
  defaultSeverity: "warning",
  impact: "degraded",
  actionability: "manual",
  span: "span",
  stages: ["resolve"],
};

function makeDiagnostic(input: {
  code: string;
  message: string;
  severity?: "error" | "warning" | "info";
  span?: SourceSpan;
  data?: Readonly<Record<string, unknown>>;
  uri?: DocumentUri;
}): WorkspaceDiagnostic {
  const severity = input.severity ?? "warning";
  const raw = {
    code: input.code,
    message: input.message,
    ...(input.severity ? { severity: input.severity } : {}),
    ...(input.span ? { span: input.span } : {}),
    ...(input.data ? { data: input.data } : {}),
    ...(input.uri ? { uri: input.uri } : {}),
  };
  return {
    raw,
    code: input.code,
    spec: TEST_SPEC,
    message: input.message,
    severity,
    impact: TEST_SPEC.impact,
    actionability: TEST_SPEC.actionability,
    span: input.span,
    uri: input.uri,
    data: input.data ?? {},
  };
}

function toRouted(
  diags: WorkspaceDiagnostic[],
  surface: DiagnosticSurface = "lsp",
): WorkspaceDiagnostics {
  return { bySurface: new Map([[surface, diags]]), suppressed: [] };
}

describe("toLspUri", () => {
  test("converts document URI to proper file:// URI", () => {
    const result = toLspUri(asDocumentUri("file:///C:/projects/app/src/component.html"));
    expect(result).toMatch(/^file:\/\/\/[Cc]:\/projects\/app\/src\/component\.html$/);
  });

  test("preserves Unix paths correctly", () => {
    const result = toLspUri(asDocumentUri("file:///home/user/project/src/view.html"));
    expect(result).toBe("file:///home/user/project/src/view.html");
  });
});

describe("guessLanguage", () => {
  test("returns typescript for .ts files", () => {
    expect(guessLanguage(asDocumentUri("file:///app/src/component.ts"))).toBe("typescript");
  });

  test("returns typescript for .js files", () => {
    expect(guessLanguage(asDocumentUri("file:///app/src/component.js"))).toBe("typescript");
  });

  test("returns json for .json files", () => {
    expect(guessLanguage(asDocumentUri("file:///app/package.json"))).toBe("json");
  });

  test("returns html as default", () => {
    expect(guessLanguage(asDocumentUri("file:///app/src/component.html"))).toBe("html");
    expect(guessLanguage(asDocumentUri("file:///app/src/view.au"))).toBe("html");
  });
});

describe("spanToRange", () => {
  test("maps offsets to line/character positions", () => {
    const range = spanToRange({ uri: spanUri, span: makeSpan(spanUri, 6, 10) }, lookupText);
    expect(range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    });
  });
});

describe("mapWorkspaceDiagnostics", () => {
  test("maps diagnostics with spans", () => {
    const diagnostics: WorkspaceDiagnostic[] = [
      makeDiagnostic({
        code: "AU1000",
        message: "Missing property",
        severity: "warning",
        span: makeSpan(spanUri, 6, 10),
        data: { confidence: "high" },
        uri: spanUri,
      }),
    ];

    const mapped = mapWorkspaceDiagnostics(spanUri, toRouted(diagnostics), lookupText);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.severity).toBe(2); // DiagnosticSeverity.Warning
    expect(mapped[0]?.data).toEqual({
      confidence: "high",
      [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
        diagnostics: {
          schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
          impact: "degraded",
          actionability: "manual",
          category: "toolchain",
        },
      },
    });
  });

  test("merges taxonomy payload without dropping existing namespace data", () => {
    const diagnostics: WorkspaceDiagnostic[] = [
      makeDiagnostic({
        code: "AU1002",
        message: "Merge taxonomy",
        severity: "warning",
        span: makeSpan(spanUri, 6, 10),
        data: {
          confidence: "partial",
          [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
            traceId: "abc123",
            diagnostics: {
              detail: "existing",
            },
          },
        },
        uri: spanUri,
      }),
    ];

    const mapped = mapWorkspaceDiagnostics(spanUri, toRouted(diagnostics), lookupText);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.data).toEqual({
      confidence: "partial",
      [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
        traceId: "abc123",
        diagnostics: {
          detail: "existing",
          schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
          impact: "degraded",
          actionability: "manual",
          category: "toolchain",
        },
      },
    });
  });

  test("skips diagnostics without spans", () => {
    const diagnostics: WorkspaceDiagnostic[] = [
      makeDiagnostic({ code: "AU1001", message: "No span", severity: "error" }),
    ];

    const mapped = mapWorkspaceDiagnostics(spanUri, toRouted(diagnostics), lookupText);
    expect(mapped).toEqual([]);
  });
});

describe("mapWorkspaceCompletions", () => {
  test("maps completion items", () => {
    const items: WorkspaceCompletionItem[] = [
      { label: "message", detail: "string" },
      { label: "count", documentation: "A number", insertText: "count" },
    ];

    const mapped = mapWorkspaceCompletions(items);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]?.detail).toBe("string");
    expect(mapped[1]?.documentation).toBe("A number");
  });

  // Pattern AM: known detail strings → CompletionItemKind set
  test("derives CompletionItemKind from known detail strings (Pattern AM)", () => {
    const items: WorkspaceCompletionItem[] = [
      { label: "my-el", detail: "Custom Element" },
      { label: "div", detail: "HTML Element" },
      { label: "value", detail: "Bindable" },
      { label: "if", detail: "Template Controller" },
      { label: "tooltip", detail: "Custom Attribute" },
      { label: "id", detail: "Native Attribute" },
      { label: "date", detail: "Value Converter" },
      { label: "throttle", detail: "Binding Behavior" },
    ];

    const mapped = mapWorkspaceCompletions(items);
    expect(mapped[0]?.kind).toBe(CompletionItemKind.Class);
    expect(mapped[1]?.kind).toBe(CompletionItemKind.Keyword);
    expect(mapped[2]?.kind).toBe(CompletionItemKind.Property);
    expect(mapped[3]?.kind).toBe(CompletionItemKind.Struct);
    expect(mapped[4]?.kind).toBe(CompletionItemKind.Interface);
    expect(mapped[5]?.kind).toBe(CompletionItemKind.Field);
    expect(mapped[6]?.kind).toBe(CompletionItemKind.Function);
    expect(mapped[7]?.kind).toBe(CompletionItemKind.Module);
  });

  // Pattern AN: unknown detail → no kind (safe fallback)
  test("omits kind for unknown detail strings (Pattern AN)", () => {
    const items: WorkspaceCompletionItem[] = [
      { label: "x", detail: "Something Unknown" },
      { label: "y" },
    ];

    const mapped = mapWorkspaceCompletions(items);
    expect(mapped[0]?.kind).toBeUndefined();
    expect(mapped[1]?.kind).toBeUndefined();
    expect(mapped).toHaveLength(2);
  });

  // Pattern AO: existing fields still mapped alongside kind
  test("preserves all existing fields when kind is derived (Pattern AO)", () => {
    const items: WorkspaceCompletionItem[] = [
      {
        label: "my-el",
        detail: "Custom Element",
        documentation: "A custom element",
        sortText: "0001",
        insertText: "my-el",
      },
    ];

    const mapped = mapWorkspaceCompletions(items);
    expect(mapped[0]?.label).toBe("my-el");
    expect(mapped[0]?.detail).toBe("Custom Element");
    expect(mapped[0]?.documentation).toBe("A custom element");
    expect(mapped[0]?.sortText).toBe("0001");
    expect(mapped[0]?.insertText).toBe("my-el");
    expect(mapped[0]?.kind).toBe(CompletionItemKind.Class);
  });
});

describe("mapWorkspaceHover", () => {
  test("maps hover with location", () => {
    const hover: WorkspaceHover = {
      contents: "**message**: string",
      location: { uri: spanUri, span: makeSpan(spanUri, 6, 10) },
    };

    const mapped = mapWorkspaceHover(hover, lookupText);
    expect(mapped?.contents).toEqual({ kind: "markdown", value: "**message**: string" });
    expect(mapped?.range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    });
  });
});

describe("mapWorkspaceLocations", () => {
  test("maps locations with spans", () => {
    const locations: WorkspaceLocation[] = [
      { uri: spanUri, span: makeSpan(spanUri, 6, 10) },
    ];

    const mapped = mapWorkspaceLocations(locations, lookupText);
    expect(mapped).toEqual([
      {
        uri: toLspUri(spanUri),
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 4 } },
      },
    ]);
  });
});

describe("mapSemanticWorkspaceEdit", () => {
  test("maps edits grouped by uri", () => {
    const edit: WorkspaceEdit = {
      edits: [
        { uri: spanUri, span: makeSpan(spanUri, 6, 10), newText: "delta" },
        { uri: otherUri, span: makeSpan(otherUri, 0, 5), newText: "first" },
      ],
    };

    const mapped = mapSemanticWorkspaceEdit(edit, lookupText);
    expect(mapped?.changes?.[toLspUri(spanUri)]).toHaveLength(1);
    expect(mapped?.changes?.[toLspUri(otherUri)]).toHaveLength(1);
  });
});
