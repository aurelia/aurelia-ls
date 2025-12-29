/**
 * Semantic Tokens Integration Tests - Binding Commands
 *
 * These tests verify that binding command tokens (.bind, .trigger, etc.)
 * are correctly positioned in the output. The key assertion is that
 * slicing the source text at the token position yields the expected text.
 *
 * This catches issues like:
 * - CRLF line ending mismatches
 * - Incorrect offset calculations
 * - Provenance/loc span errors from the compiler
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_SEMANTICS,
  DEFAULT_SYNTAX,
  getExpressionParser,
  lowerDocument,
  resolveHost,
  type LinkedRow,
} from "@aurelia-ls/compiler";
import {
  extractBindingCommandTokens,
  offsetToLineChar,
  type RawToken,
} from "../../out/handlers/semantic-tokens.js";

/* ===========================
 * Test Utilities
 * =========================== */

interface TokenVerification {
  line: number;
  char: number;
  length: number;
  expectedText: string;
  type: number;
}

/**
 * Compiles a template and extracts binding command tokens.
 */
function getBindingTokens(markup: string): { tokens: RawToken[]; text: string; rows: LinkedRow[] } {
  const exprParser = getExpressionParser();
  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser,
    file: "test.html",
    name: "test",
    sem: DEFAULT_SEMANTICS,
  });

  const linked = resolveHost(ir, DEFAULT_SEMANTICS);
  const template = linked.templates[0];
  if (!template) {
    return { tokens: [], text: markup, rows: [] };
  }

  const tokens = extractBindingCommandTokens(markup, template.rows);
  return { tokens, text: markup, rows: template.rows };
}

/**
 * Verifies that a token points to the expected text in the source.
 * This is the key assertion that catches position bugs.
 */
function verifyTokenPosition(text: string, token: RawToken, expectedText: string): void {
  const lines = text.split("\n");
  const line = lines[token.line];

  expect(line, `Line ${token.line} should exist`).toBeDefined();

  const actualText = line!.slice(token.char, token.char + token.length);

  expect(actualText).toBe(
    expectedText,
    `Token at line ${token.line}, char ${token.char}, length ${token.length} should be "${expectedText}" but got "${actualText}"`
  );
}

/**
 * Helper to create test markup with specific line endings.
 */
function withCRLF(text: string): string {
  return text.replace(/\n/g, "\r\n");
}

/* ===========================
 * Listener Binding Tests
 * =========================== */

describe("Semantic Tokens - Listener Bindings", () => {
  it("highlights 'trigger' in click.trigger (LF line endings)", () => {
    const markup = `<button click.trigger="save()">Save</button>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "trigger");
  });

  it("highlights 'trigger' in click.trigger (CRLF line endings)", () => {
    const markup = withCRLF(`<button click.trigger="save()">Save</button>`);
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "trigger");
  });

  it("highlights 'trigger' with multiline template (LF)", () => {
    const markup = `<div>
  <span>Hello</span>
  <button click.trigger="increment()">+</button>
</div>`;
    const { tokens, text } = getBindingTokens(markup);

    const triggerToken = tokens.find(t => t.length === 7); // "trigger" is 7 chars
    expect(triggerToken, "Should find trigger token").toBeDefined();
    verifyTokenPosition(text, triggerToken!, "trigger");
  });

  it("highlights 'trigger' with multiline template (CRLF)", () => {
    const markup = withCRLF(`<div>
  <span>Hello</span>
  <button click.trigger="increment()">+</button>
</div>`);
    const { tokens, text } = getBindingTokens(markup);

    const triggerToken = tokens.find(t => t.length === 7);
    expect(triggerToken, "Should find trigger token").toBeDefined();
    verifyTokenPosition(text, triggerToken!, "trigger");
  });

  it("highlights 'capture' in click.capture", () => {
    const markup = `<div click.capture="handler()">Content</div>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "capture");
  });
});

/* ===========================
 * Property Binding Tests
 * =========================== */

