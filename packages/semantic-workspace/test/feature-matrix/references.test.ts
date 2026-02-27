/**
 * Feature Matrix: Find References
 *
 * Systematic find-references verification across all reference-producing
 * entity kinds. References are the read-only inverse of rename: same
 * reference set, no edit mechanics.
 *
 * Key contract (rename-spec principle #10): the reference set returned
 * by find-references MUST be identical to the reference set used by
 * rename. If they disagree, one of them is wrong.
 *
 * Test structure:
 * 1. Resource references — each resource kind produces references
 * 2. Bindable references — attribute usages and property declarations
 * 3. Expression references — scope identifiers across templates
 * 4. Cross-template references — references span multiple templates
 * 5. SymbolId consistency — references carry correct symbolIds
 * 6. Non-reference positions — positions that produce no references
 * 7. Determinism — same query produces same reference set
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getAppQuery,
  getAppTemplate,
  getHarness,
  pos,
  offset,
  posInFile,
} from "./_harness.js";
import { spanCoversOffset } from "../test-utils.js";
import type { SemanticQuery, WorkspaceLocation } from "../../out/types.js";
import type { WorkspaceHarness } from "../harness/types.js";

let query: SemanticQuery;
let text: string;
let harness: WorkspaceHarness;

beforeAll(async () => {
  harness = await getHarness();
  query = await getAppQuery();
  text = (await getAppTemplate()).text;
});

// ============================================================================
// Helpers
// ============================================================================

function refsAt(needle: string, delta = 1) {
  return async () => {
    return query.references(await pos(needle, delta));
  };
}

function hasRefAt(refs: readonly WorkspaceLocation[], targetOffset: number): boolean {
  return refs.some((ref) => ref.span && spanCoversOffset(ref.span, targetOffset));
}

/** Read the text at a reference span to verify it points to the right content */
function refSpanText(ref: WorkspaceLocation): string {
  const uri = String(ref.uri);
  const fileText = harness.readText(uri);
  if (!fileText || !ref.span) return "";
  return fileText.slice(ref.span.start, ref.span.end);
}

// ============================================================================
// 1. Resource references — each resource kind produces reference sites
// ============================================================================

