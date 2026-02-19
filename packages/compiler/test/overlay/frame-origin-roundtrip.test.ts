import { test, expect } from "vitest";

import {
  BUILTIN_SEMANTICS,
  DefaultTemplateProgram,
  buildProjectSnapshot,
} from "@aurelia-ls/compiler";
import { noopModuleResolver } from "../_helpers/test-utils.js";

function createProgram() {
  return new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr() { return "TestVm"; },
      getSyntheticPrefix() { return "__AU_TTC_"; },
    },
    isJs: false,
    project: buildProjectSnapshot(BUILTIN_SEMANTICS),
    moduleResolver: noopModuleResolver,
  });
}

/**
 * Test pattern BK: round-trip ScopeFrame origin → mapping entry.
 *
 * Compiles a template with repeat.for, then inspects the TemplateMappingArtifact
 * to verify that entries for expressions within the repeat scope carry frameOrigin
 * with kind "iterator". This tests the full boundary: ScopeFrame origin (from bind)
 * → FrameOverlayPlan (plan) → TemplateMappingEntry (mapping).
 */
test("repeat.for expressions carry frameOrigin through the full pipeline", () => {
  const program = createProgram();
  const uri = "/app/repeat-origin.html";
  const markup = "<template><div repeat.for=\"item of items\">${item.name}</div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const entries = compilation.mapping.entries;

  // The interpolation ${item.name} is inside the repeat scope.
  // Find the entry that maps to it.
  const framedEntries = entries.filter((e) => e.frameOrigin !== undefined);

  expect(
    framedEntries.length,
    "at least one mapping entry should carry frameOrigin from the repeat scope",
  ).toBeGreaterThanOrEqual(1);

  const iteratorEntry = framedEntries.find((e) => e.frameOrigin!.kind === "iterator");
  expect(iteratorEntry, "should have an entry with iterator origin").toBeTruthy();
  expect(
    (iteratorEntry!.frameOrigin as any).controller,
    "iterator origin should reference the repeat controller",
  ).toBe("repeat");
});

test("root-scope expressions do not carry frameOrigin", () => {
  const program = createProgram();
  const uri = "/app/root-scope.html";
  const markup = "<template>${message}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const entries = compilation.mapping.entries;

  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(entry.frameOrigin).toBeUndefined();
  }
});