describe("Semantic Tokens - Property Bindings", () => {
  it("highlights 'bind' in value.bind (LF)", () => {
    const markup = `<input value.bind="message">`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "bind");
  });

  it("highlights 'bind' in value.bind (CRLF)", () => {
    const markup = withCRLF(`<input value.bind="message">`);
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "bind");
  });

  it("highlights 'two-way' in value.two-way", () => {
    const markup = `<input value.two-way="data">`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "two-way");
  });

  it("highlights 'to-view' in value.to-view", () => {
    const markup = `<span textContent.to-view="message"></span>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "to-view");
  });

  it("highlights 'from-view' in value.from-view", () => {
    const markup = `<input value.from-view="data">`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "from-view");
  });

  it("highlights 'one-time' in value.one-time", () => {
    const markup = `<span textContent.one-time="staticValue"></span>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "one-time");
  });
});

/* ===========================
 * Template Controller Tests
 * =========================== */

describe("Semantic Tokens - Template Controllers", () => {
  it("highlights 'if' and 'bind' in if.bind (LF)", () => {
    const markup = `<div if.bind="show">Content</div>`;
    const { tokens, text } = getBindingTokens(markup);

    // Should have 'if' (keyword) and 'bind' (parameter)
    expect(tokens.length).toBe(2);

    const ifToken = tokens.find(t => t.length === 2);
    const bindToken = tokens.find(t => t.length === 4);

    expect(ifToken).toBeDefined();
    expect(bindToken).toBeDefined();

    verifyTokenPosition(text, ifToken!, "if");
    verifyTokenPosition(text, bindToken!, "bind");
  });

  it("highlights 'if' and 'bind' in if.bind (CRLF)", () => {
    const markup = withCRLF(`<div if.bind="show">Content</div>`);
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(2);

    const ifToken = tokens.find(t => t.length === 2);
    const bindToken = tokens.find(t => t.length === 4);

    verifyTokenPosition(text, ifToken!, "if");
    verifyTokenPosition(text, bindToken!, "bind");
  });

  it("highlights 'repeat' and 'for' in repeat.for (LF)", () => {
    const markup = `<div repeat.for="item of items">Item</div>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(2);

    const repeatToken = tokens.find(t => t.length === 6);
    const forToken = tokens.find(t => t.length === 3);

    expect(repeatToken).toBeDefined();
    expect(forToken).toBeDefined();

    verifyTokenPosition(text, repeatToken!, "repeat");
    verifyTokenPosition(text, forToken!, "for");
  });

  it("highlights 'repeat' and 'for' in repeat.for (CRLF)", () => {
    const markup = withCRLF(`<div repeat.for="item of items">Item</div>`);
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(2);

    const repeatToken = tokens.find(t => t.length === 6);
    const forToken = tokens.find(t => t.length === 3);

    verifyTokenPosition(text, repeatToken!, "repeat");
    verifyTokenPosition(text, forToken!, "for");
  });

  it("highlights 'else' keyword", () => {
    const markup = `<template else>Fallback</template>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "else");
  });

  it("highlights 'switch' and 'bind' in switch.bind", () => {
    const markup = `<div switch.bind="status">Content</div>`;
    const { tokens, text } = getBindingTokens(markup);

    // Should have 'switch' (keyword) and 'bind' (parameter)
    expect(tokens.length).toBe(2);

    const switchToken = tokens.find(t => t.length === 6);
    const bindToken = tokens.find(t => t.length === 4);

    expect(switchToken).toBeDefined();
    expect(bindToken).toBeDefined();

    verifyTokenPosition(text, switchToken!, "switch");
    verifyTokenPosition(text, bindToken!, "bind");
  });

  it("highlights 'case' in case attribute", () => {
    const markup = `<div switch.bind="status"><span case="active">Active</span></div>`;
    const { tokens, text } = getBindingTokens(markup);

    // Should have 'switch' (keyword), 'bind' (parameter), and 'case' (keyword)
    expect(tokens.length).toBe(3);

    const caseToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === "case";
    });

    expect(caseToken, "Should find case token").toBeDefined();
    verifyTokenPosition(text, caseToken!, "case");
  });

  it("highlights 'default-case' keyword", () => {
    const markup = `<div switch.bind="status"><span default-case>Unknown</span></div>`;
    const { tokens, text } = getBindingTokens(markup);

    const defaultCaseToken = tokens.find(t => t.length === 12);
    expect(defaultCaseToken, "Should find default-case token").toBeDefined();
    verifyTokenPosition(text, defaultCaseToken!, "default-case");
  });

  it("highlights nested template controllers (if inside if)", () => {
    const markup = `<div if.bind="outer"><span if.bind="inner">Nested</span></div>`;
    const { tokens } = getBindingTokens(markup);

    // Should have: outer 'if', outer 'bind', inner 'if', inner 'bind'
    expect(tokens.length).toBe(4);
  });

  it("highlights binding commands inside template controllers", () => {
    const markup = `<div if.bind="show"><button click.trigger="doIt()">Click</button></div>`;
    const { tokens, text } = getBindingTokens(markup);

    // Should have: 'if', 'bind', 'trigger'
    const triggerToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === "trigger";
    });

    expect(triggerToken, "Should find nested trigger token").toBeDefined();
  });

  it("highlights custom attributes inside template controllers", () => {
    // Custom attribute 'focus' nested inside 'if'
    const markup = `<div if.bind="show"><input focus.bind="shouldFocus"></div>`;
    const { tokens } = getBindingTokens(markup);

    // Should have: if, bind, focus (namespace), bind
    expect(tokens.length).toBeGreaterThan(2); // At least if + bind + something for focus
  });

  it("highlights repeat.for inside if.bind", () => {
    const markup = `<div if.bind="show"><ul><li repeat.for="item of items">\${item}</li></ul></div>`;
    const { tokens, text } = getBindingTokens(markup);

    // Should have: 'if', 'bind', 'repeat', 'for'
    const repeatToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === "repeat";
    });

    const forToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === "for";
    });

    expect(repeatToken, "Should find nested repeat token").toBeDefined();
    expect(forToken, "Should find nested for token").toBeDefined();
  });
});

