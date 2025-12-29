import { test, expect, describe, vi } from "vitest";
import {
  TOKEN_TYPES,
  TOKEN_MODIFIERS,
  SEMANTIC_TOKENS_LEGEND,
  encodeTokens,
  offsetToLineChar,
  buildNodeMap,
  extractTokens,
  handleSemanticTokensFull,
  type RawToken,
} from "../../out/handlers/semantic-tokens.js";
import type { DOMNode, ElementNode, LinkedRow, NodeSem } from "@aurelia-ls/compiler";

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
