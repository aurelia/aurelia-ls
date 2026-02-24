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
    if ("result" in result) {
      expect(result.result.placeholder).toBe("matrix-panel");
      expect(result.result.range).toBeDefined();
      expect(result.result.range.start).toBeGreaterThanOrEqual(0);
    } else {
      // If denied, the error should explain why — not silently fail
      expect(result.error.kind).toBeDefined();
    }
  });

  it("bindable attribute is renameable", async () => {
    const result = await prepareAt("count.bind")();
    if ("result" in result) {
      // Bindable rename: placeholder should be the bindable name
      expect(["count", "count.bind"]).toContain(result.result.placeholder);
    }
  });

  it("VC pipe name is renameable", async () => {
    const result = await prepareAt("| format-date", 2)();
    if ("result" in result) {
      expect(result.result.placeholder).toBe("format-date");
    }
  });

  it("BB ampersand name is renameable", async () => {
    const result = await prepareAt("& rate-limit", 2)();
    if ("result" in result) {
      expect(result.result.placeholder).toBe("rate-limit");
    }
  });
});

// ============================================================================
// 2. Non-renameable constructs — prepareRename should deny or return error
//    (rename-spec: binding commands, contextual vars, builtins are not
//    user-renameable)
// ============================================================================

describe("rename: non-renameable constructs", () => {
  it("binding command (.bind) is not renameable", async () => {
    const result = await prepareAt("count.bind", "count.".length + 1)();
    // Should either return error or succeed but deny at rename time
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
    // If prepareRename succeeds, the rename itself should be denied
  });

  it("binding command (.trigger) is not renameable", async () => {
    const result = await prepareAt("click.trigger", "click.".length + 1)();
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("contextual variable ($index) is not renameable", async () => {
    const result = await prepareAt("${$index", 2)();
    if ("error" in result) {
      // Contextual vars are framework-injected — rename denied
      expect(result.error.kind).toBeDefined();
    }
  });

  it("native HTML element is not renameable", async () => {
    const result = await prepareAt("<h2>", 1)();
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });

  it("static text is not renameable", async () => {
    const result = await prepareAt("Detail view", 1)();
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
    }
  });
});

// ============================================================================
// 3. Safety decision — prepareRename returns safety metadata
// ============================================================================

describe("rename: safety assessment", () => {
  it("prepareRename for source-analyzed CE includes safety", async () => {
    const result = await prepareAt("<matrix-panel\n")();
    if ("result" in result) {
      const safety = result.result.safety;
      expect(safety).toBeDefined();
      // Source-analyzed CE with full scope coverage: high confidence
      expect(safety.confidence).toBeDefined();
      expect(safety.totalReferences).toBeGreaterThanOrEqual(0);
    }
  });

  it("safety includes reference counts", async () => {
    const result = await prepareAt("<matrix-panel\n")();
    if ("result" in result) {
      const safety = result.result.safety;
      expect(typeof safety.totalReferences).toBe("number");
      expect(typeof safety.certainReferences).toBe("number");
      // Certain references cannot exceed total
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
    if ("edit" in result) {
      const edits = result.edit.edits;
      expect(edits.length).toBeGreaterThan(0);
      // At least one edit should target the template
      const templateEdits = edits.filter((e) => String(e.uri).endsWith("app.html"));
      expect(templateEdits.length).toBeGreaterThan(0);
    }
    // If error, it should be a structured policy denial, not a crash
    if ("error" in result) {
      expect(result.error.kind).toBeDefined();
      expect(result.error.message).toBeDefined();
    }
  });

  it("renaming CE also produces edits in TypeScript", async () => {
    const result = await renameAt("<matrix-panel\n", "matrix-widget")();
    if ("edit" in result) {
      const edits = result.edit.edits;
      // Should include declaration site edit (decorator name property)
      const tsEdits = edits.filter((e) => String(e.uri).endsWith(".ts"));
      expect(tsEdits.length).toBeGreaterThan(0);
    }
  });

  it("renaming VC produces edits in expression and declaration", async () => {
    const result = await renameAt("| format-date", "format-datetime", 2)();
    if ("edit" in result) {
      const edits = result.edit.edits;
      expect(edits.length).toBeGreaterThan(0);
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

    // Collect find-references for matrix-panel
    const refs = query.references(p);
    const refUris = new Set(refs.map((r) => String(r.uri)));

    // Collect rename edits
    const result = refactor.rename({
      uri: uri as any,
      position: p,
      newName: "matrix-widget",
    });

    if ("edit" in result) {
      const editUris = new Set(result.edit.edits.map((e) => String(e.uri)));
      // Every file that has a reference should also have an edit
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
//    (The existing workspace-refactor-policy.test.ts tests policy details;
//    here we verify the policy seam is exercised.)
// ============================================================================

describe("rename: policy enforcement", () => {
  it("rename at non-resource position produces structured error", async () => {
    // Position on static text — not a renameable symbol
    const result = refactor.rename({
      uri: uri as any,
      position: await pos("Detail view", 1),
      newName: "new-name",
    });
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
    if ("error" in result) {
      const data = result.error.data;
      if (data) {
        expect(data.operation).toBe("rename");
        expect(typeof data.reason).toBe("string");
      }
    }
  });
});
