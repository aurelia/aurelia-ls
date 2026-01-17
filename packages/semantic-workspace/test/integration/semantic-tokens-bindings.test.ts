/**
 * Semantic Tokens Integration Tests - Binding Commands
 *
 * These tests verify that binding command tokens (.bind, .trigger, etc.)
 * are correctly positioned in the output. The key assertion is that
 * slicing the source text at the token position yields the expected text.
 */

import { describe, it, expect } from "vitest";
import { compileTemplate, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
import { collectSemanticTokens } from "../../src/semantic-tokens.js";

/* ===========================
 * Test Utilities
 * =========================== */

type RawToken = {
  line: number;
  char: number;
  length: number;
  type: string;
};

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

const VM = createVmReflection();

function compileForTokens(markup: string) {
  return compileTemplate({
    html: markup,
    templateFilePath: "test.html",
    isJs: false,
    vm: VM,
    semantics: DEFAULT_SEMANTICS,
  });
}

function offsetToLineChar(text: string, offset: number): { line: number; char: number } {
  const length = text.length;
  const clamped = Math.max(0, Math.min(offset, length));
  const lineStarts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = lineStarts[line] ?? 0;
  return { line, char: clamped - lineStart };
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
}

function toRawTokens(tokens: { span: { start: number; end: number }; type: string }[], text: string): RawToken[] {
  return tokens.map((token) => {
    const pos = offsetToLineChar(text, token.span.start);
    return {
      line: pos.line,
      char: pos.char,
      length: token.span.end - token.span.start,
      type: token.type,
    };
  });
}

function getBindingTokens(markup: string, tokenText?: string): { tokens: RawToken[]; text: string } {
  const compilation = compileForTokens(markup);
  const text = tokenText ?? markup;
  const tokens = collectSemanticTokens(text, compilation)
    .filter((token) => token.type === "aureliaCommand" || token.type === "aureliaController");
  return { tokens: toRawTokens(tokens, text), text };
}

function getInterpolationTokens(markup: string, tokenText?: string): { tokens: RawToken[]; text: string } {
  const compilation = compileForTokens(markup);
  const text = tokenText ?? markup;
  const tokens = collectSemanticTokens(text, compilation)
    .filter((token) => token.type === "aureliaExpression");
  return { tokens: toRawTokens(tokens, text), text };
}

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
    const markup = `<div>\n  <span>Hello</span>\n  <button click.trigger="increment()">+</button>\n</div>`;
    const { tokens, text } = getBindingTokens(markup);

    const triggerToken = tokens.find(t => t.length === 7); // "trigger" is 7 chars
    expect(triggerToken, "Should find trigger token").toBeDefined();
    verifyTokenPosition(text, triggerToken!, "trigger");
  });

  it("highlights 'trigger' with multiline template (CRLF)", () => {
    const markup = withCRLF(`<div>\n  <span>Hello</span>\n  <button click.trigger="increment()">+</button>\n</div>`);
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

    expect(tokens.length).toBe(4);
  });

  it("highlights binding commands inside template controllers", () => {
    const markup = `<div if.bind="show"><button click.trigger="doIt()">Click</button></div>`;
    const { tokens, text } = getBindingTokens(markup);

    const triggerToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === "trigger";
    });

    expect(triggerToken, "Should find nested trigger token").toBeDefined();
  });

  it("highlights custom attributes inside template controllers", () => {
    const markup = `<div if.bind="show"><input focus.bind="shouldFocus"></div>`;
    const { tokens } = getBindingTokens(markup);

    expect(tokens.length).toBeGreaterThan(2);
  });

  it("highlights repeat.for inside if.bind", () => {
    const markup = `<div if.bind="show"><ul><li repeat.for="item of items">\${item}</li></ul></div>`;
    const { tokens, text } = getBindingTokens(markup);

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
 * Shorthand Syntax Tests
 * =========================== */

describe("Semantic Tokens - Shorthand Syntax", () => {
  it("highlights '@' in @click shorthand", () => {
    const markup = `<button @click="save()">Save</button>`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, "@");
  });

  it("highlights ':' in :value shorthand", () => {
    const markup = `<input :value="name">`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(1);
    verifyTokenPosition(text, tokens[0]!, ":");
  });

  it("highlights '@' with multiline template (CRLF)", () => {
    const markup = withCRLF(`<div>\n  <span>Hello</span>\n  <button @click="increment()">+</button>\n</div>`);
    const { tokens, text } = getBindingTokens(markup);

    const atToken = tokens.find(t => t.length === 1);
    expect(atToken, "Should find @ token").toBeDefined();
    verifyTokenPosition(text, atToken!, "@");
  });

  it("highlights ':' with multiline template (CRLF)", () => {
    const markup = withCRLF(`<div>\n  <span>Hello</span>\n  <input :value="name">\n</div>`);
    const { tokens, text } = getBindingTokens(markup);

    const colonToken = tokens.find(t => t.length === 1);
    expect(colonToken, "Should find : token").toBeDefined();
    verifyTokenPosition(text, colonToken!, ":");
  });

  it("handles mixed shorthand and explicit bindings", () => {
    const markup = `<input :value="name" @change="update()">`;
    const { tokens, text } = getBindingTokens(markup);

    expect(tokens.length).toBe(2);

    const colonToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === ":";
    });
    const atToken = tokens.find(t => {
      const lines = text.split("\n");
      const line = lines[t.line] ?? "";
      return line.slice(t.char, t.char + t.length) === "@";
    });

    expect(colonToken, "Should find : token").toBeDefined();
    expect(atToken, "Should find @ token").toBeDefined();
  });
});