/* ===========================
 * Complex Template Tests
 * =========================== */

describe("Semantic Tokens - Complex Templates", () => {
  it("handles multiple bindings on different lines (CRLF)", () => {
    const markup = withCRLF(`<div>
  <input value.bind="name">
  <button click.trigger="save()">Save</button>
  <span if.bind="showMessage">\${message}</span>
</div>`);

    const { tokens, text } = getBindingTokens(markup);

    // Find specific tokens by length
    const bindTokens = tokens.filter(t => t.length === 4); // "bind"
    const triggerToken = tokens.find(t => t.length === 7); // "trigger"
    const ifToken = tokens.find(t => t.length === 2); // "if"

    // Verify each token points to correct text
    for (const token of bindTokens) {
      verifyTokenPosition(text, token, "bind");
    }

    if (triggerToken) {
      verifyTokenPosition(text, triggerToken, "trigger");
    }

    if (ifToken) {
      verifyTokenPosition(text, ifToken, "if");
    }
  });

  it("handles deeply indented template (CRLF)", () => {
    const markup = withCRLF(`<div>
    <div>
        <div>
            <button click.trigger="action()">Action</button>
        </div>
    </div>
</div>`);

    const { tokens, text } = getBindingTokens(markup);

    const triggerToken = tokens.find(t => t.length === 7);
    expect(triggerToken).toBeDefined();
    verifyTokenPosition(text, triggerToken!, "trigger");
  });
});

/* ===========================
 * CRLF/LF Mismatch Simulation
 * =========================== */

