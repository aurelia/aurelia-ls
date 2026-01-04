import { test, expect, describe, vi } from "vitest";
import {
  TOKEN_TYPES,
  TOKEN_MODIFIERS,
  SEMANTIC_TOKENS_LEGEND,
  encodeTokens,
  offsetToLineChar,
  buildNodeMap,
  extractTokens,
  extractExpressionTokens,
  extractBindingCommandTokens,
  extractInterpolationDelimiterTokens,
  extractMetaElementTokens,
  handleSemanticTokensFull,
  type RawToken,
} from "../../out/handlers/semantic-tokens.js";
import type { DOMNode, ElementNode, LinkedRow, NodeSem, ExprTableEntry, SourceSpan, LinkedInstruction, TemplateMetaIR } from "@aurelia-ls/compiler";

/* ===========================
 * Token Legend Tests
 * =========================== */

describe("Token Legend", () => {
  test("TOKEN_TYPES has expected entries", () => {
    expect(TOKEN_TYPES).toContain("namespace");
    expect(TOKEN_TYPES).toContain("variable");
    expect(TOKEN_TYPES).toContain("property");
    expect(TOKEN_TYPES).toContain("keyword");
  });

  test("TOKEN_MODIFIERS has expected entries", () => {
    expect(TOKEN_MODIFIERS).toContain("declaration");
    expect(TOKEN_MODIFIERS).toContain("readonly");
    expect(TOKEN_MODIFIERS).toContain("defaultLibrary");
  });

  test("SEMANTIC_TOKENS_LEGEND has correct structure", () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toEqual([...TOKEN_TYPES]);
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toEqual([...TOKEN_MODIFIERS]);
  });

  test("namespace token type is at index 0", () => {
    expect(TOKEN_TYPES[0]).toBe("namespace");
  });
});

/* ===========================
 * offsetToLineChar Tests
 * =========================== */

describe("offsetToLineChar", () => {
  test("returns 0,0 for offset 0", () => {
    expect(offsetToLineChar("hello", 0)).toEqual({ line: 0, char: 0 });
  });

  test("returns correct char on first line", () => {
    expect(offsetToLineChar("hello", 3)).toEqual({ line: 0, char: 3 });
  });

  test("handles newline correctly", () => {
    const text = "line1\nline2";
    // Offset 6 is the 'l' in 'line2'
    expect(offsetToLineChar(text, 6)).toEqual({ line: 1, char: 0 });
  });

  test("handles multiple lines", () => {
    const text = "a\nb\nc";
    expect(offsetToLineChar(text, 0)).toEqual({ line: 0, char: 0 }); // 'a'
    expect(offsetToLineChar(text, 2)).toEqual({ line: 1, char: 0 }); // 'b'
    expect(offsetToLineChar(text, 4)).toEqual({ line: 2, char: 0 }); // 'c'
  });

  test("handles characters after newline", () => {
    const text = "abc\ndefgh";
    expect(offsetToLineChar(text, 7)).toEqual({ line: 1, char: 3 }); // 'g'
  });

  test("handles empty string", () => {
    expect(offsetToLineChar("", 0)).toEqual({ line: 0, char: 0 });
  });

  test("clamps to text length", () => {
    expect(offsetToLineChar("ab", 10)).toEqual({ line: 0, char: 2 });
  });
});

/* ===========================
 * encodeTokens Tests
 * =========================== */

describe("encodeTokens", () => {
  test("returns empty array for empty input", () => {
    expect(encodeTokens([])).toEqual([]);
  });

  test("encodes single token correctly", () => {
    const tokens: RawToken[] = [
      { line: 0, char: 5, length: 10, type: 0, modifiers: 0 },
    ];
    // First token: deltaLine=0, deltaChar=5, length=10, type=0, modifiers=0
    expect(encodeTokens(tokens)).toEqual([0, 5, 10, 0, 0]);
  });

  test("encodes multiple tokens on same line", () => {
    const tokens: RawToken[] = [
      { line: 0, char: 0, length: 5, type: 0, modifiers: 0 },
      { line: 0, char: 10, length: 3, type: 1, modifiers: 0 },
    ];
    // Token 1: deltaLine=0, deltaChar=0, length=5, type=0, modifiers=0
    // Token 2: deltaLine=0, deltaChar=10 (relative to 0), length=3, type=1, modifiers=0
    expect(encodeTokens(tokens)).toEqual([0, 0, 5, 0, 0, 0, 10, 3, 1, 0]);
  });

  test("encodes tokens on different lines", () => {
    const tokens: RawToken[] = [
      { line: 0, char: 5, length: 10, type: 0, modifiers: 0 },
      { line: 2, char: 3, length: 7, type: 1, modifiers: 0 },
    ];
    // Token 1: deltaLine=0, deltaChar=5, length=10, type=0, modifiers=0
    // Token 2: deltaLine=2, deltaChar=3 (absolute since new line), length=7, type=1, modifiers=0
    expect(encodeTokens(tokens)).toEqual([0, 5, 10, 0, 0, 2, 3, 7, 1, 0]);
  });

  test("sorts tokens by position before encoding", () => {
    // Input is out of order
    const tokens: RawToken[] = [
      { line: 2, char: 0, length: 5, type: 2, modifiers: 0 },
      { line: 0, char: 0, length: 5, type: 0, modifiers: 0 },
      { line: 1, char: 0, length: 5, type: 1, modifiers: 0 },
    ];
    // Should be sorted: line 0, line 1, line 2
    const result = encodeTokens(tokens);
    // First token: line 0
    expect(result.slice(0, 5)).toEqual([0, 0, 5, 0, 0]);
    // Second token: line 1 (deltaLine=1)
    expect(result.slice(5, 10)).toEqual([1, 0, 5, 1, 0]);
    // Third token: line 2 (deltaLine=1)
    expect(result.slice(10, 15)).toEqual([1, 0, 5, 2, 0]);
  });

  test("encodes modifiers correctly", () => {
    const tokens: RawToken[] = [
      { line: 0, char: 0, length: 5, type: 0, modifiers: 3 }, // 0b11 = declaration + readonly
    ];
    expect(encodeTokens(tokens)).toEqual([0, 0, 5, 0, 3]);
  });
});

