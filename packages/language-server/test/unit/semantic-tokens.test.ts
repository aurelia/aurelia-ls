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
  handleSemanticTokensFull,
  type RawToken,
} from "../../out/handlers/semantic-tokens.js";
import type { DOMNode, ElementNode, LinkedRow, NodeSem, ExprTableEntry, SourceSpan, LinkedInstruction } from "@aurelia-ls/compiler";

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
  function createMockContext(overrides: Record<string, unknown> = {}) {
    return {
      logger: {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      ensureProgramDocument: vi.fn(),
      workspace: {
        program: {
          getCompilation: vi.fn(),
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
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("parameter"));
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
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("parameter"));
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

  test("does not extract command for @ shorthand", () => {
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

    // @ shorthand doesn't have a visible command to highlight
    expect(tokens.length).toBe(0);
  });

  test("does not extract command for : shorthand", () => {
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

    // : shorthand doesn't have a visible command to highlight
    expect(tokens.length).toBe(0);
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
  function createInterpEntry(
    id: string,
    ast: Record<string, unknown>,
  ): ExprTableEntry {
    return {
      id: id as any,
      expressionType: "Interpolation" as any,
      ast,
    } as ExprTableEntry;
  }

  test("extracts ${ and } delimiters from simple interpolation", () => {
    const text = "Hello ${name}!";
    const entry = createInterpEntry("0", {
      $kind: "Interpolation",
      span: { start: 0, end: 14 },
      parts: ["Hello ", "!"],
      expressions: [
        {
          $kind: "AccessScope",
          span: { start: 8, end: 12 },
          name: "name",
        },
      ],
    });
    const spans = new Map([["0", { start: 0, end: 14 } as SourceSpan]]);

    const tokens = extractInterpolationDelimiterTokens(text, [entry], spans);

    // Should have 2 tokens: ${ and }
    expect(tokens.length).toBe(2);

    // ${ delimiter
    expect(tokens[0]!.char).toBe(6); // Position of $
    expect(tokens[0]!.length).toBe(2); // ${
    expect(tokens[0]!.type).toBe(TOKEN_TYPES.indexOf("keyword"));

    // } delimiter
    expect(tokens[1]!.char).toBe(12); // Position of }
    expect(tokens[1]!.length).toBe(1); // }
    expect(tokens[1]!.type).toBe(TOKEN_TYPES.indexOf("keyword"));
  });

  test("extracts delimiters from multiple interpolations", () => {
    const text = "${a} and ${b}";
    const entry = createInterpEntry("0", {
      $kind: "Interpolation",
      span: { start: 0, end: 13 },
      parts: ["", " and ", ""],
      expressions: [
        {
          $kind: "AccessScope",
          span: { start: 2, end: 3 },
          name: "a",
        },
        {
          $kind: "AccessScope",
          span: { start: 11, end: 12 },
          name: "b",
        },
      ],
    });
    const spans = new Map([["0", { start: 0, end: 13 } as SourceSpan]]);

    const tokens = extractInterpolationDelimiterTokens(text, [entry], spans);

    // Should have 4 tokens: ${, }, ${, }
    expect(tokens.length).toBe(4);

    // First ${
    expect(tokens[0]!.char).toBe(0);
    expect(tokens[0]!.length).toBe(2);

    // First }
    expect(tokens[1]!.char).toBe(3);
    expect(tokens[1]!.length).toBe(1);

    // Second ${
    expect(tokens[2]!.char).toBe(9);
    expect(tokens[2]!.length).toBe(2);

    // Second }
    expect(tokens[3]!.char).toBe(12);
    expect(tokens[3]!.length).toBe(1);
  });

  test("skips non-interpolation expressions", () => {
    const text = "name";
    const entry: ExprTableEntry = {
      id: "0" as any,
      expressionType: "IsProperty" as any,
      ast: {
        $kind: "AccessScope",
        span: { start: 0, end: 4 },
        name: "name",
      },
    } as ExprTableEntry;
    const spans = new Map([["0", { start: 0, end: 4 } as SourceSpan]]);

    const tokens = extractInterpolationDelimiterTokens(text, [entry], spans);

    expect(tokens.length).toBe(0);
  });

  test("skips interpolation without expressions", () => {
    const text = "plain text";
    const entry = createInterpEntry("0", {
      $kind: "Interpolation",
      span: { start: 0, end: 10 },
      parts: ["plain text"],
      expressions: [],
    });
    const spans = new Map([["0", { start: 0, end: 10 } as SourceSpan]]);

    const tokens = extractInterpolationDelimiterTokens(text, [entry], spans);

    expect(tokens.length).toBe(0);
  });

  test("skips interpolation entry without corresponding span", () => {
    const text = "Hello ${name}!";
    const entry = createInterpEntry("0", {
      $kind: "Interpolation",
      span: { start: 0, end: 14 },
      parts: ["Hello ", "!"],
      expressions: [
        {
          $kind: "AccessScope",
          span: { start: 8, end: 12 },
          name: "name",
        },
      ],
    });
    // Empty spans map
    const spans = new Map<string, SourceSpan>();

    const tokens = extractInterpolationDelimiterTokens(text, [entry], spans);

    expect(tokens.length).toBe(0);
  });

  test("marks delimiters with defaultLibrary modifier", () => {
    const text = "${x}";
    const entry = createInterpEntry("0", {
      $kind: "Interpolation",
      span: { start: 0, end: 4 },
      parts: ["", ""],
      expressions: [
        {
          $kind: "AccessScope",
          span: { start: 2, end: 3 },
          name: "x",
        },
      ],
    });
    const spans = new Map([["0", { start: 0, end: 4 } as SourceSpan]]);

    const tokens = extractInterpolationDelimiterTokens(text, [entry], spans);

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
    expect(tokens[1]!.modifiers).toBe(1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"));
  });
});