describe("Semantic Tokens - CRLF/LF Mismatch (simulates VS Code behavior)", () => {
  /**
   * This test simulates the real-world scenario where:
   * 1. The compiler reads the file from disk (with CRLF line endings)
   * 2. VS Code normalizes line endings to LF in doc.getText()
   * 3. The loc offsets from the compiler don't match the normalized text
   */
  it("FAILS if loc offsets are computed from CRLF but text is LF", () => {
    // Simulate: compiler parses CRLF file
    const markupOnDisk = "line1\r\nline2\r\n<button click.trigger=\"save()\">Save</button>";
    const exprParser = getExpressionParser();
    const ir = lowerDocument(markupOnDisk, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: "test.html",
      name: "test",
      sem: DEFAULT_SEMANTICS,
    });
    const linked = resolveHost(ir, DEFAULT_SEMANTICS);
    const template = linked.templates[0]!;

    // Simulate: VS Code normalizes to LF
    const textFromVSCode = markupOnDisk.replace(/\r\n/g, "\n");

    // This is what the handler does - use VS Code text but compiler's rows
    const tokens = extractBindingCommandTokens(textFromVSCode, template.rows);

    // If CRLF handling is broken, this will fail because:
    // - loc offsets are based on CRLF positions
    // - but we're slicing from LF text
    expect(tokens.length).toBe(1);
    verifyTokenPosition(textFromVSCode, tokens[0]!, "trigger");
  });

  it("FAILS with multiple lines of CRLF mismatch", () => {
    // More lines = more accumulated offset error
    const markupOnDisk = withCRLF(`<div>
  <span>Line 1</span>
  <span>Line 2</span>
  <span>Line 3</span>
  <span>Line 4</span>
  <button click.trigger="save()">Save</button>
</div>`);

    const exprParser = getExpressionParser();
    const ir = lowerDocument(markupOnDisk, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: "test.html",
      name: "test",
      sem: DEFAULT_SEMANTICS,
    });
    const linked = resolveHost(ir, DEFAULT_SEMANTICS);
    const template = linked.templates[0]!;

    // VS Code normalizes to LF
    const textFromVSCode = markupOnDisk.replace(/\r\n/g, "\n");

    const tokens = extractBindingCommandTokens(textFromVSCode, template.rows);

    const triggerToken = tokens.find(t => t.length === 7);
    expect(triggerToken, "Should find trigger token").toBeDefined();

    // This WILL FAIL if there's a CRLF mismatch bug
    // The error will be proportional to the number of lines (one \r per line)
    verifyTokenPosition(textFromVSCode, triggerToken!, "trigger");
  });
});

/* ===========================
 * offsetToLineChar Tests with CRLF
 * =========================== */