/* ===========================
 * buildNodeMap Tests
 * =========================== */

describe("buildNodeMap", () => {
  test("maps single node", () => {
    const node: DOMNode = {
      kind: "text",
      id: "1" as any,
      ns: "html" as any,
      text: "hello",
    };
    const map = buildNodeMap(node);
    expect(map.size).toBe(1);
    expect(map.get("1")).toBe(node);
  });

  test("maps element with children", () => {
    const child1: DOMNode = { kind: "text", id: "2" as any, ns: "html" as any, text: "a" };
    const child2: DOMNode = { kind: "text", id: "3" as any, ns: "html" as any, text: "b" };
    const parent: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "div",
      attrs: [],
      children: [child1, child2],
    };
    const map = buildNodeMap(parent);
    expect(map.size).toBe(3);
    expect(map.get("1")).toBe(parent);
    expect(map.get("2")).toBe(child1);
    expect(map.get("3")).toBe(child2);
  });

  test("handles nested elements", () => {
    const innerText: DOMNode = { kind: "text", id: "3" as any, ns: "html" as any, text: "x" };
    const innerElement: ElementNode = {
      kind: "element",
      id: "2" as any,
      ns: "html" as any,
      tag: "span",
      attrs: [],
      children: [innerText],
    };
    const outerElement: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "div",
      attrs: [],
      children: [innerElement],
    };
    const map = buildNodeMap(outerElement);
    expect(map.size).toBe(3);
    expect(map.has("1")).toBe(true);
    expect(map.has("2")).toBe(true);
    expect(map.has("3")).toBe(true);
  });
});

/* ===========================
 * extractTokens Tests
 * =========================== */

describe("extractTokens", () => {
  test("returns empty array for empty rows", () => {
    const nodeMap = new Map<string, DOMNode>();
    expect(extractTokens("", [], nodeMap)).toEqual([]);
  });

  test("ignores non-element rows", () => {
    const textNode: DOMNode = { kind: "text", id: "1" as any, ns: "html" as any, text: "hello" };
    const nodeMap = new Map<string, DOMNode>([["1", textNode]]);
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "text" } as NodeSem,
        instructions: [],
      },
    ];
    expect(extractTokens("hello", rows, nodeMap)).toEqual([]);
  });

  test("ignores native HTML elements", () => {
    const divNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "div",
      attrs: [],
      children: [],
      loc: { start: 0, end: 10 },
    };
    const nodeMap = new Map<string, DOMNode>([["1", divNode]]);
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "element", tag: "div", native: { def: {} } } as NodeSem,
        instructions: [],
      },
    ];
    expect(extractTokens("<div></div>", rows, nodeMap)).toEqual([]);
  });

  test("extracts token for custom element", () => {
    const text = "<my-component></my-component>";
    const customNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "my-component",
      attrs: [],
      children: [],
      loc: { start: 0, end: 29 },
    };
    const nodeMap = new Map<string, DOMNode>([["1", customNode]]);
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "element", tag: "my-component", custom: { def: {} } } as NodeSem,
        instructions: [],
      },
    ];

    const tokens = extractTokens(text, rows, nodeMap);

    // Should have 2 tokens: opening tag and closing tag
    expect(tokens.length).toBe(2);

    // Opening tag: starts at offset 1 (after '<'), length 12
    expect(tokens[0]).toEqual({
      line: 0,
      char: 1,
      length: 12,
      type: 0, // namespace
      modifiers: 0,
    });

    // Closing tag: starts at offset 16 (after '</'), length 12
    expect(tokens[1]).toEqual({
      line: 0,
      char: 16,
      length: 12,
      type: 0, // namespace
      modifiers: 0,
    });
  });

  test("handles self-closed custom element", () => {
    const text = "<my-component />";
    const customNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "my-component",
      attrs: [],
      children: [],
      selfClosed: true,
      loc: { start: 0, end: 16 },
    };
    const nodeMap = new Map<string, DOMNode>([["1", customNode]]);
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "element", tag: "my-component", custom: { def: {} } } as NodeSem,
        instructions: [],
      },
    ];

    const tokens = extractTokens(text, rows, nodeMap);

    // Self-closed: only 1 token
    expect(tokens.length).toBe(1);
    expect(tokens[0]).toEqual({
      line: 0,
      char: 1,
      length: 12,
      type: 0,
      modifiers: 0,
    });
  });

  test("handles custom element on multiple lines", () => {
    const text = "<my-component>\n  content\n</my-component>";
    const customNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "my-component",
      attrs: [],
      children: [],
      loc: { start: 0, end: 40 },
    };
    const nodeMap = new Map<string, DOMNode>([["1", customNode]]);
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "element", tag: "my-component", custom: { def: {} } } as NodeSem,
        instructions: [],
      },
    ];

    const tokens = extractTokens(text, rows, nodeMap);

    expect(tokens.length).toBe(2);

    // Opening tag on line 0
    expect(tokens[0].line).toBe(0);
    expect(tokens[0].char).toBe(1);

    // Closing tag on line 2
    expect(tokens[1].line).toBe(2);
    expect(tokens[1].char).toBe(2); // After "</"
  });

  test("skips node without loc", () => {
    const customNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "my-component",
      attrs: [],
      children: [],
      // No loc!
    };
    const nodeMap = new Map<string, DOMNode>([["1", customNode]]);
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "element", tag: "my-component", custom: { def: {} } } as NodeSem,
        instructions: [],
      },
    ];

    const tokens = extractTokens("<my-component></my-component>", rows, nodeMap);
    expect(tokens.length).toBe(0);
  });

  test("skips row with missing node in map", () => {
    const nodeMap = new Map<string, DOMNode>(); // Empty map
    const rows: LinkedRow[] = [
      {
        target: "1" as any,
        node: { kind: "element", tag: "my-component", custom: { def: {} } } as NodeSem,
        instructions: [],
      },
    ];

    const tokens = extractTokens("<my-component></my-component>", rows, nodeMap);
    expect(tokens.length).toBe(0);
  });
});

/* ===========================
 * Handler Tests
 * =========================== */

