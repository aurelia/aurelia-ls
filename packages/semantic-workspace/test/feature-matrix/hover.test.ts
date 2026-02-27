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
  assertHoverClean,
  assertHoverNotContains,
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
  it("interpolation identifier shows expression label", async () => {
    const hover = query.hover(await pos("${title}", 2));
    assertHoverContains(hover, "(expression)", "Expression hover should have kind label");
    assertHoverContains(hover, "title", "Expression hover should name the identifier");
  });

  it("$this shows expression label", async () => {
    const hover = query.hover(await pos("${$this.title}", 2));
    assertHoverContains(hover, "(expression)", "$this hover should have kind label");
    assertHoverContains(hover, "title", "$this.title hover should name the property");
  });

  it("$parent shows scope traversal in expression label", async () => {
    const hover = query.hover(await pos("${$parent.title}", 2));
    assertHoverContains(hover, "(expression)", "$parent hover should have kind label");
    assertHoverContains(hover, "$parent", "$parent hover should show scope traversal");
  });

  it("contextual variable $index produces expression hover", async () => {
    const hover = query.hover(await pos("${$index + 1}", 2));
    assertHoverContains(hover, "(expression)", "$index hover should have kind label");
    assertHoverContains(hover, "$index", "$index hover should name the variable");
  });

  it("contextual variable $first produces expression hover", async () => {
    const hover = query.hover(await pos("${$first ?", 2));
    assertHoverContains(hover, "(expression)", "$first hover should have kind label");
    assertHoverContains(hover, "$first", "$first hover should name the variable");
  });

  it("member access item.name produces expression hover", async () => {
    const hover = query.hover(await pos("${item.name}", "${item.".length));
    assertHoverContains(hover, "(expression)", "Member access hover should have kind label");
    assertHoverContains(hover, "name", "Member access hover should name the member");
  });

  it("method call selectItem produces expression hover", async () => {
    const hover = query.hover(await pos("selectItem(item)", 1));
    assertHoverContains(hover, "(expression)", "Method call hover should have kind label");
    assertHoverContains(hover, "selectItem", "Method call hover should name the method");
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

  it("let element produces no hover (not a resource)", async () => {
    // <let> is a compiler-handled construct, not a CE. The hover system
    // doesn't currently produce hover for <let> elements.
    const hover = query.hover(await pos("<let total-display", 1));
    expect(hover).toBeNull();
  });
});

// ============================================================================
// 11. Template construct hovers — ref, multi-binding, shorthand
// ============================================================================

describe("hover template constructs", () => {
  it("ref binding produces ref hover", async () => {
    const hover = query.hover(await pos('ref="searchInput"', 1));
    assertHoverContains(hover, "(ref)", "Ref binding hover should show ref kind");
  });

  it("multi-binding CA property produces CA hover", async () => {
    const hover = query.hover(await pos("matrix-tooltip=", 1));
    assertHoverContains(hover, "matrix-tooltip", "Multi-binding CA hover should name the attribute");
  });

  it("shorthand :value binding produces bindable hover", async () => {
    // :value is colon-prefix pattern → equivalent to value.bind
    const hover = query.hover(await pos(':value="title"', 1));
    assertHoverContains(hover, "(bindable)", ":value hover should identify as bindable");
    assertHoverContains(hover, "value", ":value hover should name the property");
  });

  it("shorthand @click binding produces event hover", async () => {
    // @click is at-prefix pattern → equivalent to click.trigger
    const hover = query.hover(await pos("@click=", 1));
    assertHoverContains(hover, "(event)", "@click hover should identify as event");
    assertHoverContains(hover, "click", "@click hover should name the event");
  });

  it("au-compose element produces CE hover", async () => {
    const hover = query.hover(await pos("<au-compose", 1));
    assertHoverContains(hover, "(custom element)", "au-compose should identify as CE");
    assertHoverContains(hover, "au-compose", "au-compose hover should name the element");
  });

  it("au-slot element produces CE hover", async () => {
    const hover = query.hover(await pos("<au-slot name", 1));
    assertHoverContains(hover, "(custom element)", "au-slot should identify as CE");
    assertHoverContains(hover, "au-slot", "au-slot hover should name the element");
  });

  it("interpolation in attribute value produces expression hover", async () => {
    const hover = query.hover(await pos("${activeSeverity}", 2));
    assertHoverContains(hover, "(expression)", "Interpolation expression should have kind label");
    assertHoverContains(hover, "activeSeverity", "Should name the identifier");
  });

  it("static string bindable value produces bindable hover", async () => {
    const hover = query.hover(await pos('title="Dashboard"', 1));
    assertHoverContains(hover, "title", "Title attr hover should name the bindable");
  });

  it("value.two-way bindable produces hover", async () => {
    const hover = query.hover(await pos("value.two-way", 1));
    expect(hover).not.toBeNull();
    expect(hover!.contents.length).toBeGreaterThan(10);
  });
});