/* ===========================
 * Complex Template Tests
 * =========================== */

describe("Semantic Tokens - Complex Templates", () => {
  it("handles multiple bindings on different lines (CRLF)", () => {
    const markup = withCRLF(`<div>\n  <input value.bind="name">\n  <button click.trigger="save()">Save</button>\n  <span if.bind="showMessage">\${message}</span>\n</div>`);

    const { tokens, text } = getBindingTokens(markup);

    const bindTokens = tokens.filter(t => t.length === 4); // "bind"
    const triggerToken = tokens.find(t => t.length === 7); // "trigger"
    const ifToken = tokens.find(t => t.length === 2); // "if"

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
    const markup = withCRLF(`<div>\n    <div>\n        <div>\n            <button click.trigger="action()">Action</button>\n        </div>\n    </div>\n</div>`);

    const { tokens, text } = getBindingTokens(markup);

    const triggerToken = tokens.find(t => t.length === 7);
    expect(triggerToken).toBeDefined();
    verifyTokenPosition(text, triggerToken!, "trigger");
  });
});

/* ===========================
 * Interpolation Delimiter Tests
 * =========================== */

describe("Semantic Tokens - Interpolation Delimiters", () => {
  it("highlights ${ and } in text interpolation", () => {
    const markup = `<div>\${count} items</div>`;
    const { tokens, text } = getInterpolationTokens(markup);

    expect(tokens.length).toBe(2);

    verifyTokenPosition(text, tokens[0]!, "${");
    expect(tokens[0]!.length).toBe(2);

    verifyTokenPosition(text, tokens[1]!, "}");
    expect(tokens[1]!.length).toBe(1);
  });

  it("highlights ${ and } in attribute interpolation", () => {
    const markup = `<div title="Hello \${name}!"></div>`;
    const { tokens, text } = getInterpolationTokens(markup);

    expect(tokens.length).toBe(2);
    verifyTokenPosition(text, tokens[0]!, "${");
    verifyTokenPosition(text, tokens[1]!, "}");
  });

  it("highlights multiple interpolations", () => {
    const markup = `<div>\${a} and \${b}</div>`;
    const { tokens, text } = getInterpolationTokens(markup);

    expect(tokens.length).toBe(4);

    verifyTokenPosition(text, tokens[0]!, "${");
    verifyTokenPosition(text, tokens[1]!, "}");
    verifyTokenPosition(text, tokens[2]!, "${");
    verifyTokenPosition(text, tokens[3]!, "}");
  });

  it("handles interpolation with CRLF line endings", () => {
    const markup = withCRLF(`<div>\n  <span>\${message}</span>\n</div>`);
    const { tokens, text } = getInterpolationTokens(markup);

    expect(tokens.length).toBe(2);
    verifyTokenPosition(text, tokens[0]!, "${");
    verifyTokenPosition(text, tokens[1]!, "}");
  });

  it("handles complex expression in interpolation", () => {
    const markup = `<div>\${user.name | uppercase}</div>`;
    const { tokens, text } = getInterpolationTokens(markup);

    expect(tokens.length).toBe(2);
    verifyTokenPosition(text, tokens[0]!, "${");
    verifyTokenPosition(text, tokens[1]!, "}");
  });
});
