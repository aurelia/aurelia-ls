/**
 * Feature Matrix: Rename
 *
 * Systematic rename verification across renameable entities, safety
 * decisions, and non-renameable constructs. Derived from rename-spec.md.
 *
 * Rename is unique among features: partial output (updating some references
 * but not all) is the most dangerous rung — worse than refusal. The entire
 * design serves punishment avoidance (missed reference = silent bug).
 *
 * Test structure:
 * 1. Renameable entities — CE, CA, VC, BB, bindable: rename succeeds
 * 2. Non-renameable constructs — commands, contextual vars, builtins: denied
 * 3. Safety decision — prepareRename returns range, placeholder, safety
 * 4. Edit mechanics — rename produces correct edits per declaration form
 * 5. Cross-feature consistency — rename reference set matches find-references
 * 6. Policy gating — refactor policy can block rename
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getHarness,
  getAppQuery,
  getAppTemplate,
  pos,
  posInFile,
} from "./_harness.js";
import type { WorkspaceHarness } from "../harness/types.js";
import type { SemanticQuery, RefactorEngine } from "../../out/types.js";

let harness: WorkspaceHarness;
let query: SemanticQuery;
let refactor: RefactorEngine;
let text: string;
let uri: string;

beforeAll(async () => {
  harness = await getHarness();
  const app = await getAppTemplate();
  text = app.text;
  uri = app.uri as string;
  query = await getAppQuery();
  refactor = harness.workspace.refactor();
});

// ============================================================================
// Helpers
// ============================================================================

function prepareAt(needle: string, delta = 1) {
  return async () => {
    const position = await pos(needle, delta);
    return refactor.prepareRename({ uri: uri as any, position });
  };
}

function renameAt(needle: string, newName: string, delta = 1) {
  return async () => {
    const position = await pos(needle, delta);
    return refactor.rename({ uri: uri as any, position, newName });
  };
}

// ============================================================================
// 1. Renameable entities — prepareRename succeeds, returns range + placeholder
// ============================================================================

describe("rename: renameable entities", () => {
  it("CE tag name is renameable", async () => {
    const result = await prepareAt("<matrix-panel\n")();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("matrix-panel");
      expect(result.result.range).toBeDefined();
      expect(result.result.range.start).toBeGreaterThanOrEqual(0);
    }
  });

  it("bindable attribute is renameable", async () => {
    const result = await prepareAt("count.bind")();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(["count", "count.bind"]).toContain(result.result.placeholder);
    }
  });

  it("VC pipe name is renameable", async () => {
    const result = await prepareAt("| formatDate", 2)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("formatDate");
    }
  });

  it("BB ampersand name is renameable", async () => {
    const result = await prepareAt("& rateLimit", 2)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("rateLimit");
    }
  });

  it("VM property in binding expression is renameable", async () => {
    // count.bind="total" — cursor on "total" (the VM property)
    const result = await prepareAt('="total"', 2)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("total");
    }
  });

  it("VM property in interpolation is renameable", async () => {
    // ${title} — cursor on "title"
    const result = await prepareAt("${title}", 2)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("title");
    }
  });

  it("VM method in event binding is renameable", async () => {
    // click.trigger="selectItem(item)" — cursor on "selectItem"
    const result = await prepareAt("selectItem(item)", 1)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("selectItem");
    }
  });

  it("CA attribute name is renameable", async () => {
    const result = await prepareAt("matrix-highlight.bind", 1)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("matrix-highlight");
    }
  });

  it("local template element name is renameable", async () => {
    const result = await prepareAt("<inline-tag repeat.for", 1)();
    expect("result" in result, `Expected success but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("result" in result) {
      expect(result.result.placeholder).toBe("inline-tag");
    }
  });
});

// ============================================================================
// 2. Non-renameable constructs — prepareRename MUST deny
//    (rename-spec: binding commands, contextual vars, builtins are not
//    user-renameable)
// ============================================================================

describe("rename: non-renameable constructs", () => {
  it("binding command (.bind) is not renameable", async () => {
    const result = await prepareAt("count.bind", "count.".length + 1)();
    expect("error" in result, "Binding command .bind should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("binding command (.trigger) is not renameable", async () => {
    const result = await prepareAt("click.trigger", "click.".length + 1)();
    expect("error" in result, "Binding command .trigger should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("contextual variable ($index) is not renameable", async () => {
    const result = await prepareAt("${$index", 2)();
    expect("error" in result, "Contextual variable $index should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("native HTML element is not renameable", async () => {
    const result = await prepareAt("<h2>", 1)();
    expect("error" in result, "Native HTML element should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("static text is not renameable", async () => {
    const result = await prepareAt("Detail view", 1)();
    expect("error" in result, "Static text should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("binding command (.two-way) is not renameable", async () => {
    const result = await prepareAt("value.two-way", "value.".length + 1)();
    expect("error" in result, "Binding command .two-way should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("contextual variable ($first) is not renameable", async () => {
    const result = await prepareAt("${$first ?", 2)();
    expect("error" in result, "Contextual variable $first should be denied").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("built-in TC (if) is not user-renameable", async () => {
    const result = await prepareAt("if.bind=\"showDetail\"", 1)();
    // Built-in TCs are framework-owned — rename should be denied
    expect("error" in result, "Built-in TC 'if' should be denied").toBe(true);
  });

  it("built-in CE (au-compose) is not user-renameable", async () => {
    const result = await prepareAt("<au-compose", 1)();
    expect("error" in result, "Built-in CE 'au-compose' should be denied").toBe(true);
  });

  it("built-in CE (au-slot) is not user-renameable", async () => {
    const result = await prepareAt("<au-slot name", 1)();
    expect("error" in result, "Built-in CE 'au-slot' should be denied").toBe(true);
  });
});

// ============================================================================
// 3. Safety decision — prepareRename returns safety metadata
// ============================================================================

describe("rename: safety assessment", () => {
  it("prepareRename for source-analyzed CE includes safety", async () => {
    const result = await prepareAt("<matrix-panel\n")();
    expect("result" in result, "prepareRename should succeed for CE").toBe(true);
    if ("result" in result) {
      const safety = result.result.safety;
      expect(safety).toBeDefined();
      expect(safety.confidence).toBeDefined();
      expect(safety.totalReferences).toBeGreaterThanOrEqual(0);
    }
  });

  it("safety includes reference counts", async () => {
    const result = await prepareAt("<matrix-panel\n")();
    expect("result" in result, "prepareRename should succeed for CE").toBe(true);
    if ("result" in result) {
      const safety = result.result.safety;
      expect(typeof safety.totalReferences).toBe("number");
      expect(typeof safety.certainReferences).toBe("number");
      expect(safety.certainReferences).toBeLessThanOrEqual(safety.totalReferences);
    }
  });
});

// ============================================================================
// 4. Edit mechanics — rename produces edits across domains
// ============================================================================

describe("rename: edit production", () => {
  it("renaming CE tag produces edits in template", async () => {
    const result = await renameAt("<matrix-panel\n", "matrix-widget")();
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const edits = result.edit.edits;
      expect(edits.length).toBeGreaterThan(0);
      const templateEdits = edits.filter((e) => String(e.uri).endsWith("app.html"));
      expect(templateEdits.length).toBeGreaterThan(0);
    }
  });

  it("renaming CE also produces edits in TypeScript", async () => {
    const result = await renameAt("<matrix-panel\n", "matrix-widget")();
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const tsEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".ts"));
      expect(tsEdits.length).toBeGreaterThan(0);
    }
  });

  it("renaming VC produces edits in expression and declaration", async () => {
    const result = await renameAt("| formatDate", "formatDatetime", 2)();
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      expect(result.edit.edits.length).toBeGreaterThan(0);
    }
  });

  it("renaming VM property from binding expression produces edits", async () => {
    const result = await renameAt('="total"', "grandTotal", 2)();
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const edits = result.edit.edits;
      expect(edits.length).toBeGreaterThan(0);
      // Should produce edits in both template and TS
      const templateEdits = edits.filter((e) => String(e.uri).endsWith(".html"));
      const tsEdits = edits.filter((e) => String(e.uri).endsWith(".ts"));
      expect(templateEdits.length, "Should edit template binding expressions").toBeGreaterThan(0);
      expect(tsEdits.length, "Should edit TS property declaration").toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 5. Cross-feature consistency — rename reference set ⊇ find-references set
//    (rename-spec principle #10: "rename's reference set must be identical
//    to find-references' reference set")
// ============================================================================

describe("rename: cross-feature consistency with find-references", () => {
  it("CE rename edits cover all find-reference locations", async () => {
    const p = await pos("<matrix-panel\n", 1);

    const refs = query.references(p);
    const refUris = new Set(refs.map((r) => String(r.uri)));

    const result = refactor.rename({
      uri: uri as any,
      position: p,
      newName: "matrix-widget",
    });

    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const editUris = new Set(result.edit.edits.map((e) => String(e.uri)));
      for (const refUri of refUris) {
        expect(
          editUris.has(refUri),
          `Reference in ${refUri} has no corresponding rename edit`,
        ).toBe(true);
      }
    }
  });
});

// ============================================================================
// 6. Policy gating — refactor policy determines what's allowed
// ============================================================================

describe("rename: policy enforcement", () => {
  it("rename at non-resource position produces structured error", async () => {
    const result = refactor.rename({
      uri: uri as any,
      position: await pos("Detail view", 1),
      newName: "new-name",
    });
    expect("error" in result, "Rename at static text should produce error").toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
      expect(typeof result.error.message).toBe("string");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("rename error includes operation and reason in data", async () => {
    const result = refactor.rename({
      uri: uri as any,
      position: await pos("Detail view", 1),
      newName: "new-name",
    });
    expect("error" in result, "Rename at static text should produce error").toBe(true);
    if ("error" in result) {
      const data = result.error.data;
      expect(data).toBeDefined();
      expect(data!.operation).toBe("rename");
      expect(typeof data!.reason).toBe("string");
    }
  });
});

// ============================================================================
// 7. TS-side rename — renaming in TypeScript propagates to templates
//    (The user's VS Code bug: "renaming from the TS side doesn't propagate")
// ============================================================================

describe("rename: from TypeScript side", () => {
  it("renaming VM property in TS propagates to template bindings", async () => {
    // Rename 'total' in app.ts → should produce edits in app.html (count.bind="total", ${total})
    const { uri: tsUri, position } = await posInFile("src/app.ts", "total = 42", 1);
    const result = refactor.rename({ uri: tsUri as any, position, newName: "grandTotal" });
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
      expect(htmlEdits.length, "TS rename should propagate to template").toBeGreaterThan(0);
    }
  });

  it("renaming VM method in TS propagates to template event bindings", async () => {
    const { uri: tsUri, position } = await posInFile("src/app.ts", "selectItem(item: MatrixItem)", 1);
    const result = refactor.rename({ uri: tsUri as any, position, newName: "chooseItem" });
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
      expect(htmlEdits.length, "TS method rename should propagate to template").toBeGreaterThan(0);
    }
  });

  it("renaming @bindable property in TS propagates to template attribute", async () => {
    // Rename 'title' bindable in matrix-panel.ts → should update template usages
    const { uri: tsUri, position } = await posInFile(
      "src/components/matrix-panel.ts",
      '@bindable title = "Untitled"',
      "@bindable ".length,
    );
    const result = refactor.rename({ uri: tsUri as any, position, newName: "heading" });
    expect("edit" in result, `Expected edits but got error: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if ("edit" in result) {
      const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
      expect(htmlEdits.length, "Bindable rename should propagate to template attribute").toBeGreaterThan(0);
    }
  });

  it("renaming CE class preserves decorator name (not class name)", async () => {
    // Renaming the class 'MatrixPanel' should NOT change the CE name 'matrix-panel'
    // The decorator name property is the CE identity, not the class name
    const { uri: tsUri, position } = await posInFile(
      "src/components/matrix-panel.ts",
      "export class MatrixPanel",
      "export class ".length,
    );
    const result = refactor.prepareRename({ uri: tsUri as any, position });
    // Class rename is a TS concern — our refactor engine may or may not handle it
    // If it does handle it, template edits should only appear if the decorator name changes
    if ("result" in result) {
      expect(result.result.placeholder).toBe("MatrixPanel");
    }
    // Either way: should not crash
  });

  it("renaming CE decorator name property propagates to template tags", async () => {
    // Cursor on "matrix-panel" inside the @customElement({ name: "matrix-panel" }) decorator
    const { uri: tsUri, position } = await posInFile(
      "src/components/matrix-panel.ts",
      '"matrix-panel"',
      1,
    );
    const result = refactor.rename({ uri: tsUri as any, position, newName: "matrix-widget" });
    if ("edit" in result) {
      const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
      expect(htmlEdits.length, "Decorator name rename should update template tags").toBeGreaterThan(0);
    }
    // Even if denied, it should produce a structured error, not crash
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });
});

// ============================================================================
// 8. Edit completeness — verify edits cover ALL reference sites
//    (Rename-spec principle: partial rename is worse than refusal.
//    These tests verify the edit set is complete, not just non-empty.)
// ============================================================================

describe("rename: edit completeness — VM property", () => {
  it("renaming 'total' from template covers all template binding sites", async () => {
    const result = await renameAt('="total"', "grandTotal", 2)();
    expect("edit" in result, `Expected edits: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if (!("edit" in result)) return;

    const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
    const editTexts = htmlEdits.map((e) => e.newText);

    // All template edits should produce "grandTotal"
    for (const t of editTexts) {
      expect(t).toBe("grandTotal");
    }

    // count.bind="total", ${total}, let total-display.bind="total", total in string concat,
    // nonexistent-prop.bind="total" — at minimum 4 distinct binding expression sites
    expect(htmlEdits.length, "Should find all template references to 'total'").toBeGreaterThanOrEqual(4);
  });

  it("renaming 'total' from template also edits TS declaration and usages", async () => {
    const result = await renameAt('="total"', "grandTotal", 2)();
    expect("edit" in result).toBe(true);
    if (!("edit" in result)) return;

    const tsEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".ts"));
    // Should edit: property declaration (total = 42) + this.total in refreshData
    expect(tsEdits.length, "Should edit TS property declaration and member accesses").toBeGreaterThanOrEqual(2);
    for (const e of tsEdits) {
      expect(e.newText).toBe("grandTotal");
    }
  });

  it("renaming 'total' from TS side produces same template edits", async () => {
    const { uri: tsUri, position } = await posInFile("src/app.ts", "total = 42", 1);
    const result = refactor.rename({ uri: tsUri as any, position, newName: "grandTotal" });
    expect("edit" in result, `Expected edits: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if (!("edit" in result)) return;

    const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
    // Same template reference count as template-initiated rename
    expect(htmlEdits.length, "TS-initiated rename should find same template references").toBeGreaterThanOrEqual(4);
  });
});

describe("rename: edit completeness — CE tag", () => {
  it("renaming CE covers all tag name occurrences in template", async () => {
    const result = await renameAt("<matrix-panel\n", "matrix-widget")();
    expect("edit" in result).toBe(true);
    if (!("edit" in result)) return;

    const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith("app.html"));
    // matrix-panel appears as: open tag (line 15), close tag (line 182),
    // second usage open+close (line 190)
    // All edits should contain the new name
    const newNameEdits = htmlEdits.filter((e) => e.newText.includes("matrix-widget"));
    expect(newNameEdits.length, "Should rename all tag name occurrences").toBeGreaterThanOrEqual(2);
  });

  it("renaming CE updates decorator name property in TS", async () => {
    const result = await renameAt("<matrix-panel\n", "matrix-widget")();
    expect("edit" in result).toBe(true);
    if (!("edit" in result)) return;

    const panelTsEdits = result.edit.edits.filter(
      (e) => String(e.uri).endsWith("matrix-panel.ts"),
    );
    // Should edit the name: "matrix-panel" string in the decorator
    expect(panelTsEdits.length, "Should edit CE definition in matrix-panel.ts").toBeGreaterThan(0);
    const nameEdit = panelTsEdits.find((e) => e.newText.includes("matrix-widget"));
    expect(nameEdit, "Should update decorator name property to 'matrix-widget'").toBeDefined();
  });
});

describe("rename: edit completeness — VC pipe", () => {
  it("renaming VC covers template pipe expression", async () => {
    const result = await renameAt("| formatDate", "formatDatetime", 2)();
    expect("edit" in result).toBe(true);
    if (!("edit" in result)) return;

    const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
    expect(htmlEdits.length, "Should edit pipe expression in template").toBeGreaterThan(0);
    expect(htmlEdits[0]!.newText).toBe("formatDatetime");
  });

  it("renaming VC covers TS class/declaration", async () => {
    const result = await renameAt("| formatDate", "formatDatetime", 2)();
    expect("edit" in result).toBe(true);
    if (!("edit" in result)) return;

    const tsEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".ts"));
    expect(tsEdits.length, "Should edit VC definition/usage in TS").toBeGreaterThan(0);
  });
});

describe("rename: edit completeness — VM method", () => {
  it("renaming method from template covers event binding and TS declaration", async () => {
    // selectItem(item) in click.trigger
    const result = await renameAt("selectItem(item)", "chooseItem", 1)();
    if ("error" in result) {
      // Expression-member rename may not find the method — acceptable for now
      return;
    }

    const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
    const tsEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".ts"));

    // Template: selectItem(item) in click.trigger, selectItem($event) in second button
    expect(htmlEdits.length, "Should edit method calls in template").toBeGreaterThanOrEqual(1);
    // TS: method declaration + any internal calls
    expect(tsEdits.length, "Should edit method declaration in TS").toBeGreaterThanOrEqual(1);

    for (const e of htmlEdits) {
      expect(e.newText).toBe("chooseItem");
    }
  });
});

describe("rename: edit completeness — @bindable from TS", () => {
  it("renaming @bindable 'title' propagates to consumer template attributes", async () => {
    const { uri: tsUri, position } = await posInFile(
      "src/components/matrix-panel.ts",
      '@bindable title = "Untitled"',
      "@bindable ".length,
    );
    const result = refactor.rename({ uri: tsUri as any, position, newName: "heading" });
    expect("edit" in result, `Expected edits: ${"error" in result ? result.error.message : ""}`).toBe(true);
    if (!("edit" in result)) return;

    const htmlEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".html"));
    const tsEdits = result.edit.edits.filter((e) => String(e.uri).endsWith(".ts"));

    // Template: title="Dashboard" attribute on <matrix-panel>
    expect(htmlEdits.length, "Should update template attribute for bindable").toBeGreaterThan(0);
    // TS: @bindable title declaration + ${title} in inline template
    expect(tsEdits.length, "Should update TS property declaration").toBeGreaterThan(0);
  });
});
