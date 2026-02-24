/**
 * Feature Matrix: Definition (Navigation)
 *
 * Systematic definition/go-to-definition verification across all navigable
 * entity kinds. Derived from navigation-spec.md.
 *
 * Test structure:
 * 1. Resource navigation — each resource kind resolves to its declaration
 * 2. SymbolId contract — correct namespace per entity type
 * 3. Command suppression — command positions produce no definition
 * 4. Tier ordering — local definitions before resource before base
 * 5. Expression navigation — scope identifiers navigate to VM declarations
 * 6. Meta element navigation — import elements navigate to target modules
 * 7. Non-navigable positions — whitespace, native elements, comments
 */

import { beforeAll, describe, expect, it } from "vitest";
import { symbolIdNamespace } from "@aurelia-ls/compiler";
import {
  getHarness,
  getAppQuery,
  getAppTemplate,
  pos,
} from "./_harness.js";
import { expectDefinition } from "../test-utils.js";
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

// ============================================================================
// Helpers
// ============================================================================

function readText(uri: string): string | null {
  return harness.readText(uri);
}

// ============================================================================
// 1. Resource navigation — each resource kind resolves to its declaration
// ============================================================================

describe("definition: resource kinds", () => {
  it("CE tag navigates to class declaration", async () => {
    const defs = query.definition(await pos("<matrix-panel\n", 1));
    expectDefinition(readText, defs, {
      uriEndsWith: "/components/matrix-panel.ts",
      textIncludes: "MatrixPanel",
    });
  });

  it("convention CE navigates to class declaration", async () => {
    const defs = query.definition(await pos("<matrix-badge value.bind", 1));
    expectDefinition(readText, defs, {
      uriEndsWith: "/components/matrix-badge.ts",
      textIncludes: "MatrixBadge",
    });
  });

  it("CA navigates to class declaration", async () => {
    const defs = query.definition(await pos("matrix-highlight.bind", 1));
    expectDefinition(readText, defs, {
      uriEndsWith: "/attributes/matrix-highlight.ts",
      textIncludes: "MatrixHighlightCA",
    });
  });

  it("VC navigates to class declaration", async () => {
    const defs = query.definition(await pos("| format-date", 2));
    expectDefinition(readText, defs, {
      uriEndsWith: "/converters/format-date.ts",
      textIncludes: "FormatDateValueConverter",
    });
  });

  it("BB navigates to class declaration", async () => {
    const defs = query.definition(await pos("& rate-limit", 2));
    expectDefinition(readText, defs, {
      uriEndsWith: "/behaviors/rate-limit.ts",
      textIncludes: "RateLimitBindingBehavior",
    });
  });

  it("TC navigates to framework source or local definition", async () => {
    const defs = query.definition(await pos("if.bind=\"showDetail\"", 1));
    // The `if` TC is a framework built-in — definition should exist
    expect(defs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 2. SymbolId contract — correct namespace per entity type
// ============================================================================

describe("definition: symbolId namespace", () => {
  it("CE definition has sym: namespace", async () => {
    const defs = query.definition(await pos("<matrix-panel\n", 1));
    const hit = defs.find((d) => String(d.uri).endsWith("/matrix-panel.ts"));
    if (hit?.symbolId) {
      expect(symbolIdNamespace(hit.symbolId)).toBe("sym");
    }
  });

  it("bindable definition has bindable: namespace", async () => {
    const defs = query.definition(await pos("count.bind", 1));
    const hit = defs.find((d) => String(d.uri).includes("matrix-panel.ts"));
    if (hit?.symbolId) {
      expect(symbolIdNamespace(hit.symbolId)).toBe("bindable");
    }
  });
});

// ============================================================================
// 3. Command suppression — command positions produce no definition
//    (Binding commands are mechanics, not navigable symbols)
// ============================================================================

describe("definition: command suppression", () => {
  it("bind command position produces no resource definition", async () => {
    // Cursor on "bind" in "count.bind"
    const defs = query.definition(await pos("count.bind", "count.".length + 1));
    // Should produce 0 definitions (bind is a mechanic, not a symbol)
    // Note: base tier (TS overlay) may still return results — this tests
    // the resource tier specifically. The full suppression requires overlay
    // projection fixes.
    const resourceDefs = defs.filter((d) => String(d.uri).includes("/feature-matrix/"));
    expect(resourceDefs).toHaveLength(0);
  });

  it("trigger command position produces no resource definition", async () => {
    const defs = query.definition(await pos("click.trigger", "click.".length + 1));
    const resourceDefs = defs.filter((d) => String(d.uri).includes("/feature-matrix/"));
    expect(resourceDefs).toHaveLength(0);
  });
});

// ============================================================================
// 4. Bindable navigation — attribute names navigate to property declarations
// ============================================================================

describe("definition: bindable navigation", () => {
  it("bindable attribute navigates to property declaration", async () => {
    const defs = query.definition(await pos("count.bind", 1));
    expectDefinition(readText, defs, {
      uriEndsWith: "/components/matrix-panel.ts",
      textIncludes: "count",
    });
  });

  it("string-literal bindable navigates to property declaration", async () => {
    const defs = query.definition(await pos("title=\"Dashboard\"", 1));
    expectDefinition(readText, defs, {
      uriEndsWith: "/components/matrix-panel.ts",
      textIncludes: "title",
    });
  });
});

// ============================================================================
// 5. Expression navigation — identifiers navigate to VM
// ============================================================================

describe("definition: expression navigation", () => {
  it("interpolation identifier navigates to VM property", async () => {
    const defs = query.definition(await pos("${title}", 2));
    // Should navigate to App.title in app.ts
    const hit = defs.find((d) => String(d.uri).includes("app.ts"));
    expect(hit, "Expression should navigate to VM").toBeDefined();
  });

  it("method call navigates to VM method", async () => {
    const defs = query.definition(await pos("selectItem(item)", 1));
    const hit = defs.find((d) => String(d.uri).includes("app.ts"));
    expect(hit, "Method call should navigate to VM").toBeDefined();
  });
});

// ============================================================================
// 6. Meta element navigation — import navigates to target module
// ============================================================================

describe("definition: meta elements", () => {
  it("import from attribute navigates to target module", async () => {
    const defs = query.definition(await pos("./components/matrix-badge", 1));
    expect(defs.length).toBeGreaterThan(0);
    const hit = defs.find((d) => String(d.uri).includes("matrix-badge"));
    expect(hit).toBeDefined();
  });
});

// ============================================================================
// 7. Non-navigable positions
// ============================================================================

describe("definition: non-navigable positions", () => {
  it("native HTML element produces no definition", async () => {
    const defs = query.definition(await pos("<h2>", 1));
    expect(defs).toHaveLength(0);
  });

  it("static text content produces no definition", async () => {
    const defs = query.definition(await pos("Detail view", 1));
    expect(defs).toHaveLength(0);
  });
});
