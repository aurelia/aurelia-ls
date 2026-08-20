import { describe, expect, test } from "vitest";
import {
  HOVER_CARD_MARKDOWN_LIMIT,
  HOVER_CARD_SIGNATURE_SOFT_LIMIT,
  hoverCardMarkdownCodePointLength,
  renderHoverCard,
} from "../../src/mapping/hover-card.js";

describe("renderHoverCard", () => {
  test("orders identity, relevant context, and one audible status without decoration", () => {
    const markdown = renderHoverCard({
      identity: {
        language: "ts",
        authored: "item",
        typeDetail: ": Item",
      },
      context: [{ prefix: "Repeat local." }],
      status: {
        kind: "diagnostic",
        severity: "warning",
        code: "missing-expression-member",
        summary: "The selected value is incomplete.",
      },
    });

    expect(markdown).toBe([
      "```ts",
      "item: Item",
      "```",
      "",
      "Repeat local.",
      "",
      "Warning `missing-expression-member`: The selected value is incomplete.",
    ].join("\n"));
    expect(markdown).not.toContain("---");
  });

  test("removes only an exact duplicate diagnostic-code prefix from normalized summary prose", () => {
    const matching = renderHoverCard({
      status: {
        kind: "diagnostic",
        severity: "error",
        code: "TS2769",
        summary: "  TS2769:\r\n  No overload matches this call.  ",
      },
    });
    const nonmatching = renderHoverCard({
      status: {
        kind: "diagnostic",
        severity: "error",
        code: "TS2769",
        summary: "TS27690: A different diagnostic remains intact.",
      },
    });

    expect(matching).toBe("Error `TS2769`: No overload matches this call.");
    expect(nonmatching).toBe(
      "Error `TS2769`: TS27690: A different diagnostic remains intact.",
    );
  });

  test("normalizes and escapes prose while preserving raw code with safe backtick delimiters", () => {
    const markdown = renderHoverCard({
      identity: {
        language: "ts",
        authored: "odd```name",
        typeDetail: ": `raw` | string",
      },
      context: [{
        prefix: " Alias\r\n  *for*:",
        value: "canonical``name",
        suffix: ".",
        tertiary: {
          prefix: "Implementation:",
          value: "Product`Card",
          suffix: ".",
        },
      }],
      status: {
        kind: "uncertainty",
        category: "Route [information] is incomplete.",
      },
    });

    expect(markdown).toContain("````ts\nodd```name: `raw` | string\n````");
    expect(markdown).toContain("Alias \\*for\\*: ```canonical``name```. ".trim());
    expect(markdown).toContain(". Implementation: ``Product`Card``.");
    expect(markdown).toContain("Route \\[information\\] is incomplete.");
    expect(markdown).not.toContain("\r");
  });

  test("keeps authored links and URI schemes inert inside plaintext prose", () => {
    const markdown = renderHoverCard({
      identity: { language: "ts", authored: "legacy" },
      context: [{
        prefix: "",
        valueKind: "prose",
        value: [
          "[d](command:x)",
          "https://e.test",
          "mailto:a@b.test",
          "file:/x",
          "command:y",
          "<https://e.test/a>",
          "**b**",
        ].join(" "),
      }],
    });

    expect(markdown).toContain("\\[d\\](command\\:x)");
    expect(markdown).toContain("https\\://e.test");
    expect(markdown).toContain("mailto\\:a@b.test");
    expect(markdown).toContain("file\\:/x");
    expect(markdown).toContain("command\\:y");
    expect(markdown).toContain("\\<https\\://e.test/a\\>");
    expect(markdown).toContain("\\*\\*b\\*\\*");
    expect(markdown).not.toMatch(/\b(?:https?|mailto|file|command):/iu);

    for (const scheme of ["ftp", "vscode", "data", "javascript", "custom+safe", "x.test"]) {
      const schemeMarkdown = renderHoverCard({
        identity: { language: "ts", authored: "legacy" },
        context: [{ prefix: "", valueKind: "prose", value: `${scheme}:payload` }],
      });
      expect(schemeMarkdown).toContain(`${scheme}\\:payload`);
      expect(schemeMarkdown).not.toContain(`${scheme}:payload`);
    }
  });

  test("clips combining sequences and emoji only at extended grapheme boundaries", () => {
    const combining = renderHoverCard({
      identity: { language: "text", authored: "a\u0301".repeat(100) },
    });
    const emoji = renderHoverCard({
      identity: { language: "text", authored: "👨‍👩‍👧‍👦".repeat(100) },
    });

    expect(combining).not.toBeNull();
    expect(combining).not.toMatch(/a(?!\u0301)/u);
    expect(combining).toContain("…");
    expect(emoji).not.toBeNull();
    expect(emoji).not.toContain("�");
    expect(emoji).toContain("👨‍👩‍👧‍👦…");
  });

  test("enforces the ordinary signature target and rejects multiline identity code", () => {
    const markdown = renderHoverCard({
      identity: {
        language: "ts",
        authored: "value",
        typeDetail: `: ${"LongType | ".repeat(80)}`,
      },
    });
    const signature = markdown?.split("\n")[1] ?? "";

    expect(Array.from(signature).length).toBeLessThanOrEqual(HOVER_CARD_SIGNATURE_SOFT_LIMIT);
    expect(signature).toContain("…");
    expect(renderHoverCard({
      identity: { language: "ts", authored: "value", typeDetail: ": A\n| B" },
    })).toBeNull();
  });

  test("drops optional relational context instead of normalizing or orphaning its raw value", () => {
    const multiline = renderHoverCard({
      identity: { language: "text", authored: "legacy-card" },
      context: [{ prefix: "Alias for:", value: "product\ncard", suffix: "." }],
    });
    const crowded = renderHoverCard({
      identity: { language: "text", authored: "legacy-card" },
      context: [{ prefix: "Alias for:".repeat(20), value: "product-card", suffix: "." }],
    });

    expect(multiline).toBe("```text\nlegacy-card\n```");
    expect(crowded).toBe("```text\nlegacy-card\n```");
    expect(multiline).not.toContain("Alias for");
    expect(crowded).not.toContain("Alias for");
  });

  test("rejects a mandatory diagnostic whose raw structural code is multiline", () => {
    expect(renderHoverCard({
      status: {
        kind: "diagnostic",
        severity: "error",
        code: "AUR0001\nAUR0002",
        summary: "Invalid carrier.",
      },
    })).toBeNull();
    expect(renderHoverCard({
      status: {
        kind: "diagnostic",
        severity: "catastrophic",
        code: "AUR0001",
        summary: "Invalid carrier.",
      },
    } as never)).toBeNull();
  });

  test("structurally sheds and shrinks adversarial leaves to the 640-code-point source cap", () => {
    const markdown = renderHoverCard({
      identity: {
        language: "ts",
        authored: "selectedIdentity",
        typeDetail: `: ${"`".repeat(145)}${"T".repeat(80)}`,
      },
      context: [{
        priority: "tertiary",
        prefix: "*".repeat(100),
        value: "`".repeat(100),
        suffix: "[context]".repeat(20),
      }, {
        prefix: "Alias for:",
        value: "canonical".repeat(30),
        suffix: ".",
      }],
      status: {
        kind: "diagnostic",
        severity: "error",
        code: "AUR9999",
        summary: "*[adversarial]<summary>~".repeat(30),
      },
    });

    expect(markdown).not.toBeNull();
    expect(hoverCardMarkdownCodePointLength(markdown ?? "")).toBeLessThanOrEqual(
      HOVER_CARD_MARKDOWN_LIMIT,
    );
    expect(markdown).toContain("selectedIdentity");
    expect(markdown).toContain("Error `AUR9999`");
  });

  test("fails closed for empty cards and mandatory skeletons that cannot fit", () => {
    expect(renderHoverCard({})).toBeNull();
    expect(renderHoverCard({ context: [{ prefix: "Context without an answer." }] })).toBeNull();
    expect(renderHoverCard({
      identity: {
        language: "text",
        prefix: "product-owned".repeat(30),
        authored: "name",
      },
    })).toBeNull();
    expect(renderHoverCard({
      status: {
        kind: "uncertainty",
        category: "*".repeat(1_000),
      },
    })).not.toBeNull();
  });
});