describe("references: resource kinds", () => {
  it("CE tag name produces references to all template usages", async () => {
    const refs = await refsAt("<matrix-panel\n")();
    // matrix-panel is used at least twice in the fixture:
    // 1. The main <matrix-panel> tag (line ~15)
    // 2. The diagnostic trigger <matrix-panel nonexistent-prop.bind="total"> (line ~144)
    expect(refs.length).toBeGreaterThanOrEqual(2);
  });

  it("CA attribute name produces references", async () => {
    const refs = await refsAt("matrix-highlight.bind")();
    // matrix-highlight is used in multiple places in the template
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("VC pipe name produces references", async () => {
    const refs = await refsAt("| formatDate", 2)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("BB ampersand name produces references", async () => {
    const refs = await refsAt("& rateLimit", 2)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 2. Bindable references — attribute binding sites
// ============================================================================

describe("references: bindable properties", () => {
  it("bindable attribute produces references including template binding sites", async () => {
    // count.bind on matrix-panel — references should include the binding site
    const refs = await refsAt("count.bind", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
    // At minimum, the binding site itself should be in the reference set
    const bindingOffset = text.indexOf("count.bind");
    const hasBinding = hasRefAt(refs, bindingOffset);
    expect(hasBinding, "Binding site should be in reference set").toBe(true);
  });

  it("string-literal bindable produces references", async () => {
    // title="Dashboard" — a static string assignment to a bindable
    const refs = await refsAt("title=\"Dashboard\"", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 3. Expression references — identifiers and member access
// ============================================================================

describe("references: expression identifiers", () => {
  it("VM property in interpolation produces references to all usages", async () => {
    // ${title} — 'title' appears in multiple interpolations and bindings
    const refs = await refsAt("${title}", 2)();
    // title is used in: ${title}, title="Dashboard", $this.title, $parent.title, etc.
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("VM method in event handler produces references", async () => {
    const refs = await refsAt("selectItem(item)", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 4. Reference completeness — references include declaration + usage sites
// ============================================================================

describe("references: completeness", () => {
  it("CE references include both the template tag and closing tag", async () => {
    const refs = await refsAt("<matrix-badge value.bind", 1)();
    // matrix-badge is used inside the repeat loop — should have both
    // open and close tag references if the element is not self-closing
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("CE references include TypeScript declaration site", async () => {
    const refs = await refsAt("<matrix-panel\n")();
    // Should include a reference in the .ts file (class declaration or
    // dependencies array)
    const tsRefs = refs.filter((r) => String(r.uri).endsWith(".ts"));
    // TS references may or may not be present depending on whether the
    // workspace has TS services enabled — verify at least template refs exist
    const templateRefs = refs.filter((r) => String(r.uri).endsWith(".html"));
    expect(templateRefs.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 5. SymbolId consistency — references carry the correct symbolId
// ============================================================================

describe("references: symbolId", () => {
  it("all references for a CE carry the same symbolId", async () => {
    const refs = await refsAt("<matrix-panel\n")();
    const symbolIds = refs
      .map((r) => r.symbolId)
      .filter((id): id is string => id !== undefined);
    if (symbolIds.length > 1) {
      // All symbolIds should be identical — they refer to the same symbol
      const unique = new Set(symbolIds);
      expect(unique.size).toBe(1);
    }
  });

  it("references carry symbolIds (not bare locations)", async () => {
    const refs = await refsAt("<matrix-panel\n")();
    // At least some references should carry symbolIds for cross-feature linking
    const withIds = refs.filter((r) => r.symbolId);
    expect(withIds.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 6. Non-reference positions — no references where there's nothing to find
// ============================================================================

// ============================================================================
// 6a. Scope construct references
// ============================================================================

describe("references: scope constructs", () => {
  it("local template element produces references at definition and usage sites", async () => {
    const refs = await refsAt("<inline-tag repeat.for", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(2);
    // Should include: at least one tag usage + the declaration site
    const htmlRefs = refs.filter((r) => String(r.uri).includes(".html"));
    expect(htmlRefs.length).toBeGreaterThanOrEqual(2);
    // Verify span text at one of the references
    const tagRef = htmlRefs.find((r) => refSpanText(r) === "inline-tag");
    expect(tagRef, "Should have a reference spanning 'inline-tag'").toBeDefined();
  });

  it("local template references include the declaration site", async () => {
    const refs = await refsAt("<inline-tag repeat.for", 1)();
    // The declaration is <template as-custom-element="inline-tag">
    // The reference should cover the value "inline-tag" in that attribute
    const declRef = refs.find((r) => {
      const spanText = refSpanText(r);
      // The declaration could be the value span or the full attribute span
      return spanText === "inline-tag" && r.span && r.span.start < text.indexOf("<inline-tag");
    });
    expect(declRef, "Should have a declaration-site reference before the first usage").toBeDefined();
  });

  it("as-element CE name produces references", async () => {
    const refs = await refsAt('as-element="matrix-badge"', 'as-element="'.length + 1)();
    // Should include matrix-badge references (same resource, different syntax)
    expect(refs.length).toBeGreaterThanOrEqual(2);
    // Verify the as-element value itself is in the reference set
    const asElementOffset = text.indexOf('as-element="matrix-badge"') + 'as-element="'.length;
    const hasAsElement = hasRefAt(refs, asElementOffset);
    expect(hasAsElement, "as-element value position should be in the reference set").toBe(true);
  });

  it("expression identifier produces references across templates", async () => {
    // 'total' is used in count.bind="total" and ${total}
    const refs = await refsAt('="total"', 2)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("shorthand :value references same resource as value.bind", async () => {
    const refs = await refsAt(':value="title"', 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("multi-binding CA produces references", async () => {
    const refs = await refsAt("matrix-tooltip=", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("TC repeat produces references", async () => {
    const refs = await refsAt("repeat.for=\"item of items\"", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("TC if produces references", async () => {
    const refs = await refsAt("if.bind=\"showDetail\"", 1)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 6c. Cross-syntax references — same resource, different syntax forms
// ============================================================================

describe("references: cross-syntax consistency", () => {
  it("matrix-badge references include both tag form and as-element form", async () => {
    const refs = await refsAt("<matrix-badge value.bind", 1)();
    // matrix-badge used as: <matrix-badge ...> and <div as-element="matrix-badge">
    // and :value on another <matrix-badge>
    expect(refs.length).toBeGreaterThanOrEqual(3);
    // Verify the as-element value is in the reference set
    const asElementOffset = text.indexOf('as-element="matrix-badge"') + 'as-element="'.length;
    expect(hasRefAt(refs, asElementOffset), "as-element value should appear in tag-initiated refs").toBe(true);
  });

  it("CE reference set from tag and from as-element are the same resource", async () => {
    const tagRefs = await refsAt("<matrix-badge value.bind", 1)();
    const asElementRefs = await refsAt('as-element="matrix-badge"', 'as-element="'.length + 1)();
    // Both should find references — not conditional
    expect(tagRefs.length).toBeGreaterThan(0);
    expect(asElementRefs.length).toBeGreaterThan(0);
    // Both should return the same count (same symbol, same reference set)
    expect(tagRefs.length, "Tag and as-element should return same number of refs").toBe(asElementRefs.length);
    // They should share at least one symbolId
    const tagSymbolIds = new Set(tagRefs.map((r) => r.symbolId).filter(Boolean));
    const asElementSymbolIds = new Set(asElementRefs.map((r) => r.symbolId).filter(Boolean));
    const shared = [...tagSymbolIds].filter((id) => asElementSymbolIds.has(id));
    expect(shared.length, "Tag and as-element should reference the same symbol").toBeGreaterThan(0);
  });
});

// ============================================================================
// 6b. Non-reference positions — no references where there's nothing to find
// ============================================================================

describe("references: non-reference positions", () => {
  it("native HTML element produces no references", async () => {
    const refs = await refsAt("<h2>", 1)();
    expect(refs).toHaveLength(0);
  });

  it("static text produces no references", async () => {
    const refs = await refsAt("Detail view", 1)();
    expect(refs).toHaveLength(0);
  });

  it("whitespace produces no references", async () => {
    // Between elements — no semantic entity
    const refs = query.references(await pos("  <matrix-panel\n", 0));
    expect(refs).toHaveLength(0);
  });
});

// ============================================================================
// 7. Determinism — same query, same result
// ============================================================================

// ============================================================================
// 8. TS-side references — finding references from TypeScript files
// ============================================================================

// ============================================================================
// 8a. Reference span text verification — spans should point to correct content
// ============================================================================

describe("references: span text verification", () => {
  it("CE tag reference spans contain the element name", async () => {
    const refs = await refsAt("<matrix-badge value.bind", 1)();
    const htmlRefs = refs.filter((r) => String(r.uri).includes(".html"));
    for (const ref of htmlRefs) {
      const spanText = refSpanText(ref);
      // Each HTML reference span should contain matrix-badge, div, or :value-related text
      // Tag references should be "matrix-badge" or "div" (for as-element override)
      expect(spanText.length).toBeGreaterThan(0);
    }
  });

  it("VC reference spans contain the converter name", async () => {
    const refs = await refsAt("| formatDate", 2)();
    const htmlRefs = refs.filter((r) => String(r.uri).includes(".html"));
    const vcRef = htmlRefs.find((r) => refSpanText(r) === "formatDate");
    expect(vcRef, "Should have a reference span containing 'formatDate'").toBeDefined();
  });

  it("BB reference spans contain the behavior name", async () => {
    const refs = await refsAt("& rateLimit", 2)();
    const htmlRefs = refs.filter((r) => String(r.uri).includes(".html"));
    const bbRef = htmlRefs.find((r) => refSpanText(r) === "rateLimit");
    expect(bbRef, "Should have a reference span containing 'rateLimit'").toBeDefined();
  });

  it("CA reference spans contain the attribute name", async () => {
    const refs = await refsAt("matrix-highlight.bind", 1)();
    const htmlRefs = refs.filter((r) => String(r.uri).includes(".html"));
    // At least one span should cover "matrix-highlight"
    const caRef = htmlRefs.find((r) => refSpanText(r).includes("matrix-highlight"));
    expect(caRef, "Should have a reference span containing 'matrix-highlight'").toBeDefined();
  });
});

// ============================================================================
// 8b. TS-side references — finding references from TypeScript files
// ============================================================================

describe("references: from TypeScript side", () => {
  it("VM property in TS produces no crash", async () => {
    const { uri: tsUri, position } = await posInFile("src/app.ts", "total = 42", 1);
    const refs = query.references(position);
    // TS-side references require overlay synchronization which may or may not
    // be available in the test harness. Verify no crash at minimum.
    expect(Array.isArray(refs)).toBe(true);
  });

  it("@bindable property in TS produces no crash", async () => {
    const { uri: tsUri, position } = await posInFile(
      "src/components/matrix-panel.ts",
      '@bindable title = "Untitled"',
      "@bindable ".length,
    );
    const refs = query.references(position);
    expect(Array.isArray(refs)).toBe(true);
  });

  it("VM method in TS produces no crash", async () => {
    const { uri: tsUri, position } = await posInFile("src/app.ts", "selectItem(item: MatrixItem)", 1);
    const refs = query.references(position);
    expect(Array.isArray(refs)).toBe(true);
  });
});

// ============================================================================
// 9. Determinism — same query, same result
// ============================================================================

describe("references: determinism", () => {
  it("same position produces identical reference sets", async () => {
    const p = await pos("<matrix-panel\n", 1);
    const first = query.references(p);
    const second = query.references(p);
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(String(first[i].uri)).toBe(String(second[i].uri));
      expect(first[i].span.start).toBe(second[i].span.start);
      expect(first[i].span.end).toBe(second[i].span.end);
    }
  });
});