describe("handleSemanticTokensFull", () => {
  // Import NOOP_TRACE for mock context
  const NOOP_TRACE = {
    span: (_name: string, fn: () => unknown) => fn(),
    spanAsync: async (_name: string, fn: () => Promise<unknown>) => fn(),
    event: () => {},
    setAttribute: () => {},
    setAttributes: () => {},
    rootSpan: () => ({
      end: () => {},
      name: "root",
      spanId: "mock",
      traceId: "mock",
      startTime: 0n,
      endTime: null,
      duration: null,
      parent: null,
      children: [],
      attributes: new Map(),
      events: [],
    }),
  };

  function createMockContext(overrides: Record<string, unknown> = {}) {
    return {
      logger: {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      trace: NOOP_TRACE,
      ensureProgramDocument: vi.fn(),
      workspace: {
        program: {
          getCompilation: vi.fn(),
        },
        sources: {
          get: vi.fn().mockReturnValue(null), // Falls back to doc.getText()
        },
      },
      ...overrides,
    };
  }

  test("returns null when document not found", () => {
    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockReturnValue(null);

    const result = handleSemanticTokensFull(ctx as never, {
      textDocument: { uri: "file:///missing.html" },
    });

    expect(result).toBe(null);
  });

  test("returns null when compilation has no linked templates", () => {
    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockReturnValue({
      uri: "file:///test.html",
      getText: () => "<div></div>",
    });
    ctx.workspace.program.getCompilation.mockReturnValue({
      linked: { templates: [] },
    });

    const result = handleSemanticTokensFull(ctx as never, {
      textDocument: { uri: "file:///test.html" },
    });

    expect(result).toBe(null);
  });

  test("returns null when compilation is null", () => {
    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockReturnValue({
      uri: "file:///test.html",
      getText: () => "<div></div>",
    });
    ctx.workspace.program.getCompilation.mockReturnValue(null);

    const result = handleSemanticTokensFull(ctx as never, {
      textDocument: { uri: "file:///test.html" },
    });

    expect(result).toBe(null);
  });

  test("logs error and returns null on exception", () => {
    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockImplementation(() => {
      throw new Error("boom");
    });

    const result = handleSemanticTokensFull(ctx as never, {
      textDocument: { uri: "file:///test.html" },
    });

    expect(result).toBe(null);
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("semanticTokens"));
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("boom"));
  });

  test("returns tokens for custom element", () => {
    const text = "<my-app></my-app>";
    const customNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "my-app",
      attrs: [],
      children: [],
      loc: { start: 0, end: 17 },
    };
    const templateDom = {
      kind: "template" as const,
      id: "0" as any,
      ns: "html" as any,
      attrs: [],
      children: [customNode],
    };

    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockReturnValue({
      uri: "file:///test.html",
      getText: () => text,
    });
    ctx.workspace.program.getCompilation.mockReturnValue({
      linked: {
        templates: [
          {
            dom: templateDom,
            rows: [
              {
                target: "1",
                node: { kind: "element", tag: "my-app", custom: { def: {} } },
                instructions: [],
              },
            ],
          },
        ],
      },
    });

    const result = handleSemanticTokensFull(ctx as never, {
      textDocument: { uri: "file:///test.html" },
    });

    expect(result).not.toBe(null);
    expect(result!.data.length).toBeGreaterThan(0);

    // Decode first token: deltaLine=0, deltaChar=1 (after '<'), length=6 ('my-app'), type=0, modifiers=0
    expect(result!.data.slice(0, 5)).toEqual([0, 1, 6, 0, 0]);
  });

  test("returns null when no tokens extracted (only HTML elements)", () => {
    const text = "<div></div>";
    const divNode: ElementNode = {
      kind: "element",
      id: "1" as any,
      ns: "html" as any,
      tag: "div",
      attrs: [],
      children: [],
      loc: { start: 0, end: 11 },
    };
    const templateDom = {
      kind: "template" as const,
      id: "0" as any,
      ns: "html" as any,
      attrs: [],
      children: [divNode],
    };

    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockReturnValue({
      uri: "file:///test.html",
      getText: () => text,
    });
    ctx.workspace.program.getCompilation.mockReturnValue({
      linked: {
        templates: [
          {
            dom: templateDom,
            rows: [
              {
                target: "1",
                node: { kind: "element", tag: "div", native: { def: {} } },
                instructions: [],
              },
            ],
          },
        ],
      },
    });

    const result = handleSemanticTokensFull(ctx as never, {
      textDocument: { uri: "file:///test.html" },
    });

    // No custom elements, so no tokens
    expect(result).toBe(null);
  });
});

/* ===========================
 * extractExpressionTokens Tests
 * =========================== */