describe("Diagnostic: Slice positions", () => {
  it("shows what loc offsets actually produce (2 lines)", () => {
    // Compile with CRLF
    const markupOnDisk = "line1\r\nline2\r\n<button click.trigger=\"save()\">Save</button>";
    const exprParser = getExpressionParser();
    const ir = lowerDocument(markupOnDisk, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: "test.html",
      name: "test",
      sem: DEFAULT_SEMANTICS,
    });
    const linked = resolveHost(ir, DEFAULT_SEMANTICS);
    const template = linked.templates[0]!;

    // Find the listener binding instruction
    const listenerIns = template.rows
      .flatMap(r => r.instructions)
      .find(i => i.kind === "listenerBinding");
    expect(listenerIns, "Should find listener instruction").toBeDefined();

    const loc = (listenerIns as { loc?: { start: number; end: number } }).loc;
    expect(loc, "Instruction should have loc").toBeDefined();

    // Log what we're slicing
    const textCRLF = markupOnDisk;
    const textLF = markupOnDisk.replace(/\r\n/g, "\n");

    const sliceFromCRLF = textCRLF.slice(loc!.start, loc!.end);
    const sliceFromLF = textLF.slice(loc!.start, loc!.end);

    console.log(`loc.start=${loc!.start}, loc.end=${loc!.end}`);
    console.log(`CRLF text length=${textCRLF.length}, LF text length=${textLF.length}`);
    console.log(`slice from CRLF: "${sliceFromCRLF}"`);
    console.log(`slice from LF:   "${sliceFromLF}"`);

    // The slices should be different if there's a CRLF mismatch!
    // This is the bug we're trying to expose
    if (sliceFromCRLF !== sliceFromLF) {
      console.log("BUG DETECTED: Slices don't match!");
    }
  });

  it("PROVES BUG: many lines cause larger offset shift (mismatched text)", () => {
    // 10 lines of CRLF = 10 bytes lost when converting to LF
    const lines = Array(10).fill("line").join("\r\n");
    const markupOnDisk = `${lines}\r\n<button click.trigger="save()">Save</button>`;

    const exprParser = getExpressionParser();
    // BUG: Compile with CRLF text (simulating disk read)
    const ir = lowerDocument(markupOnDisk, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: "test.html",
      name: "test",
      sem: DEFAULT_SEMANTICS,
    });
    const linked = resolveHost(ir, DEFAULT_SEMANTICS);
    const template = linked.templates[0]!;

    // BUG: Extract with LF text (simulating VS Code normalized text)
    const textLF = markupOnDisk.replace(/\r\n/g, "\n");

    // This demonstrates the bug - using mismatched text
    const tokens = extractBindingCommandTokens(textLF, template.rows);

    // With 10 lines of mismatch, the slice is so wrong that no token is found
    expect(tokens.length).toBe(0); // Bug: no tokens found due to garbled slice
  });

  it("FIX: using same text for compile and extract works correctly", () => {
    // 10 lines of CRLF
    const lines = Array(10).fill("line").join("\r\n");
    const markupOnDisk = `${lines}\r\n<button click.trigger="save()">Save</button>`;

    const exprParser = getExpressionParser();
    // FIX: Compile with the SAME text we'll use for extraction
    const ir = lowerDocument(markupOnDisk, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: "test.html",
      name: "test",
      sem: DEFAULT_SEMANTICS,
    });
    const linked = resolveHost(ir, DEFAULT_SEMANTICS);
    const template = linked.templates[0]!;

    // FIX: Use the SAME text for extraction (CRLF in this case)
    const tokens = extractBindingCommandTokens(markupOnDisk, template.rows);
    const triggerToken = tokens.find(t => t.length === 7);
    expect(triggerToken, "Should find trigger token").toBeDefined();

    // Verify it points to correct text in the CRLF source
    verifyTokenPosition(markupOnDisk, triggerToken!, "trigger");
  });
});

describe("offsetToLineChar with CRLF", () => {
  it("correctly handles LF line endings", () => {
    const text = "line1\nline2\nline3";

    expect(offsetToLineChar(text, 0)).toEqual({ line: 0, char: 0 }); // 'l' in line1
    expect(offsetToLineChar(text, 5)).toEqual({ line: 0, char: 5 }); // '\n'
    expect(offsetToLineChar(text, 6)).toEqual({ line: 1, char: 0 }); // 'l' in line2
    expect(offsetToLineChar(text, 12)).toEqual({ line: 2, char: 0 }); // 'l' in line3
  });

  it("correctly handles CRLF line endings", () => {
    const text = "line1\r\nline2\r\nline3";

    expect(offsetToLineChar(text, 0)).toEqual({ line: 0, char: 0 }); // 'l' in line1
    expect(offsetToLineChar(text, 5)).toEqual({ line: 0, char: 5 }); // '\r'
    expect(offsetToLineChar(text, 6)).toEqual({ line: 0, char: 6 }); // '\n' - NOTE: char is 6, not reset yet!
    expect(offsetToLineChar(text, 7)).toEqual({ line: 1, char: 0 }); // 'l' in line2
  });

  it("CRLF causes char offset mismatch", () => {
    // This test documents the CRLF bug if it exists
    const textLF = "ab\ncd";
    const textCRLF = "ab\r\ncd";

    // In LF text, 'c' is at offset 3
    expect(offsetToLineChar(textLF, 3)).toEqual({ line: 1, char: 0 });

    // In CRLF text, 'c' is at offset 4
    const result = offsetToLineChar(textCRLF, 4);
    expect(result).toEqual({ line: 1, char: 0 });
  });
});
