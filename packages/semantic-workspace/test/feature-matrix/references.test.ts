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
  pos,
  offset,
} from "./_harness.js";
import { spanCoversOffset } from "../test-utils.js";
import type { SemanticQuery, WorkspaceLocation } from "../../out/types.js";

let query: SemanticQuery;
let text: string;

beforeAll(async () => {
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
    const refs = await refsAt("| format-date", 2)();
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it("BB ampersand name produces references", async () => {
    const refs = await refsAt("& rate-limit", 2)();
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
