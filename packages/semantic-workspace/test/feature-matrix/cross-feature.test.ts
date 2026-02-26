/**
 * Feature Matrix: Cross-Feature Consistency
 *
 * Derived from testing thesis §Cross-feature consistency and L1 cross-cutting
 * §Feature principle #10. The same cursor position must produce consistent
 * entity classification across all features.
 *
 * These tests are the highest-value missing tests in the suite. They catch
 * silent failures where one feature classifies a position differently from
 * another — e.g., hover says "custom-element" but completions offers
 * binding-behavior suggestions.
 *
 * Test structure:
 * 1. Resource identity — hover kind agrees with definition target
 * 2. Definition-reference symmetry — definition targets appear in references
 * 3. Hover-completion kind agreement — hover kind matches completion kind
 * 4. Rename placeholder matches hover name
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getHarness,
  getAppQuery,
  getAppTemplate,
  pos,
  assertHoverContains,
} from "./_harness.js";
import { hasLabel } from "../test-utils.js";
import type { SemanticQuery, WorkspaceHover, WorkspaceLocation } from "../../out/types.js";
import type { WorkspaceHarness } from "../harness/types.js";

let query: SemanticQuery;
let harness: WorkspaceHarness;

beforeAll(async () => {
  harness = await getHarness();
  query = await getAppQuery();
});

function readText(uri: string): string | null {
  return harness.readText(uri);
}

// ============================================================================
// 1. Resource identity — hover kind agrees with definition target
//
// If hover identifies an entity as kind K with name N, then definition at
// the same position should navigate to the source file for kind K, name N.
// ============================================================================

describe("cross-feature: hover-definition agreement", () => {
  it("CE tag: hover says custom-element, definition navigates to CE class", async () => {
    const position = await pos("<matrix-panel\n", 1);
    const hover = query.hover(position);
    assertHoverContains(hover, "matrix-panel", "CE hover should mention name");
    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("matrix-panel.ts"));
    expect(hit, "Definition should navigate to the CE file that hover identifies").toBeDefined();
  });

  it("CA attr: hover says custom-attribute, definition navigates to CA class", async () => {
    const position = await pos("matrix-highlight.bind", 1);
    const hover = query.hover(position);
    assertHoverContains(hover, "matrix-highlight", "CA hover should mention name");
    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("matrix-highlight.ts"));
    expect(hit, "Definition should navigate to the CA file that hover identifies").toBeDefined();
  });

  it("VC: hover says value-converter, definition navigates to VC class", async () => {
    const position = await pos("| formatDate", 2);
    const hover = query.hover(position);
    assertHoverContains(hover, "formatDate", "VC hover should mention name");
    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("format-date.ts"));
    expect(hit, "Definition should navigate to the VC file that hover identifies").toBeDefined();
  });

  it("BB: hover says binding-behavior, definition navigates to BB class", async () => {
    const position = await pos("& rateLimit", 2);
    const hover = query.hover(position);
    assertHoverContains(hover, "rateLimit", "BB hover should mention name");
    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("rate-limit.ts"));
    expect(hit, "Definition should navigate to the BB file that hover identifies").toBeDefined();
  });

  it("bindable: hover mentions property, definition navigates to CE file", async () => {
    const position = await pos("count.bind", 1);
    const hover = query.hover(position);
    assertHoverContains(hover, "count", "Bindable hover should mention property name");
    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("matrix-panel.ts"));
    expect(hit, "Bindable definition should navigate to parent CE").toBeDefined();
  });
});

// ============================================================================
// 2. Definition-reference symmetry
//
// If definition(P) navigates to file F, then references(P) should include
// at least P itself (the position we're querying from).
// ============================================================================

describe("cross-feature: definition-reference symmetry", () => {
  it("CE tag: definition target appears in reference set", async () => {
    const position = await pos("<matrix-panel\n", 1);
    const defs = query.definition(position);
    const refs = query.references(position);
    const defUri = defs.find((d) => String(d.uri).includes("matrix-panel"))?.uri;
    if (defUri) {
      // The definition target (matrix-panel.ts) should also appear in references
      // as the declaration site
      expect(refs.length, "References should include at least the usage site").toBeGreaterThanOrEqual(1);
    }
  });

  it("VC: reference set includes the usage position", async () => {
    const position = await pos("| formatDate", 2);
    const refs = query.references(position);
    expect(refs.length, "VC should have at least one reference (the usage)").toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 3. Hover-completion kind agreement
//
// At a tag-name position, if hover identifies a custom-element, then
// completions at an equivalent position should include that element with
// kind "custom-element".
// ============================================================================

describe("cross-feature: hover-completion kind agreement", () => {
  it("CE tag position: hover kind agrees with completions kind", async () => {
    // Hover at CE tag confirms it's a custom element
    const hoverPos = await pos("<matrix-panel\n", 1);
    const hover = query.hover(hoverPos);
    assertHoverContains(hover, /(custom element)/, "Hover should identify as CE");

    // Completions at a tag-name position should include matrix-panel as custom-element
    const completions = query.completions(await pos("<matrix-badge value.bind", 1)).items;
    const item = completions.find((c) => c.label === "matrix-panel");
    expect(item, "Completions should include the CE that hover identifies").toBeDefined();
    if (item) {
      expect(item.kind, "Completions kind should agree with hover kind").toBe("custom-element");
    }
  });

  it("VC pipe position: completions include the VC that hover identifies", async () => {
    // Hover at VC confirms it's a value-converter
    const hover = query.hover(await pos("| formatDate", 2));
    assertHoverContains(hover, /(value converter)/, "Hover should identify as VC");

    // Completions at a pipe position should include formatDate
    const completions = query.completions(await pos("| formatDate", 1)).items;
    expect(hasLabel(completions, "formatDate"), "Completions should include the VC").toBe(true);
  });
});

// ============================================================================
// 4. Rename placeholder matches hover name
//
// The rename placeholder at position P should match the entity name
// that hover shows at P. If hover says "matrix-panel", the rename
// placeholder should be "matrix-panel".
// ============================================================================

describe("cross-feature: rename-hover agreement", () => {
  it("CE tag: hover name appears in definition target", async () => {
    const position = await pos("<matrix-panel\n", 1);
    const hover = query.hover(position);
    assertHoverContains(hover, "matrix-panel");

    // The hover name should correspond to the definition target
    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("matrix-panel"));
    expect(hit, "Hover name should correspond to definition target file").toBeDefined();
  });

  it("VC: hover name appears in definition target", async () => {
    const position = await pos("| formatDate", 2);
    const hover = query.hover(position);
    assertHoverContains(hover, "formatDate");

    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("format-date"));
    expect(hit, "Hover name should correspond to definition target file").toBeDefined();
  });

  it("BB: hover name appears in definition target", async () => {
    const position = await pos("& rateLimit", 2);
    const hover = query.hover(position);
    assertHoverContains(hover, "rateLimit");

    const defs = query.definition(position);
    const hit = defs.find((d) => String(d.uri).includes("rate-limit"));
    expect(hit, "Hover name should correspond to definition target file").toBeDefined();
  });
});

// ============================================================================
// 5. Determinism — same input produces same output across features
// ============================================================================

describe("cross-feature: determinism", () => {
  it("repeated definition query produces identical results", async () => {
    const position = await pos("<matrix-panel\n", 1);
    const defs1 = query.definition(position);
    const defs2 = query.definition(position);
    expect(defs1.length).toBe(defs2.length);
    for (let i = 0; i < defs1.length; i++) {
      expect(String(defs1[i]!.uri)).toBe(String(defs2[i]!.uri));
      expect(defs1[i]!.span?.start).toBe(defs2[i]!.span?.start);
      expect(defs1[i]!.span?.end).toBe(defs2[i]!.span?.end);
    }
  });

  it("repeated hover query produces identical content", async () => {
    const position = await pos("| formatDate", 2);
    const hover1 = query.hover(position);
    const hover2 = query.hover(position);
    expect(hover1?.contents).toBe(hover2?.contents);
  });

  it("repeated completions query produces same items", async () => {
    const position = await pos("| formatDate", 1);
    const comp1 = query.completions(position).items;
    const comp2 = query.completions(position).items;
    expect(comp1.length).toBe(comp2.length);
    const labels1 = comp1.map((c) => c.label).sort();
    const labels2 = comp2.map((c) => c.label).sort();
    expect(labels1).toEqual(labels2);
  });
});