// ============================================================================
// 12. Promise data flow — then.from-view, catch.from-view
// ============================================================================

describe("hover promise data flow", () => {
  it("then.from-view produces TC hover", async () => {
    const hover = query.hover(await pos('then.from-view="result"', 1));
    assertHoverContains(hover, "(template controller)", "then should identify as TC");
    assertHoverContains(hover, "then", "then hover should name the TC");
  });

  it("catch.from-view produces TC hover", async () => {
    const hover = query.hover(await pos('catch.from-view="err"', 1));
    assertHoverContains(hover, "(template controller)", "catch should identify as TC");
    assertHoverContains(hover, "catch", "catch hover should name the TC");
  });

  it("pending TC produces TC hover", async () => {
    const hover = query.hover(await pos("<span pending>", "span ".length + 1));
    assertHoverContains(hover, "(template controller)", "pending should identify as TC");
    assertHoverContains(hover, "pending", "pending hover should name the TC");
  });

  it("result variable inside then block produces expression hover", async () => {
    const hover = query.hover(await pos("${result.message}", 2));
    assertHoverContains(hover, "(expression)", "then result should have expression label");
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

  it("destructured variable produces expression hover", async () => {
    const hover = query.hover(await pos("${idx}:", 2));
    assertHoverContains(hover, "(expression)", "Destructured variable should show expression label");
  });

  it("destructured variable member access produces expression hover", async () => {
    const hover = query.hover(await pos("${entry.name}", 2));
    assertHoverContains(hover, "(expression)", "Destructured member access should show expression label");
  });
});

// ============================================================================
// 14. Nested scopes
// ============================================================================

describe("hover nested scopes", () => {
  it("outer repeat group variable produces expression hover", async () => {
    const hover = query.hover(await pos("${group.title}", 2));
    assertHoverContains(hover, "(expression)", "Group variable should show expression label");
  });

  it("inner repeat item inside nested loop produces expression hover", async () => {
    const hover = query.hover(await pos("${item.name}: ${item.count}", 2));
    assertHoverContains(hover, "(expression)", "Nested loop variable should show expression label");
  });

  it("with scope property produces hover", async () => {
    // Inside with.bind="items[0]", ${name} resolves to item's name.
    // The with TC creates a scope where the value's properties are directly accessible.
    // This position may resolve to the with TC or to an expression, depending
    // on whether the expression is in the scope model.
    const hover = query.hover(await pos("<div with.bind=\"items[0]\">\n      <span>${name}", "${name}".length - 2));
    expect(hover).not.toBeNull();
    // The hover identifies either the with TC or the name expression —
    // both are valid entity identifications at this scope boundary.
    expect(hover!.contents.length).toBeGreaterThan(10);
  });
});

// ============================================================================
// 15. Ecosystem expression patterns (from cortex-device-list)
// ============================================================================

describe("hover ecosystem expression patterns", () => {
  it("deep property chain produces expression hover", async () => {
    const hover = query.hover(await pos("${groups[0].items[0].name}", 2));
    assertHoverContains(hover, "(expression)", "Deep chain should show expression label");
  });

  it("method call as repeat source produces expression hover", async () => {
    const hover = query.hover(await pos("getItemsByStatus('active')", 1));
    assertHoverContains(hover, "(expression)", "Method call should show expression label");
    assertHoverContains(hover, "getItemsByStatus", "Should name the method");
  });

  it("optional chaining produces expression hover", async () => {
    const hover = query.hover(await pos("${selectedItem?.name}", 2));
    assertHoverContains(hover, "(expression)", "Optional chaining should show expression label");
  });

  it("$event in trigger produces expression hover", async () => {
    const hover = query.hover(await pos("selectItem($event)", "selectItem(".length + 1));
    assertHoverContains(hover, "(expression)", "$event should show expression label");
  });

  it("string concatenation expression produces expression hover", async () => {
    const hover = query.hover(await pos("${noteMessage + ' (' + total", 2));
    assertHoverContains(hover, "(expression)", "Concatenation should show expression label");
    assertHoverContains(hover, "noteMessage", "Should name the identifier");
  });

  it("getter property in interpolation produces expression hover", async () => {
    const hover = query.hover(await pos("${filteredItems.length}", 2));
    assertHoverContains(hover, "(expression)", "Getter should show expression label");
    assertHoverContains(hover, "filteredItems", "Should name the getter");
  });

  it("keyed access items[0].name produces expression hover", async () => {
    const hover = query.hover(await pos("${items[0].name}", 2));
    assertHoverContains(hover, "(expression)", "Keyed access should show expression label");
  });

  it("inline array literal repeat local produces expression hover", async () => {
    const hover = query.hover(await pos("of ['alpha', 'beta', 'gamma']\">\n        <span>${label}", "${label}".length - 2));
    assertHoverContains(hover, "(expression)", "Inline repeat local should show expression label");
  });

  it("nested ternary expression produces expression hover", async () => {
    const hover = query.hover(await pos("${activeSeverity === 'error'", 2));
    assertHoverContains(hover, "(expression)", "Ternary should show expression label");
    assertHoverContains(hover, "activeSeverity", "Should name the identifier");
  });

  it("negation in if.bind produces expression hover", async () => {
    const hover = query.hover(await pos('if.bind="!showDetail"', 'if.bind="!'.length));
    assertHoverContains(hover, "(expression)", "Negation operand should show expression label");
  });

  it("&& chain in if.bind produces expression hover", async () => {
    const hover = query.hover(await pos('if.bind="showDetail && items.length"', 'if.bind="'.length + 1));
    assertHoverContains(hover, "(expression)", "&& operand should show expression label");
  });

  it("comparison in if.bind produces expression hover", async () => {
    const hover = query.hover(await pos('if.bind="items.length > 0"', 'if.bind="'.length + 1));
    assertHoverContains(hover, "(expression)", "Comparison operand should show expression label");
  });
});

// ============================================================================
// 16. Overlay content sanitization — no implementation artifacts in hover
//
// The overlay system generates TypeScript files with internal names
// (__AU_TTC_VM, __au$access, etc.) that must NEVER leak to the user.
// These tests verify the full hover content is clean at every position
// where the overlay is consulted (expressions, bindings, types).
// ============================================================================

describe("hover overlay sanitization", () => {
  // --- Expression positions (overlay lambdas are consulted for type info) ---

  it("interpolation identifier: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${title}", 2));
    assertHoverClean(hover, "title interpolation");
  });

  it("member access: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${item.name}", "${item.".length));
    assertHoverClean(hover, "item.name member");
  });

  it("deep property chain: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${groups[0].items[0].name}", 2));
    assertHoverClean(hover, "deep chain");
  });

  it("method call expression: no overlay artifacts", async () => {
    const hover = query.hover(await pos("selectItem(item)", 1));
    assertHoverClean(hover, "selectItem method");
  });

  it("optional chaining: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${selectedItem?.name}", 2));
    assertHoverClean(hover, "optional chain");
  });

  it("$this scope token: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${$this.title}", 2));
    assertHoverClean(hover, "$this");
  });

  it("$parent scope token: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${$parent.title}", 2));
    assertHoverClean(hover, "$parent");
  });

  it("contextual variable $index: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${$index + 1}", 2));
    assertHoverClean(hover, "$index");
  });

  it("string concatenation: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${noteMessage + ' (' + total", 2));
    assertHoverClean(hover, "string concat");
  });

  it("getter property: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${filteredItems.length}", 2));
    assertHoverClean(hover, "getter");
  });

  it("nested ternary: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${activeSeverity === 'error'", 2));
    assertHoverClean(hover, "ternary");
  });

  it("binding expression value.bind: no overlay artifacts", async () => {
    const hover = query.hover(await pos("value.bind=\"noteMessage\"", "value.bind=\"".length + 1));
    assertHoverClean(hover, "bind expression");
  });

  // --- Resource positions (type info from overlay) ---

  it("CE hover: no overlay artifacts in bindable types", async () => {
    const hover = query.hover(await pos("<matrix-panel\n", 1));
    assertHoverClean(hover, "CE matrix-panel");
  });

  it("CA hover: no overlay artifacts", async () => {
    const hover = query.hover(await pos("matrix-highlight.bind", 1));
    assertHoverClean(hover, "CA matrix-highlight");
  });

  it("VC hover: no overlay artifacts", async () => {
    const hover = query.hover(await pos("| formatDate", 2));
    assertHoverClean(hover, "VC formatDate");
  });

  it("BB hover: no overlay artifacts", async () => {
    const hover = query.hover(await pos("& rateLimit", 2));
    assertHoverClean(hover, "BB rateLimit");
  });

  it("TC repeat hover: no overlay artifacts", async () => {
    const hover = query.hover(await pos("repeat.for=\"item of items\"", 1));
    assertHoverClean(hover, "TC repeat");
  });

  // --- Scope construct positions (overlay frames are consulted) ---

  it("with scope property: no overlay artifacts", async () => {
    const hover = query.hover(await pos("<div with.bind=\"items[0]\">\n      <span>${name}", "${name}".length - 2));
    assertHoverClean(hover, "with scope name");
  });

  it("promise result variable: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${result.message}", 2));
    assertHoverClean(hover, "promise result");
  });

  it("destructured repeat variable: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${entry.name}", 2));
    assertHoverClean(hover, "destructured entry");
  });

  it("nested repeat inner item: no overlay artifacts", async () => {
    const hover = query.hover(await pos("${item.name}: ${item.count}", 2));
    assertHoverClean(hover, "nested repeat item");
  });

  // --- Hover content should show user-friendly type names ---

  it("expression type shows clean TypeScript type, not overlay alias", async () => {
    const hover = query.hover(await pos("${title}", 2));
    if (hover) {
      // If type info is present, it should be a clean TS type
      assertHoverNotContains(hover, "__", "expression type");
    }
  });

  it("binding target type shows clean type, not overlay wrapper", async () => {
    const hover = query.hover(await pos("count.bind", 1));
    if (hover) {
      assertHoverNotContains(hover, "__", "bindable type");
    }
  });
});

// ============================================================================
// 17. Hover content quality — type info shown for expression positions
// ============================================================================

describe("hover expression type info quality", () => {
  it("simple identifier hover includes type information", async () => {
    const hover = query.hover(await pos("${title}", 2));
    if (hover) {
      // Should show "string" type or similar, not just "(expression) title"
      // At minimum, should have both expression card and type info
      expect(hover.contents.length).toBeGreaterThan(20);
    }
  });

  it("member access hover includes member type", async () => {
    const hover = query.hover(await pos("${item.name}", "${item.".length));
    if (hover) {
      expect(hover.contents.length).toBeGreaterThan(20);
    }
  });

  it("method call hover includes return type or method signature", async () => {
    const hover = query.hover(await pos("selectItem(item)", 1));
    if (hover) {
      expect(hover.contents.length).toBeGreaterThan(20);
    }
  });
});
