/**
 * CRLF Span Fidelity — regression test for source coordinate invariant.
 *
 * HTML spec preprocessing normalizes \r\n → \n before tokenization.
 * Parse5 node values contain post-preprocessing text, but sourceCodeLocation
 * reports pre-preprocessing byte offsets.  The lowering stage must use
 * source-aligned text (sourceSlice/sourceAttrValue) to ensure expression
 * spans reference the correct source positions.
 *
 * This test uses CRLF line endings in multiline attribute values and
 * verifies that expression spans point to the correct source text.
 * Without the SourceAlignedText invariant, each \r\n before an expression
 * shifts its span backward by one byte per occurrence.
 *
 * See: L1 template-analysis.md §Source Coordinate Fidelity.
 */
import { describe, expect, it } from "vitest";
import { lowerDocument } from "../../out/analysis/10-lower/lower.js";
import { createCompilerContext, lowerOpts, type TestVector } from "../_helpers/vector-runner.js";
import type { InterpIR, TemplateIR } from "../../out/model/ir.js";

function collectExprSpans(ir: { templates: readonly TemplateIR[] }) {
  const results: { code: string; start: number; end: number }[] = [];
  for (const tpl of ir.templates) {
    for (const row of tpl.rows) {
      for (const ins of row.instructions) {
        const from = (ins as { from?: InterpIR }).from;
        if (from && "exprs" in from) {
          for (const expr of from.exprs) {
            results.push({ code: expr.code, start: expr.loc!.start, end: expr.loc!.end });
          }
        }
        if (from && "id" in from && from.loc) {
          results.push({ code: (from as { code: string }).code, start: from.loc.start, end: from.loc.end });
        }
      }
    }
  }
  return results;
}

describe("CRLF span fidelity", () => {
  it("attribute interpolation spans are correct with CRLF line endings", () => {
    // CRLF between tag and attribute — the \r\n creates a 1-byte drift
    // if the lowering stage uses a.value instead of sourceAttrValue.
    const markup = '<template><div\r\n  title="hello ${name}"></div></template>';
    const ctx = createCompilerContext({ name: "crlf-attr", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const exprs = collectExprSpans(ir);
    expect(exprs.length).toBeGreaterThan(0);

    for (const expr of exprs) {
      const sourceText = markup.slice(expr.start, expr.end);
      expect(
        sourceText,
        `Span [${expr.start}, ${expr.end}) should cover '${expr.code}' but got '${sourceText}'`,
      ).toBe(expr.code);
    }
  });

  it("multiple CRLFs accumulate correctly in style interpolation", () => {
    // Three CRLF sequences before the interpolation = 3 bytes of potential drift.
    const markup = '<template><div\r\n  style="width:\r\n    ${total}%;\r\n"></div></template>';
    const ctx = createCompilerContext({ name: "crlf-style", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const exprs = collectExprSpans(ir);
    expect(exprs.length).toBeGreaterThan(0);

    for (const expr of exprs) {
      const sourceText = markup.slice(expr.start, expr.end);
      expect(
        sourceText,
        `Span [${expr.start}, ${expr.end}) should cover '${expr.code}' but got '${sourceText}'`,
      ).toBe(expr.code);
    }
  });

  it("LF-only markup produces identical spans (control)", () => {
    // Same template with LF only — should work regardless.
    const markup = '<template><div\n  title="hello ${name}"></div></template>';
    const ctx = createCompilerContext({ name: "lf-attr", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const exprs = collectExprSpans(ir);
    expect(exprs.length).toBeGreaterThan(0);

    for (const expr of exprs) {
      const sourceText = markup.slice(expr.start, expr.end);
      expect(sourceText).toBe(expr.code);
    }
  });

  it("CRLF in text node interpolation spans are correct", () => {
    const markup = '<template><div>\r\nhello ${name}\r\n</div></template>';
    const ctx = createCompilerContext({ name: "crlf-text", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const exprs = collectExprSpans(ir);
    expect(exprs.length).toBeGreaterThan(0);

    for (const expr of exprs) {
      const sourceText = markup.slice(expr.start, expr.end);
      expect(
        sourceText,
        `Text node span [${expr.start}, ${expr.end}) should cover '${expr.code}' but got '${sourceText}'`,
      ).toBe(expr.code);
    }
  });

  it("nested calls in CRLF style attribute produce correct spans", () => {
    // The original bug report pattern with CRLF.
    const markup = '<template><div\r\n  style="width: ${Math.min(Math.max(( cooldowns )))}%;"></div></template>';
    const ctx = createCompilerContext({ name: "crlf-nested", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const exprs = collectExprSpans(ir);
    expect(exprs.length).toBeGreaterThan(0);

    for (const expr of exprs) {
      const sourceText = markup.slice(expr.start, expr.end);
      expect(
        sourceText,
        `Span [${expr.start}, ${expr.end}) should cover '${expr.code}' but got '${sourceText}'`,
      ).toBe(expr.code);
    }
  });
});
