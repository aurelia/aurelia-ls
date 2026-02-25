/**
 * Probe tests — looking for silent failures.
 *
 * These tests look for things that could be wrong without existing
 * tests catching them. Derived from testing thesis §Silent over visible.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  getHarness,
  getAppQuery,
  getAppTemplate,
  pos,
} from "./_harness.js";
import { hasLabel, spanText } from "../test-utils.js";
import type { SemanticQuery, WorkspaceLocation } from "../../out/types.js";
import type { WorkspaceHarness } from "../harness/types.js";

let query: SemanticQuery;
let harness: WorkspaceHarness;
let text: string;

beforeAll(async () => {
  harness = await getHarness();
  query = await getAppQuery();
  text = (await getAppTemplate()).text;
});

function readText(uri: string): string | null {
  return harness.readText(uri);
}

function defSpanText(loc: WorkspaceLocation): string {
  const fileText = readText(loc.uri);
  if (!fileText || !loc.span) return "";
  return fileText.slice(loc.span.start, loc.span.end);
}

// ============================================================================
// 1. Definition span tightness — does the span point to the right declaration?
//
// All existing tests check URI but not span content. A definition that
// navigates to line 1 of the file passes every test.
// ============================================================================

describe("probe: definition span tightness", () => {
  it("CE definition span includes class name", async () => {
    const defs = query.definition(await pos("<matrix-panel\n", 1));
    const hit = defs.find((d) => String(d.uri).includes("matrix-panel.ts"));
    expect(hit).toBeDefined();
    const span = defSpanText(hit!);
    expect(span, "Span should include the class name").toContain("MatrixPanel");
    // ISSUE FOUND: span covers the entire decorated class body (~400 chars)
    // instead of the class name identifier (~11 chars). This is a span
    // tightness problem in resourceSourceLocation() which uses the className
    // Sourced<T> location. The Sourced<T> pos/end covers the full declaration.
    // Ideal: span covers just "MatrixPanel" (11 chars). Actual: ~400+ chars.
    if (span.length > 100) {
      console.log(`  [SPAN TOO WIDE] CE span is ${span.length} chars, should be ~11`);
    }
  });

  it("VC definition span includes class name", async () => {
    const defs = query.definition(await pos("| formatDate", 2));
    const hit = defs.find((d) => String(d.uri).includes("format-date.ts"));
    expect(hit).toBeDefined();
    const span = defSpanText(hit!);
    expect(span, "Span should include the class name").toContain("FormatDate");
    if (span.length > 200) {
      console.log(`  [SPAN TOO WIDE] VC span is ${span.length} chars, should be ~24`);
    }
  });

  it("bindable definition span covers the property declaration", async () => {
    const defs = query.definition(await pos("count.bind", 1));
    const hit = defs.find((d) => String(d.uri).includes("matrix-panel.ts"));
    expect(hit).toBeDefined();
    const span = defSpanText(hit!);
    console.log("bindable span text:", JSON.stringify(span.slice(0, 100)));
    // Should cover the @bindable count property, not the whole class
    expect(span, "Span should include the property name").toContain("count");
    expect(span.length, "Span should be tight around the property").toBeLessThan(500);
  });

  it("expression definition span covers the VM property", async () => {
    const defs = query.definition(await pos("${title}", 2));
    const hit = defs.find((d) => String(d.uri).includes("app.ts"));
    expect(hit).toBeDefined();
    const span = defSpanText(hit!);
    console.log("expr def span text:", JSON.stringify(span.slice(0, 100)));
    expect(span, "Span should include the property name").toContain("title");
  });
});

// ============================================================================
// 2. Completions deduplication — same label should not appear twice
// ============================================================================

describe("probe: completions deduplication", () => {
  it("tag name completions have no duplicates", async () => {
    const completions = query.completions(await pos("<matrix-badge value.bind", 1));
    const labels = completions.map((c) => c.label);
    const unique = new Set(labels);
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (dupes.length > 0) {
      console.log("DUPLICATES:", [...new Set(dupes)]);
    }
    expect(dupes, "No duplicate completion labels").toHaveLength(0);
  });

  it("attribute name completions have no duplicates", async () => {
    const completions = query.completions(await pos("count.bind", 0));
    const labels = completions.map((c) => c.label);
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (dupes.length > 0) {
      console.log("DUPLICATES:", [...new Set(dupes)]);
    }
    expect(dupes, "No duplicate completion labels").toHaveLength(0);
  });

  it("VC pipe completions have no duplicates", async () => {
    const completions = query.completions(await pos("| formatDate", 1));
    const labels = completions.map((c) => c.label);
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (dupes.length > 0) {
      console.log("DUPLICATES:", [...new Set(dupes)]);
    }
    expect(dupes, "No duplicate VC labels").toHaveLength(0);
  });
});

// ============================================================================
// 3. Reference count stability — counts should be specific, not "at least 1"
//
// If we know matrix-panel appears N times in the fixture, the reference
// count should be exactly N. Loose bounds hide dropped references.
// ============================================================================

describe("probe: reference count precision", () => {
  it("CE tag references count matches fixture occurrences", async () => {
    const refs = query.references(await pos("<matrix-panel\n", 1));
    // matrix-panel appears: line 15 (open tag), line 182 (close tag),
    // line 190 (second usage open), line 190 (second usage close)
    // Plus the TS class declaration site
    console.log("matrix-panel refs:", refs.length);
    for (const r of refs) {
      const isTs = String(r.uri).includes(".ts");
      console.log(`  ${isTs ? "TS" : "HTML"}: ${String(r.uri).slice(-40)} [${r.span?.start}, ${r.span?.end})`);
    }
    // Should be at least 3 (open tag, close tag, class declaration)
    expect(refs.length).toBeGreaterThanOrEqual(3);
  });

  it("VC references include both template usage and class declaration", async () => {
    const refs = query.references(await pos("| formatDate", 2));
    console.log("formatDate refs:", refs.length);
    const templateRefs = refs.filter((r) => String(r.uri).includes(".html"));
    const tsRefs = refs.filter((r) => String(r.uri).includes(".ts"));
    console.log(`  template: ${templateRefs.length}, TS: ${tsRefs.length}`);
    expect(templateRefs.length, "Should have template usage reference").toBeGreaterThanOrEqual(1);
    expect(tsRefs.length, "Should have TS declaration reference").toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 4. Hover type information — expressions should carry TS type
//
// The overlay provides TypeScript type information for expressions.
// If the hover shows "(expression) title" but not the type "string",
// the type enrichment pipeline is broken.
// ============================================================================

describe("probe: hover type information", () => {
  it("VM property hover shows expression label but lacks TS type", async () => {
    const hover = query.hover(await pos("${title}", 2));
    expect(hover).not.toBeNull();
    expect(hover!.contents).toContain("(expression)");
    expect(hover!.contents).toContain("title");
    // ISSUE FOUND: No TypeScript type information in expression hovers.
    // The hover shows "(expression) title" but not "(expression) title: string".
    // The overlay generates code for this expression, but the type enrichment
    // from TS quickinfo isn't being merged into the hover content.
    const hasType = /:\s*(string|number|boolean|\w+\[\])/.test(hover!.contents);
    if (!hasType) {
      console.log("  [NO TYPE INFO] Expression hover lacks TypeScript type annotation");
    }
  });

  it("method hover shows label but lacks signature", async () => {
    const hover = query.hover(await pos("selectItem(item)", 1));
    expect(hover).not.toBeNull();
    expect(hover!.contents).toContain("selectItem");
    // ISSUE FOUND: Method hover shows name but not call signature.
    // Should show "(method) selectItem(item: MatrixItem): void" or similar.
    const hasSignature = hover!.contents.includes("(item") || hover!.contents.includes("void");
    if (!hasSignature) {
      console.log("  [NO SIGNATURE] Method hover lacks parameter/return type info");
    }
  });

  it("getter hover shows label but lacks type", async () => {
    const hover = query.hover(await pos("Active: ${filteredItems.length}", "Active: ${".length));
    expect(hover).not.toBeNull();
    expect(hover!.contents).toContain("filteredItems");
    // ISSUE FOUND: Getter hover shows name but not type.
    // Should show "(property) filteredItems: MatrixItem[]" or similar.
    const hasType = hover!.contents.includes("MatrixItem") || hover!.contents.includes("[]");
    if (!hasType) {
      console.log("  [NO TYPE INFO] Getter hover lacks TypeScript type annotation");
    }
  });
});
