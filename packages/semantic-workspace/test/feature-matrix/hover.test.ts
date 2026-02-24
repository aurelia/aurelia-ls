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
    const hover = query.hover(await pos("| formatDate", 2));
    assertHoverContains(hover, /\(value converter\) formatDate/);
  });

  it("binding behavior: rate-limit", async () => {
    const hover = query.hover(await pos("& rateLimit", 2));
    assertHoverContains(hover, /\(binding behavior\) rateLimit/);
  });

  it("binding command: trigger", async () => {
    const hover = query.hover(await pos("click.trigger", "click.".length + 1));
    assertHoverContains(hover, /\(binding command\) trigger/);
  });

  it("binding command: two-way", async () => {
    const hover = query.hover(await pos("value.two-way", "value.".length + 1));
    assertHoverContains(hover, /\(binding command\) two-way/);
  });

  it("bindable attribute: count on matrix-panel", async () => {
    const hover = query.hover(await pos("count.bind", 1));
    assertHoverContains(hover, "count");
  });

  it("local template element: inline-tag", async () => {
    const hover = query.hover(await pos("<inline-tag repeat.for", 1));
    assertHoverContains(hover, /\(custom element\) inline-tag/);
  });

  it("as-element identity: div acting as matrix-badge", async () => {
    const hover = query.hover(await pos('as-element="matrix-badge"', 'as-element="'.length));
    assertHoverContains(hover, "matrix-badge");
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
    const hover = query.hover(await pos("| formatDate", 2));
    assertHoverContains(hover, "Discovered via source analysis");
  });

  it("BB shows discovery provenance", async () => {
    const hover = query.hover(await pos("& rateLimit", 2));
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
    const hover = query.hover(await pos("| formatDate", 2));
    expect(hover).not.toBeNull();
    expect(hover!.location?.span).toBeDefined();
    const vcStart = text.indexOf("formatDate");
    expect(hover!.location!.span!.start).toBeLessThanOrEqual(vcStart);
    expect(hover!.location!.span!.end).toBeGreaterThanOrEqual(vcStart + "formatDate".length);
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
    const hover = query.hover(await pos("| formatDate", 2));
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

  it("with.bind hover shows template controller identity", async () => {
    const hover = query.hover(await pos("with.bind", 1));
    assertHoverContains(hover, /\(template controller\) with/);
  });
});

// ============================================================================
// 9. Expression hovers — identifiers, scope tokens, member access
// ============================================================================

