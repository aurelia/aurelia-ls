/**
 * Feature Matrix: Hover
 *
 * Systematic hover verification across all entity kinds, template positions,
 * and carried properties. Derived from hover-spec.md.
 *
 * Test structure:
 * 1. Identity — correct kind label and name for each resource kind
 * 2. Provenance — Sourced<T>.origin survives definition-authority → hover
 * 3. Span tightness — hover span covers the entity, not the parent
 * 4. Stability — nodeId/exprId stable across re-queries
 * 5. Confidence — absent for non-gapped resources
 * 6. Null positions — non-semantic positions produce no hover
 * 7. Formatting — fenced code blocks, separators, no raw debug strings
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getAppQuery,
  getAppTemplate,
  pos,
  offset,
  assertHoverContains,
  assertHoverSpanCovers,
  assertNoHover,
} from "./_harness.js";
import type { SemanticQuery } from "../../out/types.js";

let query: SemanticQuery;
let text: string;

beforeAll(async () => {
  query = await getAppQuery();
  text = (await getAppTemplate()).text;
});

// ============================================================================
// 1. Identity — correct kind label and name for each resource kind
// ============================================================================

describe("hover identity (resource kinds)", () => {
  it("custom element: matrix-panel", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    assertHoverContains(hover, /\(custom element\) matrix-panel/);
    assertHoverContains(hover, "Bindables");
  });

  it("custom element (convention): matrix-badge", async () => {
    const hover = query.hover(await pos("<matrix-badge value.bind", 1));
    assertHoverContains(hover, /\(custom element\) matrix-badge/);
  });

  it("custom attribute: matrix-highlight", async () => {
    const hover = query.hover(await pos("matrix-highlight.bind", 1));
    assertHoverContains(hover, "(custom attribute)");
    assertHoverContains(hover, "matrix-highlight");
  });

  it("template controller: if", async () => {
    const hover = query.hover(await pos("if.bind", 1));
    assertHoverContains(hover, /\(template controller\) if/);
    assertHoverContains(hover, "Bindables");
  });

  it("template controller: repeat", async () => {
    const hover = query.hover(await pos("repeat.for=\"item of items\"", 1));
    assertHoverContains(hover, /\(template controller\) repeat/);
  });

  it("value converter: format-date", async () => {
    const hover = query.hover(await pos("| format-date", 2));
    assertHoverContains(hover, /\(value converter\) format-date/);
  });

  it("binding behavior: rate-limit", async () => {
    const hover = query.hover(await pos("& rate-limit", 2));
    assertHoverContains(hover, /\(binding behavior\) rate-limit/);
  });

  it("binding command: trigger", async () => {
    const hover = query.hover(await pos("click.trigger", "click.".length + 1));
    assertHoverContains(hover, /\(binding command\) trigger/);
  });

  it("binding command: two-way", async () => {
    const hover = query.hover(await pos("value.two-way", "value.".length + 1));
    assertHoverContains(hover, /\(binding command\) two-way/);
  });
});

// ============================================================================
// 2. Provenance — Sourced<T>.origin survives to hover content
//    (Seam test: definition-authority → engine → hover)
// ============================================================================

describe("hover provenance (seam test)", () => {
  it("CE shows discovery provenance", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    assertHoverContains(hover, "Discovered via source analysis");
  });

  it("CA shows discovery provenance", async () => {
    const hover = query.hover(await pos("matrix-highlight.bind", 1));
    assertHoverContains(hover, "Discovered via source analysis");
  });

  it("VC shows discovery provenance", async () => {
    const hover = query.hover(await pos("| format-date", 2));
    assertHoverContains(hover, "Discovered via source analysis");
  });

  it("BB shows discovery provenance", async () => {
    const hover = query.hover(await pos("& rate-limit", 2));
    assertHoverContains(hover, "Discovered via source analysis");
  });

  it("binding commands do NOT show provenance (no definition authority entry)", async () => {
    const hover = query.hover(await pos("click.trigger", "click.".length + 1));
    assertHoverContains(hover, /\(binding command\)/);
    expect(hover!.contents).not.toContain("Discovered via source analysis");
  });

  it("expressions do NOT show provenance", async () => {
    const hover = query.hover(await pos("${title}", 2));
    if (hover) {
      expect(hover.contents).not.toContain("Discovered via source analysis");
    }
  });
});

// ============================================================================
// 3. Span tightness — hover covers the entity, not the parent element
// ============================================================================

describe("hover span tightness", () => {
  it("CE tag hover span covers the tag name", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    expect(hover).not.toBeNull();
    expect(hover!.location?.span).toBeDefined();
    const tagStart = text.indexOf("<matrix-panel");
    expect(hover!.location!.span!.start).toBe(tagStart);
  });

  it("CA hover span covers the attribute, not the host element", async () => {
    const hover = query.hover(await pos("matrix-highlight.bind", 1));
    expect(hover).not.toBeNull();
    expect(hover!.location?.span).toBeDefined();
    const attrStart = text.indexOf("matrix-highlight.bind");
    const hostElementStart = text.lastIndexOf("<span", attrStart);
    expect(hover!.location!.span!.start).toBeGreaterThanOrEqual(attrStart);
    expect(hover!.location!.span!.start).not.toBe(hostElementStart);
  });

  it("VC hover span covers the converter name", async () => {
    const hover = query.hover(await pos("| format-date", 2));
    expect(hover).not.toBeNull();
    expect(hover!.location?.span).toBeDefined();
    const vcStart = text.indexOf("format-date");
    expect(hover!.location!.span!.start).toBeLessThanOrEqual(vcStart);
    expect(hover!.location!.span!.end).toBeGreaterThanOrEqual(vcStart + "format-date".length);
  });
});

// ============================================================================
// 4. Stability — nodeId/exprId stable across re-queries
// ============================================================================

describe("hover stability", () => {
  it("CE hover produces stable nodeId across queries", async () => {
    const p = await pos("<matrix-panel\n", 1);
    const first = query.hover(p);
    const second = query.hover(p);
    expect(first?.location?.nodeId).toBeDefined();
    expect(second?.location?.nodeId).toBe(first?.location?.nodeId);
  });

  it("expression hover produces stable exprId across queries", async () => {
    const p = await pos("${title}", 2);
    const first = query.hover(p);
    const second = query.hover(p);
    if (first?.location?.exprId) {
      expect(second?.location?.exprId).toBe(first.location.exprId);
    }
  });
});

// ============================================================================
// 5. Confidence — absent for non-gapped, only set when reduced
// ============================================================================

describe("hover confidence", () => {
  it("non-gapped CE has no confidence set", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    expect(hover).not.toBeNull();
    expect(hover!.confidence).toBeUndefined();
  });

  it("non-gapped CA has no confidence set", async () => {
    const hover = query.hover(await pos("matrix-highlight.bind", 1));
    expect(hover).not.toBeNull();
    expect(hover!.confidence).toBeUndefined();
  });

  it("non-gapped VC has no confidence set", async () => {
    const hover = query.hover(await pos("| format-date", 2));
    expect(hover).not.toBeNull();
    expect(hover!.confidence).toBeUndefined();
  });
});

// ============================================================================
// 6. Null positions — non-semantic positions produce no hover
// ============================================================================

describe("hover null positions", () => {
  it("native HTML element produces no hover", async () => {
    const hover = query.hover(await pos("<h2>", 1));
    assertNoHover(hover, "native <h2>");
  });

  it("whitespace between elements produces no hover", async () => {
    // Position in whitespace between </let> and the local template
    const letEnd = text.indexOf("</let>") + "</let>".length;
    const nextTag = text.indexOf("<template as-custom-element", letEnd);
    if (nextTag > letEnd + 2) {
      const midpoint = Math.floor((letEnd + nextTag) / 2);
      const hover = query.hover(await (async () => {
        const { positionAt: posAt } = await import("../test-utils.js");
        return posAt(text, midpoint);
      })());
      assertNoHover(hover, "whitespace");
    }
  });

  it("static attribute on native element produces no hover", async () => {
    const hover = query.hover(await pos('type="text"', 1));
    assertNoHover(hover, "native type attribute");
  });
});

// ============================================================================
// 7. Formatting — structural properties of hover content
// ============================================================================

describe("hover formatting", () => {
  it("resource hover uses fenced code block for signature", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    assertHoverContains(hover, "```ts");
    assertHoverContains(hover, "```");
  });

  it("resource hover uses separator between signature and metadata", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    assertHoverContains(hover, "---");
  });

  it("hover contains no raw debug strings", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    expect(hover!.contents).not.toMatch(/^node:/m);
    expect(hover!.contents).not.toMatch(/^instruction:/m);
  });

  it("bindable list shows attribute names (kebab-case), not property names", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    assertHoverContains(hover, "`on-refresh`");
  });
});

// ============================================================================
// 8. Scope constructs — TC hover with contextual variables
// ============================================================================

describe("hover scope constructs", () => {
  it("repeat.for hover shows iteration declaration and contextual locals", async () => {
    const hover = query.hover(await pos("repeat.for=\"item of items\"", 1));
    assertHoverContains(hover, /\(template controller\) repeat/);
    assertHoverContains(hover, "item of items");
    assertHoverContains(hover, "`$index`");
  });

  it("if.bind hover shows template controller identity", async () => {
    const hover = query.hover(await pos("if.bind=\"showDetail\"", 1));
    assertHoverContains(hover, /\(template controller\) if/);
  });

  it("switch.bind hover shows template controller identity", async () => {
    const hover = query.hover(await pos("switch.bind", 1));
    assertHoverContains(hover, /\(template controller\) switch/);
  });
});

// ============================================================================
// 9. Meta elements — import and bindable
// ============================================================================

describe("hover meta elements", () => {
  it("import meta element produces hover", async () => {
    const hover = query.hover(await pos("<import from", 1));
    assertHoverContains(hover, "<import>");
  });

  it("bindable meta element produces hover", async () => {
    const hover = query.hover(await pos("<bindable name", 1));
    assertHoverContains(hover, "<bindable>");
  });
});
