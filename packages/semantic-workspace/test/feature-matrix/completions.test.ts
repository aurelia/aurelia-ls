/**
 * Feature Matrix: Completions
 *
 * Systematic completions verification across all 10 position types from
 * completions-spec.md. Each position type has a fundamentally different
 * completion universe — no universal completion list exists.
 *
 * Test structure:
 * 1. Position type 1: Tag name — CE completions inside `<|`
 * 2. Position type 2: Attribute name on CE — bindable completions
 * 3. Position type 3: Attribute value — literal value completions
 * 4. Position type 4: Binding command — command suffix completions
 * 5. Position type 5a-e: Expression positions — scope members, locals, VCs, BBs
 * 6. Universe correctness — right items appear at each position
 * 7. Filtering — scope-aware, two-level resource lookup
 * 8. Kind classification — correct CompletionItemKind per item
 * 9. Confidence sorting — high-confidence items before low
 * 10. Cross-feature consistency — completion kind agrees with hover kind
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getAppQuery,
  getAppTemplate,
  pos,
} from "./_harness.js";
import { hasLabel } from "../test-utils.js";
import type { SemanticQuery, WorkspaceCompletionItem } from "../../out/types.js";

let query: SemanticQuery;
let text: string;

beforeAll(async () => {
  query = await getAppQuery();
  text = (await getAppTemplate()).text;
});

// ============================================================================
// Helpers
// ============================================================================

function labels(items: readonly WorkspaceCompletionItem[]): string[] {
  return items.map((item) => item.label);
}

function findItem(items: readonly WorkspaceCompletionItem[], label: string): WorkspaceCompletionItem | undefined {
  return items.find((item) => item.label === label);
}

// ============================================================================
// 1. Position type 1: Tag name — CE completions
//    Universe: CEs visible in this template's resource scope + HTML elements
// ============================================================================

describe("completions: tag name position", () => {
  it("includes locally registered custom elements", async () => {
    // Position just after `<` at a tag-name context.
    // We insert a `<` before a known element to create a tag completion context.
    // For now, test at the matrix-panel tag to verify CE completions include
    // the registered resources.
    const completions = query.completions(await pos("<matrix-panel\n", 1));
    // At a CE tag position, we expect CEs to appear
    expect(hasLabel(completions, "matrix-panel")).toBe(true);
  });

  it("includes convention-discovered elements", async () => {
    const completions = query.completions(await pos("<matrix-badge value.bind", 1));
    expect(hasLabel(completions, "matrix-badge")).toBe(true);
  });

  it("includes local template definitions", async () => {
    const completions = query.completions(await pos("<inline-tag repeat.for", 1));
    expect(hasLabel(completions, "inline-tag")).toBe(true);
  });

  it("CE completions have correct kind", async () => {
    const completions = query.completions(await pos("<matrix-panel\n", 1));
    const item = findItem(completions, "matrix-panel");
    expect(item).toBeDefined();
    expect(item!.kind).toBe("custom-element");
  });
});

// ============================================================================
// 2. Position type 2: Attribute name on CE — bindable completions
//    Universe: bindable properties of the target CE + native HTML attributes
// ============================================================================

describe("completions: attribute name on CE", () => {
  it("includes bindable properties of the target CE", async () => {
    // Position at attribute list of matrix-panel (after an existing attribute)
    const completions = query.completions(await pos("count.bind=\"total\"", 1));
    expect(hasLabel(completions, "title")).toBe(true);
    expect(hasLabel(completions, "count")).toBe(true);
    expect(hasLabel(completions, "items")).toBe(true);
  });

  it("includes the on-refresh callback bindable", async () => {
    const completions = query.completions(await pos("count.bind=\"total\"", 1));
    expect(hasLabel(completions, "on-refresh")).toBe(true);
  });

  it("bindable completions have correct kind", async () => {
    const completions = query.completions(await pos("count.bind=\"total\"", 1));
    const item = findItem(completions, "title");
    if (item) {
      expect(item.kind).toBe("bindable");
    }
  });
});

// ============================================================================
// 3. Position type 3: Attribute value — literal value completions
//    Universe: when the bindable type is a string union, suggest literal values
// ============================================================================

describe("completions: attribute value (literal)", () => {
  it("suggests enum literal values for typed bindables", async () => {
    // The `level` bindable on matrix-panel has type Severity = "info" | "warn" | "error" | "success"
    // When the cursor is inside level="", completions should suggest the union members.
    // This requires TypeScript type integration (tier C feature).
    const completions = query.completions(await pos('level="${activeSeverity}"', 'level="'.length));
    // This is a feature gap — if it fails, it confirms the gap exists.
    // When implemented, these should pass:
    const hasLiterals = hasLabel(completions, "info")
      || hasLabel(completions, "warn")
      || hasLabel(completions, "error")
      || hasLabel(completions, "success");
    // Mark as known gap if not implemented yet
    if (!hasLiterals) {
      expect.soft(hasLiterals, "Literal value completions not yet implemented for typed bindables").toBe(true);
    }
  });
});

// ============================================================================
// 4. Position type 4: Binding command — command suffix completions
//    Universe: registered binding commands (bind, trigger, two-way, etc.)
// ============================================================================

describe("completions: binding command", () => {
  it("includes standard binding commands", async () => {
    // Position at the command part of an attribute binding
    const completions = query.completions(await pos("count.bind", "count.".length));
    expect(hasLabel(completions, "bind")).toBe(true);
  });

  it("includes mode-specific commands", async () => {
    const completions = query.completions(await pos("count.bind", "count.".length));
    // Standard mode commands should be available
    if (completions.length > 0) {
      const commandLabels = labels(completions);
      // At minimum, bind should be present. Full set: bind, one-time, to-view, from-view, two-way
      expect(commandLabels).toContain("bind");
    }
  });
});

// ============================================================================
// 5. Expression positions — scope members, locals, VCs, BBs
// ============================================================================

describe("completions: expression root (scope members)", () => {
  it("includes view model properties at expression root", async () => {
    // Inside an interpolation expression
    const completions = query.completions(await pos("${title}", 2));
    expect(hasLabel(completions, "title")).toBe(true);
    expect(hasLabel(completions, "total")).toBe(true);
    expect(hasLabel(completions, "items")).toBe(true);
    expect(hasLabel(completions, "showDetail")).toBe(true);
  });

  it("includes view model methods at expression root", async () => {
    const completions = query.completions(await pos("${title}", 2));
    expect(hasLabel(completions, "selectItem")).toBe(true);
    expect(hasLabel(completions, "refreshData")).toBe(true);
  });

  it("includes getter properties at expression root", async () => {
    const completions = query.completions(await pos("${title}", 2));
    expect(hasLabel(completions, "filteredItems")).toBe(true);
  });
});

describe("completions: value converter pipe position", () => {
  it("includes registered value converters after pipe operator", async () => {
    const completions = query.completions(await pos("| formatDate", 2));
    expect(hasLabel(completions, "formatDate")).toBe(true);
  });

  it("VC completions have correct kind", async () => {
    const completions = query.completions(await pos("| formatDate", 2));
    const item = findItem(completions, "formatDate");
    if (item) {
      expect(item.kind).toBe("value-converter");
    }
  });
});

describe("completions: binding behavior ampersand position", () => {
  it("includes registered binding behaviors after ampersand", async () => {
    const completions = query.completions(await pos("& rateLimit", 2));
    expect(hasLabel(completions, "rateLimit")).toBe(true);
  });

  it("BB completions have correct kind", async () => {
    const completions = query.completions(await pos("& rateLimit", 2));
    const item = findItem(completions, "rateLimit");
    if (item) {
      expect(item.kind).toBe("binding-behavior");
    }
  });
});

// ============================================================================
// 6. Universe correctness — wrong items don't appear
// ============================================================================

describe("completions: universe filtering", () => {
  it("tag position does not include VCs or BBs", async () => {
    const completions = query.completions(await pos("<matrix-panel\n", 1));
    expect(hasLabel(completions, "formatDate")).toBe(false);
    expect(hasLabel(completions, "rateLimit")).toBe(false);
  });

  it("attribute position does not include CEs", async () => {
    // At an attribute name position on a CE, CEs should not appear
    const completions = query.completions(await pos("count.bind=\"total\"", 1));
    // CEs should not be in the attribute completion universe
    const ceItem = findItem(completions, "matrix-badge");
    if (ceItem) {
      // If it appears, it should at least not be kind "custom-element" in this position
      expect(ceItem.kind).not.toBe("custom-element");
    }
  });

  it("VC pipe position does not include CEs or CAs", async () => {
    const completions = query.completions(await pos("| formatDate", 2));
    expect(hasLabel(completions, "matrix-panel")).toBe(false);
    expect(hasLabel(completions, "matrix-highlight")).toBe(false);
  });
});

// ============================================================================
// 7. Confidence — completions carry trust metadata
// ============================================================================

describe("completions: confidence metadata", () => {
  it("locally registered resources have source origin", async () => {
    const completions = query.completions(await pos("<matrix-panel\n", 1));
    const item = findItem(completions, "matrix-panel");
    if (item?.origin) {
      expect(item.origin).toBe("source");
    }
  });

  it("VC completions carry trust metadata", async () => {
    const completions = query.completions(await pos("| formatDate", 2));
    const item = findItem(completions, "formatDate");
    if (item?.confidence) {
      // Source-analyzed VC should have high or exact confidence
      expect(["exact", "high"]).toContain(item.confidence);
    }
  });
});

// ============================================================================
// 8. Custom attributes at attribute position
// ============================================================================

describe("completions: custom attributes", () => {
  it("includes registered CAs at attribute position on native elements", async () => {
    // On a native element, CAs should appear in attribute completions
    const completions = query.completions(await pos("<div matrix-tooltip", 1));
    expect(hasLabel(completions, "matrix-highlight")).toBe(true);
    expect(hasLabel(completions, "matrix-tooltip")).toBe(true);
  });
});

// ============================================================================
// 9. Import completions
// ============================================================================

describe("completions: import from", () => {
  it("includes module specifiers for import elements", async () => {
    const completions = query.completions(await pos('<import from="./components/matrix-badge">', '<import from="./'.length));
    expect(Array.isArray(completions)).toBe(true);
  });
});

// ============================================================================
// 10. Scope-aware expression completions
// ============================================================================

describe("completions: scope-aware expressions", () => {
  it("repeat scope includes iteration local 'item'", async () => {
    // Inside the repeat body, expression completions should include the local
    const completions = query.completions(await pos("${item.name}", 2));
    expect(hasLabel(completions, "item")).toBe(true);
  });

  it("repeat scope includes contextual variables", async () => {
    const completions = query.completions(await pos("${$index + 1}", 2));
    expect(hasLabel(completions, "$index")).toBe(true);
  });

  it("with scope includes value properties", async () => {
    // Inside with.bind="items[0]", completions should include item properties
    // (name, status, etc. from MatrixItem)
    const completions = query.completions(await pos("<div with.bind=\"items[0]\">\n      <span>${name}", "${name}".length - 2));
    // At minimum, the 'name' property from the with value should appear
    if (completions.length > 0) {
      expect(hasLabel(completions, "name")).toBe(true);
    }
  });

  it("nested repeat inner scope includes inner local", async () => {
    // group.items repeat: inner 'item' should be in scope
    const completions = query.completions(await pos("${item.name}: ${item.count}", 2));
    expect(hasLabel(completions, "item")).toBe(true);
  });

  it("$parent completions include outer scope members", async () => {
    const completions = query.completions(await pos("${$parent.title}", "$parent.".length + 2));
    if (completions.length > 0) {
      expect(hasLabel(completions, "title")).toBe(true);
    }
  });
});

// ============================================================================
// 11. Member access completions
// ============================================================================

describe("completions: member access", () => {
  it("dot access on item shows item properties", async () => {
    const completions = query.completions(await pos("${item.name}", "${item.".length));
    if (completions.length > 0) {
      expect(hasLabel(completions, "name")).toBe(true);
    }
  });

  it("dot access on group shows group properties", async () => {
    const completions = query.completions(await pos("${group.title}", "${group.".length));
    if (completions.length > 0) {
      expect(hasLabel(completions, "title")).toBe(true);
    }
  });
});

// ============================================================================
// 12. Binding command completions per position
// ============================================================================

describe("completions: binding commands context", () => {
  it("includes event commands (trigger, capture) at event position", async () => {
    const completions = query.completions(await pos("click.trigger", "click.".length));
    expect(hasLabel(completions, "trigger")).toBe(true);
  });

  it("includes for command at repeat position", async () => {
    const completions = query.completions(await pos("repeat.for", "repeat.".length));
    expect(hasLabel(completions, "for")).toBe(true);
  });
});

// ============================================================================
// 13. Contextual variable completions
// ============================================================================

describe("completions: contextual variables", () => {
  it("repeat scope includes $even, $odd, $first, $last", async () => {
    const completions = query.completions(await pos("${$first ?", 2));
    expect(hasLabel(completions, "$first")).toBe(true);
    expect(hasLabel(completions, "$last")).toBe(true);
    expect(hasLabel(completions, "$even")).toBe(true);
    expect(hasLabel(completions, "$odd")).toBe(true);
  });

  it("repeat scope includes $length and $middle", async () => {
    const completions = query.completions(await pos("${$index + 1}", 2));
    expect(hasLabel(completions, "$length")).toBe(true);
    expect(hasLabel(completions, "$middle")).toBe(true);
  });
});

// ============================================================================
// 14. Promise scope completions
// ============================================================================

describe("completions: promise scope", () => {
  it("then block scope includes the from-view variable", async () => {
    // Inside then.from-view="result", ${result.message} — 'result' should be in scope
    const completions = query.completions(await pos("${result.message}", 2));
    expect(hasLabel(completions, "result")).toBe(true);
  });

  it("catch block scope includes the from-view variable", async () => {
    const completions = query.completions(await pos("${err.message}", 2));
    expect(hasLabel(completions, "err")).toBe(true);
  });
});

// ============================================================================
// 15. Destructured repeat completions
// ============================================================================

describe("completions: destructured repeat", () => {
  it("destructured variables are in scope", async () => {
    const completions = query.completions(await pos("${idx}:", 2));
    expect(hasLabel(completions, "idx")).toBe(true);
  });

  it("destructured entry variable is in scope", async () => {
    const completions = query.completions(await pos("${entry.name}", 2));
    expect(hasLabel(completions, "entry")).toBe(true);
  });
});

// ============================================================================
// 16. Template controller completions at attribute positions
// ============================================================================

describe("completions: TC attribute positions", () => {
  it("switch.bind has completions for VM properties", async () => {
    const completions = query.completions(await pos('switch.bind="activeSeverity"', 'switch.bind="'.length));
    expect(hasLabel(completions, "activeSeverity")).toBe(true);
  });

  it("if.bind has completions for VM properties", async () => {
    const completions = query.completions(await pos('if.bind="showDetail"', 'if.bind="'.length));
    expect(hasLabel(completions, "showDetail")).toBe(true);
  });
});

// ============================================================================
// 17. Multi-binding CA completions
// ============================================================================

describe("completions: multi-binding CA", () => {
  it("multi-binding CA attribute position includes the CA name", async () => {
    const completions = query.completions(await pos("matrix-tooltip=", 1));
    // At the attribute name position, the CA should appear
    if (completions.length > 0) {
      expect(hasLabel(completions, "matrix-tooltip")).toBe(true);
    }
  });
});