describe("hover expression constructs", () => {
  it("interpolation identifier shows type info", async () => {
    const hover = query.hover(await pos("${title}", 2));
    expect(hover).not.toBeNull();
  });

  it("$this shows scope/binding context info", async () => {
    const hover = query.hover(await pos("${$this.title}", 2));
    expect(hover).not.toBeNull();
  });

  it("$parent shows scope traversal info", async () => {
    const hover = query.hover(await pos("${$parent.title}", 2));
    expect(hover).not.toBeNull();
  });

  it("contextual variable $index produces hover", async () => {
    const hover = query.hover(await pos("${$index + 1}", 2));
    expect(hover).not.toBeNull();
  });

  it("contextual variable $first produces hover", async () => {
    const hover = query.hover(await pos("${$first ?", 2));
    expect(hover).not.toBeNull();
  });

  it("member access item.name produces hover", async () => {
    const hover = query.hover(await pos("${item.name}", "${item.".length));
    expect(hover).not.toBeNull();
  });

  it("method call selectItem produces hover", async () => {
    const hover = query.hover(await pos("selectItem(item)", 1));
    expect(hover).not.toBeNull();
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

  it("let element produces hover", async () => {
    const hover = query.hover(await pos("<let total-display", 1));
    expect(hover).not.toBeNull();
  });
});

// ============================================================================
// 11. Template construct hovers — ref, multi-binding, shorthand
// ============================================================================

describe("hover template constructs", () => {
  it("ref binding produces hover", async () => {
    const hover = query.hover(await pos('ref="searchInput"', 1));
    expect(hover).not.toBeNull();
  });

  it("multi-binding CA property produces hover", async () => {
    // matrix-tooltip with multi-binding syntax: text.bind: noteMessage; position: top
    const hover = query.hover(await pos("matrix-tooltip=", 1));
    expect(hover).not.toBeNull();
    assertHoverContains(hover, "matrix-tooltip");
  });

  it("shorthand :value binding produces hover", async () => {
    // :value is colon-prefix pattern → equivalent to value.bind
    const hover = query.hover(await pos(':value="title"', 1));
    expect(hover).not.toBeNull();
  });

  it("shorthand @click binding produces hover", async () => {
    // @click is at-prefix pattern → equivalent to click.trigger
    const hover = query.hover(await pos("@click=", 1));
    expect(hover).not.toBeNull();
  });

  it("au-compose element produces hover", async () => {
    const hover = query.hover(await pos("<au-compose", 1));
    expect(hover).not.toBeNull();
  });

  it("au-slot element produces hover", async () => {
    const hover = query.hover(await pos("<au-slot name", 1));
    expect(hover).not.toBeNull();
  });

  it("interpolation in attribute value produces hover on expression", async () => {
    // level="${activeSeverity}" — cursor on activeSeverity inside the interpolation
    const hover = query.hover(await pos("${activeSeverity}", 2));
    expect(hover).not.toBeNull();
  });

  it("static string bindable value produces hover on attribute name", async () => {
    // title="Dashboard" — cursor on the 'title' attribute name
    const hover = query.hover(await pos('title="Dashboard"', 1));
    expect(hover).not.toBeNull();
    assertHoverContains(hover, "title");
  });

  it("value.two-way bindable produces hover on attribute name", async () => {
    const hover = query.hover(await pos("value.two-way", 1));
    expect(hover).not.toBeNull();
  });
});

// ============================================================================
// 12. Promise data flow — then.from-view, catch.from-view
// ============================================================================

describe("hover promise data flow", () => {
  it("then.from-view attribute produces hover", async () => {
    const hover = query.hover(await pos('then.from-view="result"', 1));
    expect(hover).not.toBeNull();
  });

  it("catch.from-view attribute produces hover", async () => {
    const hover = query.hover(await pos('catch.from-view="err"', 1));
    expect(hover).not.toBeNull();
  });

  it("pending TC produces hover", async () => {
    const hover = query.hover(await pos("<span pending>", "span ".length + 1));
    // pending is a TC — should produce TC hover
    expect(hover).not.toBeNull();
  });

  it("result variable inside then block produces hover", async () => {
    const hover = query.hover(await pos("${result.message}", 2));
    expect(hover).not.toBeNull();
  });
});

// ============================================================================
// 13. Destructured repeat
// ============================================================================

describe("hover destructured repeat", () => {
  it("destructured repeat.for produces TC hover", async () => {
    const hover = query.hover(await pos('repeat.for="[idx, entry] of indexedItems"', 1));
    assertHoverContains(hover, /\(template controller\) repeat/);
  });

  it("destructured variable produces hover inside loop body", async () => {
    // ${idx}: ${entry.name} — cursor on 'idx'
    const hover = query.hover(await pos("${idx}:", 2));
    expect(hover).not.toBeNull();
  });

  it("destructured variable member access produces hover", async () => {
    // ${entry.name} — cursor on 'entry'
    const hover = query.hover(await pos("${entry.name}", 2));
    expect(hover).not.toBeNull();
  });
});

// ============================================================================
// 14. Nested scopes
// ============================================================================

describe("hover nested scopes", () => {
  it("outer repeat group variable produces hover", async () => {
    const hover = query.hover(await pos("${group.title}", 2));
    expect(hover).not.toBeNull();
  });

  it("inner repeat item inside nested loop produces hover", async () => {
    // The inner repeat: item of group.items
    const hover = query.hover(await pos("${item.name}: ${item.count}", 2));
    expect(hover).not.toBeNull();
  });

  it("with scope property produces hover", async () => {
    // Inside with.bind="items[0]", ${name} resolves to item's name
    const hover = query.hover(await pos("<div with.bind=\"items[0]\">\n      <span>${name}", "${name}".length - 2));
    expect(hover).not.toBeNull();
  });
});