describe("extractExpressionTokens", () => {
  // Helper to create a minimal expression table entry
  function createExprEntry(
    id: string,
    ast: Record<string, unknown>,
    type: string = "IsProperty",
  ): ExprTableEntry {
    return {
      id: id as any,
      expressionType: type as any,
      ast,
    } as ExprTableEntry;
  }

  test("returns empty array for empty input", () => {
    expect(extractExpressionTokens("", [], new Map())).toEqual([]);
  });

  test("extracts token for AccessScope expression (variable)", () => {
    const text = "name";
    const entry = createExprEntry("0", {
      $kind: "AccessScope",
      span: { start: 0, end: 4 },
      name: "name",
      ancestor: 0,
    });
    const spans = new Map([["0", { start: 0, end: 4 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(1);
    expect(tokens[0]).toEqual({
      line: 0,
      char: 0,
      length: 4,
      type: TOKEN_TYPES.indexOf("variable"),
      modifiers: 0,
    });
  });

  test("marks Aurelia built-ins with defaultLibrary modifier", () => {
    const text = "$index";
    const entry = createExprEntry("0", {
      $kind: "AccessScope",
      span: { start: 0, end: 6 },
      name: "$index",
      ancestor: 0,
    });
    const spans = new Map([["0", { start: 0, end: 6 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    // defaultLibrary is at index 2 in modifiers
    expect(tokens[0]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
  });

  test("extracts token for AccessMember expression (property)", () => {
    const text = "user.name";
    const entry = createExprEntry("0", {
      $kind: "AccessMember",
      span: { start: 0, end: 9 },
      name: "name",
      object: {
        $kind: "AccessScope",
        span: { start: 0, end: 4 },
        name: "user",
        ancestor: 0,
      },
    });
    const spans = new Map([["0", { start: 0, end: 9 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    // Should have 2 tokens: user (variable) and name (property)
    expect(tokens.length).toBe(2);

    // First token: 'user' variable
    expect(tokens[0]).toEqual({
      line: 0,
      char: 0,
      length: 4,
      type: TOKEN_TYPES.indexOf("variable"),
      modifiers: 0,
    });

    // Second token: 'name' property
    expect(tokens[1]).toEqual({
      line: 0,
      char: 5, // after 'user.'
      length: 4,
      type: TOKEN_TYPES.indexOf("property"),
      modifiers: 0,
    });
  });

  test("extracts token for CallScope expression (function)", () => {
    const text = "save()";
    const entry = createExprEntry("0", {
      $kind: "CallScope",
      span: { start: 0, end: 6 },
      name: "save",
      args: [],
    });
    const spans = new Map([["0", { start: 0, end: 6 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(1);
    expect(tokens[0]).toEqual({
      line: 0,
      char: 0,
      length: 4,
      type: TOKEN_TYPES.indexOf("function"),
      modifiers: 0,
    });
  });

  test("extracts token for CallMember expression (method)", () => {
    const text = "user.getName()";
    const entry = createExprEntry("0", {
      $kind: "CallMember",
      span: { start: 0, end: 14 },
      name: "getName",
      object: {
        $kind: "AccessScope",
        span: { start: 0, end: 4 },
        name: "user",
        ancestor: 0,
      },
      args: [],
    });
    const spans = new Map([["0", { start: 0, end: 14 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(2);

    // 'user' variable
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    expect(tokens[0]!.length).toBe(4);

    // 'getName' method (function type)
    expect(tokens[1]!.type).toBe(TOKEN_TYPES.indexOf("function"));
    expect(tokens[1]!.char).toBe(5); // after 'user.'
    expect(tokens[1]!.length).toBe(7);
  });

  test("extracts tokens for conditional expression", () => {
    const text = "active ? yes : no";
    const entry = createExprEntry("0", {
      $kind: "Conditional",
      span: { start: 0, end: 17 },
      condition: {
        $kind: "AccessScope",
        span: { start: 0, end: 6 },
        name: "active",
        ancestor: 0,
      },
      yes: {
        $kind: "AccessScope",
        span: { start: 9, end: 12 },
        name: "yes",
        ancestor: 0,
      },
      no: {
        $kind: "AccessScope",
        span: { start: 15, end: 17 },
        name: "no",
        ancestor: 0,
      },
    });
    const spans = new Map([["0", { start: 0, end: 17 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    // 3 tokens: active, yes, no
    expect(tokens.length).toBe(3);
    expect(tokens[0]!.length).toBe(6); // active
    expect(tokens[1]!.length).toBe(3); // yes
    expect(tokens[2]!.length).toBe(2); // no
  });

  test("handles binary expressions", () => {
    const text = "a + b";
    const entry = createExprEntry("0", {
      $kind: "Binary",
      span: { start: 0, end: 5 },
      left: {
        $kind: "AccessScope",
        span: { start: 0, end: 1 },
        name: "a",
        ancestor: 0,
      },
      right: {
        $kind: "AccessScope",
        span: { start: 4, end: 5 },
        name: "b",
        ancestor: 0,
      },
    });
    const spans = new Map([["0", { start: 0, end: 5 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.char).toBe(0);
    expect(tokens[0]!.length).toBe(1); // a
    expect(tokens[1]!.char).toBe(4);
    expect(tokens[1]!.length).toBe(1); // b
  });

  test("marks $host with defaultLibrary modifier", () => {
    const text = "$host";
    const entry = createExprEntry("0", {
      $kind: "AccessBoundary",
      span: { start: 0, end: 5 },
    });
    const spans = new Map([["0", { start: 0, end: 5 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    expect(tokens[0]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
  });

  test("marks $this with defaultLibrary modifier", () => {
    const text = "$this";
    const entry = createExprEntry("0", {
      $kind: "AccessThis",
      span: { start: 0, end: 5 },
      ancestor: 0,
    });
    const spans = new Map([["0", { start: 0, end: 5 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    expect(tokens[0]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
  });

  test("skips entry without corresponding span", () => {
    const text = "name";
    const entry = createExprEntry("0", {
      $kind: "AccessScope",
      span: { start: 0, end: 4 },
      name: "name",
    });
    // Empty spans map - entry id "0" has no span
    const spans = new Map<string, SourceSpan>();

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(0);
  });

  test("skips primitive literals", () => {
    const text = "42";
    const entry = createExprEntry("0", {
      $kind: "PrimitiveLiteral",
      span: { start: 0, end: 2 },
      value: 42,
    });
    const spans = new Map([["0", { start: 0, end: 2 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    expect(tokens.length).toBe(0);
  });

  test("handles ForOfStatement with declaration", () => {
    const text = "item of items";
    const entry = createExprEntry("0", {
      $kind: "ForOfStatement",
      span: { start: 0, end: 13 },
      declaration: {
        $kind: "BindingIdentifier",
        span: { start: 0, end: 4 },
        name: "item",
      },
      iterable: {
        $kind: "AccessScope",
        span: { start: 8, end: 13 },
        name: "items",
        ancestor: 0,
      },
    }, "IsIterator");
    const spans = new Map([["0", { start: 0, end: 13 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    // 2 tokens: item (declaration) and items (variable)
    expect(tokens.length).toBe(2);

    // item with declaration modifier
    expect(tokens[0]!.char).toBe(0);
    expect(tokens[0]!.length).toBe(4);
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    expect(tokens[0]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("declaration"));

    // items variable
    expect(tokens[1]!.char).toBe(8);
    expect(tokens[1]!.length).toBe(5);
    expect(tokens[1]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
  });

  test("handles value converter expression", () => {
    const text = "date | format";
    const entry = createExprEntry("0", {
      $kind: "ValueConverter",
      span: { start: 0, end: 13 },
      name: "format",
      expression: {
        $kind: "AccessScope",
        span: { start: 0, end: 4 },
        name: "date",
        ancestor: 0,
      },
      args: [],
    });
    const spans = new Map([["0", { start: 0, end: 13 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    // Should have 2 tokens: date (variable) and format (function for converter)
    expect(tokens.length).toBe(2);
    expect(tokens[0]!.length).toBe(4); // date
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    expect(tokens[1]!.char).toBe(7); // 'format' starts after "date | "
    expect(tokens[1]!.length).toBe(6); // format
    expect(tokens[1]!.type).toBe(TOKEN_TYPES.indexOf("function"));
  });

  test("handles binding behavior expression", () => {
    const text = "value & debounce:500";
    const entry = createExprEntry("0", {
      $kind: "BindingBehavior",
      span: { start: 0, end: 20 },
      name: "debounce",
      expression: {
        $kind: "AccessScope",
        span: { start: 0, end: 5 },
        name: "value",
        ancestor: 0,
      },
      args: [
        {
          $kind: "PrimitiveLiteral",
          span: { start: 17, end: 20 },
          value: 500,
        },
      ],
    });
    const spans = new Map([["0", { start: 0, end: 20 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    // Should have 2 tokens: value (variable) and debounce (function for behavior)
    expect(tokens.length).toBe(2);
    expect(tokens[0]!.length).toBe(5); // value
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    expect(tokens[1]!.char).toBe(8); // 'debounce' starts after "value & "
    expect(tokens[1]!.length).toBe(8); // debounce
    expect(tokens[1]!.type).toBe(TOKEN_TYPES.indexOf("function"));
  });

  test("handles chained value converters", () => {
    const text = "date | format:'short' | uppercase";
    // The outer node is the last converter in the chain
    const entry = createExprEntry("0", {
      $kind: "ValueConverter",
      span: { start: 0, end: 33 },
      name: "uppercase",
      expression: {
        $kind: "ValueConverter",
        span: { start: 0, end: 21 },
        name: "format",
        expression: {
          $kind: "AccessScope",
          span: { start: 0, end: 4 },
          name: "date",
          ancestor: 0,
        },
        args: [
          {
            $kind: "PrimitiveLiteral",
            span: { start: 14, end: 21 },
            value: "short",
          },
        ],
      },
      args: [],
    });
    const spans = new Map([["0", { start: 0, end: 33 } as SourceSpan]]);

    const tokens = extractExpressionTokens(text, [entry], spans);

    // Should have 3 tokens: date, format, uppercase
    expect(tokens.length).toBe(3);
    expect(tokens.some(t => t.length === 4)).toBe(true); // date
    expect(tokens.some(t => t.length === 6)).toBe(true); // format
    expect(tokens.some(t => t.length === 9)).toBe(true); // uppercase
  });

  test("handles multiple expressions in one template", () => {
    const text = "<div>${name}</div><div>${count}</div>";
    const entry1 = createExprEntry("0", {
      $kind: "AccessScope",
      span: { start: 7, end: 11 },
      name: "name",
      ancestor: 0,
    });
    const entry2 = createExprEntry("1", {
      $kind: "AccessScope",
      span: { start: 25, end: 30 },
      name: "count",
      ancestor: 0,
    });
    const spans = new Map([
      ["0", { start: 7, end: 11 } as SourceSpan],
      ["1", { start: 25, end: 30 } as SourceSpan],
    ]);

    const tokens = extractExpressionTokens(text, [entry1, entry2], spans);

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.char).toBe(7);
    expect(tokens[0]!.length).toBe(4); // name
    expect(tokens[1]!.char).toBe(25);
    expect(tokens[1]!.length).toBe(5); // count
  });
});

/* ===========================
 * extractBindingCommandTokens Tests
 * =========================== */

describe("extractBindingCommandTokens", () => {
  function createRow(instructions: LinkedInstruction[]): LinkedRow {
    return {
      target: "1" as any,
      node: { kind: "element", tag: "div" } as NodeSem,
      instructions,
    };
  }

  test("extracts .bind command from property binding", () => {
    const text = '<input value.bind="name">';
    const instruction: LinkedInstruction = {
      kind: "propertyBinding",
      to: "value",
      from: { id: "0" as any, code: "name", loc: null } as any,
      mode: "default" as any,
      effectiveMode: "twoWay" as any,
      target: { kind: "unknown", reason: "no-element" } as any,
      loc: { start: 7, end: 24 }, // span of value.bind="name"
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(13); // 'bind' starts at position 13
    expect(tokens[0]!.length).toBe(4); // 'bind'
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("keyword")); // keyword for better theme colors
  });

  test("extracts .trigger command from listener binding", () => {
    const text = '<button click.trigger="save()">';
    const instruction: LinkedInstruction = {
      kind: "listenerBinding",
      to: "click",
      from: { id: "0" as any, code: "save()", loc: null } as any,
      eventType: { kind: "primitive", name: "Event" } as any,
      capture: false,
      loc: { start: 8, end: 30 },
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(14); // 'trigger' starts at position 14
    expect(tokens[0]!.length).toBe(7); // 'trigger'
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("keyword")); // keyword for better theme colors
  });

  test("extracts .capture command from listener binding", () => {
    const text = '<div click.capture="handler()">';
    const instruction: LinkedInstruction = {
      kind: "listenerBinding",
      to: "click",
      from: { id: "0" as any, code: "handler()", loc: null } as any,
      eventType: { kind: "primitive", name: "Event" } as any,
      capture: true,
      loc: { start: 5, end: 30 },
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(11); // 'capture' starts at position 11
    expect(tokens[0]!.length).toBe(7); // 'capture'
  });

  test("extracts .two-way command", () => {
    const text = '<input value.two-way="data">';
    const instruction: LinkedInstruction = {
      kind: "propertyBinding",
      to: "value",
      from: { id: "0" as any, code: "data", loc: null } as any,
      mode: "twoWay" as any,
      effectiveMode: "twoWay" as any,
      target: { kind: "unknown", reason: "no-element" } as any,
      loc: { start: 7, end: 27 },
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(13); // 'two-way' starts at position 13
    expect(tokens[0]!.length).toBe(7); // 'two-way'
  });

  test("extracts command for @ shorthand", () => {
    const text = '<button @click="save()">';
    const instruction: LinkedInstruction = {
      kind: "listenerBinding",
      to: "click",
      from: { id: "0" as any, code: "save()", loc: null } as any,
      eventType: { kind: "primitive", name: "Event" } as any,
      capture: false,
      loc: { start: 8, end: 23 },
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    // @ shorthand highlights the @ sigil
    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(8); // '@' at position 8
    expect(tokens[0]!.length).toBe(1); // '@'
  });

  test("extracts command for : shorthand", () => {
    const text = '<input :value="name">';
    const instruction: LinkedInstruction = {
      kind: "propertyBinding",
      to: "value",
      from: { id: "0" as any, code: "name", loc: null } as any,
      mode: "default" as any,
      effectiveMode: "toView" as any,
      target: { kind: "unknown", reason: "no-element" } as any,
      loc: { start: 7, end: 20 },
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    // : shorthand highlights the : sigil
    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(7); // ':' at position 7
    expect(tokens[0]!.length).toBe(1); // ':'
  });

  test("extracts ref command", () => {
    const text = '<div ref="myDiv">';
    const instruction: LinkedInstruction = {
      kind: "refBinding",
      to: "element",
      from: { id: "0" as any, code: "myDiv", loc: null } as any,
      loc: { start: 5, end: 16 },
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.char).toBe(5); // 'ref' starts at position 5
    expect(tokens[0]!.length).toBe(3); // 'ref'
  });

  test("skips instructions without loc", () => {
    const text = '<input value.bind="name">';
    const instruction: LinkedInstruction = {
      kind: "propertyBinding",
      to: "value",
      from: { id: "0" as any, code: "name", loc: null } as any,
      mode: "default" as any,
      effectiveMode: "twoWay" as any,
      target: { kind: "unknown", reason: "no-element" } as any,
      // No loc
    };

    const tokens = extractBindingCommandTokens(text, [createRow([instruction])]);

    expect(tokens.length).toBe(0);
  });

  test("handles multiple rows with multiple instructions", () => {
    const text = '<input value.bind="a" click.trigger="b()">';
    const row: LinkedRow = {
      target: "1" as any,
      node: { kind: "element", tag: "input" } as NodeSem,
      instructions: [
        {
          kind: "propertyBinding",
          to: "value",
          from: { id: "0" as any, code: "a", loc: null } as any,
          mode: "default" as any,
          effectiveMode: "twoWay" as any,
          target: { kind: "unknown", reason: "no-element" } as any,
          loc: { start: 7, end: 21 },
        },
        {
          kind: "listenerBinding",
          to: "click",
          from: { id: "1" as any, code: "b()", loc: null } as any,
          eventType: { kind: "primitive", name: "Event" } as any,
          capture: false,
          loc: { start: 22, end: 41 },
        },
      ] as LinkedInstruction[],
    };

    const tokens = extractBindingCommandTokens(text, [row]);

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.length).toBe(4); // bind
    expect(tokens[1]!.length).toBe(7); // trigger
  });
});

/* ===========================
 * extractInterpolationDelimiterTokens Tests
 * =========================== */

describe("extractInterpolationDelimiterTokens", () => {
  /**
   * Creates a mock LinkedRow with a textBinding instruction containing an InterpIR.
   * The InterpIR.exprs[i].loc points to the expression content (between ${ and }).
   */
  function createInterpRow(exprs: { start: number; end: number }[]): LinkedRow[] {
    return [{
      target: "0",
      node: { kind: "text" } as any,
      instructions: [{
        kind: "textBinding",
        from: {
          kind: "interp",
          parts: [],
          exprs: exprs.map(e => ({
            id: "expr",
            code: "",
            loc: { start: e.start, end: e.end, file: "test.html" },
          })),
          loc: null,
        },
        loc: null,
      }] as LinkedInstruction[],
    }];
  }

  test("extracts ${ and } delimiters from simple interpolation", () => {
    // Text: "Hello ${name}!"
    // Expression "name" is at positions 8-12
    const text = "Hello ${name}!";
    const rows = createInterpRow([{ start: 8, end: 12 }]);

    const tokens = extractInterpolationDelimiterTokens(text, rows);

    // Should have 2 tokens: ${ and }
    expect(tokens.length).toBe(2);

    // ${ delimiter at position 6 (8 - 2)
    expect(tokens[0]!.char).toBe(6);
    expect(tokens[0]!.length).toBe(2);
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("keyword"));

    // } delimiter at position 12
    expect(tokens[1]!.char).toBe(12);
    expect(tokens[1]!.length).toBe(1);
    expect(tokens[1]!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
  });

  test("extracts delimiters from multiple interpolations", () => {
    // Text: "${a} and ${b}"
    // Expression "a" at 2-3, expression "b" at 11-12
    const text = "${a} and ${b}";
    const rows = createInterpRow([{ start: 2, end: 3 }, { start: 11, end: 12 }]);

    const tokens = extractInterpolationDelimiterTokens(text, rows);

    // Should have 4 tokens: ${, }, ${, }
    expect(tokens.length).toBe(4);

    // First ${
    expect(tokens[0]!.char).toBe(0); // 2 - 2
    expect(tokens[0]!.length).toBe(2);

    // First }
    expect(tokens[1]!.char).toBe(3);
    expect(tokens[1]!.length).toBe(1);

    // Second ${
    expect(tokens[2]!.char).toBe(9); // 11 - 2
    expect(tokens[2]!.length).toBe(2);

    // Second }
    expect(tokens[3]!.char).toBe(12);
    expect(tokens[3]!.length).toBe(1);
  });

  test("skips instructions without interpolation", () => {
    const text = "name";
    // A propertyBinding instruction (not an interpolation)
    const rows: LinkedRow[] = [{
      target: "0",
      node: { kind: "element" } as any,
      instructions: [{
        kind: "propertyBinding",
        to: "value",
        from: { id: "expr", code: "name", loc: { start: 0, end: 4, file: "test.html" } },
        mode: "default",
        loc: null,
      }] as LinkedInstruction[],
    }];

    const tokens = extractInterpolationDelimiterTokens(text, rows);

    expect(tokens.length).toBe(0);
  });

  test("skips interpolation without expressions", () => {
    const text = "plain text";
    const rows: LinkedRow[] = [{
      target: "0",
      node: { kind: "text" } as any,
      instructions: [{
        kind: "textBinding",
        from: {
          kind: "interp",
          parts: ["plain text"],
          exprs: [], // No expressions
          loc: null,
        },
        loc: null,
      }] as LinkedInstruction[],
    }];

    const tokens = extractInterpolationDelimiterTokens(text, rows);

    expect(tokens.length).toBe(0);
  });

  test("skips expression without loc", () => {
    const text = "Hello ${name}!";
    const rows: LinkedRow[] = [{
      target: "0",
      node: { kind: "text" } as any,
      instructions: [{
        kind: "textBinding",
        from: {
          kind: "interp",
          parts: ["Hello ", "!"],
          exprs: [{ id: "expr", code: "name", loc: null }], // No loc
          loc: null,
        },
        loc: null,
      }] as LinkedInstruction[],
    }];

    const tokens = extractInterpolationDelimiterTokens(text, rows);

    expect(tokens.length).toBe(0);
  });

  test("marks delimiters with defaultLibrary modifier", () => {
    // Text: "${x}"
    // Expression "x" at 2-3
    const text = "${x}";
    const rows = createInterpRow([{ start: 2, end: 3 }]);

    const tokens = extractInterpolationDelimiterTokens(text, rows);

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
    expect(tokens[1]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
  });
});

/* ===========================
 * extractMetaElementTokens Tests
 * =========================== */

describe("extractMetaElementTokens", () => {
  const testFileId = "test.html" as any;

  function createEmptyMeta(): TemplateMetaIR {
    return {
      imports: [],
      bindables: [],
      shadowDom: null,
      aliases: [],
      containerless: null,
      capture: null,
      hasSlot: false,
    };
  }

  test("returns empty array for undefined meta", () => {
    const tokens = extractMetaElementTokens("", undefined);
    expect(tokens).toEqual([]);
  });

  test("returns empty array for empty meta", () => {
    const tokens = extractMetaElementTokens("", createEmptyMeta());
    expect(tokens).toEqual([]);
  });

  describe("<import> elements", () => {
    test("extracts tag name token", () => {
      const text = '<import from="./foo">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [{
          kind: "import",
          from: { value: "./foo", loc: { file: testFileId, start: 14, end: 19 } },
          defaultAlias: null,
          namedAliases: [],
          elementLoc: { file: testFileId, start: 0, end: 21 },
          tagLoc: { file: testFileId, start: 1, end: 7 }, // "import" at 1-7
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      const tagToken = tokens.find(t => t.char === 1 && t.length === 6);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
      expect(tagToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
    });

    test("extracts module specifier token", () => {
      const text = '<import from="./foo">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [{
          kind: "import",
          from: { value: "./foo", loc: { file: testFileId, start: 14, end: 19 } },
          defaultAlias: null,
          namedAliases: [],
          elementLoc: { file: testFileId, start: 0, end: 21 },
          tagLoc: { file: testFileId, start: 1, end: 7 },
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      const moduleToken = tokens.find(t => t.char === 14 && t.length === 5);
      expect(moduleToken).toBeDefined();
      expect(moduleToken!.type).toBe(TOKEN_TYPES.indexOf("namespace"));
    });

    test("extracts default alias token", () => {
      const text = '<import from="./foo" as="bar">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [{
          kind: "import",
          from: { value: "./foo", loc: { file: testFileId, start: 14, end: 19 } },
          defaultAlias: { value: "bar", loc: { file: testFileId, start: 25, end: 28 } },
          namedAliases: [],
          elementLoc: { file: testFileId, start: 0, end: 30 },
          tagLoc: { file: testFileId, start: 1, end: 7 },
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      const aliasToken = tokens.find(t => t.char === 25 && t.length === 3);
      expect(aliasToken).toBeDefined();
      expect(aliasToken!.type).toBe(TOKEN_TYPES.indexOf("variable"));
      expect(aliasToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("declaration"));
    });

    test("extracts named alias tokens", () => {
      const text = '<import from="./x" Foo.as="bar">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [{
          kind: "import",
          from: { value: "./x", loc: { file: testFileId, start: 14, end: 17 } },
          defaultAlias: null,
          namedAliases: [{
            exportName: { value: "Foo", loc: { file: testFileId, start: 19, end: 22 } },
            alias: { value: "bar", loc: { file: testFileId, start: 27, end: 30 } },
          }],
          elementLoc: { file: testFileId, start: 0, end: 32 },
          tagLoc: { file: testFileId, start: 1, end: 7 },
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      // Export name (Foo) → namespace
      const exportToken = tokens.find(t => t.char === 19 && t.length === 3);
      expect(exportToken).toBeDefined();
      expect(exportToken!.type).toBe(TOKEN_TYPES.indexOf("namespace"));

      // Alias (bar) → variable declaration
      const aliasToken = tokens.find(t => t.char === 27 && t.length === 3);
      expect(aliasToken).toBeDefined();
      expect(aliasToken!.type).toBe(TOKEN_TYPES.indexOf("variable"));
      expect(aliasToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("declaration"));
    });
  });

  describe("<require> elements", () => {
    test("extracts tag name token for legacy require", () => {
      const text = '<require from="./legacy">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [{
          kind: "require",
          from: { value: "./legacy", loc: { file: testFileId, start: 15, end: 23 } },
          defaultAlias: null,
          namedAliases: [],
          elementLoc: { file: testFileId, start: 0, end: 25 },
          tagLoc: { file: testFileId, start: 1, end: 8 }, // "require" at 1-8
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      const tagToken = tokens.find(t => t.char === 1 && t.length === 7);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
    });
  });

  describe("<bindable> elements", () => {
    test("extracts tag name and property name tokens", () => {
      const text = '<bindable name="value">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        bindables: [{
          name: { value: "value", loc: { file: testFileId, start: 16, end: 21 } },
          mode: null,
          attribute: null,
          elementLoc: { file: testFileId, start: 0, end: 23 },
          tagLoc: { file: testFileId, start: 1, end: 9 }, // "bindable" at 1-9
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      // Tag name → keyword
      const tagToken = tokens.find(t => t.char === 1 && t.length === 8);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));

      // Property name → property
      const nameToken = tokens.find(t => t.char === 16 && t.length === 5);
      expect(nameToken).toBeDefined();
      expect(nameToken!.type).toBe(TOKEN_TYPES.indexOf("property"));
      expect(nameToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("declaration"));
    });

    test("extracts mode token", () => {
      const text = '<bindable name="x" mode="two-way">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        bindables: [{
          name: { value: "x", loc: { file: testFileId, start: 16, end: 17 } },
          mode: { value: "two-way", loc: { file: testFileId, start: 25, end: 32 } },
          attribute: null,
          elementLoc: { file: testFileId, start: 0, end: 34 },
          tagLoc: { file: testFileId, start: 1, end: 9 },
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      const modeToken = tokens.find(t => t.char === 25 && t.length === 7);
      expect(modeToken).toBeDefined();
      expect(modeToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
    });

    test("extracts attribute alias token", () => {
      const text = '<bindable name="myProp" attribute="my-prop">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        bindables: [{
          name: { value: "myProp", loc: { file: testFileId, start: 16, end: 22 } },
          mode: null,
          attribute: { value: "my-prop", loc: { file: testFileId, start: 35, end: 42 } },
          elementLoc: { file: testFileId, start: 0, end: 44 },
          tagLoc: { file: testFileId, start: 1, end: 9 },
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      const attrToken = tokens.find(t => t.char === 35 && t.length === 7);
      expect(attrToken).toBeDefined();
      expect(attrToken!.type).toBe(TOKEN_TYPES.indexOf("property"));
    });
  });

  describe("<use-shadow-dom> element", () => {
    test("extracts tag name token", () => {
      const text = '<use-shadow-dom>';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        shadowDom: {
          mode: { value: "open", loc: { file: testFileId, start: 0, end: 16 } },
          elementLoc: { file: testFileId, start: 0, end: 16 },
          tagLoc: { file: testFileId, start: 1, end: 15 }, // "use-shadow-dom" at 1-15
        },
      };

      const tokens = extractMetaElementTokens(text, meta);

      const tagToken = tokens.find(t => t.char === 1 && t.length === 14);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
      expect(tagToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
    });
  });

  describe("<containerless> element", () => {
    test("extracts tag name token", () => {
      const text = '<containerless>';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        containerless: {
          elementLoc: { file: testFileId, start: 0, end: 15 },
          tagLoc: { file: testFileId, start: 1, end: 14 }, // "containerless" at 1-14
        },
      };

      const tokens = extractMetaElementTokens(text, meta);

      const tagToken = tokens.find(t => t.char === 1 && t.length === 13);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
      expect(tagToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
    });
  });

  describe("<capture> element", () => {
    test("extracts tag name token", () => {
      const text = '<capture>';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        capture: {
          elementLoc: { file: testFileId, start: 0, end: 9 },
          tagLoc: { file: testFileId, start: 1, end: 8 }, // "capture" at 1-8
        },
      };

      const tokens = extractMetaElementTokens(text, meta);

      const tagToken = tokens.find(t => t.char === 1 && t.length === 7);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
      expect(tagToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
    });
  });

  describe("<alias> elements", () => {
    test("extracts tag name and alias name tokens", () => {
      const text = '<alias name="foo">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        aliases: [{
          names: [{ value: "foo", loc: { file: testFileId, start: 13, end: 16 } }],
          elementLoc: { file: testFileId, start: 0, end: 18 },
          tagLoc: { file: testFileId, start: 1, end: 6 }, // "alias" at 1-6
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      // Tag name → keyword
      const tagToken = tokens.find(t => t.char === 1 && t.length === 5);
      expect(tagToken).toBeDefined();
      expect(tagToken!.type).toBe(TOKEN_TYPES.indexOf("keyword"));

      // Alias name → variable declaration
      const nameToken = tokens.find(t => t.char === 13 && t.length === 3);
      expect(nameToken).toBeDefined();
      expect(nameToken!.type).toBe(TOKEN_TYPES.indexOf("variable"));
      expect(nameToken!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("declaration"));
    });

    test("extracts multiple alias names", () => {
      const text = '<alias name="foo, bar">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        aliases: [{
          names: [
            { value: "foo", loc: { file: testFileId, start: 13, end: 16 } },
            { value: "bar", loc: { file: testFileId, start: 18, end: 21 } },
          ],
          elementLoc: { file: testFileId, start: 0, end: 23 },
          tagLoc: { file: testFileId, start: 1, end: 6 },
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      // Both alias names should be variable declarations
      const fooToken = tokens.find(t => t.char === 13 && t.length === 3);
      const barToken = tokens.find(t => t.char === 18 && t.length === 3);

      expect(fooToken).toBeDefined();
      expect(barToken).toBeDefined();
      expect(fooToken!.type).toBe(TOKEN_TYPES.indexOf("variable"));
      expect(barToken!.type).toBe(TOKEN_TYPES.indexOf("variable"));
    });
  });

  describe("Edge cases", () => {
    test("skips meta elements with zero-length spans", () => {
      const text = '<import from="./foo">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [{
          kind: "import",
          from: { value: "./foo", loc: { file: testFileId, start: 0, end: 0 } }, // Zero-length span
          defaultAlias: null,
          namedAliases: [],
          elementLoc: { file: testFileId, start: 0, end: 21 },
          tagLoc: { file: testFileId, start: 0, end: 0 }, // Zero-length span
        }],
      };

      const tokens = extractMetaElementTokens(text, meta);

      // Should not produce tokens for zero-length spans
      expect(tokens).toEqual([]);
    });

    test("handles multiple meta elements of same type", () => {
      const text = '<import from="./a"><import from="./b">';
      const meta: TemplateMetaIR = {
        ...createEmptyMeta(),
        imports: [
          {
            kind: "import",
            from: { value: "./a", loc: { file: testFileId, start: 14, end: 17 } },
            defaultAlias: null,
            namedAliases: [],
            elementLoc: { file: testFileId, start: 0, end: 18 },
            tagLoc: { file: testFileId, start: 1, end: 7 },
          },
          {
            kind: "import",
            from: { value: "./b", loc: { file: testFileId, start: 33, end: 36 } },
            defaultAlias: null,
            namedAliases: [],
            elementLoc: { file: testFileId, start: 18, end: 37 },
            tagLoc: { file: testFileId, start: 19, end: 25 },
          },
        ],
      };

      const tokens = extractMetaElementTokens(text, meta);

      // Should have tokens for both imports
      expect(tokens.length).toBe(4); // 2 tag names + 2 module specifiers
    });
  });
});
